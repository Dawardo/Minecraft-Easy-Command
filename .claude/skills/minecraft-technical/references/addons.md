# Bedrock add-ons: packs, functions, scripts, NPC dialogue

## Pack layout

```
MyPack_BP/                     behavior pack (logic)
  manifest.json
  pack_icon.png                optional, square PNG
  functions/*.mcfunction       commands; functions/tick.json runs some every tick
  scripts/main.js              Script API entry (needs a "script" module)
  dialogue/*.json              NPC dialogue scenes
  entities/ items/ blocks/ recipes/ loot_tables/ trading/ structures/*.mcstructure
MyPack_RP/                     resource pack (looks and sounds): textures/ models/ sounds/ texts/en_US.lang
```

## manifest.json

```json
{
  "format_version": 2,
  "header": {
    "name": "My Pack",
    "description": "What it does",
    "uuid": "<new uuid>",
    "version": [1, 0, 0],
    "min_engine_version": [1, 21, 100]
  },
  "modules": [
    {"type": "data", "uuid": "<new uuid>", "version": [1, 0, 0]},
    {"type": "script", "language": "javascript", "entry": "scripts/main.js", "uuid": "<new uuid>", "version": [1, 0, 0]}
  ],
  "dependencies": [
    {"module_name": "@minecraft/server", "version": "2.1.0"}
  ]
}
```

- Every pack and every module needs its own UUID (generate them: `python -c "import uuid; print(uuid.uuid4())"`).
  Never copy UUIDs from another pack: two packs with the same UUID conflict.
- Module types: `data` (behavior), `script`, `resources` (resource pack). A behavior pack that needs its
  resource pack lists it in `dependencies` as `{"uuid": "<RP header uuid>", "version": [1, 0, 0]}`.
- `min_engine_version` sets the command/JSON rules the pack runs with. Use the current version unless you
  need old behaviour; functions in packs below 1.19.50 still use the old /execute syntax.

## Installing during development

Copy the pack **folder** (not a zip) into `com.mojang/development_behavior_packs` (or
`development_resource_packs`), then Edit World > Behavior Packs > Available > Activate. On Windows:
- current launcher: `%APPDATA%\Minecraft Bedrock\Users\Shared\games\com.mojang\`
- older installs: `%LOCALAPPDATA%\Packages\Microsoft.MinecraftUWP_8wekyb3d8bbwe\LocalState\games\com.mojang\`

Packs in development folders are read fresh when the world loads, and `/reload` reloads functions and
scripts while it runs. To share a pack, zip its folder and rename the zip to `.mcpack` (several packs:
`.mcaddon`); double-clicking it imports it. A world also records its active packs in
`world_behavior_packs.json` inside the world folder.

## Functions

`functions/castle/gate_open.mcfunction`, run as `/function castle/gate_open`:
```
# comments start with #
fill ~ ~ ~ ~4 ~3 ~ air
playsound random.door_open @a ~ ~ ~
```
`functions/tick.json` = `{"values": ["castle/loop"]}` runs that function every tick. Keep tick functions
cheap: select with `tag=`/`scores=` and use `execute if` to exit early.

## Script API (JavaScript)

Stable modules need no experiments: `@minecraft/server` (world, entities, blocks, events, custom
commands) and `@minecraft/server-ui` (forms). Versions ending in `-beta` need the **Beta APIs**
experiment on the world. Module and game versions: 2.1.0 = Minecraft 1.21.100 (custom commands
stable), 2.3.0 = 1.21.120, 2.5.0 = 1.26.0, 2.10.0 = 1.26.50 (current). A pack declaring a newer module
than the game supports won't load, so pick the lowest version that has what you need.

```js
import { world, system } from "@minecraft/server";

world.afterEvents.playerSpawn.subscribe(({ player, initialSpawn }) => {
  if (initialSpawn) player.sendMessage("§aWelcome, " + player.name);
});

system.afterEvents.scriptEventReceive.subscribe((ev) => {   // triggered by: /scriptevent demo:hello hi
  if (ev.id === "demo:hello") world.sendMessage("script says: " + ev.message);
});

system.runInterval(() => {                                  // every 20 ticks = 1 second
  for (const p of world.getAllPlayers()) {
    if (p.dimension.getBlock(p.location)?.below()?.typeId === "minecraft:gold_block") p.addEffect("speed", 40);
  }
}, 20);
```

Things that bite:
- **Privileges**: before-events and custom-command callbacks run read-only. Change the world there
  inside `system.run(() => ...)`.
- `dimension.getBlock()` returns `undefined` in unloaded chunks and throws outside the world height.
- Chat events (`world.beforeEvents.chatSend`) are beta-only. For player input use custom commands or
  `/scriptevent`.
- Custom commands (stable since 2.1.0) are registered in `system.beforeEvents.startup`. The name needs a
  namespace (`demo:heal`); Minecraft also adds the name without the namespace for typing in chat. Up to
  8 parameters; the callback returns `{ status: CustomCommandStatus.Success, message }`.
  `minecraft-live/addon/claude_link/scripts/main.js` in this repo is a complete, type-checked example.
- Errors appear in the Content Log: Settings > Creator > Enable Content Log GUI.

## NPC dialogue

Scenes live in `dialogue/<file>.json` (`"format_version": "1.17"`, `"minecraft:npc_dialogue": {"scenes": [...]}`),
each with `scene_tag`, `npc_name`, `text`, `buttons` (`name`, `commands`) and optional
`on_open_commands`/`on_close_commands`. Commands:
- `dialogue open <npc> <player> <scene_tag>` shows a scene.
- `dialogue change <npc> <scene_tag> [players]` sets the scene the NPC starts with.
- Inside NPC buttons, `@initiator` is the player talking; run from the NPC, `@e[type=npc,c=1]` is the NPC itself.

This repository's web app (`Start-Dialogue-Maker.bat`, `web/`) builds branching dialogue, code-lock
puzzles and the pack folder without writing JSON by hand.
