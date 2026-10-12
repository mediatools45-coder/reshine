/* renderer, lights, environment reflections, post-processing (bloom, depth of field, vignette, grain) */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export const R = { renderer: null, scene: null, camera: null, composer: null, dpr: 1, q: 3, cmp: null, focus: 10, aperture: 1, W: 1, H: 1, slow: 0 };

/* main scene pass: normal render, or split before/after render for the comparison slider */
class ScenePass extends Pass {
  constructor() { super(); this.needsSwap = false; this.clear = true; }
  render(renderer, writeBuffer, readBuffer) {
    const t = readBuffer, cmp = R.cmp;
    renderer.setRenderTarget(t); renderer.setClearColor(0x0a1218, 1); renderer.clear(true, true, true);
    if (!cmp) { renderer.render(R.scene, R.camera); return; }
    const x = Math.round(cmp.x * t.width);
    const old = renderer.autoClear; renderer.autoClear = false;
    t.scissorTest = true;
    t.scissor.set(0, 0, x, t.height); renderer.setRenderTarget(t); cmp.before(true); renderer.render(R.scene, R.camera);
    t.scissor.set(x, 0, t.width - x, t.height); renderer.setRenderTarget(t); cmp.before(false); renderer.render(R.scene, R.camera);
    t.scissorTest = false; t.scissor.set(0, 0, t.width, t.height); renderer.setRenderTarget(t); renderer.autoClear = old;
  }
}
/* depth of field (Vogel disc gather weighted by circle of confusion) + vignette + film grain */
const DOF_FS = `
uniform sampler2D tColor; uniform sampler2D tDepth; uniform vec2 uPx; uniform float uNear; uniform float uFar; uniform float uFocus; uniform float uRange; uniform float uMaxR; uniform float uTime; uniform float uVig;
varying vec2 vUv;
float lin(float d){ float z=d*2.-1.; return 2.*uNear*uFar/(uFar+uNear-z*(uFar-uNear)); }
float coc(float z){ return clamp((abs(z-uFocus)-uRange)/(uFocus*.6),0.,1.); }
float h(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
void main(){
  vec4 c0=texture2D(tColor,vUv); vec3 acc=c0.rgb; float wt=1.;
  if(uMaxR>.5){
    float z0=lin(texture2D(tDepth,vUv).r); float r0=coc(z0)*uMaxR; float rm=max(r0,uMaxR*.35);
    for(int i=0;i<24;i++){
      float fi=float(i)+.5; float rr=sqrt(fi/24.); float a=fi*2.39996;
      vec2 uv=vUv+vec2(cos(a),sin(a))*rr*rm*uPx; float len=rr*rm;
      float zs=lin(texture2D(tDepth,uv).r); float rs=coc(zs)*uMaxR;
      float w=(zs<z0-.4)?clamp(rs-len+1.,0.,1.):clamp(min(max(rs,r0),rs+r0)-len+1.,0.,1.);
      vec3 sc=texture2D(tColor,uv).rgb; acc+=sc*w; wt+=w;
    }
  }
  vec3 col=acc/wt;
  vec2 d=vUv-.5; float v=smoothstep(.32,.95,length(d*vec2(1.,1.12)));
  col*=1.-v*uVig;
  float g=h(vUv*vec2(913.,777.)+fract(uTime)*91.)-.5; col*=1.+g*.06;
  gl_FragColor=vec4(col,1.);
}`;
class DofPass extends Pass {
  constructor() {
    super();
    this.mat = new THREE.ShaderMaterial({
      uniforms: { tColor: { value: null }, tDepth: { value: null }, uPx: { value: new THREE.Vector2() }, uNear: { value: .1 }, uFar: { value: 100 }, uFocus: { value: 10 }, uRange: { value: 2 }, uMaxR: { value: 7 }, uTime: { value: 0 }, uVig: { value: .55 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }', fragmentShader: DOF_FS, depthTest: false, depthWrite: false
    });
    this.quad = new FullScreenQuad(this.mat);
  }
  render(renderer, writeBuffer, readBuffer) {
    const u = this.mat.uniforms, c = R.camera; u.tColor.value = readBuffer.texture; u.tDepth.value = readBuffer.depthTexture;
    u.uPx.value.set(1 / readBuffer.width, 1 / readBuffer.height); u.uNear.value = c.near; u.uFar.value = c.far; u.uFocus.value = R.focus; u.uRange.value = Math.max(.8, R.focus * .14);
    u.uMaxR.value = (R.q >= 2 && !R.cmp ? 6.5 * R.aperture : 0) * R.dpr * (readBuffer.height / 900 + .3); u.uTime.value = performance.now() / 1000;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer); this.quad.render(renderer);
  }
}

export function initEngine(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
  if (!renderer.capabilities.isWebGL2) return false;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  R.renderer = renderer;
  const scene = new THREE.Scene(); R.scene = scene;
  scene.background = new THREE.Color(0x0b1418); scene.fog = new THREE.Fog(0x0b1418, 40, 90);
  const camera = new THREE.PerspectiveCamera(36, 1, .1, 140); R.camera = camera; scene.add(camera);
  /* lights */
  const hemi = new THREE.HemisphereLight(0xa9bccc, 0x4a3020, .75); scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffe2bf, 2.6); key.position.set(-7, 12, 8); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); const sc = key.shadow.camera; sc.left = -9; sc.right = 9; sc.top = 9; sc.bottom = -9; sc.near = 1; sc.far = 40; key.shadow.bias = -.0004; key.shadow.normalBias = .02; key.shadow.radius = 4;
  scene.add(key); scene.add(key.target); R.key = key;
  const fill = new THREE.DirectionalLight(0x8fb6ff, .7); fill.position.set(9, 4, 6); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffc48a, 1.5); rim.position.set(5, 6, -9); scene.add(rim);
  R.lights = { hemi, key, fill, rim };
  /* environment for reflections: dark workshop with warm lamp strips and a cool window */
  const pm = new THREE.PMREMGenerator(renderer); const env = new THREE.Scene();
  const room = new THREE.Mesh(new THREE.BoxGeometry(30, 16, 30), new THREE.MeshBasicMaterial({ color: 0x4a3f34, side: THREE.BackSide })); env.add(room);
  const strip = (w, h, p, c, k, ry = 0, rx = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), side: THREE.DoubleSide })); m.position.set(...p); m.rotation.set(rx, ry, 0); env.add(m); };
  strip(12, 2.4, [-3, 7.5, 0], '#ffd9a8', 7, 0, Math.PI / 2); strip(12, 1.6, [4, 7.5, 3], '#ffe8c8', 5, .6, Math.PI / 2); strip(14, 4, [0, 3, 14.8], '#ffeedd', 1.6, Math.PI);
  strip(6, 5, [0, 3, -14.8], '#6d8fbf', 2.2); strip(5, 7, [14.8, 2, 0], '#ffb070', 1.4, -Math.PI / 2); strip(4, 6, [-14.8, 2, -3], '#a0b8d8', 1.6, Math.PI / 2);
  strip(30, 30, [0, -7.9, 0], '#6a4a30', 1, 0, -Math.PI / 2); strip(3, 3, [-6, 4, 14.8], '#fff0d8', 3, Math.PI);
  scene.environment = pm.fromScene(env, .02).texture; scene.environmentIntensity = 1.35;
  /* post */
  const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 }); rt.depthTexture = new THREE.DepthTexture(4, 4); rt.depthTexture.type = THREE.UnsignedIntType;
  const composer = new EffectComposer(renderer, rt); R.composer = composer;
  composer.addPass(new ScenePass());
  R.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), .32, .45, .92); composer.addPass(R.bloom);
  R.dof = new DofPass(); composer.addPass(R.dof);
  composer.addPass(new OutputPass());
  return true;
}
export function resize(dprCap) {
  const w = innerWidth, h = innerHeight, dpr = Math.min(window.devicePixelRatio || 1, dprCap); R.dpr = dpr; R.W = w; R.H = h;
  R.renderer.setPixelRatio(dpr); R.renderer.setSize(w, h, false); R.composer.setPixelRatio(dpr); R.composer.setSize(w, h);
  R.camera.aspect = w / h; R.camera.updateProjectionMatrix();
}
export function setQuality(q) { R.q = q; R.bloom.enabled = q >= 1; R.renderer.shadowMap.enabled = q >= 1; }
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
