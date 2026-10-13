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

/* ============ 12. open/close mechanism cycles (slide or hinge), by drag or tap ============ */
export function cycle(o) {
  return base({ kind: 'cycle', 
    input: 'Drag / Tap', lockRig: true, ...o, toolLabel: o.toolLabel || 'Bare Hands',
    enter() { this.t = 0; this.open = false; this.count = 0; this.anim = false; this.half = false; G.chips = [{ label: o.chip || 'Cycles', get: () => this.prog }]; this.apply(0); if (o.enter) o.enter.call(this); },
    nodes() { const it = I(); return (o.grip || [o.key]).flatMap(k => it.parts[k].pickables()); },
    apply(t) { this.t = t; o.set.call(this, t); },
    tip(t) { const s = this.t; this.apply(t); I().root.updateMatrixWorld(true); const w = I().parts[o.key].wp(o.tip); this.apply(s); return w; },
    onDown(hit, ray, r) { if (this.anim || this.fin) return; this.d0 = { x: r.x, y: r.y, t: this.t, moved: 0 }; const a = project(this.tip(0)), b = project(this.tip(1)); this.seg = { ax: a.x, ay: a.y, bx: b.x, by: b.y }; },
    onMove(hit, ray, r) {
      if (!this.d0 || this.anim) return; this.d0.moved = Math.hypot(r.x - this.d0.x, r.y - this.d0.y);
      const s = this.seg, vx = s.bx - s.ax, vy = s.by - s.ay, L2 = vx * vx + vy * vy || 1, dt = ((r.x - this.d0.x) * vx + (r.y - this.d0.y) * vy) / L2;
      this.apply(clamp(this.d0.t + dt, 0, 1)); if (Math.random() < .1) sfx(o.snd || 'scrape', 120); this.check();
    },
    onUp() { if (!this.d0) return; const tap = this.d0.moved < 10; this.d0 = null; if (tap && !this.anim) this.toggle(); else if (!this.anim) { const tgt = this.t > .5 ? 1 : 0; const t0 = this.t; this.anim = true; tween(.2, k => this.apply(lerp(t0, tgt, k)), () => { this.anim = false; this.check(); }); } },
    toggle() { const tgt = this.t > .5 ? 0 : 1, t0 = this.t; this.anim = true; tween(o.dur || .45, k => this.apply(lerp(t0, tgt, k)), () => { this.anim = false; this.check(); }); },
    check() {
      if (this.t >= .97 && !this.open) { this.open = true; sfx(o.openSnd || 'click'); if (o.onOpen) o.onOpen.call(this); this.half = true; }
      else if (this.t <= .03 && this.open) { this.open = false; sfx(o.closeSnd || 'latch'); vib(15); if (o.onClose) o.onClose.call(this); if (this.half) { this.count++; this.half = false; glints(I().parts[o.key].wp(o.tip), 6, .3); } }
      this.prog = Math.min(1, (this.count + (this.open ? .5 : 0)) / (o.cycles || 2));
      if (this.count >= (o.cycles || 2) && !this.fin) { this.fin = true; later(400, () => finishStep()); }
    },
    markers() { return this.fin || this.anim || this.d0 ? [] : [{ pos: this.tip(this.t), r: 34, label: this.open ? (o.closeLabel || 'Close') : (o.openLabel || 'Open') }]; },
    skip() { this.apply(0); this.count = o.cycles || 2; },
    exit() { this.apply(0); this.fin = false; if (o.exit) o.exit.call(this); },
    tut: o.tut || { title: o.name, body: o.hint, demo() { return { type: 'drag', pts: [this.tip(this.t > .5 ? 1 : 0), this.tip(this.t > .5 ? 0 : 1)] }; } }
  });
}
