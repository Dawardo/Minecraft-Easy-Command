# Minecraft Easy Command

Two things live here: **Claude skills for Minecraft Bedrock** (Claude can understand your world and act in
your running game), and the **Bedrock Dialogue Maker** web tool (further down).

## Claude skills for Minecraft

Open [Claude Code](https://claude.com/claude-code) in this folder and the four skills in `.claude/skills/`
load automatically:

| Skill | What Claude gets |
|---|---|
| `minecraft-knowledge` | real, current IDs and data generated from Mojang's files (Bedrock 1.26.50): 1463 blocks with states, 1623 items, 1890 recipes, entities, biomes, effects, plus how the game works |
| `minecraft-spatial` | coordinates, directions, yaw, `~`/`^`, verified block-orientation tables (stairs, doors, trapdoors, torches...), blueprints and shapes compiled to minimal `/fill` commands, rotation that keeps block states right |
| `minecraft-technical` | exact Bedrock syntax for all 84 commands, selectors, block states, Java-to-Bedrock translation, function packs, add-ons, the Script API, NPC dialogue |
| `minecraft-live` | connects to your running game: sees blocks, terrain, mobs and your inventory, runs commands, builds with undo, chats with you in game |

### Let Claude play with you (minecraft-live)

1. Ask Claude something like *"connect to my Minecraft and build me a cottage next to me"*.
2. Claude starts a small local bridge (Python 3.8+, nothing else to install).
3. In Minecraft, open a world with **cheats on** (this disables achievements for that world) and type
   `/connect localhost:19134` in chat. You'll see **[Claude] Connected**.
4. Optional: let Claude install the **Claude Link** add-on (`mc addon`) for fast, exact vision.

Claude uses only normal game commands through Minecraft's built-in WebSocket support: no mouse or keyboard
control, no mods. Every build is snapshotted first (`mc undo` restores it), Claude refuses to overwrite blocks
that look player-made unless you say so, and in-game chat from other players is never treated as instructions.

Check the setup without starting Minecraft: `.claude/skills/minecraft-live/scripts/mc selftest`.
Tests: `python -m unittest tests/test_minecraft_skills.py` (a simulated game speaks the real protocol).
The data files are regenerated after Minecraft updates with `tools/gen_minecraft_data.py` and
`tools/gen_rotation_table.py`.

Data sources: IDs, names, states, recipes and command syntax are derived from Mojang's
[bedrock-samples](https://github.com/Mojang/bedrock-samples) (© Mojang AB, subject to the Minecraft EULA);
the block rotation table is derived from [PrismarineJS minecraft-data](https://github.com/PrismarineJS/minecraft-data)
(MIT). NOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.

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
