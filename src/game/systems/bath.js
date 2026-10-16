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

/* ============ 10. bath / tank / jar / bowl: drag the object down into liquid, then hold or swirl ============ */
const PROPS = {};
export function container(kind, o = {}) {
  const key = kind + (o.tint || ''); let c = PROPS[key];
  if (!c) {
    c = new THREE.Group(); c.name = 'container:' + kind; const isJar = kind === 'jar', isBowl = kind === 'bowl';
    const W = isJar ? 3.4 : isBowl ? 4.6 : 7.2, D = isJar ? 3.4 : isBowl ? 4.6 : 3.6, H = isJar ? 3.6 : isBowl ? 1.8 : 3.2;
    let shell, liq, top;
    if (isJar || isBowl) {
      const r = W / 2; const prof = isBowl ? [[.01, 0], [r * .62, 0], [r * .9, H * .35], [r, H]] : [[.01, 0], [r * .96, 0], [r, .2], [r, H * .9], [r * .9, H]];
      shell = mesh(lathe(prof, 40), glass(o.glass || '#c4dfe0', .1, { rough: .1, extra: { envMapIntensity: .25 } }), { cast: false });
      liq = mesh(lathe(prof.map(([a, b]) => [Math.max(.01, a * .95), Math.min(b, H * .72)]).concat([[.01, H * .72]]), 40), new THREE.MeshStandardMaterial({ color: o.liquid || '#4a9aa0', transparent: true, opacity: .42, roughness: .2, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: .3 }), { cast: false });
      top = mesh(new THREE.CircleGeometry(r * .93, 40), new THREE.MeshPhysicalMaterial({ color: o.liquid || '#4a9aa0', transparent: true, opacity: .35, roughness: .02, depthWrite: false }), { r: [-Math.PI / 2, 0, 0], p: [0, H * .72, 0], cast: false });
      if (isJar) c.add(mesh(torus(r * .9 + .02, .07, 10, 48), metal('#9aa5ab', .3), { p: [0, H, 0], r: [Math.PI / 2, 0, 0] })); /* open rim: the jar has no lid */
    } else {
      shell = mesh(box(W, H, D), glass(o.glass || '#c4dfe0', .1, { rough: .1, extra: { envMapIntensity: .25 } }), { p: [0, H / 2, 0], cast: false });
      liq = mesh(box(W - .12, H * .74, D - .12), new THREE.MeshPhysicalMaterial({ color: o.liquid || '#3f8c95', transparent: true, opacity: .4, roughness: .05, depthWrite: false }), { p: [0, H * .37 + .06, 0], cast: false });
      top = mesh(new THREE.PlaneGeometry(W - .12, D - .12), new THREE.MeshPhysicalMaterial({ color: o.liquid || '#3f8c95', transparent: true, opacity: .3, roughness: .02, depthWrite: false }), { r: [-Math.PI / 2, 0, 0], p: [0, H * .74 + .06, 0], cast: false });
      c.add(mesh(box(W + .3, .2, D + .3), metal('#38474d', .45), { p: [0, .1, 0] }));
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) c.add(mesh(box(.14, H, .14), metal('#38474d', .45), { p: [sx * W / 2, H / 2, sz * D / 2] }));
    }
    shell.renderOrder = 3; liq.renderOrder = 2; top.renderOrder = 2;
    c.add(shell, liq, top); c.userData = { liq, top, H, W, kind, c0: new THREE.Color(o.liquid || '#4a9aa0'), c1: new THREE.Color(o.murk || '#5a3a1c') };
    c.traverse(m => { if (m.isMesh) m.userData.nofit = true; });
    PROPS[key] = c;
  }
  return c;
}
export function murk(c, k) { const u = c.userData; for (const m of [u.liq, u.top]) { m.material.color.copy(u.c0).lerp(u.c1, k); m.material.opacity = (m === u.top ? .3 : .4) + k * .35; } }
export function bath(o) {
  return base({ kind: 'bath', 
    input: o.swirl ? 'Drag, Circle' : 'Drag, Hold', lockRig: true, ...o, toolLabel: o.toolLabel || ({ tank: 'Cleaning Tank', jar: 'Cleaning Jar', bowl: 'Foam Bowl' }[o.kind || 'tank']),
    enter() {
      this.phase = 'carry'; this.drag = false; this.prog = 0; this.acc = 0; this.needsHold = false; const c = this.c = container(o.kind || 'tank', o); R.scene.add(c);
      const it = I(); it.root.updateMatrixWorld(true); const bb = new THREE.Box3(); it.root.traverse(m => { if (m.isMesh && !m.userData.proxy && m.geometry) { for (let a = m; a; a = a.parent) if (!a.visible) return; m.geometry.computeBoundingBox(); bb.union(m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld)); } });
      const sz = bb.getSize(new THREE.Vector3()), U = c.userData, sc = Math.max(.5, (Math.max(sz.x, sz.z * (U.kind === 'tank' ? 1.9 : 1)) + .9) / U.W), sy = Math.max(.5, (sz.y + .5) / (U.H * .66));
      c.scale.set(sc, sy, sc); c.position.set(STAGE.x, BENCH_Y + .1, STAGE.z + (o.cz || 0)); c.visible = true; murk(c, 0);
      const cTop = c.position.y + U.H * sy, liquid = c.position.y + U.H * .72 * sy, rest = bb.min.y - RIG.off.y;
      this.lift = Math.max(0, cTop + .35 - rest); this.depth = Math.max(.5, (bb.max.y - RIG.off.y + this.lift) - liquid + .15);
      G.offGoal = new THREE.Vector3(0, this.lift, 0); /* frame the raised object together with the container (fitExtra) */
      if (o.startIn) { RIG.off.y = this.lift - this.depth; this.phase = o.swirl ? 'swirl' : 'hold'; this.needsHold = !o.swirl; this.prog = .2; G.ui && G.ui('hold'); }
      else if (clock.ff) RIG.off.y = this.lift; else { const y0 = RIG.off.y; tween(.5, k => { RIG.off.y = lerp(y0, this.lift, k); }); }
       G.fitExtra = [c]; G.chips = [{ label: o.chip || 'Treatment', get: () => this.prog }]; if (o.enter) o.enter.call(this);
    },
    nodes() { const it = I(); if (this.phase === 'clips') return this.clipM.flatMap(g => g.children); return Object.values(it.parts).filter(p => p.g.visible && p.state !== 'tray').flatMap(p => p.meshes); },
    grabAll: false,
    onDown(hit, ray) {
      if (this.phase === 'clips') { if (hit && hit.object.userData.clip != null) this.tapClip(hit.object.userData.clip); return; }
      if (this.phase === 'carry' && hit) { const n = new THREE.Vector3(); R.camera.getWorldDirection(n); this.plane = new THREE.Plane().setFromNormalAndCoplanarPoint(n, hit.point); this.w0 = hit.point.clone(); this.y0 = RIG.off.y; this.drag = true; sfx('click'); }
      else if (this.phase === 'swirl') { this.last = this.ang(ray); }
    },
    ang(ray) { const p = project(this.c.position.clone().add(new THREE.Vector3(0, 1, 0))), w = new THREE.Vector3(); ray.intersectPlane(this.plane || new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), w); const q = project(w); return Math.atan2(q.y - p.y, q.x - p.x); },
    onMove(hit, ray, r) {
      if (this.phase === 'carry' && this.drag) {
        const w = new THREE.Vector3(); if (!ray.intersectPlane(this.plane, w)) return; const y = clamp(this.y0 + (w.y - this.w0.y), this.lift - this.depth, this.lift); RIG.off.y = y; this.prog = (this.lift - y) / this.depth * .2;
        if (y <= this.lift - this.depth * .94) { this.drag = false; this.submerge(); }
      } else if (this.phase === 'swirl' && r) {
        const c = project(this.c.position.clone().add(new THREE.Vector3(0, 1.2, 0))), a = Math.atan2(r.y - c.y, r.x - c.x); if (this.last == null) { this.last = a; return; }
        let d = a - this.last; if (d > Math.PI) d -= Math.PI * 2; else if (d < -Math.PI) d += Math.PI * 2; this.last = a; this.acc += Math.abs(d);
        RIG.extraQ.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), d * 1.3));
        const k = clamp(this.acc / (Math.PI * 2 * (o.turns || 2.5)), 0, 1); this.prog = .2 + .8 * k; murk(this.c, k * .85); if (o.onProg) o.onProg.call(this, k);
        if (Math.random() < .5) bubbles(this.c.position.clone().add(new THREE.Vector3(rnd(-1.4, 1.4), .4, rnd(-.6, .6))), 1, .1, 1); sfx('bubble', 90); if (Math.random() < .2) foam(this.c.position.clone().add(new THREE.Vector3(rnd(-1, 1), this.c.userData.H * .72 * this.c.scale.y, rnd(-.5, .5))), 1);
        if (k >= 1) this.done_();
      }
    },
    onUp() { if (this.phase === 'carry' && this.drag) { this.drag = false; const y0 = RIG.off.y; tween(.3, k => { RIG.off.y = lerp(y0, this.lift, k); }); this.prog = 0; } this.last = null; },
    submerge() {
      sfx('splash'); camImpulse(.5); vib(25); const top = this.c.position.clone().add(new THREE.Vector3(0, this.c.userData.H * .72 * this.c.scale.y, 0)); bubbles(top, 14, 1.2, 1.4); foam(top, 10);
      if (o.dipOnly) { this.prog = 1; this.phase = 'done'; later(600, () => finishStep()); return; }
      if (o.clips) { this.phase = 'clips'; this.prog = .2; this.clipsOn = [false, false]; this.mkClips(); toast('Clip on the red and the black lead'); return; }
      this.phase = o.swirl ? 'swirl' : 'hold'; this.needsHold = !o.swirl; this.prog = .2; toast(o.swirl ? 'Swirl in circles to clean' : 'Hold the button to run the treatment'); G.ui && G.ui('hold');
    },
    mkClips() {
      if (!this.clipM) { this.clipM = [0, 1].map(i => { const g = new THREE.Group(); g.add(mesh(rbox(.5, .7, .4, .08), plastic(i ? '#1b1b1d' : '#d33a2a', .45))); g.add(mesh(cyl(.05, .05, 2.2, 6), plastic(i ? '#1b1b1d' : '#d33a2a', .5), { p: [0, 1.4, 0] })); g.userData.clip = i; g.traverse(m => { if (m.isMesh) { m.userData.clip = i; m.userData.nofit = true; } }); return g; }); }
      const c = this.c, U = c.userData; this.clipM.forEach((g, i) => { c.add(g); g.position.set((i ? 1 : -1) * U.W * .38, U.H + .9, 0); g.scale.set(1 / c.scale.x, 1 / c.scale.y, 1 / c.scale.z); g.visible = true; });
    },
    tapClip(i) {
      if (this.clipsOn[i]) return; this.clipsOn[i] = true; const g = this.clipM[i], U = this.c.userData; sfx('click'); sfx('ping'); vib(15);
      tween(.3, k => { g.position.y = lerp(U.H + .9, U.H + .1, k); }); sparks(g.getWorldPosition(new THREE.Vector3()), 8); this.prog = .2 + this.clipsOn.filter(Boolean).length * .05;
      if (this.clipsOn.every(Boolean)) { this.phase = 'hold'; this.needsHold = true; G.ui && G.ui('hold'); toast('Hold the button to run the treatment'); }
    },
    update(dt) {
      if (this.phase !== 'hold' || !G.hold) return;
      this.prog = Math.min(1, this.prog + dt / (o.time || 3.4) * .8); const k = clamp((this.prog - .2) / .8, 0, 1); murk(this.c, k * .85); if (o.onProg) o.onProg.call(this, k);
      if (Math.random() < dt * 40) bubbles(G.item.root.position.clone().add(new THREE.Vector3(rnd(-1.5, 1.5), -.3, rnd(-.5, .5))), 1, .05, 1.1); sfx(o.snd || 'zap', 90); G.shake = Math.max(G.shake, .08); setLoopOnce();
      if (this.prog >= 1) this.done_();
    },
    done_() {
      if (this.phase === 'done') return; this.phase = 'done'; this.needsHold = false; G.hold = false; G.ui && G.ui('hold'); sfx('chime'); if (o.onDone) o.onDone.call(this);
      if (o.stay) { later(500, () => finishStep()); return; }
      const y0 = RIG.off.y; G.busy = true; tween(clock.ff ? 0 : .9, k => { RIG.off.y = lerp(y0, 0, k); }, () => { G.busy = false; drops(G.item.root.position, 12); finishStep(); });
    },
    markers() { if (this.phase === 'clips') return this.clipM.filter((g, i) => !this.clipsOn[i]).map(g => ({ pos: g.getWorldPosition(new THREE.Vector3()), r: 30, label: 'Tap' })); if (this.phase === 'carry' && !this.drag) return [{ pos: G.item.root.position.clone(), r: 40, label: 'Drag down' }]; if (this.phase === 'swirl') return [{ pos: this.c.position.clone().add(new THREE.Vector3(0, 1.2, 0)), r: 50, label: 'Swirl' }]; return []; },
    skip() { if (o.onProg) o.onProg.call(this, 1); if (o.onDone) o.onDone.call(this); if (!o.stay) RIG.off.y = 0; },
    exit() { if (this.clipM) for (const g of this.clipM) g.visible = false; if (o.stay) { this.needsHold = false; G.offGoal = null; if (o.exit) o.exit.call(this); return; } RIG.off.y = 0; G.offGoal = null; RIG.extraQ.identity(); this.needsHold = false; if (this.c) this.c.visible = false; G.fitExtra = []; if (o.exit) o.exit.call(this); },
    tut: o.tut || { title: o.name, body: o.hint, demo() { if (this.phase === 'swirl') return { type: 'circle', pts: [this.c.position.clone().add(new THREE.Vector3(0, 1.2, 0))] }; const a = G.item.root.position.clone(); return { type: 'drag', pts: [a, a.clone().add(new THREE.Vector3(0, -(this.depth || 2.6), 0))] }; } }
  });
}
function setLoopOnce() { }
