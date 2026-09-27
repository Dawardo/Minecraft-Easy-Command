---
name: minecraft-spatial
description: Spatial reasoning for Minecraft worlds (Bedrock first, Java too) - the axes and which way is north, yaw/pitch, ~ and ^ positions, "in front of / behind / left of the player", chunk and volume math, which way stairs/doors/torches/trapdoors/pistons face (verified block-state tables), rotating and mirroring builds, reading the ASCII maps from `mc look`/`mc scan`, and designing blueprints or shapes that compile to minimal /fill commands (scripts/mcgeo.py). Use it for ANY Minecraft task that involves positions, directions, distances, placing or building anything, planning a structure, turning a design into commands, or interpreting a map of the world - even when the user never says "coordinates".
---

# Minecraft spatial awareness

Most Minecraft mistakes are spatial: north and south swapped, stairs facing the wrong way, an
off-by-one wall, a build that ends up behind the player. Work from the fixed frame below, let the
tools do rotations, and check results against the world instead of trusting mental images.

## The frame

- **+X = east, -X = west, +Z = south, -Z = north, +Y = up.** On every top-down map (and in `mc look`),
  north is at the top and east to the right, so **z grows downward on the page**.
- A block coordinate is the floor of a position. A player at x=10.7, z=-3.2 is in block (10, ?, -4).
  Feet y=64.0 means the player stands in the air block 64, on top of block 63.
- **Yaw** (Bedrock and Java): 0 = facing south, 90 = west, 180/-180 = north, -90 (=270) = east.
  **Pitch**: -90 straight up, 0 level, +90 straight down. Clockwise seen from above:
  north -> east -> south -> west.

| Facing | Forward | Right | Left | Behind |
|---|---|---|---|---|
| north | -Z | east (+X) | west (-X) | +Z |
| east | +X | south (+Z) | north (-Z) | -X |
| south | +Z | west (-X) | east (+X) | -Z |
| west | -X | north (-Z) | south (+Z) | +X |

Heights (Bedrock 1.18+ and Java 1.18+): overworld y -64..319, ocean surface water at y=62, nether 0..127
(lava sea at 31, bedrock roof around 123-127), end 0..255. Nether distances are 1:8 of the overworld in x/z.

## Relative (~) and local (^) positions

- `~dx ~dy ~dz` offsets along world axes from where the command runs. Commands sent through the
  `mc` bridge run as the player, so `~ ~ ~` is the player's feet.
- `^left ^up ^forward` offsets along the executor's view. `^ ^ ^3` is 3 blocks ahead; **`^1 ^ ^` is
  LEFT, not right** (use `^-1 ^ ^` for right). `^` uses the full pitch, so looking down tilts "forward"
  into the ground; use `execute rotated ~ 0 run ...` to level it. Never mix `~` and `^` in one position.
- Integer coordinates given to /tp and /summon are centred (10 -> 10.5); block commands floor.

Worked example: player at block (10, 64, -5) facing east. Three ahead = (13, 64, -5). Two to the
right = (10, 64, -3). A 5-wide wall 4 blocks ahead, centred, 3 tall:
`fill 14 64 -7 14 66 -3 stone_bricks` (x fixed, z from -7 to -3 = 5 blocks, y 64..66 = 3 blocks).

## Volumes, chunks and limits

- Box sizes are inclusive: (|x2-x1|+1)(|y2-y1|+1)(|z2-z1|+1). A wall from x=0 to x=4 is 5 blocks.
- /fill max 32768 blocks per command; /structure save max 64 x 384 x 64. `mcgeo.py` and `mc build`
  split big jobs automatically.
- Chunk = 16x16 columns: chunk x = floor(x/16). Commands only touch loaded chunks (roughly the
  player's simulation distance). For far work, `tickingarea add` first or teleport there.
- Selector distances: `r=`/`rm=` are spherical from the execution point; `x y z dx dy dz` select a box.

## Which way blocks face

Bedrock block-state direction numbers are **not** consistent between blocks. These are verified
against Java<->Bedrock mappings (full table: [references/orientation.md](references/orientation.md)):

| Blocks | State | north | east | south | west |
|---|---|---|---|---|---|
| stairs | weirdo_direction (climbs toward) | 3 | 0 | 2 | 1 |
| trapdoors | direction | 3 | 0 | 2 | 1 |
| beds, looms, beehives, cocoa, tripwire hooks, grindstones | direction | 2 | 3 | 0 | 1 |
| bells, decorated pots | direction | 0 | 1 | 2 | 3 |
| ladders, wall signs/banners, buttons, hoppers, barrels, dispensers | facing_direction | 2 | 5 | 3 | 4 |
| **pistons, end rods** (inverted!) | facing_direction | 3 | 4 | 2 | 5 |
| chests, furnaces, pumpkins, repeaters, comparators, fence gates, lecterns | minecraft:cardinal_direction | "north" | "east" | "south" | "west" |
| **doors** (Java facing turned 90 degrees) | minecraft:cardinal_direction | "east" | "south" | "west" | "north" |
| torches (names the wall they hang on) | torch_facing_direction | "south" | "west" | "north" | "east" |

The column heading is the block's Java Edition `facing`, so Java knowledge applies directly: under
"north", stairs climb toward the north, a furnace or pumpkin front faces north, a piston pushes north,
a ladder or wall sign faces north (it is fixed to the block south of it), a torch leans north (it
hangs on the block south of it), and a door is one you walk through going north.
Up/down: facing_direction 1 = up, 0 = down. Standing signs/banners use ground_sign_direction 0-15
(0 south, 4 west, 8 north, 12 east). Logs use pillar_axis x/y/z. For a visual check, place one test
block, then compare with `mc look` or ask the user how it looks.

## Rotating and mirroring

Never rotate a build by hand-editing states. `scripts/mcgeo.py` (and `mc build`) rotate positions
**and** every block's direction states using a generated per-block table
(`scripts/block_rotation.json`), so stairs, doors, levers and rails stay correct.
Clockwise quarter turn: position (x, z) -> (-z, x), then shift back to non-negative coordinates.

## Blueprints and shapes (offline, no game needed)

A blueprint is text layers drawn like the map, bottom layer first. The **front is the south side
(the last row)**, so put doors there; `mc build --here` turns the front toward the player.

```
name: tower
legend:
  S = stone_bricks
  D = wooden_door["minecraft:cardinal_direction"="east"]
  . = air            (a space means: leave that block alone)
layer 0-3:           (the same rows on y=0..3)
SSSSS
S...S
S...S
SSDSS
layer 4:
SSSSS
...
```

Doors drawn in two layers become proper lower+upper halves automatically. Full format, JSON boxes and
shapes, design patterns (roofs, windows, lighting): [references/blueprints.md](references/blueprints.md).
Example: [assets/cottage.txt](assets/cottage.txt).

```
python scripts/mcgeo.py show house.txt --rotate 90   # print the layers; each block variant gets its own symbol
python scripts/mcgeo.py info house.txt               # size and block counts
python scripts/mcgeo.py compile house.txt --at 100 64 -20 -o house.mcfunction   # minimal /fill + /setblock list
python scripts/mcgeo.py shape sphere --radius 6 --block glass --hollow --at 0 80 0
```

Shapes: box, sphere, dome, cylinder, circle, cone, pyramid, line, wall, torus. `compile` merges blocks
into the fewest boxes (a 7x7x5 cottage is about 43 commands) and orders them: clearing first, then
solids bottom-up, gravity blocks, attached blocks (torches, doors), and liquids last.

## Reading maps from `mc look` and `mc scan`

- The **surface map** shows the top block of each column in the scanned height window. Row labels
  are z, column labels are x (every 5th), `@` is the player. A blank cell means nothing solid in the
  window (a drop or open air).
- The **elevation map** is the same grid with heights relative to the block the player stands on:
  `+2` is two blocks higher (a step or wall), `-3` a hole, `++`/`--` means 10 or more.
- **Slices** (`--layers`) show every y level: walls, doors and rooms become visible.
- The legend maps each symbol to a block id. Read coordinates off the labels rather than counting cells.

## Before building, check

1. Where is the player and which way do they face? (`mc where`)
2. Is the ground flat? (`mc look` elevation map). Use `--sink 1` to replace the top layer, or pick
   another spot.
3. Is anything in the way (trees, water, the user's buildings)? Don't overwrite builds unasked.
4. Do the direction states match the table above, and does `mcgeo.py show` look right?
5. After building, `--verify`, then look again.
