"use strict";
// ======================================================================
//  CHAPTER I — THE SILENT BELL
//  Areas are factories (rebuilt from `flags` on every load / checkpoint).
//
//  Map legend
//   outdoor: . grass  , flowers  = dirt path  # flagstones  s garden soil  f fence  g garden gate
//            H cottage  C church  W well  b bush  B bench  L lamp post  T tree  P pine  D dead tree
//            q gravestone  Y cross  r rock  m mushrooms  l fallen log
//   indoor:  o floor  c carpet  p pillar  w pew  k candles  S statue  A altar  E lectern
//            R iron railing  G gate (opens with A.gate())  Z winch  U old bell  ' ' void
//
//  Story flags: intro, shawl, g1 (gate), awakened, sanctumClear, bossIntro, bossDone, marenAwake, homeTalk
//  Chapter II:  lesson (0-5), sword
// ======================================================================

const AREAS = {
  // -------------------------------------------------------------- 1. the garden at dusk
  garden: () => ({
    name: "Maren's Cottage", sub: 'Outside Saint Orrin', outdoor: true, mood: 'dusk', music: 'ambient', seed: 5,
    MW: 20, MH: 20, fireflies: 26, devSpawn: { x: 12.5, y: 8.6 }, camFocus: { x: 12, y: 9 },
    map: [
      'TTPTTPTTTPTTPTTTPTTT', 'TPTT,TTPTTTPTT.TTPTT', 'PT..,...........,.TP', 'T.ffffffff..,..b...T',
      'T.fssssssf.HHHH....T', 'P.fssssssf.HHHH..,.P', 'T.fssssssg.HHHH....T', 'T.fssssssf.L#=L....T',
      'T.ffffffff..=...B..T', 'T,.........==..,...P', 'T..,..W...=........T', '==========..,....b.T',
      'T....,.............T', 'Tb.....,....b...,..P', 'T..........,.......T', 'P...,..............T',
      'T.......b.....,....T', 'T..,..........b....T', 'T...................', 'T.,...........,.....',
    ],
    house: { x0: 11, y0: 4, w: 4, d: 3, wh: 34, rh: 28 },
    goat: { x: 6, y: 14.5, region: [2.5, 12.5, 9.5, 17.5] },
    footprints: [[12.45, 7.6], [12.4, 8.5], [11.6, 9.4], [10.6, 10.3], [9.4, 11.45], [7, 11.5], [4.5, 11.5], [2, 11.5], [0, 11.5]],
    exits: [{ edge: 'xmin', a: 11, b: 12, to: 'forest', spawn: { x: 6.5, y: 24.6 } }],
    interact: [
      { x: 16.5, y: 8.5, label: 'Read', fn: () => say([
        ['NOTE', 'Ash — the bells are ringing, and nobody is pulling the ropes. I have to see why.'],
        ['NOTE', 'Feed Pip. Bar the door. Do NOT follow me. I will be home before you wake. — M.'],
        ['ASH', 'She wrote this before dark. It\'s nearly night again.'] ]) },
      { x: 12.45, y: 7.4, label: 'Look', fn: () => say([['ASH', "Home. It's too quiet without her clattering about in there."]]) },
      { x: 6.5, y: 10.5, label: 'Look', fn: () => say([['ASH', "Maren says never drink from it after dark. She's never said why."]]) },
      { o: () => goat, label: 'Pet', fn: async () => {
        bleat();
        await say([['PIP', 'Mehhh.'], ['ASH', "I know, Pip. I'm worried too."], ['ASH', "Stay here. Keep an eye on the house. I'll bring her back."]]);
      } },
    ],
    triggers: [{ x0: 0, y0: 10, x1: 3, y1: 13, fn: () => say([
      ['ASH', 'Her footprints leave the road and go straight into the trees.'],
      ['ASH', "Maren hates the woods after dark. Whatever made her go this way..."] ]) }],
    onEnter: async () => {
      if (flags.intro) return;
      await wait(80);
      await say([
        ['ASH', 'Maren?'],
        ['ASH', "...She's still not back. The bells stopped hours ago."],
        ['ASH', "She left a note on the bench. And — those are her footprints, there in the dirt."],
      ]);
      flags.intro = true;
      toast('<kbd>Arrows</kbd> move &nbsp;&middot;&nbsp; <kbd>X</kbd> interact &nbsp;&middot;&nbsp; <kbd>Z</kbd> dash', 420);
      await wait(440);
      toast('Follow her footprints.', 300);
    },
  }),

  // -------------------------------------------------------------- 2. the woods at night
  forest: () => ({
    name: 'The Old Wood', sub: 'Outside Saint Orrin', outdoor: true, mood: 'night', music: 'ambient', seed: 12,
    MW: 14, MH: 26, fireflies: 14, deadwood: true, devSpawn: { x: 6.5, y: 23.5 },
    grass: ['#3e6a32', '#36602c', '#2e5427', '#284a22'], blade: '#4e7e3c',
    map: [
      'TTTTTP==PTTTTT', 'TPT.T.==.TPTTT', 'TT..,.=...TPTT', 'PT.r..=.,..TTT', 'TT...==....TPT', 'TP..==..m..TTT',
      'TT.==.....bTTT', 'T..=....r..TPT', 'TP.=..D....TTT', 'TT.==.....,.TT', 'TTm.==..l....T', 'PT...==.....TT',
      'TT....==..m.PT', 'TTT....==...TT', 'TPT..r..==..TT', 'TT.......=..TT', 'TT..b...==.,PT', 'TP.....==...TT',
      'TT.m..==..r.TT', 'TT...==.....PT', 'PT..==..,...TT', 'TT..=.....b.TT', 'TT..==......PT', 'TP...==..m..TT',
      'TT....==....TT', 'TTT...==...TTT',
    ],
    footprints: [[6.6, 26], [6.5, 24], [5.4, 22.5], [4.6, 20.4], [5.5, 19.2], [6.6, 18], [7.6, 17], [8.6, 15.5], [8.5, 14],
                 [7.6, 13], [6.5, 11.8], [5, 10.4], [3.6, 8.5], [3.6, 6.5], [5, 4.8], [6.3, 3], [6.6, 0]],
    exits: [
      { edge: 'ymax', a: 5, b: 8.5, to: 'garden', spawn: { x: 1, y: 11.5 } },
      { edge: 'ymin', a: 5, b: 9, to: 'churchyard', spawn: { x: 2, y: 15.2 } },
    ],
    interact: [
      { x: 10.5, y: 21.6, label: 'Look', cond: () => !flags.shawl, fn: async () => {
        flags.shawl = true;
        await say([
          ['ASH', "Her shawl. Caught on the thorns."],
          ['ASH', "She'd never leave this. She knitted it the winter I came to live with her."],
          ['ASH', "She was in a hurry. Or she was being... pulled."] ]);
      } },
    ],
    triggers: [
      { x0: 0, y0: 8, x1: 14, y1: 14, fn: async () => {
        sfx('bell'); shake = 5; await wait(60);
        await say([['ASH', "The bell. Just once this time."], ['ASH', "It sounds like it's calling someone."]]);
      } },
      { x0: 0, y0: 0, x1: 14, y1: 4, fn: () => say([['ASH', "The trees are thinning. There — the spire."]]) },
    ],
  }),

  // -------------------------------------------------------------- 3. the churchyard in the fog
  churchyard: () => ({
    name: 'Saint Orrin', sub: 'The Churchyard', outdoor: true, mood: 'fog', music: 'ambient', seed: 21,
    MW: 16, MH: 16, fireflies: 0, deadwood: true, devSpawn: { x: 2, y: 14.5 },
    grass: ['#4a6a3e', '#40603a', '#385632', '#304c2c'], blade: '#5a7a4a',
    map: [
      'TTPTTTDTTTTTPTTT', 'T....q.....Y...T', 'T.CCCCCC.q..Y..P', 'T.CCCCCCCC=....T', 'T.CCCCCCCC==q..T', 'P.CCCCCC.q.=...T',
      'T.q..Y....=..q.T', 'T....q...=..Y..T', 'T.Y.....==...q.P', 'T..q...==..L...T', 'T....==....q...T', 'P.q.==..Y......T',
      'T..==...q...L..T', 'T.==...........T', 'T==..q....Y....P', 'T=..............',
    ],
    church: { x0: 2, y0: 2, w: 6, d: 4, wh: 56, rh: 40, th: 100 },
    footprints: [[1.6, 16], [2.5, 13.5], [4.5, 11.5], [6.5, 9.5], [8.5, 7.6], [10.3, 5.6], [10.4, 4.4]],
    exits: [{ edge: 'ymax', a: 0.5, b: 3.5, to: 'forest', spawn: { x: 6.6, y: 1 } }],
    interact: [
      { x: 10.4, y: 4.0, label: 'Enter', fn: async () => {
        await say([['ASH', "Her footprints go right up to the door. And stop."], ['ASH', "...Okay. Okay. In we go."]]);
        sfx('gate'); transition('narthex', { x: 5, y: 11.2 });
      } },
      { x: 12.5, y: 4.5, label: 'Read', fn: () => say([['ASH', "'Here lies Elsbeth Wren. She kept the vigil.' ...The date's been scratched off."]]) },
    ],
    triggers: [{ x0: 0, y0: 12, x1: 6, y1: 16, fn: () => say([
      ['ASH', "Saint Orrin. Every window lit — and not a single person inside."],
      ['ASH', "Maren used to bring me here when I was small. She'd never let me go past the front pews."] ]) }],
  }),

  // -------------------------------------------------------------- 4. inside: the narthex
  narthex: () => ({
    name: 'The Narthex', sub: 'Saint Orrin', outdoor: false, mood: 'interior', music: 'ambient', seed: 3,
    MW: 10, MH: 12, stains: 3, winL: [3, 9], winR: [2, 8], devSpawn: { x: 5, y: 11 }, winchFlag: 'g1',
    map: [
      'ooooccoooo', 'oSooccooSo', 'ooooccoooo', 'koooccoook', 'ooooccoooo', 'RRRRGGRRRR',
      'ooooccoooo', 'koooccoook', 'oEooccoooZ', 'ooooccoooo', 'koooccoook', 'ooooccoooo',
    ],
    gate: () => !!flags.g1,
    exits: [
      { edge: 'ymin', a: 4, b: 6, to: 'nave', spawn: { x: 6, y: 17.2 } },
      { edge: 'ymax', a: 4, b: 6, block: "I'm not leaving without her." },
    ],
    interact: [
      { x: 1.5, y: 8.5, label: 'Read', fn: () => say([
        ['NOTE', 'Ash — I know you. You followed me. Turn around and go home.'],
        ['NOTE', 'Whatever you hear in here, it is not me calling you. — M.'] ]) },
      { x: 9.5, y: 8.5, label: 'Turn the wheel', needsBody: true, cond: () => !flags.g1, fn: async () => {
        flags.g1 = true; sfx('gate'); shake = 5; saveCheckpoint();
        await wait(40);
        await say([['ASH', "Heavy... but it turns. She came through here. I'd bet my life on it."]]);
      } },
    ],
    triggers: [{ x0: 0, y0: 5.6, x1: 10, y1: 8, cond: () => !flags.g1, fn: () => say([
      ['ASH', "The gate's winched shut."], ['ASH', 'The wheel should be on the wall somewhere. Maren always made me oil it.'] ]) }],
  }),

  // -------------------------------------------------------------- 5. the nave
  nave: () => ({
    name: 'The Nave', sub: 'Saint Orrin', outdoor: false, mood: 'interior', music: 'ambient', seed: 9,
    MW: 12, MH: 18, stains: 8, winL: [4, 10, 15], winR: [3, 8], devSpawn: { x: 6, y: 16.5 },
    map: [
      'oooooccooooo', 'kooooccoEook', 'oooooccooooo', 'opoooccooopo', 'oooooccooooo', 'oowwwccwwwoo',
      'oooooccooooo', 'oowwwccwwwoo', 'kooooccooook', 'opoooccooopo', 'oooooccooooo', 'oowwwccwwwoo',
      'oooooccooooo', 'oowwwccwwwoo', 'oooooccooooo', 'opoooccooopo', 'kooooccooook', 'oooooccooooo',
    ],
    exits: [
      { edge: 'ymin', a: 5, b: 7, to: 'sanctum', spawn: { x: 7, y: 13.2 } },
      { edge: 'ymax', a: 5, b: 7, to: 'narthex', spawn: { x: 5, y: 0.8 } },
    ],
    interact: [{ x: 8.5, y: 1.5, label: 'Read', fn: () => say([
      ['JOURNAL', 'The bells rang at dusk with no hand on the rope. Something in the tower is awake again.'],
      ['JOURNAL', 'It cannot be fought with hands. I will lie down in the old circle and go up as I truly am.'],
      ['JOURNAL', "The circle will keep my body. If I don't come back — Ash must never, ever come looking."] ]) }],
    triggers: [{ x0: 0, y0: 6, x1: 12, y1: 11, fn: async () => {
      sfx('rise'); shake = 3; await wait(30);
      await say([['ASH', "...Something just breathed. Right behind me."], ['ASH', "There's nobody there. There's nobody there."]]);
    } }],
  }),

  // -------------------------------------------------------------- 6. the sanctum: the awakening
  sanctum: () => ({
    name: 'The Sanctum', sub: 'Saint Orrin', outdoor: false, mood: 'interior', music: 'ambient', seed: 21,
    MW: 14, MH: 14, stains: 5, winL: [3, 11], winR: [3, 11], devSpawn: { x: 7, y: 12.5 },
    map: [
      'oooooooooooooo', 'oooookoAokoooo', 'opoooooooooopo', 'oooooooooooooo', 'koooooooooooko', 'oooooooooooooo',
      'oooooooooooooo', 'oooooooooooooo', 'oooooooooooooo', 'oooooooooooooo', 'koooooooooooko', 'opoooooooooopo',
      'ooooooccoooooo', 'ooooooccoooooo',
    ],
    circle: { x: 7, y: 7, r: 2.6 },
    maren: { x: 7.3, y: 7.1 },
    exits: [
      { edge: 'ymax', a: 6, b: 8, to: 'nave', spawn: { x: 6, y: 0.8 } },
      { edge: 'xmin', a: 6, b: 8, veil: () => !!flags.sanctumClear, to: 'belfry', spawn: { x: 6, y: 10.6 } },
    ],
    triggers: [{ x0: 4.8, y0: 4.8, x1: 9.4, y1: 9.4, cond: () => !flags.awakened, fn: awakening }],
    npcs: () => flags.marenAwake ? [{ x: 7.6, y: 6.9, spr: SPR.maren, face: -1 }] : [],
    onEnter: async () => {
      if (flags.bossDone && !flags.marenAwake) return reunion();
      if (flags.sanctumClear) return;
      await wait(50);
      if (!flags.awakened) { await say([['ASH', "There — in the circle. That's her. Maren!"]]); return; }
      startEncounter(SANCTUM_FIGHT());
    },
  }),

  // -------------------------------------------------------------- 7. the belfry: the Bellwarden
  belfry: () => ({
    name: 'The Belfry', sub: 'Saint Orrin', outdoor: false, mood: 'interior', music: 'none', seed: 33, floor: 'wood',
    MW: 12, MH: 12, stains: 4, winL: [4, 8], winR: [4, 8], devSpawn: { x: 6, y: 10.6 },
    map: [
      'oooooooooooo', 'oUoooooooooo', 'opoooooooopo', 'oooooooooooo', 'oooooooooooo', 'oooooooooooo',
      'oooooooooooo', 'oooooooooooo', 'oooooooooooo', 'opoooooooopo', 'kooooooooook', 'oooooooooooo',
    ],
    onEnter: async () => {
      if (flags.bossDone) return;
      await wait(50);
      if (!flags.bossIntro) {
        await say([
          ['VOICE', 'YOU CAME ALL THE WAY OUT. HOW BRAVE. HOW BRIGHT.'],
          ['VOICE', 'I AM THE VIGIL THAT NEVER ENDS. EVERY SOUL THAT WANDERS HERE, I KEEP.'],
          ['ASH', "Then give hers back."] ]);
        flags.bossIntro = true; saveCheckpoint();
        toast('Your body lies at the threshold. Lead the Bellwarden away from it.', 420);
      }
      spawn('warden', 6, 3.5, { hp: 24, max: 24 });      // tuned for bare-soul palms (no sword yet)
      setMusic('boss');
    },
    onBossHalf: () => say([['VOICE', 'YOU RING... SO BRIGHTLY. LET ME HEAR YOU CRACK.']]),
    onBossDefeated: e => wardenDefeated(e),
  }),

  // -------------------------------------------------------------- 9. chapter II: lessons in the garden
  yard: () => {
    const G = AREAS.garden();
    return {
      name: "Maren's Cottage", sub: 'The next day', outdoor: true, mood: 'morning', music: 'ambient', seed: 5,
      MW: 20, MH: 20, fireflies: 0, drain: 0.025, devSpawn: { x: 12.5, y: 8.6 },
      map: G.map, house: G.house, goat: G.goat,
      exits: [{ edge: 'xmin', a: 11, b: 12, block: "Lessons first. She'd only drag me back by the ear." }],
      npcs: () => [{ x: coach.x, y: coach.y, spr: SPR.maren, face: coach.face }],
      interact: [
        { o: () => coach, label: 'Talk', fn: () => say([['MAREN', TR.hint || 'Well? Go on.']]) },
        { x: 6.5, y: 10.5, label: 'Look', body: true, fn: () => say([['ASH', (flags.lesson || 0) >= 3 && !flags.sword
            ? "Just dark water. ...She said not with my hands. As my soul." : "The well. 'Never drink from it after dark.'"]]) },
        { x: 6.5, y: 10.5, label: 'Reach in', spirit: true, range: 1.4, cond: () => flags.lesson >= 3 && !flags.sword, fn: takeBlade },
        { o: () => goat, label: 'Pet', fn: () => { bleat(); return say([['PIP', 'Meh.'], ['ASH', "Pip's back outside, and very offended about it."]]); } },
      ],
      lights: () => TR.marks.filter(m => !m.got).map(m => [isoX(m.x, m.y), isoY(m.x, m.y) - 12, 30, '90,230,255', 0.25])
        .concat(TR.blade ? [[isoX(TR.blade.x, TR.blade.y), isoY(TR.blade.x, TR.blade.y) - TR.blade.z - 10, 70, '160,240,255', 0.4 * TR.blade.a]] : [])
        .concat(flags.lesson === 3 && !flags.sword ? [[isoX(6.5, 10.5), isoY(6.5, 10.5) - 6, 26 + Math.sin(t * 0.05) * 4, '90,230,255', 0.12 * spiritK]] : []),
      glow: drawTraining,
      onEnter: training,
    };
  },

  // -------------------------------------------------------------- 8. home, by the hearth
  home: () => ({
    name: "Maren's Cottage", sub: 'Before dawn', outdoor: false, mood: 'hearth', music: 'ambient', seed: 41, floor: 'wood', wallStyle: 'plaster',
    MW: 9, MH: 8, winL: [3, 6], winR: [2, 7], devSpawn: { x: 5.5, y: 6.3 },
    map: ['ooooFoooo', 'KooooooJo', 'Kooccccoo', 'ooocNccoo', 'oooccccoo', 'ooooooooo', 'ooooooooo', 'ooooooooo'],
    goat: { x: 6.6, y: 4.6, region: [6, 4.2, 7.6, 5.4] },
    npcs: () => [{ x: 3.3, y: 3.5, spr: SPR.maren, face: 1 }],
    exits: [{ edge: 'ymax', a: 3, b: 6, block: "Not tonight. Tonight I'm listening." }],
    interact: [
      { x: 0.8, y: 1.6, label: 'Look', fn: () => say([['ASH', "Maren's books. Half of them are in languages I can't read. I always thought they were recipes."]]) },
      { o: () => goat, label: 'Pet', fn: () => { bleat(); return say([['PIP', '...mehh.'], ['ASH', "Pip's asleep by the fire. Somebody let a goat in the house. Maren never lets the goat in the house."]]); } },
    ],
    onEnter: homeTalk,
  }),
};

// ======================================================================
//  SCRIPT
// ======================================================================
async function startGame() {
  flags = {};
  state = 'card';
  await card(prose('Ash never knew his family.<br>As far back as he can remember, there was only Maren —<br>her cottage, her garden, and her rules.'));
  await card(prose('Tonight the bells of Saint Orrin rang on their own.<br>Maren took her lantern and went to see why.'));
  await card(prose('That was hours ago.'));
  await card('<div class="sub">Chapter I</div><div class="chapter">The Silent Bell</div>');
  hideCard();
  loadArea('garden', { x: 12.5, y: 8.6 });
}

// The circle answers to Maren's blood — and Ash is granted the power to step out of his body.
async function awakening() {
  state = 'cut'; b.vx = b.vy = 0;
  await tween(b, 6.2, 7.5, 30);
  b.face = 1;
  await say([
    ['ASH', "Maren! Maren, wake up."],
    ['ASH', "She's breathing. But her eyes... there's nobody behind them."],
  ]);
  await wait(40);
  sfx('veil'); circleFlare = 0.5; shake = 4;
  await wait(60);
  await say([
    ['CIRCLE', '...BLOOD OF HER BLOOD.'],
    ['ASH', "What—? The circle. It's warm. It's — it's pulling at something inside me."],
  ]);
  sfx('bell'); sfx('split'); shake = 14; whiteFlash = 1; circleFlare = 1;
  mode = 'spirit'; s = newSpirit(b.x, b.y); s.iT = 9999; s.back = true;
  b.ward = true;
  burstW(b, 10, 40, ['#9ff', '#fff', '#e8d090'], 3, true, 0);
  await tween(s, b.x + 1.2, b.y - 1.2, 70);
  await wait(40);
  await say([
    ['ASH', "I'm... outside myself. I can see me, lying next to her."],
    ['ASH', "It doesn't hurt. Everything's cold and clear, like the air after snow."],
    ['MEMORY', '"A body is only a door, Ash. Most people never learn that it opens. Pray you never do."'],
    ['ASH', "Her soul isn't anywhere in this room. It's somewhere... up."],
    ['VOICE', 'ANOTHER LITTLE CANDLE COMES TO THE VIGIL. COME UP, LITTLE CANDLE. COME UP INTO THE BELL.'],
  ]);
  flags.awakened = true; s.iT = 30; energy = 100;
  saveCheckpoint();
  state = 'play';
  toast('You are outside your body. Move freely — then press <kbd>C</kbd> to return to it.', 99999);
  await waitUntil(() => mode === 'body');
  toast('Good. Press <kbd>C</kbd> again to step back out.', 99999);
  await waitUntil(() => mode === 'spirit');
  toast('Your soul fades while you are apart — watch the bar, top left. Return to your body to restore it.', 420);
  await wait(240);
  startEncounter(SANCTUM_FIGHT());
}
const SANCTUM_FIGHT = () => ({
  id: 'sanctum',
  waves: [
    [['shade', 7, 2.6, { spd: 0.018, windT: 42 }]],
    [['hollow', 2.5, 9.5, { hp: 2 }], ['hollow', 11.5, 9.5, { hp: 2 }]],
    [['cantor', 3.5, 3]],
    [['shade', 3, 4], ['hollow', 2.5, 11.5], ['hollow', 11.5, 11.5]],
    [['shade', 3, 3], ['shade', 11, 3], ['hollow', 7, 12.5], ['cantor', 12.4, 7]],
  ],
  pre: [
    async () => toast('A Shade — made of soul. Fists pass through it. Only your soul can touch it. <kbd>X</kbd> to strike with an open palm.', 420),
    async () => toast('While you are out, your body lies defenceless. Guard it — or step back in and fight.', 420),
    async () => toast('A Cantor sings curses at your body. Strike the notes from the air, or stand in their way.', 420),
    async () => toast('Step out while standing in the circle, and it will shield your body from one blow.', 420),
    null,
  ],
  onClear: async () => {
    flags.sanctumClear = true; saveCheckpoint();
    sfx('veil');
    await wait(60);
    await say([
      ['ASH', "The air in that archway... it's shimmering."],
      ['MEMORY', '"Some doors only open for the dead, Ash. And for the fools who pretend to be."'],
      ['ASH', "That's where it took her. I can't carry my body up there — but I can leave it close."] ]);
    toast('Rest your body near the veil, then pass through it as spirit.', 520);
  },
});

async function wardenDefeated(e) {
  flags.bossDone = true;
  for (const x of enemies) if (x !== e) x.dead = true;
  enemies = []; bolts = []; rings = [];
  setMusic('none'); sfx('crack'); shake = 22; hitstop = 0;
  burstW(e, 24, 60, ['#c8a868', '#6e5a3a', '#fff', '#ffcc80'], 3.5, true, 0.02);
  marenSpirit = { x: e.x, y: e.y, a: 0 };
  saveCheckpoint();
  await wait(110);
  await say([
    ['MAREN', 'Ash...? Is that — you came out. All the way out.'],
    ['ASH', "Maren! The circle let me. It said something — 'blood of her blood.'"],
    ['MAREN', '...Did it. Then there is a great deal I should have told you.'],
    ['MAREN', 'Not here. Take me back down to my body, child. Then home.'],
  ]);
  await wait(30);
  transition('sanctum', { x: 1.4, y: 7.2 });
}

// Maren's soul finds its way back into her body
async function reunion() {
  state = 'cut';
  marenSpirit = { x: 0.8, y: 6.6, a: 1 };
  await wait(50);
  await say([['MAREN', "There I am. Goodness, I look dreadful."]]);
  await tween(marenSpirit, A.maren.x, A.maren.y, 100);
  sfx('merge'); sfx('veil'); whiteFlash = 0.7; circleFlare = 1; shake = 4;
  burstW(A.maren, 6, 30, ['#ffe0a0', '#fff', '#e8d090'], 2.5, true, -0.01);
  marenSpirit = null; flags.marenAwake = true;
  await wait(80);
  await say([
    ['MAREN', '...Oh. Oh, my bones.'],
    ['MAREN', 'Being a body again is a dreadful business. Help an old woman up.'],
    ['ASH', "You're back. You're really back."],
    ['MAREN', 'Thanks to you. Now — home, Ash. Before anything else in this place wakes up.'],
  ]);
  fadeTarget = 1;
  await wait(60);
  await card(prose('They walked home through the Old Wood together,<br>and neither of them said a word until the door was barred.'));
  hideCard();
  loadArea('home', { x: 5.6, y: 6.3 });
}

// the truth, by the fire
async function homeTalk() {
  if (flags.homeTalk) return;
  await wait(70);
  state = 'cut';
  await tween(b, 4.6, 4.6, 40);
  b.face = -1;
  await say([
    ['MAREN', 'Sit. Eat something. You look like a ghost — which, I suppose, tonight you were.'],
    ['ASH', "Maren. The circle said 'blood of her blood.' What did it mean?"],
    ['MAREN', "It meant you're mine, Ash. Not just the boy I took in. My grandson."],
    ['MAREN', 'Your mother was my daughter. Lyra. She had the gift — the same one that woke in you tonight.'],
    ['ASH', "You always said you didn't know who my parents were."],
    ['MAREN', 'I told you what kept you safe. I am sorry for it.'],
    ['MAREN', 'Listen. Some souls never find their rest. They go sour, and they wander, and they rot every soul they touch.'],
    ['MAREN', 'Somebody has to stand between them and the living. In the old days we called them soul warriors. Your mother was one.'],
    ['MAREN', 'Your father, Edwin, had no gift at all. Not a spark. He went with her anyway. Stubborn fool. I liked him enormously.'],
    ['MAREN', 'They left you with me when you were barely walking, and went where the lost souls were worst — to hold the line.'],
    ['ASH', 'And they never came back.'],
    ['MAREN', 'No. But the line held. For years, nothing crossed into Saint Orrin. Not one Hollowed. Not one Shade.'],
    ['MAREN', 'Until tonight.'],
    ['ASH', 'The things in the church...'],
    ['MAREN', "They shouldn't be here. Not unless something has gone wrong out there. Not unless something has happened to them."],
    ['MAREN', 'The corrupted souls are slipping through again, Ash. And your mother and father were the ones holding the door.'],
    ['ASH', "Then I'm going to find them."],
    ['MAREN', '...Of course you are. You have her eyes and his stubbornness, and I never stood a chance against either.'],
    ['MAREN', "Then we do it properly. I'll teach you everything I know. You'll fight whatever comes through."],
    ['MAREN', 'And we find out where your parents went — and what is tearing the veil open.'],
  ]);
  flags.homeTalk = true;
  await wait(60);
  fadeTarget = 1;
  await wait(50);
  await card(prose('Ash Wren had a family after all.'));
  await card(prose('Somewhere beyond the veil, his mother and father were still holding the line —<br><em>or they had already fallen.</em>'));
  await card('<div class="sub">End of Chapter I</div><div class="chapter">The Silent Bell</div><div class="press">Press Enter</div>');
  await card('<div class="sub">The journey continues</div><div class="chapter">Find them</div><div class="prose" style="margin-top:12px">Fight the lost souls. Follow your parents\' trail.<br>Learn what is breaking through.</div><div class="press">Press Enter</div>');
  markReached(2);
  startChapter2();
}

// ======================================================================
//  CHAPTER II — HER MOTHER'S BLADE
//  Maren trains Ash in the garden; the bare-soul palm becomes his mother's sword.
// ======================================================================
let coach = { x: 14.6, y: 10.4, face: -1 };
let TR = { marks: [], blade: null, hint: '' };

async function startChapter2() {
  flags = { intro: true, shawl: true, g1: true, awakened: true, sanctumClear: true, bossIntro: true, bossDone: true, marenAwake: true, homeTalk: true };
  markReached(2);
  state = 'card';
  await card('<div class="sub">Chapter II</div><div class="chapter">Her Mother\'s Blade</div>');
  await card(prose('Maren let him sleep until noon.<br>Then she marched him out into the garden.'));
  hideCard();
  loadArea('yard', { x: 12.5, y: 8.6 });
}

function drawTraining() {
  for (const m of TR.marks) {
    if (m.got) continue;
    const gx = Math.round(SX(m)), gy = Math.round(SY(m)), x = gx, y = Math.round(gy - 12 + Math.sin(t * 0.06 + m.x) * 2);
    ctx.fillStyle = `rgba(140,240,255,${0.3 + 0.2 * Math.sin(t * 0.1 + m.y)})`;
    for (let a = 0; a < 6.28; a += 0.25) ctx.fillRect(Math.round(gx + Math.cos(a) * 7), Math.round(gy + Math.sin(a) * 3.5), 1, 1);
    ctx.fillStyle = '#5ff'; ctx.fillRect(x - 1, y - 2, 3, 5); ctx.fillRect(x - 2, y - 1, 5, 3);
    ctx.fillStyle = '#fff'; ctx.fillRect(x, y - 1, 1, 3);
  }
  const bl = TR.blade;
  if (bl) {                                  // his mother's blade: no steel, only light
    const x = Math.round(isoX(bl.x, bl.y) - camX), y = Math.round(isoY(bl.x, bl.y) - camY - bl.z);
    ctx.globalAlpha = bl.a;
    for (let i = 0; i < 14; i++) { ctx.fillStyle = `rgba(160,240,255,${0.5 * Math.random()})`; ctx.fillRect(x + (Math.random() - 0.5) * 14 | 0, y - 30 + Math.random() * 34 | 0, 1, 1); }
    ctx.fillStyle = '#e8d090'; ctx.fillRect(x - 1, y - 33, 3, 2);           // pommel
    ctx.fillStyle = '#8a6a44'; ctx.fillRect(x, y - 31, 1, 5);               // grip
    ctx.fillStyle = '#e8d090'; ctx.fillRect(x - 4, y - 26, 9, 1); ctx.fillRect(x - 5, y - 27, 1, 1); ctx.fillRect(x + 5, y - 27, 1, 1);
    ctx.fillStyle = '#8fdde8'; ctx.fillRect(x - 1, y - 25, 3, 21);          // blade edge
    ctx.fillStyle = '#f4feff'; ctx.fillRect(x, y - 25, 1, 23);              // blade core + point
    ctx.globalAlpha = 1;
  }
}

async function needSpirit() {
  if (mode === 'spirit' && s && !s.recall) return;
  toast('Step out of your body &mdash; <kbd>C</kbd>', 99999);
  await waitUntil(() => mode === 'spirit' && s && !s.recall);
  toast('', 1);
}

async function training() {
  TR = { marks: [], blade: null, hint: '' };
  coach = { x: 14.6, y: 10.4, face: -1 };
  const L = () => flags.lesson || 0, step = n => { flags.lesson = n; saveCheckpoint(); };
  if (flags.sword) { if (L() < 5) finalTest(); return; }
  await wait(60);

  // ---- lesson 1: step out on purpose, and learn the length of the thread
  if (L() === 0) {
    state = 'cut';
    await tween(b, 12.6, 10.6, 50); b.face = 1; b.back = false;
    await say([
      ['MAREN', 'There. Stand there. No — there. Good.'],
      ['MAREN', 'Last night your soul fell out of you because the circle shook it loose. Today you step out on purpose.'],
      ['ASH', "And then you'll teach me to fight?"],
      ['MAREN', "Then I'll teach you not to die. Fighting is the easy part."],
    ]);
    state = 'play';
    TR.hint = 'Out you come, Ash. Press C. A body is only a door.';
    await needSpirit();
    TR.marks = [{ x: 9.8, y: 13.2 }, { x: 15.4, y: 13.8 }, { x: 16.6, y: 9.4 }];
    await say([
      ['MAREN', "There you are. Don't look so surprised — I can see you just fine."],
      ['MAREN', "There's a thread between your soul and your body. Six paces long, and not one more."],
      ['MAREN', "I've hung three lights about the garden. Go and touch them."],
    ]);
    TR.hint = "Touch all three lights. If the thread won't stretch, go back and walk your body closer.";
    toast('Touch the three soul-lights.', 360);
    await waitUntil(() => {
      for (const m of TR.marks) if (!m.got && s && !s.recall && Math.hypot(s.x - m.x, s.y - m.y) < 0.6) { m.got = true; sfx('orb'); burstW(m, 12, 14, ['#9ff', '#fff'], 1.6, true, 0); }
      return TR.marks.every(m => m.got);
    });
    sfx('chime');
    await say([['MAREN', 'Good. You move like smoke. Your mother moved like that.']]);
    step(1);
  }

  // ---- lesson 2: a soul in motion can't be caught — dash through the ring
  if (L() === 1) {
    await needSpirit();
    await say([
      ['MAREN', 'Things out there will try to catch you. But a soul in motion is very hard to catch.'],
      ['MAREN', 'When my bell rings, dash THROUGH the ring. Not away from it. Through.'],
    ]);
    TR.hint = 'When the ring reaches you, dash straight through it with Z.';
    toast('When the ring reaches you, <kbd>Z</kbd> to dash through it.', 99999);
    let dodged = 0, misses = 0;
    while (dodged < 2) {
      await needSpirit();
      toast('When the ring reaches you, <kbd>Z</kbd> to dash through it.', 99999);
      await wait(50);
      sfx('bell'); shake = 3;
      const g = { x: coach.x, y: coach.y, r: 0.3, max: Math.min(9, Math.hypot(s.x - coach.x, s.y - coach.y) + 1.5), soulOnly: true, dmg: 4, hitS: false, hitB: true };
      rings.push(g);
      await waitUntil(() => g.dead || g.hitS);
      if (g.dodged) { dodged++; if (dodged < 2) await say([['MAREN', 'Ha! Again.']]); }
      else if (g.hitS) await say([['MAREN', ['Through it, child. Not away from it.', "Wait until it's nearly on you — then dash.", 'Closer. Let it come to you, then go.'][misses++ % 3]]]);
      else await say([['MAREN', "Running won't save you. Come back here and go through it."]]);
    }
    toast('', 1);
    await say([['MAREN', 'There. Nothing that rings will ever catch you twice.']]);
    step(2);
  }

  // ---- lesson 3: strike with the soul (bare palms), against a bottled practice shade
  if (L() === 2) {
    await needSpirit();
    await say([
      ['MAREN', "Last lesson. I keep a few lost souls bottled in the cellar, for practice. This one's called Old Tibb."],
      ['ASH', 'You keep ghosts in jars.'],
      ['MAREN', "I keep jam in jars. Ghosts go in bottles. Don't be ridiculous."],
      ['MAREN', "He's mostly harmless. Mostly."],
    ]);
    sfx('veil'); burstW(coach, 14, 18, ['#a8a4b8', '#fff', '#dcd8e4'], 2, true, 0);
    spawn('shade', coach.x - 2, coach.y + 1.6, { sdmg: 4, windT: 48, spd: 0.016 });
    TR.hint = "Strike him with X. When he shivers red, he's about to lunge — dash aside.";
    toast('<kbd>X</kbd> strike with your soul. When he shivers red, <kbd>Z</kbd> dash aside.', 99999);
    await waitUntil(() => !enemies.length);
    toast('', 1);
    await wait(40);
    await say([
      ['MAREN', "Poor Tibb. He'll pull himself back together by supper."],
      ['MAREN', "You fight with open hands, Ash. That's very brave. It's also a fine way to get yourself unmade."],
      ['ASH', "It's not like I have anything else."],
      ['MAREN', '...No. But you could.'],
      ['MAREN', "You've always asked why you must never drink from the well after dark."],
      ['MAREN', "It's because at night you can see the light down there. Something of your mother's has been sleeping at the bottom since the day she left."],
      ['MAREN', 'Go and fetch it. Not with your hands. As you are now.'],
    ]);
    step(3);
  }
  if (L() === 3) {
    TR.hint = 'The well, Ash. Go as your soul — your hands will only get wet.';
    toast('Go to the well as your soul. (Walk your body closer if the thread won\'t reach.)', 600);
  }
}

// the blade rises out of the well
async function takeBlade() {
  state = 'cut'; toast('', 1);
  sfx('veil'); shake = 3;
  TR.blade = { x: 6.5, y: 10.5, z: 0, a: 0 };
  for (let i = 1; i <= 110; i++) { const k = i / 110; TR.blade.z = 6 + 30 * (1 - (1 - k) ** 3); TR.blade.a = Math.min(1, i / 30); if (i % 6 === 0) burstW(TR.blade, TR.blade.z, 2, ['#9ff', '#fff'], 0.8, true, -0.02); await wait(1); }
  sfx('chime');
  await say([
    ['ASH', "A sword. It's made of... light. It was down there the whole time?"],
    ['MAREN', "Your mother's blade. There's no steel in it — she drew it out of her own soul, the year she turned fifteen."],
    ['MAREN', "The night she left you with me, she let it fall down the well. She said: 'When he's ready, he'll find it.'"],
    ['MAREN', 'I prayed you never would. ...Take it.'],
  ]);
  const z0 = TR.blade.z, x0 = TR.blade.x, y0 = TR.blade.y;
  for (let i = 1; i <= 36; i++) { const k = i / 36; TR.blade.x = x0 + (s.x - x0) * k; TR.blade.y = y0 + (s.y - y0) * k; TR.blade.z = z0 + (14 - z0) * k; await wait(1); }
  TR.blade = null; flags.sword = true; flags.lesson = 4;
  whiteFlash = 0.8; shake = 8; sfx('split'); sfx('slash');
  burstW(s, 14, 44, ['#9ff', '#fff', '#e8d090'], 3, true, 0);
  await wait(50);
  await say([
    ['ASH', "It's warm. Like somebody's holding my hand."],
    ['MAREN', 'It knows you. Now let us see what you can do with it.'],
  ]);
  saveCheckpoint();
  state = 'play';
  finalTest();
}

async function finalTest() {
  TR.hint = 'Cut them down — and keep an eye on your body.';
  await needSpirit();
  await say([['MAREN', "Three of Tibb's cousins. And mind your body this time — the grey one goes for flesh."]]);
  sfx('veil'); burstW(coach, 14, 18, ['#a8a4b8', '#fff'], 2, true, 0);
  startEncounter({
    id: 'yard',
    waves: [
      [['shade', 12.2, 13.4, { sdmg: 6, windT: 44 }], ['shade', 16.4, 12.6, { sdmg: 6, windT: 44 }]],
      [['hollow', 9.2, 14.6, { hp: 2 }], ['shade', 15.8, 14.2, { sdmg: 6, windT: 40 }]],
    ],
    pre: [
      async () => toast('The blade cuts wide and deep. <kbd>X</kbd>', 300),
      async () => toast('A Hollow is coming for your body. Get back in and fight it &mdash; or get between.', 380),
    ],
    onClear: chapter2End,
  });
}

async function chapter2End() {
  flags.lesson = 5; saveCheckpoint();
  await wait(60);
  state = 'cut';
  await say([
    ['MAREN', '...Well.'],
    ['MAREN', "You held that blade like you were born with it. I suppose, in a way, you were."],
    ['ASH', 'Was she good? My mother. At this.'],
    ['MAREN', 'The best I ever saw. That is what frightens me, Ash. Whatever stopped her, I cannot teach you to beat it in an afternoon.'],
    ['MAREN', "So we go carefully. Tonight I'll show you the last letter she ever sent me. Then we decide where to begin."],
  ]);
  fadeTarget = 1;
  await wait(50);
  await card(prose("Ash Wren was a soul warrior now.<br>A small one, with his mother's blade."));
  await card('<div class="sub">End of Chapter II</div><div class="chapter">Her Mother\'s Blade</div><div class="press">Press Enter</div>');
  startChapter3();
}
