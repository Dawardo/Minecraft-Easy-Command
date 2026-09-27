"""Shared data formats: block specs, the compact scan format, and block-name lookups.

Scan format (produced by the Claude Link add-on's /claude:scan, and by the simulator):
    {"v":1, "from":[x,y,z], "size":[sx,sy,sz], "palette":["air","stone","oak_stairs[\"weirdo_direction\"=2]", "?"],
     "data":"0*120,1*3,2,0*40"}
  * palette entries use command syntax: id without "minecraft:", then optional ["state"=value,...]
    "?" = unknown (unloaded chunk / outside the world)
  * data = run-length encoded palette indices, ordered y (slowest), then z, then x (fastest)
"""
from __future__ import annotations

import json
import re
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent / "data"
_BLOCKS = None


def blocks_db() -> dict:
    """id (no namespace) -> {"name": English name, "states": {state: [values...]}}"""
    global _BLOCKS
    if _BLOCKS is None:
        try:
            _BLOCKS = json.loads((DATA_DIR / "blocks.json").read_text(encoding="utf-8"))["blocks"]
        except Exception:
            _BLOCKS = {}
    return _BLOCKS


_NAME_INDEX = None


def id_from_name(name: str):
    """Map an English display name (as printed by /testforblock) or an id back to a block id."""
    global _NAME_INDEX
    db = blocks_db()
    if _NAME_INDEX is None:
        _NAME_INDEX = {}
        for ident, b in sorted(db.items(), key=lambda kv: len(kv[0])):  # prefer the shortest id on clashes
            _NAME_INDEX.setdefault(b["name"].lower(), ident)
    n = name.strip()
    if n.startswith("minecraft:"):
        n = n[10:]
    if n in db:
        return n
    key = n.lower()
    if key in _NAME_INDEX:
        return _NAME_INDEX[key]
    guess = re.sub(r"[^a-z0-9]+", "_", key).strip("_")
    return guess if guess in db else None


def strip_ns(ident: str) -> str:
    return ident[10:] if ident.startswith("minecraft:") else ident


def format_states(states: dict | None) -> str:
    if not states:
        return ""
    parts = []
    for k in sorted(states):
        v = states[k]
        if isinstance(v, bool):
            vs = "true" if v else "false"
        elif isinstance(v, (int, float)):
            vs = str(v)
        else:
            vs = json.dumps(str(v))
        parts.append(f"{json.dumps(k)}={vs}")
    return "[" + ",".join(parts) + "]"


def parse_states(text: str) -> dict:
    """Parse ["a"=1,"b"="x","c"=true] (also accepts a:b and unquoted keys)."""
    text = text.strip()
    if text.startswith("["):
        text = text[1:]
    if text.endswith("]"):
        text = text[:-1]
    out = {}
    for m in re.finditer(r'\s*"?([\w:.\-]+)"?\s*[=:]\s*("(?:[^"\\]|\\.)*"|[^,\]]+)\s*,?', text):
        k, v = m.group(1), m.group(2).strip()
        if v.startswith('"'):
            out[k] = json.loads(v)
        elif v in ("true", "false"):
            out[k] = v == "true"
        else:
            try:
                out[k] = int(v)
            except ValueError:
                try:
                    out[k] = float(v)
                except ValueError:
                    out[k] = v
    return out


def block_spec(ident: str, states: dict | None = None) -> str:
    """'oak_stairs', {'weirdo_direction': 2} -> 'oak_stairs["weirdo_direction"=2]' (the scan palette form)."""
    return strip_ns(ident) + format_states(states)


def split_spec(spec: str):
    """'oak_stairs["weirdo_direction"=2]' -> ('oak_stairs', {'weirdo_direction': 2})"""
    spec = spec.strip()
    i = spec.find("[")
    if i < 0:
        return strip_ns(spec), {}
    return strip_ns(spec[:i].strip()), parse_states(spec[i:])


def command_block_arg(spec: str) -> str:
    """Block spec -> the text to put in /setblock or /fill: 'oak_stairs ["weirdo_direction"=2]'."""
    ident, states = split_spec(spec)
    st = format_states(states)
    return ident + (" " + st if st else "")


# ---------------------------------------------------------------- run-length encoding
def rle_encode(values) -> str:
    out, prev, n = [], None, 0
    for v in values:
        if v == prev:
            n += 1
            continue
        if n:
            out.append(f"{prev}*{n}" if n > 1 else f"{prev}")
        prev, n = v, 1
    if n:
        out.append(f"{prev}*{n}" if n > 1 else f"{prev}")
    return ",".join(out)


def rle_decode(text: str, cast=int) -> list:
    out = []
    if not text:
        return out
    for tok in text.split(","):
        v, _, n = tok.partition("*")
        out.extend([cast(v)] * (int(n) if n else 1))
    return out


def encode_scan(origin, size, get_spec) -> dict:
    """Encode the box starting at origin with the given size. get_spec(x, y, z) -> palette string."""
    x0, y0, z0 = origin
    sx, sy, sz = size
    palette, index, vals = [], {}, []
    for y in range(y0, y0 + sy):
        for z in range(z0, z0 + sz):
            for x in range(x0, x0 + sx):
                spec = get_spec(x, y, z)
                i = index.get(spec)
                if i is None:
                    i = index[spec] = len(palette)
                    palette.append(spec)
                vals.append(i)
    return {"v": 1, "from": [x0, y0, z0], "size": [sx, sy, sz], "palette": palette, "data": rle_encode(vals)}


class Region:
    """A decoded block box. Access with region.get(x, y, z) -> palette spec (e.g. 'stone', 'air', '?')."""

    def __init__(self, origin, size, palette, indices):
        self.origin = tuple(origin)
        self.size = tuple(size)
        self.palette = list(palette)
        self.indices = indices  # flat list, y-z-x order

    @classmethod
    def from_scan(cls, scan: dict) -> "Region":
        vals = rle_decode(scan["data"])
        sx, sy, sz = scan["size"]
        if len(vals) != sx * sy * sz:
            raise ValueError(f"scan data has {len(vals)} blocks, expected {sx * sy * sz} (truncated message?)")
        return cls(scan["from"], scan["size"], scan["palette"], vals)

    @classmethod
    def empty(cls, origin, size, fill="?"):
        sx, sy, sz = size
        return cls(origin, size, [fill], [0] * (sx * sy * sz))

    def contains(self, x, y, z) -> bool:
        return all(o <= c < o + s for c, o, s in zip((x, y, z), self.origin, self.size))

    def _i(self, x, y, z):
        x0, y0, z0 = self.origin
        sx, sy, sz = self.size
        return ((y - y0) * sz + (z - z0)) * sx + (x - x0)

    def get(self, x, y, z) -> str:
        if not self.contains(x, y, z):
            return "?"
        return self.palette[self.indices[self._i(x, y, z)]]

    def set(self, x, y, z, spec: str):
        try:
            p = self.palette.index(spec)
        except ValueError:
            p = len(self.palette)
            self.palette.append(spec)
        self.indices[self._i(x, y, z)] = p

    def paste(self, other: "Region"):
        for (x, y, z), spec in other.items():
            if self.contains(x, y, z):
                self.set(x, y, z, spec)

    def items(self):
        x0, y0, z0 = self.origin
        sx, sy, sz = self.size
        i = 0
        for y in range(y0, y0 + sy):
            for z in range(z0, z0 + sz):
                for x in range(x0, x0 + sx):
                    yield (x, y, z), self.palette[self.indices[i]]
                    i += 1

    def counts(self) -> dict:
        c = {}
        for v in self.indices:
            s = self.palette[v]
            c[s] = c.get(s, 0) + 1
        return c

    def to_scan(self) -> dict:
        return encode_scan(self.origin, self.size, self.get)
