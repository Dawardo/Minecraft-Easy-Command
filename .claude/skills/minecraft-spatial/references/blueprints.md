# Blueprints: format and building patterns

`scripts/mcgeo.py` reads three blueprint forms. Local axes match the world: x east, y up, z south.
Local (0,0,0) is the north-west bottom corner. The **front is the south side** (the last row of each
layer). `mc build --here` rotates the build so the front faces the player.

## 1. Text layers (.txt) - best for hand-designed buildings

```
name: watchtower            (optional)
legend:
  C = cobblestone
  L = spruce_log["pillar_axis"="y"]
  P = spruce_planks
  F = spruce_fence
  T = torch["torch_facing_direction"="top"]
  D = spruce_door["minecraft:cardinal_direction"="east"]
  . = air                   (clears the block; a SPACE means "leave it alone")
layer 0:                    (y = 0, bottom)
CCCCC
CCCCC
CCCCC
CCCCC
CCCCC
layer 1-4:                  (the same rows repeated on y = 1, 2, 3, 4)
LPPPL
P...P
P...P
P...P
LPDPL
```

- Every row is one z (north first), every character one x (west first). Rows can differ in length.
- `layer A-B:` repeats rows over a range. Comments start with `#` on their own line.
- Block specs are `id` or `id["state"=value,...]` exactly as in commands (see orientation.md).
- A door drawn in two layers becomes a lower + upper half automatically; a door drawn once gets its
  upper half added. The same happens for tall plants.

## 2. JSON (.json) - for generated or geometric builds

```json
{
  "name": "plaza",
  "boxes":  [{"from": [0,0,0], "to": [20,0,20], "block": "smooth_stone"},
             {"from": [0,1,0], "to": [20,4,20], "block": "stone_bricks", "walls": true}],
  "shapes": [{"type": "cylinder", "center": [10,1,10], "radius": 3, "height": 6, "block": "quartz_block", "hollow": true},
             {"type": "dome", "center": [10,7,10], "radius": 4, "block": "glass", "hollow": true}],
  "blocks": [{"at": [10,1,20], "block": "oak_door[\"minecraft:cardinal_direction\"=\"east\"]"}],
  "legend": {"S": "stone"}, "layers": [["SSS", "S.S", "SSS"]]
}
```

Applied in order: layers, boxes, shapes, blocks (later ones overwrite earlier ones). Box options:
`hollow` (all six faces), `walls` (four sides, no floor/ceiling). Shapes and their parameters:
`box(a, b, hollow, walls)`, `sphere(center, radius, hollow, half="top"|"bottom")`, `dome(center, radius, hollow)`,
`cylinder(center, radius, height, hollow)` (center = middle of the bottom layer), `circle(center, radius, filled)`,
`cone(center, radius, height, hollow)`, `pyramid(center, half_width, hollow)`, `line(a, b)`,
`wall(a, b, height)` (vertical wall along a line), `torus(center, radius, tube)`.

## 3. A saved scan - copy and paste real structures

`mc scan X1 Y1 Z1 X2 Y2 Z2 --out house.json` saves blocks with all their states. `mc build house.json
--at X Y Z` rebuilds it (air included, so it replaces what is there), and `--rotate 90` turns it with
every direction state corrected. `mcgeo.py show house.json` prints it.

## Commands

```
python mcgeo.py show B [--rotate 90|180|270] [--mirror x|z]   layers with one symbol per block variant
python mcgeo.py info B                                          size and counts
python mcgeo.py compile B --at X Y Z [--rotate R] [-o out.mcfunction]
python mcgeo.py shape KIND --block ID --at X Y Z [--to X Y Z] [--radius R] [--height H] [--hollow] [-o file]
```

The compiler merges each block type into the fewest boxes (greedy meshing, each /fill at most 32768
blocks) and orders commands: air first, solid blocks bottom-up, gravity blocks (sand, gravel, concrete
powder, anvils), attached or fragile blocks (torches, doors, ladders, plants, rails, redstone), liquids last.

## Building patterns

- **Size a room from the inside**: a 5x5 interior needs a 7x7 footprint. Ceilings 3 blocks high
  (floor + 3 air + roof) feel right; 2-high interiors feel cramped.
- **Walls**: a `walls: true` box, or layers with the outline. Logs on the corners, planks or bricks
  between, and windows as glass panes in the middle rows (y+2 of a 3-high wall) read well.
- **Gable roof along x** (ridge running east-west), footprint z = 0..4: the north eave row uses stairs
  climbing south (`weirdo_direction=2`), the south eave row climbs north (`3`). Go up one layer and one
  row inward per step, and cap the ridge with a slab. For a ridge along z use stairs climbing east (0)
  and west (1). Add upside-down stairs (`"upside_down_bit"=true`) under the eaves as trim.
- **Flat roof**: slabs or a full layer, then fences or walls around the edge.
- **Lighting**: in 1.18+ hostile mobs only spawn at block light 0, so any torch light stops them. For a
  spawn-proof interior, a torch or lantern every 6-8 blocks is plenty.
- **Doors** need two air blocks above the floor on both sides, or the path is blocked.
- **Farms**: one water block hydrates farmland 4 blocks away, so a 9x9 plot with water in the centre
  works. Crops need light, so put torches along the edges.
- **Paths**: `grass_path` (shovel path) or gravel sunk one block (`--sink 1`) so they sit flush.
- **Terrain**: check the `mc look` elevation map. On slopes, build a foundation down to the lowest
  ground (a filled box below layer 0) instead of leaving floating corners.

## Checklist before sending a big build

1. `mcgeo.py show` the rotated blueprint: are doors in the front wall, do stairs climb the right way?
2. `mc build ... --dry-run` shows the world box and command count. Is the box where the user wants it?
3. Build with `--verify`; `mc undo` if the user doesn't like it.
