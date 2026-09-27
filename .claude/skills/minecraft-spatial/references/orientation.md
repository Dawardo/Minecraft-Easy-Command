# Block orientation reference (Bedrock 1.26)

Every mapping here was checked against the Java->Bedrock block-state tables of PrismarineJS
minecraft-data (bedrock 1.26.30), the same tables Java<->Bedrock proxies rely on. Column headings are the
**Java Edition `facing`** of the block, which has one clear meaning per block (see below).
`scripts/block_rotation.json` holds the complete per-block rotate/mirror tables used by mcgeo.py.

## Horizontal direction states

| Blocks | Bedrock state | Java facing north | east | south | west |
|---|---|---|---|---|---|
| all stairs | `weirdo_direction` | 3 | 0 | 2 | 1 |
| all trapdoors | `direction` | 3 | 0 | 2 | 1 |
| bed, loom, beehive, bee_nest, cocoa, tripwire_hook, grindstone, chiseled_bookshelf | `direction` | 2 | 3 | 0 | 1 |
| bell, decorated_pot | `direction` | 0 | 1 | 2 | 3 |
| chest, trapped_chest, ender_chest, copper chests, furnace, blast_furnace, smoker, carved_pumpkin, lit_pumpkin, anvil, lectern, stonecutter_block, campfire, end_portal_frame, big_dripleaf, fence gates, repeaters, comparators | `minecraft:cardinal_direction` | "north" | "east" | "south" | "west" |
| **all doors** | `minecraft:cardinal_direction` | "east" | "south" | "west" | "north" |

Doors are the trap: Bedrock's door value is Java's facing turned a quarter turn clockwise. A front door
in a south wall that you walk through going north (placed by a player standing outside, facing north)
is `wooden_door["minecraft:cardinal_direction"="east"]`.

## Six-way states (can also point up/down)

| Blocks | Bedrock state | north | east | south | west | up | down |
|---|---|---|---|---|---|---|---|
| ladder, wall_sign / *_wall_sign, wall_banner, wall skulls, buttons on walls, hopper, barrel, dispenser, dropper, lightning_rod | `facing_direction` | 2 | 5 | 3 | 4 | 1 | 0 |
| **piston, sticky_piston, end_rod** | `facing_direction` | 3 | 4 | 2 | 5 | 1 | 0 |
| observer | `minecraft:facing_direction` | "north" | "east" | "south" | "west" | "up" | "down" |
| amethyst clusters and buds | `minecraft:block_face` | "north" | "east" | "south" | "west" | "up" | "down" |

Buttons: on the floor `facing_direction=1`, on the ceiling `0`. A hopper's facing is where it outputs
(it can't point up). Skulls on the floor are `facing_direction=1`; their rotation is block-entity data.
The observer's face (the one that watches) points the way it faces; its output is on the back.

## Torches

`torch_facing_direction` names the side of the block the torch is mounted on - the opposite of the way
it leans:

| Java wall_torch facing (leans toward) | north | east | south | west | (on the floor) |
|---|---|---|---|---|---|
| Bedrock torch_facing_direction | "south" | "west" | "north" | "east" | "top" |

The same state is used by soul_torch, redstone_torch, copper_torch and the colored torches.

## Other direction encodings

- **Standing signs and banners**: `ground_sign_direction` 0-15 = Java `rotation`: 0 faces south, 4 west,
  8 north, 12 east; each step is 22.5 degrees clockwise.
- **Hanging signs**: `facing_direction` (wall-attached, as the table above), `ground_sign_direction`
  (free hanging), `attached_bit`, `hanging`.
- **Logs, wood, stems, pillars, basalt, bone/hay blocks, iron_chain**: `pillar_axis` "y" (upright),
  "x" (lying east-west), "z" (lying north-south).
- **Rails** `rail_direction`: 0 north-south, 1 east-west, 2 ascending east, 3 ascending west,
  4 ascending north, 5 ascending south, 6 curve south-east, 7 south-west, 8 north-west, 9 north-east
  (powered/detector/activator rails only use 0-5).
- **Vines** `vine_direction_bits` (sum of the walls it covers): 1 south, 2 west, 4 north, 8 east.
- **Glow lichen / sculk vein** `multi_face_direction_bits`: a bitmask of faces.
- **Levers** `lever_direction`: on a wall "north"/"east"/"south"/"west" (= Java facing); on the floor
  "up_north_south"/"up_east_west"; on the ceiling "down_north_south"/"down_east_west". On floor and
  ceiling levers `open_bit` also takes part in the direction, which is why rotation uses a joint table.
- **Crafter** `orientation`: Java-style "north_up", "down_east", ...
- **Walls** `wall_connection_type_north|east|south|west` = "none"/"short"/"tall", plus `wall_post_bit`.
  Glass panes and iron bars (1.26.50+) have `minecraft:connection_*` booleans. The game usually fixes
  connections itself when a neighbour changes.

## Two-block and stacked blocks

- **Doors**: `upper_block_bit` false = lower half, true = upper half; both halves share
  `minecraft:cardinal_direction` and `door_hinge_bit`; `open_bit` opens it. Place both halves.
  mcgeo.py completes and fixes door halves automatically.
- **Beds**: `head_piece_bit` true = the pillow half. The head is in the bed's facing direction from the
  foot (Java semantics). Place both halves with the same `direction`.
- **Slabs**: `minecraft:vertical_half` "bottom" or "top"; a full double slab is a separate id
  (e.g. oak_double_slab).
- **Stairs**: `upside_down_bit` true = hanging from the top half; `minecraft:corner` (1.26.50+) for
  corner shapes (the game recalculates corners when neighbours update).
- **Tall plants** (tall_grass, large_fern, sunflower, lilac, rose_bush, peony, pitcher_plant, small_dripleaf_block):
  `upper_block_bit` like doors; mcgeo.py completes their upper halves too.

## If a block is not listed

1. grep the state names: `grep '^<block> ' ../minecraft-knowledge/references/blocks.md`.
2. Look for it in `scripts/block_rotation.json` (`"cw"` shows how each value turns).
3. If still unsure, place one in game next to the player and compare with how it looks (or ask the user),
   then use that value.
