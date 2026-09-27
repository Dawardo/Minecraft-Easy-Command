"""Check every Minecraft command example in the skill docs against real game data.

Block commands run through the simulator's parser (real block ids and states from Mojang's metadata);
/give items and /summon entities are checked against the generated id lists. Placeholder examples
(<name>, X1, ...) are skipped. Used by tests/test_minecraft_skills.py; run directly to see every problem.
"""
from __future__ import annotations

import glob
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKILLS = ROOT / ".claude" / "skills"
sys.path.insert(0, str(SKILLS / "minecraft-live" / "scripts"))
from mclive.fakemc import PARSE, CmdError, FakeMinecraft  # noqa: E402

CMDS = ("setblock", "fill", "testforblock", "clone", "execute", "give", "summon")
GENERATED = ("commands.md", "blocks.md", "items.md", "recipes.md", "ids.md")
PLACEHOLDER = re.compile(r"<[^>]*>|\bX[12]\b|\bX Y Z\b|\.\.\.|\{\.\.\.\}")


def _ids(section_prefix):
    out, grab = set(), False
    for line in (SKILLS / "minecraft-knowledge" / "references" / "ids.md").read_text().splitlines():
        if line.startswith("## "):
            grab = line.startswith(section_prefix)
            continue
        if grab and "," in line:
            out |= {x.strip() for x in line.split(",")}
    return out


MIN_TOKENS = {"setblock": 5, "fill": 8, "testforblock": 5, "clone": 10, "give": 3, "summon": 2, "execute": 4}
NOT_BEDROCK = re.compile(r"(?i)\b(old|java|not|instead of)\W{0,3}$")  # `...` preceded by these is a counter-example


def complete(c: str) -> bool:
    toks = c.split()
    if len(toks) < MIN_TOKENS.get(toks[0], 1):
        return False
    return toks[0] != "execute" or " run " in f" {c} " or toks[1] in ("if", "unless") and len(toks) >= 6


def examples():
    pat = re.compile(r"`/?((?:%s)\s[^`]*)`" % "|".join(CMDS))
    for f in sorted(glob.glob(str(SKILLS / "**" / "*.md"), recursive=True)):
        if f.endswith(GENERATED):
            continue
        text = Path(f).read_text(encoding="utf-8")
        found = []
        if f.endswith("java-to-bedrock.md"):  # tables: only the Bedrock column
            text_for_spans = "\n".join("|".join(ln.split("|")[2:]) if ln.startswith("|") else ln for ln in text.splitlines())
        else:
            text_for_spans = text
        for m in pat.finditer(text_for_spans):
            before = " ".join(text_for_spans[max(0, m.start() - 40):m.start()].split())  # context across line breaks
            if not NOT_BEDROCK.search(before):
                found.append(m.group(1))
        for block in re.findall(r"```[a-z]*\n(.*?)```", text, re.S):
            for line in block.splitlines():
                line = line.strip().lstrip("/")
                if line.split(" ")[0] in CMDS:
                    found.append(line)
        for c in found:
            c = c.strip()
            if not PLACEHOLDER.search(c) and complete(c):
                yield Path(f).relative_to(ROOT), c


def problems():
    items = {ln.split(" - ")[0] for ln in (SKILLS / "minecraft-knowledge" / "references" / "items.md").read_text().splitlines()
             if " - " in ln}
    ents = _ids("## Entity")
    out, n = [], 0
    for f, c in examples():
        n += 1
        name = c.split()[0]
        if name == "give":
            it = c.split()[2].replace("minecraft:", "")
            if it not in items:
                out.append((f, c, f"unknown item {it}"))
            continue
        if name == "summon":
            et = c.split()[1].replace("minecraft:", "")
            if et not in ents:
                out.append((f, c, f"unknown entity {et}"))
            continue
        try:
            FakeMinecraft().execute(c)
        except CmdError as e:
            if e.code == PARSE or "not valid" in str(e):
                out.append((f, c, str(e)))
    return n, out


if __name__ == "__main__":
    n, bad = problems()
    print(f"checked {n} command examples")
    for f, c, msg in bad:
        print(f"PROBLEM in {f}: {c}\n    -> {msg}")
    sys.exit(1 if bad else 0)
