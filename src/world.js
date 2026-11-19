"use strict";
// ======================================================================
//  WORLD: rooms of Saint Orrin + the Chapter I script.
//  Each room is a factory so reloading after death rebuilds it from `flags`.
//
//  Story beats (flags):
//    intro        Ash enters the cathedral
//    g1           the narthex gate is winched open
//    naveClear    the risen parishioners are put down
//    awakened     the bell tears Ash's soul loose; Maren's circle holds it  -> splitting unlocked
//    sanctumClear the veil to the belfry opens
//    bossIntro / bossDone
// ======================================================================

// ---- prop helpers (x,y = base of the object on the floor)
const pillar  = (x, y) => ({ kind: 'pillar', x, y, solid: { x: x - 8, y: y - 4, w: 16, h: 7 } });
const pew     = (x, y) => ({ kind: 'pew', x, y, solid: { x, y: y - 6, w: 46, h: 6 } });
const candle  = (x, y) => ({ kind: 'candle', x, y });
const statue  = (x, y) => ({ kind: 'statue', x, y, solid: { x: x - 7, y: y - 5, w: 14, h: 6 } });
const lectern = (x, y, lines) => ({ kind: 'lectern', x, y, solid: { x: x - 5, y: y - 3, w: 10, h: 4 }, note: { lines } });
const railing = (x, y, w) => ({ kind: 'railing', x, y, w, solid: { x, y: y - 3, w, h: 4 } });
const winch   = (x, y, use, used) => ({ kind: 'winch', x, y, solid: { x: x - 5, y: y - 3, w: 10, h: 4 }, use, used, label: 'Turn' });
const marenBody = (x, y) => ({ kind: 'maren', x, y });

// ---- journal pages
const NOTE1 = [
  ['NOTE', 'Ash — if you followed me here, turn around and go home.'],
  ['NOTE', 'The bells are not ringing for the living. Lock the door behind you. — M.'],
];
const NOTE2 = [
  ['NOTE', 'Day two. The dead walk the nave at night. They do not touch me. They want something warmer.'],
  ['NOTE', 'The bell tower is sealed by a veil no living thing can cross. I will leave my body in the sanctum circle and go up as I am.'],
  ['NOTE', 'The circle will keep my body safe. For a while.'],
];

// ======================================================================
const ROOMS = {
  narthex: () => ({
    name: 'The Narthex', w: 480, h: 270, floor: 'stone', seed: 3, ambient: 0.72, music: 'ambient',
    windows: [64, 416], niches: [112, 368], stains: 3,
    exits: [
      { side: 'n', x0: 224, x1: 256, to: 'nave', spawn: { x: 240, y: 396 } },
      { side: 's', x0: 224, x1: 256, block: "I'm not leaving without her." },
    ],
    carpet: { x: 228, w: 24, y0: 132, y1: 270 },
    props: [
      railing(16, 128, 208), railing(256, 128, 208),
      pillar(96, 214), pillar(384, 214), statue(150, 92), statue(330, 92),
      candle(40, 100), candle(436, 146), candle(40, 252), candle(440, 252),
      lectern(306, 238, NOTE1),
      winch(448, 180, narthexWinch, !!flags.g1),
    ],
    gates: [{ id: 'g1', x: 224, y: 128, w: 32, open: !!flags.g1 }],
    triggers: [{ x: 16, y: 128, w: 448, h: 60, cond: () => !flags.g1, fn: narthexGate }],
    onEnter: narthexEnter,
  }),

  nave: () => ({
    name: 'The Nave', w: 480, h: 420, floor: 'stone', seed: 9, ambient: 0.72, music: 'ambient',
    windows: [64, 152, 328, 416], stains: 9,
    exits: [
      { side: 'n', x0: 224, x1: 256, to: 'sanctum', spawn: { x: 240, y: 296 } },
      { side: 's', x0: 224, x1: 256, to: 'narthex', spawn: { x: 240, y: 62 } },
    ],
    carpet: { x: 228, w: 24, y0: TOPW, y1: 420 },
    props: [
      pillar(88, 120), pillar(392, 120), pillar(88, 230), pillar(392, 230), pillar(88, 340), pillar(392, 340),
      pew(150, 170), pew(284, 170), pew(150, 196), pew(284, 196), pew(150, 284), pew(284, 284), pew(150, 310), pew(284, 310),
      candle(36, 80), candle(444, 80), candle(36, 400), candle(444, 400),
      lectern(306, 100, NOTE2),
    ],
    triggers: [{ x: 16, y: 0, w: 448, h: 336, cond: () => !flags.naveClear, fn: naveAmbush }],
  }),

  sanctum: () => ({
    name: 'The Sanctum', w: 480, h: 320, floor: 'stone', seed: 21, ambient: 0.7, music: 'ambient',
    windows: [56, 112, 368, 424], stains: 6,
    exits: [
      { side: 's', x0: 224, x1: 256, to: 'nave', spawn: { x: 240, y: 64 } },
      { side: 'n', x0: 224, x1: 256, veil: true, open: () => !!flags.sanctumClear, to: 'belfry', spawn: { x: 240, y: 276 } },
    ],
    circle: { x: 240, y: 190, r: 40 },
    carpet: { x: 228, w: 24, y0: 232, y1: 320 },
    streak: { x: 244, y1: 168 },
    props: [
      pillar(104, 120), pillar(376, 120), pillar(104, 262), pillar(376, 262),
      candle(200, 86), candle(280, 86), candle(40, 300), candle(440, 300),
      statue(60, 92), statue(420, 92),
      ...(flags.bossDone ? [] : [marenBody(246, 192)]),
    ],
    triggers: [{ x: 196, y: 160, w: 90, h: 70, cond: () => !flags.awakened, fn: awakening }],
    onEnter: sanctumEnter,
  }),

  belfry: () => ({
    name: 'The Belfry', w: 480, h: 300, floor: 'wood', seed: 33, ambient: 0.72, music: 'none',
    windows: [96, 384], niches: [176, 304], stains: 4,
    exits: [],
    props: [
      pillar(80, 110), pillar(400, 110), pillar(80, 236), pillar(400, 236),
      candle(36, 70), candle(444, 70), candle(36, 284), candle(444, 284),
    ],
    onEnter: belfryEnter,
  }),
};

// ======================================================================
//  SCRIPT
// ======================================================================
async function startGame() {
  flags = {};
  state = 'card';
  await card(prose('The bells of Saint Orrin rang at midnight.<br>No one was pulling the ropes.'));
  await card(prose('Sister Maren went in to find out why.<br>That was three days ago.'));
  await card(prose('Maren could do things no one else in the village could.<br>She called it <em>walking the veil</em>, and swore Ash would never have to learn.'));
  await card(prose('Ash went in after her anyway.'));
  await card('<div class="sub">Chapter I</div><div class="chapter">The Silent Bell</div>');
  hideCard();
  loadRoom('narthex', { x: 240, y: 244 });
}

// ---- Narthex: Ash is only human here
async function narthexEnter() {
  if (flags.intro) return;
  await wait(70);
  await say([
    ['ASH', 'Maren? ...Sister Maren?'],
    ['ASH', "Every candle in the place is lit. Somebody's been tending them."],
  ]);
  flags.intro = true;
  toast('<kbd>Arrows</kbd> move &nbsp;&middot;&nbsp; <kbd>Z</kbd> dash &nbsp;&middot;&nbsp; <kbd>X</kbd> strike / interact', 420);
}
async function narthexGate() {
  await say([
    ['ASH', "The gate's been winched shut."],
    ['ASH', 'The wheel should be on the wall somewhere. Maren always made me oil it.'],
  ]);
}
async function narthexWinch(p) {
  flags.g1 = true;
  const g = R.gates.find(g => g.id === 'g1'); if (g) g.open = true;
  sfx('gate'); shake = 5;
  saveCheckpoint();
  await wait(40);
  await say([['ASH', "Heavy... but it turns. She came through here. I'd bet my life on it."]]);
}

// ---- Nave: the first fight, with fists
async function naveAmbush() {
  if (!flags.wave_nave) {
    await say([
      ['ASH', "The pews are thick with dust. Like no one's sat here in years."],
      ['ASH', "...Wait. Something's moving under the floor."],
    ]);
  }
  const slow = { spd: 0.35, hp: 2, windT: 40 };
  startEncounter({
    id: 'nave',
    waves: [
      [['hollow', 240, 200, slow]],                                                 // one slow ghoul: learn the rhythm
      [['hollow', 160, 230, { hp: 2 }], ['hollow', 320, 230, { hp: 2 }]],           // two at once
      [['hollow', 150, 140], ['hollow', 330, 140], ['hollow', 240, 262]],           // the real thing
    ],
    pre: [
      async () => toast('When it rears back and flashes, it\'s about to lunge. <kbd>Z</kbd> to dash aside, <kbd>X</kbd> to strike.', 480),
      async () => {
        await say([
          ['ASH', "That was old Tomas. And the miller's wife..."],
          ['ASH', "These are the parishioners. I'm sorry. I'm so sorry."],
        ]);
        toast('Hitting one mid wind-up knocks it off balance.', 360);
      },
      async () => toast("Keep moving. Don't let them surround you.", 300),
    ],
    onClear: async () => {
      flags.naveClear = true; saveCheckpoint();
      await wait(50);
      await say([
        ['ASH', '...Rest. Please, just rest.'],
        ['ASH', "There's a lectern up by the chancel. That's Maren's handwriting."],
      ]);
    },
  });
}

// ---- Sanctum: the turning point
async function sanctumEnter() {
  if (flags.sanctumClear) return;
  await wait(50);
  if (!flags.awakened) {
    await say([['ASH', "There — in the circle. That's her habit. Maren!"]]);
    return;
  }
  startEncounter(SANCTUM_FIGHT());
}
async function awakening() {
  state = 'cut'; b.vx = b.vy = 0;
  await tween(b, 228, 196, 24);
  b.face = 1; b.ax = 1; b.ay = 0;
  await say([
    ['ASH', "Maren! She's warm. She's breathing."],
    ['ASH', "But her eyes... there's nobody behind them."],
    ['ASH', 'Wake up. Please. Please, Maren.'],
  ]);
  await wait(50);
  sfx('bell'); shake = 12; whiteFlash = 0.6;
  await wait(70);
  await say([
    ['VOICE', 'ANOTHER LITTLE CANDLE COMES TO THE VIGIL.'],
    ['VOICE', 'COME UP, LITTLE CANDLE. COME UP INTO THE BELL.'],
  ]);
  // the toll tears Ash's soul loose and drags it toward the belfry
  sfx('bell'); sfx('split'); shake = 20; whiteFlash = 1;
  mode = 'spirit'; s = newSpirit(b.x, b.y - 2); s.iT = 9999; s.ay = -1;
  b.ward = true;
  burst(b.x, b.y - 10, 30, ['#9ff', '#fff', '#5ff'], 3, true, 0);
  await tween(s, 240, 70, 80);
  await wait(25);
  // ...and Maren's circle holds on
  circleFlare = 1; sfx('ward'); shake = 8;
  burst(R.circle.x, R.circle.y, 40, ['#e8d090', '#fff', '#a83030'], 3.5, true, 0);
  await tween(s, b.x + 4, b.y - 34, 26);
  await wait(40);
  await say([
    ['ASH', "I'm... out. I'm outside my body."],
    ['ASH', 'Something above the altar pulled at me, and the circle — the circle held on.'],
    ['ASH', "There's a thread. I can feel it, tied to me. To... me, lying there."],
    ['MEMORY', '"A body is only a door, Ash. Most people never learn that it opens. Pray you never do."'],
    ['VOICE', "...THE OLD WOMAN'S CIRCLE. CLEVER. NO MATTER. I WILL TAKE YOU THE SLOW WAY."],
  ]);
  flags.awakened = true; s.iT = 30; energy = 100;
  saveCheckpoint();
  state = 'play';
  // a quiet moment to practice before anything attacks
  toast('You are outside your body. Move freely — then press <kbd>C</kbd> to return to it.', 99999);
  await waitUntil(() => mode === 'body');
  toast('Good. Press <kbd>C</kbd> again to step back out.', 99999);
  await waitUntil(() => mode === 'spirit');
  toast('Your soul fades while you are apart — watch the bar, top left. Return to your body to restore it.', 420);
  await wait(240);
  startEncounter(SANCTUM_FIGHT());
}
const waitUntil = async f => { while (!f()) await wait(1); };
const SANCTUM_FIGHT = () => ({
  id: 'sanctum',
  waves: [
    [['shade', 240, 120, { spd: 0.45, windT: 42 }]],                               // one shade: learn spirit combat
    [['hollow', 150, 250, { hp: 2 }], ['hollow', 330, 250, { hp: 2 }]],           // they go for your empty body
    [['cantor', 240, 100]],                                                        // one cantor: learn to cut bolts
    [['shade', 160, 120], ['hollow', 150, 262], ['hollow', 330, 262]],
    [['shade', 120, 120], ['shade', 360, 120], ['hollow', 240, 284], ['cantor', 90, 160]],
  ],
  pre: [
    async () => toast('A Shade — made of soul. Fists pass through them. Only your soul can cut them.', 420),
    async () => toast('While you are out, your body lies defenceless. Guard it, or step back in and fight.', 420),
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
      ['ASH', "That's where it took her. I can't carry my body up there. But I can leave it close."],
    ]);
    toast('Rest your body near the veil, then pass through it as spirit.', 520);
  },
});

// ---- Belfry
async function belfryEnter() {
  if (flags.bossDone) return;
  await wait(50);
  if (!flags.bossIntro) {
    await say([
      ['VOICE', 'YOU CAME ALL THE WAY OUT. HOW BRAVE. HOW BRIGHT.'],
      ['VOICE', 'I AM THE VIGIL THAT NEVER ENDS. EVERY SOUL THAT WANDERS HERE, I KEEP.'],
      ['ASH', "Then tonight you're keeping nothing."],
    ]);
    flags.bossIntro = true; saveCheckpoint();
    toast('Your body lies at the threshold. Lead the Bellwarden away from it.', 420);
  }
  spawn('warden', 240, 110);
  setMusic('boss');
}
async function wardenHalf() {
  await say([['VOICE', 'YOU RING... SO BRIGHTLY. LET ME HEAR YOU CRACK.']]);
}
async function wardenDefeated(e) {
  flags.bossDone = true;
  for (const x of enemies) if (x !== e) x.dead = true;
  enemies = []; bolts = []; rings = [];
  setMusic('none'); sfx('crack'); shake = 22; hitstop = 0;
  burst(e.x, e.y - 24, 60, ['#c8a868', '#6e5a3a', '#fff', '#ffcc80'], 3.5, true, 0.02);
  splatOn(dg, e.x, e.y, 10, ['#2a2216', '#3e321f'], Math.random, R);
  marenSpirit = { x: e.x, y: e.y, a: 0 };
  await wait(110);
  await say([
    ['MAREN', 'Ash...?'],
    ['ASH', "Maren! You're — you're all light."],
    ['MAREN', 'And you are all the way out of your body. Oh, child. What did it do to you?'],
    ['ASH', "It tried to take me too. Your circle wouldn't let it."],
    ['MAREN', '...Then you have a thread now, same as I do. I am so sorry. I wanted you to have an ordinary life.'],
    ['MAREN', 'Listen. That thing was not the only one. The bell was never a prison. It was a lid.'],
    ['MAREN', 'Something under Saint Orrin has been feeding on the vigil. And now it knows your name.'],
    ['MAREN', "Go back to yourself, Ash. I'll find my own way down. Quickly — before the quiet notices you."],
  ]);
  await wait(40);
  fadeTarget = 1;
  await wait(50);
  await card(prose('The bells of Saint Orrin fell silent.'));
  await card(prose('Far below the crypt, something began to knock.'));
  await card('<div class="sub">End of Chapter I</div><div class="chapter">The Silent Bell</div><div class="press">Press Enter</div>');
  hideCard();
  showTitle();
}
