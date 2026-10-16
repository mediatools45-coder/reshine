/* Restoration surfaces.
   Every restorable part owns two RGBA masks packed in a 3x2 cube atlas (+X,-X,+Y,-Y,+Z,-Z),
   addressed by the fragment's part-local position and normal (blended tri-planar), so any
   procedural mesh can be painted without authored UVs.
   mask A: r rust, g crust, b dirt/grime/yellowing, a wet
   mask B: r residue (black film), g sanded, b polished, a finish (paint, stain, oil, compound) */
import * as THREE from 'three';
import { clamp, rng } from '../core/util.js';

export const LAYERS = { rust: [0, 0], crust: [0, 1], dirt: [0, 2], wet: [0, 3], residue: [1, 0], sand: [1, 1], polish: [1, 2], finish: [1, 3] };
const AX = [[0, 1], [0, -1], [1, 1], [1, -1], [2, 1], [2, -1]]; /* cell -> axis, sign */
export const FACE = { '+x': 0, '-x': 1, '+y': 2, '-y': 3, '+z': 4, '-z': 5 };

/* project a part-local point (q normalised in bbox) onto cell c -> uv in 0..1 */
function cellUV(c, qx, qy, qz) {
  switch (c) {
    case 0: return [1 - qz, qy]; case 1: return [qz, qy];
    case 2: return [qx, 1 - qz]; case 3: return [qx, qz];
    case 4: return [qx, qy]; default: return [1 - qx, qy];
  }
}
function weights(nx, ny, nz) {
  let wx = nx ** 4, wy = ny ** 4, wz = nz ** 4; const s = wx + wy + wz + 1e-6; wx /= s; wy /= s; wz /= s;
  return [[nx > 0 ? 0 : 1, wx], [ny > 0 ? 2 : 3, wy], [nz > 0 ? 4 : 5, wz]];
}

const VERT_PARS = `uniform mat4 uMaskMat; varying vec3 vMP; varying vec3 vMN; varying vec3 sAxX; varying vec3 sAxY; varying vec3 sAxZ;`;
const FRAG_PARS = `
uniform sampler2D uMA; uniform sampler2D uMB; uniform vec3 uBMin; uniform vec3 uBSize; uniform vec4 uAtlas; uniform float uPad;
uniform float uKind; uniform vec3 uBase; uniform vec2 uBaseRM; uniform float uScratch; uniform float uNS; uniform float uSeed;
uniform vec3 uDirtC; uniform vec2 uDirtRO; uniform vec3 uRust1; uniform vec3 uRust2; uniform vec3 uCrustC;
uniform vec3 uSandC; uniform float uSandR; uniform vec3 uPolC; uniform float uPolR;
uniform vec3 uFinC; uniform vec4 uFinP; uniform float uWetG; uniform vec3 uGrainAx; uniform float uGrainS; uniform vec3 uGlow; uniform float uBump; uniform float uResG;
uniform vec3 uWood2; uniform float uUseMap; uniform sampler2D uNrmR; uniform sampler2D uNrmC;
varying vec3 vMP; varying vec3 vMN; varying vec3 sAxX; varying vec3 sAxY; varying vec3 sAxZ; float sNk=0., sNkC=0.;
vec3 sG3(vec3 p){ p=vec3(dot(p,vec3(127.1,311.7,74.7)),dot(p,vec3(269.5,183.3,246.1)),dot(p,vec3(113.5,271.9,124.6))); return -1.+2.*fract(sin(p)*43758.5453); }
float sNoise(vec3 p){ vec3 i=floor(p), f=fract(p); vec3 u=f*f*f*(f*(f*6.-15.)+10.);
  float n=mix(mix(mix(dot(sG3(i),f),dot(sG3(i+vec3(1,0,0)),f-vec3(1,0,0)),u.x),mix(dot(sG3(i+vec3(0,1,0)),f-vec3(0,1,0)),dot(sG3(i+vec3(1,1,0)),f-vec3(1,1,0)),u.x),u.y),
              mix(mix(dot(sG3(i+vec3(0,0,1)),f-vec3(0,0,1)),dot(sG3(i+vec3(1,0,1)),f-vec3(1,0,1)),u.x),mix(dot(sG3(i+vec3(0,1,1)),f-vec3(0,1,1)),dot(sG3(i+vec3(1,1,1)),f-vec3(1,1,1)),u.x),u.y),u.z);
  return clamp(.5+.9*n,0.,1.); }
const mat3 sRot=mat3(.8,.36,-.48,-.6,.48,-.64,0.,.8,.6);
float sFbm(vec3 p){ float s=0., a=.5; for(int i=0;i<2;i++){ s+=a*sNoise(p); p=sRot*p*2.03+1.7; a*=.5; } return s/.75; }
vec2 sCell(float c, vec2 uv){ float col=mod(c,3.), row=floor(c/3.+.01); return vec2((col*uAtlas.z+uPad+uv.x*(uAtlas.z-2.*uPad))/uAtlas.x,(row*uAtlas.w+uPad+uv.y*(uAtlas.w-2.*uPad))/uAtlas.y); }
float sMk(float m,float n){ return smoothstep(.22,.62,m*(.62+.76*n)); }
`;
const FRAG_COLOR = `
vec4 sA=vec4(0.), sB=vec4(0.);
vec3 sP=vMP*uNS+uSeed;
float nL=sFbm(sP*.55), nM=sFbm(sP*2.2+3.7), nH=sNoise(sP*11.);
{
  vec3 q=clamp((vMP-uBMin)/uBSize+(vec3(nM,nH,nL)-.5)*(2.2/uAtlas.z),0.,1.); vec3 n=normalize(vMN); vec3 w=pow(abs(n),vec3(4.)); w/=(w.x+w.y+w.z+1e-5); vec2 t;
  if(w.x>.01){ t = n.x>0. ? sCell(0.,vec2(1.-q.z,q.y)) : sCell(1.,vec2(q.z,q.y)); sA+=texture(uMA,t)*w.x; sB+=texture(uMB,t)*w.x; }
  if(w.y>.01){ t = n.y>0. ? sCell(2.,vec2(q.x,1.-q.z)) : sCell(3.,vec2(q.x,q.z)); sA+=texture(uMA,t)*w.y; sB+=texture(uMB,t)*w.y; }
  if(w.z>.01){ t = n.z>0. ? sCell(4.,vec2(q.x,q.y)) : sCell(5.,vec2(1.-q.x,q.y)); sA+=texture(uMA,t)*w.z; sB+=texture(uMB,t)*w.z; }
}
vec3 sCol=uUseMap>.5?diffuseColor.rgb:uBase; float sR=uBaseRM.x, sM=uBaseRM.y, sCC=0.; vec2 sGr=vec2(0.);
vec2 dL=vec2(dFdx(nL),dFdy(nL)), dM=vec2(dFdx(nM),dFdy(nM)), dHh=vec2(dFdx(nH),dFdy(nH));
if(uKind<.5){
  sCol*= .8+.4*nL;
  float scrN=smoothstep(.74,.96,sNoise(sP*vec3(9.,.7,9.)+nL)), scrW=(1.-sB.g)*uScratch, scr=scrN*scrW; sCol*=1.-.35*scr; sR=mix(sR,.7,scr); sGr-=vec2(dFdx(scrN),dFdy(scrN))*scrW*.25;
  float pitN=smoothstep(.78,.93,sNoise(sP*4.6+9.1)), pit=pitN*scrW; sCol*=1.-.45*pit; sNk=max(sNk,(.12+.5*pit)*scrW); sGr-=vec2(dFdx(pitN),dFdy(pitN))*scrW*.6;
  float sd=smoothstep(.02,.8,sB.g); sCol=mix(sCol,uSandC*(.9+.14*nH+.06*sNoise(sP*vec3(14.,1.,14.))),sd); sR=mix(sR,uSandR,sd); sM=mix(sM,1.,sd*.8);
  float pol=smoothstep(.0,.85,sB.b*(1.+(nH-.5)*.35)); sCol=mix(sCol,uPolC,pol); sR=mix(sR,uPolR,pol); sM=mix(sM,1.,pol);
} else if(uKind<1.5){
  float al=dot(vMP,uGrainAx); vec3 pp=vMP-uGrainAx*al;
  float g1=sFbm(pp*uGrainS*3.+uGrainAx*al*.35+uSeed), g2=sNoise(pp*uGrainS*7.+uGrainAx*al*.45+uSeed*2.);
  float ring=.5+.5*sin((length(pp)*uGrainS*4.+g1*4.)*2.);
  float gr=clamp(g1*.62+g2*.3+ring*.07,0.,1.);
  vec3 dry=mix(uBase*.7,uBase*1.15,gr); dry=mix(dry,vec3(dot(dry,vec3(.33))),.35);
  sCol=dry; sR=uBaseRM.x; sM=0.; sGr=vec2(dFdx(g2),dFdy(g2))*.6+vec2(dFdx(g1),dFdy(g1))*(1.-sB.g)*.4*uScratch;
  float sd=smoothstep(.02,.8,sB.g); vec3 fresh=mix(uSandC*.78,uSandC*1.1,gr); sCol=mix(sCol,fresh,sd); sR=mix(sR,uSandR,sd);
  float fin=smoothstep(.1,.75,sB.a*(1.+(nL-.5)*.5)); vec3 stain=mix(uFinC*.55,uFinC*1.2,gr)*mix(vec3(1.),uWood2,ring*.12); sCol=mix(sCol,stain,fin); sR=mix(sR,uFinP.x,fin); sCC=fin*uFinP.z;
  float pol=smoothstep(.0,.85,sB.b); sR=mix(sR,uPolR,pol); sCC=max(sCC,pol*uFinP.z);
} else {
  sCol*=.95+.1*nL; float sd=smoothstep(.02,.8,sB.g); sCol=mix(sCol,uSandC,sd); sR=mix(sR,uSandR,sd);
  float pol=smoothstep(.0,.85,sB.b); sR=mix(sR,uPolR,pol); sCol=mix(sCol,uPolC,pol*.5);
}
if(uKind<.5||uKind>1.5){
  float fin=smoothstep(.12,.7,sB.a*(1.+(nL-.5)*.5)); sCol=mix(sCol,uFinC*(.96+.08*nH),fin); sR=mix(sR,uFinP.x,fin); sM=mix(sM,uFinP.y,fin); sCC=max(sCC,fin*uFinP.z);
}
float sRes=max(sMk(sB.r,nM),uResG*smoothstep(.1,.9,max(sA.r,sA.g)+.35)*(.75+.25*nM)); sCol=mix(sCol,vec3(.018,.017,.016)*(.7+.6*nH),sRes); sR=mix(sR,.88,sRes); sM=mix(sM,.15,sRes);
float sDt=sMk(sB.r*0.+sA.b,nL)*uDirtRO.y; vec3 dC=uDirtC*(.8+.35*nM); sCol=mix(sCol,dC,sDt); sR=mix(sR,uDirtRO.x,sDt); sM=mix(sM,sM*.25,sDt); 
float sCr=sMk(sA.g,nM); vec3 crC=uCrustC*(.55+.7*nH)*(.75+.35*nL)*(.85+.3*smoothstep(.4,.8,sNoise(sP*4.+2.))); sCol=mix(sCol,crC,sCr); sR=mix(sR,1.,sCr); sM=mix(sM,0.,sCr); sGr+=sCr*(dM*.6+dHh*.2); sNkC=sCr;
/* rust: thin oxide film tints the metal first, then layered dark-brown / red-brown scale with sparse orange */
float rA=sA.r*(.55+.9*nM);
float thin=smoothstep(.04,.42,rA), heavy=smoothstep(.3,.82,rA);
vec3 film=mix(sCol*vec3(.5,.34,.24),uRust1*1.6,.45)*(.8+.35*nL);
vec3 r1=uRust1*(.55+.5*nH), r2=uRust2*.42, r3=uRust2*vec3(1.,.8,.6)*.78;
float v1=sNoise(sP*3.1+5.)*.7+nM*.3, acc=smoothstep(.6,.86,sNoise(sP*1.7+13.))*(1.-.6*smoothstep(.5,.9,nH));
vec3 ruC=mix(r1,r2,smoothstep(.28,.72,v1)); ruC=mix(ruC,r3,acc*.65); ruC*=.74+.52*nH; ruC=mix(ruC,vec3(dot(ruC,vec3(.3,.59,.11))),.12);
sCol=mix(sCol,film,thin*(1.-heavy)); sR=mix(sR,.8,thin); sM=mix(sM,sM*.15,thin);
sCol=mix(sCol,ruC,heavy); sR=mix(sR,.93+.07*nH,heavy); sM=mix(sM,0.,heavy); sGr+=heavy*(dM*.5+dHh*.15);
sNk=max(sNk,thin*.45+heavy*1.);
float sWet=max(sA.a,uWetG); sCol*=1.-.32*sWet; sR*=1.-.7*sWet; sCC=max(sCC,sWet*.9);
diffuseColor.rgb=sCol;
`;
const FRAG_NORMAL = `
if(sNk+sNkC>.01){
  /* tri-planar CC0 normal maps in part space (whiteout blend): pitting under rust, cracks in crust */
  vec3 N=normalize(vMN); vec3 w=pow(abs(N),vec3(4.)); w/=(w.x+w.y+w.z+1e-5); vec3 P=vMP*uNS; vec3 nl=vec3(0.);
  #define SNRM(uv) ((texture(uNrmR,(uv)*1.6).xy*2.-1.)*sNk*1.5+(texture(uNrmC,(uv)*.85+.3).xy*2.-1.)*sNkC*1.3)
  if(w.x>.01){ vec2 t=SNRM(P.zy); nl+=vec3(t+N.zy,N.x).zyx*w.x; }
  if(w.y>.01){ vec2 t=SNRM(P.xz); nl+=vec3(t+N.xz,N.y).xzy*w.y; }
  if(w.z>.01){ vec2 t=SNRM(P.xy); nl+=vec3(t+N.xy,N.z)*w.z; }
  nl=normalize(nl); vec3 nv=nl.x*sAxX+nl.y*sAxY+nl.z*sAxZ, gv=N.x*sAxX+N.y*sAxY+N.z*sAxZ;
  normal=normalize(normal+(nv-gv)*(gl_FrontFacing?1.:-1.));
}
`;

let SURF_ID = 0;
/* CC0 normal maps (see assets/materials.js): pitted + cracked crust, sampled tri-planar in part space */
import { ccNormal } from '../assets/materials.js';
export const NRM = { pits: ccNormal('pits'), crack: ccNormal('crack') };
export class Surface {
  /* o: kind 'metal'|'wood'|'plastic', cell [w,h] texels, look params */
  constructor(name, o = {}) {
    this.name = name; this.o = o; this.id = SURF_ID++;
    const cell = o.cell || [96, 96]; this.cw = cell[0]; this.ch = cell[1]; this.pad = 2;
    this.W = this.cw * 3; this.H = this.ch * 2;
    this.A = new Uint8Array(this.W * this.H * 4); this.B = new Uint8Array(this.W * this.H * 4);
    this.texA = mkTex(this.A, this.W, this.H); this.texB = mkTex(this.B, this.W, this.H);
    this.meshes = []; this.mats = []; this.use = new Uint8Array(this.W * this.H); this.samples = [];
    this.bmin = new THREE.Vector3(); this.bsize = new THREE.Vector3(1, 1, 1);
    this.dirty = false; this.fades = [];
    const C = c => new THREE.Color(c);
    const kind = { metal: 0, wood: 1, plastic: 2 }[o.kind || 'metal'];
    this.u = {
      uMA: { value: this.texA }, uMB: { value: this.texB }, uBMin: { value: this.bmin }, uBSize: { value: this.bsize },
      uAtlas: { value: new THREE.Vector4(this.W, this.H, this.cw, this.ch) }, uPad: { value: this.pad },
      uKind: { value: kind }, uBase: { value: C(o.base || '#5a5550') }, uBaseRM: { value: new THREE.Vector2(o.baseR ?? .7, o.baseM ?? (kind === 0 ? .5 : 0)) },
      uScratch: { value: o.scratch ?? 1 }, uNS: { value: o.ns || 1 }, uSeed: { value: (o.seed || 1) * 3.17 },
      uDirtC: { value: C(o.dirt || '#5c5145') }, uDirtRO: { value: new THREE.Vector2(o.dirtR ?? .95, o.dirtO ?? 1) },
      uRust1: { value: C(o.rust1 || '#3a1608') }, uRust2: { value: C(o.rust2 || '#9a4614') }, uCrustC: { value: C(o.crust || '#3b1a0c') },
      uSandC: { value: C(o.sand || (kind === 1 ? '#d9b98c' : '#b9bdc1')) }, uSandR: { value: o.sandR ?? (kind === 1 ? .78 : .42) },
      uPolC: { value: C(o.pol || '#d6dadf') }, uPolR: { value: Math.max(o.polR ?? .14, .14) },
      uFinC: { value: C(o.fin || '#6b2a10') }, uFinP: { value: new THREE.Vector4(o.finR ?? .35, o.finM ?? 0, o.finCC ?? .6, 0) },
      uWetG: { value: 0 }, uGrainAx: { value: new THREE.Vector3(...(o.grain || [0, 1, 0])).normalize() }, uGrainS: { value: o.grainS || 1 },
      uGlow: { value: new THREE.Color(0, 0, 0) }, uBump: { value: o.bump ?? .45 }, uResG: { value: 0 }, uNrmR: { value: NRM.pits }, uNrmC: { value: NRM.crack }, uWood2: { value: C(o.wood2 || '#ffd2a0') }, uUseMap: { value: o.map ? 1 : 0 }
    };
  }
  /* material for one mesh (shares uniforms + masks, own uMaskMat) */
  material(extra = {}) {
    const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .6, metalness: 0, clearcoat: 1, clearcoatRoughness: .12, envMapIntensity: 1.15, map: this.o.map || null, ...extra });
    const mm = { value: new THREE.Matrix4() }; const self = this;
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, self.u); sh.uniforms.uMaskMat = mm;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n' + VERT_PARS)
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvMP=(uMaskMat*vec4(transformed,1.)).xyz;')
        .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nvMN=normalize(mat3(uMaskMat)*objectNormal);{ mat3 mm=mat3(uMaskMat); sAxX=normalize(normalMatrix*vec3(mm[0][0],mm[1][0],mm[2][0])); sAxY=normalize(normalMatrix*vec3(mm[0][1],mm[1][1],mm[2][1])); sAxZ=normalize(normalMatrix*vec3(mm[0][2],mm[1][2],mm[2][2])); }');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + FRAG_PARS)
        .replace('#include <color_fragment>', '#include <color_fragment>\n' + FRAG_COLOR)
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor=clamp(sR,.04,1.);')
        .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor=clamp(sM,0.,1.);')
        .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n' + FRAG_NORMAL)
        .replace('#include <lights_physical_fragment>', '#include <lights_physical_fragment>\nmaterial.clearcoat=clamp(sCC,0.,1.);')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance+=uGlow;');
    };
    m.customProgramCacheKey = () => 'surf1' + (this.o.map ? 'm' : '');
    m.userData.maskMat = mm; this.mats.push(m); return m;
  }
  add(mesh) { this.meshes.push(mesh); mesh.userData.surf = this; return mesh; }

  /* after the part's meshes are placed: bbox in part space, use map, sample points */
  finalize(partGroup) {
    partGroup.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(partGroup.matrixWorld).invert(), bb = new THREE.Box3(), v = new THREE.Vector3();
    const mats = this.meshes.map(m => new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld));
    this.meshes.forEach((m, i) => { const p = m.geometry.attributes.position; for (let k = 0; k < p.count; k++) bb.expandByPoint(v.fromBufferAttribute(p, k).applyMatrix4(mats[i])); });
    bb.expandByScalar(.01); this.bmin.copy(bb.min); this.bsize.copy(bb.max).sub(bb.min);
    this.meshes.forEach((m, i) => { m.material.userData.maskMat.value.copy(mats[i]); });
    /* sample surface points (area weighted) */
    const r = rng(this.id * 7 + 3), tris = [];
    let total = 0;
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), n = new THREE.Vector3();
    this.meshes.forEach((m, mi) => {
      const g = m.geometry, p = g.attributes.position, idx = g.index, cnt = idx ? idx.count : p.count;
      for (let t = 0; t < cnt; t += 3) {
        const i0 = idx ? idx.getX(t) : t, i1 = idx ? idx.getX(t + 1) : t + 1, i2 = idx ? idx.getX(t + 2) : t + 2;
        a.fromBufferAttribute(p, i0).applyMatrix4(mats[mi]); b.fromBufferAttribute(p, i1).applyMatrix4(mats[mi]); c.fromBufferAttribute(p, i2).applyMatrix4(mats[mi]);
        e1.subVectors(b, a); e2.subVectors(c, a); n.crossVectors(e1, e2); const ar = n.length() / 2; if (ar < 1e-9) continue;
        n.normalize(); total += ar; tris.push({ a: a.clone(), b: b.clone(), c: c.clone(), n: n.clone(), ar, cum: total });
      }
    });
    const N = Math.min(26000, Math.max(4000, tris.length * 3)), smp = [];
    for (let k = 0; k < N; k++) {
      const x = r() * total; let lo = 0, hi = tris.length - 1; while (lo < hi) { const mid = (lo + hi) >> 1; if (tris[mid].cum < x) lo = mid + 1; else hi = mid; }
      const T = tris[lo]; let u = r(), w = r(); if (u + w > 1) { u = 1 - u; w = 1 - w; }
      const p = T.a.clone().addScaledVector(e1.subVectors(T.b, T.a), u).addScaledVector(e2.subVectors(T.c, T.a), w);
      smp.push({ p, n: T.n });
    }
    this.samples = smp;
    for (const s of smp) this.forCells(s.p, s.n, (c, x, y, wt) => { if (wt < .02) return; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const X = x + dx, Y = y + dy; if (this.inCell(c, X, Y)) this.use[Y * this.W + X] = 1; } });
    this.cellOf = new Int8Array(this.W * this.H).fill(-1);
    for (let y = 0; y < this.H; y++) for (let x = 0; x < this.W; x++) this.cellOf[y * this.W + x] = Math.floor(y / this.ch) * 3 + Math.floor(x / this.cw);
  }
  inCell(c, x, y) { const col = c % 3, row = (c / 3) | 0; return x >= col * this.cw && x < (col + 1) * this.cw && y >= row * this.ch && y < (row + 1) * this.ch; }
  /* calls fn(cell, texelX, texelY, weight) for every atlas cell a part-local point maps to */
  forCells(p, n, fn) {
    const qx = clamp((p.x - this.bmin.x) / this.bsize.x, 0, 1), qy = clamp((p.y - this.bmin.y) / this.bsize.y, 0, 1), qz = clamp((p.z - this.bmin.z) / this.bsize.z, 0, 1);
    const l = Math.hypot(n.x, n.y, n.z) || 1;
    for (const [c, w] of weights(n.x / l, n.y / l, n.z / l)) {
      if (w < .02) continue; const [u, v] = cellUV(c, qx, qy, qz), col = c % 3, row = (c / 3) | 0;
      fn(c, Math.floor(col * this.cw + this.pad + u * (this.cw - 2 * this.pad)), Math.floor(row * this.ch + this.pad + v * (this.ch - 2 * this.pad)), w);
    }
  }
  /* face extents (part units) of a cell, for converting a world radius into texels */
  cellExt(c) { const s = this.bsize; return c < 2 ? [s.z, s.y] : c < 4 ? [s.x, s.z] : [s.x, s.y]; }

  /* paint: p,n part-local, r radius (part units), layer name, mode 'sub'|'add'|'set', amt 0..1 */
  dab(p, n, r, layer, mode = 'sub', amt = .5, target = 0) {
    const [ti, ch] = LAYERS[layer], D = ti ? this.B : this.A; let moved = 0;
    this.forCells(p, n, (c, x, y, w) => {
      const [eu, ev] = this.cellExt(c), rx = r / eu * (this.cw - 2 * this.pad), ry = r / ev * (this.ch - 2 * this.pad);
      const col = c % 3, row = (c / 3) | 0, x0 = col * this.cw, x1 = x0 + this.cw - 1, y0 = row * this.ch, y1 = y0 + this.ch - 1;
      const ix0 = Math.max(x0, Math.floor(x - rx)), ix1 = Math.min(x1, Math.ceil(x + rx)), iy0 = Math.max(y0, Math.floor(y - ry)), iy1 = Math.min(y1, Math.ceil(y + ry));
      const k = Math.min(1, w * 1.6) * amt * 255;
      for (let Y = iy0; Y <= iy1; Y++) for (let X = ix0; X <= ix1; X++) {
        const dx = (X - x) / rx, dy = (Y - y) / ry, d = dx * dx + dy * dy; if (d >= 1) continue;
        const f = (mode === "sub" ? (1 - d * d) : (1 - d) * (1 - d)) * k, o = (Y * this.W + X) * 4 + ch, v0 = D[o];
        if (mode === 'sub') D[o] = Math.max(0, v0 - f); else if (mode === 'add') D[o] = Math.min(255, v0 + f);
        else D[o] = v0 + (target * 255 - v0) * Math.min(1, f / 255);
        moved += Math.abs(D[o] - v0);
      }
    });
    this.dirty = true;
    return moved / 255; /* texel-units of material actually changed (drives FX) */
  }
  setLayer(layer, v) { const [ti, ch] = LAYERS[layer], D = ti ? this.B : this.A, b = Math.round(clamp(v, 0, 1) * 255); for (let i = ch; i < D.length; i += 4) D[i] = b; this.dirty = true; }
  getAt(layer, i) { const [ti, ch] = LAYERS[layer]; return (ti ? this.B : this.A)[i * 4 + ch] / 255; }
  /* procedural authoring: fill a layer with patchy noise. fn(p,n,noise) -> 0..1 */
  author(layer, fn, seed = 1) {
    const [ti, ch] = LAYERS[layer], D = ti ? this.B : this.A;
    const pnt = new THREE.Vector3(), nn = new THREE.Vector3(), hw = Math.ceil(this.W / 2) + 1, hh = Math.ceil(this.H / 2) + 1, G = new Float32Array(hw * hh);
    /* evaluate on a half-res grid (per atlas cell), then bilinear-fill so there are no 2x2 blocks */
    for (let gy = 0; gy < hh; gy++) for (let gx = 0; gx < hw; gx++) {
      const x = Math.min(this.W - 1, gx * 2), y = Math.min(this.H - 1, gy * 2);
      this.texelPos(x, y, pnt, nn);
      G[gy * hw + gx] = clamp(fn(pnt, nn, (q) => fbm(pnt.x * q + seed * 1.3, pnt.y * q - seed, pnt.z * q + seed * .7)), 0, 1);
    }
    for (let y = 0; y < this.H; y++) for (let x = 0; x < this.W; x++) {
      const c = this.cellOf[y * this.W + x], gx = x / 2, gy = y / 2; let x0 = Math.floor(gx), y0 = Math.floor(gy), fx = gx - x0, fy = gy - y0;
      /* never blend across atlas cells */
      if (this.cellOf[y * this.W + Math.min(this.W - 1, (x0 + 1) * 2)] !== c) fx = 0;
      if (this.cellOf[Math.min(this.H - 1, (y0 + 1) * 2) * this.W + x] !== c) fy = 0;
      const a = G[y0 * hw + x0], b = G[y0 * hw + x0 + 1], d = G[(y0 + 1) * hw + x0], e = G[(y0 + 1) * hw + x0 + 1];
      D[(y * this.W + x) * 4 + ch] = Math.round(((a * (1 - fx) + b * fx) * (1 - fy) + (d * (1 - fx) + e * fx) * fy) * 255);
    }
    this.dirty = true;
  }
  /* approximate part-local position of a texel (on the bbox face plane) */
  texelPos(x, y, out, nout) {
    const c = this.cellOf[y * this.W + x], col = c % 3, row = (c / 3) | 0;
    const u = clamp((x + .5 - col * this.cw - this.pad) / (this.cw - 2 * this.pad), 0, 1), v = clamp((y + .5 - row * this.ch - this.pad) / (this.ch - 2 * this.pad), 0, 1);
    let qx = .5, qy = .5, qz = .5;
    switch (c) { case 0: qz = 1 - u; qy = v; qx = 1; break; case 1: qz = u; qy = v; qx = 0; break; case 2: qx = u; qz = 1 - v; qy = 1; break; case 3: qx = u; qz = v; qy = 0; break; case 4: qx = u; qy = v; qz = 1; break; default: qx = 1 - u; qy = v; qz = 0; }
    out.set(this.bmin.x + qx * this.bsize.x, this.bmin.y + qy * this.bsize.y, this.bmin.z + qz * this.bsize.z);
    if (nout) { const [ax, sg] = AX[c]; nout.set(0, 0, 0).setComponent(ax, sg); }
    return out;
  }
  /* coverage task: targets = used texels whose layer value fails the done-test at start */
  task(layer, mode, o = {}) {
    const [ti, ch] = LAYERS[layer], D = ti ? this.B : this.A, idx = [], cells = [];
    const doneV = (mode === 'sub' ? (o.done ?? .22) : (o.done ?? .62)) * 255, needV = (mode === 'sub' ? (o.need ?? .3) : 1.01) * 255;
    const P = new THREE.Vector3();
    for (let y = 0; y < this.H; y += 2) for (let x = 0; x < this.W; x += 2) {
      const i = y * this.W + x; if (!this.use[i]) continue;
      if (o.faces && !o.faces.includes(this.cellOf[i])) continue;
      if (o.region) { this.texelPos(x, y, P); if (!o.region(P, this.cellOf[i])) continue; }
      const v = D[i * 4 + ch];
      if (mode === 'sub' ? v >= needV : v < doneV) { idx.push(i); cells.push(this.cellOf[i]); }
    }
    const t = { surf: this, layer, mode, D, ch, doneV, idx: Int32Array.from(idx), cells: Int8Array.from(cells), n: idx.length };
    t.frac = () => { if (!t.n) return 1; let d = 0; for (let k = 0; k < t.n; k++) { const v = D[t.idx[k] * 4 + ch]; if (mode === 'sub' ? v < doneV : v >= doneV) d++; } return d / t.n; };
    t.fracCells = () => { const r = new Float32Array(12); for (let k = 0; k < t.n; k++) { const v = D[t.idx[k] * 4 + ch], c = t.cells[k]; r[c * 2 + 1]++; if (mode === 'sub' ? v < doneV : v >= doneV) r[c * 2]++; } return r; };
    t.complete = (dur = .7) => this.fade(layer, mode === 'sub' ? 0 : (o.to ?? 1), dur, t);
    return t;
  }
  /* smoothly drive a whole layer (or a task's texels and their neighbours) to a value */
  fade(layer, to, dur = .7, task = null) {
    const [ti, ch] = LAYERS[layer], D = ti ? this.B : this.A, tv = to * 255;
    if (dur <= 0) { if (task) { this.setLayer(layer, to); } else this.setLayer(layer, to); return; }
    const from = new Uint8Array(D.length / 4); for (let i = 0; i < from.length; i++) from[i] = D[i * 4 + ch];
    this.fades.push({ D, ch, from, tv, t: 0, dur });
  }
  update(dt) {
    for (let k = this.fades.length - 1; k >= 0; k--) {
      const f = this.fades[k]; f.t += dt; const e = Math.min(1, f.t / f.dur), s = e * e * (3 - 2 * e);
      for (let i = 0; i < f.from.length; i++) f.D[i * 4 + f.ch] = f.from[i] + (f.tv - f.from[i]) * s;
      this.dirty = true; if (e >= 1) this.fades.splice(k, 1);
    }
    if (this.dirty) { this.texA.needsUpdate = true; this.texB.needsUpdate = true; this.dirty = false; }
  }
  finishFades() { for (const f of this.fades) for (let i = 0; i < f.from.length; i++) f.D[i * 4 + f.ch] = f.tv; this.fades.length = 0; this.dirty = true; }
  /* random surface sample (part-local) matching a filter */
  pick(r, filter) { for (let k = 0; k < 400; k++) { const s = this.samples[Math.floor(r() * this.samples.length)]; if (!filter || filter(s.p, s.n)) return s; } return this.samples[0]; }
  dispose() { this.texA.dispose(); this.texB.dispose(); for (const m of this.mats) m.dispose(); }
}
function mkTex(data, w, h) { const t = new THREE.DataTexture(data, w, h, THREE.RGBAFormat, THREE.UnsignedByteType); t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter; t.generateMipmaps = false; t.colorSpace = THREE.NoColorSpace; t.needsUpdate = true; return t; }

/* JS value noise for authoring masks */
function h3(x, y, z) { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); }
function vn(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const L = (a, b, t) => a + (b - a) * t;
  return L(L(L(h3(xi, yi, zi), h3(xi + 1, yi, zi), u), L(h3(xi, yi + 1, zi), h3(xi + 1, yi + 1, zi), u), v),
    L(L(h3(xi, yi, zi + 1), h3(xi + 1, yi, zi + 1), u), L(h3(xi, yi + 1, zi + 1), h3(xi + 1, yi + 1, zi + 1), u), v), w);
}
export function fbm(x, y, z) { return (vn(x, y, z) * .5 + vn(x * 2.1 + 3, y * 2.1, z * 2.1) * .3 + vn(x * 4.3, y * 4.3 + 7, z * 4.3) * .2); }
