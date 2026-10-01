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
