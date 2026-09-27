#!/usr/bin/env python3
"""mcgeo - Minecraft Bedrock geometry: blueprints, shapes, rotation, and minimal /fill command lists.

Works offline (no game needed). `mc build` (minecraft-live) uses it to build in a running game.

Axes: +X = east, +Y = up, +Z = south. Blueprint layers are drawn like a map: first row = north,
first column = west. Local (0,0,0) is the north-west bottom corner. The "front" of a blueprint is its
south side (last row) - put doors there; `mc build --here` turns the front toward the player.

CLI:
  mcgeo.py info house.txt                          size, block counts
  mcgeo.py show house.txt [--rotate 90]            print the layers (check a blueprint before building)
  mcgeo.py compile house.txt --at 100 64 -20 [--rotate 90] [-o house.mcfunction]
  mcgeo.py shape sphere --radius 6 --block glass --hollow --at 0 80 0
  mcgeo.py shape cylinder --radius 4 --height 10 --block stone_bricks --hollow --at 10 64 10
Standard library only.
"""
from __future__ import annotations

import argparse
import json
import math
import re
import sys
from pathlib import Path

FILL_LIMIT = 32768  # /fill maximum volume
CARD = ["north", "east", "south", "west"]  # clockwise seen from above

# ---------------------------------------------------------------- block specs
_STATE_RE = re.compile(r'\s*"?([\w:.\-]+)"?\s*[=:]\s*("(?:[^"\\]|\\.)*"|[^,\]]+)\s*,?')


def parse_states(text: str) -> dict:
    text = text.strip()
    if text.startswith("["):
        text = text[1:]
    if text.endswith("]"):
        text = text[:-1]
    out = {}
    for m in _STATE_RE.finditer(text):
        k, v = m.group(1), m.group(2).strip()
        if v.startswith('"'):
            out[k] = json.loads(v)
        elif v in ("true", "false"):
            out[k] = v == "true"
        else:
            try:
                out[k] = int(v)
            except ValueError:
                out[k] = v
    return out


def split_spec(spec: str):
    spec = spec.strip()
    i = spec.find("[")
    ident = spec if i < 0 else spec[:i].strip()
    if ident.startswith("minecraft:"):
        ident = ident[10:]
    return ident, (parse_states(spec[i:]) if i >= 0 else {})


def format_states(states: dict) -> str:
    if not states:
        return ""
    parts = []
    for k in sorted(states):
        v = states[k]
        vs = ("true" if v else "false") if isinstance(v, bool) else (str(v) if isinstance(v, (int, float)) else json.dumps(v))
        parts.append(f"{json.dumps(k)}={vs}")
    return "[" + ",".join(parts) + "]"


def make_spec(ident: str, states: dict | None = None) -> str:
    return ident + format_states(states or {})


def block_arg(spec: str) -> str:
    """Spec -> command argument text: 'oak_stairs ["weirdo_direction"=2]'."""
    ident, st = split_spec(spec)
    fs = format_states(st)
    return ident + (" " + fs if fs else "")


def base(spec: str) -> str:
    return split_spec(spec)[0]


# ---------------------------------------------------------------- rotation of block states
_FACE6 = {2: "north", 3: "south", 4: "west", 5: "east"}
_FACE6_INV = {v: k for k, v in _FACE6.items()}
_WEIRDO = {0: "east", 1: "west", 2: "south", 3: "north"}  # stairs
_WEIRDO_INV = {v: k for k, v in _WEIRDO.items()}
_DIR4 = {0: "south", 1: "west", 2: "north", 3: "east"}  # beds, bells, grindstones, ...
_DIR4_INV = {v: k for k, v in _DIR4.items()}
_RAIL_CW = {0: 1, 1: 0, 2: 5, 5: 3, 3: 4, 4: 2, 6: 7, 7: 8, 8: 9, 9: 6}
_VINE_BITS = [(1, "south"), (2, "west"), (4, "north"), (8, "east")]


def rot_card(c: str, k: int) -> str:
    return CARD[(CARD.index(c) + k) % 4] if c in CARD else c


# Per-block tables generated from Java<->Bedrock mappings (tools/gen_rotation_table.py). Bedrock's direction
# states are not consistent between blocks (trapdoor `direction` 0 = east but bed 0 = south; piston
# `facing_direction` 2 = south but ladder 2 = north; floor levers use open_bit too), so tables beat rules.
_TABLE = None
_SIDE = re.compile(r"^(.*_)(north|east|south|west)$")  # connection states such as wall_connection_type_east


def _table() -> dict:
    global _TABLE
    if _TABLE is None:
        try:
            _TABLE = json.loads((Path(__file__).resolve().parent / "block_rotation.json").read_text(encoding="utf-8"))
        except (OSError, ValueError):
            _TABLE = {}
    return _TABLE


def has_orientation_data(ident: str) -> bool:
    t = _table()
    return any(ident in t.get(k, {}) for k in ("cw", "cw_joint"))


def _apply_table(ident: str, states: dict, kind: str, rename):
    t = _table()
    per = t.get(kind, {}).get(ident)
    joint = t.get(kind + "_joint", {}).get(ident)
    if per is None and joint is None:
        return None
    out = {}
    for key, v in states.items():
        m = _SIDE.match(key)
        out[m.group(1) + rename(m.group(2)) if m else key] = v
    for s, vm in (per or {}).items():
        if s in states:
            nv = vm.get(json.dumps(states[s]))
            if nv is not None:
                out[s] = nv
    for before, after in joint or []:
        if all(states.get(k) == v for k, v in before.items()):
            out.update(after)
            break
    return out


def rotate_states(states: dict, k: int, ident: str | None = None) -> dict:
    """Rotate a block's states by k quarter turns clockwise (seen from above)."""
    k %= 4
    s = dict(states)
    for _ in range(k):
        t = _apply_table(ident, s, "cw", lambda d: rot_card(d, 1)) if ident else None
        s = t if t is not None else _rotate_rules(s, 1)
    return s


def _rotate_rules(states: dict, k: int) -> dict:
    """Fallback rules for blocks missing from the table (newer than its data)."""
    k %= 4
    if not k or not states:
        return dict(states)
    s = {}
    for key, val in states.items():
        nk, nv = key, val
        if key in ("minecraft:cardinal_direction", "minecraft:facing_direction", "minecraft:block_face",
                   "torch_facing_direction") and isinstance(val, str):
            nv = rot_card(val, k)
        elif key == "facing_direction" and val in _FACE6:
            nv = _FACE6_INV[rot_card(_FACE6[val], k)]
        elif key == "weirdo_direction" and val in _WEIRDO:
            nv = _WEIRDO_INV[rot_card(_WEIRDO[val], k)]
        elif key == "direction" and val in _DIR4:
            nv = _DIR4_INV[rot_card(_DIR4[val], k)]
        elif key == "pillar_axis" and k % 2 and val in ("x", "z"):
            nv = "z" if val == "x" else "x"
        elif key == "ground_sign_direction" and isinstance(val, int):
            nv = (val + 4 * k) % 16
        elif key == "rail_direction" and isinstance(val, int):
            for _ in range(k):
                nv = _RAIL_CW.get(nv, nv)
        elif key == "vine_direction_bits" and isinstance(val, int):
            nv = 0
            for bit, d in _VINE_BITS:
                if val & bit:
                    nv |= next(b for b, dd in _VINE_BITS if dd == rot_card(d, k))
        elif key == "lever_direction" and isinstance(val, str):
            if val in CARD:
                nv = rot_card(val, k)
            elif k % 2:
                nv = {"up_north_south": "up_east_west", "up_east_west": "up_north_south",
                      "down_north_south": "down_east_west", "down_east_west": "down_north_south"}.get(val, val)
        elif key == "orientation" and isinstance(val, str) and "_" in val:  # crafter/jigsaw "down_east", "north_up"
            nv = "_".join(rot_card(p, k) for p in val.split("_"))
        else:
            m = re.match(r"^(minecraft:connection_|wall_connection_type_)(north|east|south|west)$", key)
            if m:
                nk = m.group(1) + rot_card(m.group(2), k)
        s[nk] = nv
    return s


def mirror_states(states: dict, axis: str, ident: str | None = None) -> dict:
    """Mirror a block's states: axis 'x' flips east<->west, 'z' flips north<->south."""
    swap = {"east": "west", "west": "east"} if axis == "x" else {"north": "south", "south": "north"}
    t = _apply_table(ident, states, "mirror_" + axis, lambda d: swap.get(d, d)) if ident else None
    return t if t is not None else _mirror_rules(states, axis)


def _mirror_rules(states: dict, axis: str) -> dict:
    swap = {"east": "west", "west": "east"} if axis == "x" else {"north": "south", "south": "north"}
    s = {}
    for key, val in states.items():
        nk, nv = key, val
        if key in ("minecraft:cardinal_direction", "minecraft:facing_direction", "minecraft:block_face",
                   "torch_facing_direction") and isinstance(val, str):
            nv = swap.get(val, val)
        elif key == "facing_direction" and val in _FACE6:
            nv = _FACE6_INV[swap.get(_FACE6[val], _FACE6[val])]
        elif key == "weirdo_direction" and val in _WEIRDO:
            nv = _WEIRDO_INV[swap.get(_WEIRDO[val], _WEIRDO[val])]
        elif key == "direction" and val in _DIR4:
            nv = _DIR4_INV[swap.get(_DIR4[val], _DIR4[val])]
        elif key == "minecraft:corner" and isinstance(val, str):
            nv = val.replace("left", "@").replace("right", "left").replace("@", "right")
        elif key == "door_hinge_bit" and isinstance(val, bool):
            nv = not val
        else:
            m = re.match(r"^(minecraft:connection_|wall_connection_type_)(north|east|south|west)$", key)
            if m:
                nk = m.group(1) + swap.get(m.group(2), m.group(2))
        s[nk] = nv
    return s


TWO_HIGH = {"tall_grass", "large_fern", "sunflower", "lilac", "rose_bush", "peony", "pitcher_plant",
            "small_dripleaf_block"}


def is_two_high(ident: str) -> bool:
    return ident.endswith("_door") or ident in TWO_HIGH


# ---------------------------------------------------------------- blueprint
class Blueprint:
    """Voxels in local coordinates {(x, y, z): spec}. 'air' clears a block; missing = leave as is."""

    def __init__(self, voxels=None, name: str = ""):
        self.voxels = dict(voxels or {})
        self.name = name

    def __len__(self):
        return len(self.voxels)

    def set(self, pos, spec):
        self.voxels[tuple(int(v) for v in pos)] = spec

    def bounds(self):
        if not self.voxels:
            return (0, 0, 0), (0, 0, 0)
        xs, ys, zs = zip(*self.voxels)
        return (min(xs), min(ys), min(zs)), (max(xs), max(ys), max(zs))

    def size(self):
        lo, hi = self.bounds()
        return tuple(hi[i] - lo[i] + 1 for i in range(3))

    def normalized(self) -> "Blueprint":
        lo, _ = self.bounds()
        return Blueprint({(x - lo[0], y - lo[1], z - lo[2]): s for (x, y, z), s in self.voxels.items()}, self.name)

    def rotated(self, quarter_turns_cw: int) -> "Blueprint":
        k = quarter_turns_cw % 4
        out = {}
        for (x, y, z), spec in self.voxels.items():
            for _ in range(k):
                x, z = -z, x
            ident, st = split_spec(spec)
            out[(x, y, z)] = make_spec(ident, rotate_states(st, k, ident))
        return Blueprint(out, self.name).normalized()

    def mirrored(self, axis: str) -> "Blueprint":
        out = {}
        for (x, y, z), spec in self.voxels.items():
            ident, st = split_spec(spec)
            p = (-x, y, z) if axis == "x" else (x, y, -z)
            out[p] = make_spec(ident, mirror_states(st, axis, ident))
        return Blueprint(out, self.name).normalized()

    def counts(self) -> dict:
        c = {}
        for s in self.voxels.values():
            b = base(s)
            c[b] = c.get(b, 0) + 1
        return dict(sorted(c.items(), key=lambda kv: -kv[1]))

    def complete_doors(self) -> "Blueprint":
        """Doors and tall plants are two blocks high (upper_block_bit). A two-high block sitting on its own
        lower half becomes the upper half (so a door drawn in two layers works); a lone lower half gets
        its upper half added."""
        v = dict(self.voxels)
        for (x, y, z) in sorted(self.voxels, key=lambda p: p[1]):  # bottom-up
            ident, st = split_spec(v[(x, y, z)])
            if not is_two_high(ident) or st.get("upper_block_bit"):
                continue
            below = v.get((x, y - 1, z))
            if below is not None:
                bid, bst = split_spec(below)
                if bid == ident and not bst.get("upper_block_bit"):
                    v[(x, y, z)] = make_spec(ident, dict(st, upper_block_bit=True))
                    continue
            if (x, y + 1, z) not in v:
                v[(x, y + 1, z)] = make_spec(ident, dict(st, upper_block_bit=True))
        return Blueprint(v, self.name)


# ---------------------------------------------------------------- parsing
def parse_text(text: str, name: str = "") -> Blueprint:
    """Layer format:
        legend:
          S = stone_bricks
          D = wooden_door["minecraft:cardinal_direction"="south"]
          . = air            (a space means: leave this block alone)
        layer 0:             (bottom; "layer 1-3:" repeats the same rows on y=1..3)
        SSSSS
        S...S
    """
    legend = {".": "air"}
    bp = Blueprint(name=name)
    section, ys, row = None, [], 0
    for raw in text.splitlines():
        line = raw.rstrip("\r\n")
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or stripped.startswith("//"):
            if section == "layer" and not stripped:
                continue
            continue
        m = re.match(r"^\s*(legend|palette)\s*:?\s*$", line, re.I)
        if m:
            section = "legend"
            continue
        m = re.match(r"^\s*(?:layer|y)\s*(-?\d+)(?:\s*(?:-|\.\.|to)\s*(-?\d+))?\s*:\s*$", line, re.I)
        if m:
            a = int(m.group(1))
            b = int(m.group(2)) if m.group(2) else a
            ys, row, section = list(range(min(a, b), max(a, b) + 1)), 0, "layer"
            continue
        m = re.match(r"^\s*name\s*:\s*(.+)$", line, re.I)
        if m and section is None:
            bp.name = m.group(1).strip()
            continue
        if section == "legend":
            m = re.match(r"^\s*(\S)\s*[=:]\s*(.+?)\s*$", line)
            if not m:
                raise ValueError(f"bad legend line: {line!r} (use: X = block_id)")
            val = m.group(2).split(" #")[0].strip()
            legend[m.group(1)] = val
            continue
        if section == "layer":
            for x, ch in enumerate(line):
                if ch == " ":
                    continue
                if ch not in legend:
                    raise ValueError(f"symbol {ch!r} in layer {ys[0]} row {row} is not in the legend")
                for y in ys:
                    bp.set((x, y, row), legend[ch])
            row += 1
            continue
        raise ValueError(f"unexpected line (need 'legend:' or 'layer N:' first): {line!r}")
    return bp


def parse_obj(obj: dict, name: str = "") -> Blueprint:
    if "palette" in obj and "data" in obj and "size" in obj:  # a scan saved by `mc scan --out`
        return from_scan(obj, name)
    bp = Blueprint(name=obj.get("name", name))
    legend = {".": "air", **obj.get("legend", {})}
    for y, layer in enumerate(obj.get("layers", [])):
        for z, rowtext in enumerate(layer):
            for x, ch in enumerate(rowtext):
                if ch != " ":
                    bp.set((x, y, z), legend[ch])
    for b in obj.get("boxes", []):
        for p in box(b["from"], b["to"], hollow=b.get("hollow", False), walls=b.get("walls", False)):
            bp.set(p, b["block"])
    for s in obj.get("shapes", []):
        kind = s.pop("type")
        block = s.pop("block")
        for p in SHAPES[kind](**s):
            bp.set(p, block)
    for b in obj.get("blocks", []):
        bp.set(b["at"], b["block"])
    return bp


def from_scan(scan: dict, name: str = "", keep_air: bool = True) -> Blueprint:
    vals = []
    for tok in scan["data"].split(","):
        v, _, n = tok.partition("*")
        vals.extend([int(v)] * (int(n) if n else 1))
    sx, sy, sz = scan["size"]
    bp = Blueprint(name=name)
    i = 0
    for y in range(sy):
        for z in range(sz):
            for x in range(sx):
                spec = scan["palette"][vals[i]]
                i += 1
                if spec.startswith("?") or (not keep_air and base(spec) in ("air", "cave_air")):
                    continue
                bp.set((x, y, z), spec)
    return bp


def load(path: str) -> Blueprint:
    p = Path(path)
    text = p.read_text(encoding="utf-8")
    if p.suffix.lower() == ".json" or text.lstrip().startswith("{"):
        return parse_obj(json.loads(text), p.stem)
    return parse_text(text, p.stem)


# ---------------------------------------------------------------- shapes (return lists of positions)
def box(a, b, hollow=False, walls=False):
    """hollow: all 6 faces; walls: 4 side walls only (no floor/ceiling)."""
    lo = [min(a[i], b[i]) for i in range(3)]
    hi = [max(a[i], b[i]) for i in range(3)]
    out = []
    for x in range(lo[0], hi[0] + 1):
        for y in range(lo[1], hi[1] + 1):
            for z in range(lo[2], hi[2] + 1):
                side = x in (lo[0], hi[0]) or z in (lo[2], hi[2])
                if walls and not side:
                    continue
                if hollow and not (side or y in (lo[1], hi[1])):
                    continue
                out.append((x, y, z))
    return out


def sphere(center=(0, 0, 0), radius=5, hollow=False, half=None):
    """half='top' for a dome, 'bottom' for a bowl."""
    cx, cy, cz = center
    r = radius + 0.5
    out = []
    R = int(math.ceil(radius))
    for x in range(-R, R + 1):
        for y in range(-R, R + 1):
            if (half == "top" and y < 0) or (half == "bottom" and y > 0):
                continue
            for z in range(-R, R + 1):
                d = x * x + y * y + z * z
                if d > r * r:
                    continue
                if hollow and (abs(x) + 1) ** 2 + y * y + z * z <= r * r and x * x + (abs(y) + 1) ** 2 + z * z <= r * r \
                        and x * x + y * y + (abs(z) + 1) ** 2 <= r * r:
                    continue
                out.append((cx + x, cy + y, cz + z))
    return out


def cylinder(center=(0, 0, 0), radius=4, height=5, hollow=False):
    """Vertical cylinder; center = middle of the bottom layer."""
    cx, cy, cz = center
    out = []
    for p in circle((cx, 0, cz), radius, filled=not hollow):
        for y in range(cy, cy + height):
            out.append((p[0], y, p[2]))
    return out


def circle(center=(0, 0, 0), radius=4, filled=False):
    """Horizontal circle/disc at center's y."""
    cx, cy, cz = center
    r = radius + 0.5
    R = int(math.ceil(radius))
    out = []
    for x in range(-R, R + 1):
        for z in range(-R, R + 1):
            if x * x + z * z > r * r:
                continue
            if not filled and (abs(x) + 1) ** 2 + z * z <= r * r and x * x + (abs(z) + 1) ** 2 <= r * r:
                continue
            out.append((cx + x, cy, cz + z))
    return out


def cone(center=(0, 0, 0), radius=5, height=8, hollow=False):
    cx, cy, cz = center
    out = []
    for i in range(height):
        rr = radius * (1 - i / height)
        if rr < 0.4:
            rr = 0
        layer = circle((cx, cy + i, cz), rr, filled=not hollow or i == 0) if rr >= 0.5 else [(cx, cy + i, cz)]
        out.extend(layer)
    return out


def pyramid(center=(0, 0, 0), half_width=5, hollow=False):
    cx, cy, cz = center
    out = []
    for i in range(half_width + 1):
        w = half_width - i
        pts = box((cx - w, cy + i, cz - w), (cx + w, cy + i, cz + w))
        if hollow and w > 0 and i > 0:
            pts = [p for p in pts if abs(p[0] - cx) == w or abs(p[2] - cz) == w]
        out.extend(pts)
    return out


def line(a=(0, 0, 0), b=(0, 0, 0)):
    """3D line between two blocks (inclusive), no gaps."""
    n = max(abs(b[i] - a[i]) for i in range(3))
    if n == 0:
        return [tuple(a)]
    out = []
    for t in range(n + 1):
        p = tuple(int(round(a[i] + (b[i] - a[i]) * t / n)) for i in range(3))
        if not out or out[-1] != p:
            out.append(p)
    return out


def wall(a=(0, 0, 0), b=(0, 0, 0), height=3):
    """Vertical wall along the line a->b (y taken from a), `height` blocks tall."""
    out = []
    for x, _y, z in line((a[0], 0, a[2]), (b[0], 0, b[2])):
        for y in range(a[1], a[1] + height):
            out.append((x, y, z))
    return out


def torus(center=(0, 0, 0), radius=6, tube=2):
    cx, cy, cz = center
    out = []
    R = radius + tube + 1
    for x in range(-R, R + 1):
        for z in range(-R, R + 1):
            q = math.hypot(x, z) - radius
            for y in range(-tube - 1, tube + 2):
                if q * q + y * y <= (tube + 0.5) ** 2:
                    out.append((cx + x, cy + y, cz + z))
    return out


SHAPES = {"box": box, "sphere": sphere, "dome": lambda **k: sphere(half="top", **k), "cylinder": cylinder,
          "circle": circle, "cone": cone, "pyramid": pyramid, "line": line, "wall": wall, "torus": torus}


# ---------------------------------------------------------------- compiling to commands
GRAVITY = ("sand", "red_sand", "gravel", "anvil", "chipped_anvil", "damaged_anvil", "dragon_egg", "scaffolding",
           "suspicious_sand", "suspicious_gravel", "pointed_dripstone")
ATTACHED_WORDS = ("torch", "lantern", "ladder", "button", "lever", "_door", "trapdoor", "sign", "banner", "rail",
                  "redstone_wire", "repeater", "comparator", "carpet", "pressure_plate", "sapling", "flower", "tulip",
                  "short_grass", "tall_grass", "fern", "dead_bush", "vine", "bell", "tripwire", "candle", "snow_layer",
                  "sugar_cane", "cactus", "kelp", "seagrass", "wheat", "carrots", "potatoes", "beetroot", "mushroom",
                  "cluster", "_bud", "head", "skull", "flower_pot", "dandelion", "poppy", "orchid", "allium",
                  "azure_bluet", "oxeye_daisy", "cornflower", "lily", "rose", "peony", "lilac", "sunflower",
                  "sea_pickle", "coral", "chain", "item_frame", "bed", "cake", "hanging")
LIQUIDS = ("water", "flowing_water", "lava", "flowing_lava")


def phase(spec: str) -> int:
    """Build order: 0 clear, 1 solid, 2 gravity, 3 attached/fragile, 4 liquids."""
    b = base(spec)
    if b in ("air", "cave_air", "void_air"):
        return 0
    if b in LIQUIDS:
        return 4
    if b in GRAVITY or b.endswith("concrete_powder"):
        return 2
    if any(w in b for w in ATTACHED_WORDS):
        return 3
    return 1


def greedy_boxes(cells: set, limit: int = FILL_LIMIT):
    """Cover a set of (x,y,z) exactly with few axis-aligned boxes (each <= limit blocks)."""
    remaining = set(cells)
    boxes = []
    for start in sorted(cells, key=lambda p: (p[1], p[2], p[0])):
        if start not in remaining:
            continue
        x0, y0, z0 = start
        x1 = x0
        while (x1 + 1, y0, z0) in remaining and (x1 + 2 - x0) <= limit:
            x1 += 1
        z1 = z0
        while all((x, y0, z1 + 1) in remaining for x in range(x0, x1 + 1)) and (x1 - x0 + 1) * (z1 + 2 - z0) <= limit:
            z1 += 1
        y1 = y0
        while all((x, y1 + 1, z) in remaining for x in range(x0, x1 + 1) for z in range(z0, z1 + 1)) \
                and (x1 - x0 + 1) * (z1 - z0 + 1) * (y1 + 2 - y0) <= limit:
            y1 += 1
        for x in range(x0, x1 + 1):
            for y in range(y0, y1 + 1):
                for z in range(z0, z1 + 1):
                    remaining.discard((x, y, z))
        boxes.append((x0, y0, z0, x1, y1, z1))
    return boxes


def compile_commands(bp: Blueprint, offset=(0, 0, 0)) -> list:
    """Blueprint -> ordered /fill and /setblock commands (absolute coordinates = local + offset)."""
    ox, oy, oz = offset
    by_spec = {}
    for pos, spec in bp.voxels.items():
        by_spec.setdefault(spec, set()).add(pos)
    jobs = []
    for spec, cells in by_spec.items():
        for (x0, y0, z0, x1, y1, z1) in greedy_boxes(cells):
            jobs.append((phase(spec), y0, spec, (x0, y0, z0, x1, y1, z1)))
    jobs.sort(key=lambda j: (j[0], j[1], j[2]))
    cmds = []
    for _ph, _y, spec, (x0, y0, z0, x1, y1, z1) in jobs:
        arg = block_arg(spec)
        if (x0, y0, z0) == (x1, y1, z1):
            cmds.append(f"setblock {x0 + ox} {y0 + oy} {z0 + oz} {arg}")
        else:
            cmds.append(f"fill {x0 + ox} {y0 + oy} {z0 + oz} {x1 + ox} {y1 + oy} {z1 + oz} {arg}")
    return cmds


# ---------------------------------------------------------------- display
def show(bp: Blueprint) -> str:
    """Layers top to bottom. Each distinct block spec (including its states, e.g. which way stairs face)
    gets its own symbol, so orientation mistakes are visible before building."""
    lo, hi = bp.bounds()
    counts = {}
    for s in bp.voxels.values():
        counts[s] = counts.get(s, 0) + 1
    order = sorted(counts, key=lambda s: -counts[s])
    pool = iter("#=+*%&$@ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789<>/\\()[]{}!?;:")
    syms = {s: ("." if base(s) == "air" else next(pool, "?")) for s in order}
    out = [f"{bp.name or 'blueprint'}: {len(bp)} blocks, size {bp.size()} (x,y,z). Rows = z (north first), "
           "columns = x (west first). ' ' = untouched."]
    for y in range(hi[1], lo[1] - 1, -1):
        out.append(f"layer {y - lo[1]}:")
        for z in range(lo[2], hi[2] + 1):
            out.append("  " + "".join(syms[bp.voxels[(x, y, z)]] if (x, y, z) in bp.voxels else " "
                                      for x in range(lo[0], hi[0] + 1)).rstrip())
    out.append("legend: " + ", ".join(f"{syms[s]}={block_arg(s)} ({counts[s]})" for s in order))
    return "\n".join(out)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd")
    for name in ("info", "show", "compile"):
        p = sub.add_parser(name)
        p.add_argument("blueprint")
        p.add_argument("--rotate", type=int, default=0, choices=[0, 90, 180, 270])
        p.add_argument("--mirror", choices=["x", "z"])
        if name == "compile":
            p.add_argument("--at", nargs=3, type=int, required=True, metavar=("X", "Y", "Z"),
                           help="world position of the north-west bottom corner")
            p.add_argument("-o", "--out")
    p = sub.add_parser("shape")
    p.add_argument("kind", choices=sorted(SHAPES))
    p.add_argument("--block", required=True)
    p.add_argument("--at", nargs=3, type=int, required=True, metavar=("X", "Y", "Z"),
                   help="center (bottom center for cylinder/cone/pyramid; start for line/wall)")
    p.add_argument("--to", nargs=3, type=int, metavar=("X", "Y", "Z"), help="end point for box/line/wall")
    p.add_argument("--radius", type=float, default=5)
    p.add_argument("--height", type=int, default=5)
    p.add_argument("--tube", type=int, default=2)
    p.add_argument("--hollow", action="store_true")
    p.add_argument("-o", "--out")
    a = ap.parse_args(argv)
    if a.cmd == "shape":
        at, to = tuple(a.at), tuple(a.to or a.at)
        kw = {"box": dict(a=at, b=to, hollow=a.hollow), "line": dict(a=at, b=to), "wall": dict(a=at, b=to, height=a.height),
              "sphere": dict(center=at, radius=a.radius, hollow=a.hollow), "dome": dict(center=at, radius=a.radius, hollow=a.hollow),
              "cylinder": dict(center=at, radius=a.radius, height=a.height, hollow=a.hollow),
              "circle": dict(center=at, radius=a.radius, filled=not a.hollow),
              "cone": dict(center=at, radius=a.radius, height=a.height, hollow=a.hollow),
              "pyramid": dict(center=at, half_width=int(a.radius), hollow=a.hollow),
              "torus": dict(center=at, radius=a.radius, tube=a.tube)}[a.kind]
        bp = Blueprint({p: a.block for p in SHAPES[a.kind](**kw)}, a.kind)
        cmds = compile_commands(bp)
        text = "\n".join(cmds)
        if a.out:
            Path(a.out).write_text(text + "\n", encoding="utf-8")
            print(f"{len(bp)} blocks -> {len(cmds)} commands written to {a.out}")
        else:
            print(text)
        return 0
    if a.cmd is None:
        ap.print_help()
        return 0
    bp = load(a.blueprint)
    if a.mirror:
        bp = bp.mirrored(a.mirror)
    if a.rotate:
        bp = bp.rotated(a.rotate // 90)
    bp = bp.normalized().complete_doors()
    if a.cmd == "info":
        print(f"{bp.name}: size {bp.size()} (x,y,z), {len(bp)} blocks: " + ", ".join(f"{k} {v}" for k, v in bp.counts().items()))
    elif a.cmd == "show":
        print(show(bp))
    else:
        cmds = compile_commands(bp, tuple(a.at))
        text = "\n".join(cmds)
        if a.out:
            Path(a.out).write_text(text + "\n", encoding="utf-8")
            print(f"{len(bp)} blocks -> {len(cmds)} commands written to {a.out}")
        else:
            print(text)
    return 0


if __name__ == "__main__":
    sys.exit(main())
