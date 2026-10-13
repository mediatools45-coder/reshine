/* Level 10 - Antique Pistol Restoration: extreme corrosion recovery and cosmetic reconstruction of a display piece.
   Cosmetic only: no functional repair of firing mechanisms. Barrel along +X, side plate faces +Z. */
import * as THREE from 'three';
import { lathe, cyl, box, rbox, torus, mesh, mat, metal, extrude, shape, tube, lump, sphere } from '../assets/geo.js';
import { paint, pick, hold, trace, bath, snap, taps, compare, stage, chunksOn, centered, I, lp } from '../game/systems/index.js';
import { G, camImpulse } from '../game/game.js';
import { sfx } from '../fx/audio.js';
import { sparks, glints, puff } from '../fx/particles.js';
import { smooth, later, tween, rnd } from '../core/util.js';

function barrelGeom() { const g = new THREE.CylinderGeometry(.2, .26, 4.6, 8, 40, false); g.rotateZ(-Math.PI / 2); g.translate(2.3, 0, 0); g.userData.base = g.attributes.position.array.slice(); return g; }
function bend(g, k) { const b = g.userData.base, P = g.attributes.position.array; for (let i = 0; i < P.length; i += 3) { const x = b[i], t = smooth(2.2, 4.6, x); P[i] = x; P[i + 1] = b[i + 1] - k * .45 * t * t; P[i + 2] = b[i + 2] + k * .12 * t; } g.attributes.position.needsUpdate = true; g.computeVertexNormals(); }
const stockShape = () => shape([[-.3, .28], [.9, .3], [1.2, .22], [1.1, -.25], [.3, -.3], [-.4, -.4], [-1.1, -1.0], [-1.7, -1.9], [-2.0, -2.25], [-2.45, -2.1], [-2.4, -1.6], [-1.9, -.9], [-1.3, -.15], [-.8, .2]]);
const cracks = [[[-1.2, -.6, .27], [-1.45, -.95, .27], [-1.55, -1.3, .27], [-1.8, -1.6, .27]], [[.2, -.05, .27], [.55, -.12, .27], [.85, -.08, .27]]];

export default {
  id: 'pistol', num: 10, name: 'Antique Pistol', complexity: 'High', minutes: '6-8 min', seed: 101,
  blurb: 'Corroded display piece', intro: 'A flintlock-style display piece dug out of a riverbank: crusted in rust, its barrel bent, its stock cracked and its fittings missing. Bring it back as a museum-grade display restoration.',
  outro: 'A nearly unrecognisable lump of corrosion is now a museum display piece.',
  pose: [-.15, .1], turnAxis: 'y', portraitRoll: .55, toolScale: .9,
  build(it) {
    const look = { kind: 'metal', base: '#4c4a47', baseR: .65, sand: '#b4b8bc', pol: '#e6eaee', polR: .05, fin: '#1d2430', finR: .12, finM: .85, finCC: .6, dirt: '#4a3524', crust: '#5a2a12', cell: [192, 64] };
    const sb = it.surface('barrel', look), barrel = it.part('barrel', { p: [.95, .05, 0] }); it.extra.bg = barrelGeom(); barrel.add(it.extra.bg, sb); bend(it.extra.bg, 1);
    barrel.add(cyl(.32, .32, .3, 8), sb, { p: [.1, 0, 0], r: [0, 0, Math.PI / 2] }); barrel.add(box(.08, .12, .06), sb, { p: [4.45, .26, 0] });
    const sw = it.surface('stock', { kind: 'wood', base: '#5a3e28', baseR: .85, sand: '#b9895a', fin: '#5a2410', finR: .22, finCC: .9, grain: [1, -.6, 0], grainS: 2.2, dirt: '#2a1e14', crust: '#4a2a14', cell: [176, 176] });
    const stock = it.part('stock'); stock.add(extrude(stockShape(), .52, .1, 16), sw); stock.add(box(3.6, .22, .44), sw, { p: [2.6, -.2, 0] });
    const sl = it.surface('lock', { ...look, cell: [96, 96] }), lock = it.part('lock', { p: [.35, -.05, .3] }); lock.add(extrude(shape([[-.9, .25], [.7, .3], [.95, .1], [.8, -.25], [-.6, -.3], [-1, -.1]]), .06, .02, 8), sl);
    const sc = it.surface('cock', { ...look, cell: [64, 64] }), cock = it.part('cock', { p: [-.45, .25, .36] }); cock.add(extrude(shape([[-.1, -.1], [.1, -.05], [.2, .35], [.35, .55], [.15, .65], [0, .45], [-.25, .3]]), .08, .02, 8), sc); cock.add(rbox(.2, .14, .12, .03, 2), mat('#2a2622', { roughness: .9 }), { p: [.25, .55, 0], nohit: true }); cock.hit(.35, [.1, .35, 0]);
    const fz = it.part('frizzen', { p: [.35, .32, .36] }); fz.add(rbox(.12, .55, .16, .03, 2), sl, { p: [0, .2, 0], r: [0, 0, -.25] }); fz.add(rbox(.35, .08, .18, .03, 2), sl, { p: [.08, -.02, 0] }); fz.hit(.3, [0, .2, 0]);
    const brassLook = { kind: 'metal', base: '#5a4a2a', baseR: .6, sand: '#c9a45c', pol: '#f2c86e', polR: .06, dirt: '#3a2a18', crust: '#2f5a3a', rust1: '#2a4a32', rust2: '#5a8a5a', fin: '#d4a64a', finR: .1, finM: 1, cell: [96, 96] };
    const sg = it.surface('guard', brassLook), guard = it.part('guard'); guard.add(tube([[.9, -.3, 0], [.6, -.75, 0], [.0, -.8, 0], [-.45, -.5, 0], [-.6, -.3, 0]], .05, 30, 8), sg); guard.add(box(.06, .35, .06), mat('#3a3632', { roughness: .5, metalness: .7 }), { p: [.1, -.35, 0], r: [0, 0, .3] }); guard.nofit = false;
    const cap = it.part('buttcap', { p: [-2.25, -2.2, 0], r: [0, 0, -.55] }); cap.add(rbox(.62, .22, .58, .08, 3), metal('#d4a64a', .25)); cap.g.visible = false; cap.state = 'hidden';
    const rod = it.part('ramrod', { p: [2.6, -.42, 0] }); rod.add(cyl(.05, .05, 3.6, 10), metal('#c9cdd0', .25), { r: [0, 0, Math.PI / 2] }); rod.add(cyl(.08, .08, .14, 12), metal('#d4a64a', .25), { p: [1.8, 0, 0], r: [0, 0, Math.PI / 2] }); rod.g.visible = false; rod.state = 'hidden';
    for (let i = 0; i < 2; i++) { const s = it.part('pin' + i, { p: [-.35 + i * .9, -.05, .37] }); s.add(cyl(.06, .06, .05, 14), metal('#d0d4d6', .25), { r: [Math.PI / 2, 0, 0] }); s.g.visible = false; s.state = 'hidden'; }
    const dm = mat('#3a2614', { roughness: 1 }); it.extra.debris = [[-.2, .1], [.6, -.15], [-.75, -.1], [.2, .22]].map(([x, y], i) => { const m = mesh(lump(.08, i + 30, 1.3, .8, .8), dm); m.position.set(x, y, .1); lock.g.add(m); m.userData.part = lock; return { m, surf: sl, p: m.position.clone(), n: new THREE.Vector3(0, 0, 1), size: .16 }; });
  },
  after(it) {
    const P = it.parts;
    for (const k of ['barrel', 'lock', 'cock', 'frizzen']) { const s = P[k].surf; if (!s) continue; s.author('rust', (p, n, N) => smooth(.1, .4, N(1.4) * .8 + N(4) * .3) * .98); s.author('crust', (p, n, N) => smooth(.45, .65, N(1.1) + N(5) * .2)); s.author('dirt', () => .5); }
    P.stock.surf.author('dirt', (p, n, N) => .5 + .45 * smooth(.3, .7, N(2))); P.stock.surf.author('crust', (p, n, N) => .4 * smooth(.45, .7, N(2.5)));
    P.guard.surf.author('rust', (p, n, N) => smooth(.25, .55, N(3) + .1)); P.guard.surf.author('dirt', () => .4);
    it.extra.chunks = chunksOn(it, 'barrel', 9, { size: .2, filter: (p, n) => n.z > .3 && p.x > .4 }).concat(chunksOn(it, 'lock', 4, { size: .17, filter: (p, n) => n.z > .5 }));
  },
  layouts: {},
  steps(it) {
    const P = () => I().parts, metals = ['barrel', 'lock', 'cock', 'frizzen', 'guard'];
    const beads = () => { const s = G.steps.find(x => x.id === 'cracks'); return s && s.paths ? s.paths.map(p => p.bead) : []; };
    return [
      pick({ id: 'pick', name: 'Pick Off Heavy Corrosion', tool: 'pick', hint: 'Scratch each crust of rust until it breaks away.', done: 'Crust broken', cam: { preset: 'full' }, canTurn: true, items: () => it.extra.chunks, chip: 'Crust', layer: 'crust' }),
      paint({ id: 'brush', name: 'Wire-Brush the Loose Rust', tool: 'wire', hint: 'Scrub the orange rust off every metal part.', done: 'Loose rust gone', cam: { preset: 'full' }, parts: metals, layer: 'rust', amt: .5, rad: .35, fx: 'rust', snd: 'wire', sndGap: 55, req: .8, also: [{ layer: 'crust', amt: .5 }] }),
      bath({ id: 'tank', kind: 'tank', name: 'Deep Cleaning Treatment', hint: 'Lower the piece into the tank, then hold the button.', done: 'Corrosion converted', liquid: '#2f7f86', murk: '#3a2a1a', time: 3.4,
        onProg(k) { for (const m of metals) P()[m].surf.u.uResG.value = k; }, onDone() { for (const m of metals) { const s = P()[m].surf; s.u.uResG.value = 0; s.setLayer('residue', .9); s.setLayer('rust', 0); s.setLayer('crust', 0); s.setLayer('dirt', 0); } P().stock.surf.setLayer('dirt', .2); } }),
      paint({ id: 'compound', name: 'Apply Cleaning Compound', tool: 'compound', hint: 'Spread the compound over the metal.', done: 'Compound on', cam: { preset: 'full' },
        enter() { for (const m of metals) P()[m].surf.u.uCrustC.value.set('#e2dccb'); }, parts: metals, layer: 'crust', mode: 'add', amt: .55, rad: .4, fx: 'compound', snd: 'soap', req: .85 }),
      paint({ id: 'residue', name: 'Brush Off the Residue', tool: 'soft', hint: 'Brush the compound and the black residue away.', done: 'Bare metal', cam: { preset: 'full' }, parts: metals, layer: 'crust', amt: .55, rad: .4, fx: 'dust', snd: 'brush', req: .8, need: .3, also: [{ layer: 'residue', amt: .7, finish: 0 }],
        exit() { for (const m of metals) P()[m].surf.u.uCrustC.value.set('#5a2a12'); } }),
      pick({ id: 'debris', name: 'Extract Loose Debris', tool: 'tweez', grab: true, hint: 'Tap each loose piece to pluck it out.', done: 'Debris out', cam: { preset: 'work', focus: [.35, 0, .3], r: 1.8 }, items: () => it.extra.debris, chip: 'Debris', layer: 'dirt' }),
      hold({ id: 'straighten', name: 'Straighten the Exterior', tool: 'press', hint: 'Hold the press on each highlighted bend.', done: 'Lines true', cam: { preset: 'full' }, fx: 'dust', snd: 'creak', time: 1.6, shake: .15, chip: 'Bends',
        parts: () => ['barrel', 'guard', 'stock'], spots: () => [{ key: 'barrel', p: [3.9, -.2, .2], r: .8, label: 'Bent barrel', onProg: k => bend(it.extra.bg, 1 - k) }, { key: 'guard', p: [0, -.8, .05], r: .6, label: 'Dented guard', onProg: k => { P().guard.g.scale.set(1, .85 + .15 * k, 1); } }] }),
      trace({ id: 'cracks', name: 'Repair the Exterior Cracks', tool: 'filler', hint: 'Trace each highlighted crack to fill it.', done: 'Cracks filled', cam: { preset: 'work', focus: [-1, -.8, .3], r: 2.2 }, width: .05, bead: '#7a4a28', keepBead: true,
        enter() { if (!it.extra.crackM) { it.extra.crackM = cracks.map(pts => { const m = mesh(tube(pts, .014, 30, 4), mat('#0e0805', { roughness: 1 })); P().stock.g.add(m); return m; }); } }, paths: () => cracks.map(pts => ({ key: 'stock', pts })) }),
      hold({ id: 'grind', name: 'Grind the Repair Marks', tool: 'grind', spin: true, hint: 'Hold the grinder on each raised seam until it is flush.', done: 'Seams flush', cam: { preset: 'work', focus: [-1, -.8, .3], r: 2.2 }, time: 1.1, chip: 'Seams',
        parts: () => ['stock'], spots: () => cracks.map((pts, i) => ({ key: 'stock', p: pts[1], r: .6, label: 'Seam', onProg: k => { const b = beads()[i]; if (b) b.scale.set(1, 1, 1 - .9 * k); }, onDone: () => { const b = beads()[i]; if (b) b.visible = false; if (it.extra.crackM) it.extra.crackM[i].visible = false; } })),
        complete() { for (const b of beads()) b.visible = false; for (const m of it.extra.crackM || []) m.visible = false; } }),
      paint({ id: 'sand', name: 'Sand the Final Shape', tool: 'sand', input: 'Swipe', hint: 'Sand the stock and metal to an even surface.', done: 'Even surface', cam: { preset: 'full' }, parts: ['stock', ...metals], layer: 'sand', mode: 'add', amt: .5, rad: .5, fx: 'woodsand', snd: 'sand', req: .8, also: [{ layer: 'dirt', amt: .8, finish: 0 }, { layer: 'crust', amt: .8, finish: 0 }] }),
      paint({ id: 'polish', name: 'Polish the Exterior Metal', tool: 'cloth', input: 'Circles', hint: 'Rub the metal in circles until it gleams.', done: 'Metal gleaming', cam: { preset: 'full' }, parts: metals, layer: 'polish', mode: 'add', amt: .45, rad: .4, fx: 'polish', snd: 'polish', circles: true, req: .8 }),
      paint({ id: 'finish', name: 'Apply the Final Finish', tool: 'finish', input: 'Brush', hint: 'Brush the protective finish over stock and barrel.', done: 'Museum finish', cam: { preset: 'full' }, parts: ['stock', 'barrel', 'lock'], layer: 'finish', mode: 'add', amt: .5, rad: .5, fx: 'stain', snd: 'soap', req: .82 }),
      snap({ id: 'parts', name: 'Reassemble Cosmetic Parts', hint: 'Fit the new butt cap, ramrod and side pins.', done: 'Display complete', keys: ['buttcap', 'ramrod', 'pin0', 'pin1'], cam: { preset: 'full' } }),
      taps({ id: 'check', name: 'Mechanical Presentation Check', tool: 'hand', hint: 'Tap the hammer and the frizzen to see them move.', done: 'Moves like new', cam: { preset: 'work', focus: [0, .2, .3], r: 1.8 }, chip: 'Checks',
        targets: () => [{ key: 'cock', p: [.1, .35, 0], label: 'Hammer', need: 2 }, { key: 'frizzen', p: [0, .2, 0], label: 'Frizzen' }],
        onHit(t, n) { const p = P()[t.key]; if (t.key === 'cock') { const a = n === 1 ? .55 : 0; tween(n === 1 ? .35 : .12, k => { p.g.rotation.z = (n === 1 ? k : 1 - k) * .55; }, () => { sfx(n === 1 ? 'ratchet' : 'latch'); if (n === 2) { sparks(P().frizzen.wp([0, .3, 0]), 14); camImpulse(.3); } }); } else { tween(.3, k => { p.g.rotation.z = -Math.sin(k * Math.PI) * .9; }); sfx('click'); } } }),
      compare({ name: 'Before / After Reveal', hint: 'Drag the slider to see the full transformation.' })
    ];
  }
};
