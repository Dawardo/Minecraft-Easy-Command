/* Bedrock Music Maker
 * MP3 -> Minecraft BEDROCK Edition command block /playsound commands.
 *   /playsound <sound> [player] [x y z] [volume] [pitch] [minimumVolume]
 * Note block sounds play two octaves: pitch 0.5 .. 2.0 around the instrument's centre note.
 * Everything runs in the browser; no dependencies.
 */
'use strict';

const SR = 22050;          // analysis sample rate
const HOP_SEC = 0.025;     // analysis frame step
const MAX_SECONDS = 180;

// Bedrock note sounds. center = MIDI note played at pitch 1.0 (note block range is center ±12).
const INSTRUMENTS = {
  'note.harp': { label: 'Harp / piano', center: 66, synth: 'pluck' },
  'note.pling': { label: 'Pling (electric piano)', center: 66, synth: 'pluck' },
  'note.bit': { label: 'Bit (8-bit square)', center: 66, synth: 'square' },
  'note.banjo': { label: 'Banjo', center: 66, synth: 'pluck' },
  'note.iron_xylophone': { label: 'Iron xylophone', center: 66, synth: 'bell' },
  'note.guitar': { label: 'Guitar', center: 54, synth: 'pluck' },
  'note.flute': { label: 'Flute', center: 78, synth: 'soft' },
  'note.cow_bell': { label: 'Cow bell', center: 78, synth: 'bell' },
  'note.bell': { label: 'Bell (glockenspiel)', center: 90, synth: 'bell' },
  'note.chime': { label: 'Chime', center: 90, synth: 'bell' },
  'note.xylophone': { label: 'Xylophone', center: 90, synth: 'bell' },
  'note.bass': { label: 'Bass (double bass)', center: 42, synth: 'bass' },
  'note.didgeridoo': { label: 'Didgeridoo', center: 42, synth: 'bass' },
};
const DRUMS = { kick: 'note.bd', snare: 'note.snare', hat: 'note.hat' };
const LAYER_COLORS = ['#5dbb63', '#5a9be5', '#e0b341'];

// Detail presets
const DETAIL = {
  1: { minMel: 0.25, voice: 0.10, prom: 1.6, onsetK: 2.2, minBass: 0.3, drumK: 2.6 },
  2: { minMel: 0.15, voice: 0.05, prom: 1.4, onsetK: 1.8, minBass: 0.2, drumK: 2.2 },
  3: { minMel: 0.10, voice: 0.025, prom: 1.25, onsetK: 1.5, minBass: 0.15, drumK: 1.8 },
};

// ---------- helpers ----------
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const midiToHz = m => 440 * Math.pow(2, (m - 69) / 12);
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const noteName = m => NOTE_NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
const fmtPitch = p => (Math.round(p * 10000) / 10000).toString();

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.remove('hidden');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.add('hidden'), 1600);
}
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); } catch {
    const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch { /* ignore */ }
    ta.remove();
  }
}

// ---------- FFT ----------
const fftCache = {};
function fftTables(n) {
  if (fftCache[n]) return fftCache[n];
  const rev = new Uint32Array(n);
  const bits = Math.log2(n);
  for (let i = 0; i < n; i++) { let r = 0; for (let b = 0; b < bits; b++) r |= ((i >> b) & 1) << (bits - 1 - b); rev[i] = r; }
  const cos = new Float64Array(n / 2), sin = new Float64Array(n / 2);
  for (let i = 0; i < n / 2; i++) { cos[i] = Math.cos(-2 * Math.PI * i / n); sin[i] = Math.sin(-2 * Math.PI * i / n); }
  const win = new Float64Array(n);
  for (let i = 0; i < n; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / n);
  return (fftCache[n] = { rev, cos, sin, win, re: new Float64Array(n), im: new Float64Array(n) });
}
/** Magnitude spectrum of a Hann-windowed frame centred on sample `center`. */
function spectrum(x, center, n) {
  const t = fftTables(n);
  const { re, im, rev, win } = t;
  const start = center - n / 2;
  for (let i = 0; i < n; i++) {
    const j = start + i;
    re[rev[i]] = (j >= 0 && j < x.length ? x[j] : 0) * win[i];
    im[rev[i]] = 0;
  }
  for (let size = 2; size <= n; size <<= 1) {
    const half = size >> 1, step = n / size;
    for (let i = 0; i < n; i += size) {
      for (let k = 0; k < half; k++) {
        const c = t.cos[k * step], s = t.sin[k * step];
        const a = i + k, b = a + half;
        const tr = re[b] * c - im[b] * s, ti = re[b] * s + im[b] * c;
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
      }
    }
  }
  const out = new Float32Array(n / 2 + 1);
  for (let k = 0; k <= n / 2; k++) out[k] = Math.hypot(re[k], im[k]);
  return out;
}

// ---------- pitch salience ----------
function peakAt(A, df, f) {
  const k = f / df;
  if (k >= A.length - 1) return 0;
  const lo = Math.max(1, Math.floor(k * 0.9715)), hi = Math.min(A.length - 1, Math.ceil(k * 1.0293)); // ±half semitone
  let m = 0;
  for (let i = lo; i <= hi; i++) if (A[i] > m) m = A[i];
  return m;
}
/** Harmonic sum, minus energy at half-harmonics (punishes picking an octave too low). */
function salience(A, df, m, H) {
  const f0 = midiToHz(m);
  let s = 0, pen = 0, w = 1;
  for (let h = 1; h <= H; h++) {
    s += w * peakAt(A, df, h * f0);
    pen += w * peakAt(A, df, (h - 0.5) * f0);
    w *= 0.8;
  }
  return s - 0.6 * pen;
}
function bandEnergy(A, df, f1, f2) {
  let e = 0;
  for (let k = Math.max(1, Math.floor(f1 / df)); k <= Math.min(A.length - 1, Math.ceil(f2 / df)); k++) e += A[k] * A[k];
  return e;
}
/** Spectral flatness (0 = pure tones, 1 = white noise) between f1 and f2. */
function flatness(A, df, f1, f2) {
  let lg = 0, ar = 0, n = 0;
  for (let k = Math.floor(f1 / df); k <= Math.min(A.length - 1, Math.ceil(f2 / df)); k++) {
    const v = A[k] * A[k] + 1e-12; lg += Math.log(v); ar += v; n++;
  }
  return n ? Math.exp(lg / n) / (ar / n) : 0;
}
function whiten(A, radius) {
  const n = A.length, pre = new Float64Array(n + 1), out = new Float32Array(n);
  for (let i = 0; i < n; i++) pre[i + 1] = pre[i] + A[i];
  for (let i = 0; i < n; i++) {
    const lo = Math.max(0, i - radius), hi = Math.min(n, i + radius + 1);
    out[i] = A[i] / Math.sqrt((pre[hi] - pre[lo]) / (hi - lo) + 1e-9);
  }
  return out;
}
function percentile(arr, p) {
  const a = Array.from(arr).sort((x, y) => x - y);
  return a.length ? a[Math.min(a.length - 1, Math.floor(p * a.length))] : 0;
}
/** Peak picking with an adaptive threshold (local mean + k * local std). */
function pickOnsets(flux, k, radius, floor) {
  const out = new Uint8Array(flux.length);
  for (let i = 1; i < flux.length - 1; i++) {
    if (flux[i] < flux[i - 1] || flux[i] < flux[i + 1] || flux[i] <= floor) continue;
    let s = 0, s2 = 0, c = 0;
    for (let j = Math.max(0, i - radius); j <= Math.min(flux.length - 1, i + radius); j++) { s += flux[j]; s2 += flux[j] * flux[j]; c++; }
    const mean = s / c, sd = Math.sqrt(Math.max(0, s2 / c - mean * mean));
    if (flux[i] > mean + k * sd) out[i] = 1;
  }
  return out;
}

// ---------- analysis ----------
const MEL_LO = 50, MEL_HI = 96, BASS_LO = 28, BASS_HI = 55;

/**
 * Turns mono samples (at SR) into note events per layer.
 * Returns { mel:[{t,dur,midi,strength}], bass:[...], harmony:[...], drums:[{t,kind}] } with times in seconds.
 */
function analyze(x, opts) {
  const D = DETAIL[opts.detail];
  const hop = Math.round(SR * HOP_SEC);
  const nF = Math.max(1, Math.floor(x.length / hop));
  const N1 = 4096, N2 = 8192, N3 = 1024;
  const df1 = SR / N1, df2 = SR / N2, df3 = SR / N3;
  const melSal = [], melBest = new Int16Array(nF).fill(-1), melScore = new Float32Array(nF), melProm = new Float32Array(nF);
  const melE = new Float32Array(nF);
  const bassBest = new Int16Array(nF).fill(-1), bassProm = new Float32Array(nF), bassE = new Float32Array(nF);
  const drumBands = [[40, 120], [1500, 5000], [7000, 10500]];
  const drumE = drumBands.map(() => new Float32Array(nF));
  const shortFlux = new Float32Array(nF), lowFlux = new Float32Array(nF), flat = new Float32Array(nF);
  let prevShort = null;

  for (let i = 0; i < nF; i++) {
    const c = i * hop;
    // bass first: its pitch is kept out of the melody
    const B = spectrum(x, c, N2);
    bassE[i] = bandEnergy(B, df2, 30, 260);
    let bb = -1, bs = 0, bsum = 0, bcnt = 0;
    for (let m = BASS_LO; m <= BASS_HI; m++) {
      const s = salience(B, df2, m, 5);
      if (s > 0) { bsum += s; bcnt++; }
      if (s > bs) { bs = s; bb = m; }
    }
    bassBest[i] = bb; bassProm[i] = bcnt ? bs / (bsum / bcnt) : 0;
    const bassPc = bassProm[i] > 1.3 ? bb : -100;

    // short window: sharp onset timing + drums
    const S = spectrum(x, c, N3);
    const sl = new Float32Array(S.length);
    let sf = 0;
    for (let k = Math.floor(150 / df3); k < Math.ceil(5000 / df3); k++) {
      sl[k] = Math.log1p(S[k] * 10);
      if (prevShort) sf += Math.max(0, sl[k] - prevShort[k]);
    }
    let lf = 0;
    for (let k = 1; k <= Math.ceil(300 / df3); k++) {
      sl[k] = Math.log1p(S[k] * 10);
      if (prevShort) lf += Math.max(0, sl[k] - prevShort[k]);
    }
    shortFlux[i] = sf; lowFlux[i] = lf; prevShort = sl;
    flat[i] = flatness(S, df3, 1500, 9000);
    if (opts.drums) drumBands.forEach(([a, b], j) => (drumE[j][i] = Math.log1p(bandEnergy(S, df3, a, b) * 100)));

    // melody / harmony
    const A = spectrum(x, c, N1);
    melE[i] = bandEnergy(A, df1, 150, 4000);
    const W = whiten(A, 24);
    const sal = new Float32Array(128);
    let best = -1, bestS = 0, sum = 0, cnt = 0;
    for (let m = MEL_LO; m <= MEL_HI; m++) {
      const s = salience(W, df1, m, 8);
      sal[m] = s;
      if (s > 0) { sum += s; cnt++; }
      if (m === bassPc || m === bassPc + 12) continue; // that's the bass, not the tune
      if (s > bestS) { bestS = s; best = m; }
    }
    melSal.push(sal);
    melBest[i] = best; melScore[i] = bestS; melProm[i] = cnt ? bestS / (sum / cnt) : 0;
  }

  const tracks = { mel: [], bass: [], harmony: [], drums: [] };

  // --- melody notes ---
  const E90 = percentile(melE, 0.9) || 1;
  const pitch = new Int16Array(nF).fill(-1);
  for (let i = 0; i < nF; i++) {
    if (melE[i] > E90 * D.voice && melProm[i] > D.prom && melBest[i] >= 0) pitch[i] = melBest[i];
  }
  smoothTrack(pitch);
  const melOn = pickOnsets(shortFlux, D.onsetK, 20, 0);
  tracks.mel = segment(pitch, melOn, D.minMel, i => melScore[i], shortFlux);

  // --- harmony: a second note under each melody note ---
  if (opts.harmony) {
    for (const n of tracks.mel) {
      const i = n.frame;
      const sal = melSal[i];
      let best = -1, bs = 0;
      for (let m = MEL_LO; m <= MEL_HI - 12; m++) {
        const d = Math.abs(m - n.midi);
        if (d < 3 || d % 12 === 0) continue;
        if (sal[m] > bs) { bs = sal[m]; best = m; }
      }
      if (best >= 0 && bs > 0.45 * sal[n.midi]) tracks.harmony.push({ t: n.t, dur: n.dur, midi: best, strength: bs });
    }
  }

  // --- bass notes ---
  if (opts.bass) {
    const B90 = percentile(bassE, 0.9) || 1;
    const bp = new Int16Array(nF).fill(-1);
    for (let i = 0; i < nF; i++) if (bassE[i] > B90 * D.voice * 1.5 && bassProm[i] > D.prom && bassBest[i] >= 0) bp[i] = bassBest[i];
    smoothTrack(bp);
    const bOn = pickOnsets(lowFlux, D.onsetK, 20, 0);
    tracks.bass = segment(bp, bOn, D.minBass, i => bassE[i], lowFlux);
  }

  // --- drums ---
  if (opts.drums) {
    const kinds = ['kick', 'snare', 'hat'];
    const ons = drumE.map(e => {
      const flux = new Float32Array(nF);
      for (let i = 1; i < nF; i++) flux[i] = Math.max(0, e[i] - e[i - 1]);
      return pickOnsets(flux, D.drumK, 24, 0.15);
    });
    // a snare is noisy; a melody note attack in the same band is tonal
    for (let i = 0; i < nF; i++) if (ons[1][i] && flat[i] < 0.35) ons[1][i] = 0;
    let last = -10;
    for (let i = 0; i < nF; i++) {
      const j = ons.findIndex(o => o[i]); // priority: kick > snare > hat
      if (j < 0) continue;
      const prev = tracks.drums[tracks.drums.length - 1];
      if (i - last <= 3 && prev) { if (j < kinds.indexOf(prev.kind)) prev.kind = kinds[j]; continue; } // same hit
      tracks.drums.push({ t: i * HOP_SEC, kind: kinds[j] });
      last = i;
    }
  }
  return tracks;
}

/** Fill short glitches and gaps (up to 2 frames) in a pitch track. */
function smoothTrack(p) {
  for (let len = 1; len <= 2; len++) {
    for (let i = 1; i + len < p.length; i++) {
      const a = p[i - 1];
      if (a >= 0 && p[i + len] === a) for (let j = i; j < i + len; j++) if (p[j] !== a) p[j] = a;
    }
  }
}
/** Pitch track + onsets -> note list. Note starts snap to the sharpest nearby onset in `flux`. */
function segment(p, onsets, minDur, strengthOf, flux) {
  const notes = [];
  let cur = null;
  const close = () => {
    if (cur && (cur.end - cur.start + 1) * HOP_SEC >= minDur - 1e-9) {
      notes.push({ t: cur.start * HOP_SEC, dur: (cur.end - cur.start + 1) * HOP_SEC, midi: cur.midi, frame: cur.peak, strength: cur.s });
    }
    cur = null;
  };
  for (let i = 0; i < p.length; i++) {
    if (p[i] < 0) { close(); continue; }
    const retrigger = cur && onsets[i] && i - cur.start >= 4;
    if (!cur || p[i] !== cur.midi || retrigger) {
      close();
      let st = i;
      for (let j = Math.max(0, i - 5); j <= Math.min(p.length - 1, i + 1); j++) if (flux[j] > flux[st]) st = j;
      if (notes.length && st <= Math.round((notes[notes.length - 1].t + notes[notes.length - 1].dur) / HOP_SEC) - 1) st = i;
      cur = { start: st, end: i, midi: p[i], peak: i, s: strengthOf(i) };
    }
    else { cur.end = i; const s = strengthOf(i); if (s > cur.s) { cur.s = s; cur.peak = i; } }
  }
  close();
  return notes;
}

// ---------- mapping to Minecraft ----------
/** Best whole-octave shift so most notes land in the instrument's 2-octave range, then fold the rest. */
function fitToInstrument(notes, inst, transpose) {
  const c = INSTRUMENTS[inst].center;
  if (!notes.length) return [];
  let bestShift = 0, bestIn = -1;
  for (let o = -5; o <= 5; o++) {
    const inRange = notes.filter(n => Math.abs(n.midi + transpose + o * 12 - c) <= 12).length;
    if (inRange > bestIn || (inRange === bestIn && Math.abs(o) < Math.abs(bestShift))) { bestIn = inRange; bestShift = o; }
  }
  return notes.map(n => {
    let m = n.midi + transpose + bestShift * 12;
    while (m < c - 12) m += 12;
    while (m > c + 12) m -= 12;
    return { ...n, played: m, pitch: Math.pow(2, (m - c) / 12) };
  });
}

function buildSong(tracks, s) {
  const stepSec = s.ticks * 0.1;
  const steps = new Map();
  const put = (layer, t, ev) => {
    const k = Math.max(0, Math.round(t / stepSec));
    if (!steps.has(k)) steps.set(k, []);
    const row = steps.get(k);
    if (row.some(e => e.layer === layer)) return; // one block per layer per step
    row.push({ layer, ...ev });
  };
  for (const n of fitToInstrument(tracks.mel, s.inst1, s.transpose)) put(0, n.t, { sound: s.inst1, pitch: n.pitch, midi: n.played, vol: 1 });
  if (s.mode2 === 'bass') for (const n of fitToInstrument(tracks.bass, s.inst2, s.transpose)) put(1, n.t, { sound: s.inst2, pitch: n.pitch, midi: n.played, vol: 0.9 });
  if (s.mode3 === 'harmony') for (const n of fitToInstrument(tracks.harmony, s.inst3, s.transpose)) put(2, n.t, { sound: s.inst3, pitch: n.pitch, midi: n.played, vol: 0.7 });
  if (s.mode3 === 'drums') for (const d of tracks.drums) put(2, d.t, { sound: DRUMS[d.kind], pitch: 1, drum: d.kind, vol: d.kind === 'hat' ? 0.5 : 0.8 });

  const keys = [...steps.keys()].sort((a, b) => a - b);
  let prev = null;
  const rows = keys.map(k => {
    const events = steps.get(k).sort((a, b) => a.layer - b.layer);
    const waitTicks = prev === null ? 0 : (k - prev) * s.ticks;
    prev = k;
    return { step: k, time: k * stepSec, waitTicks, events: events.map(e => ({ ...e, cmd: playsound(e, s) })) };
  });
  return { rows, stepSec, settings: s };
}

function playsound(e, s) {
  const target = s.target === 'p' ? '@p' : '@a';
  const vol = fmtPitch(e.vol);
  const tail = s.target === 'all' ? ` ${vol}` : ''; // minimumVolume: heard everywhere at this volume
  return `/playsound ${e.sound} ${target} ~ ~ ~ ${vol} ${fmtPitch(e.pitch)}${tail}`;
}

/** Repeater delays (1-4 redstone ticks each) adding up to `ticks`. */
function repeaters(ticks) {
  const out = [];
  while (ticks > 0) { const t = Math.min(4, ticks); out.push(t); ticks -= t; }
  return out;
}

/** Flat list of blocks to place, in order, with build instructions. */
function buildSteps(song) {
  const list = [];
  const chain = song.settings.build === 'chain';
  song.rows.forEach((r, ri) => {
    r.events.forEach((e, ei) => {
      let how;
      if (chain) {
        const delay = ei === 0 ? r.waitTicks * 2 : 0;
        how = ri === 0 && ei === 0 ? 'Impulse · Needs Redstone · Delay 0' : `Chain · Always Active · Delay in Ticks: ${delay}`;
      } else {
        how = ei === 0 ? 'Impulse · Needs Redstone (under the dust)' : 'Chain · Always Active (below the one above)';
      }
      list.push({ row: ri, ei, cmd: e.cmd, how, wait: ei === 0 ? r.waitTicks : 0 });
    });
  });
  return list;
}

// ---------- preview synth ----------
let actx = null, playing = [];
function ctx() { return (actx ||= new (window.AudioContext || window.webkitAudioContext)()); }
function stopAll() { playing.forEach(n => { try { n.stop(); } catch { /* already stopped */ } }); playing = []; }
function noiseBuffer(ac) {
  if (noiseBuffer.b) return noiseBuffer.b;
  const b = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return (noiseBuffer.b = b);
}
function synthNote(ac, out, e, t) {
  const g = ac.createGain();
  g.connect(out);
  if (e.drum) {
    if (e.drum === 'kick') {
      const o = ac.createOscillator();
      o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
      g.gain.setValueAtTime(0.9 * e.vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      o.connect(g); o.start(t); o.stop(t + 0.2); playing.push(o);
    } else {
      const n = ac.createBufferSource(); n.buffer = noiseBuffer(ac);
      const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = e.drum === 'hat' ? 7000 : 1500;
      const len = e.drum === 'hat' ? 0.05 : 0.14;
      g.gain.setValueAtTime(0.5 * e.vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + len);
      n.connect(f); f.connect(g); n.start(t); n.stop(t + len + 0.02); playing.push(n);
    }
    return;
  }
  const kind = INSTRUMENTS[e.sound].synth;
  const o = ac.createOscillator();
  o.frequency.value = midiToHz(e.midi);
  o.type = { pluck: 'triangle', square: 'square', soft: 'sine', bell: 'sine', bass: 'sawtooth' }[kind];
  const len = { pluck: 0.5, square: 0.25, soft: 0.45, bell: 0.9, bass: 0.45 }[kind];
  const peak = (kind === 'square' ? 0.12 : kind === 'bass' ? 0.25 : 0.35) * e.vol;
  let node = o;
  if (kind === 'bass') { const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700; o.connect(f); node = f; }
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0005, t + len);
  node.connect(g); o.start(t); o.stop(t + len + 0.05); playing.push(o);
}
function playPreview() {
  if (!state.song) return;
  stopAll();
  const ac = ctx(); ac.resume();
  const master = ac.createGain(); master.gain.value = 0.8; master.connect(ac.destination);
  const t0 = ac.currentTime + 0.1;
  for (const r of state.song.rows) for (const e of r.events) synthNote(ac, master, e, t0 + r.time);
}
function playOriginal() {
  if (!state.buffer) return;
  stopAll();
  const ac = ctx(); ac.resume();
  const src = ac.createBufferSource(); src.buffer = state.buffer; src.connect(ac.destination);
  src.start(0, state.settings.start, state.settings.length); playing.push(src);
}

// ---------- UI ----------
const state = { buffer: null, mono: null, fileName: '', song: null, steps: [], pos: 0, settings: null };

function segValue(id) { return $(`#${id} button.active`).dataset.v; }
function readSettings() {
  return {
    start: Math.max(0, +$('#start').value || 0),
    length: Math.max(1, +$('#length').value || 20),
    detail: +segValue('detail'),
    ticks: +segValue('ticks'),
    inst1: $('#inst1').value, inst2: $('#inst2').value, inst3: $('#inst3').value,
    mode2: segValue('mode2'), mode3: segValue('mode3'),
    transpose: Math.max(-12, Math.min(12, Math.round(+$('#transpose').value || 0))),
    target: $('#target').value,
    build: segValue('build'),
  };
}

function fillInstruments() {
  const opts = (sel, keys) => keys.map(k => `<option value="${k}" ${k === sel ? 'selected' : ''}>${esc(INSTRUMENTS[k].label)} (${k})</option>`).join('');
  const all = Object.keys(INSTRUMENTS);
  $('#inst1').innerHTML = opts('note.harp', all);
  $('#inst2').innerHTML = opts('note.bass', all);
  $('#inst3').innerHTML = opts('note.bell', all);
  syncLayers();
}
function syncLayers() {
  $('#inst2').disabled = segValue('mode2') === 'off';
  const m3 = segValue('mode3');
  $('#inst3').disabled = m3 !== 'harmony';
  $('#inst3').title = m3 === 'drums' ? 'Drums use note.bd (kick), note.snare and note.hat' : '';
}

async function loadFile(file) {
  if (!file) return;
  $('#status').textContent = 'Reading song…';
  try {
    const data = await file.arrayBuffer();
    const buffer = await ctx().decodeAudioData(data);
    state.buffer = buffer;
    state.fileName = file.name;
    // resample + mix down to mono at SR
    const len = Math.ceil(Math.min(buffer.duration, MAX_SECONDS + 600) * SR);
    const off = new OfflineAudioContext(1, len, SR);
    const src = off.createBufferSource(); src.buffer = buffer; src.connect(off.destination); src.start();
    state.mono = (await off.startRendering()).getChannelData(0);
    $('#drop').classList.add('loaded');
    $('#dropText').innerHTML = `&#9835; <b>${esc(file.name)}</b>`;
    $('#songInfo').textContent = `Song length: ${fmtTime(buffer.duration)}. Every note becomes a command block, so start with 10–30 seconds.`;
    $('#length').value = Math.min(+$('#length').value || 20, Math.floor(buffer.duration));
    $('#convert').disabled = false;
    $('#status').textContent = '';
  } catch (err) {
    $('#status').textContent = 'Could not read that file: ' + (err.message || err) + '. Try a different MP3.';
  }
}
const fmtTime = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function convert() {
  if (!state.mono) return;
  const s = readSettings();
  if (s.length > MAX_SECONDS) { s.length = MAX_SECONDS; $('#length').value = MAX_SECONDS; }
  const a = Math.floor(s.start * SR), b = Math.min(state.mono.length, Math.floor((s.start + s.length) * SR));
  if (b - a < SR * 0.5) { $('#status').textContent = 'That part of the song is too short (or past the end).'; return; }
  s.length = (b - a) / SR;
  state.settings = s;
  $('#status').textContent = 'Listening…';
  setTimeout(() => {
    const t0 = performance.now();
    const tracks = analyze(state.mono.subarray(a, b), { detail: s.detail, bass: s.mode2 === 'bass', drums: s.mode3 === 'drums', harmony: s.mode3 === 'harmony' });
    state.tracks = tracks;
    state.song = buildSong(tracks, s);
    state.steps = buildSteps(state.song);
    state.pos = 0;
    $('#status').textContent = `Done in ${((performance.now() - t0) / 1000).toFixed(1)} s.`;
    renderResult();
  }, 20);
}

function renderResult() {
  const song = state.song, s = song.settings;
  const blocks = state.steps.length;
  const repeaterCount = song.rows.reduce((a, r) => a + repeaters(r.waitTicks).length, 0);
  const layers = [
    `Melody: ${INSTRUMENTS[s.inst1].label}`,
    s.mode2 === 'bass' ? `Bass: ${INSTRUMENTS[s.inst2].label}` : null,
    s.mode3 === 'drums' ? 'Drums: kick / snare / hat' : s.mode3 === 'harmony' ? `Harmony: ${INSTRUMENTS[s.inst3].label}` : null,
  ];
  const chain = s.build === 'chain';
  $('#result').innerHTML = `
    <div class="card">
      <div class="row"><h2 style="margin:0">${esc(state.fileName)}</h2><span class="spacer"></span>
        <button id="pOrig">&#9654; Original</button><button class="primary" id="pPrev">&#9654; Minecraft preview</button><button id="pStop">&#9632; Stop</button></div>
      <div class="stats" style="margin-top:10px">
        <div class="stat"><b>${blocks}</b><span>command blocks</span></div>
        ${chain ? '' : `<div class="stat"><b>${repeaterCount}</b><span>repeaters</span></div>`}
        <div class="stat"><b>${song.rows.length}</b><span>steps</span></div>
        <div class="stat"><b>${s.length.toFixed(1)} s</b><span>from ${s.start}s</span></div>
      </div>
      <canvas class="roll" id="roll"></canvas>
      <div class="legend-row">${layers.map((l, i) => l ? `<span><i class="swatch" style="background:${LAYER_COLORS[i]}"></i>${esc(l)}</span>` : '').join('')}</div>
      ${blocks > 1500 ? `<p class="hint" style="color:var(--warn)">&#9888; That's a lot of blocks. Try a shorter part, "Simple tune", or the 2-tick grid.</p>` : ''}
    </div>

    <div class="card">
      <h2>How to build it</h2>
      ${chain ? `<ol class="steps">
          <li>Place command blocks in <b>one straight line</b>, each arrow pointing to the next.</li>
          <li>The first block is <b>Impulse · Needs Redstone</b> with a button on it. All the others are <b>Chain · Always Active</b>.</li>
          <li>Set each block's <b>Delay in Ticks</b> to the number shown (game ticks: 2 per repeater tick).</li>
        </ol>` : `<ol class="steps">
          <li>Run one line of redstone: <b>button → dust → repeaters → dust → repeaters …</b></li>
          <li>Each step is a column under a piece of dust: the top block is <b>Impulse · Needs Redstone</b>, facing down.
            Extra layers go straight below it as <b>Chain · Always Active</b> blocks, also facing down (max 3 per column).</li>
          <li>Between columns, place the repeaters listed in <span class="wait">Wait</span>. Each repeater holds 1–4 ticks (right-click to change).</li>
        </ol>`}
      <p class="hint">Turn on cheats first. In Creative, get a command block with <span class="code">/give @s command_block</span>.</p>
    </div>

    <div class="card quick">
      <div class="row"><h2 style="margin:0">Copy next</h2><span class="spacer"></span>
        <span class="hint">Shortcut: <span class="kbd">Space</span> copy next · <span class="kbd">Backspace</span> go back</span></div>
      <div id="quick"></div>
    </div>

    <div class="card">
      <div class="row"><h2 style="margin:0">All commands</h2><span class="spacer"></span>
        <button class="small" id="dlTxt">Download as .txt</button></div>
      <div class="table-wrap" style="margin-top:10px"><table class="steps-table"><thead><tr><th>#</th><th>Time</th><th>Wait</th><th>Command block(s)</th></tr></thead>
      <tbody>${song.rows.map((r, i) => `<tr data-row="${i}"><td>${i + 1}</td><td>${r.time.toFixed(1)}s</td>
        <td class="wait">${waitText(r.waitTicks, chain, i)}</td>
        <td>${r.events.map(e => `<div class="c"><i class="swatch" style="background:${LAYER_COLORS[e.layer]}"></i><code>${esc(e.cmd)}</code><button class="small" data-copy="${esc(e.cmd)}">Copy</button></div>`).join('')}</td></tr>`).join('')}
      </tbody></table></div>
    </div>`;
  $('#pOrig').onclick = playOriginal;
  $('#pPrev').onclick = playPreview;
  $('#pStop').onclick = stopAll;
  $('#dlTxt').onclick = downloadTxt;
  drawRoll();
  renderQuick();
}

function waitText(ticks, chain, i) {
  if (i === 0) return 'start';
  if (chain) return `Delay ${ticks * 2}`;
  return `${repeaters(ticks).join(' + ')} <span class="hint">(${ticks} tick${ticks > 1 ? 's' : ''})</span>`;
}

function renderQuick() {
  const q = $('#quick');
  if (!q) return;
  const st = state.steps, chain = state.song.settings.build === 'chain';
  if (!st.length) { q.innerHTML = '<p>No notes were found. Try "Detailed" or a louder part of the song.</p>'; return; }
  const p = Math.min(state.pos, st.length - 1);
  const it = st[p];
  const row = state.song.rows[it.row];
  let before = '';
  if (it.ei === 0 && it.row > 0) {
    before = chain ? `Set <b>Delay in Ticks: ${it.wait * 2}</b>` :
      `First place repeater${repeaters(it.wait).length > 1 ? 's' : ''}: <b>${repeaters(it.wait).join(' + ')}</b> tick${it.wait > 1 ? 's' : ''}, then dust`;
  }
  q.innerHTML = `
    <div class="now">Block <b>${p + 1}</b> of ${st.length} · step ${it.row + 1} · ${row.time.toFixed(1)} s
      ${row.events.length > 1 ? `· block ${it.ei + 1} of ${row.events.length} in this column` : ''}</div>
    ${before ? `<div class="wait">${before}</div>` : ''}
    <div>${esc(it.how)}</div>
    <code class="cmd">${esc(it.cmd)}</code>
    <div class="row">
      <button id="qBack" ${p === 0 ? 'disabled' : ''}>&larr; Back</button>
      <button class="primary" id="qCopy">Copy ${state.pos > 0 && state.copiedPos === p ? 'again' : 'this'} &amp; next &rarr;</button>
      <button id="qReset">Restart</button>
    </div>
    <div class="bar"><div style="width:${(p / st.length) * 100}%"></div></div>`;
  $('#qCopy').onclick = quickCopy;
  $('#qBack').onclick = () => { state.pos = Math.max(0, state.pos - 1); renderQuick(); };
  $('#qReset').onclick = () => { state.pos = 0; renderQuick(); };
  $$('.steps-table tr.current').forEach(r => r.classList.remove('current'));
  const tr = document.querySelector(`.steps-table tr[data-row="${it.row}"]`);
  if (tr) tr.classList.add('current');
}
function quickCopy() {
  const st = state.steps;
  if (!st.length) return;
  const p = Math.min(state.pos, st.length - 1);
  copyText(st[p].cmd);
  state.copiedPos = p;
  toast(p === st.length - 1 ? 'Copied the last block!' : `Copied block ${p + 1}`);
  if (p < st.length - 1) state.pos = p + 1;
  renderQuick();
}

function drawRoll() {
  const cv = $('#roll');
  const dpr = window.devicePixelRatio || 1;
  const w = cv.clientWidth, h = cv.clientHeight;
  cv.width = w * dpr; cv.height = h * dpr;
  const g = cv.getContext('2d');
  g.scale(dpr, dpr);
  const rows = state.song.rows;
  const total = Math.max(1, state.song.settings.length);
  const pitched = rows.flatMap(r => r.events.filter(e => !e.drum).map(e => e.midi));
  const lo = Math.min(...pitched, 40) - 1, hi = Math.max(...pitched, 80) + 1;
  const drumH = 14;
  const y = m => (h - drumH - 4) - ((m - lo) / (hi - lo)) * (h - drumH - 10);
  g.strokeStyle = '#22252b';
  for (let m = Math.ceil(lo / 12) * 12; m <= hi; m += 12) { g.beginPath(); g.moveTo(0, y(m)); g.lineTo(w, y(m)); g.stroke(); g.fillStyle = '#555'; g.font = '10px sans-serif'; g.fillText(noteName(m), 2, y(m) - 2); }
  const bw = Math.max(2, (w / total) * state.song.stepSec * 0.9);
  for (const r of rows) for (const e of r.events) {
    const x = (r.time / total) * w;
    g.fillStyle = LAYER_COLORS[e.layer];
    if (e.drum) g.fillRect(x, h - drumH + ({ kick: 8, snare: 4, hat: 0 }[e.drum]), bw, 4);
    else g.fillRect(x, y(e.midi) - 2, bw, 4);
  }
}

function downloadTxt() {
  const song = state.song, chain = song.settings.build === 'chain';
  const out = [`Bedrock Music Maker: ${state.fileName} (${song.settings.start}s, ${song.settings.length.toFixed(1)}s)`,
    chain ? 'Chain command blocks in a line. First = Impulse/Needs Redstone, rest = Chain/Always Active. "Delay" = Delay in Ticks.'
      : 'Redstone line with repeaters. Each step = a column under the dust: top Impulse/Needs Redstone, extra layers Chain/Always Active below.', ''];
  song.rows.forEach((r, i) => {
    const wait = i === 0 ? 'start' : chain ? `delay ${r.waitTicks * 2}` : `repeaters ${repeaters(r.waitTicks).join('+')}`;
    out.push(`#${i + 1}  ${r.time.toFixed(1)}s  [${wait}]`);
    r.events.forEach(e => out.push('    ' + e.cmd));
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([out.join('\r\n')], { type: 'text/plain' }));
  a.download = (state.fileName.replace(/\.[^.]+$/, '') || 'song') + '_commands.txt';
  document.body.appendChild(a); a.click(); a.remove();
}

function init() {
  fillInstruments();
  $$('.seg').forEach(seg => seg.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    seg.querySelectorAll('button').forEach(x => x.classList.toggle('active', x === b));
    syncLayers();
  }));
  $('#file').onchange = e => loadFile(e.target.files[0]);
  const drop = $('#drop');
  drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('over'); loadFile(e.dataTransfer.files[0]); });
  $('#convert').onclick = convert;
  $('#result').addEventListener('click', e => {
    const b = e.target.closest('[data-copy]');
    if (b) { copyText(b.dataset.copy); toast('Copied!'); }
  });
  document.addEventListener('keydown', e => {
    if (!state.steps.length || ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
    if (e.code === 'Space') { e.preventDefault(); quickCopy(); }
    if (e.code === 'Backspace') { e.preventDefault(); state.pos = Math.max(0, state.pos - 1); renderQuick(); }
  });
  window.addEventListener('resize', () => state.song && drawRoll());
}

// exposed for automated tests
window.MM = { state, analyze, buildSong, buildSteps, repeaters, fitToInstrument, INSTRUMENTS, SR };
init();
