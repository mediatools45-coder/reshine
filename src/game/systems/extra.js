import * as THREE from 'three';
import { G, RIG, CAM, STAGE, finishStep, turnItem, isTurned, camImpulse, setView, st } from '../game.js';
import { R, project } from '../../render/engine.js';
import { T, toolStrike } from '../../assets/tools.js';
import { sfx } from '../../fx/audio.js';
import { puff, flakes, debris, sparks, bubbles, foam, glints, drops, grains, dust, emit } from '../../fx/particles.js';
import { clamp, lerp, rnd, tween, later, clock, vib, moveTo, smooth, ease } from '../../core/util.js';
import { glass, mat, metal, cyl, box, rbox, mesh, lathe, torus, plastic } from '../../assets/geo.js';
import { BENCH_Y } from '../../render/studio.js';
import { I, toast, worldScale, lp, base, toolName, FX, facing, stage } from './common.js';

/* ============ 16. tune: turn each peg in circles until the tuner needle sits in the green ============
   o.pegs(): [{key, p, label, start, freq}]  o.onTurn(peg, d)  o.onTuned(peg) */
export function tune(o) {
  return base({ kind: 'tune', grabAll: true, anywhere: true, lockRig: true, input: 'Circle', tool: 'hand', ...o, toolLabel: o.toolLabel || 'Tuning Pegs',
    enter() { this.list = o.pegs().map((p, i) => ({ v: p.start ?? (i % 2 ? .82 : .16), done: false, hold: 0, ...p })); this.last = null; G.meter = { v: .5, lo: .45, hi: .55, label: 'Tune to the centre' }; G.chips = [{ label: o.chip || 'Strings', get: () => this.prog }]; if (o.enter) o.enter.call(this); },
    cur() { return this.list.find(p => !p.done); },
    pos(p) { return I().parts[p.key].wp(p.p || [0, 0, 0]); },
    nodes() { return []; },
    ang(r, p) { const c = project(this.pos(p)); return Math.atan2(r.y - c.y, r.x - c.x); },
    onDown(hit, ray, r) { const p = this.cur(); if (p) this.last = this.ang(r, p); },
    onMove(hit, ray, r) {
      const p = this.cur(); if (!p || this.last == null) return; const a = this.ang(r, p); let d = a - this.last; if (d > Math.PI) d -= Math.PI * 2; else if (d < -Math.PI) d += Math.PI * 2; this.last = a;
      p.v = clamp(p.v + d * .045, 0, 1); if (o.onTurn) o.onTurn.call(this, p, d); sfx('ratchet', 120);
      if (Math.random() < .25) sfx('pluckf', 160, (p.freq || 196) * Math.pow(2, (p.v - .5) * .6));
    },
    onUp() { this.last = null; },
    update(dt) {
      const p = this.cur(); if (!p) { G.meter = null; return; }
      if (G.meter) { G.meter.v += (p.v - G.meter.v) * Math.min(1, dt * 10); G.meter.label = (p.label || 'String') + ': tune to the centre'; }
      if (Math.abs(p.v - .5) < .05) { p.hold += dt; if (p.hold > .45) { p.done = true; sfx('pluckf', 0, p.freq || 196); glints(this.pos(p), 6, .2); if (o.onTuned) o.onTuned.call(this, p); this.last = null; } } else p.hold = 0;
      this.prog = this.list.filter(x => x.done).length / this.list.length;
      if (this.list.every(x => x.done) && !this.fin) { this.fin = true; G.meter = null; sfx('strum'); later(600, () => finishStep()); }
    },
    markers() { const p = this.cur(); return p && !this.fin ? [{ pos: this.pos(p), r: 34, label: 'Turn' }] : []; },
    skip() { for (const p of this.list) { p.v = .5; p.done = true; if (o.onTuned) o.onTuned.call(this, p); } G.meter = null; },
    exit() { this.fin = false; G.meter = null; if (o.exit) o.exit.call(this); },
    tut: o.tut || { title: o.name, body: o.hint, demo() { const p = this.cur && this.cur(); return p ? { type: 'circle', pts: [this.pos(p)] } : null; } }
  });
}

/* ============ 17. strokes: long strokes along a guide while keeping an angle gauge in the green (whetstone) ============
   o.a(), o.b(): world end points of the stroke  o.strokes: how many good strokes  o.onStroke(k) */
export function strokes(o) {
  return base({ kind: 'strokes', grabAll: true, anywhere: true, lockRig: true, input: 'Long strokes', ...o, toolLabel: o.toolLabel || toolName(o.tool || 'stone'),
    enter() { this.n = 0; this.d0 = null; this.good = 0; this.tot = 0; this.wob = Math.random() * 6; G.meter = { v: .5, lo: .36, hi: .64, label: o.label || 'Hold the angle' }; G.chips = [{ label: o.chip || 'Strokes', get: () => this.prog }]; if (o.enter) o.enter.call(this); },
    nodes() { const it = I(); return Object.values(it.parts).filter(p => p.g.visible).flatMap(p => p.meshes); },
    seg() { const a = project(o.a()), b = project(o.b()); return { ax: a.x, ay: a.y, bx: b.x, by: b.y }; },
    onDown(hit, ray, r) { this.d0 = { s: this.seg(), t0: null }; this.track(r); },
    onMove(hit, ray, r) { if (this.d0) this.track(r); },
    track(r) {
      const s = this.d0.s, vx = s.bx - s.ax, vy = s.by - s.ay, L = Math.hypot(vx, vy) || 1, t = ((r.x - s.ax) * vx + (r.y - s.ay) * vy) / (L * L), off = ((r.x - s.ax) * vy - (r.y - s.ay) * vx) / L;
      /* the angle drifts on its own; the finger's sideways offset corrects it */
      this.wob += .05; const ang = clamp(.5 + off / 140 + Math.sin(this.wob) * .12, 0, 1); if (G.meter) G.meter.v = ang;
      const inZone = ang >= .36 && ang <= .64; this.tot++; if (inZone) this.good++;
      if (this.d0.t0 == null) { this.d0.t0 = t; this.d0.dir = 0; }
      const d = t - this.d0.t0;
      if (Math.abs(d) > .7) {
        const ok = this.good / Math.max(1, this.tot) > .6;
        if (ok) { this.n++; sfx(o.snd || 'file'); glints(o.b().clone().lerp(o.a(), clamp(t, 0, 1)), 3, .15); if (o.onStroke) o.onStroke.call(this, this.n / (o.strokes || 6)); }
        else { sfx('miss'); toast('Keep the angle in the green', 1000); }
        this.d0.t0 = t; this.good = 0; this.tot = 0;
        this.prog = Math.min(1, this.n / (o.strokes || 6)); if (this.prog >= 1 && !this.fin) { this.fin = true; G.meter = null; later(400, () => finishStep()); }
      } else if (Math.random() < .3) sfx(o.snd || 'file', 90);
    },
    onUp() { this.d0 = null; },
    markers() { return this.fin ? [] : [{ pos: o.a(), r: 20, label: 'Stroke' }, { pos: o.b(), r: 20 }]; },
    skip() { this.n = o.strokes || 6; if (o.onStroke) o.onStroke.call(this, 1); G.meter = null; },
    exit() { this.fin = false; G.meter = null; if (o.exit) o.exit.call(this); },
    tut: o.tut || { title: o.name, body: o.hint, demo() { return { type: 'scrub', pts: [o.a(), o.b()] }; } }
  });
}

/* ============ 18. load: tap parts into a machine (dishwasher), then hold the button to run it ============
   o.items(): [{key, label}]  o.machine(): THREE.Group placed in the scene  o.slot(i): world position in the machine
   o.time  o.onProg(k)  o.onDone() */
export function load(o) {
  return base({ kind: 'load', grabAll: false, lockRig: true, input: 'Tap, Hold', tool: 'hand', ...o, toolLabel: o.toolLabel || 'Bare Hands',
    enter() {
      this.list = o.items().map(x => ({ ...x, done: false })); this.phase = 'load'; this.needsHold = false; this.k = 0;
      this.m = o.machine(); this.m.visible = true; R.scene.add(this.m); G.fitExtra = [this.m];
      G.chips = [{ label: o.chip || 'Loaded', get: () => this.prog }]; if (o.enter) o.enter.call(this);
    },
    nodes() { const it = I(); return this.list.filter(x => !x.done).flatMap(x => it.parts[x.key].pickables()); },
    onDown(hit) {
      if (this.phase !== 'load' || !hit) return; const part = hit.object.userData.part; const x = part && this.list.find(i => !i.done && i.key === part.key); if (!x) return;
      x.done = true; const i = this.list.indexOf(x), g = part.g, w0 = g.getWorldPosition(new THREE.Vector3()), dest = o.slot(i), q0 = g.getWorldQuaternion(new THREE.Quaternion());
      R.scene.attach(g); sfx('click'); tween(.6, k => { g.position.lerpVectors(w0, dest, k); g.position.y += Math.sin(k * Math.PI) * 1.2; }, () => { sfx('clink'); }, ease);
      x.g = g; this.prog = this.list.filter(y => y.done).length / this.list.length * .4;
      if (this.list.every(y => y.done)) later(700, () => { if (st() !== this) return; this.phase = 'run'; this.needsHold = true; G.ui && G.ui('hold'); toast(o.runHint || 'Hold the button to run it', 1800); if (o.onClose) o.onClose.call(this); });
    },
    update(dt) {
      if (this.phase !== 'run' || !G.hold) return;
      this.k = Math.min(1, this.k + dt / (o.time || 3)); this.prog = .4 + .6 * this.k; G.shake = Math.max(G.shake, .05);
      if (Math.random() < dt * 30) { const p = this.m.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(rnd(-1.5, 1.5), rnd(.5, 2), rnd(-.8, .8))); drops(p, 1, [.75, .9, 1]); if (Math.random() < .3) bubbles(p, 1, .2, .8); }
      sfx('pour', 300); if (o.onProg) o.onProg.call(this, this.k);
      if (this.k >= 1 && !this.fin) this.finish_();
    },
    finish_() { this.fin = true; this.needsHold = false; G.hold = false; G.ui && G.ui('hold'); sfx('ding'); if (o.onDone) o.onDone.call(this); later(500, () => finishStep()); },
    markers() { if (this.phase !== 'load') return []; const it = I(); return this.list.filter(x => !x.done).map(x => ({ pos: it.parts[x.key].g.localToWorld(it.parts[x.key].center.clone()), r: 26, label: x.label })); },
    skip() { this.k = 1; if (o.onProg) o.onProg.call(this, 1); if (o.onDone) o.onDone.call(this); },
    exit() { this.fin = false; this.needsHold = false; if (this.m) this.m.visible = false; G.fitExtra = []; const it = I(); for (const x of this.list || []) { const p = it.parts[x.key]; if (p.g.parent !== p.home.parent) { p.home.parent.attach(p.g); } it.home(x.key, 0); } if (o.exit) o.exit.call(this); },
    tut: o.tut || { title: o.name, body: o.hint, demo() { const it = I(), x = this.list && this.list.find(y => !y.done); return x ? { type: 'tap', pts: [it.parts[x.key].g.localToWorld(it.parts[x.key].center.clone())] } : null; } }
  });
}
