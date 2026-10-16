/* Level 05 - Watch: precision disassembly and careful visual reassembly */
import * as THREE from 'three';
import { lathe, cyl, box, rbox, torus, mesh, mat, metal, extrude, canvasTex, sphere, merge, xf } from '../assets/geo.js';
import { paint, extract, snap, rotate, taps, compare, stage, centered, I, lp } from '../game/systems/index.js';
import { G, turnItem, faceFront } from '../game/game.js';
import { sfx } from '../fx/audio.js';
import { glints } from '../fx/particles.js';
import { smooth, later, clamp } from '../core/util.js';
import { knurlMat, steelMat } from '../assets/tex.js';

const CR = 1.58, DR = 1.24, HANDS = { hour: { a: 2.05, z: .215 }, minute: { a: .52, z: .235 }, second: { a: -1.2, z: .255 } };
function dialTex() {
  return canvasTex(512, 512, (g, w) => {
    const c = w / 2, gr = g.createRadialGradient(c, c, 10, c, c, c); gr.addColorStop(0, '#2c4a78'); gr.addColorStop(1, '#0f1c33'); g.fillStyle = gr; g.fillRect(0, 0, w, w);
    for (let i = 0; i < 180; i++) { g.strokeStyle = `rgba(255,255,255,${i % 2 ? .025 : .05})`; g.beginPath(); g.moveTo(c, c); const a = i / 180 * Math.PI * 2; g.lineTo(c + Math.cos(a) * c, c + Math.sin(a) * c); g.stroke(); }
    g.translate(c, c);
    for (let i = 0; i < 60; i++) { g.save(); g.rotate(i / 60 * Math.PI * 2); g.fillStyle = '#e8e2d2'; if (i % 5) g.fillRect(-1.5, -c * .95, 3, 14); else { g.fillRect(-7, -c * .92, 14, 46); g.fillStyle = '#d9f5c8'; g.fillRect(-4, -c * .9, 8, 12); } g.restore(); }
    g.fillStyle = '#e8e2d2'; g.font = '700 58px Nunito, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('12', 0, -c * .6); g.fillText('6', 0, c * .6); g.fillText('3', c * .6, 0); g.fillText('9', -c * .6, 0);
    g.font = '800 30px Nunito, sans-serif'; g.fillText('ATLAS', 0, -c * .32); g.font = '600 17px Nunito, sans-serif'; g.fillStyle = '#c6a768'; g.fillText('AUTOMATIC', 0, c * .3); g.fillText('21 JEWELS', 0, c * .38);
  });
}
function handShape(len, wid, tail) { const s = new THREE.Shape(); s.moveTo(0, -tail); s.lineTo(wid, -tail * .6); s.lineTo(wid * .8, len * .7); s.lineTo(0, len); s.lineTo(-wid * .8, len * .7); s.lineTo(-wid, -tail * .6); s.lineTo(0, -tail); return s; }

export default {
  id: 'watch', num: 5, name: 'Wristwatch', complexity: 'Medium', minutes: '5-6 min', seed: 51,
  blurb: 'Tarnished automatic', intro: 'A vintage automatic found in a drawer: a scratched crystal, a tarnished case and bracelet, and dust trapped under the glass. Strip it down under the macro lens and rebuild it.',
  outro: 'A dusty drawer find is now a crisp, ticking watch with a gleaming case and a clear new crystal.',
  pose: [-.25, .18], turnAxis: 'y', toolScale: .6,
  build(it) {
    const look = { kind: 'metal', base: '#6b6863', baseR: .55, sand: '#c6cacd', pol: '#f1f3f5', polR: .04, dirt: '#5e5040', rust1: '#3a2a12', rust2: '#7a5a22' };
    const sc = it.surface('case', { ...look, cell: [128, 128] }), cs = it.part('case');
    cs.add(lathe([[DR + .02, -.34], [CR - .06, -.34, 1], [CR, -.25], [CR + .02, -.05], [CR, .16], [CR - .08, .3], [1.4, .37, 1], [1.33, .37], [1.3, .3]], 72), sc, { r: [Math.PI / 2, 0, 0] });
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) cs.add(rbox(.34, .7, .46, .12, 3), sc, { p: [sx * .82, sy * 1.6, -.02], r: [sy * .12, 0, 0] });
    for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2; cs.add(box(.04, .05, .06), sc, { p: [Math.cos(a) * 1.39, Math.sin(a) * 1.39, .38] }); }
    const mv = it.part('movement'); const brass = metal('#c8a24e', .35), ruby = mat('#b0102a', { roughness: .15, metalness: .1 });
    mv.add(cyl(1.2, 1.2, .2, 48), metal('#9aa0a6', .4), { p: [0, 0, -.06], r: [Math.PI / 2, 0, 0] });
    for (const [x, y, r] of [[-.45, .35, .42], [.4, -.3, .33], [.35, .5, .22], [-.4, -.45, .28]]) { mv.add(cyl(r, r, .06, 24), brass, { p: [x, y, -.19], r: [Math.PI / 2, 0, 0] }); for (let k = 0; k < Math.round(r * 40); k++) { const a = k / Math.round(r * 40) * Math.PI * 2; mv.add(box(.05, .05, .06), brass, { p: [x + Math.cos(a) * r, y + Math.sin(a) * r, -.19], r: [0, 0, a], nohit: true }); } mv.add(sphere(.05, 10, 8), ruby, { p: [x, y, -.23], nohit: true }); }
    mv.add(torus(.5, .03, 8, 40), brass, { p: [.2, .1, -.25], nohit: true });
    const sd = it.surface('dial', { kind: 'plastic', map: dialTex(), baseR: .4, sandR: .4, polR: .25, dirt: '#8a7a60', dirtR: .9, cell: [128, 128] });
    mv.add(cyl(DR, DR, .04, 64), sd, { p: [0, 0, .17], r: [Math.PI / 2, 0, 0] });
    const handM = { hour: metal('#e9edf0', .15), minute: metal('#e9edf0', .15), second: mat('#d23a2a', { roughness: .4 }) };
    for (const [k, len, wid, tail] of [['hour', .66, .07, .12], ['minute', 1.0, .05, .14], ['second', 1.14, .015, .3]]) {
      const h = it.part(k, { parent: 'movement', p: [0, 0, HANDS[k].z], r: [0, 0, HANDS[k].a] }); h.add(extrude(handShape(len, wid, tail), .012, 0), handM[k]); h.add(cyl(.06, .06, .03, 16), handM[k], { r: [Math.PI / 2, 0, 0] });
      if (k !== 'second') h.add(extrude(handShape(len * .7, wid * .55, 0), .02, 0), mat('#d9f5c8', { roughness: .5, emissive: '#3a6a2a' }), { p: [0, len * .18, .01] }); h.hit(.18, [0, len * .55, 0]);
    }
    /* old crystal (scratched, cloudy) and new crystal */
    const scr = canvasTex(256, 256, g => { g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 70; i++) { g.strokeStyle = `rgba(255,255,255,${.3 + Math.random() * .5})`; g.lineWidth = .5 + Math.random(); g.beginPath(); const x = Math.random() * 256, y = Math.random() * 256; g.moveTo(x, y); g.lineTo(x + (Math.random() - .5) * 120, y + (Math.random() - .5) * 60); g.stroke(); } });
    const dome = () => lathe([[1.36, 0], [1.33, .06], [1.1, .15], [.6, .2], [.01, .21]], 64);
    const cr = it.part('crystal', { p: [0, 0, .33] }); cr.add(dome(), new THREE.MeshPhysicalMaterial({ map: scr, color: '#e8e2d0', transparent: true, opacity: .55, roughness: .4, depthWrite: false }), { r: [Math.PI / 2, 0, 0], cast: false });
    const cr2 = it.part('crystal2', { p: [0, 0, .33] }); cr2.add(dome(), new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: .12, roughness: .02, depthWrite: false, envMapIntensity: 2 }), { r: [Math.PI / 2, 0, 0], cast: false }); cr2.g.visible = false; cr2.state = 'hidden';
    const back = it.part('back', { p: [0, 0, -.37] }); back.add(cyl(1.38, 1.38, .08, 64), steelMat('#a7adb2', .35), { r: [Math.PI / 2, 0, 0] });
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; back.add(box(.2, .06, .05), mat('#1a1a1a'), { p: [Math.cos(a) * 1.25, Math.sin(a) * 1.25, -.04], r: [0, 0, a], nohit: true }); }
    back.add(torus(.7, .015, 6, 48), metal('#80878d', .5), { p: [0, 0, -.045], nohit: true });
    const crown = it.part('crown', { p: [CR + .12, 0, 0] }); crown.add(cyl(.17, .17, .22, 24), knurlMat('#b9bfc4', 1), { r: [0, 0, Math.PI / 2] }); crown.add(cyl(.03, .03, .5, 8), metal('#9aa0a6', .3), { p: [-.3, 0, 0], r: [0, 0, Math.PI / 2], nohit: true }); crown.hit(.3);
    for (const [k, sy] of [['strapT', 1], ['strapB', -1]]) {
      const sb = it.surface(k, { ...look, cell: [96, 160] }), st = it.part(k, { p: [0, sy * 1.95, -.08] });
      for (let i = 0; i < 6; i++) { const y = sy * (i * .48 + .15); st.add(rbox(.5, .44, .26, .08, 2), sb, { p: [0, y, -.02 * i] }); for (const sx of [-1, 1]) st.add(rbox(.42, .44, .22, .08, 2), sb, { p: [sx * .47, y + sy * .24, -.02 * i] }); }
      const pin = it.part(k === 'strapT' ? 'pinT' : 'pinB', { p: [0, sy * 1.78, -.08] }); pin.add(cyl(.05, .05, 1.32, 10), metal('#c3c9ce', .3), { r: [0, 0, Math.PI / 2] }); pin.hit(.22, [.66, 0, 0]);
    }
  },
  after(it) {
    const P = it.parts;
    P.case.surf.author('dirt', (p, n, N) => .5 + .45 * smooth(.3, .7, N(4))); P.case.surf.author('rust', (p, n, N) => .5 * smooth(.55, .8, N(3)));
    P.movement.surf.author('dirt', (p, n, N) => .15 + .55 * smooth(.5, .8, N(5) + N(13) * .25)); P.movement.surf.u.uDirtRO.value.y = .7;
    for (const k of ['strapT', 'strapB']) { P[k].surf.author('dirt', (p, n, N) => .55 + .4 * smooth(.3, .7, N(5))); P[k].surf.author('rust', (p, n, N) => .6 * smooth(.5, .8, N(4))); }
  },
  layouts: {
    dial: centered({ movement: { c: [0, 0, 0], s: 1.2 } }), case: centered({ case: { c: [0, 0, 0], s: 1.1 } }),
    straps: centered({ strapT: { c: [-1.05, 0, 0], r: [0, 0, 0] }, strapB: { c: [1.05, 0, 0], r: [0, 0, Math.PI] } })
  },
  /* the steps players do; repeats and filler are applied silently (see game.js loadLevel) */
  keep: ['crystal', 'back', 'movement', 'hands', 'dial', 'bracelet', 'polish', 'handsIn', 'crystalIn', 'time'],
  steps(it) {
    const P = () => I().parts;
    return [
      extract({ id: 'crystal', name: 'Remove the Damaged Crystal', tool: 'press', hint: 'Lift the scratched crystal off the bezel.', done: 'Crystal off', cam: { preset: 'work', focus: [0, 0, 0], r: 1.9 }, chip: 'Crystal',
        items: [{ key: 'crystal', axis: [0, 0, 1], thr: 1, mk: [0, .6, .2], label: 'Lift off', col: [.9, .9, .9] }],
        tut: { title: 'Lift off the crystal', body: 'The old crystal is scratched and cloudy. Drag it straight up, away from the dial.', demo() { const a = lp('crystal', [0, .6, .2]); return { type: 'drag', pts: [a, a.clone().add(new THREE.Vector3(0, .8, 1.5))] }; } } }),
      taps({ id: 'pins', name: 'Remove the Bracelet Pins', tool: 'punch', hint: 'Tap each spring bar to push it out and free the bracelet.', done: 'Bracelet free', chip: 'Pins', cam: { preset: 'full' }, toolScale: .7,
        targets: () => [{ key: 'pinT', p: [.66, 0, 0] }, { key: 'pinB', p: [.66, 0, 0] }],
        onHit(t) { const p = P()[t.key]; sfx('click'); p.g.position.x = p.home.pos.x + .4; },
        onDone(t) { const it2 = I(); sfx('pop'); later(250, () => { it2.toTray(t.key); it2.toTray(t.key === 'pinT' ? 'strapT' : 'strapB'); }); } }),
      rotate({ id: 'back', name: 'Open the Back Cover', tool: 'hand', toolLabel: 'Case Wrench', hint: 'Turn the case back counter-clockwise to unscrew it.', done: 'Back open', pose: [Math.PI - .25, .18], keepTurn: true, cam: { preset: 'full' }, turns: 1.5, chip: 'Unscrew',
        center: () => lp('back', [0, 0, -.05]), onTurn(d, k) { const b = P().back; b.g.quaternion.copy(b.home.quat).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -k * 6)); b.g.position.z = b.home.pos.z - k * .15; },
        onDone() { sfx('pop'); later(300, () => I().toTray('back')); } }),
      extract({ id: 'crown', name: 'Remove the Crown and Stem', tool: 'pliers', hint: 'Pull the crown straight out of the case.', done: 'Stem out', cam: { preset: 'work', focus: [CR, 0, 0], r: 1.4 }, chip: 'Crown',
        items: [{ key: 'crown', axis: [1, 0, 0], thr: 1.1, mk: [0, 0, 0], label: 'Pull out' }] }),
      extract({ id: 'movement', name: 'Remove the Movement', tool: 'hand', hint: 'Lift the movement out through the open back.', done: 'Movement out', pose: [Math.PI - .25, .18], cam: { preset: 'full' }, chip: 'Movement',
        items: [{ key: 'movement', axis: [0, 0, -1], thr: 1.3, mk: [0, 0, -.2], label: 'Lift out', flakes: false }] }),
      extract({ id: 'hands', name: 'Remove the Hands', tool: 'tweez', hint: 'Lift each hand off the centre post with the tweezers.', done: 'Hands off', cam: { preset: 'macro', focus: [0, 0, .2], r: 1.5 }, chip: 'Hands',
        stage: () => stage({ hide: ['case'], layout: 'dial' }),
        items: [{ key: 'second', axis: [0, 0, 1], thr: .6, mk: [0, .9, 0], flakes: false }, { key: 'minute', axis: [0, 0, 1], thr: .6, mk: [0, .7, 0], flakes: false, after: 'second' }, { key: 'hour', axis: [0, 0, 1], thr: .6, mk: [0, .45, 0], flakes: false, after: 'minute' }],
        tut: { title: 'Precision work', body: 'Under the macro lens, pinch each hand with the tweezers and lift it off the centre post, top hand first.', demo() { const x = this.items && this.items.find(i => !i.done && this.ready(i)); if (!x) return null; const a = lp(x.key, x.mk); return { type: 'drag', pts: [a, a.clone().add(new THREE.Vector3(.3, .5, 1))] }; } } }),
      paint({ id: 'dial', name: 'Clean the Dial', tool: 'soft', hint: 'Gently brush the dust and spots off the dial.', done: 'Dial spotless', cam: { preset: 'work', focus: [0, 0, 0], r: 1.8 }, canTurn: false,
        stage: () => stage({ hide: ['case'], layout: 'dial' }), parts: ['movement'], layer: 'dirt', amt: .45, rad: .3, fx: 'dust', snd: 'brush', req: .82, need: .3, faces: [4] }),
      paint({ id: 'case', name: 'Clean the Case', tool: 'detail', hint: 'Scrub the grime out of the case and lugs.', done: 'Case clean', cam: { preset: 'full' },
        stage: () => stage({ hide: ['movement'], layout: 'case' }), parts: ['case'], layer: 'dirt', amt: .5, rad: .3, fx: 'dirt', snd: 'brush', req: .8, also: [{ layer: 'rust', amt: .6, finish: 0 }] }),
      paint({ id: 'bracelet', name: 'Restore the Bracelet', tool: 'soap', hint: 'Scrub the links clean and bright.', done: 'Links shining', cam: { preset: 'full' },
        stage: () => stage({ hide: ['case', 'movement'], layout: 'straps' }), parts: ['strapT', 'strapB'], layer: 'dirt', amt: .5, rad: .35, fx: 'foam', snd: 'soap', req: .8, also: [{ layer: 'rust', amt: .7, finish: 0 }, { layer: 'polish', mode: 'add', amt: .35, finish: 1 }] }),
      paint({ id: 'polish', name: 'Polish the Case', tool: 'cloth', input: 'Circles', hint: 'Rub in small circles for a premium shine.', done: 'Premium shine', cam: { preset: 'full' },
        stage: () => stage({ layout: 'case', tray: ['strapT', 'strapB'] }), parts: ['case'], layer: 'polish', mode: 'add', amt: .45, rad: .35, fx: 'polish', snd: 'polish', circles: true, req: .8, also: [{ layer: 'sand', mode: 'add', amt: .5, finish: 1 }] }),
      snap({ id: 'movementIn', name: 'Reinstall the Movement', hint: 'Seat the movement back in the case.', done: 'Movement seated', keys: ['movement'], cam: { preset: 'full' },
        stage: () => stage({ home: ['case'], tray: ['movement'] }), enter() { for (const k of ['hour', 'minute', 'second']) I().hide(k); } }),
      snap({ id: 'handsIn', name: 'Install the Hands', tool: 'tweez', hint: 'Drop each hand onto the centre post.', done: 'Hands set', keys: ['hour', 'minute', 'second'], ordered: true, thr: .7, cam: { preset: 'macro', focus: [0, 0, .2], r: 1.6 },
        stage: () => stage({ home: ['case', 'movement'], tray: ['hour', 'minute', 'second'] }) }),
      snap({ id: 'crystalIn', name: 'Install the New Crystal', tool: 'press', hint: 'Press the clear new crystal into the bezel.', done: 'Crystal seated', keys: ['crystal2'], cam: { preset: 'full' },
        stage: () => stage({ home: ['case', 'movement', 'hour', 'minute', 'second'], hide: ['crystal'] }), onPlace() { sfx('glass'); glints(lp('crystal2', [0, 0, .2]), 14, .8); } }),
      snap({ id: 'refit', name: 'Refit Crown, Back and Bracelet', hint: 'Return the crown, the case back, the bars and the bracelet.', done: 'Watch complete', keys: ['crown', 'back', 'pinT', 'pinB', 'strapT', 'strapB'], cam: { preset: 'full' }, canTurn: true,
        stage: () => stage({ home: ['case', 'movement', 'hour', 'minute', 'second', 'crystal2'] }) }),
      rotate({ id: 'time', name: 'Final Time Check', tool: 'hand', toolLabel: 'Crown', hint: 'Wind the crown in circles and watch the hands move.', done: 'Keeping time', cam: { preset: 'full' }, turns: 2, chip: 'Wind', snd: 'tick', sndGap: 90, signed: 0,
        center: () => lp('crown'), onTurn(d) { const s = Math.abs(d) * 2.2; for (const [k, m] of [['minute', 1], ['hour', 1 / 12], ['second', 3]]) P()[k].g.rotateZ(-s * m); } }),
      compare({})
    ];
  }
};
