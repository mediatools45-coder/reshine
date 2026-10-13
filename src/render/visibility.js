/* Reachability probe: which surface texels can the player actually touch?
   Renders the object's depth from a face direction (orthographic, GPU) and keeps only surface
   samples that are not buried under other parts. Paint tasks then ignore hidden texels, so a
   brush step finishes when everything visible is clean instead of stalling on covered areas. */
import * as THREE from 'three';
import { R } from './engine.js';

const LAYER = 7, SIZE = 256;
let RT = null, MAT = null, CAM = null, BUF = null;
function init() {
  RT = new THREE.WebGLRenderTarget(SIZE, SIZE, { depthBuffer: true });
  MAT = new THREE.ShaderMaterial({
    vertexShader: 'varying float vD; void main(){ vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.); vD=p.z*.5+.5; gl_Position=p; }',
    fragmentShader: 'varying float vD; void main(){ float d=clamp(vD,0.,1.)*255.; gl_FragColor=vec4(floor(d)/255.,fract(d),0.,1.); }',
    side: THREE.DoubleSide
  });
  CAM = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 10); CAM.layers.set(LAYER);
  BUF = new Uint8Array(SIZE * SIZE * 4);
}
const AXV = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1)];

/* depth map of the whole item seen from world direction d (camera on the +d side looking back) */
function depthFrom(root, meshes, d) {
  const bs = new THREE.Box3().setFromObject(root).getBoundingSphere(new THREE.Sphere()), r = bs.radius + .2;
  CAM.left = CAM.bottom = -r; CAM.right = CAM.top = r; CAM.near = .05; CAM.far = 2 * r + .2;
  CAM.position.copy(bs.center).addScaledVector(d, r + .1); CAM.up.set(Math.abs(d.y) > .9 ? 1 : 0, Math.abs(d.y) > .9 ? 0 : 1, 0); CAM.lookAt(bs.center); CAM.updateProjectionMatrix(); CAM.updateMatrixWorld();
  const rr = R.renderer, old = { rt: rr.getRenderTarget(), ov: R.scene.overrideMaterial, bg: R.scene.background, fog: R.scene.fog, ac: rr.autoClear, sh: rr.shadowMap.autoUpdate };
  for (const m of meshes) m.layers.enable(LAYER);
  R.scene.overrideMaterial = MAT; R.scene.background = null; R.scene.fog = null; rr.shadowMap.autoUpdate = false;
  rr.setRenderTarget(RT); rr.setClearColor(0xffffff, 1); rr.clear(true, true, false); rr.render(R.scene, CAM);
  rr.readRenderTargetPixels(RT, 0, 0, SIZE, SIZE, BUF);
  rr.setRenderTarget(old.rt); R.scene.overrideMaterial = old.ov; R.scene.background = old.bg; R.scene.fog = old.fog; rr.shadowMap.autoUpdate = old.sh;
  for (const m of meshes) m.layers.disable(LAYER);
  const D = new Float32Array(SIZE * SIZE); for (let i = 0; i < D.length; i++) D[i] = (BUF[i * 4] + BUF[i * 4 + 1] / 255) / 255;
  return { D, cam: CAM.clone(), eps: .06 / (2 * r + .2) + 3 / 255 / 255 };
}

/* filter paint tasks in place: drop texels whose surface samples are all hidden from the task's faces */
export function refineReach(item, tasks) {
  if (!R.renderer || !tasks.length) return;
  if (!RT) init();
  const meshes = []; item.root.updateMatrixWorld(true);
  item.root.traverseVisible(o => { if (o.isMesh && !o.userData.proxy && o.material && o.material.visible !== false && !o.material.transparent) meshes.push(o); });
  const maps = new Map(), v = new THREE.Vector3(), w = new THREE.Vector3(), q = new THREE.Quaternion();
  for (const t of tasks) {
    const s = t.surf, part = t.part; if (!part || !part.g.visible || !s.samples.length) continue;
    part.g.getWorldQuaternion(q); const faces = [...new Set(Array.from(t.cells))], reach = new Uint8Array(s.W * s.H);
    for (const c of faces) {
      const d = AXV[c].clone().applyQuaternion(q).normalize(), key = d.toArray().map(x => Math.round(x * 20)).join(',');
      let m = maps.get(key); if (!m) { m = depthFrom(item.root, meshes, d); maps.set(key, m); }
      const ax = AXV[c];
      for (const smp of s.samples) {
        if (smp.n.dot(ax) < .2) continue;
        w.copy(smp.p); part.g.localToWorld(w); v.copy(w).project(m.cam);
        const px = Math.floor((v.x * .5 + .5) * SIZE), py = Math.floor((v.y * .5 + .5) * SIZE); if (px < 0 || py < 0 || px >= SIZE || py >= SIZE) continue;
        const z = v.z * .5 + .5; let vis = false;
        for (let oy = -1; oy <= 1 && !vis; oy++) for (let ox = -1; ox <= 1 && !vis; ox++) { const X = px + ox, Y = py + oy; if (X < 0 || Y < 0 || X >= SIZE || Y >= SIZE) continue; if (z <= m.D[Y * SIZE + X] + m.eps) vis = true; }
        if (!vis) continue;
        s.forCells(smp.p, smp.n, (cc, x, y, wt) => { if (cc !== c || wt < .02) return; for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const X = x + dx, Y = y + dy; if (s.inCell(cc, X, Y)) reach[Y * s.W + X] = 1; } });
      }
    }
    const keep = []; for (let k = 0; k < t.n; k++) if (reach[t.idx[k]]) keep.push(k);
    if (keep.length < Math.max(8, t.n * .03)) { t.hidden = keep.length === 0; if (t.hidden) { t.idx = new Int32Array(0); t.cells = new Int8Array(0); t.n = 0; } continue; }
    t.idx = Int32Array.from(keep.map(k => t.idx[k])); t.cells = Int8Array.from(keep.map(k => t.cells[k])); t.n = keep.length;
  }
}
