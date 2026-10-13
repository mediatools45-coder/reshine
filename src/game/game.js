/* game state, object rig + camera rig, step manager, input routing */
import * as THREE from 'three';
import { R, raycast, rayAt, project } from '../render/engine.js';
import { aimLights } from '../render/lighting.js';
import { T, setTool, toolAim, updateTool } from '../assets/tools.js';
import { sfx, setLoop } from '../fx/audio.js';
import { glints, clearParticles, P as PART } from '../fx/particles.js';
import { clamp, lerp, ease, tween, later, clock, cancelAll, vib, store } from '../core/util.js';
import { Item } from './item.js';

export const STAGE = new THREE.Vector3(0, .2, 0);
export const G = {
  mode: 'boot', level: null, item: null, before: null, steps: [], step: -1, finishing: false, busy: false, down: false, hold: false,
  paused: false, time: 0, shake: 0, autoTurn: true, chips: [], cmp: .5, flags: {}, log: []
};
export const HOOK = { ui: null, complete: null }; /* filled by ui.js / main.js */

/* ---------------- object rig ---------------- */
export const RIG = { q: new THREE.Quaternion(), w: new THREE.Vector3(), home: true, drag: false, flip: 0, flipA: 0, flipB: 0, flipT: 1, flipping: false, lift: 0, off: new THREE.Vector3(), spin: 0, pose: [0, 0], extraQ: new THREE.Quaternion(), shakeQ: 0 };
export function homeQuat(pose = RIG.pose) { const roll = (pose[2] || 0) + (R.camera && R.camera.aspect < .9 && G.level && G.level.portraitRoll && !RIG.noRoll ? G.level.portraitRoll : 0); return new THREE.Quaternion().setFromEuler(new THREE.Euler(pose[1], pose[0], roll, 'YXZ')); }
function turnAxis() { const a = (G.level && G.level.turnAxis) || 'y'; return a === 'x' ? new THREE.Vector3(1, 0, 0) : a === 'z' ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0); }
export function isTurned() { return Math.cos(RIG.flip) < 0; }
export function turnItem(cb) {
  if (RIG.flipping) return false;
  RIG.flipping = true; RIG.flipT = 0; RIG.flipA = RIG.flip; RIG.flipB = RIG.flip + Math.PI; RIG.cb = cb || null; sfx('whoosh');
  if (clock.ff) { RIG.flip = RIG.flipB; RIG.flipping = false; if (cb) cb(); }
  return true;
}
export function faceFront(instant) { const t = Math.round(RIG.flip / (Math.PI * 2)) * Math.PI * 2; if (instant || clock.ff) { RIG.flip = t; return; } const f0 = RIG.flip; if (Math.abs(f0 - t) > .01) tween(.45, k => { RIG.flip = lerp(f0, t, k); }); }
function updateRig(dt) {
  if (RIG.flipping) {
    RIG.flipT = Math.min(1, RIG.flipT + dt / .8); const t = ease(RIG.flipT); RIG.flip = lerp(RIG.flipA, RIG.flipB, t); RIG.lift = Math.sin(Math.PI * RIG.flipT) * .9;
    if (RIG.flipT >= 1) { RIG.flipping = false; RIG.lift = 0; sfx('thud'); if (RIG.cb) { const f = RIG.cb; RIG.cb = null; f(); } }
  }
  const hq = homeQuat();
  if (RIG.home) { const k = 1 - Math.exp(-5 * dt); RIG.q.slerp(hq, k); RIG.w.set(0, 0, 0); if (RIG.q.angleTo(hq) < .002) RIG.home = false; }
  else if (!RIG.drag) {
    if (RIG.spin) RIG.q.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), RIG.spin * dt));
    const m = RIG.w.length(); if (m > .002) { RIG.q.premultiply(new THREE.Quaternion().setFromAxisAngle(RIG.w.clone().normalize(), m * dt)); RIG.w.multiplyScalar(Math.exp(-3.2 * dt)); } else RIG.w.set(0, 0, 0);
  }
  const it = G.item; if (!it) return;
  const bob = Math.sin(G.time * 1.1) * .02;
  it.root.position.copy(STAGE).add(RIG.off); it.root.position.y += RIG.lift + bob;
  it.root.quaternion.copy(RIG.q).multiply(new THREE.Quaternion().setFromAxisAngle(turnAxis(), RIG.flip)).multiply(RIG.extraQ);
  if (G.before) { G.before.root.position.copy(it.root.position); G.before.root.quaternion.copy(it.root.quaternion); G.before.root.scale.copy(it.root.scale); }
}
const _ax = new THREE.Vector3(), _r = new THREE.Vector3(), _u = new THREE.Vector3(), _qq = new THREE.Quaternion();
/* free trackball: screen drag (px) spins the object around the camera's right/up axes */
export function rigDrag(dx, dy, dt) {
  const k = .0085; R.camera.matrixWorld.extractBasis(_r, _u, _ax);
  const w = _r.clone().multiplyScalar(dy * k).addScaledVector(_u, dx * k), ang = w.length();
  if (ang > 0) RIG.q.premultiply(_qq.setFromAxisAngle(_ax.copy(w).normalize(), ang));
  RIG.home = false; const inv = 1 / Math.max(dt, .008); RIG.w.lerp(w.multiplyScalar(inv), .5);
}
/* twist around the view axis (two-finger rotate) */
export function rigRoll(a) { R.camera.getWorldDirection(_ax); RIG.q.premultiply(_qq.setFromAxisAngle(_ax, -a)); RIG.home = false; RIG.w.set(0, 0, 0); }
/* move the view target in the screen plane (px) */
export function camPan(dx, dy) {
  R.camera.matrixWorld.extractBasis(_r, _u, _ax); const s = CAM.dist * 2 * Math.tan(R.camera.fov * Math.PI / 360) / Math.max(1, R.H);
  CAM.upan.addScaledVector(_r, -dx * s).addScaledVector(_u, dy * s); const m = CAM.gdist * .6; if (CAM.upan.length() > m) CAM.upan.setLength(m);
}
export function camZoom(f) { CAM.uzoom = clamp(CAM.uzoom * f, .35, 2); }
export function resetView() { RIG.home = true; RIG.w.set(0, 0, 0); RIG.spin = 0; CAM.uzoom = 1; CAM.uaz = 0; CAM.uel = 0; CAM.upan.set(0, 0, 0); }

/* ---------------- camera rig ---------------- */
export const CAM = { t: new THREE.Vector3(0, 0, 0), gt: new THREE.Vector3(), dist: 14, gdist: 14, el: .25, gel: .25, az: 0, gaz: 0, uzoom: 1, uaz: 0, uel: 0, upan: new THREE.Vector3(), view: null, off: .07 };
/* view: {preset:'full'|'work'|'macro'|'show'|'tray', focus:[x,y,z] item-local or part key, r: radius, el, az} */
export function setView(v = {}, instant) {
  const it = G.item; if (!it) return;
  const preset = v.preset || 'full', hq = homeQuat(), fl = new THREE.Quaternion().setFromAxisAngle(turnAxis(), Math.round(RIG.flip / Math.PI) * Math.PI);
  const rootQ = hq.clone().multiply(fl);
  let c, r;
  if (v.focus) {
    let lp; if (typeof v.focus === 'string') { const p = it.parts[v.focus]; lp = p.home.pos.clone().add(p.center ? p.center.clone().applyQuaternion(p.home.quat).multiplyScalar(p.home.scl) : new THREE.Vector3()); if (p.state === 'layout') lp = p.g.position.clone().add(p.center.clone().applyQuaternion(p.g.quaternion).multiplyScalar(p.g.scale.x)); }
    else lp = new THREE.Vector3(...v.focus);
    c = lp.multiplyScalar(it.root.scale.x).applyQuaternion(rootQ).add(STAGE).add(RIG.off);
    r = v.r || (preset === 'macro' ? 1.2 : 2.4);
  } else {
    const b = fitBox(); c = b.c; r = (v.r || b.r) * (preset === 'show' ? 1.08 : 1);
  }
  if (preset === 'full' || preset === 'show') r = Math.max(r, 1.5);
  const vf = R.camera.fov * Math.PI / 180, hf = 2 * Math.atan(Math.tan(vf / 2) * R.camera.aspect), f = Math.min(vf, hf);
  CAM.gt.copy(c); CAM.gdist = r / Math.sin(f / 2) * (v.k || 1.02); CAM.gel = v.el ?? .22; CAM.gaz = v.az ?? 0; CAM.view = v;
  CAM.uzoom = 1; CAM.uaz = 0; CAM.uel = 0; CAM.upan.set(0, 0, 0);
  RIG.spin = preset === 'show' ? .25 : 0;
  if (instant || clock.ff) { CAM.t.copy(CAM.gt); CAM.dist = CAM.gdist; CAM.el = CAM.gel; CAM.az = CAM.gaz; }
}
function fitBox() {
  const it = G.item, bb = new THREE.Box3(), hq = homeQuat().multiply(new THREE.Quaternion().setFromAxisAngle(turnAxis(), Math.round(RIG.flip / Math.PI) * Math.PI));
  const m = new THREE.Matrix4().compose(STAGE.clone().add(G.offGoal || RIG.off), hq, it.root.scale.clone());
  for (const p of Object.values(it.parts)) {
    const gm = it.goalMatrix(p); if (!gm || p.nofit) continue; const w = m.clone().multiply(gm), c = p.center.clone().applyMatrix4(w), r = p.radius * new THREE.Vector3().setFromMatrixScale(w).x * .85;
    bb.expandByPoint(c.clone().addScalar(r)); bb.expandByPoint(c.clone().subScalar(r));
  }
  for (const x of G.fitExtra || []) bb.union(new THREE.Box3().setFromObject(x));
  if (bb.isEmpty()) bb.setFromCenterAndSize(STAGE.clone(), new THREE.Vector3(3, 3, 3));
  const s = new THREE.Sphere(); bb.getBoundingSphere(s); const sz = bb.getSize(new THREE.Vector3());
  const r = Math.max(sz.x / 2 * (R.camera.aspect < 1 ? 1 : .8), sz.y / 2, s.radius * .72);
  return { c: s.center, r };
}
const _tg = new THREE.Vector3();
function updateCam(dt) {
  const r = 1 - Math.exp(-5.5 * dt), r2 = 1 - Math.exp(-8 * dt);
  CAM.uel = clamp(CAM.uel, -.6, .7);
  const gel = clamp(CAM.gel + CAM.uel, -.3, 1.35), gaz = CAM.gaz + CAM.uaz, gd = CAM.gdist * CAM.uzoom;
  CAM.el += (gel - CAM.el) * r2; CAM.az += (gaz - CAM.az) * r2; CAM.dist += (gd - CAM.dist) * r2; CAM.t.lerp(_tg.copy(CAM.gt).add(CAM.upan), r);
  const c = R.camera, ce = Math.cos(CAM.el), sh = G.shake;
  const j = sh ? new THREE.Vector3((Math.random() - .5) * sh * .12, (Math.random() - .5) * sh * .12, 0) : new THREE.Vector3();
  c.position.set(CAM.t.x + CAM.dist * ce * Math.sin(CAM.az), CAM.t.y + CAM.dist * Math.sin(CAM.el), CAM.t.z + CAM.dist * ce * Math.cos(CAM.az)).add(j);
  c.lookAt(CAM.t.clone().add(j)); G.shake = Math.max(0, G.shake - dt * 3);
  const W = R.W, H = R.H; c.setViewOffset(W, H, 0, H * CAM.off, W, H); c.updateProjectionMatrix();
  R.focus = CAM.dist; R.aperture = clamp(9 / CAM.dist, .5, 1.2);
  aimLights(CAM.t);
}
export function camImpulse(k = .8) { G.shake = Math.max(G.shake, k); }

/* ---------------- steps ---------------- */
export const st = () => G.steps[G.step];
export function loadLevel(def, opt = {}) {
  if (G.item) { G.item.dispose(); G.item = null; } if (G.before) { G.before.dispose(); G.before = null; }
  cancelAll(); clearParticles(); setTool(null); setLoop(null);
  const it = new Item(def), bf = new Item(def, true);
  try { def.build(it, it.r); it.finalize(); if (def.after) def.after(it); if (!opt.noBefore) { def.build(bf, bf.r); bf.finalize(); if (def.after) def.after(bf); } }
  catch (e) { try { it.dispose(); bf.dispose(); } catch (_) { } G.level = null; throw e; }
  R.scene.add(it.root); bf.root.visible = false; R.scene.add(bf.root);
  for (const s of it.surfs.concat(bf.surfs)) { s.finishFades(); s.update(0); }
  G.item = it; G.before = bf; G.level = def; G.step = -1; G.finishing = false; G.busy = false; G.flags = {};
  RIG.flip = 0; RIG.off.set(0, 0, 0); RIG.lift = 0; RIG.pose = def.pose || [-.35, .25]; RIG.q.copy(homeQuat()); RIG.extraQ.identity(); RIG.home = true;
  G.steps = def.steps(it); G.steps.forEach((s, i) => { s.i = i; s.prog = 0; });
  it.root.scale.setScalar(def.scale || 1); bf.root.scale.setScalar(def.scale || 1);
  setView({ preset: 'show' }, true);
  return it;
}
export function enterStep(i) {
  const s = G.steps[i]; G.step = i; G.finishing = false; G.chips = []; G.hold = false; G.busy = false; G.down = false; T.spinning = false; s.prog = 0; s.needsHold = false;
  G.item.hideGhosts(); G.fitExtra = [];
  RIG.pose = s.pose || G.level.pose || [-.35, .25]; RIG.home = true; RIG.spin = 0; if (!s.keepTurn) faceFront(); RIG.extraQ.identity();
  setTool(s.tool, s.toolScale || G.level.toolScale || 1);
  try { if (s.stage) s.stage(); s.enter && s.enter(); } catch (e) { console.error('enter ' + s.id, e); }
  if (!clock.ff) { later(30, () => { if (G.steps[G.step] === s) setView(s.cam || { preset: 'full' }); }); setView(s.cam || { preset: 'full' }); }
  G.log.push({ ev: 'step_start', level: G.level.id, step: s.id, t: G.time });
  HOOK.ui && HOOK.ui('enter', s);
}
export function finishStep(skipped) {
  const s = st(); if (!s || G.finishing) return; G.finishing = true; G.hold = false; G.down = false; T.spinning = false; setLoop(null);
  s.prog = 1;
  G.log.push({ ev: skipped ? 'step_skip' : 'step_complete', level: G.level.id, step: s.id, t: G.time });
  if (!clock.ff) { sfx('chime'); vib(30); const c = CAM.t.clone(); glints(c, 14, Math.min(2.4, CAM.dist * .12)); }
  HOOK.ui && HOOK.ui('finish', s, skipped);
  const go = () => {
    try { if (s.complete) s.complete(skipped); s.exit && s.exit(); } catch (e) { console.error('exit ' + s.id, e); }
    for (const sf of G.item.surfs) sf.finishFades();
    const n = G.step + 1; HOOK.ui && HOOK.ui('progress', n);
    if (n >= G.steps.length) HOOK.complete && HOOK.complete(); else enterStep(n);
  };
  if (clock.ff) go(); else later(skipped ? 450 : 950, go);
}
export function skipStep() {
  const s = st(); if (!s || G.finishing || G.mode !== 'play') return;
  G.busy = false; const ff = clock.ff; clock.ff = true; const np = PART.list.length;
  try { s.skip && s.skip(); } catch (e) { console.error('skip ' + s.id, e); }
  for (const sf of G.item.surfs) sf.finishFades();
  clock.ff = ff; PART.list.length = Math.min(PART.list.length, np);
  finishStep(true);
}
/* fast-forward: apply steps 0..n-1 instantly */
export function ff(n) {
  G.mode = 'play'; clock.ff = true;
  for (let i = 0; i < n; i++) {
    const s = G.steps[i]; G.step = i; G.finishing = false; G.busy = false; enterStep(i);
    try { s.skip && s.skip(); } catch (e) { console.error('ff skip ' + s.id, e); }
    try { if (s.complete) s.complete(true); s.exit && s.exit(); } catch (e) { console.error('ff exit ' + s.id, e); }
    for (const sf of G.item.surfs) sf.finishFades();
    cancelAll();
  }
  clock.ff = false; RIG.flip = 0; RIG.lift = 0; RIG.flipping = false;
  if (n >= G.steps.length) HOOK.complete && HOOK.complete(); else enterStep(n);
}

/* ---------------- input state shared with src/input/controls.js ---------------- */
export const canAct = () => G.mode === 'play' && !G.paused && !G.busy && !G.finishing && !RIG.flipping && st();
function pickNodes(s) { try { return (s.nodes ? s.nodes() : []).filter(Boolean); } catch (e) { console.error(e); return []; } }
export function pickAt(x, y) { const s = st(); return { ray: rayAt(x, y), hit: s ? raycast(x, y, pickNodes(s)) : null, x, y }; }
export function freePoint(ray) { const n = new THREE.Vector3(); R.camera.getWorldDirection(n); const pl = new THREE.Plane().setFromNormalAndCoplanarPoint(n, CAM.t); const p = new THREE.Vector3(); return ray.intersectPlane(pl, p) ? p : null; }
export function endTool() { const s = st(); G.down = false; T.spinning = false; try { s && s.onUp && s.onUp(); } catch (er) { console.error(er); } T.goalLift = .35 * T.scale; }

/* ---------------- per-frame ---------------- */
export function updateGame(dt) {
  updateRig(dt); updateCam(dt);
  const s = st();
  if (G.item) { G.item.update(dt); G.item.updateTray(dt, R.camera); }
  if (G.before) G.before.update(dt);
  if (s && G.mode === 'play' && !G.paused) { try { s.update && s.update(dt); } catch (e) { console.error(e); } }
  /* idle tool pose: rest the tool near the work */
  if (s && T.node && !G.down && performance.now() - (T.aimT || 0) > 1200 && canAct()) {
    let q = null; try { const d = s.tut && s.tut.demo && s.tut.demo.call(s); q = d && d.pts && d.pts[0]; } catch (e) { }
    if (q) { T.goal.copy(q).add(new THREE.Vector3(0, .15 * T.scale, 0)); T.goalVis = 1; T.goalLift = .5 * T.scale; T.onSurf = false; T.nrm = null; }
  }
  updateTool(dt, G.down && canAct());
}
export { project };
