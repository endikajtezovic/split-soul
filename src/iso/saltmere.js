"use strict";
// ======================================================================
//  SALTMERE ART — the port town, the Cloudwater Baths, Big Ondo,
//  the steamlings and the Steamshroud. All drawn in code.
// ======================================================================

// a little pixel painter: shapes are filled through a colour function, then everything gets a dark outline
function pixPaint(w, h, draw, outline = '#1e1612') {
  const P = Array.from({ length: h }, () => new Array(w).fill(null));
  const set = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (c && x >= 0 && y >= 0 && x < w && y < h) P[y][x] = c; };
  const ell = (cx, cy, rx, ry, fn) => {                       // fn(nx, ny, x, y) with nx, ny in -1..1
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
      if (nx * nx + ny * ny <= 1) set(x, y, typeof fn === 'function' ? fn(nx, ny, x, y) : fn);
    }
  };
  const box = (x0, y0, w2, h2, fn) => { for (let y = y0; y < y0 + h2; y++) for (let x = x0; x < x0 + w2; x++) set(x, y, typeof fn === 'function' ? fn(x - x0, y - y0, x, y) : fn); };
  const poly = (pts, fn) => {
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) for (let x = Math.floor(Math.min(...xs)); x <= Math.ceil(Math.max(...xs)); x++) {
      let ins = false; const X = x + 0.5, Y = y + 0.5;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > Y) !== (yj > Y) && X < (xj - xi) * (Y - yi) / (yj - yi) + xi) ins = !ins; }
      if (ins) set(x, y, typeof fn === 'function' ? fn(x, y) : fn);
    }
  };
  draw({ set, ell, box, poly, get: (x, y) => (P[y] || [])[x] });
  const c = canvas(w, h), g = c.getContext('2d');
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let col = P[y][x];
    if (!col && outline && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => (P[y + dy] || [])[x + dx] && (P[y + dy] || [])[x + dx] !== 'skip')) col = outline;
    if (col && col !== 'skip') { g.fillStyle = col; g.fillRect(x, y, 1, 1); }
  }
  return c;
}

// ---------------------------------------------------------------- Big Ondo, keeper of the Cloudwater Baths
//  ~4x Ash: a huge, round, gentle man in an open bath robe, towel wrap, sandals, birch whisk and wooden bucket.
//  mood: 'jolly' (eyes shut, laughing), 'blank' (soul stolen: open dull eyes, slack mouth, greyed skin)
function makeOndo(mood) {
  const blank = mood === 'blank';
  const SK = blank ? ['#ccb09a', '#b8987e', '#9a7a64', '#7a5e50'] : ['#f2c094', '#dea47a', '#c08058', '#92583a'];
  const ROBE = blank ? ['#e6e2de', '#ccc6c0', '#aaa4a0', '#828080'] : ['#f8f0e2', '#e6d8c2', '#c4b298', '#968670'];
  const TOW = ['#c4c0b8', '#a6a29a', '#848078'], HAIR = ['#3e3430', '#251d1b'], MUST = '#161012';
  const BAY = [[0, 0.5], [0.75, 0.25]], dith = (l, x, y) => l + (BAY[y & 1][x & 1] - 0.375) * 0.35;
  const tone = (pal, l, x, y, d = 1) => { const v = d ? dith(l, x, y) : l; return v > 0.5 ? pal[0] : v > 0 ? pal[1] : v > -0.5 ? pal[2] : pal[3]; };
  const hy = 11 + (blank ? 1 : 0);
  return pixPaint(52, 62, ({ set, ell, box, poly }) => {
    // stubby legs + sandals
    for (const lx of [16, 30]) {
      box(lx, 50, 6, 6, (u) => (u >= 4 ? SK[2] : SK[1]));
      box(lx - 2, 56, 10, 3, (u, v) => (v === 0 ? '#3e3634' : '#24201e'));
      for (let i = 0; i < 4; i++) set(lx - 1 + i * 2, 55, SK[0]);
    }
    // the robe: round shoulders, hanging open in two long panels
    ell(26, 30, 18, 15, (nx, ny, x, y) => tone(ROBE, -nx * 0.9 - ny * 0.3 + 0.3, x, y, 0));
    poly([[9, 28], [21, 32], [17, 53], [5, 53]], (x, y) => tone(ROBE, 0.75 - (x < 7 ? 0.5 : 0) - ((x + y * 0.3) % 7 < 0.6 ? 0.5 : 0), x, y, 0));
    poly([[31, 32], [43, 28], [47, 53], [35, 53]], (x, y) => tone(ROBE, -0.15 - (x - 38) * 0.06, x, y, 0));
    // towel wrap, under the belly
    poly([[12, 40], [40, 40], [42, 52], [10, 52]], (x, y) => (y === 51 ? TOW[2] : (x * 2 + y) % 11 === 0 ? TOW[2] : x > 33 ? TOW[1] : TOW[0]));
    // the great round belly and chest
    ell(26, 33, 12.5, 13.5, (nx, ny, x, y) => {
      let c = tone(SK, -nx * 0.75 - ny * 0.45 + 0.15, x, y);
      if (ny < -0.2 && ny > -0.7 && Math.abs(nx + 0.05) < 0.4 && (x + y * 2) % 4 === 0 && hash(x, y) % 3 === 0) c = SK[3];      // chest hair
      if (ny > 0.18 && ny < 0.27 && Math.abs(nx) < 0.5) c = SK[2];                                                      // belly fold
      return c;
    });
    set(26, 39, SK[3]); set(26, 40, SK[2]);                                 // navel
    // thick lapels framing the belly
    poly([[16, 18], [21, 19], [16, 34], [13, 41], [10, 40]], (x, y) => (x + y) % 13 === 0 ? ROBE[2] : ROBE[0]);
    poly([[31, 19], [36, 18], [42, 40], [39, 41], [36, 34]], (x, y) => (x > 39 ? ROBE[2] : ROBE[1]));
    // wide sleeves hanging off round shoulders, hands peeking out
    poly([[10, 20], [2, 33], [3, 39], [11, 39], [14, 26]], (x, y) => tone(ROBE, 0.7 - (x < 5 ? 0.6 : 0) - (y > 36 ? 0.5 : 0), x, y, 0));
    poly([[42, 20], [38, 26], [41, 39], [49, 39], [50, 33]], (x, y) => tone(ROBE, -0.2 - (x > 46 ? 0.5 : 0) - (y > 36 ? 0.4 : 0), x, y, 0));
    ell(7, 41, 3, 2.6, (nx) => (nx > 0.3 ? SK[2] : SK[1]));
    ell(45, 41, 3, 2.6, (nx) => (nx > 0.1 ? SK[2] : SK[1]));
    // head: bald dome, curly dark tufts tucked behind the ears
    for (const [x, y, r] of [[16, hy - 1, 2.2], [15, hy + 2, 2.4], [16, hy + 5, 2], [36, hy - 1, 2.2], [37, hy + 2, 2.4], [36, hy + 5, 2], [18, hy - 4, 1.6], [34, hy - 4, 1.6]])
      ell(x, y, r, r, (nx, ny, px, py) => ((px + py) % 2 ? HAIR[0] : HAIR[1]));
    ell(26, hy + 1, 9, 9.5, (nx, ny, x, y) => tone(SK, -nx * 0.7 - ny * 0.55 + 0.1, x, y));
    ell(22.5, hy - 5, 2.2, 1.2, blank ? '#dccab8' : '#fff2de');               // shine on the scalp
    ell(26, hy + 8.5, 8.5, 3.2, SK[2]); ell(26, hy + 7.5, 7.5, 2.6, SK[1]);    // double chin
    ell(17.3, hy + 2, 1.3, 2.2, SK[2]); ell(34.7, hy + 2, 1.3, 2.2, SK[2]);    // ears
    if (blank) {
      for (const ex of [21, 28]) { box(ex, hy + 1, 3, 2, '#e8e4dc'); set(ex + 1, hy + 2, '#3a3436'); box(ex - 1, hy - 1, 5, 1, HAIR[1]); box(ex, hy + 3, 3, 1, SK[3]); }
    } else {
      for (const ex of [21, 28]) { set(ex, hy + 2, '#2a1a14'); set(ex + 1, hy + 1, '#2a1a14'); set(ex + 2, hy + 1, '#2a1a14'); set(ex + 3, hy + 2, '#2a1a14'); box(ex - 1, hy - 2, 5, 1, HAIR[1]); }
      ell(19.8, hy + 5, 1.8, 1.1, '#ec947c'); ell(32.2, hy + 5, 1.8, 1.1, '#ec947c');
    }
    ell(26, hy + 4, 1.7, 2, SK[2]); set(25, hy + 3, SK[0]);                  // nose
    poly([[18.5, hy + 7], [21.5, hy + 5.4], [26, hy + 5.9], [30.5, hy + 5.4], [33.5, hy + 7], [32, hy + 8.6], [28.5, hy + 7.6], [26, hy + 8], [23.5, hy + 7.6], [20, hy + 8.6]], MUST);
    if (blank) box(24, hy + 9, 5, 1, '#5a3a32');
    else { ell(26, hy + 10, 3.4, 2.1, '#5a1e1e'); box(23.5, hy + 9, 6, 1, '#f4ece0'); ell(26, hy + 11, 1.5, 0.7, '#c85a5a'); }
    // birch whisk: a leafy bundle, held up in the left hand
    if (!blank) {
      box(6, 35, 2, 8, (u) => (u ? '#5a3a20' : '#8a6a44'));
      poly([[6, 36], [0, 24], [3, 19], [8, 18], [13, 22], [9, 36]], (x, y) => { const h2 = hash(x, y) % 7; return h2 === 0 ? '#2a3e16' : h2 < 3 ? '#4a6a24' : h2 < 6 ? '#628432' : '#86a848'; });
      for (const [x, y] of [[-1, 22], [1, 18], [5, 16], [9, 17], [13, 20], [14, 24], [0, 27]]) { set(x + 1, y, '#628432'); set(x + 1, y + 1, '#4a6a24'); }
      for (let i = 0; i < 6; i++) { set(5 - i * 0.6, 34 - i * 2, '#3a5220'); set(8 + i * 0.6, 34 - i * 2, '#3a5220'); }
    }
    // wooden bucket in the right hand
    poly([[40, 42], [51, 42], [50, 53], [41, 53]], (x, y) => (y === 44 || y === 51 ? '#3a2a1c' : x % 3 === 0 ? '#6a4220' : x > 47 ? '#7a4e28' : '#a0703e'));
    box(40, 41, 12, 1, '#4a3420');
  });
}
SPR.ondo = fromCanvas(makeOndo('jolly'));
SPR.ondoBlank = fromCanvas(makeOndo('blank'));

// ---------------------------------------------------------------- townsfolk + Hana (palette swaps of Ash's frame)
SPR.hana    = person({ h: '#1a1418', H: '#2e2630', s: '#e8c4a4', S: '#c09878', c: '#2a3a6a', C: '#1c2848', l: '#e8e0d0', r: '#c8463a', R: '#8a2a24' });
SPR.netta   = person({ h: '#8a5a3a', H: '#b07a52', s: '#e0b494', c: '#5a6a4a', C: '#3e4a34', l: '#d8d0bc', r: '#3a6a8a', R: '#2a4a64' });
SPR.abel    = person({ h: '#c8c4bc', H: '#e8e4dc', s: '#d0a888', c: '#4a3a30', C: '#32261e', l: '#6a5a4a', r: '#7a6a3a', R: '#5a4a28' });
SPR.lamper  = person({ h: '#3a2a1e', H: '#5a4230', c: '#3a3a44', C: '#24242c', l: '#c8a868', r: '#2a2a30', R: '#18181c' });
SPR.watch   = person({ h: '#2a2420', H: '#4a3e34', s: '#c89a78', c: '#2a3446', C: '#1a2230', l: '#c8a868', r: '#8a2a24', R: '#5a1a16' });
SPR.docker  = person({ h: '#5a3420', H: '#7a4a2e', s: '#c08a68', c: '#6a4a2a', C: '#4a321c', l: '#8a6a44', r: '#c8c0a8', R: '#a09880' });
SPR.ondoSpirit = mk(spiritRows, { ...PAL, K: '#5a2a24', W: '#fff4ea', w: '#f8d4c0', x: '#d89a88', g: '#fff' }, '#ffc8a8');

// ---------------------------------------------------------------- ground
GROUND.cobble = (px, py, fx, fy, x, y) => {
  const r = Math.floor(fy * 3 + y * 3), u = fx * 3 + x * 3 + (r % 2) * 0.5, fu = u - Math.floor(u), fv = fy * 3 - Math.floor(fy * 3);
  if (fu < 0.13 || fv < 0.15) return '#3e3a38';
  const id = hash(Math.floor(u), r), base = ['#8e887c', '#7e786e', '#989286', '#74706a', '#86807a'][id % 5];
  return fu < 0.3 && fv < 0.45 ? '#aaa498' : fu > 0.85 || fv > 0.85 ? '#5e5a54' : base;
};
GROUND.tile = (px, py, fx, fy, x, y) => {
  const gu = (fx * 2) % 1, gv = (fy * 2) % 1;
  if (gu < 0.06 || gv < 0.06) return '#7a7064';
  const v = hash(Math.floor(x * 2 + fx * 2), Math.floor(y * 2 + fy * 2)) % 3;
  return gu < 0.2 && gv < 0.2 ? '#ddd4c2' : ['#c8bea8', '#c0b6a0', '#cec4b0'][v];
};
GROUND.hinoki = (px, py, fx, fy, x, y) => {
  const plank = Math.floor((x + fx) * 3), v = (hash(plank, Math.floor((y + fy) * 0.5 + plank * 0.37)) % 10) - 5, seam = ((x + fx) * 3) % 1 < 0.08 ? -26 : 0;
  return `rgb(${150 + v + seam},${112 + v + seam},${74 + v + seam})`;
};
GROUND.pool = (px, py, fx, fy, x, y) => {
  const P = (dx, dy) => { const c = tileAt(x + dx, y + dy); return c === '1'; };
  const eL = !P(-1, 0), eR = !P(1, 0), eT = !P(0, -1), eB = !P(0, 1);
  if ((eL && fx < 0.12) || (eR && fx > 0.88) || (eT && fy < 0.12) || (eB && fy > 0.88)) return hash(px >> 1, py >> 1) % 3 ? '#cfc6b4' : '#b0a694';
  if ((eL && fx < 0.24) || (eT && fy < 0.24)) return '#1e4a4c';
  const ripple = Math.sin(px * 0.35 + py * 0.9) + Math.sin(py * 0.5 - px * 0.12);
  return ripple > 1.5 ? '#7ac8bc' : ripple > 0.4 ? '#3e8e88' : '#347c78';
};

// ---------------------------------------------------------------- props (tile codes; see chapter4.js for the legend)
const streetLampSpr = spr(12, 44, (g, T) => {
  T.rect(5, 10, 2, 33, '#1e1c22'); T.rect(4, 40, 4, 3, '#2a2830'); T.rect(5, 10, 1, 33, '#3a3842');
  T.rect(2, 2, 8, 9, '#1e1c22'); T.rect(3, 3, 6, 7, '#ffd27a'); T.rect(3, 3, 3, 3, '#fff2c0'); T.rect(1, 1, 10, 1, '#2a2830'); T.rect(5, 0, 2, 1, '#2a2830');
});
const paperLanternSpr = spr(12, 40, (g, T) => {
  T.rect(5, 8, 2, 31, '#3a2418'); T.rect(5, 8, 1, 31, '#5a3a24'); T.rect(1, 7, 10, 1, '#3a2418');
  for (let y = 0; y < 11; y++) { const hw = Math.round(Math.sin((y + 0.5) / 11 * Math.PI) * 4.5); T.rect(6 - hw, 8 + y + 1, hw * 2, 1, y % 3 === 1 ? '#8a1a14' : '#d8402a'); }
  T.rect(4, 9, 4, 1, '#2a1610'); T.rect(4, 19, 4, 1, '#2a1610'); T.rect(5, 12, 2, 4, '#ffd080');
});
const fountainSpr = spr(52, 46, (g, T) => {
  const P = (x, y, z) => { const r = rel(x, y, z); return [26 + r[0], 30 + r[1]]; };
  for (let a = 0; a < Math.PI * 2; a += 0.02) for (let rr = 1.05; rr < 1.4; rr += 0.05) { const [x, y] = P(Math.cos(a) * rr * 0.9, Math.sin(a) * rr * 0.9, 6); T.px(x, y, Math.sin(a) > 0 ? '#9a9488' : '#c8c2b4'); }
  for (let a = 0; a < Math.PI * 2; a += 0.02) for (let rr = 0; rr < 1.05; rr += 0.05) { const [x, y] = P(Math.cos(a) * rr * 0.9, Math.sin(a) * rr * 0.9, 5); T.px(x, y, (rr * 7 + a) % 2 < 0.3 ? '#6aa8b8' : '#3a6a88'); }
  for (let a = 0; a < Math.PI; a += 0.02) for (let z = 0; z < 6; z++) { const [x, y] = P(Math.cos(a) * 1.4 * 0.9, Math.sin(a) * 1.4 * 0.9, z); T.px(x, y, z === 5 ? '#c8c2b4' : '#7a7468'); }
  T.rect(24, 8, 4, 18, '#8a8478'); T.rect(24, 8, 1, 18, '#aaa498'); T.rect(21, 7, 10, 3, '#9a9488'); T.rect(23, 2, 6, 5, '#8a8478'); T.rect(24, 1, 4, 1, '#aaa498');
  for (const [x, y] of [[19, 10], [17, 14], [33, 10], [35, 14], [26, 0]]) T.px(x, y, '#c8e8f0');
});
const stallSpr = (a1, a2) => boxSprite(1.2, 0.8, 12, '#8a6a44', (u, v) => (v > 9 ? '#5a4030' : (u % 6 < 1 ? '#4a3424' : '#7a5a3a')), '#5a4030', {
  after: (g, T, P) => {
    for (const [x, y] of [[-0.55, 0.35], [0.55, 0.35], [-0.55, -0.35], [0.55, -0.35]]) { const p = P(x, y, 12); T.rect(p[0], p[1] - 14, 1, 14, '#3a2a1c'); }
    polyFn(g, [P(-0.75, -0.55, 28), P(0.75, -0.55, 28), P(0.75, 0.6, 22), P(-0.75, 0.6, 22)], (x, y) => ((x >> 2) % 2 ? a1 : a2));
    const f = P(-0.3, 0.1, 13); for (let i = 0; i < 7; i++) T.rect(f[0] + i * 3 - 2, f[1] - 2 + (i % 2), 2, 2, ['#c8c0b0', '#8aa0b0', '#e0a040', '#a8b8c8'][i % 4]);
  } });
const STALLS = [stallSpr('#c8402e', '#ece4d4'), stallSpr('#3a6a8a', '#ece4d4'), stallSpr('#d8a030', '#7a3a2a')];
const planterSpr = boxSprite(0.8, 0.5, 8, (x, y) => ['#e85a6a', '#f4f0f0', '#f0c040', '#3e6a2a', '#5a8a3a'][hash(x, y) % 5], '#6a4a30', '#5a3e28');
const noticeSpr = spr(22, 30, (g, T) => {
  T.rect(3, 12, 2, 18, '#3a2a1c'); T.rect(17, 12, 2, 18, '#3a2a1c'); T.rect(1, 2, 20, 14, '#5a4030'); T.rect(2, 3, 18, 12, '#8a6a44');
  for (const [x, y, w, h, c] of [[3, 4, 6, 7, '#ece4d4'], [10, 4, 5, 5, '#e8d8a8'], [13, 9, 6, 5, '#ece4d4'], [4, 11, 7, 3, '#d8c8a0']]) T.rect(x, y, w, h, c);
  T.rect(1, 1, 20, 1, '#3a2a1c');
});
const stoolSpr = spr(20, 18, (g, T) => {
  T.rect(3, 8, 12, 3, '#9a6a3a'); T.rect(3, 8, 12, 1, '#b8885a'); T.rect(4, 11, 2, 5, '#6a4220'); T.rect(12, 11, 2, 5, '#6a4220');
  T.rect(13, 3, 7, 7, '#a0703e'); T.rect(13, 3, 7, 1, '#4a3420'); T.rect(13, 6, 7, 1, '#3a2a1c'); T.rect(14, 4, 5, 1, '#3e8e88');
});
const towelShelfSpr = boxSprite(0.45, 1.0, 44, '#5a4030', '#4a3424', (u, v) => {
  if (v % 11 < 2 || u < 1 || u > 14) return '#3a2818';
  return (u + (v / 11 | 0)) % 5 === 0 ? '#c8b8b0' : ['#f0e8e0', '#e8d8d0', '#d8c8e0'][hash(u >> 2, v / 11 | 0) % 3];
});
const bambooSpr = spr(20, 44, (g, T) => {
  T.rect(5, 34, 10, 9, '#6a3a2a'); T.rect(5, 34, 10, 1, '#8a5a3a');
  for (const [x, h2] of [[7, 30], [10, 34], [13, 26]]) { T.rect(x, 34 - h2, 2, h2, '#6a8a3a'); for (let y = 34 - h2; y < 34; y += 7) T.rect(x, y, 2, 1, '#4a6a2a'); }
  for (const [x, y, d] of [[3, 6, 1], [14, 4, -1], [4, 14, 1], [15, 12, -1], [6, 2, 1], [16, 20, -1]]) for (let i = 0; i < 5; i++) T.px(x + i * d * (d > 0 ? 1 : 1) * (d > 0 ? 1 : -1) * -1 + (d > 0 ? 4 : -4), y + (i >> 1), '#7aa848');
});
const counterSpr = boxSprite(2.6, 0.7, 16, (x, y) => ((x + y) % 7 === 0 ? '#7a5030' : '#9a6a3e'), (u, v) => (v > 13 ? '#4a2e1a' : u % 10 === 0 ? '#5a3a20' : '#7a4e2a'), '#5a3a20', {
  after: (g, T, P) => { const b2 = P(0.6, 0, 16); T.rect(b2[0] - 3, b2[1] - 5, 6, 5, '#c8a868'); T.rect(b2[0] - 2, b2[1] - 7, 4, 2, '#e8d090'); const p2 = P(-0.6, 0.1, 16); T.rect(p2[0] - 4, p2[1] - 3, 8, 3, '#ece4d4'); T.rect(p2[0] - 4, p2[1] - 5, 8, 2, '#d8c8e0'); } });
const bathRockSpr = spr(30, 22, (g, T) => {
  T.disc(15, 13, 8, '#4a4842'); T.disc(14, 12, 7, '#6a6860'); T.disc(12, 10, 4, '#8a887e'); T.disc(22, 15, 5, '#5a5850'); T.disc(21, 14, 3, '#7a786e'); T.px(11, 8, '#a8a69c');
});

Object.assign(PROPS, {
  '9': (o, add, sx, sy) => add(streetLampSpr, 6, 42, { tall: true, light: [sx, sy - 37, 70, '255,205,130', 0.26] }),
  '3': (o, add, sx, sy) => add(paperLanternSpr, 6, 38, { tall: true, light: [sx, sy - 24, 60, '255,120,80', 0.22] }),
  '7': (o, add, sx, sy) => add(fountainSpr, 26, 30, { tall: true }),
  '8': (o, add, sx, sy, x, y) => { const S = STALLS[hash(x, y) % 3]; add(S.img, S.ax, S.ay); },
  '*': (o, add) => add(planterSpr.img, planterSpr.ax, planterSpr.ay),
  'i': (o, add) => add(noticeSpr, 11, 28),
  '2': (o, add) => add(stoolSpr, 10, 14),
  '5': (o, add) => add(towelShelfSpr.img, towelShelfSpr.ax, towelShelfSpr.ay, { tall: true }),
  '6': (o, add) => add(bambooSpr, 10, 42, { tall: true }),
  '4': (o, add) => add(counterSpr.img, counterSpr.ax, counterSpr.ay),
  '$': (o, add) => add(bathRockSpr, 15, 16),
});

// ---------------------------------------------------------------- Saltmere houses: tall, narrow, plaster and timber, slate or red-tile roofs
BUILDERS.town = Hs => {
  const { w, d, wh = 44, rh = 20 } = Hs, ov = 0.3, rnd = rndOf(Hs.seed || 3);
  const corners = [rel(-ov, d + ov), rel(w + ov, -ov), rel(0, d / 2, wh + rh)];
  const minX = corners[0][0] - 4, maxX = corners[1][0] + 4, minY = corners[2][1] - 30, maxY = rel(w, d)[1] + 2;
  const c = canvas(Math.ceil(maxX - minX), Math.ceil(maxY - minY)), g = c.getContext('2d');
  const L = (x, y, z = 0) => { const p = rel(x, y, z); return [p[0] - minX, p[1] - minY]; };
  const [p1, p2] = Hs.plaster || ['#ddd0ae', '#cfc2a0'], beam = Hs.beam || '#3a2a1e';
  const stone = stoneTex(Hs.stone || ['#7a7a86', '#6c6c78', '#868692', '#727280'], '#3e3e48');
  const plaster = (u, v) => (hash(u, v) % 9 === 0 ? p2 : p1);
  const win = (wu, wv, ww, wh2) => Hs.dark ? ((wu === 0 || wu === ww - 1 || wv === 0 || wv === wh2 - 1) ? beam : (wv % 3 === 0 ? '#1a1614' : '#3a3430')) : (wu === 0 || wu === ww - 1 || wv === 0 || wv === wh2 - 1 || wu === (ww / 2 | 0) || wv === (wh2 / 2 | 0)) ? beam : wv > wh2 / 2 ? '#f6d080' : '#e8a850';
  const shut = (wu, wv) => (Hs.shutter ? (wv % 3 === 0 ? '#1e1a18' : Hs.shutter) : null);
  const box2 = (wu, wv) => wv === 1 ? ['#e85a6a', '#f4f0f0', '#e888b0', '#3e6a2a'][hash(wu, 3) % 4] : '#6a3a22';
  const door = (wu, wv, dw, dh) => {
    if (wv >= dh - 3 && (wu < 1 || wu > dw - 2)) return null;
    if (wu === 0 || wu === dw - 1 || wv === dh - 1) return '#2a2a22';
    if (Hs.boarded && (Math.abs(wv - 6 - wu * 0.9) < 1 || Math.abs(wv - 14 + wu * 0.9) < 1 || wv === 17)) return '#8a6a44';
    if (wu === dw - 3 && wv === 9 && !Hs.boarded) return '#e0c070';
    if (Hs.boarded) return wu % 3 === 0 ? '#1e1a18' : '#2e2824';
    return wu % 3 === 0 ? Hs.doorCol2 || '#5a2e22' : Hs.doorCol || '#7a3e2c';
  };
  const lights = [];
  const openings = (len, face2) => {
    const list = [], n = Math.floor(len / 16);
    for (let k = 0; k < n; k++) {
      const u = k * 16 + 3, isDoor = face2 === 'front' && Hs.door === k;
      if (isDoor) list.push({ u: u - 1, v: 0, w: 12, h: 21, tex: door });
      else if (Hs.shop && face2 === 'front') { list.push({ u: u - 1, v: 4, w: 12, h: 14, tex: win }); }
      else { list.push({ u, v: 18, w: 9, h: 10, tex: win }); list.push({ u: u - 1, v: 16, w: 11, h: 2, tex: box2 }); if (Hs.shutter) { list.push({ u: u - 3, v: 18, w: 2, h: 10, tex: shut }); list.push({ u: u + 10, v: 18, w: 2, h: 10, tex: shut }); } }
      if (wh > 52) { list.push({ u, v: 38, w: 9, h: 9, tex: win }); if (Hs.shutter) { list.push({ u: u - 3, v: 38, w: 2, h: 9, tex: shut }); list.push({ u: u + 10, v: 38, w: 2, h: 9, tex: shut }); } }
      if (!isDoor && !Hs.dark && rnd() < 0.8) lights.push(face2 === 'front' ? [(u + 4) / 16, d, 24] : [w, d - (u + 4) / 16, 24]);
    }
    return list;
  };
  const wallTex = ops => (u, v) => {
    for (const o of ops) if (u >= o.u && u < o.u + o.w && v >= o.v && v < o.v + o.h) { const r = o.tex(u - o.u, v - o.v, o.w, o.h); if (r !== null) return r; }
    if (v < 13) return stone(u, v);
    if (v < 15 || v >= wh - 2 || (Hs.timber && u % 16 < 2)) return beam;
    if (Hs.timber && v === 34) return beam;
    return plaster(u, v);
  };
  const lenF = Math.round(w * 16 + 0.5), lenR = Math.round(d * 16 + 0.5);
  face(g, L(0, d), L(w, d), wh, wallTex(openings(lenF, 'front')));
  face(g, L(w, d), L(w, 0), wh, wallTex(openings(lenR, 'side')), 0.2);
  // awning over a shop front
  if (Hs.awning) {
    const [a1, a2] = Hs.awning, A1 = L(0.1, d, 30), A2 = L(w - 0.1, d, 30), B1 = L(0.1, d + 0.7, 22), B2 = L(w - 0.1, d + 0.7, 22);
    polyFn(g, [A1, A2, B2, B1], (x, y) => (((x - A1[0]) >> 3) % 2 ? a1 : a2));
    for (let x = Math.round(B1[0]); x < B2[0]; x++) { const y = Math.round(B1[1] + (B2[1] - B1[1]) * (x - B1[0]) / (B2[0] - B1[0])); g.fillStyle = ((x - A1[0]) >> 3) % 2 ? a1 : a2; g.fillRect(x, y, 1, 2 + (x % 8 < 4 ? 1 : 0)); }
  }
  if (Hs.sign) { const S = L(Hs.door + 1.15, d + 0.05, 34); const T2 = pxTools(g); T2.rect(S[0] - 1, S[1] - 2, 9, 1, '#2a2018'); T2.rect(S[0], S[1], 8, 7, '#3a2a1c'); T2.rect(S[0] + 1, S[1] + 1, 6, 5, Hs.sign); }
  // gable + roof
  const gC = L(w, d, wh), gB = L(w, 0, wh), gR = L(w, d / 2, wh + rh);
  polyFn(g, [gC, gB, gR], (x, y) => (Math.abs(x - gR[0]) < 1 || (y - Math.round(gR[1])) % 9 === 0) ? beam : p2);
  const R1 = L(-ov, d / 2, wh + rh), R2 = L(w + ov, d / 2, wh + rh);
  const E1 = L(-ov, d + ov, wh - 3), E2 = L(w + ov, d + ov, wh - 3), F1 = L(-ov, -ov, wh - 3), F2 = L(w + ov, -ov, wh - 3);
  const RP = Hs.roof || ['#5a6c90', '#6276a0', '#566890'];
  const tiles = (lx, ly, pal) => (x, y) => {
    const dd = ly + (x - lx) * 0.5 - y, row = Math.floor(dd / 3);
    if (dd % 3 < 1) return Hs.roofLine || '#283044';
    if ((x + row * 3) % 6 === 0) return Hs.roofLine || '#323c54';
    return pal[hash(x / 6 | 0, row) % pal.length];
  };
  polyFn(g, [F1, F2, R2, R1], tiles(F1[0], F1[1], RP));
  if (Hs.chimney !== false) {
    const cx0 = Hs.chimney ?? 0.6, cy0 = 0.4, zb = wh + 6, zt = wh + rh + 10;
    const brick = (u, v) => (v % 4 === 3 || (u + ((v / 4 | 0) % 2) * 3) % 6 === 0) ? '#4a2a20' : '#8a4e3a';
    face(g, L(cx0, cy0 + 0.5, zb), L(cx0 + 0.5, cy0 + 0.5, zb), zt - zb, brick); face(g, L(cx0 + 0.5, cy0 + 0.5, zb), L(cx0 + 0.5, cy0, zb), zt - zb, brick, 0.22);
    polyFn(g, [L(cx0, cy0, zt), L(cx0 + 0.5, cy0, zt), L(cx0 + 0.5, cy0 + 0.5, zt), L(cx0, cy0 + 0.5, zt)], () => '#2a2422');
    Hs._chim = [cx0 + 0.25, cy0 + 0.25, zt];
  }
  polyFn(g, [R1, R2, E2, E1], tiles(E1[0], E1[1], RP.map(cc => cc)));
  line(g, E1[0], E1[1], E2[0], E2[1], '#1e1a20'); line(g, R1[0], R1[1], R2[0], R2[1], Hs.ridge || '#7a8aa8');
  line(g, R2[0], R2[1], E2[0], E2[1], '#2a2018'); line(g, R2[0], R2[1], F2[0], F2[1], '#2a2018');
  return { img: c, ox: minX, oy: minY, windows: lights, chimney: Hs._chim };
};

// ---------------------------------------------------------------- the Cloudwater Baths: dark timber, paper windows, a deep tiled roof with upswept eaves
BUILDERS.bath = Hs => {
  const { w, d } = Hs, wh = 46, rh = 30, ov = 0.75;
  const minX = rel(-ov, d + ov)[0] - 8, maxX = rel(w + ov, -ov)[0] + 8, minY = rel(0, d / 2, wh + rh)[1] - 60, maxY = rel(w, d)[1] + 2;
  const c = canvas(Math.ceil(maxX - minX), Math.ceil(maxY - minY)), g = c.getContext('2d'), T = pxTools(g);
  const L = (x, y, z = 0) => { const p = rel(x, y, z); return [p[0] - minX, p[1] - minY]; };
  const doorU = Math.round(Hs.door * 16);
  const shoji = (u, v) => { if (u % 6 === 0 || v % 6 === 0) return '#3a2418'; return v > 9 ? '#f8dca0' : '#f0c878'; };
  const noren = (u, v, dw, dh) => {
    if (v < 8) return '#06050a';
    if (u % 9 === 0 && v < dh - 2) return '#06050a';
    const cx = (dw / 2) | 0, steam = v > 12 && v < 22 && Math.abs(u - cx - Math.round(Math.sin(v * 0.7) * 2)) < 1 && [cx - 5, cx, cx + 5].length;
    if ((Math.abs(u - (cx - 5) - Math.round(Math.sin(v * 0.8) * 1.5)) < 1 || Math.abs(u - cx - Math.round(Math.sin(v * 0.8 + 1) * 1.5)) < 1 || Math.abs(u - (cx + 5) - Math.round(Math.sin(v * 0.8 + 2) * 1.5)) < 1) && v > 11 && v < 21) return '#ece4d4';
    return v > dh - 3 ? '#1a2244' : '#26326a';
  };
  const wallTex = side => (u, v) => {
    if (side === 'F' && u >= doorU - 12 && u < doorU + 12 && v < 26) return noren(u - doorU + 12, 25 - v, 24, 26) || '#06050a';
    if (side === 'F' && u >= doorU - 14 && u < doorU + 14 && v < 28) return '#2a1810';
    if (v < 16) return v % 4 === 0 ? '#1e120c' : (u % 24 < 1 ? '#1e120c' : ['#4a2e1c', '#42281a', '#523422'][hash(u >> 3, v >> 2) % 3]);
    if (v < 18 || v > wh - 4 || u % 24 < 2) return '#2a1810';
    const wu = u % 24 - 4, wv = v - 21;
    if (wu >= 0 && wu < 17 && wv >= 0 && wv < 19) return shoji(wu, wv);
    return hash(u, v) % 11 === 0 ? '#d8ccb0' : '#e6dcc4';
  };
  face(g, L(0, d), L(w, d), wh, wallTex('F'));
  face(g, L(w, d), L(w, 0), wh, wallTex('R'), 0.2);
  // big sign board over the door
  const sb = L(Hs.door, d + 0.02, wh - 4);
  T.rect(sb[0] - 18, sb[1] - 4, 36, 11, '#2a1810'); T.rect(sb[0] - 17, sb[1] - 3, 34, 9, '#4a2a18');
  for (let k = -1; k <= 1; k++) for (let i = 0; i < 7; i++) T.px(sb[0] + k * 8 + Math.round(Math.sin(i * 0.9 + k) * 1.2), sb[1] - 2 + i, '#e8c060');
  // the roof: a hip roof of dark ribbed tiles, eaves sweeping up at the corners
  const zE = wh - 2, zR = wh + rh;
  const E = [L(-ov, d + ov, zE), L(w + ov, d + ov, zE), L(w + ov, -ov, zE), L(-ov, -ov, zE)];
  const Rr = [L(0.9, d / 2, zR), L(w - 0.9, d / 2, zR)];
  const ribs = (x, y) => (((x + 400) >> 1) % 3 === 0 ? '#1e2230' : (y % 6 === 0 ? '#262a3a' : ((x + 400) >> 1) % 3 === 1 ? '#4a5064' : '#3a4054'));
  polyFn(g, [E[3], E[2], Rr[1], Rr[0]], ribs);
  polyFn(g, [E[1], E[2], Rr[1]], (x, y) => (ribs(x, y) === '#4a5064' ? '#363c4e' : '#2a2e3e'));
  polyFn(g, [E[0], E[1], Rr[1], Rr[0]], ribs);
  // upswept eave corners + ridge with end ornaments
  for (const p of [E[0], E[1], E[2]]) { T.rect(p[0] - 2, p[1] - 4, 4, 2, '#1e2230'); T.px(p[0] + (p === E[0] ? -3 : 2), p[1] - 6, '#1e2230'); }
  line(g, E[0][0], E[0][1], E[1][0], E[1][1], '#14161e'); line(g, E[1][0], E[1][1], E[2][0], E[2][1], '#14161e');
  for (let k = 0; k < 3; k++) line(g, Rr[0][0], Rr[0][1] - k, Rr[1][0], Rr[1][1] - k, k === 2 ? '#5a6278' : '#1e2230');
  for (const p of Rr) { T.rect(p[0] - 2, p[1] - 8, 4, 6, '#1e2230'); T.rect(p[0] - 1, p[1] - 9, 3, 1, '#5a6278'); }
  // tall brick chimney for the boilers, behind
  const ch = [w - 1.2, 0.8], zb = zR - 18, zt = zR + 30, brick = (u, v) => (v % 4 === 3 || (u + ((v / 4 | 0) % 2) * 3) % 6 === 0) ? '#3a2018' : '#7a3e2e';
  face(g, L(ch[0], ch[1] + 0.6, zb), L(ch[0] + 0.6, ch[1] + 0.6, zb), zt - zb, brick); face(g, L(ch[0] + 0.6, ch[1] + 0.6, zb), L(ch[0] + 0.6, ch[1], zb), zt - zb, brick, 0.22);
  polyFn(g, [L(ch[0], ch[1], zt), L(ch[0] + 0.6, ch[1], zt), L(ch[0] + 0.6, ch[1] + 0.6, zt), L(ch[0], ch[1] + 0.6, zt)], () => '#1a1210');
  // red paper lanterns hanging either side of the door
  for (const k of [-1, 1]) {
    const p = L(Hs.door + k * 1.05, d + 0.15, 30);
    T.rect(p[0], p[1] - 4, 1, 4, '#2a1810');
    for (let y = 0; y < 9; y++) { const hw = Math.round(Math.sin((y + 0.5) / 9 * Math.PI) * 4); T.rect(p[0] - hw, p[1] + y, hw * 2 + 1, 1, y % 3 === 1 ? '#8a1a14' : '#e0482e'); }
    T.rect(p[0] - 1, p[1] + 3, 3, 3, '#ffd080');
  }
  const wins = [];
  for (let k = 0; k < Math.floor(w * 16 / 24); k++) wins.push([(k * 24 + 12) / 16, d, 30, 40, 0.22]);
  for (let k = 0; k < Math.floor(d * 16 / 24); k++) wins.push([w, d - (k * 24 + 12) / 16, 30, 40, 0.22]);
  wins.push([Hs.door - 1.05, d + 0.15, 26, 46, 0.3], [Hs.door + 1.05, d + 0.15, 26, 46, 0.3]);
  return { img: c, ox: minX, oy: minY, windows: wins, chimneys: [[ch[0] + 0.3, ch[1] + 0.3, zt]] };
};

// ---------------------------------------------------------------- steamlings: little lost souls made of bath steam
//  calm: pale, soft, hollow-eyed.  angry (winding up to burst): flushed pink-red, eyes narrowed.
function makeSteamling(angry, bob) {
  const C = angry ? ['#fff0ee', '#f8c0b8', '#e08078', '#a84850'] : ['#ffffff', '#dce8ee', '#a8bccc', '#7a8ea4'];
  return pixPaint(20, 20, ({ ell, set, box }) => {
    const y0 = bob ? 1 : 0;
    for (const [x, y, r] of [[6, 11, 4.5], [14, 11, 4.5], [10, 7, 6], [10, 13, 5.5], [4, 15, 3], [16, 15, 3]])
      ell(x, y + y0, r, r * 0.9, (nx, ny) => { const l = -nx * 0.5 - ny * 0.8; return l > 0.5 ? C[0] : l > -0.1 ? C[1] : l > -0.6 ? C[2] : C[3]; });
    if (angry) { box(6, 8 + y0, 3, 1, '#2a0e14'); box(12, 8 + y0, 3, 1, '#2a0e14'); set(7, 9 + y0, '#ff3a2a'); set(13, 9 + y0, '#ff3a2a'); ell(10, 13 + y0, 2, 1.6, '#2a0e14'); }
    else { ell(7.5, 9 + y0, 1.3, 1.6, '#3a4656'); ell(12.5, 9 + y0, 1.3, 1.6, '#3a4656'); ell(10, 13.5 + y0, 1, 1.2, '#3a4656'); }
  }, angry ? '#6a2a34' : '#4a5a6e');
}
const STEAMLING = [makeSteamling(false, 0), makeSteamling(false, 1), makeSteamling(true, 0), makeSteamling(true, 1)];

// ---------------------------------------------------------------- the Steamshroud: Big Ondo's soul, gone sour, become a vast wet bath towel
const SHROUD = (() => {
  const TW = ['#f4e8ea', '#dcc6cc', '#b496a4', '#7e6274'], STR = ['#c0343c', '#7a1e28'];
  const img = pixPaint(66, 88, ({ ell, poly, set, box, get }) => {
    // twisted, wrung-out arms, drooping and dripping
    for (const sd of [-1, 1]) for (let i = 0; i < 40; i++) {
      const k = i / 39, x = 33 + sd * (13 + k * 17), y = 32 + k * 30 + Math.sin(k * 2.6) * 3, r = 2.8 - k * 1.3;
      ell(x, y, r, r, (nx, ny, px, py) => { const q = ((py * 2 + px * sd) >> 1) % 3; return q === 0 ? TW[3] : q === 1 ? TW[2] : TW[1]; });
    }
    // the drape: one great towel thrown over something huge, pooling into a wavy, dripping hem
    poly([[18, 14], [48, 14], [55, 42], [61, 78], [5, 78], [11, 42]], (x, y) => {
      const fold = Math.sin(x * 0.5 + Math.sin(y * 0.07) * 2.2);
      let c = fold > 0.75 ? TW[0] : fold > -0.2 ? TW[1] : fold > -0.8 ? TW[2] : TW[3];
      if (x > 51 || x < 9) c = fold > 0 ? TW[2] : TW[3];
      if (y > 64 && y < 67) c = STR[0]; if (y === 67) c = STR[1];
      if (y > 70 && y < 72) c = STR[0];
      if (hash(x, y) % 17 === 0 && c !== STR[0]) c = TW[2];
      return c;
    });
    for (let x = 5; x < 61; x++) { const h2 = 78 + Math.round(Math.sin(x * 0.7) * 2 + (hash(x, 9) % 3 === 0 ? 3 : 0)); for (let y = 76; y <= h2; y++) set(x, y, y > h2 - 1 ? TW[3] : TW[2]); }
    // the rounded top, where the towel falls over a head that isn't there
    ell(33, 19, 16, 12, (nx, ny) => { const l = -nx * 0.5 - ny * 0.8; return l > 0.45 ? TW[0] : l > -0.25 ? TW[1] : TW[2]; });
    // a folded edge sagging across the brow, striped like a bath towel
    poly([[15, 22], [33, 25], [51, 21], [52, 27], [33, 31], [14, 28]], (x, y) => { const m = y - (22 + Math.abs(x - 33) * -0.12 + 3); return m < -1.5 ? TW[0] : m < -0.5 ? STR[0] : m < 0.5 ? STR[1] : TW[2]; });
    // the dark under the fold, where a face should be
    poly([[23, 30], [33, 32], [43, 30], [41, 38], [33, 42], [25, 38]], (x, y) => (y < 33 ? '#2a1620' : '#140810'));
    // drips
    for (const [x, y] of [[10, 82], [22, 84], [41, 83], [53, 82], [30, 85]]) { set(x, y, '#c8dce8'); set(x, y + 1, '#8aa8c0'); }
  }, '#2a1420');
  // a red silhouette for the possession aura
  const aura = canvas(img.width, img.height), ag = aura.getContext('2d');
  ag.drawImage(img, 0, 0); ag.globalCompositeOperation = 'source-in'; ag.fillStyle = '#ff3020'; ag.fillRect(0, 0, img.width, img.height);
  const white = canvas(img.width, img.height), wg = white.getContext('2d');
  wg.drawImage(img, 0, 0); wg.globalCompositeOperation = 'source-in'; wg.fillStyle = '#ffffff'; wg.fillRect(0, 0, img.width, img.height);
  return { img, aura, white, w: img.width, h: img.height };
})();
// billowing: each row of the towel sways a little, more toward the hem
function drawShroud(e, x, y, alpha, flash) {
  const S = SHROUD, top = Math.round(y - S.h - 6 + Math.sin(e.anim * 0.05) * 2), left = Math.round(x - S.w / 2);
  const twist = e.phase === 'wring' ? e.glow : 0;
  ctx.save();
  for (const [img, a, offs] of [[S.aura, 0.35 * alpha, [[-2, 0], [2, 0], [0, -2], [0, 2]]], [flash ? S.white : S.img, alpha, [[0, 0]]]]) {
    ctx.globalAlpha = a;
    for (const [ox, oy] of offs) for (let r = 0; r < S.h; r++) {
      const k = r / S.h, dx = Math.round(Math.sin(t * 0.06 + r * 0.12) * k * 2.5 + Math.sin(r * 0.3 + t * 0.4) * twist * 3 * k);
      ctx.drawImage(img, 0, r, S.w, 1, left + dx + ox, top + r + oy, S.w, 1);
    }
  }
  ctx.restore();
  return top;
}
