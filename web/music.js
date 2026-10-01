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
const LAYER_COLORS = ['#5dbb63', '#5a9be5', '#e0b341'];

// ---------- helpers ----------
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const midiToHz = m => 440 * Math.pow(2, (m - 69) / 12);
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
  const stepSec = s.ticks * 0.1;
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
  for (const n of fitToInstrument(byPitch(tracks.mel, -1), s.inst1, s.transpose)) put(0, n.t, { sound: s.inst1, pitch: n.pitch, midi: n.played, src: n.midi, vol: 1 });
  if (s.mode2 === 'bass') for (const n of fitToInstrument(byPitch(tracks.bass, 1), s.inst2, s.transpose)) put(1, n.t, { sound: s.inst2, pitch: n.pitch, midi: n.played, vol: 0.9 });
  if (s.mode3 === 'harmony') {
    for (const n of fitToInstrument(byPitch(tracks.harmony, -1), s.inst3, s.transpose)) {
      const mel = steps.get(stepOf(n.t))?.find(e => e.layer === 0);
      if (mel && (n.midi >= mel.src || (mel.src - n.midi) % 12 === 0)) continue; // harmony sits below the tune, not doubling it
      put(2, n.t, { sound: s.inst3, pitch: n.pitch, midi: n.played, vol: 0.7 });
    }
  }
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
/** Plays every track of the chosen part (what the MIDI really sounds like, roughly). */
function playOriginal() {
  if (!state.midi || !state.settings) return;
  stopAll();
  const ac = ctx(); ac.resume();
  const master = ac.createGain(); master.gain.value = 0.5; master.connect(ac.destination);
  const t0 = ac.currentTime + 0.1, s = state.settings;
  for (const t of state.midi.tracks) for (const n of t.notes) {
    if (n.time < s.start || n.time >= s.start + s.length) continue;
    const e = t.drums ? { drum: gmDrum(n.midi), vol: 0.6 } : { sound: 'note.harp', midi: n.midi, vol: 0.4 };
    synthNote(ac, master, e, t0 + n.time - s.start);
  }
}

// ---------- UI ----------
const state = { midi: null, fileName: '', song: null, steps: [], pos: 0, settings: null };

function segValue(id) { return $(`#${id} button.active`).dataset.v; }
function readSettings() {
  return {
    start: Math.max(0, +$('#start').value || 0),
    length: Math.max(1, +$('#length').value || 20),
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
  $('#inst3').innerHTML = opts('note.guitar', all);
  syncLayers();
}
function syncLayers() {
  $('#inst2').disabled = segValue('mode2') === 'off';
  const m3 = segValue('mode3');
  $('#inst3').disabled = m3 !== 'harmony';
  $('#inst3').title = m3 === 'drums' ? 'Drums use note.bd (kick), note.snare and note.hat' : '';
}

// General MIDI drum notes -> Minecraft drum sounds
function gmDrum(n) {
  if (n === 35 || n === 36) return 'kick';
  if ([37, 38, 39, 40, 41, 43, 45, 47, 48, 50].includes(n)) return 'snare'; // snares, claps, toms
  return 'hat'; // hi-hats, cymbals, shakers…
}

function loadMidi(data, name) {
  const midi = new window.ToneMidi.Midi(data);
  const tracks = midi.tracks.map((t, idx) => ({
    idx, notes: t.notes, drums: t.instrument.percussion || t.channel === 9,
    name: (t.name || t.instrument.name || `Track ${idx + 1}`).trim(),
    avg: t.notes.reduce((a, n) => a + n.midi, 0) / (t.notes.length || 1),
    first: t.notes.length ? Math.min(...t.notes.map(n => n.time)) : 0,
  })).filter(t => t.notes.length);
  if (!tracks.some(t => !t.drums)) throw new Error('that MIDI file has no melody notes');
  const tonal = tracks.filter(t => !t.drums);
  const most = Math.max(...tonal.map(t => t.notes.length), 1);
  const busy = tonal.filter(t => t.notes.length >= most * 0.2);
  const melody = [...busy].sort((a, b) => b.avg - a.avg)[0] || tonal[0];
  const bassTrack = tonal.filter(t => t !== melody && (/bass/i.test(t.name) || t.avg < 48)).sort((a, b) => a.avg - b.avg)[0];
  state.midi = { midi, tracks, pick: { mel: melody.idx, bass: bassTrack ? bassTrack.idx : 'auto', harmony: 'auto' } };
  state.fileName = name;
  renderMidiTracks();
  $('#drop').classList.add('loaded');
  $('#dropText').innerHTML = `&#127929; <b>${esc(name)}</b>`;
  $('#songInfo').textContent = `Song length: ${fmtTime(midi.duration)}. ${tracks.length} tracks. Every note becomes a command block, so start with 10–30 seconds.`;
  $('#length').value = Math.min(+$('#length').value || 20, Math.ceil(midi.duration));
  $('#convert').disabled = false;
  $('#status').textContent = '';
}

function renderMidiTracks() {
  const m = state.midi;
  const opts = (sel, auto) => (auto ? `<option value="auto" ${sel === 'auto' ? 'selected' : ''}>${auto}</option>` : '') +
    m.tracks.filter(t => !t.drums).map(t =>
      `<option value="${t.idx}" ${t.idx === sel ? 'selected' : ''}>${esc(t.name)} · ${t.notes.length} notes · from ${fmtTime(t.first)}</option>`).join('');
  const drums = m.tracks.filter(t => t.drums);
  $('#midiTracks').innerHTML = `
    <label>Melody comes from</label><select data-pick="mel">${opts(m.pick.mel)}</select>
    <label>Bass comes from</label><select data-pick="bass">${opts(m.pick.bass, 'Auto: lowest note of all other tracks')}</select>
    <label>Harmony comes from</label><select data-pick="harmony">${opts(m.pick.harmony, 'Auto: chord notes from all other tracks')}</select>
    <div class="hint">${drums.length ? `Drums: ${drums.map(t => `${esc(t.name)} (from ${fmtTime(t.first)})`).join(', ')}` : 'No drum track in this file.'}</div>`;
  $$('#midiTracks [data-pick]').forEach(sel => (sel.onchange = () => (m.pick[sel.dataset.pick] = sel.value === 'auto' ? 'auto' : +sel.value)));
}

/** Notes for each layer in the chosen part of the song (times relative to the start). */
function midiTracks(s) {
  const m = state.midi, end = s.start + s.length;
  const inRange = n => n.time >= s.start - 1e-6 && n.time < end;
  const conv = n => ({ t: n.time - s.start, dur: n.duration, midi: n.midi });
  const tonal = m.tracks.filter(t => !t.drums);
  const from = (pick, exclude) => (pick === 'auto' ? tonal.filter(t => !exclude.includes(t.idx)) : tonal.filter(t => t.idx === pick))
    .flatMap(t => t.notes.filter(inRange).map(conv));
  const drums = m.tracks.filter(t => t.drums).flatMap(t => t.notes).filter(inRange)
    .map(n => ({ t: n.time - s.start, kind: gmDrum(n.midi) }))
    .sort((a, b) => a.t - b.t || ['kick', 'snare', 'hat'].indexOf(a.kind) - ['kick', 'snare', 'hat'].indexOf(b.kind));
  return {
    mel: from(m.pick.mel, []),
    bass: from(m.pick.bass, [m.pick.mel]),
    harmony: from(m.pick.harmony, [m.pick.mel, m.pick.bass]),
    drums,
  };
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
  const s = readSettings();
  const dur = state.midi.midi.duration;
  if (s.start >= dur) { $('#status').textContent = `Start is past the end of the song (${fmtTime(dur)}).`; return; }
  s.length = Math.max(1, Math.min(s.length, MAX_SECONDS, dur - s.start));
  state.settings = s;
  state.tracks = midiTracks(s);
  state.song = buildSong(state.tracks, s);
  state.steps = buildSteps(state.song);
  state.pos = 0;
  $('#status').textContent = 'Done.';
  renderResult();
}

/** Why an enabled layer came out empty, in plain words. */
function layerWarnings(s) {
  const m = state.midi, warn = [];
  const count = l => state.song.rows.filter(r => r.events.some(e => e.layer === l)).length;
  const range = `${s.start}–${(s.start + s.length).toFixed(1)} s`;
  const why = pick => {
    if (pick === 'auto') return 'none of the other tracks play here';
    const t = m.tracks.find(x => x.idx === pick);
    return t.first >= s.start + s.length ? `“${t.name}” only starts at ${t.first.toFixed(1)} s` : `“${t.name}” is silent here`;
  };
  if (!count(0)) warn.push(`Melody: no notes in ${range} (${why(m.pick.mel)}).`);
  if (s.mode2 === 'bass' && !count(1)) warn.push(`Bass: no notes in ${range} (${why(m.pick.bass)}). Try “Auto” or a later part of the song.`);
  if (s.mode3 === 'harmony' && !count(2)) warn.push(`Harmony: nothing under the melody in ${range} (${why(m.pick.harmony)}). Try “Auto”.`);
  if (s.mode3 === 'drums' && !count(2)) {
    const d = m.tracks.filter(t => t.drums);
    warn.push(`Drums: no hits in ${range}${d.length ? ` (drums start at ${Math.min(...d.map(t => t.first)).toFixed(1)} s)` : ' (this MIDI has no drum track)'}.`);
  }
  return warn;
}

function renderResult() {
  const song = state.song, s = song.settings;
  const blocks = state.steps.length;
  const repeaterCount = song.rows.reduce((a, r) => a + repeaters(r.waitTicks).length, 0);
  const n = l => song.rows.filter(r => r.events.some(e => e.layer === l)).length;
  const layers = [
    `Melody: ${INSTRUMENTS[s.inst1].label} (${n(0)} notes)`,
    s.mode2 === 'bass' ? `Bass: ${INSTRUMENTS[s.inst2].label} (${n(1)} notes)` : null,
    s.mode3 === 'drums' ? `Drums: kick / snare / hat (${n(2)} hits)` : s.mode3 === 'harmony' ? `Harmony: ${INSTRUMENTS[s.inst3].label} (${n(2)} notes)` : null,
  ];
  const warnings = layerWarnings(s);
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
      ${warnings.map(w => `<p class="warnline">&#9888; ${esc(w)}</p>`).join('')}
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
window.MM = { state, buildSong, buildSteps, repeaters, fitToInstrument, midiTracks, INSTRUMENTS };
init();
