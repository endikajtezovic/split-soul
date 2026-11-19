"use strict";
// ======================================================================
//  CHAPTER III — THE DROWNED CAPTAIN
//  Ash leaves home on the steamship Merrow. Its captain's soul has gone sour,
//  and he has raised the drowned sailors of his old crew as his shades.
//
//  Extra legend:  ~ sea   h ship hull (sea under the moored ship)   d deck / pier planks   e hatch
//                 O funnel (outdoors) / boiler (indoors)   V lifeboat (2 tiles)   x crate   u barrel
//                 n bollard   Q ship's wheel   M mast   I pipes   v steam valve   + white ship rail   % deckhouse
//                 j deck lamp   z deck bench   y capstan   a anchor windlass   ! flagstaff   & ventilator cowl
//  Areas:         harbor -> quarters (passenger cabins, inside the deckhouse) <-> deck <-> engine (via the companionway)
//  Story:         board, meet Tamsin & Kit -> vent the valves -> sleep -> Tamsin won't wake: her soul is chained ->
//                 follow the chain up through the fog -> the Drowned Anchor -> she wakes
//  Story flags:   farewell, metFriends, mate, valve_X_Y, valvesDone, evening, slept, sawChains, deckClear,
//                 captainIntro, captainFree, captainAwake, tamsinAwake
// ======================================================================

SPR.haleSpirit = mk(spiritRows, { ...PAL, K: '#1e4a44', W: '#effffa', w: '#a8e8d8', x: '#5aa898', g: '#fff' }, '#9ff0e0');

const SHIP_NPC = {
  odile:  { x: 5.4, y: 19.3, spr: SPR.odile, face: -1 },       // right up in the bow, watching the sea
  mate:   { x: 6.2, y: 18.6, spr: SPR.mate, face: 1 },         // by the companionway down to the engines
  pellow: { x: 1.8, y: 9.6, spr: SPR.pellow, face: 1 },        // on a bench
  hale:   { x: 4.6, y: 8.1, spr: SPR.captain, face: -1 },      // at the wheel
};
const VALVES = [[1, 4], [10, 4], [6, 10]];
const shipDeck = name => ({
  name, sub: flags.captainAwake ? 'The Merrow, at dawn' : flags.slept ? 'The Merrow, in the fog' : flags.valvesDone ? 'The Merrow, nightfall' : 'The Merrow, at sea',
  outdoor: true, deck: true, sea: true, edge: { kind: 'hull', h: 24 }, seed: 70, fireflies: 0, music: 'ambient',
  mood: flags.captainAwake ? 'morning' : flags.slept ? 'fog' : flags.valvesDone ? 'night' : 'dusk', ext: () => '~',
});

Object.assign(AREAS, {
  // -------------------------------------------------------------- 1. the harbour: goodbye
  harbor: () => ({
    name: 'Kettle Harbour', sub: 'Three days east of Saint Orrin', outdoor: true, mood: 'morning', music: 'ambient', seed: 61,
    MW: 16, MH: 26, fireflies: 0, sea: true, edge: { kind: 'pier', h: 7 }, devSpawn: { x: 12.5, y: 2.2 },
    ext: (x, y) => (y >= 4 ? '~' : null),
    map: [
      'TT##L####L###TTT', '.###x#u####x##..', '.#######u#######', '################',
      '~hhhhh~~dd~~~~~~', '~hhhhh~~dd~~~~~~', '~hhhhh~~nd~~~~~~', '~hhhhh~~dd~~~~~~',
      '~hhhhh~~dd~~~~~~', '~hhhhh~~dd~~~~~~', '~hhhhh~~dn~~~~~~', '~hhhhh~~dd~~~~~~',
      '~hhhhh~~dd~~~~~~', '~hhhhh~~dd~~~~~~', '~hhhhh~~nd~~~~~~', '~hhhhh~~dd~~~~~~',
      '~hhhhh~~dd~~~~~~', '~hhhhh~~dd~~~~~~', '~hhhhh~~dn~~~~~~', '~hhhhh~~dd~~~~~~',
      '~hhhhh~~dd~~~~~~', '~hhhhh~~dd~~~~~~', '~hhhhh~~nd~~~~~~', '~~~~~~~~dd~~~~~~',
      '~~~~~~~~dn~~~~~~', '~~~~~~~~dd~~~~~~',
    ],
    ship: { x0: 0.8, y0: 4.2, w: 4.6, d: 18 },
    goat: { x: 9.4, y: 12.6, region: [9.1, 12, 9.6, 13.4] },
    npcs: () => [{ x: 8.6, y: 12.2, spr: SPR.maren, face: -1 }],
    exits: [{ edge: 'xmax', a: 0, b: 4, block: "The ship's that way, Ash." }],
    interact: [
      { x: 8.6, y: 12.2, label: 'Talk', cond: () => flags.farewell, fn: () => say([['MAREN', 'Go on, then. Before I change my mind and drag you home by the collar.']]) },
      { x: 8.3, y: 13.6, label: 'Board the Merrow', range: 1.0, cond: () => flags.farewell, fn: boardShip },
      { o: () => goat, label: 'Pet', fn: () => { bleat(); return say([['PIP', 'Mehhh.'], ['ASH', "I know, Pip. You hate boats. You're not coming."]]); } },
      { x: 4.5, y: 1.5, label: 'Look', fn: () => say([['ASH', "Crates stamped SALTMERE. Salt fish, mostly. And one that's ticking."]]) },
    ],
    triggers: [{ x0: 6.5, y0: 2.6, x1: 11.5, y1: 7, cond: () => !flags.farewell, fn: farewell }],
    onEnter: async () => {
      if (flags.farewell) return;
      await wait(60);
      toast('Maren and Pip are waiting on the pier.', 300);
    },
  }),

  // -------------------------------------------------------------- 2. aboard: one long deck, the ship running on past the edge of the screen
  //  stern (and the long deckhouse) toward -y, the bow coming toward the camera at +y
  deck: () => ({
    ...shipDeck('The Merrow'),
    MW: 11, MH: 20, bow: 7.5, shipRuns: true, devSpawn: { x: 8.3, y: 12 },
    edge: { kind: 'hull', h: 34 },
    ext: (x, y) => (y < 0 && x >= 0 && x <= 10 ? (x === 0 || x === 10 ? '+' : x <= 6 ? '%' : x === 9 && ((y % 4) + 4) % 4 === 2 ? 'j' : 'd') : '~'),
    deckhouse: { x0: 1, y0: -10, w: 6, d: 16 },
    map: [
      '+%%%%%%ddd+', '+%%%%%%ddd+', '+%%%%%%ddj+', '+%%%%%%ddd+', '+%%%%%%ddz+', '+%%%%%%ddd+',
      '+&dddddddj+', '+dddQddddd+', '+ddddddddd+', '+zdddddddd+', '+jdddddddj+', '+ddddddddd+',
      '+ddddddddd+', '+dMddddddu+', '+jdddddddj+', '+ddddddddd+', '+dyddaddyd+', '+ddddddeed+',
      '+ndddddeen+', '+ddddddddd+',
    ],
    npcs: () => {
      if (flags.captainAwake) return [{ ...SHIP_NPC.hale }, { x: 3.2, y: 9.8, spr: SPR.mate, face: 1 }, { x: 6.4, y: 9.6, spr: SPR.odile, face: -1 }];
      if (flags.slept) return flags.captainIntro ? [{ x: 4.6, y: 8.3, spr: SPR.captainLie, ox: 12, oy: 6 }] : [{ ...SHIP_NPC.hale }];
      return Object.values(SHIP_NPC).map(n => ({ ...n }));
    },
    interact: [
      { o: () => SHIP_NPC.odile, label: 'Talk', cond: () => !flags.slept, fn: talkOdile },
      { o: () => SHIP_NPC.mate, label: 'Talk', cond: () => !flags.slept, fn: talkMate },
      { o: () => SHIP_NPC.pellow, label: 'Talk', cond: () => !flags.slept, fn: talkPellow },
      { o: () => SHIP_NPC.hale, label: 'Talk', cond: () => !flags.captainIntro, fn: talkHale },
      { x: 8, y: 18, label: 'Go below', range: 1.5, cond: () => !flags.valvesDone, fn: async () => {
        if (!flags.mate) return say([['ASH', "Stairs down into the ship. A brass plate says CREW ONLY. Somebody's scratched a skull under it."]]);
        sfx('gate'); transition('engine', { x: 8, y: 0.9 });
      } },
      { x: 7.4, y: 4.4, label: 'Passenger quarters', range: 1.0, cond: () => !flags.captainIntro || flags.captainFree, fn: () => { sfx('gate'); transition('quarters', { x: 6, y: 1.1 }); } },
      { x: 5.5, y: 16.5, label: 'Look', range: 1.2, fn: () => say([['ASH', "The anchor windlass. The chain's as thick as my arm, and every link is crusted white with salt."]]) },
      { x: 3.5, y: 19.4, label: 'Look', fn: () => say([['ASH', flags.valvesDone ? "Nothing ahead but fog. We could be sailing off the edge of the world." : "Nothing ahead but sea. Somewhere out there — Saltmere."]]) },
    ],
    triggers: [{ x0: 0, y0: 6, x1: 11, y1: 11.5, cond: () => flags.deckClear && !flags.captainIntro, fn: captainRises }],
    glow: () => {                                      // the chain from Tamsin's soul, only visible to a soul
      if (!flags.slept || flags.captainFree || spiritK < 0.05) return;
      const boss = enemies.find(e => e.boss), x0 = isoX(7.1, 4.4) - camX, y0 = isoY(7.1, 4.4) - camY - 8;
      const x1 = boss ? SX(boss) : isoX(4.5, 7.5) - camX, y1 = boss ? SY(boss) - 40 : isoY(4.5, 7.5) - camY - 14;
      drawChain(x0, y0, x1, y1, spiritK, 10);
    },
    onEnter: deckEnter,
    onBossHalf: () => say([['CAPTAIN', 'ALL HANDS! ALL HANDS TO ME!']]),
    onBossDefeated: e => captainFreed(e),
  }),

  // -------------------------------------------------------------- 2b. inside the deckhouse: the passenger quarters
  quarters: () => ({
    name: 'Passenger Quarters', sub: flags.captainAwake ? 'The Merrow, morning' : flags.slept ? 'The Merrow, the next morning' : flags.valvesDone ? 'The Merrow, night' : 'The Merrow',
    outdoor: false, mood: flags.valvesDone && !flags.slept ? 'interior' : 'hearth', music: 'ambient', seed: 77, floor: 'wood', wallStyle: 'cabin',
    MW: 12, MH: 9, winL: [2, 6], winR: [2, 9.5], devSpawn: { x: 6, y: 1.2 },
    map: ['oJooJoooJooK', 'oooooooooooK', 'xooooooooooo', 'oooNoooooooo', 'oooooooooNoo', 'Jooooooooooo', 'oooooooooooo', 'xuoooooooooo', 'oooooooooooo'],
    exits: [{ edge: 'ymin', a: 5, b: 7, to: 'deck', spawn: { x: 7.7, y: 4.4 }, block: "Tamsin first.", blockIf: () => flags.slept && !flags.sawChains || flags.captainFree && !flags.tamsinAwake }],
    lights: () => [[isoX(0.05, 3), isoY(0.05, 3) - 52, 56, '255,190,110', 0.16], [isoX(8, 0.05), isoY(8, 0.05) - 52, 56, '255,190,110', 0.16], [isoX(3, 0.05), isoY(3, 0.05) - 52, 50, '255,190,110', 0.14]],
    npcs: () => {
      if (flags.tamsinAwake) return [{ x: 4.6, y: 1.7, spr: SPR.tamsin, face: 1 }, { x: 6, y: 1.9, spr: SPR.kit, face: -1 }];
      if (flags.slept) return [{ x: 4.5, y: 0.6, draw: () => drawSleeper(4.5, 0.5) }, { x: 5.7, y: 1.7, spr: SPR.kit, face: -1 }];
      return [{ x: 2.6, y: 3.6, spr: SPR.tamsin, face: 1 }, { x: 9.6, y: 5.3, spr: SPR.kit, face: -1 }];
    },
    interact: [
      { x: 2.6, y: 3.6, label: 'Talk', cond: () => !flags.slept, fn: talkTamsin },
      { x: 9.6, y: 5.3, label: 'Talk', cond: () => !flags.slept, fn: talkKit },
      { x: 1.5, y: 0.6, label: 'Sleep', range: 1.2, cond: () => flags.valvesDone && !flags.slept, fn: goToSleep },
      { x: 1.5, y: 0.6, label: 'Look', range: 1.2, cond: () => !flags.valvesDone || flags.slept, fn: () => say([['ASH', "My bunk. Narrower than a coffin, and it smells a bit like one too."]]) },
      { x: 4.6, y: 0.8, label: 'Look', range: 1.2, cond: () => flags.slept && !flags.captainFree, fn: () => say([['ASH', mode === 'spirit' ? "The chains are cutting into her. Every link is wet, like it's been dragged up off the sea floor." : "She's breathing. She just... isn't there. Step out, Ash. Look properly."]]) },
      { x: 5.7, y: 1.7, label: 'Talk', cond: () => flags.slept && !flags.tamsinAwake, fn: () => say([['KIT', flags.sawChains ? "Where are you going? ...You know something. Go on — I'll stay with her." : "I'll stay with her. Do something, Ash. Please."]]) },
      { x: 11.4, y: 1, label: 'Look', range: 1.3, fn: () => say([['ASH', "Kit's books. 'Wrecks of the Northern Sea.' 'The Merrow: A Haunted History.' 'Bird Eggs, Volume Two.'"]]) },
    ],
    glow: () => {                                      // Tamsin's soul, wrapped in chains, only visible to a soul
      if (!flags.slept || flags.captainFree || spiritK < 0.05) return;
      const x = isoX(4.6, 0.6) - camX, y = isoY(4.6, 0.6) - camY - 26 + Math.sin(t * 0.04) * 1.5;
      drawSpr(SPR.tamsinSpirit, x - 6, y - 20, false, { alpha: 0.85 * spiritK, glow: true });
      drawBinding(x, y, spiritK, 18);
      drawChain(x + 2, y - 4, isoX(6, 0) - camX, isoY(6, 0) - camY - 6, spiritK, 8);
    },
    onEnter: quartersEnter,
  }),

  // -------------------------------------------------------------- 3. below decks: the engine room
  engine: () => ({
    name: 'The Engine Room', sub: 'The Merrow', outdoor: false, mood: 'hearth', music: 'ambient', seed: 72,
    floor: 'iron', wallStyle: 'iron', MW: 12, MH: 12, winL: [3, 9], winR: [3, 5], devSpawn: { x: 8, y: 1 },
    map: [
      'oooooooooooo', 'oOoooOooooOo', 'oooooooooooo', 'Iooooooooooo', 'ovoooooooovo', 'oooooooooooo',
      'ooooxxoooooo', 'oooooxoooooo', 'oooooooooooI', 'ouoooooooooo', 'oooooovooooo', 'oooooooooooo',
    ],
    exits: [{ edge: 'ymin', a: 7, b: 9, to: 'deck', spawn: { x: 6.2, y: 17.4 }, block: "The valves first. If those boilers go, the whole ship goes.", blockIf: () => !flags.valvesDone }],
    interact: VALVES.map(([vx, vy], k) => ({
      x: vx + 0.5, y: vy + 0.5, label: 'Turn the valve', needsBody: true, cond: () => !flags['valve_' + vx + '_' + vy] && !enc,
      fn: () => turnValve(vx, vy, k),
    })),
    onEnter: async () => {
      if (flags.valvesDone || flags.engineIntro) { if (!flags.valvesDone) toast('Turn the three red valves.', 240); return; }
      await wait(50);
      await say([
        ['ASH', "Nobody's down here. The fires are still roaring, but there's nobody feeding them."],
        ['ASH', '...Then who has been shovelling the coal?'],
        ['ASH', "The gauges are all in the red. Three valves — I need to vent them. With my hands."],
      ]);
      flags.engineIntro = true; saveCheckpoint();
      toast('Turn the three red valves. Only your body can turn them.', 360);
    },
  }),
});

// ======================================================================
//  SCRIPT
// ======================================================================
async function startChapter3() {
  flags = { intro: true, shawl: true, g1: true, awakened: true, sanctumClear: true, bossIntro: true, bossDone: true, marenAwake: true, homeTalk: true, lesson: 5, sword: true };
  state = 'card';
  await card('<div class="sub">Chapter III</div><div class="chapter">The Drowned Captain</div>');
  await card(prose('That night, Maren took a letter from the bottom of her sewing box.<br>The wax was grey, and it had been opened many, many times.'));
  await card(`<div class="sub">Lyra's last letter</div><div class="prose letter">Mother &mdash;<br>The tear isn't at Saint Orrin. It never was. It's out past Saltmere, under the water.<br>Edwin and I are going to close it.<br>If you don't hear from us by spring, keep Ash safe. Keep him away from the sea.<br>&mdash; L.</div><div class="press">Press Enter</div>`);
  await card(prose('Spring came and went eleven times.<br>Three days later, Ash stood on the quay at Kettle Harbour<br>with a ticket for the steamship <em>Merrow</em>, bound for Saltmere.'));
  hideCard();
  loadArea('harbor', { x: 12.5, y: 2.2 });
}

async function farewell() {
  state = 'cut';
  await tween(b, 8.6, 10.4, 70); b.face = 1;
  sfx('horn'); shake = 2; await wait(80);
  await say([
    ['MAREN', "There you are. I was beginning to hope you'd changed your mind."],
    ['ASH', 'You could still come with me.'],
    ['MAREN', "Someone has to mind Saint Orrin while the veil is this thin. The circle. The bells. And him."],
    ['PIP', 'Mehhh.'],
    ['MAREN', "Here. The shawl you found on the thorns — I mended it. The sea wind cuts straight through a boy."],
    ['ASH', "...Thank you. Grandmother."],
    ['MAREN', "Oh, don't. You'll set me off, and I promised Pip I wouldn't make a scene."],
    ['MAREN', 'Find them, Ash. Write to me. And whatever you find out there —'],
    ['MAREN', 'come home.'],
  ]);
  flags.farewell = true; saveCheckpoint();
  await wait(20);
  sfx('horn'); shake = 3;
  await say([['MATE', 'ALL ABOARD FOR SALTMERE! LAST CALL! THAT MEANS YOU, LAD!']]);
  state = 'play';
  toast('Board the Merrow &mdash; the gangplank, beside Maren.', 360);
}

async function boardShip() {
  state = 'cut';
  bleat();
  await say([['ASH', 'Bye, Pip. Look after her.'], ['PIP', '...meh.']]);
  await tween(b, 6.6, 13.6, 40);
  fadeTarget = 1; await wait(50);
  await card(prose('The <em>Merrow</em> left Kettle Harbour at noon.<br>Ash watched the pier until Maren was a dot, and then until she was nothing.'));
  hideCard();
  loadArea('quarters', { x: 6, y: 1.1 });
}

// ---- the people aboard
async function talkOdile() {
  if (flags.metOdile) return say([['ODILE', flags.mate ? "The engine room? Rather you than me. Holler if a ghost eats you." : "Mr. Brannock's by the companionway, if you want the grown-up version."]]);
  flags.metOdile = true;
  await say([
    ['ODILE', "You're the boy whose grandmother cried on the pier. Don't worry, I won't tell anyone."],
    ['ASH', "She didn't cry."],
    ['ODILE', "She cried a bit. I'm Odile. Deckhand. Well — deckhand, cabin girl, and whatever Mr. Brannock is shouting at me to be."],
    ['ODILE', "Word of advice: keep clear of the captain. He's up at the wheel, and he's been... strange, since the last crossing."],
    ['ASH', 'Strange how?'],
    ['ODILE', 'He stopped sleeping. He talks to the water. Last night I heard him calling out names — men who drowned on this ship years ago.'],
  ]);
}
function talkPellow() {
  if (flags.metPellow) return say([['PELLOW', "Offer stands. One penny. Final offer. Don't tell my wife."]]);
  flags.metPellow = true;
  return say([
    ['PELLOW', "Lucky charm, lad? Genuine drowned man's tooth. Wards off the sea and all its sorrows. Two pennies."],
    ['ASH', "...Is it really a drowned man's tooth?"],
    ['PELLOW', "It is genuinely a tooth. Let's not split hairs."],
  ]);
}
async function talkMate() {
  if (flags.valvesDone) return say([['MATE', "She's running sweet as a song now. Whatever you did down there — go and get some sleep, lad. You've earned it."]]);
  if (flags.mate) return say([['MATE', 'Three red valves, lad. Down the companionway.']]);
  await say([
    ['MATE', 'Mind the companionway, lad. That goes down to the engines, and it is crew only.'],
    ['ASH', "Is something wrong? Everyone aboard looks jumpy."],
    ['MATE', "...It's the captain. Two days at that wheel. Not eating, not sleeping, not a word to me."],
    ['MATE', 'And this morning the stokers came up white as sheets and refused to go back below. Swore there were drowned men down there, shovelling coal.'],
    ['MATE', "Now the boilers are running hot and nobody'll go near them. If that pressure isn't vented, we'll be in pieces by nightfall."],
    ['ASH', "I'll go."],
    ['MATE', "You? ...You've an odd look about you, boy. Like you've seen worse."],
    ['MATE', 'Down the companionway, right here. Three red valves below. Turn every one.'],
  ]);
  flags.mate = true; saveCheckpoint();
  toast('Go below &mdash; the companionway stairs by the bow.', 300);
}
async function talkHale() {
  await say([
    ['HALE', '......'],
    ['HALE', "...turn back... I told her I'd turn back..."],
    ['ASH', 'Captain? Captain Hale?'],
    ['HALE', '......'],
  ]);
  if (!flags.saw) {
    flags.saw = true;
    await say([['ASH', "His eyes are open, but there's no one looking out of them. Just like Maren in the circle."], ['ASH', "Something's got hold of his soul."]]);
  }
}

// ---- the engine room
async function turnValve(vx, vy, k) {
  flags['valve_' + vx + '_' + vy] = true;
  sfx('gate'); sfx('veil'); shake = 6;
  for (let i = 0; i < 3; i++) burstW({ x: vx + 0.5, y: vy + 0.5 }, 26, 18, ['#e8e8f0', '#c8c8d0', '#ffffff'], 2.2, false, -0.03);
  await wait(30);
  const turned = VALVES.filter(([x, y]) => flags['valve_' + x + '_' + y]).length;
  const S = (x, y) => ['shade', x, y, { skin: 'sailor', sdmg: 8, windT: 40 }], H = (x, y) => ['hollow', x, y, { skin: 'bilge', hp: 3 }];
  const waves = [
    [S(3, 7), S(9, 7)],
    [H(2, 9), H(10, 9), S(6, 3)],
    [S(2, 3), S(10, 7), H(3, 10), H(9, 10)],
  ][turned - 1];
  await say([['ASH', [
    "One down — what's that? Something's coming up out of the coal.",
    'Two. ...They keep coming. Sailors. Drowned sailors.',
    "Last one! That's — that's all of them at once!"][turned - 1]]]);
  if (turned === 1) toast('Drowned sailors &mdash; made of soul. Step out (<kbd>C</kbd>) to cut them down.', 380);
  if (turned === 2) toast('Bilge-hollows have bodies &mdash; and they go for yours.', 380);
  startEncounter({ id: 'valve' + turned, waves: [waves], onClear: () => valveCleared(turned) });
}
async function valveCleared(turned) {
  saveCheckpoint();
  if (turned < 3) { toast(`${3 - turned} valve${turned === 2 ? '' : 's'} left.`, 240); return; }
  await wait(40);
  sfx('horn'); shake = 8;
  await wait(60);
  await say([
    ['ASH', 'The needles are dropping. We made it.'],
    ['CAPTAIN', 'WHO IS IN MY ENGINE ROOM.'],
    ['CAPTAIN', 'NO ONE LEAVES THE MERROW. NOT THE CREW. NOT THE PASSENGERS. NOT AGAIN.'],
    ['ASH', "That voice came down the speaking tube — from the wheel. It's the captain."],
    ['ASH', '...The engines are settling, though. I can feel the whole ship running steady under my feet.'],
  ]);
  flags.valvesDone = true; saveCheckpoint();
  toast('The ship runs steady. Head back up &mdash; it is getting late.', 300);
}

// ---- night on deck
const DECK_FIGHT = () => ({
  id: 'deck',
  waves: [
    [['shade', 3, 11.5, { skin: 'sailor', sdmg: 8 }], ['shade', 8, 9.5, { skin: 'sailor', sdmg: 8 }], ['hollow', 3.5, 14.6, { skin: 'bilge', hp: 3 }]],
    [['shade', 2.5, 9, { skin: 'sailor', sdmg: 8 }], ['shade', 8.5, 11, { skin: 'sailor', sdmg: 8 }], ['shade', 5.5, 13.5, { skin: 'sailor', sdmg: 8 }], ['hollow', 8.5, 14.6, { skin: 'bilge', hp: 3 }]],
  ],
  onClear: async () => {
    flags.deckClear = true; saveCheckpoint();
    await wait(40);
    await say([['ASH', "That's the last of them. And he's still up there at the wheel."]]);
    toast('Go to the captain, at the wheel.', 300);
  },
});
async function deckEnter() {
  if (flags.captainAwake) return;
  if (flags.captainIntro && !flags.captainFree) { await wait(40); spawn('captain', 5.5, 11); setMusic('boss'); return; }
  if (!flags.valvesDone) {
    if (flags.boarded) return;
    flags.boarded = true; saveCheckpoint();
    await wait(60);
    await say([['ASH', "So this is the sea. It doesn't stop. It just keeps going."], ['ASH', "Saltmere's out there somewhere. Three days, the ticket said."]]);
    toast('Explore the deck. Talk to the people aboard.', 360);
    return;
  }
  if (!flags.slept) {
    if (flags.evening) return;
    flags.evening = true; saveCheckpoint();
    await wait(50);
    await say([['ASH', "The sun's gone. Somebody's lit all the lamps."], ['ASH', "I could sleep for a week. My bunk's back in the passenger quarters."]]);
    toast('Go to bed &mdash; your bunk is in the passenger quarters.', 360);
    return;
  }
  if (flags.deckClear) return;
  await wait(50);
  await say([
    ['ASH', "Fog. Thick as wool. Everyone's stayed below."],
    ['ASH', "But I can see the chain — it runs right along the deck. Straight to the wheel."],
  ]);
  sfx('horn'); shake = 6; await wait(60);
  await say([['CAPTAIN', 'ALL HANDS... ALL HANDS ON DECK...']]);
  startEncounter(DECK_FIGHT());
}

// ---- the passenger quarters
async function quartersEnter() {
  if (!flags.metFriends) return meetFriends();
  if (flags.slept && !flags.sawChains) return tamsinWontWake();
  if (flags.captainFree && !flags.tamsinAwake) return tamsinWakes();
  if (flags.valvesDone && !flags.slept) toast('Your bunk is the one by the far wall. <kbd>X</kbd> to sleep.', 300);
}
async function meetFriends() {
  await wait(50);
  state = 'cut';
  await say([
    ['TAMSIN', "Oh! You must be bunk three. I'm Tamsin — Tamsin Hart. And that's Kit. He doesn't talk until he's known you a week."],
    ['KIT', '...Hello.'],
    ['ASH', 'Ash. Ash Wren.'],
    ['TAMSIN', "Are you starting at the Saltmere Academy too? We both got scholarships. First years. Kit's going to be a naturalist and I'm going to be a ship's captain. Obviously."],
    ['ASH', "I'm... not going to school. I'm looking for someone."],
    ['TAMSIN', "Ooh. Mysterious. You can tell me on the way — it's three days, you'll crack."],
    ['KIT', "...Did you know the Merrow's captain once lost a whole crew off Saltmere? It's in my book. They say the drowned ones still follow the ship."],
    ['TAMSIN', 'Kit. We talked about the ghost stories.'],
  ]);
  flags.metFriends = true; saveCheckpoint();
  state = 'play';
  toast('Explore the ship. The door leads out onto the deck.', 360);
}
function talkTamsin() {
  if (flags.valvesDone) return say([['TAMSIN', "You were gone for ages. Was it exciting? It was exciting, wasn't it. Tell me tomorrow. Night, Ash."]]);
  if (flags.mate) return say([['TAMSIN', "The engine room? Can I come? ...No? Fine. Bring me back something oily."]]);
  return say([['TAMSIN', "Go and look around! Odile — the deckhand — says the bow's the best spot on the whole ship."], ['TAMSIN', "And if you meet the captain, ask him if he needs a first mate. I'm very bossy."]]);
}
function talkKit() {
  if (flags.valvesDone) return say([['KIT', "Goodnight. Keep your soul tucked in. ...It's a sailor's saying. I think."]]);
  return say([['KIT', "...The captain hasn't left the wheel since we sailed. That's in my book too. Sort of."]]);
}
async function goToSleep() {
  state = 'cut';
  await tween(b, 1.6, 1.3, 30);
  fadeTarget = 1; await wait(50);
  await card(prose('The <em>Merrow</em> ran steady through the night.<br>Tamsin talked until she fell asleep mid-sentence.<br>Ash dreamed of chains.'));
  hideCard();
  flags.slept = true;
  loadArea('quarters', { x: 1.6, y: 1.4 });
}
async function tamsinWontWake() {
  await wait(40);
  state = 'cut';
  sfx('rise');
  await say([['KIT', "Ash! Ash, wake up — it's Tamsin. She won't wake up!"]]);
  await tween(b, 4.4, 1.8, 50); b.back = true;
  await say([
    ['ASH', 'Tamsin? ...Tamsin!'],
    ['KIT', "She's breathing. But she won't open her eyes. I shook her and shook her."],
    ['ASH', "Her eyes... it's just like Maren in the circle. There's nobody behind them."],
    ['ASH', "Kit can't see what I can. I need to look properly."],
  ]);
  state = 'play';
  toast('Step out of your body &mdash; <kbd>C</kbd>.', 99999);
  await waitUntil(() => mode === 'spirit');
  toast('', 1);
  await wait(40);
  await say([
    ['ASH', "There she is. Her soul — it's wrapped in chains. Old, rusted chains, round and round her."],
    ['TAMSIN', '...cold... so cold... something keeps pulling me down...'],
    ['ASH', "And the chain runs out through the door. Up toward the deck."],
    ['ASH', "Hold on, Tamsin. I'm coming."],
  ]);
  flags.sawChains = true; saveCheckpoint();
  toast('Follow the chain. Only your soul can see it.', 400);
}
async function tamsinWakes() {
  await wait(50);
  state = 'cut';
  await tween(b, 4.4, 2.0, 30); b.back = true;
  sfx('rise'); await wait(40);
  await say([['KIT', 'Ash — Ash, look! She moved!']]);
  sfx('merge'); whiteFlash = 0.5;
  burstW({ x: 4.6, y: 0.7 }, 12, 24, ['#fff4fa', '#f0c8e4', '#fff'], 2, true, -0.01);
  flags.tamsinAwake = true;
  await wait(40);
  await say([
    ['TAMSIN', '...Why is everyone staring at me?'],
    ['KIT', "You wouldn't wake up! For a whole night and a whole morning!"],
    ['TAMSIN', "I had the strangest dream. I was at the bottom of the sea, all wrapped up in chains. And then a boy made of light came down and cut me loose."],
    ['TAMSIN', "...It was you. It was, wasn't it? You've got that look again."],
    ['ASH', '...It sounds like a very strange dream.'],
    ['TAMSIN', "You're a terrible liar, Ash Wren. You're telling me everything in Saltmere."],
  ]);
  fadeTarget = 1; await wait(50);
  await card(prose('Eleven years ago, his mother and father were alive on the rocks off Saltmere.<br>It was the closest Ash had ever been to them —<br>and for the first time, he wasn\'t looking for them alone.'));
  await card('<div class="sub">End of Chapter III</div><div class="chapter">The Drowned Captain</div><div class="press">Press Enter</div>');
  await card('<div class="sub">To be continued</div><div class="chapter">Saltmere</div><div class="press">Press Enter</div>');
  hideCard();
  showTitle();
}
async function captainRises() {
  state = 'cut';
  await tween(b, 7.6, 13.6, 40); b.back = true;
  await say([['ASH', 'Captain Hale!']]);
  flags.captainIntro = true;
  sfx('split'); sfx('horn'); shake = 12; whiteFlash = 0.5;
  burstW({ x: 4.6, y: 8.3 }, 16, 40, ['#5affd8', '#c8fff0', '#2a8a7a'], 3, true, -0.01);
  await wait(60);
  await say([
    ['ASH', "His soul's coming out of him — and it's sinking, twisting... it's turning into an anchor."],
    ['CAPTAIN', 'ANOTHER LITTLE LIGHT ON THE WATER.'],
    ['CAPTAIN', 'I LEFT HER ON THE ROCKS. I TURNED MY SHIP AND I LEFT HER. AND THE SEA REMEMBERS.'],
    ['CAPTAIN', 'SO NOW NO ONE LEAVES. NO ONE EVER LEAVES AGAIN.'],
    ['ASH', 'Left who? ...Who did you leave on the rocks?'],
    ['ASH', "And the girl — Tamsin. Your chain's wrapped round her soul. Let her go!"],
    ['CAPTAIN', 'SHE IS MY BALLAST. ONE SOUL TO HOLD ME DOWN FOR EVERY SOUL I LEFT BEHIND.'],
  ]);
  spawn('captain', 5.5, 11);
  saveCheckpoint();
  state = 'play';
  setMusic('boss');
  toast('The Drowned Anchor. Dash (<kbd>Z</kbd>) straight through its chain rings, like the bell\'s. If they catch you, mash <kbd>X</kbd> to break free.', 520);
}
async function captainFreed(e) {
  flags.captainFree = true;
  for (const x of enemies) if (x !== e) x.dead = true;
  enemies = []; bolts = []; rings = [];
  setMusic('none'); sfx('crack'); shake = 20; hitstop = 0;
  burstW(e, 24, 60, ['#5affd8', '#c8fff0', '#2a8a7a', '#ffffff'], 3.5, true, 0.02);
  marenSpirit = { x: e.x, y: e.y, a: 0, spr: SPR.haleSpirit, col: '180,255,240' };
  saveCheckpoint();
  await wait(100);
  state = 'cut';
  await say([
    ['HALE', "...The fog. It's lifting."],
    ['ASH', "You're free. Whatever had hold of you is gone."],
    ['ASH', "The chains — they're rusting away to nothing. Tamsin's free."],
    ['HALE', "Not gone, lad. Fed. I fed it myself, every night for eleven years. Guilt's a fine meal for something like that."],
    ['HALE', "And when it wanted more, it reached down and took that poor girl's soul right out of her bunk. Gods forgive me."],
    ['HALE', 'Eleven years ago I ran the Saltmere crossing. Off the point, the drowned came up the anchor chain — dozens of them, pale as fish.'],
    ['HALE', 'There was a woman on the rocks with a sword made of light. She held them back. She shouted at me to turn the ship and run.'],
    ['HALE', 'So I ran.'],
    ['ASH', '...A sword of light.'],
    ['HALE', "Like that one. Gods. You've got her face."],
    ['HALE', 'There was a man with her. No light in him at all — just an oar and a great deal of shouting. They were still fighting when the fog closed over them.'],
    ['ASH', 'My mother and father.'],
    ['HALE', "I'm sorry, boy. I've been sorry every night since. Let me get back into my own skin — and then I'll take you to Saltmere myself."],
  ]);
  await tween(marenSpirit, 4.6, 8.3, 80);
  sfx('merge'); sfx('veil'); whiteFlash = 0.8; shake = 4;
  burstW({ x: 4.6, y: 8.3 }, 6, 30, ['#c8fff0', '#fff'], 2.5, true, -0.01);
  marenSpirit = null;
  if (mode === 'spirit') merge();
  fadeTarget = 1; await wait(60);
  flags.captainAwake = true; A.mood = 'morning'; A.sub = 'Dawn';
  await card(prose('By dawn the fog had burned away,<br>and the <em>Merrow</em> was making full steam for Saltmere.'));
  hideCard(); fadeTarget = 0;
  b.x = 5.2; b.y = 10.8; b.face = 1; b.back = true;
  await wait(50);
  await say([
    ['MATE', "Captain on the wheel, and the stokers back below. I don't know what you did down there, lad, and I don't want to."],
    ['ODILE', 'I KNEW there was something odd about you. The boy with the crying grandmother is a ghost-fighter.'],
    ['ASH', "She didn't cry."],
    ['ODILE', 'She cried loads.'],
    ['HALE', 'Saltmere by nightfall. Whatever is waiting on those rocks, Ash Wren — this time, I don\'t turn the ship.'],
    ['ASH', "Tamsin. I have to see if she's —"],
  ]);
  fadeTarget = 1; await wait(40);
  loadArea('quarters', { x: 6, y: 1.1 });
}
