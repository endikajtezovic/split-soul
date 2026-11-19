"use strict";
// ======================================================================
//  CHAPTER IV — THE CLOUDWATER BATHS
//  The Merrow reaches Saltmere. Ash says goodbye to Tamsin and Kit, and finds a town too
//  tired to stand up. Everyone sends him to Big Ondo's bathhouse — where the steam is alive.
//
//  Extra legend:  - cobbles   H building footprint   : solid (no art)   9 street lamp   3 red paper lantern
//                 7 fountain   8 market stall   * planter   i notice board   6 potted bamboo
//                 1 hot pool   2 wash stool + bucket   4 front desk   5 towel shelf   $ bath rock
//  Areas:         sm_quay -> saltmere (the town) -> baths_hall -> baths_pools -> baths_steam
//  Story flags:   smArrived, smGoodbye, townIntro, talked_*, tiredTalk, hallIntro, sawThread, poolsIntro, soaked,
//                 poolsClear, shroudIntro, ondoFree, ondoAwake
// ======================================================================

Object.assign(SPEAKERS, {
  HANA: { name: 'Hana', col: '#e88878' },
  ONDO: { name: 'Big Ondo', col: '#f0c890' },
  SHROUD: { name: 'The Steamshroud', col: '#ff8a7a', cls: 'voice' },
  NETTA: { name: 'Netta, fishmonger', col: '#c8d0a8' },
  ABEL: { name: 'Old Abel', col: '#d8d4cc' },
  LAMPER: { name: 'The Lamplighter', col: '#e8c878' },
  DOCKER: { name: 'Dockhand', col: '#c8a888' },
  WATCH: { name: 'The Watchman', col: '#a8b8d0' },
  SIGN: { name: 'Notice board', col: '#c8b898', cls: 'note' },
});
Object.assign(SFX, {
  hiss:   () => noise(0.7, 0.09, undefined, undefined, 3000),
  splash: () => { noise(0.5, 0.14, undefined, undefined, 0, 1800); tone(300, 0.3, 'sine', 0.05, 120); },
  yawn:   () => tone(320, 0.9, 'sine', 0.06, 180),
});
MOODS.bath = { top: 'rgba(255,214,190,0.5)', bot: 'rgba(230,200,200,0.5)', dark: 0.42, col: '20,8,10' };

// ---------------------------------------------------------------- steam: a white-out overlay with clear pockets around Ash
const steamC = canvas(W, H), steamG = steamC.getContext('2d');
function drawSteam(k) {
  if (k < 0.01) return;
  const sg = steamG, sk = spiritK;
  sg.globalCompositeOperation = 'source-over'; sg.globalAlpha = 1; sg.clearRect(0, 0, W, H);
  sg.fillStyle = `rgba(${214 - 70 * sk | 0},${222 - 40 * sk | 0},${230},${Math.min(0.93, k * 0.93)})`; sg.fillRect(0, 0, W, H);
  sg.globalAlpha = Math.min(1, k * 1.2);
  for (const [sp, off] of [[0.3, 0], [-0.2, 90]]) {
    const fx = (t * sp + off + camX * 0.6) % 256, fy = (t * 0.07 + off + camY * 0.6) % 160;
    for (let x = -fx - 256; x < W; x += 256) for (let y = -fy - 160; y < H; y += 160) sg.drawImage(fogTex, Math.round(x), Math.round(y));
  }
  sg.globalAlpha = 1; sg.globalCompositeOperation = 'destination-out';
  const hole = (x, y, r) => { const g = sg.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.55, 'rgba(0,0,0,0.85)'); g.addColorStop(1, 'rgba(0,0,0,0)'); sg.fillStyle = g; sg.fillRect(x - r, y - r, r * 2, r * 2); };
  if (!b.hidden) hole(SX(b), SY(b) - 10, 36 + 30 * (1 - k));
  if (s) hole(SX(s), SY(s) - 14, 46 + 30 * (1 - k));
  ctx.drawImage(steamC, 0, 0);
}
// wisps curling up off the hot water
function poolWisps(a = 1) {
  for (let y = 0; y < A.MH; y++) for (let x = 0; x < A.MW; x++) {
    if (A.map[y][x] !== '1') continue;
    for (let i = 0; i < 2; i++) {
      const h0 = hash(x * 3 + i, y), ph = ((t * 0.4 + h0 % 97) % 90) / 90;
      const px = isoX(x + 0.2 + (h0 % 60) / 100, y + 0.2 + (h0 % 37) / 60) - camX + Math.sin(t * 0.03 + h0) * 4, py = isoY(x + 0.5, y + 0.5) - camY - ph * 34;
      const r = 2 + ph * 5; ctx.fillStyle = `rgba(240,244,250,${0.16 * Math.sin(ph * Math.PI) * a})`;
      for (let dy = -r; dy <= r; dy++) { const hw = Math.round(Math.sqrt(r * r - dy * dy) * 1.3); ctx.fillRect(Math.round(px - hw), Math.round(py + dy * 0.6), hw * 2, 1); }
    }
  }
}
const steamTick = () => { A.steamK = (A.steamK ?? A.steamT ?? 0) + ((A.steamT ?? 0) - (A.steamK ?? 0)) * 0.03; };

// ---------------------------------------------------------------- steamlings
ENEMY_TYPES.steamling = {
  init: () => ({ r: 0.3, hp: 3, spd: 0.02, soul: true, rise: 40, windT: 42, killCols: ['#ffffff', '#dce8ee', '#a8bccc'] }),
  update(e) {
    if (e.flash > 0) e.flash--;
    e.anim++;
    if (e.rise > 0) { e.rise--; return; }
    const tgt = mode === 'spirit' && s && !s.recall ? s : b;
    if (e.wind > 0) {                                        // swelling up, flushing red, about to burst
      if (--e.wind === 0) {
        rings.push({ x: e.x, y: e.y, r: 0.2, max: 1.6, col: '255,200,190', dmg: 8 });
        burstW(e, 10, 16, ['#ffffff', '#f8c0b8', '#dce8ee'], 2.2, true, -0.02); sfx('hiss'); shake = Math.max(shake, 2);
        e.cd = 70;
      }
    } else if (e.cd > 0) { e.cd--; e.x += e.vx; e.y += e.vy; e.vx *= 0.88; e.vy *= 0.88; }
    else {
      const [ux, uy] = norm(tgt.x - e.x, tgt.y - e.y);
      e.x += ux * e.spd; e.y += uy * e.spd; e.face = (ux - uy) >= 0 ? 1 : -1;
      if (wd(e, tgt) < 1.05) { e.wind = e.windT; sfx('hiss'); }
    }
    boundIn(e);
  },
  draw(e) {
    const angry = e.wind > 0, sw = angry ? 1 + (1 - e.wind / e.windT) * 0.35 : 1;
    const img = STEAMLING[(angry ? 2 : 0) + ((e.anim / 14 | 0) % 2)], sc = sw;
    const a = (0.45 + 0.5 * spiritK) * (1 - e.rise / 40);
    const x = SX(e), y = SY(e) - 8 + Math.sin(e.anim * 0.08) * 1.5;
    ctx.save(); ctx.globalAlpha = a;
    if (e.flash > 0 || (angry && e.wind < 10 && t % 3 === 0)) ctx.filter = 'brightness(3)';
    ctx.drawImage(img, Math.round(x - 10 * sc), Math.round(y - 20 * sc), Math.round(20 * sc), Math.round(20 * sc));
    ctx.restore();
  },
};

// ---------------------------------------------------------------- the Steamshroud
//  stalk (visible, slow) -> one of: vanish into the steam, then mark + slam | wring out a spray of scalding drops | (hurt) summon steamlings
ENEMY_TYPES.shroud = {
  init: () => ({ r: 0.9, hp: 30, max: 30, boss: true, soul: true, name: 'The Steamshroud', phase: 'rise', pt: 100, glow: 0, p2: false,
                 rise: 1, vis: 0, cycle: 0, lightCol: '255,110,90', slams: 0 }),
  update(e) {
    if (e.flash > 0) e.flash--;
    e.anim++; e.pt--;
    const tgt = mode === 'spirit' && s && !s.recall ? s : b, spd = e.p2 ? 0.017 : 0.012;
    const show = v => { e.vis += (v - e.vis) * 0.06; };
    const next = () => {
      e.cycle++;
      const c = e.cycle % 3;
      if (c === 1) { e.phase = 'wring'; e.pt = 60; }
      else if (c === 2 && e.p2) { e.phase = 'summon'; e.pt = 50; }
      else { e.phase = 'vanish'; e.pt = 50; A.steamT = 1; sfx('hiss'); }
    };
    if (e.phase === 'rise') { show(1); if (e.pt <= 0) { e.phase = 'stalk'; e.pt = 150; e.rise = 0; } }
    else if (e.phase === 'stalk') {
      show(1); e.rise = 0; A.steamT = 0.3;
      const [ux, uy] = norm(tgt.x - e.x, tgt.y - e.y); e.x += ux * spd; e.y += uy * spd; e.face = (ux - uy) >= 0 ? 1 : -1;
      if (e.pt <= 0) next();
    } else if (e.phase === 'wring') {                        // twists itself tight, then flings scalding drops
      show(1); e.glow = 1 - e.pt / 60;
      if (e.pt % 12 === 0) sfx('hiss');
      if (e.pt <= 0) {
        e.glow = 0; sfx('cast'); shake = 4;
        const base = Math.atan2(tgt.y - e.y, tgt.x - e.x), n = e.p2 ? 3 : 2;
        for (let k = -n; k <= n; k++) bolts.push({ x: e.x, y: e.y, vx: Math.cos(base + k * 0.3) * 0.048, vy: Math.sin(base + k * 0.3) * 0.048, life: 300, c1: '#e8a0a0', c2: '#ffffff', light: '255,180,170' });
        e.phase = 'stalk'; e.pt = e.p2 ? 100 : 130;
      }
    } else if (e.phase === 'summon') {
      show(1); e.glow = 1 - e.pt / 50;
      if (e.pt <= 0) {
        e.glow = 0; sfx('hiss');
        for (let k = 0; k < 2; k++) { const a = Math.random() * 6.28; spawn('steamling', clamp(tgt.x + Math.cos(a) * 2.4, 1, A.MW - 1), clamp(tgt.y + Math.sin(a) * 2.4, 1, A.MH - 1)); }
        e.phase = 'stalk'; e.pt = 120;
      }
    } else if (e.phase === 'vanish') {                       // melts into the steam: you lose it
      show(0); if (e.vis < 0.3) e.rise = 1;
      if (e.pt <= 0) { e.phase = 'hidden'; e.pt = 80 + Math.random() * 60; e.slams = e.p2 ? 2 : 1; e.rise = 1; }
    } else if (e.phase === 'hidden') {
      show(0); e.x += Math.sin(e.anim * 0.03) * 0.03; e.y += Math.cos(e.anim * 0.025) * 0.03; boundIn(e);
      if (e.pt <= 0) { e.phase = 'mark'; e.pt = e.p2 ? 50 : 62; e.tx = tgt.x; e.ty = tgt.y; sfx('hiss'); }
    } else if (e.phase === 'mark') {                        // red eyes in the fog, a wet shadow under you... MOVE
      show(0);
      if (e.pt <= 0) {
        e.x = e.tx; e.y = e.ty; e.vis = 1; e.rise = 0; sfx('splash'); sfx('hit'); shake = 10;
        burstW(e, 6, 30, ['#ffffff', '#dce8ee', '#f8c0b8'], 3, true, -0.01);
        rings.push({ x: e.x, y: e.y, r: 0.4, max: e.p2 ? 3.6 : 3, col: '240,236,240', dmg: 10 });
        if (s && !s.recall && s.dashT === 0 && wd(e, s) < 1.25) hurtSpirit(14, e);
        if (wd(e, b) < 1.25 && !(mode === 'body' && b.dashT > 0)) { hurtBody(2, e); if (state !== 'play') return; }
        if (--e.slams > 0) { e.phase = 'hidden'; e.pt = 40; e.rise = 1; e.vis = 1; }
        else { e.phase = 'dazed'; e.pt = e.p2 ? 130 : 170; A.steamT = 0.3; }
      }
    } else if (e.phase === 'dazed') {                       // sagging, dripping, open to attack
      show(1); e.rise = 0;
      if (e.pt <= 0) { e.phase = 'stalk'; e.pt = 70; }
    }
    if (e.rise === 0) {
      if (s && !s.recall && s.dashT === 0 && s.iT === 0 && wd(e, s) < e.r + s.r) hurtSpirit(10, e);
      if (b.iT === 0 && wd(e, b) < e.r + (mode === 'body' ? b.r : 0.45)) hurtBody(1, e);
    }
    boundIn(e);
  },
  draw(e) {
    if (e.vis < 0.03) return;
    shadowAt(SX(e), SY(e), 18, 0.25 * e.vis);
    drawShroud(e, SX(e), SY(e) - (e.phase === 'dazed' ? -4 : 0), e.vis * 0.96, e.flash > 0);
  },
};
// drawn over the steam: the mark on the floor and the red eyes you see through the fog
function shroudOverSteam() {
  for (const e of enemies) {
    if (e.type !== 'shroud') continue;
    const ex = SX(e), ey = SY(e) - SHROUD.h + 22 + Math.sin(e.anim * 0.05) * 2;
    if (e.phase === 'mark') {
      const k = 1 - e.pt / 62, x = isoX(e.tx, e.ty) - camX, y = isoY(e.tx, e.ty) - camY;
      for (let a = 0; a < Math.PI * 2; a += 0.07) { const r = 18 * (0.4 + 0.6 * k); ctx.fillStyle = `rgba(${t % 8 < 4 ? '255,90,70' : '120,20,30'},${0.4 + 0.5 * k})`; ctx.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r * 0.5), 2, 1); }
      ctx.fillStyle = `rgba(40,10,20,${0.25 + 0.3 * k})`; for (let a = 0; a < Math.PI * 2; a += 0.3) for (let r = 0; r < 16 * k; r += 3) ctx.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r * 0.5), 2, 1);
      const gx = x, gy = y - SHROUD.h + 34 - (1 - k) * 10;
      ctx.fillStyle = t % 6 < 3 ? '#ff5040' : '#ffd0c0'; ctx.fillRect(Math.round(gx - 5), Math.round(gy), 3, 2); ctx.fillRect(Math.round(gx + 3), Math.round(gy), 3, 2);
    } else if (e.vis > 0.2 && e.rise === 0) {
      ctx.fillStyle = e.glow > 0.5 && t % 6 < 3 ? '#fff0e0' : '#ff4030';
      ctx.globalAlpha = e.vis; ctx.fillRect(Math.round(ex - 6), Math.round(ey + 12), 3, 2); ctx.fillRect(Math.round(ex + 3), Math.round(ey + 12), 3, 2); ctx.globalAlpha = 1;
    } else if (e.phase === 'hidden' && t % 90 < 8) {                       // a glint in the fog, somewhere
      ctx.fillStyle = 'rgba(255,70,50,0.7)'; ctx.fillRect(Math.round(ex - 6), Math.round(ey + 12), 3, 1); ctx.fillRect(Math.round(ex + 3), Math.round(ey + 12), 3, 1);
    }
  }
}

// ---------------------------------------------------------------- the town
const SALT_BLD = [
  { type: 'town', x0: 0, y0: 0, w: 4, d: 3, door: 1, plaster: ['#e4d6b8', '#d6c8a8'], timber: true, seed: 1 },
  { type: 'town', x0: 6, y0: 0, w: 5, d: 3, door: 2, shop: true, awning: ['#c8402e', '#ece4d4'], sign: '#e8c060', plaster: ['#e8dcc4', '#dacfb4'], roof: ['#8a3a2a', '#9a4632', '#7a3424'], roofLine: '#4a1e16', ridge: '#b86a50', seed: 2, chimney: 3.6 },
  { type: 'town', x0: 13, y0: 0, w: 4, d: 3, door: 1, plaster: ['#b8c8d0', '#a8b8c4'], roof: ['#8a3a2a', '#9a4632', '#7a3424'], roofLine: '#4a1e16', ridge: '#b86a50', shutter: '#3a5a6a', seed: 3 },
  { type: 'bath', x0: 20, y0: 0, w: 7, d: 5, door: 3.5 },
  { type: 'town', x0: 0, y0: 8, w: 3, d: 4, door: 1, plaster: ['#e0b4a0', '#d4a690'], timber: true, wh: 58, seed: 4 },
  { type: 'town', x0: 0, y0: 16, w: 3, d: 4, door: 1, plaster: ['#e4d6b8', '#d6c8a8'], shutter: '#5a3a2a', wh: 58, seed: 5 },
  { type: 'town', x0: 24, y0: 9, w: 6, d: 5, door: 2, plaster: ['#7a7068', '#6e645c'], stone: ['#5a5a62', '#50505a', '#64646c'], roof: ['#3a3e48', '#44485a', '#34384a'], shutter: '#3a3a40', dark: true, boarded: true, seed: 6, wh: 50, chimney: 4.5 },
  { type: 'town', x0: 25, y0: 17, w: 5, d: 3, door: 2, plaster: ['#d8dcc8', '#c8ccb8'], seed: 7 },
];
const SALT_MAP = (() => {
  const MW = 30, MH = 26, m = Array.from({ length: MH }, () => new Array(MW).fill('-'));
  const put = (x, y, c) => { if (x >= 0 && y >= 0 && x < MW && y < MH) m[y][x] = c; };
  for (const B of SALT_BLD) for (let y = B.y0; y < B.y0 + B.d; y++) for (let x = B.x0; x < B.x0 + B.w; x++) put(x, y, 'H');
  for (const [x, y] of [[4, 0], [5, 0], [11, 0], [12, 0], [17, 0], [19, 0], [29, 6]]) put(x, y, 'b');
  for (const [x, y] of [[4, 1], [5, 1], [12, 1], [18, 0], [3, 13], [3, 14], [4, 13], [3, 20], [4, 20], [24, 20], [29, 15]]) put(x, y, ',');
  put(4, 6, 'T'); put(18, 1, 'T');
  for (let y = 12; y <= 14; y++) for (let x = 12; x <= 14; x++) put(x, y, ':'); put(13, 13, '7');
  for (const [x, y] of [[9, 11], [9, 15], [17, 11], [17, 15]]) put(x, y, '8');
  for (const [x, y] of [[11, 18], [15, 8]]) put(x, y, 'B');
  for (const [x, y] of [[8, 9], [18, 9], [8, 18], [18, 18], [6, 21], [14, 21], [22, 21], [4, 3]]) put(x, y, '9');
  for (const [x, y] of [[20, 6], [27, 6], [20, 9], [27, 3]]) put(x, y, '3');
  for (const [x, y] of [[19, 5], [28, 1], [28, 5]]) put(x, y, '6');
  for (const [x, y] of [[6, 3], [16, 3], [3, 15]]) put(x, y, '*');
  put(1, 4, 'i');
  for (const x of [1, 7, 13, 19, 25]) put(x, 25, 'n');
  for (const [x, y, c] of [[10, 22, 'x'], [11, 22, 'x'], [12, 22, 'u'], [21, 23, 'u'], [27, 22, 'u'], [28, 22, 'x'], [23, 15, 'u']]) put(x, y, c);
  return m.map(r => r.join(''));
})();
const TOWN_NPC = {
  netta:  { x: 10.6, y: 15.6, spr: SPR.netta, face: -1 },
  abel:   { x: 12.3, y: 18.5, spr: SPR.abel, face: -1 },
  lamper: { x: 8.6, y: 10.1, spr: SPR.lamper, face: 1 },
  docker: { x: 16.5, y: 23.4, spr: SPR.docker, face: -1 },
  watch:  { x: 0.9, y: 14, spr: SPR.watch, face: 1 },
};
const townKind = ch => ('.,Tb~hd'.includes(ch) ? null : 'cobble');

Object.assign(AREAS, {
  // -------------------------------------------------------------- 1. the quay: goodbye to the Merrow, to Tamsin and Kit
  sm_quay: () => ({
    name: 'Saltmere Quay', sub: 'Saltmere', outdoor: true, mood: 'dusk', music: 'ambient', seed: 81,
    MW: 16, MH: 26, fireflies: 0, sea: true, edge: { kind: 'pier', h: 7 }, devSpawn: { x: 12.5, y: 2.2 }, kind: townKind,
    ext: (x, y) => (y >= 4 ? '~' : y < 0 ? 'H' : x >= 16 ? '-' : null),
    buildings: [
      { type: 'town', x0: -1, y0: -4, w: 4, d: 3, door: 1, plaster: ['#e0b4a0', '#d4a690'], timber: true, seed: 11 },
      { type: 'town', x0: 4, y0: -4, w: 5, d: 3, door: 2, shop: true, awning: ['#3a6a8a', '#ece4d4'], sign: '#c8e0e8', seed: 12, chimney: 3.6 },
      { type: 'town', x0: 10, y0: -4, w: 4, d: 3, door: 1, plaster: ['#b8c8d0', '#a8b8c4'], roof: ['#8a3a2a', '#9a4632', '#7a3424'], roofLine: '#4a1e16', ridge: '#b86a50', shutter: '#3a5a6a', seed: 13 },
    ],
    map: [
      '-9--x-u---9--9--', '------x---------', '-u--------------', '----------------',
      '~hhhhh~~dd~~~~~~', '~hhhhh~~dd~~~~~~', '~hhhhh~~nd~~~~~~', '~hhhhh~~dd~~~~~~',
      '~hhhhh~~dd~~~~~~', '~hhhhh~~dd~~~~~~', '~hhhhh~~dn~~~~~~', '~hhhhh~~dd~~~~~~',
      '~hhhhh~~dd~~~~~~', '~hhhhh~~dd~~~~~~', '~hhhhh~~nd~~~~~~', '~hhhhh~~dd~~~~~~',
      '~hhhhh~~dd~~~~~~', '~hhhhh~~dd~~~~~~', '~hhhhh~~dn~~~~~~', '~hhhhh~~dd~~~~~~',
      '~hhhhh~~dd~~~~~~', '~hhhhh~~dd~~~~~~', '~hhhhh~~nd~~~~~~', '~~~~~~~~dd~~~~~~',
      '~~~~~~~~dn~~~~~~', '~~~~~~~~dd~~~~~~',
    ],
    ship: { x0: 0.8, y0: 4.2, w: 4.6, d: 18 },
    npcs: () => {
      const L = [{ x: 9.6, y: 11.8, spr: SPR.captain, face: -1 }];
      if (!flags.smGoodbye) L.push({ x: 10.2, y: 2.6, spr: SPR.tamsin, face: -1 }, { x: 11.1, y: 3.1, spr: SPR.kit, face: -1 });
      if (QUAY.walkers) L.push(...QUAY.walkers);
      return L;
    },
    exits: [{ edge: 'xmax', a: 0, b: 4, to: 'saltmere', spawn: { x: 4.5, y: 24.6 }, block: 'Say goodbye first.', blockIf: () => !flags.smGoodbye }],
    interact: [
      { x: 9.6, y: 11.8, label: 'Talk', cond: () => flags.smGoodbye, fn: () => say([['HALE', "Go on up into town, lad. Find a bed. I'll ask about the Point, and I'll find you when I hear anything."]]) },
      { x: 6.6, y: 13.6, label: 'Look', range: 1.0, fn: () => say([['ASH', "The Merrow. She looks smaller from out here. Friendlier, too, now nobody's chained to anything."]]) },
    ],
    onEnter: quayEnter,
  }),

  // -------------------------------------------------------------- 2. Saltmere: harbour front, Lantern Square, Steam Lane, and the roads out
  saltmere: () => ({
    name: 'Saltmere', sub: 'Lantern Square', outdoor: true, mood: 'dusk', music: 'ambient', seed: 83, fireflies: 6,
    MW: 30, MH: 26, sea: true, edge: { kind: 'pier', h: 7 }, kind: townKind, devSpawn: { x: 13.5, y: 20 },
    ext: (x, y) => (y >= 26 ? '~' : null),
    buildings: SALT_BLD,
    map: SALT_MAP,
    npcs: () => Object.values(TOWN_NPC).map(n => ({ ...n })),
    exits: [
      { edge: 'ymax', a: 3, b: 7, to: 'sm_quay', spawn: { x: 14.6, y: 2 } },
      { edge: 'xmin', a: 3, b: 8, block: "The Academy road, up the hill. Tamsin and Kit will still be unpacking. Later." },
      { edge: 'xmin', a: 12, b: 16, block: "The watchman won't let anyone out to the Point." },
      { edge: 'xmax', a: 14, b: 17, block: "Cannery Row. Every door's nailed shut, and the whole street smells of old fish." },
    ],
    interact: [
      { o: () => TOWN_NPC.netta, label: 'Talk', fn: () => townTalk('netta') },
      { o: () => TOWN_NPC.abel, label: 'Talk', fn: () => townTalk('abel') },
      { o: () => TOWN_NPC.lamper, label: 'Talk', fn: () => townTalk('lamper') },
      { o: () => TOWN_NPC.docker, label: 'Talk', fn: () => townTalk('docker') },
      { o: () => TOWN_NPC.watch, label: 'Talk', fn: () => townTalk('watch') },
      { x: 1.5, y: 4.6, label: 'Read', range: 1.2, fn: () => say([
        ['SIGN', "LIGHTHOUSE CLOSED UNTIL FURTHER NOTICE. — The Harbourmaster"],
        ['SIGN', "CANNERY: NO NIGHT SHIFTS. NO EXCEPTIONS. DO NOT ASK WHY."],
        ['SIGN', "SALTMERE ACADEMY welcomes its new first years!"],
        ['SIGN', "Tired? Everyone is! Soak your cares away at the CLOUDWATER BATHS, Steam Lane."],
      ]) },
      { x: 13.5, y: 15, label: 'Look', range: 1.4, fn: () => say([['ASH', "A fountain with a fish on top, spitting water. Someone's thrown in a hundred coins. Wishing for sleep, probably."]]) },
      { x: 26.5, y: 14.4, label: 'Look', range: 1.2, fn: () => say([['ASH', "The cannery door's boarded up from the outside."], ['ASH', "...Something in there is scratching. Slowly. Like it's got all the time in the world."], ['ASH', "Not tonight. One thing at a time."]]) },
      { x: 23.5, y: 5.6, label: 'Enter the Cloudwater Baths', range: 1.2, fn: () => { sfx('gate'); transition('baths_hall', { x: 5, y: 7.2 }); } },
    ],
    onEnter: townEnter,
  }),

  // -------------------------------------------------------------- 3. the bathhouse front hall
  baths_hall: () => ({
    name: 'The Cloudwater Baths', sub: 'Steam Lane', outdoor: false, mood: 'bath', music: 'ambient', seed: 91,
    MW: 10, MH: 8, devSpawn: { x: 5, y: 6 }, wallTex: bathWall, wallStyle: 'bath', kind: ch => (ch === '1' ? 'pool' : 'hinoki'),
    map: ['ooooooooo3', 'oooooooooo', ':4:ooooooo', 'oooooooooo', '5ooooooooo', '5oooooooo6', 'oooooooooo', '6ooooooooo'],
    exits: [
      { edge: 'ymax', a: 4, b: 6, to: 'saltmere', spawn: { x: 23.5, y: 6.4 } },
      { edge: 'ymin', a: 6, b: 8.5, to: 'baths_pools', spawn: { x: 6, y: 9.2 }, block: "Hana first.", blockIf: () => !flags.hallIntro },
    ],
    lights: () => [[isoX(7.2, 0.05), isoY(7.2, 0.05) - 30, 50, '255,190,120', 0.16], [isoX(0.05, 2), isoY(0.05, 2) - 46, 50, '255,190,120', 0.14]],
    npcs: () => [
      { x: 1.7, y: 1.1, big: 26, draw: () => { shadowAt(SX(this_ondo), SY(this_ondo), 16); drawSpr(flags.ondoAwake ? SPR.ondo : SPR.ondoBlank, SX(this_ondo) - 25, SY(this_ondo) - 60, !flags.ondoAwake); } },
      { x: 4.6, y: 3.4, spr: SPR.hana, face: -1 },
    ],
    interact: [
      { x: 1.7, y: 2.6, label: 'Look', range: 1.3, cond: () => !flags.ondoAwake, fn: lookOndo },
      { x: 1.7, y: 2.6, label: 'Talk', range: 1.3, cond: () => flags.ondoAwake, fn: () => say([['ONDO', "Go on, boy, up to the little room. Sleep! Big Ondo's orders!"]]) },
      { x: 4.6, y: 3.4, label: 'Talk', cond: () => flags.hallIntro, fn: talkHana },
      { x: 0.6, y: 4.6, label: 'Look', range: 1.2, fn: () => say([['ASH', "Towels. Hundreds of them, folded perfectly. Every single one is warm."]]) },
    ],
    glow: hallGlow,
    onEnter: hallEnter,
  }),

  // -------------------------------------------------------------- 4. the pools
  baths_pools: () => ({
    name: 'The Pools', sub: 'The Cloudwater Baths', outdoor: false, mood: 'bath', music: 'ambient', seed: 93,
    MW: 12, MH: 10, devSpawn: { x: 6, y: 8.8 }, wallTex: bathWall, wallStyle: 'bath', kind: ch => (ch === '1' ? 'pool' : 'tile'),
    steamT: flags.poolsClear ? 0.12 : 0.22,
    map: ['oooooooooooo', 'o11111$ooooo', 'o11111ooooo3', '$11111oooooo', 'o11111oo111o', 'oooooooo111o', 'oooooooo111o', 'o6oooooo111o', 'o2o2oooooooo', 'oooooooooo6o'],
    exits: [
      { edge: 'ymax', a: 5, b: 7, to: 'baths_hall', spawn: { x: 7.2, y: 1.1 }, block: "Not while those things are loose.", blockIf: () => !!enc },
      { edge: 'ymin', a: 8, b: 10.5, to: 'baths_steam', spawn: { x: 6, y: 9.6 }, block: "The door to the big steam room. It's hot to the touch — and something on the other side is breathing.", blockIf: () => !flags.poolsClear },
    ],
    lights: () => [[isoX(9.2, 0.05), isoY(9.2, 0.05) - 30, 50, '255,170,110', 0.14]],
    npcs: () => (POOLS.soaking ? [{ x: 4.3, y: 4.3, draw: drawSoaker }] : []),
    interact: [
      { x: 4, y: 5.3, label: 'Soak', range: 1.1, cond: () => !flags.soaked, fn: soak },
      { x: 2.5, y: 8.5, label: 'Look', range: 1.2, fn: () => say([['ASH', "Little stools and wooden buckets. You wash first, then you soak. Hana was very firm about that."]]) },
    ],
    tick: steamTick,
    glow: () => { poolWisps(); drawSteam(A.steamK || 0); },
    onEnter: poolsEnter,
  }),

  // -------------------------------------------------------------- 5. the great steam room: where Ondo's soul went
  baths_steam: () => ({
    name: 'The Great Steam Room', sub: 'The Cloudwater Baths', outdoor: false, mood: 'bath', music: 'ambient', seed: 95,
    MW: 12, MH: 11, devSpawn: { x: 6, y: 9.4 }, wallTex: bathWall, wallStyle: 'bath', kind: ch => (ch === '1' ? 'pool' : 'tile'),
    steamT: flags.ondoFree ? 0.05 : 0.3,
    map: ['ooOoooooOooo', 'oooooooo111o', '$ooooooo111o', 'oooooooooooo', 'oooooooooo$o', 'oooooooooooo', 'oooooooooooo', 'o$oooooooooo', 'oooooooooooo', 'oooooooooooo', 'oooooooooooo'],
    exits: [{ edge: 'ymax', a: 5, b: 7, to: 'baths_pools', spawn: { x: 9.2, y: 1.1 }, block: "It won't let me leave. The door's gone soft and wet, like cloth.", blockIf: () => flags.shroudIntro && !flags.ondoFree }],
    tick: steamTick,
    glow: () => { poolWisps(); drawSteam(A.steamK || 0); shroudOverSteam(); },
    onEnter: steamEnter,
    onBossHalf: () => say([['SHROUD', 'STAY. STAAAY. EVERYBODY STAYS IN THE WARM!']]),
    onBossDefeated: e => ondoFreed(e),
  }),
});
const this_ondo = { x: 1.7, y: 1.1 };
const QUAY = { walkers: null }, POOLS = { soaking: false };

// bathhouse walls: dark timber below, glowing paper panels above
function bathWall(u, v) {
  if (v < 22) return v === 21 ? '#1e120c' : (u % 20 === 0 ? '#2a1810' : ['#4a2e1c', '#42281a', '#523422'][hash(u >> 3, v >> 2) % 3]);
  if (v < 25 || v > WALL_H - 9 || u % 24 < 2) return '#2a1810';
  const wu = u % 24, wv = v - 25;
  if (wu % 6 === 2 || wv % 8 === 0) return '#3a2418';
  return wv > 30 ? '#e8cc98' : '#f4dcaa';
}

// ======================================================================
//  SCRIPT
// ======================================================================
async function startChapter4() {
  flags = { intro: true, shawl: true, g1: true, awakened: true, sanctumClear: true, bossIntro: true, bossDone: true, marenAwake: true, homeTalk: true, lesson: 5, sword: true,
            farewell: true, metFriends: true, valvesDone: true, slept: true, captainFree: true, captainAwake: true, tamsinAwake: true };
  state = 'card';
  await card('<div class="sub">Chapter IV</div><div class="chapter">The Cloudwater Baths</div>');
  await card(prose('The <em>Merrow</em> came into Saltmere at dusk,<br>with her captain back at the wheel<br>and every lamp in the town lit to meet her.'));
  hideCard();
  loadArea('sm_quay', { x: 8.6, y: 13.2 });
}

// ---- the quay
async function quayEnter() {
  if (flags.smGoodbye) return;
  state = 'cut';
  await wait(40);
  await tween(b, 8.9, 4.6, 110); b.back = true;
  await say([
    ['HALE', "Saltmere, lad. Safe and sound — which is more than I managed the last time."],
    ['HALE', "I'll ask the harbour folk about the Point, and the woman with the sword. Somebody here must remember something."],
  ]);
  b.back = false; b.face = 1;
  await say([
    ['TAMSIN', "Well. This is us."],
    ['TAMSIN', "The Academy's up on the hill. Lessons start tomorrow, and I have to be unbearable to my new roommates by breakfast."],
    ['KIT', "...You could visit. There's a library. It has a whole shelf on drowned things."],
    ['TAMSIN', "Kit means he'll miss you. I'll miss you too. Obviously."],
    ['ASH', "I'll come and find you. When I know more."],
    ['TAMSIN', "You'd better. You still owe me the whole story — the chains, the ghosts, the boy made of light. Every single bit."],
    ['ASH', "...Deal."],
    ['KIT', "Keep your soul tucked in, Ash."],
  ]);
  flags.smGoodbye = true;
  QUAY.walkers = [{ x: 10.2, y: 2.6, spr: SPR.tamsin, face: 1 }, { x: 11.1, y: 3.1, spr: SPR.kit, face: 1 }];
  await Promise.all([tween(QUAY.walkers[0], 16.5, 1.6, 140), tween(QUAY.walkers[1], 17.2, 2.2, 150)]);
  QUAY.walkers = null;
  sfx('yawn'); await wait(30);
  await say([
    ['ASH', "Hhhaaah... I haven't slept properly in three days."],
    ['HALE', "You look like a wrung-out sock, boy. Go on up into town and find yourself a bed. Saltmere's friendly enough."],
  ]);
  saveCheckpoint();
  state = 'play';
  toast('Head into Saltmere &mdash; the quay road leads off to the right.', 360);
}

// ---- the town
async function townEnter() {
  if (flags.townIntro) return;
  flags.townIntro = true; saveCheckpoint();
  await wait(50);
  await say([
    ['ASH', "Saltmere. So this is where they came, eleven years ago."],
    ['ASH', "Salt, and coal smoke, and... something sweet. Like a hot bath."],
  ]);
  toast('Explore Saltmere. Talk to the people in the square.', 360);
}
const TOWN_LINES = {
  netta: [
    ['NETTA', "Fresh herring! Last of the — oh, love. Look at the bags under your eyes."],
    ['NETTA', "You want the Cloudwater Baths, up Steam Lane. Big Ondo'll steam the tired right out of you."],
    ['NETTA', "Mind you, everyone's tired lately. The whole town. I could lie down right here in the herring."],
  ],
  abel: [
    ['ABEL', "Sit down before you fall down, lad. You're swaying."],
    ['ABEL', "Tired? We're all tired. Nobody in Saltmere has slept right since the lighthouse went dark."],
    ['ABEL', "Go and soak at Ondo's. Best thing for it. Best thing for anything."],
  ],
  lamper: [
    ['LAMPER', "Evening. You've got that look — like you've carried something heavy a long way."],
    ['LAMPER', "The baths. Up Steam Lane — follow the red lanterns. Can't miss them."],
    ['LAMPER', "*yaaawn* ...Pardon me. Third night I've lit these lamps and forgotten doing it."],
  ],
  docker: [
    ['DOCKER', "*yaaawn* ...Sorry. Double shift. Half the crews can't get out of bed in the mornings."],
    ['DOCKER', "If I had a penny I'd be at the baths. So should you, by the look of you."],
  ],
  watch: [
    ['WATCH', "Road's closed, son. Nobody goes out to the Point."],
    ['WATCH', "The lighthouse went dark in the spring. Things come up out of the water out there at night."],
    ['ASH', "What kind of things?"],
    ['WATCH', "The kind that make a watchman want a long hot bath. Off you go. The baths are the other way."],
  ],
};
async function townTalk(who) {
  const first = !flags['talked_' + who];
  await say(first ? TOWN_LINES[who] : [TOWN_LINES[who][TOWN_LINES[who].length - 1]]);
  if (!first || who === 'watch') { flags['talked_' + who] = true; return; }
  flags['talked_' + who] = true;
  flags.tiredTalk = (flags.tiredTalk || 0) + 1;
  if (flags.tiredTalk === 3) {
    await say([
      ['ASH', "That's three people now. Go to the baths. Go to the baths. Go to the baths."],
      ['ASH', "...And every one of them looked as tired as I feel."],
    ]);
    toast('Find the Cloudwater Baths &mdash; follow the red lanterns up Steam Lane.', 360);
  }
  saveCheckpoint();
}

// ---- the front hall
async function hallEnter() {
  if (flags.ondoAwake) return;
  if (flags.hallIntro) { if (!flags.poolsClear) toast('The pools are through the curtain at the back.', 240); return; }
  state = 'cut';
  await wait(40);
  await tween(b, 5, 4.6, 50); b.back = true;
  await say([
    ['HANA', "Welcome to the Cloudwater Ba— oh. You're just a kid. Are you on your own?"],
    ['ASH', "I came in on the Merrow. Everyone in town told me to come here."],
    ['HANA', "They all say that. It's about the only thing anybody in Saltmere says any more."],
    ['HANA', "I'm Hana. That's my uncle — Big Ondo. He runs the baths. Normally he'd have you laughing before you got your shoes off."],
    ['ASH', "...Is he all right?"],
    ['HANA', "He went into the great steam room yesterday morning to stoke the boilers. When he came out, he was like that."],
    ['HANA', "He won't talk. He won't sleep. He just stands there. The doctor says it's exhaustion — but Uncle Ondo has never been tired a day in his life."],
    ['ASH', "His eyes... it's the same as Maren in the circle. The same as Captain Hale."],
    ['ASH', "Somebody's taken his soul."],
    ['HANA', "Hm? Sorry, what? ...Anyway! He'd skin me if I turned a guest away. Here — a towel. The pools are through the curtain. Go and soak."],
  ]);
  flags.hallIntro = true; saveCheckpoint();
  state = 'play';
  toast('Step out of your body (<kbd>C</kbd>) and look closer. The pools are through the curtain.', 400);
  await waitUntil(() => mode === 'spirit' || flags.sawThread);
  if (flags.sawThread) return;
  await wait(30);
  flags.sawThread = true;
  await say([
    ['ASH', "There's a thread coming out of him. Steam, twisted like a wet rope — and it's red, all through, like he's burning up inside."],
    ['ASH', "It runs back through the curtain. Toward the pools."],
  ]);
  saveCheckpoint();
}
function lookOndo() {
  if (mode === 'spirit') return say([['ASH', "His soul's not in there. Just that red heat, and the thread pulling away through the curtain."]]);
  return say([['ASH', "He's enormous. And completely still. His eyes are open, but he's not looking at anything."], ['HANA', "Don't mind him. ...Please don't mind him."]]);
}
function talkHana() {
  if (flags.ondoAwake) return say([['HANA', "He's back. He's really back. ...If you ever need a bath, Ash, you never pay here again. Ever."]]);
  if (flags.poolsClear) return say([['HANA', "What was all that crashing in there? ...You know what, don't tell me. Is it about Uncle Ondo? Then go. Hurry."]]);
  return say([['HANA', "Through the curtain. Mind, it's very steamy today. Steamier than I've ever seen it."]]);
}
function hallGlow() {                                   // the possession, only a soul can see it: a red heat in Ondo, a thread of steam
  if (flags.ondoAwake || flags.ondoFree || spiritK < 0.05) return;
  const x = SX(this_ondo), y = SY(this_ondo);
  ctx.save(); ctx.globalAlpha = 0.35 * spiritK * (0.7 + 0.3 * Math.sin(t * 0.08));
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y - 30, 4, x, y - 30, 40); g.addColorStop(0, 'rgba(255,60,40,0.9)'); g.addColorStop(1, 'rgba(255,40,30,0)');
  ctx.fillStyle = g; ctx.fillRect(x - 40, y - 70, 80, 80); ctx.restore();
  ctx.fillStyle = `rgba(255,70,50,${spiritK})`; ctx.fillRect(Math.round(x - 4), Math.round(y - 47), 2, 1); ctx.fillRect(Math.round(x + 3), Math.round(y - 47), 2, 1);
  const x1 = isoX(7.2, 0) - camX, y1 = isoY(7.2, 0) - camY - 10, n = 40;
  for (let i = 0; i <= n; i++) {
    const k = i / n, px = x + (x1 - x) * k, py = y - 34 + (y1 - y + 34) * k + Math.sin(k * Math.PI) * 10 + Math.sin(t * 0.1 + i) * 1.2;
    ctx.fillStyle = i % 3 ? `rgba(255,220,210,${0.7 * spiritK})` : `rgba(255,90,70,${0.8 * spiritK})`; ctx.fillRect(Math.round(px), Math.round(py), 2, 1);
  }
}

// ---- the pools
async function poolsEnter() {
  if (flags.poolsClear) { if (!flags.shroudIntro) toast('Go through the door at the back, into the great steam room.', 300); return; }
  if (flags.soaked) { startEncounter(POOL_FIGHT()); A.steamT = 0.35; return; }
  if (flags.poolsIntro) return;
  flags.poolsIntro = true;
  await wait(40);
  await say([['ASH', "Steam everywhere. I can barely see the far wall."], ['ASH', "...It does smell nice, though."]]);
  toast('Soak in the big pool &mdash; <kbd>X</kbd> at the water\'s edge.', 360);
}
function drawSoaker() {                                  // Ash up to his shoulders in the hot water
  const x = Math.round(isoX(4.3, 4.3) - camX), y = Math.round(isoY(4.3, 4.3) - camY);
  const sp = SPR.ash[0];
  ctx.drawImage(sp.n, 0, 0, sp.w, 9, x - 6, y - 9 + Math.round(Math.sin(t * 0.05)), sp.w, 9);
  ctx.fillStyle = 'rgba(160,220,210,0.7)';
  for (let i = -9; i <= 9; i++) ctx.fillRect(x + i, y + Math.round(Math.abs(i) * 0.25) + (Math.sin(t * 0.1 + i) > 0.6 ? 1 : 0), 1, 1);
}
async function soak() {
  state = 'cut';
  await tween(b, 4, 5.5, 30);
  sfx('splash'); b.hidden = true; POOLS.soaking = true;
  burstW({ x: 4.3, y: 4.3 }, 4, 16, ['#cfeee8', '#ffffff'], 1.6, false, 0.03);
  await wait(60);
  await say([
    ['ASH', "Oh... oh, that's warm."],
    ['ASH', "Maybe everyone's right. Maybe I just need to... close my eyes... for a minute..."],
  ]);
  A.steamT = 0.85; await wait(120);
  await say([
    ['SHROUD', "rest... rest now, little light..."],
    ['SHROUD', "no more walking. no more looking for anyone. nobody ever needs to get up again..."],
  ]);
  sfx('hiss'); shake = 6; await wait(20);
  POOLS.soaking = false; b.hidden = false; b.x = 4; b.y = 5.6; b.back = false; sfx('splash');
  burstW(b, 6, 20, ['#cfeee8', '#ffffff'], 2, false, 0.04);
  await say([['ASH', "—! There's something IN the steam!"]]);
  flags.soaked = true; saveCheckpoint();
  A.steamT = 0.35;
  state = 'play';
  toast('Steamlings &mdash; souls made of steam. They swell up red before they burst: back off, or dash (<kbd>Z</kbd>) through. Step out (<kbd>C</kbd>) to fight them.', 480);
  startEncounter(POOL_FIGHT());
}
const POOL_FIGHT = () => ({
  id: 'pools',
  waves: [
    [['steamling', 3, 2.5], ['steamling', 5.5, 3]],
    [['steamling', 2.5, 3.5], ['steamling', 9, 5], ['steamling', 7, 8]],
    [['steamling', 4, 2], ['steamling', 9.5, 6.5], ['steamling', 2, 7.5], ['steamling', 8, 2]],
  ],
  onClear: async () => {
    flags.poolsClear = true; saveCheckpoint();
    A.steamT = 0.12;
    await wait(50);
    await say([
      ['ASH', "That's the last of them. The steam's thinning out."],
      ['ASH', "They came from back there — the door at the far end. That's where all this steam is pouring from."],
      ['ASH', "The great steam room. Where Hana said her uncle went."],
    ]);
    toast('Go through the door at the back of the pools.', 360);
  },
});

// ---- the great steam room
async function steamEnter() {
  if (flags.ondoFree) return;
  if (flags.shroudIntro) { await wait(30); const e = spawn('shroud', 6, 4.5); e.phase = 'rise'; e.pt = 60; setMusic('boss'); return; }
  state = 'cut';
  await wait(40);
  await tween(b, 6, 8, 50); b.back = true;
  await say([['ASH', "It's like walking into a cloud. I can hear the boilers, but I can't see them."]]);
  A.steamT = 0.7; sfx('hiss'); await wait(70);
  const e = spawn('shroud', 6, 4.5); e.pt = 140;
  sfx('split'); shake = 8; await wait(100);
  await say([
    ['SHROUD', "A GUEST. HOW LOVELY. YOU LOOK SO TIRED, LITTLE LIGHT."],
    ['SHROUD', "LIE DOWN. LET ME TUCK YOU IN. LET ME KEEP YOU WARM. FOREVER."],
    ['ASH', "You're Big Ondo's soul. Or what something's turned it into."],
    ['SHROUD', "HE WAS SO TIRED. KEEPING EVERYONE WARM, DAY AND NIGHT, ALL BY HIMSELF. NOW EVERYONE CAN REST. THE WHOLE TOWN."],
    ['ASH', "Making a whole town too tired to stand up isn't rest. Give him back!"],
  ]);
  flags.shroudIntro = true; saveCheckpoint();
  state = 'play'; setMusic('boss');
  toast('The Steamshroud hides in the steam. Watch for red eyes and a shadow on the floor &mdash; then MOVE. Strike when the steam thins.', 560);
}
async function ondoFreed(e) {
  flags.ondoFree = true;
  for (const x of enemies) if (x !== e) x.dead = true;
  enemies = []; bolts = []; rings = [];
  setMusic('none'); sfx('crack'); shake = 18; hitstop = 0; A.steamT = 0.05;
  burstW(e, 30, 60, ['#ffffff', '#f4e8ea', '#c0343c', '#dce8ee'], 3.5, true, 0.02);
  marenSpirit = { x: e.x, y: e.y, a: 0, spr: SPR.ondoSpirit, col: '255,210,180', scale: 2 };
  saveCheckpoint();
  await wait(100);
  state = 'cut';
  await say([
    ['ONDO', "...Oh. Oh, my. What a dreadful dream. I was a towel. A very cross towel."],
    ['ASH', "You're free. Your body's back at the front desk — Hana's been minding it."],
    ['ONDO', "Hana! The poor girl. I must get back. But listen, boy —"],
    ['ONDO', "Something came up through the floor of this room. Up the pipes, up from the sea. It whispered to me how tired I was."],
    ['ONDO', "And it was right! I was tired. So I let it in."],
    ['ONDO', "If anything ever tells you you're too tired to go on, don't believe it. That's how they get in."],
  ]);
  fadeTarget = 1; await wait(60);
  await card(prose("Big Ondo's soul found its own way home.<br>All over Saltmere, people woke up<br>without knowing they'd been asleep."));
  hideCard();
  flags.ondoAwake = true;
  loadArea('baths_hall', { x: 4.6, y: 4.4 });
  await ondoWakes();
}
async function ondoWakes() {
  state = 'cut';
  b.back = true; b.face = -1;
  await wait(40);
  sfx('merge'); whiteFlash = 0.4; await wait(30);
  await say([
    ['ONDO', "HA! HAHAHA! There he is! The boy who punched a towel!"],
    ['HANA', "Uncle! You're — you're back! You're LAUGHING!"],
    ['ONDO', "Of course I'm laughing! I feel like I've slept a hundred years. ...Hana, why is the whole town yawning?"],
    ['ASH', "Big Ondo — eleven years ago, two people came to Saltmere. A woman with a sword made of light. And a man with an oar."],
    ['ONDO', "......"],
    ['ONDO', "Lyra. And Edwin, who never once stopped talking."],
    ['ONDO', "They took the little room upstairs for a whole month. Every evening she sat in my hottest pool and said it was the only place her hands stopped shaking."],
    ['ONDO', "The last night, she paid me with this. She said: 'If a boy with my face ever comes asking, give it to him.'"],
    ['ASH', "...A key?"],
    ['ONDO', "The key to the old lighthouse, out on the Point. She asked me to keep it safe. Nobody's opened that door since."],
    ['ASH', "She knew. She knew I'd come."],
    ['ONDO', "Mothers usually do. Now — a bath. A proper one, with nothing living in the steam. And then sleep. Real sleep. Big Ondo insists."],
  ]);
  fadeTarget = 1; await wait(60);
  await card(prose('Ash slept for fourteen hours, in the little room upstairs<br>where his mother had slept eleven years before.<br>The key never left his hand.'));
  await card('<div class="sub">End of Chapter IV</div><div class="chapter">The Cloudwater Baths</div><div class="press">Press Enter</div>');
  await card('<div class="sub">To be continued</div><div class="chapter">The Point</div><div class="press">Press Enter</div>');
  hideCard();
  showTitle();
}
