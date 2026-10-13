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

/* ============ 4. fasteners: press & hold on a screw to drive it out / in ============ */
export function screws(o) {
  return base({ kind: 'screws', grabAll: true, 
    input: 'Hold', tool: o.tool || 'screw', lockRig: true, ...o, toolLabel: o.toolLabel || toolName(o.tool || 'screw'),
    enter() {
      const it = I(); this.items = o.keys.map(k => ({ key: k, p: 0, done: false })); this.cur = null; G.chips = [{ label: o.chip || 'Screws', get: () => this.prog }];
      for (const x of this.items) { const P = it.parts[x.key]; if (o.dir === 'in') { it.home(x.key, 0); P.g.position.copy(P.home.pos).addScaledVector(this.ax(), o.rise || .3); } else it.home(x.key, 0); }
      if (o.enter) o.enter.call(this);
    },
    ax() { return new THREE.Vector3(...(o.axis || [0, 1, 0])).normalize(); },
    nodes() { const it = I(); return this.items.filter(x => !x.done).flatMap(x => it.parts[x.key].pickables()); },
    assist(x, y) { let best = null, bd = 44; for (const s of this.items) { if (s.done) continue; const w = I().parts[s.key].wp(), q = project(w); const d = Math.hypot(q.x - x, q.y - y); if (d < bd) { bd = d; best = { object: I().parts[s.key].meshes[0] || I().parts[s.key].hits[0], point: w, face: { normal: new THREE.Vector3(0, 0, 1) } }; } } return best; },
    onDown(hit) { const part = hit && hit.object.userData.part, x = part && this.items.find(i => !i.done && i.key === part.key); if (!x) return; this.cur = x; T.spinning = true; sfx('click'); },
    onUp() { this.cur = null; T.spinning = false; },
    update(dt) {
      const x = this.cur; if (!x || !G.down) { T.spinning = false; return; } T.spinning = true; const P = I().parts[x.key];
      x.p = Math.min(1, x.p + dt / (o.time || 1.0)); const ax = this.ax();
      P.g.quaternion.copy(P.home.quat).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(...(o.spinAxis || o.axis || [0, 1, 0])), (o.dir === 'in' ? -1 : 1) * x.p * 14));
      P.g.position.copy(P.home.pos).addScaledVector(ax, (o.dir === 'in' ? 1 - x.p : x.p) * (o.rise || .3)); sfx('ratchet', 160);
      if (Math.random() < dt * 8) puff(P.wp(), [.6, .5, .4], 1, { a: .3, s0: .04, s1: .1 });
      this.prog = this.items.reduce((a, i) => a + i.p, 0) / this.items.length;
      if (x.p >= 1) {
        x.done = true; this.cur = null; T.spinning = false; sfx('pop'); vib(25); G.shake = .25; P.g.quaternion.copy(P.home.quat);
        if (o.dir === 'in') { P.g.position.copy(P.home.pos); sfx('ping'); glints(P.wp(), 6, .3); } else if (o.to !== 'stay') I().toTray(x.key);
        if (this.items.every(i => i.done)) { this.prog = 1; later(450, () => finishStep()); }
      }
    },
    markers() { return this.items.filter(i => !i.done).map(i => ({ pos: I().parts[i.key].wp(), r: o.mr || 22, prog: i.p })); },
    skip() { const it = I(); for (const x of this.items) { const P = it.parts[x.key]; P.g.quaternion.copy(P.home.quat); if (o.dir === 'in') P.g.position.copy(P.home.pos); else if (o.to !== 'stay') it.toTray(x.key, true); } },
    exit() { T.spinning = false; if (o.exit) o.exit.call(this); }
  });
}
