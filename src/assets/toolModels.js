/* Tool models. Origin = contact point, handle runs along +Y (file lies flat along +Z).
   Built from smooth lathed profiles, bevelled blocks, instanced bristle tufts and the shared PBR
   material library, at real-world proportions (1 unit ≈ 10 cm). */
import * as THREE from 'three';
import { lathe, cyl, box, rbox, sphere, torus, tube, extrude, shape, roundRectShape, mesh } from './geo.js';
import { M } from './materials.js';
import { rng } from '../core/util.js';

/* Catmull-Rom smoothing of a lathe profile [[r,y,hard?]...]; hard points stay crisp */
function smooth(pts, n = 4) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    out.push(p1);
    if (p1[2] || p2[2]) continue;
    for (let k = 1; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t, f = (a, b, c, d) => .5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([Math.max(1e-4, f(p0[0], p1[0], p2[0], p3[0])), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(pts[pts.length - 1]); return out;
}
const lat = (pts, seg = 36, n = 4) => lathe(smooth(pts, n), seg);
/* squash a lathe into an oval cross-section (hammer / file handles) */
const oval = (g, sx = 1, sz = .72) => { g.scale(sx, 1, sz); g.computeVertexNormals(); return g; };

/* bristle tufts: clusters of thin strands, slightly splayed, with per-strand colour variation */
function tufts(w, d, h, cols, rows, color, o = {}) {
  const r = rng(o.seed || 5), per = o.per || 7, rad = o.r || .006, tr = o.tuft || Math.min(w / cols, d / Math.max(1, rows)) * .42;
  const geo = new THREE.CylinderGeometry(rad * .7, rad, h, 4, 1); geo.translate(0, -h / 2, 0);
  const n = cols * rows * per, m = new THREE.InstancedMesh(geo, o.metal ? M.steel(color, .3, 0) : new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: .55, sheen: .5, sheenColor: new THREE.Color(color) }), n);
  const Mx = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), base = new THREE.Color(color), c = new THREE.Color(); let k = 0;
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const cx = (cols > 1 ? i / (cols - 1) - .5 : 0) * w, cz = (rows > 1 ? j / (rows - 1) - .5 : 0) * d;
    for (let t = 0; t < per; t++) {
      const a = r() * 6.283, rr = Math.sqrt(r()) * tr, x = cx + Math.cos(a) * rr, z = cz + Math.sin(a) * rr, sp = o.splay ?? .2;
      q.setFromEuler(e.set((z / (d || 1)) * sp + Math.sin(a) * rr * 2 + (r() - .5) * .08, 0, -(x / (w || 1)) * sp - Math.cos(a) * rr * 2 + (r() - .5) * .08));
      Mx.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(1, .88 + r() * .2, 1)); m.setMatrixAt(k, Mx);
      c.copy(base).offsetHSL(0, (r() - .5) * .05, (r() - .5) * .12); if (!o.metal) m.setColorAt(k, c); k++;
    }
  }
  m.castShadow = true; return m;
}
/* rounded rectangle slab extruded along Y (brush blocks, sanding blocks) */
function slab(w, d, h, r, mat, y = 0) { const g = extrude(roundRectShape(w, d, r), h, Math.min(.025, h * .2)); g.rotateX(Math.PI / 2); return mesh(g, mat, { p: [0, y + h / 2, 0] }); }

export function buildTool(kind, PN) {
  const add = (g, m, p = [0, 0, 0], r = [0, 0, 0], s) => { const n = mesh(g, m, { p, r, s, recv: false }); PN.add(n); return n; };
  const put = (o, p = [0, 0, 0], r = [0, 0, 0]) => { o.position.set(...p); o.rotation.set(...r); PN.add(o); return o; };
  let spin = null, stand = 0, flat = false;
  switch (kind) {
    case 'hammer': {
      /* ball-peen head: polished face, chamfers, dark forged cheeks, eye wedge; hickory handle with rubber grip */
      add(lat([[.135, 0, 1], [.17, .012], [.185, .04, 1], [.185, .07], [.165, .1, 1], [.13, .16], [.125, .38], [.13, .5], [.145, .6, 1], [.15, .66], [.125, .76], [.09, .86], [.05, .92], [0, .94]], 40), M.darkSteel(.4));
      add(cyl(.17, .17, .012, 40), M.steel('#e1e6ea', .12, .1), [0, .006, 0]);
      add(cyl(.105, .105, .1, 24), M.steel('#c9d0d5', .2), [0, .66, 0]).scale.set(1, 1, 1);
      { const h = oval(lat([[.055, 0], [.07, .06], [.064, .5], [.058, 1.05], [.064, 1.5], [.08, 1.85], [.09, 2.0], [.075, 2.06], [0, 2.08]], 28), 1, .7); add(h, M.wood('#b98a52', .45, .6), [.1, .45, 0], [0, 0, -Math.PI / 2]); }
      add(oval(lat([[.082, 0], [.098, .05], [.094, .25], [.1, .5], [.108, .62], [.1, .66]], 28), 1, .78), M.rubber('#1d2a33'), [1.36, .45, 0], [0, 0, -Math.PI / 2]);
      add(box(.02, .14, .2), M.wood('#5a3a20', .6, 0), [0, .935, 0]); add(box(.03, .02, .16), M.darkSteel(.5), [0, .945, 0], [0, Math.PI / 2, 0]);
      break;
    }
    case 'punch': {
      add(lat([[.0, 0], [.03, .005, 1], [.035, .05], [.05, .3], [.07, .45], [.075, .5, 1]], 24), M.steel('#c9d0d5', .18), [0, 0, 0]);
      add(cyl(.11, .11, 1.0, 32), M.knurl('#9aa3aa', 1), [0, 1, 0]); add(cyl(.1, .11, .08, 32), M.steel('#b8c0c6', .2), [0, .46, 0]);
      add(lat([[.11, 0], [.115, .04], [.1, .09], [.06, .11], [0, .12]], 32), M.darkSteel(.35), [0, 1.5, 0]); break;
    }
    case 'wire': case 'soft': {
      /* wooden block brush with a curved handle; steel wire or natural bristle tufts */
      const soft = kind === 'soft';
      const blk = slab(1.05, .36, .16, .17, M.wood(soft ? '#c49058' : '#a8743e', .45, .5), .2); PN.add(blk);
      add(rbox(1.0, .04, .3, .015), M.wood(soft ? '#b07a44' : '#8f5f30', .6, 0), [0, .2, 0]);
      const b = soft ? tufts(.92, .24, .21, 13, 4, '#efe3c6', { r: .007, per: 9, splay: .18 }) : tufts(.92, .24, .2, 15, 4, '#c3c9ce', { r: .0035, per: 9, metal: true, splay: .35 }); b.position.y = .2; PN.add(b);
      { const c = new THREE.CatmullRomCurve3([new THREE.Vector3(-.3, .36, 0), new THREE.Vector3(-.15, .6, 0), new THREE.Vector3(.1, .85, 0), new THREE.Vector3(.35, 1.25, 0), new THREE.Vector3(.45, 1.55, 0)]);
        const g = new THREE.TubeGeometry(c, 40, .065, 16, false); add(g, M.wood(soft ? '#b98450' : '#9a6a38', .45, .5)); add(sphere(.066, 16, 10), M.wood(soft ? '#b98450' : '#9a6a38', .45, .5), [.45, 1.55, 0]); }
      add(cyl(.02, .02, .03, 12), M.brass(), [.42, 1.48, 0], [0, 0, Math.PI / 2 - .5]);
      flat = true; break;
    }
    case 'soap': {
      /* plastic scrub brush: nylon bristles, two-tone body, rubber thumb rest */
      const b = tufts(.82, .3, .2, 12, 4, '#f4f0e6', { r: .006, per: 8, splay: .15 }); b.position.y = .2; PN.add(b);
      PN.add(slab(.95, .42, .12, .19, M.plastic('#2f9aa0', .35), .2));
      add(rbox(.7, .05, .28, .02), M.rubber('#c9dcdc', .7), [0, .345, 0]);
      add(lat([[.06, 0], [.075, .1], [.066, .5], [.082, .9], [.075, 1.02], [0, 1.06]], 28), M.plastic('#2f9aa0', .35), [.15, .32, 0], [0, 0, -.5]);
      flat = true; break;
    }
    case 'detail': {
      /* artist / detail brush: pointed tuft, crimped nickel ferrule, lacquered handle */
      const b = tufts(.06, .06, .22, 3, 3, '#2a2420', { r: .004, per: 9, splay: .55, tuft: .02 }); b.position.y = .24; PN.add(b);
      add(lat([[.032, 0], [.04, .04], [.042, .16], [.046, .2, 1], [.05, .22], [.05, .28], [.045, .3, 1]], 28), M.steel('#d5dadd', .15), [0, .22, 0]);
      for (let i = 0; i < 2; i++) add(torus(.046, .004, 6, 28), M.steel('#aab2b8', .3), [0, .3 + i * .06, 0], [Math.PI / 2, 0, 0]);
      add(lat([[.046, 0], [.055, .1], [.06, .5], [.05, 1.05], [.03, 1.2], [0, 1.22]], 28), M.paint('#c43a2a', .25), [0, .5, 0]); break;
    }
    case 'pick': {
      /* dental-style pick: hooked tip, stainless taper, knurled handle */
      add(tube([[0, 0, 0], [.04, .03, 0], [.06, .1, 0], [.05, .2, 0], [.02, .34, 0], [0, .5, 0]], .012, 40, 10), M.steel('#dfe4e7', .12, .1));
      add(lat([[.012, 0], [.02, .1], [.035, .35], [.05, .45, 1]], 24), M.steel('#d3d9dd', .15), [0, .48, 0]);
      add(cyl(.065, .065, .9, 32), M.knurl('#a8b0b6', 1), [0, 1.38, 0]);
      add(lat([[.05, 0], [.065, .03], [.065, .07], [.05, .1, 1]], 28), M.steel('#c9d0d5', .18), [0, .9, 0]);
      add(lat([[.065, 0], [.065, .04], [.05, .08], [0, .1]], 28), M.steel('#c9d0d5', .18), [0, 1.83, 0]); break;
    }
    case 'sand': {
      /* rubber sanding block wrapped in sandpaper (grit face, paper folded over the ends) */
      add(rbox(.92, .025, .62, .008), M.grit('#b98f5a'), [0, .012, 0]);
      for (const s of [-1, 1]) add(rbox(.025, .2, .62, .008), M.grit('#b98f5a'), [s * .47, .1, 0]);
      add(rbox(.9, .2, .6, .05), M.rubber('#2a3138', .7), [0, .12, 0]);
      { const g = extrude(shape([[-.42, 0], [.42, 0], [.36, .12], [.18, .22], [-.18, .22], [-.36, .12]]), .44, .04); add(g, M.rubber('#2f9aa0', .55), [0, .2, 0]); }
      for (let i = -3; i <= 3; i++) add(box(.02, .03, .4), M.rubber('#1f272d', .9), [i * .08, .43, 0]);
      flat = true; break;
    }
    case 'grind': case 'buff': {
      /* rotary tool: vented body, rubber grip, collet nut, mandrel + cut-off disc or felt/cotton buff */
      const buff = kind === 'buff', col = buff ? '#2b6fb3' : '#e5632b';
      if (buff) { spin = add(cyl(.42, .42, .16, 48), M.cloth('#e3dccb'), [0, .1, 0]); for (let i = 1; i <= 4; i++) add(torus(.1 * i, .006, 6, 48), M.cloth('#cfc6b0'), [0, .181, 0], [Math.PI / 2, 0, 0]); add(cyl(.07, .07, .2, 16), M.steel('#c3cacf', .2), [0, .12, 0]); }
      else { spin = add(cyl(.38, .38, .02, 64), M.grit('#5d6b76'), [0, .02, 0]); add(lat([[.08, 0], [.1, .01], [.1, .03], [.06, .04]], 24), M.steel('#d5dade', .18), [0, .03, 0]); add(torus(.38, .006, 6, 64), M.steel('#8a949b', .4), [0, .02, 0], [Math.PI / 2, 0, 0]); }
      add(cyl(.012, .012, .35, 10), M.steel('#d7dde1', .15), [0, .3, 0]);
      add(lat([[.03, 0], [.05, .02], [.06, .1], [.07, .12, 1]], 6), M.brass(.25), [0, .45, 0]);
      add(lat([[.07, 0], [.12, .06], [.16, .22], [.17, .3]], 36), M.plastic('#24292d', .45), [0, .57, 0]);
      add(lat([[.17, 0], [.175, .2], [.17, .75], [.155, .95], [.16, 1.05]], 40), M.plastic(col, .32), [0, .87, 0]);
      add(cyl(.178, .178, .42, 40), M.rubber('#1f2428'), [0, 1.32, 0]);
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; add(rbox(.02, .2, .07, .008), M.plastic('#121518', .6), [Math.cos(a) * .17, 1.82, Math.sin(a) * .17], [0, -a, 0]); }
      add(cyl(.12, .14, .08, 32), M.plastic('#2c3237', .45), [0, 2.0, 0]); add(rbox(.05, .08, .12, .02), M.plastic('#d9dde0', .4), [.16, 1.15, 0]);
      add(tube([[0, 2.03, 0], [0, 2.25, 0], [.1, 2.45, 0], [.35, 2.55, 0]], .03, 24, 8), M.rubber('#16191c'));
      flat = true; break;
    }
    case 'file': {
      /* flat bastard file lying on the surface; handle along +Z */
      PN.rotation.x = -Math.PI / 2;
      { const g = extrude(shape([[-.15, 0], [.15, 0], [.16, 1.1], [.12, 1.35], [-.12, 1.35], [-.16, 1.1]]), .05, .006); g.rotateX(Math.PI / 2); add(g, M.file(), [0, .03, -.05]); }
      add(box(.1, .03, .3), M.darkSteel(.5), [0, .035, 1.42]);
      add(lat([[.08, 0], [.085, .08, 1]], 32), M.brass(.3), [0, .07, 1.55], [Math.PI / 2, 0, 0]);
      add(oval(lat([[.07, 0], [.09, .1], [.105, .45], [.095, .8], [.06, .92], [0, .95]], 32), 1, .8), M.wood('#9b6a3c', .45, .5), [0, .07, 1.63], [Math.PI / 2, 0, 0]);
      break;
    }
    case 'cloth': case 'micro': {
      /* folded cloth: a soft pad with a draped corner */
      const c1 = kind === 'cloth' ? '#d8cdb4' : '#4fb0c6', c2 = kind === 'cloth' ? '#c9bc9f' : '#3e9bb1';
      { const g = new THREE.PlaneGeometry(1.1, 1.0, 24, 24), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), w = Math.sin(x * 9 + y * 3) * .015 + Math.sin(y * 13) * .01; p.setZ(i, w + Math.max(0, x + y - .6) ** 2 * .6); } g.computeVertexNormals(); const m = add(g, M.cloth(c1), [0, .03, 0], [-Math.PI / 2, 0, 0]); m.material = M.cloth(c1); m.material.side = THREE.DoubleSide; }
      add(rbox(.9, .14, .78, .07, 4), M.cloth(c1), [0, .1, 0]); add(rbox(.82, .12, .7, .06, 4), M.cloth(c2), [.03, .22, .02], [0, .15, .03]);
      add(torus(.18, .05, 10, 24, Math.PI * 1.3), M.cloth(c1), [.12, .3, .05], [1.3, .3, 0]);
      flat = true; break;
    }
    case 'sponge': case 'pad': {
      /* kitchen sponge with scouring layer / non-woven pad on a foam block */
      const sp = kind === 'sponge';
      add(rbox(.95, .32, .62, .1, 4), M.sponge(sp ? '#e8bd42' : '#f0ece0'), [0, .16, 0]);
      add(rbox(.95, .09, .62, .03, 3), M.grit(sp ? '#2f8a4a' : '#7a2f2a'), [0, .36, 0]);
      flat = true; break;
    }
    case 'stain': case 'finish': {
      /* flat paintbrush: chisel-cut bristles, crimped ferrule with rivets, beavertail handle with hang hole */
      { const b = tufts(.22, .06, .34, 7, 2, kind === 'finish' ? '#e8d9b5' : '#3b2010', { r: .006, per: 10, splay: .12 }); b.position.y = .34; PN.add(b); }
      add(rbox(.26, .32, .09, .03), M.steel('#c6cdd2', .2), [0, .46, 0]);
      for (let i = 0; i < 2; i++) add(box(.27, .012, .095), M.steel('#9aa2a8', .3), [0, .38 + i * .14, 0]);
      for (const s of [-1, 1]) add(cyl(.012, .012, .1, 10), M.brass(), [s * .07, .46, 0], [Math.PI / 2, 0, 0]);
      { const g = extrude(shape([[-.12, 0], [.12, 0], [.1, .3], [.07, .6], [.09, .95], [.06, 1.05], [-.06, 1.05], [-.09, .95], [-.07, .6], [-.1, .3]], [[[0, .85], [.03, .88], [0, .91], [-.03, .88]]]), .07, .02); add(g, M.wood(kind === 'finish' ? '#c99a5c' : '#6b4426', .4, .7), [0, .62, 0]); }
      break;
    }
    case 'spray': case 'paint': case 'oil': {
      if (kind === 'oil') {
        /* pump oil can: domed body, thumb pump, long brass spout */
        PN.rotation.x = Math.PI; PN.position.y = 1.9;
        add(lat([[.0, 0], [.3, 0, 1], [.32, .03], [.32, .3], [.26, .48], [.12, .6], [.08, .64]], 40), M.paint('#3e7d3a', .35), [0, .35, 0]);
        add(cyl(.322, .322, .2, 40), M.label('LUBE', 'machine oil', '#f2d24a', '#244d22'), [0, .52, 0]);
        add(lat([[.06, 0], [.04, .3], [.02, .9], [.012, 1.1], [.008, 1.15, 1]], 20), M.brass(.25), [0, .97, 0]);
        add(cyl(.05, .05, .08, 16), M.darkSteel(.4), [.18, .9, 0]); add(rbox(.12, .03, .08, .01), M.darkSteel(.4), [.22, .95, 0]);
        stand = .5; break;
      }
      /* aerosol can: rolled seams, domed shoulder, valve cup, actuator with nozzle, printed label */
      PN.rotation.x = Math.PI; PN.position.y = 1.9;
      const col = kind === 'spray' ? '#2f7fb0' : '#d8402b';
      add(lat([[.0, .0], [.2, 0, 1], [.235, .02], [.25, .06, 1], [.25, .9], [.245, .95, 1], [.22, 1.04], [.15, 1.12], [.1, 1.15, 1], [.1, 1.17]], 48), M.paint(col, .25), [0, .35, 0]);
      add(cyl(.252, .252, .52, 48, true), M.label(kind === 'spray' ? 'PEN-OIL' : 'GenZ', kind === 'spray' ? 'penetrating' : 'spray paint', kind === 'spray' ? '#f3efe4' : '#1d2328', kind === 'spray' ? '#1d5478' : '#2fb5bf'), [0, .72, 0]);
      add(torus(.245, .012, 8, 48), M.steel('#c9d0d5', .2), [0, .41, 0], [Math.PI / 2, 0, 0]); add(torus(.1, .014, 8, 32), M.steel('#d5dade', .15), [0, 1.52, 0], [Math.PI / 2, 0, 0]);
      add(lat([[.0, 0], [.08, 0], [.085, .08], [.07, .12], [.0, .13]], 28), M.steel('#d5dade', .15), [0, 1.5, 0]);
      add(lat([[.0, 0], [.075, 0], [.075, .12], [.06, .16], [0, .17]], 32), M.plastic('#f2f2f2', .3), [0, 1.62, 0]);
      add(cyl(.018, .018, .03, 12), M.plastic('#1e2428', .5), [.075, 1.73, 0], [0, 0, Math.PI / 2]);
      stand = 1.05; break;
    }
    case 'water': {
      /* trigger spray bottle */
      PN.rotation.x = Math.PI; PN.position.y = 1.85;
      add(lat([[0, 0], [.22, 0, 1], [.24, .03], [.24, .7], [.2, .85], [.1, .95], [.1, 1.0, 1]], 40), M.glassy('#cfe6f0', .3), [0, .2, 0]);
      add(lat([[0, 0], [.21, 0], [.21, .55], [.17, .65], [0, .66]], 32), new THREE.MeshPhysicalMaterial({ color: '#3f93c9', roughness: .05, transmission: .6, thickness: .5, transparent: true, opacity: .85 }), [0, .23, 0]);
      add(cyl(.12, .12, .14, 28), M.plastic('#1d2328', .5), [0, 1.27, 0]);
      add(rbox(.16, .32, .5, .06), M.plastic('#e5c34a', .35), [0, 1.48, .12]); add(rbox(.1, .3, .08, .03), M.plastic('#e5c34a', .35), [0, 1.25, .3], [.2, 0, 0]);
      add(cyl(.03, .04, .12, 12), M.plastic('#1d2328', .5), [0, 1.62, .4], [Math.PI / 2, 0, 0]);
      stand = .9; break;
    }
    case 'screw': {
      /* screwdriver: chrome-vanadium shaft with phillips tip, translucent fluted handle with rubber zones */
      spin = new THREE.Group(); PN.add(spin);
      { const g = lat([[0, 0], [.012, .005, 1], [.024, .03], [.03, .06, 1], [.03, 1.0]], 20); spin.add(mesh(g, M.chrome(), { recv: false })); for (let i = 0; i < 4; i++) spin.add(mesh(box(.006, .05, .07), M.darkSteel(.4), { p: [0, .03, 0], r: [0, i * Math.PI / 4, 0] })); }
      const hd = new THREE.Group(); hd.position.y = .98; spin.add(hd);
      hd.add(mesh(lat([[.06, 0], [.11, .05], [.15, .18], [.17, .42], [.165, .7], [.14, .85], [.08, .9], [0, .91]], 40), M.acetate('#e8a62e'), { recv: false }));
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; hd.add(mesh(rbox(.05, .5, .04, .018), M.rubber('#1f2a33', .7), { p: [Math.sin(a) * .166, .43, Math.cos(a) * .166], r: [0, a, 0], recv: false })); }
      hd.add(mesh(cyl(.03, .03, .2, 12), M.chrome(), { p: [0, .1, 0], recv: false }));
      break;
    }
    case 'pry': {
      /* nylon spudger / pry tool with a thin angled blade */
      { const g = extrude(shape([[-.06, 0], [.06, 0], [.08, .1], [.09, 1.2], [.07, 1.4], [-.07, 1.4], [-.09, 1.2], [-.08, .1]]), .05, .015); add(g, M.plastic('#2f6f78', .45), [0, .02, 0], [.12, 0, 0]); }
      add(rbox(.2, .05, .02, .01), M.steel('#c3cacf', .2), [0, .01, 0], [.3, 0, 0]);
      for (let i = 0; i < 6; i++) add(box(.16, .012, .055), M.plastic('#245a62', .6), [0, .75 + i * .08, .02], [.12, 0, 0]);
      break;
    }
    case 'tweez': {
      /* stainless tweezers: two tapered leaves welded at the top */
      for (const s of [-1, 1]) { const g = extrude(shape([[-.008, 0], [.012, 0], [.05, .5], [.06, 1.2], [.04, 1.3], [.0, 1.3], [-.01, .5]]), .02, .004); const m = add(g, M.steel('#d7dce0', .15, .1), [s * .02, 0, 0], [0, s > 0 ? 0 : Math.PI, 0]); m.rotation.z = -s * .05; }
      add(rbox(.12, .1, .04, .02), M.steel('#c3cacf', .2), [0, 1.27, 0]);
      for (let i = 0; i < 5; i++) for (const s of [-1, 1]) add(box(.03, .015, .025), M.steel('#9aa2a8', .35), [s * .065, .6 + i * .07, 0]);
      break;
    }
    case 'puller': {
      /* wire keycap puller: two bent steel loops into a red handle */
      for (const s of [-1, 1]) add(tube([[s * .22, 0, 0], [s * .24, .05, 0], [s * .22, .4, 0], [s * .12, .8, 0], [s * .04, 1.0, 0]], .018, 32, 8), M.steel('#c9d0d5', .2));
      add(tube([[-.22, 0, -.02], [-.22, -.02, .04], [.22, -.02, .04], [.22, 0, -.02]], .015, 24, 8), M.steel('#c9d0d5', .2));
      add(lat([[.06, 0], [.09, .08], [.1, .4], [.085, .75], [.05, .82], [0, .84]], 32), M.plastic('#c43a2a', .35), [0, .98, 0]);
      break;
    }
    case 'pliers': {
      /* needle-nose pliers: tapered jaws, pivot rivet, dipped handles */
      for (const s of [-1, 1]) { const g = extrude(shape([[0, 0], [.03, 0], [.07, .35], [.08, .5], [0, .55]]), .06, .01); add(g, M.steel('#b1b9bf', .25), [s * .002, 0, 0], [0, s > 0 ? 0 : Math.PI, 0]); }
      add(cyl(.09, .09, .14, 28), M.steel('#c3cacf', .2), [0, .58, 0], [Math.PI / 2, 0, 0]); add(cyl(.03, .03, .16, 16), M.darkSteel(.35), [0, .58, 0], [Math.PI / 2, 0, 0]);
      for (const s of [-1, 1]) { const c = new THREE.CatmullRomCurve3([new THREE.Vector3(s * .05, .65, 0), new THREE.Vector3(s * .14, 1.0, 0), new THREE.Vector3(s * .2, 1.4, 0), new THREE.Vector3(s * .22, 1.75, 0)]); add(new THREE.TubeGeometry(c, 30, .055, 14, false), M.rubber('#c43a2a', .55)); add(sphere(.055, 14, 10), M.rubber('#c43a2a', .55), [s * .22, 1.75, 0]); }
      break;
    }
    case 'sandgun': {
      /* sandblasting gun: carbide nozzle, cast body, trigger, hopper hose */
      add(lat([[.02, 0], [.035, .02, 1], [.045, .25], [.06, .3, 1]], 24), M.darkSteel(.3), [0, 0, 0]);
      add(lat([[.06, 0], [.09, .03], [.09, .1, 1]], 6), M.brass(.3), [0, .3, 0]);
      add(lat([[.09, 0], [.13, .06], [.14, .34], [.12, .42]], 32), M.paint('#f0b429', .35), [0, .4, 0]);
      add(rbox(.3, .5, .55, .1), M.paint('#f0b429', .35), [0, .98, .22]);
      add(rbox(.24, .6, .2, .08), M.rubber('#1d2328', .7), [0, .82, .62], [-.3, 0, 0]);
      add(rbox(.06, .22, .08, .03), M.steel('#c3cacf', .25), [0, .72, .36], [-.2, 0, 0]);
      add(tube([[0, 1.15, .55], [0, 1.2, .9], [.15, .95, 1.35], [.45, .5, 1.6]], .05, 32, 10), M.rubber('#16191c', .6));
      stand = .85; break;
    }
    case 'shiner': case 'compound': {
      /* polish tin with a folded applicator cloth */
      add(lat([[0, 0], [.32, 0, 1], [.33, .02], [.33, .2], [.32, .22, 1]], 48), M.steel(kind === 'compound' ? '#2e8c6a' : '#e0a12a', .3), [0, .02, .35]);
      add(cyl(.335, .335, .14, 48, true), M.label(kind === 'compound' ? 'CLEAN' : 'SHINE', kind === 'compound' ? 'compound' : 'metal polish', kind === 'compound' ? '#2e8c6a' : '#1d2328', kind === 'compound' ? '#f3efe4' : '#f0c46a'), [0, .13, .35]);
      add(cyl(.3, .3, .02, 40), new THREE.MeshPhysicalMaterial({ color: kind === 'compound' ? '#e8e4d8' : '#c9b48a', roughness: .5 }), [0, .23, .35]);
      add(rbox(.62, .18, .5, .14, 4), M.cloth('#d8d0b8'), [0, .1, -.1]);
      flat = true; break;
    }
    case 'vacuum': {
      /* handheld vacuum with crevice nozzle and ribbed hose */
      add(lat([[.06, 0, 1], [.1, .02], [.1, .5], [.12, .8], [.13, 1.0, 1]], 28), M.plastic('#2b2f33', .45), [0, 0, 0]).scale.set(1, 1, .55);
      add(lat([[.13, 0], [.22, .12], [.24, .5], [.22, .85], [.12, 1.0], [0, 1.02]], 40), M.plastic('#c43a2a', .32), [0, 1.0, 0]);
      add(cyl(.245, .245, .22, 40), M.glassy('#d5e3e8', .4), [0, 1.35, 0]);
      { const pts = [[0, 1.9, 0], [0, 2.3, .2], [.1, 2.6, .8], [.2, 2.5, 1.5]]; add(tube(pts, .07, 48, 12), M.rubber('#16191c', .6)); const c = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))); for (let i = 0; i < 14; i++) { const t = i / 13, p = c.getPoint(t), tg = c.getTangent(t); const tr = add(torus(.074, .012, 6, 20), M.rubber('#2a2f33', .6)); tr.position.copy(p); tr.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tg); } }
      stand = .12; break;
    }
    case 'blower': {
      /* photographer's rubber air blower: bulb + nozzle with a one-way valve */
      add(lat([[.0, 0], [.025, .0, 1], [.03, .25], [.04, .5], [.06, .6, 1]], 24), M.plastic('#1d2328', .4), [0, 0, 0]);
      add(lat([[.06, 0], [.12, .05], [.24, .25], [.3, .55], [.28, .8], [.18, 1.0], [.08, 1.07], [0, 1.08]], 40), M.rubber('#c43a2a', .5), [0, .58, 0]);
      add(torus(.075, .02, 8, 24), M.rubber('#8f2a20', .5), [0, .62, 0], [Math.PI / 2, 0, 0]);
      add(cyl(.05, .05, .08, 16), M.plastic('#1d2328', .4), [0, 1.68, 0]);
      stand = .45; break;
    }
    case 'filler': {
      /* repair syringe: clear barrel with filler, plunger, finger flange */
      add(lat([[.0, 0], [.012, 0, 1], [.02, .2], [.05, .32, 1]], 20), M.plastic('#e9e4d6', .3), [0, 0, 0]);
      add(cyl(.13, .13, 1.0, 36, true), M.glassy('#eef3f4', .25), [0, .82, 0]);
      add(cyl(.115, .115, .72, 32), new THREE.MeshPhysicalMaterial({ color: '#d9b98c', roughness: .6 }), [0, .68, 0]);
      add(rbox(.5, .04, .18, .02), M.plastic('#2c3237', .4), [0, 1.33, 0]);
      add(cyl(.022, .022, .5, 12), M.plastic('#e9e4d6', .3), [0, 1.6, 0]); add(cyl(.11, .11, .04, 28), M.plastic('#2c3237', .4), [0, 1.86, 0]);
      add(cyl(.11, .11, .04, 28), M.rubber('#16191c', .7), [0, 1.08, 0]);
      break;
    }
    case 'heat': {
      /* heat gun: metal nozzle with vents, pistol body, rubber grip */
      add(lat([[.06, 0, 1], [.08, .02], [.09, .45, 1], [.1, .5]], 32), M.darkSteel(.35), [0, 0, 0]);
      for (let i = 0; i < 8; i++) add(torus(.092, .006, 6, 28), M.steel('#5c646b', .4), [0, .1 + i * .045, 0], [Math.PI / 2, 0, 0]);
      add(lat([[.1, 0], [.17, .1], [.18, .65], [.15, .8], [0, .82]], 36), M.plastic('#d4442c', .35), [0, .5, 0]);
      add(rbox(.14, .6, .22, .07), M.rubber('#1d2328', .7), [0, .85, .3], [-.5, 0, 0]);
      stand = .3; break;
    }
    case 'press': {
      /* hand press / straightening tool: rubber pad, threaded spindle, T-handle */
      add(cyl(.2, .2, .08, 36), M.rubber('#2a3036', .8), [0, .04, 0]); add(cyl(.18, .2, .08, 36), M.darkSteel(.4), [0, .12, 0]);
      add(cyl(.045, .045, .7, 20), M.steel('#c3cacf', .2), [0, .5, 0]);
      for (let i = 0; i < 14; i++) add(torus(.046, .006, 6, 20), M.steel('#9aa2a8', .3), [0, .2 + i * .045, 0], [Math.PI / 2, 0, 0]);
      add(cyl(.05, .05, .7, 20), M.steel('#c3cacf', .2), [0, .9, 0], [0, 0, Math.PI / 2]);
      for (const s of [-1, 1]) add(lat([[.06, 0], [.07, .05], [.07, .2], [.05, .24], [0, .25]], 24), M.plastic('#2f6f78', .4), [s * .35, .9, 0], [0, 0, -s * Math.PI / 2]);
      flat = true; break;
    }
    case 'crown': case 'magnify': default: break;
  }
  return { spin, stand, flat };
}
