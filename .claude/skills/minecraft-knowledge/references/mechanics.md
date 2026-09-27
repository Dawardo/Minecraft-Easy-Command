# How Minecraft works - compact facts (Bedrock first)

Facts below hold for current Bedrock and Java unless marked. For exact IDs use the other reference
files; for command syntax use minecraft-technical.

## Contents
Time and weather - Dimensions and heights - Ores - Mobs and spawning - Building golems and bosses -
Animals and breeding - Villagers - Farming - Enchanting and anvils - Brewing - Redstone (Bedrock) -
Bedrock vs Java differences

## Time and weather
- 20 game ticks per second; a redstone tick is 2 game ticks (0.1 s). A full day is 24000 ticks = 20 minutes.
- `/time set` values: sunrise 23000/0, day 1000, noon 6000, sunset 12000, night 13000, midnight 18000.
  Beds work at night (from about 12542) or in thunderstorms and skip to morning.
- Weather: clear, rain (snow in cold biomes/heights), thunder. Lightning can turn creepers charged,
  pigs into zombified piglins, villagers into witches.
- Phantoms come for players who haven't slept in 3+ in-game days.

## Dimensions and heights
- Overworld y -64..319. Bedrock floor between -64 and -60; deepslate replaces stone below about y=0.
  Ocean surface water at y=62.
- Nether y 0..127: lava ocean at y=31, bedrock floor and roof. 1 block in the Nether = 8 in the
  Overworld (x and z), which is how portals link.
- Nether portal: obsidian frame, inside at least 2 wide x 3 tall (up to 21x21), lit with flint and steel.
- The End: reached through a stronghold end portal (12 eyes of ender). The exit portal is at x=0 z=0;
  end gateways lead to the outer islands (end cities, elytra).
- Bedrock has no always-loaded spawn chunks; ticking areas (`/tickingarea`) keep chosen areas running.

## Ores (1.18+ world generation, both editions)
| Ore | Generates at y | Most common |
|---|---|---|
| coal | 0 to 320 | around 96 and in mountains |
| copper | -16 to 112 | around 48; extra in dripstone caves |
| iron | -64 to 320 | around 16, and high in mountains (~232) |
| lapis lazuli | -64 to 64 | around 0 |
| gold | -64 to 32 (badlands: up to 256) | around -16 |
| redstone | -64 to 16 | the bottom (-59) |
| diamond | -64 to 16 | the bottom (-59); fewer where exposed to air |
| emerald | mountain biomes, -16 to 320 | higher up |
| nether quartz, nether gold | Nether 10 to 117 | spread out |
| ancient debris | Nether 8 to 119 | around 15 (mine with beds or TNT) |

Deepslate variants (`deepslate_diamond_ore`, ...) replace the normal ore below about y=0.

## Mobs and spawning
- Hostile mobs spawn on solid blocks where block light is 0 (current versions), so any torch light
  stops them. They also need enough space (2 blocks tall for zombies/skeletons, 3 for endermen).
- Bedrock spawns mobs 24-44 blocks (horizontally) from a player, within the simulation distance.
  Java spawns 24-128 blocks away.
- Slimes: swamps at night (more at full moon) and underground in slime chunks below y=40.
- Creepers explode (charged ones drop mob heads), skeletons shoot, endermen anger when looked at,
  zombies burn in daylight, drowned spawn in water, witches throw potions, pillagers patrol, raids
  start when a player with Bad Omen (Raid Omen in current versions) enters a village.
- Neutral: wolves, bees, iron golems, piglins (wear gold), endermen, llamas, polar bears, pandas (some).

## Building golems and bosses
- Iron golem: 4 iron blocks in a T, carved pumpkin on top (the T's arms must be clear below).
- Snow golem: 2 snow blocks stacked, carved pumpkin on top.
- Wither: 4 soul sand/soul soil in a T, 3 wither skeleton skulls on top (place the last skull last).
- Copper golem (current versions): copper block with a carved pumpkin on top.
- Ender dragon: in the End; respawn with 4 end crystals on the exit portal edges.

## Animals and breeding
cows, sheep, goats, mooshrooms: wheat - pigs: carrots, potatoes, beetroot - chickens: seeds -
horses/donkeys: golden carrots or golden apples (tame by riding) - wolves: tame with bones, breed with
meat - cats/ocelots: raw cod or salmon - rabbits: dandelions, carrots - bees: flowers - llamas: hay
bales - turtles: seagrass - foxes: sweet or glow berries - pandas: bamboo - axolotls: bucket of
tropical fish - frogs: slimeballs - camels: cactus - sniffers: torchflower seeds - armadillos: spider
eyes - strider: warped fungus.

## Villagers
A villager takes the profession of an unclaimed job-site block it can reach:
armorer - blast furnace, butcher - smoker, cartographer - cartography table, cleric - brewing stand,
farmer - composter, fisherman - barrel, fletcher - fletching table, leatherworker - cauldron,
librarian - lectern, mason - stonecutter, shepherd - loom, toolsmith - smithing table,
weaponsmith - grindstone. Nitwits never work. Villagers breed when they have beds and food; a zombie
villager is cured with a splash potion of weakness plus a golden apple (cheaper trades afterwards).
In Bedrock the entity ids are `villager_v2` and `zombie_villager_v2`.

## Farming
- Hoe dirt or grass into farmland. Water hydrates farmland within 4 blocks horizontally (a 9x9 plot
  around one water block). Crops need light 9+ to grow; bone meal speeds them up.
- wheat, carrots, potatoes, beetroot on farmland. Melon and pumpkin stems need a free neighbouring block
  for the fruit. Sugar cane on sand/dirt/grass next to water. Cactus on sand with no blocks beside it.
  Cocoa on jungle logs. Nether wart on soul sand. Sweet berries on grass/dirt. Kelp and sea pickles in water.

## Enchanting and anvils
- Enchanting table with 15 bookshelves one block away (air gap, same level or one up) unlocks level 30.
  Costs lapis lazuli and levels.
- Common maxima: sharpness V, smite V, bane of arthropods V, efficiency V, unbreaking III, fortune III,
  looting III, protection IV, feather falling IV, power V, respiration III, depth strider III,
  silk touch I, mending I, infinity I, frost walker II, soul speed III, swift sneak III.
- Exclusive groups: sharpness/smite/bane; the four protections; fortune/silk touch; mending/infinity;
  depth strider/frost walker; loyalty/riptide; multishot/piercing; channeling/riptide.
- Mending (from librarian trades, fishing, loot) repairs with experience orbs.
- All enchantment ids (42 in 1.26.50, including wind_burst, density, breach, lunge): ids.md.

## Brewing
Brewing stand fuelled by blaze powder. Water bottle + nether wart = awkward potion, then add:
sugar (swiftness), glistering melon slice (healing), spider eye (poison), magma cream (fire
resistance), golden carrot (night vision), rabbit's foot (leaping), blaze powder (strength), ghast
tear (regeneration), pufferfish (water breathing), phantom membrane (slow falling), turtle shell
(turtle master), breeze rod (wind charging), slime block (oozing), cobweb (weaving), stone
(infestation). Modifiers: redstone makes it longer, glowstone stronger, fermented spider eye corrupts
it (e.g. swiftness -> slowness, healing -> harming), gunpowder makes a splash potion, dragon's breath a
lingering one. Exact recipes: `grep 'brew:' recipes.md`.

## Redstone (Bedrock specifics)
- No quasi-connectivity: pistons, dispensers and droppers are powered only like other components
  (not from the block above them).
- Pistons can move most block entities (chests, furnaces, hoppers...), unlike Java.
- Timing and update order differ from Java, so many Java tutorials (0-tick farms, some flying
  machines, update-suppression tricks) fail on Bedrock. Search for Bedrock versions of designs.
- Repeater delay 1-4 redstone ticks (`repeater_delay` 0-3); comparators compare or subtract; observers
  pulse on block updates; hoppers move items at about 2.5 per second; a redstone signal travels 15 blocks.

## Bedrock vs Java - differences that change answers
- Default random tick speed: Bedrock 1, Java 3 (crops and saplings grow at comparable speeds anyway).
- Commands: no NBT, different selector arguments, block states instead of Java properties
  (minecraft-technical has the translation table).
- Content packs: Bedrock uses add-ons (behavior and resource packs, the Script API); Java uses data
  packs and mods.
- Some IDs differ: `villager_v2`, `lit_pumpkin` (jack o'lantern), `grass_path` (dirt path), `web` for cobweb,
  `slime` for slime block, `trapdoor` for oak trapdoor, `wooden_door` for oak door, `standing_sign` for oak
  sign. Always check blocks.md and items.md.
- World saves: Bedrock uses LevelDB (`db` folder), Java uses region files.
