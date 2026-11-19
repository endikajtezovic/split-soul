"use strict";
// ======================================================================
//  ISOMETRIC PROTOTYPE — Maren's cottage at dusk.
//  Reuses sprites (art.js), sound (audio.js) and the HTML UI (style.css).
//  World coords are in tiles (x, y); screen = isometric 2:1 projection.
// ======================================================================
const $ = id => document.getElementById(id);
const cv = $('c'), ctx = cv.getContext('2d');
ctx.imageSmoothingEnabled = false;
const UI = {
  wrap: $('wrap'), ui: $('ui'), hud: $('hud'), hp: $('hpb'), sp: $('spb'), loc: $('loc'), toast: $('toast'),
  dialog: $('dialog'), who: $('who'), line: $('line'), card: $('card'), cardIn: $('cardInner'), prompt: $('prompt'), danger: $('danger'),
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
  start: ['Enter'], mute: ['KeyM'],
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

const clamp = (v, a, c) => Math.max(a, Math.min(c, v));
const norm = (x, y) => { const d = Math.hypot(x, y) || 1; return [x / d, y / d]; };
const wdist = (a, c) => Math.hypot(a.x - c.x, a.y - c.y);
const hash = (a, b2) => { let h = (a * 374761393 + b2 * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return (h ^ (h >>> 16)) >>> 0; };

// ---------------------------------------------------------------- iso projection
const TW = 32, TH = 16, MW = 20, MH = 20, PAD = 8;           // PAD = scenery tiles drawn beyond the playable map
const OX = (MH + PAD) * TW / 2 + 40, OY = 110 + PAD * TH;
const MAPW = (MW + MH + 4 * PAD) * TW / 2 + 80, MAPH = (MW + MH + 2 * PAD) * TH / 2 + OY + 40;
const isoX = (x, y) => (x - y) * TW / 2 + OX;
const isoY = (x, y) => (x + y) * TH / 2 + OY;
// screen-direction input -> world vector (so "up" on the keyboard is up on screen)
const screenToWorld = (sx, sy) => [(sx / (TW / 2) + sy / (TH / 2)) / 2, (sy / (TH / 2) - sx / (TW / 2)) / 2];

// ---------------------------------------------------------------- the map
//  T tree  P pine  . grass  , flowers  = dirt path  # flagstones  s garden soil  f fence  g garden gate
//  H cottage  W well  b bush  B bench  L lantern
const MAP = [
  'TTPTTPTTTPTTPTTTPTTT',
  'TPTT,TTPTTTPTT.TTPTT',
  'PT..,...........,.TP',
  'T.ffffffff..,..b...T',
  'T.fssssssf.HHHH....T',
  'P.fssssssf.HHHH..,.P',
  'T.fssssssg.HHHH....T',
  'T.fssssssf.L#=L....T',
  'T.ffffffff..=...B..T',
  'T,.........==..,...P',
  'T..,..W...=........T',
  '==========..,....b.T',
  'T....,.............T',
  'Tb.....,....b...,..P',
  'T..........,.......T',
  'P...,..............T',
  'T.......b.....,....T',
  'T..,..........b....T',
  'T...................',
  'T.,...........,.....',
].map(r => r.padEnd(MW, '.').slice(0, MW));
const tileAt = (x, y) => (x < 0 || y < 0 || x >= MW || y >= MH) ? 'X' : MAP[y][x];
// scenery outside the playable map: deep forest behind, open meadow in front
const tileExt = (x, y) => {
  if (x >= 0 && y >= 0 && x < MW && y < MH) return MAP[y][x];
  const r = hash(x + 50, y + 50) % 100;
  if (x < 0 || y < 0) return r < 78 ? (r % 3 ? 'T' : 'P') : '.';
  return r < 6 ? 'T' : r < 12 ? 'b' : r < 26 ? ',' : '.';
};
const outside = (x, y) => Math.max(-x, -y, x - MW + 1, y - MH + 1, 0);
const SOLID = new Set(['T', 'P', 'f', 'H', 'W', 'b', 'B', 'L', 'X']);
const blocked = (x, y, r) => {
  for (const [dx, dy] of [[-r, -r], [r, -r], [-r, r], [r, r]]) if (SOLID.has(tileAt(Math.floor(x + dx), Math.floor(y + dy)))) return true;
  return false;
};
const HOUSE = { x0: 11, y0: 4, w: 4, d: 3, wh: 34, rh: 28 };

// ---------------------------------------------------------------- procedural art helpers
function polyFn(g, pts, fn) {
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++)
    for (let x = Math.floor(Math.min(...xs)); x <= Math.ceil(Math.max(...xs)); x++) {
      let inside = false; const X = x + 0.5, Y = y + 0.5;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i], [xj, yj] = pts[j];
        if ((yi > Y) !== (yj > Y) && X < (xj - xi) * (Y - yi) / (yj - yi) + xi) inside = !inside;
      }
      if (inside) { const c = fn(x, y); if (c) { g.fillStyle = c; g.fillRect(x, y, 1, 1); } }
    }
}
function line(g, x0, y0, x1, y1, col) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) | 0;
  g.fillStyle = col;
  for (let i = 0; i <= n; i++) g.fillRect(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), 1, 1);
}
// vertical wall face between two ground points, rasterised column by column: tex(u, v) -> colour
function face(g, p0, p1, h, tex, shadeA = 0) {
  const len = p1[0] - p0[0];
  for (let sx = Math.round(p0[0]); sx < Math.round(p1[0]); sx++) {
    const k = (sx - p0[0]) / len, base = Math.round(p0[1] + (p1[1] - p0[1]) * k), u = sx - Math.round(p0[0]);
    for (let v = 0; v < h; v++) {
      const c = tex(u, v); if (!c) continue;
      g.fillStyle = c; g.fillRect(sx, base - v, 1, 1);
      if (shadeA) { g.fillStyle = `rgba(20,16,40,${shadeA})`; g.fillRect(sx, base - v, 1, 1); }
    }
  }
}

// ---------------------------------------------------------------- ground
const ground = (() => {
  const c = canvas(MAPW, MAPH), g = c.getContext('2d');
  let seed = 5; const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
  const lowf = (px, py) => Math.sin(px * 0.045) + Math.cos(py * 0.07) + Math.sin((px + py) * 0.021);
  const grass = (px, py) => {
    const n = lowf(px, py) + rnd() * 0.9;
    return n > 1.3 ? '#62903e' : n > 0.4 ? '#567f36' : n > -0.6 ? '#4c7331' : '#43692c';
  };
  const kindOf = ch => ch === '=' || ch === 'g' || ch === 'H' ? 'path' : ch === '#' ? 'stone' : ch === 's' ? 'soil' : 'grass';
  g.fillStyle = '#0d0b10'; g.fillRect(0, 0, MAPW, MAPH);
  for (let y = -PAD; y < MH + PAD; y++) for (let x = -PAD; x < MW + PAD; x++) {
    const kind = kindOf(tileExt(x, y)), cx = isoX(x, y), cy = isoY(x, y);
    for (let r = 0; r < TH; r++) {
      const hw = r < TH / 2 ? (r + 1) * 2 : (TH - r) * 2;
      for (let i = -hw; i < hw; i++) {
        const px = cx + i, py = cy + r, edge = hw - Math.abs(i + 0.5);
        let col = grass(px, py);
        if (kind === 'path' && !(edge < 3 && rnd() < 0.45)) {
          const n = rnd(); col = n < 0.04 ? '#c4b292' : n < 0.4 ? '#8c6e48' : n < 0.8 ? '#9a7b52' : '#a6885c';
        } else if (kind === 'stone' && !(edge < 2 && rnd() < 0.4)) {
          col = ((px + py * 2) % 12 === 0 || (px - py * 2 + 400) % 12 === 0) ? '#56544e' : rnd() < 0.5 ? '#8e8c84' : '#9a988e';
        } else if (kind === 'soil') {
          col = ((py * 2 - px + 400) % 8 < 2) ? '#45301f' : rnd() < 0.5 ? '#5c3f29' : '#64452d';
        }
        g.fillStyle = col; g.fillRect(px, py, 1, 1);
      }
    }
    if (kind === 'grass') {
      for (let i = 0; i < 6; i++) { g.fillStyle = '#76a64c'; g.fillRect(cx - 10 + rnd() * 20 | 0, cy + 3 + rnd() * 10 | 0, 1, 2); }
      if (tileExt(x, y) === ',') for (let i = 0; i < 6; i++) {
        const fx = cx - 9 + rnd() * 18 | 0, fy = cy + 3 + rnd() * 9 | 0;
        g.fillStyle = '#3e6a2a'; g.fillRect(fx, fy + 1, 1, 1);
        g.fillStyle = ['#e85a6a', '#f0e070', '#f4f0f0', '#a070d0', '#f09040'][rnd() * 5 | 0]; g.fillRect(fx, fy, 1, 1);
      }
    }
  }
  // scenery beyond the map fades into the dusk (one pass over the finished image, per pixel)
  const img = g.getImageData(0, 0, MAPW, MAPH), px = img.data;
  for (let py = 0; py < MAPH; py++) for (let qx = 0; qx < MAPW; qx++) {
    const [wx, wy] = screenToWorld(qx - OX, py - OY);
    const o = Math.max(-wx, -wy, wx - MW, wy - MH, 0);
    if (o <= 0) continue;
    const k = 1 - Math.min(0.8, o * 0.1), i = (py * MAPW + qx) * 4;
    px[i] = px[i] * k + 8 * (1 - k); px[i + 1] = px[i + 1] * k + 10 * (1 - k); px[i + 2] = px[i + 2] * k + 16 * (1 - k);
  }
  g.putImageData(img, 0, 0);
  // soft shadows cast toward the lower right (low sun from the upper left)
  for (let y = -PAD; y < MH + PAD; y++) for (let x = -PAD; x < MW + PAD; x++) {
    const ch = tileExt(x, y), big = ch === 'T' || ch === 'P';
    if (!big && ch !== 'b' && ch !== 'W') continue;
    const sx = isoX(x + 0.5, y + 0.5) + (big ? 8 : 3), sy = isoY(x + 0.5, y + 0.5);
    g.fillStyle = 'rgba(10,20,10,0.28)';
    for (let yy = -3; yy <= 3; yy++) { const ww = (big ? 16 : 8) * Math.sqrt(1 - (yy / 4) ** 2); g.fillRect(sx - ww, sy + yy, ww * 2, 1); }
  }
  // the house's shadow
  const hx = isoX(HOUSE.x0 + HOUSE.w, HOUSE.y0 + HOUSE.d), hy = isoY(HOUSE.x0 + HOUSE.w, HOUSE.y0 + HOUSE.d);
  g.fillStyle = 'rgba(10,20,10,0.3)'; for (let i = 0; i < 18; i++) g.fillRect(hx - 6, hy - 40 + i * 2, 26 - i, 2);
  return c;
})();

// ---------------------------------------------------------------- static sprites
function spr(w, h, draw) { const c = canvas(w, h); draw(c.getContext('2d'), pxTools(c.getContext('2d'))); return c; }
function makeTree(sd) {
  let s0 = sd * 99 + 7; const rnd = () => (s0 = s0 * 16807 % 2147483647) / 2147483647;
  return spr(48, 66, (g, T) => {
    T.rect(22, 38, 4, 26, '#5a3a22'); T.rect(22, 38, 1, 26, '#7a5232'); T.rect(20, 62, 8, 2, '#4a301c');
    const blobs = []; for (let i = 0; i < 10; i++) blobs.push([24 + rnd() * 22 - 11, 24 + rnd() * 18 - 11, 8 + rnd() * 6]);
    for (const [x, y, r] of blobs) T.disc(x, y, r | 0, '#28491f');
    for (const [x, y, r] of blobs) T.disc(x - 1, y - 1, (r - 1) | 0, '#386628');
    for (const [x, y, r] of blobs) T.disc(x - 2, y - 3, (r - 4) | 0, '#4f8436');
    for (let i = 0; i < 60; i++) { const x = 6 + rnd() * 36, y = 6 + rnd() * 34; if (g.getImageData(x | 0, y | 0, 1, 1).data[3]) T.px(x, y, y < 24 && x < 28 ? '#78ad52' : '#22401b'); }
  });
}
function makePine(sd) {
  let s0 = sd * 31 + 3; const rnd = () => (s0 = s0 * 16807 % 2147483647) / 2147483647;
  return spr(36, 64, (g, T) => {
    T.rect(17, 50, 3, 12, '#4a3020');
    for (let k = 0; k < 5; k++) {
      const y = 10 + k * 9, hw = 5 + k * 3;
      T.poly([[18, y - 10], [18 - hw, y + 6], [18 + hw, y + 6]], '#1f3d27');
      T.poly([[18, y - 10], [18 - hw, y + 6], [18, y + 6]], '#2b5233');
      for (let i = 0; i < 4; i++) T.px(18 - rnd() * hw, y + rnd() * 5, '#447248');
    }
  });
}
function makeBush(sd) {
  let s0 = sd * 13 + 1; const rnd = () => (s0 = s0 * 16807 % 2147483647) / 2147483647;
  const flower = rnd() < 0.6 ? ['#e888b0', '#f4f0f0', '#f0d060'][rnd() * 3 | 0] : null;
  return spr(22, 18, (g, T) => {
    T.disc(11, 11, 6, '#2c5222'); T.disc(7, 12, 4, '#2c5222'); T.disc(15, 12, 4, '#2c5222');
    T.disc(10, 10, 5, '#3e7030'); T.disc(9, 8, 3, '#558c3c');
    if (flower) for (let i = 0; i < 7; i++) T.px(5 + rnd() * 12, 6 + rnd() * 8, flower);
  });
}
const cabbageSpr = spr(10, 8, (g, T) => { T.disc(5, 4, 3, '#4e7e34'); T.disc(5, 4, 2, '#82b85a'); T.px(5, 4, '#b8e090'); });
const carrotSpr = spr(10, 9, (g, T) => {
  for (const x of [3, 5, 7]) { T.rect(x, 1, 1, 5, '#5aa040'); T.px(x - 1, 2, '#6ab84c'); }
  T.rect(4, 6, 3, 1, '#e07a30');
});
const wellSpr = spr(32, 42, (g, T) => {
  T.rect(5, 6, 2, 22, '#5a3e28'); T.rect(25, 6, 2, 22, '#4a3220');
  T.rect(6, 9, 20, 1, '#6a4a30');
  T.rect(15, 10, 1, 7, '#8a7a5a'); T.rect(13, 16, 5, 4, '#6a5038'); T.rect(13, 16, 5, 1, '#8a6a48');
  T.poly([[1, 9], [16, 1], [31, 9], [16, 13]], '#8e3a2a');
  T.poly([[1, 9], [16, 1], [16, 13]], '#a8483a');
  for (let i = 0; i < 4; i++) line(g, 3 + i * 3, 9 - i * 1.5, 16, 13 - i * 0.5 - 2, '#6e2a1e');
  for (let y = 26; y < 40; y++) for (let x = 4; x < 28; x++) {
    const row = (y - 26) / 4 | 0, edge = (y - 26) % 4 === 3 || ((x + row * 3) % 7 === 0);
    T.px(x, y, edge ? '#4e4c48' : x < 14 ? '#9a988e' : '#7e7c74');
  }
  for (let x = -12; x <= 12; x++) for (let y = -4; y <= 4; y++) {
    const e = (x * x) / 144 + (y * y) / 16;
    if (e <= 1) T.px(16 + x, 26 + y, e > 0.55 ? '#a8a69c' : '#141c22');
  }
});
const benchSpr = spr(28, 18, (g, T) => {
  T.poly([[2, 9], [14, 3], [26, 9], [14, 15]], '#8a6038'); T.poly([[2, 9], [14, 15], [14, 17], [2, 11]], '#5a3a22');
  T.poly([[14, 15], [26, 9], [26, 11], [14, 17]], '#4a2e1a');
  T.rect(11, 3, 7, 5, '#a88050'); T.rect(11, 3, 7, 1, '#c8a070'); T.rect(13, 1, 4, 3, '#f0ead8'); T.px(14, 2, '#8a2a2a');
});
const lanternSpr = spr(8, 30, (g, T) => {
  T.rect(3, 6, 2, 24, '#2a2a30'); T.rect(1, 29, 6, 1, '#2a2a30');
  T.rect(1, 0, 6, 1, '#2a2a30'); T.rect(1, 1, 6, 6, '#3a3a40'); T.rect(2, 2, 4, 4, '#ffd27a'); T.rect(3, 2, 2, 2, '#fff2c0');
});
const goatSpr = mk([
  '...........k.k', '..........kwk.', '.kkkkkkkkkwwwk', 'kbbbbbbbbbwkwk', 'kbBBbbbbbbwwwk',
  'kbbbbbbbbbkwk.', '.kbbbbbbbbk.k.', '.kbk.kbk.kbk..', '.kbk.kbk.kbk..', '.kk..kk..kk...'],
  { k: '#2a1a10', b: '#8a5a32', B: '#a8784a', w: '#e8e0d0' });

function makeFence(x, y) {
  const isF = (a, c) => tileAt(a, c) === 'f';
  return spr(40, 34, (g, T) => {
    const cx = 20, cy = 24;
    const dirs = [[1, 0, 8, 4], [-1, 0, -8, -4], [0, 1, -8, 4], [0, -1, 8, -4]];
    for (const [dx, dy, sx, sy] of dirs) if (isF(x + dx, y + dy)) {
      for (const [hgt, col] of [[4, '#7a5232'], [9, '#a07446']]) { line(g, cx, cy - hgt, cx + sx, cy + sy - hgt, col); line(g, cx, cy - hgt + 1, cx + sx, cy + sy - hgt + 1, '#5a3a22'); }
    }
    T.rect(cx - 1, cy - 13, 3, 13, '#6a4426'); T.rect(cx - 1, cy - 13, 1, 13, '#8a6038'); T.rect(cx - 1, cy - 14, 3, 1, '#a07446');
  });
}

// ---------------------------------------------------------------- the cottage
const WINDOWS = [], CHIMNEY = {};
const house = (() => {
  const { x0, y0, w, d, wh, rh } = HOUSE, ov = 0.3;
  const P = (x, y, z = 0) => [isoX(x, y), isoY(x, y) - z];
  const minX = P(x0 - ov, y0 + d + ov)[0] - 4, maxX = P(x0 + w + ov, y0 - ov)[0] + 4;
  const minY = P(x0, y0 + d / 2, wh + rh)[1] - 36, maxY = P(x0 + w, y0 + d)[1] + 2;
  const c = canvas(Math.ceil(maxX - minX), Math.ceil(maxY - minY)), g = c.getContext('2d');
  const L = (x, y, z = 0) => { const p = P(x, y, z); return [p[0] - minX, p[1] - minY]; };

  const plaster = (u, v) => (hash(u, v) % 9 === 0) ? '#cfc2a0' : '#ddd0ae';
  const stone = (u, v) => {
    const row = v / 5 | 0;
    if (v % 5 === 4 || (u + (row % 2) * 5) % 10 === 0) return '#3e3e48';
    return ['#7a7a86', '#6c6c78', '#868692', '#727280'][hash((u + (row % 2) * 5) / 10 | 0, row) % 4];
  };
  const win = (wu, wv, ww, wh2) => {
    if (wu === 0 || wu === ww - 1 || wv === 0 || wv === wh2 - 1 || wu === (ww / 2 | 0) || wv === (wh2 / 2 | 0)) return '#3a2a1e';
    return wv > wh2 / 2 ? '#f6d080' : '#e8a850';
  };
  const box = (wu, wv) => wv === 1 ? ['#e85a6a', '#f4f0f0', '#e888b0', '#3e6a2a'][hash(wu, 3) % 4] : '#6a3a22';
  const door = (wu, wv, dw, dh) => {
    if (wv >= dh - 3 && (wu < 1 || wu > dw - 2)) return null;
    if (wu === 0 || wu === dw - 1 || wv === dh - 1) return '#2a2a22';
    if (wu === dw - 3 && wv === 9) return '#e0c070';
    return wu % 3 === 0 ? '#355e32' : '#46763e';
  };
  const wallTex = openings => (u, v) => {
    for (const o of openings) if (u >= o.u && u < o.u + o.w && v >= o.v && v < o.v + o.h) {
      const r = o.tex(u - o.u, v - o.v, o.w, o.h); if (r !== null) return r;
    }
    if (v < 15) return stone(u, v);
    if (v < 17 || v >= wh - 2 || u % 16 < 2) return '#3a2a1e';
    if ((u % 16 === 8 + ((v - 17) / 2 | 0) || u % 16 === 8 - ((v - 17) / 2 | 0)) && (u / 16 | 0) % 2 === 1) return '#4a3426';
    return plaster(u, v);
  };
  const D = L(x0, y0 + d), C = L(x0 + w, y0 + d), B = L(x0 + w, y0);
  face(g, D, C, wh, wallTex([
    { u: 19, v: 0, w: 11, h: 21, tex: door },
    { u: 38, v: 19, w: 11, h: 10, tex: win }, { u: 37, v: 17, w: 13, h: 2, tex: box },
    { u: 3, v: 19, w: 9, h: 10, tex: win }, { u: 2, v: 17, w: 11, h: 2, tex: box },
  ]));
  face(g, C, B, wh, wallTex([{ u: 18, v: 19, w: 11, h: 10, tex: win }, { u: 17, v: 17, w: 13, h: 2, tex: box }]), 0.2);
  WINDOWS.push([x0 + 43 / 16, y0 + d, 24], [x0 + 7 / 16, y0 + d, 24], [x0 + w, y0 + d - 23 / 16, 24]);
  // gable end (right)
  const gC = L(x0 + w, y0 + d, wh), gB = L(x0 + w, y0, wh), gR = L(x0 + w, y0 + d / 2, wh + rh);
  polyFn(g, [gC, gB, gR], (x, y) => (Math.abs(x - gR[0]) < 1 || (y - Math.round(gR[1])) % 9 === 0) ? '#3a2a1e' : '#c6b894');
  const Tg = pxTools(g); Tg.disc(gR[0], gR[1] + 14, 3, '#3a2a1e'); Tg.disc(gR[0], gR[1] + 14, 2, '#f6d080');
  // roof
  const R1 = L(x0 - ov, y0 + d / 2, wh + rh), R2 = L(x0 + w + ov, y0 + d / 2, wh + rh);
  const E1 = L(x0 - ov, y0 + d + ov, wh - 3), E2 = L(x0 + w + ov, y0 + d + ov, wh - 3);
  const F1 = L(x0 - ov, y0 - ov, wh - 3), F2 = L(x0 + w + ov, y0 - ov, wh - 3);
  const shingles = (lx, ly, pal) => (x, y) => {
    const dd = ly + (x - lx) * 0.5 - y, row = Math.floor(dd / 3);
    if (dd % 3 < 1) return '#283044';
    if ((x + row * 3) % 6 === 0) return '#323c54';
    return pal[hash(x / 6 | 0, row) % pal.length];
  };
  polyFn(g, [F1, F2, R2, R1], shingles(F1[0], F1[1], ['#5a6c90', '#6276a0', '#566890']));
  // chimney on the back slope
  const cx0 = x0 + 0.7, cy0 = y0 + 0.5, zb = wh + 6, zt = wh + rh + 12;
  const cd = L(cx0, cy0 + 0.5, zb), cc = L(cx0 + 0.5, cy0 + 0.5, zb), cb = L(cx0 + 0.5, cy0, zb);
  const brick = (u, v) => (v % 4 === 3 || (u + ((v / 4 | 0) % 2) * 3) % 6 === 0) ? '#4a2a20' : '#8a4e3a';
  face(g, cd, cc, zt - zb, brick); face(g, cc, cb, zt - zb, brick, 0.22);
  const top = [L(cx0, cy0, zt), L(cx0 + 0.5, cy0, zt), L(cx0 + 0.5, cy0 + 0.5, zt), L(cx0, cy0 + 0.5, zt)];
  polyFn(g, top, () => '#2a2422');
  Object.assign(CHIMNEY, { x: isoX(cx0 + 0.25, cy0 + 0.25), y: isoY(cx0 + 0.25, cy0 + 0.25) - zt });
  polyFn(g, [R1, R2, E2, E1], shingles(E1[0], E1[1], ['#4a5a7a', '#52648a', '#46567a']));
  line(g, E1[0], E1[1], E2[0], E2[1], '#1e2230'); line(g, R1[0], R1[1], R2[0], R2[1], '#7a8aa8');
  line(g, R2[0], R2[1], E2[0], E2[1], '#2a2018'); line(g, R2[0], R2[1], L(x0 + w + ov, y0 - ov, wh - 3)[0], F2[1], '#2a2018');
  return { img: c, x: minX, y: minY };
})();

// ---------------------------------------------------------------- static objects
const statics = [];
const darkCache = new Map();
function darkOf(img, a) {                 // a darker copy of a sprite, for scenery fading into the distance
  a = Math.round(a * 10) / 10;
  if (!darkCache.has(img)) darkCache.set(img, {});
  const m = darkCache.get(img);
  if (!m[a]) {
    const c = canvas(img.width, img.height), g = c.getContext('2d');
    g.drawImage(img, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = `rgba(8,10,16,${a})`; g.fillRect(0, 0, c.width, c.height);
    m[a] = c;
  }
  return m[a];
}
const TREES = Array.from({ length: 8 }, (_, i) => makeTree(i * 11 + 3)), PINES = Array.from({ length: 6 }, (_, i) => makePine(i * 7 + 2));
const BUSHES = Array.from({ length: 6 }, (_, i) => makeBush(i * 5 + 1));
for (let y = -PAD; y < MH + PAD; y++) for (let x = -PAD; x < MW + PAD; x++) {
  const ch = tileExt(x, y), sx = isoX(x + 0.5, y + 0.5), sy = isoY(x + 0.5, y + 0.5), o = { x: x + 0.5, y: y + 0.5, key: x + y + 1 };
  const add = (img, ax, ay, extra = {}) => statics.push({ ...o, img: extra.dim ? darkOf(img, extra.dim) : img, dx: sx - ax, dy: sy - ay, ...extra });
  const dim = outside(x, y) ? { dim: Math.min(0.75, outside(x, y) * 0.1) } : {};
  if (ch === 'T') add(TREES[hash(x, y) % 8], 24, 63, { tall: true, ...dim });
  else if (ch === 'P') add(PINES[hash(x, y) % 6], 18, 61, { tall: true, ...dim });
  else if (ch === 'b') add(BUSHES[hash(x, y) % 6], 11, 16, dim);
  else if (ch === 's') add((x + y) % 2 ? cabbageSpr : carrotSpr, 5, 6);
  else if (ch === 'f') add(makeFence(x, y), 20, 24);
  else if (ch === 'W') add(wellSpr, 16, 32, { tall: true });
  else if (ch === 'B') add(benchSpr, 14, 12);
  else if (ch === 'L') add(lanternSpr, 4, 29, { lamp: [sx, sy - 26] });
}
statics.push({ bld: true, img: house.img, dx: house.x, dy: house.y, x1: HOUSE.x0 + HOUSE.w, y1: HOUSE.y0 + HOUSE.d });

// spirit-only: Maren's footprints from the door, out along the path, into the woods
const FOOT = (() => {
  const pts = [[12.45, 7.6], [12.4, 8.5], [11.6, 9.4], [10.6, 10.3], [9.4, 11.45], [7, 11.5], [4.5, 11.5], [2, 11.5], [0.4, 11.5]];
  const out = []; let side = 1;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1], len = Math.hypot(bx - ax, by - ay), [ux, uy] = norm(bx - ax, by - ay);
    for (let s2 = 0; s2 < len; s2 += 0.34) { side = -side; out.push({ x: ax + ux * s2 - uy * 0.08 * side, y: ay + uy * s2 + ux * 0.08 * side }); }
  }
  return out;
})();

// ---------------------------------------------------------------- state
let state = 'card', mode = 'body', t = 0, spiritK = 0, footBoost = 0;
let b = { x: 10.5, y: 14.5, r: 0.22, hp: 6, max: 6, face: 1, back: false, anim: 0, moving: false, iT: 0, ax: 0, ay: -1 };
let s = null, energy = 100, parts = [], fts = [], cam = { x: 0, y: 0 }, shake = 0, fade = 1;
let waiters = [], dlg = null, cardWaiter = null, toastT = 0, locT = 0, flags = {};
const goat = { x: 6, y: 14.5, tx: 6, ty: 14.5, pause: 60, face: 1 };
const echo = { x: 7.3, y: 10.9 };
let shade = null;
const fireflies = Array.from({ length: 26 }, () => ({ x: 2 + Math.random() * 16, y: 9 + Math.random() * 10, z: 4 + Math.random() * 14, p: Math.random() * 6.28 }));

// ---------------------------------------------------------------- script helpers (same feel as the main game)
const wait = f => new Promise(r => waiters.push({ f, r }));
function tickWaiters() {
  const done = []; for (const w of waiters) if (--w.f <= 0) done.push(w);
  if (done.length) { waiters = waiters.filter(w => w.f > 0); done.forEach(w => w.r()); }
}
function toast(html, f = 300) { UI.toast.innerHTML = html; UI.toast.style.opacity = 1; toastT = f; }
function addText(x, y, txt, col) {
  const el = document.createElement('div'); el.className = 'ft'; el.textContent = txt; el.style.color = col || '#e6ded0';
  UI.ui.appendChild(el); fts.push({ x, y, el, life: 70 });
}
const SPEAKERS = {
  ASH: { name: 'Ash', col: '#e8d090' }, NOTE: { name: "Maren's Note", col: '#c8b898', cls: 'note' },
  ECHO: { name: 'An echo of Maren', col: '#f4e2b8', cls: 'mem' }, PIP: { name: 'Pip', col: '#c8a878' },
};
function say(lines) {
  return new Promise(res => { dlg = { lines, i: 0, n: 0, res, blip: -1 }; state = 'talk'; UI.dialog.classList.add('on'); showLine(); });
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
    else if (++dlg.i >= dlg.lines.length) { const d = dlg; dlg = null; UI.dialog.classList.remove('on'); state = 'play'; d.res(); }
    else showLine();
  }
}
async function card(html) {
  UI.cardIn.innerHTML = html; UI.cardIn.style.opacity = 1; UI.card.className = 'on'; state = 'card';
  await new Promise(res => { cardWaiter = { res, minT: 40 }; });
  UI.card.className = '';
}
const bleat = () => { if (AC) { tone(430, 0.3, 'sawtooth', 0.05, 360); tone(400, 0.35, 'sawtooth', 0.04, 330, AC.currentTime + 0.32); } };

// ---------------------------------------------------------------- interactions
const INTERACT = [
  { x: 16.5, y: 8.5, label: 'Read', fn: () => say([
    ['NOTE', 'Ash — feed Pip, water the beans, and do NOT go near the church.'],
    ['NOTE', 'I mean it this time. Back by morning. — M.'],
    ['ASH', "She wrote this before she left. 'Back by morning.'"] ]) },
  { x: 12.45, y: 7.4, label: 'Try the door', fn: () => say([['ASH', 'Locked. She keeps the only key on a string around her neck.']]) },
  { x: 6.5, y: 10.5, label: 'Look', body: true, fn: () => say([['ASH', "The water's black and perfectly still. Not even a ripple from the wind."]]) },
  { o: echo, label: 'Listen', spirit: true, fn: async () => {
    await say([
      ['ECHO', '...if the bells ever ring at midnight, Ash, you stay in this house. You bar the door.'],
      ['ECHO', 'And if I am not home by morning — follow the lights. Not the road. The lights.'],
      ['ASH', 'Follow the lights...?'] ]);
    footBoost = 1; flags.echo = true;
    toast('Glowing footprints lead away from the door, toward the woods.', 360);
  } },
  { o: goat, label: 'Pet', fn: async () => {
    bleat();
    if (mode === 'spirit') await say([['PIP', '...'], ['ASH', "Pip is staring straight at me. Not at my body. At me."], ['ASH', 'Can goats see souls? That would explain a lot.']]);
    else await say([['PIP', 'Mehhh.'], ['ASH', 'Hey, Pip. Nobody fed you today, did they.'], ['ASH', "She'll be back. She always comes back."]]);
  } },
];
const nearInteract = who => INTERACT.find(it => {
  const p = it.o || it;
  if (it.spirit && mode !== 'spirit') return false;
  if (it.body && mode !== 'body') return false;
  return Math.hypot(who.x - p.x, who.y - p.y) < 1.1;
});

// ---------------------------------------------------------------- update
function moveScreen(speed) {
  const sx = (held('right') ? 1 : 0) - (held('left') ? 1 : 0), sy = (held('down') ? 1 : 0) - (held('up') ? 1 : 0);
  if (!sx && !sy) return null;
  const [nx, ny] = norm(sx, sy);                 // constant speed in screen pixels
  const [wx, wy] = screenToWorld(nx * speed, ny * speed);
  return { wx, wy, sx, sy };
}
function updateBody() {
  if (b.iT > 0) b.iT--;
  if (mode !== 'body') { b.moving = false; return; }
  const m = moveScreen(1.15);
  b.moving = !!m;
  if (m) {
    if (!blocked(b.x + m.wx, b.y, b.r)) b.x += m.wx;
    if (!blocked(b.x, b.y + m.wy, b.r)) b.y += m.wy;
    if (m.sx) b.face = m.sx; b.back = m.sy < 0; b.anim++;
    [b.ax, b.ay] = norm(m.wx, m.wy);
  }
  b.x = clamp(b.x, 0.6, MW - 0.4); b.y = clamp(b.y, 0.6, MH - 0.4);
  energy = Math.min(100, energy + 0.2);
  if (tap('atk')) { const it = nearInteract(b); if (it) { it.fn(); return; } }
  if (tap('split')) {
    if (energy < 25) { addText(b.x, b.y, 'TOO WEAK TO SPLIT', '#d06060'); sfx('err'); }
    else {
      mode = 'spirit'; energy -= 10; sfx('split');
      s = { x: b.x, y: b.y, r: 0.2, face: b.face, back: false, atk: 0, iT: 30, recall: false, ax: b.ax, ay: b.ay, hits: new Set() };
      if (!flags.shadeSeen) { flags.shadeSeen = true; spawnShade(); }
    }
  }
}
function spawnShade() {
  (async () => {
    await wait(150);
    shade = { x: 1.2, y: 11.5, hp: 3, wind: 0, lunge: 0, cd: 0, rise: 50, flash: 0, face: 1 };
    sfx('rise');
    toast('Something in the treeline noticed you. It is going for your body.', 360);
  })();
}
function merge() { mode = 'body'; s = null; sfx('merge'); b.iT = Math.max(b.iT, 30); }
function updateSpirit() {
  if (s.iT > 0) s.iT--;
  s.age = (s.age || 0) + 1;
  if (s.recall) {
    const dx = b.x - s.x, dy = b.y - s.y, d = Math.hypot(dx, dy);
    if (d < 0.15) { merge(); return; }
    s.x += dx / d * Math.min(d, 0.14); s.y += dy / d * Math.min(d, 0.14); return;
  }
  energy -= 0.07;
  if (energy <= 0) { energy = 0; s.recall = true; sfx('drain'); return; }
  const m = moveScreen(2.0);
  if (m) { s.x += m.wx; s.y += m.wy; if (m.sx) s.face = m.sx; s.back = m.sy < 0; [s.ax, s.ay] = norm(m.wx, m.wy); }
  s.x = clamp(s.x, 0.4, MW - 0.4); s.y = clamp(s.y, 0.4, MH - 0.4);
  const dx = s.x - b.x, dy = s.y - b.y, d = Math.hypot(dx, dy);
  if (d > 5) { s.x = b.x + dx / d * 5; s.y = b.y + dy / d * 5; }
  if (tap('atk')) {
    const it = nearInteract(s);
    if (it) { it.fn(); return; }
    if (!s.atk) { s.atk = 14; s.hits = new Set(); sfx('slash'); }
  }
  if (s.atk > 0) s.atk--;
  if (shade && s.atk >= 4 && s.atk <= 10 && !s.hits.has(1) && shade.rise <= 0) {
    const ex = shade.x - s.x, ey = shade.y - s.y, ed = Math.hypot(ex, ey);
    if (ed < 1.3 && (ed < 0.3 || (ex * s.ax + ey * s.ay) / ed > 0.15)) {
      s.hits.add(1); shade.hp -= 2; shade.flash = 6; shade.wind = 0; shade.lunge = 0; shade.cd = 20;
      shade.x += s.ax * 0.4; shade.y += s.ay * 0.4; sfx('hit'); shake = 3;
      if (shade.hp <= 0) {
        const [px2, py2] = [isoX(shade.x, shade.y), isoY(shade.x, shade.y) - 14];
        burstAt(px2, py2, 22, ['#a8a4b8', '#dcd8e4', '#26222f']); sfx('kill'); energy = Math.min(100, energy + 20); shade = null;
        toast('It came apart like smoke. So that is what lives at the edge of the woods.', 360);
      }
    }
  }
  if (tap('split') && s.age > 5) {
    if (Math.hypot(s.x - b.x, s.y - b.y) < 0.6) merge(); else { s.recall = true; sfx('recall'); }
  }
}
function updateShade() {
  if (!shade) return;
  if (shade.flash > 0) shade.flash--;
  if (shade.rise > 0) { shade.rise--; return; }
  const tgt = b;                             // it wants the empty body
  if (shade.wind > 0) {
    if (--shade.wind === 0) { const [ux, uy] = norm(shade.tx - shade.x, shade.ty - shade.y); shade.lx = ux * 0.12; shade.ly = uy * 0.12; shade.lunge = 12; }
  } else if (shade.lunge > 0) {
    shade.x += shade.lx; shade.y += shade.ly;
    if (Math.hypot(shade.x - b.x, shade.y - b.y) < 0.45 && b.iT === 0) {
      b.hp--; b.iT = 60; shake = 8; sfx('hurt'); shade.lunge = 0; shade.cd = 50;
      addText(b.x, b.y, mode === 'spirit' ? 'YOUR BODY' : 'OUCH', '#e05050');
      if (b.hp <= 0) bodyFell();
    } else if (s && !s.recall && Math.hypot(shade.x - s.x, shade.y - s.y) < 0.4 && s.iT === 0) {
      energy -= 10; s.iT = 40; sfx('shurt'); shade.lunge = 0; shade.cd = 50;
    }
    if (--shade.lunge <= 0 && !shade.cd) shade.cd = 34;
  } else if (shade.cd > 0) shade.cd--;
  else {
    const [ux, uy] = norm(tgt.x - shade.x, tgt.y - shade.y);
    shade.x += ux * 0.022; shade.y += uy * 0.022; shade.face = isoX(ux, uy) - isoX(0, 0) >= 0 ? 1 : -1;
    if (Math.hypot(tgt.x - shade.x, tgt.y - shade.y) < 0.9) { shade.wind = 34; shade.tx = tgt.x; shade.ty = tgt.y; }
  }
}
async function bodyFell() {
  state = 'card';
  await card('<div class="chapter">Your body has fallen</div><div class="press">Press Enter to try again</div>');
  b.hp = b.max; b.x = 10.5; b.y = 14.5; mode = 'body'; s = null; energy = 100; flags.shadeSeen = false; shade = null; state = 'play';
}
function updateGoat() {
  if (goat.pause > 0) { goat.pause--; return; }
  const dx = goat.tx - goat.x, dy = goat.ty - goat.y, d = Math.hypot(dx, dy);
  if (d < 0.05) {
    goat.pause = 60 + Math.random() * 200;
    goat.tx = 2.5 + Math.random() * 7; goat.ty = 12.5 + Math.random() * 5;
    if (Math.random() < 0.25 && Math.hypot(goat.x - b.x, goat.y - b.y) < 7) bleat();
    return;
  }
  const nx = goat.x + dx / d * 0.012, ny = goat.y + dy / d * 0.012;
  if (blocked(nx, ny, 0.25)) { goat.tx = goat.x; goat.ty = goat.y; return; }
  goat.face = isoX(dx, dy) - isoX(0, 0) >= 0 ? 1 : -1; goat.x = nx; goat.y = ny;
}
function burstAt(x, y, n, cols) {
  for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, v = Math.random() * 2; parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.5, life: 30 + Math.random() * 20, col: cols[i % cols.length], glow: true }); }
}
let cricketT = 120;
function update() {
  if (tap('mute')) { muted = !muted; if (master) master.gain.value = muted ? 0 : 0.5; }
  t++;
  tickWaiters();
  fade = Math.max(0, fade - 0.02);
  spiritK += ((mode === 'spirit' ? 1 : 0) - spiritK) * 0.06;
  footBoost = Math.max(0, footBoost - 0.002);
  if (state === 'card') {
    if (cardWaiter) { if (cardWaiter.minT > 0) cardWaiter.minT--; else if (tap('start') || tap('atk')) { const w = cardWaiter; cardWaiter = null; w.res(); } }
  } else if (state === 'talk') updateTalk();
  else if (state === 'play') {
    updateBody(); if (state === 'play' && mode === 'spirit') updateSpirit();
    updateShade(); updateGoat();
    if (state === 'play' && (mode === 'body' ? b : s).x < 0.9 && Math.abs((mode === 'body' ? b : s).y - 11.5) < 0.8 && !flags.ended) theEnd();
  }
  if (--cricketT <= 0 && AC && mode === 'body') { cricketT = 90 + Math.random() * 160; for (let i = 0; i < 3; i++) tone(4300, 0.03, 'square', 0.006, 0, AC.currentTime + i * 0.07); }
  if (t % 9 === 0) parts.push({ x: CHIMNEY.x + (Math.random() - 0.5) * 3, y: CHIMNEY.y, vx: 0.08 + Math.random() * 0.05, vy: -0.25, life: 120, col: 'smoke', glow: false });
  for (const p of parts) { p.x += p.vx; p.y += p.vy; p.vx *= p.col === 'smoke' ? 1 : 0.95; p.vy *= p.col === 'smoke' ? 0.995 : 0.96; p.life--; }
  parts = parts.filter(p => p.life > 0);
  if (shake > 0) { shake *= 0.85; if (shake < 0.4) shake = 0; }
  const f = s ? { x: s.x * 0.6 + b.x * 0.4, y: s.y * 0.6 + b.y * 0.4 } : b;
  cam.x += (clamp(isoX(f.x, f.y) - W / 2, CAM.x0, CAM.x1) - cam.x) * 0.1;
  cam.y += (clamp(isoY(f.x, f.y) - H / 2 - 10, CAM.y0, CAM.y1) - cam.y) * 0.1;
  if (toastT > 0 && --toastT === 0) UI.toast.style.opacity = 0;
  if (locT > 0 && --locT === 0) UI.loc.style.opacity = 0;
  for (const ft of fts) { ft.y -= 0.02; ft.life--; }
  fts = fts.filter(ft => { if (ft.life <= 0) { ft.el.remove(); return false; } return true; });
}
async function theEnd() {
  flags.ended = true;
  await card(`<div class="prose">${flags.echo ? 'The lights lead off the road, into the dark under the trees — toward the old crypt.' : 'The path disappears into the woods, toward the old crypt road.'}</div><div class="press">Press Enter</div>`);
  await card('<div class="sub">End of the cottage prototype</div><div class="chapter">Thanks for walking</div><div class="press">Press Enter to keep exploring</div>');
  b.x = 2.2; b.y = 11.5; if (s) { s.x = 2.4; s.y = 11.5; } state = 'play'; flags.ended = false;
}

// ---------------------------------------------------------------- draw
function drawLantern(x, y) {
  x = Math.round(x); y = Math.round(y);
  ctx.fillStyle = '#4a4038'; ctx.fillRect(x + 1, y - 1, 1, 1);
  ctx.fillStyle = '#2a2420'; ctx.fillRect(x, y, 3, 5);
  ctx.fillStyle = Math.random() < 0.1 ? '#ffe8a8' : '#ffc860'; ctx.fillRect(x + 1, y + 1, 1, 3);
}
function shadowAt(sx, sy, w = 6, a = 0.3) {
  ctx.fillStyle = `rgba(10,20,10,${a})`;
  ctx.fillRect(Math.round(sx - w), Math.round(sy - 1), w * 2, 2); ctx.fillRect(Math.round(sx - w + 2), Math.round(sy - 2), w * 2 - 4, 4);
}
const SX = o => isoX(o.x, o.y) - camX, SY = o => isoY(o.x, o.y) - camY;
let camX = 0, camY = 0;
const CAM = { x0: isoX(0, MH) - 60, x1: isoX(MW, 0) + 60 - W, y0: isoY(0, 0) - 80, y1: isoY(MW, MH) + 30 - H };
const lc = canvas(W, H), lg = lc.getContext('2d');

function draw() {
  camX = Math.round(cam.x + (shake ? (Math.random() - 0.5) * shake : 0));
  camY = Math.round(cam.y + (shake ? (Math.random() - 0.5) * shake : 0));
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#0d0b10'; ctx.fillRect(0, 0, W, H);
  ctx.drawImage(ground, -camX, -camY);

  const active = s || b;
  const list = statics.filter(o => o.dx - camX < W + 10 && o.dx - camX + o.img.width > -10 && o.dy - camY < H + 10 && o.dy - camY + o.img.height > -10);
  const dyn = [];
  dyn.push({ x: b.x, y: b.y, key: b.x + b.y, draw: drawBody });
  dyn.push({ x: goat.x, y: goat.y, key: goat.x + goat.y, draw: () => { shadowAt(SX(goat), SY(goat), 6); drawSpr(goatSpr, SX(goat) - 7, SY(goat) - 10, goat.face < 0); } });
  if (shade) dyn.push({ x: shade.x, y: shade.y, key: shade.x + shade.y, draw: drawShade });
  // depth: everything behind the cottage, then the cottage, then everything in front of it
  const bl = statics.find(o => o.bld), byKey = (a, c) => a.key - c.key;
  const rest = list.concat(dyn).filter(o => !o.bld);
  const inFront = o => o.x >= bl.x1 || o.y >= bl.y1;
  const all = [...rest.filter(o => !inFront(o)).sort(byKey), bl, ...rest.filter(inFront).sort(byKey)];
  const ax = isoX(active.x, active.y) - camX, ay = isoY(active.x, active.y) - camY, akey = active.x + active.y;
  for (const o of all) {
    if (o.draw) { o.draw(); continue; }
    let alpha = 1;
    const ox = o.dx - camX, oy = o.dy - camY;
    if (o.bld) {
      const front = active.x >= o.x1 || active.y >= o.y1;
      if (!front && ax > ox + 6 && ax < ox + o.img.width - 6 && ay > oy && ay < oy + o.img.height) alpha = 0.4;
    } else if (o.tall && o.key > akey && Math.abs(ax - (ox + o.img.width / 2)) < o.img.width / 2 && ay > oy && ay < oy + o.img.height) alpha = 0.45;
    ctx.globalAlpha = alpha; ctx.drawImage(o.img, Math.round(ox), Math.round(oy)); ctx.globalAlpha = 1;
  }
  for (const p of parts) if (p.col === 'smoke') {
    ctx.fillStyle = `rgba(190,180,190,${p.life / 120 * 0.35})`; const r = 1 + (120 - p.life) / 40 | 0;
    ctx.fillRect(Math.round(p.x - camX), Math.round(p.y - camY), r, r);
  }

  // ---- dusk grade
  ctx.globalCompositeOperation = 'multiply';
  const grd = ctx.createLinearGradient(0, 0, 0, H);
  grd.addColorStop(0, 'rgba(255,190,150,0.55)'); grd.addColorStop(1, 'rgba(200,170,210,0.45)');
  ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
  // ---- spirit world: drain the colour, turn it cold
  if (spiritK > 0.01) {
    ctx.globalCompositeOperation = 'saturation';
    ctx.fillStyle = `rgba(128,128,128,${0.85 * spiritK})`; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = `rgba(110,150,215,${0.75 * spiritK})`; ctx.fillRect(0, 0, W, H);
  }
  ctx.globalCompositeOperation = 'source-over';

  // ---- lights
  const L = [];
  for (const o of statics) if (o.lamp) L.push([o.lamp[0] - camX, o.lamp[1] - camY, 56, 0.85, '255,190,110', 0.22]);
  for (const [wx, wy, z] of WINDOWS) L.push([isoX(wx, wy) - camX, isoY(wx, wy) - z - camY, 32, 0.7, '255,190,100', 0.2]);
  if (mode === 'body') L.push([ax + b.face * 6, ay - 8, 64, 0.8, '255,180,100', 0.12]);
  else L.push([SX(b) + 14, SY(b) - 3, 50, 0.7, '255,180,100', 0.1]);
  if (s) L.push([SX(s), SY(s) - 14, 60, 0.85, '90,230,255', 0.16]);
  if (spiritK > 0.3) L.push([SX(echo), SY(echo) - 16, 40, 0.6 * spiritK, '255,220,160', 0.2 * spiritK]);
  lg.globalCompositeOperation = 'source-over'; lg.clearRect(0, 0, W, H);
  lg.fillStyle = `rgba(14,10,36,${0.3 + 0.28 * spiritK})`; lg.fillRect(0, 0, W, H);
  lg.globalCompositeOperation = 'destination-out';
  for (const [x, y, r, a] of L) {
    const g = lg.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    lg.fillStyle = g; lg.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.drawImage(lc, 0, 0);
  ctx.globalCompositeOperation = 'lighter';
  for (const [x, y, r, , col, a] of L) {
    const rr = r * 0.6, g = ctx.createRadialGradient(x, y, 0, x, y, rr);
    g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = g; ctx.fillRect(x - rr, y - rr, rr * 2, rr * 2);
  }
  ctx.globalCompositeOperation = 'source-over';

  // ---- things that glow on top: fireflies (or soul motes), footprints, echo, spirit
  for (const f of fireflies) {
    f.p += 0.02; f.x += Math.sin(f.p * 1.3) * 0.004; f.y += Math.cos(f.p) * 0.004;
    const on = Math.sin(f.p * 3 + f.x) > 0.3;
    if (!on && spiritK < 0.5) continue;
    ctx.fillStyle = spiritK > 0.5 ? `rgba(140,240,255,${0.35 * spiritK})` : '#e8f080';
    ctx.fillRect(Math.round(SX(f)), Math.round(SY(f) - f.z - (spiritK > 0.5 ? (t * 0.1 + f.p * 20) % 30 : 0)), 1, 1);
  }
  if (spiritK > 0.05) {
    FOOT.forEach((fp, i) => {
      const wave = 0.5 + 0.5 * Math.sin(i * 0.5 - t * 0.08);
      ctx.fillStyle = `rgba(255,224,160,${spiritK * (0.25 + 0.55 * wave) * (0.6 + footBoost)})`;
      const x = Math.round(SX(fp)), y = Math.round(SY(fp));
      ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 1);
    });
    drawSpr(SPR.marenSpirit, SX(echo) - 6, SY(echo) - 26 + Math.sin(t * 0.05) * 1.5, true, { alpha: spiritK * (0.45 + 0.15 * Math.sin(t * 0.07)), glow: true });
  }
  if (shade && spiritK > 0.05) drawShade(true);
  if (s) drawSpirit();
  for (const p of parts) if (p.glow) { ctx.globalAlpha = Math.min(1, p.life / 12); ctx.fillStyle = p.col; ctx.fillRect(Math.round(p.x - camX), Math.round(p.y - camY), 1, 1); }
  ctx.globalAlpha = 1;

  ctx.globalAlpha = 0.045;
  const gx = Math.random() * 128 | 0, gy = Math.random() * 128 | 0;
  for (let x = -gx; x < W; x += 128) for (let y = -gy; y < H; y += 128) ctx.drawImage(grainCanvas, x, y);
  ctx.globalAlpha = 1;
  ctx.drawImage(vignetteCanvas, 0, 0);
  if (fade > 0) { ctx.fillStyle = `rgba(0,0,0,${fade})`; ctx.fillRect(0, 0, W, H); }
  updateDOM();
}
function drawBody() {
  const x = SX(b), y = SY(b), blink = b.iT > 0 && t % 6 < 3;
  if (mode === 'body') {
    shadowAt(x, y, 5);
    const frame = b.moving ? [1, 0, 2, 0][(b.anim / 7 | 0) % 4] : 0;
    if (b.back) drawLantern(x + (b.face > 0 ? 6 : -9), y - 10);
    if (!blink) drawSpr((b.back ? SPR.back : SPR.ash)[frame], x - 6, y - 19, b.face < 0);
    if (!b.back) drawLantern(x + (b.face > 0 ? 6 : -9), y - 10);
  } else {
    shadowAt(x, y, 11, 0.25);
    drawSpr(SPR.lie, x - 12, y - 6, b.face < 0, { flash: b.iT > 50 });
    drawLantern(x + 14, y - 4);
  }
}
function drawShade(glowLayer) {
  const x = SX(shade), y = SY(shade);
  const jit = shade.wind > 0 ? (t % 4 < 2 ? 1 : -1) : 0;
  const a = glowLayer ? 0.92 * spiritK : 0.22 * (1 - spiritK);
  if (a < 0.02) return;
  if (glowLayer && shade.wind > 0) { ctx.fillStyle = shade.wind < 10 ? '#ff6040' : '#c03030'; ctx.fillRect(Math.round(x), Math.round(y - 36), 1, 3); ctx.fillRect(Math.round(x), Math.round(y - 32), 1, 1); }
  drawSpr(SPR.shade, x - 7 + jit, y - 26 + Math.sin(t * 0.07) * 1.5, shade.face < 0,
    { alpha: a * (1 - shade.rise / 50), flash: shade.flash > 0 || (shade.wind > 0 && shade.wind < 10 && t % 3 === 0) });
}
function drawSpirit() {
  const bx = SX(b), by = SY(b) - 4, x = SX(s), y = SY(s);
  const d = Math.hypot(x - bx, y - 10 - by), n = Math.max(2, d / 3 | 0);
  ctx.fillStyle = energy < 30 ? (t % 12 < 6 ? '#f66' : '#a33') : '#8ff';
  for (let i = 1; i < n; i++) {
    const k = i / n; ctx.globalAlpha = 0.35 + 0.5 * Math.sin(k * Math.PI);
    ctx.fillRect(Math.round(bx + (x - bx) * k), Math.round(by + (y - 10 - by) * k + Math.sin(k * Math.PI) * 6), 1, 1);
  }
  ctx.globalAlpha = 1;
  const sy = y - 24 + Math.sin(t * 0.08) * 1.2;
  drawSpr(s.back ? SPR.spiritB : SPR.spirit, x - 6, sy, s.face < 0, { alpha: s.recall ? 0.5 : 0.92, glow: true });
  if (s.atk > 1) {
    const p = 1 - (s.atk - 1) / 13;
    const [vx, vy] = norm(isoX(s.ax, s.ay) - isoX(0, 0), isoY(s.ax, s.ay) - isoY(0, 0));
    const base = Math.atan2(vy, vx), end = -1.5 + 3 * Math.min(1, p * 1.7);
    for (let ang = -1.5; ang <= end; ang += 0.05) for (const [r, col] of [[14, '#3aa'], [17, '#7dd'], [20, '#cff'], [22, '#fff']]) {
      ctx.globalAlpha = (1 - p * 0.75) * (1 - (end - ang) / 3); ctx.fillStyle = col;
      ctx.fillRect(Math.round(x + Math.cos(base + ang) * r), Math.round(y - 9 + Math.sin(base + ang) * r * 0.6), 1, 1);
    }
    ctx.globalAlpha = 1;
  }
}
function updateDOM() {
  UI.hud.classList.toggle('on', state === 'play' || state === 'talk');
  UI.hp.style.width = (b.hp / b.max * 100) + '%';
  UI.sp.style.width = energy + '%'; UI.sp.classList.toggle('low', energy < 25);
  const who = s || b, it = state === 'play' && !(s && s.recall) ? nearInteract(who) : null;
  UI.prompt.classList.toggle('on', !!it);
  if (it) {
    const p = it.o || it;
    UI.prompt.innerHTML = `<kbd>X</kbd> ${it.label}`;
    UI.prompt.style.left = (isoX(p.x, p.y) - camX) + 'px'; UI.prompt.style.top = (isoY(p.x, p.y) - camY - 24) + 'px';
  }
  const danger = shade && mode === 'spirit' && shade.rise <= 0 && Math.hypot(shade.x - b.x, shade.y - b.y) < 2.5;
  UI.danger.style.opacity = danger && t % 24 < 14 ? 1 : 0;
  UI.danger.style.left = SX(b) + 'px'; UI.danger.style.top = (SY(b) - 12) + 'px';
  for (const ft of fts) { ft.el.style.left = (isoX(ft.x, ft.y) - camX) + 'px'; ft.el.style.top = (isoY(ft.x, ft.y) - camY - 26 - (70 - ft.life) * 0.3) + 'px'; ft.el.style.opacity = Math.min(1, ft.life / 20); }
}

// ---------------------------------------------------------------- start
(async () => {
  cam.x = clamp(isoX(b.x, b.y) - W / 2, CAM.x0, CAM.x1); cam.y = clamp(isoY(b.x, b.y) - H / 2, CAM.y0, CAM.y1);
  // dev: cottage.html?skip  (jump straight in)  ·  ?skip&spirit  (start outside your body)
  const Q = new URLSearchParams(location.search);
  if (Q.has('skip')) {
    fade = 0; state = 'play';
    if (Q.has('spirit')) { mode = 'spirit'; spiritK = 1; flags.shadeSeen = true; s = { x: b.x - 1.5, y: b.y - 2.5, r: 0.2, face: 1, back: false, atk: 0, iT: 0, recall: false, ax: 0, ay: -1, hits: new Set() }; }
    return;
  }
  await card(`<div class="sub">Prototype &middot; isometric</div><div class="chapter">Maren's Cottage</div>
    <div class="prose" style="margin-top:12px">She said she'd find her own way down. That was yesterday.</div>
    <div class="controls"><kbd>Arrows</kbd> move <kbd>X</kbd> interact / strike <kbd>C</kbd> step out of your body <kbd>M</kbd> mute</div>
    <div class="press">Press Enter</div>`);
  state = 'play'; setMusic('ambient');
  UI.loc.innerHTML = '<small>Outside Saint Orrin</small>Maren\'s Cottage'; UI.loc.style.opacity = 1; locT = 220;
  await wait(120);
  await say([
    ['ASH', "Maren's cottage. Her garden's already going to seed."],
    ['ASH', "Pip's still here, at least. Somebody has to feed you."],
  ]);
  toast('Press <kbd>C</kbd> to step out of your body — and see what the living can\'t.', 480);
})();

let acc = 0, last = performance.now();
function frame(now) {
  acc += Math.min(100, now - last); last = now;
  while (acc >= 1000 / 60) { update(); for (const k in hit) delete hit[k]; acc -= 1000 / 60; }
  draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
