"use strict";
// ---------------------------------------------------------------- audio (WebAudio, no files)
let AC = null, master, musicGain, noiseBuf, muted = false, musicMode = 'none';
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

function initAudio() {
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
  master = AC.createGain(); master.gain.value = muted ? 0 : 0.5; master.connect(AC.destination);
  musicGain = AC.createGain(); musicGain.gain.value = 0.45; musicGain.connect(master);
  noiseBuf = AC.createBuffer(1, AC.sampleRate * 0.5, AC.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  startMusic();
}
function tone(f, dur, type = 'square', vol = 0.2, slide = 0, t = AC.currentTime, dest = master) {
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, vol = 0.2, t = AC.currentTime, dest = master, hp = 0, lp = 0) {
  const s = AC.createBufferSource(), g = AC.createGain();
  s.buffer = noiseBuf;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  let node = s;
  if (hp) { const f = AC.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp; node.connect(f); node = f; }
  if (lp) { const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; node.connect(f); node = f; }
  node.connect(g); g.connect(dest); s.start(t); s.stop(t + dur + 0.02);
}
const bellTone = (f, vol, t = AC.currentTime) => {
  tone(f, 2.6, 'sine', vol); tone(f * 2.76, 1.4, 'sine', vol * 0.3, 0, t); tone(f * 5.4, 0.7, 'sine', vol * 0.15, 0, t);
};
const SFX = {
  dash:   () => noise(0.14, 0.1, undefined, undefined, 1500),
  sdash:  () => tone(500, 0.2, 'triangle', 0.18, 1400),
  punch:  () => noise(0.06, 0.16, undefined, undefined, 700),
  chain:  () => { for (let i = 0; i < 4; i++) tone(1400 + Math.random() * 900, 0.05, 'square', 0.025, 600, AC.currentTime + i * 0.045); noise(0.15, 0.08, undefined, undefined, 2500); },
  horn:   () => { tone(98, 1.6, 'sawtooth', 0.09, 92); tone(147, 1.6, 'sawtooth', 0.05, 140); },
  palm:   () => { noise(0.1, 0.12, undefined, undefined, 1400); tone(520, 0.1, 'sine', 0.05, 260); },
  slash:  () => { noise(0.12, 0.13, undefined, undefined, 3000); tone(900, 0.08, 'sawtooth', 0.04, 300); },
  hit:    () => { tone(160, 0.09, 'square', 0.14, 60); noise(0.06, 0.18, undefined, undefined, 0, 2000); },
  kill:   () => { tone(420, 0.3, 'triangle', 0.14, 60); noise(0.3, 0.14, undefined, undefined, 0, 1500); },
  hurt:   () => { tone(180, 0.35, 'sawtooth', 0.16, 45); noise(0.18, 0.18, undefined, undefined, 0, 1200); },
  shurt:  () => tone(760, 0.25, 'triangle', 0.22, 140),
  split:  () => { tone(180, 0.55, 'triangle', 0.28, 1100); tone(360, 0.55, 'sine', 0.08, 2200); },
  merge:  () => tone(1200, 0.35, 'triangle', 0.26, 180),
  recall: () => tone(900, 0.3, 'triangle', 0.18, 400),
  drain:  () => tone(400, 0.7, 'sawtooth', 0.1, 60),
  err:    () => tone(110, 0.15, 'triangle', 0.2),
  whiff:  () => tone(300, 0.12, 'sine', 0.14, 600),
  orb:    () => tone(1000, 0.1, 'sine', 0.1, 1600),
  ember:  () => { tone(660, 0.12, 'triangle', 0.12); tone(990, 0.18, 'triangle', 0.12, 0, AC.currentTime + 0.08); },
  ward:   () => { tone(1500, 0.6, 'sine', 0.22, 700); noise(0.2, 0.08, undefined, undefined, 4000); },
  cast:   () => tone(220, 0.45, 'sawtooth', 0.05, 440),
  parry:  () => { tone(1800, 0.14, 'triangle', 0.1, 900); noise(0.06, 0.1, undefined, undefined, 5000); },
  rise:   () => noise(0.5, 0.07, undefined, undefined, 0, 500),
  chime:  () => [0, 7, 12, 19].forEach((n, i) => tone(mtof(76 + n), 1.2, 'sine', 0.08, 0, AC.currentTime + i * 0.09)),
  gate:   () => { noise(0.9, 0.16, undefined, undefined, 0, 400); tone(70, 0.9, 'triangle', 0.2, 50); },
  veil:   () => [0, 4, 7, 11, 14].forEach((n, i) => tone(mtof(64 + n), 1.6, 'sine', 0.07, 0, AC.currentTime + i * 0.14)),
  bell:   () => bellTone(98, 0.4),
  crack:  () => { noise(1.4, 0.3, undefined, undefined, 0, 2500); bellTone(73, 0.35); tone(300, 1.2, 'sawtooth', 0.08, 40); },
  blip:   () => tone(820 + Math.random() * 60, 0.025, 'triangle', 0.025),
  step:   () => noise(0.04, 0.025, undefined, undefined, 0, 900),
};
const sfx = n => { if (AC && SFX[n]) SFX[n](); };
const setMusic = m => { musicMode = m; };

// ---------------------------------------------------------------- music sequencer
const BPM = 92, STEP = 60 / BPM / 4;
const CHORDS = [[57, 60, 64], [53, 57, 60], [50, 53, 57], [52, 56, 59]];
const BOSS_CH = [[50, 53, 57], [46, 50, 53], [43, 46, 50], [45, 49, 52]];
const BELLS = { 0: 76, 6: 74, 8: 72, 12: 71, 16: 72, 24: 69, 32: 74, 38: 77, 40: 76, 44: 74, 48: 71, 56: 68, 60: 64 };
const AMB = { 0: 69, 14: 76, 28: 72, 44: 74, 56: 64 };
let mStep = 0, mNext = 0;
function startMusic() {
  mNext = AC.currentTime + 0.1;
  setInterval(() => {
    if (mNext < AC.currentTime - 0.2) mNext = AC.currentTime + 0.05;
    while (mNext < AC.currentTime + 0.15) { playStep(mStep, mNext); mStep = (mStep + 1) % 64; mNext += STEP; }
  }, 25);
}
function playStep(i, t) {
  if (musicMode === 'none' || state === 'pause') return;
  const mg = musicGain, sp = mode === 'spirit' && (state === 'play' || state === 'talk');
  if (musicMode === 'ambient') {
    if (i % 32 === 0) { tone(mtof(33), 5.5, 'triangle', 0.16, 0, t, mg); tone(mtof(40), 5.5, 'sine', 0.06, 0, t, mg); }
    const m = AMB[i];
    if (m) { tone(mtof(m + (sp ? 12 : 0)), 2.2, 'sine', 0.07, 0, t, mg); tone(mtof(m) * 2.76, 0.8, 'sine', 0.015, 0, t, mg); }
  } else if (musicMode === 'combat') {
    const ch = CHORDS[i >> 4];
    if (i % 16 === 0) { tone(mtof(ch[0] - 12), 2.6, 'triangle', 0.2, 0, t, mg); tone(mtof(ch[0] - 24), 2.6, 'square', 0.02, 0, t, mg); }
    if (i % 2 === 0) {
      const n = ch[(i >> 1) % 3] + 12;
      tone(mtof(n), 0.3, 'triangle', 0.065, 0, t, mg);
      if (sp) tone(mtof(n + 12), 0.2, 'sine', 0.045, 0, t, mg);
    }
    const m = BELLS[i];
    if (m) { tone(mtof(m + (sp ? 12 : 0)), 1.1, 'sine', 0.1, 0, t, mg); tone(mtof(m) * 2.01, 0.4, 'sine', 0.025, 0, t, mg); }
    if (i % 8 === 0) tone(95, 0.25, 'sine', 0.2, 45, t, mg);
  } else if (musicMode === 'boss') {
    const ch = BOSS_CH[i >> 4], n = ch[i % 3] + 12;
    tone(mtof(n), 0.14, 'square', 0.025, 0, t, mg); tone(mtof(n), 0.2, 'triangle', 0.055, 0, t, mg);
    if (i % 4 === 0) { tone(mtof(ch[0] - 12), 0.45, 'triangle', 0.24, 0, t, mg); tone(110, 0.15, 'sine', 0.32, 40, t, mg); }
    if (i % 8 === 4) noise(0.1, 0.1, t, mg, 1200);
    if (i % 16 === 0) tone(mtof(ch[0] + 24), 1.2, 'sine', 0.07, 0, t, mg);
  }
  // heartbeat when your empty body is close to death
  if (sp && b && b.hp <= 2 && (i % 16 === 0 || i % 16 === 2)) tone(62, 0.18, 'sine', 0.55, 38, t, mg);
}
