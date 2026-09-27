"""A small fake Minecraft Bedrock client, for testing the bridge without the real game.

It connects to the bridge over WebSocket exactly like `/connect` does, answers commands from an
in-memory world, emits events, and can emulate the Claude Link add-on, encryption, the 100
in-flight command limit, latency, and a paused game. Messages follow Bedrock's real wording
(taken from the game's en_US.lang) so the CLI's parsers are exercised for real.
"""
from __future__ import annotations

import asyncio
import base64
import json
import math
import re

from . import codec, mccrypto, wsproto

EVENT_VERSION = 16842752  # protocol 1.1.0 event frames (name in header, flat body)
MIN_Y, MAX_Y = -64, 319
FILL_LIMIT = 32768
STRUCTURE_MAX = (64, 384, 64)
ADDON_SCAN_LIMIT = 32768

# status codes
OK = 0
FAIL = -2147352576
PARSE = -2147483648
TOO_MANY = -2147418109
ENC_REQUIRED = -2147418107
NO_TARGETS = -2147483639


class CmdError(Exception):
    def __init__(self, message, code=FAIL):
        super().__init__(message)
        self.code = code


# ---------------------------------------------------------------- tokenizer
def _match(s: str, i: int) -> int:
    """Index just past the bracket that closes s[i] ('[' or '{'), respecting strings."""
    depth, j, n, q = 0, i, len(s), False
    while j < n:
        c = s[j]
        if q:
            if c == "\\":
                j += 2
                continue
            if c == '"':
                q = False
        elif c == '"':
            q = True
        elif c in "[{":
            depth += 1
        elif c in "]}":
            depth -= 1
            if depth == 0:
                return j + 1
        j += 1
    return n


_COORD = re.compile(r"[~^](?:[-+]?(?:\d+\.?\d*|\.\d+))?|[-+]?(?:\d+\.?\d*|\.\d+)")


def tokenize(line: str) -> list:
    toks, i, n = [], 0, len(line)
    while i < n:
        c = line[i]
        if c.isspace():
            i += 1
            continue
        if c == '"':
            j, buf = i + 1, []
            while j < n and line[j] != '"':
                if line[j] == "\\" and j + 1 < n:
                    buf.append(line[j + 1])
                    j += 2
                    continue
                buf.append(line[j])
                j += 1
            toks.append("".join(buf))
            i = j + 1
            continue
        if c in "[{":
            j = _match(line, i)
            toks.append(line[i:j])
            i = j
            continue
        j = i
        while j < n and not line[j].isspace():
            if line[j] in "[{":
                j = _match(line, j)
                continue
            j += 1
        word = line[i:j]
        if word[0] in "~^" and word.count("~") + word.count("^") > 1 and "[" not in word:
            toks.extend(_COORD.findall(word))
        elif "[" in word and not word.startswith("@") and word.index("[") > 0:
            k = word.index("[")
            toks.extend([word[:k], word[k:]])  # block["state"=1] -> block, ["state"=1]
        else:
            toks.append(word)
        i = j
    return toks


# ---------------------------------------------------------------- world
class Entity:
    _next = 1

    def __init__(self, etype, pos, name="", rot=(0.0, 0.0), health=20):
        Entity._next += 1
        self.id = -Entity._next
        self.type = etype if ":" in etype else "minecraft:" + etype
        self.pos = [float(v) for v in pos]
        self.yaw, self.pitch = rot
        self.name = name
        self.health = health


class World:
    """Flat-ish test terrain around the origin with a pond, a tree and a small hut."""

    def __init__(self):
        self.edits = {}
        self.structures = {}
        self.db = codec.blocks_db()
        self.loaded_radius = 256

    def defaults(self, ident):
        st = self.db.get(ident, {}).get("states", {})
        return {k: v[0] for k, v in st.items()}

    def natural(self, x, y, z):
        if y == MIN_Y:
            return "bedrock"
        if y < 0:
            return "deepslate"
        if y < 60:
            return "diamond_ore" if (x, y, z) == (2, 12, 3) else "stone"
        dp = (x - 6) ** 2 + (z - 6) ** 2
        if y < 63:
            return "sand" if dp <= 9 and y == 62 else "dirt"
        if y == 63:
            if dp <= 4:
                return "water"
            return "sand" if dp <= 9 else "grass_block"
        tx, tz = -4, -4  # oak tree
        if x == tx and z == tz and 64 <= y <= 68:
            return "oak_log"
        if 67 <= y <= 69 and abs(x - tx) <= (2 if y < 69 else 1) and abs(z - tz) <= (2 if y < 69 else 1) \
                and not (x == tx and z == tz and y < 69):
            return "oak_leaves"
        if 3 <= x <= 5 and -8 <= z <= -6 and 64 <= y <= 66:  # hollow cobblestone hut with a door gap
            edge = x in (3, 5) or z in (-8, -6)
            if edge and not (x == 4 and z == -6 and y < 66):
                return "cobblestone"
            if y == 66:
                return "cobblestone"
        return "air"

    def get(self, x, y, z):
        key = (x, y, z)
        if key in self.edits:
            return self.edits[key]
        ident = self.natural(x, y, z)
        st = self.defaults(ident)
        if ident == "oak_log":
            st["pillar_axis"] = "y"
        return ident, st

    def set(self, x, y, z, ident, states=None):
        st = self.defaults(ident)
        st.update(states or {})
        self.edits[(x, y, z)] = (ident, st)

    def spec(self, x, y, z):
        ident, st = self.get(x, y, z)
        return codec.block_spec(ident, st)


def _num(t: str) -> float:
    return float(t) if t not in ("", "+", "-") else 0.0


def local_to_world(pos, yaw, pitch, left, up, fwd):
    """Bedrock/Java local coordinates (^left ^up ^forward) -> world offset."""
    r = math.radians
    sy, cy, sp, cp = math.sin(r(yaw)), math.cos(r(yaw)), math.sin(r(pitch)), math.cos(r(pitch))
    f = (-sy * cp, -sp, cy * cp)  # forward (yaw 0 = south/+Z, pitch +90 = straight down)
    u = (-sy * sp, cp, cy * sp)  # up (top of the head)
    lft = (cy, 0.0, sy)  # left
    return tuple(pos[i] + f[i] * fwd + u[i] * up + lft[i] * left for i in range(3))


class Ctx:
    def __init__(self, executor, pos, yaw, pitch):
        self.executor, self.pos, self.yaw, self.pitch = executor, list(pos), yaw, pitch

    def copy(self, **kw):
        c = Ctx(self.executor, self.pos, self.yaw, self.pitch)
        for k, v in kw.items():
            setattr(c, k, v)
        return c


# ---------------------------------------------------------------- the fake game
class FakeMinecraft:
    def __init__(self, player="Steve", addon=True, require_encryption=False, supports_encryption=True,
                 legacy_events=False, latency=0.0005, echo_tellraw=False, crypto_backend=None):
        self.world = World()
        self.player = Entity("player", (0.5, 64.0, 0.5), player, rot=(180.0, 0.0))
        self.entities = [self.player, Entity("cow", (3.5, 64, -2.5)), Entity("cow", (4.5, 64, -1.5)),
                         Entity("zombie", (-7.5, 64, 6.5)), Entity("villager_v2", (8.5, 64, -3.5), "Bob")]
        self.addon = addon
        self.require_encryption = require_encryption
        self.supports_encryption = supports_encryption
        self.legacy_events = legacy_events
        self.latency = latency
        self.echo_tellraw = echo_tellraw
        self.crypto_backend = crypto_backend
        self.subs = set()
        self.chat_log = []  # (kind, text) lines the player would see
        self.commands = []  # every command line received
        self.cipher = None
        self.enc_rx = False
        self.paused = False
        self.time = 1000
        self.inventory = {0: ("diamond_pickaxe", 1), 1: ("oak_planks", 64), 2: ("torch", 32)}
        self.gamemode = "creative"
        self._queue = None
        self._tasks = []
        self.ws = None

    # ------------------------------------------------------------ connection
    async def connect(self, host="127.0.0.1", port=19134):
        self._queue = asyncio.Queue()
        self.ws = await wsproto.client_connect(host, port)
        self._tasks = [asyncio.ensure_future(self._reader()), asyncio.ensure_future(self._worker())]

    async def close(self):
        if self.ws:
            await self.ws.close()
        for t in self._tasks:
            t.cancel()

    async def _send(self, obj):
        data = json.dumps(obj, separators=(",", ":"))
        if self.cipher is not None:
            await self.ws.send(self.cipher.encrypt(data.encode()), wsproto.OP_BINARY)
        else:
            await self.ws.send(data)

    async def _reader(self):
        try:
            while True:
                op, payload = await self.ws.recv()
                if self.cipher is not None and (op == wsproto.OP_BINARY or self.enc_rx
                                                or not payload.lstrip().startswith(b"{")):
                    self.enc_rx = True
                    payload = self.cipher.decrypt(payload)
                msg = json.loads(payload.decode("utf-8"))
                h, b = msg.get("header", {}), msg.get("body", {})
                purpose, rid = h.get("messagePurpose"), h.get("requestId")
                if purpose == "subscribe":
                    self.subs.add(b.get("eventName"))
                elif purpose == "unsubscribe":
                    self.subs.discard(b.get("eventName"))
                elif purpose == "ws:encrypt":
                    pub = self._key_exchange(b["publicKey"], b["salt"])
                    await self._respond(rid, {"publicKey": pub}, purpose="ws:encrypt", switch=True)
                elif purpose == "commandRequest":
                    if self._queue.qsize() >= 100:
                        await self._respond(rid, {"statusCode": TOO_MANY,
                                                  "statusMessage": "Too many commands have been requested"},
                                            purpose="error")
                    else:
                        self._queue.put_nowait((rid, b.get("commandLine", ""), b.get("version")))
        except (wsproto.ConnectionClosed, asyncio.CancelledError):
            pass

    async def _worker(self):
        while True:
            rid, line, _ver = await self._queue.get()
            while self.paused:
                await asyncio.sleep(0.01)
            if self.latency:
                await asyncio.sleep(self.latency)
            self.commands.append(line)
            if line.startswith("enableencryption ") and self.supports_encryption:
                toks = tokenize(line)
                pub = self._key_exchange(toks[1], toks[2])
                await self._respond(rid, {"publicKey": pub, "statusCode": 0}, switch=True)
                continue
            if self.require_encryption and self.cipher is None:
                await self._respond(rid, {"statusCode": ENC_REQUIRED, "statusMessage": "Encryption is required"},
                                    purpose="error")
                continue
            try:
                body = self.execute(line)
            except CmdError as e:
                body = {"statusCode": e.code, "statusMessage": str(e)}
            except Exception as e:  # a bug in the fake, report as a failure
                body = {"statusCode": FAIL, "statusMessage": f"fake error: {e!r}"}
            await self._respond(rid, body)

    def _key_exchange(self, server_pub, salt_b64):
        key = mccrypto.ECDHKey(self.crypto_backend)
        k, iv = mccrypto.derive_key(base64.b64decode(salt_b64), key.shared_secret(server_pub))
        self._pending_cipher = mccrypto.StreamCipher(k, iv, self.crypto_backend)
        return key.public_b64

    async def _respond(self, rid, body, purpose="commandResponse", switch=False):
        await self._send({"header": {"version": 1, "requestId": rid, "messagePurpose": purpose}, "body": body})
        if switch:
            self.cipher = self._pending_cipher

    async def emit(self, name, body):
        if name not in self.subs:
            return False
        if self.legacy_events:
            props = {k[:1].upper() + k[1:]: v for k, v in body.items()}
            frame = {"header": {"version": 1, "requestId": "00000000-0000-0000-0000-000000000000",
                                "messagePurpose": "event"}, "body": {"eventName": name, "properties": props}}
        else:
            frame = {"header": {"version": EVENT_VERSION, "requestId": "00000000-0000-0000-0000-000000000000",
                                "messagePurpose": "event", "eventName": name}, "body": body}
        await self._send(frame)
        return True

    async def chat(self, message, sender=None):
        self.chat_log.append(("chat", f"<{sender or self.player.name}> {message}"))
        return await self.emit("PlayerMessage", {"message": message, "receiver": "",
                                                 "sender": sender or self.player.name, "type": "chat"})

    async def move(self, x, y, z, yaw=None):
        self.player.pos = [x, y, z]
        if yaw is not None:
            self.player.yaw = yaw
        await self.emit("PlayerTravelled", {"isUnderwater": False, "metersTravelled": 1.0, "travelMethod": 0,
                                            "player": self._player_obj()})

    def _player_obj(self):
        p = self.player
        return {"name": p.name, "position": {"x": p.pos[0], "y": p.pos[1] + 1.62001, "z": p.pos[2]},
                "yRot": p.yaw, "dimension": 0, "type": "minecraft:player", "id": p.id}

    # ------------------------------------------------------------ command execution
    def execute(self, line, ctx=None):
        toks = tokenize(line.strip().lstrip("/"))
        if not toks:
            raise CmdError('Syntax error: Unexpected "": at ">><<"', PARSE)
        ctx = ctx or Ctx(self.player, self.player.pos, self.player.yaw, self.player.pitch)
        name = toks[0].lower()
        if name.startswith("minecraft:"):
            name = name[10:]
        name = {"tp": "teleport", "w": "tell", "msg": "tell", "connect": "wsserver"}.get(name, name)
        if name.startswith("claude:") or (self.addon and name in ("ping", "scan", "sense", "heights", "inventory")):
            if not self.addon:
                raise CmdError(f"Unknown command: {toks[0]}. Please check that the command exists and that you have "
                               f"permission to use it.", PARSE)
            return getattr(self, "addon_" + name.split(":")[-1])(toks, ctx)
        fn = getattr(self, "cmd_" + name, None)
        if fn is None:
            if name in NOOP_COMMANDS:
                return {"statusCode": OK, "statusMessage": ""}
            raise CmdError(f"Unknown command: {toks[0]}. Please check that the command exists and that you have "
                           f"permission to use it.", PARSE)
        try:
            return fn(toks, ctx)
        except (IndexError, ValueError, KeyError) as e:  # malformed input: answer like the game's parser
            raise CmdError(f'Syntax error: Unexpected "": at "{line.strip()} >><<" ({type(e).__name__})', PARSE)

    # helpers
    def pos3(self, toks, i, ctx, center=False):
        if i + 2 >= len(toks):
            raise CmdError(f'Syntax error: Unexpected "": at "{" ".join(toks)} >><<"', PARSE)
        a = toks[i:i + 3]
        try:
            if any(t.startswith("^") for t in a):
                if not all(t.startswith("^") for t in a):
                    raise ValueError
                return local_to_world(ctx.pos, ctx.yaw, ctx.pitch, *(_num(t[1:]) for t in a))
            out = []
            for k, t in enumerate(a):
                if t.startswith("~"):
                    out.append(ctx.pos[k] + _num(t[1:]))
                else:
                    v = float(t)
                    out.append(v + 0.5 if center and k != 1 and "." not in t else v)
            return tuple(out)
        except ValueError:
            raise CmdError(f'Syntax error: Unexpected "{a[0]}": at "{" ".join(toks[:i])} >>{a[0]}<<"', PARSE)

    @staticmethod
    def bpos(p):
        return tuple(int(math.floor(v)) for v in p)

    def block_arg(self, toks, i):
        """Parse <block> [states] at toks[i]. Returns (id, states, next_index)."""
        if i >= len(toks):
            raise CmdError('Syntax error: Unexpected "": at ">><<"', PARSE)
        ident = codec.strip_ns(toks[i].lower())
        if ident not in self.world.db:
            raise CmdError(f'Syntax error: Unexpected "{toks[i]}": at "{" ".join(toks[:i])} >>{toks[i]}<<"', PARSE)
        states = {}
        j = i + 1
        if j < len(toks) and toks[j].startswith("["):
            states = codec.parse_states(toks[j])
            valid = self.world.db[ident]["states"]
            for k, v in states.items():
                if k not in valid:
                    raise CmdError(f'Block state "{k}" is not valid for block {ident}')
                if v not in valid[k]:
                    raise CmdError(f'Block state value {json.dumps(v)} is not valid for state "{k}"')
            j += 1
        return ident, states, j

    def in_world(self, y):
        return MIN_Y <= y <= MAX_Y

    def select(self, sel, ctx):
        if sel == "@s":
            return [ctx.executor]
        if sel in ("@p", "@a", "@r", self.player.name) or sel.startswith(("@p[", "@a[", "@r[")):
            return [self.player]
        if sel.startswith("@e"):
            args = {}
            if "[" in sel:
                for part in sel[sel.index("[") + 1:-1].split(","):
                    if "=" in part:
                        k, v = part.split("=", 1)
                        args[k.strip()] = v.strip()
            out = []
            for e in self.entities:
                t = args.get("type")
                if t and (t.lstrip("!") if t.startswith("!") else t) and \
                        ((e.type == codec.strip_ns(t.lstrip("!")) or e.type == "minecraft:" + codec.strip_ns(t.lstrip("!")))
                         == t.startswith("!")):
                    continue
                if "r" in args and math.dist(e.pos, ctx.pos) > float(args["r"]):
                    continue
                if "name" in args and e.name != args["name"].strip('"'):
                    continue
                out.append(e)
            out.sort(key=lambda e: math.dist(e.pos, ctx.pos))
            if "c" in args:
                out = out[:int(args["c"])]
            return out
        return []

    def display(self, e):
        return e.name or self.world.db.get(codec.strip_ns(e.type), {}).get("name") or codec.strip_ns(e.type).replace("_", " ").title()

    # commands
    def cmd_testfor(self, toks, ctx):
        found = self.select(toks[1], ctx) if len(toks) > 1 else []
        if not found:
            raise CmdError("No targets matched selector", NO_TARGETS)
        names = [self.display(e) for e in found]
        return {"statusCode": OK, "statusMessage": "Found " + ", ".join(names), "victim": names}

    def cmd_getlocalplayername(self, toks, ctx):
        return {"statusCode": OK, "statusMessage": self.player.name, "localplayername": self.player.name}

    def cmd_querytarget(self, toks, ctx):
        found = self.select(toks[1], ctx) if len(toks) > 1 else []
        if not found:
            raise CmdError("No targets matched selector", NO_TARGETS)
        data = [{"dimension": 0, "position": {"x": e.pos[0], "y": e.pos[1] + (1.62001 if e is self.player else 0),
                                              "z": e.pos[2]}, "uniqueId": str(e.id), "yRot": e.yaw} for e in found]
        details = json.dumps(data)
        return {"statusCode": OK, "statusMessage": "Target data: " + details, "details": details}

    def cmd_testforblock(self, toks, ctx):
        x, y, z = self.bpos(self.pos3(toks, 1, ctx))
        ident, states, _ = self.block_arg(toks, 4)
        if not self.in_world(y):
            raise CmdError("Cannot test for block outside of the world")
        have, hst = self.world.get(x, y, z)
        if have != ident:
            raise CmdError(f"The block at {x},{y},{z} is {self.world.db[have]['name']} "
                           f"(expected: {self.world.db[ident]['name']}).")
        if states and any(hst.get(k) != v for k, v in states.items()):
            raise CmdError(f"The block at {x},{y},{z} did not match the expected block state.")
        return {"statusCode": OK, "statusMessage": f"Successfully found the block at {x},{y},{z}."}

    def cmd_setblock(self, toks, ctx):
        x, y, z = self.bpos(self.pos3(toks, 1, ctx))
        ident, states, j = self.block_arg(toks, 4)
        mode = toks[j] if j < len(toks) else "replace"
        if not self.in_world(y):
            raise CmdError("Cannot place block outside of the world")
        cur = self.world.get(x, y, z)
        new_states = dict(self.world.defaults(ident), **states)
        if mode == "keep" and cur[0] != "air":
            raise CmdError("The block couldn't be placed")
        if cur == (ident, new_states):
            raise CmdError("The block couldn't be placed")
        self.world.set(x, y, z, ident, states)
        return {"statusCode": OK, "statusMessage": "Block placed"}

    def cmd_fill(self, toks, ctx):
        a = self.bpos(self.pos3(toks, 1, ctx))
        b = self.bpos(self.pos3(toks, 4, ctx))
        ident, states, j = self.block_arg(toks, 7)
        mode = toks[j] if j < len(toks) else "replace"
        rep = None
        if mode == "replace" and j + 1 < len(toks):
            rid, rst, _ = self.block_arg(toks, j + 1)
            rep = (rid, rst)
        lo = [min(a[k], b[k]) for k in range(3)]
        hi = [max(a[k], b[k]) for k in range(3)]
        vol = (hi[0] - lo[0] + 1) * (hi[1] - lo[1] + 1) * (hi[2] - lo[2] + 1)
        if vol > FILL_LIMIT:
            raise CmdError(f"Too many blocks in the specified area ({vol} > {FILL_LIMIT})")
        if not (self.in_world(lo[1]) and self.in_world(hi[1])):
            raise CmdError("Cannot place blocks outside of the world")
        n = 0
        for x in range(lo[0], hi[0] + 1):
            for y in range(lo[1], hi[1] + 1):
                for z in range(lo[2], hi[2] + 1):
                    edge = x in (lo[0], hi[0]) or y in (lo[1], hi[1]) or z in (lo[2], hi[2])
                    cur = self.world.get(x, y, z)
                    if mode == "keep" and cur[0] != "air":
                        continue
                    if mode == "outline" and not edge:
                        continue
                    if rep and (cur[0] != rep[0] or any(cur[1].get(k) != v for k, v in rep[1].items())):
                        continue
                    if mode == "hollow" and not edge:
                        self.world.set(x, y, z, "air")
                    else:
                        self.world.set(x, y, z, ident, states)
                    n += 1
        if not n:
            raise CmdError("No blocks filled")
        return {"statusCode": OK, "statusMessage": f"{n} blocks filled", "fillCount": n}

    def cmd_teleport(self, toks, ctx):
        targets, i = [ctx.executor], 1
        if len(toks) > 1 and (toks[1].startswith("@") or toks[1] == self.player.name):
            targets, i = self.select(toks[1], ctx), 2
        if len(toks) > i and (toks[i].startswith("@") or toks[i] == self.player.name):
            dest = self.select(toks[i], ctx)
            if not dest:
                raise CmdError("No targets matched selector", NO_TARGETS)
            pos = dest[0].pos
        else:
            pos = self.pos3(toks, i, ctx, center=True)
            i += 3
        for t in targets:
            t.pos = list(pos)
            if len(toks) > i + 1 and toks[i] not in ("facing", "true", "false"):
                t.yaw, t.pitch = (ctx.yaw + _num(toks[i][1:]) if toks[i].startswith("~") else float(toks[i])), \
                    (ctx.pitch + _num(toks[i + 1][1:]) if toks[i + 1].startswith("~") else float(toks[i + 1]))
        return {"statusCode": OK, "statusMessage": "Teleported %s to %.2f, %.2f, %.2f" %
                (", ".join(self.display(t) for t in targets), *pos)}

    def cmd_tellraw(self, toks, ctx):
        msg = json.loads(toks[2])
        text = "".join(p.get("text", "") for p in msg.get("rawtext", []))
        self.chat_log.append(("tellraw", text))
        if self.echo_tellraw:
            asyncio.ensure_future(self.emit("PlayerMessage", {"message": text, "receiver": self.player.name,
                                                              "sender": "", "type": "tellraw"}))
        return {"statusCode": OK, "statusMessage": ""}

    def cmd_say(self, toks, ctx):
        text = " ".join(toks[1:])
        self.chat_log.append(("say", "[External] " + text))
        asyncio.ensure_future(self.emit("PlayerMessage", {"message": text, "receiver": "", "sender": "External",
                                                          "type": "say"}))
        return {"statusCode": OK, "statusMessage": ""}

    def cmd_tell(self, toks, ctx):
        self.chat_log.append(("tell", " ".join(toks[2:])))
        return {"statusCode": OK, "statusMessage": ""}

    def cmd_time(self, toks, ctx):
        if len(toks) > 2 and toks[1] == "query":
            return {"statusCode": OK, "statusMessage": f"Daytime is {self.time % 24000}", "data": self.time % 24000}
        if len(toks) > 2 and toks[1] == "set":
            self.time = {"day": 1000, "noon": 6000, "night": 13000, "midnight": 18000}.get(toks[2]) or int(toks[2])
            return {"statusCode": OK, "statusMessage": f"Set the time to {self.time}"}
        return {"statusCode": OK, "statusMessage": ""}

    def cmd_summon(self, toks, ctx):
        pos = self.pos3(toks, 2, ctx, center=True) if len(toks) >= 5 else ctx.pos
        self.entities.append(Entity(toks[1], pos))
        return {"statusCode": OK, "statusMessage": "Object successfully summoned"}

    def cmd_kill(self, toks, ctx):
        victims = [e for e in self.select(toks[1] if len(toks) > 1 else "@s", ctx) if e is not self.player]
        self.entities = [e for e in self.entities if e not in victims]
        return {"statusCode": OK, "statusMessage": "Killed " + ", ".join(self.display(e) for e in victims)}

    def cmd_structure(self, toks, ctx):
        action, name = toks[1], toks[2]
        if action == "save":
            a, b = self.bpos(self.pos3(toks, 3, ctx)), self.bpos(self.pos3(toks, 6, ctx))
            lo = [min(a[k], b[k]) for k in range(3)]
            size = [abs(a[k] - b[k]) + 1 for k in range(3)]
            if any(size[k] > STRUCTURE_MAX[k] for k in range(3)):
                raise CmdError("A structure's size cannot be larger than (%d, %d, %d), it was (%d, %d, %d)"
                               % (*STRUCTURE_MAX, *size))
            blocks = {}
            for x in range(size[0]):
                for y in range(size[1]):
                    for z in range(size[2]):
                        blocks[(x, y, z)] = self.world.get(lo[0] + x, lo[1] + y, lo[2] + z)
            self.world.structures[name] = (size, blocks)
            return {"statusCode": OK, "statusMessage": f"Saved a structure with name {name}"}
        if action == "load":
            if name not in self.world.structures:
                raise CmdError(f"The structure {name} can't be found. Make sure the name was spelled correctly and try again.")
            to = self.bpos(self.pos3(toks, 3, ctx))
            size, blocks = self.world.structures[name]
            for (x, y, z), (ident, st) in blocks.items():
                self.world.set(to[0] + x, to[1] + y, to[2] + z, ident, st)
            return {"statusCode": OK, "statusMessage": f"Loaded a structure of name {name}"}
        if action == "delete":
            if self.world.structures.pop(name, None) is None:
                raise CmdError(f"The structure {name} can't be found. Make sure the name was spelled correctly and try again.")
            return {"statusCode": OK, "statusMessage": f"Structure {name} deleted."}
        raise CmdError("Unknown structure action provided")

    def cmd_execute(self, toks, ctx):
        ctxs, i, n = [ctx], 1, len(toks)
        while i < n:
            sub = toks[i].lower()
            if sub == "run":
                last = None
                for c in ctxs:
                    last = self.execute(" ".join(_requote(t) for t in toks[i + 1:]), c)
                if last is None:
                    raise CmdError("No targets matched selector", NO_TARGETS)
                return last
            if sub == "as":
                ctxs = [c.copy(executor=e) for c in ctxs for e in self.select(toks[i + 1], c)]
                i += 2
            elif sub == "at":
                ctxs = [c.copy(pos=list(e.pos), yaw=e.yaw, pitch=e.pitch) for c in ctxs for e in self.select(toks[i + 1], c)]
                i += 2
            elif sub == "positioned":
                if toks[i + 1] == "as":
                    ctxs = [c.copy(pos=list(e.pos)) for c in ctxs for e in self.select(toks[i + 2], c)]
                    i += 3
                else:
                    ctxs = [c.copy(pos=list(self.pos3(toks, i + 1, c))) for c in ctxs]
                    i += 4
            elif sub == "rotated":
                if toks[i + 1] == "as":
                    ctxs = [c.copy(yaw=e.yaw, pitch=e.pitch) for c in ctxs for e in self.select(toks[i + 2], c)]
                    i += 3
                else:
                    ctxs = [c.copy(yaw=float(toks[i + 1].lstrip("~") or 0) + (c.yaw if toks[i + 1].startswith("~") else 0),
                                   pitch=float(toks[i + 2].lstrip("~") or 0) + (c.pitch if toks[i + 2].startswith("~") else 0))
                            for c in ctxs]
                    i += 3
            elif sub == "anchored":
                if toks[i + 1] == "eyes":
                    ctxs = [c.copy(pos=[c.pos[0], c.pos[1] + 1.62, c.pos[2]]) for c in ctxs]
                i += 2
            elif sub == "align":
                ctxs = [c.copy(pos=[math.floor(v) if "xyz"[k] in toks[i + 1] else v for k, v in enumerate(c.pos)]) for c in ctxs]
                i += 2
            elif sub == "in":
                i += 2
            elif sub in ("if", "unless"):
                kind, keep = toks[i + 1], []
                if kind == "block":
                    for c in ctxs:
                        x, y, z = self.bpos(self.pos3(toks, i + 2, c))
                        ident, states, j = self.block_arg(toks, i + 5)
                        have, hst = self.world.get(x, y, z)
                        hit = have == ident and all(hst.get(k) == v for k, v in states.items())
                        if hit == (sub == "if"):
                            keep.append(c)
                    i = j
                elif kind == "entity":
                    keep = [c for c in ctxs if bool(self.select(toks[i + 2], c)) == (sub == "if")]
                    i += 3
                else:
                    raise CmdError(f'Syntax error: Unexpected "{kind}"', PARSE)
                ctxs = keep
                if i >= n:
                    if not ctxs:
                        raise CmdError("Test failed")
                    return {"statusCode": OK, "statusMessage": "Test passed"}
            else:
                raise CmdError(f'Syntax error: Unexpected "{toks[i]}": at "execute >>{toks[i]}<<"', PARSE)
        raise CmdError('Syntax error: Unexpected "": at "execute >><<"', PARSE)

    # ------------------------------------------------------------ Claude Link add-on emulation
    def addon_ping(self, toks, ctx):
        return {"statusCode": OK, "statusMessage": json.dumps({"claudeLink": "1.0.0", "api": "2.3.0"})}

    def _loaded(self, x, z):
        return abs(x - self.player.pos[0]) <= self.world.loaded_radius and abs(z - self.player.pos[2]) <= self.world.loaded_radius

    def addon_scan(self, toks, ctx):
        a = self.bpos(self.pos3(toks, 1, ctx))
        b = self.bpos(self.pos3(toks, 4, ctx))
        lo = [min(a[k], b[k]) for k in range(3)]
        size = [abs(a[k] - b[k]) + 1 for k in range(3)]
        vol = size[0] * size[1] * size[2]
        if vol > ADDON_SCAN_LIMIT:
            return {"statusCode": FAIL, "statusMessage": f"Too many blocks ({vol} > {ADDON_SCAN_LIMIT})"}

        def spec(x, y, z):
            if not self.in_world(y) or not self._loaded(x, z):
                return "?"
            return self.world.spec(x, y, z)
        return {"statusCode": OK, "statusMessage": json.dumps(codec.encode_scan(lo, size, spec), separators=(",", ":"))}

    def addon_heights(self, toks, ctx):
        a = self.bpos(self.pos3(toks, 1, ctx))
        b = self.bpos(self.pos3(toks, 4, ctx))
        x0, z0 = min(a[0], b[0]), min(a[2], b[2])
        sx, sz = abs(a[0] - b[0]) + 1, abs(a[2] - b[2]) + 1
        palette, index, top, ys = [], {}, [], []
        for z in range(z0, z0 + sz):
            for x in range(x0, x0 + sx):
                spec, y = "?", "_"
                if self._loaded(x, z):
                    for yy in range(MAX_Y, MIN_Y - 1, -1):
                        s = self.world.spec(x, yy, z)
                        if not s.startswith("air"):
                            spec, y = s, yy
                            break
                if spec not in index:
                    index[spec] = len(palette)
                    palette.append(spec)
                top.append(index[spec])
                ys.append(y)
        out = {"v": 1, "from": [x0, z0], "size": [sx, sz], "palette": palette, "top": codec.rle_encode(top),
               "y": codec.rle_encode(ys)}
        return {"statusCode": OK, "statusMessage": json.dumps(out, separators=(",", ":"))}

    def addon_sense(self, toks, ctx):
        radius = int(toks[1]) if len(toks) > 1 else 16
        p = self.player
        bx, by, bz = self.bpos(p.pos)
        look = None
        hit = self._raycast(p)
        if hit:
            look = {"block": self.world.spec(*hit[0]), "pos": list(hit[0]), "face": hit[1]}
        ents = []
        if radius > 0:
            for e in self.entities:
                d = math.dist(e.pos, p.pos)
                if e is not p and d <= radius:
                    ents.append({"type": codec.strip_ns(e.type), "name": e.name, "pos": [round(v, 2) for v in e.pos],
                                 "dist": round(d, 1), "health": e.health})
            ents.sort(key=lambda e: e["dist"])
        out = {"v": 1, "player": {"name": p.name, "pos": [round(v, 3) for v in p.pos], "block": [bx, by, bz],
                                  "yaw": p.yaw, "pitch": p.pitch, "dim": "overworld", "biome": "plains",
                                  "health": 20, "maxHealth": 20, "gamemode": self.gamemode,
                                  "selected": self.inventory.get(0, (None,))[0], "slot": 0, "looking": look},
               "time": {"tod": self.time % 24000, "day": self.time // 24000}, "entities": ents[:40]}
        return {"statusCode": OK, "statusMessage": json.dumps(out, separators=(",", ":"))}

    def addon_inventory(self, toks, ctx):
        slots = [{"slot": k, "item": v[0], "count": v[1]} for k, v in sorted(self.inventory.items())]
        return {"statusCode": OK, "statusMessage": json.dumps({"v": 1, "selected": 0, "size": 36, "slots": slots})}

    def _raycast(self, p, maxd=64.0):
        r = math.radians
        d = (-math.sin(r(p.yaw)) * math.cos(r(p.pitch)), -math.sin(r(p.pitch)), math.cos(r(p.yaw)) * math.cos(r(p.pitch)))
        pos = [p.pos[0], p.pos[1] + 1.62, p.pos[2]]
        prev = self.bpos(pos)
        t = 0.0
        while t < maxd:
            t += 0.05
            q = [pos[k] + d[k] * t for k in range(3)]
            b = self.bpos(q)
            if b != prev:
                if self.world.get(*b)[0] not in ("air", "water"):
                    diff = [b[k] - prev[k] for k in range(3)]
                    face = {(0, -1, 0): "Up", (0, 1, 0): "Down", (1, 0, 0): "West", (-1, 0, 0): "East",
                            (0, 0, 1): "North", (0, 0, -1): "South"}.get(tuple(diff), "Up")
                    return b, face
                prev = b
        return None


def _requote(t: str) -> str:
    if not t or t[0] in "[{@~^" or re.fullmatch(r"[\w:.\-+]+", t):
        return t
    return json.dumps(t)


NOOP_COMMANDS = {"playsound", "particle", "title", "titleraw", "effect", "gamemode", "give", "clear", "weather",
                 "tickingarea", "gamerule", "difficulty", "daylock", "alwaysday", "camerashake", "spawnpoint",
                 "setworldspawn", "me", "stopsound", "music", "fog", "hud", "camera", "scoreboard", "tag",
                 "function", "enchant", "xp", "replaceitem", "closewebsocket", "wsserver", "locate", "dialogue",
                 "inputpermission", "ride", "damage", "event", "mobevent", "schedule", "scriptevent", "place",
                 "loot", "recipe", "clearspawnpoint", "spreadplayers", "playanimation", "aimassist", "controlscheme"}


async def _main(port: int, addon: bool, chats: list, stay: float):
    game = FakeMinecraft(addon=addon)
    await game.connect("127.0.0.1", port)
    print(f"fake Minecraft connected to port {port} (addon={addon})", flush=True)
    await asyncio.sleep(1.0)
    for text in chats:
        await game.chat(text)
        print(f"<{game.player.name}> {text}", flush=True)
        await asyncio.sleep(0.5)
    end = asyncio.get_running_loop().time() + stay
    while asyncio.get_running_loop().time() < end and not game.ws.closed:
        await asyncio.sleep(0.2)
    await game.close()


if __name__ == "__main__":  # python -m mclive.fakemc --port 19134 [--no-addon] [--chat "hi"] [--stay 600]
    import argparse
    ap = argparse.ArgumentParser(description="Pretend to be Minecraft: connect to a running bridge")
    ap.add_argument("--port", type=int, default=19134)
    ap.add_argument("--no-addon", action="store_true")
    ap.add_argument("--chat", action="append", default=[], help="chat line the player types after connecting")
    ap.add_argument("--stay", type=float, default=600, help="seconds to stay connected")
    a = ap.parse_args()
    asyncio.run(_main(a.port, not a.no_addon, a.chat, a.stay))
