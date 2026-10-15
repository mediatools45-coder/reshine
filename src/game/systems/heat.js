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

/* ============ 14. heat: hold the torch on spots until they glow, then (optionally) twist or bend ============
   o.spots(): [{key, p, r, label}]  o.time: seconds per spot  o.then: 'twist' | null
   o.twist: { center(), turns, label, onTurn(k) }  o.onHeat(spot, k)  o.flame: flame size */
const GLOW = new THREE.SphereGeometry(1, 16, 12);
export function heat(o) {
  return base({ kind: 'heat', grabAll: true, input: 'Hold', tool: 'torch', ...o, toolLabel: o.toolLabel || toolName(o.tool || 'torch'),
    enter() {
      this.phase = 'heat'; this.down = false; this.acc = 0; this.last = null;
      this.spots = o.spots().map(s => ({ r: .5, ...s, k: 0, done: false }));
      for (const s of this.spots) {
        const m = new THREE.Mesh(GLOW, new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.1, .25), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
        m.position.set(...s.p); m.scale.setScalar((s.glow || s.r) * .55); m.userData.nofit = true; m.userData.proxy = true; m.renderOrder = 6; I().parts[s.key].g.add(m); s.m = m;
      }
      G.chips = [{ label: o.chip || 'Heat', get: () => this.prog }]; if (o.enter) o.enter.call(this);
    },
    nodes() { const it = I(); return (o.parts ? o.parts() : Object.keys(it.parts)).flatMap(k => it.parts[k].g.visible ? it.parts[k].meshes : []); },
    pos(s) { return I().parts[s.key].wp(s.p); },
    onDown(hit, ray, r) { this.down = true; if (this.phase === 'twist') this.last = this.ang(r); },
    onMove(hit, ray, r) {
      if (this.phase !== 'twist' || this.fin) return; const a = this.ang(r); if (this.last == null) { this.last = a; return; }
      let d = a - this.last; if (d > Math.PI) d -= Math.PI * 2; else if (d < -Math.PI) d += Math.PI * 2; this.last = a;
      this.acc += Math.abs(d); const k = clamp(this.acc / ((o.twist.turns || 1) * Math.PI * 2), 0, 1); this.prog = .7 + .3 * k;
      o.twist.onTurn && o.twist.onTurn.call(this, k, d); sfx(o.twist.snd || 'creak', 160); G.shake = Math.max(G.shake, .05);
      if (k >= 1) { this.fin = true; sfx('pop'); camImpulse(.4); if (o.onDone) o.onDone.call(this); later(500, () => finishStep()); }
    },
    onUp() { this.down = false; this.last = null; },
    ang(r) { const c = project(o.twist.center()); return Math.atan2(r.y - c.y, r.x - c.x); },
    update(dt) {
      for (const s of this.spots) { const tgt = s.done ? Math.max(.25, s.k * .6) : s.k; s.m.material.opacity += (tgt * .85 - s.m.material.opacity) * Math.min(1, dt * 6); }
      if (this.phase !== 'heat') return;
      const on = this.down && T.onSurf && T.hitPt; let sum = 0;
      for (const s of this.spots) {
        if (!s.done && on && T.hitPt.distanceTo(this.pos(s)) < s.r * worldScale(I().root) * 1.4) {
          s.k = Math.min(1, s.k + dt / (o.time || 1.6));
          if (Math.random() < dt * 25) emit({ x: T.hitPt.x + rnd(-.05, .05), y: T.hitPt.y, z: T.hitPt.z + rnd(-.05, .05), vx: rnd(-.2, .2), vy: rnd(.6, 1.4), vz: rnd(-.2, .2), g: -.5, drag: 1.5, life: rnd(.3, .6), s0: .12, s1: .3, c: [1, rnd(.35, .6), .12], a: .7, type: 0, add: true, fade: 1, floor: null });
          if (s.k > .6 && Math.random() < dt * 8) sparks(T.hitPt, 1);
          sfx('torch', 220); if (o.onHeat) o.onHeat.call(this, s, s.k);
          if (s.k >= 1) { s.done = true; sfx('sizzle'); glints(this.pos(s), 5, .2); if (o.onSpot) o.onSpot.call(this, s); }
        }
        sum += s.k;
      }
      this.prog = (sum / this.spots.length) * (o.then ? .7 : 1);
      if (this.spots.every(s => s.done)) {
        if (o.then === 'twist') { this.phase = 'twist'; this.down = false; toast(o.twist.hint || 'Now twist it free!', 1800); }
        else if (!this.fin) { this.fin = true; if (o.onDone) o.onDone.call(this); later(400, () => finishStep()); }
      }
    },
    markers() {
      if (this.fin) return [];
      if (this.phase === 'twist') return [{ pos: o.twist.center(), r: 44, label: o.twist.label || 'Twist' }];
      return this.spots.filter(s => !s.done).map(s => ({ pos: this.pos(s), r: o.mr || 26, prog: s.k, label: s.label }));
    },
    skip() { for (const s of this.spots) { s.k = 1; s.done = true; if (o.onHeat) o.onHeat.call(this, s, 1); if (o.onSpot) o.onSpot.call(this, s); } if (o.then === 'twist' && o.twist.onTurn) o.twist.onTurn.call(this, 1, 0); if (o.onDone) o.onDone.call(this); },
    exit() { this.fin = false; for (const s of this.spots || []) { const m = s.m; tween(clock.ff ? 0 : 1.5, k => { m.material.opacity *= (1 - k); }, () => { m.parent && m.parent.remove(m); m.material.dispose(); }); } if (o.exit) o.exit.call(this); },
    tut: o.tut || { title: o.name, body: o.hint, demo() { if (this.phase === 'twist') return { type: 'circle', pts: [o.twist.center()] }; const s = this.spots && this.spots.find(x => !x.done); return s ? { type: 'hold', pts: [this.pos(s)] } : null; } }
  });
}
