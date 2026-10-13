/* Shared PBR material library. Physical materials with CC0 detail normal maps
   (@pmndrs/assets normals, originally emmelleppi/normal-maps) plus the canvas textures in tex.js.
   Materials are cached by key so every tool/model shares GPU programs and textures. */
import * as THREE from 'three';
import n01 from '@pmndrs/assets/normals/0001.webp.js';   /* rough cast */
import n14 from '@pmndrs/assets/normals/0014.webp.js';   /* crumpled fabric */
import n15 from '@pmndrs/assets/normals/0015.webp.js';   /* pitted */
import n19 from '@pmndrs/assets/normals/0019.webp.js';   /* wood fibre */
import n20 from '@pmndrs/assets/normals/0020.webp.js';   /* grit speckle */
import n21 from '@pmndrs/assets/normals/0021.webp.js';   /* fine metal */
import n24 from '@pmndrs/assets/normals/0024.webp.js';   /* cracked crust */
import n27 from '@pmndrs/assets/normals/0027.webp.js';   /* pebbled rubber */
import { woodTex, brushedTex, knurlTex, gritTex, clothTex, spongeTex, fileTex, labelTex } from './tex.js';

const SRC = { cast: n01, fabric: n14, pits: n15, fibre: n19, grit: n20, fine: n21, crack: n24, pebble: n27 };
const NT = {}, CL = {};
/* CC0 normal map texture (shared; each material gets a cheap clone for its own repeat) */
export function ccNormal(name, rep = 1) {
  let base = NT[name];
  if (!base) {
    const img = new Image(); base = NT[name] = new THREE.Texture(img);
    base.wrapS = base.wrapT = THREE.RepeatWrapping; base.anisotropy = 8; base.colorSpace = THREE.NoColorSpace;
    CL[name] = []; img.onload = () => { base.needsUpdate = true; for (const c of CL[name]) c.needsUpdate = true; }; img.src = SRC[name];
  }
  if (rep === 1) return base;
  const t = base.clone(); t.repeat.set(rep, rep); CL[name].push(t); if (base.image.complete && base.image.naturalWidth) t.needsUpdate = true; return t;
}

const C = new Map();
const cached = (key, make) => { let m = C.get(key); if (!m) { m = make(); C.set(key, m); } return m; };
const v2 = k => new THREE.Vector2(k, k);

export const M = {
  /* forged / machined steel; rough 0..1; optional fine-machining normal */
  steel: (color = '#b7bfc5', rough = .28, detail = .25) => cached(`st${color}${rough}${detail}`, () => new THREE.MeshPhysicalMaterial({ color, metalness: 1, roughness: rough, normalMap: ccNormal('fine', 3), normalScale: v2(detail), envMapIntensity: 1.1 })),
  brushed: (color = '#c3cad0', rough = .3) => cached(`br${color}${rough}`, () => { const t = brushedTex(); return new THREE.MeshPhysicalMaterial({ color, metalness: 1, roughness: rough, normalMap: t.normalMap, normalScale: v2(.35), anisotropy: .6 }); }),
  chrome: () => cached('chrome', () => new THREE.MeshPhysicalMaterial({ color: '#f4f6f8', metalness: 1, roughness: .05, envMapIntensity: 1.3 })),
  darkSteel: (rough = .45) => cached('ds' + rough, () => new THREE.MeshPhysicalMaterial({ color: '#3a4046', metalness: 1, roughness: rough, normalMap: ccNormal('cast', 2), normalScale: v2(.35) })),
  brass: (rough = .25) => cached('brass' + rough, () => new THREE.MeshPhysicalMaterial({ color: '#d9b25a', metalness: 1, roughness: rough, normalMap: ccNormal('fine', 3), normalScale: v2(.2) })),
  knurl: (color = '#9aa3aa', metal = 1) => cached(`kn${color}${metal}`, () => { const t = knurlTex(); const n = t.normalMap.clone(); n.repeat.set(6, 3); n.needsUpdate = true; return new THREE.MeshPhysicalMaterial({ color, metalness: metal, roughness: metal ? .32 : .8, normalMap: n, normalScale: v2(1.1) }); }),
  /* moulded plastic with a light clearcoat */
  plastic: (color, rough = .38, cc = .35) => cached(`pl${color}${rough}${cc}`, () => new THREE.MeshPhysicalMaterial({ color, roughness: rough, metalness: 0, clearcoat: cc, clearcoatRoughness: .25, normalMap: ccNormal('fine', 2), normalScale: v2(.08) })),
  /* translucent acetate (screwdriver handles) */
  acetate: (color) => cached('ac' + color, () => new THREE.MeshPhysicalMaterial({ color, roughness: .12, metalness: 0, transmission: .55, thickness: .4, ior: 1.48, clearcoat: 1, clearcoatRoughness: .05, attenuationColor: new THREE.Color(color), attenuationDistance: .6 })),
  rubber: (color = '#1e2226', rough = .82) => cached(`rb${color}${rough}`, () => new THREE.MeshPhysicalMaterial({ color, roughness: rough, metalness: 0, sheen: .25, sheenRoughness: .8, sheenColor: new THREE.Color('#6a6f74'), normalMap: ccNormal('pebble', 4), normalScale: v2(.45) })),
  wood: (color = '#9b6a3c', rough = .5, varnish = .4) => cached(`wd${color}${rough}${varnish}`, () => { const t = woodTex(color); return new THREE.MeshPhysicalMaterial({ map: t.map, roughness: rough, metalness: 0, clearcoat: varnish, clearcoatRoughness: .3, normalMap: t.normalMap, normalScale: v2(.55) }); }),
  cloth: (color) => cached('cl' + color, () => { const t = clothTex(color); const n = ccNormal('fabric', 1); return new THREE.MeshPhysicalMaterial({ map: t.map, roughness: 1, metalness: 0, sheen: .4, sheenRoughness: .7, sheenColor: new THREE.Color(color).lerp(new THREE.Color('#ffffff'), .2), normalMap: n, normalScale: v2(.9) }); }),
  sponge: (color) => cached('sp' + color, () => { const t = spongeTex(color); return new THREE.MeshPhysicalMaterial({ map: t.map, normalMap: t.normalMap, normalScale: v2(1.2), roughness: 1, metalness: 0 }); }),
  grit: (color) => cached('gr' + color, () => { const t = gritTex(color); return new THREE.MeshPhysicalMaterial({ map: t.map, normalMap: ccNormal('grit', 3), normalScale: v2(1.4), roughness: 1, metalness: 0 }); }),
  file: () => cached('file', () => { const t = fileTex(); const n = t.normalMap.clone(); n.repeat.set(2, 10); n.needsUpdate = true; return new THREE.MeshPhysicalMaterial({ color: '#7a8288', metalness: .9, roughness: .5, normalMap: n, normalScale: v2(1.6) }); }),
  label: (title, sub, bg, fg) => cached(`lb${title}${bg}`, () => new THREE.MeshPhysicalMaterial({ map: labelTex(title, sub, bg, fg), roughness: .3, metalness: .35, clearcoat: .6, clearcoatRoughness: .15 })),
  paint: (color, rough = .3) => cached(`pt${color}${rough}`, () => new THREE.MeshPhysicalMaterial({ color, roughness: rough, metalness: .15, clearcoat: .8, clearcoatRoughness: .12 })),
  glassy: (color = '#d8eef4', op = .3) => cached(`gl${color}${op}`, () => new THREE.MeshPhysicalMaterial({ color, roughness: .05, metalness: 0, transmission: .9, thickness: .2, ior: 1.45, transparent: true, opacity: 1 - op * .2, envMapIntensity: 1.2 })),
  crust: () => cached('crust', () => new THREE.MeshPhysicalMaterial({ color: '#5a2a12', roughness: 1, metalness: 0, normalMap: ccNormal('crack', 2), normalScale: v2(1.6) })),
};
