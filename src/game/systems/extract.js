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

/* ============ 3. extract: drag a part along a constrained axis; optional resistance then pop ============ */
export function extract(o) {
  return base({ kind: 'extract', 
    input: 'Drag', lockRig: true, ...o, toolLabel: o.toolLabel || toolName(o.tool || 'hand'),
    enter() { this.items = (typeof o.items === 'function' ? o.items() : o.items).map(x => ({ thr: 1.4, ...x, done: false, p: 0, strain: 0, freed: !x.resist })); this.cur = null; G.chips = [{ label: o.chip || 'Removed', get: () => this.prog }]; if (o.enter) o.enter.call(this); },
    ready(it) { return !it.after || this.items.find(x => x.key === it.after).done; },
    nodes() { const it = I(); return this.items.filter(x => !x.done && this.ready(x)).flatMap(x => (x.grip || [x.key]).flatMap(k => it.parts[k].pickables())); },
    onDown(hit, ray) {
      const part = hit && hit.object.userData.part; const x = part && this.items.find(i => !i.done && this.ready(i) && (i.key === part.key || (i.grip || []).includes(part.key))); if (!x) return;
      const P = I().parts[x.key]; this.cur = x; P.dragging = true; const n = new THREE.Vector3(); R.camera.getWorldDirection(n);
      this.plane = new THREE.Plane().setFromNormalAndCoplanarPoint(n, hit.point); this.w0 = hit.point.clone(); x.g0 = P.home.pos.clone(); sfx('click');
      x.axisW = null; x.lastS = 0;
    },
    onMove(hit, ray) {
      const x = this.cur; if (!x || x.done) return; const P = I().parts[x.key], w = new THREE.Vector3(); if (!ray.intersectPlane(this.plane, w)) return;
      const dW = w.sub(this.w0), par = P.g.parent, pq = par.getWorldQuaternion(new THREE.Quaternion()).invert(), ps = worldScale(par);
      const d = dW.applyQuaternion(pq).divideScalar(ps), ax = new THREE.Vector3(...x.axis).normalize();
      let s = clamp(d.dot(ax), 0, x.thr * 1.2);
      if (!x.freed) { const lim = x.thr * .1; x.pull = s > lim ? Math.min(1, (s - lim) / (x.thr * .25)) : 0; if (s > lim) s = lim + Math.sin(G.time * 60) * .012 * x.thr; }
      P.g.position.copy(x.g0).addScaledVector(ax, s); for (const k of x.also || []) { const A = I().parts[k]; A.g.position.copy(A.home.pos).addScaledVector(ax, s); }
      if (Math.abs(s - x.lastS) > .1 * x.thr) { sfx('scrape', 90); x.lastS = s; }
      x.p = x.freed ? clamp(s / x.thr, 0, 1) : clamp(x.strain, 0, 1) * .45; this.recalc();
      if (x.freed && s >= x.thr) this.detach(x);
    },
    update(dt) {
      const x = this.cur; if (!x || x.done || x.freed || !x.pull) return; const P = I().parts[x.key];
      x.strain += dt * (.45 + .75 * x.pull); G.shake = Math.max(G.shake, .1 + .15 * x.pull); if (Math.random() < dt * 4) sfx('creak', 300); if (Math.random() < dt * 10) grains(P.wp(x.mk || [0, 0, 0]), 2, [.5, .25, .1]);
      x.p = clamp(x.strain, 0, 1) * .45; this.recalc();
      if (x.strain >= 1) { x.freed = true; x.pull = 0; this.w0.add(new THREE.Vector3(0, 0, 0)); sfx('bigpop'); camImpulse(1.1); vib([30, 30, 60]); const wp = P.wp(x.mk || [0, 0, 0]); debris(wp, 26, [.45, .2, .08]); flakes(wp, 18); puff(wp, [.55, .3, .14], 10, { a: .55, s0: .2, s1: .6 }); toast('It popped free!'); if (x.onFree) x.onFree.call(this, x); x.popT = G.time; }
    },
    onUp() { const x = this.cur; this.cur = null; if (!x || x.done) return; const P = I().parts[x.key]; P.dragging = false; x.pull = 0; if (!x.freed) x.strain *= .85; x.p = x.freed ? 0 : x.p; moveTo(P.g, { pos: x.g0 }, .22); for (const k of x.also || []) moveTo(I().parts[k].g, { pos: I().parts[k].home.pos }, .22); this.recalc(); },
    recalc() { this.prog = this.items.reduce((a, x) => a + (x.done ? 1 : x.p * .9), 0) / this.items.length; },
    detach(x) {
      x.done = true; this.cur = null; const it = I(), P = it.parts[x.key]; P.dragging = false; sfx(x.snd || 'pop'); vib(20); camImpulse(.3);
      puff(P.wp(), [.7, .65, .55], 4, { a: .4 }); if (x.flakes !== false) flakes(P.wp(), 6, x.col);
      if (x.to === 'stay') { } else if (x.to === 'fly') { P.busy = true; R.scene.attach(P.g); const w0 = P.g.position.clone(), s0 = P.g.scale.x; tween(.7, k => { P.g.position.set(w0.x + 2 * k, w0.y + 3 * k - 4 * k * k, w0.z + 1.5 * k); P.g.rotation.z = k * 6; P.g.scale.setScalar(s0 * (1 - k)); }, () => { P.g.visible = false; P.busy = false; P.state = 'hidden'; }); }
      else { it.toTray(x.key); for (const k of x.also || []) it.toTray(k); }
      if (x.after_) x.after_.call(this, x); this.recalc();
      if (this.items.every(i => i.done)) { this.prog = 1; later(450, () => finishStep()); }
    },
    markers() { return this.items.filter(x => !x.done && this.ready(x)).map(x => ({ pos: I().parts[x.key].wp(x.mk || [0, 0, 0]), r: x.mr || 30, label: x.label, prog: x.freed ? 0 : x.strain })); },
    skip() { const it = I(); for (const x of this.items) { if (x.done) continue; x.done = true; if (x.to === 'stay') { const P = it.parts[x.key]; P.g.position.copy(P.home.pos).addScaledVector(new THREE.Vector3(...x.axis).normalize(), x.thr); } else if (x.to === 'fly') it.hide(x.key); else { it.toTray(x.key, true); for (const k of x.also || []) it.toTray(k, true); } if (x.onFree) x.onFree.call(this, x); if (x.after_) x.after_.call(this, x); } },
    exit() { if (o.exit) o.exit.call(this); }
  });
}
