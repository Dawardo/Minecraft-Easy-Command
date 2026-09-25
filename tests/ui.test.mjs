// End-to-end check of the web UI in headless Chromium.
// Run: node tests/ui.test.mjs   (serves ./web itself, needs the `playwright` package)
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const webDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../web');
const server = http.createServer((req, res) => {
  const f = path.join(webDir, req.url === '/' ? 'index.html' : req.url);
  if (!fs.existsSync(f)) { res.statusCode = 404; return res.end(); }
  res.end(fs.readFileSync(f));
}).listen(0);
const url = `http://localhost:${server.address().port}/`;

let failures = 0;
const check = (cond, msg) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`); if (!cond) failures++; };

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const page = await browser.newPage({ acceptDownloads: true });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('dialog', d => d.accept());
await page.goto(url);

// ---- example project loads and is valid ----
const issues = await page.evaluate(() => BDM.validate().filter(i => i.level === 'err'));
check(issues.length === 0, 'example project has no errors ' + JSON.stringify(issues));

// ---- test play: correct password 3,1,4 ----
const press = async label => page.locator('.mc-btns button', { hasText: new RegExp(`^${label}$`) }).click();
const sceneTag = async () => (await page.locator('.mc-dialog .hint .code').textContent().catch(() => null));
await page.click('#btnPlay');
check(await sceneTag() === 'guard_intro', 'NPC starts at guard_intro');
await press('I\'m a friend'); await press('Yes please');
check(await sceneTag() === 'guard_hint', 'branch: friend -> hint');
await press('Back'); await press('Enter code');
check(await sceneTag() === 'pw_castle_1', 'enter code -> pw_castle_1');
await press('3'); await press('1'); await press('4');
check(await sceneTag() === 'guard_welcome', 'code 3,1,4 unlocks -> guard_welcome');
await page.click('#playTalk');
check(await sceneTag() === 'guard_welcome', 'NPC remembers: next talk starts at guard_welcome');

// ---- wrong password with a fresh player ----
await page.click('#playReset');
check(await sceneTag() === 'guard_intro', 'reset player -> back to intro');
await press('Enter code');
await press('2');
const decoyText = await page.locator('.mc-text').textContent();
check(await sceneTag() === 'pw_castle_x2' && decoyText.includes('● _ _'), 'wrong first digit -> identical-looking decoy step');
await press('1'); await press('4');
check(await sceneTag() === 'pw_castle_fail', 'wrong code ends in fail scene');
await press('Try again');
check(await sceneTag() === 'pw_castle_1', 'try again -> step 1');
await page.click('[data-close]');

// ---- build a new project purely through the UI ----
await page.click('#btnMenu'); await page.click('[data-act=new]');
await page.click('[data-click=firstScene]');
await page.fill('[data-sfield=tag]', 'wizard_hello'); await page.press('[data-sfield=tag]', 'Tab');
await page.fill('[data-sfield=name]', 'Wizard');
await page.fill('[data-sfield=text]', 'Greetings! Choose your path.');
await page.click('[data-click=addBtnNew]');
await page.click('[data-click=addBtnNew]');
await page.click('[data-click=addBtnNew]');
await page.fill('[data-b="0"][data-bfield=label]', 'Fire path');
await page.fill('[data-b="1"][data-bfield=label]', 'Ice path');
await page.fill('[data-b="2"][data-bfield=label]', 'Secret door');
// branch 1 goes deeper: open its scene and add two more branches
await page.click('.btn-card >> nth=0 >> button.link');
await page.fill('[data-sfield=text]', 'You chose fire. Left or right?');
await page.click('[data-click=addBtnNew]'); await page.click('[data-click=addBtnNew]');
await page.fill('[data-b="0"][data-bfield=label]', 'Left');
await page.fill('[data-b="1"][data-bfield=label]', 'Right');
// password wizard hooked onto the first scene
await page.click('[data-select]:has-text("wizard_hello")');
await page.click('#btnPassword');
await page.fill('#pwName', 'door');
await page.fill('#pwSymbols', 'Red, Blue, Green, Gold');
await page.fill('#pwCode', 'Gold, Red, Red, Blue');
await page.fill('#pwCmds', '/give @p diamond 1');
await page.click('#pwGo');
const proj = await page.evaluate(() => BDM.project);
const hello = proj.scenes.find(s => s.tag === 'wizard_hello');
check(hello.buttons.length === 4 && hello.buttons[3].label === 'Enter code', 'wizard added "Enter code" button to the scene');
check(proj.scenes.filter(s => s.tag.startsWith('pw_door_')).length === 4 + 3 + 2, 'password made 4 steps + 3 decoys + fail + ok scenes');

// play the new project: wrong then right
await page.click('#btnPlay');
await press('Enter code');
for (const k of ['Gold', 'Red', 'Red', 'Green']) await press(k);
check(await sceneTag() === 'pw_door_fail', 'new lock: wrong last colour fails');
await press('Try again');
for (const k of ['Gold', 'Red', 'Red', 'Blue']) await press(k);
check(await sceneTag() === 'pw_door_ok', 'new lock: correct colours open it');
const log = await page.locator('.play-log').textContent();
check(log.includes('/give @p diamond 1'), 'success command ran');
await page.click('[data-close]');

// branch map renders every scene
await page.click('[data-tab=map]');
check(await page.locator('.map-node').count() === proj.scenes.length, 'branch map shows every scene');

// ---- export ----
const errs2 = await page.evaluate(() => BDM.validate().filter(i => i.level === 'err'));
check(errs2.length === 0, 'built project has no errors ' + JSON.stringify(errs2));
await page.click('[data-tab=export]');
const setup = await page.locator('.cmd-list code').allTextContents();
check(setup[0] === '/summon npc "Villager Bob" ~ ~ ~' && setup[1] === '/dialogue change @e[type=npc,c=1] wizard_hello', 'setup = summon + dialogue change, no tags');
const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-click=dlFolder]')]);
const out = path.resolve('tests/out'); fs.mkdirSync(out, { recursive: true });
const packPath = path.join(out, dl.suggestedFilename());
await dl.saveAs(packPath);
check(packPath.endsWith('.zip'), 'downloaded ' + path.basename(packPath));
const listing = execFileSync('python3', ['-c', `
import zipfile, json, sys
z = zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None
m = json.loads(z.read('My Dialogue Pack/manifest.json')); d = json.loads(z.read('My Dialogue Pack/dialogue/dialogue.json'))
tags = {s['scene_tag'] for s in d['minecraft:npc_dialogue']['scenes']}
import re
for s in d['minecraft:npc_dialogue']['scenes']:
    for b in s.get('buttons', []):
        assert b['commands'], 'empty button'
        for c in b['commands']:
            assert 'tag' not in c and '@initiator' not in c, c
            mm = re.match(r'/dialogue open @e\\[type=npc,c=1\\] @p (\\S+)$', c)
            if c.startswith('/dialogue open'): assert mm and mm.group(1) in tags, c
print(json.dumps({'files': z.namelist(), 'fv': d['format_version'], 'scenes': len(tags), 'module': m['modules'][0]['type']}))
`, packPath]).toString();
console.log('      ' + listing.trim());
check(listing.includes('"fv": "1.17"') && listing.includes('"module": "data"'), 'zip holds a pack folder; every button uses @p, no tags, all scene links resolve');

check(errors.length === 0, 'no page errors ' + errors.join(' | '));
await page.screenshot({ path: path.join(out, 'export.png'), fullPage: true });
await browser.close(); server.close();
console.log(failures ? `\n${failures} FAILED` : '\nALL PASSED');
process.exit(failures ? 1 : 0);
