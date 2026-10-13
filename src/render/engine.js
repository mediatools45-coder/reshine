/* Renderer component: WebGL2 renderer, scene, camera, quality tiers, picking helpers.
   Lighting lives in lighting.js, post-processing in post.js, the backdrop in studio.js. */
import * as THREE from 'three';
import { initLighting } from './lighting.js';
import { initPost } from './post.js';

export const R = { renderer: null, scene: null, camera: null, composer: null, dpr: 1, q: 3, cmp: null, focus: 10, aperture: 1, W: 1, H: 1, slow: 0 };

export function initEngine(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
  if (!renderer.capabilities.isWebGL2) return false;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.VSMShadowMap;
  R.renderer = renderer;
  const scene = new THREE.Scene(); R.scene = scene;
  const camera = new THREE.PerspectiveCamera(36, 1, .1, 140); R.camera = camera; scene.add(camera);
  initLighting(renderer, scene);
  initPost(renderer);
  return true;
}
export function resize(dprCap) {
  const w = innerWidth, h = innerHeight, dpr = Math.min(window.devicePixelRatio || 1, dprCap); R.dpr = dpr; R.W = w; R.H = h;
  R.renderer.setPixelRatio(dpr); R.renderer.setSize(w, h, false); R.composer.setPixelRatio(dpr); R.composer.setSize(w, h);
  R.camera.aspect = w / h; R.camera.updateProjectionMatrix();
}
/* tiers: 0 low (no AO/bloom/shadows), 1 medium (shadows + bloom), 2 high (+ AO + DOF), 3 ultra (higher res) */
export function setQuality(q) { R.q = q; R.bloom.enabled = q >= 1; R.ao.enabled = q >= 2; R.renderer.shadowMap.enabled = q >= 1; R.renderer.shadowMap.needsUpdate = true; R.scene.traverse(o => { if (o.material) o.material.needsUpdate = true; }); }
export function render() { R.composer.render(); }
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
