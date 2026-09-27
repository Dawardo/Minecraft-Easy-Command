"""ASCII views of a Region for reading the world as text.

Conventions (same as a Minecraft map): north (-Z) is up, east (+X) is right. Every grid is labelled
with world coordinates, so a cell can be turned into an exact x/z without counting.
"""
from __future__ import annotations

from .codec import split_spec

AIRS = {"air", "cave_air", "void_air", "structure_void", "light_block"}
LIQUIDS = {"water", "flowing_water", "lava", "flowing_lava"}

# preferred symbols: exact ids first, then suffix/substring rules
EXACT = {
    "air": ".", "water": "~", "flowing_water": "~", "lava": "%", "flowing_lava": "%", "grass_block": "g",
    "dirt": "d", "coarse_dirt": "d", "podzol": "d", "mycelium": "d", "farmland": "f", "grass_path": "=",
    "stone": "#", "deepslate": "#", "cobblestone": "c", "cobbled_deepslate": "c", "sand": "s", "red_sand": "s",
    "gravel": ":", "snow_layer": "'", "snow": "S", "ice": "I", "clay": "y", "bedrock": "B", "netherrack": "n",
    "torch": "i", "wall_torch": "i", "crafting_table": "T", "furnace": "F", "chest": "C", "bed": "b",
    "short_grass": ",", "tall_grass": ",", "fern": ",", "sugar_cane": "!", "cactus": "!", "?": "?",
}
SUFFIX = [("_log", "L"), ("_stem", "L"), ("_wood", "L"), ("_leaves", "*"), ("_planks", "p"), ("glass_pane", "+"),
          ("glass", "+"), ("_door", "D"), ("_trapdoor", "t"), ("_stairs", "^"), ("_slab", "_"), ("_fence_gate", "G"),
          ("_fence", "|"), ("_wall", "|"), ("_ore", "o"), ("_carpet", "-"), ("_wool", "w"), ("_bricks", "X"),
          ("_concrete", "K"), ("_terracotta", "k"), ("_flower", "&"), ("_tulip", "&"), ("_sapling", "&")]
SPARE = "abehjmnqruvxzAEHJMNOPQRUVWYZ0123456789$<>/\\()[]{}"


def base_id(spec: str) -> str:
    return split_spec(spec)[0] if not spec.startswith("?") else "?"


def symbol_table(ids_by_count) -> dict:
    """Give each block id a unique one-character symbol, preferring intuitive ones."""
    table, used = {}, {"@"}
    for ident in ids_by_count:
        want = EXACT.get(ident)
        if want is None:
            for suf, ch in SUFFIX:
                if ident.endswith(suf) or suf in ident:
                    want = ch
                    break
        cands = [want] if want else []
        cands += [ident[0], ident[0].upper()] + [c for c in ident if c.isalpha()] + list(SPARE)
        for c in cands:
            if c and c not in used:
                table[ident] = c
                used.add(c)
                break
        else:
            table[ident] = "?"
    return table


def _x_header(x0: int, x1: int, indent: int, cell: int = 2) -> str:
    """x labels over the grid: first and last column, plus every multiple of 5 that fits."""
    chars = [" "] * ((x1 - x0 + 1) * cell + 8)
    wanted = [x0, x1] + [x for x in range(x0 + 1, x1) if x % 5 == 0]
    for x in wanted:
        lab = "x=" + str(x) if x == x0 else str(x)
        pos = (x - x0) * cell - (2 if x == x0 else 0)
        span = range(max(0, pos - 1), min(len(chars), pos + len(lab) + 1))
        if any(chars[i] != " " for i in span):  # would touch another label
            continue
        for k, ch in enumerate(lab):
            if 0 <= pos + k < len(chars):
                chars[pos + k] = ch
    return " " * indent + "".join(chars).rstrip()


def surface(region, top_y=None):
    """{(x,z): (y, spec)} highest non-air block per column (None if the column is all air/unknown)."""
    (x0, y0, z0), (sx, sy, sz) = region.origin, region.size
    y_hi = y0 + sy - 1 if top_y is None else min(top_y, y0 + sy - 1)
    out = {}
    for z in range(z0, z0 + sz):
        for x in range(x0, x0 + sx):
            found = None
            for y in range(y_hi, y0 - 1, -1):
                s = region.get(x, y, z)
                b = base_id(s)
                if b not in AIRS and b != "?":
                    found = (y, s)
                    break
            out[(x, z)] = found
    return out


def topdown(region, player_block=None, top_y=None) -> str:
    """Surface map + elevation map + legend."""
    (x0, y0, z0), (sx, sy, sz) = region.origin, region.size
    surf = surface(region, top_y)
    counts = {}
    for v in surf.values():
        if v:
            b = base_id(v[1])
            counts[b] = counts.get(b, 0) + 1
    table = symbol_table(sorted(counts, key=lambda k: -counts[k]))
    ground = (player_block[1] - 1) if player_block else y0
    ind = 8
    lines = [f"Surface map: top block of each column between y={y0} and y={y0 + sy - 1 if top_y is None else top_y}. "
             "North is up, east is right. @ = you. Blank = nothing solid in range (drop/cave/open air)."]
    lines.append(_x_header(x0, x0 + sx - 1, ind))
    for z in range(z0, z0 + sz):
        row = []
        for x in range(x0, x0 + sx):
            if player_block and (x, z) == (player_block[0], player_block[2]):
                row.append("@")
            else:
                v = surf[(x, z)]
                row.append(table[base_id(v[1])] if v else " ")
        lines.append(f"z={z:<5} " + " ".join(row))
    lines.append("")
    lines.append(f"Elevation of that top block relative to the block you stand on (y={ground}): 0 = level, "
                 "+1 = one block higher, -2 = two lower, ++/-- = 10 or more.")
    lines.append(_x_header(x0, x0 + sx - 1, ind, cell=3))
    for z in range(z0, z0 + sz):
        row = []
        for x in range(x0, x0 + sx):
            v = surf[(x, z)]
            if not v:
                row.append("  ")
                continue
            d = v[0] - ground
            row.append(" 0" if d == 0 else ("++" if d > 9 else "--" if d < -9 else f"{d:+d}"))
        lines.append(f"z={z:<5} " + " ".join(row))
    lines.append("")
    lines.append("Legend: " + "  ".join(f"{table[b]} {b}" + (f" x{counts[b]}" if counts[b] > 1 else "")
                                        for b in sorted(counts, key=lambda k: -counts[k])))
    return "\n".join(lines)


def layers(region, ys=None, player_block=None, skip_empty=True) -> str:
    """Horizontal slices (one grid per y, top to bottom)."""
    (x0, y0, z0), (sx, sy, sz) = region.origin, region.size
    ys = list(range(y0 + sy - 1, y0 - 1, -1)) if ys is None else ys
    counts = {}
    for (_x, y, _z), s in region.items():
        if y in ys:
            b = base_id(s)
            counts[b] = counts.get(b, 0) + 1
    table = symbol_table(sorted(counts, key=lambda k: -counts[k]))
    out = ["Horizontal slices, top to bottom. North is up, east is right. @ = your feet (and head one layer up)."]
    for y in ys:
        grid, nonair = [], 0
        for z in range(z0, z0 + sz):
            row = []
            for x in range(x0, x0 + sx):
                if player_block and (x, z) == (player_block[0], player_block[2]) and y in (player_block[1], player_block[1] + 1):
                    row.append("@")
                    continue
                b = base_id(region.get(x, y, z))
                nonair += b not in AIRS
                row.append(table.get(b, "?"))
            grid.append(f"z={z:<5} " + " ".join(row))
        if skip_empty and not nonair:
            out.append(f"y={y}: all air")
            continue
        rel = f" (feet level{'+' if y >= player_block[1] else ''}{y - player_block[1]})" if player_block and y != player_block[1] else (" (your feet)" if player_block else "")
        out.append(f"y={y}{rel}:")
        out.append(_x_header(x0, x0 + sx - 1, 8))
        out.extend(grid)
    out.append("Legend: " + "  ".join(f"{table[b]} {b}" for b in sorted(counts, key=lambda k: -counts[k])))
    return "\n".join(out)


def summary(region) -> str:
    counts = {}
    for s in region.indices:
        b = base_id(region.palette[s])
        counts[b] = counts.get(b, 0) + 1
    total = sum(counts.values())
    top = sorted(counts.items(), key=lambda kv: -kv[1])
    return (f"{total} blocks in box {region.origin} size {region.size}: "
            + ", ".join(f"{k} {v}" for k, v in top[:25]) + (" ..." if len(top) > 25 else ""))
