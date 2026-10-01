// End-to-end check of the music converter in headless Chromium, using a generated song with known notes.
// Run: node tests/music.test.mjs   (needs the `playwright` package; uses python `lameenc` for a real MP3 if installed)
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { render, wav, MELODY, BASS, BEAT } from './make-test-song.mjs';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const webDir = path.join(root, 'web');
const out = path.join(root, 'tests/out'); fs.mkdirSync(out, { recursive: true });
const { L, SR } = render();
const wavPath = path.join(out, 'test-song.wav');
fs.writeFileSync(wavPath, wav(L, SR));
let songPath = wavPath;
try {
  execFileSync('python3', ['-c', `
import wave, lameenc, sys
w = wave.open(sys.argv[1]); e = lameenc.Encoder(); e.set_bit_rate(128); e.set_in_sample_rate(44100); e.set_channels(2); e.set_quality(2)
open(sys.argv[2], 'wb').write(e.encode(w.readframes(w.getnframes())) + e.flush())`, wavPath, path.join(out, 'test-song.mp3')]);
  songPath = path.join(out, 'test-song.mp3');
} catch { console.log('(lameenc not installed: testing with WAV instead of MP3)'); }

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
await page.setInputFiles('#file', songPath);
await page.waitForFunction(() => !document.querySelector('#convert').disabled, null, { timeout: 20000 });
check(true, `decoded ${path.basename(songPath)}`);
await page.fill('#length', '10');

async function convert() {
  await page.evaluate(() => (document.querySelector('#status').textContent = ''));
  await page.click('#convert');
  await page.waitForFunction(() => /Done/.test(document.querySelector('#status').textContent), null, { timeout: 30000 });
  return page.evaluate(() => ({ tracks: MM.state.tracks, rows: MM.state.song.rows, steps: MM.state.steps }));
}

// ---- melody + bass + drums ----
await page.click('#mode3 [data-v=drums]');
let r = await convert();
const expMel = MELODY.map((m, k) => ({ m, t: k * BEAT })).filter(n => n.m > 0);
const gotMel = r.tracks.mel;
check(gotMel.length === expMel.length && gotMel.every((n, i) => n.midi === expMel[i].m),
  `melody notes exact (${gotMel.map(n => n.midi).join(',')})`);
check(gotMel.every((n, i) => Math.abs(n.t - expMel[i].t) <= 0.06), 'melody timing within 0.06 s');
check(r.tracks.bass.length === BASS.length && r.tracks.bass.every((n, i) => n.midi === BASS[i] && Math.abs(n.t - i * 2 * BEAT) <= 0.06),
  `bass notes exact (${r.tracks.bass.map(n => n.midi).join(',')})`);
const expDrums = MELODY.map((_, k) => (k % 2 ? 'hat' : 'kick'));
check(r.tracks.drums.length === expDrums.length && r.tracks.drums.every((d, i) => d.kind === expDrums[i]),
  `drums exact (${r.tracks.drums.map(d => d.kind[0]).join('')})`);

const cmds = r.rows.flatMap(x => x.events.map(e => e.cmd));
const re = /^\/playsound note\.[a-z_]+ @a ~ ~ ~ [\d.]+ ([\d.]+) [\d.]+$/;
check(cmds.every(c => re.test(c)), 'every command is a Bedrock /playsound with volume, pitch and min volume');
check(cmds.every(c => { const p = +c.match(re)[1]; return p >= 0.5 && p <= 2; }), 'every pitch is in the note block range 0.5–2.0');
check(r.rows.slice(1).every(x => x.waitTicks === 4), 'notes 0.4 s apart => 4 repeater ticks each');
check(r.rows.every(x => x.events.length <= 3), 'max 3 command blocks per step');
const melPitches = r.rows.map(x => x.events.find(e => e.layer === 0)).filter(Boolean).map(e => e.midi);
const shape = a => a.slice(1).map((m, i) => m - a[i]);
check(JSON.stringify(shape(melPitches)) === JSON.stringify(shape(expMel.map(n => n.m))), 'tune keeps its exact shape after fitting to the harp range');

// ---- copy next ----
await page.click('#qCopy'); await page.click('#qCopy');
const clip = await page.evaluate(() => navigator.clipboard.readText());
check(clip === r.steps[1].cmd, 'Copy next copies blocks in build order');
await page.keyboard.press('Space');
check(await page.evaluate(() => MM.state.pos) === 3, 'Space copies the next block');
check((await page.locator('#quick').textContent()).includes('First place repeater'), 'quick copy tells you the repeater delay');

// ---- txt download ----
const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#dlTxt')]);
const txtPath = path.join(out, dl.suggestedFilename()); await dl.saveAs(txtPath);
const txt = fs.readFileSync(txtPath, 'utf8');
check(txt.includes('repeaters 4') && txt.includes('/playsound note.harp'), 'txt download lists repeaters and commands');

// ---- 2-tick grid + chain blocks + harmony ----
await page.click('#ticks [data-v="2"]');
await page.click('#build [data-v=chain]');
await page.click('#mode3 [data-v=harmony]');
r = await convert();
const waits = r.rows.slice(1).map(x => x.waitTicks);
check(waits.every(w => w === 4 || w === 8) && waits.filter(w => w === 8).length === 1, '2-tick grid: 4 ticks per 0.4 s note, 8 across the rest ' + waits.join(','));
check(r.steps.slice(1).filter(s => s.ei === 0).every(s => s.how.includes(`Delay in Ticks: ${r.rows[s.row].waitTicks * 2}`)), 'chain mode: Delay in Ticks = 2 game ticks per repeater tick');
check(r.rows.some(x => x.events.some(e => e.layer === 2 && e.cmd.includes('note.bell'))), 'harmony layer uses the chosen instrument');

// ---- melody only, @p ----
await page.click('#mode2 [data-v=off]');
await page.click('#mode3 [data-v=off]');
await page.selectOption('#target', 'p');
await page.selectOption('#inst1', 'note.flute');
r = await convert();
check(r.rows.every(x => x.events.length === 1 && /^\/playsound note\.flute @p ~ ~ ~ 1 [\d.]+$/.test(x.events[0].cmd)), 'melody only: one flute block per step, @p, no min volume');

check(errors.length === 0, 'no page errors ' + errors.join(' | '));
await page.screenshot({ path: path.join(out, 'music.png'), fullPage: true });
await browser.close(); server.close();
console.log(failures ? `\n${failures} FAILED` : '\nALL PASSED');
process.exit(failures ? 1 : 0);
