/* Renderer component: WebGL2 renderer, scene, camera, quality tiers, picking helpers.
   Lighting lives in lighting.js, post-processing in post.js, the backdrop in studio.js. */
import * as THREE from 'three';
import { initLighting, L } from './lighting.js';
import { initPost } from './post.js';

export const R = { renderer: null, scene: null, camera: null, composer: null, dpr: 1, q: 3, cmp: null, focus: 10, aperture: 1, W: 1, H: 1, slow: 0 };

export function initEngine(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
  if (!renderer.capabilities.isWebGL2) return false;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  R.renderer = renderer;
  const scene = new THREE.Scene(); R.scene = scene;
  const camera = new THREE.PerspectiveCamera(36, 1, .1, 140); R.camera = camera; scene.add(camera);
  initLighting(renderer, scene); R.key = L.key;
  initPost(renderer);
  return true;
}
export function resize(dprCap) {
  const w = innerWidth, h = innerHeight, dpr = Math.min(window.devicePixelRatio || 1, dprCap); R.dpr = dpr; R.W = w; R.H = h;
  R.renderer.setPixelRatio(dpr); R.renderer.setSize(w, h, false); R.composer.setPixelRatio(dpr); R.composer.setSize(w, h);
  R.camera.aspect = w / h; R.camera.updateProjectionMatrix();
}
/* tiers: 0 low, 1 medium (default on phones), 2 high (default on desktop), 3 ultra (+ ambient occlusion).
   Nothing here recompiles shaders, so switching tiers never stalls a frame. */
export const TIERS = [
  { dpr: 1, msaa: 0, shadow: 512, bloom: false, ao: false, bg: .25, bgEvery: 3 },
  { dpr: 1, msaa: 2, shadow: 1024, bloom: false, ao: false, bg: .3, bgEvery: 2 },
  { dpr: 1.25, msaa: 4, shadow: 1024, bloom: true, ao: false, bg: .4, bgEvery: 2 },
  { dpr: 1.6, msaa: 4, shadow: 2048, bloom: true, ao: true, bg: .5, bgEvery: 1 }
];
export function setQuality(q) {
  const t = TIERS[q]; R.q = q; R.tier = t; R.bloom.enabled = t.bloom; R.ao.enabled = t.ao;
  const k = R.key; if (k && k.shadow.mapSize.x !== t.shadow) { k.shadow.mapSize.set(t.shadow, t.shadow); if (k.shadow.map) { k.shadow.map.dispose(); k.shadow.map = null; } }
  for (const rt of [R.composer.renderTarget1, R.composer.renderTarget2]) if (rt.samples !== t.msaa) { rt.samples = t.msaa; rt.dispose(); }
}
/* R.safe: plain forward render (no post-processing), the fallback when the effect chain shows nothing on a GPU */
export function render() {
  if (!R.safe) { R.composer.render(); return; }
  const c = R.camera, m = c.layers.mask; c.layers.enableAll(); R.renderer.setRenderTarget(null); R.renderer.setClearColor(0x0c0a08, 1); R.renderer.render(R.scene, c); c.layers.mask = m;
}
/* average brightness (0..255) of a few pixels of the frame just drawn; must be called right after render() */
export function probeFrame() {
  const gl = R.renderer.getContext(), w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, px = new Uint8Array(4); let sum = 0, n = 0;
  for (const [fx, fy] of [[.5, .5], [.3, .4], [.7, .4], [.5, .7], [.2, .8], [.8, .2]]) { gl.readPixels(Math.floor(w * fx), Math.floor(h * fy), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); sum += px[0] + px[1] + px[2]; n += 3; }
  return sum / n;
}
export function project(v) {
  const p = v.clone().project(R.camera); return { x: (p.x * .5 + .5) * R.W, y: (1 - (p.y * .5 + .5)) * R.H, z: p.z, ok: p.z < 1 && p.z > -1 };
}
const RC = new THREE.Raycaster(); const NDC = new THREE.Vector2();
export function rayAt(x, y) { NDC.set(x / R.W * 2 - 1, -(y / R.H) * 2 + 1); RC.setFromCamera(NDC, R.camera); return RC.ray.clone(); }
export function raycast(x, y, objs) {
  NDC.set(x / R.W * 2 - 1, -(y / R.H) * 2 + 1); RC.setFromCamera(NDC, R.camera);
  const hits = RC.intersectObjects(objs.filter(Boolean), false);
  for (const h of hits) { let vis = true; for (let o = h.object; o; o = o.parent) if (!o.visible) { vis = false; break; } if (vis) return h; }
  return null;
}
