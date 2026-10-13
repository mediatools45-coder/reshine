/* shared helpers for the step systems: staging, step base object, tool names, painting FX, level helpers */
import * as THREE from 'three';
import { G, RIG, CAM, STAGE, finishStep, turnItem, isTurned, camImpulse, setView, st } from '../game.js';
import { R, project } from '../../render/engine.js';
import { T, toolStrike } from '../../assets/tools.js';
import { sfx } from '../../fx/audio.js';
import { puff, flakes, debris, sparks, bubbles, foam, glints, drops, grains, dust, emit } from '../../fx/particles.js';
import { clamp, lerp, rnd, tween, later, clock, vib, moveTo, smooth, ease } from '../../core/util.js';
import { glass, mat, metal, cyl, box, rbox, mesh, lathe, torus, plastic } from '../../assets/geo.js';
import { BENCH_Y } from '../../render/studio.js';
import { lump } from '../../assets/geo.js';

export const I = () => G.item;
const tmpV = new THREE.Vector3();
export const toast = (m, ms) => { G.toast && G.toast(m, ms); };
export const worldScale = o => o.getWorldScale(tmpV).x;
export const lp = (key, p) => I().parts[key].wp(p || [0, 0, 0]);

/* ---------- staging: start state of a step ---------- */
export function stage(spec = {}) {
  const it = I(), ff = clock.ff, d = ff ? 0 : .55;
  for (const k of spec.hide || []) it.hide(k);
  for (const k of spec.home || []) { const p = it.parts[k]; if (p.state !== 'home' || p.g.parent !== p.home.parent || ff) it.home(k, (p.state === 'hidden' || ff) ? 0 : d, .3); else it.home(k, d); }
  for (const k of spec.tray || []) { const p = it.parts[k]; if (p.state !== 'tray') it.toTray(k, ff || p.state === 'hidden'); }
  let L = typeof spec.layout === 'string' ? G.level.layouts[spec.layout] : spec.layout; if (typeof L === 'function') L = L(it);
  if (L) for (const k in L) { const p = it.parts[k]; it.layout(k, L[k], (p.state === 'hidden' || ff) ? 0 : .6); }
  if (spec.wet != null) for (const s of it.surfs) s.u.uWetG.value = spec.wet;
  if (spec.fn) spec.fn(it);
}
export function base(o) {
  return Object.assign({ canTurn: false, prog: 0, input: 'Drag', tool: 'hand', toolLabel: 'Bare Hands', nodes() { return []; }, markers() { return []; } }, o);
}
const TOOLNAME = { hammer: 'Hammer', punch: 'Pin Punch', wire: 'Wire Brush', soap: 'Soap Brush', soft: 'Soft Brush', detail: 'Detail Brush', pick: 'Metal Pick', sand: 'Sandpaper', grind: 'Rotary Grinder', buff: 'Buffing Wheel', file: 'Metal File', cloth: 'Polishing Cloth', micro: 'Microfiber Cloth', sponge: 'Sponge', pad: 'Treatment Pad', stain: 'Stain Brush', finish: 'Finish Brush', spray: 'Penetrating Spray', paint: 'Spray Paint', oil: 'Oil Can', water: 'Water Jet', screw: 'Screwdriver', pry: 'Pry Tool', tweez: 'Tweezers', puller: 'Keycap Puller', pliers: 'Pliers', sandgun: 'Sandblaster', shiner: 'Metal Shiner', compound: 'Cleaning Compound', vacuum: 'Vacuum', blower: 'Air Blower', filler: 'Repair Filler', press: 'Press Tool', heat: 'Heat Gun', hand: 'Bare Hands', crown: 'Crown', magnify: 'Magnifier', none: 'Hands' };
export const toolName = k => TOOLNAME[k] || 'Tool';

/* ---------- FX presets used by painting ---------- */
export const FX = {
  rust: (p, k) => { if (Math.random() < .55) puff(p, [.55, .28, .12], 1, { a: .45, s0: .1, s1: .28 }); if (Math.random() < .6) flakes(p, 2); },
  dust: p => { if (Math.random() < .5) dust(p, 1); },
  dirt: p => { if (Math.random() < .5) puff(p, [.45, .38, .3], 1, { a: .4, s0: .08, s1: .24 }); if (Math.random() < .3) grains(p, 2, [.35, .28, .2]); },
  foam: p => { foam(p, 1); if (Math.random() < .3) drops(p, 1, [.75, .9, 1]); },
  water: p => { if (Math.random() < .5) drops(p, 2); },
  spray: p => { if (Math.random() < .35) emit({ x: p.x, y: p.y, z: p.z, vx: rnd(-.05, .05), vy: -.2, vz: 0, g: 3, drag: .5, life: .9, s0: .05, s1: .035, c: [.8, .93, 1], a: .85, type: 4, floor: null, liquid: true }); },
  oil: p => { if (Math.random() < .3) emit({ x: p.x, y: p.y, z: p.z, vx: 0, vy: -.1, vz: 0, g: 2, drag: .5, life: 1, s0: .05, s1: .04, c: [.85, .66, .2], a: .9, type: 4, floor: null, liquid: true }); },
  sand: p => { if (Math.random() < .5) puff(p, [.78, .74, .68], 1, { a: .3, s0: .08, s1: .2 }); },
  woodsand: p => { if (Math.random() < .6) puff(p, [.86, .74, .55], 1, { a: .35, s0: .08, s1: .22 }); if (Math.random() < .3) grains(p, 2, [.85, .7, .5]); },
  polish: (p, k) => { if (Math.random() < .1 * (k || 1)) glints(p, 1, .2); },
  stain: p => { if (Math.random() < .2) puff(p, [.3, .15, .06], 1, { a: .25, s0: .05, s1: .12 }); },
  paint: p => { if (Math.random() < .35) puff(p, [.6, .6, .6], 1, { a: .25, s0: .08, s1: .22 }); },
  blast: p => { if (Math.random() < .6) debris(p, 1, [.45, .2, .08]); if (Math.random() < .7) puff(p, [.62, .5, .38], 1, { a: .35, s0: .1, s1: .3 }); if (Math.random() < .5) grains(p, 2, [.55, .26, .1], { sp: 1.6, up: .7 }); },
  wipe: p => { if (Math.random() < .06) glints(p, 1, .15); },
  vacuum: p => { if (Math.random() < .5) { const d = T.node ? T.node.position.clone() : p; emit({ x: p.x + rnd(-.2, .2), y: p.y + .05, z: p.z + rnd(-.2, .2), vx: (d.x - p.x) * 3, vy: (d.y - p.y) * 3 + 1, vz: (d.z - p.z) * 3, g: 0, drag: 0, life: .3, s0: .04, s1: .02, c: [.5, .45, .38], a: 1, type: 3, floor: null }); } },
  blow: p => { if (Math.random() < .6) dust(p, 1, [.78, .76, .7], 1.4); },
  compound: p => { if (Math.random() < .3) puff(p, [.95, .95, .9], 1, { a: .35, s0: .08, s1: .2 }); },
  plastic: p => { if (Math.random() < .3) foam(p, 1, .6); },
  heat: p => { if (Math.random() < .2) puff(p, [.5, .45, .4], 1, { a: .2 }); }
};

export function facing(m, nLocal) {
  if (!nLocal) return true; const n = nLocal.clone().applyQuaternion(m.parent ? m.parent.getWorldQuaternion(new THREE.Quaternion()) : new THREE.Quaternion());
  return n.dot(new THREE.Vector3().subVectors(R.camera.position, m.getWorldPosition(new THREE.Vector3())).normalize()) > -.1;
}

/* ---------- small helpers for levels ---------- */
export function chunksOn(it, key, n, o = {}) {
  const p = it.parts[key], s = p.surf, out = [], r = it.r;
  for (let i = 0; i < n; i++) {
    const smp = s.pick(r, o.filter), size = (o.size || .22) * (.75 + r() * .5);
    const m = mesh(o.geom ? o.geom(size, i) : lumpGeom(size, i + (o.seed || 1)), o.mat || crustMat(), { cast: true });
    m.position.copy(smp.p).addScaledVector(smp.n, size * .15); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), smp.n); m.rotateY(r() * 6); m.userData.part = p;
    p.g.add(m); out.push({ m, surf: s, p: smp.p.clone(), n: smp.n.clone(), size, s0: 1 });
    if (o.paint !== false) s.dab(smp.p, smp.n, size * 2.2, o.layer || 'crust', 'add', 1);
  }
  return out;
}
const lumpGeom = (size, seed) => lump(size, seed, 1.25, .5, 1.1, 1);
let CRUST = null; export function crustMat() { if (!CRUST) CRUST = new THREE.MeshStandardMaterial({ color: '#5e2a12', roughness: 1, metalness: 0, flatShading: true }); return CRUST; }
export const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
/* layout helper: place parts by the centre of their bounds. map: {key: {c:[x,y,z], s, r:[x,y,z]}} */
export function centered(map) {
  return it => { const out = {}; for (const k in map) { const m = map[k], p = it.parts[k], s = m.s ?? 1, q = new THREE.Quaternion().setFromEuler(new THREE.Euler(...(m.r || [0, 0, 0]))); const off = p.center.clone().multiplyScalar(s).applyQuaternion(q); out[k] = { p: [m.c[0] - off.x, m.c[1] - off.y, (m.c[2] || 0) - off.z], r: m.r || [0, 0, 0], s }; } return out; };
}

