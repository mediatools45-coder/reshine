/* Lighting component: CC0 studio HDRI for image-based light + reflections, a soft-shadowed key light,
   cool rim and warm kicker. The key follows the camera target so the object is always well lit. */
import * as THREE from 'three';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';
import studioUrl from '@pmndrs/assets/hdri/studio.exr.js'; /* CC0, Poly Haven via @pmndrs/assets: neutral reflections so bare steel reads silver */

export const L = { key: null, rim: null, kick: null, hemi: null, envTex: null };
const KEY_OFF = new THREE.Vector3(-6, 11, 9);

function b64ToBuf(url) { const s = atob(url.slice(url.indexOf(',') + 1)), b = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i); return b.buffer; }

/* quick procedural fallback (used until / if the HDRI fails to decode) */
function fallbackEnv(renderer) {
  const pm = new THREE.PMREMGenerator(renderer), env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.BoxGeometry(30, 16, 30), new THREE.MeshBasicMaterial({ color: 0x2a2e33, side: THREE.BackSide })));
  const strip = (w, h, p, c, k, ry = 0, rx = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), side: THREE.DoubleSide })); m.position.set(...p); m.rotation.set(rx, ry, 0); env.add(m); };
  strip(10, 3, [-3, 7.5, 2], '#fff1dc', 8, 0, Math.PI / 2); strip(6, 6, [0, 3, 14.8], '#ffffff', 2.4, Math.PI); strip(5, 7, [14.8, 2, 0], '#cfe0ff', 2, -Math.PI / 2);
  const t = pm.fromScene(env, .03).texture; pm.dispose(); return t;
}

export function initLighting(renderer, scene) {
  scene.environment = fallbackEnv(renderer); scene.environmentIntensity = 1;
  try {
    const data = new EXRLoader().setDataType(THREE.HalfFloatType).parse(b64ToBuf(studioUrl));
    const tex = new THREE.DataTexture(data.data, data.width, data.height, THREE.RGBAFormat, data.type);
    tex.mapping = THREE.EquirectangularReflectionMapping; tex.colorSpace = THREE.LinearSRGBColorSpace; tex.flipY = false; tex.needsUpdate = true;
    const pm = new THREE.PMREMGenerator(renderer); const env = pm.fromEquirectangular(tex).texture; pm.dispose(); tex.dispose();
    scene.environment = env; L.envTex = env; scene.environmentIntensity = .7; scene.environmentRotation = new THREE.Euler(0, 2.2, 0);
  } catch (e) { console.warn('HDRI fallback', e); }
  /* small sky/ground fill so shadowed sides never go flat black */
  L.hemi = new THREE.HemisphereLight(0xd8d4c8, 0x3a2614, .3); scene.add(L.hemi);
  const key = new THREE.DirectionalLight(0xffe4c4, 2.1); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); const sc = key.shadow.camera; sc.left = -8; sc.right = 8; sc.top = 8; sc.bottom = -8; sc.near = 1; sc.far = 40;
  key.shadow.bias = -.0004; key.shadow.normalBias = .03;
  scene.add(key, key.target); L.key = key;
  L.rim = new THREE.DirectionalLight(0xbfd4ff, 1.3); L.rim.position.set(6, 5, -9); scene.add(L.rim);
  L.kick = new THREE.DirectionalLight(0xffc896, .5); L.kick.position.set(9, 1.5, 5); scene.add(L.kick);
  /* lights must reach both the sharp layer and the blurred backdrop layer */
  for (const l of [L.hemi, key, L.rim, L.kick]) l.layers.enableAll();
}
/* keep the key light (and its shadow frustum) centred on what the camera is looking at */
export function aimLights(target) { if (!L.key) return; L.key.position.copy(target).add(KEY_OFF); L.key.target.position.copy(target); }
