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

/* ============ 15. timing: a needle sweeps a gauge; tap while it is in the green window ============
   o.targets(): [{key, p, label}] (worked in order)  o.hits: good hits per target  o.speed  o.win: window width
   o.onHit(t, n) on a good hit, o.onMiss()  o.label: gauge caption  o.strike: animate the tool */
export function timing(o) {
  return base({ kind: 'timing', grabAll: true, anywhere: true, lockRig: true, input: 'Tap on time', ...o, toolLabel: o.toolLabel || toolName(o.tool || 'hammer'),
    enter() {
      this.list = o.targets().map(t => ({ hits: 0, need: o.hits || 1, done: false, ...t })); this.t = Math.random() * 6; this.busyT = 0;
      const w = o.win || .2; this.lo = .5 - w / 2; this.hi = .5 + w / 2; G.meter = { v: 0, lo: this.lo, hi: this.hi, label: o.label || 'Strike in the green' };
      G.chips = [{ label: o.chip || 'Strikes', get: () => this.prog }]; if (o.enter) o.enter.call(this);
    },
    cur() { return this.list.find(t => !t.done); },
    pos(t) { return I().parts[t.key].wp(t.p || [0, 0, 0]); },
    nodes() { const it = I(); return Object.values(it.parts).filter(p => p.g.visible).flatMap(p => p.meshes); },
    update(dt) {
      if (this.fin) { G.meter = null; return; }
      this.t += dt * (o.speed || 2.4) * (1 + (this.list.filter(x => x.done).length) * .06); this.busyT = Math.max(0, this.busyT - dt);
      if (G.meter) G.meter.v = .5 + .5 * Math.sin(this.t);
      const c = this.cur(); if (c && !G.down) { T.goal.copy(this.pos(c)).add(new THREE.Vector3(0, .05, 0)); T.goalVis = 1; T.goalLift = .45 * T.scale; T.aimT = performance.now(); }
    },
    onDown() {
      const t = this.cur(); if (!t || this.busyT > 0 || this.fin) return; this.busyT = .25;
      const v = G.meter ? G.meter.v : .5, good = v >= this.lo && v <= this.hi;
      const fire = () => {
        const p = this.pos(t);
        if (good) { t.hits++; sfx(o.snd || 'anvil'); sparks(p, 10); camImpulse(.35); vib(20); if (o.onHit) o.onHit.call(this, t, t.hits); if (t.hits >= t.need) { t.done = true; glints(p, 6, .2); if (o.onDone) o.onDone.call(this, t); } }
        else { sfx('miss'); G.shake = Math.max(G.shake, .15); toast(v < this.lo ? 'Too early: wait for the green' : 'Too late: wait for the green', 1100); if (o.onMiss) o.onMiss.call(this, t); }
        this.prog = this.list.reduce((a, x) => a + Math.min(x.hits, x.need) / x.need, 0) / this.list.length;
        if (this.list.every(x => x.done) && !this.fin) { this.fin = true; G.meter = null; later(450, () => finishStep()); }
      };
      T.goal.copy(this.pos(t)); T.hitPt = this.pos(t); T.onSurf = true; if (o.strike !== false) toolStrike(fire); else fire();
    },
    markers() { const c = this.cur(); return c && !this.fin ? [{ pos: this.pos(c), r: o.mr || 26, label: c.label, prog: c.need > 1 ? c.hits / c.need : 0 }] : []; },
    skip() { for (const t of this.list) while (!t.done) { t.hits++; if (o.onHit) o.onHit.call(this, t, t.hits); if (t.hits >= t.need) { t.done = true; if (o.onDone) o.onDone.call(this, t); } } G.meter = null; },
    exit() { this.fin = false; G.meter = null; if (o.exit) o.exit.call(this); },
    tut: o.tut || { title: o.name, body: o.hint, demo() { const c = this.cur && this.cur(); return c ? { type: 'tap', pts: [this.pos(c)] } : null; } }
  });
}
