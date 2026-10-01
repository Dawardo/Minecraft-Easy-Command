// Test data for the music maker: a known tune and a tiny MIDI file writer.
export const MELODY = [72, 72, 79, 79, 81, 81, 79, -1, 77, 77, 76, 76, 74, 74, 72, -1]; // "Twinkle Twinkle", -1 = rest
export const BASS = [48, 48, 53, 48, 53, 48, 43, 48];                                  // one per 2 beats

// ---------------------------------------------------------------------------
// Minimal Standard MIDI File writer for tests: 120 bpm, 480 ticks per beat.
// tracks: [{ name, channel, notes: [{ beat, beats, midi }] }]
export function midiFile(tracks) {
  const vlq = n => { const b = [n & 0x7f]; while ((n >>= 7)) b.unshift((n & 0x7f) | 0x80); return b; };
  const chunk = (id, bytes) => [...Buffer.from(id), ...[24, 16, 8, 0].map(s => (bytes.length >> s) & 255), ...bytes];
  const trk = t => {
    const ev = [];
    for (const n of t.notes) {
      ev.push({ tick: Math.round(n.beat * 480), d: [0x90 | t.channel, n.midi, 100] });
      ev.push({ tick: Math.round((n.beat + n.beats) * 480), d: [0x80 | t.channel, n.midi, 0] });
    }
    ev.sort((a, b) => a.tick - b.tick || (a.d[0] & 0xf0) - (b.d[0] & 0xf0)); // note-offs first
    const name = [...Buffer.from(t.name)];
    const bytes = [0, 0xff, 0x03, name.length, ...name];
    let last = 0;
    for (const e of ev) { bytes.push(...vlq(e.tick - last), ...e.d); last = e.tick; }
    bytes.push(0, 0xff, 0x2f, 0);
    return chunk('MTrk', bytes);
  };
  const tempo = chunk('MTrk', [0, 0xff, 0x51, 3, 0x07, 0xa1, 0x20, 0, 0xff, 0x2f, 0]); // 500000 us/beat
  return Buffer.from([...chunk('MThd', [0, 1, 0, tracks.length + 1, 0x01, 0xe0]), ...tempo, ...tracks.flatMap(trk)]);
}
