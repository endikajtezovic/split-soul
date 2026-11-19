"use strict";
// ======================================================================
//  ISO ART — procedural pixel-art sprites for the isometric world.
//  Everything is drawn in code; any of these can later be swapped for
//  real sprite sheets without touching the engine.
// ======================================================================

// relative isometric projection (x, y in tiles, z in pixels up)
const rel = (x, y, z = 0) => [(x - y) * 16, (x + y) * 8 - z];
const rndOf = seed => { let s0 = (seed * 16807 + 1) % 2147483647 || 1; return () => (s0 = s0 * 16807 % 2147483647) / 2147483647; };
const hash = (a, b2) => { let h = (a * 374761393 + b2 * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return (h ^ (h >>> 16)) >>> 0; };

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
  const n = Math.max(1, Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) | 0);
  g.fillStyle = col;
  for (let i = 0; i <= n; i++) g.fillRect(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), 1, 1);
}
// a vertical wall face between two ground points, rasterised column by column: tex(u, v) -> colour
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
function spr(w, h, draw) { const c = canvas(w, h); const g = c.getContext('2d'); draw(g, pxTools(g)); return c; }
const stoneTex = (pal, mortar, bw = 10, bh = 5) => (u, v) => {
  const row = v / bh | 0;
  if (v % bh === bh - 1 || (u + (row % 2) * (bw / 2)) % bw === 0) return mortar;
  return pal[hash((u + (row % 2) * (bw / 2)) / bw | 0, row) % pal.length];
};
function stainedGlass(wu, wv, ww, wh, seed) {
  if (wu === 0 || wu === ww - 1) return '#2a2630';
  const cx = (ww - 1) / 2, ay = wh - ww / 2;          // pointed arch top
  if (wv > ay) { const d = Math.hypot(wu - cx, (wv - ay) * 1.2); if (d > ww / 2) return null; if (d > ww / 2 - 1) return '#2a2630'; }
  if ((wu % 3 === 0) || (wv % 4 === 0)) return '#161218';
  return ['#7a1a1a', '#a83030', '#d8c890', '#2a3a6a', '#c8b890', '#8a2222', '#3a5a8a'][hash((wu / 3 | 0) + seed, wv / 4 | 0) % 7];
}

// ---------------------------------------------------------------- nature
function makeTree(sd) {
  const rnd = rndOf(sd * 99 + 7);
  return spr(48, 66, (g, T) => {
    T.rect(22, 38, 4, 26, '#5a3a22'); T.rect(22, 38, 1, 26, '#7a5232'); T.rect(20, 62, 8, 2, '#4a301c');
    const blobs = []; for (let i = 0; i < 10; i++) blobs.push([24 + rnd() * 22 - 11, 24 + rnd() * 18 - 11, 8 + rnd() * 6]);
    for (const [x, y, r] of blobs) T.disc(x, y, r | 0, '#28491f');
    for (const [x, y, r] of blobs) T.disc(x - 1, y - 1, (r - 1) | 0, '#386628');
    for (const [x, y, r] of blobs) T.disc(x - 2, y - 3, (r - 4) | 0, '#4f8436');
    const data = g.getImageData(0, 0, 48, 66).data;
    for (let i = 0; i < 60; i++) { const x = 6 + rnd() * 36 | 0, y = 6 + rnd() * 34 | 0; if (data[(y * 48 + x) * 4 + 3]) T.px(x, y, y < 24 && x < 28 ? '#78ad52' : '#22401b'); }
  });
}
function makePine(sd) {
  const rnd = rndOf(sd * 31 + 3);
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
function makeDeadTree(sd) {
  const rnd = rndOf(sd * 17 + 5);
  return spr(40, 62, (g, T) => {
    T.rect(18, 20, 4, 40, '#3a2e26'); T.rect(18, 20, 1, 40, '#54443a');
    const branch = (x, y, a, len, w) => {
      if (len < 3) return;
      const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
      for (let i = 0; i < w; i++) line(g, x + i, y, x2 + i, y2, '#3a2e26');
      branch(x2, y2, a - 0.5 - rnd() * 0.3, len * 0.65, Math.max(1, w - 1));
      branch(x2, y2, a + 0.4 + rnd() * 0.3, len * 0.6, Math.max(1, w - 1));
    };
    branch(19, 22, -Math.PI / 2 - 0.3, 12, 2); branch(20, 30, -Math.PI / 2 + 0.6, 10, 2);
  });
}
function makeBush(sd) {
  const rnd = rndOf(sd * 13 + 1);
  const flower = rnd() < 0.6 ? ['#e888b0', '#f4f0f0', '#f0d060'][rnd() * 3 | 0] : null;
  return spr(22, 18, (g, T) => {
    T.disc(11, 11, 6, '#2c5222'); T.disc(7, 12, 4, '#2c5222'); T.disc(15, 12, 4, '#2c5222');
    T.disc(10, 10, 5, '#3e7030'); T.disc(9, 8, 3, '#558c3c');
    if (flower) for (let i = 0; i < 7; i++) T.px(5 + rnd() * 12, 6 + rnd() * 8, flower);
  });
}
const cabbageSpr = spr(10, 8, (g, T) => { T.disc(5, 4, 3, '#4e7e34'); T.disc(5, 4, 2, '#82b85a'); T.px(5, 4, '#b8e090'); });
const carrotSpr = spr(10, 9, (g, T) => { for (const x of [3, 5, 7]) { T.rect(x, 1, 1, 5, '#5aa040'); T.px(x - 1, 2, '#6ab84c'); } T.rect(4, 6, 3, 1, '#e07a30'); });
const rockSpr = spr(18, 12, (g, T) => {
  T.poly([[2, 10], [4, 4], [9, 2], [15, 4], [17, 10], [9, 12]], '#6a6a66'); T.poly([[4, 4], [9, 2], [10, 7], [3, 9]], '#8a8a84');
  T.px(12, 6, '#4e4e4a'); T.px(6, 8, '#4a6a3a'); T.px(7, 8, '#4a6a3a');
});
const mushSpr = spr(14, 10, (g, T) => {
  for (const [x, y, c] of [[3, 6, '#c84a3a'], [8, 4, '#d8d0b8'], [11, 7, '#c84a3a']]) { T.rect(x, y, 1, 3, '#e8e0d0'); T.rect(x - 1, y - 1, 3, 1, c); T.px(x, y - 2, c); }
});
const logSpr = spr(40, 22, (g, T) => {
  T.poly([[2, 14], [28, 1], [36, 5], [10, 18]], '#5a3e28'); T.poly([[2, 14], [10, 18], [10, 21], [2, 17]], '#3e2a1a');
  T.poly([[10, 18], [36, 5], [36, 8], [10, 21]], '#4a321e');
  T.disc(32, 4, 3, '#8a6a48'); T.disc(32, 4, 1, '#6a4a30');
  for (let i = 0; i < 6; i++) T.px(8 + i * 4, 13 - i * 2, '#3e6a2a');
});
const graveSpr = sd => spr(14, 22, (g, T) => {
  const tall = sd % 2;
  T.rect(2, tall ? 4 : 8, 10, tall ? 16 : 12, '#7a7a80'); T.disc(7, tall ? 5 : 9, 5, '#7a7a80');
  T.rect(2, tall ? 4 : 8, 3, tall ? 16 : 12, '#9a9aa0'); T.rect(9, tall ? 4 : 8, 3, tall ? 16 : 12, '#5e5e66');
  T.rect(5, tall ? 10 : 12, 4, 1, '#4e4e56'); T.rect(5, tall ? 13 : 15, 4, 1, '#4e4e56');
  T.rect(1, 19, 12, 3, '#3e5a2e'); T.px(3, 18, '#5a7a3a'); T.px(10, 18, '#5a7a3a');
});
const crossSpr = spr(14, 26, (g, T) => {
  T.rect(6, 2, 3, 22, '#6e6e76'); T.rect(2, 7, 11, 3, '#6e6e76'); T.rect(6, 2, 1, 22, '#8e8e96'); T.rect(2, 7, 11, 1, '#8e8e96');
  T.rect(3, 23, 9, 3, '#3e5a2e');
});
const wellSpr = spr(32, 42, (g, T) => {
  T.rect(5, 6, 2, 22, '#5a3e28'); T.rect(25, 6, 2, 22, '#4a3220'); T.rect(6, 9, 20, 1, '#6a4a30');
  T.rect(15, 10, 1, 7, '#8a7a5a'); T.rect(13, 16, 5, 4, '#6a5038'); T.rect(13, 16, 5, 1, '#8a6a48');
  T.poly([[1, 9], [16, 1], [31, 9], [16, 13]], '#8e3a2a'); T.poly([[1, 9], [16, 1], [16, 13]], '#a8483a');
  for (let i = 0; i < 4; i++) line(g, 3 + i * 3, 9 - i * 1.5, 16, 11 - i * 0.5, '#6e2a1e');
  for (let y = 26; y < 40; y++) for (let x = 4; x < 28; x++) {
    const row = (y - 26) / 4 | 0, edge = (y - 26) % 4 === 3 || ((x + row * 3) % 7 === 0);
    T.px(x, y, edge ? '#4e4c48' : x < 14 ? '#9a988e' : '#7e7c74');
  }
  for (let x = -12; x <= 12; x++) for (let y = -4; y <= 4; y++) { const e = (x * x) / 144 + (y * y) / 16; if (e <= 1) T.px(16 + x, 26 + y, e > 0.55 ? '#a8a69c' : '#141c22'); }
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
// fences & railings connect to neighbours of the same kind
function makeFence(conn, iron) {
  return spr(40, 40, (g, T) => {
    const cx = 20, cy = 30;
    const dirs = [[8, 4], [-8, -4], [-8, 4], [8, -4]];
    conn.forEach((on, i) => {
      if (!on) return;
      const [sx, sy] = dirs[i];
      if (iron) {
        line(g, cx, cy - 20, cx + sx, cy + sy - 20, '#4a4a56'); line(g, cx, cy - 4, cx + sx, cy + sy - 4, '#34343e');
        for (let k = 2; k < 8; k += 2) { const x = cx + sx * k / 8, y = cy + sy * k / 8; T.rect(x, y - 20, 1, 20, '#26262e'); T.px(x, y - 22, '#5a5a68'); }
      } else for (const [hgt, col] of [[4, '#7a5232'], [9, '#a07446']]) { line(g, cx, cy - hgt, cx + sx, cy + sy - hgt, col); line(g, cx, cy - hgt + 1, cx + sx, cy + sy - hgt + 1, '#5a3a22'); }
    });
    if (iron) { T.rect(cx - 1, cy - 24, 2, 24, '#2a2a32'); T.rect(cx - 1, cy - 26, 2, 2, '#6a6a78'); }
    else { T.rect(cx - 1, cy - 13, 3, 13, '#6a4426'); T.rect(cx - 1, cy - 13, 1, 13, '#8a6038'); T.rect(cx - 1, cy - 14, 3, 1, '#a07446'); }
  });
}

// ---------------------------------------------------------------- interior furniture
const isoPillarSpr = spr(24, 82, (g, T) => {
  T.poly([[2, 76], [12, 71], [22, 76], [12, 81]], '#8a837a'); T.poly([[2, 76], [12, 81], [12, 82], [2, 77]], '#5a554e');
  T.rect(5, 12, 14, 64, '#8f887e'); T.rect(5, 12, 4, 64, '#b4ac9f'); T.rect(15, 12, 4, 64, '#5a554e');
  T.rect(10, 12, 1, 64, '#77706a'); T.rect(13, 12, 1, 64, '#77706a');
  T.poly([[1, 9], [12, 3], [23, 9], [12, 15]], '#b4ac9f'); T.poly([[1, 9], [12, 15], [12, 17], [1, 11]], '#8a837a');
  T.poly([[12, 15], [23, 9], [23, 11], [12, 17]], '#6a645c');
  T.px(8, 30, '#4a453e'); T.px(9, 31, '#4a453e'); T.px(9, 32, '#4a453e'); T.px(16, 52, '#4a453e');
});
const woodPillarSpr = spr(20, 80, (g, T) => {
  T.rect(4, 6, 12, 72, '#5a3e28'); T.rect(4, 6, 3, 72, '#7a5638'); T.rect(13, 6, 3, 72, '#3a2618');
  for (let y = 14; y < 76; y += 9) T.rect(7, y, 6, 1, '#4a321e');
  T.rect(1, 2, 18, 5, '#6a4a30'); T.rect(1, 2, 18, 1, '#8a6a48');
});
// one pew segment occupies a tile; it faces the back wall (backrest on the +y side)
function makePew(conn) {
  return spr(40, 34, (g, T) => {
    const o = [20, 24], P = (x, y, z) => { const r = rel(x, y, z); return [o[0] + r[0], o[1] + r[1]]; };
    const x0 = conn[1] ? -0.5 : -0.42, x1 = conn[0] ? 0.5 : 0.42;
    polyFn(g, [P(x0, -0.3, 8), P(x1, -0.3, 8), P(x1, 0.25, 8), P(x0, 0.25, 8)], () => '#6e5640');
    face(g, P(x0, 0.25, 8), P(x1, 0.25, 8), 3, () => '#4a3828');
    face(g, P(x0, 0.32, 0), P(x1, 0.32, 0), 20, (u, v) => v === 19 ? '#8a6c50' : (u + v * 0) % 9 === 0 ? '#3e2e20' : '#5a4532');
    if (!conn[0]) face(g, P(x1, 0.32, 0), P(x1, -0.3, 0), 8, () => '#3a2a1c');
    for (const xx of [x0 + 0.06, x1 - 0.08]) { const p = P(xx, -0.25, 0); T.rect(p[0], p[1] - 8, 1, 8, '#2e2218'); }
  });
}
const altarSpr = spr(44, 40, (g, T) => {
  const o = [22, 26], P = (x, y, z) => { const r = rel(x, y, z); return [o[0] + r[0], o[1] + r[1]]; };
  const st = stoneTex(['#6e6870', '#645e66', '#78727a'], '#3e3a42', 8, 4);
  face(g, P(-0.6, 0.45, 0), P(0.6, 0.45, 0), 16, st);
  face(g, P(0.6, 0.45, 0), P(0.6, -0.45, 0), 16, st, 0.25);
  polyFn(g, [P(-0.6, -0.45, 16), P(0.6, -0.45, 16), P(0.6, 0.45, 16), P(-0.6, 0.45, 16)], () => '#8a8490');
  face(g, P(-0.25, 0.46, 2), P(0.25, 0.46, 2), 15, (u, v) => v === 14 ? '#a83030' : v === 1 ? '#c8a868' : '#7a1a1a');
  polyFn(g, [P(-0.25, -0.45, 16.5), P(0.25, -0.45, 16.5), P(0.25, 0.46, 16.5), P(-0.25, 0.46, 16.5)], () => '#8a2222');
  const bk = P(0, 0, 16); T.rect(bk[0] - 3, bk[1] - 3, 6, 2, '#e8e0cc'); T.rect(bk[0] - 3, bk[1] - 3, 3, 2, '#d8d0b8');
});
const bellSpr = spr(46, 56, (g, T) => {
  T.rect(4, 0, 38, 4, '#4a3420'); T.rect(21, 4, 4, 6, '#3a2a18');
  T.poly([[15, 10], [31, 10], [35, 30], [41, 42], [5, 42], [11, 30]], '#6e5a3a');
  T.poly([[15, 10], [20, 10], [16, 30], [12, 42], [5, 42], [11, 30]], '#957c50');
  T.poly([[28, 10], [31, 10], [35, 30], [41, 42], [36, 42], [32, 30]], '#4a3c26');
  T.rect(4, 41, 38, 3, '#3e321f'); T.rect(4, 41, 38, 1, '#a88c5a');
  for (let x = 13; x < 34; x += 3) T.px(x, 22, '#c8a868');
  line(g, 26, 14, 30, 30, '#1e1810'); line(g, 30, 30, 27, 40, '#1e1810');      // the crack
  T.rect(22, 44, 2, 8, '#2a2216'); T.disc(23, 52, 2, '#3e321f');
});
function drawCandleStand(x, y) {
  ctx.fillStyle = '#2e2924'; ctx.fillRect(x, y - 22, 1, 22); ctx.fillRect(x - 3, y - 1, 7, 1); ctx.fillRect(x - 1, y - 2, 3, 1);
  ctx.fillStyle = '#463c33'; ctx.fillRect(x - 5, y - 19, 11, 1); ctx.fillRect(x - 5, y - 20, 1, 1); ctx.fillRect(x + 5, y - 20, 1, 1);
  for (const [cx, hgt] of [[x - 5, 3], [x, 5], [x + 5, 3]]) {
    ctx.fillStyle = '#e4dccb'; ctx.fillRect(cx, y - 20 - hgt, 1, hgt);
    const fy = y - 22 - hgt + (Math.random() < 0.15 ? -1 : 0);
    ctx.fillStyle = '#ff9a40'; ctx.fillRect(cx, fy, 1, 2); ctx.fillStyle = '#fff2b0'; ctx.fillRect(cx, fy + 1, 1, 1);
  }
}
function drawWinch(x, y, turned) {
  ctx.fillStyle = '#4a3e32'; ctx.fillRect(x - 1, y - 16, 3, 16); ctx.fillRect(x - 4, y - 1, 9, 1);
  ctx.fillStyle = '#8a7258';
  for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; ctx.fillRect(Math.round(x + Math.cos(a) * 5), Math.round(y - 13 + Math.sin(a) * 5), 1, 1); }
  ctx.fillStyle = '#b89a70';
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + (turned ? 0.8 : 0); ctx.fillRect(Math.round(x + Math.cos(a) * 3), Math.round(y - 13 + Math.sin(a) * 3), 1, 1); }
  ctx.fillStyle = '#3a3a44'; for (let yy = y - 40; yy < y - 18; yy += 2) ctx.fillRect(x, yy, 1, 1);
}

// ---------------------------------------------------------------- buildings
// Returns { img, ox, oy, windows[[x,y,z]], chimney:[x,y,z] } with (ox, oy) = canvas offset from the footprint's top corner.
function buildHouse(Hs) {
  const { w, d, wh, rh } = Hs, ov = 0.3;
  const corners = [rel(-ov, d + ov), rel(w + ov, -ov), rel(0, d / 2, wh + rh)];
  const minX = corners[0][0] - 4, maxX = corners[1][0] + 4, minY = corners[2][1] - 36, maxY = rel(w, d)[1] + 2;
  const c = canvas(Math.ceil(maxX - minX), Math.ceil(maxY - minY)), g = c.getContext('2d');
  const L = (x, y, z = 0) => { const p = rel(x, y, z); return [p[0] - minX, p[1] - minY]; };
  const plaster = (u, v) => (hash(u, v) % 9 === 0) ? '#cfc2a0' : '#ddd0ae';
  const stone = stoneTex(['#7a7a86', '#6c6c78', '#868692', '#727280'], '#3e3e48');
  const win = (wu, wv, ww, wh2) => (wu === 0 || wu === ww - 1 || wv === 0 || wv === wh2 - 1 || wu === (ww / 2 | 0) || wv === (wh2 / 2 | 0)) ? '#3a2a1e' : wv > wh2 / 2 ? '#f6d080' : '#e8a850';
  const box = (wu, wv) => wv === 1 ? ['#e85a6a', '#f4f0f0', '#e888b0', '#3e6a2a'][hash(wu, 3) % 4] : '#6a3a22';
  const door = (wu, wv, dw, dh) => {
    if (wv >= dh - 3 && (wu < 1 || wu > dw - 2)) return null;
    if (wu === 0 || wu === dw - 1 || wv === dh - 1) return '#2a2a22';
    if (wu === dw - 3 && wv === 9) return '#e0c070';
    return wu % 3 === 0 ? '#355e32' : '#46763e';
  };
  const wallTex = openings => (u, v) => {
    for (const o of openings) if (u >= o.u && u < o.u + o.w && v >= o.v && v < o.v + o.h) { const r = o.tex(u - o.u, v - o.v, o.w, o.h); if (r !== null) return r; }
    if (v < 15) return stone(u, v);
    if (v < 17 || v >= wh - 2 || u % 16 < 2) return '#3a2a1e';
    if ((u % 16 === 8 + ((v - 17) / 2 | 0) || u % 16 === 8 - ((v - 17) / 2 | 0)) && (u / 16 | 0) % 2 === 1) return '#4a3426';
    return plaster(u, v);
  };
  face(g, L(0, d), L(w, d), wh, wallTex([
    { u: 19, v: 0, w: 11, h: 21, tex: door },
    { u: 38, v: 19, w: 11, h: 10, tex: win }, { u: 37, v: 17, w: 13, h: 2, tex: box },
    { u: 3, v: 19, w: 9, h: 10, tex: win }, { u: 2, v: 17, w: 11, h: 2, tex: box },
  ]));
  face(g, L(w, d), L(w, 0), wh, wallTex([{ u: 18, v: 19, w: 11, h: 10, tex: win }, { u: 17, v: 17, w: 13, h: 2, tex: box }]), 0.2);
  const gC = L(w, d, wh), gB = L(w, 0, wh), gR = L(w, d / 2, wh + rh);
  polyFn(g, [gC, gB, gR], (x, y) => (Math.abs(x - gR[0]) < 1 || (y - Math.round(gR[1])) % 9 === 0) ? '#3a2a1e' : '#c6b894');
  const Tg = pxTools(g); Tg.disc(gR[0], gR[1] + 14, 3, '#3a2a1e'); Tg.disc(gR[0], gR[1] + 14, 2, '#f6d080');
  const R1 = L(-ov, d / 2, wh + rh), R2 = L(w + ov, d / 2, wh + rh);
  const E1 = L(-ov, d + ov, wh - 3), E2 = L(w + ov, d + ov, wh - 3), F1 = L(-ov, -ov, wh - 3), F2 = L(w + ov, -ov, wh - 3);
  const shingles = (lx, ly, pal) => (x, y) => {
    const dd = ly + (x - lx) * 0.5 - y, row = Math.floor(dd / 3);
    if (dd % 3 < 1) return '#283044';
    if ((x + row * 3) % 6 === 0) return '#323c54';
    return pal[hash(x / 6 | 0, row) % pal.length];
  };
  polyFn(g, [F1, F2, R2, R1], shingles(F1[0], F1[1], ['#5a6c90', '#6276a0', '#566890']));
  const cx0 = 0.7, cy0 = 0.5, zb = wh + 6, zt = wh + rh + 12;
  const brick = (u, v) => (v % 4 === 3 || (u + ((v / 4 | 0) % 2) * 3) % 6 === 0) ? '#4a2a20' : '#8a4e3a';
  face(g, L(cx0, cy0 + 0.5, zb), L(cx0 + 0.5, cy0 + 0.5, zb), zt - zb, brick); face(g, L(cx0 + 0.5, cy0 + 0.5, zb), L(cx0 + 0.5, cy0, zb), zt - zb, brick, 0.22);
  polyFn(g, [L(cx0, cy0, zt), L(cx0 + 0.5, cy0, zt), L(cx0 + 0.5, cy0 + 0.5, zt), L(cx0, cy0 + 0.5, zt)], () => '#2a2422');
  polyFn(g, [R1, R2, E2, E1], shingles(E1[0], E1[1], ['#4a5a7a', '#52648a', '#46567a']));
  line(g, E1[0], E1[1], E2[0], E2[1], '#1e2230'); line(g, R1[0], R1[1], R2[0], R2[1], '#7a8aa8');
  line(g, R2[0], R2[1], E2[0], E2[1], '#2a2018'); line(g, R2[0], R2[1], F2[0], F2[1], '#2a2018');
  return { img: c, ox: minX, oy: minY, windows: [[43 / 16, d, 24], [7 / 16, d, 24], [w, d - 23 / 16, 24]], chimney: [cx0 + 0.25, cy0 + 0.25, zt] };
}

// The church of Saint Orrin: a stone nave (ridge along x) with a bell tower on its +x end.
function buildChurch(Cs) {
  const { w, d, wh, rh, th } = Cs, tx = w, ty = 1, tw = 2, td = 2, ov = 0.25;
  const minX = rel(-ov, d + ov)[0] - 6, maxX = rel(tx + tw + 0.2, ty - 0.2)[0] + 6;
  const minY = rel(tx + 1, ty + 1, th + 62)[1] - 6, maxY = rel(tx + tw, ty + td)[1] + 4;
  const c = canvas(Math.ceil(maxX - minX), Math.ceil(maxY - minY)), g = c.getContext('2d'), T = pxTools(g);
  const L = (x, y, z = 0) => { const p = rel(x, y, z); return [p[0] - minX, p[1] - minY]; };
  const stone = stoneTex(['#6a6a74', '#5e5e68', '#74747e', '#64646e'], '#34343e', 12, 6);
  const withOpenings = (openings, base) => (u, v) => {
    for (const o of openings) if (u >= o.u && u < o.u + o.w && v >= o.v && v < o.v + o.h) { const r = o.tex(u - o.u, v - o.v, o.w, o.h); if (r !== null) return r; }
    if (v < 4) return '#3e3e48';
    return base(u, v);
  };
  // nave
  const naveWin = [];
  for (let k = 0; k < w; k++) naveWin.push({ u: k * 16 + 4, v: 16, w: 8, h: 28, tex: (a, b2, ww, hh) => stainedGlass(a, b2, ww, hh, k * 7) });
  face(g, L(0, d), L(w, d), wh, withOpenings(naveWin, (u, v) => (u % 16 === 0 && v > 4) ? '#55555f' : stone(u, v)));
  face(g, L(w, d), L(w, 0), wh, stone, 0.25);
  const R1 = L(-ov, d / 2, wh + rh), R2 = L(w, d / 2, wh + rh);
  const E1 = L(-ov, d + ov, wh - 3), E2 = L(w, d + ov, wh - 3), F1 = L(-ov, -ov, wh - 3), F2 = L(w, -ov, wh - 3);
  const slate = (lx, ly, pal) => (x, y) => {
    const dd = ly + (x - lx) * 0.5 - y, row = Math.floor(dd / 4);
    if (dd % 4 < 1) return '#1e2230';
    if ((x + row * 3) % 7 === 0) return '#2a3040';
    return pal[hash(x / 7 | 0, row) % pal.length];
  };
  polyFn(g, [F1, F2, R2, R1], slate(F1[0], F1[1], ['#4a5266', '#525a70', '#464e62']));
  polyFn(g, [R1, R2, E2, E1], slate(E1[0], E1[1], ['#3a4256', '#424a60', '#3e4658']));
  line(g, E1[0], E1[1], E2[0], E2[1], '#14161e'); line(g, R1[0], R1[1], R2[0], R2[1], '#6a7288');
  // tower
  const door = (a, b2, ww, hh) => {
    const cx = (ww - 1) / 2, ay = hh - ww / 2;
    if (b2 > ay && Math.hypot(a - cx, b2 - ay) > ww / 2) return null;
    if (a === 0 || a === ww - 1 || (b2 > ay && Math.hypot(a - cx, b2 - ay) > ww / 2 - 1.5)) return '#2a2630';
    if (Math.abs(a - cx) < 0.6) return '#1a120c';
    if (b2 % 6 === 3 && a % 4 === 2) return '#8a8a90';
    return a % 3 === 0 ? '#3e2a1a' : '#4e3622';
  };
  const belfryOpen = (a, b2, ww, hh) => {
    const cx = (ww - 1) / 2, ay = hh - ww / 2;
    if (b2 > ay && Math.hypot(a - cx, b2 - ay) > ww / 2) return null;
    return b2 < 6 && Math.abs(a - cx) < 3 ? '#6e5a3a' : '#0c0a10';
  };
  const rose = (a, b2) => {
    const dd = Math.hypot(a - 6.5, b2 - 6.5);
    if (dd > 7) return null; if (dd > 6) return '#2a2630';
    const ang = Math.atan2(b2 - 6.5, a - 6.5);
    return (Math.round(ang / (Math.PI / 4)) * (Math.PI / 4) - ang) ** 2 < 0.01 || dd < 1.5 ? '#2a2630' : ['#a83030', '#d8c890', '#3a5a8a'][(dd / 2 | 0) % 3];
  };
  face(g, L(tx, ty + td), L(tx + tw, ty + td), th, withOpenings([
    { u: 9, v: th - 26, w: 12, h: 18, tex: belfryOpen },
  ], (u, v) => (v > th - 4 ? '#7a7a84' : stone(u, v))));
  face(g, L(tx + tw, ty + td), L(tx + tw, ty), th, withOpenings([
    { u: 6, v: 0, w: 20, h: 32, tex: door }, { u: 9, v: 46, w: 14, h: 14, tex: rose },
    { u: 10, v: th - 26, w: 12, h: 18, tex: belfryOpen },
  ], (u, v) => (v > th - 4 ? '#7a7a84' : stone(u, v))), 0.18);
  // spire
  const apex = L(tx + 1, ty + 1, th + 58);
  polyFn(g, [L(tx - 0.1, ty + td + 0.1, th), L(tx + tw + 0.1, ty + td + 0.1, th), apex], slate(...L(tx, ty + td, th), ['#4a5266', '#525a70']));
  polyFn(g, [L(tx + tw + 0.1, ty + td + 0.1, th), L(tx + tw + 0.1, ty - 0.1, th), apex], (x, y) => ((y + x * 0.5) % 4 < 1) ? '#1a1e2a' : '#353c50');
  T.rect(apex[0], apex[1] - 9, 1, 9, '#c8a868'); T.rect(apex[0] - 2, apex[1] - 7, 5, 1, '#c8a868');
  return {
    img: c, ox: minX, oy: minY,
    windows: naveWin.map((o, k) => [k + 0.5, d, 30]),
    door: [tx + tw, ty + td / 2],
  };
}

// ---------------------------------------------------------------- floor ritual circle (painted per pixel in world space)
function circleColor(dx, dy, r) {
  const d = Math.hypot(dx, dy) / r, ang = Math.atan2(dy, dx);
  if (d > 1.04) return null;
  if (d > 0.95) return '#6a1616';
  if (d > 0.92) return '#240909';
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; if (Math.hypot(dx - Math.cos(a) * r * 0.98, dy - Math.sin(a) * r * 0.98) < r * 0.05) return '#8a7c58'; }
  if (d > 0.82) return '#262325';
  if (d > 0.8) return '#8a7c58';
  if (d > 0.6) { const rr = hash(Math.floor((ang + 4) * 9), Math.floor(d * 18)) % 5; return rr === 0 ? '#cfc4a4' : '#1b191b'; }
  if (d > 0.58) return '#8a7c58';
  if (d > 0.5 && d < 0.53) return '#5a1414';
  const spikes = Math.abs(Math.cos(ang * 4)), long = Math.abs(Math.cos(ang * 2));
  const starR = 0.12 + Math.pow(spikes, 6) * (long > 0.7 ? 0.42 : 0.26);
  if (d < starR) return (Math.sin(ang * 8) > 0) ? '#cfc4a4' : '#8a7e64';
  if (d < 0.1) return '#7a1c1c';
  return '#2c292b';
}

// ---------------------------------------------------------------- home furniture (simple iso boxes)
// Returns { img, ax, ay } where (ax, ay) is the tile-centre ground point inside the image.
function boxSprite(w, d, h, top, left, right, opts = {}) {
  const ox = Math.ceil((w + d) / 2 * 16) + 4, oy = Math.ceil((w + d) / 2 * 8 + h) + 4;
  const img = spr(ox * 2, oy + Math.ceil((w + d) / 2 * 8) + 4, (g, T) => {
    const P = (x, y, z) => { const r = rel(x, y, z); return [ox + r[0], oy + r[1]]; };
    face(g, P(-w / 2, d / 2, 0), P(w / 2, d / 2, 0), h, typeof left === 'function' ? left : () => left);
    face(g, P(w / 2, d / 2, 0), P(w / 2, -d / 2, 0), h, typeof right === 'function' ? right : () => right, 0.2);
    polyFn(g, [P(-w / 2, -d / 2, h), P(w / 2, -d / 2, h), P(w / 2, d / 2, h), P(-w / 2, d / 2, h)], typeof top === 'function' ? top : () => top);
    if (opts.after) opts.after(g, T, P);
  });
  return { img, ax: ox, ay: oy };
}
const HEARTH = boxSprite(1.5, 0.9, 86,
  '#5a5250',
  (u, v) => {
    if (u > 6 && u < 18 && v < 16) return v > 13 || u < 8 || u > 16 ? '#2a2220' : '#120a08';     // fire opening
    if (v === 19 || v === 20) return '#6a4a30';                                                   // mantel
    return stoneTex(['#6e6660', '#625a56', '#7a726a'], '#3a3432', 8, 5)(u, v);
  },
  stoneTex(['#5e5650', '#544c48', '#6a625a'], '#2e2826', 8, 5),
  { after: (g, T, P) => { const m = P(-0.2, 0.46, 23); T.rect(m[0], m[1] - 4, 2, 4, '#e8e0cc'); T.px(m[0], m[1] - 6, '#ffb050'); T.rect(m[0] + 6, m[1] - 3, 4, 3, '#8a5a3a'); } });
const TABLE = boxSprite(1.1, 0.75, 13, (x, y) => (y % 3 === 0 ? '#7a5a3a' : '#8a6a48'), (u, v) => (v > 9 || u < 2 || u > 20 ? '#5a4030' : null), (u, v) => (v > 9 || u < 2 || u > 9 ? '#4a3424' : null),
  { after: (g, T, P) => { const c = P(0, 0, 13); T.disc(c[0] - 5, c[1], 2, '#c8a870'); T.rect(c[0] + 4, c[1] - 5, 1, 4, '#e8e0cc'); T.px(c[0] + 4, c[1] - 7, '#ffb050'); T.rect(c[0] - 1, c[1] - 1, 3, 2, '#6a8a9a'); } });
const BED = boxSprite(0.9, 1.0, 9, (x, y) => ((x >> 2) + (y >> 1)) % 2 ? '#a83a3a' : '#e8dcc8', '#5a3e28', '#4a3220',
  { after: (g, T, P) => { const p = P(0, -0.42, 9); T.rect(p[0] - 5, p[1] - 3, 10, 3, '#f4f0e8'); } });
const SHELF = boxSprite(0.45, 1.0, 44, '#5a4030', '#4a3424', (u, v) => {
  if (v % 11 < 2 || u < 1 || u > 14) return '#3a2818';
  return ['#7a2a2a', '#2a4a6a', '#6a6a3a', '#4a2a5a', '#8a6a3a', '#2a5a3a'][hash(u >> 1, v / 11 | 0) % 6];
});
SPR.maren = mk([...ashTop, ...LEGS[0]], { ...PAL, h: '#aaa59c', H: '#d4d0c8', s: '#d0a890', S: '#a07860', c: '#3e4a3a', C: '#2a3428', l: '#56624e', r: '#7a5a3a', R: '#5a4028', b: '#2a2018' });
