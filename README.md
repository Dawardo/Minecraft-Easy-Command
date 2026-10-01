# Bedrock Music Maker

Turn a **MIDI file** into **Minecraft: Bedrock Edition** command block `/playsound` commands, with the repeater delays, ready to copy and paste.

## Use it

1. Double-click **`Start-Music-Maker.bat`** (Windows). A small local server starts and your browser opens at `http://localhost:8765/`. It only needs the PowerShell that comes with Windows. Nothing is uploaded anywhere.
2. Drop in a MIDI file (search "song name midi") and pick the part you want (10–30 seconds is a good start, since every note is a command block).
3. Pick the tracks. The page guesses, and you can change them:
   - **Melody comes from**: usually the vocal line (in band MIDIs often a lead instrument like trombone or flute).
   - **Bass comes from**: the bass track, or **Auto** (lowest note of all the other tracks).
   - **Harmony comes from**: **Auto** by default, meaning the chord notes from all the other tracks (guitars, strings…) that sit under the melody.
4. Choose the layers (max 3 instruments, so max 3 command blocks per step):
   - **Layer 1: Melody**, always on (harp by default).
   - **Layer 2: Extra bass** (bass) or off.
   - **Layer 3: Drums** (`note.bd` kick, `note.snare`, `note.hat`, from the MIDI drum track) or **Harmony** (guitar by default) or off.
   - Any layer can use any note block instrument.
5. **Convert**. If a layer has no notes in the part you picked, the page says why, e.g. *"Bass only starts at 31.4 s"*. **▶ Minecraft preview** plays roughly what the note blocks will sound like, and **▶ Original** plays all the MIDI tracks.
6. Build it with **Copy next**: each click (or <kbd>Space</kbd>) copies the next command and tells you which repeater delay to set before it.

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

`node tests/music.test.mjs` writes test MIDI files and runs them through the real page in headless Chromium. It covers:
- **Track picking:** automatic choice of melody, bass and harmony tracks.
- **Every layer in an intro without bass:** harmony comes from the guitar track, with a clear warning about the bass.
- **Exact notes:** melody, bass and GM drum notes.
- **Auto bass.**
- **Chords:** the melody takes the top note.
- **Output:** command format and pitch range, repeater ticks, chain delays, Copy next and the .txt export.

MIDI parsing uses [@tonejs/midi](https://github.com/Tonejs/Midi) (MIT, bundled in `web/vendor/midi.js`).

## Dialogue maker (paused)

The earlier NPC dialogue tool is still at `http://localhost:8765/dialogue.html` (`tests/dialogue.test.mjs`).
