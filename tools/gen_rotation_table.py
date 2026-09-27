"""Generate block_rotation.json: how every Bedrock block's states change when a build is rotated or mirrored.

Bedrock direction states are inconsistent (trapdoor `direction` 0 = east but bed `direction` 0 = south,
piston `facing_direction` 2 = south but ladder 2 = north, door `cardinal_direction` is Java's facing turned
90 degrees, floor levers split their direction over `lever_direction` and `open_bit`, ...). Instead of
hand-written rules, this goes through Java's well-defined block states:

    Bedrock state --(inverse of the Java->Bedrock mapping)--> Java state --rotate/mirror--> Java state
    --(Java->Bedrock mapping)--> Bedrock state

Source: PrismarineJS minecraft-data (MIT license), data/bedrock/<version>/blocksJ2B.json
    npm pack minecraft-data && tar -xzf minecraft-data-*.tgz
    python tools/gen_rotation_table.py package/minecraft-data/data/bedrock/1.26.30/blocksJ2B.json
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / ".claude" / "skills" / "minecraft-spatial" / "scripts" / "block_rotation.json"
BLOCKS = ROOT / ".claude" / "skills" / "minecraft-live" / "scripts" / "mclive" / "data" / "blocks.json"
CARD = ["north", "east", "south", "west"]


def parse(s: str):
    m = re.match(r"^(?:minecraft:)?([^\[]+)\[(.*)\]$", s)
    name, body = m.group(1), m.group(2)
    return name, (dict(p.split("=", 1) for p in body.split(",")) if body else {})


def rot(d, k):
    return CARD[(CARD.index(d) + k) % 4] if d in CARD else d


def java_rotate(props: dict, k: int) -> dict:
    """Rotate Java block state properties k quarter turns clockwise (seen from above)."""
    out = {}
    for key, v in props.items():
        nk, nv = key, v
        if key in CARD:
            nk = rot(key, k)
        elif key == "facing":
            nv = rot(v, k)
        elif key == "rotation":
            nv = str((int(v) + 4 * k) % 16)
        elif key == "axis" and k % 2 and v in ("x", "z"):
            nv = "z" if v == "x" else "x"
        elif key == "shape" and v in ("north_south", "east_west") and k % 2:
            nv = "east_west" if v == "north_south" else "north_south"
        elif key == "shape" and v.startswith("ascending_"):
            nv = "ascending_" + rot(v[10:], k)
        elif key == "shape" and "_" in v and all(p in CARD for p in v.split("_")):
            a, b = (rot(p, k) for p in v.split("_"))
            a, b = (a, b) if a in ("north", "south") else (b, a)
            nv = f"{a}_{b}"
        elif key == "orientation":
            nv = "_".join(rot(p, k) for p in v.split("_"))
        out[nk] = nv
    return out


def java_mirror(props: dict, axis: str) -> dict:
    """Mirror Java properties: axis 'x' flips east<->west, 'z' flips north<->south."""
    sw = {"east": "west", "west": "east"} if axis == "x" else {"north": "south", "south": "north"}
    out = {}
    for key, v in props.items():
        nk, nv = key, v
        if key in CARD:
            nk = sw.get(key, key)
        elif key == "facing":
            nv = sw.get(v, v)
        elif key == "rotation":
            nv = str(((16 - int(v)) if axis == "x" else (8 - int(v))) % 16)
        elif key == "shape":
            if v.startswith(("inner_", "outer_")):  # stairs corners change handedness
                nv = v.replace("left", "#").replace("right", "left").replace("#", "right")
            elif v.startswith("ascending_"):
                nv = "ascending_" + sw.get(v[10:], v[10:])
            elif "_" in v and all(p in CARD for p in v.split("_")):
                a, b = (sw.get(p, p) for p in v.split("_"))
                a, b = (a, b) if a in ("north", "south") else (b, a)
                nv = f"{a}_{b}"
        elif key == "hinge":
            nv = {"left": "right", "right": "left"}.get(v, v)
        elif key == "orientation":
            nv = "_".join(sw.get(p, p) for p in v.split("_"))
        out[nk] = nv
    return out


def main(j2b_path: str):
    j2b = json.loads(Path(j2b_path).read_text())
    version = Path(j2b_path).parent.name
    vanilla = json.loads(BLOCKS.read_text())["blocks"]

    def typed(block, state, text):
        vals = vanilla.get(block, {}).get("states", {}).get(state)
        if vals:
            for v in vals:
                if str(v).lower() == text.lower():
                    return v
        if text in ("true", "false"):
            return text == "true"
        return int(text) if re.fullmatch(r"-?\d+", text) else text

    java_to_bed = {}
    by_bed = {}  # bedrock block -> list of (java name, java props, bedrock props)
    for js, bs in j2b.items():
        jn, jp = parse(js)
        bn, bp = parse(bs)
        java_to_bed[(jn, tuple(sorted(jp.items())))] = (bn, bp)
        by_bed.setdefault(bn, []).append((jn, jp, bp))

    def transform(fn):
        """For each bedrock block: {frozen bedrock state: transformed bedrock state}."""
        result = {}
        for bn, rows in by_bed.items():
            m = {}
            for jn, jp, bp in rows:
                tj = fn(jp)
                hit = java_to_bed.get((jn, tuple(sorted(tj.items()))))
                if hit is None or hit[0] != bn:
                    continue
                key = tuple(sorted(bp.items()))
                m.setdefault(key, set()).add(tuple(sorted(hit[1].items())))
            result[bn] = m
        return result

    side = re.compile(r"^.*_(north|east|south|west)$")  # connection states: mcgeo renames these keys itself

    def compress(result):
        """Per-state value maps when each state changes independently, else a joint table."""
        per_state, joint = {}, {}
        for bn, m in result.items():
            m = {tuple(kv for kv in k if not side.match(kv[0])): tuple(kv for kv in next(iter(v)) if not side.match(kv[0]))
                 for k, v in m.items() if len(v) == 1}
            if not m:
                continue
            states = {s for k in m for s, _ in k}
            maps, independent = {}, True
            for s in states:
                vm = {}
                for before, after in m.items():
                    b, a = dict(before).get(s), dict(after).get(s)
                    if b is None or a is None:
                        continue
                    if vm.setdefault(b, a) != a:
                        independent = False
                        break
                if not independent:
                    break
                is_permutation = len(set(vm.values())) == len(vm) and set(vm.values()) <= set(vm)
                if any(k != v for k, v in vm.items()) and is_permutation:  # lossy maps (mushroom faces) are skipped
                    maps[s] = {json.dumps(typed(bn, s, k)): typed(bn, s, v) for k, v in vm.items()}
            if independent:
                if maps:
                    per_state[bn] = maps
            else:
                changed = {s for before, after in m.items() for s in states if dict(before).get(s) != dict(after).get(s)}
                rows = []
                for before, after in m.items():
                    b = {s: typed(bn, s, v) for s, v in before if s in changed}
                    a = {s: typed(bn, s, v) for s, v in after if s in changed}
                    if b != a and [b, a] not in rows:
                        rows.append([b, a])
                joint[bn] = rows
        return per_state, joint

    out = {"source": f"PrismarineJS minecraft-data (MIT) data/bedrock/{version}/blocksJ2B.json via tools/gen_rotation_table.py",
           "note": "cw = one quarter turn clockwise seen from above (north->east). Keys are JSON-encoded state values."}
    for name, fn in (("cw", lambda p: java_rotate(p, 1)), ("mirror_x", lambda p: java_mirror(p, "x")),
                     ("mirror_z", lambda p: java_mirror(p, "z"))):
        per_state, joint = compress(transform(fn))
        out[name] = per_state
        out[name + "_joint"] = joint
    OUT.write_text(json.dumps(out, separators=(",", ":"), sort_keys=True))
    print(f"{OUT}: cw {len(out['cw'])} blocks (+{len(out['cw_joint'])} joint), "
          f"mirror_x {len(out['mirror_x'])} (+{len(out['mirror_x_joint'])}), mirror_z {len(out['mirror_z'])} (+{len(out['mirror_z_joint'])})")


if __name__ == "__main__":
    main(sys.argv[1])
