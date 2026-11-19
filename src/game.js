"use strict";
// ======================================================================
//  SOUL SPLIT — engine
// ======================================================================
const $ = id => document.getElementById(id);
const cv = $('c'), ctx = cv.getContext('2d');
ctx.imageSmoothingEnabled = false;
const UI = {
  wrap: $('wrap'), ui: $('ui'), hud: $('hud'), hp: $('hpb'), sp: $('spb'), soulrow: $('soulrow'), ward: $('ward'), loc: $('loc'), toast: $('toast'),
  dialog: $('dialog'), who: $('who'), line: $('line'), card: $('card'), cardIn: $('cardInner'),
  boss: $('boss'), bossb: $('bossb'), prompt: $('prompt'), danger: $('danger'),
};
function fit() {
  const sc = Math.max(1, Math.floor(Math.min(innerWidth / W, innerHeight / H)));
  cv.style.width = W * sc + 'px'; cv.style.height = H * sc + 'px';
  UI.wrap.style.width = W * sc + 'px'; UI.wrap.style.height = H * sc + 'px';
  UI.ui.style.transform = `scale(${sc})`;
}
addEventListener('resize', fit); fit();

// ---------------------------------------------------------------- input
const down = {}, hit = {};
const K = {
  left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'], up: ['ArrowUp', 'KeyW'], down: ['ArrowDown', 'KeyS'],
  dash: ['KeyZ', 'Space', 'KeyK'], atk: ['KeyX', 'KeyJ'], split: ['KeyC', 'KeyL', 'ShiftLeft', 'ShiftRight'],
  start: ['Enter'], pause: ['KeyP', 'Escape'], mute: ['KeyM'],
};
const held = a => K[a].some(c => down[c]);
const tap = a => K[a].some(c => hit[c]);
const moveKeys = () => [(held('right') ? 1 : 0) - (held('left') ? 1 : 0), (held('down') ? 1 : 0) - (held('up') ? 1 : 0)];
addEventListener('keydown', e => {
  if (!down[e.code]) hit[e.code] = true;
  down[e.code] = true;
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
  initAudio();
});
addEventListener('keyup', e => { down[e.code] = false; });
addEventListener('blur', () => { for (const k in down) down[k] = false; });

// ---------------------------------------------------------------- helpers
const clamp = (v, a, c) => Math.max(a, Math.min(c, v));
const dist = (a, c) => Math.hypot(a.x - c.x, a.y - c.y);
const norm = (x, y) => { const d = Math.hypot(x, y) || 1; return [x / d, y / d]; };
function pushOut(e, list) {
  for (const o of list) {
    const qx = clamp(e.x, o.x, o.x + o.w), qy = clamp(e.y, o.y, o.y + o.h);
    const dx = e.x - qx, dy = e.y - qy, d2 = dx * dx + dy * dy;
    if (d2 >= e.r * e.r) continue;
    if (d2 === 0) {
      const l = e.x - o.x, r = o.x + o.w - e.x, u = e.y - o.y, dn = o.y + o.h - e.y, m = Math.min(l, r, u, dn);
      if (m === l) e.x = o.x - e.r; else if (m === r) e.x = o.x + o.w + e.r; else if (m === u) e.y = o.y - e.r; else e.y = o.y + o.h + e.r;
    } else { const d = Math.sqrt(d2); e.x += dx / d * (e.r - d); e.y += dy / d * (e.r - d); }
  }
}
const boundInner = e => { e.x = clamp(e.x, 22, R.w - 22); e.y = clamp(e.y, TOPW + 4, R.h - 12); };

// ---------------------------------------------------------------- state
const TETHER = 150;
let state = 'title', mode = 'body', t = 0;
let R = null, roomBg = null, decals = null, dg = null;
let b = null, s = null, energy = 100, enemies = [], bolts = [], rings = [], parts = [], pickups = [], motes = [], fts = [];
let flags = {}, checkpoint = null, enc = null, cam = { x: 0, y: 0 }, shake = 0, hitstop = 0, redFlash = 0;
let fade = 1, fadeTarget = 0, waiters = [], dlg = null, cardWaiter = null, toastT = 0, locT = 0, marenSpirit = null, nextId = 1;
let whiteFlash = 0, circleFlare = 0;
let best = 0;

// ---------------------------------------------------------------- script helpers
const wait = f => new Promise(r => waiters.push({ f, r }));
function tickWaiters() {
  const done = [];
  for (const w of waiters) if (--w.f <= 0) done.push(w);
  if (done.length) { waiters = waiters.filter(w => w.f > 0); done.forEach(w => w.r()); }
}
// scripted movement for cutscenes
async function tween(o, x, y, frames) {
  const x0 = o.x, y0 = o.y;
  for (let i = 1; i <= frames; i++) {
    const k = i / frames, e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
    o.x = x0 + (x - x0) * e; o.y = y0 + (y - y0) * e;
    if (o === b) { b.moving = true; b.anim += 1; b.face = x >= x0 ? 1 : -1; }
    await wait(1);
  }
  if (o === b) b.moving = false;
}
const prose = h => `<div class="prose">${h}</div><div class="press">Press Enter</div>`;
function toast(html, f = 300) { UI.toast.innerHTML = html; UI.toast.style.opacity = 1; toastT = f; }
function showLoc(name) { UI.loc.innerHTML = `<small>Saint Orrin</small>${name}`; UI.loc.style.opacity = 1; locT = 210; }
function addText(x, y, txt, col = '#e6ded0') {
  const el = document.createElement('div'); el.className = 'ft'; el.textContent = txt; el.style.color = col;
  UI.ui.appendChild(el); fts.push({ x, y, el, life: 70 });
}
function clearTexts() { for (const f of fts) f.el.remove(); fts = []; }

const SPEAKERS = {
  ASH: { name: 'Ash', col: '#e8d090' },
  MAREN: { name: 'Sister Maren', col: '#f4e2b8' },
  VOICE: { name: 'The Bellwarden', col: '#d86a5a', cls: 'voice' },
  MEMORY: { name: 'Memory', col: '#8ec8d0', cls: 'mem' },
  NOTE: { name: "Maren's Journal", col: '#c8b898', cls: 'note' },
};
function say(lines) {
  return new Promise(res => {
    dlg = { lines, i: 0, n: 0, res, blip: -1, prev: state };
    state = 'talk'; UI.dialog.classList.add('on'); showLine();
  });
}
function showLine() {
  const [who, text] = dlg.lines[dlg.i], sp = SPEAKERS[who];
  UI.who.textContent = sp.name; UI.who.style.color = sp.col; UI.line.className = sp.cls || '';
  dlg.text = text; dlg.n = 0; UI.line.textContent = '';
}
function updateTalk() {
  if (dlg.n < dlg.text.length) {
    dlg.n = Math.min(dlg.text.length, dlg.n + 0.75);
    UI.line.textContent = dlg.text.slice(0, dlg.n | 0);
    const k = (dlg.n | 0) >> 2; if (k !== dlg.blip) { dlg.blip = k; sfx('blip'); }
  }
  if (tap('atk') || tap('dash') || tap('start')) {
    if (dlg.n < dlg.text.length) { dlg.n = dlg.text.length; UI.line.textContent = dlg.text; }
    else if (++dlg.i >= dlg.lines.length) {
      const d = dlg; dlg = null; UI.dialog.classList.remove('on'); state = d.prev === 'cut' ? 'cut' : 'play'; d.res();
    } else showLine();
  }
}
async function card(html, clear = false) {
  if (UI.card.classList.contains('on')) { UI.cardIn.style.opacity = 0; await wait(20); }
  UI.cardIn.innerHTML = html; UI.cardIn.style.opacity = 1;
  UI.card.className = 'on' + (clear ? ' clear' : '');
  state = 'card';
  await new Promise(res => { cardWaiter = { res, minT: 45 }; });
}
function hideCard() { UI.card.className = ''; }

// ---------------------------------------------------------------- rooms
function buildRoom(R) {
  R.solids = []; R.lockRects = [];
  const wallSeg = (y, h, side) => {
    const gaps = R.exits.filter(e => e.side === side).sort((a, c) => a.x0 - c.x0);
    let x = -20;
    for (const g of gaps) {
      if (g.x0 > x) R.solids.push({ x, y, w: g.x0 - x, h });
      const gap = { x: g.x0, y, w: g.x1 - g.x0, h };
      if (g.veil) R.solids.push(gap); else R.lockRects.push(gap);
      x = g.x1;
    }
    R.solids.push({ x, y, w: R.w + 20 - x, h });
  };
  wallSeg(-30, TOPW + 30, 'n'); wallSeg(R.h - 10, 40, 's');
  R.solids.push({ x: -30, y: -30, w: 46, h: R.h + 60 }, { x: R.w - 16, y: -30, w: 46, h: R.h + 60 });
  for (const p of R.props) if (p.solid) R.solids.push(p.solid);
  R.gates = R.gates || []; for (const g of R.gates) g.anim = g.open ? 1 : 0;
  R.sigils = R.sigils || []; R.triggers = R.triggers || [];
  R.notes = R.props.filter(p => p.note || p.use);   // anything you can press X on
}
const solidsFor = () => {
  const L = R.solids.concat(R.gates.filter(g => !g.open).map(g => ({ x: g.x, y: g.y - 3, w: g.w, h: 4 })));
  return enc ? L.concat(R.lockRects) : L;
};

function newBody(x, y) {
  return { x, y, r: 4, vx: 0, vy: 0, ax: 0, ay: -1, face: 1, hp: 6, max: 6, iT: 0, atk: 0, stun: 0, kbT: 0,
           dashT: 0, dashCD: 0, anim: 0, moving: false, ward: false, hidden: false, hits: new Set(), stepT: 0 };
}
function newSpirit(x, y) {
  return { x, y, r: 4, vx: 0, vy: 0, ax: b.ax, ay: b.ay, face: b.face, atk: 0, iT: 30, age: 0, recall: false, forced: false,
           kbT: 0, dashT: 0, dashCD: 0, hits: new Set() };
}
function loadRoom(id, spawn, opts = {}) {
  waiters = []; enc = null; dlg = null; cardWaiter = null; marenSpirit = null;
  UI.dialog.classList.remove('on');
  R = ROOMS[id](); R.id = id;
  buildRoom(R);
  roomBg = paintRoom(R);
  decals = canvas(R.w, R.h); dg = decals.getContext('2d');
  enemies = []; bolts = []; rings = []; parts = []; pickups = []; clearTexts();
  b = newBody(spawn.x, spawn.y); s = null; mode = 'body'; energy = 100;
  if (opts.veil) { mode = 'spirit'; b.ward = true; s = newSpirit(spawn.x, spawn.y - 26); s.ay = -1; }
  if (opts.demo) b.hidden = true;
  motes = [];
  for (let i = 0; i < R.w * R.h / 2600; i++) motes.push({ x: Math.random() * R.w, y: TOPW + Math.random() * (R.h - TOPW), p: Math.random() * 6.28, v: 0.04 + Math.random() * 0.1 });
  const fx = s ? s : b;
  cam.x = clamp(fx.x - W / 2, 0, R.w - W); cam.y = clamp(fx.y - H / 2, 0, R.h - H);
  if (opts.demo) { setMusic('ambient'); return; }
  checkpoint = { id, spawn, opts, flags: JSON.parse(JSON.stringify(flags)) };
  showLoc(R.name); setMusic(R.music || 'ambient');
  state = 'play'; fadeTarget = 0;
  if (R.onEnter) R.onEnter();
}
const saveCheckpoint = () => { if (checkpoint) checkpoint.flags = JSON.parse(JSON.stringify(flags)); };
async function transition(to, spawn, opts = {}) {
  if (state === 'fade') return;
  state = 'fade'; fadeTarget = 1;
  await wait(26);
  loadRoom(to, spawn, opts);
}
function showTitle() {
  flags = {};
  loadRoom('sanctum', { x: 240, y: 190 }, { demo: true });
  state = 'title'; fadeTarget = 0;
  UI.cardIn.style.opacity = 1;
  UI.cardIn.innerHTML = `<div><div class="title">Soul Split</div><div class="sub">Chapter I &middot; The Silent Bell</div></div>
    <div><div class="controls"><kbd>Arrows</kbd> move <kbd>Z</kbd> dash <kbd>X</kbd> strike / read <kbd>C</kbd> split / return
    <kbd>P</kbd> pause <kbd>M</kbd> mute</div><div class="press">Press Enter</div></div>`;
  UI.card.className = 'on titlescreen';
}

// ---------------------------------------------------------------- effects
function burst(x, y, n, cols, spd = 2, glow = false, grav = 0.03) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, v = Math.random() * spd;
    parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.7 - 0.4, life: 20 + Math.random() * 28, max: 48,
                 col: cols[i % cols.length], grav, sz: Math.random() < 0.3 ? 2 : 1, glow });
  }
}
const dust = (x, y) => parts.push({ x: x + (Math.random() - 0.5) * 6, y, vx: (Math.random() - 0.5) * 0.4, vy: -0.25, life: 20, max: 20, col: '#4a443e', grav: 0, sz: 1 });

// ---------------------------------------------------------------- split / merge
function split() {
  mode = 'spirit'; energy -= 10;
  b.ward = !!(R.circle && Math.hypot(b.x - R.circle.x, b.y - R.circle.y) < R.circle.r - 6);
  s = newSpirit(b.x, b.y - 2);
  b.atk = 0; b.vx = b.vy = 0; b.moving = false;
  burst(b.x, b.y - 10, 22, ['#9ff', '#fff', '#5ff'], 2.5, true, 0);
  if (b.ward) { addText(b.x, b.y - 22, 'WARDED', '#e8d090'); burst(R.circle.x, R.circle.y, 26, ['#e8d090', '#a83030'], 3, true, 0); }
  sfx('split');
}
function merge() {
  mode = 'body'; b.ward = false;
  if (s.forced) { b.stun = 90; addText(b.x, b.y - 22, 'DAZED', '#e8d090'); }
  b.iT = Math.max(b.iT, 40);
  burst(b.x, b.y - 10, 16, ['#9ff', '#fff'], 2, true, 0);
  s = null; sfx('merge');
}

// ---------------------------------------------------------------- damage
function hurtBody(n, src) {
  if (b.iT > 0 || state !== 'play') return;
  if (mode === 'spirit' && b.ward) {
    b.ward = false; b.iT = 50; sfx('ward');
    addText(b.x, b.y - 18, 'WARD BROKEN', '#e8d090');
    burst(b.x, b.y - 4, 22, ['#e8d090', '#fff'], 3, true, 0);
    return;
  }
  b.hp -= n; b.iT = 60; shake = 8; redFlash = 8; sfx('hurt');
  burst(b.x, b.y - 8, 10, ['#a01818', '#600c0c', '#fff'], 2);
  splatOn(dg, b.x, b.y, 4, ['#5e1212', '#4a0c0c'], Math.random, R);
  if (mode === 'body') {
    const [ux, uy] = norm(b.x - src.x, b.y - src.y);
    b.vx = ux * 2.4; b.vy = uy * 2.4; b.kbT = 12;
  } else addText(b.x, b.y - 14, 'YOUR BODY', '#e05050');
  if (b.hp <= 0) die();
}
function hurtSpirit(n, src) {
  if (!s || s.iT > 0 || s.recall || s.dashT > 0) return;
  energy -= n; s.iT = 40; shake = 4; sfx('shurt');
  const [ux, uy] = norm(s.x - src.x, s.y - src.y);
  s.vx = ux * 2.8; s.vy = uy * 2.8; s.kbT = 10;
  burst(s.x, s.y - 10, 8, ['#5ff', '#fff'], 2, true, 0);
}
async function die() {
  b.hp = 0; state = 'dying'; shake = 14; sfx('hurt');
  burst(b.x, b.y - 6, 50, ['#a01818', '#600c0c', '#fff', '#9ff'], 3);
  splatOn(dg, b.x, b.y, 18, ['#5e1212', '#4a0c0c', '#701616'], Math.random, R);
  if (s) { burst(s.x, s.y - 10, 30, ['#9ff', '#fff'], 2.5, true, -0.02); s = null; }
  b.hidden = true; mode = 'body';
  await wait(80);
  await card(`<div class="chapter">Your body has fallen</div><div class="prose" style="margin-top:10px">A soul without a door cannot stay.</div><div class="press">Press Enter to rise</div>`);
  hideCard();
  flags = JSON.parse(JSON.stringify(checkpoint.flags));
  loadRoom(checkpoint.id, checkpoint.spawn, checkpoint.opts);
}
function damage(e, dmg, ux, uy) {
  e.hp -= dmg; e.flash = 6;
  if (e.type !== 'warden') {
    e.cd = 14; e.wind = 0; e.lunge = 0;          // a hit interrupts a wind-up
    const k = e.type === 'shade' ? 1.6 : 2.6;
    e.vx = ux * k; e.vy = uy * k;
    if (e.type !== 'shade') splatOn(dg, e.x, e.y, 2, ['#4a0c0c'], Math.random, R);
  } else if (mode === 'spirit') energy = Math.min(100, energy + 1.5);
  burst(e.x, e.y - 8, 6, ['#fff', '#ffd890'], 1.6);
  sfx('hit'); hitstop = 3; shake = Math.max(shake, 2);
  if (e.type === 'warden') {
    if (!e.p2 && e.hp <= e.max / 2) { e.p2 = true; wardenHalf(); }
    if (e.hp <= 0) { e.dead = true; wardenDefeated(e); }
    return;
  }
  if (e.hp <= 0) kill(e);
}
function kill(e) {
  e.dead = true;
  if (e.type === 'shade') burst(e.x, e.y - 14, 20, ['#a8a4b8', '#dcd8e4', '#26222f'], 2.2, true, -0.02);
  else {
    burst(e.x, e.y - 8, 18, ['#7a1818', '#4a0c0c', e.type === 'cantor' ? '#5e1414' : '#6e6a5e'], 2.5);
    splatOn(dg, e.x, e.y, 9, ['#5e1212', '#4a0c0c', '#3a0a0a'], Math.random, R);
  }
  if (mode === 'spirit') energy = Math.min(100, energy + 4);
  sfx('kill');
  const r = Math.random();
  if (r < 0.12) pickups.push({ type: 'ember', x: e.x, y: e.y, t: 0 });
  else if (r < 0.52) pickups.push({ type: 'orb', x: e.x, y: e.y, t: 0 });
}

// ---------------------------------------------------------------- enemies
// overrides (o) let the script tune a single enemy, e.g. a slow tutorial ghoul: { spd: 0.35, hp: 2 }
function spawn(type, x, y, o = {}) {
  const e = { type, id: nextId++, x, y, vx: 0, vy: 0, flash: 0, cd: 0, anim: Math.random() * 100 | 0, face: 1,
              stuck: 0, sideT: 0, side: 1, rise: 45, wind: 0, lunge: 0 };
  if (type === 'hollow') Object.assign(e, { r: 5, hp: 3, spd: 0.5, dmg: 1, windT: 28 });
  else if (type === 'shade') Object.assign(e, { r: 6, hp: 3, spd: 0.6, dmg: 1, rise: 40, windT: 32 });
  else if (type === 'cantor') Object.assign(e, { r: 4, hp: 3, spd: 0.45, dmg: 1, fire: 170 + Math.random() * 60, strafe: Math.random() < 0.5 ? 1 : -1 });
  else if (type === 'warden') Object.assign(e, { r: 13, hp: 36, max: 36, phase: 'walk', pt: 100, cycle: -1, glow: 0, p2: false, rise: 70 });
  Object.assign(e, o);
  enemies.push(e);
  sfx('rise');
  return e;
}
// Encounters remember which wave you reached, so dying doesn't restart the whole fight.
function startEncounter(cfg) {
  enc = { ...cfg, i: (cfg.id && flags['wave_' + cfg.id]) || 0, busy: false };
  setMusic('combat');
}
function updateEncounter() {
  if (!enc || enc.busy || enemies.length) return;
  const E = enc;
  if (E.i < E.waves.length) {
    E.busy = true;
    (async () => {
      if (E.i > 0 || E.resumed) {
        b.hp = Math.min(b.max, b.hp + 1);
        if (E.id) { flags['wave_' + E.id] = E.i; saveCheckpoint(); }
      }
      E.resumed = true;
      await wait(E.i === 0 ? 20 : 70);
      if (E.pre && E.pre[E.i]) await E.pre[E.i]();
      for (const [type, x, y, o] of E.waves[E.i]) spawn(type, x, y, o);
      E.i++; E.busy = false;
    })();
  } else {
    enc = null; setMusic(R.music || 'ambient');
    if (E.onClear) E.onClear();
  }
}

function updateWarden(e) {
  if (e.flash > 0) e.flash--;
  e.anim++;
  if (e.rise > 0) { e.rise--; if (t % 3 === 0) dust(e.x, e.y); return; }
  const tgt = (mode === 'spirit' && s && !s.recall) ? s : b;
  const spd = e.p2 ? 0.62 : 0.45;
  e.pt--;
  if (e.phase === 'walk') {
    const [ux, uy] = norm(tgt.x - e.x, tgt.y - e.y);
    e.x += ux * spd; e.y += uy * spd; e.face = ux >= 0 ? 1 : -1;
    if (e.pt <= 0) {
      e.cycle++;
      const c = e.cycle % (e.p2 ? 4 : 3);
      e.phase = c === 2 ? 'summon' : (e.p2 && c === 3 ? 'charge' : 'toll');
      e.pt = e.phase === 'charge' ? 45 : 60;
    }
  } else if (e.phase === 'toll' || e.phase === 'summon') {
    e.glow = 1 - e.pt / 60;
    if (e.pt <= 0) {
      sfx('bell'); shake = 6; e.glow = 0;
      if (e.phase === 'toll') {
        rings.push({ x: e.x, y: e.y - 2, r: 8, max: e.p2 ? 150 : 120, hitS: false, hitB: false });
        e.pt = 110 + Math.random() * 50;
      } else {
        for (let k = 0; k < (e.p2 ? 3 : 2); k++) {
          const a = Math.random() * 6.28;
          spawn('hollow', clamp(b.x + Math.cos(a) * 55, 40, R.w - 40), clamp(b.y - 30 + Math.sin(a) * 25, TOPW + 20, R.h - 30));
        }
        e.pt = 130;
      }
      e.phase = 'walk';
    }
  } else if (e.phase === 'charge') {
    if (e.pt > 0) { e.glow = 1 - e.pt / 45; [e.cx, e.cy] = norm(tgt.x - e.x, tgt.y - e.y); }
    else if (e.pt > -30) { e.glow = 0; e.x += e.cx * 3.6; e.y += e.cy * 3.6; if (t % 2 === 0) dust(e.x, e.y); }
    else { e.phase = 'walk'; e.pt = 90; }
  }
  pushOut(e, R.solids); boundInner(e);
  if (s && !s.recall && s.dashT === 0 && dist(e, s) < e.r + s.r + 2) hurtSpirit(12, e);
  if (b.iT === 0 && dist(e, b) < e.r + (mode === 'body' ? b.r : 8)) hurtBody(2, e);
}

function updateEnemies() {
  const solids = solidsFor(), bodyR = mode === 'body' ? b.r : 8;
  for (const e of enemies) {
    if (e.dead) continue;
    if (e.type === 'warden') { updateWarden(e); if (state !== 'play') return; continue; }
    if (e.flash > 0) e.flash--;
    e.anim++;
    if (e.rise > 0) { e.rise--; if (e.type !== 'shade' && t % 3 === 0) dust(e.x, e.y); continue; }
    // Melee enemies telegraph: approach -> wind up (shake + flash) -> lunge -> recover.
    // Only the lunge hurts, so a well-timed dash (or a hit during the wind-up) beats them.
    if (e.type === 'shade' || e.type === 'hollow') {
      const tgt = e.type === 'shade' && mode === 'spirit' && !s.recall ? s : b;
      const tR = tgt === b ? bodyR : s.r, ox = e.x, oy = e.y;
      if (e.wind > 0) {
        if (--e.wind === 0) { const [ux, uy] = norm(e.tx - e.x, e.ty - e.y); e.lx = ux * 2.5; e.ly = uy * 2.5; e.lunge = 12; }
      } else if (e.lunge > 0) {
        e.x += e.lx; e.y += e.ly;
        if (--e.lunge === 0) { e.cd = 34; e.vx = e.vy = 0; }
      } else if (e.cd > 0) { e.cd--; e.x += e.vx; e.y += e.vy; e.vx *= 0.88; e.vy *= 0.88; }
      else {
        let [ux, uy] = norm(tgt.x - e.x, tgt.y - e.y);
        if (e.sideT > 0) { e.sideT--; [ux, uy] = norm(ux - uy * e.side * 1.4, uy + ux * e.side * 1.4); }
        e.x += ux * e.spd; e.y += uy * e.spd; e.face = ux >= 0 ? 1 : -1;
        if (dist(e, tgt) < e.r + tR + 12) { e.wind = e.windT; e.tx = tgt.x; e.ty = tgt.y; }
        if (e.type === 'hollow') {
          if (Math.hypot(e.x - ox, e.y - oy) < e.spd * 0.3) e.stuck++; else e.stuck = 0;
          if (e.stuck > 15) { e.sideT = 40; e.side = Math.random() < 0.5 ? 1 : -1; e.stuck = 0; }
        }
      }
      if (e.type === 'hollow') pushOut(e, solids);
      boundInner(e);
      if (e.lunge > 0) {
        const stop = tgt2 => { const [ux, uy] = norm(e.x - tgt2.x, e.y - tgt2.y); e.lunge = 0; e.cd = 40; e.vx = ux * 1.6; e.vy = uy * 1.6; };
        if (b.iT === 0 && dist(e, b) < e.r + bodyR) { hurtBody(e.dmg, e); stop(b); if (state !== 'play') return; }
        else if (s && !s.recall && s.iT === 0 && s.dashT === 0 && dist(e, s) < e.r + s.r + 2) { hurtSpirit(e.type === 'shade' ? 10 : 8, e); stop(s); }
      }
      continue;
    }
    {
      if (e.cd > 0) { e.cd--; e.x += e.vx; e.y += e.vy; e.vx *= 0.85; e.vy *= 0.85; }
      else if (e.type === 'cantor') {
        const d = dist(e, b), [ux, uy] = norm(b.x - e.x, b.y - e.y);
        let mx, my;
        if (d > 110) { mx = ux; my = uy; } else if (d < 80) { mx = -ux; my = -uy; } else { mx = -uy * e.strafe; my = ux * e.strafe; }
        if (Math.random() < 0.006) e.strafe *= -1;
        e.x += mx * e.spd; e.y += my * e.spd; e.face = ux >= 0 ? 1 : -1;
        if (--e.fire === 40) sfx('cast');
        if (e.fire <= 0) { bolts.push({ x: e.x, y: e.y - 2, vx: ux * 1.0, vy: uy * 1.0, life: 500 }); e.fire = 190 + Math.random() * 70; }
      }
      pushOut(e, solids); boundInner(e);
    }
  }
  for (let i = 0; i < enemies.length; i++) for (let j = i + 1; j < enemies.length; j++) {
    const a = enemies[i], c = enemies[j];
    if (a.type === 'shade' || c.type === 'shade' || a.rise > 0 || c.rise > 0) continue;
    const d = dist(a, c), m = a.r + c.r;
    if (d < m && d > 0) {
      const wa = a.type === 'warden' ? 0 : c.type === 'warden' ? 1 : 0.5, p = m - d, ux = (a.x - c.x) / d, uy = (a.y - c.y) / d;
      a.x += ux * p * wa; a.y += uy * p * wa; c.x -= ux * p * (1 - wa); c.y -= uy * p * (1 - wa);
    }
  }
}

function updateBolts() {
  const solids = R.solids.concat(R.gates.filter(g => !g.open).map(g => ({ x: g.x, y: g.y - 3, w: g.w, h: 4 })));
  for (const o of bolts) {
    o.x += o.vx; o.y += o.vy; o.life--;
    if (t % 2 === 0) parts.push({ x: o.x, y: o.y - 7, vx: 0, vy: 0, life: 12, max: 12, col: '#c83020', grav: 0, sz: 1, glow: true });
    if (o.life <= 0 || solids.some(r => o.x > r.x && o.x < r.x + r.w && o.y > r.y - 4 && o.y < r.y + r.h)) {
      o.dead = true; burst(o.x, o.y - 7, 6, ['#f63', '#a20'], 1.2, true); continue;
    }
    if (s && !s.recall && Math.hypot(s.x - o.x, s.y - o.y) < s.r + 5) {
      o.dead = true; burst(o.x, o.y - 7, 8, ['#f63', '#fff'], 1.5, true);
      if (s.dashT === 0) { hurtSpirit(8, o); addText(s.x, s.y - 26, 'BLOCKED', '#9ee'); }
      continue;
    }
    if (Math.hypot(b.x - o.x, b.y - o.y) < (mode === 'body' ? b.r : 8) + 3) { o.dead = true; hurtBody(1, o); if (state !== 'play') return; }
  }
  bolts = bolts.filter(o => !o.dead);
  for (const g of rings) {
    g.r += 2.2;
    if (g.r > g.max) { g.dead = true; continue; }
    if (s && !s.recall && !g.hitS && Math.abs(dist(s, g) - g.r) < 5) { g.hitS = true; hurtSpirit(10, g); }
    if (!g.hitB && Math.abs(dist(b, g) - g.r) < 6) { g.hitB = true; if (!(mode === 'body' && b.dashT > 0)) hurtBody(1, g); if (state !== 'play') return; }
  }
  rings = rings.filter(g => !g.dead);
}

function resolveAttacks() {
  if (mode === 'body' && b.atk >= 8 && b.atk <= 12) {
    const P = { x: b.x + b.ax * 9, y: b.y + b.ay * 9 };
    for (const e of enemies) if (!e.dead && e.rise <= 0 && !b.hits.has(e.id) && dist(P, e) < 7 + e.r) {
      b.hits.add(e.id);
      if (e.type === 'shade' || e.type === 'warden') { addText(e.x, e.y - 26, 'IMMUNE', '#a8a4b8'); sfx('whiff'); }
      else damage(e, 1, b.ax, b.ay);
    }
  }
  if (s && !s.recall && s.atk >= 4 && s.atk <= 10) {
    const inArc = (x, y, reach) => {
      const dx = x - s.x, dy = y - s.y, d = Math.hypot(dx, dy);
      return d < reach && (d < 8 || (dx * s.ax + dy * s.ay) / d > 0.15);
    };
    for (const e of enemies) if (!e.dead && e.rise <= 0 && !s.hits.has(e.id) && inArc(e.x, e.y, 25 + e.r)) {
      s.hits.add(e.id); damage(e, 2, s.ax, s.ay);
    }
    for (const o of bolts) if (!o.dead && inArc(o.x, o.y, 27)) {
      o.dead = true; sfx('parry'); burst(o.x, o.y - 7, 10, ['#fff', '#f63', '#9ff'], 2, true);
    }
  }
  enemies = enemies.filter(e => !e.dead);
}

// ---------------------------------------------------------------- player
const nearNote = who => R.notes.find(p => (p.note || !p.used) && Math.hypot(who.x - p.x, who.y - p.y) < 20);
async function readNote(p) {
  if (p.note) return say(p.note.lines);
  if (mode !== 'body') { toast('Your hands pass straight through it.', 200); return; }
  p.used = true; p.use(p);
}

function updateBody() {
  if (b.iT > 0) b.iT--;
  if (b.dashCD > 0) b.dashCD--;
  if (b.atk > 0) b.atk--;
  if (mode !== 'body') return;
  let tx = 0, ty = 0, steer = 0.3;
  if (b.stun > 0) { b.stun--; steer = 0.15; }
  else if (b.dashT > 0) { b.dashT--; b.vx = b.ax * 2.9; b.vy = b.ay * 2.9; steer = 0; if (t % 2 === 0) dust(b.x, b.y); }
  else if (b.kbT > 0) { b.kbT--; steer = 0.08; }
  else {
    const [mx, my] = moveKeys();
    if (mx || my) { [b.ax, b.ay] = norm(mx, my); tx = b.ax * 1.15; ty = b.ay * 1.15; if (mx) b.face = mx; }
    if (tap('atk')) {
      const n = nearNote(b);
      if (n) { readNote(n); return; }
      if (b.atk === 0) { b.atk = 16; b.hits = new Set(); sfx('punch'); }
    }
    if (tap('dash') && b.dashCD === 0) { b.dashT = 10; b.dashCD = 40; b.iT = Math.max(b.iT, 10); sfx('dash'); }
    if (tap('split') && flags.awakened) {
      if (energy >= 25) { split(); return; }
      sfx('err'); addText(b.x, b.y - 24, 'TOO WEAK TO SPLIT', '#d06060');
    }
  }
  if (steer) { b.vx += (tx - b.vx) * steer; b.vy += (ty - b.vy) * steer; }
  b.x += b.vx; b.y += b.vy;
  const sp = Math.hypot(b.vx, b.vy);
  b.moving = sp > 0.3; if (b.moving) { b.anim += sp; if ((b.stepT += sp) > 14) { b.stepT = 0; sfx('step'); } }
  pushOut(b, solidsFor());
  energy = Math.min(100, energy + 0.2);
  for (const sg of R.sigils) if (!sg.lit && !sg.hinted && dist(b, sg) < 14) { sg.hinted = true; toast('The rune is cold to the touch. Perhaps a soul could wake it.', 300); }
  for (const ex of R.exits) {
    if (ex.veil || b.x < ex.x0 || b.x > ex.x1) continue;
    if ((ex.side === 'n' && b.y < TOPW - 12) || (ex.side === 's' && b.y > R.h - 4)) {
      if (ex.block) { toast(`<i>"${ex.block}"</i>`, 220); b.y = ex.side === 'n' ? TOPW - 4 : R.h - 12; b.vy = 0; }
      else { transition(ex.to, ex.spawn); return; }
    }
  }
}

function updateSpirit() {
  s.age++;
  if (s.iT > 0) s.iT--;
  if (s.dashCD > 0) s.dashCD--;
  if (s.recall) {
    const dx = b.x - s.x, dy = b.y - s.y, d = Math.hypot(dx, dy);
    if (d < 5) { merge(); return; }
    const sp = Math.min(d, 4.5);
    s.x += dx / d * sp; s.y += dy / d * sp;
    if (t % 2 === 0) parts.push({ x: s.x, y: s.y - 10, vx: 0, vy: 0, life: 16, max: 16, col: '#5ff', grav: 0, sz: 1, glow: true });
    return;
  }
  energy -= 0.07;
  if (energy <= 0) {
    energy = 0; s.recall = true; s.forced = true;
    addText(s.x, s.y - 28, 'SOUL DEPLETED', '#d06060'); sfx('drain'); return;
  }
  let tx = 0, ty = 0, steer = 0.22;
  if (s.dashT > 0) {
    s.dashT--; s.vx = s.ax * 4.4; s.vy = s.ay * 4.4; steer = 0;
    parts.push({ x: s.x + (Math.random() - 0.5) * 6, y: s.y - 10 + (Math.random() - 0.5) * 12, vx: 0, vy: 0, life: 18, max: 18, col: '#5ff', grav: 0, sz: 1, glow: true });
  } else if (s.kbT > 0) { s.kbT--; steer = 0.08; }
  else {
    const [mx, my] = moveKeys();
    if (mx || my) { [s.ax, s.ay] = norm(mx, my); tx = s.ax * 2; ty = s.ay * 2; if (mx) s.face = mx; }
    if (tap('dash') && s.dashCD === 0) { s.dashT = 9; s.dashCD = 26; energy -= 4; sfx('sdash'); }
    if (tap('atk')) {
      const n = nearNote(s);
      if (n) { readNote(n); return; }
      if (s.atk === 0) { s.atk = 14; s.hits = new Set(); sfx('slash'); }
    }
  }
  if (s.atk > 0) s.atk--;
  if (tap('split') && s.age > 5) {
    if (Math.hypot(s.x - b.x, s.y - b.y) < 16) merge();
    else { s.recall = true; sfx('recall'); }
    return;
  }
  if (steer) { s.vx += (tx - s.vx) * steer; s.vy += (ty - s.vy) * steer; }
  s.x += s.vx; s.y += s.vy;
  // spirits pass through pillars, pews and gates — but not the walls
  const veil = R.exits.find(ex => ex.veil && ex.open() && s.x > ex.x0 + 2 && s.x < ex.x1 - 2);
  s.x = clamp(s.x, 22, R.w - 22);
  s.y = clamp(s.y, veil ? 8 : TOPW + 6, R.h - 12);
  const dx = s.x - b.x, dy = s.y - b.y, d = Math.hypot(dx, dy);
  if (d > TETHER) { s.x = b.x + dx / d * TETHER; s.y = b.y + dy / d * TETHER; }
  if (veil && s.y < TOPW - 14) { transition(veil.to, veil.spawn, { veil: true }); return; }
  for (const sg of R.sigils) if (!sg.lit && dist(s, sg) < 11) {
    sg.lit = true; sfx('chime'); burst(sg.x, sg.y - 2, 26, ['#9ff', '#fff', '#e8d090'], 2.5, true, -0.01);
    sg.onLight();
  }
}

function updatePickups() {
  const col = mode === 'spirit' ? (s.recall ? null : s) : b;
  for (const p of pickups) {
    p.t++;
    if (p.type === 'orb' && s && !s.recall) {
      const dx = s.x - p.x, dy = s.y - p.y, d = Math.hypot(dx, dy);
      if (d < 50 && d > 0) { p.x += dx / d * 1.8; p.y += dy / d * 1.8; }
    }
    if (col && Math.hypot(col.x - p.x, col.y - p.y) < 10) {
      p.dead = true;
      if (p.type === 'orb') { energy = Math.min(100, energy + 15); sfx('orb'); burst(p.x, p.y - 8, 8, ['#9ff', '#fff'], 1.2, true, 0); }
      else { b.hp = Math.min(b.max, b.hp + 1); sfx('ember'); addText(p.x, p.y - 16, 'MENDED', '#e8a070'); }
    }
    if (p.t > 720) p.dead = true;
  }
  pickups = pickups.filter(p => !p.dead);
}

function updateParticles() {
  for (const p of parts) { p.x += p.vx; p.y += p.vy; p.vy += p.grav; p.vx *= 0.95; p.vy *= 0.97; p.life--; }
  parts = parts.filter(p => p.life > 0);
  if (shake > 0) { shake *= 0.86; if (shake < 0.4) shake = 0; }
  if (redFlash > 0) redFlash--;
  for (const g of R.gates) if (g.open && g.anim < 1) g.anim = Math.min(1, g.anim + 0.02);
}

function updatePlay() {
  if (tap('pause')) {
    state = 'pause';
    UI.cardIn.innerHTML = '<div class="chapter">Paused</div><div class="press">P to resume</div>'; UI.cardIn.style.opacity = 1;
    UI.card.className = 'on clear'; return;
  }
  if (hitstop > 0) { hitstop--; return; }
  updateBody(); if (state !== 'play') return;
  if (mode === 'spirit') { updateSpirit(); if (state !== 'play') return; }
  updateEnemies(); if (state !== 'play') return;
  updateBolts(); if (state !== 'play') return;
  resolveAttacks();
  updatePickups();
  updateParticles();
  for (const tr of R.triggers) if (!tr.fired && (!tr.cond || tr.cond()) && mode === 'body' &&
    b.x > tr.x && b.x < tr.x + tr.w && b.y > tr.y && b.y < tr.y + tr.h) { tr.fired = true; tr.fn(); }
  updateEncounter();
}

function update() {
  if (tap('mute')) { muted = !muted; if (master) master.gain.value = muted ? 0 : 0.5; }
  t++;
  if (state !== 'pause') tickWaiters();
  fade += clamp(fadeTarget - fade, -0.045, 0.045);
  if (whiteFlash > 0) whiteFlash = Math.max(0, whiteFlash - 0.02);
  if (circleFlare > 0) circleFlare = Math.max(0, circleFlare - 0.006);
  for (const m of motes) { m.p += 0.01; m.y -= m.v; m.x += Math.sin(m.p) * 0.12; if (m.y < TOPW) { m.y = R.h - 12; m.x = Math.random() * R.w; } }
  switch (state) {
    case 'title': if (tap('start')) { hideCard(); startGame(); } break;
    case 'card':
      if (cardWaiter) {
        if (cardWaiter.minT > 0) cardWaiter.minT--;
        else if (tap('start') || tap('atk') || tap('dash')) { const w = cardWaiter; cardWaiter = null; w.res(); }
      }
      break;
    case 'talk': updateTalk(); break;
    case 'pause': if (tap('pause') || tap('start')) { state = 'play'; hideCard(); } break;
    case 'play': updatePlay(); break;
    case 'dying': case 'fade': case 'cut': updateParticles(); break;
  }
  if (marenSpirit) marenSpirit.a = Math.min(1, marenSpirit.a + 0.01);
  if (R) {
    const f = s ? { x: s.x * 0.65 + b.x * 0.35, y: s.y * 0.65 + b.y * 0.35 } : b;
    cam.x += (clamp(f.x - W / 2, 0, R.w - W) - cam.x) * 0.1;
    cam.y += (clamp(f.y - H / 2, 0, R.h - H) - cam.y) * 0.1;
  }
  if (toastT > 0 && --toastT === 0) UI.toast.style.opacity = 0;
  if (locT > 0 && --locT === 0) UI.loc.style.opacity = 0;
  for (const f of fts) { f.y -= 0.3; f.life--; }
  fts = fts.filter(f => { if (f.life <= 0) { f.el.remove(); return false; } return true; });
}

// ---------------------------------------------------------------- drawing
function shadow(x, y, r, a = 0.4) {
  ctx.fillStyle = `rgba(0,0,0,${a})`;
  ctx.fillRect(Math.round(x - r), Math.round(y - 1), r * 2, 2);
  ctx.fillRect(Math.round(x - r + 1), Math.round(y - 2), r * 2 - 2, 4);
}
function drawLantern(x, y) {
  x = Math.round(x); y = Math.round(y);
  ctx.fillStyle = '#4a4038'; ctx.fillRect(x + 1, y - 1, 1, 1);
  ctx.fillStyle = '#2a2420'; ctx.fillRect(x, y, 3, 5);
  ctx.fillStyle = Math.random() < 0.1 ? '#ffe8a8' : '#ffc860'; ctx.fillRect(x + 1, y + 1, 1, 3);
}
function drawCandle(p) {
  const { x, y } = p;
  ctx.fillStyle = '#2e2924'; ctx.fillRect(x, y - 22, 1, 22); ctx.fillRect(x - 3, y - 1, 7, 1); ctx.fillRect(x - 1, y - 2, 3, 1);
  ctx.fillStyle = '#463c33'; ctx.fillRect(x - 5, y - 19, 11, 1); ctx.fillRect(x - 5, y - 20, 1, 1); ctx.fillRect(x + 5, y - 20, 1, 1);
  for (const [cx, hgt] of [[x - 5, 3], [x, 5], [x + 5, 3]]) {
    ctx.fillStyle = '#e4dccb'; ctx.fillRect(cx, y - 20 - hgt, 1, hgt);
    const fy = y - 22 - hgt + (Math.random() < 0.15 ? -1 : 0);
    ctx.fillStyle = '#ff9a40'; ctx.fillRect(cx, fy, 1, 2);
    ctx.fillStyle = '#fff2b0'; ctx.fillRect(cx, fy + 1, 1, 1);
  }
}
function drawRailing(x, y, w, lift = 0, alpha = 1) {
  ctx.save(); ctx.globalAlpha = alpha;
  const yy = y - Math.round(lift);
  for (let xx = x + 1; xx < x + w; xx += 4) {
    ctx.fillStyle = '#26262e'; ctx.fillRect(xx, yy - 20, 1, 20);
    ctx.fillStyle = '#5a5a68'; ctx.fillRect(xx, yy - 22, 1, 2);
  }
  ctx.fillStyle = '#34343e'; ctx.fillRect(x, yy - 16, w, 1); ctx.fillRect(x, yy - 3, w, 1);
  ctx.fillStyle = '#4a4a56'; ctx.fillRect(x, yy - 17, w, 1);
  ctx.restore();
}
function drawProp(p) {
  switch (p.kind) {
    case 'pillar': ctx.drawImage(pillarSpr, p.x - 9, p.y - 53); break;
    case 'pew': ctx.drawImage(pewSpr, p.x, p.y - 15); break;
    case 'statue': ctx.drawImage(statueSpr, p.x - 9, p.y - 42); break;
    case 'lectern': ctx.drawImage(lecternSpr, p.x - 6, p.y - 18); break;
    case 'candle': drawCandle(p); break;
    case 'railing': drawRailing(p.x, p.y, p.w); break;
    case 'maren': drawSpr(SPR.marenLie, p.x - 12, p.y - 6, true); break;
    case 'winch': {
      const { x, y } = p, a = (p.used ? 0.8 : 0) + t * 0;
      ctx.fillStyle = '#4a3e32'; ctx.fillRect(x - 1, y - 16, 3, 16); ctx.fillRect(x - 4, y - 1, 9, 1);
      ctx.fillStyle = '#8a7258';
      for (let k = 0; k < 16; k++) { const ang = k / 16 * Math.PI * 2; ctx.fillRect(Math.round(x + Math.cos(ang) * 5), Math.round(y - 13 + Math.sin(ang) * 5), 1, 1); }
      ctx.fillStyle = '#b89a70';
      for (let k = 0; k < 4; k++) { const ang = k * Math.PI / 2 + a; ctx.fillRect(Math.round(x + Math.cos(ang) * 3), Math.round(y - 13 + Math.sin(ang) * 3), 1, 1); }
      ctx.fillStyle = '#3a3a44'; for (let yy = y - 40; yy < y - 18; yy += 2) ctx.fillRect(x, yy, 1, 1);
      break;
    }
  }
}
function drawBody() {
  if (b.hidden) return;
  const blink = b.iT > 0 && t % 6 < 3;
  if (mode === 'body') {
    const back = b.ay < -0.4, frame = b.moving ? [1, 0, 2, 0][(b.anim / 7 | 0) % 4] : 0;
    const spr = (back ? SPR.back : SPR.ash)[frame];
    const lx = b.x + (b.face > 0 ? 6 : -9), ly = b.y - 10;
    if (back) drawLantern(lx, ly);
    if (!blink) drawSpr(spr, b.x - 6, b.y - 19, b.face < 0);
    if (!back) drawLantern(lx, ly);
    if (b.atk >= 6 && b.atk <= 13) {
      const ext = b.atk >= 8 && b.atk <= 12 ? 9 : 4;
      ctx.fillStyle = PAL.c;
      for (let i = 2; i < ext; i++) ctx.fillRect(Math.round(b.x + b.ax * i), Math.round(b.y - 8 + b.ay * i * 0.7), 2, 2);
      ctx.fillStyle = PAL.s; ctx.fillRect(Math.round(b.x + b.ax * ext - 1), Math.round(b.y - 9 + b.ay * ext * 0.7), 3, 3);
    }
    if (b.stun > 0) for (let i = 0; i < 3; i++) {
      const a = t * 0.12 + i * 2.1;
      ctx.fillStyle = '#e8d090'; ctx.fillRect(Math.round(b.x + Math.cos(a) * 7), Math.round(b.y - 22 + Math.sin(a) * 2), 1, 1);
    }
  } else {
    if (b.ward) {
      const r = 12 + Math.sin(t * 0.08);
      ctx.fillStyle = `rgba(232,208,144,${0.45 + Math.sin(t * 0.08) * 0.2})`;
      for (let a = 0; a < Math.PI * 2; a += 0.1) ctx.fillRect(Math.round(b.x + Math.cos(a) * r), Math.round(b.y - 2 + Math.sin(a) * r * 0.5), 1, 1);
    }
    drawSpr(SPR.lie, b.x - 12, b.y - 6, b.face < 0, { flash: b.iT > 50 });
    drawLantern(b.x + (b.face < 0 ? -18 : 14), b.y - 4);
  }
}
function drawEnemy(e) {
  const fl = e.flash > 0, flip = e.face < 0;
  // wind-up tell: jitter, white flicker near the end, and a red mark overhead
  const jit = e.wind > 0 ? (t % 4 < 2 ? 1 : -1) : 0, tell = e.wind > 0 && e.wind < 10 && t % 3 === 0;
  if (e.wind > 0) {
    ctx.fillStyle = e.wind < 10 ? '#ff6040' : '#c03030';
    const hy = Math.round(e.y - (e.type === 'shade' ? 36 : 26));
    ctx.fillRect(Math.round(e.x), hy, 1, 3); ctx.fillRect(Math.round(e.x), hy + 4, 1, 1);
  }
  if (e.type === 'hollow') drawSpr(SPR.hollow[(e.anim / 10 | 0) % 2], e.x - 6 + jit, e.y - 18, flip, { flash: fl || tell, reveal: 1 - e.rise / 45 });
  else if (e.type === 'cantor') {
    drawSpr(SPR.cantor, e.x - 6, e.y - 18, flip, { flash: fl, reveal: 1 - e.rise / 45 });
    if (e.rise <= 0 && e.fire < 40) {
      const r = 1 + (40 - e.fire) / 14 | 0;
      ctx.fillStyle = t % 4 < 2 ? '#ff8040' : '#fff0a0'; ctx.fillRect(Math.round(e.x - r / 2), Math.round(e.y - 22 - r / 2), r, r);
    }
  } else if (e.type === 'shade') {
    const a = (mode === 'body' ? 0.25 : 0.92) * (1 - e.rise / 40);
    drawSpr(SPR.shade, e.x - 7 + jit, e.y - 26 + Math.sin(e.anim * 0.07) * 1.5, flip, { flash: fl || tell, alpha: Math.max(a, e.wind > 0 ? 0.6 : 0) });
  } else if (e.type === 'warden') {
    const lift = e.rise > 0 ? e.rise / 70 : 0;
    drawSpr(wardenSpr, e.x - 18, e.y - 50, false, { flash: fl, alpha: 1 - lift, reveal: 1 - lift * 0.6 });
  }
}
function drawPickup(p) {
  if (p.t > 600 && t % 8 < 4) return;
  const x = Math.round(p.x - 2), y = Math.round(p.y - 12 + Math.sin(p.t * 0.1) * 1.5);
  if (p.type === 'orb') {
    ctx.fillStyle = '#5ff'; ctx.fillRect(x + 1, y, 3, 5); ctx.fillRect(x, y + 1, 5, 3);
    ctx.fillStyle = '#fff'; ctx.fillRect(x + 1, y + 1, 2, 2);
  } else {
    ctx.fillStyle = '#c84a20'; ctx.fillRect(x + 1, y, 3, 5); ctx.fillRect(x, y + 1, 5, 3);
    ctx.fillStyle = '#ffd080'; ctx.fillRect(x + 2, y + 1, 1, 3);
  }
}
function drawTether(x0, y0, x1, y1, col) {
  const d = Math.hypot(x1 - x0, y1 - y0), n = Math.max(2, d / 3 | 0);
  ctx.fillStyle = col;
  for (let i = 1; i < n; i++) {
    const k = i / n, sag = Math.sin(k * Math.PI) * 7 + Math.sin(t * 0.12 + i * 0.7) * 0.8;
    ctx.globalAlpha = 0.35 + 0.5 * Math.sin(k * Math.PI);
    ctx.fillRect(Math.round(x0 + (x1 - x0) * k), Math.round(y0 + (y1 - y0) * k + sag), 1, 1);
  }
  ctx.globalAlpha = 1;
}
function drawSpiritLayer() {
  if (!s) return;
  drawTether(b.x, b.y - 4, s.x, s.y - 10, energy < 30 ? (t % 12 < 6 ? '#f66' : '#a33') : '#8ff');
  const a = s.recall ? 0.5 : (s.iT > 0 && t % 6 < 3 ? 0.3 : 0.92);
  const sy = s.y - 24 + Math.sin(t * 0.08) * 1.2;
  if (!s.atk && !s.recall) {
    ctx.fillStyle = '#d8f4f8';
    for (let i = 0; i < 12; i++) ctx.fillRect(Math.round(s.x + s.face * (5 + i * 0.45)), Math.round(sy + 11 + i * 0.9), 1, 1);
  }
  drawSpr(s.ay < -0.4 ? SPR.spiritB : SPR.spirit, s.x - 6, sy, s.face < 0, { alpha: a, glow: true });
  if (s.atk > 1) {
    const p = 1 - (s.atk - 1) / 13, base = Math.atan2(s.ay, s.ax), ox = s.x, oy = s.y - 9;
    const end = -1.5 + 3 * Math.min(1, p * 1.7);
    for (let ang = -1.5; ang <= end; ang += 0.045) {
      const fadeK = 1 - (end - ang) / 3;
      for (const [r, col] of [[14, '#3aa'], [17, '#7dd'], [20, '#cff'], [22, '#fff']]) {
        ctx.globalAlpha = (1 - p * 0.75) * fadeK;
        ctx.fillStyle = col;
        ctx.fillRect(Math.round(ox + Math.cos(base + ang) * r), Math.round(oy + Math.sin(base + ang) * r * 0.72), 1, 1);
      }
    }
    ctx.globalAlpha = 1;
  }
}

function lightPass(sx, sy) {
  const L = [];
  for (const p of R.props) if (p.kind === 'candle') L.push([p.x, p.y - 22, 74 + Math.sin(t * 0.25 + p.x) * 2 + Math.random() * 2, 0.95, '255,150,60', 0.13]);
  for (const wx of R.windows || []) { L.push([wx, 20, 18, 0.7]); L.push([wx + 16, TOPW + 40, 44, 0.26]); }
  if (R.circle && circleFlare > 0) L.push([R.circle.x, R.circle.y, 70 + 90 * circleFlare, 0.95, '240,200,120', 0.45 * circleFlare]);
  if (R.circle) {
    const sp = mode === 'spirit';
    L.push([R.circle.x, R.circle.y, 64, sp ? 0.55 : 0.4, sp && b.ward ? '232,190,110' : '170,30,30', sp ? 0.12 : 0.05]);
  }
  if (!b.hidden) {
    const lx = mode === 'body' ? b.x + b.face * 6 : b.x + (b.face < 0 ? -16 : 16);
    L.push([lx, b.y - 8, mode === 'body' ? 84 : 66, 0.9, '255,175,95', 0.11]);
  }
  if (s) L.push([s.x, s.y - 14, 72, 0.85, '90,230,255', 0.13]);
  if (marenSpirit) L.push([marenSpirit.x, marenSpirit.y - 16, 90 * marenSpirit.a, 0.9, '255,220,160', 0.2 * marenSpirit.a]);
  for (const o of bolts) L.push([o.x, o.y - 7, 24, 0.9, '255,70,40', 0.35]);
  for (const e of enemies) {
    if (e.type === 'cantor' && e.fire < 40 && e.rise <= 0) L.push([e.x, e.y - 22, 20, 0.8, '255,120,40', 0.3]);
    if (e.type === 'warden') L.push([e.x, e.y - 30, 30 + 40 * e.glow, 0.5 + 0.4 * e.glow, '255,170,80', 0.08 + 0.25 * e.glow]);
  }
  for (const p of pickups) L.push([p.x, p.y - 12, 16, 0.7, p.type === 'orb' ? '90,230,255' : '255,140,60', 0.2]);
  for (const sg of R.sigils) if (sg.lit || mode === 'spirit') L.push([sg.x, sg.y, 26, 0.5, sg.lit ? '232,200,130' : '90,230,255', 0.14]);
  for (const ex of R.exits) if (ex.veil && ex.open()) L.push([(ex.x0 + ex.x1) / 2, TOPW - 12, 46, 0.6, '90,230,255', 0.14]);

  lg.globalCompositeOperation = 'source-over';
  lg.clearRect(0, 0, W, H);
  lg.fillStyle = `rgba(4,3,8,${R.ambient})`; lg.fillRect(0, 0, W, H);
  lg.globalCompositeOperation = 'destination-out';
  for (const [x, y, r, a] of L) {
    const X = x - sx, Y = y - sy;
    if (X < -r || X > W + r || Y < -r || Y > H + r) continue;
    const g = lg.createRadialGradient(X, Y, 0, X, Y, r);
    g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(0.5, `rgba(0,0,0,${a * 0.55})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    lg.fillStyle = g; lg.fillRect(X - r, Y - r, r * 2, r * 2);
  }
  ctx.drawImage(lc, 0, 0);
  ctx.globalCompositeOperation = 'lighter';
  for (const wx of R.windows || []) {                       // soft light shafts from the windows
    const X = wx - sx, Y = 30 - sy;
    const g = ctx.createLinearGradient(0, Y, 0, Y + 90);
    g.addColorStop(0, 'rgba(255,225,190,0.07)'); g.addColorStop(1, 'rgba(255,225,190,0)');
    ctx.fillStyle = g; ctx.beginPath();
    ctx.moveTo(X - 7, Y); ctx.lineTo(X + 7, Y); ctx.lineTo(X + 36, Y + 90); ctx.lineTo(X + 6, Y + 90); ctx.fill();
  }
  for (const [x, y, r, , col, a] of L) if (col) {
    const X = x - sx, Y = y - sy, rr = r * 0.75;
    const g = ctx.createRadialGradient(X, Y, 0, X, Y, rr);
    g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = g; ctx.fillRect(X - rr, Y - rr, rr * 2, rr * 2);
  }
  ctx.globalCompositeOperation = 'source-over';
}
const lc = canvas(W, H), lg = lc.getContext('2d');

function drawGlowLayer() {
  // veil doorway shimmer
  for (const ex of R.exits) if (ex.veil) {
    const open = ex.open(), k = open ? (mode === 'spirit' ? 1 : 0.45) : 0.12;
    for (let x = ex.x0 + 1; x < ex.x1 - 1; x++) for (let y = 14; y < TOPW; y += 1) {
      const v = Math.sin(t * 0.06 + x * 0.45 + y * 0.18) * 0.5 + 0.5;
      if (v < 0.55) continue;
      ctx.fillStyle = open ? `rgba(140,240,255,${(v - 0.55) * k})` : `rgba(160,40,40,${(v - 0.55) * 0.5})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  // sealed doorways during a fight
  if (enc) for (const r of R.lockRects) {
    const y0 = Math.max(r.y, 0), y1 = Math.min(r.y + r.h, R.h);
    for (let x = r.x; x < r.x + r.w; x += 2) for (let y = y0; y < y1; y += 2)
      if (Math.sin(t * 0.1 + x * 0.3 + y * 0.2) > 0.4) { ctx.fillStyle = 'rgba(200,40,40,0.35)'; ctx.fillRect(x, y, 1, 1); }
  }
  // sigils
  for (const sg of R.sigils) {
    const pulse = 0.5 + Math.sin(t * 0.08) * 0.3;
    const col = sg.lit ? `rgba(232,208,144,0.9)` : mode === 'spirit' ? `rgba(120,240,255,${pulse})` : 'rgba(90,80,90,0.5)';
    ctx.fillStyle = col;
    for (let a = 0; a < Math.PI * 2; a += 0.22) ctx.fillRect(Math.round(sg.x + Math.cos(a) * 8), Math.round(sg.y + Math.sin(a) * 4.5), 1, 1);
    for (let i = -3; i <= 3; i++) { ctx.fillRect(sg.x + i, sg.y, 1, 1); ctx.fillRect(sg.x, sg.y + Math.round(i * 0.6), 1, 1); }
  }
  // bell rings
  for (const g of rings) {
    const a = 1 - g.r / g.max;
    for (const [rr, al] of [[g.r, a], [g.r - 2, a * 0.5]]) {
      ctx.fillStyle = `rgba(232,190,110,${al})`;
      const step = 1.6 / Math.max(rr, 1);
      for (let ang = 0; ang < Math.PI * 2; ang += step) ctx.fillRect(Math.round(g.x + Math.cos(ang) * rr), Math.round(g.y + Math.sin(ang) * rr * 0.6), 1, 1);
    }
  }
  // warden's ember eyes
  for (const e of enemies) if (e.type === 'warden' && e.rise <= 0) {
    ctx.fillStyle = e.glow > 0.5 && t % 6 < 3 ? '#fff0c0' : '#ff7030';
    ctx.fillRect(Math.round(e.x - 5), Math.round(e.y - 29), 2, 1); ctx.fillRect(Math.round(e.x + 3), Math.round(e.y - 29), 2, 1);
  }
  drawSpiritLayer();
  if (marenSpirit) drawSpr(SPR.marenSpirit, marenSpirit.x - 6, marenSpirit.y - 34 + Math.sin(t * 0.05) * 2, false, { alpha: marenSpirit.a * 0.92, glow: true });
  for (const p of parts) if (p.glow) {
    ctx.globalAlpha = Math.min(1, p.life / 12); ctx.fillStyle = p.col; ctx.fillRect(Math.round(p.x), Math.round(p.y), p.sz, p.sz);
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#e8d8b0';
  for (const m of motes) { ctx.globalAlpha = 0.12 + Math.sin(m.p * 3) * 0.06; ctx.fillRect(Math.round(m.x), Math.round(m.y), 1, 1); }
  ctx.globalAlpha = 1;
}

function draw() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  if (!R) return;
  const sx = Math.round(cam.x + (shake ? (Math.random() - 0.5) * shake : 0));
  const sy = Math.round(cam.y + (shake ? (Math.random() - 0.5) * shake : 0));
  ctx.save(); ctx.translate(-sx, -sy);
  ctx.drawImage(roomBg, 0, 0);
  ctx.drawImage(decals, 0, 0);
  for (const p of R.props) if (p.kind === 'pillar' || p.kind === 'statue') shadow(p.x + 3, p.y, 10, 0.4);
  for (const e of enemies) if (e.rise <= 0 || e.type === 'warden') shadow(e.x, e.y, e.r, e.type === 'shade' ? 0.15 : 0.4);
  if (!b.hidden) shadow(b.x, b.y, mode === 'body' ? 4 : 10);
  if (s) shadow(s.x, s.y, 4, 0.18);
  const list = [];
  for (const p of R.props) list.push({ y: p.y, d: () => drawProp(p) });
  for (const g of R.gates) list.push({ y: g.y, d: () => drawRailing(g.x, g.y, g.w, g.anim * 22, 1 - g.anim) });
  for (const p of pickups) list.push({ y: p.y, d: () => drawPickup(p) });
  for (const e of enemies) list.push({ y: e.y, d: () => drawEnemy(e) });
  for (const o of bolts) list.push({ y: o.y, d: () => {
    ctx.fillStyle = '#c83020'; ctx.fillRect(Math.round(o.x - 2), Math.round(o.y - 9), 4, 4);
    ctx.fillStyle = '#ffd0a0'; ctx.fillRect(Math.round(o.x - 1), Math.round(o.y - 8), 2, 2);
  } });
  list.push({ y: b.y, d: drawBody });
  list.sort((a, c) => a.y - c.y).forEach(it => it.d());
  for (const p of parts) if (!p.glow) {
    ctx.globalAlpha = Math.min(1, p.life / 10); ctx.fillStyle = p.col; ctx.fillRect(Math.round(p.x), Math.round(p.y), p.sz, p.sz);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
  lightPass(sx, sy);
  ctx.save(); ctx.translate(-sx, -sy); drawGlowLayer(); ctx.restore();
  ctx.globalAlpha = 0.05;
  const gx = Math.random() * 128 | 0, gy = Math.random() * 128 | 0;
  for (let x = -gx; x < W; x += 128) for (let y = -gy; y < H; y += 128) ctx.drawImage(grainCanvas, x, y);
  ctx.globalAlpha = 1;
  ctx.drawImage(vignetteCanvas, 0, 0);
  if (redFlash) { ctx.fillStyle = `rgba(150,0,0,${redFlash / 40})`; ctx.fillRect(0, 0, W, H); }
  if (whiteFlash) { ctx.fillStyle = `rgba(235,250,255,${whiteFlash})`; ctx.fillRect(0, 0, W, H); }
  if (fade > 0) { ctx.fillStyle = `rgba(0,0,0,${fade})`; ctx.fillRect(0, 0, W, H); }
  updateDOM(sx, sy);
}

function updateDOM(sx, sy) {
  const inGame = ['play', 'talk', 'fade', 'dying', 'pause', 'cut'].includes(state) && !(b.hidden && state !== 'dying');
  UI.hud.classList.toggle('on', inGame);
  UI.soulrow.style.display = flags.awakened || mode === 'spirit' ? '' : 'none';
  UI.hp.style.width = (b.hp / b.max * 100) + '%';
  UI.sp.style.width = energy + '%';
  UI.sp.classList.toggle('low', energy < 25);
  UI.ward.classList.toggle('on', mode === 'spirit' && b.ward);
  const boss = enemies.find(e => e.type === 'warden');
  UI.boss.classList.toggle('on', !!boss && inGame);
  if (boss) UI.bossb.style.width = Math.max(0, boss.hp / boss.max * 100) + '%';
  const who = mode === 'spirit' ? s : b, note = state === 'play' && who && !(s && s.recall) ? nearNote(who) : null;
  UI.prompt.classList.toggle('on', !!note);
  if (note) UI.prompt.innerHTML = `<kbd>X</kbd> ${note.note ? 'Read' : note.label}`;
  if (note) { UI.prompt.style.left = (note.x - sx) + 'px'; UI.prompt.style.top = (note.y - 22 - sy) + 'px'; }
  const danger = state === 'play' && mode === 'spirit' &&
    (enemies.some(e => e.rise <= 0 && dist(e, b) < 55) || bolts.some(o => Math.hypot(o.x - b.x, o.y - b.y) < 70));
  UI.danger.style.opacity = danger && t % 24 < 14 ? 1 : 0;
  UI.danger.style.left = (b.x - sx) + 'px'; UI.danger.style.top = (b.y - 14 - sy) + 'px';
  for (const f of fts) {
    f.el.style.left = (f.x - sx) + 'px'; f.el.style.top = (f.y - sy) + 'px';
    f.el.style.opacity = Math.min(1, f.life / 20);
  }
}

// ---------------------------------------------------------------- loop
showTitle();
// dev shortcut: index.html?room=nave  (add &split=1 to start as spirit)
{
  const q = new URLSearchParams(location.search), room = q.get('room');
  if (room && ROOMS[room]) {
    hideCard(); flags = { intro: true, g1: true, naveClear: room !== 'nave', awakened: room === 'belfry' || q.get('split') === '1' };
    const veil = room === 'belfry' || q.get('split') === '1';
    loadRoom(room, room === 'belfry' ? { x: 240, y: 276 } : { x: 240, y: Math.min(250, ROOMS[room]().h - 40) }, { veil });
    fade = 0;
  }
}
let acc = 0, last = performance.now();
function frame(now) {
  acc += Math.min(100, now - last); last = now;
  while (acc >= 1000 / 60) {
    update();
    for (const k in hit) delete hit[k];
    acc -= 1000 / 60;
  }
  draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
