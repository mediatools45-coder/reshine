/* Post-processing component: scene pass (with before/after split), GTAO ambient occlusion,
   bloom on hot speculars, then depth of field + colour grade + vignette + grain, then tone mapping. */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { R } from './engine.js';

/* Backdrop depth of field: the workshop backdrop lives on layer BG. It is rendered at reduced
   resolution, blurred with a separable gaussian (two widths), then the sharp foreground (object,
   tools, particles, near bench) is drawn on top. The object can never bleed into the blur. */
export const BG = 1;
const BLUR_FS = `uniform sampler2D tMap; uniform vec2 uDir; varying vec2 vUv;
void main(){ vec3 c=texture2D(tMap,vUv).rgb*.2270270;
  c+=(texture2D(tMap,vUv+uDir*1.3846153).rgb+texture2D(tMap,vUv-uDir*1.3846153).rgb)*.3162162;
  c+=(texture2D(tMap,vUv+uDir*3.2307692).rgb+texture2D(tMap,vUv-uDir*3.2307692).rgb)*.0702702;
  gl_FragColor=vec4(c,1.); }`;
const VS = 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }';
class Backdrop {
  constructor() {
    const o = { type: THREE.HalfFloatType, depthBuffer: true };
    this.a = new THREE.WebGLRenderTarget(4, 4, o); this.b = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, depthBuffer: false });
    this.blur = new FullScreenQuad(new THREE.ShaderMaterial({ uniforms: { tMap: { value: null }, uDir: { value: new THREE.Vector2() } }, vertexShader: VS, fragmentShader: BLUR_FS, depthTest: false, depthWrite: false }));
    this.copy = new FullScreenQuad(new THREE.ShaderMaterial({ uniforms: { tMap: { value: null } }, vertexShader: VS, fragmentShader: 'uniform sampler2D tMap; varying vec2 vUv; void main(){ gl_FragColor=vec4(texture2D(tMap,vUv).rgb,1.); }', depthTest: false, depthWrite: false }));
    this.scale = .5; this.n = 0; this.tex = null;
  }
  render(renderer, W, H) {
    const t = R.tier || { bg: .4, bgEvery: 1 }; this.scale = t.bg;
    const w = Math.max(2, Math.round(W * this.scale)), h = Math.max(2, Math.round(H * this.scale));
    if (this.a.width !== w || this.a.height !== h) { this.a.setSize(w, h); this.b.setSize(w, h); this.tex = null; }
    /* the blurred backdrop changes slowly: reuse it for a few frames */
    if (this.tex && (this.n++ % t.bgEvery) !== 0) return this.tex;
    const cam = R.camera, L = cam.layers.mask; cam.layers.set(BG);
    R.fgFade && (R.fgFade.value = 0);
    renderer.setRenderTarget(this.a); renderer.setClearColor(0x0c0a08, 1); renderer.clear(true, true, false); renderer.render(R.scene, cam);
    cam.layers.mask = L; R.fgFade && (R.fgFade.value = 1);
    /* blur strength in pixels of the low-res buffer; two passes at growing radius ≈ wide soft bokeh */
    const u = this.blur.material.uniforms, k = R.bgBlur ?? 1;
    for (const r of [1.2 * k, 2.6 * k]) {
      u.tMap.value = this.a.texture; u.uDir.value.set(r / w, 0); renderer.setRenderTarget(this.b); this.blur.render(renderer);
      u.tMap.value = this.b.texture; u.uDir.value.set(0, r / h); renderer.setRenderTarget(this.a); this.blur.render(renderer);
    }
    this.tex = this.a.texture; return this.tex;
  }
}
/* main scene pass: blurred backdrop + sharp foreground; split before/after render for the comparison slider */
class ScenePass extends Pass {
  constructor() { super(); this.needsSwap = false; this.clear = true; this.bd = new Backdrop(); }
  render(renderer, writeBuffer, readBuffer) {
    const t = readBuffer, cmp = R.cmp; R.depthTex = t.depthTexture;
    const bg = this.bd.render(renderer, t.width, t.height);
    renderer.setRenderTarget(t); renderer.setClearColor(0x0c0a08, 1); renderer.clear(true, true, true);
    this.bd.copy.material.uniforms.tMap.value = bg; this.bd.copy.render(renderer);
    const old = renderer.autoClear; renderer.autoClear = false;
    if (!cmp) { renderer.render(R.scene, R.camera); renderer.autoClear = old; return; }
    const x = Math.round(cmp.x * t.width);
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
    /* background-only blur: a pixel gathers only samples at its own depth or farther, so a sharp
       object never bleeds into the blurred backdrop (no bright fringe around silhouettes) */
    float z0=lin(texture2D(tDepth,vUv).r); float r0=coc(z0)*uMaxR;
    if(r0>.5){
      for(int i=0;i<24;i++){
        float fi=float(i)+.5; float rr=sqrt(fi/24.); float a=fi*2.39996;
        vec2 uv=vUv+vec2(cos(a),sin(a))*rr*r0*uPx; float len=rr*r0;
        float zs=lin(texture2D(tDepth,uv).r); if(zs<z0-max(.3,z0*.04)) continue;
        float rs=coc(zs)*uMaxR; float w=clamp(min(rs,r0)-len+1.,0.,1.);
        acc+=texture2D(tColor,uv).rgb*w; wt+=w;
      }
    }
  }
  vec3 col=acc/wt;
  /* grade (linear HDR, before tone mapping): night look: moonlit blue shadows, warm lamp highlights,
     a contrast curve pivoting on mid grey so the lit object pops off the dark room */
  float lum=dot(col,vec3(.2126,.7152,.0722));
  col=max(vec3(0.),mix(vec3(lum),col,1.1));
  col*=mix(vec3(.84,.93,1.16),vec3(1.07,1.,.92),smoothstep(.01,.6,lum));
  /* contrast only in shadows and mids: highlights keep their value so polished metal never blows out */
  col=mix(.18*pow(col/.18,vec3(1.16)),col,smoothstep(.35,1.4,lum));
  col=col*col/(col+vec3(.01));
  vec2 d=vUv-.5; float v=smoothstep(.32,.95,length(d*vec2(1.,1.12)));
  col*=1.-v*uVig;
  float g=h(vUv*vec2(913.,777.)+fract(uTime)*91.)-.5; col*=1.+g*.06;
  gl_FragColor=vec4(col,1.);
}`;
class DofPass extends Pass {
  constructor() {
    super();
    this.mat = new THREE.ShaderMaterial({
      uniforms: { tColor: { value: null }, tDepth: { value: null }, uPx: { value: new THREE.Vector2() }, uNear: { value: .1 }, uFar: { value: 100 }, uFocus: { value: 10 }, uRange: { value: 2 }, uMaxR: { value: 7 }, uTime: { value: 0 }, uVig: { value: .72 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }', fragmentShader: DOF_FS, depthTest: false, depthWrite: false
    });
    this.quad = new FullScreenQuad(this.mat);
  }
  render(renderer, writeBuffer, readBuffer) {
    const u = this.mat.uniforms, c = R.camera; u.tColor.value = readBuffer.texture; u.tDepth.value = R.depthTex;
    u.uPx.value.set(1 / readBuffer.width, 1 / readBuffer.height); u.uNear.value = c.near; u.uFar.value = c.far; u.uFocus.value = R.focus; u.uRange.value = Math.max(.8, R.focus * .14);
    u.uMaxR.value = (R.dofOn && R.q >= 2 && !R.cmp ? 6.5 * R.aperture : 0) * R.dpr * (readBuffer.height / 900 + .3); u.uTime.value = performance.now() / 1000;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer); this.quad.render(renderer);
  }
}


/* clamps extreme specular peaks (a mirror face catching the key light reads 100+): keeps polished
   metal bright but stops it flooding the bloom and washing the whole frame white. It also scrubs NaN/Inf
   pixels (some GPUs produce a few): blurred by bloom, a single one can black out the whole screen. */
class ClampPass extends Pass {
  constructor(max) { super(); this.q = new FullScreenQuad(new THREE.ShaderMaterial({ uniforms: { tMap: { value: null }, uMax: { value: max } }, vertexShader: VS, fragmentShader: 'uniform sampler2D tMap; uniform float uMax; varying vec2 vUv; void main(){ vec3 c=texture2D(tMap,vUv).rgb; if(any(isnan(c))||any(isinf(c))) c=vec3(uMax*.5); c=max(c,vec3(0.)); float m=max(c.r,max(c.g,c.b)); gl_FragColor=vec4(c*min(1.,uMax/max(m,1e-4)),1.); }', depthTest: false, depthWrite: false })); }
  render(renderer, writeBuffer, readBuffer) { this.q.material.uniforms.tMap.value = readBuffer.texture; renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer); this.q.render(renderer); }
}
export function initPost(renderer) {
  const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 2 }); rt.depthTexture = new THREE.DepthTexture(4, 4); rt.depthTexture.type = THREE.UnsignedIntType;
  const composer = new EffectComposer(renderer, rt); R.composer = composer;
  composer.addPass(new ScenePass());
  /* ambient occlusion at half resolution: contact darkening in crevices, under parts and on the floor */
  const ao = new GTAOPass(R.scene, R.camera, 256, 256); ao.blendIntensity = .85;
  ao.updateGtaoMaterial({ radius: .55, distanceExponent: 1.4, thickness: 1.2, scale: 1.1, samples: 12 }); ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 5, rings: 2, samples: 12 });
  const setSize = ao.setSize.bind(ao); ao.setSize = (w, h) => setSize(Math.max(1, w >> 1), Math.max(1, h >> 1));
  R.ao = ao; composer.addPass(ao);
  composer.addPass(new ClampPass(7));
  R.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), .18, .3, 4.0); composer.addPass(R.bloom);
  R.dof = new DofPass(); composer.addPass(R.dof);
  composer.addPass(new OutputPass());
}
