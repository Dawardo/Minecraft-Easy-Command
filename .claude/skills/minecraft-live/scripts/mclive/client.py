"""HTTP client for the bridge's local API (what the `mc` CLI uses)."""
from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from pathlib import Path


def unexpand_home(v: str) -> str:
    """Undo shell tilde expansion: bash turns a bare `~` (a Minecraft 'relative 0' coordinate) into the home
    folder before we see it. Git Bash on Windows also rewrites /c/Users/x to C:/Users/x, so compare loosely."""
    def norm(p):
        return os.path.normcase(os.path.normpath(p)).replace("\\", "/").rstrip("/") if p else None
    homes = {norm(h) for h in (os.path.expanduser("~"), os.environ.get("HOME"), os.environ.get("USERPROFILE")) if h}
    return "~" if v and ("/" in v or "\\" in v) and norm(v) in homes else v


class BridgeError(Exception):
    pass


class NotConnected(BridgeError):
    pass


def state_dir() -> Path:
    d = Path(os.environ.get("MC_CLAUDE_HOME") or (Path.home() / ".mc-claude"))
    d.mkdir(parents=True, exist_ok=True)
    return d


def read_state():
    try:
        return json.loads((state_dir() / "bridge.json").read_text())
    except Exception:
        return None


class Client:
    def __init__(self, port: int | None = None, token: str | None = None):
        if port is None or token is None:
            st = read_state()
            if not st:
                raise BridgeError("The bridge is not running. Start it with:  mc start")
            port, token = st["port"], st["token"]
        self.port, self.token = port, token

    def request(self, method: str, path: str, data=None, timeout: float = 30.0) -> dict:
        body = json.dumps(data).encode() if data is not None else None
        req = urllib.request.Request(f"http://127.0.0.1:{self.port}{path}", data=body, method=method,
                                     headers={"X-MC-Token": self.token, "Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return json.loads(r.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            try:
                payload = json.loads(e.read().decode("utf-8"))
            except Exception:
                payload = {"error": str(e)}
            if e.code == 409:
                raise NotConnected(payload.get("error", "Minecraft is not connected"))
            raise BridgeError(payload.get("error", str(e)))
        except (urllib.error.URLError, ConnectionError, OSError) as e:
            raise BridgeError(f"Cannot reach the bridge on port {self.port} ({e}). Is it running?  mc start")

    # ------------------------------------------------------------------ API
    def status(self) -> dict:
        return self.request("GET", "/api/status", timeout=10)

    def wait_connect(self, timeout: float = 60) -> dict:
        return self.request("GET", f"/api/wait-connect?timeout={timeout}", timeout=timeout + 10)

    def run(self, commands, timeout: float = 10.0, stop_on_error: bool = False) -> dict:
        commands = list(commands)
        http_timeout = timeout + 30 + len(commands) * 0.05
        return self.request("POST", "/api/run", {"commands": commands, "timeout": timeout,
                                                 "stop_on_error": stop_on_error}, timeout=http_timeout)

    def cmd(self, line: str, timeout: float = 10.0) -> dict:
        return self.run([line], timeout)["results"][0]

    def events(self, since: int = 0, wait: float = 0, types=None, chat: bool = False, limit: int = 500) -> dict:
        q = f"/api/events?since={since}&wait={wait}&limit={limit}"
        if types:
            q += "&types=" + ",".join(types)
        if chat:
            q += "&chat=1"
        return self.request("GET", q, timeout=wait + 15)

    def subscribe(self, events) -> dict:
        return self.request("POST", "/api/subscribe", {"events": list(events)})

    def unsubscribe(self, events) -> dict:
        return self.request("POST", "/api/unsubscribe", {"events": list(events)})

    def encrypt(self) -> dict:
        return self.request("POST", "/api/encrypt", {})

    def shutdown(self) -> dict:
        return self.request("POST", "/api/shutdown", {})

    # ------------------------------------------------------------------ helpers
    def addon(self, refresh: bool = False) -> bool:
        """Is the Claude Link add-on active in this world? The bridge checks once per connection."""
        if not refresh:
            ses = self.status().get("session") or {}
            if ses.get("addon") is not None:
                return bool(ses["addon"])
        res = self.cmd("claude:ping", timeout=8)
        return bool(res.get("ok")) and "claudeLink" in str(res.get("message", ""))
