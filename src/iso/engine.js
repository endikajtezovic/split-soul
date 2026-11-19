"use strict";
// ======================================================================
//  SOUL SPLIT — isometric engine
//  World coordinates are tiles (x, y). Screen = 2:1 isometric projection.
//  Areas (maps + story) live in areas.js; art in props.js / ../art.js.
// ======================================================================
const $ = id => document.getElementById(id);
const cv = $('c'), ctx = cv.getContext('2d');
ctx.imageSmoothingEnabled = false;
const UI = {
  wrap: $('wrap'), ui: $('ui'), hud: $('hud'), hp: $('hpb'), sp: $('spb'), soulrow: $('soulrow'), ward: $('ward'),
  loc: $('loc'), toast: $('toast'), dialog: $('dialog'), who: $('who'), line: $('line'), card: $('card'), cardIn: $('cardInner'),
  prompt: $('prompt'), danger: $('danger'), boss: $('boss'), bossb: $('bossb'), bossName: document.querySelector('#boss .n'),
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
  start: ['Enter'], ch1: ['Digit1', 'Numpad1'], ch2: ['Digit2', 'Numpad2'], ch3: ['Digit3', 'Numpad3'], ch4: ['Digit4', 'Numpad4'], pause: ['KeyP', 'Escape'], mute: ['KeyM'],
};
const held = a => K[a].some(c => down[c]);
const tap = a => K[a].some(c => hit[c]);
addEventListener('keydown', e => {
  if (!down[e.code]) hit[e.code] = true;
  down[e.code] = true;
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
  initAudio();
});
addEventListener('keyup', e => { down[e.code] = false; });
addEventListener('blur', () => { for (const k in down) down[k] = false; });

// ---------------------------------------------------------------- math + projection
const clamp = (v, a, c) => Math.max(a, Math.min(c, v));
const norm = (x, y) => { const d = Math.hypot(x, y) || 1; return [x / d, y / d]; };
const wd = (a, c) => Math.hypot(a.x - c.x, a.y - c.y);
let OX = 0, OY = 0, MAPW = 0, MAPH = 0;
const isoX = (x, y) => (x - y) * 16 + OX;
const isoY = (x, y) => (x + y) * 8 + OY;
const screenToWorld = (sx, sy) => [(sx / 16 + sy / 8) / 2, (sy / 8 - sx / 16) / 2];

// ---------------------------------------------------------------- state
const TETHER = 6;
let state = 'title', mode = 'body', t = 0, A = null;
let ground = null, statics = [], footDots = [], CAM = { x0: 0, x1: 0, y0: 0, y1: 0 };
let b = null, s = null, energy = 100, enemies = [], bolts = [], rings = [], parts = [], pickups = [], fts = [], fireflies = [];
let flags = {}, checkpoint = null, enc = null, cam = { x: 0, y: 0 }, camX = 0, camY = 0;
let shake = 0, hitstop = 0, redFlash = 0, whiteFlash = 0, circleFlare = 0, spiritK = 0, fade = 1, fadeTarget = 0;
let waiters = [], dlg = null, cardWaiter = null, toastT = 0, locT = 0, marenSpirit = null, nextId = 1, goat = null;

// ---------------------------------------------------------------- tiles
const OUT_SOLID = new Set(['T', 'P', 'f', 'H', 'C', 'W', 'b', 'B', 'L', 'q', 'Y', 'r', 'l', 'D', 'X',
                           'p', 'w', 'k', 'S', 'A', 'E', 'R', 'Z', 'U', ' ', 'F', 'N', 'J', 'K',
                           '~', 'h', 'O', 'V', 'x', 'u', 'n', 'Q', 'M', 'I', 'v', '+', '%', 'j', 'z', 'y', 'a', '!', '&', 'e',
                           '1', '2', '3', '4', '5', '6', '7', '8', '9', 'i', '*', '$', ':']);
// chapters can add their own ground kinds, props and enemies
const GROUND = {}, PROPS = {}, ENEMY_TYPES = {}, BUILDERS = {};
const exitAt = (x, y, forSpirit) => A.exits.find(ex => {
  if (ex.veil ? !(forSpirit && ex.veil()) : false) return false;
  const along = ex.edge === 'xmin' || ex.edge === 'xmax' ? y : x;
  if (along < ex.a || along > ex.b) return false;
  return ex.edge === 'ymax' ? y >= A.MH : ex.edge === 'ymin' ? y < 0 : ex.edge === 'xmin' ? x < 0 : x >= A.MW;
});
function tileAt(x, y) {
  if (x < 0 || y < 0 || x >= A.MW || y >= A.MH) return exitAt(x, y, false) ? '.' : 'X';
  return A.map[y][x];
}
const gateOpen = () => !A.gate || A.gate();
function blockedBody(x, y, r) {
  for (const [dx, dy] of [[-r, -r], [r, -r], [-r, r], [r, r]]) {
    const c = tileAt(Math.floor(x + dx), Math.floor(y + dy));
    if (c === 'G' ? !gateOpen() : OUT_SOLID.has(c)) return true;
  }
  return false;
}
// scenery beyond the playable map (outdoor areas only)
function tileExt(x, y) {
  if (x >= 0 && y >= 0 && x < A.MW && y < A.MH) return A.map[y][x];
  if (A.ext) { const c = A.ext(x, y); if (c) return c; }
  const r = hash(x + 50 + (A.seed || 0), y + 50) % 100;
  if (x < 0 || y < 0) return r < 78 ? (r % 3 ? 'T' : 'P') : '.';
  return r < 6 ? 'T' : r < 12 ? 'b' : r < 22 ? ',' : '.';
}
const outside = (x, y) => Math.max(-x, -y, x - A.MW + 1, y - A.MH + 1, 0);

// ---------------------------------------------------------------- ground (+ walls for interiors)
const WALL_H = 86;
function paintGround() {
  const PAD = A.outdoor ? 8 : 0;
  OX = (A.MH + PAD) * 16 + 40; OY = (A.outdoor ? 110 : WALL_H + 50) + PAD * 8;
  MAPW = (A.MW + A.MH + 4 * PAD) * 16 + 80; MAPH = (A.MW + A.MH + 2 * PAD) * 8 + OY + 40;
  const c = canvas(MAPW, MAPH), g = c.getContext('2d');
  const rnd = rndOf(A.seed || 5);
  const lowf = (px, py) => Math.sin(px * 0.045) + Math.cos(py * 0.07) + Math.sin((px + py) * 0.021);
  const G = A.grass || ['#62903e', '#567f36', '#4c7331', '#43692c'];
  const grass = (px, py) => { const n = lowf(px, py) + rnd() * 0.9; return n > 1.3 ? G[0] : n > 0.4 ? G[1] : n > -0.6 ? G[2] : G[3]; };
  const kindOf = ch => {
    if (A.kind) { const k = A.kind(ch); if (k) return k; }
    if (ch === '~' || ch === 'h') return 'water';
    if (A.deck || ch === 'd' || ch === 'e' || ch === 'n') return 'deck';
    if (A.outdoor && 'xuVOQM'.includes(ch)) return 'stone';
    if (A.outdoor) return ch === '=' || ch === 'g' || ch === 'H' || ch === 'C' ? 'path' : ch === '#' ? 'stone' : ch === 's' ? 'soil' : 'grass';
    if (ch === ' ') return 'void';
    if (ch === 'c') return 'carpet';
    return A.floor === 'wood' ? 'wood' : A.floor === 'iron' ? 'iron' : 'floor';
  };
  g.fillStyle = '#07060a'; g.fillRect(0, 0, MAPW, MAPH);
  for (let y = -PAD; y < A.MH + PAD; y++) for (let x = -PAD; x < A.MW + PAD; x++) {
    const ch = A.outdoor ? tileExt(x, y) : tileAt(x, y);
    if (!A.outdoor && ch === 'X') continue;
    const kind = kindOf(ch), cx = isoX(x, y), cy = isoY(x, y);
    if (kind === 'void') continue;
    const carpetEdgeL = kind === 'carpet' && tileAt(x - 1, y) !== 'c', carpetEdgeR = kind === 'carpet' && tileAt(x + 1, y) !== 'c';
    for (let r = 0; r < 16; r++) {
      const hw = r < 8 ? (r + 1) * 2 : (16 - r) * 2;
      for (let i = -hw; i < hw; i++) {
        const px = cx + i, py = cy + r, edge = hw - Math.abs(i + 0.5);
        const [wx, wy] = screenToWorld(px - OX + 0.5, py - OY + 0.5), fx = wx - x, fy = wy - y;
        let col;
        if (kind === 'grass') col = grass(px, py);
        else if (kind === 'path') { if (edge < 3 && rnd() < 0.45) col = grass(px, py); else { const n = rnd(); col = n < 0.04 ? '#c4b292' : n < 0.4 ? '#8c6e48' : n < 0.8 ? '#9a7b52' : '#a6885c'; } }
        else if (kind === 'water') {
          const n = lowf(px * 1.3, py * 2) + rnd() * 0.5;
          if (A.deck) { const dash = hash(px >> 2, py) % 53 === 0 || hash((px + 2) >> 2, py) % 53 === 0; col = dash ? '#2a5274' : n > 1.2 ? '#183858' : n > 0 ? '#14304e' : '#112a44'; }
          else { const wave = Math.sin(px * 0.16 + py * 0.9 + Math.sin(py * 0.09 + px * 0.02) * 2.5) > 0.94; col = wave ? '#4a7a98' : n > 1.2 ? '#2a5a78' : n > 0 ? '#24506c' : '#1e4660'; }
        } else if (kind === 'deck') {
          const plank = Math.floor(wx * 3), v = (hash(plank, Math.floor(wy * 0.6 + plank * 0.37)) % 10) - 5, seam = (wx * 3) % 1 < 0.09 ? -30 : 0;
          col = `rgb(${150 + v + seam},${116 + v + seam},${80 + v + seam})`;
          if (ch === 'e') {
            const eL = tileExt(x - 1, y) !== 'e', eR = tileExt(x + 1, y) !== 'e', eT = tileExt(x, y - 1) !== 'e', eB = tileExt(x, y + 1) !== 'e';
            if ((eL && fx < 0.1) || (eR && fx > 0.9) || (eT && fy < 0.1) || (eB && fy > 0.9)) col = '#ece8dc';
            else { const depth = (eT ? fy : 0.5 + fy * 0.5), st = Math.floor(depth * 5); col = (depth * 5) % 1 < 0.18 ? '#120c08' : ['#6a5034', '#56402a', '#423020', '#2e2016', '#1a120c'][Math.min(4, st)]; }
          }
        } else if (kind === 'iron') {
          const v = (rnd() * 6 - 3) | 0, grid = (fx * 4) % 1 < 0.1 || (fy * 4) % 1 < 0.1, seam = fx < 0.04 || fy < 0.04;
          col = seam ? '#18181c' : grid ? `rgb(${30 + v},${30 + v},${36 + v})` : `rgb(${54 + v},${54 + v},${60 + v})`;
          if (!seam && !grid && hash(px, py) % 97 === 0) col = '#6a6a72';
        }
        else if (kind === 'stone') col = (edge < 2 && rnd() < 0.4) ? grass(px, py) : ((px + py * 2) % 12 === 0 || (px - py * 2 + 400) % 12 === 0) ? '#56544e' : rnd() < 0.5 ? '#8e8c84' : '#9a988e';
        else if (GROUND[kind]) col = GROUND[kind](px, py, fx, fy, x, y, rnd, ch, grass);
        else if (kind === 'soil') col = ((py * 2 - px + 400) % 8 < 2) ? '#45301f' : rnd() < 0.5 ? '#5c3f29' : '#64452d';
        else if (kind === 'floor') {
          const odd = (x + y) % 2, base = odd ? [56, 52, 58] : [40, 37, 44], v = (rnd() * 6 - 3) | 0;
          const seam = fx < 0.04 || fy < 0.04 ? 9 : fx > 0.96 || fy > 0.96 ? -9 : 0;
          col = `rgb(${base[0] + v + seam},${base[1] + v + seam},${base[2] + v + seam})`;
        } else if (kind === 'wood') {
          const plank = Math.floor(wy * 3), v = (hash(plank, Math.floor(wx * 0.7 + plank * 0.37)) % 10) - 5;
          const seam = (wy * 3) % 1 < 0.08 ? -14 : 0;
          col = `rgb(${56 + v + seam},${42 + v + seam},${33 + v + seam})`;
          if (rnd() < 0.03) col = '#2a1e16';
        } else if (kind === 'carpet') {
          const inEdge = (carpetEdgeL && fx < 0.12) || (carpetEdgeR && fx > 0.88);
          col = inEdge ? '#8a6a3a' : ((Math.abs(((fy * 4) % 1) - 0.5) + Math.abs(fx - 0.5)) < 0.18 ? '#4a2226' : '#3a1a1e');
        }
        g.fillStyle = col; g.fillRect(px, py, 1, 1);
      }
    }
    if (kind === 'grass') {
      for (let i = 0; i < 6; i++) { g.fillStyle = A.blade || '#76a64c'; g.fillRect(cx - 10 + rnd() * 20 | 0, cy + 3 + rnd() * 10 | 0, 1, 2); }
      if (ch === ',') for (let i = 0; i < 6; i++) {
        const fx = cx - 9 + rnd() * 18 | 0, fy = cy + 3 + rnd() * 9 | 0;
        g.fillStyle = '#3e6a2a'; g.fillRect(fx, fy + 1, 1, 1);
        g.fillStyle = ['#e85a6a', '#f0e070', '#f4f0f0', '#a070d0', '#f09040'][rnd() * 5 | 0]; g.fillRect(fx, fy, 1, 1);
      }
    }
  }
  if (A.edge) {                                     // ship hull or pier pilings dropping into the sea
    const E = A.edge, wet = (x, y) => { const c = tileExt(x, y); return c === '~' || c === 'h'; };
    const tex = E.kind === 'hull' ? hullTex(E.h, 1)
      : (u, v) => v >= E.h - 3 ? (v === E.h - 3 ? '#3a2a1a' : '#6a4c2c') : (u % 8 < 2 ? (u % 8 === 0 ? '#4a3420' : '#2a1e14') : null);
    for (let y = A.shipRuns ? -PAD : 0; y < A.MH; y++) for (let x = 0; x < A.MW; x++) {
      if (wet(x, y)) continue;
      if (wet(x, y + 1) && !(A.bow && y === A.MH - 1)) face(g, [isoX(x, y + 1), isoY(x, y + 1) + E.h], [isoX(x + 1, y + 1), isoY(x + 1, y + 1) + E.h], E.h, tex);
      if (wet(x + 1, y)) face(g, [isoX(x + 1, y + 1), isoY(x + 1, y + 1) + E.h], [isoX(x + 1, y), isoY(x + 1, y) + E.h], E.h, tex, 0.15);
      if (E.kind === 'hull') for (let i = 0; i < 16; i++) {
        if (wet(x, y + 1) && !(A.bow && y === A.MH - 1) && rnd() < 0.7) { g.fillStyle = rnd() < 0.5 ? '#e8f0f4' : '#a8c4d4'; g.fillRect(isoX(x, y + 1) + i, Math.round(isoY(x, y + 1) + i / 2 + E.h + 1 + rnd() * 2), 1, 1); }
        if (wet(x + 1, y) && rnd() < 0.7) { g.fillStyle = rnd() < 0.5 ? '#e8f0f4' : '#a8c4d4'; g.fillRect(isoX(x + 1, y + 1) + i, Math.round(isoY(x + 1, y + 1) - i / 2 + E.h + 1 + rnd() * 2), 1, 1); }
      }
    }
  }
  if (A.bow) {                                     // a pointed bow beyond the front edge, coming toward the camera
    const len = A.bow, H = A.edge.h, mid = A.MW / 2, M = A.MH, P = (x, y, z = 0) => [isoX(x, y), isoY(x, y) - z];
    const fl = (x0, y0, x1, y1) => face(g, [isoX(x0, y0), isoY(x0, y0) + H], [isoX(x1, y1), isoY(x1, y1) + H], H, hullTex(H, 2), x0 > mid - 0.01 || x1 > mid + 0.01 && x0 > 0.01 ? 0.12 : 0.3);
    const N = 12, curve = k => [mid * (1 - 0) * 0 + k, 0];
    const edgePt = (sd, k) => [mid + sd * mid * (1 - Math.pow(k, 1.7)) * (1 - 0.15 * k), M + len * k];   // curved flanks meeting at a sharp stem
    for (let i = 0; i < N; i++) { const a2 = edgePt(-1, i / N), b2 = edgePt(-1, (i + 1) / N); fl(a2[0], a2[1], b2[0], b2[1]); }
    for (let i = N; i > 0; i--) { const a2 = edgePt(1, i / N), b2 = edgePt(1, (i - 1) / N); fl(a2[0], a2[1], b2[0], b2[1]); }
    const poly = []; for (let i = 0; i <= N; i++) poly.push(P(...edgePt(-1, i / N))); for (let i = N; i >= 0; i--) poly.push(P(...edgePt(1, i / N)));
    polyFn(g, poly, (px2, py2) => {
      const [wx, wy] = screenToWorld(px2 - OX + 0.5, py2 - OY + 0.5), plank = Math.floor(wx * 3), v = (hash(plank, Math.floor(wy * 0.6 + plank * 0.37)) % 10) - 5, seam = (wx * 3) % 1 < 0.09 ? -30 : 0;
      return `rgb(${150 + v + seam},${116 + v + seam},${80 + v + seam})`;
    });
    for (const sd of [-1, 1]) for (let i = 0; i <= 60; i++) {
      const [wx, wy] = edgePt(sd, i / 60), [px2, py2] = P(wx, wy);
      g.fillStyle = '#f4f0e6'; g.fillRect(Math.round(px2), Math.round(py2 - 15), 1, 1); g.fillStyle = '#d8d2c4'; g.fillRect(Math.round(px2), Math.round(py2 - 8), 1, 1);
      if (i % 6 === 0) { g.fillStyle = '#e0dace'; g.fillRect(Math.round(px2), Math.round(py2 - 15), 2, 15); }
      if (rnd() < 0.8) { g.fillStyle = rnd() < 0.5 ? '#e8f0f4' : '#a8c4d4'; g.fillRect(Math.round(px2 + sd * 2 + (rnd() - 0.5) * 3), Math.round(py2 + H + 1 + rnd() * 2), 1, 1); }
    }
  }
  if (A.prow) {                                    // the pointed bow beyond the back edge of the forecastle
    const len = A.prow, H = A.edge.h, mid = A.MW / 2, P = (x, y, z = 0) => [isoX(x, y), isoY(x, y) - z];
    face(g, [isoX(mid, -len), isoY(mid, -len) + H], [isoX(A.MW, 0), isoY(A.MW, 0) + H], H, hullTex(H, 1), 0.12);
    polyFn(g, [P(0, 0), P(A.MW, 0), P(mid, -len)], (x, y) => ((y * 2 + x) % 6 === 0 ? '#8a6a48' : LIV.teak));
    for (const [x0, y0] of [[0, 0], [A.MW, 0]]) for (let i = 0; i <= 40; i++) {
      const k = i / 40, wx = x0 + (mid - x0) * k, wy = y0 - len * k, [px2, py2] = P(wx, wy);
      g.fillStyle = '#f4f0e6'; g.fillRect(Math.round(px2), Math.round(py2 - 15), 1, 1); g.fillStyle = '#d8d2c4'; g.fillRect(Math.round(px2), Math.round(py2 - 8), 1, 1);
      if (i % 5 === 0) { g.fillStyle = '#e0dace'; g.fillRect(Math.round(px2), Math.round(py2 - 15), 1, 15); }
    }
  }
  if (A.bulkhead) {
    const h = A.bulkhead.h, doorU = (A.bulkhead.door ?? -99) * 32;
    face(g, [isoX(0, 0), isoY(0, 0)], [isoX(A.MW, 0), isoY(A.MW, 0)], h, (u, v) => {
      if (u >= doorU && u < doorU + 9 && v < 17) return (u === doorU || u === doorU + 8 || v === 16) ? '#5a4024' : (u - doorU) % 4 === 0 ? '#6a4a2a' : '#7a5832';
      const ring = lifeRing(u % 64 - 22, v - 12); if (ring) return ring;
      if ((v === 12 || v === 13) && u % 16 >= 7 && u % 16 < 9) return v === 12 ? '#ffe9a8' : '#f0b850';
      if (v === h - 3) return '#4a4a54';
      return v >= h - 2 ? '#ffffff' : (u % 32 === 0 || v % 10 === 0) ? '#d8d4c8' : LIV.white;
    }, 0.18);
    polyFn(g, [[isoX(0, 0), isoY(0, 0) - h], [isoX(A.MW, 0), isoY(A.MW, 0) - h], [isoX(A.MW, -0.7), isoY(A.MW, -0.7) - h], [isoX(0, -0.7), isoY(0, -0.7) - h]], (x, y) => ((y * 2 + x) % 6 === 0 ? '#8a6a48' : LIV.teak));
  }
  if (A.circle) {                                   // ritual circle, painted in world space
    const { x: ccx, y: ccy, r } = A.circle;
    const x0 = isoX(ccx - r, ccy + r) - 2, x1 = isoX(ccx + r, ccy - r) + 2, y0 = isoY(ccx - r, ccy - r) - 2, y1 = isoY(ccx + r, ccy + r) + 2;
    for (let py = y0; py < y1; py++) for (let px = x0; px < x1; px++) {
      const [wx, wy] = screenToWorld(px - OX + 0.5, py - OY + 0.5), col = circleColor(wx - ccx, wy - ccy, r);
      if (col) { g.fillStyle = col; g.fillRect(px, py, 1, 1); }
    }
  }
  for (let i = 0; i < (A.stains || 0); i++) {      // old bloodstains
    const sx = 1 + rnd() * (A.MW - 2), sy = 1 + rnd() * (A.MH - 2);
    if (OUT_SOLID.has(tileAt(sx | 0, sy | 0))) continue;
    for (let k = 0; k < 8 + rnd() * 10; k++) {
      const a = rnd() * 6.28, dd = rnd() * 0.5, px = isoX(sx + Math.cos(a) * dd, sy + Math.sin(a) * dd), py = isoY(sx + Math.cos(a) * dd, sy + Math.sin(a) * dd);
      g.fillStyle = ['#4e0e0e', '#5e1212', '#3a0a0a'][k % 3]; g.fillRect(px | 0, py | 0, k < 3 ? 3 : 1, k < 3 ? 2 : 1);
    }
  }
  if (A.outdoor) {
    const img = g.getImageData(0, 0, MAPW, MAPH), d = img.data;
    for (let py = 0; py < MAPH; py++) for (let qx = 0; qx < MAPW; qx++) {
      const [wx, wy] = screenToWorld(qx - OX, py - OY), o = Math.max(-wx, -wy, wx - A.MW, wy - A.MH, 0);
      if (o <= 0) continue;
      if (A.bow && wy > A.MH - 0.5 && wx > -2 && wx < A.MW + 2 && wy < A.MH + A.bow + 3) continue;   // keep the bow bright
      const k = 1 - (A.deck ? Math.min(0.3, o * 0.03) : Math.min(0.8, o * 0.1)), i = (py * MAPW + qx) * 4;
      d[i] = d[i] * k + 8 * (1 - k); d[i + 1] = d[i + 1] * k + 10 * (1 - k); d[i + 2] = d[i + 2] * k + 16 * (1 - k);
    }
    g.putImageData(img, 0, 0);
    for (let y = -PAD; y < A.MH + PAD; y++) for (let x = -PAD; x < A.MW + PAD; x++) {   // soft shadows (sun from the upper left)
      const ch = tileExt(x, y), big = 'TPD'.includes(ch);
      if (!big && !'bWqY'.includes(ch)) continue;
      const sx = isoX(x + 0.5, y + 0.5) + (big ? 8 : 3), sy = isoY(x + 0.5, y + 0.5);
      g.fillStyle = 'rgba(10,20,10,0.28)';
      for (let yy = -3; yy <= 3; yy++) { const ww = (big ? 16 : 7) * Math.sqrt(1 - (yy / 4) ** 2); g.fillRect(sx - ww, sy + yy, ww * 2, 1); }
    }
  } else paintWalls(g);
  return c;
}

// interiors: the two back walls (x = 0 and y = 0), with windows and doorways cut in
function paintWalls(g) {
  const stone = A.wallTex ? A.wallTex : A.wallStyle === 'plaster'
    ? (u, v) => (v < 22 ? stoneTex(['#6e6660', '#625a56', '#766e66'], '#3a3432', 10, 5)(u, v) : (u % 32 < 2 || v === 22 || v === 23 || v > WALL_H - 7) ? '#4a3426' : (hash(u, v) % 11 === 0 ? '#c4b694' : '#d4c6a4'))
    : A.wallStyle === 'cabin'
    ? (u, v) => v < 26 ? ((u % 20 === 0 || v === 25 || v === 0 || v % 13 === 0) ? '#3a2416' : (u % 20 < 2 ? '#6a4a2c' : '#5a3a24')) : v > WALL_H - 8 ? (v === WALL_H - 8 ? '#2a1a10' : '#4a2e1c') : (u % 8 === 0 ? '#b8a07a' : hash(u, v) % 17 === 0 ? '#c4ac84' : '#cdb890')
    : A.wallStyle === 'iron'
    ? (u, v) => (u % 24 === 0 || v % 20 === 0) ? '#1e1e24' : ((u % 24 === 2 || u % 24 === 22) && v % 4 === 0) || ((v % 20 === 2 || v % 20 === 18) && u % 4 === 0) ? '#6a6a74' : (hash(u / 24 | 0, v / 20 | 0) % 3 === 0 ? '#3e3e48' : '#44444e')
    : stoneTex(['#3a3540', '#35303a', '#403a46', '#38333e'], '#1a171c', 14, 7);
  const homeWin = (du, v) => { const wu = Math.round(du + 7), wv = v - 30; if (wu < 2 || wu > 12 || wv > 26) return null; if (wu === 2 || wu === 12 || wv === 0 || wv === 26 || wu === 7 || wv === 13) return '#4a3426'; return wv > 13 ? '#2a3a5a' : '#34466a'; };
  const wallTex = (side, len) => (u, v) => {
    const wc = side === 'L' ? A.MH - u / 16 : u / 16;
    for (const ex of A.exits) {
      if (ex.edge !== (side === 'L' ? 'xmin' : 'ymin')) continue;
      const cx = (ex.a + ex.b) / 2, hw = (ex.b - ex.a) / 2 * 16, du = Math.abs(wc - cx) * 16;
      if (du > hw + 3) continue;
      const top = 42 + Math.sqrt(Math.max(0, (hw + 3) ** 2 - du * du)) * 0.8, topIn = 42 + Math.sqrt(Math.max(0, hw * hw - du * du)) * 0.8;
      if (du <= hw && v < topIn) return ex.veil ? '#0a0c14' : '#06050a';
      if (v < top) return '#5a5450';
    }
    for (const [k, wx] of (side === 'L' ? A.winL || [] : A.winR || []).entries()) {
      const du = (wc - wx) * 16;
      if (A.wallTex) continue;
      if (A.wallStyle === 'iron' || A.wallStyle === 'cabin') { const dv = v - 46, dd = Math.hypot(du, dv); if (dd <= 7) return dd > 5.4 ? '#b08a4a' : (du - dv > 3 ? '#4a7a9a' : '#1e3a5a'); continue; }
      if (A.wallStyle === 'plaster') { if (Math.abs(du) <= 7 && v >= 30 && v < 57) { const c = homeWin(du, v); if (c) return c; } continue; }
      if (Math.abs(du) <= 7 && v >= 30 && v < 72) { const c = stainedGlass(Math.round(du + 7), v - 30, 15, 42, k * 5 + (side === 'L' ? 0 : 3)); if (c) return c; }
    }
    if (v >= WALL_H - 4) return v === WALL_H - 4 ? '#24202a' : '#5e5866';
    if (v < 6) return v === 5 ? '#4a4450' : '#24202a';
    if (!A.wallStyle && Math.abs(wc - Math.round(wc / 4) * 4) < 0.2) return v % 7 === 6 ? '#24202a' : '#4a4452';
    return stone(u, v);
  };
  face(g, [isoX(0, A.MH), isoY(0, A.MH)], [isoX(0, 0), isoY(0, 0)], WALL_H, wallTex('L'));
  face(g, [isoX(0, 0), isoY(0, 0)], [isoX(A.MW, 0), isoY(A.MW, 0)], WALL_H, wallTex('R'), 0.18);
  // a lip along the open front edges so the floor reads as a solid slab
  g.fillStyle = '#1a171c';
  for (let x = 0; x < A.MW; x++) for (let i = 0; i < 16; i++) g.fillRect(isoX(x, A.MH) + i, Math.round(isoY(x, A.MH) + i / 2), 1, 6);
  g.fillStyle = '#121014';
  for (let y = 0; y < A.MH; y++) for (let i = 0; i < 16; i++) g.fillRect(isoX(A.MW, y) - i - 1, Math.round(isoY(A.MW, y) + i / 2), 1, 6);
}

// ---------------------------------------------------------------- static objects
const darkCache = new Map();
function darkOf(img, a) {
  a = Math.round(a * 10) / 10;
  if (!darkCache.has(img)) darkCache.set(img, {});
  const m = darkCache.get(img);
  if (!m[a]) { const c = canvas(img.width, img.height), g = c.getContext('2d'); g.drawImage(img, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = `rgba(8,10,16,${a})`; g.fillRect(0, 0, c.width, c.height); m[a] = c; }
  return m[a];
}
const TREES = Array.from({ length: 8 }, (_, i) => makeTree(i * 11 + 3)), PINES = Array.from({ length: 6 }, (_, i) => makePine(i * 7 + 2));
const BUSHES = Array.from({ length: 6 }, (_, i) => makeBush(i * 5 + 1)), DEADS = Array.from({ length: 3 }, (_, i) => makeDeadTree(i + 1));
const GRAVES = [graveSpr(0), graveSpr(1)];
const fenceCache = {}, pewCache = {};
function buildStatics() {
  statics = [];
  const PAD = A.outdoor ? 8 : 0;
  for (let y = -PAD; y < A.MH + PAD; y++) for (let x = -PAD; x < A.MW + PAD; x++) {
    const ch = A.outdoor ? tileExt(x, y) : tileAt(x, y);
    const sx = isoX(x + 0.5, y + 0.5), sy = isoY(x + 0.5, y + 0.5), o = { x: x + 0.5, y: y + 0.5, key: x + y + 1 };
    const out = A.outdoor ? outside(x, y) : 0, dim = out ? Math.min(0.75, out * 0.1) : 0;
    const add = (img, ax, ay, extra = {}) => statics.push({ ...o, img: dim ? darkOf(img, dim) : img, dx: sx - ax, dy: sy - ay, ...extra });
    const conn = c2 => [tileAt(x + 1, y) === c2 || tileAt(x + 1, y) === 'G', tileAt(x - 1, y) === c2 || tileAt(x - 1, y) === 'G', tileAt(x, y + 1) === c2, tileAt(x, y - 1) === c2];
    const tree = A.deadwood && hash(x, y) % 3 === 0 ? DEADS[hash(x, y) % 3] : TREES[hash(x, y) % 8];
    switch (ch) {
      case 'T': add(tree, tree === TREES[hash(x, y) % 8] ? 24 : 20, tree.height - 3, { tall: true }); break;
      case 'P': add(PINES[hash(x, y) % 6], 18, 61, { tall: true }); break;
      case 'D': { const d2 = DEADS[hash(x, y) % 3]; add(d2, 20, d2.height - 2, { tall: true }); break; }
      case 'b': add(BUSHES[hash(x, y) % 6], 11, 16); break;
      case 's': add((x + y) % 2 ? cabbageSpr : carrotSpr, 5, 6); break;
      case 'f': { const k = conn('f').join(); add(fenceCache[k] || (fenceCache[k] = makeFence(conn('f'), false)), 20, 30); break; }
      case 'R': { const k = 'i' + conn('R').join(); add(fenceCache[k] || (fenceCache[k] = makeFence(conn('R'), true)), 20, 30); break; }
      case 'G': { const k = 'g' + [true, true, false, false].join(); add(fenceCache[k] || (fenceCache[k] = makeFence([true, true, false, false], true)), 20, 30, { gate: true }); break; }
      case 'W': add(wellSpr, 16, 32, { tall: true }); break;
      case 'B': add(benchSpr, 14, 12); break;
      case 'L': add(lanternSpr, 4, 29, { light: [sx, sy - 26, 56, '255,190,110', 0.22] }); break;
      case 'q': add(GRAVES[hash(x, y) % 2], 7, 20); break;
      case 'Y': add(crossSpr, 7, 24); break;
      case 'r': add(rockSpr, 9, 10); break;
      case 'm': add(mushSpr, 7, 8); break;
      case 'l': add(logSpr, 20, 16); break;
      case 'p': add(A.floor === 'wood' ? woodPillarSpr : isoPillarSpr, A.floor === 'wood' ? 10 : 12, A.floor === 'wood' ? 78 : 77, { tall: true }); break;
      case 'w': { const cn = [tileAt(x + 1, y) === 'w', tileAt(x - 1, y) === 'w'], k = cn.join(); add(pewCache[k] || (pewCache[k] = makePew(cn)), 20, 24); break; }
      case 'k': statics.push({ ...o, draw: () => drawCandleStand(Math.round(isoX(o.x, o.y) - camX), Math.round(isoY(o.x, o.y) - camY)), light: [sx, sy - 24, 70, '255,150,60', 0.14] }); break;
      case 'S': add(statueSpr, 9, 40, { tall: true }); break;
      case 'A': add(altarSpr, 22, 26); break;
      case 'E': add(lecternSpr, 6, 17); break;
      case 'Z': statics.push({ ...o, draw: () => drawWinch(Math.round(isoX(o.x, o.y) - camX), Math.round(isoY(o.x, o.y) - camY), flags[A.winchFlag]) }); break;
      case 'U': add(bellSpr, 23, 52, { tall: true }); break;
      case 'F': add(HEARTH.img, HEARTH.ax, HEARTH.ay, { tall: true, fire: [sx - 4, sy - 2], light: [sx - 4, sy - 8, 120, '255,140,60', 0.32] }); break;
      case 'N': add(TABLE.img, TABLE.ax, TABLE.ay, { light: [sx + 4, sy - 22, 40, '255,190,110', 0.14] }); break;
      case 'J': add(BED.img, BED.ax, BED.ay); break;
      case 'K': add(SHELF.img, SHELF.ax, SHELF.ay, { tall: true }); break;
      case 'O': if (A.outdoor) add(funnelSpr, 11, 66, { tall: true, chimney: [sx, sy - 62] });
                else add(boilerSpr, 18, 62, { tall: true, fire: [sx, sy - 10], light: [sx, sy - 14, 90, '255,130,50', 0.3] }); break;
      case 'x': add(crateSpr.img, crateSpr.ax, crateSpr.ay); break;
      case 'u': add(barrelSpr, 7, 17); break;
      case 'n': add(bollardSpr, 5, 12); break;
      case 'Q': add(wheelSpr, 12, 33); break;
      case 'M': add(mastSpr, 20, 108, { tall: true, light: [sx + 4, sy - 43, 60, '255,190,110', 0.22] }); break;
      case 'I': add(pipesSpr, 10, 90, { tall: true }); break;
      case 'v': statics.push({ ...o, draw: () => drawValve(Math.round(isoX(o.x, o.y) - camX), Math.round(isoY(o.x, o.y) - camY), flags['valve_' + x + '_' + y]) }); break;
      case '+': { const k = 's' + conn('+').join(); add(fenceCache[k] || (fenceCache[k] = makeShipRail(conn('+'))), 20, 30); break; }
      case 'j': add(shipLampSpr, 5, 36, { tall: true, light: [sx, sy - 33, 64, '255,205,130', 0.26] }); break;
      case 'z': add(deckBenchSpr, 15, 14); break;
      case 'y': add(capstanSpr, 8, 19); break;
      case 'a': add(windlassSpr.img, windlassSpr.ax, windlassSpr.ay); break;
      case '&': add(cowlSpr, 8, 29); break;
      case '!': statics.push({ ...o, draw: () => drawFlagstaff(Math.round(isoX(o.x, o.y) - camX), Math.round(isoY(o.x, o.y) - camY)) }); break;
      default: if (PROPS[ch]) PROPS[ch](o, add, sx, sy, x, y, ch); break;
      case 'V': if (tileAt(x, y - 1) !== 'V') statics.push({ x: x + 0.5, y: y + 1, key: x + y + 2, img: lifeboatSpr, dx: isoX(x + 0.5, y + 1) - 32, dy: isoY(x + 0.5, y + 1) - 30, tall: true }); break;
    }
  }
  const blds = [['house', buildHouse], ['church', buildChurch], ['ship', buildShip], ['deckhouse', buildDeckhouse]].filter(([k]) => A[k]).map(([k, f]) => [k, f, A[k]]);
  for (const Bd of A.buildings || []) blds.push([Bd.type, BUILDERS[Bd.type], Bd]);
  for (const [key, build, Hs] of blds) {
    const B = Hs.cache || (Hs.cache = build(Hs));
    const bx = isoX(Hs.x0, Hs.y0), by = isoY(Hs.x0, Hs.y0);
    const lights = B.windows.map(([wx, wy, z, r = 34, a = 0.2]) => [isoX(Hs.x0 + wx, Hs.y0 + wy), isoY(Hs.x0 + wx, Hs.y0 + wy) - z, r, '255,190,100', a]);
    statics.push({ bld: true, img: B.img, dx: bx + B.ox, dy: by + B.oy, x0: Hs.x0, y0: Hs.y0, x1: Hs.x0 + Hs.w + (key === 'church' ? 2 : 0), y1: Hs.y0 + Hs.d, lights,
                   chimneys: B.chimneys ? B.chimneys.map(([cx, cy, cz]) => [isoX(Hs.x0 + cx, Hs.y0 + cy), isoY(Hs.x0 + cx, Hs.y0 + cy) - cz]) : null,
                   chimney: B.chimney ? [isoX(Hs.x0 + B.chimney[0], Hs.y0 + B.chimney[1]), isoY(Hs.x0 + B.chimney[0], Hs.y0 + B.chimney[1]) - B.chimney[2]] : null });
  }
  if (A.bow) statics.push({ x: A.MW / 2, y: A.MH + A.bow - 0.5, key: A.MW / 2 + A.MH + A.bow, draw: () => drawFlagstaff(Math.round(isoX(A.MW / 2, A.MH + A.bow - 0.5) - camX), Math.round(isoY(A.MW / 2, A.MH + A.bow - 0.5) - camY)) });
  if (A.prow) statics.push({ x: A.MW / 2, y: -A.prow + 0.4, key: A.MW / 2 - A.prow, draw: () => drawFlagstaff(Math.round(isoX(A.MW / 2, -A.prow + 0.45) - camX), Math.round(isoY(A.MW / 2, -A.prow + 0.45) - camY)) });
  for (const st of A.stairs || []) {              // stairs up or down to the next deck
    const S = buildStairs(st);
    statics.push({ x: (st.a + st.b) / 2, y: Math.min(st.y0, st.y1), key: st.a + Math.min(st.y0, st.y1), img: S.img, dx: OX + S.minX, dy: OY + S.minY });
  }
  // footprints to follow
  footDots = [];
  if (A.footprints) {
    const pts = A.footprints; let side = 1;
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i], [bx2, by2] = pts[i + 1], len = Math.hypot(bx2 - ax, by2 - ay), [ux, uy] = norm(bx2 - ax, by2 - ay);
      for (let s2 = 0; s2 < len; s2 += 0.34) { side = -side; footDots.push({ x: ax + ux * s2 - uy * 0.08 * side, y: ay + uy * s2 + ux * 0.08 * side }); }
    }
  }
}

// ---------------------------------------------------------------- scripting helpers
const wait = f => new Promise(r => waiters.push({ f, r }));
const waitUntil = async f => { while (!f()) await wait(1); };
function tickWaiters() {
  const done = []; for (const w of waiters) if (--w.f <= 0) done.push(w);
  if (done.length) { waiters = waiters.filter(w => w.f > 0); done.forEach(w => w.r()); }
}
async function tween(o, x, y, frames) {
  const x0 = o.x, y0 = o.y;
  for (let i = 1; i <= frames; i++) {
    const k = i / frames, e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
    o.x = x0 + (x - x0) * e; o.y = y0 + (y - y0) * e;
    if (o === b) { b.moving = true; b.anim += 1; const sx = (x - x0) - (y - y0); if (sx) b.face = sx > 0 ? 1 : -1; b.back = (x - x0) + (y - y0) < 0; }
    await wait(1);
  }
  if (o === b) b.moving = false;
}
const prose = h => `<div class="prose">${h}</div><div class="press">Press Enter</div>`;
function toast(html, f = 300) { UI.toast.innerHTML = html; UI.toast.style.opacity = 1; toastT = f; }
function showLoc(name, sub) { UI.loc.innerHTML = `<small>${sub || 'Saint Orrin'}</small>${name}`; UI.loc.style.opacity = 1; locT = 220; }
function addText(x, y, txt, col = '#e6ded0') {
  const el = document.createElement('div'); el.className = 'ft'; el.textContent = txt; el.style.color = col;
  UI.ui.appendChild(el); fts.push({ x, y, el, life: 70 });
}
function clearTexts() { for (const f of fts) f.el.remove(); fts = []; }
const SPEAKERS = {
  ASH: { name: 'Ash', col: '#e8d090' },
  MAREN: { name: 'Maren', col: '#f4e2b8' },
  VOICE: { name: 'The Bellwarden', col: '#d86a5a', cls: 'voice' },
  MEMORY: { name: 'Memory', col: '#8ec8d0', cls: 'mem' },
  NOTE: { name: "Maren's Note", col: '#c8b898', cls: 'note' },
  JOURNAL: { name: "Maren's Journal", col: '#c8b898', cls: 'note' },
  CIRCLE: { name: 'The Circle', col: '#e8c878', cls: 'voice' },
  PIP: { name: 'Pip', col: '#c8a878' },
  LETTER: { name: "Lyra's Letter", col: '#c8b898', cls: 'note' },
  ODILE: { name: 'Odile', col: '#e8a080' },
  PELLOW: { name: 'Mr. Pellow', col: '#c8c080' },
  MATE: { name: 'First Mate Brannock', col: '#a8b8d0' },
  CAPTAIN: { name: 'The Drowned Captain', col: '#7ad8c0', cls: 'voice' },
  HALE: { name: 'Captain Hale', col: '#d8e4f0' },
  TAMSIN: { name: 'Tamsin', col: '#f0cc70' },
  KIT: { name: 'Kit', col: '#b8a890' },
};
function say(lines) {
  return new Promise(res => { dlg = { lines, i: 0, n: 0, res, blip: -1, prev: state }; state = 'talk'; UI.dialog.classList.add('on'); showLine(); });
}
function showLine() {
  const [who, text] = dlg.lines[dlg.i], sp = SPEAKERS[who];
  UI.who.textContent = sp.name; UI.who.style.color = sp.col; UI.line.className = sp.cls || '';
  dlg.text = text; dlg.n = 0; UI.line.textContent = '';
}
function updateTalk() {
  if (dlg.n < dlg.text.length) {
    dlg.n = Math.min(dlg.text.length, dlg.n + 0.75); UI.line.textContent = dlg.text.slice(0, dlg.n | 0);
    const k = (dlg.n | 0) >> 2; if (k !== dlg.blip) { dlg.blip = k; sfx('blip'); }
  }
  if (tap('atk') || tap('dash') || tap('start')) {
    if (dlg.n < dlg.text.length) { dlg.n = dlg.text.length; UI.line.textContent = dlg.text; }
    else if (++dlg.i >= dlg.lines.length) { const d = dlg; dlg = null; UI.dialog.classList.remove('on'); state = d.prev === 'cut' ? 'cut' : 'play'; d.res(); }
    else showLine();
  }
}
async function card(html, cls = '') {
  if (UI.card.classList.contains('on')) { UI.cardIn.style.opacity = 0; await wait(20); }
  UI.cardIn.innerHTML = html; UI.cardIn.style.opacity = 1; UI.card.className = 'on' + (cls ? ' ' + cls : ''); state = 'card';
  await new Promise(res => { cardWaiter = { res, minT: 45 }; });
}
function hideCard() { UI.card.className = ''; }

// ---------------------------------------------------------------- areas
function newBody(x, y) {
  return { x, y, r: 0.22, vx: 0, vy: 0, ax: 0, ay: -1, asx: 0, asy: -1, face: 1, back: false, hp: 6, max: 6, iT: 0, atk: 0, stun: 0,
           kbT: 0, dashT: 0, dashCD: 0, anim: 0, moving: false, ward: false, hidden: false, hits: new Set() };
}
function newSpirit(x, y) {
  return { x, y, r: 0.22, vx: 0, vy: 0, ax: b.ax, ay: b.ay, asx: b.asx, asy: b.asy, face: b.face, back: false, atk: 0, iT: 30, age: 0,
           recall: false, forced: false, kbT: 0, dashT: 0, dashCD: 0, hits: new Set() };
}
function loadArea(id, spawn, opts = {}) {
  waiters = []; enc = null; dlg = null; cardWaiter = null; marenSpirit = null; UI.dialog.classList.remove('on');
  A = AREAS[id](); A.id = id;
  A.map = A.map.map(r => r.padEnd(A.MW, A.outdoor ? '.' : 'o').slice(0, A.MW));
  A.exits = A.exits || []; A.interact = A.interact || []; A.triggers = A.triggers || [];
  ground = paintGround(); buildStatics();
  enemies = []; bolts = []; rings = []; parts = []; pickups = []; clearTexts();
  b = newBody(spawn.x, spawn.y); s = null; mode = 'body'; energy = 100; spiritK = 0;
  if (opts.veil) { mode = 'spirit'; spiritK = 1; b.ward = true; s = newSpirit(spawn.x - 0.8, spawn.y - 0.8); }
  if (opts.demo) b.hidden = true;
  goat = A.goat ? { x: A.goat.x, y: A.goat.y, tx: A.goat.x, ty: A.goat.y, pause: 60, face: 1 } : null;
  fireflies = A.fireflies ? Array.from({ length: A.fireflies }, () => ({ x: Math.random() * A.MW, y: Math.random() * A.MH, z: 4 + Math.random() * 16, p: Math.random() * 6.28 })) : [];
  const m = 40;
  CAM = A.outdoor
    ? { x0: isoX(0, A.MH + (A.bow || 0)) - 60, x1: isoX(A.MW, 0) + 60 - W, y0: isoY(0, 0) - 80, y1: isoY(A.MW, A.MH + (A.bow || 0)) + 40 - H }
    : { x0: isoX(0, A.MH) - m, x1: isoX(A.MW, 0) + m - W, y0: isoY(0, 0) - WALL_H - 10, y1: isoY(A.MW, A.MH) + 20 - H };
  if (CAM.x1 < CAM.x0) CAM.x0 = CAM.x1 = (CAM.x0 + CAM.x1) / 2;
  if (CAM.y1 < CAM.y0) CAM.y0 = CAM.y1 = (CAM.y0 + CAM.y1) / 2;
  const f = s || b;
  cam.x = clamp(isoX(f.x, f.y) - W / 2, CAM.x0, CAM.x1); cam.y = clamp(isoY(f.x, f.y) - H / 2, CAM.y0, CAM.y1);
  if (opts.demo) { setMusic(A.music || 'ambient'); return; }
  checkpoint = { id, spawn, opts, flags: JSON.parse(JSON.stringify(flags)) };
  showLoc(A.name, A.sub); setMusic(A.music || 'ambient');
  state = 'play'; fadeTarget = 0;
  if (A.onEnter) A.onEnter();
}
const saveCheckpoint = () => { if (checkpoint) checkpoint.flags = JSON.parse(JSON.stringify(flags)); };
async function transition(to, spawn, opts = {}) {
  if (state === 'fade') return;
  state = 'fade'; fadeTarget = 1;
  await wait(26);
  loadArea(to, spawn, opts);
}

// ---------------------------------------------------------------- particles
function burst(x, y, n, cols, spd = 2, glow = false, grav = 0.03) {        // x, y in SCREEN-MAP pixels
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, v = Math.random() * spd;
    parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.7 - 0.4, life: 20 + Math.random() * 28, col: cols[i % cols.length], grav, sz: Math.random() < 0.3 ? 2 : 1, glow });
  }
}
const burstW = (o, zoff, n, cols, spd, glow, grav) => burst(isoX(o.x, o.y), isoY(o.x, o.y) - zoff, n, cols, spd, glow, grav);
const dustW = o => parts.push({ x: isoX(o.x, o.y) + (Math.random() - 0.5) * 8, y: isoY(o.x, o.y), vx: (Math.random() - 0.5) * 0.4, vy: -0.25, life: 20, col: '#5a5048', grav: 0, sz: 1 });

// ---------------------------------------------------------------- split / merge
function split() {
  mode = 'spirit'; energy -= 10;
  b.ward = !!(A.circle && Math.hypot(b.x - A.circle.x, b.y - A.circle.y) < A.circle.r - 0.3);
  s = newSpirit(b.x, b.y);
  b.atk = 0; b.vx = b.vy = 0; b.moving = false;
  burstW(b, 10, 22, ['#9ff', '#fff', '#5ff'], 2.5, true, 0);
  if (b.ward) { addText(b.x, b.y, 'WARDED', '#e8d090'); burstW(A.circle, 0, 26, ['#e8d090', '#a83030'], 3, true, 0); }
  sfx('split');
}
function merge() {
  mode = 'body'; b.ward = false;
  if (s.forced) { b.stun = 90; addText(b.x, b.y, 'DAZED', '#e8d090'); }
  b.iT = Math.max(b.iT, 40);
  burstW(b, 10, 16, ['#9ff', '#fff'], 2, true, 0);
  s = null; sfx('merge');
}

// ---------------------------------------------------------------- damage
function hurtBody(n, src) {
  if (b.iT > 0 || state !== 'play') return;
  if (mode === 'spirit' && b.ward) {
    b.ward = false; b.iT = 50; sfx('ward'); addText(b.x, b.y, 'WARD BROKEN', '#e8d090');
    burstW(b, 4, 22, ['#e8d090', '#fff'], 3, true, 0); return;
  }
  b.hp -= n; b.iT = 60; shake = 8; redFlash = 8; sfx('hurt');
  burstW(b, 8, 10, ['#a01818', '#600c0c', '#fff'], 2);
  if (mode === 'body') { const [ux, uy] = norm(b.x - src.x, b.y - src.y); b.vx = ux * 0.12; b.vy = uy * 0.12; b.kbT = 12; }
  else addText(b.x, b.y, 'YOUR BODY', '#e05050');
  if (b.hp <= 0) die();
}
function bindSoul() {                               // the Anchor's chains wrap the soul tight for a few seconds
  if (!s || s.bound > 0) return;
  s.bound = 150; s.vx = s.vy = 0; s.dashT = 0; energy -= 6; shake = 5; sfx('chain');
  addText(s.x, s.y, 'BOUND — MASH X!', '#c0ccca');
}
function hurtSpirit(n, src) {
  if (!s || s.iT > 0 || s.recall || s.dashT > 0) return;
  energy -= n; s.iT = 40; shake = 4; sfx('shurt');
  const [ux, uy] = norm(s.x - src.x, s.y - src.y); s.vx = ux * 0.14; s.vy = uy * 0.14; s.kbT = 10;
  burstW(s, 14, 8, ['#5ff', '#fff'], 2, true, 0);
}
async function die() {
  b.hp = 0; state = 'dying'; shake = 14; sfx('hurt');
  burstW(b, 6, 50, ['#a01818', '#600c0c', '#fff', '#9ff'], 3);
  if (s) { burstW(s, 14, 30, ['#9ff', '#fff'], 2.5, true, -0.02); s = null; }
  b.hidden = true; mode = 'body';
  await wait(80);
  await card('<div class="chapter">Your body has fallen</div><div class="prose" style="margin-top:10px">A soul without a door cannot stay.</div><div class="press">Press Enter to rise</div>');
  hideCard();
  flags = JSON.parse(JSON.stringify(checkpoint.flags));
  loadArea(checkpoint.id, checkpoint.spawn, checkpoint.opts);
}
function damage(e, dmg, ux, uy, kb = 1) {
  e.hp -= dmg; e.flash = 6;
  if (!e.boss) {
    e.cd = 14; e.wind = 0; e.lunge = 0;
    const k = (e.type === 'shade' || e.soul ? 0.07 : 0.11) * kb; e.vx = ux * k; e.vy = uy * k;
  } else if (mode === 'spirit') energy = Math.min(100, energy + 1.5);
  burstW(e, 10, 6, ['#fff', '#ffd890'], 1.6);
  sfx('hit'); hitstop = 3; shake = Math.max(shake, 2);
  if (e.boss) {
    if (!e.p2 && e.hp <= e.max / 2) { e.p2 = true; if (A.onBossHalf) A.onBossHalf(); }
    if (e.hp <= 0) { e.dead = true; if (A.onBossDefeated) A.onBossDefeated(e); }
    return;
  }
  if (e.hp <= 0) kill(e);
}
function kill(e) {
  e.dead = true;
  if (e.killCols) burstW(e, 16, 22, e.killCols, 2.2, true, -0.02);
  else if (e.type === 'shade') burstW(e, 16, 20, ['#a8a4b8', '#dcd8e4', '#26222f'], 2.2, true, -0.02);
  else burstW(e, 8, 18, ['#7a1818', '#4a0c0c', e.type === 'cantor' ? '#5e1414' : '#6e6a5e'], 2.5);
  if (mode === 'spirit') energy = Math.min(100, energy + 4);
  sfx('kill');
  const r = Math.random();
  if (r < 0.12) pickups.push({ type: 'ember', x: e.x, y: e.y, t: 0 });
  else if (r < 0.52) pickups.push({ type: 'orb', x: e.x, y: e.y, t: 0 });
}

// ---------------------------------------------------------------- enemies + encounters
function spawn(type, x, y, o = {}) {
  const e = { type, id: nextId++, x, y, vx: 0, vy: 0, flash: 0, cd: 0, anim: Math.random() * 100 | 0, face: 1, rise: 45, wind: 0, lunge: 0, stuck: 0, sideT: 0, side: 1 };
  if (type === 'hollow') Object.assign(e, { r: 0.28, hp: 3, spd: 0.022, dmg: 1, windT: 28 });
  else if (type === 'shade') Object.assign(e, { r: 0.32, hp: 3, spd: 0.026, dmg: 1, rise: 40, windT: 32 });
  else if (type === 'cantor') Object.assign(e, { r: 0.25, hp: 3, spd: 0.018, dmg: 1, fire: 170 + Math.random() * 60, strafe: Math.random() < 0.5 ? 1 : -1 });
  else if (type === 'warden') Object.assign(e, { r: 0.75, hp: 36, max: 36, phase: 'walk', pt: 100, cycle: -1, glow: 0, p2: false, rise: 70, boss: true, name: 'The Bellwarden' });
  else if (type === 'captain') Object.assign(e, { r: 0.85, hp: 30, max: 30, phase: 'walk', pt: 100, cycle: -1, glow: 0, p2: false, rise: 70, boss: true, name: 'The Drowned Anchor', spin: 0, alt: false,
                                                 ringCol: '120,230,210', summon: ['shade', { skin: 'sailor', sdmg: 8, windT: 40 }] });
  if (ENEMY_TYPES[type]) Object.assign(e, ENEMY_TYPES[type].init());
  Object.assign(e, o);
  enemies.push(e); sfx('rise');
  return e;
}
function startEncounter(cfg) { enc = { ...cfg, i: (cfg.id && flags['wave_' + cfg.id]) || 0, busy: false }; setMusic('combat'); }
function updateEncounter() {
  if (!enc || enc.busy || enemies.length) return;
  const E = enc;
  if (E.i < E.waves.length) {
    E.busy = true;
    (async () => {
      if (E.i > 0 || E.resumed) { b.hp = Math.min(b.max, b.hp + 1); if (E.id) { flags['wave_' + E.id] = E.i; saveCheckpoint(); } }
      E.resumed = true;
      await wait(E.i === 0 ? 20 : 70);
      if (E.pre && E.pre[E.i]) await E.pre[E.i]();
      for (const [type, x, y, o] of E.waves[E.i]) spawn(type, x, y, o);
      E.i++; E.busy = false;
    })();
  } else { enc = null; setMusic(A.music || 'ambient'); if (E.onClear) E.onClear(); }
}
const boundIn = e => { e.x = clamp(e.x, 0.4, A.MW - 0.4); e.y = clamp(e.y, 0.4, A.MH - 0.4); };
function pushOutTiles(e) {                           // keep ground enemies out of solid tiles
  for (let k = 0; k < 2; k++) {
    if (!blockedBody(e.x, e.y, e.r * 0.8)) return;
    const tx = Math.floor(e.x), ty = Math.floor(e.y);
    let best = null;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
      const nx = tx + dx + 0.5, ny = ty + dy + 0.5;
      if (!blockedBody(nx, ny, e.r * 0.8)) { const d = Math.hypot(nx - e.x, ny - e.y); if (!best || d < best[2]) best = [nx, ny, d]; }
    }
    if (best) { e.x += (best[0] - e.x) * 0.3; e.y += (best[1] - e.y) * 0.3; }
  }
}
function moveEnemy(e, dx, dy) {                       // axis-separated, sliding along obstacles
  if (!blockedBody(e.x + dx, e.y, e.r * 0.8)) e.x += dx; else e.stuck++;
  if (!blockedBody(e.x, e.y + dy, e.r * 0.8)) e.y += dy; else e.stuck++;
}
function updateWarden(e) {
  if (e.flash > 0) e.flash--;
  e.anim++;
  if (e.rise > 0) { e.rise--; if (t % 3 === 0) dustW(e); return; }
  const tgt = (mode === 'spirit' && s && !s.recall) ? s : b, spd = e.p2 ? 0.026 : 0.018;
  e.pt--;
  if (e.spin !== undefined) e.spin += e.phase === 'charge' && e.pt <= 0 ? 0.32 : e.glow > 0 ? 0.03 + 0.15 * e.glow : 0.025;
  if (e.phase === 'walk') {
    const [ux, uy] = norm(tgt.x - e.x, tgt.y - e.y);
    e.x += ux * spd; e.y += uy * spd; e.face = (ux - uy) >= 0 ? 1 : -1;
    if (e.pt <= 0) { e.cycle++; const c = e.cycle % (e.p2 ? 4 : 3); e.phase = c === 2 ? 'summon' : (e.p2 && c === 3 ? 'charge' : 'toll'); e.pt = e.phase === 'charge' ? 45 : 60; }
  } else if (e.phase === 'volley') {                 // the captain hurls a fan of brine
    e.glow = 1 - e.pt / 60;
    if (e.pt <= 0) {
      sfx('cast'); shake = 3; e.glow = 0;
      const base = Math.atan2(tgt.y - e.y, tgt.x - e.x);
      for (let k = -2; k <= 2; k++) bolts.push({ x: e.x, y: e.y, vx: Math.cos(base + k * 0.32) * 0.05, vy: Math.sin(base + k * 0.32) * 0.05, life: 300, brine: true });
      e.phase = 'walk'; e.pt = 100;
    }
  } else if (e.phase === 'toll' || e.phase === 'summon') {
    e.glow = 1 - e.pt / 60;
    if (e.pt <= 0) {
      sfx(e.type === 'captain' ? 'chain' : 'bell'); shake = 6; e.glow = 0;
      if (e.phase === 'toll') { rings.push({ x: e.x, y: e.y, r: 0.3, max: e.p2 ? 5.8 : 4.8, hitS: false, hitB: false, col: e.ringCol, chain: e.type === 'captain' }); e.pt = 110 + Math.random() * 50; }
      else {
        const [st, so] = e.summon || ['hollow', {}];
        for (let k = 0; k < (e.p2 ? 3 : 2); k++) { const a = Math.random() * 6.28; spawn(st, clamp(b.x + Math.cos(a) * 2.2, 1, A.MW - 1), clamp(b.y - 1 + Math.sin(a) * 1.5, 1, A.MH - 1), { ...so }); }
        e.pt = 130;
      }
      e.phase = 'walk';
    }
  } else if (e.phase === 'charge') {
    if (e.pt > 0) { e.glow = 1 - e.pt / 45; [e.cx, e.cy] = norm(tgt.x - e.x, tgt.y - e.y); }
    else if (e.pt > -30) { e.glow = 0; e.x += e.cx * 0.14; e.y += e.cy * 0.14; if (t % 2 === 0) dustW(e); }
    else { e.phase = 'walk'; e.pt = 90; }
  }
  boundIn(e);
  if (s && !s.recall && s.dashT === 0 && wd(e, s) < e.r + s.r) hurtSpirit(12, e);
  if (b.iT === 0 && wd(e, b) < e.r + (mode === 'body' ? b.r : 0.45)) hurtBody(2, e);
}
function updateEnemies() {
  const bodyR = mode === 'body' ? b.r : 0.45;
  for (const e of enemies) {
    if (e.dead) continue;
    if (ENEMY_TYPES[e.type]) { ENEMY_TYPES[e.type].update(e); if (state !== 'play') return; continue; }
    if (e.boss) { updateWarden(e); if (state !== 'play') return; continue; }
    if (e.flash > 0) e.flash--;
    e.anim++;
    if (e.rise > 0) { e.rise--; if (e.type !== 'shade' && t % 3 === 0) dustW(e); continue; }
    if (e.type === 'cantor') {
      if (e.cd > 0) { e.cd--; moveEnemy(e, e.vx, e.vy); e.vx *= 0.85; e.vy *= 0.85; }
      else {
        const d = wd(e, b), [ux, uy] = norm(b.x - e.x, b.y - e.y);
        let mx, my;
        if (d > 5) { mx = ux; my = uy; } else if (d < 3.5) { mx = -ux; my = -uy; } else { mx = -uy * e.strafe; my = ux * e.strafe; }
        if (Math.random() < 0.006) e.strafe *= -1;
        moveEnemy(e, mx * e.spd, my * e.spd); e.face = (ux - uy) >= 0 ? 1 : -1;
        if (--e.fire === 40) sfx('cast');
        if (e.fire <= 0) { bolts.push({ x: e.x, y: e.y, vx: ux * 0.042, vy: uy * 0.042, life: 500 }); e.fire = 190 + Math.random() * 70; }
      }
      boundIn(e); continue;
    }
    // melee: approach -> wind up (shake + flash) -> lunge -> recover. Only the lunge hurts.
    const tgt = e.type === 'shade' && mode === 'spirit' && !s.recall ? s : b, tR = tgt === b ? bodyR : s.r;
    if (e.wind > 0) { if (--e.wind === 0) { const [ux, uy] = norm(e.tx - e.x, e.ty - e.y); e.lx = ux * 0.1; e.ly = uy * 0.1; e.lunge = 12; } }
    else if (e.lunge > 0) {
      if (e.type === 'shade') { e.x += e.lx; e.y += e.ly; } else moveEnemy(e, e.lx, e.ly);
      if (--e.lunge === 0) { e.cd = 34; e.vx = e.vy = 0; }
    } else if (e.cd > 0) { e.cd--; if (e.type === 'shade') { e.x += e.vx; e.y += e.vy; } else moveEnemy(e, e.vx, e.vy); e.vx *= 0.88; e.vy *= 0.88; }
    else {
      let [ux, uy] = norm(tgt.x - e.x, tgt.y - e.y);
      if (e.sideT > 0) { e.sideT--; [ux, uy] = norm(ux - uy * e.side * 1.4, uy + ux * e.side * 1.4); }
      e.stuck = 0;
      if (e.type === 'shade') { e.x += ux * e.spd; e.y += uy * e.spd; } else moveEnemy(e, ux * e.spd, uy * e.spd);
      e.face = (ux - uy) >= 0 ? 1 : -1;
      if (e.stuck > 0 && Math.random() < 0.1) { e.sideT = 40; e.side = Math.random() < 0.5 ? 1 : -1; }
      if (wd(e, tgt) < e.r + tR + 0.55) { e.wind = e.windT; e.tx = tgt.x; e.ty = tgt.y; }
    }
    if (e.type === 'hollow') pushOutTiles(e);
    boundIn(e);
    if (e.lunge > 0) {
      const stop = o => { const [ux, uy] = norm(e.x - o.x, e.y - o.y); e.lunge = 0; e.cd = 40; e.vx = ux * 0.07; e.vy = uy * 0.07; };
      if (b.iT === 0 && wd(e, b) < e.r + bodyR) { hurtBody(e.dmg, e); stop(b); if (state !== 'play') return; }
      else if (s && !s.recall && s.iT === 0 && s.dashT === 0 && wd(e, s) < e.r + s.r + 0.1) { hurtSpirit(e.sdmg || (e.type === 'shade' ? 10 : 8), e); stop(s); }
    }
  }
  for (let i = 0; i < enemies.length; i++) for (let j = i + 1; j < enemies.length; j++) {
    const a = enemies[i], c = enemies[j];
    if (a.type === 'shade' || c.type === 'shade' || a.soul || c.soul || a.rise > 0 || c.rise > 0) continue;
    const d = wd(a, c), m = a.r + c.r;
    if (d < m && d > 0) {
      const wa = a.boss ? 0 : c.boss ? 1 : 0.5, p = m - d, ux = (a.x - c.x) / d, uy = (a.y - c.y) / d;
      a.x += ux * p * wa; a.y += uy * p * wa; c.x -= ux * p * (1 - wa); c.y -= uy * p * (1 - wa);
    }
  }
}
function updateBolts() {
  for (const o of bolts) {
    o.x += o.vx; o.y += o.vy; o.life--;
    if (t % 2 === 0) parts.push({ x: isoX(o.x, o.y), y: isoY(o.x, o.y) - 8, vx: 0, vy: 0, life: 12, col: o.c1 || (o.brine ? '#3ac8a8' : '#c83020'), grav: 0, sz: 1, glow: true });
    const c = tileAt(Math.floor(o.x), Math.floor(o.y));
    if (o.life <= 0 || c === 'X' || c === 'p' || c === 'S' || c === 'A') { o.dead = true; burstW(o, 8, 6, ['#f63', '#a20'], 1.2, true); continue; }
    if (s && !s.recall && wd(s, o) < s.r + 0.2) {
      o.dead = true; burstW(o, 8, 8, ['#f63', '#fff'], 1.5, true);
      if (s.dashT === 0) { hurtSpirit(8, o); addText(s.x, s.y, 'BLOCKED', '#9ee'); }
      continue;
    }
    if (wd(b, o) < (mode === 'body' ? b.r : 0.45) + 0.12) { o.dead = true; hurtBody(1, o); if (state !== 'play') return; }
  }
  bolts = bolts.filter(o => !o.dead);
  for (const g of rings) {
    g.r += 0.085;
    if (g.r > g.max) { g.dead = true; continue; }
    if (s && !s.recall && !g.hitS && Math.abs(wd(s, g) - g.r) < 0.22) { g.hitS = true; if (s.dashT > 0) { g.dodged = true; addText(s.x, s.y, 'DODGED', '#9ee'); } else if (g.chain) bindSoul(); else hurtSpirit(g.dmg || 10, g); }
    if (!g.soulOnly && !g.hitB && Math.abs(wd(b, g) - g.r) < 0.3) { g.hitB = true; if (!(mode === 'body' && b.dashT > 0)) hurtBody(1, g); if (state !== 'play') return; }
  }
  rings = rings.filter(g => !g.dead);
}
function resolveAttacks() {
  if (mode === 'body' && b.atk >= 8 && b.atk <= 12) {
    const P = { x: b.x + b.ax * 0.45, y: b.y + b.ay * 0.45 };
    for (const e of enemies) if (!e.dead && e.rise <= 0 && !b.hits.has(e.id) && wd(P, e) < 0.4 + e.r) {
      b.hits.add(e.id);
      if (e.type === 'shade' || e.boss || e.soul) { addText(e.x, e.y, 'IMMUNE', '#a8a4b8'); sfx('whiff'); }
      else damage(e, 1, b.ax, b.ay);
    }
  }
  if (s && !s.recall && s.atk >= 4 && s.atk <= 10) {
    // with the sword: a wide, long cut for 2. Bare soul: a short open-palm shove for 1 that knocks hard.
    const sw = !!flags.sword, reach = sw ? 1.25 : 0.8, cone = sw ? 0.15 : 0.45;
    const inArc = (x, y, r) => { const dx = x - s.x, dy = y - s.y, d = Math.hypot(dx, dy); return d < r && (d < 0.35 || (dx * s.ax + dy * s.ay) / d > cone); };
    for (const e of enemies) if (!e.dead && e.rise <= 0 && !s.hits.has(e.id) && inArc(e.x, e.y, reach + e.r)) { s.hits.add(e.id); damage(e, sw ? 2 : 1, s.ax, s.ay, sw ? 1 : 1.8); }
    for (const o of bolts) if (!o.dead && inArc(o.x, o.y, reach + 0.15)) { o.dead = true; sfx('parry'); burstW(o, 8, 10, ['#fff', '#f63', '#9ff'], 2, true); }
  }
  enemies = enemies.filter(e => !e.dead);
}

// ---------------------------------------------------------------- player
function moveScreen(speed) {
  const sx = (held('right') ? 1 : 0) - (held('left') ? 1 : 0), sy = (held('down') ? 1 : 0) - (held('up') ? 1 : 0);
  if (!sx && !sy) return null;
  const [nx, ny] = norm(sx, sy), [wx, wy] = screenToWorld(nx * speed, ny * speed);
  return { wx, wy, sx, sy, nx, ny };
}
const nearInteract = who => A.interact.find(it => {
  if (it.cond && !it.cond()) return false;
  if (it.spirit && mode !== 'spirit') return false;
  if (it.body && mode !== 'body') return false;
  const p = it.o ? it.o() : it;
  return p && Math.hypot(who.x - p.x, who.y - p.y) < (it.range || 1.1);
});
function useInteract(it) {
  if (!it.spirit && mode !== 'body' && it.needsBody) { toast('Your hands pass straight through it.', 200); return; }
  it.fn();
}
function updateBody() {
  if (b.iT > 0) b.iT--;
  if (b.dashCD > 0) b.dashCD--;
  if (b.atk > 0) b.atk--;
  if (mode !== 'body') { b.moving = false; return; }
  let mvx = 0, mvy = 0;
  b.moving = false;
  if (b.stun > 0) b.stun--;
  else if (b.dashT > 0) { b.dashT--; [mvx, mvy] = screenToWorld(b.asx * 2.8, b.asy * 2.8); if (t % 2 === 0) dustW(b); }
  else if (b.kbT > 0) { b.kbT--; mvx = b.vx; mvy = b.vy; b.vx *= 0.85; b.vy *= 0.85; }
  else {
    const m = moveScreen(1.15);
    if (m) {
      mvx = m.wx; mvy = m.wy; b.moving = true; b.anim++;
      if (m.sx) b.face = m.sx; b.back = m.sy < 0; [b.ax, b.ay] = norm(m.wx, m.wy); b.asx = m.nx; b.asy = m.ny;
      if (b.anim % 16 === 0) sfx('step');
    }
    if (tap('atk')) {
      const it = nearInteract(b);
      if (it) { useInteract(it); return; }
      if (flags.awakened && b.atk === 0) { b.atk = 16; b.hits = new Set(); sfx('punch'); }
    }
    if (tap('dash') && b.dashCD === 0) { b.dashT = 10; b.dashCD = 40; b.iT = Math.max(b.iT, 10); sfx('dash'); }
    if (tap('split') && flags.awakened) {
      if (energy >= 25) { split(); return; }
      sfx('err'); addText(b.x, b.y, 'TOO WEAK TO SPLIT', '#d06060');
    }
  }
  if (!blockedBody(b.x + mvx, b.y, b.r)) b.x += mvx;
  if (!blockedBody(b.x, b.y + mvy, b.r)) b.y += mvy;
  energy = Math.min(100, energy + 0.2);
  const ex = exitAt(b.x, b.y, false);
  if (ex && outside(Math.floor(b.x), Math.floor(b.y)) >= 0 && (b.x < -0.2 || b.y < -0.2 || b.x > A.MW + 0.2 || b.y > A.MH + 0.2)) {
    if (ex.block && (!ex.blockIf || ex.blockIf())) {
      toast(`<i>"${ex.block}"</i>`, 220);
      b.x = clamp(b.x, 0.3, A.MW - 0.3); b.y = clamp(b.y, 0.3, A.MH - 0.3);
    } else transition(ex.to, ex.spawn, ex.opts || {});
  }
}
function updateSpirit() {
  s.age++;
  if (s.iT > 0) s.iT--;
  if (s.dashCD > 0) s.dashCD--;
  if (s.recall) {
    const dx = b.x - s.x, dy = b.y - s.y, d = Math.hypot(dx, dy);
    if (d < 0.15) { merge(); return; }
    s.x += dx / d * Math.min(d, 0.16); s.y += dy / d * Math.min(d, 0.16);
    if (t % 2 === 0) parts.push({ x: isoX(s.x, s.y), y: isoY(s.x, s.y) - 14, vx: 0, vy: 0, life: 16, col: '#5ff', grav: 0, sz: 1, glow: true });
    return;
  }
  energy -= A.drain ?? 0.07;
  if (energy <= 0) { energy = 0; s.recall = true; s.forced = true; addText(s.x, s.y, 'SOUL DEPLETED', '#d06060'); sfx('drain'); return; }
  let mvx = 0, mvy = 0;
  if (s.bound > 0) {                                  // chained: no moving, no striking; struggling loosens the links
    s.bound--; if (tap('atk') || tap('dash') || tap('left') || tap('right') || tap('up') || tap('down')) { s.bound -= 14; shake = Math.max(shake, 1.5); sfx('chain'); }
    if (s.bound <= 0) { s.bound = 0; s.iT = 30; burstW(s, 14, 16, ['#9aaaa8', '#c0ccca', '#5affd8'], 2.4, true, 0); addText(s.x, s.y, 'FREE', '#9ee'); }
    return;
  }
  if (s.dashT > 0) {
    s.dashT--; [mvx, mvy] = screenToWorld(s.asx * 4.4, s.asy * 4.4);
    parts.push({ x: isoX(s.x, s.y) + (Math.random() - 0.5) * 6, y: isoY(s.x, s.y) - 14 + (Math.random() - 0.5) * 12, vx: 0, vy: 0, life: 18, col: '#5ff', grav: 0, sz: 1, glow: true });
  } else if (s.kbT > 0) { s.kbT--; mvx = s.vx; mvy = s.vy; s.vx *= 0.85; s.vy *= 0.85; }
  else {
    const m = moveScreen(2.0);
    if (m) { mvx = m.wx; mvy = m.wy; if (m.sx) s.face = m.sx; s.back = m.sy < 0; [s.ax, s.ay] = norm(m.wx, m.wy); s.asx = m.nx; s.asy = m.ny; }
    if (tap('dash') && s.dashCD === 0) { s.dashT = 9; s.dashCD = 26; energy -= 4; sfx('sdash'); }
    if (tap('atk')) {
      const it = nearInteract(s);
      if (it) { useInteract(it); return; }
      if (!s.atk) { s.atk = 14; s.hits = new Set(); sfx(flags.sword ? 'slash' : 'palm'); }
    }
  }
  if (s.atk > 0) s.atk--;
  if (tap('split') && s.age > 5) { if (Math.hypot(s.x - b.x, s.y - b.y) < 0.6) merge(); else { s.recall = true; sfx('recall'); } return; }
  s.x += mvx; s.y += mvy;
  const veil = A.exits.find(ex => ex.veil && ex.veil() && (ex.edge === 'xmin' ? s.y > ex.a && s.y < ex.b : s.x > ex.a && s.x < ex.b));
  s.x = clamp(s.x, veil && veil.edge === 'xmin' ? -1 : 0.3, A.MW - 0.3);
  s.y = clamp(s.y, veil && veil.edge === 'ymin' ? -1 : 0.3, A.MH - 0.3);
  const dx = s.x - b.x, dy = s.y - b.y, d = Math.hypot(dx, dy);
  if (d > TETHER) { s.x = b.x + dx / d * TETHER; s.y = b.y + dy / d * TETHER; }
  if (veil && (s.x < -0.5 || s.y < -0.5)) transition(veil.to, veil.spawn, { veil: true });
}
function updatePickups() {
  const col = mode === 'spirit' ? (s.recall ? null : s) : b;
  for (const p of pickups) {
    p.t++;
    if (p.type === 'orb' && s && !s.recall) { const dx = s.x - p.x, dy = s.y - p.y, d = Math.hypot(dx, dy); if (d < 2 && d > 0) { p.x += dx / d * 0.07; p.y += dy / d * 0.07; } }
    if (col && Math.hypot(col.x - p.x, col.y - p.y) < 0.45) {
      p.dead = true;
      if (p.type === 'orb') { energy = Math.min(100, energy + 15); sfx('orb'); burstW(p, 10, 8, ['#9ff', '#fff'], 1.2, true, 0); }
      else { b.hp = Math.min(b.max, b.hp + 1); sfx('ember'); addText(p.x, p.y, 'MENDED', '#e8a070'); }
    }
    if (p.t > 720) p.dead = true;
  }
  pickups = pickups.filter(p => !p.dead);
}
const bleat = () => { if (AC) { tone(430, 0.3, 'sawtooth', 0.05, 360); tone(400, 0.35, 'sawtooth', 0.04, 330, AC.currentTime + 0.32); } };
function updateGoat() {
  if (!goat) return;
  if (goat.pause > 0) { goat.pause--; return; }
  const dx = goat.tx - goat.x, dy = goat.ty - goat.y, d = Math.hypot(dx, dy);
  if (d < 0.05) {
    goat.pause = 60 + Math.random() * 200; const R2 = A.goat.region;
    goat.tx = R2[0] + Math.random() * (R2[2] - R2[0]); goat.ty = R2[1] + Math.random() * (R2[3] - R2[1]);
    if (Math.random() < 0.25 && b && Math.hypot(goat.x - b.x, goat.y - b.y) < 7) bleat();
    return;
  }
  const nx = goat.x + dx / d * 0.012, ny = goat.y + dy / d * 0.012;
  if (blockedBody(nx, ny, 0.25)) { goat.tx = goat.x; goat.ty = goat.y; return; }
  goat.face = (dx - dy) >= 0 ? 1 : -1; goat.x = nx; goat.y = ny;
}
function updateParticles() {
  for (const p of parts) { p.x += p.vx; p.y += p.vy; p.vy += p.grav || 0; if (p.col !== 'smoke') { p.vx *= 0.95; p.vy *= 0.97; } p.life--; }
  parts = parts.filter(p => p.life > 0);
  if (shake > 0) { shake *= 0.86; if (shake < 0.4) shake = 0; }
  if (redFlash > 0) redFlash--;
}
function updatePlay() {
  if (tap('pause')) {
    state = 'pause'; UI.cardIn.innerHTML = '<div class="chapter">Paused</div><div class="press">P to resume</div>'; UI.cardIn.style.opacity = 1; UI.card.className = 'on clear'; return;
  }
  if (hitstop > 0) { hitstop--; return; }
  updateBody(); if (state !== 'play') return;
  if (mode === 'spirit') { updateSpirit(); if (state !== 'play') return; }
  updateEnemies(); if (state !== 'play') return;
  updateBolts(); if (state !== 'play') return;
  resolveAttacks(); updatePickups(); updateGoat();
  for (const tr of A.triggers) if (!tr.fired && (!tr.cond || tr.cond()) && mode === 'body' && b.x > tr.x0 && b.x < tr.x1 && b.y > tr.y0 && b.y < tr.y1) { tr.fired = true; tr.fn(); }
  updateEncounter();
}
let cricketT = 120;
function update() {
  if (tap('mute')) { muted = !muted; if (master) master.gain.value = muted ? 0 : 0.5; }
  t++;
  if (state !== 'pause') tickWaiters();
  if (A && A.tick && state !== 'pause' && state !== 'title') A.tick();
  fade += clamp(fadeTarget - fade, -0.045, 0.045);
  spiritK += ((mode === 'spirit' ? 1 : 0) - spiritK) * 0.06;
  if (whiteFlash > 0) whiteFlash = Math.max(0, whiteFlash - 0.02);
  if (circleFlare > 0) circleFlare = Math.max(0, circleFlare - 0.006);
  switch (state) {
    case 'title': {
      updateGoat();
      const n = CHAPTERS.length, prev = titleSel;
      if (tap('up')) titleSel = (titleSel + n - 1) % n;
      if (tap('down')) titleSel = (titleSel + 1) % n;
      ['ch1', 'ch2', 'ch3', 'ch4'].forEach((k, i) => { if (tap(k) && i < n) titleSel = i; });
      if (titleSel !== prev) { sfx('blip'); renderTitle(); }
      if (tap('start')) { hideCard(); CHAPTERS[titleSel][2](); }
      break;
    }
    case 'card': if (cardWaiter) { if (cardWaiter.minT > 0) cardWaiter.minT--; else if (tap('start') || tap('atk') || tap('dash')) { const w = cardWaiter; cardWaiter = null; w.res(); } } break;
    case 'talk': updateTalk(); break;
    case 'pause': if (tap('pause') || tap('start')) { state = 'play'; hideCard(); } break;
    case 'play': updatePlay(); break;
  }
  if (state !== 'play') updateParticles(); else updateParticles();
  if (A && A.outdoor && --cricketT <= 0 && AC && mode === 'body') { cricketT = 90 + Math.random() * 160; for (let i = 0; i < 3; i++) tone(4300, 0.03, 'square', 0.006, 0, AC.currentTime + i * 0.07); }
  for (const o of statics) if (o.fire && t % 3 === 0) parts.push({ x: o.fire[0] + (Math.random() - 0.5) * 8, y: o.fire[1], vx: (Math.random() - 0.5) * 0.2, vy: -0.4 - Math.random() * 0.4, life: 14 + Math.random() * 10, col: Math.random() < 0.5 ? '#ffb040' : '#ff6a20', grav: 0, sz: 1, glow: true });
  for (const o of statics) for (const ch of o.chimneys || (o.chimney ? [o.chimney] : [])) if (t % (o.chimneys || A.deck ? 4 : 9) === 0) parts.push({ x: ch[0] + (Math.random() - 0.5) * 5, y: ch[1], vx: 0.12 + Math.random() * 0.06, vy: -0.3, life: 120, col: 'smoke' });
  if (marenSpirit) marenSpirit.a = Math.min(1, marenSpirit.a + 0.01);
  if (A && b) {
    const f = s ? { x: s.x * 0.6 + b.x * 0.4, y: s.y * 0.6 + b.y * 0.4 } : (A.camFocus && b.hidden ? A.camFocus : b);
    cam.x += (clamp(isoX(f.x, f.y) - W / 2, CAM.x0, CAM.x1) - cam.x) * 0.1;
    cam.y += (clamp(isoY(f.x, f.y) - H / 2 - 10, CAM.y0, CAM.y1) - cam.y) * 0.1;
  }
  if (toastT > 0 && --toastT === 0) UI.toast.style.opacity = 0;
  if (locT > 0 && --locT === 0) UI.loc.style.opacity = 0;
  for (const ft of fts) ft.life--;
  fts = fts.filter(ft => { if (ft.life <= 0) { ft.el.remove(); return false; } return true; });
}

// ---------------------------------------------------------------- drawing
const MOODS = {
  dusk:     { top: 'rgba(255,190,150,0.55)', bot: 'rgba(200,170,210,0.45)', dark: 0.3, col: '14,10,36' },
  night:    { top: 'rgba(120,145,215,0.75)', bot: 'rgba(95,105,170,0.75)', dark: 0.48, col: '6,8,22', moon: true },
  fog:      { top: 'rgba(130,150,200,0.75)', bot: 'rgba(110,115,160,0.75)', dark: 0.46, col: '8,10,24', moon: true, fog: true },
  hearth:   { top: 'rgba(255,205,160,0.5)', bot: 'rgba(225,175,150,0.5)', dark: 0.5, col: '14,6,4' },
  morning:  { top: 'rgba(255,238,212,0.3)', bot: 'rgba(222,232,240,0.3)', dark: 0.06, col: '30,24,40' },
  interior: { top: 'rgba(235,205,190,0.4)', bot: 'rgba(205,185,205,0.4)', dark: 0.64, col: '4,3,8' },
};
const SX = o => isoX(o.x, o.y) - camX, SY = o => isoY(o.x, o.y) - camY;
const lc = canvas(W, H), lg = lc.getContext('2d');
const fogTex = (() => {
  const c = canvas(256, 160), g = c.getContext('2d'), rnd = rndOf(9);
  for (let i = 0; i < 26; i++) {
    const x0 = rnd() * 256, y0 = rnd() * 160, r = 20 + rnd() * 40;
    for (const [ox, oy] of [[0, 0], [256, 0], [-256, 0], [0, 160], [0, -160], [256, 160], [-256, -160], [256, -160], [-256, 160]]) {   // wrap so it tiles seamlessly
      const x = x0 + ox, y = y0 + oy, gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(190,200,220,0.35)'); gr.addColorStop(1, 'rgba(190,200,220,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }
  return c;
})();
function shadowAt(sx, sy, w = 6, a = 0.3) {
  ctx.fillStyle = `rgba(10,16,10,${a})`;
  ctx.fillRect(Math.round(sx - w), Math.round(sy - 1), w * 2, 2); ctx.fillRect(Math.round(sx - w + 2), Math.round(sy - 2), w * 2 - 4, 4);
}
function drawLantern(x, y) {
  x = Math.round(x); y = Math.round(y);
  ctx.fillStyle = '#4a4038'; ctx.fillRect(x + 1, y - 1, 1, 1);
  ctx.fillStyle = '#2a2420'; ctx.fillRect(x, y, 3, 5);
  ctx.fillStyle = Math.random() < 0.1 ? '#ffe8a8' : '#ffc860'; ctx.fillRect(x + 1, y + 1, 1, 3);
}
function drawBody() {
  if (b.hidden) return;
  const x = SX(b), y = SY(b), blink = b.iT > 0 && t % 6 < 3;
  if (mode === 'body') {
    shadowAt(x, y, 5);
    const frame = b.moving ? [1, 0, 2, 0][(b.anim / 7 | 0) % 4] : 0;
    const lamp = A.mood !== 'morning';                 // no lantern in daylight
    if (lamp && b.back) drawLantern(x + (b.face > 0 ? 6 : -9), y - 10);
    if (!blink) drawSpr((b.back ? SPR.back : SPR.ash)[frame], x - 6, y - 19, b.face < 0);
    if (lamp && !b.back) drawLantern(x + (b.face > 0 ? 6 : -9), y - 10);
    if (b.atk >= 6 && b.atk <= 13) {
      const ext = b.atk >= 8 && b.atk <= 12 ? 9 : 4;
      ctx.fillStyle = PAL.c; for (let i = 2; i < ext; i++) ctx.fillRect(Math.round(x + b.asx * i), Math.round(y - 9 + b.asy * i * 0.7), 2, 2);
      ctx.fillStyle = PAL.s; ctx.fillRect(Math.round(x + b.asx * ext - 1), Math.round(y - 10 + b.asy * ext * 0.7), 3, 3);
    }
    if (b.stun > 0) for (let i = 0; i < 3; i++) { const a = t * 0.12 + i * 2.1; ctx.fillStyle = '#e8d090'; ctx.fillRect(Math.round(x + Math.cos(a) * 7), Math.round(y - 23 + Math.sin(a) * 2), 1, 1); }
  } else {
    if (b.ward) {
      ctx.fillStyle = `rgba(232,208,144,${0.45 + Math.sin(t * 0.08) * 0.2})`;
      const r = 12 + Math.sin(t * 0.08);
      for (let a = 0; a < Math.PI * 2; a += 0.1) ctx.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y - 2 + Math.sin(a) * r * 0.5), 1, 1);
    }
    shadowAt(x, y, 11, 0.25);
    drawSpr(SPR.lie, x - 12, y - 6, b.face < 0, { flash: b.iT > 50 });
    if (A.mood !== 'morning') drawLantern(x + 14, y - 4);
  }
}
function drawEnemy(e, glowLayer) {
  if (ENEMY_TYPES[e.type]) { if (!glowLayer && ENEMY_TYPES[e.type].draw) ENEMY_TYPES[e.type].draw(e); return; }
  const x = SX(e), y = SY(e), fl = e.flash > 0, flip = e.face < 0;
  const jit = e.wind > 0 ? (t % 4 < 2 ? 1 : -1) : 0, tell = e.wind > 0 && e.wind < 10 && t % 3 === 0;
  if (e.type === 'shade') {
    const a = glowLayer ? 0.92 * spiritK : 0.25 * (1 - spiritK);
    if (a < 0.02) return;
    if (glowLayer && e.wind > 0) { ctx.fillStyle = e.wind < 10 ? '#ff6040' : '#c03030'; ctx.fillRect(Math.round(x), Math.round(y - 38), 1, 3); ctx.fillRect(Math.round(x), Math.round(y - 34), 1, 1); }
    const sp = e.skin ? SPR[e.skin] : SPR.shade;
    drawSpr(sp, x - 7 + jit, y - 10 - sp.h + Math.sin(e.anim * 0.07) * 1.5, flip, { flash: fl || tell, alpha: a * (1 - e.rise / 40) });
    return;
  }
  if (e.rise <= 0 || e.boss) shadowAt(x, y, e.boss ? 16 : 6);
  if (e.wind > 0) { ctx.fillStyle = e.wind < 10 ? '#ff6040' : '#c03030'; ctx.fillRect(Math.round(x), Math.round(y - 27), 1, 3); ctx.fillRect(Math.round(x), Math.round(y - 23), 1, 1); }
  if (e.type === 'hollow') drawSpr((e.skin ? SPR[e.skin] : SPR.hollow)[(e.anim / 10 | 0) % 2], x - 6 + jit, y - 18, flip, { flash: fl || tell, reveal: 1 - e.rise / 45 });
  else if (e.type === 'cantor') {
    drawSpr(SPR.cantor, x - 6, y - 18, flip, { flash: fl, reveal: 1 - e.rise / 45 });
    if (e.rise <= 0 && e.fire < 40) { const r = 1 + (40 - e.fire) / 14 | 0; ctx.fillStyle = t % 4 < 2 ? '#ff8040' : '#fff0a0'; ctx.fillRect(Math.round(x - r / 2), Math.round(y - 22 - r / 2), r, r); }
  } else if (e.boss) {
    const lift = e.rise > 0 ? e.rise / 70 : 0;
    if (e.type === 'captain') { if (glowLayer) drawAnchor(e, x, y + lift * 30, fl, 0.94 * (1 - lift)); }   // a soul: drawn on the ghost layer
    else drawSpr(wardenSpr, x - 18, y - 50, false, { flash: fl, alpha: 1 - lift, reveal: 1 - lift * 0.6 });
  }
}
function drawPickup(p) {
  if (p.t > 600 && t % 8 < 4) return;
  const x = Math.round(SX(p) - 2), y = Math.round(SY(p) - 12 + Math.sin(p.t * 0.1) * 1.5);
  ctx.fillStyle = p.type === 'orb' ? '#5ff' : '#c84a20'; ctx.fillRect(x + 1, y, 3, 5); ctx.fillRect(x, y + 1, 5, 3);
  ctx.fillStyle = p.type === 'orb' ? '#fff' : '#ffd080'; ctx.fillRect(x + 1, y + 1, 2, 2);
}
function drawSpirit() {
  const bx = SX(b), by = SY(b) - 4, x = SX(s), y = SY(s);
  const d = Math.hypot(x - bx, y - 10 - by), n = Math.max(2, d / 3 | 0);
  ctx.fillStyle = energy < 30 ? (t % 12 < 6 ? '#f66' : '#a33') : '#8ff';
  for (let i = 1; i < n; i++) {
    const k = i / n; ctx.globalAlpha = 0.35 + 0.5 * Math.sin(k * Math.PI);
    ctx.fillRect(Math.round(bx + (x - bx) * k), Math.round(by + (y - 10 - by) * k + Math.sin(k * Math.PI) * 6 + Math.sin(t * 0.12 + i * 0.7) * 0.8), 1, 1);
  }
  ctx.globalAlpha = 1;
  shadowAt(x, y, 4, 0.15);
  const sy = y - 24 + Math.sin(t * 0.08) * 1.2;
  if (flags.sword && !s.atk && !s.recall) { ctx.fillStyle = '#d8f4f8'; for (let i = 0; i < 12; i++) ctx.fillRect(Math.round(x + s.face * (5 + i * 0.45)), Math.round(sy + 11 + i * 0.9), 1, 1); }
  drawSpr(s.back ? SPR.spiritB : SPR.spirit, x - 6, sy, s.face < 0, { alpha: s.recall ? 0.5 : (s.iT > 0 && t % 6 < 3 ? 0.3 : 0.92), glow: true });
  if (s.bound > 0) drawBinding(x, sy + 20, 1, 18);
  if (s.atk > 1 && !flags.sword) {              // open-palm shove: a burst of light pushed outward
    const p = 1 - (s.atk - 1) / 13, cx = x + s.asx * (5 + p * 9), cy = y - 12 + s.asy * (5 + p * 9) * 0.6, r = 1.5 + p * 5;
    for (let a = 0; a < Math.PI * 2; a += 0.35) for (const [rr, col] of [[r, '#7dd'], [r * 0.6, '#cff'], [r * 0.25, '#fff']]) {
      ctx.globalAlpha = 1 - p * 0.8; ctx.fillStyle = col;
      ctx.fillRect(Math.round(cx + Math.cos(a) * rr), Math.round(cy + Math.sin(a) * rr * 0.7), 1, 1);
    }
    ctx.globalAlpha = 1;
  } else if (s.atk > 1) {
    const p = 1 - (s.atk - 1) / 13, base = Math.atan2(s.asy, s.asx), end = -1.5 + 3 * Math.min(1, p * 1.7);
    for (let ang = -1.5; ang <= end; ang += 0.05) for (const [r, col] of [[14, '#3aa'], [17, '#7dd'], [20, '#cff'], [22, '#fff']]) {
      ctx.globalAlpha = (1 - p * 0.75) * (1 - (end - ang) / 3); ctx.fillStyle = col;
      ctx.fillRect(Math.round(x + Math.cos(base + ang) * r), Math.round(y - 10 + Math.sin(base + ang) * r * 0.6), 1, 1);
    }
    ctx.globalAlpha = 1;
  }
}

function draw() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#07060a'; ctx.fillRect(0, 0, W, H);
  if (!A) return;
  camX = Math.round(cam.x + (shake ? (Math.random() - 0.5) * shake : 0));
  camY = Math.round(cam.y + (shake ? (Math.random() - 0.5) * shake : 0));
  ctx.drawImage(ground, -camX, -camY);
  if (A.sea) for (let i = 0; i < 70; i++) {                 // glints on the water
    const k = (t + i * 13) / 50 | 0, ph = ((t + i * 13) % 50) / 50, px = hash(i, k) % W, py = hash(k, i + 7) % H;
    const [wx, wy] = screenToWorld(px + camX - OX, py + camY - OY), c = tileExt(Math.floor(wx), Math.floor(wy));
    if ((c !== '~' && c !== 'h') || (A.bulkhead && wy < 0) || (A.prow && wy < 0 && wy > -A.prow * (1 - Math.abs(wx - A.MW / 2) / (A.MW / 2))) || (A.bow && wy > A.MH && wy < A.MH + A.bow * Math.sqrt(Math.max(0, 1 - Math.abs(wx - A.MW / 2) / (A.MW / 2))) + 0.3) || (A.shipRuns && wy < 0 && wx > -0.3 && wx < A.MW + 0.6)) continue;
    ctx.fillStyle = `rgba(210,235,255,${0.45 * Math.sin(ph * Math.PI)})`; ctx.fillRect(px, py, 2 + (i % 2), 1);
  }
  // footprints in the dirt
  for (const f of footDots) {
    const x = Math.round(SX(f)), y = Math.round(SY(f));
    ctx.fillStyle = 'rgba(30,20,12,0.65)'; ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 1);
    ctx.fillStyle = 'rgba(220,200,160,0.18)'; ctx.fillRect(x - 1, y - 1, 1, 1);
  }
  const active = s || b;
  const vis = statics.filter(o => o.draw || (o.dx - camX < W + 10 && o.dx - camX + o.img.width > -10 && o.dy - camY < H + 10 && o.dy - camY + o.img.height > -10));
  const dyn = [{ x: b.x, y: b.y, key: b.x + b.y, draw: drawBody }];
  if (goat) dyn.push({ x: goat.x, y: goat.y, key: goat.x + goat.y, draw: () => { shadowAt(SX(goat), SY(goat), 6); drawSpr(goatSpr, SX(goat) - 7, SY(goat) - 10, goat.face < 0); } });
  for (const n of (A.npcs ? A.npcs() : [])) dyn.push({ x: n.x, y: n.y, key: n.x + n.y, big: n.big, draw: () => { if (n.draw) return n.draw(); shadowAt(SX(n), SY(n), n.ox ? 11 : 5); drawSpr(n.spr, SX(n) - (n.ox || 6), SY(n) - (n.oy || 19), n.face < 0); } });
  if (A.maren && !flags.marenAwake) dyn.push({ x: A.maren.x, y: A.maren.y, key: A.maren.x + A.maren.y, draw: () => drawSpr(SPR.marenLie, SX(A.maren) - 12, SY(A.maren) - 6, true) });
  for (const e of enemies) dyn.push({ x: e.x, y: e.y, key: e.x + e.y, big: e.boss ? 30 : 0, draw: () => drawEnemy(e) });
  for (const p of pickups) dyn.push({ x: p.x, y: p.y, key: p.x + p.y, draw: () => drawPickup(p) });
  for (const o of bolts) dyn.push({ x: o.x, y: o.y, key: o.x + o.y, draw: () => {
    ctx.fillStyle = o.c1 || (o.brine ? '#2a8a7a' : '#c83020'); ctx.fillRect(Math.round(SX(o) - 2), Math.round(SY(o) - 10), 4, 4); ctx.fillStyle = o.c2 || (o.brine ? '#c8fff0' : '#ffd0a0'); ctx.fillRect(Math.round(SX(o) - 1), Math.round(SY(o) - 9), 2, 2);
  } });
  // depth order: small things by x + y; each building slots in after whatever stands behind it and overlaps it on screen
  const byKey = (a, c) => a.key - c.key;
  const blds = vis.filter(o => o.bld).sort((a, c) => (a.x1 + a.y1) - (c.x1 + c.y1));
  const all = vis.concat(dyn).filter(o => !o.bld).sort(byKey);
  const rectOf = o => o.bld || o.img ? [o.dx, o.dy, o.dx + o.img.width, o.dy + o.img.height] : [isoX(o.x, o.y) - (o.big || 14), isoY(o.x, o.y) - (o.big ? o.big * 2.4 : 50), isoX(o.x, o.y) + (o.big || 14), isoY(o.x, o.y) + 6];
  const inFrontOf = (o, B) => o.bld ? (o.x0 >= B.x1 || o.y0 >= B.y1) : (o.x >= B.x1 || o.y >= B.y1);
  for (const B of blds) {
    const bx0 = B.dx, bx1 = B.dx + B.img.width, by0 = B.dy, by1 = B.dy + B.img.height;
    let lastBehind = -1;
    const fronts = [];
    all.forEach((o, i) => {
      const r = rectOf(o); if (r[0] >= bx1 || r[2] <= bx0 || r[1] >= by1 || r[3] <= by0) return;
      if (inFrontOf(o, B)) fronts.push(i); else lastBehind = i;
    });
    const moved = fronts.filter(i => i < lastBehind).map(i => all[i]);
    const at = lastBehind + 1;
    all.splice(at, 0, B, ...moved);
    for (const m of moved) all.splice(all.indexOf(m), 1);
  }
  const ax = SX(active), ay = SY(active), akey = active.x + active.y;
  for (const o of all) {
    if (o.draw) { o.draw(); continue; }
    if (o.gate && gateOpen()) continue;
    let alpha = 1; const ox = o.dx - camX, oy = o.dy - camY;
    if (o.bld) { if (!inFrontOf(active, o) && ax > ox + 6 && ax < ox + o.img.width - 6 && ay > oy && ay < oy + o.img.height) alpha = 0.4; }
    else if (o.tall && o.key > akey && Math.abs(ax - (ox + o.img.width / 2)) < o.img.width / 2 && ay > oy && ay < oy + o.img.height) alpha = 0.45;
    ctx.globalAlpha = alpha; ctx.drawImage(o.img, Math.round(ox), Math.round(oy)); ctx.globalAlpha = 1;
  }
  for (const p of parts) {
    if (p.col === 'smoke') { ctx.fillStyle = `rgba(190,180,190,${p.life / 120 * 0.35})`; const r = 1 + (120 - p.life) / 40 | 0; ctx.fillRect(Math.round(p.x - camX), Math.round(p.y - camY), r, r); }
    else if (!p.glow) { ctx.globalAlpha = Math.min(1, p.life / 10); ctx.fillStyle = p.col; ctx.fillRect(Math.round(p.x - camX), Math.round(p.y - camY), p.sz, p.sz); ctx.globalAlpha = 1; }
  }

  // ---- mood grade, spirit world, light
  const M = MOODS[A.mood] || MOODS.dusk;
  ctx.globalCompositeOperation = 'multiply';
  const grd = ctx.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, M.top); grd.addColorStop(1, M.bot);
  ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
  if (spiritK > 0.01) {
    ctx.globalCompositeOperation = 'saturation'; ctx.fillStyle = `rgba(128,128,128,${0.85 * spiritK})`; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = `rgba(110,150,215,${0.7 * spiritK})`; ctx.fillRect(0, 0, W, H);
  }
  ctx.globalCompositeOperation = 'source-over';
  const L = [];
  for (const o of statics) { if (o.light) L.push(o.light); if (o.lights) L.push(...o.lights); }
  if (!b.hidden && A.mood !== 'morning') L.push(mode === 'body' ? [isoX(b.x, b.y) + b.face * 6, isoY(b.x, b.y) - 8, 70, '255,180,100', 0.12] : [isoX(b.x, b.y) + 14, isoY(b.x, b.y) - 3, 52, '255,180,100', 0.1]);
  if (s) L.push([isoX(s.x, s.y), isoY(s.x, s.y) - 14, 64, '90,230,255', 0.15]);
  if (A.circle) {
    const sp = mode === 'spirit', cx2 = isoX(A.circle.x, A.circle.y), cy2 = isoY(A.circle.x, A.circle.y);
    L.push([cx2, cy2, 60, sp && b.ward ? '232,190,110' : '170,30,30', sp ? 0.12 : 0.06]);
    if (circleFlare > 0) L.push([cx2, cy2, 70 + 90 * circleFlare, '240,200,120', 0.45 * circleFlare]);
  }
  if (marenSpirit) L.push([isoX(marenSpirit.x, marenSpirit.y), isoY(marenSpirit.x, marenSpirit.y) - 18, 90 * marenSpirit.a, marenSpirit.col || '255,220,160', 0.2 * marenSpirit.a]);
  for (const o of bolts) L.push([isoX(o.x, o.y), isoY(o.x, o.y) - 8, 24, o.light || (o.brine ? '60,220,190' : '255,70,40'), 0.35]);
  if (A.lights) L.push(...A.lights());
  for (const e of enemies) {
    if (e.type === 'cantor' && e.fire < 40 && e.rise <= 0) L.push([isoX(e.x, e.y), isoY(e.x, e.y) - 22, 20, '255,120,40', 0.3]);
    if (e.boss) L.push([isoX(e.x, e.y), isoY(e.x, e.y) - 30, 30 + 40 * e.glow, e.lightCol || (e.type === 'captain' ? '90,230,200' : '255,170,80'), 0.08 + 0.25 * e.glow]);
  }
  for (const p of pickups) L.push([isoX(p.x, p.y), isoY(p.x, p.y) - 12, 16, p.type === 'orb' ? '90,230,255' : '255,140,60', 0.2]);
  for (const ex of A.exits) if (ex.veil && ex.veil()) { const m2 = ex.edge === 'xmin' ? [0, (ex.a + ex.b) / 2] : [(ex.a + ex.b) / 2, 0]; L.push([isoX(m2[0], m2[1]), isoY(m2[0], m2[1]) - 30, 50, '90,230,255', 0.14]); }
  lg.globalCompositeOperation = 'source-over'; lg.clearRect(0, 0, W, H);
  lg.fillStyle = `rgba(${M.col},${M.dark + 0.22 * spiritK})`; lg.fillRect(0, 0, W, H);
  lg.globalCompositeOperation = 'destination-out';
  if (M.moon) { const g = lg.createRadialGradient(W * 0.75, -40, 0, W * 0.75, -40, 360); g.addColorStop(0, 'rgba(0,0,0,0.45)'); g.addColorStop(1, 'rgba(0,0,0,0)'); lg.fillStyle = g; lg.fillRect(0, 0, W, H); }
  for (const [x0, y0, r, , a0] of L) {
    const x = x0 - camX, y = y0 - camY; if (x < -r || x > W + r || y < -r || y > H + r) continue;
    const a = Math.min(0.95, 0.55 + a0 * 2), g = lg.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(0.5, `rgba(0,0,0,${a * 0.55})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    lg.fillStyle = g; lg.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.drawImage(lc, 0, 0);
  ctx.globalCompositeOperation = 'lighter';
  for (const [x0, y0, r, col, a] of L) {
    const x = x0 - camX, y = y0 - camY, rr = r * (M.fog ? 1.15 : 0.6); if (x < -rr || x > W + rr || y < -rr || y > H + rr) continue;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rr); g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = g; ctx.fillRect(x - rr, y - rr, rr * 2, rr * 2);
  }
  ctx.globalCompositeOperation = 'source-over';
  if (M.fog) {
    ctx.globalAlpha = 0.5;
    const fx = (t * 0.15) % 256, fy = (t * 0.05) % 160;
    for (let x = -fx - 256; x < W; x += 256) for (let y = -fy - 160; y < H; y += 160) ctx.drawImage(fogTex, Math.round(x), Math.round(y));
    ctx.globalAlpha = 1;
  }

  // ---- glowing things on top
  for (const f of fireflies) {
    f.p += 0.02; f.x += Math.sin(f.p * 1.3) * 0.004; f.y += Math.cos(f.p) * 0.004;
    if (Math.sin(f.p * 3 + f.x) <= 0.3 && spiritK < 0.5) continue;
    ctx.fillStyle = spiritK > 0.5 ? `rgba(140,240,255,${0.35 * spiritK})` : '#e8f080';
    ctx.fillRect(Math.round(SX(f)), Math.round(SY(f) - f.z - (spiritK > 0.5 ? (t * 0.1 + f.p * 20) % 30 : 0)), 1, 1);
  }
  for (const ex of A.exits) if (ex.veil) {                // shimmering veil doorway
    const open = ex.veil(), k = open ? (mode === 'spirit' ? 1 : 0.45) : 0.15;
    for (let i = 0; i < 32; i++) for (let v = 4; v < 50; v += 1) {
      const wc = ex.a + (ex.b - ex.a) * (i / 32), p0 = ex.edge === 'xmin' ? [0, wc] : [wc, 0];
      const sv = Math.sin(t * 0.06 + i * 0.45 + v * 0.18) * 0.5 + 0.5; if (sv < 0.55) continue;
      ctx.fillStyle = open ? `rgba(140,240,255,${(sv - 0.55) * k})` : `rgba(160,40,40,${(sv - 0.55) * 0.5})`;
      ctx.fillRect(Math.round(isoX(p0[0], p0[1]) - camX), Math.round(isoY(p0[0], p0[1]) - camY - v), 1, 1);
    }
  }
  for (const g of rings) {
    const a = 1 - g.r / g.max;
    if (g.chain) {
      const step = 0.11 / Math.max(g.r, 0.3);
      for (let ang = 0, i = 0; ang < Math.PI * 2; ang += step, i++) { const x = isoX(g.x + Math.cos(ang) * g.r, g.y + Math.sin(ang) * g.r) - camX, y = isoY(g.x + Math.cos(ang) * g.r, g.y + Math.sin(ang) * g.r) - camY - 6; ctx.fillStyle = `rgba(${i % 2 ? '90,110,110' : '190,210,205'},${Math.min(1, a * 1.6)})`; ctx.fillRect(Math.round(x), Math.round(y), i % 2 ? 1 : 2, i % 2 ? 2 : 1); }
      continue;
    }
    for (const [rr, al] of [[g.r, a], [g.r - 0.1, a * 0.5]]) {
      ctx.fillStyle = `rgba(${g.col || '232,190,110'},${al})`;
      for (let ang = 0; ang < Math.PI * 2; ang += 0.08 / Math.max(rr, 0.3)) ctx.fillRect(Math.round(isoX(g.x + Math.cos(ang) * rr, g.y + Math.sin(ang) * rr) - camX), Math.round(isoY(g.x + Math.cos(ang) * rr, g.y + Math.sin(ang) * rr) - camY), 1, 1);
    }
  }
  for (const e of enemies) {
    if (e.type === 'shade' || e.type === 'captain') drawEnemy(e, true);
    if (e.type === 'captain' && e.rise <= 0) { ctx.fillStyle = e.glow > 0.5 && t % 6 < 3 ? '#e0fff8' : '#5affd8'; for (const [ex, ey] of anchorEyes(e)) ctx.fillRect(Math.round(SX(e) + ex), Math.round(SY(e) + ey), 3, 2); }
    if (e.type === 'warden' && e.rise <= 0) { ctx.fillStyle = e.glow > 0.5 && t % 6 < 3 ? '#fff0c0' : '#ff7030'; ctx.fillRect(Math.round(SX(e) - 5), Math.round(SY(e) - 29), 2, 1); ctx.fillRect(Math.round(SX(e) + 3), Math.round(SY(e) - 29), 2, 1); }
  }
  if (A.glow) A.glow();
  if (s) drawSpirit();
  if (marenSpirit) { const sc = marenSpirit.scale || 1; drawSpr(marenSpirit.spr || SPR.marenSpirit, SX(marenSpirit) - 6 * sc, SY(marenSpirit) - 36 * sc + Math.sin(t * 0.05) * 2, false, { alpha: marenSpirit.a * 0.92, glow: true, scale: sc }); }
  for (const p of parts) if (p.glow) { ctx.globalAlpha = Math.min(1, p.life / 12); ctx.fillStyle = p.col; ctx.fillRect(Math.round(p.x - camX), Math.round(p.y - camY), p.sz, p.sz); }
  ctx.globalAlpha = 0.045;
  const gx = Math.random() * 128 | 0, gy = Math.random() * 128 | 0;
  for (let x = -gx; x < W; x += 128) for (let y = -gy; y < H; y += 128) ctx.drawImage(grainCanvas, x, y);
  ctx.globalAlpha = 1;
  ctx.drawImage(vignetteCanvas, 0, 0);
  if (redFlash) { ctx.fillStyle = `rgba(150,0,0,${redFlash / 40})`; ctx.fillRect(0, 0, W, H); }
  if (whiteFlash) { ctx.fillStyle = `rgba(235,250,255,${whiteFlash})`; ctx.fillRect(0, 0, W, H); }
  if (fade > 0) { ctx.fillStyle = `rgba(0,0,0,${fade})`; ctx.fillRect(0, 0, W, H); }
  updateDOM();
}
function updateDOM() {
  const inGame = ['play', 'talk', 'fade', 'dying', 'pause', 'cut'].includes(state) && !(b.hidden && state !== 'dying');
  UI.hud.classList.toggle('on', inGame);
  UI.hp.style.width = (b.hp / b.max * 100) + '%';
  UI.sp.style.width = energy + '%'; UI.sp.classList.toggle('low', energy < 25);
  UI.soulrow.style.display = flags.awakened || mode === 'spirit' ? '' : 'none';
  if (UI.ward) UI.ward.classList.toggle('on', mode === 'spirit' && b.ward);
  const boss = enemies.find(e => e.boss);
  if (boss && UI.bossName && UI.bossName.textContent !== boss.name) UI.bossName.textContent = boss.name;
  UI.boss.classList.toggle('on', !!boss && inGame);
  if (boss) UI.bossb.style.width = Math.max(0, boss.hp / boss.max * 100) + '%';
  const who = s || b, it = state === 'play' && !(s && s.recall) ? nearInteract(who) : null;
  UI.prompt.classList.toggle('on', !!it);
  if (it) { const p = it.o ? it.o() : it; UI.prompt.innerHTML = `<kbd>X</kbd> ${it.label}`; UI.prompt.style.left = SX(p) + 'px'; UI.prompt.style.top = (SY(p) - 26) + 'px'; }
  const danger = state === 'play' && mode === 'spirit' && (enemies.some(e => e.rise <= 0 && wd(e, b) < 2.2) || bolts.some(o => wd(o, b) < 3));
  UI.danger.style.opacity = danger && t % 24 < 14 ? 1 : 0;
  UI.danger.style.left = SX(b) + 'px'; UI.danger.style.top = (SY(b) - 12) + 'px';
  for (const ft of fts) { ft.el.style.left = SX(ft) + 'px'; ft.el.style.top = (SY(ft) - 28 - (70 - ft.life) * 0.3) + 'px'; ft.el.style.opacity = Math.min(1, ft.life / 20); }
}

// ---------------------------------------------------------------- title + loop
const reached = n => { try { return +(localStorage.getItem('soulsplit.chapter') || 1) >= n; } catch (e) { return false; } };
const markReached = n => { try { if (!reached(n)) localStorage.setItem('soulsplit.chapter', n); } catch (e) {} };
// chapter select: every chapter can be started directly from the title screen
const CHAPTERS = [
  ['I', 'The Silent Bell', () => startGame()],
  ['II', "Her Mother's Blade", () => startChapter2()],
  ['III', 'The Drowned Captain', () => startChapter3()],
  ['IV', 'The Cloudwater Baths', () => startChapter4()],
];
let titleSel = 0;
function renderTitle() {
  UI.cardIn.innerHTML = `<div><div class="title">Soul Split</div><div class="sub">The Wren Chronicle</div></div>
    <div><div class="chapters">${CHAPTERS.map(([n, name], i) => `<div class="${i === titleSel ? 'sel' : ''}"><span>Chapter ${n}</span>${name}</div>`).join('')}</div>
    <div class="controls"><kbd>Arrows</kbd> move <kbd>Z</kbd> dash <kbd>X</kbd> interact / strike <kbd>C</kbd> split / return
    <kbd>P</kbd> pause <kbd>M</kbd> mute</div><div class="press">&uarr; &darr; choose a chapter &nbsp;&middot;&nbsp; Enter to begin</div></div>`;
}
function showTitle() {
  flags = {};
  loadArea('garden', { x: 12.5, y: 9.5 }, { demo: true });
  state = 'title'; fadeTarget = 0;
  UI.cardIn.style.opacity = 1;
  renderTitle();
  UI.card.className = 'on titlescreen';
}
function boot() {
  showTitle();
  // dev shortcut: index.html?area=sanctum  (&spirit to start as spirit, &awake to have the power)
  const q = new URLSearchParams(location.search), area = q.get('area');
  const chq = +q.get('chapter');
  if (chq >= 1 && chq <= CHAPTERS.length) { hideCard(); CHAPTERS[chq - 1][2](); }
  else if (area && AREAS[area]) {
    hideCard(); flags = { awakened: q.has('awake') || q.has('spirit') || area === 'belfry', g1: true, sword: q.has('sword') };
    loadArea(area, AREAS[area]().devSpawn || { x: 3, y: 3 }, { veil: q.has('spirit') || area === 'belfry' });
    fade = 0;
  }
  let acc = 0, last = performance.now();
  function frame(now) {
    acc += Math.min(100, now - last); last = now;
    while (acc >= 1000 / 60) { update(); for (const k in hit) delete hit[k]; acc -= 1000 / 60; }
    draw();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
