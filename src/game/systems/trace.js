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

/* ============ 7. trace a highlighted seam/crack: a bead of filler grows along the path ============ */
export function trace(o) {
  return base({ kind: 'trace', grabAll: true, 
    input: 'Trace', lockRig: true, ...o, toolLabel: o.toolLabel || toolName(o.tool || 'filler'),
    enter() {
      const it = I(); this.paths = o.paths().map(p => ({ ...p, cur: 0 }));
      for (const p of this.paths) {
        if (!p.bead) { const P = it.parts[p.key], curve = new THREE.CatmullRomCurve3(p.pts.map(v => new THREE.Vector3(...v))); p.curve = curve; const g = new THREE.TubeGeometry(curve, 64, o.width || .05, 8, false); p.bead = mesh(g, mat(o.bead || '#d9c7a0', { roughness: .5 }), { cast: false }); p.bead.userData.nofit = true; P.g.add(p.bead); p.seg = 64; p.rad = 8; p.samples = curve.getSpacedPoints(80); }
        p.bead.visible = true; p.bead.geometry.setDrawRange(0, 0); p.cur = 0;
      }
      G.chips = [{ label: o.chip || 'Seams', get: () => this.prog }]; if (o.enter) o.enter.call(this);
    },
    nodes() { const it = I(); return [...new Set(this.paths.map(p => p.key))].flatMap(k => it.parts[k].meshes); },
    onDown(hit) { this.track(hit); }, onMove(hit) { this.track(hit); },
    track(hit) {
      if (!hit) return; let did = false;
      for (const p of this.paths) {
        if (p.cur >= 1) continue; const P = I().parts[p.key], l = P.g.worldToLocal(hit.point.clone()); let bi = -1, bd = 1e9;
        p.samples.forEach((s, i) => { const d = s.distanceTo(l); if (d < bd) { bd = d; bi = i; } });
        const t = bi / (p.samples.length - 1), tol = (o.tol || .45) / (worldScale(P.g) / worldScale(I().root));
        if (bd < tol && t <= p.cur + .16) { const nc = Math.max(p.cur, t); if (nc > p.cur) { p.cur = nc >= .96 ? 1 : nc; did = true; this.grow(p); } }
      }
      if (did) { sfx(o.snd || 'soap', 80); if (Math.random() < .5) drops(hit.point, 1, o.dropCol || [.85, .78, .62]); }
      this.prog = this.paths.reduce((a, p) => a + p.cur, 0) / this.paths.length;
      if (this.paths.every(p => p.cur >= 1) && !this.fin) { this.fin = true; sfx('ping'); later(400, () => finishStep()); }
    },
    grow(p) { p.bead.geometry.setDrawRange(0, Math.floor(p.cur * p.seg) * p.rad * 6); if (o.onGrow) o.onGrow.call(this, p); if (p.cur >= 1 && o.onPath) o.onPath.call(this, p); },
    markers() { const out = []; for (const p of this.paths) { if (p.cur >= 1) continue; const P = I().parts[p.key], i = Math.min(p.samples.length - 1, Math.round(p.cur * (p.samples.length - 1))); out.push({ pos: P.g.localToWorld(p.samples[i].clone()), r: 20, label: p.cur < .01 ? 'Start' : '' }); out.push({ pos: P.g.localToWorld(p.samples[p.samples.length - 1].clone()), r: 12 }); } return out; },
    skip() { for (const p of this.paths) { p.cur = 1; this.grow(p); } },
    exit() { this.fin = false; if (o.keepBead !== true) for (const p of this.paths) p.bead.visible = false; if (o.exit) o.exit.call(this); },
    tut: o.tut || { title: o.name, body: o.hint, demo() { const p = this.paths && this.paths.find(x => x.cur < 1); if (!p) return null; const P = I().parts[p.key]; return { type: 'drag', pts: [P.g.localToWorld(p.samples[0].clone()), P.g.localToWorld(p.samples[p.samples.length - 1].clone())] }; } }
  });
}
