/* Studio backdrop: a softly reflective floor that fades into the gradient background (no visible horizon) that catches the object's shadow,
   and a screen-space gradient background. Replaces the old cluttered workbench. */
import * as THREE from 'three';

export const BENCH_Y = -2.7;

function gradientTex() {
  const c = document.createElement('canvas'); c.width = 16; c.height = 512; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, '#0d1114'); gr.addColorStop(.5, '#161c20'); gr.addColorStop(1, '#0b0e10');
  g.fillStyle = gr; g.fillRect(0, 0, 16, 512);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
/* radial falloff baked into the floor so it fades into the backdrop with no visible edge */
function floorMat() {
  const m = new THREE.MeshPhysicalMaterial({ color: '#171b1f', roughness: .55, metalness: 0, clearcoat: .35, clearcoatRoughness: .3, envMapIntensity: .45, transparent: true });
  m.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vFl;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvFl=position.xy;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vFl;')
      .replace('#include <dithering_fragment>', '#include <dithering_fragment>\ngl_FragColor.a*=1.-smoothstep(3.,15.,length(vFl));');
  };
  return m;
}
export function buildStudio(scene) {
  const W = new THREE.Group(); W.name = 'studio'; scene.add(W);
  scene.background = gradientTex(); scene.fog = new THREE.Fog(0x0a0e11, 34, 80);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(60, 96), floorMat());
  floor.rotation.x = -Math.PI / 2; floor.position.y = BENCH_Y; floor.receiveShadow = true; W.add(floor);
  return W;
}
