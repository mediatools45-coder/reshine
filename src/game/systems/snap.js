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

/* ============ 5. drag & snap parts from the tray into their ghost sockets ============ */
export function snap(o) {
  return base({ kind: 'snap', 
    input: 'Drag', lockRig: true, ...o, toolLabel: o.toolLabel || toolName(o.tool || 'hand'),
    enter() {
      const it = I(); this.items = (typeof o.keys === 'function' ? o.keys() : o.keys).map(k => ({ key: k, done: false, p: 0 })); this.cur = null;
      for (const x of this.items) { if (it.parts[x.key].state !== 'tray') it.toTray(x.key, clock.ff); }
      G.chips = [{ label: o.chip || 'Parts', get: () => this.prog }]; if (o.enter) o.enter.call(this); this.ghosts();
    },
    ready(x) { return !o.ordered || this.items.indexOf(x) === 0 || this.items[this.items.indexOf(x) - 1].done; },
    ghosts() { const it = I(); for (const x of this.items) it.ghost(x.key, !x.done && this.ready(x)); },
    nodes() { const it = I(); return this.items.filter(x => !x.done && this.ready(x)).flatMap(x => it.parts[x.key].pickables()); },
    assist(px, py) { let best = null, bd = 60; for (const x of this.items) { if (x.done || !this.ready(x)) continue; const P = I().parts[x.key], w = P.g.localToWorld(P.center.clone()), q = project(w); const d = Math.hypot(q.x - px, q.y - py); if (d < bd) { bd = d; best = { object: P.meshes[0] || P.hits[0], point: w, face: null }; } } return best; },
    onDown(hit) {
      const part = hit && hit.object.userData.part, x = part && this.items.find(i => !i.done && this.ready(i) && i.key === part.key); if (!x) return;
      const P = part; this.cur = x; P.dragging = true; const n = new THREE.Vector3(); R.camera.getWorldDirection(n);
      const goalW = this.goalWorld(x); this.plane = new THREE.Plane().setFromNormalAndCoplanarPoint(n, goalW); this.grabOff = null; x.s0 = P.g.scale.x; sfx('click');
      x.d0 = null;
    },
    goalWorld(x) { const P = I().parts[x.key], par = P.home.parent; return par.localToWorld(P.home.pos.clone().add(P.center.clone().applyQuaternion(P.home.quat).multiplyScalar(P.home.scl))); },
    onMove(hit, ray) {
      const x = this.cur; if (!x || x.done) return; const P = I().parts[x.key], w = new THREE.Vector3(); if (!ray.intersectPlane(this.plane, w)) return;
      const goal = this.goalWorld(x), dist = w.distanceTo(goal); if (x.d0 == null) x.d0 = Math.max(dist, 1);
      const hs = P.home.scl * worldScale(P.home.parent), k = smooth(0, 1, 1 - clamp((dist - .3) / Math.max(1.5, x.d0 * .8), 0, 1)), s = lerp(x.s0, hs, k);
      P.g.scale.setScalar(s); const cOff = P.center.clone().applyQuaternion(P.g.quaternion).multiplyScalar(s); P.g.position.copy(w).sub(cOff);
      const hq = P.home.parent.getWorldQuaternion(new THREE.Quaternion()).multiply(P.home.quat); P.g.quaternion.slerp(hq, .15 + .5 * k);
      x.p = clamp(1 - dist / x.d0, 0, 1); this.recalc(); if (Math.random() < .08) sfx('scrape', 120);
      if (dist < (o.thr || .9) * Math.max(.6, CAM.dist / 14)) this.place(x);
    },
    onUp() { const x = this.cur; this.cur = null; if (!x || x.done) return; const P = I().parts[x.key]; P.dragging = false; x.p = 0; this.recalc(); },
    place(x) {
      x.done = true; this.cur = null; const it = I(), P = it.parts[x.key]; P.dragging = false; P.busy = true; it.untray(x.key);
      const par = P.home.parent; par.attach(P.g); sfx('click'); vib(25);
      moveTo(P.g, { pos: P.home.pos, quat: P.home.quat, scl: P.home.scl }, .22, () => { P.busy = false; P.state = 'home'; sfx(o.snd || 'ping'); glints(P.wp(), 8, .4); if (o.onPlace) o.onPlace.call(this, x); });
      this.recalc(); this.ghosts(); if (this.items.every(i => i.done)) { this.prog = 1; later(600, () => finishStep()); }
    },
    recalc() { this.prog = this.items.reduce((a, x) => a + (x.done ? 1 : x.p * .9), 0) / this.items.length; },
    markers() { return this.items.filter(x => !x.done && this.ready(x)).slice(0, 4).map(x => ({ pos: this.goalWorld(x), r: o.mr || 26, label: o.label })); },
    skip() { const it = I(); for (const x of this.items) { if (!x.done) { x.done = true; it.home(x.key, 0); if (o.onPlace) o.onPlace.call(this, x); } } it.hideGhosts(); },
    exit() { I().hideGhosts(); if (o.exit) o.exit.call(this); },
    tut: o.tut || { title: o.name, body: o.hint, demo() { const x = this.items && this.items.find(i => !i.done && this.ready(i)); if (!x) return null; const P = I().parts[x.key]; return { type: 'drag', pts: [P.g.localToWorld(P.center.clone()), this.goalWorld(x)] }; } }
  });
}
