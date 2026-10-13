/* pointing-hand guide: animated finger that demonstrates the current step's gesture */
import { G } from '../game/game.js';
import { project } from '../render/engine.js';
import { clamp, lerp, ease, $ } from '../core/util.js';

/* ---------- tutorial hand ---------- */
const HAND = { on: false, t: 0, fn: null, d: null };
export function startHand(fn) { HAND.fn = fn; HAND.t = 0; HAND.on = true; }
export function stopHand() { HAND.on = false; HAND.fn = null; $('hand').classList.remove('on', 'press', 'rip'); }
const tri = k => 1 - Math.abs(2 * (k % 1) - 1);
function handPose(d, t) {
  const W = innerWidth, H = innerHeight, P = (d.pts || []).map(w => project(w)).filter(q => q.ok);
  const lift = (k, a) => (1 - ease(clamp(k / a, 0, 1))) * 46;
  switch (d.type) {
    case 'tap': { if (!P.length) return null; const cyc = 1.15, i = Math.floor(t / cyc) % P.length, k = (t % cyc) / cyc, q = P[i]; return { x: q.x, y: q.y + (k < .4 ? lift(k, .4) : (k > .7 ? ease((k - .7) / .3) * 30 : 0)), p: k > .4 && k < .62, rip: k > .4 && k < .75 }; }
    case 'drag': { if (P.length < 2) return null; const cyc = 2.6, k = (t % cyc) / cyc, a = P[0], b = P[1]; let e = 0, p = false, off = 0; if (k < .2) off = lift(k, .2); else if (k < .3) p = true; else if (k < .78) { p = true; e = ease((k - .3) / .48); } else if (k < .86) { p = true; e = 1; } else { e = 1; off = ease((k - .86) / .14) * 40; } return { x: lerp(a.x, b.x, e), y: lerp(a.y, b.y, e) + off, p }; }
    case 'scrub': { if (P.length < 2) return null; const cyc = 3, k = (t % cyc) / cyc, a = P[0], b = P[1]; if (k < .12) return { x: a.x, y: a.y + lift(k, .12), p: false }; if (k > .9) return { x: a.x, y: a.y + ease((k - .9) / .1) * 40, p: false }; const m = ease(tri(((k - .12) / .78) * 2)); return { x: lerp(a.x, b.x, m), y: lerp(a.y, b.y, m), p: true }; }
    case 'hold': { if (!P.length) return null; const cyc = 2.4, k = (t % cyc) / cyc, q = P[0]; return { x: q.x, y: q.y + (k < .2 ? lift(k, .2) : k > .88 ? ease((k - .88) / .12) * 40 : 0), p: k > .2 && k < .88, rip: k > .2 && k < .88 }; }
    case 'circle': { if (!P.length) return null; const cyc = 2.8, k = (t % cyc) / cyc, q = P[0], R0 = 34; if (k < .1) return { x: q.x + R0, y: q.y + lift(k, .1), p: false }; if (k > .92) return { x: q.x + R0, y: q.y + 30, p: false }; const a = ((k - .1) / .82) * Math.PI * 4; return { x: q.x + Math.cos(a) * R0, y: q.y + Math.sin(a) * R0 * .75, p: true }; }
    case 'slide': { const k = (t % 3) / 3, e = ease(tri(k)); return { x: W * (.2 + .6 * e), y: H * .55, p: true }; }
    case 'swipe': { if (P.length < 2) return null; const cyc = 1.6, k = (t % cyc) / cyc, a = P[0], b = P[1]; if (k < .25) return { x: a.x, y: a.y + lift(k, .25), p: false }; const e = ease(clamp((k - .25) / .45, 0, 1)); return { x: lerp(a.x, b.x, e), y: lerp(a.y, b.y, e), p: k < .75 }; }
  }
  return null;
}
export function updateHand(dt) {
  const h = $('hand'); if (!HAND.on) return; HAND.t += dt;
  let d = null; try { d = HAND.fn ? HAND.fn() : null; } catch (e) { }
  const o = d ? handPose(d, HAND.t) : null; if (!o) { h.classList.remove('on'); return; }
  h.classList.add('on'); h.style.transform = `translate(${o.x.toFixed(1)}px,${o.y.toFixed(1)}px)`; h.classList.toggle('press', !!o.p); h.classList.toggle('rip', !!o.rip);
}
