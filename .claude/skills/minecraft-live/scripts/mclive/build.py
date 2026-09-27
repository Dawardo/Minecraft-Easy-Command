"""Live building: blueprint -> placement -> validation -> undo snapshot -> commands -> verification.

Undo uses the game's own /structure command: before building, the target box is saved with
`/structure save claude_undo_<id>_<n> ... disk`; `mc undo` loads it back, restoring every block
(including chest contents) exactly as it was. Snapshots survive closing the world.
"""
from __future__ import annotations

import difflib
import json
import time

from . import codec, senses
from .client import state_dir, unexpand_home

try:
    import mcgeo  # minecraft-spatial/scripts (added to sys.path by mc.py)
except ImportError:  # pragma: no cover
    mcgeo = None

STRUCT_MAX = (64, 384, 64)
ROT = {"north": 0, "east": 1, "south": 2, "west": 3}  # quarter turns that make a blueprint's front face you


def _need_geo():
    if mcgeo is None:
        raise SystemExit("mcgeo not found: keep the minecraft-spatial skill folder next to minecraft-live.")


# ---------------------------------------------------------------- validation
def validate(bp) -> list:
    """Problems with block ids or states, before anything touches the world."""
    db = codec.blocks_db()
    if not db:
        return []
    problems, seen = [], set()
    for spec in set(bp.voxels.values()):
        ident, st = mcgeo.split_spec(spec)
        if ":" in ident:  # add-on block, can't check
            continue
        if ident not in db:
            if ident not in seen:
                seen.add(ident)
                close = difflib.get_close_matches(ident, db.keys(), n=3, cutoff=0.6)
                problems.append(f"unknown block '{ident}'" + (f" - did you mean {', '.join(close)}?" if close else ""))
            continue
        valid = db[ident]["states"]
        for k, v in st.items():
            if k not in valid:
                problems.append(f"{ident}: no state '{k}' (valid: {', '.join(valid) or 'none'})")
            elif v not in valid[k]:
                problems.append(f"{ident}: '{k}' can't be {json.dumps(v)} (valid: {', '.join(json.dumps(x) for x in valid[k])})")
    return problems


# ---------------------------------------------------------------- placement
def place_here(bp, w: dict, gap: int = 2, rotate: int | None = None, sink: int = 0):
    """Rotate so the blueprint's front (south side) faces the player, then put it `gap` blocks ahead,
    centred on the player's line of sight, bottom layer at the player's feet level (minus `sink`)."""
    card = w["cardinal"]
    k = ROT[card] if rotate is None else (rotate // 90) % 4
    rbp = bp.rotated(k)
    sx, sy, sz = rbp.size()
    bx, by, bz = w["block"]
    if card == "north":
        ox, oz = bx - (sx - 1) // 2, bz - gap - sz
    elif card == "south":
        ox, oz = bx - (sx - 1) // 2, bz + gap + 1
    elif card == "east":
        ox, oz = bx + gap + 1, bz - (sz - 1) // 2
    else:
        ox, oz = bx - gap - sx, bz - (sz - 1) // 2
    return rbp, (ox, by - sink, oz), k * 90


def parse_at(vals, w=None):
    out = []
    for i, v in enumerate(unexpand_home(str(x)) for x in vals):
        if str(v).startswith("~"):
            if w is None:
                raise SystemExit("~ in --at needs the player position")
            out.append(w["block"][i] + (int(float(v[1:])) if len(v) > 1 else 0))
        else:
            out.append(int(float(v)))
    return tuple(out)


def shape_blueprint(text: str):
    """'sphere radius=5 block=glass hollow' -> Blueprint (see mcgeo.SHAPES for kinds and parameters)."""
    parts = text.split()
    kind, kw, block = parts[0], {}, None
    for p in parts[1:]:
        if "=" in p:
            k, v = p.split("=", 1)
            if k == "block":
                block = v
                continue
            if "," in v:
                kw[k] = tuple(int(float(x)) for x in v.split(","))
            else:
                try:
                    kw[k] = int(v)
                except ValueError:
                    kw[k] = float(v)
        else:
            kw[p] = True
    if not block or kind not in mcgeo.SHAPES:
        raise SystemExit(f"shape needs a kind ({', '.join(sorted(mcgeo.SHAPES))}) and block=<id>")
    return mcgeo.Blueprint({p: block for p in mcgeo.SHAPES[kind](**kw)}, kind).normalized()


# ---------------------------------------------------------------- undo snapshots
def _undo_file():
    return state_dir() / "undo.json"


def _undo_load() -> list:
    try:
        return json.loads(_undo_file().read_text())
    except Exception:
        return []


def _undo_save(records):
    _undo_file().write_text(json.dumps(records, indent=1))


def tiles(lo, hi):
    for x in range(lo[0], hi[0] + 1, STRUCT_MAX[0]):
        for y in range(lo[1], hi[1] + 1, STRUCT_MAX[1]):
            for z in range(lo[2], hi[2] + 1, STRUCT_MAX[2]):
                yield (x, y, z), (min(x + STRUCT_MAX[0] - 1, hi[0]), min(y + STRUCT_MAX[1] - 1, hi[1]),
                                  min(z + STRUCT_MAX[2] - 1, hi[2]))


def snapshot(c, lo, hi, label: str) -> dict:
    uid = time.strftime("%m%d%H%M%S")
    names, cmds = [], []
    for i, (p, q) in enumerate(tiles(lo, hi)):
        name = f"claude_undo_{uid}_{i}"
        names.append([name, *p])
        cmds.append(f"structure save {name} {p[0]} {p[1]} {p[2]} {q[0]} {q[1]} {q[2]} false disk true")
    res = c.run(cmds, timeout=30)["results"]
    bad = [r for r in res if not r["ok"]]
    if bad:
        raise RuntimeError("could not save the undo snapshot: " + (bad[0].get("message") or "?"))
    rec = {"id": uid, "time": time.time(), "label": label, "lo": list(lo), "hi": list(hi), "tiles": names}
    recs = _undo_load()
    recs.append(rec)
    _undo_save(recs[-50:])
    return rec


def restore(c, rec) -> list:
    res = c.run([f"structure load {n} {x} {y} {z}" for n, x, y, z in rec["tiles"]], timeout=30)["results"]
    return [r for r in res if not r["ok"]]


# ---------------------------------------------------------------- verify
AIR = {"air", "cave_air", "void_air"}


def verify(c, rbp, offset, method="auto"):
    lo, hi = rbp.bounds()
    a = tuple(lo[i] + offset[i] for i in range(3))
    b = tuple(hi[i] + offset[i] for i in range(3))
    region = senses.scan(c, a, b, method=method)
    diffs = []
    for (x, y, z), spec in rbp.voxels.items():
        want, wst = mcgeo.split_spec(spec)
        got_spec = region.get(x + offset[0], y + offset[1], z + offset[2])
        got, gst = codec.split_spec(got_spec) if not got_spec.startswith("?") else (got_spec, {})
        same = (want == got) or (want in AIR and got in AIR)
        if same and gst:
            same = all(gst.get(k) == v for k, v in wst.items())
        if not same:
            diffs.append(((x + offset[0], y + offset[1], z + offset[2]), spec, got_spec))
    return diffs


# ---------------------------------------------------------------- safety pre-check
NATURAL = {
    "air", "cave_air", "void_air", "grass_block", "dirt", "coarse_dirt", "podzol", "mycelium", "rooted_dirt", "mud",
    "clay", "sand", "red_sand", "gravel", "stone", "deepslate", "granite", "diorite", "andesite", "tuff", "calcite",
    "dripstone_block", "pointed_dripstone", "netherrack", "soul_sand", "soul_soil", "basalt", "blackstone", "end_stone",
    "snow", "snow_layer", "ice", "packed_ice", "blue_ice", "water", "flowing_water", "lava", "flowing_lava", "bedrock",
    "short_grass", "tall_grass", "fern", "large_fern", "dead_bush", "sweet_berry_bush", "sugar_cane", "cactus", "vine",
    "kelp", "seagrass", "bamboo", "moss_block", "moss_carpet", "azalea", "flowering_azalea", "pumpkin", "melon_block",
    "dandelion", "poppy", "blue_orchid", "allium", "azure_bluet", "oxeye_daisy", "cornflower", "lily_of_the_valley",
    "sunflower", "lilac", "rose_bush", "peony", "brown_mushroom", "red_mushroom", "lily_pad", "glow_lichen",
    "hanging_roots", "cave_vines", "big_dripleaf", "small_dripleaf_block", "spore_blossom", "pink_petals",
    "sculk", "sculk_vein", "amethyst_block", "budding_amethyst", "obsidian", "magma", "terracotta", "sandstone",
    "red_sandstone", "smooth_basalt", "cobweb", "web", "pale_moss_block", "pale_moss_carpet", "pale_hanging_moss",
    "leaf_litter", "bush", "firefly_bush", "short_dry_grass", "tall_dry_grass", "wildflowers", "cactus_flower",
}
NATURAL_PARTS = ("_ore", "_leaves", "_log", "_sapling", "_tulip", "coral", "_terracotta", "mushroom_block", "_roots",
                 "_fungus", "_nylium", "_wart_block", "shroomlight", "_poplar")


def looks_natural(ident: str) -> bool:
    return ident in NATURAL or any(p in ident for p in NATURAL_PARTS) or ident.startswith("?")


def precheck(c, rbp, offset, method="auto", max_probe=4000):
    """What would the build replace? Returns (player_made {id: count}, example positions, open columns under
    the bottom layer, natural blocks replaced) - or None if the area is too big to check without the add-on."""
    lo, hi = rbp.bounds()
    a = (lo[0] + offset[0], lo[1] + offset[1] - 1, lo[2] + offset[2])
    b = (hi[0] + offset[0], hi[1] + offset[1], hi[2] + offset[2])
    vol = (b[0] - a[0] + 1) * (b[1] - a[1] + 1) * (b[2] - a[2] + 1)
    if method == "auto":
        method = "addon" if c.addon() else "probe"
    if method == "probe" and vol > max_probe:
        return None
    region = senses.scan(c, a, b, method=method)
    made, where_, natural = {}, [], 0
    bottom = {}
    for (x, y, z), spec in rbp.voxels.items():
        wx, wy, wz = x + offset[0], y + offset[1], z + offset[2]
        have = region.get(wx, wy, wz)
        hid = codec.split_spec(have)[0] if not have.startswith("?") else have
        want = mcgeo.split_spec(spec)[0]
        if y == lo[1] and want not in AIR:
            bottom[(wx, wz)] = wy
        if hid == want or hid in AIR:
            continue
        if looks_natural(hid):
            natural += 1
        else:
            made[hid] = made.get(hid, 0) + 1
            where_.append((wx, wy, wz))
    open_cols = 0
    for (wx, wz), wy in bottom.items():
        below = region.get(wx, wy - 1, wz)
        bid = codec.split_spec(below)[0] if not below.startswith("?") else below
        if bid in AIR or bid in ("water", "flowing_water", "lava", "flowing_lava"):
            open_cols += 1
    return made, where_, open_cols, natural


def find_spots(c, width, depth, center, radius=24, max_step=1, count=5):
    """Flat, clear rectangles of width (x) by depth (z) near center: list of (x, z, y_ground, distance)."""
    x0, _, z0 = center
    if c.addon():
        h = senses.heights(c, x0 - radius, z0 - radius, x0 + radius, z0 + radius)
    else:
        r = min(radius, 10)
        region = senses.surface_probe(c, center, r, 4, 8)
        from . import render
        h = {k: v for k, v in render.surface(region).items()}
    ok_col = {}
    for (x, z), v in h.items():
        if not v or v[0] is None:
            continue
        ident = codec.split_spec(v[1])[0] if not v[1].startswith("?") else "?"
        good = looks_natural(ident) and ident not in ("water", "flowing_water", "lava", "flowing_lava", "?") \
            and not ident.endswith("_leaves") and not ident.endswith("_log")
        ok_col[(x, z)] = (v[0], good)
    spots = []
    for (x, z) in ok_col:
        cells = [ok_col.get((x + i, z + k)) for i in range(width) for k in range(depth)]
        if any(cell is None or not cell[1] for cell in cells):
            continue
        ys = [cell[0] for cell in cells]
        if max(ys) - min(ys) > max_step:
            continue
        cx, cz = x + (width - 1) / 2, z + (depth - 1) / 2
        d = ((cx - x0) ** 2 + (cz - z0) ** 2) ** 0.5
        if d < max(width, depth) / 2 + 1:  # don't build on top of the player
            continue
        spots.append((x, z, max(ys), round(d, 1)))
    spots.sort(key=lambda s_: s_[3])
    picked = []
    for sp in spots:  # keep suggestions that don't overlap each other
        if all(abs(sp[0] - p[0]) >= width or abs(sp[1] - p[1]) >= depth for p in picked):
            picked.append(sp)
        if len(picked) >= count:
            break
    return picked


# ---------------------------------------------------------------- CLI glue
def _benign(r) -> bool:
    msg = (r.get("message") or "").lower()
    return "couldn't be placed" in msg or "no blocks filled" in msg or msg.startswith("0 blocks filled")


def cli_build(a, c, out) -> int:
    _need_geo()
    shape = getattr(a, "shape", None)
    if not shape and not a.blueprint:
        out("Give a blueprint file or --shape \"sphere radius=5 block=glass\".")
        return 2
    bp = shape_blueprint(shape) if shape else mcgeo.load(a.blueprint)
    problems = validate(bp)
    if problems:
        out("Blueprint problems (nothing was built):")
        for p in problems[:20]:
            out("  - " + p)
        return 2
    w = None
    center = getattr(a, "center", None)
    if a.here or any(unexpand_home(str(v)).startswith("~") for v in (a.at or []) + (center or [])):
        w = senses.where(c)
    if a.here:
        rbp, offset, deg = place_here(bp, w, a.gap, a.rotate, getattr(a, "sink", 0))
        how = f"in front of you (facing {w['cardinal']}), turned {deg} deg so its front faces you"
    elif a.at:
        k = ((a.rotate or 0) // 90) % 4
        rbp, offset = bp.rotated(k), parse_at(a.at, w)
        how = f"with its north-west bottom corner at {offset[0]} {offset[1]} {offset[2]}" + (f", rotated {k * 90} deg" if k else "")
    elif center:
        k = ((a.rotate or 0) // 90) % 4
        rbp = bp.rotated(k)
        sx, _, sz = rbp.size()
        cx, cy, cz = parse_at(center, w)
        offset = (cx - (sx - 1) // 2, cy, cz - (sz - 1) // 2)
        how = f"centred on x={cx} z={cz} with its bottom layer at y={cy}" + (f", rotated {k * 90} deg" if k else "")
    else:
        out("Say where: --here (in front of the player), --center X Y Z (centred there, bottom at Y) "
            "or --at X Y Z (north-west bottom corner); ~ = relative to the player.")
        return 2
    rbp = rbp.complete_doors()
    cmds = mcgeo.compile_commands(rbp, offset)
    sx, sy, sz = rbp.size()
    lo = offset
    hi = (offset[0] + sx - 1, offset[1] + sy - 1, offset[2] + sz - 1)
    out(f"'{rbp.name or 'build'}': {len(rbp)} blocks, {sx}x{sy}x{sz} (x,y,z), placed {how}.")
    out(f"World box: {lo[0]} {lo[1]} {lo[2]} to {hi[0]} {hi[1]} {hi[2]}. {len(cmds)} commands.")
    if lo[1] < -64 or hi[1] > 319:
        out("Refusing: the build would reach outside the world height (-64..319).")
        return 2
    if a.save:
        with open(a.save, "w", encoding="utf-8") as f:
            f.write("\n".join(cmds) + "\n")
        out(f"Commands saved to {a.save}")
    if a.dry_run:
        for line in cmds[:200]:
            out("  /" + line)
        if len(cmds) > 200:
            out(f"  ... {len(cmds) - 200} more")
        return 0
    if w and max(abs(lo[0] - w["block"][0]), abs(lo[2] - w["block"][2])) > 160:
        out("Warning: that is far from the player; blocks in unloaded chunks will fail.")
    if not getattr(a, "force", False):
        pre = precheck(c, rbp, offset)
        if pre is None:
            out("(Skipped the check for existing builds: area too big to probe without the add-on.)")
        else:
            made, where_, open_cols, natural = pre
            if made:
                xs, ys, zs = zip(*where_)
                out(f"Stopped: the build would replace {sum(made.values())} block(s) that look player-made: "
                    + ", ".join(f"{k} x{v}" for k, v in sorted(made.items(), key=lambda kv: -kv[1])[:8])
                    + f", around x {min(xs)}..{max(xs)} y {min(ys)}..{max(ys)} z {min(zs)}..{max(zs)}.")
                out("Pick another place (mc spot W D finds clear flat ground, or --at / --gap), "
                    "or ask the user and add --force.")
                return 3
            if open_cols:
                out(f"Note: {open_cols} column(s) under the bottom layer are open (air or liquid) - "
                    "the floor will overhang there; --sink 1 or a foundation helps.")
            if natural:
                out(f"Replacing {natural} natural block(s) (grass, leaves, stone, water, ...).")
    rec = None
    if not a.no_undo:
        rec = snapshot(c, lo, hi, rbp.name or "build")
        out(f"Undo snapshot saved ({len(rec['tiles'])} structure tile(s)).")
    t0 = time.time()
    res = c.run(cmds, timeout=30)
    bad = [r for r in res["results"] if not r["ok"] and not _benign(r)]
    out(f"Done: {len(res['results']) - len(bad)}/{len(res['results'])} commands ok in {time.time() - t0:.1f}s.")
    for r in bad[:10]:
        out(f"  failed: /{r['command']}  ->  {r.get('message')}")
    if a.verify:
        diffs = verify(c, rbp, offset)
        if diffs:
            out(f"Verify: {len(diffs)} block(s) differ from the blueprint, e.g.:")
            for pos, want, got in diffs[:10]:
                out(f"  {pos[0]} {pos[1]} {pos[2]}: wanted {want}, found {got}")
        else:
            out("Verify: every block matches the blueprint.")
    if rec:
        out("To undo: mc undo")
    return 0 if not bad else 1


def cli_undo(a, c, out) -> int:
    recs = _undo_load()
    if a.list:
        if not recs:
            out("No undo snapshots.")
        for r in reversed(recs):
            out(f"{r['id']}  {time.strftime('%Y-%m-%d %H:%M', time.localtime(r['time']))}  {r['label']}  "
                f"box {r['lo']} to {r['hi']}  ({len(r['tiles'])} tile(s))")
        return 0
    if a.purge:
        cmds = [f"structure delete {t[0]}" for r in recs for t in r["tiles"]]
        if cmds:
            c.run(cmds)
        _undo_save([])
        out(f"Deleted {len(cmds)} snapshot tile(s).")
        return 0
    if not recs:
        out("Nothing to undo.")
        return 1
    rec = recs[-1]
    bad = restore(c, rec)
    if bad:
        out("Undo failed: " + (bad[0].get("message") or "?") + "  (snapshot kept; try again once the area is loaded)")
        return 1
    c.run([f"structure delete {t[0]}" for t in rec["tiles"]])
    _undo_save(recs[:-1])
    out(f"Restored the area of '{rec['label']}' ({rec['lo']} to {rec['hi']}).")
    return 0
