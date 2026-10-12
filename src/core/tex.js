/* procedural PBR textures (color + normal maps generated on canvases) for tools and props */
import * as THREE from 'three';

const cache = {};
function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function rnd(s) { let x = s * 9301 + 49297; return () => { x = (x * 16807) % 2147483647; return x / 2147483647; }; }
/* height canvas -> tangent-space normal map */
function normalFrom(hc, k = 2) {
  const w = hc.width, h = hc.height, src = hc.getContext('2d').getImageData(0, 0, w, h).data, c = cv(w, h), g = c.getContext('2d'), img = g.createImageData(w, h), d = img.data;
  const H = (x, y) => src[(((y + h) % h) * w + ((x + w) % w)) * 4] / 255;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (H(x + 1, y) - H(x - 1, y)) * k, dy = (H(x, y + 1) - H(x, y - 1)) * k, l = Math.hypot(dx, dy, 1), o = (y * w + x) * 4;
    d[o] = (-dx / l * .5 + .5) * 255; d[o + 1] = (dy / l * .5 + .5) * 255; d[o + 2] = (1 / l * .5 + .5) * 255; d[o + 3] = 255;
  }
  g.putImageData(img, 0, 0); return c;
}
function tex(c, srgb, rep = [1, 1]) { const t = new THREE.CanvasTexture(c); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); t.anisotropy = 8; return t; }
function pair(key, w, h, draw, k = 2, colorDraw) {
  if (cache[key]) return cache[key];
  const hc = cv(w, h); draw(hc.getContext('2d'), w, h);
  let col = null; if (colorDraw) { col = cv(w, h); colorDraw(col.getContext('2d'), w, h, hc); }
  return cache[key] = { map: col ? tex(col, true) : null, normalMap: tex(normalFrom(hc, k), false), height: hc };
}

/* long wood fibres + growth rings */
export function woodTex(base = '#9b6a3c') {
  return pair('wood' + base, 256, 512, (g, w, h) => {
    g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); const r = rnd(3);
    for (let i = 0; i < 260; i++) { const x = r() * w; g.strokeStyle = `rgba(${r() < .5 ? 0 : 255},${r() < .5 ? 0 : 255},${r() < .5 ? 0 : 255},${.06 + r() * .1})`; g.strokeStyle = r() < .5 ? `rgba(0,0,0,${.05 + r() * .12})` : `rgba(255,255,255,${.04 + r() * .08})`; g.lineWidth = .5 + r() * 2; g.beginPath(); g.moveTo(x, 0); for (let y = 0; y <= h; y += 16) g.lineTo(x + Math.sin(y * .02 + i) * 3 + (r() - .5) * 1.5, y); g.stroke(); }
  }, 1.4, (g, w, h, hc) => {
    const c0 = new THREE.Color(base); g.fillStyle = base; g.fillRect(0, 0, w, h); const r = rnd(5);
    for (let i = 0; i < 40; i++) { const x = r() * w, ww = 4 + r() * 18; g.fillStyle = `rgba(${r() < .5 ? '40,20,8' : '255,220,170'},${.05 + r() * .1})`; g.fillRect(x, 0, ww, h); }
    g.globalAlpha = .5; g.drawImage(hc, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'multiply'; g.fillStyle = '#' + c0.getHexString(); g.fillRect(0, 0, w, h); g.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 4; i++) { g.fillStyle = 'rgba(50,25,10,.35)'; g.beginPath(); g.ellipse(r() * w, r() * h, 3 + r() * 5, 10 + r() * 14, 0, 0, 7); g.fill(); }
  });
}
/* brushed metal streaks */
export function brushedTex() {
  return pair('brushed', 256, 256, (g, w, h) => { g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); const r = rnd(7); for (let i = 0; i < 900; i++) { const y = r() * h; g.fillStyle = r() < .5 ? `rgba(0,0,0,${r() * .18})` : `rgba(255,255,255,${r() * .18})`; g.fillRect(0, y, w, .6 + r()); } }, .8);
}
/* diamond knurling */
export function knurlTex() {
  return pair('knurl', 128, 128, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.strokeStyle = '#000'; g.lineWidth = 3.2; for (let i = -w; i < w * 2; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke(); g.beginPath(); g.moveTo(i, h); g.lineTo(i + h, 0); g.stroke(); } }, 3.5);
}
/* abrasive grit */
export function gritTex(base = '#b8935f') {
  return pair('grit' + base, 256, 256, (g, w, h) => { const img = g.createImageData(w, h), d = img.data, r = rnd(11); for (let i = 0; i < d.length; i += 4) { const v = r() < .35 ? 255 * r() : 60 + r() * 40; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; } g.putImageData(img, 0, 0); }, 4,
    (g, w, h, hc) => { g.fillStyle = base; g.fillRect(0, 0, w, h); const r = rnd(13); for (let i = 0; i < 5000; i++) { g.fillStyle = r() < .5 ? `rgba(40,25,10,${r() * .6})` : `rgba(255,240,210,${r() * .5})`; g.fillRect(r() * w, r() * h, 1.5, 1.5); } });
}
/* woven fabric */
export function clothTex(base = '#efe6d0') {
  return pair('cloth' + base, 128, 128, (g, w, h) => { for (let y = 0; y < h; y += 4) for (let x = 0; x < w; x += 4) { const on = ((x + y) / 4) % 2; const gr = g.createLinearGradient(x, y, x + (on ? 4 : 0), y + (on ? 0 : 4)); gr.addColorStop(0, '#333'); gr.addColorStop(.5, '#eee'); gr.addColorStop(1, '#333'); g.fillStyle = gr; g.fillRect(x, y, 4, 4); } }, 2.2,
    (g, w, h, hc) => { g.fillStyle = base; g.fillRect(0, 0, w, h); g.globalAlpha = .18; g.drawImage(hc, 0, 0); });
}
/* porous sponge */
export function spongeTex(base = '#f2c94c') {
  return pair('sponge' + base, 128, 128, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); const r = rnd(17); for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(0,0,0,${.4 + r() * .5})`; g.beginPath(); g.ellipse(r() * w, r() * h, 1 + r() * 3.5, 1 + r() * 2.5, r() * 3, 0, 7); g.fill(); } }, 3,
    (g, w, h, hc) => { g.fillStyle = base; g.fillRect(0, 0, w, h); g.globalCompositeOperation = 'multiply'; g.globalAlpha = .6; g.drawImage(hc, 0, 0); });
}
/* file teeth: fine cross-hatch */
export function fileTex() {
  return pair('file', 128, 128, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.strokeStyle = '#000'; g.lineWidth = 1.6; for (let i = -h; i < w + h; i += 5) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h * .6, h); g.stroke(); } g.lineWidth = .8; for (let i = -h; i < w + h; i += 7) { g.beginPath(); g.moveTo(i, h); g.lineTo(i + h * .5, 0); g.stroke(); } }, 3);
}
/* printed label for cans and bottles */
export function labelTex(title, sub, bg, fg = '#fff') {
  const key = 'lbl' + title + bg; if (cache[key]) return cache[key];
  const c = cv(512, 256), g = c.getContext('2d'); g.fillStyle = bg; g.fillRect(0, 0, 512, 256);
  g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(0, 28, 512, 10); g.fillRect(0, 218, 512, 10);
  g.fillStyle = fg; g.font = '900 64px Lilita One, Impact, sans-serif'; g.textAlign = 'center'; g.fillText(title, 256, 140);
  g.font = '700 26px Nunito, sans-serif'; g.globalAlpha = .85; g.fillText(sub, 256, 186); g.globalAlpha = 1;
  for (let i = 0; i < 3; i++) { g.strokeStyle = fg; g.globalAlpha = .5; g.lineWidth = 3; g.beginPath(); g.arc(70, 128, 26 + i * 9, 0, 7); g.stroke(); g.beginPath(); g.arc(442, 128, 26 + i * 9, 0, 7); g.stroke(); } g.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return cache[key] = t;
}
/* convenience materials */
export function woodMat(base = '#9b6a3c', rough = .55) { const t = woodTex(base); return new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normalMap, normalScale: new THREE.Vector2(.6, .6), roughness: rough }); }
export function steelMat(color = '#aab3ba', rough = .25) { const t = brushedTex(); return new THREE.MeshStandardMaterial({ color, metalness: 1, roughness: rough, normalMap: t.normalMap, normalScale: new THREE.Vector2(.25, .25) }); }
export function knurlMat(color = '#23282c', metal = 0) { const t = knurlTex(); const m = new THREE.MeshStandardMaterial({ color, roughness: metal ? .35 : .85, metalness: metal, normalMap: t.normalMap, normalScale: new THREE.Vector2(1, 1) }); m.normalMap.repeat.set(4, 2); return m; }
export function gritMat(base) { const t = gritTex(base); return new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normalMap, roughness: 1 }); }
export function clothMat(base) { const t = clothTex(base); const m = new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normalMap, roughness: 1, normalScale: new THREE.Vector2(.8, .8) }); return m; }
export function spongeMat(base) { const t = spongeTex(base); return new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normalMap, roughness: 1 }); }
export function fileMat() { const t = fileTex(); return new THREE.MeshStandardMaterial({ color: '#6d757c', metalness: .85, roughness: .55, normalMap: t.normalMap, normalScale: new THREE.Vector2(1.4, 1.4) }); }
export function labelMat(title, sub, bg, fg) { return new THREE.MeshStandardMaterial({ map: labelTex(title, sub, bg, fg), roughness: .35, metalness: .3 }); }
