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

/* ============ 11. tap targets (in order or any order); hammer strikes, keycap pops, typing ============ */
export function taps(o) {
  return base({ kind: 'taps', grabAll: true, 
    input: 'Tap', lockRig: true, ...o, toolLabel: o.toolLabel || toolName(o.tool || 'hand'),
    enter() { this.list = o.targets().map(t => ({ hits: 0, need: o.hits || 1, done: false, ...t })); this.idx = 0; G.chips = [{ label: o.chip || 'Targets', get: () => this.prog }]; if (o.enter) o.enter.call(this); },
    cur() { return o.ordered ? this.list.filter(t => !t.done).slice(0, 1) : this.list.filter(t => !t.done); },
    pos(t) { return I().parts[t.key].wp(t.p || [0, 0, 0]); },
    nodes() { const it = I(); return [...new Set(this.cur().map(t => t.key))].flatMap(k => it.parts[k].pickables()); },
    assist(x, y) { let best = null, bd = o.assistPx || 46; for (const t of this.cur()) { const w = this.pos(t), q = project(w); const d = Math.hypot(q.x - x, q.y - y); if (d < bd) { bd = d; best = { object: I().parts[t.key].meshes[0] || I().parts[t.key].hits[0], point: w, face: null, target: t }; } } return best; },
    onDown(hit) {
      if (!hit) return; let t = hit.target; if (!t) { let bd = 1e9; for (const c of this.cur()) { const d = this.pos(c).distanceTo(hit.point); if (d < bd) { bd = d; t = c; } } if (bd > (o.r || 1.2) * worldScale(I().root)) t = null; }
      if (!t) { if (o.wrong) o.wrong.call(this, hit); return; }
      const fire = () => { t.hits++; if (o.onHit) o.onHit.call(this, t, t.hits); if (t.hits >= t.need) { t.done = true; if (o.onDone) o.onDone.call(this, t); } this.prog = this.list.reduce((a, x) => a + Math.min(x.hits, x.need) / x.need, 0) / this.list.length; if (this.list.every(x => x.done) && !this.fin) { this.fin = true; later(o.delay ?? 500, () => finishStep()); } };
      if (o.strike) toolStrike(fire); else fire();
    },
    markers() { return this.cur().slice(0, o.ordered ? 1 : 12).map(t => ({ pos: this.pos(t), r: t.mr || o.mr || 22, label: t.label, prog: t.need > 1 ? t.hits / t.need : 0 })); },
    skip() { for (const t of this.list) { while (!t.done) { t.hits++; if (o.onHit) o.onHit.call(this, t, t.hits); if (t.hits >= t.need) { t.done = true; if (o.onDone) o.onDone.call(this, t); } } } },
    exit() { this.fin = false; if (o.exit) o.exit.call(this); },
    tut: o.tut || { title: o.name, body: o.hint, demo() { return { type: 'tap', pts: (this.list ? this.cur() : []).slice(0, 4).map(t => this.pos(t)) }; } }
  });
}
