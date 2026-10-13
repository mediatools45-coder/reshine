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

/* ============ 9. inspection hotspots ============ */
export function inspect(o) {
  return base({ kind: 'inspect', 
    input: 'Tap', tool: 'magnify', toolLabel: 'Magnifier', canTurn: true, ...o,
    enter() { this.spots = o.spots().map(s => ({ ...s, done: false })); this.busyI = false; G.chips = []; RIG.spin = o.spin ?? .18; if (o.enter) o.enter.call(this); },
    nodes() { const it = I(); return Object.values(it.parts).filter(p => p.g.visible).flatMap(p => p.meshes); },
    pos(s) { return I().parts[s.key].wp(s.p || [0, 0, 0]); },
    onDown(hit) { if (!hit) return; let best = null, bd = 1e9; for (const s of this.spots) { if (s.done) continue; const d = this.pos(s).distanceTo(hit.point); if (d < bd) { bd = d; best = s; } } if (best && bd < (o.r || 1.6) * worldScale(I().root)) this.look(best); },
    look(s) {
      if (s.done || this.busyI) return; this.busyI = true; s.done = true; sfx('ping'); vib(15); const p = this.pos(s); glints(p, 12, .4); toast((s.label || '') + (s.note ? ': ' + s.note : ''), 1600);
      if (s.onLook) s.onLook(s);
      const keepSpin = RIG.spin; RIG.spin = 0; const gt = CAM.gt.clone(), gd = CAM.gdist; CAM.gt.copy(p); CAM.gdist = gd * .55;
      later(clock.ff ? 0 : 1100, () => { CAM.gt.copy(gt); CAM.gdist = gd; RIG.spin = keepSpin; this.busyI = false; this.prog = this.spots.filter(x => x.done).length / this.spots.length; if (this.spots.every(x => x.done)) finishStep(); });
    },
    markers() { return this.spots.filter(s => !s.done).map(s => ({ pos: this.pos(s), r: 28, label: s.label, tap: () => this.look(s) })); },
    skip() { for (const s of this.spots) { s.done = true; if (s.onLook) s.onLook(s); } },
    exit() { RIG.spin = 0; if (o.exit) o.exit.call(this); },
    tut: o.tut || { title: o.name, body: o.hint, demo() { return { type: 'tap', pts: (this.spots || []).filter(s => !s.done).map(s => this.pos(s)) }; } }
  });
}
