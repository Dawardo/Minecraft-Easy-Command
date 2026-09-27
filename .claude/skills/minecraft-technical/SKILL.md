---
name: minecraft-technical
description: Minecraft Bedrock technical skills - exact command syntax (fill, setblock, clone, execute, tp, give, summon, effect, scoreboard, tag, tellraw/titleraw, structure, tickingarea, camera, dialogue, ...), target selectors, block states, item components, command blocks and .mcfunction files, behavior/resource packs (manifest.json, UUIDs, development_behavior_packs), the Script API (@minecraft/server, custom commands), NPC dialogue, redstone logic, and translating Java Edition commands or tutorials to Bedrock. Use it whenever the user wants a command, a command-block contraption, a function pack, an add-on or script, asks why a command fails, or pastes Java syntax - and before sending any command to a live game, so the syntax is Bedrock-correct the first time.
---

# Minecraft technical skills (Bedrock)

Bedrock commands look like Java commands but aren't. Most failures come from Java habits (NBT,
`limit=`, `distance=`, `[facing=north]`), so check every command against the rules below and the
exact syntax in [references/commands.md](references/commands.md). That file is generated from the
game's own command metadata (Bedrock 1.26.50): every overload of all 84 commands plus the enum values
(gamerules, effects, enchantments, structures, damage causes, HUD elements, ...).

```
grep -n -A 12 '^## /fill' references/commands.md       # all overloads of /fill
grep -A 1 '^### boolgamerule' references/commands.md     # every boolean gamerule name
```

## The rules that matter most

1. **No NBT, anywhere.** No `{CustomName:...}`, `{Enchantments:...}`, `/data`. Instead use:
   - Names: `summon zombie "Bob" ~ ~ ~` (name before the position).
   - Enchantments: `/enchant @p sharpness 5` on the held item.
   - Item behaviour: the components JSON at the end of /give or /replaceitem:
     `give @p diamond_pickaxe 1 0 {"minecraft:can_destroy":{"blocks":["stone","dirt"]},"minecraft:keep_on_death":{}}`
     (also `"minecraft:can_place_on":{"blocks":[...]}` and `"minecraft:item_lock":{"mode":"lock_in_slot"}` or `"lock_in_inventory"`).
   - State that must persist: tags (`/tag`), scoreboards, or a script.
2. **Block states** follow the block id after a space: `setblock ~ ~ ~ oak_stairs ["weirdo_direction"=2,"upside_down_bit"=false]`.
   Strings are quoted, numbers and booleans bare. /setblock and /fill accept a subset (the rest default);
   /testforblock and `execute if block` must list all states or none. Look up state names and values in
   minecraft-knowledge's blocks.md and directions in minecraft-spatial's orientation table. There are no
   aux values since 1.19.70, and colours, woods and stone types are now separate ids: the old
   `setblock ~ ~ ~ wool 14` is `setblock ~ ~ ~ red_wool` (there is no plain `wool` block any more).
3. **Selectors**: `@p @a @r @e @s` plus `@initiator` (the player talking to an NPC). The arguments differ from Java:

   | Want | Bedrock | Java equivalent |
   |---|---|---|
   | nearest 1 / farthest 1 | `c=1` / `c=-1` | `limit=1,sort=nearest` |
   | within 5 blocks / 3 to 5 | `r=5` / `rm=3,r=5` | `distance=..5` / `distance=3..5` |
   | in a box | `x=0,y=60,z=0,dx=10,dy=5,dz=10` | same |
   | gamemode | `m=creative` (or `c`, `1`) | `gamemode=creative` |
   | xp level range | `lm=10,l=20` | `level=10..20` |
   | rotation | `rxm=-10,rx=10` (pitch), `rym`/`ry` (yaw) | `x_rotation`, `y_rotation` |
   | holding / carrying an item | `hasitem={item=diamond,quantity=3..,location=slot.weapon.mainhand}` | predicates or nbt |
   | mob group | `family=monster`, `family=!player` | tags / entity type tags |
   | scores, tags, names, types | `scores={kills=5..}`, `tag=vip`, `name="Bob"`, `type=!cow` | same |

   There's no `nbt=`, `team=`, `predicate=` or `advancements=`. Newer arguments: `haspermission={movement=disabled}`
   (pairs with /inputpermission) and `has_property={...}` for entity properties.
4. **/execute** uses the modern syntax: `as, at, in, positioned [as], rotated [as], facing [entity], align,
   anchored, if|unless block|blocks|entity|score, run`. Example:
   `execute as @a[hasitem={item=clock}] at @s if block ~ ~-1 ~ gold_block run effect @s speed 5 1 true`.
   Bedrock has no `execute store`, `on`, `summon`, `if data`, `if predicate` or `if biome`.
5. **Text** uses the rawtext JSON: `tellraw @a {"rawtext":[{"text":"Score: "},{"score":{"name":"@p","objective":"kills"}}]}`;
   also `{"selector":"@p"}` and `{"translate":"key","with":["a"]}`. The same goes for `titleraw @a actionbar {...}`.
   Plain `/title @a title Hello` takes plain text. Formatting uses `§` codes: `§a` green, `§c` red, `§6` gold,
   `§l` bold, `§o` italic, `§k` obfuscated, `§r` reset. Bedrock adds `§g` (minecoin gold) and the material
   colours `§h §i §j §m §n §p §q §s §t §u §v`, so **`§m` and `§n` are colours, not strikethrough/underline**.
6. **Limits**: /fill up to 32768 blocks (split bigger jobs; minecraft-spatial's mcgeo.py does it for you);
   /structure save up to 64x384x64; at most 10 ticking areas of up to 100 chunks each; commands only
   work in loaded chunks. Cheats must be on, and command blocks need operator status.
7. **Effects**: `effect @p speed 30 1 true` (seconds, amplifier from 0, hide particles), `effect @p speed infinite 1`,
   `effect @p clear` (Java: `effect give/clear`).

Java to Bedrock translations for about 40 common commands: [references/java-to-bedrock.md](references/java-to-bedrock.md).

## Command blocks and functions

- `give @s command_block` (also `repeating_command_block`, `chain_command_block`). Impulse runs once per
  pulse, repeat runs every tick (plus the delay in ticks), and chain runs after the block pointing into it.
  "Always Active" avoids needing redstone. "Conditional" runs only if the previous block succeeded.
- Hide the chat spam: `gamerule commandblockoutput false`, `gamerule sendcommandfeedback false`.
- Functions: a behavior pack's `functions/<path>.mcfunction` holds one command per line (no leading
  `/` needed, `#` starts a comment); run it with `/function path` (subfolders `folder/name`).
  `functions/tick.json` = `{"values": ["loop"]}` runs `loop.mcfunction` every tick. Gamerule
  `functioncommandlimit` caps commands per function (default 10000). `/reload` picks up edits.
- Common patterns: detection clocks (repeat block + `execute ... if block/entity`), scoreboard timers
  (`scoreboard players add @a t 1` + `execute if score`), one-time setup with tags
  (`tag @a[tag=!init] add init`), and fake-player scores (`scoreboard players set #timer t 0`).

## Add-ons, packs and scripts

Pack layout, manifest template, UUID rules, install folders, script modules, custom commands and
NPC dialogue: [references/addons.md](references/addons.md). Two working examples in this repo:
- `web/` + `Start-Dialogue-Maker.bat`: builds NPC dialogue packs (`dialogue/*.json`, format 1.17) and the
  `/dialogue` commands.
- `.claude/skills/minecraft-live/addon/claude_link`: a Script API pack (`@minecraft/server` 2.3.0)
  with custom commands.

## When a command fails

| Message (or bridge status) | Usual cause |
|---|---|
| `Syntax error: Unexpected "X": at "... >>X<<"` / FailedToParseCommand | X is wrong: a Java-only argument, a misspelled id, a missing value, or states without a space |
| `Unknown command: X` | typo, cheats off, or an add-on command whose pack isn't active |
| NotEnoughPermissions | cheats off or not an operator |
| `No targets matched selector` / NoTargetsFound | selector matched nothing (check r=, type=, name=) |
| `Too many blocks in the specified area (N > 32768)` | split the region |
| `Cannot place block(s) outside of the world` | y outside -64..319, or the area isn't loaded |
| `The block couldn't be placed` | it's already that block (harmless) or `keep` mode hit a non-air block |
| no response / timeout (bridge) | the game is paused (Esc menu) or the world closed |

Test a risky command on one block or yourself first. In a live world, run it through
`mc run` (minecraft-live), which shows the game's exact reply for each command.
