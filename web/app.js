/* Bedrock Dialogue Maker
 * Builds Minecraft BEDROCK Edition NPC dialogue for ONE NPC:
 *   - a scene file (dialogue/*.json, "minecraft:npc_dialogue", format_version 1.17) so /dialogue knows the scene names
 *   - /summon + /dialogue commands to paste in game
 * Buttons use `/dialogue open @e[type=npc,c=1] @p <scene>`: commands run at the NPC, so the nearest NPC is that NPC.
 * No tags anywhere. No build step, no dependencies.
 */
'use strict';

const STORE_KEY = 'bdm_project_v2';
const MAX_BUTTONS = 6;          // the in-game NPC editor shows up to 6 buttons
const NOOP_CMD = '/testfor @p';  // buttons need at least one command to appear
const NPC_SEL = '@e[type=npc,c=1]'; // run from the NPC, the nearest NPC is itself

// ---------- helpers ----------
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const uid = () => Math.random().toString(36).slice(2, 10);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const slug = s => String(s || '').toLowerCase().trim().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 48);
const uuid4 = () => (crypto.randomUUID ? crypto.randomUUID() :
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16);
  }));
const lines = s => String(s || '').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
const slash = c => (c.startsWith('/') ? c : '/' + c);
const quoteName = n => '"' + String(n || 'NPC').replace(/"/g, "'") + '"';

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.add('hidden'), 1800);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch { /* ignore */ }
    ta.remove();
  }
  toast('Copied!');
}

// ---------- model ----------
function newScene(tag, extra = {}) {
  return { id: uid(), tag: tag || 'scene_' + uid().slice(0, 4), name: '', text: '', group: '', onOpen: '', onClose: '', buttons: [], ...extra };
}
function newButton(extra = {}) {
  return { id: uid(), label: 'Option', action: 'goto', target: '', remember: '', commands: '', ...extra };
}
function emptyProject() {
  return {
    version: 2,
    npcName: 'Villager Bob',
    start: '',
    packName: 'My Dialogue Pack',
    packDesc: 'Made with Bedrock Dialogue Maker',
    fileName: 'dialogue',
    packUuid: uuid4(),
    moduleUuid: uuid4(),
    packVersion: [1, 0, 0],
    scenes: [],
  };
}

let P = null;
const ui = { tab: 'editor', selected: null, play: null };

function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(P)); } catch { /* storage may be unavailable */ }
}
function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    return normalize(JSON.parse(raw));
  } catch { return null; }
}
function normalize(p) {
  const base = emptyProject();
  const out = { ...base, ...p };
  out.scenes = (p.scenes || []).map(s => ({ ...newScene(s.tag), ...s, buttons: (s.buttons || []).map(b => ({ ...newButton(), ...b })) }));
  for (const s of out.scenes) for (const b of s.buttons) if (b.action !== 'close') b.action = 'goto';
  if (!p.start && p.npcs?.[0]) { out.start = p.npcs[0].start; out.npcName = p.npcs[0].name; } // v1 project files
  delete out.npcs;
  return out;
}

const sceneById = id => P.scenes.find(s => s.id === id);
const sceneByTag = tag => P.scenes.find(s => s.tag === tag);
const tagOf = id => sceneById(id)?.tag || '???';

// ---------- command generation ----------
const openCmd = sceneId => `/dialogue open ${NPC_SEL} @p ${tagOf(sceneId)}`;

function buttonCommands(b) {
  const out = lines(b.commands).map(slash);
  if (b.remember && sceneById(b.remember)) out.push(`/dialogue change ${NPC_SEL} ${tagOf(b.remember)} @p`);
  if (b.action === 'goto' && sceneById(b.target)) out.push(openCmd(b.target));
  if (!out.length) out.push(NOOP_CMD);
  return out;
}

function sceneJson(s) {
  const o = { scene_tag: s.tag };
  if (s.name.trim()) o.npc_name = s.name;
  o.text = s.text;
  const open = lines(s.onOpen).map(slash);
  const close = lines(s.onClose).map(slash);
  if (open.length) o.on_open_commands = open;
  if (close.length) o.on_close_commands = close;
  if (s.buttons.length) o.buttons = s.buttons.map(b => ({ name: b.label, commands: buttonCommands(b) }));
  return o;
}

function dialogueFile() {
  return { format_version: '1.17', 'minecraft:npc_dialogue': { scenes: P.scenes.map(sceneJson) } };
}

function manifest() {
  return {
    format_version: 2,
    header: {
      name: P.packName || 'Dialogue Pack',
      description: P.packDesc || '',
      uuid: P.packUuid,
      version: P.packVersion,
      min_engine_version: [1, 20, 0],
    },
    modules: [{ type: 'data', uuid: P.moduleUuid, version: P.packVersion }],
  };
}

function setupCommands() {
  const cmds = [`/summon npc ${quoteName(P.npcName)} ~ ~ ~`];
  if (sceneById(P.start)) cmds.push(`/dialogue change ${NPC_SEL} ${tagOf(P.start)}`);
  return cmds;
}

// ---------- validation ----------
function validate() {
  const issues = [];
  const add = (level, msg, sceneId) => issues.push({ level, msg, sceneId });
  const seen = {};
  const reachable = new Set();
  if (!P.scenes.length) add('warn', 'No scenes yet. Click "+ Scene" to start.');
  if (P.scenes.length && !sceneById(P.start)) add('err', 'Pick the scene the NPC starts at (NPC box, top left).');
  else reachable.add(P.start);
  for (const s of P.scenes) {
    if (!s.tag) add('err', 'A scene has an empty ID.', s.id);
    else if (!/^[a-z0-9_]+$/.test(s.tag)) add('err', `Scene "${s.tag}": use only a-z, 0-9 and _`, s.id);
    if (seen[s.tag]) add('err', `Scene ID "${s.tag}" is used twice.`, s.id);
    seen[s.tag] = true;
    if (!s.text.trim()) add('warn', `Scene "${s.tag}" has no dialogue text.`, s.id);
    if (s.buttons.length > MAX_BUTTONS) add('err', `Scene "${s.tag}" has more than ${MAX_BUTTONS} buttons.`, s.id);
    s.buttons.forEach((b, i) => {
      const where = `Scene "${s.tag}" button ${i + 1}`;
      if (!b.label.trim()) add('err', `${where} has no text.`, s.id);
      if (b.action === 'goto') {
        if (!sceneById(b.target)) add('err', `${where} goes to a scene that doesn't exist.`, s.id);
        else reachable.add(b.target);
      }
      if (b.remember && sceneById(b.remember)) reachable.add(b.remember);
    });
  }
  for (const s of P.scenes) if (!reachable.has(s.id)) add('warn', `Scene "${s.tag}" can't be reached (no button leads to it).`, s.id);
  return issues;
}

// ---------- sidebar ----------
function sceneOptions(selected, { blank = '— choose —', allowNew = false } = {}) {
  let h = `<option value="">${esc(blank)}</option>`;
  for (const s of P.scenes) h += `<option value="${s.id}" ${s.id === selected ? 'selected' : ''}>${esc(s.tag)}</option>`;
  if (allowNew) h += `<option value="__new">+ New scene…</option>`;
  return h;
}

function renderSidebar() {
  const sb = $('#sidebar');
  const issues = validate();
  const groups = {};
  for (const s of P.scenes) (groups[s.group || ''] ||= []).push(s);
  const startIds = new Set([P.start]);

  let scenesHtml = '';
  for (const [g, list] of Object.entries(groups)) {
    if (g) scenesHtml += `<div class="group-label">&#128193; ${esc(g)}</div>`;
    for (const s of list) {
      const badge = startIds.has(s.id) ? '<span class="badge" title="The NPC starts here">&#11088;</span>' : '';
      scenesHtml += `<button class="scene-item ${s.id === ui.selected && ui.tab === 'editor' ? 'active' : ''}" data-select="${s.id}">
        ${badge}<div class="tag">${esc(s.tag)}</div><div class="preview">${esc(s.text.split('\n')[0] || '(no text)')}</div></button>`;
    }
  }

  const npcHtml = `
    <div class="npc-item">
      <label style="margin-top:0">Name</label>
      <input type="text" value="${esc(P.npcName)}" data-pfield="npcName">
      <label>Starts at scene</label>
      <select data-pfield="start">${sceneOptions(P.start)}</select>
    </div>`;

  sb.innerHTML = `
    <div class="side-section">
      <div class="side-head"><h3>The NPC</h3></div>
      ${npcHtml}
    </div>
    <div class="side-section">
      <div class="side-head"><h3>Scenes (${P.scenes.length})</h3><button class="small" id="addScene">+ Scene</button></div>
      ${scenesHtml || '<div class="hint">No scenes yet.</div>'}
    </div>
    <div class="side-section">
      <div class="side-head"><h3>Checks</h3></div>
      <div id="issuesBox">${issuesHtml(issues)}</div>
    </div>`;
}

function issuesHtml(issues = validate()) {
  const errs = issues.filter(i => i.level === 'err').length;
  return `<div class="issues">
    ${issues.length ? issues.map(i => `<div class="issue ${i.level === 'err' ? 'err' : ''}" ${i.sceneId ? `data-select="${i.sceneId}"` : ''}>${i.level === 'err' ? '&#10060;' : '&#9888;'} ${esc(i.msg)}</div>`).join('')
      : '<div class="ok">&#10004; Everything looks good.</div>'}
    </div>${errs ? `<div class="hint">Fix the red items before exporting.</div>` : ''}`;
}
function renderIssues() { const box = $('#issuesBox'); if (box) box.innerHTML = issuesHtml(); }

function addScene(extra = {}) {
  let n = P.scenes.length + 1;
  while (sceneByTag('scene_' + n)) n++;
  const s = newScene('scene_' + n, extra);
  P.scenes.push(s);
  return s;
}

// ---------- editor ----------
function renderEditor() {
  const main = $('#main');
  const s = sceneById(ui.selected) || P.scenes[0];
  if (!s) {
    main.innerHTML = `<div class="card"><h2>Start here</h2>
      <p>Create your first scene. A <b>scene</b> is one dialogue box: the NPC's text plus up to ${MAX_BUTTONS} buttons.
      Buttons can jump to other scenes, so you can build branches as deep as you like.</p>
      <div class="row"><button class="primary" data-click="firstScene">+ Create first scene</button>
      <button data-click="loadExample">Load the example project</button></div></div>`;
    return;
  }
  ui.selected = s.id;
  const usedBy = [];
  for (const o of P.scenes) for (const b of o.buttons) {
    if ([b.target, b.remember].includes(s.id)) usedBy.push(`${o.tag} → “${b.label}”`);
  }
  if (P.start === s.id) usedBy.unshift('the NPC starts here');

  main.innerHTML = `
    <div class="card">
      <div class="row">
        <h2 style="margin:0">Scene</h2><span class="spacer"></span>
        <button class="small" data-click="playHere">&#9654; Test from here</button>
        <button class="small" data-click="dupScene">Duplicate</button>
        <button class="small danger" data-click="delScene">Delete scene</button>
      </div>
      <div class="grid2">
        <div>
          <label>Scene ID (scene_tag) — lowercase, numbers, _</label>
          <input type="text" class="code" data-sfield="tag" value="${esc(s.tag)}">
        </div>
        <div>
          <label>NPC name shown in the box (optional)</label>
          <input type="text" data-sfield="name" value="${esc(s.name)}" placeholder="e.g. Guard">
        </div>
      </div>
      <label>What the NPC says</label>
      <textarea data-sfield="text" rows="4" placeholder="Hello traveler! What brings you here?">${esc(s.text)}</textarea>
      <div class="hint">${usedBy.length ? 'Reached from: ' + usedBy.map(esc).join(' · ') : '&#9888; Nothing leads here yet.'}</div>
    </div>

    <div class="card">
      <div class="row"><h2 style="margin:0">Buttons (${s.buttons.length}/${MAX_BUTTONS})</h2><span class="spacer"></span>
        <button class="small" data-click="addBtnNew" ${s.buttons.length >= MAX_BUTTONS ? 'disabled' : ''}>+ Button → new scene</button>
        <button class="small" data-click="addBtn" ${s.buttons.length >= MAX_BUTTONS ? 'disabled' : ''}>+ Button</button>
      </div>
      <div class="hint" style="margin-bottom:10px">Each button can open another scene (a branch), end the conversation, and run your own commands.</div>
      ${s.buttons.map((b, i) => buttonCard(s, b, i)).join('') || '<div class="hint">No buttons: the player just reads the text and closes the box.</div>'}
    </div>

    <div class="card">
      <details ${s.onOpen || s.onClose ? 'open' : ''}>
        <summary><b>Advanced:</b> commands when this box opens / closes</summary>
        <div class="grid2">
          <div><label>On open (one command per line)</label><textarea class="code" data-sfield="onOpen" placeholder="/playsound random.orb @p">${esc(s.onOpen)}</textarea></div>
          <div><label>On close (one command per line)</label><textarea class="code" data-sfield="onClose">${esc(s.onClose)}</textarea></div>
        </div>
        <label>Folder / group (just for organizing the list)</label>
        <input type="text" data-sfield="group" value="${esc(s.group)}">
      </details>
    </div>

    <div class="card">
      <h3>Generated scene JSON (Bedrock)</h3>
      <pre class="preview-box code" id="scenePreview"></pre>
    </div>`;
  updateScenePreview();
}

function buttonCard(s, b, i) {
  const targetSel = (field, val, blank) =>
    `<select data-b="${i}" data-bfield="${field}">${sceneOptions(val, { blank, allowNew: true })}</select>`;
  let actionUi = '';
  if (b.action === 'goto') actionUi = `<label>Go to scene</label>${targetSel('target', b.target, '— choose —')}`;
  return `
    <div class="btn-card">
      <div class="row">
        <span class="num">${i + 1}</span>
        <input type="text" style="flex:2;width:auto" data-b="${i}" data-bfield="label" value="${esc(b.label)}" placeholder="Button text">
        <select style="flex:1;width:auto" data-b="${i}" data-bfield="action">
          <option value="goto" ${b.action === 'goto' ? 'selected' : ''}>→ Go to scene</option>
          <option value="close" ${b.action === 'close' ? 'selected' : ''}>✕ End conversation</option>
        </select>
        <button class="small" data-click="btnUp" data-arg="${i}" title="Move up" ${i === 0 ? 'disabled' : ''}>&#9650;</button>
        <button class="small" data-click="btnDown" data-arg="${i}" title="Move down" ${i === s.buttons.length - 1 ? 'disabled' : ''}>&#9660;</button>
        <button class="small danger" data-click="btnDel" data-arg="${i}" title="Delete">&#10005;</button>
      </div>
      ${actionUi}
      ${b.action === 'goto' && sceneById(b.target) ? `<div class="hint"><button class="link" data-select="${b.target}">Edit “${esc(tagOf(b.target))}” &rarr;</button></div>` : ''}
      <details ${b.commands || b.remember ? 'open' : ''}>
        <summary>Extras: remember progress, custom commands</summary>
        <label>Remember: next time this player talks to the NPC, start at…</label>
        <select data-b="${i}" data-bfield="remember">${sceneOptions(b.remember, { blank: '(don\'t change)' })}</select>
        <label>Custom commands (one per line, run in order before the scene changes; @p = the player)</label>
        <textarea class="code" data-b="${i}" data-bfield="commands" placeholder="/give @p diamond 1">${esc(b.commands)}</textarea>
      </details>
    </div>`;
}

function updateScenePreview() {
  const s = sceneById(ui.selected);
  const el = $('#scenePreview');
  if (s && el) el.textContent = JSON.stringify(sceneJson(s), null, 2);
}

// ---------- password wizard ----------
function passwordModal() {
  const cur = sceneById(ui.selected);
  openModal(`
    <h2>&#128274; Password / code lock wizard</h2>
    <p class="hint" style="font-size:13px">Bedrock dialogue has no text box, so a password is entered by pressing buttons in order, like a keypad.
    The wizard builds one scene per digit. Wrong presses go down a hidden “decoy” path that looks identical,
    so players only find out at the end, and they can't guess the code one button at a time.</p>
    <div class="grid2">
      <div><label>Lock name</label><input type="text" id="pwName" value="vault"></div>
      <div><label>Name shown in the box (optional)</label><input type="text" id="pwSpeaker" value="${esc(cur?.name || '')}"></div>
    </div>
    <label>Keypad buttons (comma separated, max ${MAX_BUTTONS})</label>
    <input type="text" id="pwSymbols" value="1, 2, 3, 4, 5">
    <label>The secret code (comma separated, using the keypad buttons above)</label>
    <input type="text" id="pwCode" value="3, 1, 4">
    <label>Prompt text</label>
    <input type="text" id="pwPrompt" value="Enter the secret code.">
    <label><input type="checkbox" id="pwCancel" checked> Add a “Cancel” button (needs a free button slot)</label>
    <label><input type="checkbox" id="pwDots" checked> Show progress like “Code: ● ● _”</label>
    <label>On success, go to</label><select id="pwOk">${sceneOptions('', { blank: '(create an “Access granted” scene)' })}</select>
    <label>Extra success commands (optional, one per line)</label>
    <textarea class="code" id="pwCmds" placeholder="/setblock 10 64 10 redstone_block"></textarea>
    <label>Hook it up: add a button to this scene that starts the lock</label>
    <select id="pwFrom">${sceneOptions(cur?.id || '', { blank: '(don\'t add a button)' })}</select>
    <div class="hint" id="pwErr" style="color:var(--err)"></div>
    <div class="row" style="margin-top:14px"><span class="spacer"></span>
      <button data-close>Cancel</button><button class="primary" id="pwGo">Create password scenes</button></div>`);
  $('#pwGo').onclick = () => {
    const opts = {
      name: $('#pwName').value, speaker: $('#pwSpeaker').value,
      symbols: $('#pwSymbols').value.split(',').map(x => x.trim()).filter(Boolean),
      code: $('#pwCode').value.split(',').map(x => x.trim()).filter(Boolean),
      prompt: $('#pwPrompt').value, cancel: $('#pwCancel').checked, dots: $('#pwDots').checked,
      successScene: $('#pwOk').value, successCmds: $('#pwCmds').value,
      fromScene: $('#pwFrom').value,
    };
    const err = createPassword(opts);
    if (err) { $('#pwErr').textContent = err; return; }
    closeModal(); save(); renderAll(); toast('Password scenes created!');
  };
}

/** Builds a keypad password as a chain of scenes. Returns an error string, or '' on success. */
function createPassword(o) {
  const name = slug(o.name) || 'lock';
  const symbols = [...new Set(o.symbols)];
  if (symbols.length < 2) return 'Use at least 2 keypad buttons.';
  if (symbols.length > MAX_BUTTONS) return `At most ${MAX_BUTTONS} keypad buttons fit in one dialogue box.`;
  if (!o.code.length) return 'Enter the secret code.';
  const bad = o.code.find(c => !symbols.includes(c));
  if (bad) return `The code uses "${bad}" but that isn't one of the keypad buttons.`;
  const prefix = `pw_${name}`;
  if (P.scenes.some(s => s.tag.startsWith(prefix + '_'))) return `A lock named "${name}" already exists. Pick another name.`;
  const cancel = o.cancel && symbols.length < MAX_BUTTONS;
  const N = o.code.length;
  const group = `Password: ${name}`;
  const progress = k => o.dots ? `\n\nCode: ${Array.from({ length: N }, (_, i) => (i < k ? '●' : '_')).join(' ')}` : '';
  const mk = (tag, text) => { const s = newScene(tag, { name: o.speaker, text, group }); P.scenes.push(s); return s; };

  const steps = [], decoys = [];
  for (let k = 0; k < N; k++) steps.push(mk(`${prefix}_${k + 1}`, o.prompt + progress(k)));
  for (let k = 1; k < N; k++) decoys[k] = mk(`${prefix}_x${k + 1}`, o.prompt + progress(k));
  const fail = mk(`${prefix}_fail`, 'Wrong code!');
  let ok = sceneById(o.successScene);
  if (!ok) ok = mk(`${prefix}_ok`, 'Access granted!');

  const successExtras = { commands: o.successCmds || '' };
  for (let k = 0; k < N; k++) {
    const last = k === N - 1;
    const wrongTarget = last ? fail.id : decoys[k + 1].id;
    steps[k].buttons = symbols.map(sym => sym === o.code[k]
      ? newButton({ label: sym, target: last ? ok.id : steps[k + 1].id, ...(last ? successExtras : {}) })
      : newButton({ label: sym, target: wrongTarget }));
    if (k > 0) decoys[k].buttons = symbols.map(sym => newButton({ label: sym, target: last ? fail.id : decoys[k + 1].id }));
  }
  if (cancel) {
    steps.forEach(s => s.buttons.push(newButton({ label: 'Cancel', action: 'close' })));
    decoys.forEach(s => s && s.buttons.push(newButton({ label: 'Cancel', action: 'close' })));
  }
  fail.buttons = [newButton({ label: 'Try again', target: steps[0].id }), newButton({ label: 'Leave', action: 'close' })];
  if (ok.group === group && !ok.buttons.length) ok.buttons = [newButton({ label: 'Thanks!', action: 'close' })];

  const from = sceneById(o.fromScene);
  if (from) {
    if (from.buttons.length < MAX_BUTTONS) from.buttons.push(newButton({ label: 'Enter code', target: steps[0].id }));
    else toast(`"${from.tag}" already has ${MAX_BUTTONS} buttons, so no button was added.`);
  }
  ui.selected = steps[0].id;
  return '';
}

// ---------- example project ----------
function exampleProject() {
  const saved = P;
  const p = emptyProject();
  p.packName = 'Example Dialogue Pack';
  p.npcName = 'Guard';
  P = p;
  const intro = newScene('guard_intro', { text: 'Halt! Nobody enters the castle without the code.' });
  const friend = newScene('guard_friend', { text: 'A friend, huh? Friends know the code. Want a hint?' });
  const hint = newScene('guard_hint', { text: 'Fine. It starts with 3, then 1, and ends with 4. Don\'t tell anyone!' });
  const welcome = newScene('guard_welcome', { text: 'Welcome back! The gate is open for you.' });
  p.scenes.push(intro, friend, hint, welcome);
  intro.buttons = [
    newButton({ label: 'I\'m a friend', target: friend.id }),
    newButton({ label: 'Goodbye', action: 'close' }),
  ];
  friend.buttons = [newButton({ label: 'Yes please', target: hint.id }), newButton({ label: 'Back', target: intro.id })];
  hint.buttons = [newButton({ label: 'Back', target: intro.id })];
  welcome.buttons = [newButton({ label: 'Thanks', action: 'close', commands: '/give @p bread 1' })];
  createPassword({
    name: 'castle', speaker: '', symbols: ['1', '2', '3', '4', '5'], code: ['3', '1', '4'],
    prompt: 'Enter the castle code.', cancel: true, dots: true,
    successScene: welcome.id, successCmds: '', fromScene: intro.id,
  });
  // after unlocking, the guard greets this player with the welcome scene
  const lastStep = p.scenes.find(s => s.tag === 'pw_castle_3');
  lastStep.buttons.find(b => b.target === welcome.id).remember = welcome.id;
  p.start = intro.id;
  P = saved || p;
  return p;
}

// ---------- map ----------
function edgesOf(s) {
  const e = [];
  s.buttons.forEach(b => {
    if (b.action === 'goto' && sceneById(b.target)) e.push({ to: b.target, label: b.label, kind: 'goto' });
    if (b.remember && sceneById(b.remember)) e.push({ to: b.remember, label: 'remember', kind: 'remember' });
  });
  // merge buttons that lead to the same place (e.g. keypad keys) into one arrow
  const merged = [];
  for (const x of e) {
    const m = merged.find(y => y.to === x.to && y.kind === x.kind);
    if (m) { m.labels.push(x.label); } else merged.push({ ...x, labels: [x.label] });
  }
  for (const m of merged) {
    const all = m.labels.join(', ');
    m.label = all.length <= 24 ? all : `${m.labels.length} buttons`;
  }
  return merged;
}

function renderMap() {
  const main = $('#main');
  if (!P.scenes.length) { main.innerHTML = '<div class="card">No scenes yet.</div>'; return; }
  const depth = {};
  const roots = sceneById(P.start) ? [P.start] : [];
  const queue = [...new Set(roots)];
  queue.forEach(id => (depth[id] = 0));
  while (queue.length) {
    const id = queue.shift();
    for (const e of edgesOf(sceneById(id))) {
      if (e.kind === 'remember') continue;
      if (depth[e.to] === undefined) { depth[e.to] = depth[id] + 1; queue.push(e.to); }
    }
  }
  const maxD = Math.max(0, ...Object.values(depth));
  const orphans = P.scenes.filter(s => depth[s.id] === undefined);
  orphans.forEach(s => (depth[s.id] = maxD + 1));
  const cols = {};
  for (const s of P.scenes) (cols[depth[s.id]] ||= []).push(s);
  const W = 190, H = 58, GX = 110, GY = 26, PAD = 30;
  const pos = {};
  let maxRows = 0;
  for (const [d, list] of Object.entries(cols)) {
    list.forEach((s, r) => (pos[s.id] = { x: PAD + d * (W + GX), y: PAD + r * (H + GY) }));
    maxRows = Math.max(maxRows, list.length);
  }
  const width = PAD * 2 + (Object.keys(cols).length) * (W + GX);
  const height = PAD * 2 + maxRows * (H + GY) + 40;
  const startIds = new Set(roots);
  const colors = { goto: '#5dbb63', remember: '#9aa0ab' };
  let edges = '', labels = '';
  for (const s of P.scenes) {
    const list = edgesOf(s);
    list.forEach((e, idx) => {
      const a = pos[s.id], b = pos[e.to];
      const x1 = a.x + W, y1 = a.y + H / 2 + (idx - (list.length - 1) / 2) * 6;
      let path, lx, ly;
      if (b.x > a.x) {
        const x2 = b.x, y2 = b.y + H / 2;
        path = `M${x1},${y1} C${x1 + 50},${y1} ${x2 - 50},${y2} ${x2},${y2}`;
        lx = (x1 + x2) / 2; ly = (y1 + y2) / 2 - 3;
      } else {
        // back / same-column link: loop under the boxes
        const x2 = b.x + W / 2, y2 = b.y + H;
        const low = Math.max(a.y, b.y) + H + 18 + idx * 4;
        path = `M${x1},${y1} C${x1 + 40},${y1} ${x1 + 40},${low} ${(x1 + x2) / 2},${low} S${x2},${low} ${x2},${y2}`;
        lx = (x1 + x2) / 2; ly = low - 3;
      }
      edges += `<path d="${path}" fill="none" stroke="${colors[e.kind]}" stroke-width="1.6" ${e.kind === 'remember' ? 'stroke-dasharray="4 4"' : ''} marker-end="url(#arr-${e.kind})" opacity=".85"/>`;
      if (e.kind !== 'remember') labels += `<text x="${lx}" y="${ly}" text-anchor="middle" style="font-size:11px;fill:#c9c9c9">${esc(e.label.slice(0, 26))}</text>`;
    });
  }
  let nodes = '';
  for (const s of P.scenes) {
    const p = pos[s.id];
    const cls = startIds.has(s.id) ? 'start' : (orphans.includes(s) ? 'orphan' : '');
    const npcNames = P.start === s.id ? '⭐ ' + P.npcName : '';
    nodes += `<g class="map-node ${cls}" data-select="${s.id}" transform="translate(${p.x},${p.y})">
      <rect width="${W}" height="${H}" rx="6"/>
      <text class="tag" x="10" y="19">${esc(s.tag.slice(0, 26))}</text>
      <text x="10" y="36">${esc((s.text.split('\n')[0] || '(no text)').slice(0, 28))}</text>
      <text class="sub" x="10" y="51">${esc(npcNames || `${s.buttons.length} button(s)`)}</text></g>`;
  }
  const marker = k => `<marker id="arr-${k}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${colors[k]}"/></marker>`;
  main.innerHTML = `
    <div class="card"><h2>Branch map</h2>
      <div class="legend"><span>⭐ green border = NPC starts here</span><span style="color:#5dbb63">— button goes to</span>
      <span>- - remember</span><span style="color:var(--warn)">dashed box = unreachable</span></div>
      <div class="hint">Click a box to edit that scene.</div></div>
    <div class="map-wrap"><svg width="${width}" height="${height}">
      <defs>${marker('goto')}${marker('remember')}</defs>${edges}${nodes}${labels}</svg></div>`;
}

// ---------- export ----------
function renderExport() {
  const main = $('#main');
  const errs = validate().filter(i => i.level === 'err');
  const warnBox = errs.length ? `<div class="card" style="border-color:var(--err)"><b>&#10060; ${errs.length} problem(s) to fix first:</b><ul>${errs.map(e => `<li>${esc(e.msg)}</li>`).join('')}</ul></div>` : '';
  const json = JSON.stringify(dialogueFile(), null, 2);
  const folder = packFolderName();
  const setup = setupCommands();
  main.innerHTML = warnBox + `
    <div class="card">
      <h2>How it works</h2>
      <p>You use <b>one NPC</b>. Every scene is a dialogue box with up to ${MAX_BUTTONS} buttons, and a button branches with
      <span class="code">/dialogue open ${NPC_SEL} @p &lt;scene&gt;</span>. Commands run where the NPC is, so the nearest NPC is the NPC itself,
      and <span class="code">@p</span> is the player standing at it. No tags, no .mcpack.</p>
      <p class="hint">Bedrock only knows a scene name if it's written in a scene file, so step 1 gives you that file as a plain folder.</p>
    </div>
    <div class="card">
      <h2>Step 1: Put the scene file in Minecraft (once, then again whenever you change the dialogue)</h2>
      <div class="grid2">
        <div><label>Folder name</label><input type="text" data-pfield="packName" value="${esc(P.packName)}"></div>
        <div><label>Scene file name</label><input type="text" class="code" data-pfield="fileName" value="${esc(P.fileName)}"></div>
      </div>
      <div class="row" style="margin-top:12px">
        <button class="primary" data-click="dlFolder">&#11015; Download folder (.zip)</button>
        <button data-click="copyJson">Copy scene JSON</button>
      </div>
      <ol class="steps" style="margin-top:12px">
        <li>Extract the zip. You get a folder called <b class="code">${esc(folder)}</b>.</li>
        <li>Put that folder in <b class="code">development_behavior_packs</b> inside your <span class="code">com.mojang</span> folder. That's either
          <div class="code" style="margin:4px 0">%APPDATA%\\Minecraft Bedrock\\Users\\Shared\\games\\com.mojang\\development_behavior_packs</div>
          or, on older versions,
          <div class="code" style="margin:4px 0">%LOCALAPPDATA%\\Packages\\Microsoft.MinecraftUWP_8wekyb3d8bbwe\\LocalState\\games\\com.mojang\\development_behavior_packs</div>
          (paste the path into the File Explorer address bar).</li>
        <li>Edit your world → <b>Behavior Packs</b> → Available → activate <b>${esc(P.packName)}</b>. Turn on <b>Cheats</b>.</li>
        <li>Later changes: replace the folder's contents and reopen the world.</li>
      </ol>
    </div>
    <div class="card">
      <h2>Step 2: Paste these in chat</h2>
      <p class="hint">Stand where you want the NPC, then run them in order.</p>
      ${cmdList(setup)}
      ${setup.length > 1 ? `<button class="small" data-copy="${esc(setup.join('\n'))}">Copy both</button>` : ''}
      <p class="hint">Done. Players right-click / tap the NPC and the dialogue starts at <b>${esc(tagOf(P.start))}</b>.</p>
    </div>
    <div class="card">
      <h2>Optional commands</h2>
      <p class="hint">Open the dialogue without clicking (command block near the NPC, e.g. behind a pressure plate):</p>
      ${cmdList(sceneById(P.start) ? [`/dialogue open ${NPC_SEL} @p ${tagOf(P.start)}`] : [])}
      <p class="hint">Send everyone back to the start (e.g. after using “remember progress”):</p>
      ${cmdList(sceneById(P.start) ? [`/dialogue change ${NPC_SEL} ${tagOf(P.start)}`] : [])}
    </div>
    <div class="card">
      <details><summary><b>View the generated files</b></summary>
        <h3 style="margin-top:10px">${esc(folder)}/dialogue/${esc(slug(P.fileName) || 'dialogue')}.json</h3><pre class="preview-box code">${esc(json)}</pre>
        <h3>${esc(folder)}/manifest.json</h3><pre class="preview-box code">${esc(JSON.stringify(manifest(), null, 2))}</pre>
      </details>
    </div>`;
}

function cmdList(cmds) {
  return `<ul class="cmd-list">${cmds.map(c => `<li><code>${esc(c)}</code><button class="small" data-copy="${esc(c)}">Copy</button></li>`).join('')}</ul>`;
}

// ---------- zip / download ----------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
function crc32(buf) { let c = 0xFFFFFFFF; for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }

/** Minimal "stored" (uncompressed) zip writer. */
function makeZip(files) {
  const enc = new TextEncoder();
  const parts = [], central = [];
  let offset = 0;
  const d = new Date();
  const dosTime = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const dosDate = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  for (const f of files) {
    const name = enc.encode(f.name);
    const data = typeof f.data === 'string' ? enc.encode(f.data) : f.data;
    const crc = crc32(data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true); local.setUint16(4, 20, true); local.setUint16(6, 0x0800, true);
    local.setUint16(8, 0, true); local.setUint16(10, dosTime, true); local.setUint16(12, dosDate, true);
    local.setUint32(14, crc, true); local.setUint32(18, data.length, true); local.setUint32(22, data.length, true);
    local.setUint16(26, name.length, true); local.setUint16(28, 0, true);
    parts.push(new Uint8Array(local.buffer), name, data);
    const cen = new DataView(new ArrayBuffer(46));
    cen.setUint32(0, 0x02014b50, true); cen.setUint16(4, 20, true); cen.setUint16(6, 20, true); cen.setUint16(8, 0x0800, true);
    cen.setUint16(10, 0, true); cen.setUint16(12, dosTime, true); cen.setUint16(14, dosDate, true);
    cen.setUint32(16, crc, true); cen.setUint32(20, data.length, true); cen.setUint32(24, data.length, true);
    cen.setUint16(28, name.length, true); cen.setUint32(42, offset, true);
    central.push(new Uint8Array(cen.buffer), name);
    offset += 30 + name.length + data.length;
  }
  const cenSize = central.reduce((a, p) => a + p.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
  end.setUint32(12, cenSize, true); end.setUint32(16, offset, true);
  return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: 'application/zip' });
}

function download(name, blob) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

const packFolderName = () => (P.packName || 'dialogue_pack').replace(/[<>:"/\\|?*]+/g, '').trim() || 'dialogue_pack';
function buildPackFiles() {
  const file = slug(P.fileName) || 'dialogue';
  const dir = packFolderName();
  return [
    { name: `${dir}/manifest.json`, data: JSON.stringify(manifest(), null, 2) },
    { name: `${dir}/dialogue/${file}.json`, data: JSON.stringify(dialogueFile(), null, 2) },
  ];
}

// ---------- test play ----------
function startPlay(sceneId) {
  ui.play = ui.play || { remembered: null, log: [] };
  ui.play.log = [];
  ui.play.scene = null;
  const first = sceneId || ui.play.remembered || P.start || P.scenes[0]?.id;
  if (sceneById(first)) enterScene(first);
  renderPlay();
}
function enterScene(id) {
  ui.play.scene = id;
  const s = sceneById(id);
  ui.play.log.push({ nav: true, t: `→ opened ${s.tag}` });
  for (const c of lines(s.onOpen)) ui.play.log.push({ t: slash(c) });
}
function pressButton(i) {
  const s = sceneById(ui.play.scene);
  const b = s.buttons[i];
  ui.play.log.push({ nav: true, t: `pressed “${b.label}”` });
  for (const c of lines(b.commands)) ui.play.log.push({ t: slash(c) });
  if (b.remember && sceneById(b.remember)) { ui.play.remembered = b.remember; ui.play.log.push({ t: `NPC will now start at ${tagOf(b.remember)} for you` }); }
  for (const c of lines(s.onClose)) ui.play.log.push({ t: slash(c) });
  if (b.action === 'goto' && sceneById(b.target)) enterScene(b.target);
  else { ui.play.scene = null; ui.play.log.push({ nav: true, t: '(dialogue closed)' }); }
  renderPlay();
}
function renderPlay() {
  const pl = ui.play;
  const s = sceneById(pl.scene);
  openModal(`
    <div class="row"><h2 style="margin:0">&#9654; Test play</h2><span class="spacer"></span><button data-close>Close</button></div>
    <div class="row" style="margin:10px 0">
      <button class="small" id="playTalk">Talk to ${esc(P.npcName || 'NPC')}</button>
      <button class="small" id="playReset">Reset player (forget progress)</button>
      ${pl.remembered ? `<span class="hint">NPC starts at <span class="code">${esc(tagOf(pl.remembered))}</span> for you</span>` : ''}
    </div>
    ${s ? `<div class="mc-dialog">
        <div class="mc-name">${esc(s.name || P.npcName || 'NPC')}</div>
        <div class="mc-text">${esc(s.text)}</div>
        <div class="mc-btns">${s.buttons.map((b, i) => `<button data-press="${i}">${esc(b.label)}</button>`).join('')}</div>
        <div class="hint" style="margin-top:8px">scene: <span class="code">${esc(s.tag)}</span></div>
      </div>` : `<div class="mc-dialog"><div class="mc-text">(The dialogue box is closed. Click “Talk to ${esc(P.npcName || 'NPC')}” to talk again.)</div></div>`}
    <div class="play-log">${pl.log.slice(-40).map(l => `<div class="${l.nav ? 'nav' : ''}">${esc(l.t)}</div>`).join('')}</div>`);
  const card = $('#modalCard');
  $$('[data-press]', card).forEach(b => (b.onclick = () => pressButton(+b.dataset.press)));
  $('#playTalk').onclick = () => startPlay(null);
  $('#playReset').onclick = () => { ui.play.remembered = null; startPlay(null); };
  const log = $('.play-log', card); log.scrollTop = log.scrollHeight;
}

// ---------- modal ----------
function openModal(html) {
  $('#modalCard').innerHTML = html;
  $('#modal').classList.remove('hidden');
  $$('[data-close]', $('#modalCard')).forEach(b => (b.onclick = closeModal));
}
function closeModal() { $('#modal').classList.add('hidden'); if (ui.play) ui.play.open = false; }

// ---------- render + events ----------
function renderMain() {
  $$('#tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === ui.tab));
  if (ui.tab === 'editor') renderEditor();
  else if (ui.tab === 'map') renderMap();
  else renderExport();
}
function renderAll() { renderSidebar(); renderMain(); }

function select(id) {
  ui.selected = id;
  ui.tab = 'editor';
  renderAll();
  $('#main').scrollTop = 0;
}

function onFieldInput(e) {
  const el = e.target;
  const s = sceneById(ui.selected);
  if (el.dataset.sfield && s) {
    if (el.dataset.sfield === 'tag') {
      // keep scene IDs Bedrock-friendly while typing
      const clean = el.value.toLowerCase().replace(/[^a-z0-9_]/g, '_');
      if (clean !== el.value) { const pos = el.selectionStart; el.value = clean; el.setSelectionRange(pos, pos); }
    }
    s[el.dataset.sfield] = el.value;
    updateScenePreview();
  } else if (el.dataset.bfield && s) {
    const b = s.buttons[+el.dataset.b];
    const f = el.dataset.bfield;
    if (el.value === '__new') {
      const ns = addScene({ name: s.name, group: s.group });
      b[f] = ns.id;
      save(); renderAll(); toast(`Created ${ns.tag}. Fill it in later from the list.`);
      return;
    }
    b[f] = el.value;
    if (e.type === 'change' && ['action', 'target'].includes(f)) { save(); renderAll(); return; }
    updateScenePreview();
  } else if (el.dataset.pfield) {
    P[el.dataset.pfield] = el.value;
    save();
    if (el.tagName === 'SELECT') renderAll(); else renderIssues();
    return;
  } else return;
  save();
  renderSidebar();
}

function onFieldChange(e) {
  const el = e.target;
  // Text fields were already saved on 'input'. Re-rendering here (on blur) would swallow the click that caused the blur.
  if (el.dataset.sfield === 'tag') {
    const s = sceneById(ui.selected);
    const tidy = slug(el.value);
    if (tidy && tidy !== el.value) { s.tag = tidy; el.value = tidy; save(); renderSidebar(); updateScenePreview(); }
    return;
  }
  if (el.tagName === 'SELECT') onFieldInput(e);
}

const actions = {
  firstScene() { const s = addScene(); if (!sceneById(P.start)) P.start = s.id; ui.selected = s.id; },
  loadExample() { P = exampleProject(); ui.selected = P.scenes[0].id; },
  addBtn() { sceneById(ui.selected).buttons.push(newButton()); },
  addBtnNew() {
    const s = sceneById(ui.selected);
    const ns = addScene({ name: s.name, group: s.group });
    s.buttons.push(newButton({ label: 'Option ' + (s.buttons.length + 1), target: ns.id }));
  },
  btnUp(i) { const b = sceneById(ui.selected).buttons; [b[i - 1], b[i]] = [b[i], b[i - 1]]; },
  btnDown(i) { const b = sceneById(ui.selected).buttons; [b[i + 1], b[i]] = [b[i], b[i + 1]]; },
  btnDel(i) { sceneById(ui.selected).buttons.splice(i, 1); },
  dupScene() {
    const s = sceneById(ui.selected);
    const copy = JSON.parse(JSON.stringify(s));
    copy.id = uid(); copy.buttons.forEach(b => (b.id = uid()));
    let n = 2; while (sceneByTag(`${s.tag}_${n}`)) n++;
    copy.tag = `${s.tag}_${n}`;
    P.scenes.splice(P.scenes.indexOf(s) + 1, 0, copy);
    ui.selected = copy.id;
  },
  delScene() {
    const s = sceneById(ui.selected);
    if (!confirm(`Delete scene "${s.tag}"? Buttons that point to it will be unlinked.`)) return;
    P.scenes = P.scenes.filter(x => x !== s);
    for (const o of P.scenes) for (const b of o.buttons) for (const f of ['target', 'remember']) if (b[f] === s.id) b[f] = '';
    if (P.start === s.id) P.start = '';
    ui.selected = P.scenes[0]?.id || null;
  },
  playHere() { ui.play = null; startPlay(ui.selected); return 'noRender'; },
  dlFolder() {
    const errs = validate().filter(i => i.level === 'err');
    if (errs.length && !confirm(`There are ${errs.length} problem(s). Download anyway?`)) return 'noRender';
    download(`${packFolderName()}.zip`, makeZip(buildPackFiles()));
    return 'noRender';
  },
  copyJson() { copyText(JSON.stringify(dialogueFile(), null, 2)); return 'noRender'; },
};

function onClick(e) {
  const t = e.target.closest('[data-select],[data-click],[data-copy],#addScene');
  if (!t) return;
  if (t.dataset.copy !== undefined) return copyText(t.dataset.copy);
  if (t.dataset.select) return select(t.dataset.select);
  if (t.id === 'addScene') { const s = addScene(); ui.selected = s.id; ui.tab = 'editor'; }
  else if (t.dataset.click) {
    if (actions[t.dataset.click](t.dataset.arg !== undefined ? +t.dataset.arg : undefined) === 'noRender') { save(); return; }
  }
  save(); renderAll();
}

function init() {
  P = load() || exampleProject();
  ui.selected = P.scenes[0]?.id || null;
  for (const root of [$('#sidebar'), $('#main')]) {
    root.addEventListener('input', onFieldInput);
    root.addEventListener('change', onFieldChange);
    root.addEventListener('click', onClick);
  }
  $('#modalCard').addEventListener('click', e => { const t = e.target.closest('[data-copy]'); if (t) copyText(t.dataset.copy); });
  $('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
  $$('#tabs button').forEach(b => (b.onclick = () => { ui.tab = b.dataset.tab; renderAll(); }));
  $('#btnPlay').onclick = () => {
    if (!P.scenes.length) return toast('Make a scene first.');
    ui.play = null; startPlay(null);
  };
  $('#btnPassword').onclick = passwordModal;
  const menu = $('#projectMenu');
  $('#btnMenu').onclick = e => { e.stopPropagation(); menu.classList.toggle('hidden'); };
  document.addEventListener('click', () => menu.classList.add('hidden'));
  menu.addEventListener('click', e => {
    const act = e.target.dataset.act;
    if (act === 'new' && confirm('Start a new empty project? (Save the current one first if you want to keep it.)')) { P = emptyProject(); ui.selected = null; }
    if (act === 'example' && confirm('Replace the current project with the example?')) { P = exampleProject(); ui.selected = P.scenes[0].id; }
    if (act === 'save') download(`${slug(P.packName) || 'dialogue'}.project.json`, new Blob([JSON.stringify(P, null, 2)], { type: 'application/json' }));
    if (act === 'open') $('#fileInput').click();
    save(); renderAll();
  });
  $('#fileInput').onchange = async e => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (!Array.isArray(data.scenes)) throw new Error('not a project file');
      P = normalize(data); ui.selected = P.scenes[0]?.id || null;
      save(); renderAll(); toast('Project opened.');
    } catch (err) { alert('Could not open that file: ' + err.message); }
    e.target.value = '';
  };
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
  save();
  renderAll();
}

// exposed for automated tests
window.BDM = { get project() { return P; }, set project(v) { P = normalize(v); renderAll(); }, dialogueFile, manifest, buildPackFiles, makeZip, createPassword, validate, setupCommands, buttonCommands, emptyProject, exampleProject, renderAll, ui };

init();
