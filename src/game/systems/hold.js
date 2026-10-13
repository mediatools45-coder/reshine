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

/* ============ 6. hold the tool on target spots (grinder, buffer, heat, straighten, vacuum) ============ */
export function hold(o) {
  return base({ kind: 'hold', grabAll: true, 
    input: 'Hold', ...o, toolLabel: o.toolLabel || toolName(o.tool),
    enter() { this.spots = o.spots().map(s => ({ r: .55, ...s, hp: 1, done: false })); this.down = false; G.chips = [{ label: o.chip || 'Spots', get: () => this.prog }]; if (o.enter) o.enter.call(this); },
    nodes() { const it = I(); return (o.parts ? o.parts() : Object.keys(it.parts)).flatMap(k => it.parts[k].g.visible ? it.parts[k].meshes : []); },
    onDown() { this.down = true; T.spinning = !!o.spin; },
    onUp() { this.down = false; T.spinning = false; },
    pos(s) { return I().parts[s.key].wp(s.p); },
    update(dt) {
      let sum = 0; T.spinning = this.down && !!o.spin;
      for (const s of this.spots) {
        if (!s.done && this.down && T.onSurf && T.hitPt) {
          const p = this.pos(s), sc = worldScale(I().root);
          if (T.hitPt.distanceTo(p) < s.r * sc * 1.25) {
            s.hp -= dt / (o.time || 1.2); const fx = o.fx || 'sparks';
            if (fx === 'sparks') sparks(T.hitPt, 3, [rnd(-1, 1), 0, rnd(-1, 1)]); else if (fx === 'glint') { if (Math.random() < .3) glints(T.hitPt, 1, .2); } else if (fx === 'dust') { if (Math.random() < .5) dust(T.hitPt, 1); } else if (fx === 'heat') { if (Math.random() < .3) puff(T.hitPt, [.5, .45, .4], 1, { a: .25 }); }
            sfx(o.snd || 'grind', 60); G.shake = Math.max(G.shake, o.shake ?? .2); vib(6);
            if (s.onProg) s.onProg(1 - Math.max(0, s.hp), s); if (o.onProg) o.onProg.call(this, s, 1 - Math.max(0, s.hp));
            if (s.hp <= 0) { s.done = true; sfx('ping'); glints(p, 8, .25); if (s.onDone) s.onDone(s); if (o.onSpot) o.onSpot.call(this, s); }
          }
        }
        sum += s.done ? 1 : 1 - Math.max(0, s.hp);
      }
      this.prog = sum / this.spots.length; if (this.spots.every(s => s.done) && !this.fin) { this.fin = true; finishStep(); }
    },
    markers() { return this.spots.filter(s => !s.done).map(s => ({ pos: this.pos(s), r: o.mr || 26, prog: 1 - s.hp, label: s.label })); },
    skip() { for (const s of this.spots) { if (!s.done) { s.done = true; if (s.onProg) s.onProg(1, s); if (o.onProg) o.onProg.call(this, s, 1); if (s.onDone) s.onDone(s); if (o.onSpot) o.onSpot.call(this, s); } } },
    exit() { this.fin = false; T.spinning = false; if (o.exit) o.exit.call(this); },
    tut: o.tut || { title: o.name, body: o.hint, demo() { const s = this.spots && this.spots.find(x => !x.done); return s ? { type: 'hold', pts: [this.pos(s)] } : null; } }
  });
}
