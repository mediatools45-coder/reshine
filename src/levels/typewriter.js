/* Level 09 - Typewriter: dense mechanical cleaning, ribbon replacement and a typing / carriage-return payoff.
   X = width, Y = up, Z = toward the typist. */
import * as THREE from 'three';
import { rbox, cyl, box, torus, mesh, mat, metal, extrude, shape, tube, canvasTex } from '../assets/geo.js';
import { paint, extract, pick, bath, snap, trace, taps, compare, stage, centered, I, lp, toast } from '../game/systems/index.js';
import { STREAM_COL } from '../assets/tools.js';
import { G, camImpulse } from '../game/game.js';
import { sfx } from '../fx/audio.js';
import { glints, puff, drops } from '../fx/particles.js';
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
  id: 'typewriter', num: 9, name: 'Typewriter', complexity: 'Medium-High', minutes: '4-5 min', seed: 91,
  blurb: '1949 Olympia portable', intro: 'A 1949 Olympia Progress portable: worn black paint, rusty chrome, typebars caked in old oil and its famous logo almost gone. Strip it, refinish it, laser the logo back on and type again.',
  outro: 'Gloss black, a crisp white Olympia logo and a clean line of type. Ding!',
  pose: [-.2, .42], turnAxis: 'y', toolScale: .9,
  build(it) {
    const look = { kind: 'metal', base: '#1f1f20', baseR: .55, baseM: .3, sand: '#9aa0a4', sandR: .55, pol: '#c9cdd0', fin: '#09090a', finR: .1, finM: .2, finCC: 1, dirt: '#4a3e30', crust: '#5e584e', rust1: '#3a1608', rust2: '#9a4614', cell: [176, 128] };
    const sb = it.surface('body', look), body = it.part('body');
    const side = shape([[2.7, 0], [2.7, .55], [1.2, 1.5], [-.2, 2.0], [-1.7, 2.1], [-1.9, 1.6], [-1.9, 0]]);
    body.add(extrude(side, 6.6, .12, 8), sb, { r: [0, Math.PI / 2, 0] });
    body.add(rbox(7.2, .2, 4.9, .08, 2), sb, { p: [0, .04, .4] });
    for (const sx of [-1, 1]) body.add(rbox(.5, 1.3, .3, .1, 2), sb, { p: [sx * 3.25, 2.5, -1.4] });
    body.add(box(5.6, .05, 1.5), mat('#0e0c0a', { roughness: 1 }), { p: [0, 1.55, .5], r: [-.55, 0, 0], nohit: true });
    const sc = it.surface('cover', look), cover = it.part('cover', { p: [0, 2.2, -.1] }); cover.add(rbox(5.2, .16, 1.7, .08, 2), sc, { r: [-.18, 0, 0] });
    const logo = (col, worn) => canvasTex(512, 128, g => { g.fillStyle = col; g.font = 'italic 700 92px "Brush Script MT", "Segoe Script", cursive'; g.textAlign = 'center'; g.fillText('Olympia', 256, 96); if (worn) { g.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 260; i++) { g.beginPath(); g.arc(Math.random() * 512, Math.random() * 128, Math.random() * 7, 0, 7); g.fill(); } } });
    it.extra.oldLogo = cover.add(new THREE.PlaneGeometry(1.9, .48), new THREE.MeshStandardMaterial({ map: logo('#c9b38a', true), transparent: true, metalness: .3, roughness: .6, polygonOffset: true, polygonOffsetFactor: -2 }), { p: [0, .09, .2], r: [-Math.PI / 2 - .18, 0, 0], cast: false, nohit: true });
    it.extra.newLogo = cover.add(new THREE.PlaneGeometry(1.9, .48), new THREE.MeshStandardMaterial({ map: logo('#f4f1ea'), transparent: true, roughness: .5, emissive: '#ffffff', emissiveIntensity: 0, polygonOffset: true, polygonOffsetFactor: -3 }), { p: [0, .091, .2], r: [-Math.PI / 2 - .18, 0, 0], cast: false, nohit: true }); it.extra.newLogo.visible = false;
    /* typebar basket */
    const st = it.surface('bars', { kind: 'metal', base: '#8a8a86', baseR: .45, pol: '#dfe2e4', dirt: '#5a4632', crust: '#3a2e20', cell: [128, 96] }), bars = it.part('bars', { p: [0, 1.5, -.2] });
    it.extra.bars = [];
    for (let i = 0; i < 32; i++) { const a = -1.2 + i / 31 * 2.4; it.extra.bars.push(bars.add(box(.05, .03, 1.5), st, { p: [Math.sin(a) * 1.2, -.1, .6 - Math.cos(a) * .9], r: [-.5, a, 0] })); bars.add(box(.12, .1, .08), st, { p: [Math.sin(a) * .35, .25, -.2], r: [0, a, 0] }); }
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
    for (const k of ['body', 'cover']) { const s = P[k].surf; s.author('crust', (p, n, N) => .15 + .45 * smooth(.45, .75, N(2))); s.author('rust', (p, n, N) => smooth(.6, .78, N(1.6) + N(6) * .2)); s.author('dirt', (p, n, N) => .3 * smooth(.4, .7, N(3))); }
    P.carriage.surf.author('rust', (p, n, N) => smooth(.5, .75, N(2.5))); P.carriage.surf.author('crust', () => .5);
    P.bars.surf.author('dirt', (p, n, N) => .5 + .5 * smooth(.3, .7, N(4))); P.bars.surf.author('crust', (p, n, N) => .6 * smooth(.4, .7, N(3)));
    P.platen.surf.author('dirt', (p, n, N) => .5 + .45 * smooth(.3, .7, N(3)));
    P.keys.surf.author('dirt', (p, n, N) => .55 + .4 * smooth(.3, .7, N(5)));
  },
  layouts: { bars: centered({ bars: { c: [0, 0, 0], s: 1.3 } }) },
  steps(it) {
    const P = () => I().parts, K = () => I().extra.keys, TOP = { preset: 'work', focus: [0, 2, -.3], r: 3.4 };
    const pop = c => { const k = K()[c]; if (!k || k.out) return; k.out = true; const g = k.g, y0 = g.position.y; sfx('keycap'); tween(.45, t => { g.position.y = y0 + Math.sin(t * Math.PI) * 1 + t * .5; g.rotation.x = .15 + t * 3; g.scale.setScalar(1 - t * .6); }, () => { g.visible = false; }); };
    const put = c => { const k = K()[c]; if (!k) return; k.out = false; const g = k.g; g.visible = true; g.rotation.set(.15, 0, 0); g.scale.setScalar(1); g.position.copy(k.home).add(new THREE.Vector3(0, .6, 0)); tween(.2, t => { g.position.y = k.home.y + .6 * (1 - t); }, () => sfx('key')); };
    const typed = { n: 0 };
    const printChar = (c, i) => { const cv = it.extra.paperT.canvas, g = cv.getContext('2d'); g.fillStyle = '#1a1712'; g.font = '700 56px "Courier New", monospace'; g.fillText(c, 60 + i * 50, 140); it.extra.paperT.needsUpdate = true; };
    const coverPt = (x, z) => new THREE.Vector3(x, .1, z).applyAxisAngle(new THREE.Vector3(1, 0, 0), -.18).toArray();
    const script = () => { const pts = []; for (let i = 0; i <= 70; i++) { const t = i / 70, x = -.85 + 1.7 * t + .07 * Math.sin(t * Math.PI * 14), z = .2 + .12 * Math.cos(t * Math.PI * 14) * (.6 + .4 * Math.sin(t * Math.PI * 3)); pts.push(coverPt(x, z)); } return pts; };
    const showBars = v => { for (const m of it.extra.bars) m.visible = v; };
    return [
      extract({ id: 'carriage', name: 'Lift Off the Carriage', hint: 'Lift the carriage straight up and off the machine.', done: 'Carriage off', cam: { preset: 'full' }, chip: 'Carriage',
        items: [{ key: 'carriage', axis: [0, 1, 0], thr: 1.8, mk: [0, .3, .2], label: 'Lift', flakes: false }],
        complete() { I().toTray('carriage'); for (const k of ['spoolL', 'spoolR', 'ribbon']) I().hide(k); } }),
      pick({ id: 'typebars', name: 'Pull the Typebars', tool: 'pliers', grab: true, hint: 'Tap the marked typebars to pull them out. The rest follow.', done: 'Typebars out', chip: 'Typebars', cam: TOP,
        items: () => it.extra.bars.filter((_, i) => i % 4 === 1).map(m => ({ m, size: .2 })), puff: [.35, .3, .22],
        complete() { showBars(false); } }),
      bath({ id: 'jar', kind: 'jar', swirl: true, name: 'Rust-Remover Jar', hint: 'Lower the typebars into the jar, then swirl until they come out clean.', done: 'Bright steel typebars', liquid: '#b8382a', murk: '#5a2a18', turns: 2.2,
        stage: () => stage({ hide: ['body', 'cover', 'keys', 'space'], layout: 'bars', fn: () => showBars(true) }),
        onDone() { const s = P().bars.surf; for (const l of ['dirt', 'crust', 'rust']) s.setLayer(l, 0); s.setLayer('polish', .8); },
        tut: { title: 'Rust remover', body: 'Drag the typebars into the red solution and swirl. Bubbles lift the rust and the old oil off the steel.' } }),
      paint({ id: 'blast', name: 'Sandblast the Panels', tool: 'sandgun', input: 'Sweep', hint: 'Sweep the sandblaster over the body until it is bare grey metal.', done: 'Bare metal', cam: { preset: 'full' }, canTurn: false,
        stage: () => stage({ home: ['body', 'cover', 'keys', 'space', 'bars'] }),
        parts: ['body', 'cover'], layer: 'sand', mode: 'add', amt: .5, rad: .7, fx: 'blast', snd: 'sand', req: .8, faces: [2, 4, 0, 1], also: [{ layer: 'rust', amt: .8, finish: 0 }, { layer: 'crust', amt: .8, finish: 0 }, { layer: 'dirt', amt: .8, finish: 0 }],
        onDab() { const m = it.extra.oldLogo.material; m.opacity = Math.max(0, m.opacity - .01); },
        complete() { it.extra.oldLogo.visible = false; },
        tut: { title: 'Sandblast', body: 'Sweep the blaster over the body. Worn paint and rust blast away to clean grey steel, and the old logo goes with it.' } }),
      paint({ id: 'black', name: 'Spray Gloss Black', tool: 'paint', input: 'Sweep', hint: 'Spray an even coat of gloss black.', done: 'Deep gloss black', cam: { preset: 'full' }, canTurn: false,
        parts: ['body', 'cover'], layer: 'finish', mode: 'add', amt: .5, rad: .7, fx: 'paint', snd: 'soap', sndGap: 130, req: .82, faces: [2, 4, 0, 1],
        enter() { STREAM_COL.paint = [.06, .06, .07]; }, exit() { STREAM_COL.paint = null; } }),
      trace({ id: 'logo', name: 'Laser the Olympia Logo', tool: 'laser', hint: 'Trace the laser along the script to burn the logo back in.', done: 'Olympia is back!', fx: 'laser', snd: 'laser', width: .018, tol: .5, chip: 'Logo', cam: { preset: 'work', focus: [0, 2.25, -.1], r: 3 },
        beadMat: () => new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.1, 2) }),
        paths: () => [{ key: 'cover', pts: script() }],
        onGrow(p) { if (p.cur > .97) { const m = it.extra.newLogo; m.visible = true; m.material.emissiveIntensity = .4; } },
        exit() { it.extra.newLogo.visible = true; for (const p of this.paths) p.bead.visible = false; },
        tut: { title: 'Laser engraving', body: 'Follow the glowing line with the laser. It burns a crisp white Olympia script into the fresh black paint.' } }),
      taps({ id: 'oil', name: 'Oil the Key Pivots', tool: 'oil', hint: 'Tap each pivot point to put a drop of oil on it.', done: 'Every key moves freely', chip: 'Pivots', cam: TOP,
        targets: () => [-1.8, -.9, 0, .9, 1.8].map(x => ({ key: 'body', p: [x, 1.55, .3], mr: 20 })),
        onHit(t) { const w = P().body.wp(t.p); drops(w, 3, [.85, .66, .2]); sfx('soap'); P().body.surf.dab(new THREE.Vector3(...t.p), new THREE.Vector3(0, 1, 0), .4, 'wet', 'add', .6); } }),
      snap({ id: 'refit', name: 'Refit the Carriage', hint: 'Drop the carriage back onto its rails.', done: 'Carriage moves', keys: ['carriage'], cam: { preset: 'full' },
        stage: () => stage({ tray: ['carriage'], home: ['spoolL', 'spoolR', 'ribbon'] }) }),
      taps({ id: 'type', name: 'Typing Test', tool: 'hand', hint: `Type ${WORD} on the glowing keys.`, done: 'RESTORED', ordered: true, cam: { preset: 'full' }, chip: 'Typed', assistPx: 34,
        enter() { typed.n = 0; const c = it.extra.paperT.canvas.getContext('2d'); c.fillStyle = '#fbf8f0'; c.fillRect(0, 0, 512, 640); it.extra.paperT.needsUpdate = true; P().carriage.g.position.x = P().carriage.home.pos.x; },
        targets: () => [...WORD].map(c => ({ key: 'keys', p: K()[c].home.toArray(), c, label: c, mr: 18 })),
        onHit(t) { const g = K()[t.c].g, y = K()[t.c].home.y; sfx('typebar'); camImpulse(.1); tween(.12, k => { g.position.y = y - .1 * Math.sin(k * Math.PI); }); printChar(t.c, typed.n++); const car = P().carriage; car.g.position.x = car.home.pos.x + typed.n * .18; if (typed.n === WORD.length) later(300, () => { sfx('ding'); glints(P().paper.wp(), 14, .8); }); },
        delay: 1200 }),
      compare({})
    ];
  }
};
