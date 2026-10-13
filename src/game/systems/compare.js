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

/* ============ 13. before / after comparison ============ */
export function compare(o = {}) {
  return base({ kind: 'compare', 
    id: 'compare', name: 'Before and After', input: 'Drag', tool: 'none', toolLabel: 'Slider', canTurn: true, compare: true, cam: { preset: 'show' },
    hint: 'Drag the slider across to compare the object you started with against your restoration.', done: 'Fully restored', ...o,
    enter() { this.prog = 0; this.mn = .5; this.mx = .5; G.cmp = .5; this.canFinish = false; G.chips = []; if (o.enter) o.enter.call(this); },
    setX(x) { G.cmp = clamp(x, .04, .96); this.mn = Math.min(this.mn, G.cmp); this.mx = Math.max(this.mx, G.cmp); this.prog = clamp((.5 - this.mn) / .32, 0, 1) * .5 + clamp((this.mx - .5) / .32, 0, 1) * .5; if (this.mn < .2 && this.mx > .8 && !this.canFinish) { this.canFinish = true; sfx('ping'); toast('What a transformation!'); G.ui && G.ui('finishBtn'); } },
    skip() { }, exit() { G.cmp = .5; },
    tut: { title: 'See the difference', body: 'Drag the divider left and right to compare the object you started with against your restoration. You can still rotate it.', demo() { return { type: 'slide' }; } }
  });
}
