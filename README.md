# Bedrock Dialogue Maker

A self-hosted web tool for building branching **Minecraft: Bedrock Edition** NPC dialogue for **one NPC**. It has no tags, no .mcpack, and `@p` is always the player.

## Use it

1. Double-click **`Start-Dialogue-Maker.bat`** (Windows). A small local server starts and your browser opens at `http://localhost:8765/`. It only needs the PowerShell that comes with Windows.
2. **Build**: each scene is one dialogue box with up to 6 buttons. **“+ Button → new scene”** creates a branch in one click, and there's no limit on scenes or branches.
3. **Test play**: click through the conversation in the browser.
4. **Get commands**: download the scene file as a plain folder, drop it into `development_behavior_packs`, then paste two commands into chat.

Your work autosaves in the browser. Use **Project → Save project file** to keep a backup.

## How it works in Bedrock

- The NPC's button commands run at the NPC, so `@e[type=npc,c=1]` (the nearest NPC) is the NPC itself, and `@p` is the player standing at it.
- A branch button runs `/dialogue open @e[type=npc,c=1] @p <scene>`.
- Setup is `/summon npc "Name" ~ ~ ~` followed by `/dialogue change @e[type=npc,c=1] <start scene>`.
- “Remember progress” adds `/dialogue change @e[type=npc,c=1] <scene> @p`, so the NPC starts there next time for that player.
- Bedrock only knows a scene name if it's written in a scene file (`dialogue/*.json`, `"minecraft:npc_dialogue"`, format 1.17). The page builds that file inside a normal behavior pack **folder** (no .mcpack). Put the folder in `com.mojang\development_behavior_packs` and turn it on in the world's Behavior Packs.
- **Password wizard**: dialogue has no text input, so the code is entered with buttons, like a keypad. Each digit is its own scene, and wrong presses follow identical-looking decoy scenes, so players only learn they failed at the end.

Sources: [Microsoft Learn: NPC Dialogue Command](https://learn.microsoft.com/en-us/minecraft/creator/documents/npcdialogue), [microsoft/minecraft-samples npc_dialogue_sample](https://github.com/microsoft/minecraft-samples/tree/main/npc_dialogue_sample).

## If the .bat doesn't start the server

It falls back to opening `web/index.html` directly, and everything still works.

## Tests

`node tests/ui.test.mjs` (needs the `playwright` package and Chromium) drives the real UI. It plays through branches and the password with right and wrong codes, builds a project plus a colour password through the UI, and checks the downloaded folder. Every button must use `@p`, contain no tags, and link to real scenes.
