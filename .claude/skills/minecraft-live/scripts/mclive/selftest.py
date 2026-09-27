"""`mc selftest`: prove the whole pipeline works on this PC without Minecraft.

Starts a private bridge and a simulated Minecraft that speaks the real protocol (with encryption),
then runs the same operations Claude uses and checks the results.
"""
from __future__ import annotations

import contextlib
import io
import time


def run(out, encrypted: bool = True) -> int:
    import mc  # the CLI module (already on sys.path)
    from .harness import Harness

    failures = 0

    def check(name, cond, detail=""):
        nonlocal failures
        out(("PASS " if cond else "FAIL ") + name + ("" if cond else f"  ({detail})"))
        failures += not cond

    def cli(*args):
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            rc = mc.main(list(args))
        return rc, buf.getvalue()

    t0 = time.time()
    with Harness(encryption="auto" if encrypted else "off") as h:
        s = h.client().status()
        check("simulated Minecraft connects", s["connected"] and s["session"]["player"] == "Steve", s)
        if encrypted:
            check("connection is encrypted", s["session"]["encrypted"], s["session"])
        rc, text = cli("run", "setblock ~ ~ ~2 gold_block", "testforblock ~ ~ ~2 gold_block")
        check("run commands", rc == 0 and "Block placed" in text, text)
        rc, text = cli("where")
        check("where", rc == 0 and "Facing north" in text, text)
        rc, text = cli("look", "-r", "5")
        check("look (add-on vision)", rc == 0 and "Surface map" in text and "@" in text, text[:300])
        rc, text = cli("build", "--shape", "cylinder radius=2 height=3 block=stone_bricks hollow", "--here", "--verify")
        check("build + verify", rc == 0 and "every block matches" in text, text)
        rc, text = cli("undo")
        check("undo", rc == 0 and "Restored" in text, text)
        h.call(h.fake.chat("hello claude"))
        rc, text = cli("chat", "--wait", "3")
        check("read chat", "hello claude" in text, text)
        rc, text = cli("say", "hi")
        check("say", rc == 0 and h.fake.chat_log[-1][1].endswith("hi"), h.fake.chat_log[-1:])
    with Harness(encryption="off", addon=False) as h:
        rc, text = cli("look", "-r", "4")
        check("look without the add-on (/testforblock probing)", rc == 0 and "grass_block" in text, text[:300])
    out(f"{'ALL PASSED' if not failures else str(failures) + ' FAILED'} in {time.time() - t0:.1f}s")
    return 1 if failures else 0
