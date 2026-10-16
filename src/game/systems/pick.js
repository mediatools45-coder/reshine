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

/* ============ 2. pick chunks (tap / scratch until they break) or grab debris (tap -> lifts out) ============ */
export function pick(o) {
  return base({ kind: 'pick', grabAll: true, 
    input: o.grab ? 'Tap' : 'Scratch', ...o, toolLabel: o.toolLabel || toolName(o.tool),
    enter() { this.list = o.items(); for (const c of this.list) { c.hp = c.hp0 ?? 1; c.gone = false; c.m.visible = true; } if (o.enter) o.enter.call(this); G.chips = [{ label: o.chip || 'Pieces', get: () => this.prog }]; this.last = null; },
    nodes() { return this.list.filter(c => !c.gone).map(c => c.m).concat((o.extraNodes ? o.extraNodes() : [])); },
    assist(x, y) { let best = null, bd = 46; for (const c of this.list) { if (c.gone) continue; const w = c.m.getWorldPosition(new THREE.Vector3()), q = project(w); if (!q.ok) continue; const d = Math.hypot(q.x - x, q.y - y); if (d < bd) { bd = d; best = { object: c.m, point: w, face: { normal: new THREE.Vector3(0, 1, 0) } }; } } return best; },
    chunkOf(hit) { return hit && this.list.find(c => c.m === hit.object && !c.gone); },
    onDown(hit) { this.last = hit ? hit.point.clone() : null; const c = this.chunkOf(hit); if (!c) return; if (o.grab) { this.grab(c); return; } if (o.hammer) { toolStrike(() => this.damage(c, o.tapDmg || .34, hit.point)); return; } this.damage(c, o.tapDmg || .25, hit.point); sfx('scrape'); },
    onMove(hit) { if (!hit) { this.last = null; return; } const c = this.chunkOf(hit); if (c && this.last && !o.grab && !o.hammer) { const d = hit.point.distanceTo(this.last); if (d > .004) { this.damage(c, d * (o.scr || 1.1) / Math.max(.3, c.size || .3), hit.point); sfx('scrape', 70); } } this.last = hit.point.clone(); },
    onUp() { this.last = null; },
    damage(c, amt, pt) {
      if (c.gone) return; c.hp -= amt; c.m.scale.set(1 + rnd(-.08, .08), 1 + rnd(-.12, .12), 1 + rnd(-.08, .08)).multiplyScalar(c.s0 || 1);
      if (Math.random() < .5) debris(pt, 2, o.col || [.4, .17, .07]); puff(pt, o.puff || [.5, .26, .12], 1, { a: .4 }); vib(8);
      if (c.hp <= 0) this.breakIt(c);
      this.recalc();
    },
    breakIt(c) {
      c.gone = true; c.m.visible = false; const wp = c.m.getWorldPosition(new THREE.Vector3());
      debris(wp, 16, o.col || [.4, .17, .07]); flakes(wp, 10, o.col || [.55, .24, .08]); puff(wp, o.puff || [.5, .26, .12], 5, { a: .5 }); sfx('crack'); camImpulse(.5); vib(25);
      if (c.surf && c.p) c.surf.dab(c.p, c.n, (c.size || .3) * 1.7, o.layer || 'crust', 'sub', 1); if (o.onBreak) o.onBreak.call(this, c);
    },
    grab(c) {
      if (c.busy) return; c.busy = true; sfx('click'); const m = c.m, w0 = m.getWorldPosition(new THREE.Vector3()), home = { par: m.parent, p: m.position.clone(), q: m.quaternion.clone(), s: m.scale.clone() }; R.scene.attach(m);
      const f = new THREE.Vector3(); R.camera.getWorldDirection(f); const side = new THREE.Vector3().crossVectors(f, R.camera.up).normalize();
      const dest = R.camera.position.clone().addScaledVector(f, 6).addScaledVector(R.camera.up, -2.6).addScaledVector(side, rnd(-1.2, 1.2)), s0 = m.scale.x;
      puff(w0, o.puff || [.5, .45, .38], 3, { a: .35 });
      tween(.75, k => { m.position.lerpVectors(w0, dest, k); m.position.y += Math.sin(k * Math.PI) * 1.2; m.rotation.x += .1; m.scale.setScalar(s0 * (1 - k * .7)); }, () => { m.visible = false; c.gone = true; sfx('pop'); c.busy = false; /* put the hidden piece back in its slot so a later step that shows it again finds it in place */ home.par.add(m); m.position.copy(home.p); m.quaternion.copy(home.q); m.scale.copy(home.s); this.recalc(); }, ease);
      if (c.surf && c.p) c.surf.dab(c.p, c.n, (c.size || .3) * 1.4, o.layer || 'dirt', 'sub', .8);
    },
    recalc() { const n = this.list.length; this.prog = this.list.reduce((a, c) => a + (c.gone ? 1 : Math.max(0, 1 - Math.max(0, c.hp)) * .8), 0) / n; if (this.list.every(c => c.gone) && !this.done_) { this.done_ = true; later(350, () => finishStep()); } },
    markers() { return this.list.filter(c => !c.gone && !c.busy).map(c => ({ pos: c.m.getWorldPosition(new THREE.Vector3()), r: o.mr || 22, prog: o.grab ? 0 : 1 - Math.max(0, c.hp), vis: facing(c.m, c.n) })); },
    skip() { for (const c of this.list) { if (!c.gone) { c.gone = true; c.m.visible = false; if (c.surf && c.p) c.surf.dab(c.p, c.n, (c.size || .3) * 1.7, o.layer || 'crust', 'sub', 1); } } },
    exit() { this.done_ = false; for (const c of this.list) c.m.visible = false; if (o.exit) o.exit.call(this); }
  });
}
