"""Perception: where the player is and what blocks are around.

Two ways to see:
  * add-on  - the Claude Link behavior pack answers /claude:scan, /claude:sense, /claude:heights with exact
              block ids + states in one command per region (fast, precise). Needs the pack in the world.
  * probe   - plain commands only: one /testforblock per block. The game's failure message names the block
              ("The block at 3,64,-2 is Grass Block (expected: Air).") which is mapped back to an id.
              Slower and without block states, but works in any world with cheats on.
"""
from __future__ import annotations

import json
import math
import re

from .codec import Region, id_from_name, rle_decode

FACING8 = ["south", "south-west", "west", "north-west", "north", "north-east", "east", "south-east"]
CARDINALS = ["south", "west", "north", "east"]  # Bedrock yaw 0, 90, 180, 270(-90)
AXIS = {"south": "+Z", "north": "-Z", "east": "+X", "west": "-X"}
VEC = {"south": (0, 1), "north": (0, -1), "east": (1, 0), "west": (-1, 0)}
RIGHT_OF = {"north": "east", "east": "south", "south": "west", "west": "north"}
_AT = re.compile(r"at (-?\d+),\s*(-?\d+),\s*(-?\d+)")
_IS = re.compile(r"is (.+?) \(expected")


def facing(yaw: float):
    """Bedrock yaw -> (8-way name, nearest cardinal). yaw 0 = south, 90 = west, 180 = north, -90 = east."""
    y = yaw % 360.0
    return FACING8[int(((y + 22.5) % 360) // 45)], CARDINALS[int(((y + 45) % 360) // 90)]


def _json_in(text: str):
    i = min([p for p in (text.find("["), text.find("{")) if p >= 0], default=-1)
    return json.loads(text[i:]) if i >= 0 else None


def _block_pos(msg: str):
    m = _AT.search(msg or "")
    return tuple(int(v) for v in m.groups()) if m else None


def probe_result(res: dict) -> str:
    """Interpret one `testforblock X Y Z air` result as a block spec ('air', 'stone', '?grass something')."""
    if res.get("ok"):
        return "air"
    msg = res.get("message") or ""
    m = _IS.search(msg)
    if m:
        name = m.group(1)
        return id_from_name(name) or "?" + name
    return "?"


# ---------------------------------------------------------------- where am I
def where(client) -> dict:
    """Player position (feet), block, rotation, facing, dimension (+ biome/look target with the add-on)."""
    if client.addon():
        res = client.cmd("claude:sense 0")
        if res.get("ok"):
            p = json.loads(res["message"])["player"]
            return _finish({"name": p.get("name"), "pos": p["pos"], "block": p["block"], "yaw": p["yaw"],
                            "pitch": p.get("pitch", 0.0), "dim": p.get("dim", "overworld"), "biome": p.get("biome"),
                            "looking": p.get("looking"), "health": p.get("health"), "gamemode": p.get("gamemode"),
                            "selected": p.get("selected"), "source": "addon"})
    r = client.run(["querytarget @s", "testforblock ~ ~ ~ air",
                    "execute as @s at @s run testforblock ^ ^ ^24 air"], timeout=10)["results"]
    out = {"source": "commands"}
    feet = _block_pos(r[1].get("message"))
    q = None
    try:
        q = _json_in(r[0].get("message") or "") or json.loads((r[0].get("body") or {}).get("details", "null"))
    except ValueError:
        q = None
    if q:
        t = q[0] if isinstance(q, list) else q
        pos = t.get("position", {})
        x, y, z = pos.get("x"), pos.get("y"), pos.get("z")
        if feet and y is not None and y - feet[1] >= 1.4:  # querytarget reports eye height for players
            y -= 1.62001
        out.update(pos=[x, y, z], yaw=t.get("yRot"), dim={0: "overworld", 1: "nether", 2: "the_end"}.get(t.get("dimension"), t.get("dimension")))
    if feet:
        out["block"] = list(feet)
        if "pos" not in out:
            out["pos"] = [feet[0] + 0.5, feet[1], feet[2] + 0.5]
    ahead = _block_pos(r[2].get("message"))
    if feet and ahead:
        dx, dy, dz = ahead[0] - feet[0], ahead[1] - feet[1], ahead[2] - feet[2]
        if out.get("yaw") is None:
            out["yaw"] = round(math.degrees(math.atan2(-dx, dz)), 1)
        out["pitch"] = round(-math.degrees(math.atan2(dy, math.hypot(dx, dz))), 1)
    if "block" not in out:
        raise RuntimeError("could not read the player position: " + str(r[1].get("message")))
    out.setdefault("yaw", 0.0)
    out.setdefault("pitch", 0.0)
    out.setdefault("dim", "overworld")
    return _finish(out)


def _finish(w: dict) -> dict:
    f8, card = facing(w["yaw"])
    w["facing"], w["cardinal"] = f8, card
    return w


def describe_where(w: dict) -> str:
    x, y, z = w["pos"]
    bx, by, bz = w["block"]
    card = w["cardinal"]
    lines = [f"{w.get('name') or 'Player'} at x={x:.1f} y={y:.1f} z={z:.1f} (block {bx} {by} {bz}), {w.get('dim', 'overworld')}"
             + (f", biome {w['biome']}" if w.get("biome") else "")]
    lines.append(f"Facing {w['facing']} (yaw {w['yaw']:.0f}, pitch {w['pitch']:.0f}). Forward = {card} ({AXIS[card]}), "
                 f"right = {RIGHT_OF[card]} ({AXIS[RIGHT_OF[card]]}), "
                 f"left = {RIGHT_OF[RIGHT_OF[RIGHT_OF[card]]]} ({AXIS[RIGHT_OF[RIGHT_OF[RIGHT_OF[card]]]]}), up = +Y.")
    fx, fz = VEC[card]
    lines.append(f"The block 3 ahead at foot level is {bx + 3 * fx} {by} {bz + 3 * fz}; you stand on {bx} {by - 1} {bz}.")
    lk = w.get("looking")
    if lk:
        lp = lk["pos"]
        d = math.dist([lp[0] + 0.5, lp[1] + 0.5, lp[2] + 0.5], [x, y + 1.62, z])
        lines.append(f"Looking at {lk['block']} at {lp[0]} {lp[1]} {lp[2]} (face {lk.get('face')}), {d:.1f} blocks away.")
    extra = [f"{k} {w[k]}" for k in ("gamemode", "health", "selected") if w.get(k) is not None]
    if extra:
        lines.append("Player: " + ", ".join(extra) + ".")
    return "\n".join(lines)


# ---------------------------------------------------------------- scanning
def _boxes(lo, hi, max_volume):
    sx, sy, sz = (hi[i] - lo[i] + 1 for i in range(3))
    bx, bz = min(sx, 32), min(sz, 32)
    by = max(1, min(sy, max_volume // (bx * bz)))
    for y in range(lo[1], hi[1] + 1, by):
        for z in range(lo[2], hi[2] + 1, bz):
            for x in range(lo[0], hi[0] + 1, bx):
                yield (x, y, z), (min(x + bx - 1, hi[0]), min(y + by - 1, hi[1]), min(z + bz - 1, hi[2]))


def scan(client, a, b, method: str = "auto", chunk: int = 8192, progress=None) -> Region:
    """Read every block in the box between corners a and b (inclusive). Returns a Region."""
    lo = [min(a[i], b[i]) for i in range(3)]
    hi = [max(a[i], b[i]) for i in range(3)]
    size = [hi[i] - lo[i] + 1 for i in range(3)]
    region = Region.empty(lo, size)
    if method == "auto":
        method = "addon" if client.addon() else "probe"
    if method == "addon":
        todo = list(_boxes(lo, hi, chunk))
        while todo:
            cmds = ["claude:scan %d %d %d %d %d %d" % (*p, *q) for p, q in todo]
            res = client.run(cmds, timeout=20)["results"]
            retry = []
            for (p, q), r in zip(todo, res):
                try:
                    if not r.get("ok"):
                        raise ValueError(r.get("message"))
                    region.paste(Region.from_scan(json.loads(r["message"])))
                except ValueError as e:
                    vol = (q[0] - p[0] + 1) * (q[1] - p[1] + 1) * (q[2] - p[2] + 1)
                    if vol <= 64:
                        raise RuntimeError(f"add-on scan failed for {p}..{q}: {e}")
                    retry.extend(_boxes(p, q, max(64, vol // 4)))  # response too big/truncated: go smaller
            todo = retry
        return region
    # probe with /testforblock, one command per block
    coords = [(x, y, z) for y in range(lo[1], hi[1] + 1) for z in range(lo[2], hi[2] + 1) for x in range(lo[0], hi[0] + 1)]
    step = 2000
    for i in range(0, len(coords), step):
        part = coords[i:i + step]
        res = client.run(["testforblock %d %d %d air" % c for c in part], timeout=15)["results"]
        for c, r in zip(part, res):
            region.set(*c, probe_result(r))
        if progress:
            progress(min(i + step, len(coords)), len(coords))
    return region


def surface_probe(client, center, radius: int, up: int, down: int) -> Region:
    """Command-only top-down view: probe layer by layer from the top, stopping each column at its first
    solid block. Much cheaper than a full probe scan in open terrain."""
    cx, cy, cz = center
    lo = (cx - radius, cy - down, cz - radius)
    size = (2 * radius + 1, up + down + 1, 2 * radius + 1)
    region = Region.empty(lo, size, fill="?")
    open_cols = {(x, z) for x in range(cx - radius, cx + radius + 1) for z in range(cz - radius, cz + radius + 1)}
    for y in range(cy + up, cy - down - 1, -1):
        if not open_cols:
            break
        cols = sorted(open_cols)
        res = client.run(["testforblock %d %d %d air" % (x, y, z) for x, z in cols], timeout=15)["results"]
        for (x, z), r in zip(cols, res):
            spec = probe_result(r)
            region.set(x, y, z, spec)
            if spec != "air" and spec not in ("water", "?"):
                open_cols.discard((x, z))
    return region


def heights(client, x1, z1, x2, z2, chunk: int = 4096) -> dict:
    """Top block of every column: {(x, z): (y, spec)}. Needs the add-on."""
    if not client.addon():
        raise RuntimeError("heights needs the Claude Link add-on (use `scan` or `look` instead)")
    lo_x, hi_x, lo_z, hi_z = min(x1, x2), max(x1, x2), min(z1, z2), max(z1, z2)
    side = max(1, int(math.sqrt(chunk)))
    cmds = []
    for z in range(lo_z, hi_z + 1, side):
        for x in range(lo_x, hi_x + 1, side):
            cmds.append("claude:heights %d 0 %d %d 0 %d" % (x, z, min(x + side - 1, hi_x), min(z + side - 1, hi_z)))
    out = {}
    for r in client.run(cmds, timeout=30)["results"]:
        if not r.get("ok"):
            raise RuntimeError(r.get("message"))
        d = json.loads(r["message"])
        (x0, z0), sx = d["from"], d["size"][0]
        tops, ys = rle_decode(d["top"]), rle_decode(d["y"], cast=str)
        for i, (t, yv) in enumerate(zip(tops, ys)):
            x, z = x0 + i % sx, z0 + i // sx
            out[(x, z)] = (None if yv == "_" else int(yv), d["palette"][t])
    return out


def nearby(client, radius: int = 16) -> list:
    """Entities around the player: [{type, name, pos, dist, health}] (positions need the add-on)."""
    if client.addon():
        r = client.cmd(f"claude:sense {int(radius)}")
        if r.get("ok"):
            return json.loads(r["message"]).get("entities", [])
    r = client.cmd(f"testfor @e[r={int(radius)},type=!player]")
    names = r.get("body", {}).get("victim") or (r.get("message", "")[6:].split(", ") if r.get("ok") else [])
    return [{"type": None, "name": n} for n in names if n]


def looking_probe(client, max_dist: int = 16):
    """Command-only guess of the block the player looks at: first non-air block along the view ray."""
    cmds = [f"execute as @s at @s anchored eyes run testforblock ^ ^ ^{d} air" for d in range(1, max_dist + 1)]
    for r in client.run(cmds, timeout=10)["results"]:
        spec = probe_result(r)
        if spec not in ("air", "?"):
            pos = _block_pos(r.get("message"))
            return {"block": spec, "pos": list(pos) if pos else None, "face": None}
    return None
