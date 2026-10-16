/* a restorable object: parts (groups of meshes), surfaces (mask materials), tray, ghosts */
import * as THREE from 'three';
import { Surface } from '../surface/surface.js';
import { mesh, sphere } from '../assets/geo.js';
import { moveTo, clock, rng } from '../core/util.js';
import { R } from '../render/engine.js';

const HIDE_MAT = new THREE.MeshBasicMaterial({ visible: false });
export const GHOST_MAT = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.1, .35), transparent: true, opacity: .32, depthWrite: false, toneMapped: false });

export class Part {
  constructor(item, key, parent) {
    this.item = item; this.key = key; this.g = new THREE.Group(); this.g.name = 'part:' + key; this.g.userData.part = this;
    this.meshes = []; this.hits = []; this.surf = null; this.parentObj = parent; parent.add(this.g);
    this.home = null; this.state = 'home'; this.radius = 1; this.trayRot = 0;
  }
  add(geom, material, o = {}) {
    let m;
    if (material instanceof Surface) { m = mesh(geom, material.material(o.matx || {}), o); material.add(m); if (!this.surf) this.surf = material; }
    else m = mesh(geom, material, o);
    m.userData.part = this; (o.parent || this.g).add(m); if (!o.nohit) this.meshes.push(m); return m;
  }
  /* invisible pick proxy */
  hit(r, p = [0, 0, 0], o = {}) { const m = new THREE.Mesh(sphere(r, 10, 8), HIDE_MAT); m.position.set(...p); m.userData.part = this; m.userData.proxy = true; (o.parent || this.g).add(m); this.hits.push(m); return m; }
  pickables() { return this.meshes.concat(this.hits); }
  wp(local = [0, 0, 0]) { return this.g.localToWorld(new THREE.Vector3(...local)); }
  visible(v) { this.g.visible = v; }
}

export class Item {
  constructor(def, before = false) {
    this.def = def; this.before = before; this.root = new THREE.Group(); this.root.name = 'item:' + def.id;
    this.parts = {}; this.surfs = []; this.r = rng(def.seed || 7); this.tray = []; this.ghosts = []; this.extra = {};
  }
  part(key, o = {}) {
    const par = o.parent ? this.parts[o.parent].g : this.root, p = new Part(this, key, par);
    if (o.p) p.g.position.set(...o.p); if (o.r) p.g.rotation.set(...o.r); if (o.s != null) p.g.scale.setScalar(o.s);
    this.parts[key] = p; return p;
  }
  surface(name, o = {}) { const s = new Surface(this.def.id + ':' + name, { seed: this.surfs.length + 1, ...o }); this.surfs.push(s); return s; }
  finalize() {
    const P = Object.values(this.parts);
    /* finalize each surface in the frame of its owning part */
    for (const s of this.surfs) { const owner = s.meshes[0] && s.meshes[0].userData.part; if (owner) { const g = owner.g, pos = g.position.clone(), q = g.quaternion.clone(), sc = g.scale.clone(), par = g.parent; g.position.set(0, 0, 0); g.quaternion.identity(); g.scale.set(1, 1, 1); g.updateMatrixWorld(true); s.finalize(g); g.position.copy(pos); g.quaternion.copy(q); g.scale.copy(sc); } }
    for (const p of P) {
      p.home = { pos: p.g.position.clone(), quat: p.g.quaternion.clone(), scl: p.g.scale.x, parent: p.g.parent };
      const bb = new THREE.Box3(); const inv = new THREE.Matrix4(); p.g.updateMatrixWorld(true); inv.copy(p.g.matrixWorld).invert();
      p.g.traverse(o => { if (o.isMesh && o.material !== HIDE_MAT && o.geometry) { o.geometry.computeBoundingBox(); const b = o.geometry.boundingBox.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld)); bb.union(b); } });
      p.bb = bb; p.radius = bb.isEmpty() ? .5 : bb.getSize(new THREE.Vector3()).length() / 2; p.center = bb.isEmpty() ? new THREE.Vector3() : bb.getCenter(new THREE.Vector3());
    }
  }
  /* root-local matrix of a part at its goal placement (null if not on the object) */
  goalMatrix(p) {
    if (!p.g.visible || (p.state !== 'home' && p.state !== 'layout')) return null;
    const g = p.goal || { pos: p.g.position, quat: p.g.quaternion, scl: p.g.scale.x, parent: p.g.parent };
    const m = new THREE.Matrix4().compose(g.pos, g.quat, new THREE.Vector3(g.scl, g.scl, g.scl));
    if (g.parent === this.root) return m;
    const pp = g.parent && g.parent.userData.part; if (!pp) return m;
    const pm = this.goalMatrix(pp); return pm ? pm.multiply(m) : null;
  }
  /* ---------- placement ---------- */
  home(key, dur = .5, arc = 0, cb) {
    const p = this.parts[key]; this.untray(key); p.g.visible = true; p.state = 'home';
    if (p.g.parent !== p.home.parent) p.home.parent.attach(p.g);
    p.goal = { pos: p.home.pos, quat: p.home.quat, scl: p.home.scl, parent: p.home.parent };
    return moveTo(p.g, { pos: p.home.pos, quat: p.home.quat, scl: p.home.scl }, dur, cb, arc);
  }
  hide(key) { const p = this.parts[key]; this.untray(key); p.g.visible = false; p.state = 'hidden'; }
  layout(key, L, dur = .6) {
    const p = this.parts[key]; this.untray(key); p.g.visible = true; p.state = 'layout';
    if (p.g.parent !== this.root) this.root.attach(p.g);
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(...(L.r || [0, 0, 0])));
    const pos = new THREE.Vector3(...L.p); if (Item.restFix) Item.restFix(p, pos, q, L.s ?? 1);
    p.goal = { pos, quat: q, scl: L.s ?? 1, parent: this.root };
    return moveTo(p.g, { pos: pos.clone(), quat: q, scl: L.s ?? 1 }, dur, null, dur > 0 ? .3 : 0);
  }
  toTray(key, instant = false) {
    const p = this.parts[key]; p.g.visible = true; p.state = 'tray';
    if (!this.tray.includes(key)) this.tray.push(key);
    R.scene.attach(p.g); p.trayT = instant || clock.ff ? 1 : 0; p.trayAge = instant || clock.ff ? 9 : 0;
  }
  untray(key) { const i = this.tray.indexOf(key); if (i >= 0) this.tray.splice(i, 1); }
  /* tray slots: a row floating at the bottom of the view, sized in screen space */
  /* only parts a step is about to put back are shown in the tray; the rest wait out of sight */
  updateTray(dt, camera, wanted = () => true) {
    for (const k of this.tray) { const p = this.parts[k], w = wanted(k); p.trayAge = (p.trayAge || 0) + dt; if (!w && p.g.visible && !p.dragging && !p.busy && p.trayAge > .9) { p.g.visible = false; } else if (w && !p.g.visible) { p.g.visible = true; p.trayT = 1; } }
    const keys = this.tray.filter(k => this.parts[k].g.visible), n = keys.length; if (!n) return;
    const f = new THREE.Vector3(); camera.getWorldDirection(f); const r = new THREE.Vector3().crossVectors(f, camera.up).normalize(), u = new THREE.Vector3().crossVectors(r, f);
    const D = 7, hh = Math.tan(camera.fov * Math.PI / 360) * D, hw = hh * camera.aspect, maxW = Math.min(hw * .82, .55 * hh * (n - 1));
    keys.forEach((k, i) => {
      const p = this.parts[k]; if (p.dragging || p.busy) return;
      const x = n <= 1 ? 0 : (i / (n - 1) * 2 - 1) * maxW;
      const goal = camera.position.clone().addScaledVector(f, D).addScaledVector(r, x).addScaledVector(u, -hh * .4);
      const s = Math.min(hh * .11, hw * .6 / Math.max(1, n)) / Math.max(.05, p.radius), a = 1 - Math.exp(-9 * dt);
      p.trayRot += dt * .6; const q = camera.quaternion.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(.35, p.trayRot, 0))).multiply(p.home.quat);
      const cOff = p.center.clone().multiplyScalar(s).applyQuaternion(q); goal.sub(cOff);
      if (p.trayT >= 1) { p.g.position.copy(goal); p.g.scale.setScalar(s); p.g.quaternion.copy(q); p.trayT = 2; }
      else { p.g.position.lerp(goal, a); p.g.scale.setScalar(p.g.scale.x + (s - p.g.scale.x) * a); p.g.quaternion.slerp(q, a); }
    });
  }
  ghost(key, show = true) {
    let gh = this.ghosts.find(g => g.userData.key === key);
    if (!gh) {
      const p = this.parts[key]; gh = new THREE.Group(); gh.userData.key = key;
      p.g.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(p.g.matrixWorld).invert();
      p.g.traverse(o => { if (o.isMesh && o.material !== HIDE_MAT) { const m = new THREE.Mesh(o.geometry, GHOST_MAT); m.matrixAutoUpdate = false; m.matrix.multiplyMatrices(inv, o.matrixWorld); m.renderOrder = 5; gh.add(m); } });
      this.ghosts.push(gh);
    }
    const p = this.parts[key]; p.home.parent.add(gh); gh.position.copy(p.home.pos); gh.quaternion.copy(p.home.quat); gh.scale.setScalar(p.home.scl); gh.visible = show; return gh;
  }
  hideGhosts() { for (const g of this.ghosts) g.visible = false; }
  surfaces() { return this.surfs; }
  update(dt) { for (const s of this.surfs) s.update(dt); }
  dispose() {
    for (const k of this.tray.slice()) { const p = this.parts[k]; if (p.g.parent) p.g.parent.remove(p.g); }
    this.root.parent && this.root.parent.remove(this.root);
    for (const s of this.surfs) s.dispose();
    this.root.traverse(o => { if (o.isMesh && o.geometry) o.geometry.dispose(); });
  }
}
