/* Level 09 - Typewriter: dense mechanical cleaning, ribbon replacement and a typing / carriage-return payoff.
   X = width, Y = up, Z = toward the typist. */
import * as THREE from 'three';
import { rbox, cyl, box, torus, mesh, mat, metal, extrude, shape, tube, canvasTex } from '../assets/geo.js';
import { paint, extract, snap, hold, trace, taps, cycle, compare, stage, centered, I, lp, toast } from '../game/systems/index.js';
import { G, camImpulse } from '../game/game.js';
import { sfx } from '../fx/audio.js';
import { glints, puff } from '../fx/particles.js';
import { smooth, later, tween, lerp } from '../core/util.js';
import { knurlMat } from '../assets/tex.js';

const ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'], WORD = 'RESTORED', MANUAL = ['Q', 'P', 'A', 'L', 'M'];
const kpos = (i, j) => [-3.0 + j * .25 + i * .64, .78 + (2 - j) * .3, 2.35 - (2 - j) * .5];
function atlas() { const chars = ROWS.join('') + ' '; const t = canvasTex(512, 512, g => { g.fillStyle = '#f1ead8'; g.fillRect(0, 0, 512, 512); [...chars].forEach((c, i) => { const x = (i % 8) * 64 + 32, y = Math.floor(i / 8) * 64 + 32; g.fillStyle = '#16140f'; g.beginPath(); g.arc(x, y, 31, 0, 7); g.fill(); g.fillStyle = '#f1ead8'; g.font = '800 34px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(c, x, y + 2); }); }); t.chars = chars; return t; }
function keyGeom(ci) {
  const g = new THREE.CylinderGeometry(.24, .26, .1, 24, 1, false), uv = g.attributes.uv, pos = g.attributes.position, nrm = g.attributes.normal;
  for (let k = 0; k < uv.count; k++) { const top = nrm.getY(k) > .9; const u = top ? (pos.getX(k) / .24) * .5 + .5 : .5, v = top ? (-pos.getZ(k) / .24) * .5 + .5 : .5; uv.setXY(k, ((ci % 8) + u * .98 + .01) / 8, 1 - (Math.floor(ci / 8) + 1 - (v * .98 + .01)) / 8); }
  return g;
}

export default {
  id: 'typewriter', num: 9, name: 'Typewriter', complexity: 'High', minutes: '7-8 min', seed: 91,
  blurb: 'Seized green typewriter', intro: 'A dark-green typewriter with dusty keys, sticky typebars, rusty spots, a dirty platen, a broken ribbon and a carriage that will not move. Clean every mechanism and type the word RESTORED.',
  outro: 'Ding! A crisp carriage return and RESTORED typed on fresh paper.',
  pose: [-.2, .42], turnAxis: 'y', toolScale: .9,
  build(it) {
    const look = { kind: 'metal', base: '#2e4436', baseR: .6, baseM: .25, sand: '#7d8a80', sandR: .5, pol: '#b9c4bc', fin: '#14533a', finR: .16, finM: .15, finCC: 1, dirt: '#5a4a38', crust: '#9a958a', rust1: '#3a1608', rust2: '#9a4614', cell: [176, 128] };
    const sb = it.surface('body', look), body = it.part('body');
    const side = shape([[2.7, 0], [2.7, .55], [1.2, 1.5], [-.2, 2.0], [-1.7, 2.1], [-1.9, 1.6], [-1.9, 0]]);
    body.add(extrude(side, 6.6, .12, 8), sb, { r: [0, Math.PI / 2, 0] });
    body.add(rbox(7.2, .2, 4.9, .08, 2), sb, { p: [0, .04, .4] });
    for (const sx of [-1, 1]) body.add(rbox(.5, 1.3, .3, .1, 2), sb, { p: [sx * 3.25, 2.5, -1.4] });
    body.add(box(5.6, .05, 1.5), mat('#0e0c0a', { roughness: 1 }), { p: [0, 1.55, .5], r: [-.55, 0, 0], nohit: true });
    const sc = it.surface('cover', look), cover = it.part('cover', { p: [0, 2.2, -.1] }); cover.add(rbox(5.2, .16, 1.7, .08, 2), sc, { r: [-.18, 0, 0] });
    const shield = canvasTex(256, 64, g => { g.fillStyle = '#c9a24e'; g.font = '800 40px Georgia, serif'; g.textAlign = 'center'; g.fillText('ROYALTON', 128, 46); });
    cover.add(new THREE.PlaneGeometry(1.8, .45), new THREE.MeshStandardMaterial({ map: shield, transparent: true, metalness: .8, roughness: .3, polygonOffset: true, polygonOffsetFactor: -2 }), { p: [0, .09, .2], r: [-Math.PI / 2 - .18, 0, 0], cast: false, nohit: true });
    /* typebar basket */
    const st = it.surface('bars', { kind: 'metal', base: '#8a8a86', baseR: .45, pol: '#dfe2e4', dirt: '#5a4632', crust: '#3a2e20', cell: [128, 96] }), bars = it.part('bars', { p: [0, 1.5, -.2] });
    for (let i = 0; i < 32; i++) { const a = -1.2 + i / 31 * 2.4; bars.add(box(.05, .03, 1.5), st, { p: [Math.sin(a) * 1.2, -.1, .6 - Math.cos(a) * .9], r: [-.5, a, 0] }); bars.add(box(.12, .1, .08), st, { p: [Math.sin(a) * .35, .25, -.2], r: [0, a, 0] }); }
    /* spools + ribbon */
    for (const [k, s] of [['spoolL', -1], ['spoolR', 1]]) { const sp = it.part(k, { p: [s * 2.1, 2.05, -.75] }); sp.add(cyl(.42, .42, .1, 32), metal('#9aa0a6', .35)); sp.add(cyl(.32, .32, .18, 32), mat('#151515', { roughness: .7 }), { p: [0, .12, 0] }); sp.add(cyl(.06, .06, .3, 10), metal('#c9cdd0', .3), { p: [0, .2, 0] }); }
    const rib = it.part('ribbon'); rib.add(tube([[-2.1, 2.2, -.45], [-1, 2.25, -.85], [0, 2.3, -.95], [1, 2.25, -.85], [2.1, 2.2, -.45]], .045, 40, 4), mat('#3a1814', { roughness: .8 }), { s: [1, 1, 1] }); rib.add(tube([[-.3, 2.3, -.93], [-.6, 1.9, -.5], [-.9, 1.7, -.2]], .03, 16, 4), mat('#3a1814', { roughness: .8 }));
    /* carriage with platen */
    const sc2 = it.surface('carriage', { ...look, base: '#30382f', cell: [176, 64] }), car = it.part('carriage', { p: [0, 2.6, -1.4] });
    car.add(box(6.8, .14, .5), sc2, { p: [0, -.25, .1] }); car.add(box(6.8, .1, .3), metal('#c3c8cb', .25), { p: [0, -.38, .35], nohit: true });
    car.add(tube([[-3.4, .1, .2], [-3.9, .5, .55], [-4.1, .6, 1.1]], .05, 20, 8), metal('#d0d4d6', .2)); car.add(cyl(.1, .1, .25, 12), mat('#16140f'), { p: [-4.1, .6, 1.15], r: [Math.PI / 2, 0, 0] });
    car.add(rbox(5.5, .9, .05, .05, 2), metal('#9aa0a4', .4), { p: [0, .5, -.35], r: [-.25, 0, 0], nohit: true });
    const sp_ = it.surface('platen', { kind: 'plastic', base: '#141414', baseR: .55, dirt: '#5a4a30', cell: [176, 64] }), pl = it.part('platen', { parent: 'carriage', p: [0, .2, 0] });
    pl.add(cyl(.38, .38, 6, 40), sp_, { r: [0, 0, Math.PI / 2] }); for (const s of [-1, 1]) pl.add(cyl(.32, .32, .3, 24), knurlMat('#1d1b18', 0), { p: [s * 3.2, 0, 0], r: [0, 0, Math.PI / 2] });
    const paperT = canvasTex(512, 640, g => { g.fillStyle = '#fbf8f0'; g.fillRect(0, 0, 512, 640); }); it.extra.paperT = paperT;
    const paper = it.part('paper', { parent: 'carriage', p: [0, 1.0, -.15] }); paper.add(new THREE.PlaneGeometry(3.2, 1.9), new THREE.MeshStandardMaterial({ map: paperT, roughness: .9, side: THREE.DoubleSide }), { r: [-.2, 0, 0] }); paper.g.visible = false; paper.state = 'hidden';
    /* keys */
    const sk = it.surface('keys', { kind: 'plastic', map: atlas(), baseR: .35, dirt: '#4a3c28', dirtR: .9, cell: [176, 96] }), keys = it.part('keys'); keys.surf = sk; it.extra.keys = {};
    const ring = metal('#c9cdd0', .25), lever = metal('#2a2a28', .5), chars = sk.o.map.chars;
    ROWS.forEach((r, j) => [...r].forEach((c, i) => { const [x, y, z] = kpos(i, j), g = new THREE.Group(); g.position.set(x, y, z); g.rotation.x = .15; keys.g.add(g);
      const m = mesh(keyGeom(chars.indexOf(c)), sk.material()); sk.add(m); m.userData.part = keys; keys.meshes.push(m); g.add(m); g.add(mesh(torus(.25, .025, 6, 24), ring, { r: [Math.PI / 2, 0, 0], nohit: true })); g.add(mesh(box(.06, .5, .06), lever, { p: [0, -.28, -.05], nohit: true }));
      it.extra.keys[c] = { g, home: g.position.clone(), out: false }; }));
    const spc = it.part('space', { p: [0, .48, 2.75] }); spc.add(rbox(3.4, .1, .2, .05, 2), metal('#c9cdd0', .3));
  },
  after(it) {
    const P = it.parts;
    for (const k of ['body', 'cover']) { const s = P[k].surf; s.author('crust', (p, n, N) => .5 + .45 * smooth(.3, .7, N(2))); s.author('rust', (p, n, N) => smooth(.6, .78, N(1.6) + N(6) * .2)); s.author('dirt', (p, n, N) => .3 * smooth(.4, .7, N(3))); }
    P.carriage.surf.author('rust', (p, n, N) => smooth(.5, .75, N(2.5))); P.carriage.surf.author('crust', () => .5);
    P.bars.surf.author('dirt', (p, n, N) => .5 + .5 * smooth(.3, .7, N(4))); P.bars.surf.author('crust', (p, n, N) => .6 * smooth(.4, .7, N(3)));
    P.platen.surf.author('dirt', (p, n, N) => .5 + .45 * smooth(.3, .7, N(3)));
    P.keys.surf.author('dirt', (p, n, N) => .55 + .4 * smooth(.3, .7, N(5)));
  },
  layouts: {},
  steps(it) {
    const P = () => I().parts, K = () => I().extra.keys, TOP = { preset: 'work', focus: [0, 2, -.3], r: 3.4 };
    const pop = c => { const k = K()[c]; if (!k || k.out) return; k.out = true; const g = k.g, y0 = g.position.y; sfx('keycap'); tween(.45, t => { g.position.y = y0 + Math.sin(t * Math.PI) * 1 + t * .5; g.rotation.x = .15 + t * 3; g.scale.setScalar(1 - t * .6); }, () => { g.visible = false; }); };
    const put = c => { const k = K()[c]; if (!k) return; k.out = false; const g = k.g; g.visible = true; g.rotation.set(.15, 0, 0); g.scale.setScalar(1); g.position.copy(k.home).add(new THREE.Vector3(0, .6, 0)); tween(.2, t => { g.position.y = k.home.y + .6 * (1 - t); }, () => sfx('key')); };
    const typed = { n: 0 };
    const printChar = (c, i) => { const cv = it.extra.paperT.canvas, g = cv.getContext('2d'); g.fillStyle = '#1a1712'; g.font = '700 56px "Courier New", monospace'; g.fillText(c, 60 + i * 50, 140); it.extra.paperT.needsUpdate = true; };
    return [
      paint({ id: 'blow', name: 'Blow Away Surface Dust', tool: 'blower', input: 'Sweep', hint: 'Sweep the air blower over the keys and body.', done: 'Dust lifted', cam: { preset: 'full' }, canTurn: false,
        parts: ['body', 'cover', 'keys'], layer: 'crust', amt: .5, rad: .8, fx: 'blow', snd: 'whoosh', sndGap: 400, req: .78, faces: [2, 4], need: .3 }),
      extract({ id: 'cover', name: 'Remove the Top Cover', hint: 'Lift the top cover off.', done: 'Cover off', cam: TOP, chip: 'Cover', items: [{ key: 'cover', axis: [0, 1, 0], thr: 1.4, mk: [0, .1, .4], label: 'Lift', flakes: false }] }),
      extract({ id: 'spools', name: 'Remove the Ribbon Spools', hint: 'Lift both spools out.', done: 'Spools out', cam: TOP, chip: 'Spools',
        items: [{ key: 'spoolL', axis: [0, 1, 0], thr: 1.2, mk: [0, .2, 0], flakes: false }, { key: 'spoolR', axis: [0, 1, 0], thr: 1.2, mk: [0, .2, 0], flakes: false }] }),
      extract({ id: 'ribbon', name: 'Pull the Old Ribbon', hint: 'Drag the frayed ribbon out of the guides.', done: 'Ribbon out', cam: TOP, chip: 'Ribbon', items: [{ key: 'ribbon', axis: [0, 1, 0], thr: 1.4, mk: [0, 2.3, -.95], to: 'fly', flakes: false }] }),
      taps({ id: 'keys', name: 'Remove Selected Keycaps', tool: 'puller', hint: 'Tap each glowing key to pop it off.', done: 'Keys out', cam: { preset: 'full' }, chip: 'Keys', assistPx: 34,
        targets: () => MANUAL.map(c => ({ key: 'keys', p: K()[c].home.toArray(), c, mr: 18 })), onHit(t) { pop(t.c); } }),
      extract({ id: 'platen', name: 'Remove the Platen', hint: 'Slide the roller out of the carriage sideways.', done: 'Platen out', cam: TOP, chip: 'Platen', items: [{ key: 'platen', axis: [1, 0, 0], thr: 3, mk: [2.5, 0, .3], label: 'Slide out', flakes: false }] }),
      paint({ id: 'vacuum', name: 'Vacuum the Interior', tool: 'vacuum', input: 'Sweep', hint: 'Sweep the vacuum over the typebar basket.', done: 'Debris gone', cam: TOP, canTurn: false,
        parts: ['bars'], layer: 'dirt', amt: .55, rad: .6, fx: 'vacuum', snd: 'brush', req: .8, faces: [2, 4] }),
      paint({ id: 'bars', name: 'Brush the Typebars', tool: 'detail', hint: 'Brush the sticky grime off the typebars.', done: 'Typebars free', cam: TOP, canTurn: false,
        parts: ['bars'], layer: 'crust', amt: .55, rad: .45, fx: 'dirt', snd: 'brush', req: .8, faces: [2, 4] }),
      hold({ id: 'slugs', name: 'Clean the Type Slugs', tool: 'detail', hint: 'Hold the brush on each group of type slugs.', done: 'Letters crisp', cam: TOP, fx: 'dust', snd: 'brush', time: 1, shake: 0, chip: 'Slugs',
        parts: () => ['bars'], spots: () => [-.9, 0, .9].map(a => ({ key: 'bars', p: [Math.sin(a) * .35, .3, -.2], r: .5 })) }),
      extract({ id: 'carriage', name: 'Free the Stuck Carriage', tool: 'oil', hint: 'Oil the rail, then drag the carriage all the way across.', done: 'Carriage glides', cam: { preset: 'full' }, chip: 'Carriage',
        enter() { P().carriage.surf.dab(new THREE.Vector3(0, -.3, .2), new THREE.Vector3(0, 0, 1), 1.2, 'wet', 'add', 1); },
        items: [{ key: 'carriage', axis: [-1, 0, 0], thr: 2.4, resist: true, to: 'stay', mk: [-4.1, .6, 1.1], label: 'Drag', flakes: false }],
        complete() { const c = P().carriage; tween(.6, k => { c.g.position.x = lerp(c.home.pos.x - 2.4, c.home.pos.x, k); }); sfx('ding'); } }),
      paint({ id: 'rust', name: 'Remove the Body Rust', tool: 'wire', hint: 'Scrub the rust spots off the body.', done: 'Rust gone', cam: { preset: 'full' }, canTurn: false,
        parts: ['body', 'carriage'], layer: 'rust', amt: .55, rad: .55, fx: 'rust', snd: 'wire', sndGap: 55, req: .8, faces: [2, 4, 0, 1], also: [{ layer: 'crust', amt: .6, finish: 0 }, { layer: 'dirt', amt: .5, finish: 0 }] }),
      paint({ id: 'sand', name: 'Sand the Body', tool: 'sand', hint: 'Sand the body smooth before painting.', done: 'Surface even', cam: { preset: 'full' }, canTurn: false,
        parts: ['body'], layer: 'sand', mode: 'add', amt: .5, rad: .65, fx: 'sand', snd: 'sand', req: .8, faces: [2, 4] }),
      paint({ id: 'paint', name: 'Repaint the Shell', tool: 'paint', input: 'Sweep', hint: 'Spray a fresh coat of deep green.', done: 'Fresh finish', cam: { preset: 'full' }, canTurn: false,
        stage: () => stage({ home: ['cover'] }), parts: ['body', 'cover'], layer: 'finish', mode: 'add', amt: .5, rad: .7, fx: 'paint', snd: 'soap', sndGap: 130, req: .82, faces: [2, 4, 0, 1] }),
      paint({ id: 'keycaps', name: 'Clean the Keycaps', tool: 'cloth', input: 'Wipe', hint: 'Wipe the keys until every legend is readable.', done: 'Legends crisp', cam: { preset: 'work', focus: [0, 1, 2], r: 3.2 }, canTurn: false,
        parts: ['keys'], layer: 'dirt', amt: .55, rad: .5, fx: 'wipe', snd: 'wipe', req: .8, faces: [2, 4], also: [{ layer: 'crust', amt: 1, finish: 0 }] }),
      trace({ id: 'ribbonIn', name: 'Install the New Ribbon', tool: 'hand', hint: 'Thread the fresh ribbon from spool to spool through the guide.', done: 'Ribbon threaded', cam: TOP, width: .045, bead: '#b0201c', tol: .8, keepBead: true, chip: 'Ribbon',
        stage: () => stage({ home: ['spoolL', 'spoolR'], hide: ['ribbon'] }), paths: () => [{ key: 'body', pts: [[-2.1, 2.2, -.45], [-1, 2.25, -.85], [0, 2.3, -.95], [1, 2.25, -.85], [2.1, 2.2, -.45]] }] }),
      snap({ id: 'assemble', name: 'Reassemble Platen and Keys', hint: 'Slide the platen back in and drop the cover on.', done: 'Typewriter complete', keys: ['platen', 'cover'], ordered: true, cam: { preset: 'full' },
        stage: () => stage({ tray: ['platen', 'cover'] }), onPlace(x) { if (x.key === 'cover') MANUAL.forEach((c, i) => later(150 + i * 120, () => put(c))); }, complete() { for (const c of MANUAL) if (K()[c].out) put(c); } }),
      cycle({ id: 'return', name: 'Carriage Return Test', hint: 'Push the carriage across, then throw the return lever. Do it twice.', done: 'Ding!', key: 'carriage', tip: [-4.1, .6, 1.1], cycles: 2, cam: { preset: 'full' }, openSnd: 'ding', closeSnd: 'ratchet', openLabel: 'Push', closeLabel: 'Return',
        stage: () => stage({ home: ['paper'] }), set(t) { const c = I().parts.carriage; c.g.position.x = c.home.pos.x - t * 2.6; } }),
      taps({ id: 'type', name: 'Typing Test', tool: 'hand', hint: `Type ${WORD} on the glowing keys.`, done: 'RESTORED', ordered: true, cam: { preset: 'full' }, chip: 'Typed', assistPx: 34,
        enter() { typed.n = 0; const c = it.extra.paperT.canvas.getContext('2d'); c.fillStyle = '#fbf8f0'; c.fillRect(0, 0, 512, 640); it.extra.paperT.needsUpdate = true; P().carriage.g.position.x = P().carriage.home.pos.x; },
        targets: () => [...WORD].map(c => ({ key: 'keys', p: K()[c].home.toArray(), c, label: c, mr: 18 })),
        onHit(t) { const g = K()[t.c].g, y = K()[t.c].home.y; sfx('typebar'); camImpulse(.1); tween(.12, k => { g.position.y = y - .1 * Math.sin(k * Math.PI); }); printChar(t.c, typed.n++); const car = P().carriage; car.g.position.x = car.home.pos.x + typed.n * .18; if (typed.n === WORD.length) later(300, () => { sfx('ding'); glints(P().paper.wp(), 14, .8); }); },
        delay: 1200 }),
      compare({})
    ];
  }
};
