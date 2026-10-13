/* Post-processing component: scene pass (with before/after split), GTAO ambient occlusion,
   bloom on hot speculars, then depth of field + colour grade + vignette + grain, then tone mapping. */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { R } from './engine.js';

/* main scene pass: normal render, or split before/after render for the comparison slider */
class ScenePass extends Pass {
  constructor() { super(); this.needsSwap = false; this.clear = true; }
  render(renderer, writeBuffer, readBuffer) {
    const t = readBuffer, cmp = R.cmp; R.depthTex = t.depthTexture;
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
  /* grade (linear HDR, before tone mapping): gentle saturation, cool shadows, warm highlights, soft contrast */
  float lum=dot(col,vec3(.2126,.7152,.0722));
  col=max(vec3(0.),mix(vec3(lum),col,1.08));
  col*=mix(vec3(.95,.99,1.06),vec3(1.05,1.,.95),smoothstep(.02,.9,lum));
  col=col*col/(col+vec3(.012))*1.02;
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
    const u = this.mat.uniforms, c = R.camera; u.tColor.value = readBuffer.texture; u.tDepth.value = R.depthTex;
    u.uPx.value.set(1 / readBuffer.width, 1 / readBuffer.height); u.uNear.value = c.near; u.uFar.value = c.far; u.uFocus.value = R.focus; u.uRange.value = Math.max(.8, R.focus * .14);
    u.uMaxR.value = (R.q >= 2 && !R.cmp ? 6.5 * R.aperture : 0) * R.dpr * (readBuffer.height / 900 + .3); u.uTime.value = performance.now() / 1000;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer); this.quad.render(renderer);
  }
}


export function initPost(renderer) {
  const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 }); rt.depthTexture = new THREE.DepthTexture(4, 4); rt.depthTexture.type = THREE.UnsignedIntType;
  const composer = new EffectComposer(renderer, rt); R.composer = composer;
  composer.addPass(new ScenePass());
  /* ambient occlusion at half resolution: contact darkening in crevices, under parts and on the floor */
  const ao = new GTAOPass(R.scene, R.camera, 256, 256); ao.blendIntensity = .85;
  ao.updateGtaoMaterial({ radius: .55, distanceExponent: 1.4, thickness: 1.2, scale: 1.1, samples: 12 }); ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 5, rings: 2, samples: 12 });
  const setSize = ao.setSize.bind(ao); ao.setSize = (w, h) => setSize(Math.max(1, w >> 1), Math.max(1, h >> 1));
  R.ao = ao; composer.addPass(ao);
  R.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), .28, .5, 2.4); composer.addPass(R.bloom);
  R.dof = new DofPass(); composer.addPass(R.dof);
  composer.addPass(new OutputPass());
}
