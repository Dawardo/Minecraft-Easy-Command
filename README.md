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

- **Repeaters** (default): one redstone line, `button → dust → repeaters → dust → …`. Each step is a column under a piece of dust: the top block is *Impulse · Needs Redstone*, facing down, and extra layers go below it as *Chain · Always Active*, facing down. The page lists the repeaters between steps (each holds 1–4 ticks, 1 tick = 0.1 s).
- **Chain blocks**: no redstone. One straight line of command blocks. The first is *Impulse · Needs Redstone*, the rest *Chain · Always Active*, using each block's *Delay in Ticks* (2 game ticks per repeater tick).

## Tests

`node tests/music.test.mjs` writes a band-style MIDI and runs it through the real page in headless Chromium. The MIDI has an octave-doubled lead, a flute fill while the lead rests, a late-starting bass, chord guitar and a drum break. The test checks:
- **Auto setup:** the result appears on drop with every layer on and the right track picked for each.
- **Exact notes:** the melody's notes, plus the fill-ins during rests and the intro.
- **Instrument changes:** each change applies to every block of that layer at once.
- **Track swaps:** hand-picked tracks for each layer work, and a silent pick explains why.
- **Switches:** every switch and drums/harmony mode.
- **Output:** command format and pitch range, repeater ticks, chain delays, Copy next and the .txt export.

MIDI parsing uses [@tonejs/midi](https://github.com/Tonejs/Midi) (MIT, bundled in `web/vendor/midi.js`).

## Dialogue maker (paused)

The earlier NPC dialogue tool is still at `http://localhost:8765/dialogue.html` (`tests/dialogue.test.mjs`).
