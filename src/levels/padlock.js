/* Level 01 - Padlock: a round, riveted 19th-century iron padlock with its original key rusted in place
   (from "Very Rusty Lock Restoration. Padlock of the 19th century"). Face toward +Z, shackle up +Y. */
import * as THREE from 'three';
import { lathe, cyl, box, rbox, tube, torus, mesh, mat, metal, sphere } from '../assets/geo.js';
import { paint, pick, bath, heat, taps, timing, snap, cycle, compare, stage, chunksOn, centered, I, lp } from '../game/systems/index.js';
import { G, camImpulse } from '../game/game.js';
import { sfx } from '../fx/audio.js';
import { sparks, puff, glints } from '../fx/particles.js';
import { smooth, later, tween, lerp } from '../core/util.js';

const R = 1.45, T = .85, LEG = .72, SR = .17, KY = -.42;
const DARK = mat('#0b0806', { roughness: .95 });
const RIVETS = Array.from({ length: 8 }, (_, i) => { const a = i / 8 * Math.PI * 2 + Math.PI / 8; return [Math.cos(a) * (R - .2), Math.sin(a) * (R - .2)]; });

export default {
  id: 'padlock', num: 1, name: 'Rusty Padlock', complexity: 'Easy', minutes: '3-4 min', seed: 11,
  blurb: '19th-century iron lock', intro: 'A round riveted iron padlock from the 1800s. It has rusted into one flaking lump, and the original key is fused in the keyhole. Free the key, open the lock up and make it work again.',
  outro: 'A seized lump of rust is now a blued iron padlock, and its original key opens it again.',
  pose: [-.38, .2], turnAxis: 'y',
  build(it) {
    const look = { kind: 'metal', base: '#4a4642', baseR: .62, baseM: .7, sand: '#b4b8bb', sandR: .34, pol: '#dfe3e6', polR: .1, fin: '#1b2330', finR: .32, finM: .85, finCC: .3, dirt: '#5a4632', rust1: '#2e1206', rust2: '#8a3c12', crust: '#4a1e0c' };
    /* body: back shell + side ring */
    const sb = it.surface('body', { ...look, cell: [128, 128] }), body = it.part('body');
    const prof = [[.01, -T / 2], [R - .1, -T / 2], [R - .02, -T / 2 + .06], [R, -T / 2 + .14], [R, T / 2 - .1], [R - .03, T / 2 - .04, 1], [R - .12, T / 2 - .04]];
    body.add(lathe(prof, 56), sb, { r: [Math.PI / 2, 0, 0] });
    body.add(torus(R - .01, .035, 8, 64), sb, { p: [0, 0, -.05] });
    for (const sx of [-1, 1]) body.add(cyl(SR + .07, SR + .07, .26, 20), sb, { p: [sx * LEG, R - .02, 0] });
    /* front plate with rivets, keyhole and escutcheon */
    const sf = it.surface('face', { ...look, cell: [128, 128] }), face = it.part('face', { p: [0, 0, T / 2 - .02] });
    face.add(cyl(R - .1, R - .1, .1, 56), sf, { r: [Math.PI / 2, 0, 0] });
    for (const [x, y] of RIVETS) face.add(sphere(.075, 12, 8), sf, { p: [x, y, .05], s: [1, 1, .6] });
    face.add(lathe([[.01, 0], [.34, 0], [.36, .03, 1], [.3, .05], [.01, .05]], 32), sf, { p: [0, KY, .05], r: [Math.PI / 2, 0, 0] });
    face.add(cyl(.1, .1, .02, 18), DARK, { p: [0, KY + .06, .1], r: [Math.PI / 2, 0, 0], nohit: true });
    face.add(box(.08, .24, .02), DARK, { p: [0, KY - .08, .1], nohit: true });
    /* lever mechanism inside (seen once the face is off) */
    const sl = it.surface('levers', { ...look, cell: [96, 96] }), lev = it.part('levers', { p: [0, 0, T / 2 - .16] });
    for (let i = 0; i < 3; i++) lev.add(rbox(1.5, .32, .04, .03, 2), sl, { p: [.1, .25 - i * .02, i * .06], r: [0, 0, -.15 + i * .1] });
    lev.add(cyl(.09, .09, .3, 14), sl, { p: [-.7, .3, .05], r: [Math.PI / 2, 0, 0] });
    lev.add(tube([[-.6, -.35, .04], [-.2, -.5, .04], [.2, -.35, .04], [.55, -.55, .04]], .035, 30, 6), sl);
    lev.add(cyl(.12, .12, .2, 16), sl, { p: [0, KY, .05], r: [Math.PI / 2, 0, 0] });
    /* shackle */
    const ss = it.surface('shackle', { ...look, cell: [112, 96] }), sh = it.part('shackle');
    const pts = [[-LEG, R - .3, 0], [-LEG, R + .55, 0]]; for (let i = 1; i < 12; i++) { const a = Math.PI - i / 12 * Math.PI; pts.push([Math.cos(a) * LEG, R + .55 + Math.sin(a) * LEG, 0]); } pts.push([LEG, R + .55, 0], [LEG, R + .05, 0]);
    sh.add(tube(pts, SR, 96, 16), ss);
    /* original key, rusted into the keyhole */
    const sk = it.surface('key', { ...look, cell: [96, 64] }), key = it.part('key', { p: [0, KY, T / 2 + .08] });
    key.add(cyl(.05, .05, .5, 12), sk, { p: [0, 0, .25], r: [Math.PI / 2, 0, 0] });
    key.add(torus(.24, .065, 10, 32), sk, { p: [0, 0, .58] , r: [0, 0, 0] });
    key.add(rbox(.12, .1, .14, .03), sk, { p: [0, 0, .46] });
    key.hit(.35, [0, 0, .5]);
  },
  after(it) {
    const P = it.parts;
    for (const k of ['body', 'face', 'shackle', 'key', 'levers']) {
      P[k].surf.author('rust', (p, n, N) => smooth(.18, .5, N(1.5) * .85 + N(4.5) * .35) * .97);
      P[k].surf.author('dirt', (p, n, N) => .3 + .5 * smooth(.35, .7, N(2.5)));
    }
    it.extra.chunks = chunksOn(it, 'face', 5, { size: .3, filter: (p, n) => n.z > .6 && Math.hypot(p.x, p.y - KY) > .55 });
    it.extra.chunks.push(...chunksOn(it, 'body', 2, { size: .26, filter: (p, n) => Math.abs(n.x) > .6 }), ...chunksOn(it, 'shackle', 2, { size: .2, filter: p => p.y > R + .6 }));
  },
  layouts: {
    parts: centered({ body: { c: [0, 1.15, 0], s: .78 }, face: { c: [-1.75, -1.45, .2], s: .62 }, levers: { c: [.15, -1.75, .3], s: .7 }, shackle: { c: [1.85, -1.2, .2], r: [0, 0, -.3], s: .55 }, key: { c: [1.9, 1.35, .4], r: [-1.3, 0, .4], s: .85 } }),
    open: centered({ face: { c: [2.9, .2, .4], r: [0, -.5, 0], s: .8 } })
  },
  steps(it) {
    const metal4 = ['body', 'face', 'shackle', 'key'], all = [...metal4, 'levers'];
    const keyQ = () => I().parts.key.home.quat.clone();
    return [
      pick({
        id: 'chip', name: 'Chip Off the Rust Scale', tool: 'chisel', hint: 'Scratch the chisel across each flaking lump until it breaks off.', done: 'Scale knocked off', cam: { preset: 'full' }, canTurn: true,
        items: () => it.extra.chunks, chip: 'Lumps', layer: 'crust', col: [.3, .12, .05],
        stage: () => stage({ hide: ['levers'] }),
        tut: { title: 'Chip off the scale', body: 'Thick flakes of rust cover the lock. Drag the chisel across a lump to break it away. Turn the lock to reach the ones on the side.', demo() { const c = it.extra.chunks.find(c => !c.gone); if (!c) return null; const w = c.m.getWorldPosition(new THREE.Vector3()); return { type: 'scrub', pts: [w.clone().add(new THREE.Vector3(-.25, 0, 0)), w.clone().add(new THREE.Vector3(.25, 0, 0))] }; } }
      }),
      bath({
        id: 'electro', kind: 'tank', clips: true, name: 'Electrolysis Bath', hint: 'Drag the lock into the soda bath, clip on both leads, then hold the button.', done: 'Rust turned to soft black sludge', liquid: '#7a8f80', murk: '#4a2e14', time: 3.4, depth: 3.1, snd: 'zap',
        onProg(k) { for (const s of it.surfs) { s.u.uResG.value = k * .9; s.u.uDirtRO.value.y = 1 - k; } },
        onDone() { for (const s of it.surfs) { s.u.uResG.value = 0; s.setLayer('residue', .85); s.fade('rust', .2, 0); s.setLayer('dirt', 0); s.setLayer('crust', 0); s.u.uDirtRO.value.y = 1; } },
        tut: { title: 'Electrolysis', body: 'Drag the lock down into the washing-soda bath and clip the red and black leads on. Hold the button: the current lifts the rust off as brown foam.' }
      }),
      heat({
        id: 'key', name: 'Free the Stuck Key', hint: 'Hold the torch on the keyhole until it glows, then twist the key out.', done: 'The key is free!', cam: { preset: 'work', focus: [0, KY, T / 2], r: 1.6 }, time: 2,
        spots: () => [{ key: 'face', p: [0, KY, .12], r: .5, glow: .5, label: 'Heat' }], then: 'twist',
        twist: {
          center: () => lp('key', [0, 0, .58]), turns: 1.2, label: 'Twist', hint: 'Glowing hot! Now twist the key out',
          onTurn(k) { const K = I().parts.key; K.g.quaternion.copy(keyQ()).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.sin(k * 14) * .25 * (1 - k) + k * .5)); K.g.position.copy(K.home.pos).add(new THREE.Vector3(0, 0, k * .9)); if (Math.random() < .3) puff(K.g.getWorldPosition(new THREE.Vector3()), [.4, .38, .36], 1, { a: .3 }); }
        },
        onDone() { const K = I().parts.key; sfx('bigpop'); camImpulse(.6); later(500, () => I().toTray('key')); },
        tut: { title: 'Heat, then twist', body: 'Heat expands the lock around the rusted key. Hold the torch on the keyhole until it glows orange, then circle your finger to twist the key free.' }
      }),
      taps({
        id: 'split', name: 'Split the Body Open', tool: 'chisel', hint: 'Strike the chisel into the seam at each mark.', done: 'Face plate off', strike: true, ordered: true, chip: 'Seam', cam: { preset: 'full' },
        targets: () => [0, 1, 2, 3].map(i => { const a = i / 4 * Math.PI * 2 + .4; return { key: 'face', p: [Math.cos(a) * (R - .08), Math.sin(a) * (R - .08), .02], label: '' }; }),
        onHit(t) { const w = I().parts.face.wp(t.p); sparks(w, 12); puff(w, [.25, .2, .18], 2, { a: .4 }); sfx('anvil'); camImpulse(.4); },
        complete() { I().parts.levers.g.visible = true; stage({ layout: 'open' }); },
        enter() { I().home('levers', 0); I().parts.levers.g.visible = true; }
      }),
      paint({
        id: 'wheel', name: 'Wire-Wheel to Bright Steel', tool: 'grind', input: 'Scrub', hint: 'Run the wire wheel over every part until the black turns to bright steel.', done: 'Bright, pitted steel', cam: { preset: 'full' },
        stage: () => stage({ layout: 'parts' }), canTurn: false, toolScale: .7,
        parts: all, layer: 'residue', amt: .55, rad: .42, fx: 'rust', snd: 'grind', req: .8, faces: [4], also: [{ layer: 'rust', amt: .7, finish: 0 }, { layer: 'sand', mode: 'add', amt: .6, finish: 1 }],
        enter() { this.toolSpin = true; },
        tut: { title: 'Wire wheel', body: 'Drag the spinning wire wheel over the parts. The black electrolysis crust flies off and bright, pitted steel shows through.', demo() { return { type: 'scrub', pts: [lp('body', [-.8, .3, -T / 2]), lp('body', [.8, -.3, -T / 2])] }; } }
      }),
      paint({
        id: 'blue', name: 'Cold-Blue the Iron', tool: 'stain', input: 'Brush', hint: 'Brush the bluing over the steel for a deep blue-black finish.', done: 'Blue-black and protected', cam: { preset: 'full' },
        stage: () => stage({ layout: 'parts' }), canTurn: false,
        parts: all, layer: 'finish', mode: 'add', amt: .55, rad: .45, fx: 'stain', snd: 'soap', req: .8, faces: [4],
        tut: { title: 'Cold bluing', body: 'Brush the bluing solution over the bright steel. It darkens to a blue-black that protects the iron while the high spots keep a soft shine.', demo() { return { type: 'scrub', pts: [lp('body', [-.8, .3, -T / 2]), lp('body', [.8, -.3, -T / 2])] }; } }
      }),
      snap({
        id: 'refit', name: 'Refit the Lock Parts', hint: 'Drag the levers, shackle and face plate back into place.', done: 'Mechanism back in', keys: ['levers', 'shackle', 'face'], ordered: true, cam: { preset: 'full' },
        stage: () => stage({ home: ['body'], tray: ['levers', 'shackle', 'face'] })
      }),
      timing({
        id: 'rivets', name: 'Peen the Rivets', tool: 'hammer', hint: 'Tap each rivet to peen it shut.', done: 'Riveted tight', chip: 'Rivets', label: 'Strike in the green', speed: 2.6, win: .22, cam: { preset: 'full' },
        targets: () => [0, 2, 4, 6].map(i => ({ key: 'face', p: [RIVETS[i][0], RIVETS[i][1], .06] })),
        onHit(t) { glints(I().parts.face.wp(t.p), 3, .1); },
        tut: { title: 'Peen the rivets', body: 'Tap each glowing rivet. The hammer mushrooms it down and locks the case shut.' }
      }),
      cycle({
        id: 'test', name: 'Key Test', hint: 'Drag the key to turn it: the shackle springs open. Close it again, twice.', done: 'It works with its original key!', key: 'shackle', tip: [LEG, R + .55, 0], cycles: 2, cam: { preset: 'full' }, openSnd: 'latch', closeSnd: 'latch',
        stage: () => stage({ home: ['key'] }),
        set(t) { const S = I().parts.shackle, K = I().parts.key; K.g.quaternion.copy(K.home.quat).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -smooth(0, .4, t) * Math.PI / 2)); const rise = smooth(.35, .8, t) * .7, rot = smooth(.75, 1, t) * -1.4; S.g.position.copy(S.home.pos).add(new THREE.Vector3(-LEG, rise, 0)); S.g.quaternion.copy(S.home.quat).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rot)); S.g.position.add(new THREE.Vector3(LEG, 0, 0).applyQuaternion(S.g.quaternion)); }
      }),
      compare({})
    ];
  }
};
