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

/* ============ 8. rotational gesture around a screen-space centre ============ */
export function rotate(o) {
  return base({ kind: 'rotate', 
    input: 'Circle', grabAll: true, lockRig: true, ...o, toolLabel: o.toolLabel || toolName(o.tool || 'hand'),
    enter() { this.acc = 0; this.last = null; this.prog = 0; G.chips = [{ label: o.chip || 'Turns', get: () => this.prog }]; if (o.enter) o.enter.call(this); },
    nodes() { return o.nodes ? o.nodes() : []; },
    ang(r) { const c = project(o.center()); return Math.atan2(r.y - c.y, r.x - c.x); },
    onDown(hit, ray, r) { this.last = this.ang(r); },
    onMove(hit, ray, r) {
      if (this.last == null || this.fin) return; const a = this.ang(r); let d = a - this.last; if (d > Math.PI) d -= Math.PI * 2; else if (d < -Math.PI) d += Math.PI * 2; this.last = a;
      if (o.signed && d * o.signed < 0) return;
      this.acc += Math.abs(d); this.prog = clamp(this.acc / ((o.turns || 2) * Math.PI * 2), 0, 1); if (o.onTurn) o.onTurn.call(this, d, this.prog); sfx(o.snd || 'ratchet', o.sndGap || 140);
      if (this.prog >= 1) { this.fin = true; if (o.onDone) o.onDone.call(this); later(o.delay ?? 400, () => finishStep()); }
    },
    onUp() { this.last = null; },
    markers() { return this.fin ? [] : [{ pos: o.center(), r: o.mr || 44, label: o.label || 'Circle' }]; },
    skip() { if (o.onTurn) o.onTurn.call(this, 0, 1); if (o.onDone) o.onDone.call(this); },
    exit() { this.fin = false; if (o.exit) o.exit.call(this); },
    tut: o.tut || { title: o.name, body: o.hint, demo() { return { type: 'circle', pts: [o.center()] }; } }
  });
}
