# Java -> Bedrock command translation

Use this when a user pastes Java syntax or follows a Java tutorial. Check the result against
commands.md (exact Bedrock overloads) and the block/item ids in minecraft-knowledge.

## Selectors

| Java | Bedrock |
|---|---|
| `@e[type=zombie,limit=1,sort=nearest]` | `@e[type=zombie,c=1]` |
| `@e[sort=furthest,limit=1]` | `@e[c=-1]` |
| `@e[distance=..5]` | `@e[r=5]` |
| `@e[distance=3..5]` | `@e[rm=3,r=5]` |
| `@a[gamemode=survival]` | `@a[m=survival]` (or `m=s`, `m=0`) |
| `@a[level=10..]` | `@a[lm=10]` |
| `@e[x_rotation=-10..10]` | `@e[rxm=-10,rx=10]` |
| `@e[nbt={...}]`, `team=`, `predicate=`, `advancements=` | not available: use `tag=`, `scores=`, `hasitem=`, `family=`, `has_property=` |
| `@n` (nearest entity) | `@e[c=1]` |

## Commands

| Java | Bedrock |
|---|---|
| `setblock ~ ~ ~ oak_stairs[facing=north,half=top]` | `setblock ~ ~ ~ oak_stairs ["weirdo_direction"=3,"upside_down_bit"=true]` |
| `setblock ~ ~ ~ chest[facing=east]{Items:[...]}` | `setblock ~ ~ ~ chest ["minecraft:cardinal_direction"="east"]`, then `replaceitem block ~ ~ ~ slot.container 0 diamond 5` |
| `fill ~ ~ ~ ~5 ~5 ~5 stone replace dirt` | same |
| `fill ... minecraft:air destroy` | same (`destroy`, `keep`, `hollow`, `outline`, `replace`) |
| `clone ... masked move` | same |
| `give @p diamond_sword{Enchantments:[{id:sharpness,lvl:5}]}` | `give @p diamond_sword` then `enchant @p sharpness 5` |
| `give @p stone{CanPlaceOn:["dirt"]}` | `give @p stone 1 0 {"minecraft:can_place_on":{"blocks":["dirt"]}}` |
| `give @p diamond_pickaxe{Unbreakable:1}` | no equivalent (use `/enchant ... unbreaking 3` + `mending 1`) |
| `summon zombie ~ ~ ~ {CustomName:'"Bob"'}` | `summon zombie "Bob" ~ ~ ~` |
| `summon villager ~ ~ ~ {NoAI:1}` | not available; use an NPC (`summon npc`) or `/inputpermission` for players |
| `effect give @p speed 30 1 true` | `effect @p speed 30 1 true` |
| `effect give @p speed infinite` | `effect @p speed infinite` |
| `effect clear @p` | `effect @p clear` |
| `tellraw @a {"text":"Hi","color":"gold"}` | `tellraw @a {"rawtext":[{"text":"§6Hi"}]}` |
| `tellraw @a [{"selector":"@p"},{"text":" won"}]` | `tellraw @a {"rawtext":[{"selector":"@p"},{"text":" won"}]}` |
| `title @a title {"text":"Go!"}` | `title @a title Go!` or `titleraw @a title {"rawtext":[{"text":"Go!"}]}` |
| `title @a actionbar ...` | `title @a actionbar ...` (same) |
| `tp @s ~ ~ ~ facing ~ ~ ~5` | same |
| `teleport @s 0 64 0 90 0` | same |
| `execute as @a at @s run ...` | same |
| `execute if block ~ ~-1 ~ minecraft:grass_block run ...` | same (states in Bedrock syntax if needed) |
| `execute if entity @e[type=cow,distance=..5]` | `execute if entity @e[type=cow,r=5]` |
| `execute store result score ...` | not available: count with `execute as ... run scoreboard players add` or use a script |
| `execute on passengers ...`, `execute summon ...` | not available |
| `execute if data ...`, `if predicate`, `if biome` | not available |
| `scoreboard objectives add k minecraft.custom:minecraft.jump` | only `dummy` exists: `scoreboard objectives add k dummy` (count with commands or scripts) |
| `scoreboard players operation ...` | same |
| `tag @s add x` | same |
| `data merge entity ...`, `data get ...` | not available (use tags, scores, /replaceitem, scripts) |
| `item replace entity @s weapon.mainhand with diamond_sword` | `replaceitem entity @s slot.weapon.mainhand 0 diamond_sword` |
| `forceload add ~ ~` | `tickingarea add circle ~ ~ ~ 2 myarea` |
| `schedule function ns:f 5s` | `schedule delay add f 5s` (Bedrock functions have no namespace) |
| `function ns:path/name` | `function path/name` |
| `gamerule doDaylightCycle false` | `gamerule dodaylightcycle false` (case-insensitive in Bedrock) |
| `difficulty hard` | same |
| `gamemode creative @p` | same (also `c`, `1`) |
| `weather clear 1000`, `time set day` | same |
| `locate structure minecraft:village_plains` | `locate structure minecraft:village` (Bedrock structure ids: see commands.md enums) |
| `locate biome minecraft:cherry_grove` | `locate biome minecraft:cherry_grove` (Bedrock biome ids differ: nether wastes is `minecraft:hell`) |
| `playsound minecraft:entity.experience_orb.pickup master @p` | `playsound random.orb @p` (Bedrock sound names differ) |
| `particle minecraft:flame ~ ~ ~` | `particle minecraft:basic_flame_particle ~ ~ ~` (Bedrock particle ids differ) |
| `attribute`, `bossbar`, `team`, `trigger`, `worldborder`, `spectate`, `advancement`, `datapack`, `item modify` | not available in Bedrock |
| `ride @s mount @e[type=horse,c=1]` | `ride @s start_riding @e[type=horse,c=1]` |
| `damage @p 5 minecraft:magic` | `damage @p 5 magic` |

Bedrock-only commands with no Java twin: `/dialogue` (NPC dialogue), `/camera`, `/hud`, `/inputpermission`,
`/playanimation`, `/structure` (Java uses structure blocks and `/place template`), `/tickingarea`,
`/mobevent`, `/scriptevent`, `/camerashake`, `/music`, `/fog`, `/aimassist`, `/controlscheme`.
