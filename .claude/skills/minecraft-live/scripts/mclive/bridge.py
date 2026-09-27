"""The bridge: a local WebSocket server that Minecraft Bedrock connects to with `/connect`,
plus a small token-protected HTTP API on the same port that the `mc` CLI talks to.

    Minecraft --(WebSocket, /connect localhost:19134)--> bridge <--(HTTP + token)-- mc CLI (Claude)

Standard library only. Encryption uses mccrypto (fast with `cryptography`, pure Python otherwise).
"""
from __future__ import annotations

import asyncio
import base64
import collections
import json
import os
import secrets
import sys
import time
import uuid
from pathlib import Path

from . import mccrypto, wsproto

VERSION = "1.0.0"
DEFAULT_PORT = 19134
# Command-parser version sent with every command. It selects command semantics, not the protocol:
# 1 would mean pre-1.19.50 rules (old /execute syntax). 42 = 1.21.20 rules (modern /execute, block states).
DEFAULT_COMMAND_VERSION = 42
MAX_IN_FLIGHT = 90  # Minecraft rejects more than 100 unanswered commands
SUBPROTOCOL = "com.microsoft.minecraft.wsencrypt"
CLAUDE_TAG = "§d[Claude]§r"  # pink "[Claude]" prefix for our chat lines

STATUS_NAMES = {
    -2147483648: "FailedToParseCommand", -2147483647: "CommandNotFound", -2147483646: "NotEnoughPermissions",
    -2147483645: "CommandVersionMismatch", -2147483644: "InvalidOverloadSyntax", -2147483643: "InvalidCommandContext",
    -2147483642: "InvalidCommandCall", -2147483641: "CommandsDisabled", -2147483640: "NoChatPermissions",
    -2147483639: "NoTargetsFound", -2147483638: "ChatMuted", -2147483637: "InvalidCommandOrigin",
    -2147418112: "ExpectedRequestMsg", -2147418111: "MalformedRequest", -2147418110: "VersionMismatch",
    -2147418109: "TooManyPendingRequests", -2147418108: "MustSpecifyVersion", -2147418107: "EncryptionRequired",
    -2147352576: "ExecutionFail", -2147352575: "CommandStepFail", -2147352574: "AllTargetsWillFail",
    -2147352573: "FailWithoutFailMsg", 0: "Success", 131073: "CommandStepDone", 131074: "CommandExecIncomplete",
    131075: "CommandRequestInitiated", 131076: "NewCommandVersionAvailable",
}
ENCRYPTION_REQUIRED = -2147418107
VERSION_MISMATCH = -2147483645


def state_dir() -> Path:
    d = Path(os.environ.get("MC_CLAUDE_HOME") or (Path.home() / ".mc-claude"))
    d.mkdir(parents=True, exist_ok=True)
    return d


def log(msg: str):
    print(time.strftime("%H:%M:%S"), msg, flush=True)


def _normalize_event(header: dict, body: dict):
    """Events come in two shapes: v1.1.0 (name in header, flat body) and legacy (body.properties)."""
    name = header.get("eventName") or body.get("eventName") or "?"
    if not header.get("eventName") and isinstance(body.get("properties"), dict):
        flat = {k[:1].lower() + k[1:]: v for k, v in body["properties"].items()}
        for k, v in body.items():
            if k not in ("properties", "eventName"):
                flat.setdefault(k, v)
        body = flat
    return name, body


class Session:
    """One connected Minecraft client."""

    _ids = 0

    def __init__(self, bridge: "Bridge", ws: wsproto.WebSocket, peer: str):
        Session._ids += 1
        self.id = Session._ids
        self.bridge = bridge
        self.ws = ws
        self.peer = peer
        self.connected_at = time.time()
        self.player = None
        self.command_version = bridge.command_version
        self.pending: dict[str, asyncio.Future] = {}
        self.sem = asyncio.Semaphore(bridge.max_in_flight)
        self.cipher = None
        self.encrypted_rx = False
        self.encryption_failed = False
        self._handshake = None  # (requestId, ECDHKey, salt) while enabling encryption
        self._send_gate = asyncio.Event()
        self._send_gate.set()
        self._send_lock = asyncio.Lock()  # encrypt+send must stay in order for the stream cipher
        self.subscriptions: set[str] = set()
        self.addon = None  # Claude Link add-on detected in this world (None = not checked yet)
        self.sent = self.failed = self.timeouts = 0
        self.closed = False

    # ------------------------------------------------------------------ sending
    async def _send(self, obj: dict, force: bool = False):
        if not force:
            await self._send_gate.wait()
        data = json.dumps(obj, separators=(",", ":"), ensure_ascii=False)
        async with self._send_lock:
            if self.cipher is not None:
                await self.ws.send(self.cipher.encrypt(data.encode("utf-8")), wsproto.OP_BINARY)
            else:
                await self.ws.send(data)

    def _command_frame(self, rid: str, line: str) -> dict:
        return {
            "header": {"version": 1, "requestId": rid, "messageType": "commandRequest",
                       "messagePurpose": "commandRequest"},
            "body": {"version": self.command_version, "commandLine": line, "origin": {"type": "player"}},
        }

    async def start_command(self, line: str, timeout: float) -> asyncio.Future:
        """Send one command (waits for an in-flight slot). Returns a future with the result dict."""
        line = line.strip()
        if line.startswith("/"):
            line = line[1:]
        await self.sem.acquire()
        loop = asyncio.get_running_loop()
        rid = str(uuid.uuid4())
        fut = loop.create_future()
        fut.command = line  # type: ignore[attr-defined]
        self.pending[rid] = fut
        released = []

        def _release(_f):
            if not released:
                released.append(1)
                self.sem.release()
                self.pending.pop(rid, None)

        fut.add_done_callback(_release)
        timer = loop.call_later(timeout, lambda: fut.done() or fut.set_result(
            {"timeout": True, "statusCode": None,
             "statusMessage": f"no response after {timeout:g}s (is the game paused, or the world closed?)"}))
        fut.add_done_callback(lambda _f: timer.cancel())
        try:
            await self._send(self._command_frame(rid, line))
            self.sent += 1
        except Exception as e:  # connection died while sending
            if not fut.done():
                fut.set_result({"statusCode": None, "statusMessage": f"send failed: {e}", "disconnected": True})
        return fut

    async def command(self, line: str, timeout: float = 10.0) -> dict:
        res = await (await self.start_command(line, timeout))
        if res.get("statusCode") == VERSION_MISMATCH and self.command_version != 1:
            log(f"game rejected command version {self.command_version}; retrying with legacy version 1")
            self.command_version = 1
            res = await (await self.start_command(line, timeout))
        return res

    async def subscribe(self, event: str):
        self.subscriptions.add(event)
        await self._send({"header": {"version": 1, "requestId": str(uuid.uuid4()), "messageType": "commandRequest",
                                     "messagePurpose": "subscribe"}, "body": {"eventName": event}})

    async def unsubscribe(self, event: str):
        self.subscriptions.discard(event)
        await self._send({"header": {"version": 1, "requestId": str(uuid.uuid4()), "messageType": "commandRequest",
                                     "messagePurpose": "unsubscribe"}, "body": {"eventName": event}})

    async def enable_encryption(self, timeout: float = 8.0) -> bool:
        if self.cipher is not None:
            return True
        if self._handshake is not None:
            return False
        key = mccrypto.ECDHKey()
        salt = os.urandom(16)
        rid = str(uuid.uuid4())
        fut = asyncio.get_running_loop().create_future()
        self.pending[rid] = fut
        self._handshake = (rid, key, salt)
        self._send_gate.clear()  # hold every other outgoing frame until both sides have switched
        line = "enableencryption %s %s cfb8" % (json.dumps(key.public_b64), json.dumps(base64.b64encode(salt).decode()))
        try:
            await self._send(self._command_frame(rid, line), force=True)
            await asyncio.wait_for(fut, timeout)
        except (asyncio.TimeoutError, Exception) as e:
            log(f"encryption handshake failed: {e!r}")
        finally:
            self.pending.pop(rid, None)
            self._handshake = None
            self._send_gate.set()
        if self.cipher is None:
            self.encryption_failed = True
        return self.cipher is not None

    # ------------------------------------------------------------------ receiving
    def _decode(self, opcode: int, payload: bytes):
        if self.cipher is None:
            return payload.decode("utf-8", "replace")
        if opcode == wsproto.OP_TEXT and not self.encrypted_rx:
            text = payload.decode("utf-8", "replace")
            if text.lstrip().startswith("{"):
                try:
                    json.loads(text)
                    return text  # plain frame sent just before the client switched
                except ValueError:
                    pass
        self.encrypted_rx = True
        return self.cipher.decrypt(payload).decode("utf-8", "replace")

    def _dispatch(self, msg: dict):
        header = msg.get("header") or {}
        body = msg.get("body") or {}
        purpose = header.get("messagePurpose")
        rid = header.get("requestId")
        if self._handshake is not None and rid == self._handshake[0]:
            peer_key = body.get("publicKey")
            if peer_key:
                _, key, salt = self._handshake
                try:
                    k, iv = mccrypto.derive_key(salt, key.shared_secret(peer_key))
                    self.cipher = mccrypto.StreamCipher(k, iv)  # installed before the next frame is read
                except Exception as e:
                    log(f"bad key from client: {e!r}")
        if purpose in ("commandResponse", "error", "ws:encrypt") and rid in self.pending:
            fut = self.pending.pop(rid)
            if not fut.done():
                res = dict(body)
                if purpose == "error":
                    res["error"] = True
                fut.set_result(res)
            return
        if purpose in ("event", "chat"):
            name, ebody = _normalize_event(header, body)
            self.bridge.add_event(self, name, ebody)
            return
        if purpose == "error":
            self.bridge.add_event(self, "_error", body)

    async def reader_loop(self):
        try:
            while True:
                opcode, payload = await self.ws.recv()
                try:
                    msg = json.loads(self._decode(opcode, payload))
                except ValueError:
                    log(f"session {self.id}: undecodable message ({len(payload)} bytes)")
                    continue
                if isinstance(msg, dict):
                    self._dispatch(msg)
        except wsproto.ConnectionClosed:
            pass
        finally:
            self.closed = True
            for fut in list(self.pending.values()):
                if not fut.done():
                    fut.set_result({"statusCode": None, "statusMessage": "Minecraft disconnected", "disconnected": True})
            self.pending.clear()

    def info(self) -> dict:
        return {
            "id": self.id, "player": self.player, "peer": self.peer, "since": round(self.connected_at),
            "encrypted": self.cipher is not None,
            "cipher": getattr(self.cipher, "backend", None),
            "commandVersion": self.command_version, "inFlight": len(self.pending),
            "commandsSent": self.sent, "subscriptions": sorted(self.subscriptions), "closed": self.closed,
            "addon": self.addon,
        }


class Bridge:
    def __init__(self, port: int = DEFAULT_PORT, hosts=("127.0.0.1", "::1"), encryption: str = "auto",
                 command_version: int = DEFAULT_COMMAND_VERSION, greet: bool = True,
                 max_in_flight: int = MAX_IN_FLIGHT, write_state: bool = True):
        self.port = port
        self.hosts = hosts
        self.encryption = encryption  # auto | on | off
        self.command_version = command_version
        self.greet = greet
        self.max_in_flight = max_in_flight
        self.write_state = write_state
        self.token = secrets.token_hex(16)
        self.sessions: list[Session] = []
        self.events = collections.deque(maxlen=5000)
        self.seq = 0
        self._new_event = None
        self._new_session = None
        self.started = time.time()
        self._servers = []
        self._stop = None
        self.encryption_broken = False  # set if a handshake failed; later clients stay plain

    # ------------------------------------------------------------------ lifecycle
    async def start(self):
        self._new_event = asyncio.Event()
        self._new_session = asyncio.Event()
        self._stop = asyncio.Event()
        errors = []
        for host in self.hosts:
            try:
                self._servers.append(await asyncio.start_server(self._handle, host, self.port))
            except OSError as e:
                errors.append(f"{host}: {e}")
        if not self._servers:
            raise OSError(f"could not listen on port {self.port}: {'; '.join(errors)}")
        if self.port == 0:
            self.port = self._servers[0].sockets[0].getsockname()[1]
        if self.write_state:
            path = state_dir() / "bridge.json"
            path.write_text(json.dumps({"port": self.port, "token": self.token, "pid": os.getpid(),
                                        "started": self.started, "version": VERSION}))
            try:
                os.chmod(path, 0o600)
            except OSError:
                pass

    async def serve_forever(self):
        await self.start()
        log(f"Claude bridge {VERSION} listening on port {self.port} (encryption: {self.encryption}).")
        log(f"In Minecraft chat type:  /connect localhost:{self.port}")
        await self._stop.wait()
        await self.close()

    async def close(self):
        for s in list(self.sessions):
            await s.ws.close()
        for srv in self._servers:
            srv.close()
            try:
                await srv.wait_closed()
            except Exception:
                pass
        if self.write_state:
            try:
                path = state_dir() / "bridge.json"
                if json.loads(path.read_text()).get("pid") == os.getpid():
                    path.unlink()
            except Exception:
                pass

    def stop(self):
        if self._stop is not None:
            self._stop.set()

    @property
    def active(self):
        live = [s for s in self.sessions if not s.closed]
        return live[-1] if live else None

    # ------------------------------------------------------------------ events
    def add_event(self, session, name: str, body: dict):
        self.seq += 1
        ev = {"seq": self.seq, "t": round(time.time(), 3), "event": name, "session": session.id if session else None,
              "body": body}
        self.events.append(ev)
        self._new_event.set()
        self._new_event = asyncio.Event()

    async def wait_events(self, since: int, timeout: float, names=None, chat_only=False):
        deadline = time.time() + max(0.0, timeout)
        while True:
            evs = [e for e in self.events if e["seq"] > since and (not names or e["event"] in names)]
            if chat_only:
                evs = [e for e in evs if e["event"] == "PlayerMessage" and not str(e["body"].get("message", "")).startswith(CLAUDE_TAG)]
            left = deadline - time.time()
            if evs or left <= 0:
                return evs
            ev = self._new_event
            try:
                await asyncio.wait_for(ev.wait(), left)
            except asyncio.TimeoutError:
                pass

    # ------------------------------------------------------------------ connections
    async def _handle(self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter):
        peer = writer.get_extra_info("peername")
        peer = f"{peer[0]}:{peer[1]}" if peer else "?"
        try:
            first, headers = await asyncio.wait_for(wsproto.read_http_head(reader), 10)
        except Exception:
            await _close(writer)
            return
        if headers.get("upgrade", "").lower() == "websocket":
            await self._handle_ws(reader, writer, headers, peer)
        else:
            await self._handle_http(reader, writer, first, headers)

    async def _handle_ws(self, reader, writer, headers, peer):
        origin = headers.get("origin", "")
        if origin.lower().startswith(("http://", "https://")) or origin == "null":
            # Browsers always send Origin; Minecraft doesn't send a web origin. Keep web pages out.
            writer.write(b"HTTP/1.1 403 Forbidden\r\nContent-Length: 0\r\n\r\n")
            await writer.drain()
            await _close(writer)
            return
        key = headers.get("sec-websocket-key")
        if not key:
            await _close(writer)
            return
        resp = ("HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n"
                f"Sec-WebSocket-Accept: {wsproto.accept_key(key)}\r\n")
        offered = [p.strip() for p in headers.get("sec-websocket-protocol", "").split(",") if p.strip()]
        if SUBPROTOCOL in offered:
            resp += f"Sec-WebSocket-Protocol: {SUBPROTOCOL}\r\n"
        writer.write((resp + "\r\n").encode())
        await writer.drain()
        session = Session(self, wsproto.WebSocket(reader, writer), peer)
        self.sessions.append(session)
        self.sessions = [s for s in self.sessions if not s.closed or s is session][-10:]
        log(f"Minecraft connected (session {session.id} from {peer}).")
        reader_task = asyncio.ensure_future(session.reader_loop())
        asyncio.ensure_future(self._on_connect(session))
        await reader_task
        await session.ws.close()  # release our side of the socket too
        log(f"Minecraft disconnected (session {session.id}, player {session.player or '?'}).")
        self.add_event(session, "_disconnected", {"player": session.player})

    async def _on_connect(self, s: Session):
        try:
            if self.encryption == "on" or (self.encryption == "auto" and not self.encryption_broken):
                ok = await s.enable_encryption()
                if ok:
                    log(f"session {s.id}: connection encrypted ({s.cipher.backend}).")
                elif self.encryption == "on":
                    log("encryption is required (--encryption on) but the handshake failed; closing.")
                    await s.ws.close()
                    return
                else:
                    self.encryption_broken = True
                    log(f"session {s.id}: continuing unencrypted.")
            await s.subscribe("PlayerMessage")
            res = await s.command("testfor @s", timeout=10)
            if res.get("statusCode") == ENCRYPTION_REQUIRED and s.cipher is None:
                log("Minecraft requires encryption; enabling it.")
                if await s.enable_encryption():
                    await s.subscribe("PlayerMessage")
                    res = await s.command("testfor @s", timeout=10)
            victims = res.get("victim")
            if isinstance(victims, list) and victims:
                s.player = str(victims[0])
            elif str(res.get("statusMessage", "")).startswith("Found "):
                s.player = res["statusMessage"][6:].split(",")[0].strip()
            log(f"session {s.id}: player is {s.player or '(unknown)'}; status {res.get('statusMessage')!r}")
            ping = await s.command("claude:ping", timeout=10)
            s.addon = _ok(ping) and "claudeLink" in str(ping.get("statusMessage", ""))
            log(f"session {s.id}: Claude Link add-on {'active' if s.addon else 'not active'}")
            if self.greet:
                msg = {"rawtext": [{"text": f"{CLAUDE_TAG} Connected. I can now see and build in this world."}]}
                await s.command("tellraw @s " + json.dumps(msg, ensure_ascii=False), timeout=10)
            self.add_event(s, "_connected", {"player": s.player, "encrypted": s.cipher is not None})
            self._new_session.set()
            self._new_session = asyncio.Event()
        except Exception as e:
            log(f"session {s.id}: connect sequence failed: {e!r}")

    # ------------------------------------------------------------------ HTTP API (for the CLI)
    async def _handle_http(self, reader, writer, first, headers):
        status, payload = 200, {}
        try:
            method, target = first.split(" ")[:2]
            host = headers.get("host", "")
            hostname = host[1:host.find("]")] if host.startswith("[") else host.split(":")[0]
            if hostname not in ("127.0.0.1", "localhost", "::1") or headers.get("origin"):
                status, payload = 403, {"error": "forbidden"}
            elif not secrets.compare_digest(headers.get("x-mc-token", ""), self.token):
                status, payload = 401, {"error": "bad or missing token (read it from bridge.json)"}
            else:
                length = int(headers.get("content-length") or 0)
                raw = await reader.readexactly(length) if length else b""
                data = json.loads(raw.decode("utf-8")) if raw else {}
                path, _, query = target.partition("?")
                params = dict(p.split("=", 1) for p in query.split("&") if "=" in p)
                status, payload = await self._route(method, path, params, data)
        except Exception as e:
            status, payload = 500, {"error": repr(e)}
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        writer.write((f"HTTP/1.1 {status} {'OK' if status == 200 else 'Error'}\r\nContent-Type: application/json\r\n"
                      f"Content-Length: {len(body)}\r\nConnection: close\r\n\r\n").encode() + body)
        try:
            await writer.drain()
        finally:
            await _close(writer)

    async def _route(self, method, path, params, data):
        s = self.active
        if path == "/api/status":
            return 200, self.status()
        if path == "/api/wait-connect":
            timeout = float(params.get("timeout", 60))
            deadline = time.time() + timeout
            while (self.active is None or self.active.player is None and time.time() - self.active.connected_at < 15) \
                    and time.time() < deadline:
                ev = self._new_session
                try:
                    await asyncio.wait_for(ev.wait(), max(0.05, min(1.0, deadline - time.time())))
                except asyncio.TimeoutError:
                    pass
            return 200, self.status()
        if path == "/api/events":
            names = set(filter(None, params.get("types", "").split(","))) or None
            evs = await self.wait_events(int(params.get("since", 0)), float(params.get("wait", 0)), names,
                                         params.get("chat") == "1")
            return 200, {"events": evs[-int(params.get("limit", 500)):], "last": self.seq}
        if path == "/api/shutdown" and method == "POST":
            asyncio.get_running_loop().call_later(0.2, self.stop)
            return 200, {"ok": True}
        if s is None:
            return 409, {"error": "Minecraft is not connected. In Minecraft chat type: /connect localhost:%d" % self.port}
        if path == "/api/run" and method == "POST":
            return 200, await self.run_batch(s, data.get("commands") or [], float(data.get("timeout", 10)),
                                             bool(data.get("stop_on_error")))
        if path == "/api/subscribe" and method == "POST":
            for ev in data.get("events") or []:
                await s.subscribe(ev)
            return 200, {"subscriptions": sorted(s.subscriptions)}
        if path == "/api/unsubscribe" and method == "POST":
            for ev in data.get("events") or []:
                await s.unsubscribe(ev)
            return 200, {"subscriptions": sorted(s.subscriptions)}
        if path == "/api/encrypt" and method == "POST":
            return 200, {"encrypted": await s.enable_encryption()}
        return 404, {"error": f"unknown endpoint {method} {path}"}

    async def run_batch(self, s: Session, lines, timeout: float, stop_on_error: bool) -> dict:
        t0 = time.time()
        futs, stopped = [], False
        for line in lines:
            if stopped or s.closed:
                break
            fut = await s.start_command(str(line), timeout)
            futs.append(fut)
            if stop_on_error:
                # peek at completed results so far; stop sending after the first failure
                if any(f.done() and not _ok(f.result()) for f in futs):
                    stopped = True
        results = []
        for i, fut in enumerate(futs):
            res = await fut
            code = res.get("statusCode")
            extra = {k: v for k, v in res.items() if k not in ("statusCode", "statusMessage")}
            results.append({"i": i, "command": fut.command, "ok": _ok(res), "code": code,
                            "status": STATUS_NAMES.get(code) if code is not None else None,
                            "message": res.get("statusMessage"), **({"body": extra} if extra else {})})
        if any(r["code"] == VERSION_MISMATCH for r in results) and s.command_version != 1:
            s.command_version = 1
            log("game reported CommandVersionMismatch; switching to legacy command version 1")
        return {"results": results, "sent": len(futs), "skipped": len(lines) - len(futs),
                "elapsed": round(time.time() - t0, 3)}

    def status(self) -> dict:
        s = self.active
        return {
            "bridge": {"version": VERSION, "port": self.port, "pid": os.getpid(), "uptime": round(time.time() - self.started),
                       "encryption": self.encryption, "cryptoBackend": "cryptography" if mccrypto.HAVE_CRYPTOGRAPHY else "python"},
            "connected": s is not None, "session": s.info() if s else None,
            "lastEvent": self.seq,
        }


async def _close(writer):
    try:
        writer.close()
        await writer.wait_closed()
    except Exception:
        pass


def _ok(res: dict) -> bool:
    code = res.get("statusCode")
    return code is not None and code >= 0 and not res.get("error")


def main(argv=None):
    import argparse
    ap = argparse.ArgumentParser(description="Minecraft Bedrock <-> Claude bridge")
    ap.add_argument("--port", type=int, default=DEFAULT_PORT)
    ap.add_argument("--lan", action="store_true", help="also accept Minecraft from other devices on your network")
    ap.add_argument("--encryption", choices=["auto", "on", "off"], default="auto")
    ap.add_argument("--command-version", type=int, default=DEFAULT_COMMAND_VERSION)
    ap.add_argument("--no-greet", action="store_true")
    a = ap.parse_args(argv)
    hosts = ("0.0.0.0", "::") if a.lan else ("127.0.0.1", "::1")
    bridge = Bridge(a.port, hosts, a.encryption, a.command_version, not a.no_greet)
    try:
        asyncio.run(bridge.serve_forever())
    except KeyboardInterrupt:
        pass
    except OSError as e:
        log(f"Could not start: {e}")
        log(f"Port {a.port} is probably used by another program. Try:  mc start --port {a.port + 1}"
            f"   and in Minecraft:  /connect localhost:{a.port + 1}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
