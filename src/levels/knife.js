/* Level 02 - Pocket Knife: a 105-year-old all-steel folder rusted into one lump
   (from "Restoration of a 105-Year-Old Rusty Pocket Knife"). Side faces toward +Z, length along X. */
import * as THREE from 'three';
import { rbox, cyl, box, mesh, mat, extrude, tube, sphere } from '../assets/geo.js';
import { M } from '../assets/materials.js';
import { paint, pick, trace, bath, taps, strokes, heat, cycle, compare, stage, chunksOn, centered, I, lp } from '../game/systems/index.js';
import { G, camImpulse } from '../game/game.js';
import { sfx } from '../fx/audio.js';
import { sparks, puff, glints } from '../fx/particles.js';
import { smooth, later, clamp } from '../core/util.js';

const HL = 4.1, HH = .78, PX = 1.72, PY = 0, BL = 3.3, ZO = .17;
const DARK = mat('#0c0907', { roughness: .9 });

/* closed-knife outline: gently bellied bottom, straight spine, rounded ends */
function handleShape() {
  const s = new THREE.Shape(), w = HL / 2, h = HH / 2;
  s.moveTo(-w + .32, -h + .06);
  s.bezierCurveTo(-.6, -h - .05, .9, -h - .05, w - .5, -h + .02);
  s.quadraticCurveTo(w + .03, -h + .05, w, -.02);
  s.quadraticCurveTo(w - .02, h - .03, w - .45, h);
  s.bezierCurveTo(.8, h - .06, -.8, h - .06, -w + .4, h - .02);
  s.quadraticCurveTo(-w - .06, h - .06, -w, .02);
  s.quadraticCurveTo(-w - .02, -h + .08, -w + .32, -h + .06); return s;
}
/* end caps (bolsters): follow the outline, concave inner edge */
function bolsterShape(front) {
  const s = new THREE.Shape(), w = HL / 2, h = HH / 2, f = front ? 1 : -1, X = x => f * x;
  s.moveTo(X(w - .62), -h + .03); s.lineTo(X(w - .5), -h + .02);
  s.quadraticCurveTo(X(w + .03), -h + .05, X(w), -.02); s.quadraticCurveTo(X(w - .02), h - .03, X(w - .45), h - .01);
  s.lineTo(X(w - .62), h - .03); s.quadraticCurveTo(X(w - .7), 0, X(w - .62), -h + .03); return s;
}
/* clip-point blade with choil and tang (drawn open, pointing +X, edge down) */
function bladeShape() {
  const s = new THREE.Shape();
  s.moveTo(-.18, .25); s.lineTo(BL * .55, .27); s.quadraticCurveTo(BL * .78, .26, BL * .86, .14); s.quadraticCurveTo(BL * .95, .06, BL, .02);
  s.quadraticCurveTo(BL * .82, -.2, BL * .5, -.25); s.lineTo(.42, -.25); s.quadraticCurveTo(.3, -.25, .28, -.17); s.quadraticCurveTo(.2, -.26, 0, -.26);
  s.quadraticCurveTo(-.24, -.22, -.24, 0); s.quadraticCurveTo(-.24, .2, -.18, .25); return s;
}
/* the bevelled cutting edge: a thin band along the edge, slightly brighter once sharpened */
function edgeShape() {
  const s = new THREE.Shape();
  s.moveTo(.42, -.25); s.lineTo(BL * .5, -.25); s.quadraticCurveTo(BL * .82, -.2, BL, .02); s.quadraticCurveTo(BL * .84, -.1, BL * .5, -.15); s.lineTo(.45, -.15); s.closePath(); return s;
}
/* bail ring wire: straight rod (k=0) bending into a closed ring (k=1) */
function bailGeom(k) {
  const L = 1.5, pts = [];
  if (k < .03) { for (let i = 0; i <= 24; i++) pts.push(new THREE.Vector3(-L / 2 + i / 24 * L, 0, 0)); }
  else { const a = k * Math.PI * 1.96, r = L / a; for (let i = 0; i <= 24; i++) { const t = -a / 2 + i / 24 * a; pts.push(new THREE.Vector3(Math.sin(t) * r, r - Math.cos(t) * r, 0)); } }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, .045, 10, false);
}

export default {
  id: 'knife', num: 2, name: 'Pocket Knife', complexity: 'Easy-Medium', minutes: '3-4 min', seed: 23,
  blurb: '105-year-old steel folder', intro: 'A folding knife from over a century ago, rusted so badly that blade and handle have fused into one shapeless lump. Break it free, bring back bright steel and make it fold again.',
  outro: 'A shapeless lump of rust is a working folding knife again, with a sharp edge and a dark, pitted patina.',
  pose: [-.2, .25], turnAxis: 'y', portraitRoll: .95,
  build(it) {
    const look = { kind: 'metal', base: '#5b5956', baseR: .55, baseM: .8, sand: '#c3c7cb', sandR: .3, pol: '#eef1f4', polR: .06, fin: '#2b2724', finR: .45, finM: .6, finCC: .4, dirt: '#4a3a2a', rust1: '#2e1206', rust2: '#8a3c12', crust: '#191412' };
    const sh = it.surface('handle', { ...look, scratch: 1.4, cell: [176, 72] }), hd = it.part('handle');
    for (const z of [-1, 1]) {
      hd.add(extrude(handleShape(), .025, .006, 32), sh, { p: [0, 0, z * .075] });              /* liners */
      hd.add(extrude(handleShape(), .045, .022, 32), sh, { p: [0, 0, z * .118], s: [.985, .93, 1] }); /* scales */
      for (const f of [true, false]) hd.add(extrude(bolsterShape(f), .06, .025, 24), sh, { p: [0, 0, z * .125] });
      const sl = new THREE.Shape(); sl.absellipse(0, 0, .32, .1, 0, Math.PI * 2); hd.add(extrude(sl, .012, .006, 24), sh, { p: [-.25, .04, z * .158] }); /* shield inlay */
    }
    hd.add(rbox(HL - 1.25, .11, .13, .04, 2), sh, { p: [-.05, HH / 2 - .085, 0] });   /* backspring along the spine */
    hd.add(box(HL - 1.1, .34, .13), DARK, { p: [-.1, -.12, 0], nohit: true });       /* blade channel */
    const sp = it.surface('pins', { ...look, cell: [64, 64] }), pins = it.part('pins');
    for (const [x, y, r] of [[PX, PY, .075], [-HL / 2 + .33, 0, .075], [-.85, .02, .045], [.55, .02, .045]]) for (const z of [-1, 1]) pins.add(sphere(r, 16, 10), sp, { p: [x, y, z * (r > .05 ? .185 : .158)], s: [1, 1, .45] });
    const sbl = it.surface('blade', { ...look, scratch: 1.6, cell: [192, 64] }), blade = it.part('blade', { p: [PX, PY, 0] });
    blade.add(extrude(bladeShape(), .028, .014, 36), sbl, { r: [0, 0, Math.PI - .06] });
    for (const z of [-1, 1]) blade.add(extrude(edgeShape(), .004, 0, 24), sbl, { r: [0, 0, Math.PI - .06], p: [0, 0, z * .03], nohit: true });
    const nn = new THREE.Shape(); nn.absellipse(0, 0, .16, .035, 0, Math.PI * 2);
    for (const z of [-1, 1]) blade.add(extrude(nn, .006, 0, 16), DARK, { p: [-.75, -.2, z * .031], r: [0, 0, -.06], nohit: true }); /* nail nick */
    /* bail ring wire (made in the forge step) */
    const sr = it.surface('ring', { ...look, cell: [64, 48] }), ring = it.part('ring', { p: [-HL / 2 - .22, 0, 0] });
    it.extra.ringMesh = ring.add(bailGeom(1), sr, { r: [0, 0, Math.PI / 2] });
  },
  after(it) {
    const P = it.parts;
    for (const k of ['handle', 'blade', 'pins', 'ring']) { P[k].surf.author('rust', (p, n, N) => smooth(.12, .42, N(1.4) * .8 + N(5) * .35)); P[k].surf.author('dirt', (p, n, N) => .4 + .4 * smooth(.3, .7, N(2.5))); }
    it.extra.chunks = chunksOn(it, 'handle', 6, { size: .3, filter: (p, n) => Math.abs(n.z) > .6 });
    it.extra.chunks.push(...chunksOn(it, 'blade', 2, { size: .26, filter: (p, n) => Math.abs(n.z) > .6 }));
  },
  layouts: {
    parts: centered({ handle: { c: [0, -.7, 0], s: .85 }, blade: { c: [0, .9, 0], r: [0, 0, Math.PI - .06], s: .9 } }),
    forge: centered({ ring: { c: [0, 0, 0], r: [0, 0, 0], s: 1.6 } }),
    blade: centered({ blade: { c: [0, 0, 0], r: [0, 0, Math.PI - .06], s: 1.25 } })
  },
  steps(it) {
    const P = it.parts, metal3 = ['handle', 'blade', 'pins'];
    const setRing = k => { const m = it.extra.ringMesh; m.geometry.dispose(); m.geometry = bailGeom(k); };
    return [
      pick({
        id: 'crust', name: 'Knock Off the Rust Crust', tool: 'chisel', hint: 'Scratch the chisel across each lump of rust until it breaks off.', done: 'The shape of a knife appears', cam: { preset: 'full' }, canTurn: true,
        items: () => it.extra.chunks, chip: 'Lumps', layer: 'crust', col: [.3, .13, .05],
        stage: () => stage({ hide: ['ring'] }),
        tut: { title: 'Break the crust', body: 'The knife is buried under thick rust. Drag the chisel over each lump to knock it off. Turn the knife for the other side.', demo() { const c = it.extra.chunks.find(c => !c.gone); if (!c) return null; const w = c.m.getWorldPosition(new THREE.Vector3()); return { type: 'scrub', pts: [w.clone().add(new THREE.Vector3(-.25, 0, 0)), w.clone().add(new THREE.Vector3(.25, 0, 0))] }; } }
      }),
      trace({
        id: 'seam', name: 'Open the Seam', tool: 'grind', toolLabel: 'Carbide Burr', hint: 'Trace the burr along the line where blade and handle are fused.', done: 'Blade outline free', fx: 'sparks', snd: 'grind', tol: .5, width: .03, chip: 'Seam', cam: { preset: 'full' }, toolScale: .55,
        beadMat: () => mat('#120d0a', { roughness: 1 }),
        paths: () => [{ key: 'handle', pts: [[-1.2, HH / 2 - .06, ZO], [-.2, HH / 2 - .07, ZO], [.8, HH / 2 - .07, ZO], [1.45, HH / 2 - .08, ZO]] }],
        tut: { title: 'Find the seam', body: 'Blade and handle have rusted together. Trace the glowing line with the carbide burr to cut the rust out of the seam.' }
      }),
      bath({
        id: 'electro', kind: 'jar', name: 'Electrolysis', hint: 'Lower the knife into the jar, then hold the button to run the current.', done: 'Rust softened to black scale', liquid: '#7f9a8a', murk: '#3e3018', time: 3.2, snd: 'zap',
        onProg(k) { for (const s of it.surfs) s.u.uResG.value = k * .9; },
        onDone() { for (const s of it.surfs) { s.u.uResG.value = 0; s.setLayer('crust', .9); s.setLayer('residue', .8); s.fade('rust', .25, 0); s.setLayer('dirt', 0); } },
        tut: { title: 'Electrolysis', body: 'Hung on copper wire in washing-soda solution, the current turns the rust into soft black scale. Drag it in and hold the button while the bath turns green, then brown.' }
      }),
      paint({
        id: 'scrape', name: 'Scrape the Black Scale', tool: 'scraper', input: 'Scrape', hint: 'Scrape off the black scale the electrolysis loosened.', done: 'Scale gone', cam: { preset: 'full' },
        parts: metal3, layer: 'crust', amt: .6, rad: .38, fx: 'rust', snd: 'scrape', req: .8, need: .3,
        onDab(hit) { if (Math.random() < .25) puff(hit.point, [.1, .09, .08], 1, { a: .4 }); },
        tut: { title: 'Scrape it off', body: 'The black scale is soft now. Drag the scraper over the knife and watch big black flakes peel away.', demo() { return { type: 'scrub', pts: [lp('handle', [-1.4, 0, ZO]), lp('handle', [1.2, 0, ZO])] }; } }
      }),
      paint({
        id: 'wheel', name: 'Wire-Wheel Reveal', tool: 'grind', input: 'Scrub', hint: 'Run the wire wheel over the knife. Bright steel appears under the grey.', done: 'Bright steel!', cam: { preset: 'full' }, toolScale: .7,
        parts: metal3, layer: 'residue', amt: .55, rad: .42, fx: 'rust', snd: 'grind', req: .8, also: [{ layer: 'rust', amt: .7, finish: 0 }, { layer: 'sand', mode: 'add', amt: .6, finish: 1 }, { layer: 'crust', amt: 1, finish: 0 }],
        enter() { this.toolSpin = true; },
        tut: { title: 'The big reveal', body: 'Drag the spinning wire wheel over the knife. The dull grey lump turns into bright, shiny steel.', demo() { return { type: 'scrub', pts: [lp('handle', [-1.4, 0, ZO]), lp('blade', [-2.4, 0, .05])] }; } }
      }),
      taps({
        id: 'pins', name: 'Punch Out the Pins', tool: 'punch', hint: 'Tap each pin twice to drive it out.', done: 'Knife comes apart', strike: true, hits: 2, chip: 'Pins', cam: { preset: 'full' },
        targets: () => [{ key: 'pins', p: [PX, PY, .2], label: 'Pivot' }, { key: 'pins', p: [-HL / 2 + .33, 0, .2], label: 'Rear' }],
        onHit(t, n) { const w = P.pins.wp(t.p); sparks(w, 8); sfx('anvil'); camImpulse(.3); if (n >= 2) puff(w, [.4, .4, .42], 2, { a: .3 }); },
        complete() { I().hide('pins'); stage({ layout: 'parts' }); }
      }),
      strokes({
        id: 'sharpen', name: 'Sharpen the Blade', tool: 'stone', hint: 'Make long, slow strokes along the edge.', done: 'Razor sharp', strokes: 6, label: 'Hold the angle', cam: { preset: 'full' },
        stage: () => stage({ hide: ['handle'], layout: 'blade' }),
        a: () => lp('blade', [-.3, .22, .03]), b: () => lp('blade', [-BL * .9, .12, .03]),
        onStroke(k) { const s = P.blade.surf; for (let i = 0; i < 8; i++) { const x = -.3 - i / 7 * (BL * .6); s.dab(new THREE.Vector3(x, .25, .03), new THREE.Vector3(0, 0, 1), .14, 'polish', 'add', .5 * k + .2); } },
        tut: { title: 'Whetstone strokes', body: 'Drag along the blade edge in long, slow strokes. Each pass hones the edge a little brighter.' }
      }),
      heat({
        id: 'ring', name: 'Forge a New Bail Ring', hint: 'Heat the wire until it glows, then circle to bend it round.', done: 'New ring forged', time: 1.4, cam: { preset: 'full' },
        stage: () => { stage({ hide: ['handle', 'blade'], layout: 'forge' }); I().parts.ring.g.visible = true; setRing(0); },
        spots: () => [-.5, 0, .5].map(x => ({ key: 'ring', p: [0, x, 0], r: .3, glow: .3 })), then: 'twist', parts: () => ['ring'],
        twist: { center: () => P.ring.g.getWorldPosition(new THREE.Vector3()), turns: 1, label: 'Bend', hint: 'Red hot! Circle to bend it around the anvil horn', snd: 'anvil', onTurn(k) { setRing(clamp(k, .02, 1)); } },
        tut: { title: 'Heat and bend', body: 'Hold the torch on the wire until it glows red, then circle your finger to wrap it into a ring.' }
      }),
      paint({
        id: 'oil', name: 'Oil Finish & Rivet Together', tool: 'stain', input: 'Brush', hint: 'Brush the protective oil over the steel. The knife goes back together when it is coated.', done: 'Dark, protected patina', cam: { preset: 'full' },
        stage: () => stage({ home: ['handle', 'blade', 'ring'] }), canTurn: true,
        parts: ['handle', 'blade', 'ring'], layer: 'finish', mode: 'add', amt: .5, rad: .42, fx: 'stain', snd: 'soap', req: .8,
        complete() { I().home('pins', .3); sfx('anvil'); },
        tut: { title: 'Oil and rivet', body: 'Brush the oil over the metal. It settles dark into the pits while the high spots stay bright, giving a Damascus-like pattern.', demo() { return { type: 'scrub', pts: [lp('handle', [-1.4, 0, ZO]), lp('handle', [1.2, 0, ZO])] }; } }
      }),
      cycle({
        id: 'fold', name: 'Flick It Open', hint: 'Swing the blade open, then fold it shut. Do it twice.', done: 'Folds like new', key: 'blade', tip: [-BL * .9, 0, 0], cycles: 2, cam: { preset: 'full' }, openLabel: 'Open', closeLabel: 'Fold', openSnd: 'latch', closeSnd: 'latch',
        set(t) { const B = I().parts.blade; B.g.quaternion.copy(B.home.quat).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -t * (Math.PI - .15))); }
      }),
      compare({})
    ];
  }
};
