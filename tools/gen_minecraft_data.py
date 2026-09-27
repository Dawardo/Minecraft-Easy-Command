"""Regenerate the Minecraft reference data used by the Claude skills.

Source: Mojang's official vanilla metadata (github.com/Mojang/bedrock-samples, `metadata/` and
`resource_pack/texts/en_US.lang`). Run after a Minecraft update:

    git clone --depth 1 --filter=blob:none --sparse https://github.com/Mojang/bedrock-samples
    cd bedrock-samples && git sparse-checkout set --no-cone /version.json /metadata/ /resource_pack/texts/ /behavior_pack/recipes/
    python tools/gen_minecraft_data.py path/to/bedrock-samples

Writes:
  .claude/skills/minecraft-live/scripts/mclive/data/blocks.json      (ids, states, English names)
  .claude/skills/minecraft-knowledge/references/*.md|txt             (IDs, states, recipes, ...)
  .claude/skills/minecraft-technical/references/commands.md          (exact syntax of every command)
"""
from __future__ import annotations

import json
import re
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKILLS = ROOT / ".claude" / "skills"


def load_lang(path: Path) -> dict:
    lang = {}
    for line in path.read_text(encoding="utf-8-sig").splitlines():
        if "=" in line and not line.startswith("##"):
            k, v = line.split("=", 1)
            lang[k.strip()] = v.split("\t#")[0].strip()
    return lang


def title_from_id(ident: str) -> str:
    return " ".join(w.capitalize() for w in ident.split(":")[-1].split("_"))


def short(ident: str) -> str:
    return ident[10:] if ident.startswith("minecraft:") else ident


def main(src: str):
    src = Path(src)
    meta = src / "metadata"
    lang = load_lang(src / "resource_pack" / "texts" / "en_US.lang")
    version = json.loads((src / "version.json").read_text())["latest"]["version"]

    # ------------------------------------------------------------------ blocks
    bj = json.loads((meta / "vanilladata_modules" / "mojang-blocks.json").read_text())
    props = {p["name"]: p for p in bj["block_properties"]}
    blocks = {}
    for b in sorted(bj["data_items"], key=lambda b: b["name"]):
        name = lang.get(b["serialization_id"] + ".name") or title_from_id(b["name"])
        states = {}
        for p in b.get("properties", []):
            pp = props[p["name"]]
            states[p["name"]] = [v["value"] for v in pp["values"]]
        blocks[short(b["name"])] = {"name": name, "states": states}
    live_data = SKILLS / "minecraft-live" / "scripts" / "mclive" / "data"
    live_data.mkdir(parents=True, exist_ok=True)
    (live_data / "blocks.json").write_text(json.dumps({"version": version, "blocks": blocks}, separators=(",", ":")))

    # ------------------------------------------------------------------ knowledge references
    kref = SKILLS / "minecraft-knowledge" / "references"
    kref.mkdir(parents=True, exist_ok=True)

    def fmt_vals(vals):
        if all(isinstance(v, bool) for v in vals):
            return "true|false"
        if all(isinstance(v, int) for v in vals) and vals == list(range(vals[0], vals[-1] + 1)) and len(vals) > 3:
            return f"{vals[0]}..{vals[-1]}"
        return "|".join(json.dumps(v) if isinstance(v, str) else str(v) for v in vals)

    lines = [f"# Bedrock block IDs and block states (Minecraft {version})", "",
             "Generated from Mojang's vanilla metadata by tools/gen_minecraft_data.py. One block per line:",
             "`id` - English name - states (`name=values`). In commands write states like",
             '`/setblock ~ ~ ~ oak_stairs ["weirdo_direction"=2,"upside_down_bit"=false]` (strings quoted, numbers/booleans bare).',
             "Unlisted states keep their default (first value). grep this file instead of reading it whole.", ""]
    for ident, b in blocks.items():
        st = "; ".join(f"{k}={fmt_vals(v)}" for k, v in b["states"].items())
        lines.append(f"{ident} - {b['name']}" + (f" - {st}" if st else ""))
    (kref / "blocks.md").write_text("\n".join(lines) + "\n")

    ij = json.loads((meta / "vanilladata_modules" / "mojang-items.json").read_text())
    block_ids = set(blocks)
    item_lines = [f"# Bedrock item IDs (Minecraft {version})", "",
                  "Every id usable with /give, /clear, hasitem=. `[block]` marks items that are also placeable blocks.", ""]
    for it in sorted(ij["data_items"], key=lambda x: x["name"]):
        ident = short(it["name"])
        nm = lang.get(it.get("serialization_id", "") + ".name") or lang.get("item." + ident + ".name") \
            or (blocks[ident]["name"] if ident in blocks else title_from_id(ident))
        item_lines.append(f"{ident} - {nm}" + (" [block]" if ident in block_ids else ""))
    (kref / "items.md").write_text("\n".join(item_lines) + "\n")

    simple = []
    for fname, title in [("mojang-entities.json", "Entity types (/summon, type=)"),
                         ("mojang-biomes.json", "Biomes (/locate biome, /fill ... biome)"),
                         ("mojang-effects.json", "Effects (/effect)"),
                         ("mojang-enchantments.json", "Enchantments (/enchant)"),
                         ("mojang-dimensions.json", "Dimensions (/execute in)"),
                         ("mojang-features.json", "Features (/place feature)"),
                         ("mojang-camera-presets.json", "Camera presets (/camera)")]:
        d = json.loads((meta / "vanilladata_modules" / fname).read_text())
        names = sorted(short(x["name"]) for x in d["data_items"])
        simple.append(f"## {title} - {len(names)}\n\n" + ", ".join(names) + "\n")
    (kref / "ids.md").write_text(f"# Other Bedrock IDs (Minecraft {version})\n\nGenerated. grep for what you need.\n\n"
                                 + "\n".join(simple))

    # ------------------------------------------------------------------ recipes
    rdir = src / "behavior_pack" / "recipes"
    out = defaultdict(list)
    for f in sorted(rdir.glob("*.json")):
        try:
            d = json.loads(re.sub(r"//[^\n]*", "", f.read_text(encoding="utf-8-sig")))
        except Exception:
            continue
        for kind, r in d.items():
            if not kind.startswith("minecraft:recipe_"):
                continue
            tags = r.get("tags", [])

            def ing(x):
                if isinstance(x, str):
                    return short(x)
                if "tag" in x:
                    return "#" + short(x["tag"])
                s = short(x.get("item", "?"))
                if x.get("count", 1) > 1:
                    s = f"{x['count']}x {s}"
                return s

            res = r.get("result") or r.get("output")
            if isinstance(res, list):
                res = res[0] if res else {}
            if isinstance(res, str):
                res = {"item": res}
            if not isinstance(res, dict):
                continue
            rs = short(res.get("item", "?")) + (f" x{res['count']}" if res.get("count", 1) > 1 else "")
            where = "/".join(tags)
            if kind == "minecraft:recipe_shaped":
                key = {k: ing(v) for k, v in r.get("key", {}).items()}
                pat = [row.replace(" ", ".") for row in r.get("pattern", [])]
                desc = " | ".join(pat) + "  where " + ", ".join(f"{k}={v}" for k, v in key.items())
            elif kind == "minecraft:recipe_shapeless":
                desc = "shapeless: " + " + ".join(ing(x) for x in r.get("ingredients", []))
            elif kind == "minecraft:recipe_furnace":
                desc = "smelt: " + ing(r.get("input", "?"))
            elif kind == "minecraft:recipe_smithing_transform":
                desc = f"smithing: {ing(r.get('base', '?'))} + {ing(r.get('addition', '?'))} + template {ing(r.get('template', '?'))}"
            elif kind == "minecraft:recipe_brewing_mix" or kind == "minecraft:recipe_brewing_container":
                desc = f"brew: {ing(r.get('input', '?'))} + {ing(r.get('reagent', '?'))}"
            else:
                desc = kind.replace("minecraft:recipe_", "")
            out[rs.split(" x")[0]].append(f"{rs} <= {desc}  [{where}]")
    rl = [f"# Bedrock recipes (Minecraft {version})", "",
          "Generated from the vanilla behavior pack. `#planks` = any item with that tag. Pattern rows are",
          "separated by `|` (`.` is an empty slot). grep for the result id, e.g. `grep '^piston' recipes.md`.", ""]
    for k in sorted(out):
        rl.extend(sorted(set(out[k])))
    (kref / "recipes.md").write_text("\n".join(rl) + "\n")

    # ------------------------------------------------------------------ command syntax
    cj = json.loads((meta / "command_modules" / "mojang-commands.json").read_text())
    enums = {e["name"].lower(): [v["value"] for v in e["values"]] for e in cj["command_enums"]}
    tref = SKILLS / "minecraft-technical" / "references"
    tref.mkdir(parents=True, exist_ok=True)
    typemap = {"POSITION": "x y z", "POSITION_FLOAT": "x y z", "SELECTION": "target", "BLOCK": "Block",
               "BLOCK_STATE_ARRAY": "[states]", "ITEM": "Item", "INT": "int", "VAL": "float", "RVAL": "rot",
               "ID": "string", "RAWTEXT": "text", "MESSAGE_ROOT": "message", "JSON_OBJECT": "json",
               "WILDCARDINT": "int|*", "WILDCARDSELECTION": "target|*", "ENTITYTYPE": "EntityType",
               "CODEBUILDERARGS": "command", "EXECUTECHAINEDOPTION_0": "subcommand...", "FULLINTEGERRANGE": "range",
               "BOOLEAN": "true|false", "COMPAREOPERATOR": "<|<=|=|>=|>", "OPERATOR": "=|+=|-=|*=|/=|%=|<|>|><"}
    cl = [f"# Bedrock command syntax (Minecraft {version})", "",
          "Generated from Mojang's command metadata: every overload of every server command, exactly as the game",
          "parses it. `<required>` `[optional]`, `a|b` = literal choices. `perm` = permission level (1 = operator/cheats).",
          "grep for the command name instead of reading the whole file.", ""]
    for c in sorted(cj["commands"], key=lambda c: c["name"]):
        aliases = [a["name"] if isinstance(a, dict) else a for a in c.get("aliases", [])]
        cl.append(f"## /{c['name']}" + (f" (alias: {', '.join('/' + a for a in aliases)})" if aliases else ""))
        cl.append(f"{c['description']}  perm={c['permission_level']} cheats={'yes' if c['requires_cheats'] else 'no'}")
        cl.append("```")
        for o in c["overloads"]:
            parts = []
            for p in o["params"]:
                t = p["type"]["name"]
                vals = enums.get(t.lower())
                if vals and len(vals) <= 12:
                    shown = "|".join(vals)
                    parts.append(f"[{shown}]" if p["is_optional"] else (shown if len(vals) == 1 else f"<{shown}>"))
                    continue
                if vals:
                    t = f"{t.lower()} ({len(vals)} values)"
                else:
                    t = typemap.get(t, t.lower())
                parts.append(f"[{p['name']}: {t}]" if p["is_optional"] else f"<{p['name']}: {t}>")
            cl.append(f"/{c['name']} " + " ".join(parts))
        cl.append("```")
        cl.append("")
    used = {}
    for c in cj["commands"]:
        for o in c["overloads"]:
            for p in o["params"]:
                t = p["type"]["name"].lower()
                if t in enums and 12 < len(enums[t]) <= 200:
                    used.setdefault(t, set()).add("/" + c["name"])
    cl += ["## Enum values", "", "Named values accepted by the parameters above (large lists like blocks and items: see the "
           "minecraft-knowledge references).", ""]
    for t in sorted(used):
        cl.append(f"### {t} (used by {', '.join(sorted(used[t]))})")
        cl.append(", ".join(enums[t]))
        cl.append("")
    (tref / "commands.md").write_text("\n".join(cl) + "\n")
    print(f"Minecraft {version}: {len(blocks)} blocks, {len(ij['data_items'])} items, "
          f"{sum(len(v) for v in out.values())} recipes, {len(cj['commands'])} commands")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "../bedrock-samples")
