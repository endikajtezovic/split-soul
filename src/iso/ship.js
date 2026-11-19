"use strict";
// ======================================================================
//  SHIP ART — the harbour, the steamship Merrow, its crew and its ghosts.
// ======================================================================

// ---------------------------------------------------------------- people (palette swaps of Ash's frame)
const person = pal => mk([...ashTop, ...LEGS[0]], { ...PAL, ...pal });
SPR.odile   = person({ h: '#7a3a22', H: '#a8562e', c: '#2a3a5a', C: '#1e2a44', l: '#3e5078', r: '#c84a3a', R: '#8a2a2a' });
SPR.pellow  = person({ h: '#6a5a4a', H: '#8a7a68', s: '#e0b8a0', c: '#8a7a3a', C: '#6a5a2a', l: '#a8984a', r: '#4a6a3a', R: '#2e4a26' });
SPR.mate    = person({ h: '#1e1c1c', H: '#3a3634', s: '#c89a78', S: '#94684e', c: '#2a2e3a', C: '#1a1e28', l: '#c8a868', r: '#e8e4d8', R: '#b8b4a8' });
SPR.captain = person({ h: '#d8d4cc', H: '#f0ece4', c: '#1e2a44', C: '#121a2e', l: '#c8a868', r: '#e8e4d8', R: '#b8b4a8' });
SPR.captainLie = mk(lieRows, { ...PAL, h: '#d8d4cc', H: '#f0ece4', c: '#1e2a44', C: '#121a2e', l: '#c8a868', r: '#e8e4d8', R: '#b8b4a8' });

// ---------------------------------------------------------------- the drowned (soul shades in sailors' caps, brine-soaked hollows)
const DROWNED = { ...PAL, v: '#173232', V: '#2a4c4a', m: '#c4e4dc', M: '#7aa8a0', n: '#dcd8cc', N: '#2a3a5a' };
SPR.sailor = mk([
  '....nnnnnn....', '...nnnnnnnn...', '..NNNNNNNNNN..',
  '...kVvvvvVk...', '..kVvmmmmvVk..', '..kVmkmmkmVk..', '..kVmmmmmmVk..',
  '..kVvmkkmvVk..', '...kVvmmvVk...', '..kVnNnNnNVk..', '.kVvNnNnNnvVk.', '.kVvnNnNnNvVk.', 'kVvvvvvvvvvvVk',
  'kVvvvvvvvvvvVk', '.kVvvvvvvvvVk.', '.kVv.vvvv.vVk.', '..kv.vv.vv.k..', '..v..v..v..v..', '.v...v...v....'], DROWNED);
const BILGE = { ...PAL, z: '#5a7a68', Z: '#3a5446', t: '#1e2e28', T: '#2e4038', E: '#7af0d0' };
SPR.bilge = [
  mk([...hollowTop, '..kztk.kzk..', '..kzk..kzk..', '..kZk...kZk.', '.kkk....kkk.'], BILGE),
  mk([...hollowTop, '...kzkkzk...', '...kzk.kzk..', '..kZk..kZk..', '..kkk..kkk..'], BILGE),
];

// ---------------------------------------------------------------- deck + harbour props
const funnelSpr = spr(22, 72, (g, T) => {
  const r = 9, base = 66, top = 6;
  for (let x = -r; x <= r; x++) {
    const k = (x + r) / (2 * r), e = Math.sqrt(1 - (x / r) ** 2) * r * 0.5;
    const red = k < 0.25 ? '#e8b85a' : k < 0.7 ? '#d09a38' : '#9a6a1c', blk = k < 0.25 ? '#3a3236' : k < 0.7 ? '#241e22' : '#16121a';
    for (let y = Math.round(top + e); y <= Math.round(base + e); y++) {
      const v = y - top;
      T.px(11 + x, y, v < 12 ? blk : red);
    }
  }
  for (let x = -r; x <= r; x++) { const e = Math.sqrt(1 - (x / r) ** 2) * r * 0.5; T.px(11 + x, Math.round(top - e), '#3a3236'); T.px(11 + x, Math.round(top + e), '#3a3236'); for (let y = Math.round(top - e) + 1; y < Math.round(top + e); y++) T.px(11 + x, y, '#0a080c'); }
});
const crateSpr = boxSprite(0.7, 0.7, 14, (x, y) => (x + y) % 5 === 0 ? '#8a6438' : '#a07a4a',
  (u, v) => (u < 1 || u > 9 || v < 1 || v > 12 || v === 7) ? '#5a4024' : (u % 4 === 0 ? '#7a5a34' : '#8e6a3e'),
  (u, v) => (u < 1 || u > 9 || v < 1 || v > 12 || v === 7) ? '#4a3420' : (u % 4 === 0 ? '#6a4c2c' : '#7a5a34'));
const barrelSpr = spr(14, 20, (g, T) => {
  for (let x = -5; x <= 5; x++) {
    const k = (x + 5) / 10, e = Math.sqrt(1 - (x / 5.5) ** 2) * 2.5;
    for (let y = Math.round(4 + e); y <= Math.round(16 + e); y++) T.px(7 + x, y, (y - 4 === 3 || y - 4 === 10) ? '#3a3236' : k < 0.3 ? '#9a6a3a' : k < 0.75 ? '#7a5228' : '#5a3a1c');
  }
  T.disc(7, 4, 5, '#6a4a28', 0.5); T.disc(7, 4, 3, '#5a3e22', 0.5);
});
const bollardSpr = spr(10, 14, (g, T) => {
  T.rect(2, 5, 6, 8, '#2a2a30'); T.rect(2, 5, 2, 8, '#4a4a52'); T.disc(5, 4, 4, '#3a3a42', 0.5); T.disc(5, 4, 2, '#5a5a62', 0.5);
});
const wheelSpr = spr(24, 34, (g, T) => {
  T.rect(11, 16, 3, 18, '#5a4024'); T.rect(11, 16, 1, 18, '#7a5a34'); T.rect(8, 31, 9, 3, '#4a3420');
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; line(g, 12, 13, 12 + Math.cos(a) * 11, 13 + Math.sin(a) * 11, '#8a6a42'); T.rect(12 + Math.cos(a) * 11 - 1, 13 + Math.sin(a) * 11 - 1, 2, 2, '#c8a868'); }
  T.ring(12, 13, 7, 8, '#6a4c2c'); T.disc(12, 13, 2, '#c8a868');
});
const mastSpr = spr(40, 110, (g, T) => {
  T.rect(19, 4, 3, 106, '#5a4024'); T.rect(19, 4, 1, 106, '#7a5a34');
  T.rect(4, 22, 32, 2, '#4a3420'); T.rect(8, 50, 24, 2, '#4a3420');
  line(g, 4, 23, 19, 108, '#2a2420'); line(g, 36, 23, 21, 108, '#2a2420');
  T.rect(17, 0, 7, 4, '#3a2a1a');
  T.rect(22, 62, 4, 6, '#2a2420'); T.rect(23, 63, 2, 4, '#ffc860');
});
const lifeboatSpr = spr(64, 58, (g, T) => {
  const ox = 32, oy = 30, P = (x, y, z) => { const r = rel(x, y, z); return [ox + r[0], oy + r[1]]; };
  const hw = y => 0.55 * Math.sqrt(Math.max(0, 1 - (y / 1.15) ** 2)), Z = 20;
  for (const yy of [-0.8, 0.8]) { const a = P(0.7, yy, 0), b2 = P(0.7, yy, Z + 10), c2 = P(0.15, yy, Z + 10); line(g, a[0], a[1], b2[0], b2[1], '#2a2a30'); line(g, b2[0], b2[1], c2[0], c2[1], '#2a2a30'); line(g, c2[0], c2[1], c2[0], c2[1] + 8, '#5a5a62'); }
  const N = 24, top = [], bot = [], rim = [];
  for (let i = 0; i <= N; i++) { const y = -1.15 + 2.3 * i / N; top.push(P(hw(y), y, Z)); bot.push(P(hw(y) * 0.45, y, Z - 9)); rim.push(P(-hw(y), y, Z)); }
  polyFn(g, [...top, ...bot.slice().reverse()], (x, y) => { const p0 = top[0]; const d = y - (p0[1] + (x - p0[0]) * -0.5); return Math.abs(((y - x * -0.5) % 9 + 9) % 9 - 4) < 1 ? '#3a5a8a' : '#e8e4d8'; });
  polyFn(g, [...top.slice().reverse(), ...rim], (x, y) => ((x + 2 * y) % 7 === 0 ? '#5a4024' : '#8a6a48'));
  for (const yy of [-0.45, 0.1, 0.6]) { const a = P(hw(yy), yy, Z), b2 = P(-hw(yy), yy, Z); line(g, a[0], a[1] + 1, b2[0], b2[1] + 1, '#5a4024'); }
  for (let i = 0; i < N; i++) { const p = top[i], q = rim[i]; T.px(p[0], p[1], '#f4f0e8'); T.px(q[0], q[1], '#6a4c2c'); }
  const tarp = P(0, -0.2, Z + 2); T.rect(tarp[0] - 5, tarp[1] - 1, 10, 3, '#6a7a5a');
});

// ---------------------------------------------------------------- engine-room props
const boilerSpr = spr(36, 70, (g, T) => {
  const r = 15, base = 62, top = 10;
  for (let x = -r; x <= r; x++) {
    const k = (x + r) / (2 * r), e = Math.sqrt(1 - (x / r) ** 2) * r * 0.5;
    for (let y = Math.round(top + e); y <= Math.round(base + e); y++) {
      const v = y - top, rivet = (v % 12 === 0 && x % 3 === 0);
      T.px(18 + x, y, rivet ? '#8a8a92' : v % 12 === 0 ? '#2a2a30' : k < 0.25 ? '#5e5e68' : k < 0.7 ? '#46464e' : '#2e2e36');
    }
  }
  T.disc(18, top, r, '#3a3a42', 0.5); T.disc(18, top, r - 3, '#2a2a30', 0.5);
  T.rect(15, 0, 6, top, '#9a6a3a'); T.rect(15, 0, 2, top, '#c08a50');           // copper flue
  T.rect(11, 46, 12, 12, '#1a1416'); T.rect(12, 47, 10, 10, '#ff8a30'); T.rect(13, 49, 8, 7, '#ffd070');  // furnace door
  for (let x = 12; x < 22; x += 2) T.rect(x, 47, 1, 10, '#3a1a10');
  T.disc(26, 30, 3, '#c8a868'); T.disc(26, 30, 2, '#f0ece0'); T.px(27, 29, '#c83020');                 // pressure gauge
});
const pipesSpr = spr(20, 92, (g, T) => {
  for (const [x, w, c1, c2] of [[2, 4, '#c08a50', '#7a5228'], [8, 3, '#a87440', '#6a4420'], [13, 5, '#c89458', '#8a5a2e']]) {
    T.rect(x, 0, w, 92, c2); T.rect(x, 0, 1, 92, c1);
    for (let y = 10; y < 92; y += 26) T.rect(x - 1, y, w + 2, 2, '#5a3a1c');
  }
});
function drawValve(x, y, open) {
  ctx.fillStyle = '#7a5228'; ctx.fillRect(x - 1, y - 30, 3, 30); ctx.fillStyle = '#c08a50'; ctx.fillRect(x - 1, y - 30, 1, 30);
  ctx.fillStyle = '#5a3a1c'; ctx.fillRect(x - 3, y - 18, 7, 3);
  ctx.fillStyle = open ? '#4a8a4a' : '#a83228';
  for (let k = 0; k < 22; k++) { const a = k / 22 * Math.PI * 2; ctx.fillRect(Math.round(x + Math.cos(a) * 7), Math.round(y - 18 + Math.sin(a) * 7), 2, 2); }
  for (let k = 0; k < 3; k++) { const a = k * Math.PI * 2 / 3 + (open ? 1 : 0); for (let r = 1; r < 7; r++) ctx.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y - 18 + Math.sin(a) * r), 1, 1); }
  ctx.fillStyle = '#c8a868'; ctx.fillRect(x - 1, y - 19, 2, 2);
  ctx.fillStyle = open ? '#9fe09f' : (t % 30 < 15 ? '#ff5030' : '#a02010'); ctx.fillRect(x + 4, y - 27, 2, 2);
}


// ======================================================================
//  THE MERROW LINE — liner livery: black hull, brass portholes, red waterline,
//  white rail stripe, white superstructure, buff funnels with black tops.
// ======================================================================
const LIV = { hull: '#17171d', hull2: '#1d1d25', seam: '#0d0d12', red: '#8a2418', white: '#ece8dc', white2: '#cfcabd', brass: '#c09048', glow: '#ffd27a', teak: '#a8865c' };
const porthole = (du, dv, r = 2.2) => { const d = Math.hypot(du, dv); return d > r ? null : d > r - 0.9 ? LIV.brass : (du < 0 && dv < 0 ? '#fff2c0' : LIV.glow); };
// hull plating seen from the side; v = 0 at the waterline
const hullTex = (h, rows = 1) => (u, v) => {
  if (v < 3) return v === 2 ? '#5a1810' : '#8a2418';
  if (v === h - 1) return '#ece8dc';
  if (v === h - 2) return '#9a968c';
  const big = h >= 30;
  for (let r = 0; r < rows; r++) {
    if (big) { const row = h - 10 - r * 9, cu = ((u + r * 7) % 14 + 14) % 14, cv = v - row; if (cu < 3 && cv >= 0 && cv < 3) return (cu !== 1 && cv !== 1) ? '#7a5a2a' : (cu === 1 && cv === 1 ? '#ffe9a8' : '#f0b850'); }
    else { const row = h - 8 - r * 6; if ((v === row || v === row + 1) && ((u + r * 4) % 9 + 9) % 9 < 2) return v === row ? '#ffe9a8' : '#f0b850'; }
  }
  return u % 44 === 0 ? '#1e1e26' : v < h * 0.35 ? '#131318' : '#17171d';
};
const lifeRing = (du, dv) => { const d = Math.hypot(du, dv); if (d > 3.3 || d < 0.9) return null; if (d > 2.7 || d < 1.4) return '#5a4a44'; const a = Math.atan2(dv, du); return Math.floor((a + Math.PI) / (Math.PI / 2) + 0.5) % 2 ? '#d83a2a' : '#f4f0e8'; };
// white superstructure plating: lit square windows, doors and life rings at given u-positions
const superTex = (h, o = {}) => (u, v) => {
  if (v >= h - 2) return v === h - 1 ? '#ffffff' : LIV.white2;
  for (const du of o.doors || []) { const x = u - du; if (x >= 0 && x < 9 && v < 17) return (x === 0 || x === 8 || v === 16) ? '#5a4024' : (x === 6 && v === 8) ? LIV.brass : (v > 10 && x > 1 && x < 7) ? '#e8c070' : (x % 4 === 0 ? '#6a4a2a' : '#7a5832'); }
  for (const du of o.rings || []) { const c = o.big ? (() => { const d2 = Math.hypot(u - du, v - 12); return d2 > 4.4 || d2 < 1.2 ? null : d2 > 3.7 || d2 < 1.9 ? '#5a4a44' : (Math.floor(Math.atan2(v - 12, u - du) / (Math.PI / 2) + 4.5) % 2 ? '#d83a2a' : '#f4f0e8'); })() : lifeRing(u - du, v - 12); if (c) return c; }
  if (o.big) { const wu = (u + 3) % 11, wv = v - (o.winV || 8); if (wu < 6 && wv >= 0 && wv < 6) return (wu === 0 || wu === 5 || wv === 0 || wv === 5) ? '#3a3a44' : (wu === 3 || wv === 3) ? '#8a6a3a' : (wv < 3 ? '#ffe9a8' : '#f0b850'); }
  else if (o.win !== false) { const wu = (u + 2) % 7, wv = v - (o.winV || 8); if (wu < 4 && wv >= 0 && wv < 4) return (wu === 0 || wu === 3 || wv === 0 || wv === 3) ? '#4a4a54' : (wv === 1 ? '#ffe9a8' : '#f0b850'); }
  if (v === h - 3) return '#4a4a54';
  return v === 0 ? '#b8b2a4' : u % 21 === 0 ? '#d8d4c8' : LIV.white;
};
function ochreFunnel(T, cx, cy, r, fh) {                      // slim, raked toward the stern, elliptical top, black cap
  r = Math.min(r, 7);
  for (let v = 0; v <= fh; v++) for (let x = -r; x <= r; x++) {
    const k = (x + r) / (2 * r), e = Math.sqrt(1 - (x / (r + 0.01)) ** 2) * r * 0.5;
    T.px(cx + x + v * 0.16, cy + e - v, v > fh - 7 ? (k < 0.35 ? '#3a3236' : '#141016') : k < 0.25 ? '#f0c878' : k < 0.62 ? '#d29c3a' : k < 0.85 ? '#a8761e' : '#7a5414');
  }
  const tx = cx + fh * 0.16, ty = cy - fh;
  for (let x = -r; x <= r; x++) { const e = Math.sqrt(1 - (x / (r + 0.01)) ** 2) * r * 0.5; for (let y = Math.round(ty - e); y <= Math.round(ty + e); y++) T.px(tx + x, y, Math.abs(y - (ty - e)) < 1 || Math.abs(y - (ty + e)) < 1 ? '#3a3236' : '#060408'); }
}

// ---------------------------------------------------------------- the Merrow, moored (harbour view)
// A real liner silhouette, built from a planform: rounded stern at y = 0, the bow tapering to a point at y = d
// (towards the camera). Hull sides are rasterised column by column so they follow the taper and the sheer line.
function buildShip(Ss) {
  const { w, d } = Ss, xc = w / 2, yb = d * 0.74;
  const sm = (a, b2, x) => { const k = Math.max(0, Math.min(1, (x - a) / (b2 - a))); return k * k * (3 - 2 * k); };
  const hw = y => {
    if (y <= 0 || y >= d) return 0;
    if (y < xc) return xc * Math.sqrt(Math.max(0, 1 - ((xc - y) / xc) ** 2));          // rounded stern
    if (y > yb) { const k = (y - yb) / (d - yb); return xc * (1 - k * k) * (1 - 0.25 * k); }  // fine, pointed bow
    return xc;
  };
  const dhw = y => (hw(Math.min(d, y + 0.01)) - hw(Math.max(0, y - 0.01))) / 0.02;
  const sheer = y => 18 + 6 * sm(d * 0.76, d * 0.8, y) + 7 * sm(d * 0.8, d, y) + 3 * (1 - sm(0, d * 0.14, y));
  const pts = [[0, 0, 0], [w, 0, 0], [0, d, 0], [w, d, 0], [xc, 0, 120], [xc, d, 60]].map(([x, y, z]) => rel(x, y, z));
  const minX = Math.min(...pts.map(p => p[0])) - 10, maxX = Math.max(...pts.map(p => p[0])) + 10;
  const minY = Math.min(...pts.map(p => p[1])) - 10, maxY = Math.max(...pts.map(p => p[1])) + 8;
  const c = canvas(Math.ceil(maxX - minX), Math.ceil(maxY - minY)), g = c.getContext('2d'), T = pxTools(g);
  const L = (x, y, z = 0) => { const p = rel(x, y, z); return [p[0] - minX, p[1] - minY]; };
  const P = (col, x, y, z, w2 = 1, h2 = 1) => { const [px, py] = L(x, y, z); g.fillStyle = col; g.fillRect(Math.round(px), Math.round(py), w2, h2); };
  const side = (sd, y) => xc + sd * hw(y);

  // foam where the hull meets the water (and a bow wave)
  const rnd = rndOf(17);
  for (let y = 0.05; y < d; y += 0.03) for (const sd of [1, -1]) {
    const k = y > yb ? 0.12 + 0.35 * (y - yb) / (d - yb) : 0.1;
    if (rnd() < 0.75) P(rnd() < 0.5 ? '#e8f0f4' : '#a8c4d4', side(sd, y) + sd * k * (0.6 + rnd()), y + (y > yb ? 0.12 : 0), 0);
  }
  // hull sides
  const cols = [];
  for (let y = 0.005; y < d; y += 0.008) for (const sd of [1, -1]) {
    const nx = sd, ny = -dhw(y), vis = nx + ny;
    if (vis <= 0) continue;
    cols.push({ x: side(sd, y), y, sd, lit: sd > 0 ? 1 : 0.7 });
  }
  cols.sort((p, q) => (p.x + p.y) - (q.x + q.y));
  for (const o of cols) {
    const Hs = Math.round(sheer(o.y)), [px, py] = L(o.x, o.y, 0), u = Math.floor(o.y * 16), X = Math.round(px), Y = Math.round(py);
    for (let v = 0; v <= Hs; v++) {
      let col;
      if (v <= 1) col = '#8a2418';
      else if (v === 2) col = '#5a1810';
      else if (v === Hs) col = '#ece8dc';
      else if (v === Hs - 1) col = '#9a968c';
      else {
        const ph = o.y > d * 0.06 && o.y < d * 0.93 && [[Hs - 7, 0], [Hs - 13, 4]].some(([r, off]) => r > 4 && (v === r || v === r + 1) && ((u + off) % 9 + 9) % 9 < 2);
        col = ph ? (v === Hs - 7 || v === Hs - 13 ? '#ffe9a8' : '#f0b850')
                 : o.lit < 1 ? '#0f0f14' : (u % 44 === 0 ? '#1e1e26' : v < Hs * 0.35 ? '#131318' : '#17171d');
      }
      g.fillStyle = col; g.fillRect(X, Y - v, 1, 1);
    }
  }
  // deck: planks running lengthwise
  const outline = [];
  for (let y = 0; y <= d + 0.001; y += 0.05) outline.push(L(side(1, y), y, sheer(y)));
  for (let y = d; y >= -0.001; y -= 0.05) outline.push(L(side(-1, y), y, sheer(y)));
  polyFn(g, outline, (px, py) => {
    let z = 20, wx = 0, wy = 0;
    for (let it = 0; it < 2; it++) { [wx, wy] = screenToWorld(px + minX + 0.5, py + minY + 0.5 + z); z = sheer(wy); }
    const k = (wx - xc) * 3.5, seam = ((k % 1) + 1) % 1 < 0.16;
    return seam ? '#6e5032' : ['#a8865c', '#9e7c54', '#b08e64'][hash(Math.floor(k), Math.floor(wy * 0.8)) % 3];
  });
  const rail = sd => {
    for (let y = 0.1; y < d - 0.05; y += 0.02) { const x = side(sd, y) - sd * 0.06; P('#f4f0e6', x, y, sheer(y) + 6); }
    for (let y = 0.3; y < d - 0.1; y += 0.42) { const x = side(sd, y) - sd * 0.06, [px, py] = L(x, y, sheer(y)); g.fillStyle = '#d8d2c4'; g.fillRect(Math.round(px), Math.round(py) - 6, 1, 6); }
  };
  rail(-1);

  // forecastle fittings: windlass, capstans, bollards, hatch, cowls; mast and flagstaff
  const zf = y => sheer(y);
  const box = (x, y, ww, hh, col, col2) => { const [px, py] = L(x, y, zf(y)); T.rect(px - ww / 2, py - hh, ww, hh, col); T.rect(px - ww / 2, py - hh, ww, 1, col2); };
  box(xc, d * 0.87, 8, 4, '#24242c', '#4a4a54'); T.disc(...L(xc - 0.2, d * 0.87, zf(d * 0.87) + 5), 2, '#34343c'); T.disc(...L(xc + 0.25, d * 0.86, zf(d * 0.86) + 5), 2, '#34343c');
  for (const [x, y] of [[xc - 0.9, d * 0.82], [xc + 0.9, d * 0.82]]) { box(x, y, 3, 4, '#2a2a32', '#5a5a64'); }
  for (const [x, y] of [[xc - 1.3, d * 0.79], [xc + 1.3, d * 0.79], [xc + 1.6, d * 0.4], [xc + 1.6, d * 0.08]]) box(x, y, 2, 2, '#202026', '#4a4a54');
  { const [px, py] = L(xc, d * 0.7, zf(d * 0.7)); T.rect(px - 4, py - 2, 8, 3, '#3a2c1e'); T.rect(px - 3, py - 2, 6, 1, '#5a4430'); }
  for (const [x, y] of [[xc - 1.1, d * 0.66], [xc + 1.1, d * 0.68]]) { const [px, py] = L(x, y, zf(y)); T.rect(px, py - 7, 2, 7, LIV.white); T.rect(px - 1, py - 9, 3, 3, LIV.white); T.px(px + 1, py - 8, '#7a2018'); }
  const mast = (y, h) => { const [px, py] = L(xc, y, zf(y)); T.rect(px, py - h, 2, h, '#6a4c2c'); T.rect(px, py - h, 1, h, '#8a6a42'); T.rect(px - 5, py - h + 14, 12, 1, '#4a3420'); T.rect(px - 1, py - h + 26, 4, 2, LIV.brass); return [px + 1, py - h + 2]; };
  const fm = mast(d * 0.83, 74), am = mast(d * 0.05, 56);
  const bowTip = L(xc, d - 0.15, zf(d) + 6);
  { const [px, py] = L(xc, d - 0.45, zf(d)); T.rect(px, py - 16, 1, 16, '#ece8dc');
    for (let i = 0; i < 8; i++) T.rect(px + 1 + i, py - 16 + (i >> 2), 1, Math.max(1, 5 - (i >> 1)), '#1e2e5a'); T.px(px + 3, py - 15, '#e8c060'); T.px(px + 4, py - 14, '#e8c060'); }

  // superstructure: three white tiers, each set back from the one below
  const tierTex = (h, o) => (u, v) => {
    if (v === h - 1) return '#4a4a54';                           // dark roofline trim
    if (v === 0) return '#b8b2a4';
    for (const du of o.doors || []) { const x = u - du; if (x >= 0 && x < 4 && v >= 1 && v < 9) return x === 0 || x === 3 || v === 8 ? '#3a2c1e' : '#7a5832'; }
    for (const du of o.rings || []) { const dd = Math.hypot(u - du, v - (h >> 1)); if (dd <= 2.6 && dd >= 1.2) return (Math.floor(Math.atan2(v - (h >> 1), u - du) / (Math.PI / 2) + 4.5) % 2) ? '#d83a2a' : '#f4f0e8'; }
    for (const r of o.rows) { const cu = (u + 2) % 7, cv = v - r; if (cu < 4 && cv >= 0 && cv < 4) return (cu === 0 || cu === 3 || cv === 0 || cv === 3) ? '#4a4a54' : (cv === 1 ? '#ffe9a8' : '#f0b850'); }
    return u % 21 === 0 ? '#d8d4c8' : '#ece8dc';
  };
  const tier = (xa, xb, ya, yb2, z0, h, o) => {
    face(g, L(xa, yb2, z0), L(xb, yb2, z0), h, tierTex(h, o.front || o));
    face(g, L(xb, yb2, z0), L(xb, ya, z0), h, tierTex(h, o), 0.1);
    polyFn(g, [L(xa, ya, z0 + h), L(xb, ya, z0 + h), L(xb, yb2, z0 + h), L(xa, yb2, z0 + h)], (x, y) => ((x + y * 2) % 9 === 0 ? '#c4c0b4' : '#d4d0c4'));
    const edge = (x0, y0, x1, y1) => { const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 0.02); for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n; P('#f4f0e6', x, y, z0 + h + 4); if (i % 18 === 0) { const [px, py] = L(x, y, z0 + h); g.fillStyle = '#d8d2c4'; g.fillRect(Math.round(px), Math.round(py) - 4, 1, 4); } } };
    edge(xa, ya, xb, ya); edge(xa, ya, xa, yb2); edge(xa, yb2, xb, yb2); edge(xb, ya, xb, yb2);
  };
  const Z0 = 18;
  // promenade fittings on the main deck beside tier 1 (lamps + benches)
  const lamps = [];
  for (let y = d * 0.14; y < d * 0.62; y += 1.6) {
    const x = w - 0.32, [px, py] = L(x, y, Z0); T.rect(px, py - 8, 1, 8, '#1e1e24'); T.rect(px - 1, py - 10, 3, 2, '#ffe08a'); lamps.push([x, y, Z0 + 9]);
    const [bx, by] = L(x - 0.05, y + 0.7, Z0); T.rect(bx - 2, by - 2, 5, 2, '#7a5832'); T.rect(bx - 2, by - 3, 5, 1, '#a07446');
  }
  tier(0.5, w - 0.55, d * 0.1, d * 0.62, Z0, 15, { rows: [6], doors: [12, 70, 150], rings: [40, 110, 190], front: { rows: [6], doors: [24], rings: [10, 44] } });
  tier(0.85, w - 0.9, d * 0.14, d * 0.55, Z0 + 15, 12, { rows: [4], rings: [60], front: { rows: [4] } });
  tier(1.25, w - 1.3, d * 0.47, d * 0.55, Z0 + 27, 9, { rows: [3], front: { rows: [3] } });
  // little stair from the well deck up onto tier 1
  for (let i = 0; i < 6; i++) { const y = d * 0.62 + 0.75 - i * 0.12, z = Z0 + 2.5 * (i + 1); polyFn(g, [L(w - 1.6, y, z), L(w - 1.0, y, z), L(w - 1.0, y + 0.12, z), L(w - 1.6, y + 0.12, z)], () => (i % 2 ? '#8a6a42' : '#a07a4e')); }
  { const p0 = L(w - 1.0, d * 0.62 + 0.85, Z0 + 6), p1 = L(w - 1.0, d * 0.62, Z0 + 21); line(g, p0[0], p0[1], p1[0], p1[1], LIV.brass); }
  // funnels: slim, raked toward the stern, elliptical tops, black caps
  const chimneys = [];
  for (const fy of [d * 0.24, d * 0.4]) {
    const zb = Z0 + 27, fh = 42, r = 7, [cx, cy] = L(xc, fy, zb);
    for (let v = 0; v <= fh; v++) for (let x = -r; x <= r; x++) {
      const k = (x + r) / (2 * r), e = Math.sqrt(1 - (x / (r + 0.01)) ** 2) * r * 0.5, rake = v * 0.16;
      g.fillStyle = v > fh - 7 ? (k < 0.35 ? '#3a3236' : '#141016') : k < 0.25 ? '#f0c878' : k < 0.62 ? '#d29c3a' : k < 0.85 ? '#a8761e' : '#7a5414';
      g.fillRect(Math.round(cx + x + rake), Math.round(cy + e - v), 1, 1);
    }
    const tx = cx + fh * 0.16, ty = cy - fh;
    for (let x = -r; x <= r; x++) { const e = Math.sqrt(1 - (x / (r + 0.01)) ** 2) * r * 0.5; for (let y = Math.round(ty - e); y <= Math.round(ty + e); y++) { g.fillStyle = Math.abs(y - (ty - e)) < 1 || Math.abs(y - (ty + e)) < 1 ? '#3a3236' : '#060408'; g.fillRect(Math.round(tx + x), y, 1, 1); } }
    chimneys.push([xc + fh * 0.16 / 32, fy - fh * 0.16 / 32, zb + fh]);
  }
  // rigging
  const fTop = chimneys[0];
  for (const [a2, b3] of [[fm, bowTip], [fm, L(fTop[0], fTop[1], fTop[2] - 4)], [am, L(chimneys[1][0], chimneys[1][1], chimneys[1][2] - 4)], [am, L(xc, 0.2, sheer(0.2) + 4)]]) line(g, a2[0], a2[1], b3[0], b3[1], '#2a2420');
  rail(1);
  const nm = L(xc + 0.6, 0.6, 10); T.rect(nm[0], nm[1], 10, 1, LIV.brass);
  const lights = [
    ...lamps.filter((_, i) => i % 2 === 0).map(([x, y, z]) => [x, y, z, 20, 0.1]),
    [w - 0.55, d * 0.35, Z0 + 8, 22, 0.07], [w - 0.9, d * 0.3, Z0 + 20, 20, 0.06], [xc, d * 0.62, Z0 + 8, 20, 0.06],
  ];
  return { img: c, ox: minX, oy: minY, chimneys, windows: lights };
}

// ---------------------------------------------------------------- deck props
function makeShipRail(conn) {
  return spr(40, 40, (g, T) => {
    const cx = 20, cy = 30, dirs = [[8, 4], [-8, -4], [-8, 4], [8, -4]];
    conn.forEach((on, i) => {
      if (!on) return;
      const [sx, sy] = dirs[i];
      line(g, cx, cy - 15, cx + sx, cy + sy - 15, '#f4f0e6'); line(g, cx, cy - 14, cx + sx, cy + sy - 14, '#b8b2a4');
      line(g, cx, cy - 8, cx + sx, cy + sy - 8, '#d8d2c4');
      for (let k = 4; k < 8; k += 4) { const x = cx + sx * k / 8, y = cy + sy * k / 8; T.rect(x, y - 15, 1, 15, '#e0dace'); }
    });
    T.rect(cx - 1, cy - 16, 2, 16, '#ece8dc'); T.rect(cx, cy - 16, 1, 16, '#b8b2a4'); T.rect(cx - 1, cy - 17, 2, 1, LIV.brass);
  });
}
const shipLampSpr = spr(10, 38, (g, T) => {
  T.rect(4, 8, 2, 30, '#1e1e24'); T.rect(4, 8, 1, 30, '#3a3a44'); T.rect(2, 35, 6, 3, '#1e1e24');
  T.rect(2, 1, 6, 1, '#1e1e24'); T.rect(1, 2, 8, 6, LIV.brass); T.rect(2, 3, 6, 4, '#ffe08a'); T.rect(4, 3, 2, 3, '#fff8d8'); T.rect(3, 0, 4, 1, LIV.brass);
});
const deckBenchSpr = spr(30, 22, (g, T) => {
  const P = (x, y, z) => { const r = rel(x, y, z); return [15 + r[0], 13 + r[1]]; };
  for (const yy of [-0.5, 0.5]) { const a = P(0, yy, 0), b2 = P(0, yy, 9); T.rect(a[0] - 1, b2[1], 2, a[1] - b2[1], '#2a2a30'); }
  polyFn(g, [P(-0.22, -0.6, 6), P(0.22, -0.6, 6), P(0.22, 0.6, 6), P(-0.22, 0.6, 6)], (x, y) => ((y - x * -0.5) % 3 < 1 ? '#6a4a28' : '#a07446'));
  polyFn(g, [P(-0.24, -0.6, 7), P(-0.24, 0.6, 7), P(-0.24, 0.6, 14), P(-0.24, -0.6, 14)], (x, y) => (y % 3 === 0 ? '#6a4a28' : '#8a6038'));
});
const capstanSpr = spr(16, 22, (g, T) => {
  for (let x = -5; x <= 5; x++) { const e = Math.sqrt(1 - (x / 5.5) ** 2) * 2.5, k = (x + 5) / 10; for (let y = Math.round(8 + e); y <= Math.round(18 + e); y++) T.px(8 + x, y, (y - 8) % 4 === 0 ? '#14141a' : k < 0.3 ? '#4a4a54' : k < 0.7 ? '#32323a' : '#202028'); }
  T.disc(8, 8, 6, '#3a3a44', 0.5); T.disc(8, 8, 3, LIV.brass, 0.5); T.rect(2, 19, 12, 2, '#1a1a20');
  for (const dx of [-6, 6]) T.rect(8 + dx - (dx < 0 ? 0 : 1), 7, 2, 2, '#6a5a3a');
});
const windlassSpr = boxSprite(1.5, 0.8, 5, '#2a2a32', '#1e1e24', '#16161c', { after: (g, T, P) => {
  for (const yy of [-0.22, 0.22]) {
    const [cx, cy] = P(0.15, yy, 13);
    for (let x = -6; x <= 6; x++) { const e = Math.sqrt(1 - (x / 6.5) ** 2) * 6; for (let y = Math.round(cy - e); y <= Math.round(cy + e); y++) T.px(cx + x, y, x < -3 ? '#4a4a54' : x < 3 ? '#32323a' : '#24242c'); }
    T.disc(cx - 6, cy, 2, LIV.brass);
  }
  const [gx, gy] = P(-0.55, 0, 10); T.disc(gx, gy, 5, '#2a2a32'); T.ring(gx, gy, 4, 5, '#4a4a54'); T.disc(gx, gy, 1, LIV.brass);
  const [ax, ay] = P(0.4, -0.3, 4); for (let i = 0; i < 9; i++) T.rect(ax + i * 2, ay - i, 2, 1, i % 2 ? '#4a4a54' : '#6a6a74');   // anchor chain running to the hawse
} });
const cowlSpr = spr(18, 32, (g, T) => {                         // ventilator: a white pipe with a bell mouth turned to the wind
  T.rect(5, 14, 5, 18, LIV.white); T.rect(5, 14, 2, 18, '#ffffff'); T.rect(9, 14, 1, 18, LIV.white2);
  for (let i = 0; i < 6; i++) T.rect(5 + i, 13 - i, 5, 2, i < 3 ? LIV.white : '#f4f0e6');
  for (let y = -6; y <= 6; y++) { const w2 = Math.round(Math.sqrt(36 - y * y) * 0.45); T.rect(13 - w2, 6 + y, w2 * 2 + 2, 1, Math.abs(y) > 4 ? LIV.white2 : LIV.white); }
  for (let y = -4; y <= 4; y++) { const w2 = Math.round(Math.sqrt(16 - y * y) * 0.35); T.rect(14 - w2, 6 + y, w2 * 2 + 1, 1, Math.abs(y) < 2 ? '#5a1410' : '#a83228'); }
  T.rect(4, 30, 7, 2, '#8a8478');
});
function drawFlagstaff(x, y) {
  ctx.fillStyle = '#ece8dc'; ctx.fillRect(x, y - 34, 1, 34); ctx.fillStyle = LIV.brass; ctx.fillRect(x - 1, y - 35, 3, 1);
  // the Merrow Line pennant: a navy swallowtail with a gold ring
  for (let i = 0; i < 12; i++) {
    const wv = Math.round(Math.sin(t * 0.12 - i * 0.6) * 1.2), h = Math.max(1, 7 - (i >> 1)), notch = i > 8;
    ctx.fillStyle = i < 2 ? '#2a3a6a' : '#1e2e5a';
    ctx.fillRect(x + 1 + i, y - 33 + (i >> 2) + wv, 1, notch ? Math.max(1, (h >> 1) - 1) : h);
    if (notch) ctx.fillRect(x + 1 + i, y - 33 + (i >> 2) + wv + h - Math.max(1, (h >> 1) - 1), 1, Math.max(1, (h >> 1) - 1));
  }
  ctx.fillStyle = '#e8c060'; const wv = Math.round(Math.sin(t * 0.12 - 2.4) * 1.2);
  ctx.fillRect(x + 4, y - 32 + wv, 2, 1); ctx.fillRect(x + 3, y - 31 + wv, 1, 2); ctx.fillRect(x + 6, y - 31 + wv, 1, 2); ctx.fillRect(x + 4, y - 29 + wv, 2, 1);
}

// ---------------------------------------------------------------- deckhouse (one per promenade area, built like a building)
function buildDeckhouse(Ds) {
  const { w, d } = Ds, h1 = 34;
  const minX = rel(-0.2, d + 0.2)[0] - 6, maxX = rel(w + 0.2, -0.2)[0] + 6;
  const minY = rel(0, 0, h1 + 70)[1] - 4, maxY = rel(w, d)[1] + 4;
  const c = canvas(Math.ceil(maxX - minX), Math.ceil(maxY - minY)), g = c.getContext('2d'), T = pxTools(g);
  const L = (x, y, z = 0) => { const p = rel(x, y, z); return [p[0] - minX, p[1] - minY]; };
  const len = d * 16;
  face(g, L(0, d), L(w, d), h1, superTex(h1, { big: true, doors: [44], rings: [20, 80], winV: 16 }));
  face(g, L(w, d), L(w, 0), h1, superTex(h1, { big: true, doors: [26, 92, len - 60], rings: [60, 130], winV: 16 }), 0.12);
  polyFn(g, [L(0, 0, h1), L(w, 0, h1), L(w, d, h1), L(0, d, h1)], (x, y) => ((x + y * 2) % 9 === 0 ? '#b4b0a4' : '#c4c0b4'));
  // roof rail
  const edge = (x0, y0, x1, y1) => { const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 0.02); for (let i = 0; i <= n; i++) { const [px, py] = L(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, h1 + 6); T.px(px, py, '#f4f0e6'); if (i % 22 === 0) T.rect(px, py, 1, 6, '#d8d2c4'); } };
  edge(0, 0, w, 0); edge(0, 0, 0, d); edge(0, d, w, d); edge(w, 0, w, d);
  // funnel casing + funnels, cowls, a lifeboat on its davits
  const cy0 = d * 0.15, cy1 = d * 0.55, cx0 = w * 0.25, cx1 = w * 0.75;
  face(g, L(cx0, cy1, h1), L(cx1, cy1, h1), 5, () => '#d8d4c8'); face(g, L(cx1, cy1, h1), L(cx1, cy0, h1), 5, () => '#c4c0b4');
  polyFn(g, [L(cx0, cy0, h1 + 5), L(cx1, cy0, h1 + 5), L(cx1, cy1, h1 + 5), L(cx0, cy1, h1 + 5)], () => '#a8a498');
  const chimneys = [];
  for (const fy of [d * 0.24, d * 0.45]) { const [cx, cy] = L(w / 2, fy, h1 + 5); ochreFunnel(T, cx, cy, 7, 48); chimneys.push([w / 2 + 0.24, fy - 0.24, h1 + 5 + 48]); }
  for (const [x, y] of [[w * 0.2, d * 0.7], [w * 0.85, d * 0.62], [w * 0.15, d * 0.3]]) { const [px, py] = L(x, y, h1); g.drawImage(cowlSpr, Math.round(px - 8), Math.round(py - 30)); }
  { const [px, py] = L(w - 0.5, d * 0.08, h1); g.drawImage(lifeboatSpr, Math.round(px - 32), Math.round(py - 30)); }
  return { img: c, ox: minX, oy: minY, chimneys,
           windows: [[w + 0.2, d - 1.2, 18, 24, 0.08], [w + 0.2, d - 4.5, 18, 24, 0.08], [w * 0.5, d + 0.2, 18, 24, 0.08]] };
}

// ---------------------------------------------------------------- stairs between deck levels (world y0 -> y1, z0 -> z1)
function buildStairs(st) {
  const { a, b: bx, y0, y1, z0, z1 } = st, n = 8, rail = 13;
  const pts = []; for (const x of [a, bx]) for (const [y, z] of [[y0, z0], [y1, z1]]) for (const dz of [0, rail, Math.min(z0, z1) - z - 2]) pts.push(rel(x, y, z + dz));
  const minX = Math.min(...pts.map(p => p[0])) - 3, maxX = Math.max(...pts.map(p => p[0])) + 3, minY = Math.min(...pts.map(p => p[1])) - 3, maxY = Math.max(...pts.map(p => p[1])) + 3;
  const c = canvas(Math.ceil(maxX - minX), Math.ceil(maxY - minY)), g = c.getContext('2d'), T = pxTools(g);
  const L = (x, y, z = 0) => { const p = rel(x, y, z); return [p[0] - minX, p[1] - minY]; };
  const zlo = Math.min(z0, z1) - 2, rl = (x, col) => { const p = L(x, y0, z0 + rail), q = L(x, y1, z1 + rail); line(g, p[0], p[1], q[0], q[1], col); for (const [y, z] of [[y0, z0], [y1, z1], [(y0 + y1) / 2, (z0 + z1) / 2]]) { const s0 = L(x, y, z), s1 = L(x, y, z + rail); line(g, s0[0], s0[1], s1[0], s1[1], '#3a2a1a'); } };
  rl(a, '#8a6a3a');
  const steps = Array.from({ length: n }, (_, i) => ({ ya: y0 + (y1 - y0) * i / n, yb: y0 + (y1 - y0) * (i + 1) / n, z: z0 + (z1 - z0) * (i + 1) / n }))
    .sort((p, q) => Math.min(p.ya, p.yb) - Math.min(q.ya, q.yb));
  polyFn(g, [L(bx, y0, z0), L(bx, y1, z1), L(bx, y1, zlo), L(bx, y0, zlo)], (x, y) => (y % 4 === 0 ? '#4a3420' : '#6a4c2c'));
  const dz = Math.abs(z1 - z0) / n;
  for (const s of steps) {
    const lo = Math.min(s.ya, s.yb), hi = Math.max(s.ya, s.yb);
    face(g, L(a, hi, s.z - dz), L(bx, hi, s.z - dz), Math.ceil(dz) + 1, () => '#5a4024');
    polyFn(g, [L(a, lo, s.z), L(bx, lo, s.z), L(bx, hi, s.z), L(a, hi, s.z)], (x, y) => '#a07a4e');
    line(g, ...L(a, hi, s.z), ...L(bx, hi, s.z), '#c8a070');
  }
  rl(bx, LIV.brass);
  return { img: c, minX, minY };
}

// ---------------------------------------------------------------- the Drowned Helm: Captain Hale's corrupted soul, a giant haunted ship's wheel
function drawHelm(e, x, y, fl, alpha) {
  const cx = Math.round(x), cy = Math.round(y - 40 + Math.sin(e.anim * 0.05) * 2), R = 22, C = col => (fl ? '#ffffff' : col);
  ctx.save(); ctx.globalAlpha = alpha;
  // kelp and a dragging chain
  for (let k = 0; k < 7; k++) { const a = Math.PI * (0.25 + k * 0.08), sx = cx + Math.cos(a) * R, sy = cy + Math.sin(a) * R; ctx.fillStyle = C(k % 2 ? '#1e4436' : '#2e5a4a'); for (let i = 0; i < 10 + k % 3 * 4; i++) ctx.fillRect(Math.round(sx + Math.sin(t * 0.05 + i * 0.4 + k) * 1.5), Math.round(sy + i), 1, 1); }
  ctx.fillStyle = C('#4a5a5a'); for (let i = 0; i < 16; i++) ctx.fillRect(cx + 2 + (i % 2), cy + 8 + i * 2, 2, 1);
  // spokes with handles, turning
  for (let k = 0; k < 8; k++) {
    const a = e.spin + k * Math.PI / 4, ux = Math.cos(a), uy = Math.sin(a);
    for (let r = 7; r < R + 9; r++) { ctx.fillStyle = C(r > R + 2 ? '#7a6448' : r % 5 === 0 ? '#3a2c1e' : '#5a4632'); ctx.fillRect(Math.round(cx + ux * r - 1), Math.round(cy + uy * r - 1), r > R + 2 ? 3 : 2, r > R + 2 ? 3 : 2); }
    ctx.fillStyle = C('#c8a868'); ctx.fillRect(Math.round(cx + ux * (R + 9) - 1), Math.round(cy + uy * (R + 9) - 1), 2, 2);
  }
  // the rim: rotted wood, barnacles, teal cracks
  for (let a = 0; a < Math.PI * 2; a += 0.025) for (let r = R - 3; r <= R; r++) {
    const ar = a + e.spin, h = hash(Math.floor(a * 40), r);
    ctx.fillStyle = C(r === R ? '#2a2016' : h % 23 === 0 ? '#c8c0a8' : h % 31 === 0 ? '#5affd8' : r === R - 3 ? '#6a5438' : '#4a3a28');
    ctx.fillRect(Math.round(cx + Math.cos(ar) * r), Math.round(cy + Math.sin(ar) * r), 1, 1);
  }
  // hub: a drowned face
  for (let yy = -8; yy <= 8; yy++) for (let xx = -8; xx <= 8; xx++) if (xx * xx + yy * yy <= 70) { ctx.fillStyle = C(xx * xx + yy * yy > 50 ? '#c8a868' : yy > 2 ? '#2e5a4a' : '#8ab0a8'); ctx.fillRect(cx + xx, cy + yy, 1, 1); }
  ctx.fillStyle = C('#07100f'); ctx.fillRect(cx - 4, cy - 2, 3, 2); ctx.fillRect(cx + 2, cy - 2, 3, 2); ctx.fillRect(cx - 2, cy + 3, 5, 2);
  // the captain's cap, sitting crooked on top
  ctx.fillStyle = C('#121a2e'); ctx.fillRect(cx - 10, cy - R - 5, 20, 4);
  ctx.fillStyle = C('#e8e4d8'); ctx.fillRect(cx - 8, cy - R - 10, 16, 5); ctx.fillStyle = C('#ffffff'); ctx.fillRect(cx - 8, cy - R - 10, 16, 1);
  ctx.fillStyle = C('#07100f'); ctx.fillRect(cx - 11, cy - R - 2, 22, 1); ctx.fillStyle = C('#c8a868'); ctx.fillRect(cx - 2, cy - R - 5, 4, 2);
  ctx.restore();
}
const helmEyes = e => { const cy = -40 + Math.sin(e.anim * 0.05) * 2; return [[-4, cy - 2], [2, cy - 2]]; };

// ======================================================================
//  CHAPTER III, PART TWO — new friends, a stolen soul, the Drowned Anchor
// ======================================================================
const TAMSIN_PAL = { h: '#c8963a', H: '#f0cc70', c: '#2a6a66', C: '#1c4a48', l: '#3a8a84', r: '#e8c040', R: '#b89020' };
SPR.tamsin = person(TAMSIN_PAL);
SPR.tamsinLie = mk(lieRows, { ...PAL, ...TAMSIN_PAL });
SPR.tamsinSpirit = mk(spiritRows, { ...PAL, K: '#4a2a44', W: '#fff4fa', w: '#f0c8e4', x: '#b888b0', g: '#fff' }, '#ffd0f0');
// Kit: messy ginger hair, round glasses, white collar, green jumper, a book clamped under his arm
SPR.kit = mk([
  '...kkkkk....', '..kHhHhHk...', '.kHhhhhhhk..', '.khhhhhhhhk.', '..khsssshk..', '..kGeGGeGk..', '...kSssSk...',
  '..kwwwwwwk..', '.kcwccccwck.', '.kclccccCck.', 'kcclccccCcck', 'kslcBBBcCCsk', '.kclBBBcCck.', '.kclccccCck.', '.kCccccccCk.',
  ...LEGS[0]], { ...PAL, h: '#c8642a', H: '#e8884a', s: '#e8c0a0', S: '#c09070', c: '#4a6a3a', C: '#34502a', l: '#5e8048',
  G: '#e0dcd0', w: '#ece8dc', B: '#7a3a2a', b: '#3a3a44' });

// a hanging chain between two screen points: alternating links with a little sag
function drawChain(x0, y0, x1, y1, alpha = 1, sag = 6) {
  const n = Math.max(2, Math.hypot(x1 - x0, y1 - y0) / 2.2 | 0);
  ctx.save(); ctx.globalAlpha = alpha;
  for (let i = 0; i <= n; i++) {
    const k = i / n, x = x0 + (x1 - x0) * k, y = y0 + (y1 - y0) * k + Math.sin(k * Math.PI) * sag;
    ctx.fillStyle = i % 2 ? '#5a6a6a' : '#9aaaa8'; ctx.fillRect(Math.round(x) - (i % 2 ? 0 : 1), Math.round(y) - (i % 2 ? 1 : 0), i % 2 ? 1 : 2, i % 2 ? 2 : 1);
  }
  ctx.restore();
}
// links wrapped round a soul (Tamsin's, or Ash's own when the Anchor binds him)
function drawBinding(x, y, alpha = 1, h = 18) {
  ctx.save(); ctx.globalAlpha = alpha;
  for (let k = 0; k < 4; k++) {
    const yy = y - h + 4 + k * (h / 4.5);
    for (let a = 0; a < Math.PI * 2; a += 0.35) { const i = Math.round(a / 0.35); ctx.fillStyle = Math.sin(a) > 0 ? (i % 2 ? '#7a8a8a' : '#c0ccca') : (i % 2 ? '#3a4444' : '#5a6666'); ctx.fillRect(Math.round(x + Math.cos(a + k) * 7), Math.round(yy + Math.sin(a + k) * 2), 2, 1); }
  }
  ctx.restore();
}

// ---------------------------------------------------------------- the Drowned Anchor: Captain Hale's corrupted soul
function drawAnchor(e, x, y, fl, alpha) {
  const cx = Math.round(x), top = Math.round(y - 70 + Math.sin(e.anim * 0.05) * 2), C = col => (fl ? '#ffffff' : col);
  const IRON = '#3a4648', IRON2 = '#56666a', DARK = '#1e2628';
  ctx.save(); ctx.globalAlpha = alpha;
  // the chain it hangs from, rising into the fog
  for (let i = 0; i < 16; i++) { ctx.fillStyle = C(i % 2 ? '#4a5a5a' : '#8a9a9a'); ctx.fillRect(cx - (i % 2 ? 0 : 1), top - 6 - i * 3, i % 2 ? 1 : 3, 2); }
  const R = (x0, y0, w, h, col) => { ctx.fillStyle = C(col); ctx.fillRect(Math.round(x0), Math.round(y0), w, h); };
  // ring
  for (let a = 0; a < Math.PI * 2; a += 0.15) R(cx + Math.cos(a) * 5 - 1, top + 3 + Math.sin(a) * 5 - 1, 2, 2, a > Math.PI ? IRON2 : IRON);
  // shank
  R(cx - 3, top + 8, 6, 46, IRON); R(cx - 3, top + 8, 2, 46, IRON2); R(cx + 2, top + 8, 1, 46, DARK);
  // stock (crossbar) with knobs
  R(cx - 17, top + 14, 34, 4, IRON); R(cx - 17, top + 14, 34, 1, IRON2); R(cx - 19, top + 13, 3, 6, DARK); R(cx + 16, top + 13, 3, 6, DARK);
  // arms: a heavy curve from crown to flukes
  for (let a = 0.15; a < Math.PI - 0.15; a += 0.03) for (let r = 18; r < 23; r++) R(cx + Math.cos(a) * r, top + 34 + Math.sin(a) * r * 0.85, 1, 1, r === 18 ? IRON2 : r > 21 ? DARK : IRON);
  for (const sd of [-1, 1]) { const fx = cx + sd * 21, fy = top + 36; for (let i = 0; i < 8; i++) R(fx + sd * (i < 4 ? 1 : 0) - (sd < 0 ? 4 - (i >> 1) : 0), fy - i, 5 - (i >> 1), 1, i % 3 ? IRON2 : IRON); }
  // barnacles, rust, teal rot cracks and kelp
  for (const [dx, dy] of [[-12, 15], [10, 16], [1, 26], [-1, 40], [-16, 44], [15, 42], [-6, 52], [7, 50]]) { R(cx + dx, top + dy, 2, 1, '#c8c0a8'); R(cx + dx, top + dy + 1, 1, 1, '#8a8470'); }
  for (const [dx, dy] of [[0, 20], [-1, 31], [1, 44], [-9, 49], [11, 47]]) R(cx + dx, top + dy, 1, 2, '#5affd8');
  for (let k = 0; k < 6; k++) { const sx = cx - 15 + k * 6, sy = top + 18; ctx.fillStyle = C(k % 2 ? '#1e4436' : '#2e5a4a'); for (let i = 0; i < 6 + (k * 7) % 9; i++) ctx.fillRect(Math.round(sx + Math.sin(t * 0.05 + i * 0.5 + k) * 1.2), sy + i, 1, 1); }
  // the captain's cap, jammed over the ring
  R(cx - 8, top - 4, 16, 3, '#121a2e'); R(cx - 6, top - 8, 12, 4, '#e8e4d8'); R(cx - 6, top - 8, 12, 1, '#ffffff'); R(cx - 9, top - 1, 18, 1, '#07100f'); R(cx - 1, top - 4, 3, 2, '#c8a868');
  ctx.restore();
}
const anchorEyes = e => { const top = -70 + Math.sin(e.anim * 0.05) * 2; return [[-6, top + 9], [3, top + 9]]; };

// Tamsin, tucked into her bunk (drawn onto the bed's top so it matches the iso angle). x, y = the bunk's tile centre.
function drawSleeper(wx, wy) {
  const Z = 10, P = (x, y, z) => [Math.round(isoX(wx + x, wy + y) - camX), Math.round(isoY(wx + x, wy + y) - camY - z)];
  // blanket: a teal quilt over her, with a soft bump along the middle
  for (let y = -0.08; y <= 0.44; y += 0.025) for (let x = -0.3; x <= 0.3; x += 0.03) {
    const bump = Math.cos(x / 0.3 * Math.PI / 2) * 3 * (y < 0.38 ? 1 : 0.6), [px, py] = P(x, y, Z + bump);
    ctx.fillStyle = Math.abs(x) > 0.26 ? '#1c4a48' : x > 0.08 ? '#24585a' : (Math.round(y * 20) % 4 === 0 ? '#3a8a84' : '#2a6a66');
    ctx.fillRect(px, py, 2, 2);
  }
  // folded-back sheet
  for (let x = -0.3; x <= 0.3; x += 0.03) { const [px, py] = P(x, -0.1, Z + Math.cos(x / 0.3 * Math.PI / 2) * 3); ctx.fillStyle = '#f4f0e8'; ctx.fillRect(px, py, 2, 2); }
  // head on the pillow: golden hair spread out, face up, eyes closed
  const [hx, hy] = P(0, -0.27, Z + 3);
  ctx.fillStyle = '#a07428'; for (let dy = -3; dy <= 3; dy++) for (let dx = -4; dx <= 4; dx++) if (dx * dx + dy * dy * 1.6 <= 18) ctx.fillRect(hx + dx, hy + dy, 1, 1);
  ctx.fillStyle = '#d8a848'; for (let dy = -3; dy <= 2; dy++) for (let dx = -3; dx <= 3; dx++) if (dx * dx + dy * dy * 1.6 <= 9) ctx.fillRect(hx + dx, hy + dy - 1, 1, 1);
  ctx.fillStyle = '#f0cc70'; ctx.fillRect(hx - 2, hy - 3, 2, 1);
  ctx.fillStyle = '#e8c0a0'; ctx.fillRect(hx - 1, hy, 4, 3); ctx.fillStyle = '#c09070'; ctx.fillRect(hx - 1, hy + 2, 4, 1);
  ctx.fillStyle = '#5a3a2a'; ctx.fillRect(hx - 1, hy + 1, 1, 1); ctx.fillRect(hx + 2, hy + 1, 1, 1);
  // an arm lying on top of the quilt
  const [ax, ay] = P(0.12, 0.05, Z + 3); ctx.fillStyle = '#2a6a66'; ctx.fillRect(ax - 1, ay, 3, 2); ctx.fillStyle = '#e8c0a0'; ctx.fillRect(ax - 3, ay + 1, 2, 2);
}
