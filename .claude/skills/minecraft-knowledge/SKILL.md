---
name: minecraft-knowledge
description: Accurate, current Minecraft game knowledge with a Bedrock Edition focus - real block/item/entity/biome/effect/enchantment IDs, block states, crafting/smelting/smithing recipes, ore heights, mob spawning, day/night times, dimensions, farming, villagers, enchanting, and what exists in the latest version (data generated from Mojang's files for Minecraft Bedrock 1.26.50). Use this whenever the user asks how something in Minecraft works, what something is called, how to craft or find it, or whenever you are about to write a block, item or mob name into a command, blueprint or add-on - look the ID up here instead of guessing, because IDs change between versions and editions.
---

# Minecraft knowledge

Two rules matter more than any single fact:

1. **Know the edition.** Bedrock (Windows 10/11 "Minecraft" app, consoles, phones, tablets) and Java
   Edition (the PC launcher's "Java Edition") differ in IDs, commands, redstone, mob behaviour and
   add-ons. This repository is Bedrock. If the user's edition is unclear and it matters, ask.
2. **Look IDs and recipes up instead of recalling them.** Mojang renames and splits blocks often
   (for example `chain` became `iron_chain`, stone slabs gained `minecraft:vertical_half`, doors moved to
   `minecraft:cardinal_direction`), and new content ships every few months. The files below are
   generated from Mojang's own data, so treat them as the source of truth over memory.

## Reference files (grep them - don't read whole)

| File | What's in it | Example |
|---|---|---|
| [references/blocks.md](references/blocks.md) | every block id, English name, all states and values | `grep -i '^cherry_' references/blocks.md` |
| [references/items.md](references/items.md) | every item id (for /give, /clear, hasitem) | `grep -i 'spear' references/items.md` |
| [references/recipes.md](references/recipes.md) | crafting, furnace, smithing, brewing recipes | `grep '^lantern ' references/recipes.md` |
| [references/ids.md](references/ids.md) | entities, biomes, effects, enchantments, dimensions, features, camera presets | `grep -o '[a-z_]*horse[a-z_]*' references/ids.md` |
| [references/mechanics.md](references/mechanics.md) | how the game works: time, heights, ores, spawning, farming, villagers, enchanting, Bedrock-vs-Java differences | read the section you need |

Search by English name too: `grep -i 'jack o' references/blocks.md` finds `lit_pumpkin - Jack o'Lantern`.
Recipes use `#tag` for any-of groups (`#planks` = any planks); rows are `|`-separated and `.` is an empty slot.

These references were generated from **Minecraft Bedrock 1.26.50** (September 2026) by
`tools/gen_minecraft_data.py`. Content newer than your training (for example copper tools and spears,
nautilus armor, poplar leaves) is real if it's in these files. To refresh them after a game update,
rerun that script (its docstring explains how).

## Answering well

- For "how do I make X", grep the recipe and describe the grid in words: which row, which slot.
  Mention the crafting station (`[crafting_table]`, `[furnace]`, `[smithing_table]`, ...).
- For "where do I find X", give the height range, biome or structure (mechanics.md has ore heights
  and structures). Use `/locate structure` or `/locate biome` in game if cheats are on
  (minecraft-technical has the exact syntax).
- For a command, confirm every id in the files, then write it with minecraft-technical's rules.
  Bedrock uses no NBT; block states go in `["name"=value]`.
- When the user is in a live world (minecraft-live), you can check facts directly, for example
  `mc look` to see real blocks, or `mc run "testforblock ..."`.
- Separate facts from guesses. Mechanics differ subtly between editions and versions; say which
  edition an answer applies to, and when unsure, suggest a quick in-game test.
