/* Reusable, data-driven interaction systems. Each factory returns a step object:
   { id, name, tool, input, hint, done, cam, pose, enter, nodes, onDown/onMove/onUp, update, markers, skip, exit, tut } */
import * as THREE from 'three';
import { G, RIG, CAM, STAGE, finishStep, turnItem, isTurned, camImpulse, setView, st } from './game.js';
import { R, project } from './engine.js';
import { T, toolStrike } from './tools.js';
import { sfx } from './audio.js';
import { puff, flakes, debris, sparks, bubbles, foam, glints, drops, grains, dust, emit } from './particles.js';
import { clamp, lerp, rnd, tween, later, clock, vib, moveTo, smooth, ease } from './util.js';
import { glass, mat, metal, cyl, box, rbox, mesh, lathe, torus, plastic } from './geo.js';
import { BENCH_Y } from './world.js';

export const I = () => G.item;
const tmpV = new THREE.Vector3();
export const toast = (m, ms) => { G.toast && G.toast(m, ms); };
const worldScale = o => o.getWorldScale(tmpV).x;
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
function base(o) {
  return Object.assign({ canTurn: false, prog: 0, input: 'Drag', tool: 'hand', toolLabel: 'Bare Hands', nodes() { return []; }, markers() { return []; } }, o);
}
const TOOLNAME = { hammer: 'Hammer', punch: 'Pin Punch', wire: 'Wire Brush', soap: 'Soap Brush', soft: 'Soft Brush', detail: 'Detail Brush', pick: 'Metal Pick', sand: 'Sandpaper', grind: 'Rotary Grinder', buff: 'Buffing Wheel', file: 'Metal File', cloth: 'Polishing Cloth', micro: 'Microfiber Cloth', sponge: 'Sponge', pad: 'Treatment Pad', stain: 'Stain Brush', finish: 'Finish Brush', spray: 'Penetrating Spray', paint: 'Spray Paint', oil: 'Oil Can', water: 'Water Jet', screw: 'Screwdriver', pry: 'Pry Tool', tweez: 'Tweezers', puller: 'Keycap Puller', pliers: 'Pliers', sandgun: 'Sandblaster', shiner: 'Metal Shiner', compound: 'Cleaning Compound', vacuum: 'Vacuum', blower: 'Air Blower', filler: 'Repair Filler', press: 'Press Tool', heat: 'Heat Gun', hand: 'Bare Hands', crown: 'Crown', magnify: 'Magnifier', none: 'Hands' };
export const toolName = k => TOOLNAME[k] || 'Tool';

/* ---------- FX presets used by painting ---------- */
const FX = {
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
    },
    showGroup(i, instant) {
      const it = I(), g = this.groups[i]; this.sq = i; if (typeof g.L === 'function') g.L = g.L(it);
      for (const gr of this.groups) for (const k of gr.keys) if (!g.keys.includes(k)) it.hide(k);
      for (const k of g.keys) { const L = g.L && g.L[k]; if (L) it.layout(k, L, instant || clock.ff ? 0 : .5); else it.home(k, instant || clock.ff ? 0 : .4); }
      if (!instant) later(60, () => setView(this.cam || { preset: 'full' }));
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
      for (const q of pts) {
        surf.dab(q, n, rad, o.layer, o.mode || 'sub', (o.amt || .45) * k, o.target);
        for (const a of o.also || []) surf.dab(q, n, rad * (a.rs || 1), a.layer, a.mode || 'sub', (a.amt || .45) * k, a.target);
      }
      const fx = FX[o.fx || 'rust']; if (fx) fx(hit.point, k);
      sfx(o.snd || 'brush', o.sndGap || 70);
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
      const req = o.req ?? .8;
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
      let d = 0, n = 0; for (const t of this.tasks) { d += t.frac() * t.n; n += t.n; } const f = n ? d / n : 1; this.prog = Math.min(1, f / req);
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
      if (c.busy) return; c.busy = true; sfx('click'); const m = c.m, w0 = m.getWorldPosition(new THREE.Vector3()); R.scene.attach(m);
      const f = new THREE.Vector3(); R.camera.getWorldDirection(f); const side = new THREE.Vector3().crossVectors(f, R.camera.up).normalize();
      const dest = R.camera.position.clone().addScaledVector(f, 6).addScaledVector(R.camera.up, -2.6).addScaledVector(side, rnd(-1.2, 1.2)), s0 = m.scale.x;
      puff(w0, o.puff || [.5, .45, .38], 3, { a: .35 });
      tween(.75, k => { m.position.lerpVectors(w0, dest, k); m.position.y += Math.sin(k * Math.PI) * 1.2; m.rotation.x += .1; m.scale.setScalar(s0 * (1 - k * .7)); }, () => { m.visible = false; c.gone = true; sfx('pop'); c.busy = false; this.recalc(); }, ease);
      if (c.surf && c.p) c.surf.dab(c.p, c.n, (c.size || .3) * 1.4, o.layer || 'dirt', 'sub', .8);
    },
    recalc() { const n = this.list.length; this.prog = this.list.reduce((a, c) => a + (c.gone ? 1 : Math.max(0, 1 - Math.max(0, c.hp)) * .8), 0) / n; if (this.list.every(c => c.gone) && !this.done_) { this.done_ = true; later(350, () => finishStep()); } },
    markers() { return this.list.filter(c => !c.gone && !c.busy).map(c => ({ pos: c.m.getWorldPosition(new THREE.Vector3()), r: o.mr || 22, prog: o.grab ? 0 : 1 - Math.max(0, c.hp), vis: facing(c.m, c.n) })); },
    skip() { for (const c of this.list) { if (!c.gone) { c.gone = true; c.m.visible = false; if (c.surf && c.p) c.surf.dab(c.p, c.n, (c.size || .3) * 1.7, o.layer || 'crust', 'sub', 1); } } },
    exit() { this.done_ = false; for (const c of this.list) c.m.visible = false; if (o.exit) o.exit.call(this); }
  });
}
function facing(m, nLocal) {
  if (!nLocal) return true; const n = nLocal.clone().applyQuaternion(m.parent ? m.parent.getWorldQuaternion(new THREE.Quaternion()) : new THREE.Quaternion());
  return n.dot(new THREE.Vector3().subVectors(R.camera.position, m.getWorldPosition(new THREE.Vector3())).normalize()) > -.1;
}

/* ============ 3. extract: drag a part along a constrained axis; optional resistance then pop ============ */
export function extract(o) {
  return base({ kind: 'extract', 
    input: 'Drag', lockRig: true, ...o, toolLabel: o.toolLabel || toolName(o.tool || 'hand'),
    enter() { this.items = (typeof o.items === 'function' ? o.items() : o.items).map(x => ({ thr: 1.4, ...x, done: false, p: 0, strain: 0, freed: !x.resist })); this.cur = null; G.chips = [{ label: o.chip || 'Removed', get: () => this.prog }]; if (o.enter) o.enter.call(this); },
    ready(it) { return !it.after || this.items.find(x => x.key === it.after).done; },
    nodes() { const it = I(); return this.items.filter(x => !x.done && this.ready(x)).flatMap(x => (x.grip || [x.key]).flatMap(k => it.parts[k].pickables())); },
    onDown(hit, ray) {
      const part = hit && hit.object.userData.part; const x = part && this.items.find(i => !i.done && this.ready(i) && (i.key === part.key || (i.grip || []).includes(part.key))); if (!x) return;
      const P = I().parts[x.key]; this.cur = x; P.dragging = true; const n = new THREE.Vector3(); R.camera.getWorldDirection(n);
      this.plane = new THREE.Plane().setFromNormalAndCoplanarPoint(n, hit.point); this.w0 = hit.point.clone(); x.g0 = P.home.pos.clone(); sfx('click');
      x.axisW = null; x.lastS = 0;
    },
    onMove(hit, ray) {
      const x = this.cur; if (!x || x.done) return; const P = I().parts[x.key], w = new THREE.Vector3(); if (!ray.intersectPlane(this.plane, w)) return;
      const dW = w.sub(this.w0), par = P.g.parent, pq = par.getWorldQuaternion(new THREE.Quaternion()).invert(), ps = worldScale(par);
      const d = dW.applyQuaternion(pq).divideScalar(ps), ax = new THREE.Vector3(...x.axis).normalize();
      let s = clamp(d.dot(ax), 0, x.thr * 1.2);
      if (!x.freed) { const lim = x.thr * .1; x.pull = s > lim ? Math.min(1, (s - lim) / (x.thr * .25)) : 0; if (s > lim) s = lim + Math.sin(G.time * 60) * .012 * x.thr; }
      P.g.position.copy(x.g0).addScaledVector(ax, s); for (const k of x.also || []) { const A = I().parts[k]; A.g.position.copy(A.home.pos).addScaledVector(ax, s); }
      if (Math.abs(s - x.lastS) > .1 * x.thr) { sfx('scrape', 90); x.lastS = s; }
      x.p = x.freed ? clamp(s / x.thr, 0, 1) : clamp(x.strain, 0, 1) * .45; this.recalc();
      if (x.freed && s >= x.thr) this.detach(x);
    },
    update(dt) {
      const x = this.cur; if (!x || x.done || x.freed || !x.pull) return; const P = I().parts[x.key];
      x.strain += dt * (.45 + .75 * x.pull); G.shake = Math.max(G.shake, .1 + .15 * x.pull); if (Math.random() < dt * 4) sfx('creak', 300); if (Math.random() < dt * 10) grains(P.wp(x.mk || [0, 0, 0]), 2, [.5, .25, .1]);
      x.p = clamp(x.strain, 0, 1) * .45; this.recalc();
      if (x.strain >= 1) { x.freed = true; x.pull = 0; this.w0.add(new THREE.Vector3(0, 0, 0)); sfx('bigpop'); camImpulse(1.1); vib([30, 30, 60]); const wp = P.wp(x.mk || [0, 0, 0]); debris(wp, 26, [.45, .2, .08]); flakes(wp, 18); puff(wp, [.55, .3, .14], 10, { a: .55, s0: .2, s1: .6 }); toast('It popped free!'); if (x.onFree) x.onFree.call(this, x); x.popT = G.time; }
    },
    onUp() { const x = this.cur; this.cur = null; if (!x || x.done) return; const P = I().parts[x.key]; P.dragging = false; x.pull = 0; if (!x.freed) x.strain *= .85; x.p = x.freed ? 0 : x.p; moveTo(P.g, { pos: x.g0 }, .22); for (const k of x.also || []) moveTo(I().parts[k].g, { pos: I().parts[k].home.pos }, .22); this.recalc(); },
    recalc() { this.prog = this.items.reduce((a, x) => a + (x.done ? 1 : x.p * .9), 0) / this.items.length; },
    detach(x) {
      x.done = true; this.cur = null; const it = I(), P = it.parts[x.key]; P.dragging = false; sfx(x.snd || 'pop'); vib(20); camImpulse(.3);
      puff(P.wp(), [.7, .65, .55], 4, { a: .4 }); if (x.flakes !== false) flakes(P.wp(), 6, x.col);
      if (x.to === 'stay') { } else if (x.to === 'fly') { P.busy = true; R.scene.attach(P.g); const w0 = P.g.position.clone(), s0 = P.g.scale.x; tween(.7, k => { P.g.position.set(w0.x + 2 * k, w0.y + 3 * k - 4 * k * k, w0.z + 1.5 * k); P.g.rotation.z = k * 6; P.g.scale.setScalar(s0 * (1 - k)); }, () => { P.g.visible = false; P.busy = false; P.state = 'hidden'; }); }
      else { it.toTray(x.key); for (const k of x.also || []) it.toTray(k); }
      if (x.after_) x.after_.call(this, x); this.recalc();
      if (this.items.every(i => i.done)) { this.prog = 1; later(450, () => finishStep()); }
    },
    markers() { return this.items.filter(x => !x.done && this.ready(x)).map(x => ({ pos: I().parts[x.key].wp(x.mk || [0, 0, 0]), r: x.mr || 30, label: x.label, prog: x.freed ? 0 : x.strain })); },
    skip() { const it = I(); for (const x of this.items) { if (x.done) continue; x.done = true; if (x.to === 'stay') { const P = it.parts[x.key]; P.g.position.copy(P.home.pos).addScaledVector(new THREE.Vector3(...x.axis).normalize(), x.thr); } else if (x.to === 'fly') it.hide(x.key); else { it.toTray(x.key, true); for (const k of x.also || []) it.toTray(k, true); } if (x.onFree) x.onFree.call(this, x); if (x.after_) x.after_.call(this, x); } },
    exit() { if (o.exit) o.exit.call(this); }
  });
}

/* ============ 4. fasteners: press & hold on a screw to drive it out / in ============ */
export function screws(o) {
  return base({ kind: 'screws', grabAll: true, 
    input: 'Hold', tool: o.tool || 'screw', lockRig: true, ...o, toolLabel: o.toolLabel || toolName(o.tool || 'screw'),
    enter() {
      const it = I(); this.items = o.keys.map(k => ({ key: k, p: 0, done: false })); this.cur = null; G.chips = [{ label: o.chip || 'Screws', get: () => this.prog }];
      for (const x of this.items) { const P = it.parts[x.key]; if (o.dir === 'in') { it.home(x.key, 0); P.g.position.copy(P.home.pos).addScaledVector(this.ax(), o.rise || .3); } else it.home(x.key, 0); }
      if (o.enter) o.enter.call(this);
    },
    ax() { return new THREE.Vector3(...(o.axis || [0, 1, 0])).normalize(); },
    nodes() { const it = I(); return this.items.filter(x => !x.done).flatMap(x => it.parts[x.key].pickables()); },
    assist(x, y) { let best = null, bd = 44; for (const s of this.items) { if (s.done) continue; const w = I().parts[s.key].wp(), q = project(w); const d = Math.hypot(q.x - x, q.y - y); if (d < bd) { bd = d; best = { object: I().parts[s.key].meshes[0] || I().parts[s.key].hits[0], point: w, face: { normal: new THREE.Vector3(0, 0, 1) } }; } } return best; },
    onDown(hit) { const part = hit && hit.object.userData.part, x = part && this.items.find(i => !i.done && i.key === part.key); if (!x) return; this.cur = x; T.spinning = true; sfx('click'); },
    onUp() { this.cur = null; T.spinning = false; },
    update(dt) {
      const x = this.cur; if (!x || !G.down) { T.spinning = false; return; } T.spinning = true; const P = I().parts[x.key];
      x.p = Math.min(1, x.p + dt / (o.time || 1.0)); const ax = this.ax();
      P.g.quaternion.copy(P.home.quat).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(...(o.spinAxis || o.axis || [0, 1, 0])), (o.dir === 'in' ? -1 : 1) * x.p * 14));
      P.g.position.copy(P.home.pos).addScaledVector(ax, (o.dir === 'in' ? 1 - x.p : x.p) * (o.rise || .3)); sfx('ratchet', 160);
      if (Math.random() < dt * 8) puff(P.wp(), [.6, .5, .4], 1, { a: .3, s0: .04, s1: .1 });
      this.prog = this.items.reduce((a, i) => a + i.p, 0) / this.items.length;
      if (x.p >= 1) {
        x.done = true; this.cur = null; T.spinning = false; sfx('pop'); vib(25); G.shake = .25; P.g.quaternion.copy(P.home.quat);
        if (o.dir === 'in') { P.g.position.copy(P.home.pos); sfx('ping'); glints(P.wp(), 6, .3); } else if (o.to !== 'stay') I().toTray(x.key);
        if (this.items.every(i => i.done)) { this.prog = 1; later(450, () => finishStep()); }
      }
    },
    markers() { return this.items.filter(i => !i.done).map(i => ({ pos: I().parts[i.key].wp(), r: o.mr || 22, prog: i.p })); },
    skip() { const it = I(); for (const x of this.items) { const P = it.parts[x.key]; P.g.quaternion.copy(P.home.quat); if (o.dir === 'in') P.g.position.copy(P.home.pos); else if (o.to !== 'stay') it.toTray(x.key, true); } },
    exit() { T.spinning = false; if (o.exit) o.exit.call(this); }
  });
}

/* ============ 5. drag & snap parts from the tray into their ghost sockets ============ */
export function snap(o) {
  return base({ kind: 'snap', 
    input: 'Drag', lockRig: true, ...o, toolLabel: o.toolLabel || toolName(o.tool || 'hand'),
    enter() {
      const it = I(); this.items = (typeof o.keys === 'function' ? o.keys() : o.keys).map(k => ({ key: k, done: false, p: 0 })); this.cur = null;
      for (const x of this.items) { if (it.parts[x.key].state !== 'tray') it.toTray(x.key, clock.ff); }
      G.chips = [{ label: o.chip || 'Parts', get: () => this.prog }]; if (o.enter) o.enter.call(this); this.ghosts();
    },
    ready(x) { return !o.ordered || this.items.indexOf(x) === 0 || this.items[this.items.indexOf(x) - 1].done; },
    ghosts() { const it = I(); for (const x of this.items) it.ghost(x.key, !x.done && this.ready(x)); },
    nodes() { const it = I(); return this.items.filter(x => !x.done && this.ready(x)).flatMap(x => it.parts[x.key].pickables()); },
    assist(px, py) { let best = null, bd = 60; for (const x of this.items) { if (x.done || !this.ready(x)) continue; const P = I().parts[x.key], w = P.g.localToWorld(P.center.clone()), q = project(w); const d = Math.hypot(q.x - px, q.y - py); if (d < bd) { bd = d; best = { object: P.meshes[0] || P.hits[0], point: w, face: null }; } } return best; },
    onDown(hit) {
      const part = hit && hit.object.userData.part, x = part && this.items.find(i => !i.done && this.ready(i) && i.key === part.key); if (!x) return;
      const P = part; this.cur = x; P.dragging = true; const n = new THREE.Vector3(); R.camera.getWorldDirection(n);
      const goalW = this.goalWorld(x); this.plane = new THREE.Plane().setFromNormalAndCoplanarPoint(n, goalW); this.grabOff = null; x.s0 = P.g.scale.x; sfx('click');
      x.d0 = null;
    },
    goalWorld(x) { const P = I().parts[x.key], par = P.home.parent; return par.localToWorld(P.home.pos.clone().add(P.center.clone().applyQuaternion(P.home.quat).multiplyScalar(P.home.scl))); },
    onMove(hit, ray) {
      const x = this.cur; if (!x || x.done) return; const P = I().parts[x.key], w = new THREE.Vector3(); if (!ray.intersectPlane(this.plane, w)) return;
      const goal = this.goalWorld(x), dist = w.distanceTo(goal); if (x.d0 == null) x.d0 = Math.max(dist, 1);
      const hs = P.home.scl * worldScale(P.home.parent), k = smooth(0, 1, 1 - clamp((dist - .3) / Math.max(1.5, x.d0 * .8), 0, 1)), s = lerp(x.s0, hs, k);
      P.g.scale.setScalar(s); const cOff = P.center.clone().applyQuaternion(P.g.quaternion).multiplyScalar(s); P.g.position.copy(w).sub(cOff);
      const hq = P.home.parent.getWorldQuaternion(new THREE.Quaternion()).multiply(P.home.quat); P.g.quaternion.slerp(hq, .15 + .5 * k);
      x.p = clamp(1 - dist / x.d0, 0, 1); this.recalc(); if (Math.random() < .08) sfx('scrape', 120);
      if (dist < (o.thr || .9) * Math.max(.6, CAM.dist / 14)) this.place(x);
    },
    onUp() { const x = this.cur; this.cur = null; if (!x || x.done) return; const P = I().parts[x.key]; P.dragging = false; x.p = 0; this.recalc(); },
    place(x) {
      x.done = true; this.cur = null; const it = I(), P = it.parts[x.key]; P.dragging = false; P.busy = true; it.untray(x.key);
      const par = P.home.parent; par.attach(P.g); sfx('click'); vib(25);
      moveTo(P.g, { pos: P.home.pos, quat: P.home.quat, scl: P.home.scl }, .22, () => { P.busy = false; P.state = 'home'; sfx(o.snd || 'ping'); glints(P.wp(), 8, .4); if (o.onPlace) o.onPlace.call(this, x); });
      this.recalc(); this.ghosts(); if (this.items.every(i => i.done)) { this.prog = 1; later(600, () => finishStep()); }
    },
    recalc() { this.prog = this.items.reduce((a, x) => a + (x.done ? 1 : x.p * .9), 0) / this.items.length; },
    markers() { return this.items.filter(x => !x.done && this.ready(x)).slice(0, 4).map(x => ({ pos: this.goalWorld(x), r: o.mr || 26, label: o.label })); },
    skip() { const it = I(); for (const x of this.items) { if (!x.done) { x.done = true; it.home(x.key, 0); if (o.onPlace) o.onPlace.call(this, x); } } it.hideGhosts(); },
    exit() { I().hideGhosts(); if (o.exit) o.exit.call(this); },
    tut: o.tut || { title: o.name, body: o.hint, demo() { const x = this.items && this.items.find(i => !i.done && this.ready(i)); if (!x) return null; const P = I().parts[x.key]; return { type: 'drag', pts: [P.g.localToWorld(P.center.clone()), this.goalWorld(x)] }; } }
  });
}

/* ============ 6. hold the tool on target spots (grinder, buffer, heat, straighten, vacuum) ============ */
export function hold(o) {
  return base({ kind: 'hold', grabAll: true, 
    input: 'Hold', ...o, toolLabel: o.toolLabel || toolName(o.tool),
    enter() { this.spots = o.spots().map(s => ({ r: .55, ...s, hp: 1, done: false })); this.down = false; G.chips = [{ label: o.chip || 'Spots', get: () => this.prog }]; if (o.enter) o.enter.call(this); },
    nodes() { const it = I(); return (o.parts ? o.parts() : Object.keys(it.parts)).flatMap(k => it.parts[k].g.visible ? it.parts[k].meshes : []); },
    onDown() { this.down = true; T.spinning = !!o.spin; },
    onUp() { this.down = false; T.spinning = false; },
    pos(s) { return I().parts[s.key].wp(s.p); },
    update(dt) {
      let sum = 0; T.spinning = this.down && !!o.spin;
      for (const s of this.spots) {
        if (!s.done && this.down && T.onSurf && T.hitPt) {
          const p = this.pos(s), sc = worldScale(I().root);
          if (T.hitPt.distanceTo(p) < s.r * sc * 1.25) {
            s.hp -= dt / (o.time || 1.2); const fx = o.fx || 'sparks';
            if (fx === 'sparks') sparks(T.hitPt, 3, [rnd(-1, 1), 0, rnd(-1, 1)]); else if (fx === 'glint') { if (Math.random() < .3) glints(T.hitPt, 1, .2); } else if (fx === 'dust') { if (Math.random() < .5) dust(T.hitPt, 1); } else if (fx === 'heat') { if (Math.random() < .3) puff(T.hitPt, [.5, .45, .4], 1, { a: .25 }); }
            sfx(o.snd || 'grind', 60); G.shake = Math.max(G.shake, o.shake ?? .2); vib(6);
            if (s.onProg) s.onProg(1 - Math.max(0, s.hp), s); if (o.onProg) o.onProg.call(this, s, 1 - Math.max(0, s.hp));
            if (s.hp <= 0) { s.done = true; sfx('ping'); glints(p, 8, .25); if (s.onDone) s.onDone(s); if (o.onSpot) o.onSpot.call(this, s); }
          }
        }
        sum += s.done ? 1 : 1 - Math.max(0, s.hp);
      }
      this.prog = sum / this.spots.length; if (this.spots.every(s => s.done) && !this.fin) { this.fin = true; finishStep(); }
    },
    markers() { return this.spots.filter(s => !s.done).map(s => ({ pos: this.pos(s), r: o.mr || 26, prog: 1 - s.hp, label: s.label })); },
    skip() { for (const s of this.spots) { if (!s.done) { s.done = true; if (s.onProg) s.onProg(1, s); if (o.onProg) o.onProg.call(this, s, 1); if (s.onDone) s.onDone(s); if (o.onSpot) o.onSpot.call(this, s); } } },
    exit() { this.fin = false; T.spinning = false; if (o.exit) o.exit.call(this); },
    tut: o.tut || { title: o.name, body: o.hint, demo() { const s = this.spots && this.spots.find(x => !x.done); return s ? { type: 'hold', pts: [this.pos(s)] } : null; } }
  });
}

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

/* ============ 8. rotational gesture around a screen-space centre ============ */
export function rotate(o) {
  return base({ kind: 'rotate', 
    input: 'Circle', grabAll: true, lockRig: true, ...o, toolLabel: o.toolLabel || toolName(o.tool || 'hand'),
    enter() { this.acc = 0; this.last = null; this.prog = 0; G.chips = [{ label: o.chip || 'Turns', get: () => this.prog }]; if (o.enter) o.enter.call(this); },
    nodes() { return o.nodes ? o.nodes() : []; },
    ang(r) { const c = project(o.center()); return Math.atan2(r.y - c.y, r.x - c.x); },
    onDown(hit, ray, r) { this.last = this.ang(r); },
    onMove(hit, ray, r) {
      if (this.last == null || this.fin) return; const a = this.ang(r); let d = a - this.last; if (d > Math.PI) d -= Math.PI * 2; else if (d < -Math.PI) d += Math.PI * 2; this.last = a;
      if (o.signed && d * o.signed < 0) return;
      this.acc += Math.abs(d); this.prog = clamp(this.acc / ((o.turns || 2) * Math.PI * 2), 0, 1); if (o.onTurn) o.onTurn.call(this, d, this.prog); sfx(o.snd || 'ratchet', o.sndGap || 140);
      if (this.prog >= 1) { this.fin = true; if (o.onDone) o.onDone.call(this); later(o.delay ?? 400, () => finishStep()); }
    },
    onUp() { this.last = null; },
    markers() { return this.fin ? [] : [{ pos: o.center(), r: o.mr || 44, label: o.label || 'Circle' }]; },
    skip() { if (o.onTurn) o.onTurn.call(this, 0, 1); if (o.onDone) o.onDone.call(this); },
    exit() { this.fin = false; if (o.exit) o.exit.call(this); },
    tut: o.tut || { title: o.name, body: o.hint, demo() { return { type: 'circle', pts: [o.center()] }; } }
  });
}

/* ============ 9. inspection hotspots ============ */
export function inspect(o) {
  return base({ kind: 'inspect', 
    input: 'Tap', tool: 'magnify', toolLabel: 'Magnifier', canTurn: true, ...o,
    enter() { this.spots = o.spots().map(s => ({ ...s, done: false })); this.busyI = false; G.chips = []; RIG.spin = o.spin ?? .18; if (o.enter) o.enter.call(this); },
    nodes() { const it = I(); return Object.values(it.parts).filter(p => p.g.visible).flatMap(p => p.meshes); },
    pos(s) { return I().parts[s.key].wp(s.p || [0, 0, 0]); },
    onDown(hit) { if (!hit) return; let best = null, bd = 1e9; for (const s of this.spots) { if (s.done) continue; const d = this.pos(s).distanceTo(hit.point); if (d < bd) { bd = d; best = s; } } if (best && bd < (o.r || 1.6) * worldScale(I().root)) this.look(best); },
    look(s) {
      if (s.done || this.busyI) return; this.busyI = true; s.done = true; sfx('ping'); vib(15); const p = this.pos(s); glints(p, 12, .4); toast((s.label || '') + (s.note ? ': ' + s.note : ''), 1600);
      if (s.onLook) s.onLook(s);
      const keepSpin = RIG.spin; RIG.spin = 0; const gt = CAM.gt.clone(), gd = CAM.gdist; CAM.gt.copy(p); CAM.gdist = gd * .55;
      later(clock.ff ? 0 : 1100, () => { CAM.gt.copy(gt); CAM.gdist = gd; RIG.spin = keepSpin; this.busyI = false; this.prog = this.spots.filter(x => x.done).length / this.spots.length; if (this.spots.every(x => x.done)) finishStep(); });
    },
    markers() { return this.spots.filter(s => !s.done).map(s => ({ pos: this.pos(s), r: 28, label: s.label, tap: () => this.look(s) })); },
    skip() { for (const s of this.spots) { s.done = true; if (s.onLook) s.onLook(s); } },
    exit() { RIG.spin = 0; if (o.exit) o.exit.call(this); },
    tut: o.tut || { title: o.name, body: o.hint, demo() { return { type: 'tap', pts: (this.spots || []).filter(s => !s.done).map(s => this.pos(s)) }; } }
  });
}

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
      if (isJar) c.add(mesh(cyl(r + .05, r + .05, .14, 40), metal('#9aa5ab', .3), { p: [0, H, 0] }));
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
      G.offGoal = new THREE.Vector3(0, this.lift - this.depth * .5, 0);
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

/* ============ 11. tap targets (in order or any order); hammer strikes, keycap pops, typing ============ */
export function taps(o) {
  return base({ kind: 'taps', grabAll: true, 
    input: 'Tap', lockRig: true, ...o, toolLabel: o.toolLabel || toolName(o.tool || 'hand'),
    enter() { this.list = o.targets().map(t => ({ hits: 0, need: o.hits || 1, done: false, ...t })); this.idx = 0; G.chips = [{ label: o.chip || 'Targets', get: () => this.prog }]; if (o.enter) o.enter.call(this); },
    cur() { return o.ordered ? this.list.filter(t => !t.done).slice(0, 1) : this.list.filter(t => !t.done); },
    pos(t) { return I().parts[t.key].wp(t.p || [0, 0, 0]); },
    nodes() { const it = I(); return [...new Set(this.cur().map(t => t.key))].flatMap(k => it.parts[k].pickables()); },
    assist(x, y) { let best = null, bd = o.assistPx || 46; for (const t of this.cur()) { const w = this.pos(t), q = project(w); const d = Math.hypot(q.x - x, q.y - y); if (d < bd) { bd = d; best = { object: I().parts[t.key].meshes[0] || I().parts[t.key].hits[0], point: w, face: null, target: t }; } } return best; },
    onDown(hit) {
      if (!hit) return; let t = hit.target; if (!t) { let bd = 1e9; for (const c of this.cur()) { const d = this.pos(c).distanceTo(hit.point); if (d < bd) { bd = d; t = c; } } if (bd > (o.r || 1.2) * worldScale(I().root)) t = null; }
      if (!t) { if (o.wrong) o.wrong.call(this, hit); return; }
      const fire = () => { t.hits++; if (o.onHit) o.onHit.call(this, t, t.hits); if (t.hits >= t.need) { t.done = true; if (o.onDone) o.onDone.call(this, t); } this.prog = this.list.reduce((a, x) => a + Math.min(x.hits, x.need) / x.need, 0) / this.list.length; if (this.list.every(x => x.done) && !this.fin) { this.fin = true; later(o.delay ?? 500, () => finishStep()); } };
      if (o.strike) toolStrike(fire); else fire();
    },
    markers() { return this.cur().slice(0, o.ordered ? 1 : 12).map(t => ({ pos: this.pos(t), r: t.mr || o.mr || 22, label: t.label, prog: t.need > 1 ? t.hits / t.need : 0 })); },
    skip() { for (const t of this.list) { while (!t.done) { t.hits++; if (o.onHit) o.onHit.call(this, t, t.hits); if (t.hits >= t.need) { t.done = true; if (o.onDone) o.onDone.call(this, t); } } } },
    exit() { this.fin = false; if (o.exit) o.exit.call(this); },
    tut: o.tut || { title: o.name, body: o.hint, demo() { return { type: 'tap', pts: (this.list ? this.cur() : []).slice(0, 4).map(t => this.pos(t)) }; } }
  });
}

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
import { lump } from './geo.js';
const lumpGeom = (size, seed) => lump(size, seed, 1.25, .5, 1.1, 1);
let CRUST = null; export function crustMat() { if (!CRUST) CRUST = new THREE.MeshStandardMaterial({ color: '#5e2a12', roughness: 1, metalness: 0, flatShading: true }); return CRUST; }
export const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
/* layout helper: place parts by the centre of their bounds. map: {key: {c:[x,y,z], s, r:[x,y,z]}} */
export function centered(map) {
  return it => { const out = {}; for (const k in map) { const m = map[k], p = it.parts[k], s = m.s ?? 1, q = new THREE.Quaternion().setFromEuler(new THREE.Euler(...(m.r || [0, 0, 0]))); const off = p.center.clone().multiplyScalar(s).applyQuaternion(q); out[k] = { p: [m.c[0] - off.x, m.c[1] - off.y, (m.c[2] || 0) - off.z], r: m.r || [0, 0, 0], s }; } return out; };
}
