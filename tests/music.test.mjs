// End-to-end check of the MIDI -> /playsound converter in headless Chromium.
// Run: node tests/music.test.mjs   (needs the `playwright` package)
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { midiFile, MELODY, BASS } from './make-test-song.mjs';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const webDir = path.join(root, 'web');
const out = path.join(root, 'tests/out'); fs.mkdirSync(out, { recursive: true });

// 120 bpm => 1 beat = 0.5 s. Melody: one note at a time (like a vocal/trombone line).
// Bass only starts at beat 8 (4 s), like an intro without bass. Guitar strums 3-note chords.
const tunes = MELODY.map((m, k) => ({ beat: k, beats: 1, midi: m })).filter(n => n.midi > 0);
const midiPath = path.join(out, 'test-song.mid');
fs.writeFileSync(midiPath, midiFile([
  { name: 'Vocal line', channel: 0, notes: tunes },
  { name: 'Bass', channel: 1, notes: BASS.map((m, k) => ({ beat: 8 + k * 2, beats: 2, midi: m })) },
  { name: 'Guitar', channel: 2, notes: MELODY.flatMap((_, k) => [55, 60, 64].map(m => ({ beat: k, beats: 1, midi: m }))) },
  { name: 'Drums', channel: 9, notes: MELODY.map((_, k) => ({ beat: k, beats: 0.5, midi: k % 2 ? 38 : 36 })) },
]));
// A piano part with chords in one track (melody should take the top note).
const chordPath = path.join(out, 'chords.mid');
fs.writeFileSync(chordPath, midiFile([
  { name: 'Piano', channel: 0, notes: tunes.flatMap(n => [n, { ...n, midi: n.midi - 5 }, { ...n, midi: n.midi - 12 }]) },
]));

const server = http.createServer((req, res) => {
  const f = path.join(webDir, req.url === '/' ? 'index.html' : decodeURIComponent(req.url));
  if (!fs.existsSync(f)) { res.statusCode = 404; return res.end(); }
  res.end(fs.readFileSync(f));
}).listen(0);
const url = `http://localhost:${server.address().port}/`;

let failures = 0;
const check = (cond, msg) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`); if (!cond) failures++; };

const browser = await chromium.launch();
const context = await browser.newContext({ acceptDownloads: true });
await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: url });
const page = await context.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto(url);

async function load(file) {
  await page.setInputFiles('#file', file);
  await page.waitForFunction(n => document.querySelector('#dropText').textContent.includes(n), path.basename(file));
}
async function convert() {
  await page.evaluate(() => (document.querySelector('#status').textContent = ''));
  await page.click('#convert');
  await page.waitForFunction(() => /Done/.test(document.querySelector('#status').textContent));
  return page.evaluate(() => ({ rows: MM.state.song.rows, steps: MM.state.steps, warn: [...document.querySelectorAll('.warnline')].map(e => e.textContent) }));
}
const layerRows = (rows, l) => rows.filter(x => x.events.some(e => e.layer === l));

// ---- track auto-pick ----
await load(midiPath);
const picked = sel => page.locator(`#midiTracks select[data-pick=${sel}] option:checked`).textContent();
check((await picked('mel')).startsWith('Vocal line'), 'melody track auto-picked (highest busy track)');
check((await picked('bass')).startsWith('Bass'), 'bass track auto-picked');
check((await picked('harmony')).startsWith('Auto'), 'harmony defaults to Auto (chords from the other tracks)');
check(await page.locator('#inst3').inputValue() === 'note.guitar', 'harmony instrument defaults to guitar (sits under the tune)');

// ---- ALL layers on, intro part where the bass is silent (the bug report) ----
await page.click('#mode2 [data-v=bass]');
await page.click('#mode3 [data-v=harmony]');
await page.fill('#start', '0'); await page.fill('#length', '3.9');
let r = await convert();
check(layerRows(r.rows, 0).length === 7, 'intro: 7 melody notes');
check(layerRows(r.rows, 0).every(x => x.events.some(e => e.layer === 2)) && layerRows(r.rows, 2).length === 8,
  `intro: harmony under every melody note, plus the guitar strum in the rest (${layerRows(r.rows, 2).length})`);
check(r.rows.every(x => x.events.filter(e => e.layer === 2).every(h => {
  const m = x.events.find(e => e.layer === 0);
  return !m || h.src === undefined || h.src < m.src;
})), 'harmony notes are below the melody');
check(r.warn.some(w => /Bass: no notes/.test(w) && /starts at 4\.0 s/.test(w)), 'intro: clear warning that the bass only starts at 4.0 s');

// ---- whole song: every layer plays ----
await page.fill('#length', '30');
r = await convert();
const melSrc = layerRows(r.rows, 0).map(x => x.events.find(e => e.layer === 0).src);
check(JSON.stringify(melSrc) === JSON.stringify(MELODY.filter(m => m > 0)), 'melody notes exact');
check(layerRows(r.rows, 1).length === BASS.length, 'every bass note');
check(layerRows(r.rows, 2).length >= 14, 'harmony on the beats');
check(r.warn.length === 0, 'no warnings when every layer has notes');
check(r.rows.every(x => x.events.length <= 3), 'max 3 command blocks per step');
check(r.rows.slice(1).every(x => x.waitTicks === 5 || x.waitTicks === 10), '120 bpm beats = 5 repeater ticks');

const cmds = r.rows.flatMap(x => x.events.map(e => e.cmd));
const re = /^\/playsound note\.[a-z_]+ @a ~ ~ ~ [\d.]+ ([\d.]+) [\d.]+$/;
check(cmds.every(c => re.test(c)), 'every command is a Bedrock /playsound with volume, pitch and min volume');
check(cmds.every(c => { const p = +c.match(re)[1]; return p >= 0.5 && p <= 2; }), 'every pitch is in the note block range 0.5–2.0');
const melPlayed = layerRows(r.rows, 0).map(x => x.events.find(e => e.layer === 0).midi);
const shape = a => a.slice(1).map((m, i) => m - a[i]);
check(JSON.stringify(shape(melPlayed)) === JSON.stringify(shape(melSrc)), 'tune keeps its exact shape after fitting to the harp range');

// ---- drums ----
await page.click('#mode3 [data-v=drums]');
r = await convert();
check(layerRows(r.rows, 2).map(x => x.events.find(e => e.layer === 2).drum).join() === MELODY.map((_, k) => (k % 2 ? 'snare' : 'kick')).join(), 'GM drums -> note.bd / note.snare');

// ---- Auto bass in the intro: lowest note of the other tracks ----
await page.selectOption('#midiTracks select[data-pick=bass]', 'auto');
await page.fill('#length', '3.9');
r = await convert();
check(layerRows(r.rows, 1).length === 8 && r.warn.length === 0, `Auto bass fills the intro from the guitar (${layerRows(r.rows, 1).length}, ${r.warn})`);

// ---- copy next ----
await page.click('#qCopy'); await page.click('#qCopy');
const clip = await page.evaluate(() => navigator.clipboard.readText());
check(clip === r.steps[1].cmd, 'Copy next copies blocks in build order');
await page.keyboard.press('Space');
check(await page.evaluate(() => MM.state.pos) === 3, 'Space copies the next block');
check((await page.locator('#quick').textContent()).includes('First place repeater'), 'Copy next tells you the repeater delay');

// ---- txt download ----
const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#dlTxt')]);
const txtPath = path.join(out, dl.suggestedFilename()); await dl.saveAs(txtPath);
const txt = fs.readFileSync(txtPath, 'utf8');
check(/repeaters \d/.test(txt) && txt.includes('/playsound note.harp'), 'txt download lists repeaters and commands');

// ---- chain mode, 2-tick grid, @p ----
await page.click('#ticks [data-v="2"]');
await page.click('#build [data-v=chain]');
await page.selectOption('#target', 'p');
r = await convert();
check(r.steps.slice(1).filter(s => s.ei === 0).every(s => s.how.includes(`Delay in Ticks: ${r.rows[s.row].waitTicks * 2}`)), 'chain mode: Delay in Ticks = 2 game ticks per repeater tick');
check(r.rows.flatMap(x => x.events).every(e => / @p ~ ~ ~ [\d.]+ [\d.]+$/.test(e.cmd)), '@p target, no min volume');

// ---- chords in one track: melody = top note ----
await load(chordPath);
await page.click('#mode2 [data-v=off]');
await page.click('#mode3 [data-v=off]');
await page.click('#ticks [data-v="1"]');
await page.fill('#start', '0'); await page.fill('#length', '30');
r = await convert();
check(JSON.stringify(r.rows.map(x => x.events[0].src)) === JSON.stringify(MELODY.filter(m => m > 0)), 'chord track: melody takes the top note of each chord');

// ---- not a MIDI file ----
const bogus = path.join(out, 'not-midi.mid'); fs.writeFileSync(bogus, 'hello');
await page.setInputFiles('#file', bogus);
await page.waitForFunction(() => /Could not read/.test(document.querySelector('#status').textContent));
check(true, 'non-MIDI file gives a clear error');

check(errors.length === 0, 'no page errors ' + errors.join(' | '));
await page.screenshot({ path: path.join(out, 'music.png'), fullPage: true });
await browser.close(); server.close();
console.log(failures ? `\n${failures} FAILED` : '\nALL PASSED');
process.exit(failures ? 1 : 0);
