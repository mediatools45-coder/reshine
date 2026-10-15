/* Level 03 - Sword: large-scale corrosion removal and a dramatic polished blade reveal (ported from v12, 16 steps) */
import * as THREE from 'three';
import { lathe, cyl, box, mesh, mat, metal, lump } from '../assets/geo.js';
import { paint, pick, extract, snap, hold, bath, taps, timing, inspect, compare, stage, chunksOn, I, lp, toast } from '../game/systems/index.js';
import { G, RIG, camImpulse } from '../game/game.js';
import { sfx } from '../fx/audio.js';
import { sparks, puff, flakes, glints } from '../fx/particles.js';
import { smooth, lerp, clamp, later, tween } from '../core/util.js';

const BL = { x0: .1, L: 7.3, hwRoot: .46, hwMid: .42, T: .085, NU: 24, NV: 150 };
const NOTCH = { v: .43, w: .022, depth: .11 };
const GRIP = { x0: -.2, rivets: [.62, 1.22, 1.82] };
function halfW(v) { const hw = lerp(BL.hwRoot, BL.hwMid, Math.min(v / .8, 1)); if (v <= .8) return hw; const t = (v - .8) / .2; return hw * Math.pow(Math.max(0, 1 - t * t), .55); }
function profile(s, v) { const bev = s < .55 ? 1 : Math.pow(Math.max(0, 1 - (s - .55) / .45), .85); const fl = smooth(0, .08, v) * (1 - smooth(.62, .8, v)); const groove = (1 - smooth(.1, .26, s)) * .45 * fl; return bev * (1 - groove); }
/* closed lens-section blade along +X, width on Y, thickness on Z */
function bladeGeom() {
  const { NU, NV } = BL, n = (NU + 1) * (NV + 1), pos = new Float32Array(n * 2 * 3), uv = new Float32Array(n * 2 * 2), idx = [];
  for (let f = 0; f < 2; f++) {
    for (let j = 0; j <= NV; j++) for (let i = 0; i <= NU; i++) { const o = f * n + j * (NU + 1) + i; uv[o * 2] = i / NU; uv[o * 2 + 1] = j / NV; }
    for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) { const a = f * n + j * (NU + 1) + i, b = a + 1, c = a + NU + 1, d = c + 1; if (f === 0) idx.push(a, b, c, b, d, c); else idx.push(a, c, b, b, c, d); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx);
  setNotch(g, 1); return g;
}
function setNotch(g, notch) {
  const { NU, NV, L, x0, T } = BL, n = (NU + 1) * (NV + 1), P = g.attributes.position.array;
  for (let f = 0; f < 2; f++) for (let j = 0; j <= NV; j++) {
    const v = j / NV, x = x0 + v * L, hw = halfW(v), tv = T * (1 - .45 * v) * (1 - smooth(.86, 1, v) * .75);
    const nb = Math.max(0, 1 - Math.pow((v - NOTCH.v) / NOTCH.w, 2)), cut = notch * NOTCH.depth * nb;
    for (let i = 0; i <= NU; i++) { const u = i / NU, ys = (u - .5) * 2, s = Math.abs(ys), hwy = ys > 0 ? Math.max(.02, hw - cut) : hw, o = (f * n + j * (NU + 1) + i) * 3; P[o] = x; P[o + 1] = ys * hwy; P[o + 2] = (f ? -1 : 1) * Math.max(.0015, tv * profile(s, v)); }
  }
  g.attributes.position.needsUpdate = true; g.computeVertexNormals(); g.computeBoundingBox(); g.computeBoundingSphere();
}
const GUARD = [[1e-4, -1.27], [.1, -1.25], [.2, -1.18], [.225, -1.08], [.17, -.98], [.115, -.9], [.105, -.8], [.12, -.5], [.135, -.3], [.2, -.23], [.225, -.14], [.225, .14], [.2, .23], [.135, .3], [.12, .5], [.105, .8], [.115, .9], [.17, .98], [.225, 1.08], [.2, 1.18], [.1, 1.25], [1e-4, 1.27]];
function gripGeom() {
  const pr = [[1e-4, 0], [.205, 0, 1], [.24, .02], [.245, .08], [.215, .11, 1], [.205, .13]];
  for (let y = .16; y <= 2.2; y += .035) { const t = (y - .13) / 2.07; pr.push([.205 + .035 * Math.sin(Math.PI * t) + .01 * Math.max(0, Math.sin(y * 31)), y]); }
  pr.push([.215, 2.23], [.245, 2.27, 1], [.265, 2.33], [.295, 2.42], [.3, 2.5], [.26, 2.6], [.17, 2.66], [1e-4, 2.68]);
  return lathe(pr, 30);
}
const nailGeom = () => lathe([[1e-4, -.31], [.062, -.31, 1], [.062, -.28, 1], [.035, -.28], [.035, .26], [.078, .26, 1], [.078, .295], [.05, .315], [1e-4, .32]], 14);
const rivX = i => GRIP.x0 - GRIP.rivets[i];
const bladeW = (v, side = 1, f = 1) => [BL.x0 + v * BL.L, side * .15, f * .06];

export default {
  id: 'sword', num: 3, name: 'Rusty Longsword', complexity: 'Medium', minutes: '5-6 min', seed: 31,
  blurb: 'Corroded relic', intro: 'A longsword pulled from a flooded cellar, crusted in rust with a rotten grip. Strip it, grind out the damage and bring back a mirror blade.',
  outro: 'From a crusty relic to a showroom blade that throws back the workshop lights.',
  pose: [-.15, .18], turnAxis: 'x', portraitRoll: 1.05, toolScale: 1,
  build(it) {
    const metalLook = { kind: 'metal', base: '#4f4c49', baseR: .7, sand: '#b8bcc0', sandR: .38, pol: '#eef1f4', polR: .04, dirt: '#4a3524', rust1: '#3a1608', rust2: '#9a4614' };
    const sb = it.surface('blade', { ...metalLook, cell: [256, 48] });
    const blade = it.part('blade'); it.extra.bladeMesh = blade.add(bladeGeom(), sb);
    const sg = it.surface('guard', { ...metalLook, cell: [64, 128] });
    const guard = it.part('guard'); guard.add(lathe(GUARD, 28), sg, { s: [1, 1, 1.4] });
    const st = it.surface('tang', { ...metalLook, cell: [128, 48] });
    const tang = it.part('tang'); tang.add(box(2.5, .34, .09), st, { p: [-1.25, 0, 0] });
    for (let i = 0; i < 3; i++) tang.add(cyl(.05, .05, .1, 12), mat('#0b0806'), { p: [rivX(i), 0, 0], r: [Math.PI / 2, 0, 0], nohit: true });
    const sw = it.surface('grip', { kind: 'wood', base: '#7a6248', baseR: .9, sand: '#c9a477', fin: '#6a2a0e', finR: .3, finCC: .6, grain: [1, 0, 0], grainS: 3, dirt: '#3a2a1c', cell: [192, 64] });
    const grip = it.part('grip'); grip.add(gripGeom(), sw, { p: [GRIP.x0, 0, 0], r: [0, 0, Math.PI / 2] });
    const rust = metal('#6b4a36', .75, { metalness: .4 }), brass = metal('#d6a64a', .22);
    for (let i = 0; i < 3; i++) {
      const r = it.part('rivet' + i, { p: [rivX(i), 0, 0] }); r.add(nailGeom(), rust, { r: [Math.PI / 2, 0, 0] }); r.hit(.2, [0, 0, .3]);
      const b = it.part('brass' + i, { p: [rivX(i), 0, 0] }); b.add(nailGeom(), brass, { r: [Math.PI / 2, 0, 0] }); b.hit(.2, [0, 0, .3]); b.g.visible = false; b.state = 'hidden';
    }
    const blob = it.part('weld', { p: [-.02, .62, .2] }); blob.add(lump(.15, 99, 1.1, 1, .6), metal('#7d848b', .55)); blob.nofit = true;
  },
  after(it) {
    const P = it.parts;
    for (const k of ['blade', 'guard', 'tang']) { const s = P[k].surf; s.author('rust', (p, n, N) => smooth(.18, .48, N(1.2) * .8 + N(4) * .3) * .98); s.author('dirt', (p, n, N) => .5 * smooth(.35, .7, N(2))); }
    P.grip.surf.author('dirt', (p, n, N) => .45 + .5 * smooth(.3, .7, N(2.4)));
    it.extra.chunks = chunksOn(it, 'blade', 7, { size: .2, filter: (p, n) => Math.abs(n.z) > .7 && p.x > .5 && p.x < 6.8 && Math.abs(p.y) < .3 });
    it.extra.chunks.push(...chunksOn(it, 'guard', 1, { size: .15, filter: (p, n) => n.z > .6 }));
    P.blade.surf.dab(new THREE.Vector3(BL.x0 + .58 * BL.L, -.1, -.05), new THREE.Vector3(0, 0, -1), .25, 'crust', 'add', 1);
  },
  layouts: { stain: { grip: { p: [-1.5, -1.6, .4], r: [0, 0, Math.PI / 2], s: 1.2 } } },
  /* the steps players do; repeats and filler are applied silently (see game.js loadLevel) */
  keep: ['rivets', 'handle', 'chip', 'wash', 'grind', 'file', 'polish', 'stain', 'attach', 'secure'],
  steps(it) {
    const metals = ['blade', 'guard', 'tang'], P = () => I().parts;
    const RIV = [0, 1, 2];
    return [
      taps({
        id: 'rivets', name: 'Knock Out the Rivets', tool: 'hammer', hint: 'Tap each rivet head twice to drive it out of the handle.', done: 'Rivets out', strike: true, hits: 2, chip: 'Rivets', cam: { preset: 'work', focus: [-1.4, 0, 0], r: 1.9 },
        targets: () => RIV.map(i => ({ key: 'rivet' + i, p: [0, 0, .32], label: '' })),
        onHit(t, n) { const R_ = P()[t.key]; camImpulse(.5); sfx('clink'); const w = R_.wp([0, 0, .3]); sparks(w, 7); puff(w, [.7, .6, .5], 3, { a: .35 }); R_.g.position.z = R_.home.pos.z - .15 * n; },
        onDone(t) { const R_ = P()[t.key]; sfx('pop'); flakes(R_.wp(), 8); R_.g.visible = false; R_.state = 'hidden'; },
        tut: { title: 'Knock out the rivets', body: 'Three rusty rivets pin the grip to the tang. Tap each rivet head with the hammer. Two taps drive it out.' }
      }),
      extract({
        id: 'handle', name: 'Pull Off the Handle', hint: 'Grab the grip and slide it straight off the tang.', done: 'Handle off', chip: 'Grip', cam: { preset: 'full' },
        items: [{ key: 'grip', axis: [-1, 0, 0], thr: 2.6, mk: [-1.4, 0, .25], label: 'Slide off' }],
        tut: { title: 'Pull off the handle', body: 'With the rivets gone the grip is loose. Drag it away from the guard until it slides off the tang.', demo() { const a = lp('grip', [-1.4, 0, .25]); return { type: 'drag', pts: [a, lp('grip', [-4, 0, .25])] }; } }
      }),
      paint({
        id: 'brush', name: 'Wire-Brush the Loose Rust', tool: 'wire', hint: 'Scrub with long strokes. The sword flips over when one side is done.', done: 'Loose rust gone', cam: { preset: 'full' },
        parts: metals, layer: 'rust', amt: .5, rad: .42, fx: 'rust', snd: 'wire', sndGap: 55, req: .8, also: [{ layer: 'dirt', amt: .5 }],
        tut: { title: 'Brush off the loose rust', body: 'Scrub the wire brush over the orange rust with long strokes along the blade. It turns over by itself when one side is clean.', demo() { return { type: 'scrub', pts: [lp('blade', bladeW(.1)), lp('blade', bladeW(.75))] }; } }
      }),
      pick({
        id: 'chip', name: 'Pick Off the Deep Rust', tool: 'pick', hint: 'Scratch each crusty lump until it breaks off.', done: 'Crust cleared', canTurn: true, cam: { preset: 'full' }, items: () => it.extra.chunks, chip: 'Lumps', layer: 'crust',
        tut: { title: 'Chip off the crust', body: 'Thick clusters of rust survived the brush. Drag the pick across each lump to break it away.', demo() { const c = it.extra.chunks.find(c => !c.gone); if (!c) return null; const w = c.m.getWorldPosition(new THREE.Vector3()); return { type: 'scrub', pts: [w.clone().add(new THREE.Vector3(-.25, 0, 0)), w.clone().add(new THREE.Vector3(.25, 0, 0))] }; } }
      }),
      bath({
        id: 'bath', kind: 'tank', name: 'Deep Clean the Blade', hint: 'Lower the sword into the tank, then hold the button to run the treatment.', done: 'Rust converted', liquid: '#2f7f86', murk: '#3a2a1a', time: 3.6,
        onProg(k) { for (const k2 of metals) P()[k2].surf.u.uResG.value = k; },
        onDone() { for (const k2 of metals) { const s = P()[k2].surf; s.u.uResG.value = 0; s.setLayer('residue', 1); s.setLayer('rust', 0); s.setLayer('crust', 0); s.setLayer('dirt', 0); } },
        tut: { title: 'The rust bath', body: 'Drag the sword down into the electrolysis tank. Then hold the button: bubbles stream off the blade as the rust turns into a soft black film.' }
      }),
      paint({
        id: 'wash', name: 'Wash Off the Residue', tool: 'soap', hint: 'Scrub the black film away with the soapy brush.', done: 'Residue washed off', cam: { preset: 'full' },
        parts: metals, layer: 'residue', amt: .5, rad: .42, fx: 'foam', snd: 'soap', sndGap: 90, req: .82, enter() { for (const k of metals) P()[k].surf.u.uWetG.value = .5; }, exit() { for (const k of metals) P()[k].surf.u.uWetG.value = 0; },
        tut: { title: 'Wash off the film', body: 'The bath left a black film. Scrub it away with soapy water to uncover bare steel.', demo() { return { type: 'scrub', pts: [lp('blade', bladeW(.1)), lp('blade', bladeW(.75))] }; } }
      }),
      paint({
        id: 'sand', name: 'Sand the Blade', tool: 'sand', input: 'Long swipes', hint: 'Sand lengthwise along the blade, never across.', done: 'Surface even', cam: { preset: 'full' },
        parts: metals, layer: 'sand', mode: 'add', amt: .5, rad: .42, fx: 'sand', snd: 'sand', req: .8, dir: [1, 0, 0], dirHint: 'Sand along the blade: long strokes tip to guard',
        tut: { title: 'Sand along the blade', body: 'Rub the sandpaper lengthwise, from guard to tip. Each pass smooths scratches and pits into an even satin.', demo() { return { type: 'scrub', pts: [lp('blade', bladeW(.1)), lp('blade', bladeW(.7))] }; } }
      }),
      hold({
        id: 'grind', name: 'Grind Out the Flaws', tool: 'grind', spin: true, hint: 'Press the grinder on each marked flaw and hold.', done: 'Flaws ground out', canTurn: true, cam: { preset: 'full' }, time: 1.2, chip: 'Flaws',
        parts: () => ['blade', 'guard', 'tang', 'weld'],
        spots: () => [
          { key: 'blade', p: [BL.x0 + NOTCH.v * BL.L, halfW(NOTCH.v) - .12, .02], r: .55, label: 'Chipped edge', onProg: k => setNotch(it.extra.bladeMesh.geometry, 1 - k) },
          { key: 'blade', p: [BL.x0 + .58 * BL.L, -.1, -.05], r: .5, label: 'Deep pit', onProg: k => P().blade.surf.dab(new THREE.Vector3(BL.x0 + .58 * BL.L, -.1, -.05), new THREE.Vector3(0, 0, -1), .3, 'crust', 'sub', .08 + k * .3) },
          { key: 'weld', p: [0, 0, 0], r: .5, label: 'Weld bump', onProg: k => { P().weld.g.scale.setScalar(Math.max(.02, 1 - k)); if (k >= 1) P().weld.g.visible = false; } }
        ],
        tut: { title: 'Grind out the flaws', body: 'A chipped edge, a deep pit and a weld bump are marked. Press the spinning grinder on a marker and hold until the ring fills.' }
      }),
      paint({
        id: 'file', name: 'File the Edges', tool: 'file', input: 'Long strokes', hint: 'Stroke the file along both edges of the blade.', done: 'Edges trued', cam: { preset: 'full' },
        parts: ['blade'], layer: 'polish', mode: 'add', amt: .6, rad: .26, fx: 'sand', snd: 'file', req: .82, dir: [1, 0, 0], region: p => Math.abs(p.y) > .26 && p.x > .3 && p.x < 7.1, doneV: .55, to: .7,
        tut: { title: 'True the edges', body: 'Stroke the file along each edge of the blade. A bright line shows where the profile is straight and clean.', demo() { return { type: 'scrub', pts: [lp('blade', [1, .4, .02]), lp('blade', [5.5, .38, .02])] }; } }
      }),
      paint({
        id: 'polish', name: 'Polish the Blade', tool: 'buff', input: 'Circles', hint: 'Buff in small circles until the blade becomes a mirror.', done: 'Mirror blade', cam: { preset: 'full' },
        parts: ['blade', 'guard'], layer: 'polish', mode: 'add', amt: .45, rad: .45, fx: 'polish', snd: 'polish', circles: true, req: .84,
        onDone() { for (let i = 0; i < 12; i++) later(i * 60, () => glints(lp('blade', bladeW(i / 12)), 2, .2)); },
        tut: { title: 'Polish to a mirror', body: 'Move the buffing wheel in small circles. Watch the satin steel turn into a mirror that reflects the workshop.', demo() { return { type: 'circle', pts: [lp('blade', bladeW(.4))] }; } }
      }),
      paint({
        id: 'stain', name: 'Restore the Handle', tool: 'stain', input: 'Brush', hint: 'Brush warm stain over the grip. Turn it to reach the other side.', done: 'Handle restored', cam: { preset: 'full' },
        stage: () => stage({ layout: 'stain' }), parts: ['grip'], layer: 'finish', mode: 'add', amt: .55, rad: .4, fx: 'stain', snd: 'soap', req: .82, also: [{ layer: 'dirt', amt: .8, finish: 0 }],
        tut: { title: 'Stain the grip', body: 'The old grip is dry and faded. Brush stain over the wood for a rich, warm finish.', demo() { return { type: 'scrub', pts: [lp('grip', [-.3, 0, .25]), lp('grip', [-2.3, 0, .25])] }; } }
      }),
      snap({ id: 'attach', name: 'Reattach the Handle', hint: 'Carry the grip to the glowing outline on the tang.', done: 'Handle seated', keys: ['grip'], cam: { preset: 'full' }, thr: 1.1 }),
      timing({
        id: 'secure', name: 'Hammer the Rivets Home', tool: 'hammer', hint: 'Strike each brass rivet when the needle is in the green.', done: 'Rivets set', hits: 2, chip: 'Rivets', label: 'Strike in the green', speed: 2.5, win: .22, cam: { preset: 'work', focus: [-1.4, 0, 0], r: 1.9 },
        enter() { for (const i of RIV) { const b = P()['brass' + i]; b.g.visible = true; b.state = 'home'; b.g.position.copy(b.home.pos).add(new THREE.Vector3(0, 0, .36)); } },
        targets: () => RIV.map(i => ({ key: 'brass' + i, p: [0, 0, .32] })),
        onHit(t, n) { const b = P()[t.key]; camImpulse(.4); sfx('clink'); b.g.position.z = b.home.pos.z + .36 * (1 - n / 2); const w = b.wp([0, 0, .3]); sparks(w, 6); if (n >= 2) { sfx('ping'); glints(w, 5, .12); } },
        tut: { title: 'Set the new rivets', body: 'Fresh brass rivets sit in the holes. Watch the needle and strike when it crosses the green to drive each rivet flush.' }
      }),
      paint({
        id: 'final', name: 'Final Polish', tool: 'micro', input: 'Wipe', hint: 'Wipe away dust and fingerprints from the whole sword.', done: 'Showroom finish', cam: { preset: 'full' },
        enter() { for (const k of ['blade', 'guard', 'grip']) P()[k].surf.author('dirt', (p, n, N) => .45 * smooth(.45, .7, N(3.2))); for (const k of ['blade', 'guard', 'grip']) P()[k].surf.u.uDirtC.value.set('#c9c3b8'); },
        parts: ['blade', 'guard', 'grip'], layer: 'dirt', amt: .6, rad: .5, fx: 'wipe', snd: 'wipe', req: .8, need: .15, doneV: .1,
        exit() { for (const k of ['blade', 'guard', 'grip']) { P()[k].surf.setLayer('dirt', 0); P()[k].surf.u.uDirtC.value.set('#4a3524'); } },
        tut: { title: 'Wipe it spotless', body: 'A haze of dust and fingerprints dulls the shine. Wipe it away with the microfiber cloth.', demo() { return { type: 'scrub', pts: [lp('blade', bladeW(.1)), lp('blade', bladeW(.7))] }; } }
      }),
      inspect({
        id: 'inspect', name: 'Final Inspection', hint: 'Tap the blade, the guard and the handle to check each part.', done: 'All parts passed', cam: { preset: 'show' },
        spots: () => [{ key: 'blade', p: bladeW(.55, 0, 1), label: 'Blade', note: 'mirror finish, true edge', onLook: () => sweep() }, { key: 'guard', p: [0, .7, .2], label: 'Guard', note: 'smooth and flawless' }, { key: 'grip', p: [-1.3, 0, .25], label: 'Handle', note: 'rich stain, rivets set' }]
      }),
      compare({ cam: { preset: 'show' } })
    ];
    function sweep() { for (let i = 0; i <= 16; i++) later(i * 40, () => { glints(lp('blade', bladeW(i / 16, 0, 1)), 2, .12); }); sfx('ping'); }
  }
};
