# Bedrock Dialogue Maker

A self-hosted web tool for building **Minecraft: Bedrock Edition** NPC dialogue: branching conversations, keypad passwords and tag checks. You get a ready-to-import `.mcpack` and the in-game commands to copy and paste.

## Use it

1. Double-click **`Start-Dialogue-Maker.bat`** (Windows). A small local server starts and your browser opens at `http://localhost:8765/`. It only needs the PowerShell that comes with Windows, so there's nothing to install.
2. **Build**: add scenes (one dialogue box each) and buttons. **“+ Button → new scene”** creates a branch in one click. You can have as many scenes and branches as you want.
3. **Test play**: click through the conversation in the browser. It tracks player tags and remembered progress the same way the game does.
4. **Get commands**: download the `.mcpack`, turn it on in your world, and paste the setup commands into chat.

Your work autosaves in the browser. Use **Project → Save project file** to keep a backup or move it to another PC.

## Features

| Feature | How it works in Bedrock |
|---|---|
| Branches | Button runs `/dialogue open @s @initiator <scene>` |
| Password / code lock | **Password wizard**. Bedrock dialogue has no text input, so the code is a sequence of button presses. Each digit is its own scene. Wrong presses go down an identical-looking decoy path, so players only learn they failed at the end. |
| Tag checks | `/dialogue open @s @initiator[tag=X] A` + `/dialogue open @s @initiator[tag=!X] B` |
| Give / remove tags | `/tag @initiator add/remove <tag>` |
| Remember progress per player | `/dialogue change @s <scene> @initiator` |
| Custom commands | Any command, one per line, on buttons or when a box opens or closes |
| Branch map | Visual graph of every scene. Scenes nothing leads to are flagged. |
| Checks | Warns about broken links, duplicate IDs, more than 6 buttons, bad tag names |

### Two export modes

- **A. Behavior pack (recommended).** Builds `manifest.json` + `dialogue/<name>.json` (`"format_version": "1.17"`, `"minecraft:npc_dialogue"`), the format from Microsoft's official NPC dialogue docs and sample pack.
- **B. No add-on.** For worlds where you can't add packs. Each scene becomes its own hidden NPC. The page gives you the summon/tag commands plus the text and button commands to paste into each NPC's in-game editor. Per-player “remember” isn't possible without scene files, so that option is skipped in this mode.

## Bedrock reference

- `/dialogue open <npc: target> <player: target> [sceneName]`
- `/dialogue change <npc: target> <sceneName> [player: target]`
- `@initiator` = the player talking to the NPC (it only works in NPC dialogue)
- Cheats must be on to use NPCs and `/dialogue`. The NPC has to be in a loaded chunk near the player.

Sources: [Microsoft Learn: NPC Dialogue Command](https://learn.microsoft.com/en-us/minecraft/creator/documents/npcdialogue), [microsoft/minecraft-samples npc_dialogue_sample](https://github.com/microsoft/minecraft-samples/tree/main/npc_dialogue_sample).

## If the .bat doesn't start the server

It falls back to opening `web/index.html` directly, and everything still works. You can also serve the `web/` folder with any static server.

## Tests

`node tests/ui.test.mjs` (needs the `playwright` package and Chromium) drives the real UI. It plays the example password with right and wrong codes, builds a multi-branch project plus a colour password through the UI, then downloads and checks the `.mcpack`.
