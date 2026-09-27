#!/usr/bin/env python3
"""mc - let Claude see and act in a running Minecraft Bedrock world.

Start:    mc start                 (then in Minecraft chat:  /connect localhost:19134)
Look:     mc status | mc where | mc look | mc scan X1 Y1 Z1 X2 Y2 Z2
Act:      mc run "setblock ~ ~ ~2 stone" ... | mc run -f build.mcfunction | mc say "hi"
Build:    mc build house.txt --here | mc undo
Chat:     mc chat --wait 120
Run `mc <command> -h` for options. Standard library only (Python 3.8+).
"""
from __future__ import annotations

import argparse
import json
import math
import os
import subprocess
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
SPATIAL = HERE.parent.parent / "minecraft-spatial" / "scripts"
if SPATIAL.is_dir():
    sys.path.insert(0, str(SPATIAL))

from mclive import render, senses  # noqa: E402
from mclive.client import BridgeError, Client, NotConnected, read_state, state_dir, unexpand_home  # noqa: E402

DEFAULT_PORT = 19134


def out(text=""):
    try:
        print(text, flush=True)
    except UnicodeEncodeError:  # old Windows consoles
        print(str(text).encode("ascii", "replace").decode(), flush=True)


def fmt_result(r: dict, verbose=False) -> str:
    mark = "OK " if r.get("ok") else "ERR"
    msg = (r.get("message") or "").strip()
    if not r.get("ok") and r.get("status"):
        msg = f"[{r['status']}] {msg}"
    body = r.get("body")
    extra = f"  {json.dumps(body, ensure_ascii=False)[:300]}" if verbose and body else ""
    return f"{mark} /{r.get('command')}" + (f"  ->  {msg}" if msg else "") + extra


# ---------------------------------------------------------------- bridge lifecycle
def bridge_alive(st=None) -> bool:
    st = st or read_state()
    if not st:
        return False
    try:
        Client(st["port"], st["token"]).status()
        return True
    except BridgeError:
        return False


def cmd_start(a):
    st = read_state()
    if st and bridge_alive(st):
        out(f"Bridge already running on port {st['port']} (pid {st['pid']}).")
        return _print_connect_hint(Client(st["port"], st["token"]))
    logf = open(state_dir() / "bridge.log", "a", encoding="utf-8")
    args = [sys.executable, str(HERE / "mc.py"), "serve", "--port", str(a.port), "--encryption", a.encryption]
    if a.lan:
        args.append("--lan")
    kw = dict(stdout=logf, stderr=subprocess.STDOUT, stdin=subprocess.DEVNULL, cwd=str(HERE))
    if os.name == "nt":
        kw["creationflags"] = 0x00000008 | 0x00000200 | 0x08000000  # DETACHED, NEW_PROCESS_GROUP, NO_WINDOW
    else:
        kw["start_new_session"] = True
    proc = subprocess.Popen(args, **kw)
    for _ in range(100):
        time.sleep(0.1)
        st = read_state()
        if st and st.get("pid") == proc.pid and bridge_alive(st):
            out(f"Bridge started on port {st['port']} (pid {proc.pid}). Log: {state_dir() / 'bridge.log'}")
            return _print_connect_hint(Client(st["port"], st["token"]))
        if proc.poll() is not None:
            break
    out("The bridge did not start. Last log lines:")
    try:
        out("\n".join((state_dir() / "bridge.log").read_text(encoding="utf-8", errors="replace").splitlines()[-15:]))
    except OSError:
        pass
    return 1


def _print_connect_hint(c: Client):
    s = c.status()
    if s["connected"]:
        ses = s["session"]
        out(f"Minecraft is connected: player {ses['player']}, encrypted={ses['encrypted']}.")
    else:
        out(f"Waiting for Minecraft. In Minecraft (cheats on) open chat and type:  /connect localhost:{c.port}")
    return 0


def cmd_serve(a):
    from mclive import bridge
    st = read_state()
    if st and bridge_alive(st) and not a.replace:
        out(f"Bridge already running on port {st['port']} (pid {st['pid']}). Use --replace to restart it.")
        return 0
    if st and a.replace and bridge_alive(st):
        stop_bridge(st)
    return bridge.main(["--port", str(a.port), "--encryption", a.encryption] + (["--lan"] if a.lan else [])
                       + (["--no-greet"] if a.no_greet else []))


def stop_bridge(st, timeout: float = 10.0) -> bool:
    """Ask the bridge to exit and wait until it really has (so a following `mc start` starts a fresh one)."""
    try:
        Client(st["port"], st["token"]).shutdown()
    except BridgeError:
        return True
    deadline = time.time() + timeout
    while time.time() < deadline:
        time.sleep(0.1)
        if not bridge_alive(st):
            try:
                cur = read_state()
                if cur and cur.get("pid") == st.get("pid"):
                    (state_dir() / "bridge.json").unlink()
            except OSError:
                pass
            return True
    return False


def cmd_stop(a):
    st = read_state()
    if not st or not bridge_alive(st):
        out("Bridge is not running.")
        return 0
    if stop_bridge(st):
        out("Bridge stopped.")
        return 0
    out(f"The bridge (pid {st.get('pid')}) did not stop within 10s.")
    return 1


def cmd_status(a):
    c = Client()
    s = c.status()
    b = s["bridge"]
    out(f"Bridge {b['version']} on port {b['port']} (pid {b['pid']}, up {b['uptime']}s, encryption {b['encryption']}, "
        f"crypto {b['cryptoBackend']}).")
    if not s["connected"]:
        out(f"Minecraft: NOT connected. In Minecraft chat type:  /connect localhost:{b['port']}")
        return 1
    ses = s["session"]
    out(f"Minecraft: connected. Player {ses['player']}, from {ses['peer']}, encrypted={ses['encrypted']}, "
        f"commands sent {ses['commandsSent']}, in flight {ses['inFlight']}, command version {ses['commandVersion']}.")
    try:
        out("Claude Link add-on: " + ("active (fast exact vision)" if c.addon() else
                                      "not installed (vision uses slower /testforblock probing; see `mc addon`)"))
    except BridgeError as e:
        out(f"Add-on check failed: {e}")
    return 0


def cmd_wait(a):
    c = Client()
    s = c.wait_connect(a.timeout)
    if s["connected"]:
        out(f"Connected: player {s['session']['player']} (encrypted={s['session']['encrypted']}).")
        return 0
    out(f"Still not connected after {a.timeout:g}s. In Minecraft (cheats on) type:  /connect localhost:{c.port}")
    return 1


# ---------------------------------------------------------------- commands and chat
def read_commands(a):
    lines = list(a.commands or [])
    for f in a.file or []:
        text = sys.stdin.read() if f == "-" else Path(f).read_text(encoding="utf-8")
        lines += [ln.strip() for ln in text.splitlines() if ln.strip() and not ln.strip().startswith("#")]
    return lines


def cmd_run(a):
    lines = read_commands(a)
    if not lines:
        out("Nothing to run.")
        return 2
    c = Client()
    res = c.run(lines, timeout=a.timeout, stop_on_error=a.stop_on_error)
    results = res["results"]
    bad = [r for r in results if not r["ok"]]
    if a.json:
        out(json.dumps(res, indent=1, ensure_ascii=False))
    elif len(results) <= a.show:
        for r in results:
            out(fmt_result(r, a.verbose))
    else:
        for r in bad[:a.show]:
            out(fmt_result(r, a.verbose))
    if len(results) > 1:
        out(f"{len(results) - len(bad)}/{len(results)} succeeded in {res['elapsed']}s"
            + (f", {res['skipped']} not sent (stopped after an error)" if res.get("skipped") else ""))
    return 0 if not bad else 1


def tellraw(text: str, target="@a") -> str:
    msg = {"rawtext": [{"text": "§d[Claude]§r " + text}]}
    return f"tellraw {target} " + json.dumps(msg, ensure_ascii=False)


def cmd_say(a):
    c = Client()
    text = " ".join(a.text)
    r = c.cmd(tellraw(text, a.to))
    out(fmt_result(r) if not r["ok"] else "Sent.")
    return 0 if r["ok"] else 1


def _cursor_file():
    return state_dir() / "chat_cursor.json"


def cmd_chat(a):
    """Print chat messages. By default only the connected player's own messages that are new since the last call."""
    c = Client()
    st = c.status()
    ses = st.get("session") or {}
    # session ids restart in every bridge process, so key the read position on the bridge too
    key = f"{st['bridge']['pid']}:{ses.get('id')}:{ses.get('since')}"
    since = a.since
    if since is None:
        try:
            cur = json.loads(_cursor_file().read_text())
            since = cur["seq"] if cur.get("session") == key else 0
        except Exception:
            since = 0
    deadline = time.time() + a.wait
    shown = 0
    while True:
        left = max(0.0, deadline - time.time())
        r = c.events(since=since, wait=left, types=["PlayerMessage"], chat=True)
        for e in r["events"]:
            since = max(since, e["seq"])
            b = e["body"]
            mine = not ses.get("player") or b.get("sender") == ses.get("player")
            if not a.all and not mine:
                continue
            who = b.get("sender") or "?"
            tag = "" if mine else " (another player)"
            out(f"[{time.strftime('%H:%M:%S', time.localtime(e['t']))}] <{who}>{tag} ({b.get('type')}) {b.get('message')}")
            shown += 1
        if shown or time.time() >= deadline:
            break
    _cursor_file().write_text(json.dumps({"session": key, "seq": since}))
    if not shown:
        out("(no new chat messages)")
    return 0


def cmd_events(a):
    c = Client()
    r = c.events(since=a.since, wait=a.wait, types=a.type or None, limit=a.limit)
    for e in r["events"]:
        out(json.dumps(e, ensure_ascii=False))
    out(f"(last event seq {r['last']})")
    return 0


def cmd_subscribe(a):
    c = Client()
    r = (c.unsubscribe if a.off else c.subscribe)(a.events)
    out("Subscriptions: " + ", ".join(r["subscriptions"]))
    return 0


# ---------------------------------------------------------------- senses
def cmd_where(a):
    c = Client()
    w = senses.where(c)
    if a.json:
        out(json.dumps(w))
    else:
        out(senses.describe_where(w))
    return 0


def cmd_look(a):
    c = Client()
    w = senses.where(c)
    bx, by, bz = w["block"]
    r, up, down = a.radius, a.up, a.down
    addon = c.addon()
    if addon or a.layers:
        region = senses.scan(c, (bx - r, by - down, bz - r), (bx + r, by + up, bz + r), method="auto" if addon else "probe")
    else:
        region = senses.surface_probe(c, (bx, by, bz), r, up, down)
    if not w.get("looking") and not addon:
        try:
            w["looking"] = senses.looking_probe(c)
        except BridgeError:
            pass
    out(senses.describe_where(w))
    try:
        ents = senses.nearby(c, max(16, r))
    except BridgeError:
        ents = []
    if ents:
        parts = []
        for e in ents[:20]:
            label = e.get("type") or ""
            if e.get("name"):
                label = f"{label} \"{e['name']}\"".strip()
            if e.get("pos"):
                ex, ey, ez = e["pos"]
                dx, dz = ex - w["pos"][0], ez - w["pos"][2]
                dirs = ("%d %s" % (abs(round(dz)), "S" if dz > 0 else "N") if abs(dz) >= 0.5 else "") + \
                       (" " if abs(dz) >= 0.5 and abs(dx) >= 0.5 else "") + \
                       ("%d %s" % (abs(round(dx)), "E" if dx > 0 else "W") if abs(dx) >= 0.5 else "")
                label += f" at block {math.floor(ex)} {math.floor(ey)} {math.floor(ez)} ({dirs or 'here'})"
            parts.append(label)
        out("Nearby entities: " + "; ".join(parts))
    else:
        out("Nearby entities: none")
    out("")
    out(render.topdown(region, player_block=(bx, by, bz)))
    if a.layers:
        out("")
        out(render.layers(region, player_block=(bx, by, bz)))
    if not addon:
        out("\n(vision: /testforblock probing. Install the Claude Link add-on for exact ids, block states and speed: `mc addon`)")
    return 0


def parse_box(vals, center=None):
    if len(vals) != 6:
        raise SystemExit("need 6 numbers: X1 Y1 Z1 X2 Y2 Z2 (use ~ for relative to you, e.g. ~-5 ~-2 ~-5 ~5 ~3 ~5)")
    out_ = []
    for i, v in enumerate(unexpand_home(x) for x in vals):
        if v.startswith("~"):
            if center is None:
                raise SystemExit("~ coordinates need the player position")
            out_.append(center[i % 3] + (int(float(v[1:])) if len(v) > 1 else 0))
        else:
            out_.append(int(float(v)))
    return out_[:3], out_[3:]


def cmd_scan(a):
    c = Client()
    center = senses.where(c)["block"] if any(unexpand_home(v).startswith("~") for v in a.box) else None
    lo, hi = parse_box(a.box, center)
    vol = (abs(hi[0] - lo[0]) + 1) * (abs(hi[1] - lo[1]) + 1) * (abs(hi[2] - lo[2]) + 1)
    method = a.method
    if method == "auto":
        method = "addon" if c.addon() else "probe"
    if method == "probe" and vol > a.max_probe:
        raise SystemExit(f"{vol} blocks is a lot to probe with /testforblock (limit {a.max_probe}). "
                         "Use a smaller box, --max-probe N, or install the add-on (`mc addon`).")
    t0 = time.time()
    region = senses.scan(c, lo, hi, method=method)
    if a.out:
        Path(a.out).write_text(json.dumps(region.to_scan()), encoding="utf-8")
        out(f"Saved to {a.out}")
    out(render.summary(region) + f"  [{method}, {time.time() - t0:.1f}s]")
    pb = tuple(center) if center else None
    if a.view in ("layers", "both"):
        out(render.layers(region, player_block=pb))
    if a.view in ("top", "both"):
        out(render.topdown(region, player_block=pb))
    return 0


def cmd_inventory(a):
    c = Client()
    if not c.addon():
        out("Reading the inventory needs the Claude Link add-on (`mc addon`). Without it: mc run \"clear @s <item> 0 0\" counts one item.")
        return 1
    r = c.cmd("claude:inventory")
    if not r["ok"]:
        out(fmt_result(r))
        return 1
    d = json.loads(r["message"])
    sel = d.get("selected")
    for s_ in d.get("slots", []):
        mark = " <- held" if s_["slot"] == sel else ""
        name = f" \"{s_['name']}\"" if s_.get("name") else ""
        out(f"slot {s_['slot']:>2}: {s_['item']} x{s_['count']}{name}{mark}")
    if d.get("armor"):
        out("worn: " + ", ".join(f"{k} {v}" for k, v in d["armor"].items()))
    if not d.get("slots"):
        out("(inventory empty)")
    return 0


def cmd_launch(a):
    """Open Minecraft Bedrock (Windows) via its minecraft: link."""
    if os.name != "nt":
        out("Launching only works on Windows (Minecraft Bedrock for Windows). Open Minecraft yourself.")
        return 1
    os.startfile("minecraft:")  # noqa: S606 - opens the installed Minecraft app
    out("Starting Minecraft. Open a world with cheats on, then type in chat:  /connect localhost:%d" % DEFAULT_PORT)
    return 0


def cmd_heights(a):
    c = Client()
    center = senses.where(c)["block"]
    r = a.radius
    h = senses.heights(c, center[0] - r, center[2] - r, center[0] + r, center[2] + r)
    ys = [v[0] for v in h.values() if v and v[0] is not None]
    out(f"Terrain {2 * r + 1}x{2 * r + 1} around {center[0]} {center[2]}: y from {min(ys)} to {max(ys)}")
    step = max(1, (2 * r + 1) // 40)
    xs = range(center[0] - r, center[0] + r + 1, step)
    out("Absolute height of the top block (every %d block%s). North is up." % (step, "s" if step > 1 else ""))
    out("        " + " ".join(f"{x:>4}" for x in xs))
    for z in range(center[2] - r, center[2] + r + 1, step):
        row = []
        for x in xs:
            v = h.get((x, z))
            row.append("   @" if (x, z) == (center[0], center[2]) else (f"{v[0]:>4}" if v and v[0] is not None else "   ?"))
        out(f"z={z:<5} " + " ".join(row))
    return 0


# ---------------------------------------------------------------- building (see mclive/build.py)
def cmd_build(a):
    from mclive import build
    return build.cli_build(a, Client(), out)


def cmd_spot(a):
    from mclive import build
    c = Client()
    w = senses.where(c)
    spots = build.find_spots(c, a.width, a.depth, w["block"], a.radius, a.max_step)
    if not spots:
        out(f"No flat, clear {a.width}x{a.depth} spot within {a.radius} blocks. Try a larger --radius or --max-step 2.")
        return 1
    out(f"Flat, clear {a.width}x{a.depth} (x by z) spots near you, nearest first. Build with: mc build <file> --at X Y Z")
    for x, z, y, d in spots:
        card = senses.facing(__import__("math").degrees(__import__("math").atan2(-(x + (a.width - 1) / 2 - w["pos"][0]),
                                                                                 z + (a.depth - 1) / 2 - w["pos"][2])))[0]
        out(f"  --at {x} {y + 1} {z}   (ground y={y}, {d:g} blocks {card} of you)")
    return 0


def cmd_undo(a):
    from mclive import build
    return build.cli_undo(a, Client(), out)


def cmd_addon(a):
    from mclive import install
    return install.cli(a, out)


def cmd_selftest(a):
    from mclive import selftest
    return selftest.run(out, encrypted=not a.plain)


def cmd_doctor(a):
    from mclive import install
    return install.doctor(out)


def main(argv=None):
    ap = argparse.ArgumentParser(prog="mc", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd")

    p = sub.add_parser("start", help="start the bridge in the background")
    p.add_argument("--port", type=int, default=DEFAULT_PORT)
    p.add_argument("--encryption", choices=["auto", "on", "off"], default="auto")
    p.add_argument("--lan", action="store_true", help="accept Minecraft running on another device")
    p.set_defaults(fn=cmd_start)
    p = sub.add_parser("serve", help="run the bridge in the foreground")
    p.add_argument("--port", type=int, default=DEFAULT_PORT)
    p.add_argument("--encryption", choices=["auto", "on", "off"], default="auto")
    p.add_argument("--lan", action="store_true")
    p.add_argument("--no-greet", action="store_true")
    p.add_argument("--replace", action="store_true")
    p.set_defaults(fn=cmd_serve)
    sub.add_parser("stop", help="stop the bridge").set_defaults(fn=cmd_stop)
    sub.add_parser("status", help="bridge + connection status").set_defaults(fn=cmd_status)
    p = sub.add_parser("wait", help="wait until Minecraft connects")
    p.add_argument("--timeout", type=float, default=120)
    p.set_defaults(fn=cmd_wait)

    p = sub.add_parser("run", help="run commands in the game")
    p.add_argument("commands", nargs="*", help="each argument is one command (leading / optional)")
    p.add_argument("-f", "--file", action="append", help=".mcfunction/text file with one command per line (- = stdin)")
    p.add_argument("--timeout", type=float, default=10)
    p.add_argument("--stop-on-error", action="store_true")
    p.add_argument("--show", type=int, default=30, help="print at most this many results")
    p.add_argument("-v", "--verbose", action="store_true")
    p.add_argument("--json", action="store_true")
    p.set_defaults(fn=cmd_run)
    p = sub.add_parser("say", help="send a chat message to players as [Claude]")
    p.add_argument("text", nargs="+")
    p.add_argument("--to", default="@a")
    p.set_defaults(fn=cmd_say)
    p = sub.add_parser("chat", help="read new chat messages from the player")
    p.add_argument("--wait", type=float, default=0, help="seconds to wait for a message")
    p.add_argument("--since", type=int, default=None)
    p.add_argument("--all", action="store_true", help="include other players")
    p.set_defaults(fn=cmd_chat)
    p = sub.add_parser("events", help="raw event log")
    p.add_argument("--since", type=int, default=0)
    p.add_argument("--wait", type=float, default=0)
    p.add_argument("--type", action="append")
    p.add_argument("--limit", type=int, default=50)
    p.set_defaults(fn=cmd_events)
    p = sub.add_parser("subscribe", help="subscribe to game events (e.g. PlayerTravelled BlockPlaced BlockBroken)")
    p.add_argument("events", nargs="+")
    p.add_argument("--off", action="store_true")
    p.set_defaults(fn=cmd_subscribe)

    p = sub.add_parser("where", help="player position, facing and directions")
    p.add_argument("--json", action="store_true")
    p.set_defaults(fn=cmd_where)
    p = sub.add_parser("look", help="map of the blocks and mobs around the player")
    p.add_argument("-r", "--radius", type=int, default=8)
    p.add_argument("--up", type=int, default=4)
    p.add_argument("--down", type=int, default=6)
    p.add_argument("--layers", action="store_true", help="also print every horizontal slice")
    p.set_defaults(fn=cmd_look)
    p = sub.add_parser("scan", help="read all blocks in a box")
    p.add_argument("box", nargs=6, metavar="C", help="X1 Y1 Z1 X2 Y2 Z2 (~ = relative to the player)")
    p.add_argument("--method", choices=["auto", "addon", "probe"], default="auto")
    p.add_argument("--view", choices=["layers", "top", "both", "none"], default="layers")
    p.add_argument("--out", help="save the scan as JSON (reusable as a blueprint)")
    p.add_argument("--max-probe", type=int, default=6000)
    p.set_defaults(fn=cmd_scan)
    sub.add_parser("inventory", help="the player's inventory (add-on)").set_defaults(fn=cmd_inventory)
    sub.add_parser("launch", help="open Minecraft (Windows)").set_defaults(fn=cmd_launch)
    p = sub.add_parser("heights", help="terrain height map around the player (add-on)")
    p.add_argument("-r", "--radius", type=int, default=32)
    p.set_defaults(fn=cmd_heights)

    p = sub.add_parser("build", help="build a blueprint (.txt layers, .json, or a saved scan) or a --shape")
    p.add_argument("blueprint", nargs="?")
    p.add_argument("--shape", help='instead of a file, e.g. "sphere radius=5 block=glass hollow" or '
                                   '"cylinder radius=3 height=8 block=stone_bricks hollow"')
    p.add_argument("--sink", type=int, default=0, help="with --here: lower the build N blocks (1 = replace the ground)")
    g = p.add_mutually_exclusive_group()
    g.add_argument("--at", nargs=3, metavar=("X", "Y", "Z"), help="world position of the blueprint origin")
    g.add_argument("--here", action="store_true", help="in front of the player, front side facing the player")
    g.add_argument("--center", nargs=3, metavar=("X", "Y", "Z"),
                   help="horizontal centre at X Z, bottom layer at Y (~ allowed): 'dome over me' = --center ~ ~ ~")
    p.add_argument("--gap", type=int, default=2, help="with --here: empty blocks between you and the build")
    p.add_argument("--rotate", type=int, choices=[0, 90, 180, 270], default=None, help="clockwise, seen from above")
    p.add_argument("--dry-run", action="store_true", help="print the commands only")
    p.add_argument("--no-undo", action="store_true")
    p.add_argument("--verify", action="store_true", help="scan afterwards and report differences")
    p.add_argument("--save", help="write the commands to this .mcfunction file")
    p.add_argument("--force", action="store_true", help="build even over blocks that look player-made")
    p.set_defaults(fn=cmd_build)
    p = sub.add_parser("spot", help="find flat, clear ground for a W x D footprint near the player")
    p.add_argument("width", type=int, help="size along x (east-west)")
    p.add_argument("depth", type=int, help="size along z (north-south)")
    p.add_argument("-r", "--radius", type=int, default=24)
    p.add_argument("--max-step", type=int, default=1, help="allowed height difference inside the footprint")
    p.set_defaults(fn=cmd_spot)
    p = sub.add_parser("undo", help="restore the area before the last build")
    p.add_argument("--list", action="store_true")
    p.add_argument("--purge", action="store_true", help="delete all saved undo snapshots")
    p.set_defaults(fn=cmd_undo)
    p = sub.add_parser("addon", help="install the Claude Link add-on (fast exact vision)")
    p.add_argument("--world", help="also enable it in this world (name as shown in Minecraft)")
    p.add_argument("--path", help="com.mojang folder (auto-detected)")
    p.add_argument("--list-worlds", action="store_true")
    p.set_defaults(fn=cmd_addon)
    p = sub.add_parser("selftest", help="end-to-end test against a simulated Minecraft (no game needed)")
    p.add_argument("--plain", action="store_true", help="test without encryption")
    p.set_defaults(fn=cmd_selftest)
    sub.add_parser("doctor", help="check this PC's setup").set_defaults(fn=cmd_doctor)

    for stream in (sys.stdout, sys.stderr):  # Windows consoles default to cp1252
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except (AttributeError, ValueError):
            pass
    a = ap.parse_args(argv)
    if not getattr(a, "fn", None):
        ap.print_help()
        return 0
    try:
        return a.fn(a) or 0
    except NotConnected as e:
        out(f"Not connected: {e}")
        return 3
    except BridgeError as e:
        out(f"Bridge problem: {e}")
        return 4
    except KeyboardInterrupt:
        return 130


if __name__ == "__main__":
    sys.exit(main())
