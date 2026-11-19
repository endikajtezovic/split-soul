"use strict";
// ---------------------------------------------------------------- art: sprites, props, room painter
const W = 480, H = 270, TOPW = 44;
const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

const PAL = {
  // Ash
  k: '#0d0b10', h: '#1e1a22', H: '#3c3644', s: '#d9b8a0', S: '#a88470', e: '#0d0b10',
  c: '#3a3640', C: '#26232b', l: '#56525e', r: '#8e2424', R: '#5a1616', b: '#17141a',
  // spirit
  K: '#0c3440', W: '#f4feff', w: '#8fdde8', x: '#2f8fa2', g: '#ffffff',
  // hollow
  z: '#6e6a5e', Z: '#4a4740', t: '#2e2a26', T: '#47423b', E: '#ff6a2a',
  // shade
  v: '#26222f', V: '#3c3650', m: '#dcd8e4', M: '#a8a4b8',
  // cantor
  A: '#5e1414', a: '#360b0d', L: '#7e2222', y: '#ffb050', u: '#b09060',
};

function mk(rows, pal, glow) {
  const h = rows.length, w = Math.max(...rows.map(r => r.length));
  const make = col => {
    const c = canvas(w, h), g = c.getContext('2d');
    for (let y = 0; y < h; y++) for (let x = 0; x < rows[y].length; x++) {
      const ch = rows[y][x];
      if (ch !== '.' && pal[ch]) { g.fillStyle = col || pal[ch]; g.fillRect(x, y, 1, 1); }
    }
    return c;
  };
  return { w, h, n: make(), f: make('#fff'), g: glow ? make(glow) : null };
}
const fromCanvas = c => {
  const f = canvas(c.width, c.height), g = f.getContext('2d');
  g.drawImage(c, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
  return { w: c.width, h: c.height, n: c, f, g: null };
};

// o: { alpha, scale, flash, glow, reveal (0..1, emerges from the ground) }
function drawSpr(sp, x, y, flip, o = {}) {
  const sc = o.scale || 1, a = o.alpha ?? 1, rv = o.reveal ?? 1;
  const sh = Math.max(1, Math.round(sp.h * rv));
  ctx.save(); ctx.globalAlpha = a;
  ctx.translate(Math.round(x), Math.round(y + (sp.h - sh) * sc));
  if (flip) { ctx.translate(sp.w * sc, 0); ctx.scale(-1, 1); }
  if (o.glow && sp.g) {
    ctx.globalAlpha = a * 0.4;
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) ctx.drawImage(sp.g, 0, 0, sp.w, sh, dx, dy, sp.w * sc, sh * sc);
    ctx.globalAlpha = a;
  }
  ctx.drawImage(o.flash ? sp.f : sp.n, 0, 0, sp.w, sh, 0, 0, sp.w * sc, sh * sc);
  ctx.restore();
}

// ---- characters
const ashTop = [
  '....kkkk....', '...kHhhhk...', '..kHhhhhhk..', '..khhhhhhk..', '..khsssshk..', '..kssesesk..', '...kSssSk...',
  '..krrrrrrk..', '.kcRrrrrRck.', '.kclccccCck.', 'kcclccccCcck', 'kslcccccCCsk', '.kclccccCck.', '.kclccccCck.', '.kCccccccCk.'];
const ashBack = [...ashTop];
ashBack[4] = '..khhhhhhk..'; ashBack[5] = '..khhHhhhk..'; ashBack[6] = '...khhhhk...';
const LEGS = [
  ['..kCk..kCk..', '..kbk..kbk..', '..kbbk.kbbk.', '...kk...kk..'],
  ['..kCk..kCk..', '.kbk....kbk.', '.kbbk...kbbk', '..kk.....kk.'],
  ['...kCkkCk...', '...kbkkbk...', '...kbbkbbk..', '....kk.kk...'],
];
const spiritRows = [
  '....KKKK....', '...KWWWWK...', '..KWWWWWWK..', '..KWWWWWWK..', '..KWwwwwWK..', '..KwKwwKwK..', '...KwwwwK...',
  '..KxWWWWxK..', '.KxwWxxWwxK.', '.KxwWxxWwxK.', 'KwxxwxxwxxwK', 'KwKxwxxwxKwK', '.KxwwxxwwxK.', '.KxwwxxwwxK.',
  '..KxwwwwxK..', '..KxxwwxxK..', '...KxwwxK...', '...KKxxKK...', '....KxxK....', '.....KK.....'];
const spiritBack = [...spiritRows];
spiritBack[4] = '..KWWWWWWK..'; spiritBack[5] = '..KWWwWWWK..';
const lieRows = [
  '..kkkk..................', '.kHhhhk..krrk...........', 'khhhhhskkrrrkkkkkkkkk...', 'khhhhssskRccclcccccCkbk.',
  'khhhhssskRccclcccccCkbk.', '.khhhkkk.kccccccccccCkk.', '..kkk.....kkkkkkkkkkk...'];
const MAREN_BODY = { ...PAL, h: '#cfc8bc', H: '#ece6da', c: '#18161c', C: '#0f0d12', l: '#24212a', r: '#cfc8bc', R: '#a8a296' };
const MAREN_SPIRIT = { ...PAL, K: '#5a4428', W: '#fff6e4', w: '#ecd6ae', x: '#bc9c6a', g: '#fff' };
const hollowTop = [
  '....kkkk....', '...kzzzZk...', '..kzzzzzZk..', '..kzEzzEZk..', '..kzzzzzZk..', '...kZkkZk...', '..ktTtttTk..',
  '.ktTTttttTk.', 'kzktTtttTkzk', 'kzktTtttTkzk', 'kZktTtttTkZk', '.kkttTtttkk.', '..ktTtttTk..', '..ktttttttk.'];

const SPR = {
  ash:  LEGS.map(l => mk([...ashTop, ...l], PAL)),
  back: LEGS.map(l => mk([...ashBack, ...l], PAL)),
  lie: mk(lieRows, PAL),
  marenLie: mk(lieRows, MAREN_BODY),
  spirit: mk(spiritRows, PAL, '#5ff'),
  spiritB: mk(spiritBack, PAL, '#5ff'),
  marenSpirit: mk(spiritRows, MAREN_SPIRIT, '#ffe0a0'),
  hollow: [
    mk([...hollowTop, '..kztk.kzk..', '..kzk..kzk..', '..kZk...kZk.', '.kkk....kkk.'], PAL),
    mk([...hollowTop, '...kzkkzk...', '...kzk.kzk..', '..kZk..kZk..', '..kkk..kkk..'], PAL),
  ],
  shade: mk([
    '.....kkkk.....', '....kVVVVk....', '...kVvvvvVk...', '..kVvmmmmvVk..', '..kVmkmmkmVk..', '..kVmmmmmmVk..',
    '..kVvmkkmvVk..', '...kVvmmvVk...', '..kVvvvvvvVk..', '.kVvvvvvvvvVk.', '.kVvvvvvvvvVk.', 'kVvvvvvvvvvvVk',
    'kVvvvvvvvvvvVk', '.kVvvvvvvvvVk.', '.kVv.vvvv.vVk.', '..kv.vv.vv.k..', '..v..v..v..v..', '.v...v...v....'], PAL),
  cantor: mk([
    '....kkkk....', '...kaAAak...', '..kaALLAak..', '..kAkkkkAk..', '..kAkyykAk..', '..kaAkkAak..', '...kaAAak...',
    '..kaALLAAak.', '.kaALLuAAAak', '.kaALLuAAAak', 'ksaALLuAAAsk', '.kaALLuAAAak', '.kaALLuAAAak', '.kaALLuAAAak',
    'kaaALLuAAAak', 'kaaALLuAAaak', '.kaaaaaaaak.', '..kkkkkkkk..'], PAL),
};

// ---- pixel helpers for procedural art
function pxTools(g) {
  const rect = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), w, h); };
  const px = (x, y, col) => rect(x, y, 1, 1, col);
  const disc = (cx, cy, r, col, sy = 1) => {
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r) px(cx + x, cy + y * sy, col);
  };
  const ring = (cx, cy, r0, r1, col) => {
    for (let y = -r1; y <= r1; y++) for (let x = -r1; x <= r1; x++) { const d = Math.hypot(x, y); if (d >= r0 && d <= r1) px(cx + x, cy + y, col); }
  };
  const poly = (pts, col) => {
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++)
      for (let x = Math.floor(Math.min(...xs)); x <= Math.ceil(Math.max(...xs)); x++) {
        let inside = false; const X = x + 0.5, Y = y + 0.5;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          const [xi, yi] = pts[i], [xj, yj] = pts[j];
          if ((yi > Y) !== (yj > Y) && X < (xj - xi) * (Y - yi) / (yj - yi) + xi) inside = !inside;
        }
        if (inside) px(x, y, col);
      }
  };
  return { rect, px, disc, ring, poly };
}

function splatOn(g, x, y, n, cols, rnd = Math.random, bounds) {
  const { disc } = pxTools(g);
  for (let i = 0; i < n; i++) {
    const a = rnd() * Math.PI * 2, d = rnd() * (2 + n * 0.5);
    const X = x + Math.cos(a) * d, Y = y + Math.sin(a) * d * 0.6;
    if (bounds && (X < 18 || X > bounds.w - 18 || Y < TOPW + 2 || Y > bounds.h - 12)) continue;
    disc(X, Y, i < 3 ? 2 : (rnd() < 0.3 ? 1 : 0), cols[i % cols.length]);
  }
}

// ---- the Bellwarden (procedural)
const wardenSpr = fromCanvas((() => {
  const c = canvas(36, 50), T = pxTools(c.getContext('2d'));
  T.poly([[7, 20], [29, 20], [35, 50], [1, 50]], '#17141b');
  T.poly([[18, 20], [29, 20], [35, 50], [20, 50]], '#100e13');
  for (const x of [8, 14, 22, 28]) T.rect(x, 30, 1, 20, '#221e27');
  T.rect(4, 20, 8, 5, '#2a2530'); T.rect(24, 20, 8, 5, '#2a2530');
  T.rect(4, 20, 8, 1, '#3e3846'); T.rect(24, 20, 8, 1, '#3e3846');
  T.rect(1, 24, 5, 18, '#17141b'); T.rect(30, 24, 5, 18, '#100e13');
  T.rect(1, 41, 5, 4, '#8a8274'); T.rect(30, 41, 5, 4, '#6a6458');
  for (let y = 45; y < 50; y += 2) { T.px(32, y, '#5a5650'); T.px(3, y, '#5a5650'); }
  T.poly([[13, 2], [23, 2], [27, 14], [30, 19], [6, 19], [9, 14]], '#6e5a3a');
  T.poly([[13, 2], [16, 2], [13, 14], [10, 19], [6, 19], [9, 14]], '#957c50');
  T.poly([[21, 2], [23, 2], [27, 14], [30, 19], [26, 19], [24, 14]], '#4a3c26');
  T.rect(5, 18, 26, 3, '#3e321f'); T.rect(5, 18, 26, 1, '#a88c5a');
  T.rect(16, 0, 4, 3, '#4a3c26'); T.px(17, 0, '#957c50');
  T.rect(8, 21, 20, 2, '#07060a');
  for (let x = 9; x < 28; x += 3) T.px(x, 10, '#c8a868');
  T.px(20, 6, '#2a2216'); T.px(21, 7, '#2a2216'); T.px(21, 8, '#2a2216');   // crack
  return c;
})());

// ---- props
const pillarSpr = (() => {
  const c = canvas(18, 56), { rect, px } = pxTools(c.getContext('2d'));
  rect(0, 48, 18, 8, '#77706a'); rect(0, 48, 18, 1, '#a59d92'); rect(1, 55, 16, 1, '#3e3a36');
  rect(1, 45, 16, 3, '#8a837a'); rect(1, 45, 16, 1, '#a59d92');
  rect(4, 8, 10, 37, '#8f887e'); rect(4, 8, 2, 37, '#b4ac9f'); rect(12, 8, 2, 37, '#5a554e');
  rect(7, 8, 1, 37, '#77706a'); rect(10, 8, 1, 37, '#77706a');
  rect(2, 5, 14, 3, '#a59d92'); rect(0, 1, 18, 4, '#b4ac9f'); rect(0, 4, 18, 1, '#6a645c'); rect(0, 0, 18, 1, '#cfc7ba');
  px(1, 3, '#77706a'); px(16, 3, '#77706a'); px(9, 22, '#4a453e'); px(10, 23, '#4a453e'); px(10, 24, '#4a453e'); px(5, 38, '#6a645c');
  return c;
})();
const pewSpr = (() => {
  const c = canvas(46, 15), { rect, px } = pxTools(c.getContext('2d'));
  rect(0, 0, 46, 6, '#3a322a'); rect(0, 0, 46, 1, '#5a4e42'); rect(0, 5, 46, 1, '#271f1a');
  rect(0, 6, 46, 5, '#4e4338'); rect(0, 6, 46, 1, '#6e604f');
  rect(0, 11, 46, 4, '#211b17'); rect(2, 11, 3, 4, '#15110e'); rect(41, 11, 3, 4, '#15110e');
  for (const x of [7, 19, 30, 38]) px(x, 3, '#2e261f');
  return c;
})();
const statueSpr = (() => {
  const c = canvas(18, 42), T = pxTools(c.getContext('2d'));
  T.rect(1, 34, 16, 8, '#575249'); T.rect(1, 34, 16, 1, '#7a746a'); T.rect(1, 41, 16, 1, '#36322d');
  T.poly([[5, 12], [13, 12], [16, 34], [2, 34]], '#89837a');
  T.poly([[10, 12], [13, 12], [16, 34], [11, 34]], '#66615a');
  T.disc(9, 8, 4, '#89837a'); T.disc(10, 8, 3, '#7a746b'); T.disc(9, 9, 2, '#3a3631');
  T.rect(7, 16, 4, 4, '#a39d92'); T.px(8, 15, '#a39d92');
  for (const y of [22, 27, 31]) T.rect(4, y, 9, 1, '#706a62');
  return c;
})();
const lecternSpr = (() => {
  const c = canvas(12, 18), T = pxTools(c.getContext('2d'));
  T.rect(5, 7, 2, 10, '#3a2e24'); T.rect(2, 16, 8, 2, '#2a2019');
  T.poly([[0, 7], [12, 4], [12, 7], [0, 10]], '#4e3e30');
  T.poly([[1, 6], [6, 4.8], [6, 6.8], [1, 8]], '#d8d0bc'); T.poly([[6, 4.8], [11, 3.6], [11, 5.6], [6, 6.8]], '#c8bea6');
  return c;
})();

// ---- room painter
function paintCircle(T, C, rnd) {
  const { x: cx, y: cy } = C;
  T.ring(cx, cy, 38, 40.5, '#6a1616'); T.ring(cx, cy, 37, 38, '#240909');
  const oct = [];
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + Math.PI / 8; oct.push([cx + Math.cos(a) * 36, cy + Math.sin(a) * 36]); }
  T.poly(oct, '#262325');
  T.ring(cx, cy, 24.5, 32.5, '#1b191b');
  T.ring(cx, cy, 32, 33, '#8a7c58'); T.ring(cx, cy, 24, 25, '#8a7c58');
  for (let k = 0; k < 30; k++) {
    const a = k / 30 * Math.PI * 2, gx = Math.round(cx + Math.cos(a) * 28.5 - 1), gy = Math.round(cy + Math.sin(a) * 28.5 - 2);
    T.px(gx + (rnd() * 3 | 0), gy, '#cfc4a4'); T.px(gx + 1, gy + 1, '#cfc4a4'); T.px(gx + 1, gy + 2, '#cfc4a4');
    for (let i = 0; i < 3; i++) T.px(gx + (rnd() * 3 | 0), gy + (rnd() * 4 | 0), '#b8ac8c');
  }
  T.ring(cx, cy, 0, 23.5, '#2c292b');
  T.ring(cx, cy, 19, 20.5, '#5a1414');
  for (const long of [false, true]) for (let k = 0; k < 8; k++) {
    if ((k % 2 === 0) !== long) continue;
    const a = k * Math.PI / 4 - Math.PI / 2, L = long ? 22 : 14, w = long ? 4.5 : 3;
    const tip = [cx + Math.cos(a) * L, cy + Math.sin(a) * L];
    const l = [cx + Math.cos(a - Math.PI / 2) * w, cy + Math.sin(a - Math.PI / 2) * w];
    const r = [cx + Math.cos(a + Math.PI / 2) * w, cy + Math.sin(a + Math.PI / 2) * w];
    T.poly([[cx, cy], tip, l], long ? '#cfc4a4' : '#a89c7c');
    T.poly([[cx, cy], tip, r], long ? '#8a7e64' : '#6e644e');
  }
  T.ring(cx, cy, 3, 4.5, '#7a1c1c'); T.px(cx, cy, '#cfc4a4');
  for (let k = 0; k < 8; k++) {
    const a = k * Math.PI / 4, nx = cx + Math.cos(a) * 39, ny = cy + Math.sin(a) * 39;
    T.ring(nx, ny, 0, 2.2, '#8a7c58'); T.px(nx, ny, '#d8cca4');
  }
}

function paintRoom(R) {
  const c = canvas(R.w, R.h), g = c.getContext('2d'), T = pxTools(g);
  let seed = R.seed || 7; const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
  const sh = (rgb, v) => `rgb(${rgb[0] + v | 0},${rgb[1] + v | 0},${rgb[2] + v | 0})`;
  T.rect(0, 0, R.w, R.h, '#0e0c0f');

  if (R.floor === 'wood') {
    for (let y = TOPW - 4; y < R.h; y += 7) {
      let x = -(rnd() * 40 | 0);
      while (x < R.w) {
        const len = 30 + rnd() * 50 | 0, v = rnd() * 10 - 5, base = [54, 41, 33];
        T.rect(x, y, len - 1, 6, sh(base, v)); T.rect(x, y, len - 1, 1, sh(base, v + 9)); T.rect(x, y + 5, len - 1, 1, sh(base, v - 8));
        for (let i = 0; i < 3; i++) T.rect(x + rnd() * len, y + 1 + rnd() * 4, 4 + rnd() * 10 | 0, 1, sh(base, v - 6));
        T.px(x + 2, y + 3, '#1a120e'); T.px(x + len - 4, y + 3, '#1a120e');
        x += len;
      }
    }
  } else {
    for (let y = TOPW - 4; y < R.h; y += 16) for (let x = 0; x < R.w; x += 16) {
      const odd = ((x >> 4) + ((y - TOPW + 4) >> 4)) % 2, base = odd ? [50, 46, 50] : [37, 34, 38], v = rnd() * 6 - 3;
      T.rect(x, y, 16, 16, sh(base, v));
      T.rect(x, y, 16, 1, sh(base, v + 7)); T.rect(x, y, 1, 16, sh(base, v + 4));
      T.rect(x, y + 15, 16, 1, sh(base, v - 9)); T.rect(x + 15, y, 1, 16, sh(base, v - 7));
      for (let i = 0; i < 10; i++) T.px(x + 1 + rnd() * 14, y + 1 + rnd() * 14, sh(base, v + (rnd() < 0.5 ? -5 : 5)));
    }
    for (let i = 0; i < R.w * R.h / 6000; i++) {
      let x = rnd() * R.w, y = TOPW + rnd() * (R.h - TOPW), a = rnd() * 6.28;
      const n = 8 + rnd() * 24;
      for (let j = 0; j < n; j++) { T.px(x, y, '#19161a'); a += (rnd() - 0.5) * 0.9; x += Math.cos(a); y += Math.sin(a); }
    }
  }
  if (R.carpet) {
    const { x, w, y0, y1 } = R.carpet;
    T.rect(x, y0, w, y1 - y0, '#2c2326'); T.rect(x, y0, 1, y1 - y0, '#181314'); T.rect(x + w - 1, y0, 1, y1 - y0, '#181314');
    T.rect(x + 2, y0, 1, y1 - y0, '#4a2a2c'); T.rect(x + w - 3, y0, 1, y1 - y0, '#4a2a2c');
    const mx = x + w / 2 | 0;
    for (let cy = y0 + 10; cy < y1; cy += 14)
      for (let dy = -4; dy <= 4; dy++) { const dx = 4 - Math.abs(dy); T.px(mx + dx, cy + dy, '#3e3236'); T.px(mx - dx, cy + dy, '#3e3236'); }
  }
  if (R.circle) paintCircle(T, R.circle, rnd);
  for (let i = 0; i < (R.stains || 0); i++)
    splatOn(g, 30 + rnd() * (R.w - 60), TOPW + 14 + rnd() * (R.h - TOPW - 30), 5 + rnd() * 8 | 0, ['#4e0e0e', '#5e1212', '#3a0a0a'], rnd, R);

  // north wall
  T.rect(0, 0, R.w, TOPW, '#17141a');
  for (let row = 0, y = 4; y < TOPW - 4; row++, y += 6)
    for (let x = -16 + (row % 2) * 8; x < R.w; x += 16) T.rect(x, y, 15, 5, sh([36, 32, 36], rnd() * 8 - 4));
  T.rect(0, 0, R.w, 4, '#0e0c0f');
  const GLASS = ['#7a1a1a', '#a83030', '#d8d0c0', '#5a1414', '#c8b890', '#2a2a3a', '#8a2222'];
  const arch = (wx, inset, col, fn) => {
    const hw = 8 - inset;
    for (let y = 6 + inset; y < 34 - inset; y++) for (let x = wx - hw; x < wx + hw; x++) {
      const dx = x + 0.5 - wx, dy = y + 0.5 - 14;
      if (y >= 14 || dx * dx + dy * dy <= hw * hw) T.px(x, y, fn ? fn(x, y) : col);
    }
  };
  for (const wx of R.windows || []) {
    arch(wx, -1, '#5a5450');
    const cells = {};
    arch(wx, 1, null, (x, y) => {
      if ((x - wx + 16) % 3 === 0 || (y - 7) % 3 === 0) return '#120e10';
      const key = ((x - wx + 16) / 3 | 0) + ',' + ((y - 7) / 3 | 0);
      return cells[key] || (cells[key] = GLASS[rnd() * GLASS.length | 0]);
    });
    T.rect(wx - 10, 34, 20, 2, '#6e6668');
  }
  for (const nx of R.niches || []) { arch(nx, -1, '#4a4446'); arch(nx, 1, '#0d0b0d'); T.rect(nx - 10, 34, 20, 2, '#6e6668'); }
  // doorways in the north wall
  for (const ex of R.exits.filter(e => e.side === 'n')) {
    const cx = (ex.x0 + ex.x1) / 2, hw = (ex.x1 - ex.x0) / 2;
    for (let y = 2; y < TOPW; y++) for (let x = ex.x0 - 3; x < ex.x1 + 3; x++) {
      const dy = y - (4 + hw), dx = x + 0.5 - cx;
      const inFrame = y >= 4 + hw || dx * dx + dy * dy <= (hw + 3) ** 2;
      const inOpen = y >= 4 + hw || dx * dx + dy * dy <= hw * hw;
      if (inOpen) T.px(x, y, ex.veil ? '#0a0b10' : '#060506');
      else if (inFrame) T.px(x, y, '#5a5450');
    }
  }
  T.rect(0, TOPW - 4, R.w, 4, '#4a4446'); T.rect(0, TOPW - 4, R.w, 1, '#6e6668'); T.rect(0, TOPW - 1, R.w, 1, '#262224');
  for (const ex of R.exits.filter(e => e.side === 'n')) T.rect(ex.x0, TOPW - 4, ex.x1 - ex.x0, 4, ex.veil ? '#0a0b10' : '#060506');
  for (let i = 0; i < 10; i++) T.rect(0, TOPW + i, R.w, 1, `rgba(0,0,0,${0.5 - i * 0.05})`);

  // side + south walls
  for (const side of [0, 1]) {
    const x0 = side ? R.w - 16 : 0;
    T.rect(x0, TOPW - 4, 16, R.h, '#141116');
    for (let row = 0, y = TOPW; y < R.h; row++, y += 6) T.rect(x0 + (row % 2 ? 1 : 0), y, 14, 5, sh([30, 27, 31], rnd() * 6 - 3));
    T.rect(side ? x0 : x0 + 15, TOPW - 4, 1, R.h, '#3e383c');
    for (let i = 0; i < 6; i++) T.rect(side ? x0 - 1 - i : x0 + 16 + i, TOPW, 1, R.h, `rgba(0,0,0,${0.35 - i * 0.055})`);
  }
  T.rect(0, R.h - 10, R.w, 10, '#141116'); T.rect(0, R.h - 10, R.w, 1, '#3e393b');
  for (let x = 0; x < R.w; x += 12) T.rect(x, R.h - 8, 11, 3, '#211d22');
  for (const ex of R.exits.filter(e => e.side === 's')) T.rect(ex.x0, R.h - 10, ex.x1 - ex.x0, 10, '#060506');

  if (R.streak) {                                   // a long drag mark down the wall into the room
    const { x: sx, y1 } = R.streak;
    for (let y = 0; y < y1; y++) {
      const x = sx - y * 0.04 + Math.sin(y * 0.21) * 0.7, w = 2 + (rnd() < 0.35 ? 1 : 0);
      T.rect(x, y, w, 1, '#561010'); if (rnd() < 0.3) T.px(x, y, '#7a1a1a');
      if (rnd() < 0.04) T.rect(x + (rnd() < 0.5 ? -1 : w), y, 1, 2 + rnd() * 4 | 0, '#4a0c0c');
    }
  }
  return c;
}

const vignetteCanvas = (() => {
  const c = canvas(W, H), g = c.getContext('2d');
  const gr = g.createRadialGradient(W / 2, H / 2, 80, W / 2, H / 2, 290);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.75)');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  return c;
})();
const grainCanvas = (() => {
  const c = canvas(128, 128), g = c.getContext('2d');
  for (let i = 0; i < 2600; i++) {
    const v = Math.random() < 0.5 ? 0 : 255;
    g.fillStyle = `rgba(${v},${v},${v},${0.3 + Math.random() * 0.5})`;
    g.fillRect(Math.random() * 128 | 0, Math.random() * 128 | 0, 1, 1);
  }
  return c;
})();
