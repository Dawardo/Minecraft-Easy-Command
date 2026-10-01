# Bedrock Music Maker

Turn a **MIDI file** into **Minecraft: Bedrock Edition** command block `/playsound` commands, with the repeater delays, ready to copy and paste.

## Use it

1. Double-click **`Start-Music-Maker.bat`** (Windows). A small local server starts and your browser opens at `http://localhost:8765/`. It only needs the PowerShell that comes with Windows. Nothing is uploaded anywhere.
2. Drop in a MIDI file (search "song name midi"). **That's it.** The commands appear straight away with all three layers on and the right tracks picked automatically:
   - **Melody**: the lead line (usually the vocal part, even when a band MIDI gives it to a trombone or flute and doubles it in octaves). When it rests, the next lead instrument takes over.
   - **Bass**: the bass track. Where there's no bass for a while (like an intro), the lowest notes of the chord parts fill in, never the tune.
   - **Drums / harmony**: drums where the song has drums (`note.bd`, `note.snare`, `note.hat`); chord notes under the melody where it doesn't.
3. Optional, and everything updates instantly:
   - **Instruments**: any note block instrument for each layer.
   - **Notes from**: which track a layer uses, or Auto.
   - **ON/OFF**: a switch for bass and for drums/harmony.
   - **The rest**: the part of the song, the speed grid, transpose, who hears it, and the build style.
4. **▶ Minecraft preview** plays roughly what the note blocks will sound like; **▶ Original** plays every MIDI track.
5. Build it with **Copy next**: each click (or <kbd>Space</kbd>) copies the next command and tells you which repeater delay to set before it.

## What you get

```
/playsound note.harp @a ~ ~ ~ 1 0.7071 1
/playsound note.bass @a ~ ~ ~ 0.9 1.4142 0.9
/playsound note.guitar @a ~ ~ ~ 0.7 1.1225 0.7
```

Bedrock syntax: `/playsound <sound> [player] [x y z] [volume] [pitch] [minimumVolume]`. Pitch is the note block pitch (0.5 to 2.0, two octaves per instrument). Each layer is moved by whole octaves so the tune keeps its shape and fits the instrument. Chords give their top note to the melody and their bottom note to the bass. With "Everyone" the last number (minimum volume) lets every player hear it wherever they are.

### Build styles

- **Repeaters**: one redstone line, `button → dust → repeaters → dust → …`. Each step is a column under a piece of dust: the top block is *Impulse · Needs Redstone*, facing down, and extra layers go below it as *Chain · Always Active*, facing down. The page lists the repeaters between steps (each holds 1–4 ticks, 1 tick = 0.1 s).
- **Chain blocks**: one straight line of command blocks. The first is *Impulse · Needs Redstone*, the rest *Chain · Always Active*, using *Delay in Ticks* (2 game ticks per repeater tick).
- **Slab (auto-builder)**: made for Realms and huge songs.
  - **Blocks:** every note is its own *Impulse · Needs Redstone* block with **Delay in Ticks = the note's time** (20 per second, max 99,999 ≈ 83 min).
  - **Layout:** blocks are laid flat in a W×D grid you choose from a corner block, stacked upward as command, glass, command, command, glass…
  - **Start:** `/fill <box> redstone_block replace glass` powers every block on the same tick, and each plays when its delay runs out.
  - **Stop:** `/fill <box> glass replace redstone_block` removes the power, which cancels the notes still waiting. Run Start again to replay.
  - **Size:** the whole slab stays under Bedrock's 32,768-block `/fill` limit, so Start is always one command. A whole 4-minute song with 3 layers (≈1,800 blocks) is 8 layers of 16×16, 12 blocks tall.

## Auto-builder (Realms-safe)

Realms can't load your own files, so the builder fills every command block **through the normal command block screen, like a player would**:

1. In the page pick **Slab (auto-builder)**, set the corner block and footprint, and click **Download build plan**.
2. Double-click **`Start-Auto-Builder.bat`**. It finds the newest `*.slabplan.json` in Downloads (or drag one onto the `.bat`). It then asks:
   - **speed**: an extra delay after every action: 1 = 125, 2 = 250, 3 = 500 (default) or 4 = 750 ms. Use a longer one on a laggy Realm
   - **typing or pasting**: typing key by key is the default and works; pasting is much faster (try it with a test run first)
   - **where to build** (always asked): type the corner like `120 64 -35`; `x 0 z 0` isn't allowed. Turn on coordinates with `/gamerule showcoordinates true` and use the Position shown where you stand. (A resumed build keeps its corner.)
   - **set up the clicks again?** (only if a setup is saved): say yes if clicks landed in the wrong place
   - **which block to start from**: if earlier ones are already built
   - **a test run** (e.g. 10 blocks), with an optional **step-by-step** mode (F8 before every action)
3. In Minecraft: Creative, flying, operator, near the corner, with the area empty. Click into Minecraft: the builder starts 3 seconds later.
4. **First time only:**
   - **Typing:** chat commands are typed like a player would: press **/** (Minecraft opens chat with the `/` already in it), type (or paste) the rest of the command, press **Enter**. Before typing it presses a throwaway **End** key, because Minecraft drops the first key after chat opens. Command blocks get the command without the `/` (they don't need it).
   - **Click setup:** the builder opens the first command block. Click the **bottom of the left scroll bar**, then click **Command Input** (it types the command by itself), then click **Delay in Ticks** (it types 67, waits a second, then 0). If it all worked press **F8** to save, **F10** to redo. Redo it later by answering yes at the start, or with `-Recalibrate`.
5. Hands off. For every block it:
   - for each new layer: teleports there, waits 2 seconds, then types `/fill`
   - types `/tp @s x y+2 z 0 90` into chat, so it's straight above the block looking down
   - right-clicks to open the command block
   - clicks the bottom of the left scroll bar, clicks Command Input and types the command, clicks Delay in Ticks and types the delay
   - presses Esc to close and save

   **F9** stops right away (even mid-typing) and **F10** pauses/resumes. It also pauses by itself whenever Minecraft isn't the active window. Progress, including the corner you chose, is saved after every block: run it again to **resume**, and the half-done block is re-placed fresh.
6. When it's done it shows the Start/Stop commands, plus `/gamerule commandblockoutput false` and a `/tickingarea` so the song plays even when nobody is next to it.

It uses only what ships with Windows (PowerShell 5.1+). It's about 3 seconds per block at normal speed.

## Tests

`node tests/music.test.mjs` writes a band-style MIDI and runs it through the real page in headless Chromium. The MIDI has an octave-doubled lead, a flute fill while the lead rests, a late-starting bass, chord guitar and a drum break. The test checks:
- **Auto setup:** the result appears on drop with every layer on and the right track picked for each.
- **Exact notes:** the melody's notes, plus the fill-ins during rests and the intro.
- **Instrument changes:** each change applies to every block of that layer at once.
- **Track swaps:** hand-picked tracks for each layer work, and a silent pick explains why.
- **Switches:** every switch and drums/harmony mode.
- **Output:** command format and pitch range, repeater ticks, chain delays, Copy next and the .txt export.
- **Slab layout:** a unique position per note, delays equal to time × 20, the correct level pattern, one Start/Stop command, and the build plan download.

`node tests/auto-builder.test.mjs` (needs PowerShell; set `PWSH` to its path) dry-runs the auto-builder on that plan, printing every key and click instead of sending them. It checks:
- the layer and teleport commands (never a clear), the typed or pasted commands and delays, and the per-block sequence
- test-run limits, resume and the finish
- building at a different corner
- starting part-way through

MIDI parsing uses [@tonejs/midi](https://github.com/Tonejs/Midi) (MIT, bundled in `web/vendor/midi.js`).

## Dialogue maker (paused)

The earlier NPC dialogue tool is still at `http://localhost:8765/dialogue.html` (`tests/dialogue.test.mjs`).
