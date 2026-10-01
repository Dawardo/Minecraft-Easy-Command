// Dry-run check of tools/auto-builder.ps1 (needs PowerShell: set PWSH=/path/to/pwsh, default "pwsh").
// Uses the plan written by tests/music.test.mjs (run that first).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const planPath = path.join(root, 'tests/out/band_song.slabplan.json');
const pwsh = process.env.PWSH || 'pwsh';
const script = path.join(root, 'tools/auto-builder.ps1');
let failures = 0;
const check = (cond, msg) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`); if (!cond) failures++; };

const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
const prog = planPath + '.dryrun-progress.json';
fs.rmSync(prog, { force: true });
const env = { ...process.env, POWERSHELL_TELEMETRY_OPTOUT: '1' };
const run = (...args) => execFileSync(pwsh, ['-NoProfile', '-File', script, planPath, '-DryRun', '-Yes', ...args], { encoding: 'utf8', env });
// answers to the builder's questions, in order: speed | corner | start block | test run | step-by-step | clear
const ask = answers => execFileSync(pwsh, ['-NoProfile', '-File', script, planPath, '-DryRun', '-Answers', answers], { encoding: 'utf8', env });

// parse check
const parse = execFileSync(pwsh, ['-NoProfile', '-Command',
  `$e=$null; [void][System.Management.Automation.Language.Parser]::ParseFile('${script}', [ref]$null, [ref]$e); if ($e) { $e | % { $_.ToString() } } else { 'OK' }`], { encoding: 'utf8' }).trim();
check(parse === 'OK', 'auto-builder.ps1 parses: ' + parse);

// test run: first 5 blocks
let out = run('-Limit', '5');
const chats = [...out.matchAll(/chat: (.*)/g)].map(m => m[1]);
check(chats[0].endsWith(' air') && chats[1] === plan.levels[0].fill, 'clears the space, then places the first command layer');
const tps = chats.filter(c => c.startsWith('/tp @s'));
check(tps.length === 5 && tps.every((c, i) => c === `/tp @s ${plan.blocks[i].x + 0.5} ${plan.blocks[i].y + 2} ${plan.blocks[i].z + 0.5} 0 90`), 'teleports above each block, looking straight down');
const clips = [...out.matchAll(/type: (.*)/g)].map(m => m[1]);
check(plan.blocks.slice(0, 5).every(b => clips.includes(b.command.slice(1)) && clips.includes(String(b.delay))), 'pastes each command and its Delay in Ticks');
check(/right click[\s\S]*move to[\s\S]*type: playsound[\s\S]*wheel down 12[\s\S]*type: \d+[\s\S]*key 27/.test(out), 'per block: right-click, Command Input, scroll, Delay, Esc');
check(/key 191 \(scan\)\s+\[dry\] type: tp @s [^\n]*\s+\[dry\] key 13/.test(out) && !/type: \//.test(out), 'chat: presses /, types the command without its /, then Enter');
check(/Test run finished: built up to block 5/.test(out), 'test run stops after 5 blocks');

// resume: replaces the next block fresh, continues at block 6
out = run('-Limit', '3');
check(/Resume where it stopped \(block 6/.test(out) && out.includes(`chat: /setblock ${plan.blocks[5].x} ${plan.blocks[5].y} ${plan.blocks[5].z} command_block`), 'resume continues at block 6 and re-places that block fresh');

// finish the rest
out = run();
const allTps = [...out.matchAll(/chat: \/tp @s/g)].length;
check(allTps === plan.blocks.length - 8, `finishes the remaining ${plan.blocks.length - 8} blocks`);
const levelOrder = [...out.matchAll(/Level y=(-?\d+): (\w+)/g)].map(m => `${m[2][0]}${m[1]}`);
check(levelOrder.join() === plan.levels.slice(1).map(l => `${l.kind[0]}${l.y}`).join(), 'places every remaining level in order: ' + levelOrder.join(' '));
check(out.includes('DONE!') && out.includes(plan.start) && !fs.existsSync(prog), 'prints Start / Stop when done and clears the progress file');

// choose a different corner in the builder: everything moves with it
fs.rmSync(prog, { force: true });
out = ask('2|500 80 -300||2|n|n');
const shifted = b => `/tp @s ${b.x - plan.corner.x + 500 + 0.5} ${b.y - plan.corner.y + 80 + 2} ${b.z - plan.corner.z - 300 + 0.5} 0 90`;
check(out.includes(`chat: ${plan.levels[0].fill.replace(/^\/fill (-?\d+) (-?\d+) (-?\d+) (-?\d+) (-?\d+) (-?\d+)/, (m, a, b, c, d, e, f) =>
  `/fill ${+a - plan.corner.x + 500} ${+b - plan.corner.y + 80} ${+c - plan.corner.z - 300} ${+d - plan.corner.x + 500} ${+e - plan.corner.y + 80} ${+f - plan.corner.z - 300}`)}`), 'new corner: the layer /fill moves with it');
check(out.includes(`chat: ${shifted(plan.blocks[0])}`) && out.includes(`chat: ${shifted(plan.blocks[1])}`), 'new corner: teleports move with it');
out = ask('2|y|1|n');
check(out.includes(`chat: ${shifted(plan.blocks[2])}`), 'resume keeps the new corner');
fs.rmSync(prog, { force: true });

// start part-way (earlier blocks already built): no layer refills below it
const startAt = 30;
out = ask(`2||${startAt}|2|n|n`);
const firstTp = (out.match(/chat: (\/tp @s [^\n]*)/) || [])[1];
check(firstTp === `/tp @s ${plan.blocks[startAt - 1].x + 0.5} ${plan.blocks[startAt - 1].y + 2} ${plan.blocks[startAt - 1].z + 0.5} 0 90`, `start at block ${startAt}: goes straight to it`);
check(!/chat: \/fill .* command_block/.test(out.split(firstTp)[0]) && out.includes(`/setblock ${plan.blocks[startAt - 1].x} ${plan.blocks[startAt - 1].y} ${plan.blocks[startAt - 1].z} command_block`), 'start part-way: doesn\'t refill built layers, re-places that block fresh');
fs.rmSync(prog, { force: true });

console.log(failures ? `\n${failures} FAILED` : '\nALL PASSED');
process.exit(failures ? 1 : 0);
