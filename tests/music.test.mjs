// End-to-end check of the MIDI -> /playsound converter in headless Chromium.
// Run: node tests/music.test.mjs   (needs the `playwright` package)
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { midiFile, MELODY } from './make-test-song.mjs';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const webDir = path.join(root, 'web');
const out = path.join(root, 'tests/out'); fs.mkdirSync(out, { recursive: true });

// A band-style MIDI like real downloads (120 bpm, 1 beat = 0.5 s, 40 beats):
// - "Trombone": the sung tune, every note doubled an octave down (beats 0-15 and 24-39), resting in 16-23
// - "Flute": a short fill while the tune rests (beats 16-23)
// - "Bass": only starts at beat 16 (8 s)
// - "Guitar": strummed 3-note chords on every beat
// - "Drums": everywhere except a break in beats 16-23
const tune = MELODY.map((m, k) => ({ k, m })).filter(n => n.m > 0);
const lead = [...tune, ...tune.map(n => ({ ...n, k: n.k + 24 }))]
  .flatMap(n => [{ beat: n.k, beats: 1, midi: n.m }, { beat: n.k, beats: 1, midi: n.m - 12 }]);
const flute = [88, 86, 84, 83, 81, 79, 77, 76].map((m, i) => ({ beat: 16 + i, beats: 1, midi: m }));
const bass = Array.from({ length: 12 }, (_, i) => ({ beat: 16 + i * 2, beats: 2, midi: [36, 41, 43][i % 3] }));
const guitar = Array.from({ length: 40 }, (_, k) => [55, 60, 64].map(m => ({ beat: k, beats: 1, midi: m }))).flat();
const drums = Array.from({ length: 40 }, (_, k) => k).filter(k => k < 16 || k >= 24).map(k => ({ beat: k, beats: 0.5, midi: k % 2 ? 38 : 36 }));
const songPath = path.join(out, 'band-song.mid');
fs.writeFileSync(songPath, midiFile([
  { name: 'Trombone', channel: 0, notes: lead },
  { name: 'Flute', channel: 3, notes: flute },
  { name: 'Bass', channel: 1, notes: bass },
  { name: 'Guitar', channel: 2, notes: guitar },
  { name: 'Drums', channel: 9, notes: drums },
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

const version = () => page.evaluate(() => MM.state.version);
/** Do something in the settings panel and wait for the result to update by itself (no Convert button). */
async function change(action) {
  const v = await version();
  await action();
  await page.waitForFunction(x => MM.state.version > x, v, { timeout: 5000 });
  return page.evaluate(() => ({
    rows: MM.state.song.rows, steps: MM.state.steps, tracks: MM.state.tracks,
    warn: [...document.querySelectorAll('.warnline')].map(e => e.textContent),
  }));
}
const on = (rows, f) => rows.filter(x => x.events.some(f));
let names = {};
const trackName = idx => names[idx];
/** Pick a track in a "Notes from" list by its name. */
const pickTrack = (sel, name) => page.evaluate(([sel, name]) => {
  const el = document.querySelector(sel);
  el.value = [...el.options].find(o => o.textContent.startsWith(name)).value;
  el.dispatchEvent(new Event('change', { bubbles: true }));
}, [sel, name]);
const setNum = (sel, v) => change(async () => { await page.fill(sel, String(v)); await page.locator(sel).dispatchEvent('change'); });

// ---- 1. drop the file: everything appears automatically ----
let r = await change(() => page.setInputFiles('#file', songPath));
names = await page.evaluate(() => Object.fromEntries(MM.state.midi.tracks.map(t => [t.idx, t.name])));
check(Object.values(names).join() === 'Trombone,Flute,Bass,Guitar,Drums', 'all 5 tracks read');
check(r.rows.length > 0, 'commands appear as soon as the file is dropped (no button)');
check(await page.locator('#src1 option').first().textContent().then(t => t.includes('Trombone')), 'auto melody = the octave-doubled lead line (Trombone), not the flute or chords');
check(await page.locator('#on2').isChecked() && await page.locator('#on3').isChecked(), 'all layers start ON');
check(await page.locator('#state2').textContent() === 'ON', 'layer state shown in words');

// whole song
r = await setNum('#length', 25);
const mel = r.tracks.mel, melRows = on(r.rows, e => e.layer === 0);
check(melRows.length > 0 && on(r.rows, e => e.layer === 1).length > 0 && on(r.rows, e => e.layer === 2 && e.drum).length > 0 && on(r.rows, e => e.layer === 2 && !e.drum).length > 0,
  `all layers play: melody ${melRows.length}, bass ${on(r.rows, e => e.layer === 1).length}, drums ${on(r.rows, e => e.layer === 2 && e.drum).length}, harmony ${on(r.rows, e => e.layer === 2 && !e.drum).length}`);
const tuneSteps = melRows.filter(x => x.time < 8).map(x => x.events.find(e => e.layer === 0).orig);
check(JSON.stringify(tuneSteps) === JSON.stringify(MELODY.filter(m => m > 0)), 'melody = the top note of the octave-doubled lead, exactly');
check(mel.some(n => trackName(n.track) === 'Flute') && !mel.some(n => trackName(n.track) === 'Guitar'), 'while the lead rests the flute takes over (never the chord guitar)');
const bassNotes = r.tracks.bass;
check(bassNotes.filter(n => n.t >= 8).every(n => trackName(n.track) === 'Bass'), 'bass uses the Bass track wherever it plays');
check(bassNotes.some(n => n.t < 4 && trackName(n.track) === 'Guitar') && !bassNotes.some(n => trackName(n.track) === 'Trombone'), 'intro without bass: low guitar notes fill in (never the tune)');
const harmRows = on(r.rows, e => e.layer === 2 && !e.drum);
check(harmRows.every(x => x.time > 8.4 && x.time < 11.6), 'auto layer 3: harmony only fills the drum break');
check(r.rows.every(x => x.events.filter(e => e.layer === 2).length <= 1), 'never a drum and a harmony block in the same column');
check(r.rows.every(x => x.events.filter(e => e.layer === 2 && !e.drum).every(h => { const m = x.events.find(e => e.layer === 0); return !m || h.orig < m.orig; })), 'harmony sits below the melody');
check(r.warn.length === 0, 'no warnings in auto mode');
check(r.rows.every(x => x.events.length <= 3), 'max 3 command blocks per step');
check(r.rows.slice(1).every(x => x.waitTicks % 5 === 0), '120 bpm beats = 5 repeater ticks');
const cmds = r.rows.flatMap(x => x.events.map(e => e.cmd));
const re = /^\/playsound note\.[a-z_]+ @a ~ ~ ~ [\d.]+ ([\d.]+) [\d.]+$/;
check(cmds.every(c => re.test(c)), 'every command is a Bedrock /playsound with volume, pitch and min volume');
check(cmds.every(c => { const p = +c.match(re)[1]; return p >= 0.5 && p <= 2; }), 'every pitch is in the note block range 0.5–2.0');

// ---- 2. instruments: every change shows up in the commands at once ----
for (const [sel, inst, layer] of [['#inst1', 'note.flute', 0], ['#inst2', 'note.didgeridoo', 1], ['#inst3', 'note.pling', 2]]) {
  r = await change(() => page.selectOption(sel, inst));
  const ev = r.rows.flatMap(x => x.events).filter(e => e.layer === layer && !e.drum);
  check(ev.length > 0 && ev.every(e => e.cmd.startsWith(`/playsound ${inst} `)), `${sel} -> ${inst}: all ${ev.length} blocks of that layer switch instantly`);
}

// ---- 3. picking tracks by hand (the swap that broke before) ----
r = await change(() => pickTrack('#src1', 'Guitar'));
check(on(r.rows, e => e.layer === 0).length > 0 && r.tracks.mel.every(n => trackName(n.track) === 'Guitar'), 'melody from Guitar: takes the top chord note');
r = await change(() => pickTrack('#src2', 'Trombone'));
check(r.tracks.bass.every(n => trackName(n.track) === 'Trombone') && on(r.rows, e => e.layer === 1).length > 0, 'bass from Trombone: works (bottom note)');
r = await change(() => pickTrack('#src3', 'Flute'));
check(r.tracks.harmony.every(n => trackName(n.track) === 'Flute'), 'harmony from Flute: works');
r = await change(() => page.selectOption('#mode3', 'harmony'));
check(on(r.rows, e => e.layer === 2 && e.drum).length === 0, 'Harmony only: no drums');
r = await change(() => pickTrack('#src3', 'Bass'));
r = await setNum('#start', 0); r = await setNum('#length', 3);
check(r.warn.some(w => /Harmony/.test(w) && /“Bass” only starts at 8\.0 s/.test(w)), 'a hand-picked track that is silent explains why');
r = await change(() => page.selectOption('#src1', 'auto'));
r = await change(() => page.selectOption('#src2', 'auto'));
r = await change(() => page.selectOption('#src3', 'auto'));
r = await change(() => page.selectOption('#mode3', 'drums'));
check(on(r.rows, e => e.layer === 2 && !e.drum).length === 0 && on(r.rows, e => e.drum).length > 0, 'Drums only: no harmony');

// ---- 4. switches ----
r = await change(() => page.uncheck('#on2'));
check(on(r.rows, e => e.layer === 1).length === 0 && await page.locator('#state2').textContent() === 'OFF', 'bass switch OFF removes bass and says OFF');
r = await change(() => page.uncheck('#on3'));
check(r.rows.every(x => x.events.length === 1), 'layer 3 OFF: melody only');
r = await change(() => page.check('#on2'));
r = await change(() => page.check('#on3'));
r = await change(() => page.selectOption('#mode3', 'auto'));
check(on(r.rows, e => e.layer === 1).length > 0 && on(r.rows, e => e.layer === 2).length > 0, 'switching back ON brings the layers back');

// ---- 5. copy next + txt ----
await page.click('#qCopy'); await page.click('#qCopy');
check(await page.evaluate(() => navigator.clipboard.readText()) === r.steps[1].cmd, 'Copy next copies blocks in build order');
await page.keyboard.press('Space');
check(await page.evaluate(() => MM.state.pos) === 3, 'Space copies the next block');
const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#dlTxt')]);
const txtPath = path.join(out, dl.suggestedFilename()); await dl.saveAs(txtPath);
check(/repeaters \d/.test(fs.readFileSync(txtPath, 'utf8')), 'txt download lists repeaters and commands');

// ---- 6. build style, grid, target ----
r = await change(() => page.click('#build [data-v=chain]'));
check(r.steps.slice(1).filter(s => s.ei === 0).every(s => s.how.includes(`Delay in Ticks: ${r.rows[s.row].waitTicks * 2}`)), 'chain mode: Delay in Ticks = 2 game ticks per repeater tick');
r = await change(() => page.click('#ticks [data-v="2"]'));
check(r.rows.slice(1).every(x => x.waitTicks % 2 === 0), '2-tick grid');
r = await change(() => page.selectOption('#target', 'p'));
check(r.rows.flatMap(x => x.events).every(e => / @p ~ ~ ~ [\d.]+ [\d.]+$/.test(e.cmd)), '@p target, no min volume');
r = await setNum('#transpose', 2);
check(r.rows.length > 0, 'transpose updates live');

// ---- 7. slab (auto-builder) mode ----
r = await change(() => page.click('#ticks [data-v="1"]'));
r = await change(() => page.click('#build [data-v=slab]'));
check(await page.locator('#slabSettings').isVisible(), 'slab settings appear for the slab build style');
await page.fill('#slabX', '100'); await page.fill('#slabY', '70'); await page.fill('#slabZ', '-20');
await page.fill('#slabW', '4'); await page.fill('#slabD', '3');
r = await setNum('#slabD', 3);
r = await setNum('#start', 0); r = await setNum('#length', 25);
const slab = await page.evaluate(() => MM.state.song.slab);
const nBlocks = r.rows.reduce((a, x) => a + x.events.length, 0);
check(slab.blocks.length === nBlocks && slab.layers === Math.ceil(nBlocks / 12), `every note gets its own block (${nBlocks} blocks, ${slab.layers} layers of 4×3)`);
check(new Set(slab.blocks.map(b => `${b.x},${b.y},${b.z}`)).size === nBlocks, 'no two blocks share a position');
check(slab.blocks.every(b => b.x >= 100 && b.x <= 103 && b.z >= -20 && b.z <= -18), 'blocks stay inside the 4×3 footprint from the corner');
const firstStep = r.rows[0].step;
check(slab.blocks.every((b, i) => b.delay === Math.round((b.time - r.rows[0].time) * 20)), 'Delay in Ticks = time since the first note × 20');
check(slab.blocks.every((b, i, a) => i === 0 || b.delay >= a[i - 1].delay), 'blocks are placed in time order');
const kinds = slab.levels.map(l => l.kind[0]).join('');
check(/^(cgc)*(cg)?$/.test(kinds.replace(/cgc/g, 'cgc')) && kinds.startsWith('cg'), `levels go command, glass, command, command, glass… (${kinds})`);
const cmdYs = new Set(slab.levels.filter(l => l.kind === 'command').map(l => l.y)), glassYs = slab.levels.filter(l => l.kind === 'glass').map(l => l.y);
check([...cmdYs].every(y => glassYs.includes(y - 1) || glassYs.includes(y + 1)), 'every command layer touches a glass (power) layer');
check(slab.start === `/fill ${slab.box} redstone_block replace glass` && slab.stop === `/fill ${slab.box} glass replace redstone_block`, 'one Start / Stop command covers the whole slab');
check(slab.problems.length === 0 && slab.volume <= 32768, 'fits in one /fill');
const [planDl] = await Promise.all([page.waitForEvent('download'), page.click('#dlPlan')]);
const planPath = path.join(out, planDl.suggestedFilename()); await planDl.saveAs(planPath);
const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
check(plan.format === 'bedrock-music-maker/slab-plan' && plan.blocks.length === nBlocks && plan.blocks[0].command.startsWith('/playsound') && plan.levels.length === slab.levels.length, `build plan download (${path.basename(planPath)})`);
await page.click('#qCopy');
check((await page.locator('#quick').textContent()).includes('Delay in Ticks'), 'Copy next shows position and Delay in Ticks for hand building');

// ---- 8. not a MIDI file ----
const bogus = path.join(out, 'not-midi.mid'); fs.writeFileSync(bogus, 'hello');
await page.setInputFiles('#file', bogus);
await page.waitForFunction(() => /Could not read/.test(document.querySelector('#status').textContent));
check(true, 'non-MIDI file gives a clear error');

check(errors.length === 0, 'no page errors ' + errors.join(' | '));
await page.screenshot({ path: path.join(out, 'music.png'), fullPage: true });
await browser.close(); server.close();
console.log(failures ? `\n${failures} FAILED` : '\nALL PASSED');
process.exit(failures ? 1 : 0);
