/* CPU particle system rendered as two THREE.Points batches (alpha + additive).
   types: 0 puff, 1 bubble, 2 glint, 3 chip/flake, 4 round grain, 5 spark streak */
import * as THREE from 'three';
import { rnd } from '../core/util.js';

const VS = `attribute vec4 aCol; attribute vec2 aSzT; uniform float uPx; varying vec4 vCol; varying float vType;
void main(){ vec4 mv=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*mv; gl_PointSize=max(1.,aSzT.x*uPx/-mv.z); vCol=aCol; vType=aSzT.y; }`;
const FS = `varying vec4 vCol; varying float vType;
void main(){
  vec2 p=gl_PointCoord*2.-1.; float r=length(p); float a;
  if(vType<.5){ a=smoothstep(1.,.1,r); a*=a; }
  else if(vType<1.5){ float ring=smoothstep(1.,.84,r)*smoothstep(.45,.82,r); float hi=smoothstep(.35,.0,length(p-vec2(-.36,-.36)))*.9; a=ring*.85+hi*step(r,.9)+smoothstep(1.,.2,r)*.06; }
  else if(vType<2.5){ float k=abs(p.x*p.y)*7.+r*.55; a=clamp(1.-k,0.,1.); a=a*a*1.7; }
  else if(vType<3.5){ vec2 q=abs(p); a=step(q.x*1.2+q.y*.8,.95); a*= .75+.25*step(.1,p.x+p.y); }
  else { a=smoothstep(1.,.55,r); }
  if(a<.01) discard;
  gl_FragColor=vec4(vCol.rgb*(vType>2.5&&vType<3.5? (.75+.25*(1.-gl_PointCoord.y)) : 1.),vCol.a*min(a,1.));
}`;

export const P = { list: [], max: 5000, floor: -2.62, batches: [], solids: [], smax: 2600 };

export function initParticles(scene) {
  for (const add of [false, true]) {
    const g = new THREE.BufferGeometry(), n = P.max;
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aCol', new THREE.BufferAttribute(new Float32Array(n * 4), 4).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSzT', new THREE.BufferAttribute(new Float32Array(n * 2), 2).setUsage(THREE.DynamicDrawUsage));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
    const m = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, uniforms: { uPx: { value: 800 } }, transparent: true, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending });
    const pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.renderOrder = 10; scene.add(pts); P.batches.push(pts);
  }
  /* real 3D debris: chunky grains (type 4) and thin flakes / chips (type 3), lit, shadowed, tumbling */
  const rock = new THREE.IcosahedronGeometry(1, 0), rp = rock.attributes.position;
  for (let i = 0; i < rp.count; i++) { const k = .72 + .5 * Math.abs(Math.sin(i * 12.9898 + rp.getX(i) * 78.2)); rp.setXYZ(i, rp.getX(i) * k, rp.getY(i) * k * .85, rp.getZ(i) * k); }
  rock.computeVertexNormals();
  const flake = new THREE.CylinderGeometry(1, .85, .22, 5, 1); const fp = flake.attributes.position;
  for (let i = 0; i < fp.count; i++) { const a = Math.atan2(fp.getZ(i), fp.getX(i)), k = .65 + .45 * Math.abs(Math.sin(a * 2.3 + 1.1)); fp.setX(i, fp.getX(i) * k); fp.setZ(i, fp.getZ(i) * k * .8); }
  flake.computeVertexNormals();
  for (const geo of [flake, rock]) {
    const m = new THREE.MeshStandardMaterial({ roughness: .82, metalness: .05, flatShading: true });
    const im = new THREE.InstancedMesh(geo, m, P.smax); im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(P.smax * 3), 3);
    im.count = 0; im.frustumCulled = false; im.castShadow = true; im.receiveShadow = true; scene.add(im); P.solids.push(im);
  }
}
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
const lin = c => new THREE.Color().setRGB(c[0], c[1], c[2], THREE.SRGBColorSpace);
export function emit(o) {
  if (P.list.length >= P.max * 2 - 4) P.list.shift();
  P.list.push(Object.assign({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, g: 0, drag: 0, life: .6, t: 0, s0: .05, s1: .05, c: [1, 1, 1], a: 1, type: 0, add: false, floor: P.floor, fade: 0, turb: 0, trail: 0 }, o));
}
export function updateParticles(dt, camera, H) {
  const L = P.list;
  for (let i = L.length - 1; i >= 0; i--) {
    const p = L[i]; p.t += dt; if (p.t >= p.life) { L[i] = L[L.length - 1]; L.pop(); continue; }
    if (p.rest) continue;
    p.vy -= p.g * dt; const dr = Math.max(0, 1 - p.drag * dt); p.vx *= dr; p.vy *= dr; p.vz *= dr;
    if (p.turb) { p.vx += Math.sin(p.t * 4.1 + p.y * 3 + p.z * 2) * p.turb * dt; p.vz += Math.cos(p.t * 3.3 + p.x * 3 + p.y * 2) * p.turb * dt; p.vy += Math.sin(p.t * 2.7 + p.x * 2) * p.turb * .5 * dt; }
    p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    if (p.floor !== null && p.y < p.floor) {
      p.y = p.floor; const sp = Math.hypot(p.vx, p.vz);
      if (p.g > 0 && Math.abs(p.vy) < 1.1 && sp < 1.6) { p.rest = true; p.vx = p.vy = p.vz = 0; p.life = Math.min(p.life, p.t + (p.liquid ? .35 : 1.4)); p.restT = p.t; }
      else { p.vy *= -.34; p.vx *= .6; p.vz *= .6; }
    }
  }
  const counts = [0, 0];
  const bufs = P.batches.map(b => ({ pos: b.geometry.attributes.position.array, col: b.geometry.attributes.aCol.array, sz: b.geometry.attributes.aSzT.array }));
  const put = (i, x, y, z, c, a, s, ty) => { const o = counts[i]; if (o >= P.max) return; const B = bufs[i]; B.pos[o * 3] = x; B.pos[o * 3 + 1] = y; B.pos[o * 3 + 2] = z; B.col[o * 4] = c[0]; B.col[o * 4 + 1] = c[1]; B.col[o * 4 + 2] = c[2]; B.col[o * 4 + 3] = a; B.sz[o * 2] = s; B.sz[o * 2 + 1] = ty; counts[i]++; };
  const sc = [0, 0];
  for (const p of L) {
    const k = p.t / p.life;
    if ((p.type === 3 || p.type === 4) && !p.add && !p.liquid) {
      const j = p.type === 4 ? 1 : 0, im = P.solids[j]; if (sc[j] >= P.smax) continue;
      if (p.rx == null) { p.rx = Math.random() * 6; p.ry = Math.random() * 6; p.rz = Math.random() * 6; p.wx = rnd(-14, 14); p.wy = rnd(-10, 10); p.lc0 = lin(p.c); }
      if (!p.rest) { p.rx += p.wx * .016; p.ry += p.wy * .016; } else if (p.type === 3 && !p.flat) { p.flat = 1; p.rx = rnd(-.15, .15); p.rz = rnd(-.15, .15); }
      const sz = (p.s0 + (p.s1 - p.s0) * k) * .55 * (p.rest ? Math.max(0, 1 - (p.t - p.restT) / Math.max(.01, p.life - p.restT)) : k > .82 ? Math.max(0, (1 - k) / .18) : 1);
      _q.setFromEuler(_e.set(p.rx, p.ry, p.rz || 0)); _p.set(p.x, p.y + (p.rest ? sz * .3 : 0), p.z); _s.set(sz, sz, sz); _m.compose(_p, _q, _s);
      im.setMatrixAt(sc[j], _m); im.instanceColor.setXYZ(sc[j], p.lc0.r, p.lc0.g, p.lc0.b); sc[j]++; continue;
    } const a = p.a * (p.fade === 1 ? Math.min(1, k * 6) * (1 - k) : p.fade === 2 ? Math.min(1, (1 - k) * 4) : (1 - k));
    const i = p.add ? 1 : 0, s = p.s0 + (p.s1 - p.s0) * k;
    if (!p.lc) { const c = lin(p.c); p.lc = [c.r, c.g, c.b]; if (p.add) p.lc = p.lc.map(v => v * 2.2); }
    put(i, p.x, p.y, p.z, p.lc, a, s, p.type);
    if (p.trail && !p.rest) for (let j = 1; j <= p.trail; j++) { const f = j * .016; put(i, p.x - p.vx * f, p.y - p.vy * f, p.z - p.vz * f, p.lc, a * (1 - j / (p.trail + 1)), s * (1 - j * .18), p.type); }
  }
  P.solids.forEach((im, j) => { im.count = sc[j]; im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true; });
  P.batches.forEach((b, i) => {
    const g = b.geometry; g.setDrawRange(0, counts[i]);
    g.attributes.position.needsUpdate = g.attributes.aCol.needsUpdate = g.attributes.aSzT.needsUpdate = true;
    b.material.uniforms.uPx.value = H / (2 * Math.tan(camera.fov * Math.PI / 360));
  });
}
export function clearParticles() { P.list.length = 0; }

/* ---------- effect presets (positions are THREE.Vector3 or [x,y,z]) ---------- */
const A = p => p.isVector3 ? [p.x, p.y, p.z] : p;
export function puff(p, col, n, o = {}) { p = A(p); for (let i = 0; i < n; i++) emit({ x: p[0] + rnd(-.08, .08), y: p[1] + rnd(0, .08), z: p[2] + rnd(-.08, .08), vx: rnd(-.45, .45), vy: rnd(.1, .6), vz: rnd(-.45, .45), g: -.12, drag: 1.8, turb: 1.6, life: rnd(.8, 1.7) * (o.life || 1), s0: (o.s0 || .14) * .8, s1: (o.s1 || .34) * 1.25, c: col.map(c => c * rnd(.85, 1.1)), a: (o.a || .5) * .8, type: 0, fade: 1, floor: null }); }
export function grains(p, n, col, o = {}) { p = A(p); for (let i = 0; i < n; i++) { const a = rnd(0, 6.28), s = rnd(.3, 1.9) * (o.sp || 1); emit({ x: p[0], y: p[1] + .03, z: p[2], vx: Math.cos(a) * s, vy: rnd(.5, 2.2) * (o.up || 1), vz: Math.sin(a) * s, g: 8.5, drag: .4, turb: .5, life: rnd(1.2, 2.4), s0: rnd(.02, .045) * (o.sz || 1), s1: rnd(.015, .03) * (o.sz || 1), c: col.map(c => c * rnd(.55, 1.25)), a: 1, type: 4 }); } }
export function flakes(p, n, col = [.55, .24, .08], o = {}) { p = A(p); for (let i = 0; i < n; i++) emit({ x: p[0] + rnd(-.04, .04), y: p[1] + .03, z: p[2] + rnd(-.04, .04), vx: rnd(-1, 1), vy: rnd(.3, 1.8), vz: rnd(-1, 1), g: 7.5, drag: .5, turb: .8, life: rnd(1.4, 2.6), s0: rnd(.04, .08) * (o.sz || 1), s1: rnd(.03, .06) * (o.sz || 1), c: col.map(c => c * rnd(.6, 1.25)), a: 1, type: 3 }); grains(p, Math.ceil(n * 1.4), col.map(c => c * .9), o); }
export function debris(p, n, col, o = {}) { p = A(p); for (let i = 0; i < n; i++) emit({ x: p[0], y: p[1] + .05, z: p[2], vx: rnd(-1.6, 1.6), vy: rnd(.6, 3), vz: rnd(-1.6, 1.6), g: 9, drag: .3, life: rnd(1.4, 2.6), s0: rnd(.06, .13) * (o.sz || 1), s1: rnd(.04, .09) * (o.sz || 1), c: col.map(c => c * rnd(.55, 1.25)), a: 1, type: 3 }); grains(p, n, col, o); }
export function sparks(p, n, dir) { p = A(p); for (let i = 0; i < n; i++) { const s = rnd(2, 6); emit({ x: p[0], y: p[1] + .03, z: p[2], vx: (dir ? dir[0] : 0) * s + rnd(-1.8, 1.8), vy: rnd(.6, 3.2), vz: (dir ? dir[2] : 0) * s + rnd(-1.8, 1.8), g: 9, drag: .3, trail: 4, life: rnd(.3, .7), s0: .05, s1: .015, c: [1, rnd(.6, .9), rnd(.2, .5)], a: 1, type: 0, add: true }); } }
export function bubbles(p, n, spread = .3, big = 1) { p = A(p); for (let i = 0; i < n; i++) emit({ x: p[0] + rnd(-spread, spread), y: p[1], z: p[2] + rnd(-spread, spread), vx: rnd(-.1, .1), vy: rnd(.5, 1.2), vz: rnd(-.1, .1), g: -.1, life: rnd(.9, 1.9), s0: rnd(.08, .22) * big, s1: rnd(.1, .26) * big, c: [.85, .97, 1], a: .9, type: 1, floor: null }); }
export function foam(p, n, s = 1) { p = A(p); for (let i = 0; i < n; i++) emit({ x: p[0] + rnd(-.18, .18) * s, y: p[1] + rnd(.02, .1), z: p[2] + rnd(-.18, .18) * s, vx: rnd(-.2, .2), vy: rnd(.05, .3), vz: rnd(-.2, .2), g: .2, drag: 2, life: rnd(.7, 1.4), s0: rnd(.1, .2) * s, s1: rnd(.16, .3) * s, c: [.96, .98, 1], a: .85, type: Math.random() < .5 ? 0 : 1, fade: 1, floor: null }); }
export function glints(p, n, spread = .3) { p = A(p); for (let i = 0; i < n; i++) emit({ x: p[0] + rnd(-spread, spread), y: p[1] + rnd(0, .25), z: p[2] + rnd(-spread, spread), vx: 0, vy: rnd(.1, .5), vz: 0, g: 0, life: rnd(.5, 1.1), s0: rnd(.12, .3), s1: .02, c: [1, .95, .75], a: 1, type: 2, add: true, fade: 1, floor: null }); }
export function drops(p, n, col = [.7, .88, 1]) { p = A(p); for (let i = 0; i < n; i++) emit({ x: p[0] + rnd(-.05, .05), y: p[1], z: p[2] + rnd(-.05, .05), vx: rnd(-.6, .6), vy: rnd(-.2, 1.2), vz: rnd(-.6, .6), g: 8, drag: .2, life: rnd(.8, 1.4), s0: rnd(.035, .06), s1: .03, c: col, a: .85, type: 4, liquid: true }); }
export function confetti(p, n) { p = A(p); const cols = [[.95, .72, .29], [.9, .4, .22], [.44, .88, .69], [.5, .8, .95]]; for (let i = 0; i < n; i++) emit({ x: p[0] + rnd(-2, 2), y: p[1] + rnd(0, 1), z: p[2] + rnd(-2, 2), vx: rnd(-1.5, 1.5), vy: rnd(2, 5), vz: rnd(-1.5, 1.5), g: 5, drag: .6, life: rnd(1.4, 2.8), s0: rnd(.08, .14), s1: .06, c: cols[i % 4], a: 1, type: 3 }); }
export function dust(p, n, col = [.75, .72, .66], s = 1) { puff(p, col, n, { a: .28, s0: .1 * s, s1: .32 * s, life: .8 }); }
