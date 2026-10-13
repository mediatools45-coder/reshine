/* Workshop backdrop, drawn soft-focus behind the object (layer BG, see post.js):
   a worn plank workbench, green board wall, a bright dusty window, one shelf unit with a few
   props and a screwdriver rack. Deliberately sparse: shapes and warm light, not clutter.
   The bench top is also on the sharp layer near the object so its shadow stays crisp. */
import * as THREE from 'three';
import { lathe, cyl, box, rbox, mesh, canvasTex } from '../assets/geo.js';
import { M } from '../assets/materials.js';
import { BG } from './post.js';
import { R } from './engine.js';

export const BENCH_Y = -2.7;

function rr(s) { let x = s * 9301 + 49297; return () => { x = (x * 16807) % 2147483647; return x / 2147483647; }; }
/* worn bench planks: grain, seams, darker edges, stains, sawdust specks */
function benchTex() {
  return canvasTex(1024, 1024, (g, w, h) => {
    const r = rr(3), planks = 6, ph = h / planks;
    for (let i = 0; i < planks; i++) {
      const c = new THREE.Color('#6a4a2e').offsetHSL((r() - .5) * .02, (r() - .5) * .08, (r() - .5) * .08);
      g.fillStyle = '#' + c.getHexString(); g.fillRect(0, i * ph, w, ph);
      for (let k = 0; k < 120; k++) { g.strokeStyle = r() < .55 ? `rgba(50,28,12,${r() * .14})` : `rgba(255,225,180,${r() * .1})`; g.lineWidth = .5 + r() * 2.5; g.beginPath(); const y = i * ph + r() * ph; g.moveTo(0, y); for (let x = 0; x <= w; x += 24) g.lineTo(x, y + Math.sin(x * .01 + k) * 4 + (r() - .5) * 2); g.stroke(); }
      const gr = g.createLinearGradient(0, i * ph, 0, i * ph + ph); gr.addColorStop(0, 'rgba(20,10,4,.55)'); gr.addColorStop(.06, 'rgba(20,10,4,0)'); gr.addColorStop(.94, 'rgba(20,10,4,0)'); gr.addColorStop(1, 'rgba(20,10,4,.45)'); g.fillStyle = gr; g.fillRect(0, i * ph, w, ph);
    }
    for (let k = 0; k < 14; k++) { const gr = g.createRadialGradient(0, 0, 0, 0, 0, 1); gr.addColorStop(0, 'rgba(30,18,8,.35)'); gr.addColorStop(1, 'rgba(30,18,8,0)'); g.save(); g.translate(r() * w, r() * h); g.scale(30 + r() * 90, 20 + r() * 60); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 1, 0, 7); g.fill(); g.restore(); }
    for (let k = 0; k < 2600; k++) { g.fillStyle = `rgba(${r() < .7 ? '235,205,160' : '60,40,20'},${.3 + r() * .5})`; g.fillRect(r() * w, r() * h, 1 + r() * 2.5, 1 + r() * 1.5); }
  }, { repeat: [2, 2] });
}
/* painted green boards */
function wallTex() {
  return canvasTex(512, 512, (g, w, h) => {
    const r = rr(9), n = 8, bw = w / n;
    for (let i = 0; i < n; i++) {
      const c = new THREE.Color('#3f5a45').offsetHSL((r() - .5) * .03, (r() - .5) * .1, (r() - .5) * .08); g.fillStyle = '#' + c.getHexString(); g.fillRect(i * bw, 0, bw, h);
      g.fillStyle = 'rgba(10,15,10,.6)'; g.fillRect(i * bw, 0, 3, h);
      for (let k = 0; k < 40; k++) { g.fillStyle = `rgba(${r() < .5 ? '120,90,60' : '20,25,20'},${r() * .25})`; g.fillRect(i * bw + r() * bw, r() * h, 2 + r() * 10, 4 + r() * 40); }
    }
  }, { repeat: [3, 1] });
}
function windowTex() {
  return canvasTex(256, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#fff6e2'); gr.addColorStop(1, '#f2e0bc'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const r = rr(5); for (let k = 0; k < 60; k++) { g.fillStyle = `rgba(150,130,100,${r() * .25})`; g.beginPath(); g.ellipse(r() * w, r() * h, 4 + r() * 20, 3 + r() * 12, r() * 3, 0, 7); g.fill(); }
  });
}
const onBG = o => { o.traverse(c => { c.layers.set(BG); if (c.isMesh) { c.castShadow = false; c.receiveShadow = true; } }); return o; };

export function buildStudio(scene) {
  const W = new THREE.Group(); W.name = 'workshop'; scene.add(W); scene.background = null; scene.fog = null;
  const Y = BENCH_Y;
  /* bench top: sharp near the object, fading out with distance so the blurred copy takes over */
  const bt = benchTex(), benchM = new THREE.MeshPhysicalMaterial({ map: bt, roughness: .78, metalness: 0, clearcoat: .15, clearcoatRoughness: .6, transparent: true });
  const fade = { value: 1 }, ctr = { value: new THREE.Vector3() }; R.fgFade = fade; R.fgCtr = ctr;
  benchM.onBeforeCompile = sh => {
    sh.uniforms.uFade = fade; sh.uniforms.uCtr = ctr;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWp=(modelMatrix*vec4(transformed,1.)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp; uniform float uFade; uniform vec3 uCtr;')
      .replace('#include <dithering_fragment>', '#include <dithering_fragment>\ngl_FragColor.a*=1.-uFade*smoothstep(5.,9.,length(vWp.xz-uCtr.xz));');
  };
  const bench = mesh(box(30, .6, 16), benchM, { p: [0, Y - .3, -1] }); bench.castShadow = false; bench.receiveShadow = true; bench.layers.enable(BG); W.add(bench);
  const front = mesh(box(30, 1.6, .4), M.wood('#6e4e30', .7, 0), { p: [0, Y - 1.4, 7] }); W.add(onBG(front));
  /* back wall + window */
  const wall = mesh(box(40, 22, .4), new THREE.MeshStandardMaterial({ map: wallTex(), roughness: .9 }), { p: [0, Y + 9, -10] }); W.add(onBG(wall));
  const win = new THREE.Group(); win.position.set(-2.5, Y + 6.2, -9.7);
  win.add(mesh(new THREE.PlaneGeometry(7, 5.4), new THREE.MeshBasicMaterial({ map: windowTex(), color: new THREE.Color(3.2, 2.9, 2.4) })));
  const fr = M.wood('#5a3f26', .75, 0);
  for (const x of [-3.6, -1.2, 1.2, 3.6]) win.add(mesh(box(.28, 5.8, .3), fr, { p: [x, 0, .15] }));
  for (const y of [-2.8, 0, 2.8]) win.add(mesh(box(7.5, .28, .3), fr, { p: [0, y, .15] }));
  win.add(mesh(box(7.9, .3, .8), fr, { p: [0, -3.0, .4] }));
  W.add(onBG(win));
  /* light spilling in from the window onto the bench and wall */
  const sun = new THREE.SpotLight(0xffe2b8, 55, 26, .6, .9, 1.6); sun.position.set(-2.5, Y + 6, -8.5); sun.target.position.set(0, Y, 0); W.add(sun, sun.target); sun.layers.enableAll();
  /* shelf unit (right) with a few props */
  const sh = new THREE.Group(); sh.position.set(6.2, Y, -8.6); const sw = M.wood('#7a5534', .7, .1);
  for (const x of [-3, 0, 3]) sh.add(mesh(box(.25, 5, 2), sw, { p: [x, 2.5, 0] }));
  for (const y of [.12, 2.5, 4.9]) sh.add(mesh(box(6.25, .22, 2), sw, { p: [0, y, 0] }));
  sh.add(mesh(rbox(2.4, 1.3, 1.6, .06), M.wood('#9a6a40', .6, .2), { p: [-1.5, .9, .1] }));
  sh.add(mesh(box(.5, .12, .08), M.brass(.4), { p: [-1.5, .95, .92] }));
  sh.add(mesh(lathe([[0, 0], [.45, 0, 1], [.48, .05], [.48, .95], [.3, 1.2], [.1, 1.3], [.06, 1.9]], 24), M.paint('#d9a62a', .5), { p: [1.0, .23, .1] }));
  sh.add(mesh(cyl(.5, .5, .9, 24), M.paint('#6c7c56', .55), { p: [2.1, .68, .2] }));
  sh.add(mesh(rbox(2.2, 1.6, 1.6, .08), M.plastic('#2f5f9a', .5), { p: [1.5, 3.42, .1] }));
  sh.add(mesh(cyl(.45, .45, .35, 24), M.rubber('#202326', .8), { p: [-1.8, 2.8, .2], r: [Math.PI / 2, 0, 0] }));
  W.add(onBG(sh));
  /* screwdriver rack on the left wall */
  const rk = new THREE.Group(); rk.position.set(-8.5, Y + 3.2, -9.5);
  rk.add(mesh(box(3.2, .3, .7), sw, { p: [0, 0, .35] }));
  ['#e8b72e', '#e8b72e', '#d4542c', '#e8b72e', '#2f6fb0'].forEach((c, i) => { rk.add(mesh(cyl(.13, .15, .8, 12), M.plastic(c, .35), { p: [-1.2 + i * .6, .5, .45] })); rk.add(mesh(cyl(.035, .035, 1.2, 8), M.steel(), { p: [-1.2 + i * .6, -.5, .45] })); });
  W.add(onBG(rk));
  /* bench lamp on the left (out of focus) */
  const lamp = new THREE.Group(); lamp.position.set(-9.5, Y, -5); const lm = M.paint('#d8d2c4', .5);
  lamp.add(mesh(cyl(.9, 1, .3, 24), lm, { p: [0, .15, 0] })); lamp.add(mesh(cyl(.08, .08, 3.6, 10), lm, { p: [0, 1.9, 0] }));
  lamp.add(mesh(lathe([[.15, 0], [.5, .5], [1.0, 1.2, 1]], 24), lm, { p: [.6, 3.6, 0], r: [0, 0, -2.2] }));
  W.add(onBG(lamp));
  const warm = new THREE.PointLight(0xffb070, 18, 16, 1.8); warm.position.set(4, Y + 4, -6); W.add(warm); warm.layers.enableAll();
  return W;
}
/* keep the sharp-bench fade centred on the object */
export function updateStudio(target) { if (R.fgCtr) R.fgCtr.value.copy(target); }
