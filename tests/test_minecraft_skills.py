"""Tests for the Minecraft skills in .claude/skills/ (bridge, vision, building, add-on, docs).

    python -m unittest tests/test_minecraft_skills.py -v

No Minecraft needed: a simulated game (mclive/fakemc.py) speaks the real WebSocket protocol, with the
game's real message texts and real block data. The add-on test needs `node`; the mcpews interop test
runs only when MCPEWS_DIR points at a folder with `npm install mcpews` done.
"""
from __future__ import annotations

import base64
import contextlib
import io
import json
import os
import random
import shutil
import subprocess
import sys
import tempfile
import time
import unittest
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LIVE = ROOT / ".claude" / "skills" / "minecraft-live"
SPATIAL = ROOT / ".claude" / "skills" / "minecraft-spatial"
sys.path.insert(0, str(LIVE / "scripts"))
sys.path.insert(0, str(SPATIAL / "scripts"))
sys.path.insert(0, str(Path(__file__).resolve().parent))

import mc  # noqa: E402
import mcgeo  # noqa: E402
from mclive import codec, mccrypto, senses  # noqa: E402
from mclive.fakemc import FakeMinecraft, local_to_world  # noqa: E402
from mclive.harness import Harness  # noqa: E402

COTTAGE = SPATIAL / "assets" / "cottage.txt"


def cli(*args):
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        rc = mc.main([str(a) for a in args])
    return rc, buf.getvalue()


# ---------------------------------------------------------------- crypto
class TestCrypto(unittest.TestCase):
    def test_aes_cfb8_nist_vector(self):
        key = bytes.fromhex("603deb1015ca71be2b73aef0857d77811f352c073b6108d72d9810a30914dff4")
        iv = bytes.fromhex("000102030405060708090a0b0c0d0e0f")
        pt = bytes.fromhex("6bc1bee22e409f96e93d7e117393172aae2d")
        want = "dc1f1a8520a64db55fcc8ac554844e889700"  # NIST SP 800-38A F.3.13
        backends = ["python"] + (["cryptography"] if mccrypto._FAST_CFB8 else [])
        for b in backends:
            self.assertEqual(mccrypto.StreamCipher(key, iv, b).encrypt(pt).hex(), want, b)
            self.assertEqual(mccrypto.StreamCipher(key, iv, b).decrypt(bytes.fromhex(want)), pt, b)

    def test_stream_is_continuous_across_messages(self):
        key, iv = os.urandom(32), os.urandom(16)
        whole = mccrypto.StreamCipher(key, iv, "python").encrypt(b"hello world, this is one stream")
        s = mccrypto.StreamCipher(key, iv, "python")
        parts = s.encrypt(b"hello world, ") + s.encrypt(b"this is one stream")
        self.assertEqual(whole, parts)

    def test_ecdh_agrees_and_rejects_bad_points(self):
        a, b = mccrypto.ECDHKey("python"), mccrypto.ECDHKey("python")
        self.assertEqual(a.shared_secret(b.public_b64), b.shared_secret(a.public_b64))
        der = base64.b64decode(a.public_b64)
        self.assertEqual(len(der), 120)
        self.assertTrue(der.startswith(mccrypto.SPKI_P384_PREFIX))
        self.assertTrue(mccrypto._on_curve(mccrypto._GX, mccrypto._GY))
        with self.assertRaises(ValueError):
            a.shared_secret(base64.b64encode(mccrypto.SPKI_P384_PREFIX + b"\x04" + b"\x01" * 96).decode())
        if mccrypto.HAVE_CRYPTOGRAPHY:
            c = mccrypto.ECDHKey("cryptography")
            self.assertEqual(a.shared_secret(c.public_b64), c.shared_secret(a.public_b64))


# ---------------------------------------------------------------- codec and names
class TestCodec(unittest.TestCase):
    def test_rle_roundtrip(self):
        for _ in range(50):
            vals = [random.choice([0, 0, 0, 1, 2, 7]) for _ in range(random.randint(0, 300))]
            self.assertEqual(codec.rle_decode(codec.rle_encode(vals)), vals)

    def test_states_roundtrip(self):
        st = {"weirdo_direction": 2, "upside_down_bit": False, "minecraft:corner": "none"}
        spec = codec.block_spec("minecraft:oak_stairs", st)
        self.assertEqual(spec, 'oak_stairs["minecraft:corner"="none","upside_down_bit"=false,"weirdo_direction"=2]')
        self.assertEqual(codec.split_spec(spec), ("oak_stairs", st))
        self.assertEqual(codec.command_block_arg(spec), 'oak_stairs ["minecraft:corner"="none","upside_down_bit"=false,"weirdo_direction"=2]')

    def test_display_names_map_back_to_ids(self):
        for name, ident in [("Grass Block", "grass_block"), ("Jack o'Lantern", "lit_pumpkin"), ("Oak Planks", "oak_planks"),
                            ("Stone", "stone"), ("Cobweb", "web"), ("minecraft:dirt", "dirt"), ("Water", "water")]:
            self.assertEqual(codec.id_from_name(name), ident, name)
        self.assertIsNone(codec.id_from_name("Definitely Not A Block"))

    def test_region_encode_decode(self):
        m = FakeMinecraft()
        scan = codec.encode_scan((-3, 62, -3), (7, 4, 7), m.world.spec)
        r = codec.Region.from_scan(json.loads(json.dumps(scan)))
        self.assertEqual(r.get(0, 63, 0), "grass_block")
        self.assertEqual(r.get(0, 64, 0), "air")
        self.assertEqual(r.get(100, 64, 0), "?")
        bad = dict(scan, data=scan["data"] + ",0")
        with self.assertRaises(ValueError):
            codec.Region.from_scan(bad)


# ---------------------------------------------------------------- geometry
class TestGeometry(unittest.TestCase):
    def test_greedy_boxes_exact_cover_and_limit(self):
        random.seed(7)
        for limit in (mcgeo.FILL_LIMIT, 50):
            for _ in range(80):
                cells = {(random.randint(0, 9), random.randint(0, 5), random.randint(0, 9)) for _ in range(random.randint(1, 200))}
                covered = []
                for x0, y0, z0, x1, y1, z1 in mcgeo.greedy_boxes(cells, limit):
                    self.assertLessEqual((x1 - x0 + 1) * (y1 - y0 + 1) * (z1 - z0 + 1), limit)
                    covered += [(x, y, z) for x in range(x0, x1 + 1) for y in range(y0, y1 + 1) for z in range(z0, z1 + 1)]
                self.assertEqual(len(covered), len(set(covered)))
                self.assertEqual(set(covered), cells)

    def test_big_solid_splits_under_fill_limit(self):
        cells = {(x, y, z) for x in range(40) for y in range(30) for z in range(40)}
        self.assertEqual(len(mcgeo.greedy_boxes(cells)), 2)

    def test_rotation_tables_cycle_and_mirror_involution(self):
        t = mcgeo._table()
        self.assertGreater(len(t["cw"]), 300)
        for ident, per in t["cw"].items():
            for s, vm in per.items():
                for vk in vm:
                    st = {s: json.loads(vk)}
                    self.assertEqual(mcgeo.rotate_states(st, 4, ident), st, (ident, s, vk))
        for ident, rows in t["cw_joint"].items():
            for before, _after in rows:
                self.assertEqual(mcgeo.rotate_states(before, 4, ident), before, ident)
        for axis in ("x", "z"):
            for ident, per in t["mirror_" + axis].items():
                for s, vm in per.items():
                    for vk in vm:
                        st = {s: json.loads(vk)}
                        self.assertEqual(mcgeo.mirror_states(mcgeo.mirror_states(st, axis, ident), axis, ident), st)

    def test_verified_direction_quirks(self):
        r = mcgeo.rotate_states
        self.assertEqual(r({"direction": 3}, 1, "trapdoor"), {"direction": 0})  # trapdoor north(3) -> east(0)
        self.assertEqual(r({"direction": 2}, 1, "bed"), {"direction": 3})  # bed north(2) -> east(3)
        self.assertEqual(r({"weirdo_direction": 3}, 1, "oak_stairs"), {"weirdo_direction": 0})
        self.assertEqual(r({"minecraft:cardinal_direction": "east"}, 1, "wooden_door"), {"minecraft:cardinal_direction": "south"})
        self.assertEqual(r({"facing_direction": 3}, 1, "piston"), {"facing_direction": 4})  # piston north(3) -> east(4)
        self.assertEqual(r({"torch_facing_direction": "south"}, 1, "torch"), {"torch_facing_direction": "west"})
        lever = {"lever_direction": "up_north_south", "open_bit": False}
        self.assertEqual(r(lever, 1, "lever"), {"lever_direction": "up_east_west", "open_bit": True})
        self.assertEqual(r(lever, 4, "lever"), lever)

    def test_blueprint_rotation_and_mirror_roundtrip(self):
        bp = mcgeo.load(str(COTTAGE))
        norm = bp.normalized().voxels
        self.assertEqual(bp.rotated(1).rotated(1).rotated(1).rotated(1).voxels, norm)
        self.assertEqual(bp.rotated(2).voxels, bp.rotated(1).rotated(1).voxels)
        self.assertEqual(bp.mirrored("x").mirrored("x").voxels, norm)
        line = mcgeo.Blueprint({(0, 0, 0): "stone", (2, 0, 0): "gold_block"})
        self.assertEqual(line.rotated(1).voxels[(0, 0, 2)], "gold_block")  # east end -> south end

    def test_two_high_blocks_completed(self):
        bp = mcgeo.Blueprint({(0, 0, 0): "wooden_door", (0, 1, 0): "wooden_door", (2, 0, 0): "sunflower"}).complete_doors()
        self.assertEqual(mcgeo.split_spec(bp.voxels[(0, 1, 0)])[1], {"upper_block_bit": True})
        self.assertIn((2, 1, 0), bp.voxels)
        cmds = mcgeo.compile_commands(bp)
        self.assertFalse(any(c.startswith("fill") and "door" in c for c in cmds), cmds)  # halves never merged

    def test_command_order(self):
        bp = mcgeo.Blueprint({(0, 0, 0): "stone", (0, 1, 0): "torch", (1, 0, 0): "water", (0, 2, 0): "air", (1, 1, 0): "sand"})
        order = [c.split()[-1] for c in mcgeo.compile_commands(bp)]
        self.assertEqual(order, ["air", "stone", "sand", "torch", "water"])

    def test_text_format_errors_and_ranges(self):
        bp = mcgeo.parse_text("legend:\n  S = stone\nlayer 0-2:\nS.S\n")
        self.assertEqual(len(bp), 9)
        self.assertEqual(bp.voxels[(1, 2, 0)], "air")
        with self.assertRaises(ValueError):
            mcgeo.parse_text("legend:\n  S = stone\nlayer 0:\nSX\n")

    def test_shapes(self):
        self.assertEqual(len(mcgeo.box((0, 0, 0), (2, 2, 2), hollow=True)), 26)
        self.assertEqual(len(mcgeo.box((0, 0, 0), (2, 2, 2), walls=True)), 24)
        self.assertEqual(len(mcgeo.line((0, 0, 0), (5, 0, 3))), 6)
        s = set(mcgeo.sphere((0, 0, 0), 4, hollow=True))
        self.assertIn((4, 0, 0), s)
        self.assertNotIn((0, 0, 0), s)
        self.assertTrue(all(p[1] >= 0 for p in mcgeo.sphere((0, 0, 0), 3, half="top")))

    def test_local_coordinates(self):
        def f(yaw, pitch, *luf):
            return tuple(round(v, 6) + 0.0 for v in local_to_world((0, 0, 0), yaw, pitch, *luf))
        self.assertEqual(f(0, 0, 0, 0, 1), (0.0, 0.0, 1.0))  # facing south, forward = +z
        self.assertEqual(f(0, 0, 1, 0, 0), (1.0, 0.0, 0.0))  # ^1 = left = east when facing south
        self.assertEqual(f(180, 0, 0, 0, 1), (0.0, 0.0, -1.0))
        self.assertEqual(f(-90, 0, 0, 0, 1), (1.0, 0.0, 0.0))
        self.assertEqual(f(0, 90, 0, 1, 0), (0.0, 0.0, 1.0))  # looking down, "up" points forward
        self.assertEqual(senses.facing(180)[1], "north")
        self.assertEqual(senses.facing(-90)[1], "east")
        self.assertEqual(senses.facing(45)[0], "south-west")


# ---------------------------------------------------------------- bridge + CLI end to end
class TestBridge(unittest.TestCase):
    def test_encrypted_connection_and_commands(self):
        with Harness() as h:
            s = h.client().status()
            self.assertTrue(s["connected"])
            self.assertTrue(s["session"]["encrypted"])
            self.assertEqual(s["session"]["player"], "Steve")
            self.assertTrue(h.fake.commands[0].startswith("enableencryption "))
            rc, out = cli("run", "setblock ~ ~ ~2 stone", "bogus")
            self.assertIn("OK  /setblock ~ ~ ~2 stone  ->  Block placed", out)
            self.assertIn("ERR /bogus", out)
            self.assertIn("[FailedToParseCommand]", out)

    def test_pure_python_crypto_on_both_sides(self):
        saved = mccrypto.HAVE_CRYPTOGRAPHY, mccrypto._FAST_CFB8
        mccrypto.HAVE_CRYPTOGRAPHY, mccrypto._FAST_CFB8 = False, None
        try:
            with Harness(crypto_backend="python") as h:
                self.assertTrue(h.client().status()["session"]["encrypted"])
                self.assertEqual(cli("run", "testfor @s")[0], 0)
        finally:
            mccrypto.HAVE_CRYPTOGRAPHY, mccrypto._FAST_CFB8 = saved

    def test_encryption_modes(self):
        with Harness(encryption="off", require_encryption=True) as h:  # upgrades when the game insists
            self.assertTrue(h.client().status()["session"]["encrypted"])
        with Harness(encryption="auto", supports_encryption=False) as h:  # falls back
            s = h.client().status()["session"]
            self.assertFalse(s["encrypted"])
            self.assertEqual(s["player"], "Steve")

    def test_legacy_event_format_and_chat_filter(self):
        with Harness(encryption="off", legacy_events=True, echo_tellraw=True) as h:
            h.call(h.fake.chat("build a tower"))
            h.call(h.fake.chat("I am someone else", sender="Alex"))
            cli("say", "working on it")
            time.sleep(0.2)
            rc, out = cli("chat")
            self.assertIn("<Steve> (chat) build a tower", out)
            self.assertNotIn("Alex", out)
            self.assertNotIn("working on it", out)  # our own tellraw echo is never read back as input
            rc, out = cli("chat")
            self.assertIn("no new chat messages", out)
            rc, out = cli("chat", "--all", "--since", "0")
            self.assertIn("<Alex> (another player)", out)

    def test_flood_keeps_order_and_limit(self):
        with Harness() as h:
            cmds = [f"setblock {x} 80 {z} stone" for x in range(50) for z in range(50)]
            res = h.client().run(cmds)
            self.assertEqual(sum(r["ok"] for r in res["results"]), 2500)
            sent = [c for c in h.fake.commands if c.startswith("setblock") and " 80 " in c]
            self.assertEqual(sent, cmds)

    def test_paused_game_times_out_then_recovers(self):
        with Harness() as h:
            h.fake.paused = True
            t0 = time.time()
            r = h.client().cmd("setblock ~ ~ ~1 stone", timeout=1.5)
            self.assertFalse(r["ok"])
            self.assertIn("paused", r["message"])
            self.assertLess(time.time() - t0, 5)
            h.fake.paused = False
            time.sleep(0.2)
            self.assertTrue(h.client().cmd("setblock ~ ~ ~3 stone")["ok"])

    def test_reconnect_makes_new_session_active(self):
        with Harness() as h:
            first = h.client().status()["session"]["id"]
            h.call(h.fake.close())
            time.sleep(0.2)
            self.assertFalse(h.client().status()["connected"])
            h.call(h.connect_fake(FakeMinecraft(player="Alex")))
            s = h.client().status()["session"]
            self.assertNotEqual(s["id"], first)
            self.assertEqual(s["player"], "Alex")

    def test_http_api_rejects_strangers(self):
        with Harness() as h:
            port = h.bridge.port

            def get(headers):
                req = urllib.request.Request(f"http://127.0.0.1:{port}/api/status", headers=headers)
                try:
                    with urllib.request.urlopen(req, timeout=5) as r:
                        return r.status
                except urllib.error.HTTPError as e:
                    return e.code
            self.assertEqual(get({}), 401)
            self.assertEqual(get({"X-MC-Token": "wrong"}), 401)
            self.assertEqual(get({"X-MC-Token": h.bridge.token, "Origin": "https://evil.example"}), 403)
            self.assertEqual(get({"X-MC-Token": h.bridge.token, "Host": "evil.example:80"}), 403)
            self.assertEqual(get({"X-MC-Token": h.bridge.token}), 200)

            async def browser_ws():
                r, w = await __import__("asyncio").open_connection("127.0.0.1", port)
                w.write(b"GET / HTTP/1.1\r\nHost: localhost\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n"
                        b"Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\nSec-WebSocket-Version: 13\r\n"
                        b"Origin: https://evil.example\r\n\r\n")
                await w.drain()
                line = await r.readline()
                w.close()
                await w.wait_closed()
                return line
            self.assertIn(b"403", h.call(browser_ws()))


class TestCLI(unittest.TestCase):
    def test_where_look_scan_with_addon(self):
        with Harness():
            rc, out = cli("where")
            self.assertIn("Facing north", out)
            self.assertIn("Forward = north (-Z), right = east (+X)", out)
            rc, out = cli("look", "-r", "6")
            self.assertIn("Surface map", out)
            self.assertIn("z=0     g g g g g g @", out)
            self.assertIn("villager_v2 \"Bob\"", out)
            with tempfile.TemporaryDirectory() as d:
                f = os.path.join(d, "hut.json")
                rc, out = cli("scan", "3", "64", "-8", "5", "66", "-6", "--out", f, "--view", "none")
                self.assertIn("cobblestone", out)
                rc, out = cli("build", f, "--at", "20", "64", "20", "--verify")  # copy the hut elsewhere
                self.assertIn("every block matches", out)
            rc, out = cli("inventory")
            self.assertIn("diamond_pickaxe x1 <- held", out)
            rc, out = cli("heights", "-r", "4")
            self.assertIn("   @", out)

    def test_probe_vision_without_addon(self):
        with Harness(encryption="off", addon=False):
            rc, out = cli("status")
            self.assertIn("not installed", out)
            rc, out = cli("look", "-r", "5")
            self.assertEqual(rc, 0, out)
            self.assertIn("grass_block", out)
            self.assertIn("oak_leaves", out)
            rc, out = cli("scan", "-1", "63", "-1", "1", "64", "1", "--view", "none")
            self.assertIn("grass_block 9", out)

    def test_build_faces_player_in_all_directions_and_undo(self):
        with Harness() as h:
            c = h.client()
            for yaw, card in [(180, "north"), (-90, "east"), (0, "south"), (90, "west")]:
                h.fake.player.yaw = yaw
                before = senses.scan(c, (-12, 62, -12), (12, 72, 12))
                rc, out = cli("build", COTTAGE, "--here", "--verify", "--force")  # north overlaps the hut
                self.assertEqual(rc, 0, out)
                self.assertIn("every block matches", out)
                region = senses.scan(c, (-12, 62, -12), (12, 72, 12))
                doors = [p for p, s in region.items() if s.startswith("wooden_door")]
                dx = sum(p[0] for p in doors) / len(doors)
                dz = sum(p[2] for p in doors) / len(doors)
                # the door (front) is on the side nearest the player at the origin
                self.assertEqual({"north": dz > -4 and abs(dx) < 1, "south": dz < 4 and abs(dx) < 1,
                                  "east": dx < 4 and abs(dz) < 1, "west": dx > -4 and abs(dz) < 1}[card], True, (card, dx, dz))
                rc, out = cli("undo")
                self.assertIn("Restored", out)
                after = senses.scan(c, (-12, 62, -12), (12, 72, 12))
                self.assertEqual([p for p, s in before.items() if after.get(*p) != s], [])

    def test_build_validation_dry_run_and_shapes(self):
        with Harness() as h:
            with tempfile.TemporaryDirectory() as d:
                bad = os.path.join(d, "bad.txt")
                Path(bad).write_text('legend:\n  X = oak_plank\n  Y = oak_stairs["weirdo_direction"=7]\nlayer 0:\nXY\n')
                rc, out = cli("build", bad, "--here")
                self.assertEqual(rc, 2)
                self.assertIn("did you mean oak_planks", out)
                self.assertIn("can't be 7", out)
                n = len(h.fake.commands)
                rc, out = cli("build", COTTAGE, "--at", "~5", "~", "~5", "--dry-run")
                self.assertIn("/fill", out)
                self.assertEqual(len(h.fake.commands), n + 1)  # only the position lookup ran
                fn = os.path.join(d, "x.mcfunction")
                Path(fn).write_text("# comment\nsetblock ~ ~ ~4 gold_block\n\ntestforblock ~ ~ ~4 gold_block\n")
                rc, out = cli("run", "-f", fn)
                self.assertIn("2/2 succeeded", out)
            rc, out = cli("build", "--shape", "cylinder radius=3 height=4 block=stone_bricks hollow", "--center", "-8", "64", "8", "--verify")
            self.assertIn("every block matches", out)


    def test_build_refuses_to_overwrite_player_blocks_and_finds_spots(self):
        with Harness() as h:
            # facing north, --here would overlap the simulator's cobblestone hut at x 3..5 z -8..-6
            n = len(h.fake.commands)
            rc, out = cli("build", COTTAGE, "--here")
            self.assertEqual(rc, 3, out)
            self.assertIn("cobblestone", out)
            self.assertFalse(any(c.startswith(("fill", "setblock", "structure save")) for c in h.fake.commands[n:]))
            rc, out = cli("spot", "7", "5")
            self.assertEqual(rc, 0, out)
            first = out.splitlines()[1].split()
            x, y, z = int(first[1]), int(first[2]), int(first[3])
            rc, out = cli("build", COTTAGE, "--at", x, y, z, "--verify")
            self.assertEqual(rc, 0, out)
            self.assertIn("every block matches", out)
            rc, out = cli("build", COTTAGE, "--here", "--force", "--no-undo")
            self.assertEqual(rc, 0, out)

    def test_center_placement_and_shell_expanded_tilde(self):
        home = os.path.expanduser("~")
        with Harness():
            rc, out = cli("build", "--shape", "dome radius=4 block=glass hollow", "--center", home, home, home, "--verify")
            self.assertEqual(rc, 0, out)
            self.assertIn("centred on x=0 z=0 with its bottom layer at y=64", out)
            rc, out = cli("scan", "~-2", home, home, "~2", "~1", home, "--view", "none")
            self.assertIn("(-2, 64, 0)", out)


# ---------------------------------------------------------------- add-on, install, docs
class TestAddon(unittest.TestCase):
    MOCK = r'''
import fs from "node:fs";
const fix = JSON.parse(fs.readFileSync(new URL("../../../world.json", import.meta.url)));
export const CommandPermissionLevel = { Any: 0, GameDirectors: 1, Admin: 2, Host: 3, Owner: 4 };
export const CustomCommandParamType = { Location: "Location", Integer: "Integer", String: "String" };
export const CustomCommandStatus = { Success: 0, Failure: 1 };
export const EquipmentSlot = { Head: "Head", Chest: "Chest", Legs: "Legs", Feet: "Feet", Offhand: "Offhand" };
class Block { constructor(d, x, y, z, id, s) { Object.assign(this, { dimension: d, x, y, z, typeId: id }); this._s = s; }
  get permutation() { const s = this._s; return { getAllStates: () => ({ ...s }) }; } }
class Dimension { constructor(id) { this.id = id; }
  getBlock(v) { const x = Math.floor(v.x), y = Math.floor(v.y), z = Math.floor(v.z);
    if (y < -64 || y > 319) throw new Error("LocationOutOfWorldBoundariesError");
    const b = fix.blocks[`${x},${y},${z}`]; return b ? new Block(this, x, y, z, b[0], b[1]) : undefined; }
  getTopmostBlock(v) { for (let y = 319; y >= -64; y--) { const b = fix.blocks[`${v.x},${y},${v.z}`];
    if (b && b[0] !== "minecraft:air") return new Block(this, v.x, y, v.z, b[0], b[1]); } return undefined; }
  getBiome() { return { id: "minecraft:plains" }; }
  getEntities() { return []; } }
const ow = new Dimension("minecraft:overworld");
export class Player { constructor() { this.typeId = "minecraft:player"; this.name = "Steve"; this.id = "p"; this.dimension = ow;
  this.location = { x: 0.5, y: 64, z: 0.5 }; this.selectedSlotIndex = 0; }
  getRotation() { return { x: 0, y: 180 }; } getGameMode() { return "Creative"; }
  getBlockFromViewDirection() { return undefined; } getComponent() { return undefined; } }
const player = new Player();
export const world = { getAllPlayers: () => [player], getDimension: () => ow, getTimeOfDay: () => 1000, getDay: () => 0 };
const subs = [];
export const system = { beforeEvents: { startup: { subscribe: (cb) => subs.push(cb) } }, _startup(r) { subs.forEach((cb) => cb({ customCommandRegistry: r })); } };
'''
    RUN = r'''
import { system, world } from "@minecraft/server";
import fs from "node:fs";
const cmds = {};
await import("./main.js");
system._startup({ registerCommand: (d, cb) => { cmds[d.name] = cb; }, registerEnum() {} });
const o = { sourceType: "Entity", sourceEntity: world.getAllPlayers()[0] };
const V = (x, y, z) => ({ x, y, z });
fs.writeFileSync("out.json", JSON.stringify({ names: Object.keys(cmds), ping: cmds["claude:ping"](o),
  scan: cmds["claude:scan"](o, V(-6, 62, -8), V(7, 69, 7)), heights: cmds["claude:heights"](o, V(-6, 0, -8), V(7, 0, 7)),
  sense: cmds["claude:sense"](o, 0) }));
'''

    @unittest.skipUnless(shutil.which("node"), "node not installed")
    def test_addon_output_matches_simulator(self):
        m = FakeMinecraft()
        m.world.set(1, 64, -1, "oak_stairs", {"weirdo_direction": 2})
        blocks = {f"{x},{y},{z}": ["minecraft:" + m.world.get(x, y, z)[0], m.world.get(x, y, z)[1]]
                  for x in range(-6, 8) for y in range(62, 70) for z in range(-8, 8)}
        with tempfile.TemporaryDirectory() as d:
            mod = Path(d) / "node_modules" / "@minecraft" / "server"
            mod.mkdir(parents=True)
            (mod / "package.json").write_text('{"name":"@minecraft/server","type":"module","main":"index.js"}')
            (mod / "index.js").write_text(self.MOCK)
            (Path(d) / "world.json").write_text(json.dumps({"blocks": blocks}))
            shutil.copy(LIVE / "addon" / "claude_link" / "scripts" / "main.js", Path(d) / "main.js")
            (Path(d) / "run.mjs").write_text(self.RUN)
            subprocess.run(["node", "run.mjs"], cwd=d, check=True, capture_output=True, timeout=60)
            got = json.loads((Path(d) / "out.json").read_text())
        self.assertEqual(sorted(got["names"]), ["claude:heights", "claude:inventory", "claude:ping", "claude:scan", "claude:sense"])
        self.assertIn("claudeLink", got["ping"]["message"])
        self.assertEqual(got["scan"]["message"], m.execute("claude:scan -6 62 -8 7 69 7")["statusMessage"])
        self.assertEqual(got["heights"]["message"], m.execute("claude:heights -6 0 -8 7 0 7")["statusMessage"])
        self.assertEqual(json.loads(got["sense"]["message"])["player"]["dim"], "overworld")

    def test_manifest(self):
        m = json.loads((LIVE / "addon" / "claude_link" / "manifest.json").read_text())
        self.assertEqual(m["dependencies"][0], {"module_name": "@minecraft/server", "version": "2.3.0"})
        self.assertNotEqual(m["header"]["uuid"], m["modules"][0]["uuid"])


class TestInstall(unittest.TestCase):
    def test_install_and_enable_in_world(self):
        from mclive import install
        with tempfile.TemporaryDirectory() as d:
            root = Path(d) / "com.mojang"
            world = root / "minecraftWorlds" / "abc123"
            world.mkdir(parents=True)
            (world / "levelname.txt").write_text("My Castle")
            (world / "world_behavior_packs.json").write_text('[{"pack_id": "other", "version": [1, 0, 0]}]')
            dest = install.install_pack(root)
            self.assertTrue((dest / "scripts" / "main.js").exists())
            self.assertEqual(install.worlds([root])[0]["name"], "My Castle")
            self.assertEqual(install.enable_in_world(world), "enabled")
            self.assertEqual(install.enable_in_world(world), "already enabled")
            packs = json.loads((world / "world_behavior_packs.json").read_text())
            self.assertEqual(len(packs), 2)
            self.assertTrue((world / "world_behavior_packs.json.bak").exists())


class TestDocs(unittest.TestCase):
    def test_command_examples_are_valid(self):
        import doclint
        n, bad = doclint.problems()
        self.assertGreater(n, 10)
        self.assertEqual(bad, [], "\n".join(f"{f}: {c} -> {msg}" for f, c, msg in bad))

    def test_skills_have_frontmatter_and_links_resolve(self):
        import re
        for skill in sorted((ROOT / ".claude" / "skills").glob("minecraft-*")):
            text = (skill / "SKILL.md").read_text(encoding="utf-8")
            self.assertTrue(text.startswith("---\nname: " + skill.name + "\ndescription: "), skill.name)
            for link in re.findall(r"\]\(((?:references|assets|scripts)/[^)#]+)\)", text):
                self.assertTrue((skill / link).exists(), f"{skill.name}: missing {link}")
            self.assertLess(len(text.splitlines()), 500)

    def test_cottage_blueprint_is_valid(self):
        from mclive import build
        self.assertEqual(build.validate(mcgeo.load(str(COTTAGE))), [])


class TestMcpewsInterop(unittest.TestCase):
    """Optional: run the bridge against the mcpews reference client (npm install mcpews in MCPEWS_DIR)."""

    @unittest.skipUnless(os.environ.get("MCPEWS_DIR") and shutil.which("node"), "set MCPEWS_DIR to run")
    def test_mcpews_client(self):
        script = r'''
import { WSClient } from "mcpews";
const c = new WSClient(`ws://127.0.0.1:${process.argv[2]}`);
let enc = false; c.on("encryptionEnabled", () => { enc = true; });
c.on("command", (e) => { if (e.handleEncryptionHandshake()) return;
  if (e.commandLine === "testfor @s") return e.respond({ statusCode: 0, statusMessage: "Found Alex", victim: ["Alex"] });
  e.respond({ statusCode: 0, statusMessage: "ran " + e.commandLine });
  if (e.commandLine.startsWith("say ")) setTimeout(() => c.publishEvent("PlayerMessage", { message: "hi from mcpews", sender: "Alex", receiver: "", type: "chat" }), 50); });
setTimeout(() => process.exit(enc ? 0 : 1), 4000);
'''
        d = os.environ["MCPEWS_DIR"]
        Path(d, "interop_client.mjs").write_text(script)
        with Harness(connect=False) as h:
            proc = subprocess.Popen(["node", "interop_client.mjs", str(h.bridge.port)], cwd=d)
            s = h.client().wait_connect(10)
            for _ in range(50):
                if h.client().status()["session"]["player"]:
                    break
                time.sleep(0.1)
            self.assertTrue(h.client().status()["session"]["encrypted"])
            self.assertEqual(h.client().cmd("say hi")["message"], "ran say hi")
            rc, out = cli("chat", "--wait", "3")
            self.assertIn("hi from mcpews", out)
            self.assertEqual(proc.wait(10), 0)
            del s


if __name__ == "__main__":
    unittest.main()
