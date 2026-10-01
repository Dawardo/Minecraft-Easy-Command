/* Bedrock Music Maker
 * MIDI -> Minecraft BEDROCK Edition command block /playsound commands.
 *   /playsound <sound> [player] [x y z] [volume] [pitch] [minimumVolume]
 * Note block sounds play two octaves: pitch 0.5 .. 2.0 around the instrument's centre note.
 * Runs in the browser; MIDI parsing by @tonejs/midi (web/vendor/vendor.js).
 */
'use strict';

const MAX_SECONDS = 300;

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
// "Every note": instruments that together cover MIDI 30..102 (F#1..F#7) at exact pitch, two octaves each
const COVER = ['note.harp', 'note.bass', 'note.guitar', 'note.flute', 'note.bell'];
/** The first instrument (yours first, then COVER) whose two octaves hold this note, so it plays at its real pitch.
 *  Only notes outside every range (below F#1, above F#7) move by octaves. */
function exactInstrument(m, prefs) {
  while (m < 30) m += 12;
  while (m > 102) m -= 12;
  const sound = [...prefs, ...COVER].find(k => Math.abs(m - INSTRUMENTS[k].center) <= 12);
  return { sound, midi: m, pitch: Math.pow(2, (m - INSTRUMENTS[sound].center) / 12) };
}
const LAYER_COLORS = ['#5dbb63', '#5a9be5', '#e0b341'];

// ---------- helpers ----------
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const midiToHz = m => 440 * Math.pow(2, (m - 69) / 12);
const fmtDuration = sec => (sec >= 3600 ? `${Math.floor(sec / 3600)} h ${Math.round((sec % 3600) / 60)} min` : `${Math.max(1, Math.round(sec / 60))} min`);
const fmtTime = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
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
  // Game ticks per step. Repeaters and chain delays are tied to the repeater grid (1 repeater tick =
  // 2 game ticks), but in the slab every block has its own Delay in Ticks, so it can use single game
  // ticks: 0.05 s, half the error of the finest repeater grid.
  const stepTicks = s.build === 'slab' ? 1 : s.ticks * 2;
  const stepSec = stepTicks / 20;
  const steps = new Map();
  const stepOf = t => Math.max(0, Math.round(t / stepSec));
  const put = (layer, t, ev) => {
    const k = stepOf(t);
    if (!steps.has(k)) steps.set(k, []);
    const row = steps.get(k);
    if (row.some(e => e.layer === layer)) return; // one block per layer per step (first one wins)
    row.push({ layer, ...ev });
  };
  // chords (e.g. from a MIDI piano part): melody keeps the top note, bass the bottom note
  const byPitch = (notes, dir) => [...notes].sort((a, b) => a.t - b.t || dir * (a.midi - b.midi));
  if (s.detail === 'full') {
    // Every note: each note of every track at its exact pitch (only exact repeats on the same tick merge).
    // Layer = colour only: 0 = notes from F#3 up, 1 = low notes, 2 = drums. The top note of a chord is loudest.
    const prefs = [s.inst1, ...(s.mode2 === 'bass' ? [s.inst2] : []), s.inst3];
    const top = new Map();
    for (const n of tracks.all) top.set(stepOf(n.t), Math.max(top.get(stepOf(n.t)) ?? -1, n.midi));
    for (const n of tracks.all) {
      const m = n.midi + s.transpose;
      if (m < 54 && s.mode2 !== 'bass') continue;   // bass switched off: no low notes
      const p = exactInstrument(m, prefs), k = stepOf(n.t);
      if (!steps.has(k)) steps.set(k, []);
      const row = steps.get(k);
      if (row.some(e => e.sound === p.sound && e.midi === p.midi)) continue;
      row.push({ layer: m < 54 ? 1 : 0, ...p, orig: n.midi, vol: n.midi === top.get(k) ? 1 : m < 54 ? 0.9 : 0.75 });
    }
    if (s.mode3 === 'drums' || s.mode3 === 'auto') {
      for (const d of tracks.drums) {
        const k = stepOf(d.t);
        if (!steps.has(k)) steps.set(k, []);
        if (steps.get(k).some(e => e.drum === d.kind)) continue;
        steps.get(k).push({ layer: 2, sound: DRUMS[d.kind], pitch: 1, drum: d.kind, vol: d.kind === 'hat' ? 0.5 : 0.8 });
      }
    }
  } else {
  for (const n of fitToInstrument(byPitch(tracks.mel, -1), s.inst1, s.transpose)) put(0, n.t, { sound: s.inst1, pitch: n.pitch, midi: n.played, orig: n.midi, vol: 1 });
  if (s.mode2 === 'bass') for (const n of fitToInstrument(byPitch(tracks.bass, 1), s.inst2, s.transpose)) put(1, n.t, { sound: s.inst2, pitch: n.pitch, midi: n.played, orig: n.midi, vol: 0.9 });
  // layer 3: drums where the song has drums; harmony fills the rest (in "auto"), or one of them only
  if (s.mode3 === 'drums' || s.mode3 === 'auto') {
    for (const d of tracks.drums) put(2, d.t, { sound: DRUMS[d.kind], pitch: 1, drum: d.kind, vol: d.kind === 'hat' ? 0.5 : 0.8 });
  }
  if (s.mode3 === 'harmony' || s.mode3 === 'auto') {
    for (const n of fitToInstrument(byPitch(tracks.harmony, -1), s.inst3, s.transpose)) {
      const mel = steps.get(stepOf(n.t))?.find(e => e.layer === 0);
      if (mel && (n.midi >= mel.orig || (mel.orig - n.midi) % 12 === 0)) continue; // harmony sits below the tune, not doubling it
      put(2, n.t, { sound: s.inst3, pitch: n.pitch, midi: n.played, orig: n.midi, vol: 0.7 });
    }
  }
  }

  const keys = [...steps.keys()].sort((a, b) => a - b);
  let prev = null;
  const rows = keys.map(k => {
    const events = steps.get(k).sort((a, b) => a.layer - b.layer || (b.midi ?? 0) - (a.midi ?? 0));
    const waitTicks = prev === null ? 0 : (k - prev) * stepTicks / 2;   // repeater ticks (repeater and chain styles)
    prev = k;
    return { step: k, time: k * stepSec, waitTicks, events: events.map(e => ({ ...e, cmd: playsound(e, s) })) };
  });
  return { rows, stepSec, stepTicks, settings: s };
}

function playsound(e, s) {
  const target = s.target === 'p' ? '@p' : '@a';
  const vol = fmtPitch(e.vol);
  const tail = s.target === 'all' ? ` ${vol}` : ''; // minimumVolume: heard everywhere at this volume
  return `/playsound ${e.sound} ${target} ~ ~ ~ ${vol} ${fmtPitch(e.pitch)}${tail}`;
}

/** A step's time: 0.05 s steps (slab) need two decimals, 0.1 s steps one. */
const fmtStepTime = (t, s) => t.toFixed(s.build === 'slab' ? 2 : 1);

/** Repeater delays (1-4 redstone ticks each) adding up to `ticks`. */
function repeaters(ticks) {
  const out = [];
  while (ticks > 0) { const t = Math.min(4, ticks); out.push(t); ticks -= t; }
  return out;
}

const FILL_LIMIT = 32768;    // Bedrock /fill: max blocks per command
const MAX_DELAY = 99999;     // Bedrock command block "Delay in Ticks" limit

/**
 * Slab layout: every note is an Impulse command block with Delay in Ticks = its time.
 * Command layers are stacked upward in pairs around a glass layer: C G C C G C …
 * Start = one /fill that swaps all glass for redstone blocks, so every block is powered on the same tick.
 */
function slabLayout(song) {
  const s = song.settings, { x, y, z, w, d } = s.slab;
  const first = song.rows.length ? song.rows[0].step : 0;
  const notes = song.rows.flatMap(r => r.events.map(e => ({ cmd: e.cmd, delay: (r.step - first) * song.stepTicks, time: r.time, layer: e.layer })));
  const per = w * d, layers = Math.max(1, Math.ceil(notes.length / per));
  const cmdY = k => y + Math.floor(k / 2) * 3 + (k % 2) * 2;
  const levels = [];
  for (let k = 0; k < layers; k++) {
    levels.push({ y: cmdY(k), kind: 'command' });
    if (k % 2 === 0) levels.push({ y: cmdY(k) + 1, kind: 'glass' });
  }
  levels.sort((a, b) => a.y - b.y);
  const height = levels[levels.length - 1].y - y + 1;
  const x2 = x + w - 1, z2 = z + d - 1, y2 = y + height - 1;
  const box = `${x} ${y} ${z} ${x2} ${y2} ${z2}`;
  for (const l of levels) l.fill = `/fill ${x} ${l.y} ${z} ${x2} ${l.y} ${z2} ${l.kind === 'command' ? 'command_block' : 'glass'}`;
  const blocks = notes.map((n, i) => {
    const k = Math.floor(i / per), j = i % per;
    return { ...n, x: x + (j % w), y: cmdY(k), z: z + Math.floor(j / w) };
  });
  const volume = w * d * height;
  // clearing the space (plus 3 blocks of headroom for the builder), split to respect the /fill limit
  const sliceH = Math.max(1, Math.floor(FILL_LIMIT / per));
  const clear = [];
  for (let a = y; a <= y2 + 3; a += sliceH) clear.push(`/fill ${x} ${a} ${z} ${x2} ${Math.min(y2 + 3, a + sliceH - 1)} ${z2} air`);
  const problems = [];
  if (volume > FILL_LIMIT) problems.push(`The slab is ${volume} blocks; Bedrock's /fill can only do ${FILL_LIMIT} at once, so Start would need several commands. Use a shorter part of the song.`);
  const maxDelay = notes.reduce((m, n) => Math.max(m, n.delay), 0);
  if (maxDelay > MAX_DELAY) problems.push(`The last note needs Delay ${maxDelay}, but Bedrock allows at most ${MAX_DELAY} (about 83 minutes).`);
  if (y < -64 || y2 + 3 > 319) problems.push(`The slab goes from Y ${y} to ${y2}; Bedrock worlds only go from -64 to 319. Change the corner Y.`);
  const name = (state.fileName.replace(/\.[^.]+$/, '').replace(/[^A-Za-z0-9]+/g, '_').slice(0, 24) || 'song');
  return {
    blocks, levels, layers, height, volume, box, maxDelay, problems, clear,
    start: `/fill ${box} redstone_block replace glass`,
    stop: `/fill ${box} glass replace redstone_block`,
    tickingArea: `/tickingarea add ${x} ${y} ${z} ${x2} ${y2} ${z2} ${name}`,
    gamerule: '/gamerule commandblockoutput false',
  };
}

/** Flat list of blocks to place, in order, with build instructions. */
function buildSteps(song) {
  const list = [];
  if (song.settings.build === 'slab') {
    song.slab = slabLayout(song);
    let i = 0;
    song.rows.forEach((r, ri) => r.events.forEach((e, ei) => {
      const b = song.slab.blocks[i++];
      list.push({ row: ri, ei, cmd: e.cmd, how: `Impulse · Needs Redstone · Delay in Ticks: ${b.delay}`, wait: 0, pos: b, delay: b.delay });
    }));
    return list;
  }
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

// ---------- snip editor: choose the part of the song on a timeline ----------
const snip = { drag: null };
const SNAP = 0.1;
function snipRange() {
  const s = Math.max(0, +$('#start').value || 0);
  return [s, s + Math.max(1, +$('#length').value || 20)];
}
/** Draws the whole song (note density, tune in green), the chosen part, and the playhead. */
function drawSnip() {
  const cv = $('#snip');
  if (!cv || !state.midi) return;
  const dur = Math.max(1, state.midi.midi.duration);
  const w = cv.clientWidth, h = cv.clientHeight, dpr = window.devicePixelRatio || 1;
  if (!w) return;
  cv.width = w * dpr; cv.height = h * dpr;
  const g = cv.getContext('2d'); g.scale(dpr, dpr);
  const css = getComputedStyle(document.documentElement), col = n => css.getPropertyValue(n).trim();
  g.fillStyle = col('--panel2'); g.fillRect(0, 0, w, h);
  // note density per pixel column
  const bins = Math.max(1, Math.floor(w)), all = new Float32Array(bins), tune = new Float32Array(bins);
  const lead = state.midi.leadRank[0];
  for (const t of state.midi.tracks) for (const n of t.notes) {
    const b = Math.min(bins - 1, Math.floor((n.time / dur) * bins));
    all[b]++; if (t === lead) tune[b]++;
  }
  let max = 1; for (const v of all) max = Math.max(max, v);
  const barH = v => Math.sqrt(v / max) * (h - 16);
  for (let i = 0; i < bins; i++) {
    if (all[i]) { g.fillStyle = col('--muted'); g.globalAlpha = 0.45; g.fillRect(i, h - 14 - barH(all[i]), 1, barH(all[i])); }
    if (tune[i]) { g.fillStyle = col('--accent'); g.globalAlpha = 0.9; g.fillRect(i, h - 14 - barH(tune[i]), 1, barH(tune[i])); }
  }
  g.globalAlpha = 1;
  // time marks along the bottom
  const every = [5, 10, 15, 30, 60, 120].find(x => (x / dur) * w >= 46) || 300;
  g.fillStyle = col('--muted'); g.font = '10px sans-serif'; g.textBaseline = 'bottom';
  for (let t = 0; t <= dur; t += every) { const x = (t / dur) * w; g.fillRect(x, h - 13, 1, 3); g.fillText(fmtTime(t), x + 2, h); }
  // chosen part: everything outside it is dimmed
  const [s, e] = snipRange(), x0 = (s / dur) * w, x1 = Math.min(w, (e / dur) * w);
  g.fillStyle = col('--bg'); g.globalAlpha = 0.65;
  g.fillRect(0, 0, x0, h - 14); g.fillRect(x1, 0, w - x1, h - 14);
  g.globalAlpha = 1; g.fillStyle = col('--accent');
  g.fillRect(x0 - 1, 0, 3, h - 14); g.fillRect(x1 - 2, 0, 3, h - 14);
  g.fillRect(x0 - 4, 0, 9, 6); g.fillRect(x1 - 5, 0, 9, 6);
  if (player.pos !== null) { g.fillStyle = col('--text'); g.fillRect(((s + player.pos) / dur) * w, 0, 2, h - 14); }
  $('#snipInfo').textContent = `${fmtTime(s)}.${Math.round((s % 1) * 10)} → ${fmtTime(e)}.${Math.round((e % 1) * 10)} · ${(e - s).toFixed(1)} s`;
}
/** Writes start/length into the inputs (snapped, kept inside the song and 1..MAX_SECONDS long). */
function setSnip(s, e) {
  const dur = state.midi.midi.duration, snap = v => Math.round(v / SNAP) * SNAP;
  s = Math.max(0, Math.min(snap(s), dur - 1)); e = Math.min(dur, Math.max(snap(e), s + 1));
  if (e - s > MAX_SECONDS) e = s + MAX_SECONDS;
  $('#start').value = +s.toFixed(1); $('#length').value = +(e - s).toFixed(1);
  drawSnip();
}
function initSnip() {
  const cv = $('#snip');
  const timeAt = ev => { const r = cv.getBoundingClientRect(); return Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)) * state.midi.midi.duration; };
  cv.addEventListener('pointerdown', ev => {
    if (!state.midi) return;
    const r = cv.getBoundingClientRect(), dur = state.midi.midi.duration, [s, e] = snipRange();
    const px = t => (t / dur) * r.width, x = ev.clientX - r.left, t = timeAt(ev);
    if (Math.abs(x - px(s)) <= 8) snip.drag = { kind: 'start' };
    else if (Math.abs(x - px(e)) <= 8) snip.drag = { kind: 'end' };
    else if (t > s && t < e && e - s < dur - SNAP) snip.drag = { kind: 'move', off: t - s, len: e - s };   // whole song chosen: drag picks a new part
    else snip.drag = { kind: 'new', anchor: t };
    cv.setPointerCapture(ev.pointerId);
  });
  cv.addEventListener('pointermove', ev => {
    if (!snip.drag) return;
    const t = timeAt(ev), [s, e] = snipRange(), d = snip.drag;
    if (d.kind === 'start') setSnip(Math.min(t, e - 1), e);
    else if (d.kind === 'end') setSnip(s, t);
    else if (d.kind === 'move') { const ns = Math.max(0, Math.min(t - d.off, state.midi.midi.duration - d.len)); setSnip(ns, ns + d.len); }
    else setSnip(Math.min(d.anchor, t), Math.max(d.anchor, t));
  });
  const done = () => {
    if (!snip.drag) return;
    snip.drag = null;
    $('#start').dispatchEvent(new Event('change', { bubbles: true }));   // update the result once, on release
  };
  cv.addEventListener('pointerup', done);
  cv.addEventListener('pointercancel', done);
  $('#snipPlay').onclick = () => play('original');
  $('#snipStop').onclick = stopAll;
  // position slider: dragging it rewinds or skips; if something was playing it goes on from there on release
  const seek = $('#seek');
  seek.addEventListener('input', () => {
    if (player.kind && !player.seeking) { player.seeking = player.kind; stopSound(); cancelAnimationFrame(player.raf); player.kind = null; }
    player.pos = +seek.value; showPos();
  });
  seek.addEventListener('change', () => {
    const resume = player.seeking; player.seeking = null;
    if (resume) play(resume, +seek.value);
  });
  $('#start').addEventListener('input', () => drawSnip());
  $('#length').addEventListener('input', () => drawSnip());
}

// ---------- preview synth ----------
let actx = null, playing = [];
function ctx() { return (actx ||= new (window.AudioContext || window.webkitAudioContext)()); }
function stopSound() { playing.forEach(n => { try { n.stop(); } catch { /* already stopped */ } }); playing = []; }
/** Stop: the position stays where it is, so Play goes on from there (drag the slider back to rewind). */
function stopAll() {
  stopSound();
  cancelAnimationFrame(player.raf); player.kind = null;
  showPos();
}

// ---------- player: what's playing, how far along it is, and seeking ----------
// pos = seconds into the chosen part (null = at the start, nothing played yet)
const player = { kind: null, from: 0, t0: 0, raf: 0, pos: null, seeking: null };
const fmtPos = t => `${fmtTime(t)}.${Math.floor((t % 1) * 10)}`;
function showPos() {
  const len = state.settings ? state.settings.length : 0, seek = $('#seek');
  if (!seek) return;
  seek.max = Math.max(0.1, len);
  if (!player.seeking) seek.value = player.pos ?? 0;
  $('#seekTime').textContent = `${fmtPos(player.pos ?? 0)} / ${fmtPos(len)}`;
  drawSnip();
}
/** Plays the chosen part from `from` seconds in: 'original' = every MIDI track, 'preview' = the Minecraft notes. */
function play(kind, from = player.pos ?? 0) {
  if (!state.settings || (kind === 'preview' && !state.song)) return;
  const len = state.settings.length;
  if (from >= len - 0.05) from = 0;   // at the end: start again
  stopSound(); cancelAnimationFrame(player.raf);
  const ac = ctx(); ac.resume();
  const master = ac.createGain(); master.connect(ac.destination);
  const t0 = ac.currentTime + 0.1;
  if (kind === 'original') {
    master.gain.value = 0.5;
    const s = state.settings;
    for (const t of state.midi.tracks) for (const n of t.notes) {
      const at = n.time - s.start;
      if (at < from || at >= len) continue;
      const e = t.drums ? { drum: gmDrum(n.midi), vol: 0.6 } : { sound: 'note.harp', midi: n.midi, vol: 0.4 };
      synthNote(ac, master, e, t0 + at - from);
    }
  } else {
    master.gain.value = 0.8;
    for (const r of state.song.rows) if (r.time >= from) for (const e of r.events) synthNote(ac, master, e, t0 + r.time - from);
  }
  Object.assign(player, { kind, from, t0, pos: from });
  const tick = () => {
    const p = player.from + Math.max(0, ctx().currentTime - player.t0);
    if (p >= len) { player.kind = null; player.pos = null; showPos(); return; }   // finished: back to the start
    player.pos = p; showPos();
    player.raf = requestAnimationFrame(tick);
  };
  player.raf = requestAnimationFrame(tick);
}
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

// ---------- UI ----------
const state = { midi: null, fileName: '', song: null, steps: [], pos: 0, settings: null, version: 0 };

function segValue(id) { return $(`#${id} button.active`).dataset.v; }
function readSettings() {
  const src = id => ($(id).value === 'auto' ? 'auto' : +$(id).value);
  return {
    start: Math.max(0, +$('#start').value || 0),
    length: Math.max(1, +$('#length').value || 20),
    ticks: +segValue('ticks'),
    inst1: $('#inst1').value, inst2: $('#inst2').value, inst3: $('#inst3').value,
    src1: src('#src1'), src2: src('#src2'), src3: src('#src3'),
    mode2: $('#on2').checked ? 'bass' : 'off',
    mode3: $('#on3').checked ? $('#mode3').value : 'off',
    transpose: Math.max(-12, Math.min(12, Math.round(+$('#transpose').value || 0))),
    target: $('#target').value,
    build: segValue('build'),
    detail: segValue('detail'),
    slab: {
      x: Math.round(+$('#slabX').value || 0), y: Math.round(+$('#slabY').value || 0), z: Math.round(+$('#slabZ').value || 0),
      w: Math.max(1, Math.min(64, Math.round(+$('#slabW').value || 16))), d: Math.max(1, Math.min(64, Math.round(+$('#slabD').value || 16))),
    },
  };
}

function fillInstruments() {
  const opts = (sel, keys) => keys.map(k => `<option value="${k}" ${k === sel ? 'selected' : ''}>${esc(INSTRUMENTS[k].label)} (${k})</option>`).join('');
  const all = Object.keys(INSTRUMENTS);
  $('#inst1').innerHTML = opts('note.harp', all);
  $('#inst2').innerHTML = opts('note.bass', all);
  $('#inst3').innerHTML = opts('note.guitar', all);
  syncLayers();
}
/** Grey out what a switched-off layer doesn't use, and show ON/OFF in words. */
function syncLayers() {
  document.body.classList.toggle('slab-mode', segValue('build') === 'slab');
  document.body.classList.toggle('full-mode', segValue('detail') === 'full');
  const on2 = $('#on2').checked, on3 = $('#on3').checked, m3 = $('#mode3').value;
  $$('#layer2 select').forEach(e => (e.disabled = !on2));
  $('#mode3').disabled = !on3;
  $$('#layer3 .harm').forEach(e => (e.disabled = !on3 || m3 === 'drums'));
  $('#state2').textContent = on2 ? 'ON' : 'OFF';
  $('#state3').textContent = on3 ? 'ON' : 'OFF';
  $('#state2').classList.toggle('off', !on2);
  $('#state3').classList.toggle('off', !on3);
}

// General MIDI drum notes -> Minecraft drum sounds
function gmDrum(n) {
  if (n === 35 || n === 36) return 'kick';
  if ([37, 38, 39, 40, 41, 43, 45, 47, 48, 50].includes(n)) return 'snare'; // snares, claps, toms
  return 'hat'; // hi-hats, cymbals, shakers…
}

const ACTIVE_WINDOW = 1.5; // seconds: a track counts as "playing" if it has a note this close
/** Does this track play around time t? (binary search over sorted note times) */
function playsAt(track, t, win = ACTIVE_WINDOW) {
  const a = track.times;
  let lo = 0, hi = a.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (a[mid] < t - win) lo = mid + 1; else hi = mid; }
  return lo < a.length && a[lo] <= t + win;
}

function loadMidi(data, name) {
  const midi = new window.ToneMidi.Midi(data);
  const tracks = midi.tracks.map((t, idx) => {
    const notes = [...t.notes].sort((a, b) => a.time - b.time || b.midi - a.midi);
    // group notes that start together; a lead line has one voice per group
    // (the same note doubled in octaves still counts as one voice)
    const groups = [];
    for (const n of notes) {
      const g = groups[groups.length - 1];
      if (g && n.time - g.t < 0.03) g.p.push(n.midi); else groups.push({ t: n.time, p: [n.midi] });
    }
    const oneVoice = groups.filter(g => g.p.every(m => (m - g.p[0]) % 12 === 0)).length;
    return {
      idx, notes, times: notes.map(n => n.time), drums: t.instrument.percussion || t.channel === 9,
      name: (t.name || t.instrument.name || `Track ${idx + 1}`).trim(),
      avg: notes.reduce((a, n) => a + n.midi, 0) / (notes.length || 1),
      top: groups.reduce((a, g) => a + Math.max(...g.p), 0) / (groups.length || 1),
      onsets: groups.length,
      mono: oneVoice / (groups.length || 1),
      first: notes.length ? notes[0].time : 0,
      last: notes.length ? notes[notes.length - 1].time : 0,
    };
  }).filter(t => t.notes.length);
  if (!tracks.some(t => !t.drums)) throw new Error('that MIDI file has no melody notes');
  const tonal = tracks.filter(t => !t.drums);
  const most = Math.max(...tonal.map(t => t.onsets), 1);
  const isBass = t => /bass/i.test(t.name) || t.avg < 45;
  // lead ranking: busy, one-voice, higher-pitched tracks first; chord parts last
  const leadRank = tonal.filter(t => !isBass(t))
    .map(t => ({ t, score: t.onsets / most + 1.5 * t.mono + (t.top - 55) / 20 + (/vocal|voice|melody|lead|sing/i.test(t.name) ? 2 : 0) }))
    .sort((a, b) => b.score - a.score).map(x => x.t);
  const bassRank = tonal.filter(isBass).sort((a, b) => a.avg - b.avg);
  state.midi = { midi, tracks, tonal, leadRank: leadRank.length ? leadRank : tonal, bassRank };
  state.fileName = name;
  renderSources();
  $('#drop').classList.add('loaded');
  $('#dropText').innerHTML = `&#127929; <b>${esc(name)}</b>`;
  const lead = state.midi.leadRank[0];
  $('#songInfo').textContent = `Song length: ${fmtTime(midi.duration)} · ${tracks.length} tracks · tune starts at ${fmtTime(lead.first)}.`;
  // start where the tune starts, 20 seconds
  $('#start').value = Math.floor(lead.first);
  $('#length').value = Math.min(20, Math.max(1, Math.ceil(midi.duration - Math.floor(lead.first))));
  $('#status').textContent = '';
  $('#snipBox').classList.remove('hidden');
  convert();
  drawSnip();
}

function renderSources() {
  const m = state.midi;
  const opts = (auto, list) => `<option value="auto" selected>${auto}</option>` +
    list.map(t => `<option value="${t.idx}">${esc(t.name)} · ${t.notes.length} notes · ${fmtTime(t.first)}–${fmtTime(t.last)}</option>`).join('');
  const lead = m.leadRank[0], bass = m.bassRank[0];
  $('#src1').innerHTML = opts(`Auto (${esc(lead.name)}, others when it rests)`, m.tonal);
  $('#src2').innerHTML = opts(`Auto (${bass ? esc(bass.name) + ', ' : ''}lowest notes when it rests)`, m.tonal);
  $('#src3').innerHTML = opts('Auto (chord notes from the other tracks)', m.tonal);
  const drums = m.tracks.filter(t => t.drums);
  $('#drumInfo').textContent = drums.length
    ? `Drum track: ${drums.map(t => `${t.name} (${fmtTime(t.first)}–${fmtTime(t.last)})`).join(', ')}`
    : 'This file has no drum track, so layer 3 plays harmony.';
}

/** Notes for each layer in the chosen part of the song (times relative to the start), with automatic track choice. */
function midiTracks(s) {
  const m = state.midi, end = s.start + s.length;
  const inRange = n => n.time >= s.start - 1e-6 && n.time < end;
  const conv = (n, t) => ({ t: n.time - s.start, dur: n.duration, midi: n.midi, track: t.idx });
  const byIdx = idx => m.tracks.find(t => t.idx === idx);
  const notesOf = t => t.notes.filter(inRange).map(n => conv(n, t));
  // ranked tracks: use a lower-ranked track only while every higher-ranked one is resting
  const ranked = list => list.flatMap((t, r) => notesOf(t).filter(n => !list.slice(0, r).some(u => playsAt(u, n.t + s.start))));
  const leadAt = time => m.leadRank.find(u => playsAt(u, time));

  const mel = s.src1 === 'auto' ? ranked(m.leadRank) : notesOf(byIdx(s.src1));
  let bass;
  if (s.src2 !== 'auto') bass = notesOf(byIdx(s.src2));
  else {
    bass = ranked(m.bassRank);
    // no bass track for a while (intro, breaks, or no bass track at all): use the lowest notes of the
    // chord/backing parts, never a tune-like line
    const backing = m.tonal.filter(t => !m.bassRank.includes(t) && t.mono < 0.7 && (s.src1 === 'auto' || t.idx !== s.src1))
      .flatMap(t => notesOf(t).filter(n => !m.bassRank.some(u => playsAt(u, n.t + s.start, 4)) && (s.src1 !== 'auto' || leadAt(n.t + s.start) !== t)));
    bass = bass.concat(backing);
  }
  const harmony = s.src3 !== 'auto' ? notesOf(byIdx(s.src3))
    : m.tonal.filter(t => !m.bassRank.includes(t))
      .flatMap(t => notesOf(t).filter(n => (s.src1 === 'auto' ? leadAt(n.t + s.start) !== t : t.idx !== s.src1)));
  const drumTracks = m.tracks.filter(t => t.drums);
  const drums = drumTracks.flatMap(t => t.notes).filter(inRange)
    .map(n => ({ t: n.time - s.start, kind: gmDrum(n.midi) }))
    .sort((a, b) => a.t - b.t || ['kick', 'snare', 'hat'].indexOf(a.kind) - ['kick', 'snare', 'hat'].indexOf(b.kind));
  // auto layer 3: harmony only where the drums are resting
  const harm = s.mode3 === 'auto' ? harmony.filter(n => !drumTracks.some(t => playsAt(t, n.t + s.start))) : harmony;
  const all = m.tonal.flatMap(notesOf).sort((a, b) => a.t - b.t || b.midi - a.midi);
  return { mel, bass, harmony: harm, drums, all };
}

async function loadFile(file) {
  if (!file) return;
  try {
    const data = await file.arrayBuffer();
    if (String.fromCharCode(...new Uint8Array(data.slice(0, 4))) !== 'MThd') throw new Error('that is not a MIDI file (.mid)');
    loadMidi(data, file.name);
  } catch (err) {
    $('#status').textContent = 'Could not read that file: ' + (err.message || err);
  }
}

function convert() {
  if (!state.midi) return;
  syncLayers();
  const s = readSettings();
  const dur = state.midi.midi.duration;
  if (s.start >= dur) { $('#status').textContent = `Start is past the end of the song (${fmtTime(dur)}).`; return; }
  s.length = Math.max(1, Math.min(s.length, MAX_SECONDS, dur - s.start));
  state.settings = s;
  state.tracks = midiTracks(s);
  state.song = buildSong(state.tracks, s);
  state.steps = buildSteps(state.song);
  state.pos = 0;
  state.version++;
  // a different part: the position goes back to its start
  const part = `${s.start}:${s.length}`;
  if (part !== player.part) { player.part = part; if (player.kind) stopAll(); player.pos = null; }
  showPos();
  $('#status').textContent = `Updated (${state.steps.length} command blocks).`;
  $('#detailInfo').textContent = `${s.detail === 'full' ? 'Every note at its exact pitch' : 'Simple: tune, bass line and drums'}: ${state.steps.length} blocks for this part, about ${fmtDuration(state.steps.length * 15)} to auto-build.`;
  renderResult();
}

/** Plain-words reasons for an empty layer. */
function layerWarnings(s) {
  const m = state.midi, warn = [], end = s.start + s.length;
  if (s.detail === 'full') return state.song.rows.length ? [] : [`No notes in ${s.start}–${end.toFixed(1)} s.`];
  const count = (l, f = () => true) => state.song.rows.filter(r => r.events.some(e => e.layer === l && f(e))).length;
  const range = `${s.start}–${end.toFixed(1)} s`;
  const why = idx => {
    const t = m.tracks.find(x => x.idx === idx);
    if (t.first >= end) return `“${t.name}” only starts at ${t.first.toFixed(1)} s`;
    if (t.last < s.start) return `“${t.name}” stops at ${t.last.toFixed(1)} s`;
    return `“${t.name}” is resting in this part`;
  };
  if (!count(0)) warn.push(`Melody: no notes in ${range}${s.src1 === 'auto' ? ' (no track plays here)' : ` (${why(s.src1)}; try Auto)`}.`);
  if (s.mode2 === 'bass' && !count(1)) warn.push(`Bass: no notes in ${range}${s.src2 === 'auto' ? ' (nothing plays under the tune here)' : ` (${why(s.src2)}; try Auto)`}.`);
  if (s.mode3 === 'harmony' && !count(2)) warn.push(`Harmony: nothing under the melody in ${range}${s.src3 === 'auto' ? '' : ` (${why(s.src3)}; try Auto)`}.`);
  if (s.mode3 === 'drums' && !count(2)) {
    const d = m.tracks.filter(t => t.drums);
    warn.push(d.length ? `Drums: the drum track is silent in ${range}. Pick “Auto” to fill it with harmony.` : 'Drums: this MIDI has no drum track. Pick “Auto” or “Harmony”.');
  }
  return warn;
}

function renderResult() {
  const song = state.song, s = song.settings;
  const blocks = state.steps.length;
  const repeaterCount = song.rows.reduce((a, r) => a + repeaters(r.waitTicks).length, 0);
  const n = (l, f = () => true) => song.rows.filter(r => r.events.some(e => e.layer === l && f(e))).length;
  const used = layer => { // which tracks a layer's notes came from
    const c = {};
    for (const nt of state.tracks[layer]) c[nt.track] = (c[nt.track] || 0) + 1;
    return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([i]) => state.midi.tracks.find(t => t.idx === +i)?.name).join(', ');
  };
  const drumsN = n(2, e => e.drum), harmN = n(2, e => !e.drum);
  const evs = l => song.rows.reduce((a, r) => a + r.events.filter(e => e.layer === l).length, 0);
  const soundsOf = l => [...new Set(song.rows.flatMap(r => r.events.filter(e => e.layer === l).map(e => INSTRUMENTS[e.sound]?.label)))].filter(Boolean).join(', ');
  const layers = s.detail === 'full' ? [
    `Every note, F#3 and up · ${evs(0)} notes (${soundsOf(0)})`,
    evs(1) ? `Low notes · ${evs(1)} (${soundsOf(1)})` : null,
    evs(2) ? `Drums · ${evs(2)} hits` : null,
  ] : [
    `Melody: ${INSTRUMENTS[s.inst1].label} · ${n(0)} notes${used('mel') ? ` from ${used('mel')}` : ''}`,
    s.mode2 === 'bass' ? `Bass: ${INSTRUMENTS[s.inst2].label} · ${n(1)} notes${used('bass') ? ` from ${used('bass')}` : ''}` : null,
    s.mode3 === 'off' ? null : [
      s.mode3 !== 'harmony' ? `Drums · ${drumsN} hits` : '',
      s.mode3 !== 'drums' ? `Harmony: ${INSTRUMENTS[s.inst3].label} · ${harmN} notes` : '',
    ].filter(Boolean).join(' + '),
  ];
  const warnings = layerWarnings(s);
  const chain = s.build === 'chain', slab = s.build === 'slab' ? song.slab : null;
  if (slab) warnings.push(...slab.problems);
  const stepAt = {};
  state.steps.forEach(st => (stepAt[`${st.row}:${st.ei}`] = st));
  $('#result').innerHTML = `
    <div class="card">
      <div class="row"><h2 style="margin:0">${esc(state.fileName)}</h2><span class="spacer"></span>
        <button id="pOrig">&#9654; Original</button><button class="primary" id="pPrev">&#9654; Minecraft preview</button><button id="pStop">&#9632; Stop</button></div>
      <div class="stats" style="margin-top:10px">
        <div class="stat"><b>${blocks}</b><span>command blocks</span></div>
        ${chain || slab ? '' : `<div class="stat"><b>${repeaterCount}</b><span>repeaters</span></div>`}
        ${slab ? `<div class="stat"><b>${slab.layers}</b><span>layer${slab.layers > 1 ? 's' : ''} of ${s.slab.w}×${s.slab.d}</span></div>
          <div class="stat"><b>${slab.height}</b><span>blocks tall</span></div>` : `<div class="stat"><b>${song.rows.length}</b><span>steps</span></div>`}
        <div class="stat"><b>${s.length.toFixed(1)} s</b><span>from ${s.start}s</span></div>
      </div>
      <canvas class="roll" id="roll"></canvas>
      <div class="legend-row">${layers.map((l, i) => l ? `<span><i class="swatch" style="background:${LAYER_COLORS[i]}"></i>${esc(l)}</span>` : '').join('')}</div>
      ${warnings.map(w => `<p class="warnline">&#9888; ${esc(w)}</p>`).join('')}
      ${slab ? `<p class="hint">Auto-build time: about ${fmtDuration(blocks * 15)} (roughly 15 s per block; longer on a laggy Realm). You can stop and resume any time.</p>`
        : blocks > 1500 ? `<p class="hint" style="color:var(--warn)">&#9888; That's a lot of blocks. Try a shorter part or the 2-tick grid.</p>` : ''}
    </div>

    <div class="card">
      <h2>How to build it</h2>
      ${slab ? slabHowTo(slab, s) : chain ? `<ol class="steps">
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
      <tbody>${song.rows.map((r, i) => `<tr data-row="${i}"><td>${i + 1}</td><td>${fmtStepTime(r.time, s)}s</td>
        <td class="wait">${waitText(r.waitTicks, chain, i, s.build)}</td>
        <td>${r.events.map((e, ei) => {
          const st = stepAt[`${i}:${ei}`];
          const where = st && st.pos ? `<span class="pos">${st.pos.x} ${st.pos.y} ${st.pos.z}</span><span class="dly">delay ${st.delay}</span>` : '';
          return `<div class="c"><i class="swatch" style="background:${LAYER_COLORS[e.layer]}"></i>${where}<code>${esc(e.cmd)}</code><button class="small" data-copy="${esc(e.cmd)}">Copy</button></div>`;
        }).join('')}</td></tr>`).join('')}
      </tbody></table></div>
    </div>`;
  $('#pOrig').onclick = () => play('original');
  $('#pPrev').onclick = () => play('preview');
  $('#pStop').onclick = stopAll;
  $('#dlTxt').onclick = downloadTxt;
  if ($('#dlPlan')) $('#dlPlan').onclick = downloadPlan;
  drawRoll();
  renderQuick();
}

function slabHowTo(slab, s) {
  const list = cmds => `<ul class="cmd-list setup">${cmds.map(c => `<li><code>${esc(c)}</code><button class="small" data-copy="${esc(c)}">Copy</button></li>`).join('')}</ul>`;
  return `
    <p>Every note is an <b>Impulse · Needs Redstone</b> command block with its own <b>Delay in Ticks</b>. They're laid flat (${s.slab.w}×${s.slab.d}) and stacked upward, with a glass layer between each pair of layers.
      Start swaps all the glass for redstone blocks, so every block is powered on the same tick and plays when its delay runs out.
      Box: <span class="pos">${slab.box}</span> (${slab.volume} blocks).</p>
    <h3>Automatic (recommended)</h3>
    <ol class="steps">
      <li>Download the build plan: <button class="primary small" id="dlPlan">&#11015; Download build plan</button></li>
      <li>Double-click <b>Start-Auto-Builder.bat</b> (next to Start-Music-Maker.bat). It finds the newest plan in your Downloads folder.</li>
      <li>In Minecraft: Creative, flying, cheats on, with nothing in the way. The builder asks where to build: keep <span class="pos">${s.slab.x} ${s.slab.y} ${s.slab.z}</span> or type the corner where you're standing. The first time, it does a quick typing test and calibration with you (F8 / F9).</li>
    </ol>
    <h3>Once it's built</h3>
    ${list([slab.gamerule, slab.tickingArea])}
    <p class="hint">Start the song (keep the power on: taking it away cancels the notes still waiting):</p>
    ${list([slab.start])}
    <p class="hint">Stop / reset (run Start again to replay):</p>
    ${list([slab.stop])}
    <details><summary>Build by hand instead</summary>
      <p class="hint">Clear the space first:</p>${list(slab.clear)}
      <p class="hint">Then place each level in this order, and fill in every command block of a level (positions and delays are in the list below) before placing the next level:</p>
      ${list(slab.levels.map(l => l.fill))}
    </details>`;
}

/** The plan file the auto-builder (tools/auto-builder.ps1) runs. */
function downloadPlan() {
  const song = state.song, slab = song.slab, s = song.settings;
  const plan = {
    format: 'bedrock-music-maker/slab-plan', version: 1,
    song: state.fileName, part: { start: s.start, length: s.length }, createdAt: new Date().toISOString(),
    corner: { x: s.slab.x, y: s.slab.y, z: s.slab.z }, width: s.slab.w, depth: s.slab.d, height: slab.height,
    clear: slab.clear,
    levels: slab.levels.map(l => ({ y: l.y, kind: l.kind, fill: l.fill })),
    blocks: slab.blocks.map(b => ({ x: b.x, y: b.y, z: b.z, delay: b.delay, command: b.cmd })),
    start: slab.start, stop: slab.stop, tickingArea: slab.tickingArea, gamerule: slab.gamerule,
  };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(plan, null, 1)], { type: 'application/json' }));
  a.download = (state.fileName.replace(/\.[^.]+$/, '').replace(/[^A-Za-z0-9]+/g, '_') || 'song') + '.slabplan.json';
  document.body.appendChild(a); a.click(); a.remove();
}

function waitText(ticks, chain, i, build) {
  if (build === 'slab') return '';
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
  if (it.pos) before = `Block at <span class="pos">${it.pos.x} ${it.pos.y} ${it.pos.z}</span> · Delay in Ticks: <b>${it.delay}</b> <button class="small" data-copy="${it.delay}">Copy delay</button>`;
  else if (it.ei === 0 && it.row > 0) {
    before = chain ? `Set <b>Delay in Ticks: ${it.wait * 2}</b>` :
      `First place repeater${repeaters(it.wait).length > 1 ? 's' : ''}: <b>${repeaters(it.wait).join(' + ')}</b> tick${it.wait > 1 ? 's' : ''}, then dust`;
  }
  q.innerHTML = `
    <div class="now">Block <b>${p + 1}</b> of ${st.length} · step ${it.row + 1} · ${fmtStepTime(row.time, state.song.settings)} s
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
  if (song.slab && song.settings.build === 'slab') {
    const sl = song.slab;
    const lines = [`Bedrock Music Maker (slab): ${state.fileName}`, `Box ${sl.box}. Every block: Impulse / Needs Redstone, Delay in Ticks as listed.`,
      `Start: ${sl.start}`, `Stop:  ${sl.stop}`, '', 'Levels (bottom to top):', ...sl.levels.map(l => '  ' + l.fill), '', 'Blocks:',
      ...sl.blocks.map((b, i) => `#${i + 1}  ${b.x} ${b.y} ${b.z}  delay ${b.delay}  ${b.cmd}`)];
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([lines.join('\r\n')], { type: 'text/plain' }));
    a.download = (state.fileName.replace(/\.[^.]+$/, '') || 'song') + '_slab.txt';
    document.body.appendChild(a); a.click(); a.remove();
    return;
  }
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
  let timer = null;
  const live = (delay = 0) => { clearTimeout(timer); timer = setTimeout(convert, delay); };
  $$('.seg').forEach(seg => seg.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    seg.querySelectorAll('button').forEach(x => x.classList.toggle('active', x === b));
    live();
  }));
  // every setting updates the result straight away
  const panel = $('.m-settings');
  panel.addEventListener('change', e => { if (e.target.id !== 'file') { syncLayers(); live(); } });
  panel.addEventListener('input', e => { if (e.target.type === 'number') live(400); });
  $('#file').onchange = e => loadFile(e.target.files[0]);
  const drop = $('#drop');
  drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('over'); loadFile(e.dataTransfer.files[0]); });
  $('#result').addEventListener('click', e => {
    const b = e.target.closest('[data-copy]');
    if (b) { copyText(b.dataset.copy); toast('Copied!'); }
  });
  document.addEventListener('keydown', e => {
    if (!state.steps.length || ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
    if (e.code === 'Space') { e.preventDefault(); quickCopy(); }
    if (e.code === 'Backspace') { e.preventDefault(); state.pos = Math.max(0, state.pos - 1); renderQuick(); }
  });
  window.addEventListener('resize', () => { if (state.song) drawRoll(); drawSnip(); });
  initSnip();
}

// exposed for automated tests
window.MM = { state, player, setSnip, buildSong, buildSteps, slabLayout, repeaters, fitToInstrument, midiTracks, convert, INSTRUMENTS };
init();
