"""Install the Claude Link add-on into Minecraft, and check this PC's setup (`mc addon`, `mc doctor`).

Only files inside com.mojang are touched: the pack is copied into development_behavior_packs, and with
--world the world's world_behavior_packs.json gets one entry (a .bak copy is written first).
level.dat is never modified - cheats must be switched on in the game (Edit World > Cheats).
"""
from __future__ import annotations

import json
import os
import shutil
import socket
import sys
import time
from pathlib import Path

ADDON = Path(__file__).resolve().parents[2] / "addon" / "claude_link"
PACK_DIR_NAME = "claude_link"


def addon_manifest() -> dict:
    return json.loads((ADDON / "manifest.json").read_text(encoding="utf-8"))


def com_mojang_candidates():
    """Every com.mojang folder that exists on this PC (Windows GDK, older UWP, Preview)."""
    found = []
    env = os.environ
    roots = []
    if env.get("APPDATA"):
        for edition in ("Minecraft Bedrock", "Minecraft Bedrock Preview"):
            base = Path(env["APPDATA"]) / edition / "Users"
            if base.is_dir():
                roots += sorted(base.glob("*/games/com.mojang"))
    if env.get("LOCALAPPDATA"):
        for pkg in ("Microsoft.MinecraftUWP_8wekyb3d8bbwe", "Microsoft.MinecraftWindowsBeta_8wekyb3d8bbwe"):
            roots.append(Path(env["LOCALAPPDATA"]) / "Packages" / pkg / "LocalState" / "games" / "com.mojang")
    if env.get("MC_COM_MOJANG"):
        roots.insert(0, Path(env["MC_COM_MOJANG"]))
    for r in roots:
        if r.is_dir() and r not in found:
            found.append(r)
    return found


def worlds(roots):
    out = []
    for r in roots:
        for d in sorted((r / "minecraftWorlds").glob("*")) if (r / "minecraftWorlds").is_dir() else []:
            try:
                name = (d / "levelname.txt").read_text(encoding="utf-8", errors="replace").strip()
            except OSError:
                name = d.name
            try:
                mtime = max(p.stat().st_mtime for p in [d, *(d / "db").glob("*")] if p.exists())
            except ValueError:
                mtime = d.stat().st_mtime
            out.append({"name": name, "path": d, "root": r, "mtime": mtime})
    return sorted(out, key=lambda w: -w["mtime"])


def install_pack(root: Path) -> Path:
    dest = root / "development_behavior_packs" / PACK_DIR_NAME
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists():
        shutil.rmtree(dest)
    shutil.copytree(ADDON, dest)
    return dest


def enable_in_world(world_dir: Path) -> str:
    m = addon_manifest()["header"]
    f = world_dir / "world_behavior_packs.json"
    packs = []
    if f.exists():
        try:
            packs = json.loads(f.read_text(encoding="utf-8") or "[]")
        except ValueError:
            return f"{f} is not valid JSON; not touching it. Enable the pack in the game instead."
        shutil.copy2(f, f.with_suffix(".json.bak"))
    if any(p.get("pack_id") == m["uuid"] for p in packs):
        return "already enabled"
    packs.append({"pack_id": m["uuid"], "version": m["version"]})
    f.write_text(json.dumps(packs, indent=2), encoding="utf-8")
    return "enabled"


def cli(a, out) -> int:
    roots = [Path(a.path)] if a.path else com_mojang_candidates()
    if not roots:
        out("No Minecraft Bedrock data folder (com.mojang) found on this PC.")
        out(f"Copy this folder by hand into com.mojang/development_behavior_packs:  {ADDON}")
        out("Or pass --path <com.mojang folder>.")
        return 1
    if a.list_worlds:
        for w in worlds(roots):
            out(f"{time.strftime('%Y-%m-%d %H:%M', time.localtime(w['mtime']))}  {w['name']}  ({w['path']})")
        return 0
    for r in roots:
        dest = install_pack(r)
        out(f"Installed Claude Link -> {dest}")
    if a.world:
        matches = [w for w in worlds(roots) if w["name"].lower() == a.world.lower()] or \
                  [w for w in worlds(roots) if a.world.lower() in w["name"].lower()]
        if not matches:
            out(f"No world named '{a.world}'. Worlds: " + ", ".join(w["name"] for w in worlds(roots)[:15]))
            return 1
        w = matches[0]
        out(f"World '{w['name']}': {enable_in_world(w['path'])} (close and reopen the world to load it).")
    else:
        out("Now enable it in your world: Edit World > Behavior Packs > Available > Claude Link > Activate,")
        out("or run:  mc addon --world \"<world name>\"   (with the world closed).")
    out("The world needs cheats on. Then check with:  mc status   (should say: add-on active)")
    return 0


def doctor(out) -> int:
    from . import mccrypto
    from .client import BridgeError, Client, read_state, state_dir
    ok = True
    out(f"Python {sys.version.split()[0]} at {sys.executable}")
    if sys.version_info < (3, 8):
        out("  PROBLEM: needs Python 3.8 or newer")
        ok = False
    out(f"Encryption: {'fast (cryptography installed)' if mccrypto.HAVE_CRYPTOGRAPHY else 'built-in pure Python (fine; pip install cryptography makes it faster)'}")
    out(f"State folder: {state_dir()}")
    st = read_state()
    if st:
        try:
            s = Client(st["port"], st["token"]).status()
            out(f"Bridge: running on port {st['port']}; Minecraft " + ("connected as " + str(s['session']['player']) if s["connected"] else "not connected"))
        except BridgeError:
            out("Bridge: not running (stale state file). Start with: mc start")
    else:
        out("Bridge: not running. Start with: mc start")
        with socket.socket() as sck:
            try:
                sck.bind(("127.0.0.1", 19134))
                out("Port 19134: free")
            except OSError:
                out("Port 19134: IN USE by another program - use: mc start --port 19135 and /connect localhost:19135")
    roots = com_mojang_candidates()
    if not roots:
        out("Minecraft data folder: not found (normal if Minecraft runs on another device; use mc start --lan)")
    for r in roots:
        dest = r / "development_behavior_packs" / PACK_DIR_NAME / "manifest.json"
        inst = "not installed"
        if dest.exists():
            try:
                v = json.loads(dest.read_text(encoding="utf-8"))["header"]["version"]
                cur = addon_manifest()["header"]["version"]
                inst = "installed" + ("" if v == cur else f" (old version {v}; run mc addon to update)")
            except Exception:
                inst = "installed (unreadable manifest)"
        out(f"Minecraft data: {r}\n  Claude Link add-on: {inst}; worlds: {len(worlds([r]))}")
        if "MinecraftUWP" in str(r):
            out("  Old UWP version: if /connect fails, allow local connections (admin PowerShell):\n"
                "    CheckNetIsolation LoopbackExempt -a -n=\"Microsoft.MinecraftUWP_8wekyb3d8bbwe\"")
    return 0 if ok else 1
