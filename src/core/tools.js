/* detailed procedural tools; origin = contact point, handle runs along +Y.
   The controller glides the tool to the touched surface and tilts it toward the player. */
import * as THREE from 'three';
import { lathe, cyl, box, rbox, sphere, torus, mesh, metal, plastic, rubber, mat, glass } from './geo.js';
import { R } from './engine.js';
import { setLoop } from './audio.js';
import { emit } from './particles.js';
import { rnd, clamp } from './util.js';

const woodM = (c = '#9b6a3c') => mat(c, { roughness: .55 });
const steel = (c = '#aab3ba', r = .25) => metal(c, r);
const chrome = () => metal('#e8ecef', .08);
const bristle = c => mat(c, { roughness: 1 });

export function makeTool(kind) {
  const Rt = new THREE.Group(), B = new THREE.Group(), PN = new THREE.Group(); Rt.add(B); B.add(PN); Rt.name = 'tool:' + kind;
  const LONGZ = ['file', 'pry', 'tweez', 'pliers', 'puller'].includes(kind); if (LONGZ) PN.rotation.x = -Math.PI / 2;
  if (kind === 'spray' || kind === 'paint' || kind === 'oil') { PN.rotation.x = Math.PI; PN.position.y = 1.9; }
  const add = (g, m, p = [0, 0, 0], r = [0, 0, 0], s) => { const n = mesh(g, m, { p, r, s, recv: false }); PN.add(n); return n; };
  let spin = null, stand = 0, flat = false;
  switch (kind) {
    case 'hammer': case 'punch': {
      if (kind === 'punch') {
        add(cyl(.05, .07, .5, 14), steel('#c6cdd2', .2), [0, .25, 0]); add(cyl(.11, .11, 1.0, 16), rubber('#2a3036'), [0, 1, 0]);
        add(cyl(.14, .14, .08, 16), steel('#7d858c', .35), [0, 1.55, 0]); break;
      }
      add(lathe([[.13, 0], [.17, .03], [.19, .08], [.17, .16], [.15, .3], [.15, .55], [.17, .62], [.16, .78], [.1, .9], [.04, .96], [0, .97]], 24), steel('#838b92', .28));
      add(cyl(.2, .2, .03, 24), steel('#d0d6da', .15), [0, .015, 0]);
      add(lathe([[.045, 0], [.075, .05], [.07, .5], [.055, 1.1], [.06, 1.9], [.09, 2.0]], 14), woodM('#a97a46'), [.12, .42, 0], [0, 0, -Math.PI / 2]);
      add(lathe([[.08, 0], [.1, .04], [.1, .55], [.115, .6], [.09, .64]], 16), rubber('#1d2a33'), [1.15, .42, 0], [0, 0, -Math.PI / 2]);
      add(cyl(.1, .1, .12, 14), steel('#2f353a', .5), [.12, .42, 0], [0, 0, Math.PI / 2]); break;
    }
    case 'wire': case 'soap': case 'soft': case 'detail': {
      if (kind === 'soap') {
        add(rbox(.95, .3, .42, .09), mat('#e8d8ab', { roughness: .85 }), [0, .18, 0]); add(rbox(.7, .05, .26, .02), plastic('#2f9aa0', .5), [0, .35, 0]);
        add(lathe([[.06, 0], [.075, .08], [.065, .5], [.08, 1], [.06, 1.1]], 14), plastic('#2f9aa0', .4), [0, .38, 0]);
      } else if (kind === 'detail') {
        add(cyl(.02, .07, .3, 12), bristle('#2a2420'), [0, .15, 0]); add(cyl(.075, .075, .14, 14), steel('#c9cfd3', .22), [0, .36, 0]);
        add(lathe([[.05, 0], [.07, .1], [.065, .9], [.04, 1]], 14), plastic('#c43a2a', .4), [0, .42, 0]); flat = false;
      } else {
        const soft = kind === 'soft';
        add(box(1, .07, .34), steel('#2c3135', .5), [0, .035, 0]);
        add(box(.95, .17, .3), soft ? bristle('#e9dcc0') : metal('#6a737a', .7), [0, .15, 0]);
        add(rbox(1.05, .24, .36, .08), woodM(soft ? '#c08a52' : '#b07a42'), [0, .35, 0]);
        add(lathe([[.05, 0], [.07, .1], [.062, .5], [.075, 1], [.1, 1.1], [.06, 1.16]], 14), woodM('#9a6a38'), [0, .47, 0]);
        if (!soft) add(cyl(.07, .07, .04, 10), steel('#9aa3aa', .3), [0, .5, 0]);
      }
      flat = kind !== 'detail'; break;
    }
    case 'pick': {
      add(cyl(.004, .035, .9, 10), steel('#d3dade', .16), [0, .45, 0]); add(cyl(.04, .04, .22, 10), steel('#bfc7cc', .22), [0, 1, 0]);
      add(lathe([[.05, 0], [.095, .06], [.125, .3], [.13, .55], [.1, .8], [.04, .88]], 16), woodM('#8a5a32'), [0, 1.1, 0]);
      add(cyl(.13, .13, .03, 16), plastic('#c9a24a', .3), [0, 1.62, 0]); break;
    }
    case 'sand': {
      add(rbox(.9, .05, .64, .02), mat('#c9a275', { roughness: 1 }), [0, .025, 0]); add(rbox(.82, .09, .58, .04), plastic('#26303a', .7), [0, .09, 0]);
      add(rbox(.62, .34, .5, .16), plastic('#2f9aa0', .45), [0, .33, 0]); add(rbox(.4, .1, .36, .05), rubber('#1f272d'), [0, .55, 0]); flat = true; break;
    }
    case 'grind': {
      spin = add(cyl(.42, .42, .035, 36), mat('#7d8e9c', { roughness: .55, metalness: .5 }), [0, .02, 0]);
      add(cyl(.1, .1, .05, 14), steel('#d3d9dd', .2), [0, .06, 0]); add(lathe([[.46, 0], [.5, .06], [.46, .3], [.3, .34]], 30), plastic('#24292d', .5), [0, .1, 0]);
      add(lathe([[.2, 0], [.22, .25], [.2, .5]], 22), plastic('#e5632b', .38), [0, .42, 0]); add(cyl(.17, .17, 1.15, 22), plastic('#e5632b', .38), [0, 1.16, 0]);
      for (const y of [.9, 1.05, 1.2, 1.35]) add(cyl(.178, .178, .04, 22), rubber('#1f2428'), [0, y, 0]);
      add(cyl(.15, .17, .22, 22), plastic('#2c3237', .5), [0, 1.8, 0]); add(cyl(.04, .04, .6, 10), rubber('#16191c'), [.3, .9, 0], [0, 0, Math.PI / 2 - .35]); flat = true; break;
    }
    case 'buff': {
      spin = add(cyl(.5, .5, .16, 36), mat('#f2eee2', { roughness: 1 }), [0, .08, 0]);
      for (let i = 0; i < 5; i++) add(torus(.12 + i * .08, .012, 6, 30), mat('#d8d2c2', { roughness: 1 }), [0, .165, 0], [Math.PI / 2, 0, 0]);
      add(cyl(.1, .1, .1, 14), steel('#c3cacf', .2), [0, .2, 0]); add(lathe([[.2, 0], [.22, .25], [.2, .5]], 22), plastic('#2b6fb3', .38), [0, .25, 0]);
      add(cyl(.17, .17, 1.1, 22), plastic('#2b6fb3', .38), [0, .95, 0]); for (const y of [.75, .9, 1.05]) add(cyl(.178, .178, .04, 22), rubber('#1f2428'), [0, y, 0]); flat = true; break;
    }
    case 'file': {
      add(box(.34, .07, 1.35), metal('#6b747b', .7), [0, .035, .55]); add(box(.3, .02, .3), steel('#4f565b', .4), [0, .045, 1.28]);
      add(lathe([[.04, 0], [.075, .08], [.095, .4], [.075, .85], [.04, .9]], 14), woodM('#9b6a3c'), [0, .1, 1.9], [Math.PI / 2, 0, 0]);
      add(cyl(.09, .09, .05, 14), steel('#a5aeb4', .25), [0, .1, 1.5], [Math.PI / 2, 0, 0]); break;
    }
    case 'cloth': case 'micro': case 'sponge': case 'pad': {
      const c1 = { cloth: '#efe6d0', micro: '#6cc3d4', sponge: '#f2c94c', pad: '#3c9a6a' }[kind], c2 = { cloth: '#e2d6bb', micro: '#4aa5ba', sponge: '#2f8a4a', pad: '#f0ece0' }[kind];
      if (kind === 'sponge' || kind === 'pad') {
        add(rbox(.95, .32, .62, .1), mat(c1, { roughness: 1 }), [0, .16, 0]); add(rbox(.95, .1, .62, .04), mat(c2, { roughness: 1 }), [0, .37, 0]);
      } else {
        add(rbox(.95, .2, .85, .22), mat(c1, { roughness: 1 }), [0, .13, 0]); add(rbox(.72, .2, .66, .2), mat(c2, { roughness: 1 }), [.05, .3, .02], [0, .3, 0]);
        add(rbox(.5, .16, .46, .15), mat(c1, { roughness: 1 }), [-.02, .44, 0], [0, -.4, 0]);
      }
      flat = true; break;
    }
    case 'stain': case 'finish': {
      add(cyl(.012, .09, .32, 14), bristle(kind === 'finish' ? '#e8d9b5' : '#2b1409'), [0, .16, 0]); add(lathe([[.085, 0], [.09, .08], [.09, .34], [.075, .38]], 16), steel('#c6cdd2', .22), [0, .3, 0]);
      add(lathe([[.05, 0], [.07, .1], [.075, .6], [.09, 1.1], [.06, 1.3]], 14), woodM('#6b4426'), [0, .68, 0]); break;
    }
    case 'spray': case 'paint': case 'oil': {
      const col = { spray: '#2f7fb0', paint: '#d8402b', oil: '#3e7d3a' }[kind], col2 = { spray: '#1d5478', paint: '#8f261a', oil: '#244d22' }[kind];
      add(lathe([[.2, 0], [.245, .04], [.25, .1], [.25, .95], [.22, 1.08], [.12, 1.17]], 28), plastic(col, .3, { metalness: .55 }), [0, .35, 0]);
      add(cyl(.252, .252, .3, 28), plastic('#f3efe4', .5), [0, .78, 0]); add(cyl(.255, .255, .06, 28), plastic(col2, .4), [0, .96, 0]); add(cyl(.255, .255, .06, 28), plastic(col2, .4), [0, .6, 0]);
      add(cyl(.13, .15, .1, 20), steel('#cfd6db', .22), [0, 1.6, 0]); add(cyl(.09, .1, .12, 18), plastic('#1e2428', .5), [0, 1.7, 0]);
      add(cyl(.04, .04, .18, 12), plastic('#f2f2f2', .45), [0, 1.84, 0]); add(box(.3, .08, .12), plastic('#f2f2f2', .45), [.12, 1.88, 0]);
      if (kind === 'oil') add(cyl(.012, .012, .5, 8), plastic('#c43a2a', .4), [0, 2.05, 0]);
      stand = kind === 'oil' ? .55 : 1.05; break;
    }
    case 'water': {
      add(cyl(.02, .07, .5, 12), steel('#c1cacf', .2), [0, .25, 0]); add(lathe([[.1, 0], [.14, .06], [.14, .8], [.1, .9]], 22), mat('#cfe6f0', { roughness: .1 }), [0, .5, 0]);
      add(cyl(.115, .115, .5, 22), mat('#3f93c9', { roughness: .1 }), [0, .8, 0]); add(cyl(.08, .08, .3, 14), plastic('#1d2328', .6), [0, 1.5, 0]);
      add(rbox(.3, .1, .1, .04), plastic('#e5c34a', .4), [.12, 1.7, 0]); add(cyl(.05, .05, .6, 12), rubber('#1d2328'), [0, 1.8, 0]); stand = .9; break;
    }
    case 'screw': {
      spin = add(cyl(.026, .03, .95, 12), chrome(), [0, .55, 0]); add(box(.15, .1, .02), chrome(), [0, .04, 0]);
      add(cyl(.085, .085, .14, 16), steel('#c0c8cd', .22), [0, 1.08, 0]);
      add(lathe([[.09, 0], [.14, .08], [.19, .25], [.2, .55], [.17, .85], [.12, .95], [.08, .97]], 24), plastic('#e8a62e', .35), [0, 1, 0]);
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; add(box(.05, .6, .035), plastic('#1f2a33', .5), [Math.sin(a) * .19, 1.55, Math.cos(a) * .19], [0, a, 0]); }
      break;
    }
    case 'pry': {
      add(box(.52, .03, .1), steel('#c3cacf', .2), [0, .015, .1]); add(box(.1, .05, 1), steel('#9aa3aa', .28), [0, .22, .75], [-.16, 0, 0]);
      add(lathe([[.05, 0], [.08, .08], [.095, .5], [.075, .85], [.05, .9]], 14), plastic('#2f6f78', .45), [0, .5, 1.7], [Math.PI / 2, 0, 0]); break;
    }
    case 'tweez': case 'puller': {
      if (kind === 'puller') {
        for (const s of [-1, 1]) add(box(.04, .9, .14), steel('#c9d0d5', .2), [s * .22, .45, 0], [0, 0, s * .1]);
        add(torus(.25, .04, 8, 24, Math.PI), steel('#c9d0d5', .2), [0, .92, 0]); add(lathe([[.06, 0], [.1, .1], [.1, .9], [.06, 1]], 14), plastic('#c43a2a', .45), [0, 1.0, 0]);
        PN.rotation.x = 0; break;
      }
      add(box(.04, .035, 1.25), steel('#d3dade', .16), [-.055, .12, .66], [0, .045, 0]); add(box(.04, .035, 1.25), steel('#d3dade', .16), [.055, .12, .66], [0, -.045, 0]);
      add(box(.14, .03, .22), steel('#b9c1c6', .2), [0, .13, 1.3]); break;
    }
    case 'pliers': {
      add(box(.13, .07, .5), steel('#a9b1b7', .25), [-.07, .14, .25], [0, .08, 0]); add(box(.13, .07, .5), steel('#a9b1b7', .25), [.07, .14, .25], [0, -.08, 0]);
      add(cyl(.1, .1, .18, 18), steel('#c3cacf', .2), [0, .14, .62]);
      for (const s of [-1, 1]) add(lathe([[.055, 0], [.075, .08], [.08, .55], [.06, .65]], 12), plastic('#c43a2a', .5), [s * .24, .17, 1.1], [Math.PI / 2, 0, s * -.12]); break;
    }
    case 'sandgun': {
      add(cyl(.018, .06, .32, 12), steel('#d7dde1', .15), [0, .16, 0]); add(cyl(.08, .08, .06, 14), steel('#3a4147', .4), [0, .35, 0]);
      add(lathe([[.1, 0], [.14, .06], [.15, .34], [.12, .44]], 20), plastic('#f0b429', .38), [0, .38, 0]); add(rbox(.34, .54, .62, .12), plastic('#f0b429', .4), [0, .95, .28]);
      for (let i = 0; i < 5; i++) add(box(.37, .035, .16), rubber('#1d2328'), [0, .75 + i * .08, .12]);
      add(cyl(.065, .065, .5, 12), plastic('#262d33', .55), [0, 1, .6], [Math.PI / 2, 0, 0]); add(cyl(.05, .05, .7, 10), rubber('#16191c'), [0, 1.18, .95], [Math.PI / 2 - .25, 0, 0]);
      stand = .85; break;
    }
    case 'shiner': case 'compound': {
      add(rbox(.74, .22, .64, .17), mat(kind === 'compound' ? '#e9e2c9' : '#f4efdc', { roughness: 1 }), [0, .13, 0]);
      add(lathe([[.18, 0], [.22, .05], [.22, .55], [.17, .62], [.08, .66]], 22), plastic(kind === 'compound' ? '#2e8c6a' : '#e0a12a', .3, { metalness: .5 }), [0, .45, .2]);
      add(cyl(.1, .1, .14, 14), plastic('#222a2e', .5), [0, 1.14, .2]); flat = true; break;
    }
    case 'vacuum': case 'blower': {
      const v = kind === 'vacuum';
      add(lathe([[v ? .16 : .1, 0], [v ? .13 : .12, .2], [.1, .6], [.1, 1.4]], 18), plastic(v ? '#2b2f33' : '#d8d8d2', .5), [0, 0, 0]);
      add(lathe([[.1, 0], [.2, .1], [.22, .5], [.2, .9], [.1, 1]], 22), plastic(v ? '#c43a2a' : '#2f7fb0', .4), [0, 1.35, 0]);
      for (let i = 0; i < 4; i++) add(torus(.105, .018, 6, 20), rubber('#16191c'), [0, .7 + i * .16, 0], [Math.PI / 2, 0, 0]);
      add(cyl(.06, .06, .9, 12), rubber('#16191c'), [0, 2.6, .3], [.4, 0, 0]); stand = v ? .12 : .7; break;
    }
    case 'filler': {
      add(cyl(.015, .05, .35, 12), plastic('#e9e4d6', .4), [0, .17, 0]); add(cyl(.16, .16, 1.1, 20), glass('#e9e4d6', .55), [0, .9, 0]);
      add(cyl(.13, .13, .9, 18), mat('#d9b98c', { roughness: .8 }), [0, .85, 0]); add(cyl(.2, .2, .05, 20), plastic('#2c3237', .4), [0, 1.45, 0]);
      add(cyl(.03, .03, .5, 10), steel('#b6bec4', .3), [0, 1.7, 0]); add(cyl(.14, .14, .05, 16), plastic('#2c3237', .4), [0, 1.96, 0]); break;
    }
    case 'press': case 'heat': {
      if (kind === 'heat') {
        add(cyl(.05, .09, .35, 16), steel('#5c646b', .4), [0, .18, 0]); add(cyl(.16, .16, .9, 20), plastic('#d4442c', .4), [0, .8, 0]);
        add(cyl(.12, .12, .6, 16), rubber('#1d2328'), [0, 1.5, 0]); stand = .25; break;
      }
      add(cyl(.18, .18, .1, 22), rubber('#2a3036'), [0, .05, 0]); add(cyl(.05, .05, .6, 12), steel('#c3cacf', .2), [0, .4, 0]);
      add(lathe([[.1, 0], [.15, .1], [.15, .6], [.1, .7]], 18), plastic('#2f6f78', .45), [0, .7, 0]); flat = true; break;
    }
    case 'crown': case 'magnify': default: break;
  }
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
    const j = S.sp * L; emit({ x: N.x + rnd(-.02, .02), y: N.y + rnd(-.02, .02), z: N.z + rnd(-.02, .02), vx: d.x / life + rnd(-j, j) * 2, vy: d.y / life + rnd(-j, j) * 2, vz: d.z / life + rnd(-j, j) * 2, g: 0, drag: 0, life: life * rnd(.9, 1), s0: S.s0 * T.scale, s1: S.s1 * (1 + L * .3) * T.scale, c: pc.map(x => x * rnd(.9, 1.1)), a: S.a, type: S.type, add: !!S.add || (k === 'sandgun' && Math.random() < .3), floor: null, trail: k === 'sandgun' || k === 'water' ? 2 : 0 });
  }
}
