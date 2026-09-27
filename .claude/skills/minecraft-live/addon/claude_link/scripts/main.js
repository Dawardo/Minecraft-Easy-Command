// Claude Link - lets Claude read your world precisely through the `mc` bridge.
//
// Adds read-only commands (operators only, cheats on). Each answers with JSON in the command's output,
// which Minecraft returns to the bridge over the /connect WebSocket:
//   /claude:ping                      version check
//   /claude:scan <from> <to>          every block in a box: palette + run-length data (y, then z, then x)
//   /claude:heights <from> <to>       top block + height of every column (y of the corners is ignored)
//   /claude:sense [radius]            player position/rotation/biome/look target/health + nearby entities
//   /claude:inventory                 the player's inventory and armor
// Nothing here changes the world. Needs @minecraft/server 2.3.0 (Minecraft 1.21.120 or newer).
import {
  world,
  system,
  CommandPermissionLevel,
  CustomCommandParamType,
  CustomCommandStatus,
  EquipmentSlot,
  Player,
} from "@minecraft/server";

const VERSION = "1.0.0";
const API = "2.3.0";
const SCAN_LIMIT = 32768; // blocks per /claude:scan call; the bridge splits bigger boxes
const COLUMN_LIMIT = 16384; // columns per /claude:heights call

/** @param {string} id */
const stripNs = (id) => (id.startsWith("minecraft:") ? id.slice(10) : id);
/** @param {object} obj */
const ok = (obj) => ({ status: CustomCommandStatus.Success, message: JSON.stringify(obj) });
/** @param {string} msg */
const fail = (msg) => ({ status: CustomCommandStatus.Failure, message: msg });
/** @param {number} v */
const r2 = (v) => Math.round(v * 100) / 100;
/** @param {number} v */
const r3 = (v) => Math.round(v * 1000) / 1000;

// Same text as the bridge's codec: id without "minecraft:", then ["state"=value,...] sorted by name.
/** @param {import("@minecraft/server").Block | undefined} block */
export function specOf(block) {
  if (!block) return "?";
  let s = stripNs(block.typeId);
  /** @type {Record<string, string | number | boolean>} */
  let states = {};
  try {
    states = block.permutation.getAllStates();
  } catch (e) {
    states = {};
  }
  const keys = Object.keys(states).sort();
  if (keys.length) {
    s +=
      "[" +
      keys
        .map((k) => {
          const v = states[k];
          return JSON.stringify(k) + "=" + (typeof v === "string" ? JSON.stringify(v) : String(v));
        })
        .join(",") +
      "]";
  }
  return s;
}

/** @param {(number|string)[]} values */
export function rle(values) {
  const out = [];
  /** @type {number|string|null} */
  let prev = null;
  let n = 0;
  for (const v of values) {
    if (v === prev) {
      n++;
      continue;
    }
    if (n) out.push(n > 1 ? `${prev}*${n}` : `${prev}`);
    prev = v;
    n = 1;
  }
  if (n) out.push(n > 1 ? `${prev}*${n}` : `${prev}`);
  return out.join(",");
}

/** @param {import("@minecraft/server").CustomCommandOrigin} origin @returns {import("@minecraft/server").Player | undefined} */
function playerOf(origin) {
  const e = origin.sourceEntity;
  if (e instanceof Player) return e;
  const all = world.getAllPlayers();
  return all.length ? all[0] : undefined;
}

/** @param {import("@minecraft/server").CustomCommandOrigin} origin */
function dimensionOf(origin) {
  if (origin.sourceEntity) return origin.sourceEntity.dimension;
  if (origin.sourceBlock) return origin.sourceBlock.dimension;
  const p = playerOf(origin);
  return p ? p.dimension : world.getDimension("overworld");
}

/** @param {import("@minecraft/server").Vector3} from @param {import("@minecraft/server").Vector3} to */
function box(from, to) {
  const lo = { x: Math.floor(Math.min(from.x, to.x)), y: Math.floor(Math.min(from.y, to.y)), z: Math.floor(Math.min(from.z, to.z)) };
  const hi = { x: Math.floor(Math.max(from.x, to.x)), y: Math.floor(Math.max(from.y, to.y)), z: Math.floor(Math.max(from.z, to.z)) };
  return { lo, size: [hi.x - lo.x + 1, hi.y - lo.y + 1, hi.z - lo.z + 1] };
}

/** @param {import("@minecraft/server").CustomCommandOrigin} origin @param {import("@minecraft/server").Vector3} from @param {import("@minecraft/server").Vector3} to */
export function scan(origin, from, to) {
  const dim = dimensionOf(origin);
  const { lo, size } = box(from, to);
  const [sx, sy, sz] = size;
  if (sx * sy * sz > SCAN_LIMIT) return fail(`Too many blocks (${sx * sy * sz} > ${SCAN_LIMIT})`);
  /** @type {string[]} */
  const palette = [];
  /** @type {Map<string, number>} */
  const index = new Map();
  /** @type {number[]} */
  const vals = [];
  for (let y = lo.y; y < lo.y + sy; y++) {
    for (let z = lo.z; z < lo.z + sz; z++) {
      for (let x = lo.x; x < lo.x + sx; x++) {
        let spec = "?";
        try {
          spec = specOf(dim.getBlock({ x, y, z }));
        } catch (e) {
          spec = "?"; // outside the world or unloaded
        }
        let i = index.get(spec);
        if (i === undefined) {
          i = palette.length;
          index.set(spec, i);
          palette.push(spec);
        }
        vals.push(i);
      }
    }
  }
  return ok({ v: 1, from: [lo.x, lo.y, lo.z], size: [sx, sy, sz], palette, data: rle(vals) });
}

/** @param {import("@minecraft/server").CustomCommandOrigin} origin @param {import("@minecraft/server").Vector3} from @param {import("@minecraft/server").Vector3} to */
export function heights(origin, from, to) {
  const dim = dimensionOf(origin);
  const { lo, size } = box(from, to);
  const [sx, , sz] = size;
  if (sx * sz > COLUMN_LIMIT) return fail(`Too many columns (${sx * sz} > ${COLUMN_LIMIT})`);
  /** @type {string[]} */
  const palette = [];
  /** @type {Map<string, number>} */
  const index = new Map();
  /** @type {number[]} */
  const top = [];
  /** @type {(number|string)[]} */
  const ys = [];
  for (let z = lo.z; z < lo.z + sz; z++) {
    for (let x = lo.x; x < lo.x + sx; x++) {
      let spec = "?";
      /** @type {number | string} */
      let y = "_";
      try {
        const b = dim.getTopmostBlock({ x, z });
        if (b) {
          spec = specOf(b);
          y = b.y;
        }
      } catch (e) {
        spec = "?";
      }
      let i = index.get(spec);
      if (i === undefined) {
        i = palette.length;
        index.set(spec, i);
        palette.push(spec);
      }
      top.push(i);
      ys.push(y);
    }
  }
  return ok({ v: 1, from: [lo.x, lo.z], size: [sx, sz], palette, top: rle(top), y: rle(ys) });
}

/** @param {import("@minecraft/server").CustomCommandOrigin} origin @param {number | undefined} radius */
export function sense(origin, radius) {
  const p = playerOf(origin);
  if (!p) return fail("No player found");
  const dim = p.dimension;
  const loc = p.location;
  const rot = p.getRotation(); // x = pitch, y = yaw
  /** @type {Record<string, any>} */
  const info = {
    name: p.name,
    pos: [r3(loc.x), r3(loc.y), r3(loc.z)],
    block: [Math.floor(loc.x), Math.floor(loc.y), Math.floor(loc.z)],
    yaw: r2(rot.y),
    pitch: r2(rot.x),
    dim: stripNs(dim.id),
  };
  try {
    info.biome = stripNs(dim.getBiome(loc).id);
  } catch (e) {}
  try {
    const hit = p.getBlockFromViewDirection({ maxDistance: 64 });
    if (hit && hit.block) info.looking = { block: specOf(hit.block), pos: [hit.block.x, hit.block.y, hit.block.z], face: hit.face };
  } catch (e) {}
  try {
    const h = p.getComponent("minecraft:health");
    if (h) {
      info.health = r2(h.currentValue);
      info.maxHealth = r2(h.effectiveMax);
    }
  } catch (e) {}
  try {
    info.gamemode = String(p.getGameMode()).toLowerCase();
  } catch (e) {}
  try {
    info.slot = p.selectedSlotIndex;
    const inv = p.getComponent("minecraft:inventory");
    const it = inv && inv.container ? inv.container.getItem(p.selectedSlotIndex) : undefined;
    info.selected = it ? stripNs(it.typeId) : null;
  } catch (e) {}
  /** @type {{type: string, name: string, pos: number[], dist: number, health?: number}[]} */
  const entities = [];
  const r = radius === undefined ? 16 : radius;
  if (r > 0) {
    try {
      for (const e of dim.getEntities({ location: loc, maxDistance: r })) {
        if (e.id === p.id) continue;
        const el = e.location;
        const d = Math.hypot(el.x - loc.x, el.y - loc.y, el.z - loc.z);
        /** @type {{type: string, name: string, pos: number[], dist: number, health?: number}} */
        const ent = { type: stripNs(e.typeId), name: e.nameTag || "", pos: [r2(el.x), r2(el.y), r2(el.z)], dist: Math.round(d * 10) / 10 };
        try {
          const h = e.getComponent("minecraft:health");
          if (h) ent.health = r2(h.currentValue);
        } catch (err) {}
        entities.push(ent);
      }
    } catch (e) {}
    entities.sort((a, b) => a.dist - b.dist);
  }
  let tod = null;
  let day = null;
  try {
    tod = world.getTimeOfDay();
    day = world.getDay();
  } catch (e) {}
  return ok({ v: 1, player: info, time: { tod, day }, entities: entities.slice(0, 40) });
}

/** @param {import("@minecraft/server").CustomCommandOrigin} origin */
export function inventory(origin) {
  const p = playerOf(origin);
  if (!p) return fail("No player found");
  /** @type {object[]} */
  const slots = [];
  const inv = p.getComponent("minecraft:inventory");
  const c = inv ? inv.container : undefined;
  if (c) {
    for (let i = 0; i < c.size; i++) {
      const it = c.getItem(i);
      if (it) slots.push({ slot: i, item: stripNs(it.typeId), count: it.amount, ...(it.nameTag ? { name: it.nameTag } : {}) });
    }
  }
  /** @type {Record<string, string>} */
  const armor = {};
  try {
    const eq = p.getComponent("minecraft:equippable");
    for (const s of [EquipmentSlot.Head, EquipmentSlot.Chest, EquipmentSlot.Legs, EquipmentSlot.Feet, EquipmentSlot.Offhand]) {
      const it = eq ? eq.getEquipment(s) : undefined;
      if (it) armor[String(s).toLowerCase()] = stripNs(it.typeId);
    }
  } catch (e) {}
  return ok({ v: 1, selected: p.selectedSlotIndex, size: c ? c.size : 0, slots, armor });
}

const LOC = CustomCommandParamType.Location;
const OP = CommandPermissionLevel.GameDirectors;

system.beforeEvents.startup.subscribe(({ customCommandRegistry: reg }) => {
  reg.registerCommand(
    { name: "claude:ping", description: "Claude Link: check that the add-on is active", permissionLevel: OP },
    () => ok({ claudeLink: VERSION, api: API })
  );
  reg.registerCommand(
    {
      name: "claude:scan",
      description: "Claude Link: read every block in a box (for the mc bridge)",
      permissionLevel: OP,
      mandatoryParameters: [
        { name: "from", type: LOC },
        { name: "to", type: LOC },
      ],
    },
    (origin, from, to) => scan(origin, from, to)
  );
  reg.registerCommand(
    {
      name: "claude:heights",
      description: "Claude Link: top block and height of every column in an area",
      permissionLevel: OP,
      mandatoryParameters: [
        { name: "from", type: LOC },
        { name: "to", type: LOC },
      ],
    },
    (origin, from, to) => heights(origin, from, to)
  );
  reg.registerCommand(
    {
      name: "claude:sense",
      description: "Claude Link: where the player is, what they look at, and nearby entities",
      permissionLevel: OP,
      optionalParameters: [{ name: "radius", type: CustomCommandParamType.Integer }],
    },
    (origin, radius) => sense(origin, radius)
  );
  reg.registerCommand(
    { name: "claude:inventory", description: "Claude Link: the player's inventory", permissionLevel: OP },
    (origin) => inventory(origin)
  );
});
