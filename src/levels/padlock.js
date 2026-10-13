/* Level 01 - Padlock: freeing a seized mechanism and polishing a compact brass lock */
import * as THREE from 'three';
import { rbox, cyl, tube, mesh, mat, metal, box, lump, sphere } from '../assets/geo.js';
import { paint, pick, extract, screws, snap, bath, cycle, compare, stage, chunksOn, I, lp } from '../game/systems/index.js';
import { G } from '../game/game.js';
import { clamp, smooth } from '../core/util.js';

const BW = 3, BH = 2.6, BD = 1.2, LEG = .85, SR = .19;
const DARK = mat('#0c0907', { roughness: .9 });

export default {
  id: 'padlock', num: 1, name: 'Rusty Padlock', complexity: 'Easy', minutes: '3-4 min', seed: 11,
  blurb: 'Seized brass lock', intro: 'A brass padlock left out in the rain for decades. The shackle is rusted solid. Free it, clean it and make it click again.',
  outro: 'A seized lump of rust is now a gleaming brass padlock that clicks shut like new.',
  pose: [-.42, .22], turnAxis: 'y',
  build(it, r) {
    const sb = it.surface('body', { kind: 'metal', base: '#5e4d33', baseR: .72, baseM: .55, sand: '#c49a52', sandR: .38, pol: '#f0c46a', polR: .07, dirt: '#6a573f', rust1: '#3a1608', rust2: '#9a4614', cell: [128, 112] });
    const body = it.part('body');
    body.add(rbox(BW, BH, BD, .24, 4), sb);
    body.add(rbox(1.7, .52, .08, .05, 2), sb, { p: [0, .48, BD / 2] });
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) body.add(sphere(.07, 10, 8), sb, { p: [sx * 1.2, sy * 1.0, BD / 2 - .01] });
    body.add(rbox(BW - .2, .05, BD + .02, .02, 1), sb, { p: [0, -.55, 0] });
    body.add(rbox(BW - .2, .05, BD + .02, .02, 1), sb, { p: [0, .02, 0] });
    /* keyhole */
    body.add(cyl(.13, .13, .04, 20), DARK, { p: [0, -.62, BD / 2 + .005], r: [Math.PI / 2, 0, 0], nohit: true });
    body.add(box(.11, .36, .04), DARK, { p: [0, -.82, BD / 2 + .005], nohit: true });
    body.add(cyl(.21, .21, .03, 24), metal('#3a2c1c', .5), { p: [0, -.68, BD / 2 + .002], r: [Math.PI / 2, 0, 0], nohit: true });
    /* shackle holes + bottom cavity */
    for (const sx of [-1, 1]) body.add(cyl(SR + .04, SR + .04, .02, 18), DARK, { p: [sx * LEG, BH / 2 + .003, 0], nohit: true });
    body.add(box(BW - .7, .02, BD - .45), DARK, { p: [0, -BH / 2 - .004, 0], nohit: true });
    /* shackle */
    const ss = it.surface('shackle', { kind: 'metal', base: '#4c4c4a', baseR: .65, sand: '#b5b9bc', pol: '#e6eaee', polR: .06, cell: [112, 96] });
    const sh = it.part('shackle');
    const pts = [[-LEG, .55, 0], [-LEG, 1.6, 0]]; for (let i = 0; i <= 12; i++) { const a = Math.PI - i / 12 * Math.PI; pts.push([Math.cos(a) * LEG, 2.25 + Math.sin(a) * LEG, 0]); } pts.push([LEG, 1.6, 0], [LEG, .95, 0]);
    sh.add(tube(pts, SR, 96, 14), ss);
    for (const sx of [-1, 1]) sh.add(cyl(SR, SR, .02, 14), ss, { p: [sx * LEG, sx < 0 ? .55 : .95, 0] });
    /* bottom plate + screws */
    const sp = it.surface('plate', { kind: 'metal', base: '#4a4844', sand: '#aeb2b6', pol: '#dfe3e6', cell: [96, 64] });
    const plate = it.part('plate', { p: [0, -BH / 2 - .06, 0] });
    plate.add(rbox(BW - .3, .1, BD - .2, .04, 2), sp);
    const smat = metal('#6f6255', .5);
    for (let i = 0; i < 2; i++) { const s = it.part('screw' + i, { p: [(i ? 1 : -1) * 1.05, -BH / 2 - .13, 0] }); s.add(cyl(.14, .12, .07, 16), smat); s.add(box(.24, .025, .04), DARK, { p: [0, -.036, 0], nohit: true }); s.add(cyl(.05, .05, .4, 8), smat, { p: [0, .22, 0], nohit: true }); s.hit(.26); }
    /* debris hidden in the cavity */
    const dm = mat('#3b2c1e', { roughness: 1 });
    it.extra.debris = [[-.8, .05], [-.25, -.12], [.3, .1], [.85, -.05], [.05, .18]].map(([x, z], i) => { const m = mesh(lump(.13 + (i % 2) * .04, i + 5, 1.2, .6, 1), dm); m.position.set(x, -BH / 2 + .02, z); body.g.add(m); m.userData.part = body; m.visible = false; return { m, surf: sb, p: m.position.clone(), n: new THREE.Vector3(0, -1, 0), size: .2 }; });
  },
  after(it) {
    const S = { body: it.parts.body.surf, shackle: it.parts.shackle.surf, plate: it.parts.plate.surf };
    /* authored grime */
    S.body.author('rust', (p, n, N) => smooth(.32, .62, N(1.3) * .9 + N(4) * .3 + (p.y < -.6 ? .15 : 0)) * .95);
    S.body.author('dirt', (p, n, N) => .25 + .6 * smooth(.35, .7, N(2.2) + (n.y < -.5 ? .3 : 0)));
    S.shackle.author('rust', (p, n, N) => smooth(.2, .55, N(2) * .8 + (p.y < 1.6 ? .35 : 0)));
    S.shackle.author('dirt', (p, n, N) => .6 * smooth(.3, .7, N(3)));
    S.plate.author('rust', (p, n, N) => smooth(.3, .6, N(2.5) + .1)); S.plate.author('dirt', () => .8);
    it.extra.chunks = chunksOn(it, 'body', 5, { size: .26, filter: (p, n) => Math.abs(n.z) > .6 && Math.abs(p.x) < 1.25 && p.y > -1 && p.y < 1.05 });
    it.extra.chunks.push(...chunksOn(it, 'shackle', 2, { size: .18, filter: p => p.y > 1.7 }));
  },
  layouts: { parts: { shackle: { p: [2.25, .2, .3], r: [0, .2, -.25], s: .85 }, plate: { p: [0, -2.15, .5], r: [.9, 0, 0], s: .85 } } },
  steps(it) {
    const P = it.parts, metals = ['body', 'shackle'];
    return [
      paint({
        id: 'spray', name: 'Apply Penetrating Fluid', tool: 'spray', input: 'Sweep', hint: 'Spray the shackle and the top seam so the fluid soaks into the rust.', done: 'Fluid soaking in', cam: { preset: 'work', focus: [0, 1.3, 0], r: 2.3 },
        parts: metals, layer: 'wet', mode: 'add', amt: .55, rad: .42, fx: 'spray', snd: 'soap', sndGap: 140, req: .85, region: (p, c, k) => k === 'shackle' ? p.y < 1.9 : p.y > .6,
        tut: { title: 'Penetrating fluid first', body: 'Sweep the spray over the shackle legs and the top of the body. The wet sheen shows where the fluid has soaked in.', demo() { return { type: 'scrub', pts: [lp('shackle', [-LEG, 1.4, .3]), lp('shackle', [LEG, 1.4, .3])] }; } }
      }),
      pick({
        id: 'pick', name: 'Pick Off Heavy Rust', tool: 'pick', hint: 'Scratch each crusty lump until it breaks away.', done: 'Crust cleared', cam: { preset: 'full' }, canTurn: true,
        items: () => it.extra.chunks, chip: 'Lumps', layer: 'crust',
        tut: { title: 'Chip off the crust', body: 'Thick lumps of rust cling to the lock. Drag the pick across a lump to break it off. Turn the lock to find the ones on the back.', demo() { const c = it.extra.chunks.find(c => !c.gone); if (!c) return null; const w = c.m.getWorldPosition(new THREE.Vector3()); return { type: 'scrub', pts: [w.clone().add(new THREE.Vector3(-.25, 0, 0)), w.clone().add(new THREE.Vector3(.25, 0, 0))] }; } }
      }),
      paint({
        id: 'brush', name: 'Brush Loose Corrosion', tool: 'wire', hint: 'Scrub the orange rust away. The lock turns over by itself when one side is done.', done: 'Loose rust gone', cam: { preset: 'full' },
        parts: metals, layer: 'rust', amt: .5, rad: .4, fx: 'rust', snd: 'wire', sndGap: 55, req: .8, also: [{ layer: 'crust', amt: .6 }],
        tut: { title: 'Brush off the rust', body: 'Scrub back and forth with the wire brush. Watch the orange rust give way to dark metal.', demo() { return { type: 'scrub', pts: [lp('body', [-1, .4, BD / 2]), lp('body', [1, -.3, BD / 2])] }; } }
      }),
      extract({
        id: 'shackle', name: 'Free the Stuck Shackle', hint: 'Pull the shackle straight up. Keep pulling until it breaks free.', done: 'Shackle free!', cam: { preset: 'full' }, chip: 'Shackle',
        items: [{ key: 'shackle', axis: [0, 1, 0], thr: 1.5, resist: true, mk: [0, 2.9, 0], label: 'Pull up', snd: 'pop' }],
        tut: { title: 'Free the shackle', body: 'The shackle is rusted in place. Drag it up and hold the pull. It fights back, then pops free.', demo() { const a = lp('shackle', [0, 2.9, 0]); return { type: 'drag', pts: [a, a.clone().add(new THREE.Vector3(0, 1.6, 0))] }; } }
      }),
      screws({
        id: 'screws', name: 'Open the Bottom Plate', hint: 'Press and hold each screw until it backs out.', done: 'Plate released', keys: ['screw0', 'screw1'], dir: 'out', axis: [0, -1, 0], rise: .45, pose: [-.35, -1.1], cam: { preset: 'work', focus: [0, -1.3, 0], r: 2.1 },
        stage: () => stage({ home: ['plate', 'screw0', 'screw1'], hide: [] }),
        complete() { I().toTray('plate'); for (const d of it.extra.debris) d.m.visible = true; },
        tut: { title: 'Unscrew the plate', body: 'Two screws hold the bottom plate. Press and hold the screwdriver on each one until it spins out.', demo() { return { type: 'hold', pts: [lp('screw0')] }; } }
      }),
      pick({
        id: 'debris', name: 'Extract Internal Debris', tool: 'tweez', grab: true, hint: 'Tap each clump of dirt to pull it out with the tweezers.', done: 'Mechanism clear', pose: [-.35, -1.1], cam: { preset: 'work', focus: [0, -1.3, 0], r: 2.1 }, chip: 'Debris', layer: 'dirt',
        items: () => it.extra.debris, enter() { for (const d of it.extra.debris) d.m.visible = !d.gone; },
        tut: { title: 'Pull out the debris', body: 'Dirt and rust flakes are packed inside. Tap each clump and the tweezers lift it out into the tray.', demo() { const d = it.extra.debris.find(x => !x.gone); return d ? { type: 'tap', pts: [d.m.getWorldPosition(new THREE.Vector3())] } : null; } }
      }),
      bath({
        id: 'bath', kind: 'tank', name: 'Deep Clean the Body', hint: 'Drag the lock down into the tank, then hold the button.', done: 'Grime dissolved', liquid: '#3f8c95', murk: '#5a3a1c', time: 3.2, depth: 3.1,
        onProg(k) { for (const s of it.surfs) s.u.uDirtRO.value.y = 1 - k; },
        onDone() { for (const s of it.surfs) { s.setLayer('dirt', 0); s.setLayer('wet', 0); s.u.uDirtRO.value.y = 1; } },
        tut: { title: 'Soak it clean', body: 'Press on the lock and drag it down into the cleaning tank. Then press and hold the button while the bubbles lift the grime.' }
      }),
      paint({
        id: 'polish', name: 'Polish the Metal', tool: 'buff', input: 'Circles', hint: 'Buff in small circles until the brass shines.', done: 'Brass gleaming', cam: { preset: 'full' },
        stage: () => stage({ layout: 'parts' }),
        parts: ['body', 'shackle', 'plate'], layer: 'polish', mode: 'add', amt: .5, rad: .45, fx: 'polish', snd: 'polish', circles: true, req: .8, also: [{ layer: 'sand', mode: 'add', amt: .6, finish: 1 }, { layer: 'rust', amt: 1, finish: 0 }, { layer: 'crust', amt: 1, finish: 0 }],
        enter() { this.toolSpin = true; },
        update() { },
        tut: { title: 'Buff to a shine', body: 'Move the buffing wheel in small circles. Circles polish faster than straight strokes. The shackle and plate are laid out next to the lock.', demo() { return { type: 'circle', pts: [lp('body', [0, .2, BD / 2])] }; } }
      }),
      snap({
        id: 'assemble', name: 'Reassemble the Padlock', hint: 'Drag each part from the tray to its glowing outline.', done: 'Lock assembled', keys: ['plate', 'screw0', 'screw1', 'shackle'], ordered: true, cam: { preset: 'full' },
        stage: () => stage({ tray: ['plate', 'shackle', 'screw0', 'screw1'] })
      }),
      cycle({
        id: 'check', name: 'Final Lock Check', hint: 'Pull the shackle open, then push it shut. Do it twice.', done: 'Opens and locks smoothly', key: 'shackle', tip: [LEG, 2.6, 0], cycles: 2, cam: { preset: 'full' }, closeSnd: 'latch',
        set(t) { const S = I().parts.shackle, rise = smooth(0, .5, t) * .75, rot = smooth(.5, 1, t) * -1.6; S.g.position.copy(S.home.pos).add(new THREE.Vector3(-LEG, rise, 0)); S.g.quaternion.copy(S.home.quat).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rot)); S.g.position.add(new THREE.Vector3(LEG, 0, 0).applyQuaternion(S.g.quaternion)); }
      }),
      compare({})
    ];
  }
};
