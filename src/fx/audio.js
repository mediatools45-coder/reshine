/* synthesized audio: one-shots (SFX), tool loops, musical payoffs */
import { rnd } from '../core/util.js';

let AC = null, MASTER = null, NBUF = null;
export const AU = { on: true };
export function ac() {
  if (!AU.on) return null;
  if (!AC) {
    try {
      AC = new (window.AudioContext || window.webkitAudioContext)();
      const c = AC.createDynamicsCompressor(); c.threshold.value = -16; c.ratio.value = 4; c.attack.value = .004; c.release.value = .18;
      const g = AC.createGain(); g.gain.value = .9; const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 12000;
      c.connect(lp); lp.connect(g); g.connect(AC.destination); MASTER = c;
      const n = AC.sampleRate * 2, b = AC.createBuffer(1, n, AC.sampleRate), ch = b.getChannelData(0); let l = 0;
      for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; l = l * .2 + w * .8; ch[i] = l; } NBUF = b;
    } catch (e) { AC = null; }
  }
  if (AC && AC.state === 'suspended') { try { AC.resume(); } catch (e) { } }
  return AC;
}
const out = () => MASTER || AC.destination;
export function tone(f0, f1, d, type, v, delay = 0, atk = .004) {
  const a = ac(); if (!a) return;
  try { const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + delay; o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + d); g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(v || .1, t + atk); g.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(g); g.connect(out()); o.start(t); o.stop(t + d + .03); } catch (e) { }
}
export function noise(d, f, v, q, type, f2, delay = 0) {
  const a = ac(); if (!a) return;
  try { const s = a.createBufferSource(); s.buffer = NBUF; const t = a.currentTime + delay; const fl = a.createBiquadFilter(); fl.type = type || 'bandpass'; fl.frequency.setValueAtTime(f, t); if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + d); fl.Q.value = q || 1; const g = a.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(v || .15, t + Math.min(.01, d * .2)); g.gain.exponentialRampToValueAtTime(.0001, t + d); s.connect(fl); fl.connect(g); g.connect(out()); s.start(t, Math.random()); s.stop(t + d + .02); } catch (e) { }
}
/* bell: inharmonic partials */
function bell(f, v = .08, d = 1.6, delay = 0) { [[1, 1], [2.76, .5], [5.4, .25], [8.9, .12], [.5, .3]].forEach(([m, a]) => tone(f * m, f * m * .998, d * (1.1 - m * .07), 'sine', v * a, delay, .002)); noise(.03, 6000, v * .6, 2, 'highpass', 0, delay); }
/* plucked string (Karplus-Strong) */
function pluck(f, v = .25, delay = 0, d = 2.6) {
  const a = ac(); if (!a) return;
  try {
    const sr = a.sampleRate, n = Math.floor(sr * d), b = a.createBuffer(1, n, sr), ch = b.getChannelData(0), N = Math.max(2, Math.floor(sr / f)), buf = new Float32Array(N);
    for (let i = 0; i < N; i++) buf[i] = Math.random() * 2 - 1;
    for (let i = 0; i < n; i++) { const j = i % N, nx = (j + 1) % N; const s = buf[j]; buf[j] = .996 * .5 * (buf[j] + buf[nx]); ch[i] = s; }
    const s = a.createBufferSource(); s.buffer = b; const g = a.createGain(); g.gain.value = v; const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3800;
    s.connect(lp); lp.connect(g); g.connect(out()); s.start(a.currentTime + delay);
  } catch (e) { }
}
export const SFX = {
  clink() { tone(2600, 2400, .18, 'sine', .05); tone(3900, 3700, .12, 'sine', .025); noise(.03, 5000, .1, 2, 'highpass'); },
  thud() { tone(130, 45, .22, 'sine', .3); noise(.06, 500, .12, .8, 'lowpass'); },
  scrape() { noise(.09, rnd(1400, 2400), .05, .7, 'bandpass', rnd(2400, 3600)); },
  wire() { noise(.07, rnd(3200, 4600), .045, 1.1, 'bandpass'); noise(.05, rnd(900, 1400), .03, 1, 'bandpass'); },
  brush() { noise(.09, rnd(2200, 3200), .03, .6, 'bandpass', rnd(1500, 2000)); },
  sand() { noise(.06, rnd(5000, 7500), .03, .7, 'highpass'); },
  soap() { noise(.12, rnd(900, 1500), .05, .8, 'bandpass', rnd(600, 900)); tone(rnd(600, 900), rnd(1000, 1400), .07, 'sine', .012); },
  file() { noise(.07, rnd(3000, 5200), .04, 1.5); },
  polish() { noise(.14, rnd(4500, 7000), .02, .6, 'highpass', rnd(3000, 5000)); },
  wipe() { noise(.16, rnd(1800, 2600), .025, .5, 'bandpass', rnd(1200, 1600)); },
  click() { tone(1500, 700, .035, 'square', .03); noise(.015, 4000, .04, 1, 'highpass'); },
  pop() { tone(380, 900, .09, 'sine', .12); noise(.02, 2000, .06, 1); },
  bigpop() { tone(220, 70, .3, 'sine', .32); noise(.25, 2600, .22, .6, 'bandpass', 500); tone(1400, 1300, .25, 'sine', .05, .02); noise(.04, 6000, .15, 1, 'highpass'); },
  crack() { noise(.12, 1800, .2, .7, 'bandpass', 600); tone(180, 70, .12, 'triangle', .1); },
  chime() { [659, 880, 1319, 1760].forEach((f, i) => { tone(f, f, .5, 'sine', .05, i * .08, .008); tone(f * 2.01, f * 2.01, .3, 'sine', .011, i * .08); }); },
  splash() { noise(.5, 900, .12, .5, 'bandpass', 400); noise(.15, 3500, .05, .8, 'highpass'); },
  grind() { noise(.08, rnd(3500, 5600), .04, 1.6); tone(rnd(180, 220), 160, .08, 'sawtooth', .012); },
  bubble() { const f = rnd(300, 550); tone(f, f * 2.2, .08, 'sine', .035); },
  ping() { tone(1568, 1568, .35, 'sine', .05, 0, .006); tone(2093, 2093, .25, 'sine', .02, .02); },
  whoosh() { noise(.45, 400, .1, .5, 'bandpass', 2400); tone(260, 100, .3, 'sine', .03); },
  win() { [523, 659, 784, 1047, 1319].forEach((f, i) => { tone(f, f, .6, 'triangle', .06, i * .11); tone(f * 2, f * 2, .4, 'sine', .015, i * .11); }); },
  zap() { noise(.1, rnd(900, 1800), .04, .5, 'bandpass', 300); },
  tick() { tone(2400, 1900, .018, 'square', .025); noise(.012, 5000, .03, 2, 'highpass'); },
  tock() { tone(1700, 1400, .02, 'square', .022); noise(.012, 3500, .03, 2, 'highpass'); },
  key() { noise(.025, rnd(2500, 3800), .09, 1.2, 'bandpass'); tone(rnd(300, 380), 160, .04, 'triangle', .05); noise(.012, 7000, .03, 1, 'highpass', 0, .02); },
  keycap() { tone(900, 1800, .06, 'sine', .1); noise(.03, 3000, .08, 1.5, 'bandpass'); tone(520, 300, .05, 'triangle', .05, .02); },
  typebar() { noise(.03, 1500, .16, 1, 'bandpass'); tone(220, 90, .06, 'square', .05); noise(.02, 5000, .05, 1, 'highpass', 0, .02); },
  ding() { bell(2093, .1, 1.4); },
  bell() { for (let i = 0; i < 14; i++) { bell(i % 2 ? 1760 : 1568, .05, .5, i * .06); } },
  ratchet() { for (let i = 0; i < 6; i++) tone(2200, 1600, .015, 'square', .02, i * .035); },
  latch() { tone(1200, 600, .03, 'square', .05); noise(.03, 2500, .12, 1, 'bandpass'); tone(300, 140, .08, 'sine', .12, .02); },
  pour() { noise(.6, 700, .08, .6, 'bandpass', 1400); },
  hiss() { noise(.35, 5200, .06, .6, 'highpass'); },
  creak() { tone(140, 180, .35, 'sawtooth', .025); noise(.3, 800, .03, 4, 'bandpass', 600); },
  strum() { [82.4, 110, 146.8, 196, 246.9, 329.6].forEach((f, i) => pluck(f, .22, i * .03)); },
  string(i = 0) { pluck([82.4, 110, 146.8, 196, 246.9, 329.6][i % 6], .25); },
  twang() { pluck(rnd(90, 160), .18, 0, 1.2); tone(140, 60, .3, 'sawtooth', .02); },
  pluckf(f = 196) { pluck(f, .26); },
  torch() { noise(.25, rnd(600, 900), .05, .4, 'lowpass'); },
  sizzle() { noise(.2, 6000, .04, .5, 'highpass', 3000); },
  anvil() { tone(1850, 1800, .5, 'sine', .08); tone(2780, 2700, .35, 'sine', .04); tone(140, 60, .15, 'sine', .2); noise(.03, 4000, .15, 1, 'highpass'); },
  miss() { tone(220, 160, .12, 'square', .04); },
  laser() { tone(rnd(2600, 3200), rnd(2600, 3200), .05, 'sine', .015); noise(.04, 7000, .02, 1, 'highpass'); },
  snip() { tone(2200, 900, .05, 'square', .05); noise(.03, 5000, .12, 1, 'highpass'); pluck(rnd(300, 500), .12, .01, .5); },
  stamp() { tone(160, 60, .12, 'sine', .25); noise(.05, 1200, .1, 1, 'lowpass'); },
  glass() { tone(3200, 3000, .3, 'sine', .04); tone(4700, 4500, .2, 'sine', .02); noise(.08, 6000, .06, 1, 'highpass'); },
  shatter() { for (let i = 0; i < 6; i++) { tone(rnd(2500, 5000), rnd(2000, 4000), .2, 'sine', .03, i * .03); } noise(.3, 5000, .12, .8, 'highpass'); }
};
const LOOPS = {
  spray: { f: 5200, q: .6, type: 'highpass', v: .09 }, paint: { f: 4200, q: .6, type: 'highpass', v: .09 }, oil: { f: 3800, q: .8, type: 'highpass', v: .05 },
  water: { f: 1400, q: .5, type: 'bandpass', v: .11 }, sandgun: { f: 2600, q: .5, type: 'bandpass', v: .13 },
  grind: { f: 1800, q: 1.2, type: 'bandpass', v: .08, tone: 160 }, buff: { f: 900, q: .8, type: 'bandpass', v: .06, tone: 95 },
  vacuum: { f: 1100, q: .4, type: 'bandpass', v: .1, tone: 120 }, blower: { f: 700, q: .3, type: 'bandpass', v: .12 }, heat: { f: 400, q: .4, type: 'lowpass', v: .1 },
  bath: { f: 500, q: .6, type: 'bandpass', v: .06, tone: 60 }, torch: { f: 700, q: .3, type: 'lowpass', v: .12 }, laser: { f: 6000, q: 2, type: 'bandpass', v: .03, tone: 2400 }, wash: { f: 1100, q: .3, type: 'bandpass', v: .1 }
};
const LP = { node: null, key: null };
export function setLoop(key) {
  if (key === LP.key) return; const a = AC;
  if (LP.node && a) { const o = LP.node, t = a.currentTime; try { o.g.gain.cancelScheduledValues(t); o.g.gain.setTargetAtTime(0, t, .05); o.s.stop(t + .3); if (o.o) o.o.stop(t + .3); } catch (e) { } LP.node = null; }
  LP.key = key; if (!key || !LOOPS[key] || !ac()) return;
  try {
    const c = LOOPS[key], s = AC.createBufferSource(); s.buffer = NBUF; s.loop = true; const fl = AC.createBiquadFilter(); fl.type = c.type; fl.frequency.value = c.f; fl.Q.value = c.q;
    const g = AC.createGain(); g.gain.value = 0; g.gain.setTargetAtTime(c.v, AC.currentTime, .04); s.connect(fl); fl.connect(g); g.connect(out()); s.start();
    let o = null; if (c.tone) { o = AC.createOscillator(); o.type = 'sawtooth'; o.frequency.value = c.tone; const og = AC.createGain(); og.gain.value = .012; o.connect(og); og.connect(g); o.start(); }
    LP.node = { s, g, o };
  } catch (e) { }
}
const last = {};
export function sfx(n, gap, ...args) { const t = performance.now(); if (gap && t - (last[n] || 0) < gap) return; last[n] = t; try { SFX[n] && SFX[n](...args); } catch (e) { } }
