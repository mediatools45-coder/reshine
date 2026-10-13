import * as THREE from 'three';
import { G, RIG, CAM, STAGE, finishStep, turnItem, isTurned, camImpulse, setView, st } from '../game.js';
import { R, project } from '../../render/engine.js';
import { T, toolStrike } from '../../assets/tools.js';
import { sfx } from '../../fx/audio.js';
import { puff, flakes, debris, sparks, bubbles, foam, glints, drops, grains, dust, emit } from '../../fx/particles.js';
import { clamp, lerp, rnd, tween, later, clock, vib, moveTo, smooth, ease } from '../../core/util.js';
import { glass, mat, metal, cyl, box, rbox, mesh, lathe, torus, plastic } from '../../assets/geo.js';
import { BENCH_Y } from '../../render/studio.js';
import { refineReach } from '../../render/visibility.js';
import { I, toast, worldScale, lp, base, toolName, FX, facing, stage } from './common.js';

/* ============ 1. paint / clean / coat a surface layer ============ */
export function paint(o) {
  const S = base({ kind: 'paint', grabAll: true, 
    input: o.input || 'Scrub', canTurn: o.turn !== false && o.canTurn !== false, tool: o.tool, toolLabel: o.toolLabel || toolName(o.tool),
    ...o,
    enter() {
      const it = I(); this.tasks = []; this.prev = null; this.sq = 0; this.adv = false; this.warnT = 0; this.atT = -9; this.pa = null;
      if (o.enter) o.enter.call(this);
      const keys = typeof o.parts === 'function' ? o.parts() : o.parts;
      this.keys = keys;
      for (const k of keys) {
        const p = it.parts[k]; if (!p || !p.surf) continue;
        const t = p.surf.task(o.layer, o.mode || 'sub', { region: o.region ? (P, c) => o.region(P, c, k) : null, faces: o.faces === undefined ? [4, 5] : o.faces, done: o.doneV, need: o.need, to: o.to });
        t.key = k; t.part = p; if (t.n > 0) this.tasks.push(t);
      }
      if (o.seq) { this.groups = o.seq.map(g => ({ label: g.label, keys: g.keys, L: g.layout })); this.showGroup(0, true); }
      G.chips = this.groups ? this.groups.map((g, i) => ({ label: g.label, get: () => this.groupFrac(i) })) : (o.chips || []).map(c => ({ label: c.label, get: () => this.fracOf(c.keys) }));
      if (!this.tasks.length) later(300, () => { if (st() === this) finishStep(); });
      else this.reach();
    },
    /* once parts have settled, drop texels the brush can never touch (covered by other parts) */
    reach() { if (clock.ff) return; later(850, () => { if (st() !== this || this.fin || G.finishing) return; try { refineReach(I(), this.tasks.filter(t => t.part.g.visible)); } catch (e) { console.error(e); } this.check(); }); },
    showGroup(i, instant) {
      const it = I(), g = this.groups[i]; this.sq = i; if (typeof g.L === 'function') g.L = g.L(it);
      for (const gr of this.groups) for (const k of gr.keys) if (!g.keys.includes(k)) it.hide(k);
      for (const k of g.keys) { const L = g.L && g.L[k]; if (L) it.layout(k, L, instant || clock.ff ? 0 : .5); else it.home(k, instant || clock.ff ? 0 : .4); }
      if (!instant) { later(60, () => setView(this.cam || { preset: 'full' })); this.reach(); }
    },
    groupFrac(i) { return this.fracOf(this.groups[i].keys); },
    fracOf(keys) { let d = 0, n = 0; for (const t of this.tasks) if (keys.includes(t.key)) { d += t.frac() * t.n; n += t.n; } return n ? d / n : 1; },
    nodes() { const it = I(), ks = this.groups ? this.groups[this.sq].keys : this.keys; return ks.flatMap(k => it.parts[k] ? it.parts[k].meshes : []); },
    onDown(hit) { this.prev = null; this.apply(hit); },
    onMove(hit) { this.apply(hit); },
    onUp() { this.prev = null; later(250, () => { if (st() === this) this.autoTurn(); }); },
    apply(hit) {
      if (!hit || !hit.object.userData.part || !hit.object.userData.part.surf) { this.prev = null; return; }
      const part = hit.object.userData.part, surf = part.surf; if (!this.keys.includes(part.key)) return;
      const lp_ = part.g.worldToLocal(hit.point.clone()), wq = part.g.getWorldQuaternion(new THREE.Quaternion()).invert();
      const n = (T.nrm ? T.nrm.clone() : hit.face.normal.clone().transformDirection(hit.object.matrixWorld)).applyQuaternion(wq).normalize();
      const sc = worldScale(part.g) / worldScale(I().root), rad = (o.rad || .4) / sc;
      let pts = [lp_];
      if (this.prev && this.prev.part === part) { const d = lp_.distanceTo(this.prev.p), N = Math.min(12, Math.ceil(d / (rad * .45))); pts = []; for (let i = 1; i <= N; i++) pts.push(this.prev.p.clone().lerp(lp_, i / N)); }
      let k = 1;
      if (this.prev && this.prev.part === part) {
        const dv = lp_.clone().sub(this.prev.p), dl = dv.length();
        if (o.dir && dl > 1e-4) { const a = Math.abs(dv.dot(new THREE.Vector3(...o.dir).normalize())) / dl; if (a < .6) { k = .15; if (G.time - this.warnT > 2.5) { this.warnT = G.time; toast(o.dirHint || 'Follow the grain: long strokes'); } } }
        if (o.circles && dl > 1e-4) { const d2 = dv.normalize(); if (this.pa) { const dot = clamp(d2.dot(this.pa), -1, 1); k = .35 + .9 * (1 - dot) / 2; } this.pa = d2; }
        if (dl < 1e-4 && !o.still) k = o.stillK ?? .25;
      }
      this.prev = { part, p: lp_ };
      let moved = 0;
      for (const q of pts) {
        moved += surf.dab(q, n, rad, o.layer, o.mode || 'sub', (o.amt || .45) * k, o.target);
        for (const a of o.also || []) moved += surf.dab(q, n, rad * (a.rs || 1), a.layer, a.mode || 'sub', (a.amt || .45) * k, a.target);
      }
      /* effects follow what was really removed: a clean spot gives no more dust */
      const fxk = clamp(moved / 6, 0, 1), fx = FX[o.fx || 'rust'];
      if (fx && fxk > .04 && Math.random() < .35 + fxk) fx(hit.point, k * fxk);
      if (fxk > .02) sfx(o.snd || 'brush', o.sndGap || 70); else sfx(o.snd || 'brush', (o.sndGap || 70) * 3);
      if (o.onDab) o.onDab.call(this, hit, part, k);
      this.check();
    },
    autoTurn() {
      if (!G.autoTurn || !this.canTurn || RIG.flipping || G.busy || G.finishing || G.down || G.time - this.atT < 2.5) return;
      const camDir = new THREE.Vector3().subVectors(R.camera.position, CAM.t).normalize(); let fd = 0, fn = 0, bd = 0, bn = 0;
      for (const t of this.tasks) {
        if (!t.part.g.visible) continue; const fc = t.fracCells(), q = t.part.g.getWorldQuaternion(new THREE.Quaternion());
        for (let c = 0; c < 6; c++) { if (!fc[c * 2 + 1]) continue; const nv = new THREE.Vector3(); nv.setComponent(c >> 1, c % 2 ? -1 : 1); nv.applyQuaternion(q); const dd = nv.dot(camDir); if (dd > .35) { fd += fc[c * 2]; fn += fc[c * 2 + 1]; } else if (dd < -.35) { bd += fc[c * 2]; bn += fc[c * 2 + 1]; } }
      }
      if (fn && bn && fd / fn >= .8 && bd / bn < .7) { this.atT = G.time; toast('Great! Turning it over…', 1500); later(400, () => { if (st() === this && !G.down && !G.finishing) turnItem(); }); }
    },
    check() {
      const req = Math.min(o.req ?? .8, .8); /* every cleaning step ends at 80% coverage */
      if (this.groups) {
        const i = this.sq, f = this.groupFrac(i); let tot = 0; this.groups.forEach((g, j) => { tot += j < i ? 1 : j === i ? Math.min(1, f / req) : 0; }); this.prog = tot / this.groups.length;
        this.autoTurn();
        if (f >= req && !this.adv) {
          this.adv = true; sfx('ping'); for (const t of this.tasks) if (this.groups[i].keys.includes(t.key)) t.complete(.5);
          if (i >= this.groups.length - 1) { this.prog = 1; this.finish(); return; }
          later(450, () => { if (st() !== this) return; this.adv = false; this.showGroup(i + 1); RIG.home = true; });
        }
        return;
      }
      let d = 0, n = 0; for (const t of this.tasks) { d += t.frac() * t.n; n += t.n; } const f = n ? d / n : 1; this.prog = Math.min(1, f);
      if (o.onTick) o.onTick.call(this, this.prog);
      this.autoTurn();
      if (f >= req) this.finish();
    },
    finish() { if (this.fin) return; this.fin = true; for (const t of this.tasks) t.complete(.6); for (const t of this.tasks) for (const a of o.also || []) if (a.finish) t.surf.fade(a.layer, a.finish, .6); if (o.onDone) o.onDone.call(this); finishStep(); },
    skip() { for (const t of this.tasks) t.complete(0); for (const t of this.tasks) { t.surf.finishFades(); for (const a of o.also || []) if (a.finish != null) t.surf.setLayer(a.layer, a.finish); } if (o.onTick) o.onTick.call(this, 1); if (o.onDone) o.onDone.call(this); if (this.groups) this.showGroup(this.groups.length - 1, true); },
    exit() { this.fin = false; if (o.exit) o.exit.call(this); },
    markers() { return []; }
  });
  return S;
}
