/* Level 07 - Twin-Bell Alarm Clock: glass, hands, bells, gears and a ticking + ringing payoff. Face toward +Z. */
import * as THREE from 'three';
import { lathe, cyl, box, rbox, torus, mesh, mat, metal, extrude, canvasTex, sphere, tube, merge, xf } from '../assets/geo.js';
import { paint, extract, pick, trace, snap, bath, rotate, compare, stage, centered, I, lp } from '../game/systems/index.js';
import { STREAM_COL } from '../assets/tools.js';
import { G, camImpulse } from '../game/game.js';
import { sfx } from '../fx/audio.js';
import { glints, sparks } from '../fx/particles.js';
import { smooth, later, tween } from '../core/util.js';
import { knurlMat } from '../assets/tex.js';

const R0 = 2.1, DEP = 1.4, HANDS = { hour: { a: -.9, z: .5, len: 1.05, w: .1 }, minute: { a: 2.6, z: .54, len: 1.55, w: .07 }, alarm: { a: 1.4, z: .46, len: .9, w: .05 } };
function faceTex() {
  return canvasTex(512, 512, (g, w) => {
    const c = w / 2; g.fillStyle = '#f1ead6'; g.fillRect(0, 0, w, w); const gr = g.createRadialGradient(c, c, 40, c, c, c); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(120,100,60,.25)'); g.fillStyle = gr; g.fillRect(0, 0, w, w);
    g.translate(c, c); g.strokeStyle = '#2a2420'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, c * .92, 0, 7); g.stroke();
    for (let i = 0; i < 60; i++) { g.save(); g.rotate(i / 60 * Math.PI * 2); g.fillStyle = '#2a2420'; g.fillRect(-1.5, -c * .9, 3, i % 5 ? 10 : 22); g.restore(); }
    g.fillStyle = '#2a2420'; g.font = '700 52px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let i = 1; i <= 12; i++) { const a = i / 12 * Math.PI * 2 - Math.PI / 2; g.fillText(String(i), Math.cos(a) * c * .7, Math.sin(a) * c * .7); }
    g.font = '700 22px Georgia, serif'; g.fillStyle = '#a02a1a'; g.fillText('WESTBURY', 0, -c * .3); g.font = '600 16px Georgia, serif'; g.fillStyle = '#2a2420'; g.fillText('TWIN BELL', 0, c * .32);
  });
}
const handShape = (len, w) => { const s = new THREE.Shape(); s.moveTo(-w, -.18); s.lineTo(w, -.18); s.lineTo(w * .6, len * .78); s.lineTo(w * 1.6, len * .82); s.lineTo(0, len); s.lineTo(-w * 1.6, len * .82); s.lineTo(-w * .6, len * .78); s.lineTo(-w, -.18); return s; };

export default {
  id: 'clock', num: 7, name: 'Twin-Bell Alarm Clock', complexity: 'Medium', minutes: '3-4 min', seed: 71,
  blurb: 'Rusted-through 1950 clock', intro: 'A 1950 wind-up alarm clock: the case is rusted right through, the dial is stained and the brass movement is caked in rust and old grease. Rebuild it from the gears out and make it ring.',
  outro: 'The rusted-through case is sealed and gloss black, the brass shines, and it rings across the workshop again.',
  pose: [-.3, .12], turnAxis: 'y', toolScale: 1,
  build(it) {
    const look = { kind: 'metal', base: '#2c2826', baseR: .7, baseM: .3, sand: '#b5b0aa', pol: '#e9ecef', fin: '#0c0c0e', finR: .12, finM: .25, finCC: 1, dirt: '#4a3a2a', rust1: '#3a1608', rust2: '#9a4614', cell: [144, 144] };
    const ss = it.surface('shell', look), shell = it.part('shell');
    shell.add(lathe([[R0 - .2, -DEP / 2], [R0, -DEP / 2 + .1], [R0 + .05, 0], [R0, DEP / 2 - .1], [R0 - .08, DEP / 2 + .02], [R0 - .3, DEP / 2 + .02]], 72), ss, { r: [Math.PI / 2, 0, 0] });
    for (const sx of [-1, 1]) { shell.add(cyl(.12, .2, 1, 16), ss, { p: [sx * 1.3, -R0 - .35, -.1], r: [0, 0, sx * .45] }); shell.add(sphere(.24, 16, 12), ss, { p: [sx * 1.55, -R0 - .78, -.1] }); }
    shell.add(cyl(.1, .1, .9, 12), ss, { p: [0, R0 + .35, -.2] }); shell.add(torus(.5, .09, 10, 32, Math.PI), ss, { p: [0, R0 + .75, -.2] });
    shell.add(cyl(.08, .08, 3.6, 12), ss, { p: [0, R0 + .35, -.2], r: [0, 0, Math.PI / 2] });
    for (const sx of [-1, 1]) { const b = it.part(sx < 0 ? 'bellL' : 'bellR', { p: [sx * 1.5, R0 + .55, -.2], r: [0, 0, sx * -.5] }); const sb = it.surface(b.key, { ...look, base: '#6e5d44', baseM: .55, pol: '#f3d58a', sand: '#c4a76a', cell: [96, 96] }); b.add(lathe([[.01, .95], [.4, .92], [.72, .7], [.85, .3], [.9, 0], [.92, -.05], [.85, -.04], [.78, .28], [.66, .62], [.36, .82], [.01, .85]], 40), sb); b.add(cyl(.07, .07, .3, 10), metal('#888', .4), { p: [0, 1.05, 0] }); b.hit(.6, [0, .5, .3]); }
    it.extra.holes = [-.5, .35, 2.4].map(t => { const m = shell.add(new THREE.CircleGeometry(.2, 20), mat('#070504', { roughness: 1 }), { p: [Math.cos(t) * (R0 + .06), Math.sin(t) * (R0 + .06), .1], r: [0, Math.PI / 2, 0], nohit: true }); m.lookAt(new THREE.Vector3(Math.cos(t) * 9, Math.sin(t) * 9, .1)); m.position.set(Math.cos(t) * (R0 + .065), Math.sin(t) * (R0 + .065), .1); return { m, t }; });
    const hammer = it.part('hammer', { p: [0, R0 + .9, -.2] }); hammer.add(cyl(.03, .03, .6, 8), metal('#9a9a9a', .4)); hammer.add(sphere(.11, 12, 10), metal('#b0b0b0', .3), { p: [0, .3, 0] });
    const back = it.part('back', { p: [0, 0, -DEP / 2 - .02] }); back.add(cyl(R0 - .05, R0 - .05, .08, 64), metal('#7a756e', .5), { r: [Math.PI / 2, 0, 0] });
    for (const [x, y, k] of [[-.8, -.5, 'knobT'], [.8, -.5, 'knobA']]) { const kn = it.part(k, { parent: 'back', p: [x, y, -.12] }); kn.add(cyl(.28, .28, .14, 24), knurlMat('#c9c3b8', 1), { r: [Math.PI / 2, 0, 0] }); kn.add(box(.08, .5, .06), metal('#c9c3b8', .3), { p: [0, 0, -.1] }); kn.hit(.35); }
    const bz = it.part('bezel', { p: [0, 0, DEP / 2 + .02] }); bz.add(torus(R0 - .18, .12, 12, 72), metal('#b49a5c', .35));
    const old = canvasTex(256, 256, g => { g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(0, 0, 256, 256); g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 1.4; let x = 70, y = 40; g.beginPath(); g.moveTo(x, y); for (let i = 0; i < 9; i++) { x += 20 + Math.random() * 10; y += 20 + Math.random() * 18; g.lineTo(x, y); } g.stroke(); g.beginPath(); g.moveTo(150, 120); g.lineTo(60, 200); g.stroke(); });
    const glassG = () => lathe([[R0 - .2, 0], [R0 - .4, .1], [1, .22], [.01, .25]], 64);
    const gl = it.part('glass', { p: [0, 0, DEP / 2 - .03] }); gl.add(glassG(), new THREE.MeshPhysicalMaterial({ map: old, color: '#ece6d4', transparent: true, opacity: .45, roughness: .35, depthWrite: false }), { r: [Math.PI / 2, 0, 0], cast: false });
    const gl2 = it.part('glass2', { p: [0, 0, DEP / 2 - .03] }); gl2.add(glassG(), new THREE.MeshPhysicalMaterial({ color: '#fff', transparent: true, opacity: .12, roughness: .02, depthWrite: false, envMapIntensity: 2 }), { r: [Math.PI / 2, 0, 0], cast: false }); gl2.g.visible = false; gl2.state = 'hidden';
    const sf = it.surface('face', { kind: 'plastic', map: faceTex(), baseR: .45, dirt: '#7a6a48', cell: [128, 128] }), face = it.part('face', { p: [0, 0, .42] }); face.add(cyl(R0 - .25, R0 - .25, .04, 64), sf, { r: [Math.PI / 2, 0, 0] });
    /* movement: brass plates + toothed wheels (each wheel one mesh so it can be tweezed out) */
    const sg = it.surface('gears', { kind: 'metal', base: '#8a6a34', baseR: .5, baseM: .9, sand: '#c9a65c', pol: '#f2cf7a', polR: .08, dirt: '#4a3a22', rust1: '#3a1a08', rust2: '#7a4a1a', cell: [128, 128] });
    const gears = it.part('gears', { p: [0, 0, 0] });
    it.extra.front = gears.add(rbox(2.6, 2.6, .06, .03, 2), sg, { p: [0, 0, .2] }); gears.add(rbox(2.6, 2.6, .06, .03, 2), sg, { p: [0, 0, -.35] });
    it.extra.wheels = [];
    for (const [x, y, r] of [[-.6, .4, .55], [.55, .3, .4], [0, -.6, .45], [.6, -.6, .25], [-.7, -.5, .3]]) {
      const parts = [xf(cyl(r, r, .06, 32), { r: [Math.PI / 2, 0, 0] })], n = Math.round(r * 36);
      for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2; parts.push(xf(box(.07, .07, .06), { p: [Math.cos(a) * r, Math.sin(a) * r, 0], r: [0, 0, a] })); }
      const m = gears.add(merge(parts), sg, { p: [x, y, -.05] }); it.extra.wheels.push(m);
    }
    gears.add(tube(Array.from({ length: 40 }, (_, i) => { const a = i / 39 * Math.PI * 7, r = .1 + i / 39 * .45; return [Math.cos(a) * r - .2, Math.sin(a) * r + .1, -.25]; }), .015, 120, 4), metal('#3a3a3a', .4), { nohit: true });
    for (const k of ['hour', 'minute', 'alarm']) { const H = HANDS[k], h = it.part(k, { parent: 'face', p: [0, 0, H.z - .42], r: [0, 0, H.a] }); h.add(extrude(handShape(H.len, H.w), .02, 0), mat(k === 'alarm' ? '#c0392b' : '#1e1a16', { roughness: .4, metalness: .4 })); h.add(cyl(.09, .09, .05, 16), metal('#3a2a1a', .4), { r: [Math.PI / 2, 0, 0] }); h.hit(.2, [0, H.len * .5, 0]); }
    for (let i = 0; i < 2; i++) { const s = it.part('bscrew' + i, { p: [(i ? 1 : -1) * 1.5, R0 + .55, -.2] }); s.add(cyl(.1, .1, .12, 12), metal('#8f8a80', .45)); s.hit(.22); }
  },
  after(it) {
    const P = it.parts;
    P.shell.surf.author('rust', (p, n, N) => smooth(.45, .72, N(1.8) + N(5) * .2)); P.shell.surf.author('dirt', (p, n, N) => .35 + .5 * smooth(.3, .7, N(2.5)));
    for (const k of ['bellL', 'bellR']) { P[k].surf.author('rust', (p, n, N) => smooth(.2, .5, N(2) + .1)); P[k].surf.author('dirt', () => .5); }
    P.face.surf.author('dirt', (p, n, N) => .35 + .6 * smooth(.35, .75, N(3.5) + N(10) * .3));
  },
  layouts: {
    shell: centered({ shell: { c: [0, 0, 0] } }),
    brass: centered({ gears: { c: [0, -.2, .4], s: 1.05 }, bellL: { c: [-2.1, 1.9, 0], r: [0, 0, 0], s: .8 }, bellR: { c: [2.1, 1.9, 0], r: [0, 0, 0], s: .8 } }),
    parts: centered({ gears: { c: [0, 0, 0], s: 1.2 } })
  },
  steps(it) {
    const P = () => I().parts, BACK = [Math.PI - .3, .12];
    const tick = { on: false, t: 0 };
    const showWheels = (v, front = false) => { for (const m of it.extra.wheels) m.visible = v; it.extra.front.visible = front; };
    const R = R0 + .06, holePath = t => { const c = new THREE.Vector3(Math.cos(t) * R, Math.sin(t) * R, .1), tg = new THREE.Vector3(-Math.sin(t), Math.cos(t), 0), z = new THREE.Vector3(0, 0, 1), pts = []; for (let i = 0; i <= 16; i++) { const a = i / 16 * Math.PI * 2; pts.push(c.clone().addScaledVector(tg, Math.cos(a) * .28).addScaledVector(z, Math.sin(a) * .28).toArray()); } return pts; };
    return [
      extract({ id: 'movement', name: 'Pull Out the Movement', tool: 'pry', hint: 'Pry the back cover off, then pull the movement out of the case.', done: 'Movement out', pose: BACK, keepTurn: true, cam: { preset: 'full' }, chip: 'Parts',
        items: [{ key: 'back', axis: [0, 0, -1], thr: 1.2, mk: [0, .8, -.15], label: 'Pry off' }, { key: 'gears', axis: [0, 0, -1], thr: 1.6, mk: [.55, .3, -.3], label: 'Pull', after: 'back', flakes: false }],
        complete() { const i2 = I(); for (const k of ['face', 'hour', 'minute', 'alarm', 'bezel']) i2.toTray(k); i2.hide('glass'); } }),
      pick({ id: 'wheels', name: 'Tweeze Out the Gears', tool: 'tweez', grab: true, hint: 'Tap each brass wheel to lift it out with the tweezers.', done: 'Movement stripped', chip: 'Wheels', cam: { preset: 'full' },
        stage: () => stage({ hide: ['shell', 'back', 'bellL', 'bellR', 'hammer', 'bscrew0', 'bscrew1'], layout: 'parts', fn: () => showWheels(true) }),
        items: () => it.extra.wheels.map(m => ({ m, size: .3 })), puff: [.45, .35, .2],
        tut: { title: 'Strip the movement', body: 'Tap each rusty wheel and the tweezers lift it out of the plates.', demo() { const w = it.extra.wheels.find(m => m.visible); return w ? { type: 'tap', pts: [w.getWorldPosition(new THREE.Vector3())] } : null; } } }),
      bath({ id: 'acid', kind: 'jar', swirl: true, name: 'Citric Acid Bath', hint: 'Lower the movement into the jar, then swirl until the rust dissolves.', done: 'Clean brass', liquid: '#d8d27a', murk: '#9ab84a', turns: 2.2,
        stage: () => stage({ layout: 'parts', fn: () => showWheels(true) }),
        onProg(k) { P().gears.surf.u.uDirtRO.value.y = 1 - k; },
        onDone() { const s = P().gears.surf; s.setLayer('rust', 0); s.setLayer('dirt', 0); s.u.uDirtRO.value.y = 1; },
        tut: { title: 'Acid bath', body: 'Drag the movement into the citric acid, then swirl in circles. The solution turns yellow-green as the rust comes off the brass.' } }),
      paint({ id: 'polish', name: 'Polish the Brass', tool: 'buff', input: 'Circles', hint: 'Buff the plates and both bells in small circles until they shine.', done: 'Mirror brass', cam: { preset: 'full' },
        stage: () => stage({ layout: 'brass', fn: () => showWheels(true) }), parts: ['gears', 'bellL', 'bellR'], layer: 'polish', mode: 'add', amt: .45, rad: .45, fx: 'polish', snd: 'polish', circles: true, req: .8, faces: [4], also: [{ layer: 'rust', amt: 1, finish: 0 }, { layer: 'dirt', amt: 1, finish: 0 }, { layer: 'sand', mode: 'add', amt: .6, finish: 1 }],
        enter() { this.toolSpin = true; } }),
      trace({ id: 'braze', name: 'Braze the Rust Holes', tool: 'torch', hint: 'Trace the torch around each hole: molten brass fills it.', done: 'Holes sealed', fx: 'braze', snd: 'torch', width: .07, tol: .55, chip: 'Holes', keepBead: true, cam: { preset: 'full' },
        stage: () => stage({ hide: ['gears', 'bellL', 'bellR'], layout: 'shell' }),
        beadMat: () => metal('#c8a24a', .35),
        paths: () => it.extra.holes.map(h => ({ key: 'shell', pts: holePath(h.t) })),
        onPath(p) { const i = this.paths.indexOf(p), h = it.extra.holes[i]; if (h) h.m.visible = false; sfx('sizzle'); },
        skip() { for (const p of this.paths) { p.cur = 1; this.grow(p); } for (const h of it.extra.holes) h.m.visible = false; },
        tut: { title: 'Braze the holes', body: 'Rust ate through the case. Trace the glowing circle around each hole with the torch and molten brass seals it shut.' } }),
      paint({ id: 'sand', name: 'Fill & Sand Smooth', tool: 'sand', input: 'Sand', hint: 'Sand the filled case smooth, rust and all.', done: 'Smooth as new', cam: { preset: 'full' },
        stage: () => stage({ layout: 'shell' }), parts: ['shell'], layer: 'sand', mode: 'add', amt: .5, rad: .55, fx: 'sand', snd: 'sand', req: .8, also: [{ layer: 'rust', amt: .8, finish: 0 }, { layer: 'dirt', amt: 1, finish: 0 }] }),
      paint({ id: 'spray', name: 'Spray Gloss Black', tool: 'paint', input: 'Sweep', hint: 'Spray an even coat of gloss black over the case.', done: 'Deep gloss black', cam: { preset: 'full' },
        stage: () => stage({ layout: 'shell' }), parts: ['shell', 'back'], layer: 'finish', mode: 'add', amt: .5, rad: .6, fx: 'paint', snd: 'soap', sndGap: 130, req: .85,
        enter() { STREAM_COL.paint = [.06, .06, .07]; }, exit() { STREAM_COL.paint = null; } }),
      snap({ id: 'dial', name: 'Fit the New Dial & Hands', hint: 'Drop the movement, the new dial, each hand and the glass into place.', done: 'Clock face restored', keys: ['gears', 'face', 'hour', 'minute', 'alarm', 'glass2', 'bezel'], ordered: true, cam: { preset: 'full' }, thr: .9,
        stage: () => stage({ home: ['shell', 'back', 'bellL', 'bellR', 'hammer', 'bscrew0', 'bscrew1'], tray: ['gears', 'face', 'hour', 'minute', 'alarm', 'glass2', 'bezel'], fn: () => { showWheels(true, true); const f = P().face.surf; f.setLayer('dirt', 0); } }) }),
      rotate({ id: 'wind', name: 'Wind It & Ring It', tool: 'hand', toolLabel: 'Winding Key', hint: 'Circle around the winding key to wind the clock. It ticks, then rings!', done: 'Tick tock... RING!', pose: BACK, keepTurn: true, cam: { preset: 'full' }, turns: 1.5, label: 'Wind', chip: 'Wind',
        center: () => P().knobT.g.getWorldPosition(new THREE.Vector3()),
        onTurn(d, k) { P().knobT.g.rotateZ(d); P().minute.g.rotateZ(-d * .6); P().hour.g.rotateZ(-d * .05); if (k > .3 && !tick.on) { tick.on = true; tick.t = 0; } },
        onDone() { later(300, ring); },
        update(dt) { if (!tick.on) return; tick.t += dt; if (tick.t > .5) { tick.t = 0; tick.s = !tick.s; sfx(tick.s ? 'tick' : 'tock'); } },
        exit() { tick.on = false; }, delay: 1800 }),
      compare({})
    ];
    function ring() {
      sfx('bell'); camImpulse(.4); const h = I().parts.hammer, b = [I().parts.bellL, I().parts.bellR];
      tween(1.3, k => { const s = Math.sin(k * 90) * (1 - k); h.g.rotation.z = s * .5; for (const x of b) x.g.position.x = x.home.pos.x + Math.sin(k * 120) * .03 * (1 - k); }, () => { h.g.rotation.z = 0; });
      for (const x of b) glints(x.wp([0, .5, 0]), 8, .5);
    }
  }
};
