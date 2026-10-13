/* geometry + plain material helpers shared by every level */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { TAU } from '../core/util.js';

/* lathe around Y from [[r,y,hard?],...]; a truthy 3rd element makes a hard edge */
export function lathe(profile, seg = 24, phiStart = 0, phiLen = TAU) {
  const P0 = profile.length, arc0 = [0];
  for (let k = 1; k < P0; k++) arc0.push(arc0[k - 1] + Math.hypot(profile[k][0] - profile[k - 1][0], profile[k][1] - profile[k - 1][1]));
  const total = arc0[P0 - 1] || 1;
  const segN = k => { const a = profile[k], b = profile[k + 1], dr = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dr, dy) || 1; return [dy / l, -dr / l]; };
  const ent = [];
  for (let k = 0; k < P0; k++) {
    const pn = k > 0 ? segN(k - 1) : null, nn = k < P0 - 1 ? segN(k) : null;
    const mix = () => { if (pn && nn) { const x = pn[0] + nn[0], y = pn[1] + nn[1], l = Math.hypot(x, y) || 1; return [x / l, y / l]; } return pn || nn; };
    const r = Math.max(1e-4, profile[k][0]);
    if (profile[k][2] && pn && nn) { ent.push({ r, y: profile[k][1], n: pn, v: arc0[k] / total, brk: false }); ent.push({ r, y: profile[k][1], n: nn, v: arc0[k] / total, brk: true }); }
    else ent.push({ r, y: profile[k][1], n: mix(), v: arc0[k] / total, brk: false });
  }
  const P = ent.length, vc = (seg + 1) * P;
  const pos = new Float32Array(vc * 3), nor = new Float32Array(vc * 3), uv = new Float32Array(vc * 2), idx = [];
  for (let i = 0; i <= seg; i++) {
    const th = phiStart + i / seg * phiLen, c = Math.cos(th), s = Math.sin(th);
    for (let k = 0; k < P; k++) {
      const o = i * P + k, e = ent[k];
      pos[o * 3] = e.r * s; pos[o * 3 + 1] = e.y; pos[o * 3 + 2] = e.r * c;
      nor[o * 3] = e.n[0] * s; nor[o * 3 + 1] = e.n[1]; nor[o * 3 + 2] = e.n[0] * c;
      uv[o * 2] = i / seg; uv[o * 2 + 1] = e.v;
    }
  }
  for (let i = 0; i < seg; i++) for (let k = 0; k < P - 1; k++) {
    if (ent[k + 1].brk) continue;
    const a = i * P + k, b = (i + 1) * P + k, c = i * P + k + 1, d = (i + 1) * P + k + 1;
    idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx); return g;
}
export const cyl = (r0, r1, h, seg = 20, open = false) => new THREE.CylinderGeometry(r1, r0, h, seg, 1, open);
export const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
export const rbox = (w, h, d, r = .05, seg = 3) => new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3));
export const sphere = (r, ws = 20, hs = 14) => new THREE.SphereGeometry(r, ws, hs);
export const torus = (R, r, rs = 12, ts = 32, arc = TAU) => new THREE.TorusGeometry(R, r, rs, ts, arc);
export const tube = (pts, r, seg = 48, rs = 10, closed = false) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => p.isVector3 ? p : new THREE.Vector3(...p)), closed), seg, r, rs, closed);
export function extrude(shape, depth, bevel = .02, curveSeg = 16) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: curveSeg });
  g.translate(0, 0, -depth / 2); g.computeVertexNormals(); return g;
}
/* 2D shape from points [[x,y],...] (optionally with holes) */
export function shape(pts, holes = []) {
  const s = new THREE.Shape(pts.map(p => new THREE.Vector2(p[0], p[1])));
  for (const h of holes) s.holes.push(new THREE.Path(h.map(p => new THREE.Vector2(p[0], p[1]))));
  return s;
}
export function roundRectShape(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
}
export function circlePath(cx, cy, r, n = 24, rev = false) { const a = []; for (let i = 0; i < n; i++) { const t = (rev ? -1 : 1) * i / n * TAU; a.push([cx + Math.cos(t) * r, cy + Math.sin(t) * r]); } return a; }
/* displaced lumpy blob (rust crust, debris, cotton) */
export function lump(r, seed, sx = 1, sy = .55, sz = 1, det = 1) {
  const g = new THREE.IcosahedronGeometry(1, det + 1), p = g.attributes.position;
  const hs = (a, b, c) => { const s = Math.sin(a * 12.9898 + b * 78.233 + c * 37.719 + seed * 4.1) * 43758.5453; return s - Math.floor(s); };
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const n = hs(Math.round(x * 3), Math.round(y * 3), Math.round(z * 3)) * .35 + hs(Math.round(x * 6), Math.round(y * 6), Math.round(z * 6)) * .18;
    const k = r * (.78 + n); p.setXYZ(i, x * k * sx, y * k * sy, z * k * sz);
  }
  g.deleteAttribute('normal'); g.deleteAttribute('uv'); const m = mergeVertices(g, 1e-4); m.computeVertexNormals(); return m;
}
export const merge = list => mergeGeometries(list.map(g => g.index ? g.toNonIndexed() : g), false);
export const mergeIdx = list => mergeGeometries(list, false);
export function xf(g, { p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1] } = {}) {
  const m = new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)), new THREE.Vector3(...(Array.isArray(s) ? s : [s, s, s])));
  g.applyMatrix4(m); return g;
}

/* ---------- canvas textures ---------- */
export function canvasTex(w, h, draw, o = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = o.linear ? THREE.NoColorSpace : THREE.SRGBColorSpace; t.anisotropy = 4;
  if (o.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(o.repeat[0], o.repeat[1]); }
  t.canvas = c; return t;
}
export function noiseCanvas(g, w, h, a = .1, scale = 1) {
  const img = g.getImageData(0, 0, w, h), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - .5) * 255 * a; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  g.putImageData(img, 0, 0);
}

/* ---------- plain materials ---------- */
const MC = new Map();
export function metal(color, rough = .3, o = {}) { return mat(color, { roughness: rough, metalness: o.metal ?? 1, ...o }); }
export function plastic(color, rough = .45, o = {}) { return mat(color, { roughness: rough, metalness: 0, ...o }); }
export function rubber(color = '#1d2226', rough = .9) { return mat(color, { roughness: rough, metalness: 0 }); }
export function glass(tint = '#cfe7ec', opacity = .22, o = {}) {
  const m = new THREE.MeshPhysicalMaterial({ color: tint, roughness: o.rough ?? .05, metalness: 0, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 1.4, ...(o.extra || {}) });
  return m;
}
export function emissive(color, k = 2) { return new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), toneMapped: true }); }
export function mat(color, o = {}) {
  const { metal: _m, clear, ...rest } = o;
  const M = clear ? new THREE.MeshPhysicalMaterial({ color, clearcoat: clear, clearcoatRoughness: .15, ...rest }) : new THREE.MeshStandardMaterial({ color, ...rest });
  return M;
}
export function texMat(tex, o = {}) { return new THREE.MeshStandardMaterial({ map: tex, roughness: .6, metalness: 0, ...o }); }

/* mesh helper */
export function mesh(geom, material, o = {}) {
  const m = new THREE.Mesh(geom, material);
  if (o.p) m.position.set(...o.p); if (o.r) m.rotation.set(...o.r); if (o.s != null) { if (Array.isArray(o.s)) m.scale.set(...o.s); else m.scale.setScalar(o.s); }
  m.castShadow = o.cast !== false; m.receiveShadow = o.recv !== false; if (o.name) m.name = o.name;
  return m;
}
export function group(children = [], o = {}) { const g = new THREE.Group(); for (const c of children) g.add(c); if (o.p) g.position.set(...o.p); if (o.r) g.rotation.set(...o.r); if (o.s != null) g.scale.setScalar(o.s); if (o.name) g.name = o.name; return g; }

/* text label canvas texture */
export function textTex(w, h, draw) { return canvasTex(w, h, draw); }
export function hexToLin(h) { return new THREE.Color(h); }
export { THREE, mergeGeometries };
