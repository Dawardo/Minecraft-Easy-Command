// Writes tests/out/test-song.wav: "Twinkle Twinkle" melody + bass + kick/hat, with known notes.
// Usage: node tests/make-test-song.mjs  -> prints the expected notes as JSON
import fs from 'node:fs';
import path from 'node:path';

export const BEAT = 0.4;
export const MELODY = [72, 72, 79, 79, 81, 81, 79, -1, 77, 77, 76, 76, 74, 74, 72, -1]; // C5 C5 G5 G5 A5 A5 G5 _ F5 F5 E5 E5 D5 D5 C5 _
export const BASS = [48, 48, 53, 48, 53, 48, 43, 48];       // one per 2 beats: C3 C3 F3 C3 F3 C3 G2 C3
const SR = 44100;

export function render() {
  const dur = MELODY.length * BEAT + 0.5;
  const n = Math.ceil(dur * SR);
  const L = new Float32Array(n);
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  const tone = (t0, len, m, amp, harmonics, decay) => {
    const f = hz(m);
    for (let i = Math.floor(t0 * SR); i < Math.min(n, (t0 + len) * SR); i++) {
      const t = i / SR - t0;
      const env = Math.min(1, t / 0.01) * Math.exp(-t * decay) * Math.min(1, (len - t) / 0.02);
      let v = 0;
      for (let h = 1; h <= harmonics; h++) v += Math.sin(2 * Math.PI * f * h * t) / h;
      L[i] += amp * env * v;
    }
  };
  MELODY.forEach((m, k) => m > 0 && tone(k * BEAT, BEAT * 0.95, m, 0.25, 6, 2.5));
  BASS.forEach((m, k) => tone(k * BEAT * 2, BEAT * 2 * 0.97, m, 0.22, 4, 1.2));
  let seed = 1; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  for (let k = 0; k < MELODY.length; k++) {
    const t0 = k * BEAT;
    if (k % 2 === 0) for (let i = 0; i < 0.15 * SR; i++) { // kick
      const t = i / SR; const f = 50 + 100 * Math.exp(-t * 30);
      L[Math.floor(t0 * SR) + i] += 0.5 * Math.exp(-t * 18) * Math.sin(2 * Math.PI * f * t);
    } else for (let i = 0; i < 0.04 * SR; i++) { // hat
      L[Math.floor(t0 * SR) + i] += 0.08 * Math.exp(-i / SR * 80) * rnd();
    }
  }
  return { L, SR };
}

export function wav(L, SR) {
  const b = Buffer.alloc(44 + L.length * 4);
  b.write('RIFF', 0); b.writeUInt32LE(36 + L.length * 4, 4); b.write('WAVE', 8); b.write('fmt ', 12);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(2, 22); b.writeUInt32LE(SR, 24);
  b.writeUInt32LE(SR * 4, 28); b.writeUInt16LE(4, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(L.length * 4, 40);
  for (let i = 0; i < L.length; i++) {
    const v = Math.max(-32768, Math.min(32767, Math.round(L[i] * 32767)));
    b.writeInt16LE(v, 44 + i * 4); b.writeInt16LE(v, 46 + i * 4);
  }
  return b;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = path.resolve('tests/out'); fs.mkdirSync(out, { recursive: true });
  const { L } = render();
  fs.writeFileSync(path.join(out, 'test-song.wav'), wav(L, SR));
  console.log('wrote tests/out/test-song.wav');
}

// ---------------------------------------------------------------------------
// A harder, "real recording" style song: sung melody with vibrato + scoops (centre),
// loud strummed guitars panned left/right, bass, kick/snare/hats, all detuned +35 cents.
export const REAL_BEAT = 0.6; // 100 bpm
// [midi or -1 for rest, beats]  key of G major, male vocal range
export const REAL_MELODY = [
  [62, .5], [62, .5], [64, .5], [67, 1], [67, .5], [69, .5], [71, 1.5], [69, .5], [67, 1], [64, .5], [62, .5], [62, 1], [-1, .5],
  [59, .5], [62, .5], [64, 1], [62, .5], [59, .5], [57, 1], [55, 1.5], [-1, .5],
  [62, .5], [67, .5], [67, .5], [69, .5], [71, 1], [72, .5], [71, .5], [69, 1], [67, .5], [64, .5], [67, 2], [-1, 1],
];
const CHORDS = [[55, 59, 62], [48, 52, 55], [50, 54, 57], [52, 55, 59]]; // G C D Em, one per bar
const BASS_ROOTS = [43, 36, 38, 40];

export function renderRealistic(detuneCents = 35) {
  const SRr = 44100;
  const beats = REAL_MELODY.reduce((a, n) => a + n[1], 0);
  const dur = beats * REAL_BEAT + 1;
  const n = Math.ceil(dur * SRr);
  const L = new Float32Array(n), R = new Float32Array(n);
  const tune = Math.pow(2, detuneCents / 1200);
  const hz = m => 440 * Math.pow(2, (m - 69) / 12) * tune;
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  const add = (i, v, pan) => { if (i >= 0 && i < n) { L[i] += v * (1 - pan); R[i] += v * (1 + pan); } };

  // vocal: rich harmonics shaped by vowel formants, vibrato, scoop into each note, legato
  const g2 = x => Math.exp(-(x * x));
  const formant = f => 0.25 + g2((f - 600) / 250) + 0.7 * g2((f - 1700) / 400) + 0.4 * g2((f - 2600) / 400);
  let t = 0, phase = 0, notes = [];
  for (const [m, b] of REAL_MELODY) {
    const len = b * REAL_BEAT;
    if (m > 0) notes.push({ t, len, m });
    t += len;
  }
  for (const nt of notes) {
    const i0 = Math.floor(nt.t * SRr), i1 = Math.floor((nt.t + nt.len) * SRr);
    for (let i = i0; i < i1; i++) {
      const tt = (i - i0) / SRr;
      const scoop = -0.8 * Math.exp(-tt / 0.05);                           // slide up into the note
      const vib = tt > 0.18 ? 0.35 * Math.sin(2 * Math.PI * 5.5 * tt) : 0;  // ±35 cents vibrato
      const f = hz(nt.m + scoop + vib);
      phase += 2 * Math.PI * f / SRr;
      const env = Math.min(1, tt / 0.03) * Math.min(1, (nt.len - tt) / 0.03);
      let v = 0;
      for (let h = 1; h <= 16; h++) if (h * f < 8000) v += Math.sin(h * phase) * formant(h * f) / h;
      add(i, 0.13 * env * v, 0);
    }
  }
  // two strummed guitars, every beat and every off-beat, panned hard-ish
  const bars = Math.ceil(beats / 4);
  for (let bar = 0; bar < bars; bar++) {
    const ch = CHORDS[bar % 4];
    const voicing = [ch[0] - 12, ch[0], ch[1], ch[2], ch[0] + 12, ch[1] + 12];
    for (let k = 0; k < 8; k++) {
      const t0 = (bar * 4 + k * 0.5) * REAL_BEAT;
      voicing.forEach((m, s) => {
        const ts = t0 + s * 0.012;
        const f = hz(m), pan = k % 2 ? 0.7 : -0.7;
        for (let i = 0; i < 0.5 * SRr; i++) {
          const tt = i / SRr;
          let v = 0;
          for (let h = 1; h <= 8; h++) v += Math.sin(2 * Math.PI * f * h * tt) * Math.exp(-tt * (3 + h)) / h;
          add(Math.floor(ts * SRr) + i, 0.07 * v, pan);
        }
      });
    }
    // bass: root on beats 1 and 3, fifth on 2 and 4
    for (let k = 0; k < 4; k++) {
      const m = BASS_ROOTS[bar % 4] + (k % 2 ? 7 : 0), f = hz(m), t0 = (bar * 4 + k) * REAL_BEAT;
      for (let i = 0; i < REAL_BEAT * 0.95 * SRr; i++) {
        const tt = i / SRr;
        add(Math.floor(t0 * SRr) + i, 0.16 * Math.exp(-tt * 2) * (Math.sin(2 * Math.PI * f * tt) + 0.5 * Math.sin(4 * Math.PI * f * tt)), 0);
      }
    }
    // drums: kick 1 & 3, snare 2 & 4, hats on 8ths
    for (let k = 0; k < 8; k++) {
      const i0 = Math.floor((bar * 4 + k * 0.5) * REAL_BEAT * SRr);
      if (k === 0 || k === 4) for (let i = 0; i < 0.15 * SRr; i++) { const tt = i / SRr; add(i0 + i, 0.45 * Math.exp(-tt * 18) * Math.sin(2 * Math.PI * (50 + 100 * Math.exp(-tt * 30)) * tt), 0); }
      if (k === 2 || k === 6) for (let i = 0; i < 0.18 * SRr; i++) { const tt = i / SRr; add(i0 + i, 0.25 * Math.exp(-tt * 20) * (rnd() + 0.5 * Math.sin(2 * Math.PI * 190 * tt)), 0); }
      for (let i = 0; i < 0.04 * SRr; i++) add(i0 + i, 0.05 * Math.exp(-i / SRr * 90) * rnd(), 0.3);
    }
  }
  return { L, R, SR: SRr, notes };
}

export function wavStereo(L, R, SR) {
  const peak = Math.max(...[L, R].map(a => a.reduce((m, v) => Math.max(m, Math.abs(v)), 0)), 1e-9);
  const g = 0.9 / Math.max(1, peak);
  const b = Buffer.alloc(44 + L.length * 4);
  b.write('RIFF', 0); b.writeUInt32LE(36 + L.length * 4, 4); b.write('WAVE', 8); b.write('fmt ', 12);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(2, 22); b.writeUInt32LE(SR, 24);
  b.writeUInt32LE(SR * 4, 28); b.writeUInt16LE(4, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(L.length * 4, 40);
  for (let i = 0; i < L.length; i++) {
    b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * g)) * 32767), 44 + i * 4);
    b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * g)) * 32767), 46 + i * 4);
  }
  return b;
}

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
