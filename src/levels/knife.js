/* Level 02 - Pocket Knife: wood-handle restoration plus a folding pivot clean-up */
import * as THREE from 'three';
import { rbox, cyl, box, mesh, mat, metal, lump, extrude, shape } from '../core/geo.js';
import { paint, pick, extract, screws, snap, hold, bath, cycle, compare, stage, chunksOn, I, lp, toast } from '../core/systems.js';
import { G, turnItem } from '../core/game.js';
import { smooth, later } from '../core/util.js';

const HL = 4.2, HH = .86, PX = 1.85, PY = .06;
const DARK = mat('#0c0907', { roughness: .9 });

function scaleShape() {
  const s = new THREE.Shape(), w = HL / 2, h = HH / 2;
  s.moveTo(-w + .25, -h); s.lineTo(w - .45, -h + .02); s.quadraticCurveTo(w - .05, -h + .1, w - .02, 0); s.quadraticCurveTo(w - .05, h - .08, w - .45, h);
  s.lineTo(-w + .3, h - .04); s.quadraticCurveTo(-w - .08, h - .12, -w, 0); s.quadraticCurveTo(-w - .06, -h + .14, -w + .25, -h); return s;
}
function bladeShape() {
  const s = new THREE.Shape(), L = 3.35;
  s.moveTo(-.12, .28); s.lineTo(L * .62, .3); s.quadraticCurveTo(L * .86, .28, L, .02); s.quadraticCurveTo(L * .82, -.24, L * .55, -.3); s.lineTo(.25, -.3); s.quadraticCurveTo(-.05, -.3, -.2, -.05); s.quadraticCurveTo(-.25, .2, -.12, .28); return s;
}

export default {
  id: 'knife', num: 2, name: 'Pocket Knife', complexity: 'Easy-Medium', minutes: '4-5 min', seed: 23,
  blurb: 'Wood-handled folder', intro: 'A grandfather’s folding knife: grimy wooden scales, a rusty blade and a pivot gummed shut. Strip it, revive the wood and make it fold smoothly again.',
  outro: 'Dry grey wood is now rich and sealed, and the blade swings open with a clean snap.',
  pose: [-.2, .25], turnAxis: 'y', portraitRoll: .95,
  build(it) {
    const sf = it.surface('frame', { kind: 'metal', base: '#565452', baseR: .6, sand: '#babec2', pol: '#e2e6ea', polR: .07, dirt: '#5a4a38', cell: [144, 64] });
    const frame = it.part('frame');
    for (const z of [-.085, .085]) frame.add(rbox(HL - .15, HH - .06, .05, .02, 2), sf, { p: [0, 0, z] });
    frame.add(rbox(HL - .6, .14, .13, .04, 2), sf, { p: [-.1, HH / 2 - .1, 0] });
    for (const sx of [-1, 1]) for (const z of [-.15, .15]) frame.add(rbox(.62, HH + .02, .1, .05, 3), sf, { p: [sx * (HL / 2 - .3), 0, z] });
    for (const z of [-.21, .21]) frame.add(cyl(.09, .09, .02, 18), sf, { p: [PX, PY, z], r: [Math.PI / 2, 0, 0] });
    frame.add(cyl(.05, .05, .5, 12), metal('#8b8f93', .4), { p: [PX, PY, 0], r: [Math.PI / 2, 0, 0], nohit: true });
    frame.add(box(HL - .9, .05, .12), DARK, { p: [-.2, -HH / 2 + .1, 0], nohit: true });
    /* blade on its pivot */
    const sbl = it.surface('blade', { kind: 'metal', base: '#5a5b5c', baseR: .55, sand: '#c3c7cb', pol: '#eef2f5', polR: .05, dirt: '#5a4a38', cell: [160, 64] });
    const blade = it.part('blade', { p: [PX, PY, 0] });
    blade.add(extrude(bladeShape(), .045, .018, 24), sbl);
    blade.add(box(.35, .05, .07), DARK, { p: [.75, .22, 0], nohit: true });
    /* wooden scales */
    for (const [k, z] of [['scaleF', 1], ['scaleB', -1]]) {
      const sw = it.surface(k, { kind: 'wood', base: '#7b6450', baseR: .9, sand: '#dcbd90', sandR: .75, fin: '#7a3412', finR: .3, finCC: .7, polR: .15, wood2: '#ffcf9a', grain: [1, 0, 0], grainS: 2.2, dirt: '#3d3024', dirtR: .95, cell: [176, 64] });
      const p = it.part(k, { p: [0, 0, z * .225] });
      p.add(extrude(scaleShape(), .1, .035, 20), sw, { s: [.86, .92, 1] });
    }
    /* screws through the front scale + escutcheon shield */
    const smat = metal('#7c7468', .45);
    [-1.25, -.25].forEach((x, i) => { const s = it.part('screw' + i, { p: [x, 0, .3] }); s.add(cyl(.08, .08, .035, 16), smat, { r: [Math.PI / 2, 0, 0] }); s.add(box(.12, .02, .04), DARK, { p: [0, 0, .02], nohit: true }); s.hit(.2); });
    /* compacted grime around the pivot (revealed when the scales are off) */
    const dm = mat('#3d2d1d', { roughness: 1 });
    it.extra.debris = [[1.2, .25, .13], [1.45, -.22, .13], [.6, .3, .13], [1.15, -.05, -.13], [.3, -.25, .13]].map(([x, y, z], i) => { const m = mesh(lump(.09 + (i % 2) * .03, i + 9, 1.3, .7, .8), dm); m.position.set(x, y, z); m.userData.part = frame; frame.g.add(m); m.visible = false; return { m, surf: sf, p: m.position.clone(), n: new THREE.Vector3(0, 0, Math.sign(z)), size: .15 }; });
  },
  after(it) {
    const P = it.parts;
    P.frame.surf.author('rust', (p, n, N) => smooth(.4, .7, N(2.4) + (p.x > 1.4 ? .2 : 0)) * .9);
    P.frame.surf.author('dirt', (p, n, N) => .35 + .6 * smooth(.3, .7, N(3)));
    P.blade.surf.author('rust', (p, n, N) => smooth(.25, .55, N(1.6) * .9 + N(5) * .25) * .95);
    P.blade.surf.author('dirt', (p, n, N) => .4 * smooth(.4, .7, N(3)));
    for (const k of ['scaleF', 'scaleB']) P[k].surf.author('dirt', (p, n, N) => .45 + .55 * smooth(.3, .7, N(2.5) + (Math.abs(p.x) > 1.6 ? .2 : 0)));
  },
  layouts: { wood: { scaleF: { p: [0, .62, .35], r: [0, 0, 0] }, scaleB: { p: [0, -.62, .35], r: [0, Math.PI, 0] } } },
  steps(it) {
    const all = ['frame', 'blade', 'scaleF', 'scaleB'], wood = ['scaleF', 'scaleB'];
    const outer = (P, c, k) => k === 'scaleF' ? c === 4 : c === 5;
    return [
      paint({
        id: 'dust', name: 'Dry Brush the Dirt', tool: 'soft', hint: 'Sweep the soft brush over the knife to knock off loose dirt.', done: 'Loose dirt gone', cam: { preset: 'full' },
        parts: all, layer: 'dirt', amt: .5, rad: .42, fx: 'dust', snd: 'brush', req: .8, need: .32,
        tut: { title: 'Brush off the dust', body: 'Sweep the soft brush back and forth. Loose dust lifts away and the knife turns over when one side is clean.', demo() { return { type: 'scrub', pts: [lp('scaleF', [-1.4, 0, .1]), lp('blade', [2, 0, .05])] }; } }
      }),
      hold({
        id: 'oil', name: 'Lubricate the Pivot', tool: 'oil', hint: 'Hold the oil can on the pivot joint until it is soaked.', done: 'Pivot oiled', cam: { preset: 'work', focus: [PX, 0, 0], r: 1.5 }, fx: 'none', snd: 'hiss', time: 1.6, shake: 0, chip: 'Pivot',
        parts: () => ['frame', 'blade', 'scaleF'], spots: () => [{ key: 'frame', p: [PX, PY, .22], r: .7, label: 'Pivot' }],
        onProg(s, k) { const P = I().parts; P.frame.surf.dab(new THREE.Vector3(PX, PY, .2), new THREE.Vector3(0, 0, 1), .45 * k + .1, 'wet', 'add', .3); P.blade.surf.dab(new THREE.Vector3(0, 0, .03), new THREE.Vector3(0, 0, 1), .4 * k + .1, 'wet', 'add', .3); },
        tut: { title: 'Oil the pivot', body: 'Hold the oil can over the glowing joint. A few seconds of oil will loosen the stiff pivot.' }
      }),
      screws({
        id: 'screws', name: 'Remove the Handle Screws', hint: 'Press and hold each screw to back it out.', done: 'Screws out', keys: ['screw0', 'screw1'], dir: 'out', axis: [0, 0, 1], spinAxis: [0, 0, 1], rise: .35, cam: { preset: 'work', focus: [-.6, 0, 0], r: 2 },
        tut: { title: 'Unscrew the scales', body: 'Two screws hold the wooden scales on. Press and hold the screwdriver on each one.', demo() { return { type: 'hold', pts: [lp('screw0')] }; } }
      }),
      extract({
        id: 'scales', name: 'Remove the Wooden Scales', hint: 'Pull the front scale away from the frame, then turn over and pull the back one.', done: 'Scales off', canTurn: true, cam: { preset: 'full' }, chip: 'Scales',
        items: [{ key: 'scaleF', axis: [0, 0, 1], thr: 1.1, mk: [0, 0, .12], label: 'Pull off', after_() { later(500, () => turnItem()); } }, { key: 'scaleB', axis: [0, 0, -1], thr: 1.1, mk: [0, 0, -.12], label: 'Pull off', after: 'scaleF' }],
        complete() { for (const d of it.extra.debris) d.m.visible = true; },
        tut: { title: 'Lift off the scales', body: 'Drag the wooden scale straight out toward you. Then the knife turns so you can pull the other scale.', demo() { const x = this.items && this.items.find(i => !i.done); if (!x) return null; const a = lp(x.key, x.mk); return { type: 'drag', pts: [a, a.clone().add(new THREE.Vector3(0, -.2, 1.6))] }; } }
      }),
      pick({
        id: 'debris', name: 'Extract Pivot Debris', tool: 'tweez', grab: true, hint: 'Tap each clump of grime to pluck it out.', done: 'Pivot clear', canTurn: true, cam: { preset: 'work', focus: [.9, 0, 0], r: 2.1 }, chip: 'Grime',
        items: () => it.extra.debris, enter() { for (const d of it.extra.debris) d.m.visible = !d.gone; }, layer: 'dirt',
        tut: { title: 'Pluck out the grime', body: 'Compacted grime hides around the pivot. Tap each clump and the tweezers pull it out. Turn the knife for the ones on the back.', demo() { const d = it.extra.debris.find(x => !x.gone); return d ? { type: 'tap', pts: [d.m.getWorldPosition(new THREE.Vector3())] } : null; } }
      }),
      paint({
        id: 'brush', name: 'Brush the Metal Parts', tool: 'wire', hint: 'Scrub the rust off the blade, liners and bolsters.', done: 'Corrosion reduced', cam: { preset: 'full' },
        parts: ['frame', 'blade'], layer: 'rust', amt: .5, rad: .36, fx: 'rust', snd: 'wire', sndGap: 55, req: .8,
        tut: { title: 'Brush off the rust', body: 'Scrub the wire brush over the blade and the frame. The rust flakes away to grey steel.', demo() { return { type: 'scrub', pts: [lp('blade', [.6, 0, .05]), lp('blade', [2.6, 0, .05])] }; } }
      }),
      bath({
        id: 'wash', kind: 'bowl', name: 'Wash the Components', hint: 'Lower the knife into the bowl, then hold the button to wash it.', done: 'Grease washed away', liquid: '#4f8f9a', murk: '#6a5638', time: 3, snd: 'bubble',
        onProg(k) { for (const s of it.surfs) s.u.uDirtRO.value.y = 1 - k; },
        onDone() { for (const s of it.surfs) { s.setLayer('dirt', 0); s.setLayer('wet', 0); s.u.uDirtRO.value.y = 1; } },
        tut: { title: 'Wash away the grease', body: 'Drag the knife down into the soapy bowl, then hold the button while the residue washes off.' }
      }),
      paint({
        id: 'sand', name: 'Sand the Wooden Scales', tool: 'sand', input: 'Long swipes', hint: 'Sand with long strokes along the grain until the wood is even.', done: 'Wood smooth', cam: { preset: 'full' },
        stage: () => stage({ hide: ['frame', 'blade'], layout: 'wood' }), canTurn: false,
        parts: wood, layer: 'sand', mode: 'add', amt: .5, rad: .4, fx: 'woodsand', snd: 'sand', req: .8, region: outer, dir: [1, 0, 0], dirHint: 'Sand along the grain: long side-to-side strokes', also: [{ layer: 'dirt', amt: .8, finish: 0 }],
        tut: { title: 'Sand along the grain', body: 'Rub the sandpaper with long strokes along the length of each scale. Scratches fade and fresh pale wood appears.', demo() { return { type: 'scrub', pts: [lp('scaleF', [-1.5, 0, .12]), lp('scaleF', [1.5, 0, .12])] }; } }
      }),
      paint({
        id: 'stain', name: 'Stain and Seal the Wood', tool: 'stain', input: 'Brush', hint: 'Brush the stain over both scales for a rich, even tone.', done: 'Warm wood tone', cam: { preset: 'full' },
        stage: () => stage({ hide: ['frame', 'blade'], layout: 'wood' }), canTurn: false,
        parts: wood, layer: 'finish', mode: 'add', amt: .55, rad: .4, fx: 'stain', snd: 'soap', req: .85, region: outer,
        tut: { title: 'Bring the wood to life', body: 'Brush the stain across the pale wood. Watch the grain glow a deep warm brown.', demo() { return { type: 'scrub', pts: [lp('scaleF', [-1.5, 0, .12]), lp('scaleF', [1.5, 0, .12])] }; } }
      }),
      paint({
        id: 'polish', name: 'Polish the Metal', tool: 'cloth', input: 'Circles', hint: 'Rub in small circles until the blade and bolsters shine.', done: 'Mirror bright', cam: { preset: 'full' },
        stage: () => stage({ home: ['frame', 'blade'], tray: wood }),
        parts: ['frame', 'blade'], layer: 'polish', mode: 'add', amt: .5, rad: .4, fx: 'polish', snd: 'polish', circles: true, req: .8, also: [{ layer: 'sand', mode: 'add', amt: .6, finish: 1 }, { layer: 'rust', amt: 1, finish: 0 }],
        tut: { title: 'Polish to a mirror', body: 'Rub the cloth in small circles over the blade and bolsters until they reflect the workshop lights.', demo() { return { type: 'circle', pts: [lp('blade', [1.4, 0, .05])] }; } }
      }),
      snap({
        id: 'assemble', name: 'Reassemble the Handle', hint: 'Drag the scales, then the screws, back onto the frame.', done: 'Handle closed', keys: ['scaleF', 'scaleB', 'screw0', 'screw1'], ordered: true, canTurn: true, cam: { preset: 'full' },
        onPlace(x) { if (x.key === 'scaleF') later(300, () => turnItem()); else if (x.key === 'scaleB') later(300, () => turnItem()); }
      }),
      cycle({
        id: 'fold', name: 'Folding Motion Check', hint: 'Swing the blade closed, then open it again. Do it twice.', done: 'Folds like new', key: 'blade', tip: [3.25, 0, 0], cycles: 2, cam: { preset: 'full' }, openLabel: 'Fold', closeLabel: 'Open', openSnd: 'latch', closeSnd: 'latch',
        set(t) { const B = I().parts.blade; B.g.quaternion.copy(B.home.quat).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -t * (Math.PI - .1))); B.g.position.copy(B.home.pos).add(new THREE.Vector3(0, -.05 * Math.sin(t * Math.PI), 0)); }
      }),
      compare({})
    ];
  }
};
