/* Level 04 - Vintage Lighter: small-part disassembly, chemical cleaning, fresh cotton and reassembly (ported from v12, 29 steps) */
import * as THREE from 'three';
import { rbox, cyl, box, mesh, mat, metal, lump, lathe, canvasTex } from '../assets/geo.js';
import { paint, pick, extract, screws, snap, hold, bath, taps, cycle, compare, stage, centered, I, lp, toast } from '../game/systems/index.js';
import { G, camImpulse } from '../game/game.js';
import { sfx } from '../fx/audio.js';
import { sparks, puff, flakes, glints } from '../fx/particles.js';
import { smooth, later, tween, lerp, clamp } from '../core/util.js';
import { STREAM_COL } from '../assets/tools.js';

const W = 4.2, D = 1.55, Hc = 4.4, Hl = 2.2, tw = 3.8, td = 1.25, th = 4.0, chH = 1.7, chY = th / 2 + chH / 2 - .05;
const PB = -.1 - th / 2 - .09, LID_OPEN = -1.75;
const ASM = ['case', 'lid', 'insert', 'plate', 'wheel', 'shaft', 'pin'];
const COT = ['cot0', 'cot1', 'cot2', 'cot3'], NEW = ['new0', 'new1', 'new2', 'new3'], SCR = ['screw0', 'screw1'];
const PAINT = '#2a8a92';
const POSE = [-.42, .12], BOTTOM = [-.3, -1.15], HINGE = [-1.0, .1];

const look = (o = {}) => ({ kind: 'metal', base: '#5d554c', baseR: .7, sand: '#b9bec2', sandR: .36, pol: '#eef1f3', polR: .05, dirt: '#4e3d2c', fin: PAINT, finR: .28, finM: .15, finCC: .9, ...o });
const SEQ = [
  { label: 'Body', keys: ['case', 'lid'], layout: centered({ case: { c: [0, -1.25, 0] }, lid: { c: [0, 2.45, 0], r: [0, 0, 0] } }) },
  { label: 'Insert', keys: ['insert'], layout: centered({ insert: { c: [0, 0, 0] } }) },
  { label: 'Small parts', keys: ['plate', 'wheel', 'shaft', 'pin'], layout: centered({ plate: { c: [0, 2.1, 0], r: [1.2, 0, 0], s: .9 }, wheel: { c: [-1.5, .2, 0], r: [0, Math.PI / 2, 0], s: 2.1 }, shaft: { c: [1.6, .2, 0], s: 1.9 }, pin: { c: [0, -1.8, 0], s: .85 } }) }
];
const BOARD = centered({ insert: { c: [-1.4, 1.6, 0], s: .55 }, case: { c: [1.45, 1.6, 0], s: .55 }, lid: { c: [1.45, -.8, 0], s: .55, r: [0, 0, 0] }, plate: { c: [-1.4, -.95, 0], s: .6, r: [1.2, 0, 0] }, wheel: { c: [-.4, -2.1, 0], s: 1.3, r: [0, Math.PI / 2, 0] }, shaft: { c: [.6, -2.1, 0], s: 1.2 }, pin: { c: [0, -.1, 0], s: .5 } });
const BASKET = centered({ insert: { c: [-.9, .4, 0], s: .45 }, case: { c: [.9, .45, 0], s: .42 }, lid: { c: [.9, -.95, 0], s: .42, r: [0, 0, 0] }, plate: { c: [-.9, -.95, 0], s: .5, r: [1.2, 0, 0] }, wheel: { c: [-.2, -.35, .3], s: .85, r: [0, Math.PI / 2, 0] }, shaft: { c: [.15, .35, .3], s: .8 }, pin: { c: [0, -1.4, .3], s: .4 } });
const pw = (k, p) => lp(k, p);

export default {
  id: 'lighter', num: 4, name: 'Vintage Lighter', complexity: 'Medium-High', minutes: '6-7 min', seed: 41,
  blurb: 'Seized pocket lighter', intro: 'A heavily oxidised flip-top lighter with a stuck lid, rotten cotton and a tarnished case. Take it apart piece by piece and rebuild it good as new.',
  outro: 'From a crusty relic to a gleaming, working lighter with a fresh GenZ finish.',
  pose: POSE, turnAxis: 'y', toolScale: 1.15,
  build(it) {
    const rimM = metal('#6a4a30', .7, { metalness: .5 });
    const sc = it.surface('case', look({ cell: [140, 140] })), cs = it.part('case');
    cs.add(rbox(W, Hc, D, .42, 4), sc); cs.add(rbox(W + .05, .14, D + .05, .06, 2), sc, { p: [0, Hc / 2 - .1, 0] }); cs.add(rbox(W + .05, .12, D + .05, .05, 2), sc, { p: [0, -Hc / 2 + .12, 0] });
    for (const kx of [-.78, .78]) cs.add(cyl(.2, .2, .55, 16), sc, { p: [kx, Hc / 2 + .02, -D / 2 + .02], r: [0, 0, Math.PI / 2] });
    const sl = it.surface('lid', look({ cell: [140, 112] })), lid = it.part('lid', { p: [0, Hc / 2, -D / 2] });
    lid.add(rbox(W, Hl, D, .6, 4), sl, { p: [0, Hl / 2 + .04, D / 2] }); lid.add(rbox(W + .05, .13, D + .05, .06, 2), sl, { p: [0, .24, D / 2] });
    for (const kx of [-1.5, 0, 1.5]) lid.add(cyl(.2, .2, .95, 16), sl, { p: [kx, .08, .02], r: [0, 0, Math.PI / 2] });
    const si = it.surface('insert', look({ base: '#6a6258', cell: [140, 140] })), ins = it.part('insert', { p: [0, -.1, 0] });
    ins.add(rbox(tw, th, td, .16, 3), si); ins.add(rbox(tw - .2, chH, td - .05, .2, 3), si, { p: [0, chY, 0] }); ins.add(rbox(tw - .1, .1, td + .02, .05, 2), si, { p: [0, chY + chH / 2 - .02, 0] });
    const hole = mat('#0b0807', { roughness: .9 });
    for (const [hx, hy] of [[-1, .22], [0, .22], [1, .22], [-1, -.22], [0, -.22], [1, -.22]]) ins.add(cyl(.15, .15, .03, 14), hole, { p: [hx * .95, chY + hy + .15, (td - .05) / 2 + .005], r: [Math.PI / 2, 0, 0], nohit: true });
    const sp = it.surface('plate', look({ cell: [96, 64] })), pl = it.part('plate', { p: [0, PB, 0] }); pl.add(rbox(tw, .18, td, .07, 2), sp);
    const swh = it.surface('wheel', look({ base: '#5a5048', cell: [64, 64] })), wh = it.part('wheel', { p: [-1.1, -.1 + chY + chH / 2 - .1, 0] });
    wh.add(cyl(.45, .45, .5, 24), swh, { r: [Math.PI / 2, 0, 0] }); for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2; wh.add(box(.07, .07, .5), swh, { p: [Math.cos(a) * .46, Math.sin(a) * .46, 0], r: [0, 0, a] }); }
    const ssh = it.surface('shaft', look({ cell: [48, 64] })), sh = it.part('shaft', { p: [.85, -.1 + chY + chH / 2 + .02, 0] }); sh.add(cyl(.16, .16, .72, 14), ssh); sh.hit(.45, [0, .3, 0]);
    const spn = it.surface('pin', look({ cell: [96, 32] })), pin = it.part('pin', { p: [0, Hc / 2 + .02, -D / 2 + .02] }); pin.add(cyl(.1, .1, W + .2, 12), spn, { r: [0, 0, Math.PI / 2] }); pin.hit(.45, [W / 2 + .1, 0, 0]);
    const smat = metal('#6f6055', .5);
    SCR.forEach((k, i) => { const s = it.part(k, { p: [i ? 1.3 : -1.3, PB - .16, 0] }); s.add(cyl(.2, .2, .1, 14), smat); s.add(box(.34, .02, .05), hole, { p: [0, -.055, 0], nohit: true }); s.add(cyl(.07, .07, .3, 8), smat, { p: [0, .2, 0], nohit: true }); s.hit(.32); });
    const cot = c => mat(c, { roughness: 1 });
    const cotPos = [[-1.15, -.02, 0], [0, -.06, .1], [1.15, -.02, -.05], [-.45, -.12, .2]];
    cotPos.forEach(([x, y, z], i) => {
      const a = it.part('cot' + i, { p: [x, -.1 - th / 2 + y, z] }); a.add(lump(.5, i + 3, 1.15, .75, .9), cot('#b9a77c'));
      a.g.visible = false; a.state = 'hidden';
      const b = it.part('new' + i, { p: [x, -.1 - th / 2 + y, z] }); b.add(lump(.5, i + 3, 1.15, .75, .9), cot('#f6f2e8')); b.g.visible = false; b.state = 'hidden';
    });
    const cav = it.part('cavity', { p: [0, -.1 - th / 2 - .02, 0] }); cav.add(box(tw - .3, .06, td - .25), mat('#2a1a10', { roughness: 1 }), { nohit: true }); cav.g.visible = false; cav.state = 'hidden'; cav.nofit = true;
    /* GenZ logo sticker */
    const tex = canvasTex(256, 128, g => { g.clearRect(0, 0, 256, 128); g.font = '900 78px Lilita One, Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 10; g.strokeStyle = 'rgba(20,12,6,.95)'; g.strokeText('GenZ', 128, 66); g.fillStyle = '#ffe6a0'; g.fillText('GenZ', 128, 66); });
    const logo = it.part('logo', { p: [0, .3, D / 2 + .03] }); logo.add(new THREE.PlaneGeometry(2.2, 1.1), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: .35, metalness: .2, polygonOffset: true, polygonOffsetFactor: -2 }), { cast: false }); logo.g.visible = false; logo.state = 'hidden';
    /* leather wrap panels */
    const lth = it.part('leather', { p: [0, -1.25, 0] }); const lm = mat('#4a2414', { roughness: .62 }), thr = mat('#e6cf9a', { roughness: .8 });
    for (const z of [D / 2 + .045, -(D / 2 + .045)]) { lth.add(rbox(W - .5, 1.5, .09, .04, 2), lm, { p: [0, 0, z] }); for (let i = 0; i < 18; i++) lth.add(box(.13, .035, .03), thr, { p: [-1.6 + i * .19, .6, z + Math.sign(z) * .05], nohit: true }); for (let i = 0; i < 18; i++) lth.add(box(.13, .035, .03), thr, { p: [-1.6 + i * .19, -.6, z + Math.sign(z) * .05], nohit: true }); }
    lth.g.visible = false; lth.state = 'hidden';
    const fl = it.part('flame', { p: [.85, chY + chH / 2 + .45, 0] }); fl.add(lathe([[1e-4, -.12], [.13, 0], [.12, .25], [.06, .5], [1e-4, .72]], 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.5, .4), transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false }), { cast: false, nohit: true }); fl.g.visible = false; fl.state = 'hidden'; fl.nofit = true;
  },
  after(it) {
    for (const k of ASM) { const s = it.parts[k].surf; s.author('rust', (p, n, N) => smooth(.25, .55, N(1.1) * .8 + N(3.5) * .3) * .95); s.author('crust', (p, n, N) => smooth(.55, .75, N(.9) + N(5) * .2)); s.author('dirt', (p, n, N) => .4 * smooth(.3, .7, N(2))); }
    it.extra.defects = [{ key: 'case', p: [-1.0, .9, D / 2], label: 'Dent' }, { key: 'case', p: [1.0, -.9, D / 2], label: 'Pit' }, { key: 'lid', p: [0, Hl / 2, D + .02], label: 'Corner' }, { key: 'insert', p: [0, chY - .3, td / 2], label: 'Pit' }];
    for (const d of it.extra.defects) it.parts[d.key].surf.dab(new THREE.Vector3(...d.p), new THREE.Vector3(0, 0, 1), .38, 'crust', 'add', 1);
  },
  layouts: { board: BOARD, basket: BASKET },
  /* the steps players do; repeats and filler are applied silently (see game.js loadLevel) */
  keep: ['shell', 'cotton', 'hinge', 'wheel', 'grind', 'polish', 'mech', 'newcot', 'paint', 'test'],
  steps(it) {
    const P = () => I().parts, seqs = SEQ;
    const shell = (extra = []) => stage({ home: ASM.concat(SCR, extra), hide: COT.concat(['cavity']) });
    const homeAll = () => stage({ home: ASM.concat(SCR, NEW), hide: COT.concat(['cavity']) });
    const paintSeq = (o) => paint({ cam: { preset: 'full' }, seq: seqs, parts: ASM, rad: .62, req: .8, ...o });
    const lidSet = t => { const L = P().lid, a = lerp(0, LID_OPEN, t), lf = Math.sin(Math.PI * clamp(Math.abs(a) / 1.2, 0, 1)); L.g.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), a); L.g.position.copy(L.home.pos).add(new THREE.Vector3(0, 1.4 * lf, -.4 * lf)); };
    return [
      extract({ id: 'shell', name: 'Remove the Outer Shell', hint: 'Grab the case and slide it straight down off the insert.', done: 'Shell off', chip: 'Shell', cam: { preset: 'full' }, stage: () => shell(),
        items: [{ key: 'case', axis: [0, -1, 0], thr: 3.4, also: ['lid', 'pin'], mk: [0, -1, D / 2], label: 'Slide down' }],
        tut: { title: 'Slide the shell off', body: 'The outer case slides off the metal insert. Drag the case straight down until it comes free.', demo() { const a = pw('case', [0, -1, D / 2]); return { type: 'drag', pts: [a, a.clone().add(new THREE.Vector3(0, -2.8, 0))] }; } } }),
      screws({ id: 'unscrew', name: 'Remove the Bottom Screws', hint: 'Press and hold each screw to turn it out.', done: 'Screws out', keys: SCR, dir: 'out', axis: [0, -1, 0], rise: .6, pose: BOTTOM, cam: { preset: 'work', focus: [0, PB, 0], r: 2.6 }, stage: () => stage({ home: ['insert', 'plate', 'wheel', 'shaft'].concat(SCR), tray: ['case', 'lid', 'pin'] }) }),
      extract({ id: 'plate', name: 'Remove the Bottom Cover', tool: 'pry', hint: 'Pry the bottom plate away from the insert.', done: 'Cover off', pose: BOTTOM, cam: { preset: 'work', focus: [0, PB, 0], r: 2.6 }, chip: 'Cover',
        stage: () => stage({ home: ['insert', 'plate', 'wheel', 'shaft'], tray: ['case', 'lid', 'pin'].concat(SCR) }),
        items: [{ key: 'plate', axis: [0, -1, 0], thr: 1.6, mk: [0, -.1, .3], label: 'Pry', after_() { const it2 = I(); for (const k of COT) it2.home(k, 0); it2.home('cavity', 0); } }],
        tut: { title: 'Pry off the cover', body: 'Hook the pry tool under the bottom plate and drag it away from the insert.', demo() { const a = pw('plate', [0, -.1, .3]); return { type: 'drag', pts: [a, a.clone().add(new THREE.Vector3(0, -1.8, 0))] }; } } }),
      extract({ id: 'cotton', name: 'Remove the Old Cotton', tool: 'tweez', hint: 'Pull out each lump of old cotton with the tweezers.', done: 'Cotton out', pose: BOTTOM, cam: { preset: 'work', focus: [0, PB, 0], r: 2.8 }, chip: 'Cotton',
        stage: () => stage({ home: ['insert', 'wheel', 'shaft', 'cavity'].concat(COT), tray: ['case', 'lid', 'pin', 'plate'].concat(SCR) }),
        items: COT.map(k => ({ key: k, axis: [0, -1, 0], thr: 1.1, to: 'fly', label: '', mr: 24, col: [.75, .7, .55] })),
        tut: { title: 'Pull out the old cotton', body: 'The fuel tank is stuffed with dirty cotton. Pinch each lump and drag it out.', demo() { const x = this.items && this.items.find(i => !i.done); if (!x) return null; const a = pw(x.key); return { type: 'drag', pts: [a, a.clone().add(new THREE.Vector3(0, -1.4, 0))] }; } } }),
      taps({ id: 'hinge', name: 'Remove the Hinge Pin', tool: 'punch', hint: 'Tap the hinge pin three times to knock it out.', done: 'Hinge out', strike: true, hits: 3, pose: HINGE, cam: { preset: 'work', focus: [0, Hc / 2, -D / 2], r: 3 }, chip: 'Pin',
        stage: () => stage({ home: ['case', 'lid', 'pin'], tray: ['insert', 'wheel', 'shaft', 'plate'].concat(SCR), hide: ['cavity'] }),
        targets: () => [{ key: 'pin', p: [W / 2 + .1, 0, 0], label: 'Tap' }],
        onHit(t, n) { const p = P().pin, w = p.wp([W / 2 + .1, 0, 0]); sfx('clink'); sparks(w, 6); puff(w, [.7, .65, .55], 2, { a: .3 }); camImpulse(.4); p.g.position.x = p.home.pos.x + .4 * n; },
        onDone() { const it2 = I(); later(200, () => { it2.toTray('pin'); it2.toTray('lid'); }); } }),
      extract({ id: 'shaft', name: 'Remove the Ignition Shaft', tool: 'pliers', hint: 'Grip the wick shaft and pull it straight up.', done: 'Shaft out', cam: { preset: 'work', focus: [0, chY, 0], r: 3.2 }, chip: 'Shaft',
        stage: () => stage({ home: ['insert', 'wheel', 'shaft'], tray: ['case', 'lid', 'pin', 'plate'].concat(SCR) }),
        items: [{ key: 'shaft', axis: [0, 1, 0], thr: 1.9, mk: [0, .3, 0], label: 'Pull up' }] }),
      extract({ id: 'wheel', name: 'Remove the Flint Wheel', tool: 'pliers', hint: 'Pinch the flint wheel and lift it out.', done: 'Wheel out', cam: { preset: 'work', focus: [0, chY, 0], r: 3.2 }, chip: 'Wheel',
        stage: () => stage({ home: ['insert', 'wheel'], tray: ['case', 'lid', 'pin', 'plate', 'shaft'].concat(SCR) }),
        items: [{ key: 'wheel', axis: [0, 1, 0], thr: 1.9, label: 'Pull up' }] }),
      paintSeq({ id: 'brush', name: 'Brush Off the Loose Rust', tool: 'wire', hint: 'Scrub each part. They come one group at a time and turn by themselves.', done: 'Loose rust gone', layer: 'rust', amt: .5, fx: 'rust', snd: 'wire', sndGap: 55,
        tut: { title: 'Brush each part', body: 'The parts are cleaned one group at a time. Scrub the orange rust off with the wire brush.' } }),
      paintSeq({ id: 'blast', name: 'Sandblast the Parts', tool: 'sandgun', hint: 'Sweep the sandblaster over each part to blast off the crust.', done: 'Crust blasted', layer: 'crust', amt: .55, fx: 'blast', snd: 'sand', also: [{ layer: 'rust', amt: .6, finish: 0 }, { layer: 'dirt', amt: .5, finish: 0 }], need: .2,
        tut: { title: 'Sandblast the crust', body: 'Sweep the sandblaster over each part. The abrasive jet strips the thick brown crust down to matte metal.' } }),
      bath({ id: 'dip', kind: 'jar', name: 'Chemical Clean Small Parts', hint: 'Drag the basket of parts down into the cleaning jar.', done: 'Parts submerged', liquid: '#4f9aa2', murk: '#3a2614', dipOnly: true, stay: true,
        stage: () => stage({ layout: 'basket', tray: [] }), cam: { preset: 'full' } }),
      bath({ id: 'swirl', kind: 'jar', name: 'Rotate the Cleaning Jar', hint: 'Swipe in circles over the jar to tumble the parts.', done: 'Parts cleaned', liquid: '#4f9aa2', murk: '#3a2614', swirl: true, startIn: true, turns: 2.4, chip: 'Swirl',
        stage: () => stage({ layout: 'basket' }), cam: { preset: 'full' },
        onDone() { for (const k of ASM) { const s = P()[k].surf; s.setLayer('residue', 1); s.setLayer('rust', 0); s.setLayer('crust', 0); s.setLayer('dirt', 0); } },
        tut: { title: 'Swirl the jar', body: 'Swipe in circles over the jar. The parts tumble in the cleaner and the liquid turns murky as the grime comes off.' } }),
      paintSeq({ id: 'rinse', name: 'Rinse the Components', tool: 'water', hint: 'Rinse the black residue off every part.', done: 'Parts rinsed', layer: 'residue', amt: .55, fx: 'water', snd: 'soap', sndGap: 100,
        enter() { for (const k of ASM) P()[k].surf.setLayer('wet', .6); } }),
      paintSeq({ id: 'dry', name: 'Dry the Components', tool: 'cloth', input: 'Wipe', hint: 'Wipe every part dry with the cloth.', done: 'Parts dry', layer: 'wet', amt: .6, fx: 'wipe', snd: 'wipe', need: .2, doneV: .12 }),
      hold({ id: 'grind', name: 'Sand the Damaged Spots', tool: 'grind', spin: true, hint: 'Press the sanding wheel on each marked flaw and hold.', done: 'Flaws smoothed', cam: { preset: 'full' }, time: 1.1, chip: 'Flaws',
        stage: () => stage({ layout: 'board' }), parts: () => ['case', 'lid', 'insert'],
        spots: () => it.extra.defects.map(d => ({ ...d, r: .7, onProg: k => P()[d.key].surf.dab(new THREE.Vector3(...d.p), new THREE.Vector3(0, 0, 1), .45, 'crust', 'sub', .1 + k * .3) })) }),
      paintSeq({ id: 'sand', name: 'Sand the Components', tool: 'sand', hint: 'Sand each part smooth.', done: 'Parts smooth', layer: 'sand', mode: 'add', amt: .5, fx: 'sand', snd: 'sand', also: [{ layer: 'crust', amt: 1, finish: 0 }] }),
      paintSeq({ id: 'shiner', name: 'Apply the Shiner', tool: 'shiner', hint: 'Spread the shining paste over every part.', done: 'Shiner applied', layer: 'polish', mode: 'add', amt: .3, fx: 'polish', snd: 'soap', doneV: .35, to: .55 }),
      paint({ id: 'polish', name: 'Polish the Main Body', tool: 'buff', input: 'Circles', hint: 'Buff the parts in circles until they gleam.', done: 'Parts gleaming', cam: { preset: 'full' }, stage: () => stage({ layout: 'board' }),
        parts: ASM, layer: 'polish', mode: 'add', amt: .45, rad: .62, fx: 'polish', snd: 'polish', circles: true, req: .8 }),
      bath({ id: 'elec', kind: 'tank', name: 'Electrolysis Treatment', hint: 'Lower the parts into the tank, clip on red and black, then hold the button.', done: 'Treatment complete', liquid: '#3d8a92', murk: '#456a70', clips: true, time: 3,
        stage: () => stage({ layout: 'basket' }), cam: { preset: 'full' },
        tut: { title: 'Electrolysis', body: 'Drag the parts down into the tank, tap the red and the black clip, then hold the button to run the current.' } }),
      snap({ id: 'mech', name: 'Reassemble the Mechanism', hint: 'Drag the flint wheel and the shaft back into the insert.', done: 'Mechanism assembled', keys: ['wheel', 'shaft'], cam: { preset: 'full' },
        stage: () => stage({ home: ['insert'], tray: ['wheel', 'shaft'], hide: ['case', 'lid', 'pin', 'plate'].concat(SCR) }) }),
      snap({ id: 'newcot', name: 'Install Fresh Cotton', tool: 'tweez', hint: 'Pack the fresh white cotton into the tank.', done: 'Cotton installed', keys: NEW, pose: BOTTOM, cam: { preset: 'work', focus: [0, PB, 0], r: 2.8 },
        stage: () => stage({ home: ['insert', 'wheel', 'shaft', 'cavity'], tray: NEW }) }),
      snap({ id: 'panel', name: 'Install the Bottom Panel', hint: 'Slide the shiny bottom plate back on.', done: 'Panel on', keys: ['plate'], pose: BOTTOM, cam: { preset: 'work', focus: [0, PB, 0], r: 2.8 },
        stage: () => stage({ home: ['insert', 'wheel', 'shaft', 'cavity'].concat(NEW), tray: ['plate'] }), exit() { I().hide('cavity'); } }),
      screws({ id: 'tighten', name: 'Tighten the Bottom Screws', hint: 'Press and hold each screw to drive it in.', done: 'Screws tight', keys: SCR, dir: 'in', axis: [0, -1, 0], rise: .6, pose: BOTTOM, cam: { preset: 'work', focus: [0, PB, 0], r: 2.6 },
        stage: () => stage({ home: ['insert', 'wheel', 'shaft', 'plate'].concat(NEW), hide: ['cavity'] }) }),
      snap({ id: 'rehinge', name: 'Reattach the Shell', hint: 'Slide the case on, set the lid, then drop in the pin.', done: 'Shell locked', keys: ['case', 'lid', 'pin'], ordered: true, cam: { preset: 'full' },
        stage: () => stage({ home: ['insert', 'wheel', 'shaft', 'plate'].concat(NEW, SCR), tray: ['case', 'lid', 'pin'] }) }),
      snap({ id: 'logo', name: 'Apply the GenZ Logo', hint: 'Drag the sticker onto the front of the case.', done: 'Logo applied', keys: ['logo'], cam: { preset: 'full' },
        stage: () => homeAll(),
        onPlace() { glints(pw('logo'), 12, .8); sfx('stamp'); } }),
      paint({ id: 'paint', name: 'Spray the GenZ Finish', tool: 'paint', input: 'Sweep', hint: 'Spray an even coat over the case and lid.', done: 'Body painted', cam: { preset: 'full' }, stage: () => homeAll(),
        enter() { STREAM_COL.paint = [.16, .5, .54]; }, exit() { STREAM_COL.paint = null; },
        parts: ['case', 'lid'], layer: 'finish', mode: 'add', amt: .55, rad: .6, fx: 'paint', snd: 'soap', sndGap: 120, req: .82, canTurn: true }),
      snap({ id: 'leather', name: 'Wrap the Leather Grip', hint: 'Drag the stitched leather onto the case.', done: 'Leather wrapped', keys: ['leather'], cam: { preset: 'full' }, stage: () => homeAll() }),
      paint({ id: 'wipe', name: 'Final Wipe', tool: 'micro', input: 'Wipe', hint: 'Wipe away dust and fingerprints.', done: 'Spotless', cam: { preset: 'full' }, stage: () => homeAll(), canTurn: true,
        enter() { for (const k of ['case', 'lid']) { const s = P()[k].surf; s.author('dirt', (p, n, N) => .45 * smooth(.45, .7, N(2.6))); s.u.uDirtC.value.set('#c9c3b8'); } },
        parts: ['case', 'lid'], layer: 'dirt', amt: .6, rad: .65, fx: 'wipe', snd: 'wipe', req: .8, need: .15, doneV: .1,
        exit() { for (const k of ['case', 'lid']) { P()[k].surf.setLayer('dirt', 0); P()[k].surf.u.uDirtC.value.set('#4e3d2c'); } } }),
      cycle({ id: 'test', name: 'Lid Motion Check', hint: 'Flip the lid open, then snap it shut. Do it twice.', done: 'Works perfectly', key: 'lid', tip: [0, Hl, D], cycles: 2, cam: { preset: 'full' }, stage: () => homeAll(), openSnd: 'click', closeSnd: 'latch',
        set: lidSet,
        onOpen() { const f = P().flame; f.g.visible = true; f.state = 'home'; sfx('whoosh'); later(1300, () => { f.g.visible = false; f.state = 'hidden'; }); },
        exit() { lidSet(0); P().flame.g.visible = false; } }),
      compare({ stage: () => homeAll() })
    ];
  }
};
