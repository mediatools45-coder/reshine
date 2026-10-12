/* Level 07 - Twin-Bell Alarm Clock: glass, hands, bells, gears and a ticking + ringing payoff. Face toward +Z. */
import * as THREE from 'three';
import { lathe, cyl, box, rbox, torus, mesh, mat, metal, extrude, canvasTex, sphere, tube } from '../core/geo.js';
import { paint, extract, screws, snap, taps, bath, rotate, compare, stage, centered, I, lp } from '../core/systems.js';
import { G, camImpulse } from '../core/game.js';
import { sfx } from '../core/audio.js';
import { glints, sparks } from '../core/particles.js';
import { smooth, later, tween } from '../core/util.js';
import { knurlMat } from '../core/tex.js';

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
  id: 'clock', num: 7, name: 'Twin-Bell Alarm Clock', complexity: 'Medium-High', minutes: '5-7 min', seed: 71,
  blurb: 'Rusty twin-bell', intro: 'A classic twin-bell alarm clock with rusty bells, cracked glass, faded paint and bent hands. Strip it to the gears, repaint the shell and make it tick and ring again.',
  outro: 'Fresh paint, bright bells and a crisp tick, followed by a ring you can hear across the workshop.',
  pose: [-.3, .12], turnAxis: 'y', toolScale: 1,
  build(it) {
    const look = { kind: 'metal', base: '#8a3a2c', baseR: .7, baseM: .2, sand: '#b5b0aa', pol: '#e9ecef', fin: '#c8392b', finR: .22, finM: .1, finCC: 1, dirt: '#4a3a2a', rust1: '#3a1608', rust2: '#9a4614', cell: [144, 144] };
    const ss = it.surface('shell', look), shell = it.part('shell');
    shell.add(lathe([[R0 - .2, -DEP / 2], [R0, -DEP / 2 + .1], [R0 + .05, 0], [R0, DEP / 2 - .1], [R0 - .08, DEP / 2 + .02], [R0 - .3, DEP / 2 + .02]], 72), ss, { r: [Math.PI / 2, 0, 0] });
    for (const sx of [-1, 1]) { shell.add(cyl(.12, .2, 1, 16), ss, { p: [sx * 1.3, -R0 - .35, -.1], r: [0, 0, sx * .45] }); shell.add(sphere(.24, 16, 12), ss, { p: [sx * 1.55, -R0 - .78, -.1] }); }
    shell.add(cyl(.1, .1, .9, 12), ss, { p: [0, R0 + .35, -.2] }); shell.add(torus(.5, .09, 10, 32, Math.PI), ss, { p: [0, R0 + .75, -.2] });
    shell.add(cyl(.08, .08, 3.6, 12), ss, { p: [0, R0 + .35, -.2], r: [0, 0, Math.PI / 2] });
    for (const sx of [-1, 1]) { const b = it.part(sx < 0 ? 'bellL' : 'bellR', { p: [sx * 1.5, R0 + .55, -.2], r: [0, 0, sx * -.5] }); const sb = it.surface(b.key, { ...look, base: '#6e5d44', baseM: .55, pol: '#f3d58a', sand: '#c4a76a', cell: [96, 96] }); b.add(lathe([[.01, .95], [.4, .92], [.72, .7], [.85, .3], [.9, 0], [.92, -.05], [.85, -.04], [.78, .28], [.66, .62], [.36, .82], [.01, .85]], 40), sb); b.add(cyl(.07, .07, .3, 10), metal('#888', .4), { p: [0, 1.05, 0] }); b.hit(.6, [0, .5, .3]); }
    const hammer = it.part('hammer', { p: [0, R0 + .9, -.2] }); hammer.add(cyl(.03, .03, .6, 8), metal('#9a9a9a', .4)); hammer.add(sphere(.11, 12, 10), metal('#b0b0b0', .3), { p: [0, .3, 0] });
    const back = it.part('back', { p: [0, 0, -DEP / 2 - .02] }); back.add(cyl(R0 - .05, R0 - .05, .08, 64), metal('#7a756e', .5), { r: [Math.PI / 2, 0, 0] });
    for (const [x, y, k] of [[-.8, -.5, 'knobT'], [.8, -.5, 'knobA']]) { const kn = it.part(k, { parent: 'back', p: [x, y, -.12] }); kn.add(cyl(.28, .28, .14, 24), knurlMat('#c9c3b8', 1), { r: [Math.PI / 2, 0, 0] }); kn.add(box(.08, .5, .06), metal('#c9c3b8', .3), { p: [0, 0, -.1] }); kn.hit(.35); }
    const bz = it.part('bezel', { p: [0, 0, DEP / 2 + .02] }); bz.add(torus(R0 - .18, .12, 12, 72), metal('#b49a5c', .35));
    const old = canvasTex(256, 256, g => { g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(0, 0, 256, 256); g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 1.4; let x = 70, y = 40; g.beginPath(); g.moveTo(x, y); for (let i = 0; i < 9; i++) { x += 20 + Math.random() * 10; y += 20 + Math.random() * 18; g.lineTo(x, y); } g.stroke(); g.beginPath(); g.moveTo(150, 120); g.lineTo(60, 200); g.stroke(); });
    const glassG = () => lathe([[R0 - .2, 0], [R0 - .4, .1], [1, .22], [.01, .25]], 64);
    const gl = it.part('glass', { p: [0, 0, DEP / 2 - .03] }); gl.add(glassG(), new THREE.MeshPhysicalMaterial({ map: old, color: '#ece6d4', transparent: true, opacity: .45, roughness: .35, depthWrite: false }), { r: [Math.PI / 2, 0, 0], cast: false });
    const gl2 = it.part('glass2', { p: [0, 0, DEP / 2 - .03] }); gl2.add(glassG(), new THREE.MeshPhysicalMaterial({ color: '#fff', transparent: true, opacity: .12, roughness: .02, depthWrite: false, envMapIntensity: 2 }), { r: [Math.PI / 2, 0, 0], cast: false }); gl2.g.visible = false; gl2.state = 'hidden';
    const sf = it.surface('face', { kind: 'plastic', map: faceTex(), baseR: .45, dirt: '#7a6a48', cell: [128, 128] }), face = it.part('face', { p: [0, 0, .42] }); face.add(cyl(R0 - .25, R0 - .25, .04, 64), sf, { r: [Math.PI / 2, 0, 0] });
    const gears = it.part('gears', { p: [0, 0, 0] }), brass = metal('#c49a46', .3);
    gears.add(box(2.6, 2.6, .06), metal('#9a9890', .45), { p: [0, 0, .2] }); gears.add(box(2.6, 2.6, .06), metal('#9a9890', .45), { p: [0, 0, -.35] });
    for (const [x, y, r] of [[-.6, .4, .55], [.55, .3, .4], [0, -.6, .45], [.6, -.6, .25], [-.7, -.5, .3]]) { gears.add(cyl(r, r, .06, 32), brass, { p: [x, y, -.05], r: [Math.PI / 2, 0, 0] }); const n = Math.round(r * 36); for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2; gears.add(box(.07, .07, .06), brass, { p: [x + Math.cos(a) * r, y + Math.sin(a) * r, -.05], r: [0, 0, a], nohit: true }); } }
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
    shell: centered({ shell: { c: [0, 0, 0] } }), bells: centered({ bellL: { c: [-1.2, 0, 0], r: [0, 0, 0] }, bellR: { c: [1.2, 0, 0], r: [0, 0, 0] } }),
    face: centered({ face: { c: [0, 0, 0] } }), parts: centered({ gears: { c: [0, 0, 0], s: 1.2 } })
  },
  steps(it) {
    const P = () => I().parts, BACK = [Math.PI - .3, .12];
    const tick = { on: false, t: 0 };
    return [
      screws({ id: 'bells', name: 'Remove the Bells', hint: 'Hold the screwdriver on each bell screw, then the bells lift away.', done: 'Bells off', keys: ['bscrew0', 'bscrew1'], dir: 'out', axis: [0, 1, 0], rise: .5, cam: { preset: 'work', focus: [0, R0 + .6, -.2], r: 2.6 },
        complete() { const it2 = I(); for (const k of ['bellL', 'bellR', 'bscrew0', 'bscrew1']) it2.toTray(k); } }),
      extract({ id: 'back', name: 'Open the Rear Cover', tool: 'pry', hint: 'Pry the back cover off the clock.', done: 'Back open', pose: BACK, keepTurn: true, cam: { preset: 'full' }, chip: 'Cover',
        items: [{ key: 'back', axis: [0, 0, -1], thr: 1.2, mk: [0, .8, -.15], label: 'Pry off' }] }),
      extract({ id: 'bezel', name: 'Remove the Glass Bezel', tool: 'pry', hint: 'Pry the brass bezel off the front.', done: 'Bezel off', cam: { preset: 'full' }, chip: 'Bezel',
        items: [{ key: 'bezel', axis: [0, 0, 1], thr: 1.2, mk: [0, R0 - .18, .1], label: 'Pry', flakes: false }] }),
      extract({ id: 'glass', name: 'Remove the Damaged Glass', tool: 'hand', toolLabel: 'Suction Cup', hint: 'Lift the cracked glass out.', done: 'Glass out', cam: { preset: 'full' }, chip: 'Glass',
        items: [{ key: 'glass', axis: [0, 0, 1], thr: 1.2, mk: [0, .6, .25], label: 'Lift', snd: 'glass', flakes: false }] }),
      extract({ id: 'hands', name: 'Remove the Clock Hands', tool: 'tweez', hint: 'Lift each hand off the centre post.', done: 'Hands off', cam: { preset: 'macro', focus: [0, 0, .5], r: 2.3 }, chip: 'Hands',
        items: [{ key: 'minute', axis: [0, 0, 1], thr: .7, mk: [0, 1.0, 0], flakes: false }, { key: 'hour', axis: [0, 0, 1], thr: .7, mk: [0, .6, 0], flakes: false, after: 'minute' }, { key: 'alarm', axis: [0, 0, 1], thr: .7, mk: [0, .55, 0], flakes: false, after: 'hour' }] }),
      extract({ id: 'face', name: 'Remove the Clock Face', tool: 'hand', hint: 'Lift the dial away from the movement.', done: 'Dial out', cam: { preset: 'full' }, chip: 'Dial',
        items: [{ key: 'face', axis: [0, 0, 1], thr: 1.2, mk: [0, -.9, 0], flakes: false }] }),
      extract({ id: 'gears', name: 'Remove the Gear Module', tool: 'hand', hint: 'Pull the gear module out of the shell.', done: 'Module out', cam: { preset: 'full' }, chip: 'Module',
        items: [{ key: 'gears', axis: [0, 0, 1], thr: 1.5, mk: [.55, .3, .25], flakes: false }] }),
      paint({ id: 'shell', name: 'Brush the Rusty Shell', tool: 'wire', hint: 'Scrub the rust off the shell. It turns by itself.', done: 'Rust gone', cam: { preset: 'full' },
        stage: () => stage({ layout: 'shell' }), parts: ['shell'], layer: 'rust', amt: .5, rad: .5, fx: 'rust', snd: 'wire', sndGap: 55, req: .8, also: [{ layer: 'dirt', amt: .5, finish: 0 }] }),
      bath({ id: 'parts', kind: 'jar', name: 'Clean the Small Parts', hint: 'Lower the gear module into the cleaning jar, then hold the button.', done: 'Gears gleaming', liquid: '#4f9aa2', murk: '#5a3a1c', time: 3,
        stage: () => stage({ hide: ['shell'], layout: 'parts' }), onDone() { } }),
      paint({ id: 'bellsPolish', name: 'Polish the Bells', tool: 'buff', input: 'Circles', hint: 'Buff both bells until they shine.', done: 'Bells bright', cam: { preset: 'full' },
        stage: () => stage({ hide: ['gears', 'shell'], layout: 'bells' }), parts: ['bellL', 'bellR'], layer: 'polish', mode: 'add', amt: .45, rad: .45, fx: 'polish', snd: 'polish', circles: true, req: .8, faces: null, also: [{ layer: 'rust', amt: 1, finish: 0 }, { layer: 'dirt', amt: 1, finish: 0 }, { layer: 'sand', mode: 'add', amt: .6, finish: 1 }] }),
      paint({ id: 'repaint', name: 'Repaint the Outer Shell', tool: 'paint', input: 'Sweep', hint: 'Spray an even coat of fresh red over the shell.', done: 'Fresh paint', cam: { preset: 'full' },
        stage: () => stage({ hide: ['bellL', 'bellR'], layout: 'shell' }), enter() { }, parts: ['shell'], layer: 'finish', mode: 'add', amt: .5, rad: .6, fx: 'paint', snd: 'soap', sndGap: 130, req: .85 }),
      paint({ id: 'face', name: 'Restore the Clock Face', tool: 'sponge', input: 'Wipe', hint: 'Gently wipe the dial until it is clean and readable.', done: 'Face readable', cam: { preset: 'full' }, canTurn: false,
        stage: () => stage({ hide: ['shell'], layout: 'face' }), parts: ['face'], layer: 'dirt', amt: .45, rad: .45, fx: 'foam', snd: 'soap', req: .82, faces: [4] }),
      snap({ id: 'inside', name: 'Reassemble Mechanism and Hands', hint: 'Drop the gears, the dial and then each hand into place.', done: 'Mechanism restored', keys: ['gears', 'face', 'hour', 'minute', 'alarm'], ordered: true, cam: { preset: 'full' }, thr: .9,
        stage: () => stage({ home: ['shell'], tray: ['gears', 'face', 'hour', 'minute', 'alarm'] }) }),
      snap({ id: 'outside', name: 'Install New Glass and Bells', hint: 'Fit the new glass, the bezel, the back and both bells.', done: 'Clock complete', keys: ['glass2', 'bezel', 'back', 'bellL', 'bellR', 'bscrew0', 'bscrew1'], ordered: true, canTurn: true, cam: { preset: 'full' },
        stage: () => stage({ home: ['shell', 'gears', 'face', 'hour', 'minute', 'alarm'], hide: ['glass'] }) }),
      taps({ id: 'check', name: 'Time and Alarm Check', tool: 'hand', hint: 'Turn the time knob, then pull the alarm knob to ring the bells.', done: 'Tick tock... RING!', ordered: true, pose: BACK, keepTurn: true, cam: { preset: 'full' }, chip: 'Check',
        targets: () => [{ key: 'knobT', label: 'Wind', need: 3 }, { key: 'knobA', label: 'Alarm' }],
        onHit(t, n) {
          if (t.key === 'knobT') { const k = P().knobT; k.g.rotateZ(1.2); sfx('ratchet'); P().minute.g.rotateZ(-.9); P().hour.g.rotateZ(-.075); if (n >= 3) { tick.on = true; tick.t = 0; sfx('tick'); } }
          else { ring(); }
        }, delay: 2600,
        update(dt) { if (!tick.on) return; tick.t += dt; if (tick.t > .5) { tick.t = 0; tick.s = !tick.s; sfx(tick.s ? 'tick' : 'tock'); } },
        exit() { tick.on = false; } }),
      compare({})
    ];
    function ring() {
      sfx('bell'); camImpulse(.4); const h = I().parts.hammer, b = [I().parts.bellL, I().parts.bellR];
      tween(1.3, k => { const s = Math.sin(k * 90) * (1 - k); h.g.rotation.z = s * .5; for (const x of b) x.g.position.x = x.home.pos.x + Math.sin(k * 120) * .03 * (1 - k); }, () => { h.g.rotation.z = 0; });
      for (const x of b) glints(x.wp([0, .5, 0]), 8, .5);
    }
  }
};
