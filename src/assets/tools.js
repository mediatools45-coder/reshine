/* Tool controller (models live in toolModels.js; origin = contact point, handle along +Y).
   The controller glides the tool to the touched surface and tilts it toward the player. */
import * as THREE from 'three';
import { R } from '../render/engine.js';
import { setLoop } from '../fx/audio.js';
import { emit } from '../fx/particles.js';
import { rnd, clamp, rng } from '../core/util.js';
import { buildTool } from './toolModels.js';

export function makeTool(kind) {
  const Rt = new THREE.Group(), B = new THREE.Group(), PN = new THREE.Group(); Rt.add(B); B.add(PN); Rt.name = 'tool:' + kind;
  const { spin, stand, flat } = buildTool(kind, PN);
  Rt.userData = { kind, spin, body: B, stand, wn: flat ? 1.15 : .5, wc: flat ? .2 : .75, flat };
  Rt.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
  return Rt;
}

/* ---------- controller ---------- */
export const T = { kind: null, node: null, pos: new THREE.Vector3(), goal: new THREE.Vector3(), lift: .5, goalLift: .5, vis: 0, goalVis: 0, anim: 0, nrm: null, dir: null, onSurf: false, hitPt: null, spinning: false, placed: false, cache: {}, scale: 1, stream: null, down: false };
let SCENE = null;
export function initTools(scene) { SCENE = scene; }
export function setTool(kind, scale = 1) {
  if (T.node) { SCENE.remove(T.node); T.node = null; }
  T.kind = kind; T.scale = scale; T.vis = 0; T.goalVis = 0; T.spinning = false; T.placed = false; T.dir = null;
  if (kind && !['hand', 'none', 'crown', 'magnify'].includes(kind)) { if (!T.cache[kind]) T.cache[kind] = makeTool(kind); T.node = T.cache[kind]; SCENE.add(T.node); T.node.visible = false; T.pos.copy(T.goal); }
}
export function toolStrike(cb) { T.anim = 1; T.strikeCb = cb || null; T.goalLift = .02 * T.scale; }
/* aim at a raycast hit (world) or float under the finger */
export function toolAim(hit, ray, pressed, fallbackPoint) {
  T.goalVis = 1; T.aimT = performance.now();
  const u = T.node && T.node.userData;
  if (hit) {
    T.onSurf = true; const n = hit.face ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld) : new THREE.Vector3(0, 1, 0);
    if (ray && n.dot(ray.direction) > 0) n.negate();
    T.nrm = n; const sd = (.02 + (u ? u.stand : 0) * (pressed ? 1 : 1.3)) * T.scale;
    T.hitPt = hit.point.clone(); T.goal.copy(hit.point).addScaledVector(n, sd); T.goalLift = (u && u.stand) ? 0 : (pressed ? .02 : .35) * T.scale;
  } else if (fallbackPoint) { T.goal.copy(fallbackPoint); T.onSurf = false; T.nrm = null; T.hitPt = null; T.goalLift = .4 * T.scale; }
}
const tmp = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
export function updateTool(dt, active) {
  const n = T.node; if (!n) { setLoop(null); return; }
  T.vis += (T.goalVis - T.vis) * (1 - Math.exp(-14 * dt));
  if (!T.placed) { T.pos.copy(T.goal); T.placed = true; }
  T.pos.lerp(T.goal, 1 - Math.exp(-24 * dt));
  T.lift += (T.goalLift - T.lift) * (1 - Math.exp(-18 * dt));
  if (T.anim > 0) { T.anim = Math.max(0, T.anim - dt * 5); if (T.anim === 0) { T.goalLift = .35 * T.scale; if (T.strikeCb) { const f = T.strikeCb; T.strikeCb = null; f(); } } }
  n.visible = T.vis > .04; n.position.copy(T.pos).add(tmp.set(0, T.lift, 0));
  const u = n.userData, c = R.camera;
  const tc = new THREE.Vector3().subVectors(c.position, n.position).normalize();
  const f = new THREE.Vector3(); c.getWorldDirection(f); const r = new THREE.Vector3().crossVectors(f, up).normalize(); const cu = new THREE.Vector3().crossVectors(r, f);
  const nr = T.nrm || tc;
  let d = new THREE.Vector3().addScaledVector(nr, u.wn * .7).addScaledVector(tc, u.wc * .5).addScaledVector(r, u.wn > 1 ? .25 : .7).addScaledVector(cu, u.wn > 1 ? 0 : -.3).normalize();
  if (T.kind === 'hammer' || T.kind === 'punch') { n.position.y += T.anim * .8 * T.scale; d.addScaledVector(nr, T.anim * .9).normalize(); }
  T.dir = T.dir ? T.dir.lerp(d, .2).normalize() : d.clone();
  u.body.quaternion.setFromUnitVectors(up, T.dir);
  const loopK = T.spinning ? (T.kind === 'buff' ? 'buff' : T.kind === 'screw' ? null : 'grind') : (active && T.onSurf && T.vis > .5 && { spray: 1, paint: 1, oil: 1, water: 1, sandgun: 1, vacuum: 1, blower: 1, heat: 1 }[T.kind]) ? T.kind : null;
  setLoop(loopK);
  if (active && T.onSurf && T.hitPt && u.stand && T.vis > .5) streamFx(n, T.kind, dt);
  if (u.spin && T.spinning) u.spin.rotation.y += dt * (T.kind === 'screw' ? 14 : 40);
  const s = (.6 + .4 * T.vis) * T.scale; n.scale.setScalar(s);
}
export function hideTool() { T.goalVis = 0; }

const STREAM = {
  spray: { c: [.9, .97, 1], r: 120, sp: .05, a: .7, s0: .05, s1: .24, type: 0 }, paint: { c: [.18, .55, .6], r: 120, sp: .05, a: .75, s0: .05, s1: .22, type: 0 },
  oil: { c: [.85, .7, .25], r: 50, sp: .015, a: .9, s0: .03, s1: .04, type: 4 }, water: { c: [.7, .88, 1], r: 90, sp: .02, a: .7, s0: .05, s1: .06, type: 4 },
  sandgun: { c: [.95, .8, .55], r: 110, sp: .03, a: .95, s0: .03, s1: .02, type: 4 }, blower: { c: [.85, .85, .8], r: 30, sp: .08, a: .25, s0: .06, s1: .3, type: 0 },
  heat: { c: [1, .55, .2], r: 40, sp: .03, a: .5, s0: .05, s1: .2, type: 0, add: true }, vacuum: null
};
export const STREAM_COL = { paint: null };
function streamFx(n, k, dt) {
  const S = STREAM[k]; if (!S) return; const N = n.userData.body.getWorldPosition(new THREE.Vector3()), H = T.hitPt;
  const d = new THREE.Vector3().subVectors(H, N), L = d.length() || 1, life = L / 6.5, cnt = Math.max(1, Math.round(S.r * dt));
  const pc = (k === 'paint' && STREAM_COL.paint) || S.c;
  for (let i = 0; i < cnt; i++) {
    const j = S.sp * L; emit({ x: N.x + rnd(-.02, .02), y: N.y + rnd(-.02, .02), z: N.z + rnd(-.02, .02), vx: d.x / life + rnd(-j, j) * 2, vy: d.y / life + rnd(-j, j) * 2, vz: d.z / life + rnd(-j, j) * 2, g: 0, drag: 0, life: life * rnd(.9, 1), s0: S.s0 * T.scale, s1: S.s1 * (1 + L * .3) * T.scale, c: pc.map(x => x * rnd(.9, 1.1)), a: S.a, type: S.type, add: !!S.add || (k === 'sandgun' && Math.random() < .3), floor: null, trail: k === 'sandgun' || k === 'water' ? 2 : 0, liquid: k === 'water' || k === 'oil' });
  }
}
