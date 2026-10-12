/* workshop backdrop: bench, cutting mat, back wall, window, lamps, shelves, pegboard tools */
import * as THREE from 'three';
import { box, rbox, cyl, lathe, sphere, mesh, group, metal, plastic, mat, canvasTex, noiseCanvas, emissive, glass, torus } from './geo.js';

export const BENCH_Y = -2.7;

function woodTex(base = '#6b4429', planks = 6) {
  return canvasTex(512, 512, (g, w, h) => {
    const ph = h / planks;
    for (let i = 0; i < planks; i++) {
      const c = new THREE.Color(base).offsetHSL((Math.random() - .5) * .02, (Math.random() - .5) * .08, (Math.random() - .5) * .07);
      g.fillStyle = '#' + c.getHexString(); g.fillRect(0, i * ph, w, ph);
      for (let k = 0; k < 70; k++) { g.strokeStyle = `rgba(${Math.random() < .5 ? '30,16,8' : '255,220,170'},${Math.random() * .12})`; g.lineWidth = Math.random() * 2.5; g.beginPath(); const y = i * ph + Math.random() * ph; g.moveTo(0, y); for (let x = 0; x <= w; x += 32) g.lineTo(x, y + Math.sin(x * .02 + k) * 3 + (Math.random() - .5) * 2); g.stroke(); }
      g.fillStyle = 'rgba(10,5,2,.65)'; g.fillRect(0, i * ph, w, 2.5);
      for (let k = 0; k < 3; k++) { g.fillStyle = 'rgba(40,22,10,.5)'; g.beginPath(); g.ellipse(Math.random() * w, i * ph + ph / 2, 10 + Math.random() * 10, 4, 0, 0, 7); g.fill(); }
    }
    noiseCanvas(g, w, h, .06);
  }, { repeat: [3, 3] });
}
function matTex() {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#17463f'; g.fillRect(0, 0, w, h); noiseCanvas(g, w, h, .05);
    for (let i = 0; i <= 32; i++) { const x = i * w / 32; g.strokeStyle = i % 4 ? 'rgba(150,210,195,.16)' : 'rgba(170,230,210,.34)'; g.lineWidth = i % 4 ? 1 : 2; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); g.beginPath(); g.moveTo(0, x); g.lineTo(w, x); g.stroke(); }
    g.strokeStyle = 'rgba(240,200,120,.35)'; g.lineWidth = 2; g.beginPath(); g.arc(w * .82, h * .2, 50, 0, 7); g.stroke(); g.beginPath(); g.moveTo(w * .1, h * .9); g.lineTo(w * .4, h * .6); g.stroke();
  }, { repeat: [1, 1] });
}
function wallTex() {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#2d3c41'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 32) for (let x = (y / 32) % 2 ? -32 : 0; x < w; x += 64) { g.fillStyle = `rgba(${Math.random() < .5 ? '255,255,255' : '0,0,0'},${Math.random() * .05})`; g.fillRect(x + 1, y + 1, 62, 30); }
    g.strokeStyle = 'rgba(0,0,0,.25)'; for (let y = 0; y < h; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    noiseCanvas(g, w, h, .08);
  }, { repeat: [8, 4] });
}
function pegTex() {
  return canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#7a5a3a'; g.fillRect(0, 0, w, h); noiseCanvas(g, w, h, .07); g.fillStyle = 'rgba(20,10,4,.75)'; for (let y = 8; y < h; y += 16) for (let x = 8; x < w; x += 16) { g.beginPath(); g.arc(x, y, 2.6, 0, 7); g.fill(); } }, { repeat: [4, 2] });
}

export function buildWorld(scene) {
  const W = new THREE.Group(); W.name = 'world'; scene.add(W);
  const Y = BENCH_Y;
  const bench = mesh(box(60, .8, 26), new THREE.MeshStandardMaterial({ map: woodTex(), roughness: .62 }), { p: [0, Y - .4, -4], cast: false }); W.add(bench);
  const matM = mesh(rbox(12, .08, 9, .04), new THREE.MeshStandardMaterial({ map: matTex(), roughness: .7 }), { p: [0, Y + .04, .5], cast: false }); W.add(matM);
  const WZ = -12;
  const wall = mesh(box(90, 32, .5), new THREE.MeshStandardMaterial({ map: wallTex(), roughness: .95 }), { p: [0, 12, WZ - .3], cast: false, recv: true }); W.add(wall);
  const woodM = new THREE.MeshStandardMaterial({ color: '#5a3b26', roughness: .7 });
  W.add(mesh(box(90, 3.4, .35), woodM, { p: [0, Y + 1.7, WZ], cast: false }));
  /* window */
  const WX = 4.5, WYc = Y + 9.6;
  W.add(mesh(box(5.2, 5.2, .1), emissive('#0d2350', .9), { p: [WX, WYc, WZ + .2], cast: false }));
  W.add(mesh(box(1.4, 1.4, .05), emissive('#dfe9ff', 1.6), { p: [WX + 1.2, WYc + 1.4, WZ + .23], cast: false }));
  const fr = new THREE.MeshStandardMaterial({ color: '#2e2118', roughness: .7 });
  for (const [w, h, x, y] of [[5.8, .3, 0, 2.75], [5.8, .4, 0, -2.75], [.3, 5.8, -2.75, 0], [.3, 5.8, 2.75, 0], [.18, 5.2, 0, 0], [5.2, .16, 0, 0]]) W.add(mesh(box(w, h, .4), fr, { p: [WX + x, WYc + y, WZ + .35], cast: false }));
  /* hanging lamps */
  for (const [lx, ly, lz] of [[-1.5, 7.5, -3.5], [9.5, 8.5, -6]]) {
    W.add(mesh(cyl(.03, .03, 8, 6), mat('#111'), { p: [lx, ly + 4.4, lz], cast: false }));
    const sh = mesh(lathe([[.15, .2], [.9, -.25], [1.25, -.7], [1.28, -.75]], 28), new THREE.MeshStandardMaterial({ color: '#2f3d3a', roughness: .45, metalness: .6, side: THREE.DoubleSide }), { p: [lx, ly, lz], cast: false }); W.add(sh);
    W.add(mesh(sphere(.32, 16, 12), emissive('#ffc977', 5), { p: [lx, ly - .45, lz], cast: false }));
  }
  /* cabinets + shelves (left) */
  const cab = (cx, rows, cols, w, hr, col) => {
    const H = rows * hr; W.add(mesh(box(w, H + .3, 1.6), mat(col, { roughness: .55, metalness: .35 }), { p: [cx, Y + (H + .3) / 2, WZ + .9], cast: false }));
    const brass = metal('#c79b4a', .35), lbl = mat('#d9cfae', { roughness: 1 });
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const dw = (w - .3) / cols, x = cx - w / 2 + .15 + dw * (c + .5), y = Y + .15 + hr * (r + .5);
      W.add(mesh(rbox(dw - .1, hr - .1, .12, .03), mat(col, { roughness: .5, metalness: .45 }), { p: [x, y, WZ + 1.72], cast: false }));
      W.add(mesh(box(dw * .4, .09, .1), brass, { p: [x, y + hr * .14, WZ + 1.82], cast: false }));
      W.add(mesh(box(dw * .42, hr * .22, .02), lbl, { p: [x, y - hr * .16, WZ + 1.79], cast: false }));
    }
  };
  cab(-6.2, 6, 3, 4.8, .95, '#2f5a54'); cab(-12, 4, 4, 5.6, .95, '#5a3e2a');
  const shelfM = new THREE.MeshStandardMaterial({ color: '#7a5636', roughness: .7 });
  for (const y of [Y + 8.6, Y + 10.9]) W.add(mesh(box(8, .24, 1.4), shelfM, { p: [-7.5, y, WZ + .9], cast: false }));
  const jc = ['#c9a14a', '#3f8f8a', '#b8553a', '#7a8aa0', '#d8d0b8'];
  for (let i = 0; i < 7; i++) { const h = .7 + (i % 3) * .3; W.add(mesh(cyl(.32, .32, h, 16), i % 2 ? glass(jc[i % 5], .35) : mat(jc[i % 5], { roughness: .5, metalness: .4 }), { p: [-10.4 + i * .95, Y + 8.72 + h / 2, WZ + .9], cast: false })); }
  for (let i = 0; i < 7; i++) { const h = 1 + (i % 3) * .25; W.add(mesh(box(.3, h, .95), mat(jc[(i + 2) % 5], { roughness: .8 }), { p: [-10.2 + i * .36, Y + 11.02 + h / 2, WZ + .9], cast: false })); }
  for (let i = 0; i < 3; i++) W.add(mesh(cyl(.4, .4, .9, 18), mat(['#b23a2b', '#d8a43e', '#2f6f78'][i], { roughness: .45, metalness: .45 }), { p: [-7 + i * 1.1, Y + 11.47, WZ + .9], cast: false }));
  /* pegboard with tools (right) */
  const PX = 10, PY = Y + 6;
  W.add(mesh(box(8, 4.6, .2), new THREE.MeshStandardMaterial({ map: pegTex(), roughness: .8 }), { p: [PX, PY, WZ + .1], cast: false }));
  const steel = metal('#aab2b8', .3), dark = metal('#59656b', .4), woodH = mat('#8a5a32', { roughness: .6 });
  const hang = (parts, x, y, rz = 0) => { const g = group([], { p: [x, y, WZ + .35], r: [0, 0, rz] }); for (const [geo, m, p, r] of parts) g.add(mesh(geo, m, { p, r: r || [0, 0, 0], cast: false })); W.add(g); };
  hang([[cyl(.07, .07, 1.5, 10), woodH, [0, -.4, 0]], [box(.9, .45, .3), dark, [0, .45, 0]]], PX - 3, PY + .6);
  hang([[box(.22, 2.3, .08), steel, [0, 0, 0]], [cyl(.34, .34, .08, 16), steel, [0, 1.2, 0], [Math.PI / 2, 0, 0]]], PX - 2, PY + .3, .1);
  hang([[box(.2, 2, .08), steel, [0, 0, 0]], [cyl(.3, .3, .08, 16), steel, [0, 1.05, 0], [Math.PI / 2, 0, 0]]], PX - 1.3, PY + .4, -.05);
  hang([[box(2.4, 1.1, .05), steel, [0, 0, 0]], [box(.6, .35, .15), woodH, [1.4, .2, 0]]], PX + 1.6, PY + 1.1, .02);
  for (let i = 0; i < 5; i++) hang([[cyl(.035, .035, 1, 8), steel, [0, -.5, 0]], [cyl(.1, .1, .6, 10), plastic(['#d9a441', '#c43a2a', '#2f6f78', '#d9a441', '#c43a2a'][i], .5), [0, .3, 0]]], PX + .1 + i * .42, PY - .7);
  hang([[torus(.38, .12, 10, 24), plastic('#d9a441', .5), [0, 0, 0]]], PX + 2.9, PY - .9);
  /* bench clutter */
  const clutter = new THREE.Group(); W.add(clutter);
  const tb = group([mesh(rbox(2.4, 1, 1.2, .1), mat('#c8402c', { roughness: .4, metalness: .5 }), { p: [0, .5, 0] }), mesh(cyl(.05, .05, 1.8, 8), steel, { p: [0, 1.15, 0], r: [0, 0, Math.PI / 2] })], { p: [-7.6, Y, -2.8], r: [0, .35, 0] }); clutter.add(tb);
  const vise = group([mesh(box(1.6, .5, 1.1), dark, { p: [0, .25, 0] }), mesh(box(.5, .9, 1), metal('#4a5a60', .4), { p: [-.5, .9, 0] }), mesh(cyl(.08, .08, 1.8, 10), steel, { p: [.6, .7, 0], r: [0, 0, Math.PI / 2] })], { p: [7.6, Y, -4.8], r: [0, -.3, 0] }); clutter.add(vise);
  const cols = ['#d9a441', '#3f8f8a', '#b8553a', '#6f7f93'];
  for (let i = 0; i < 4; i++) clutter.add(mesh(cyl(.36, .36, .55 + i * .08, 18), mat(cols[i], { roughness: .5, metalness: .45 }), { p: [-8.8 - (i % 2) * .85, Y + .3, -6.2 - Math.floor(i / 2) * .85] }));
  clutter.add(mesh(rbox(1.6, .14, 1.2, .06), mat('#cfc5ae', { roughness: 1 }), { p: [7.4, Y + .07, 1.6], r: [0, .5, 0] }));
  clutter.add(mesh(lathe([[.5, 0], [.5, .16], [.2, .16], [.2, .3], [.12, .3], [.12, 0]], 18), metal('#8a7355', .4), { p: [6.8, Y, -1.4] }));
  for (let i = 0; i < 6; i++) clutter.add(mesh(cyl(.05, .05, .5, 8), metal('#b8bec3', .35), { p: [6 + (i % 2) * .2, Y + .05, -2.6 + i * .22], r: [Math.PI / 2, 0, i] }));
  return W;
}
