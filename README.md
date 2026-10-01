# Bedrock Music Maker

Turn an MP3 into **Minecraft: Bedrock Edition** command block `/playsound` commands, with the repeater delays, ready to copy and paste.

## Use it

1. Double-click **`Start-Music-Maker.bat`** (Windows). A small local server starts and your browser opens at `http://localhost:8765/`. It only needs the PowerShell that comes with Windows. Your song never leaves your PC.
2. Drop in a **MIDI file** (best: exact notes) or an **MP3**, and pick the part you want (10–30 seconds is a good start, since every note is a command block).
3. Choose the sound:
   - **Layer 1: Melody**, always on (harp by default).
   - **Layer 2: Extra bass** (bass by default) or off.
   - **Layer 3: Drums** (`note.bd` kick, `note.snare`, `note.hat`), **Harmony** (a second note under the melody, bell by default) or off.
   - Any layer can use any note block instrument. That's max 3 instruments, so max 3 command blocks per step.
4. **Convert**, then **▶ Minecraft preview** to hear roughly what the note blocks will sound like next to **▶ Original**.
5. Build it with **Copy next**: each click (or <kbd>Space</kbd>) copies the next command and tells you which repeater delay to set before it.

## MIDI vs MP3

This is how the existing note block tools work too: [Note Block Studio](https://minecraft.wiki/w/Tutorial:Programs_and_editors/Note_Block_Studio), [MidiMC](https://www.midimc.com/) and NBSTool all start from **MIDI**. MP3-based tools like [Beats to Blocks](https://github.com/dustinlaa/beats-to-blocks) use AI transcription.

- **MIDI** gives the exact notes. Pick which track is the melody, bass and harmony (the page guesses). Chords keep their top note for the melody and their bottom note for the bass. Drum tracks (channel 10) map to `note.bd` / `note.snare` / `note.hat`.
- **MP3**: there are two listening engines.
  - **AI (best)**: Spotify's [Basic Pitch](https://github.com/spotify/basic-pitch-ts) model running locally (bundled in `web/vendor`, Apache-2.0). It listens to a *vocal focus* version of the song, made by keeping what's panned to the centre, after correcting the recording's tuning. The tune is then followed as one smooth line, so it doesn't hop onto guitar notes.
  - **Quick**: the built-in analyser.
  - Both detect the key and can pull stray wrong notes into it.

## What you get

```
/playsound note.harp @a ~ ~ ~ 1 0.7071 1
/playsound note.bass @a ~ ~ ~ 0.9 1.4142 0.9
/playsound note.bd @a ~ ~ ~ 0.8 1 0.8
```

Bedrock syntax: `/playsound <sound> [player] [x y z] [volume] [pitch] [minimumVolume]`. Pitch is the note block pitch (0.5 to 2.0, two octaves per instrument). Each layer is moved by whole octaves so the tune keeps its shape and fits the instrument. With "Everyone" the last number (minimum volume) lets every player hear it wherever they are.

### Build styles

- **Repeaters** (default): one redstone line, `button → dust → repeaters → dust → …`. Each step is a column under a piece of dust: the top block is *Impulse · Needs Redstone*, facing down, and extra layers go below it as *Chain · Always Active*, facing down. The page lists the repeaters between steps (each holds 1–4 ticks, 1 tick = 0.1 s).
- **Chain blocks**: no redstone. One straight line of command blocks. The first is *Impulse · Needs Redstone*, the rest *Chain · Always Active*, using each block's *Delay in Ticks* (2 game ticks per repeater tick).

## How the converter listens

It runs entirely in the browser:
- **Melody:** the AI's note probabilities, or the built-in pitch detector with octave-error protection, followed as one continuous line (Viterbi). It ignores whatever the bass is playing.
- **Bass:** read from a separate high-resolution low-frequency analysis.
- **Drums:** found from sudden jumps in loudness in the low (kick), mid (snare, which must sound noisy) and high (hat) ranges.
- **Timing:** note starts snap to sharp onsets, then everything is rounded to the 1- or 2-tick grid.

Real songs with lots going on won't come out perfect. *Simple tune* plus the preview button is the quickest way to get something recognizable.

## Tests

`node tests/music.test.mjs` generates test songs with known notes, encodes them to MP3 (Python `lameenc`), runs them through the real page in headless Chromium, and checks:
- **A clean song:** every melody, bass and drum note matches exactly.
- **A "real recording" style song** (sung melody with vibrato and slides, strummed guitars panned left/right, drums, 35 cents out of tune): the AI engine must get at least 80% of the sung notes exactly, with at most 5 extra notes. It currently gets 87%; the old engine got 20%. It must also detect the key and the tuning.
- **A MIDI file:** the top note of each chord, the bass and the GM drums all come out exactly.
- The commands, repeater ticks, chain delays, Copy next and the .txt download are right.

## Dialogue maker (paused)

The earlier NPC dialogue tool is still at `http://localhost:8765/dialogue.html` (`tests/dialogue.test.mjs`).
