/* Level 08 - Fender Stratocaster from a yard sale (from "Fender Stratocaster - Old Guitar Restoration").
   Chipped cream finish stripped to bare wood and resprayed metallic red; rusty hardware, new frets, tuned and strummed.
   Body in the XY plane, top face toward +Z, neck along +Y. */
import * as THREE from 'three';
import { rbox, cyl, box, mesh, mat, metal, extrude, tube, sphere, lathe } from '../assets/geo.js';
import { M } from '../assets/materials.js';
import { paint, extract, taps, hold, timing, tune, compare, stage, centered, I, lp, toast } from '../game/systems/index.js';
import { G, finishStep, camImpulse } from '../game/game.js';
import { project } from '../render/engine.js';
import { STREAM_COL } from '../assets/tools.js';
import { sfx } from '../fx/audio.js';
import { glints, puff, flakes, bubbles } from '../fx/particles.js';
import { smooth, later, tween, clamp } from '../core/util.js';

const T = .3, TOP = T + .12, NUT = 8.4, BR = -1.55, SZ = TOP + .32, HS = 8.5;
const FREQ = [82.4, 110, 146.8, 196, 246.9, 329.6];
const sxAt = (i, y) => { const t = clamp((y - BR) / (NUT - BR), 0, 1); return (i - 2.5) * (.2 * (1 - t) + .13 * t); };
const spline = (pts, n = 140) => new THREE.Shape(new THREE.CatmullRomCurve3(pts.map(([x, y]) => new THREE.Vector3(x, y, 0)), true, 'centripetal').getSpacedPoints(n).map(v => new THREE.Vector2(v.x, v.y)));
const BODY_PTS = [[0, -3.0], [1.15, -2.95], [2.0, -2.5], [2.3, -1.7], [2.05, -.85], [1.72, -.1], [1.92, .75], [2.08, 1.65], [1.88, 2.7], [1.55, 3.05], [1.25, 2.6], [.95, 2.0], [.45, 1.9], [-.45, 1.9], [-.95, 1.8], [-1.35, 2.3], [-1.75, 2.45], [-2.12, 1.5], [-1.95, .55], [-1.75, -.2], [-2.1, -1.0], [-2.3, -1.9], [-1.95, -2.6], [-1.1, -2.98]];
const GUARD_PTS = [[-.42, 1.86], [.42, 1.86], [1.25, 1.2], [1.68, .2], [1.45, -.95], [.95, -1.55], [-.05, -1.35], [-1.15, -.65], [-1.45, .55], [-1.05, 1.5]];
const HEAD_PTS = [[-.4, 0], [.4, 0], [.55, .5], [.5, 1.1], [.75, 1.55], [.7, 1.95], [.2, 2.0], [-.35, 1.75], [-.55, 1.2], [-.5, .55]];
const PUPS = [[.05, 1.15, .1], [.05, .35, 0], [.05, -.55, -.18]];
const FRETS = Array.from({ length: 21 }, (_, i) => NUT - 7.3 * (1 - Math.pow(2, -(i + 1) / 12)) * 1.33);

export default {
  id: 'guitar', num: 8, name: 'Stratocaster', complexity: 'High', minutes: '4-5 min', seed: 81,
  blurb: 'Yard-sale Strat', intro: 'A Fender Stratocaster from a yard sale: the cream finish is chipped to the wood, every metal part is rusty and the frets are worn flat. Strip it, paint it metallic red and make it sing again.',
  outro: 'Gloss metallic red, chrome-bright pickups, new frets and a chord that rings out.',
  pose: [-.12, .1], turnAxis: 'y', toolScale: 1.15,
  build(it) {
    /* body: alder wood under a chipped cream finish */
    const sb = it.surface('body', { kind: 'wood', base: '#c99a62', baseR: .8, sand: '#e6c995', sandR: .7, fin: '#a10f18', finR: .12, finCC: 1, polR: .1, wood2: '#ffd9a0', grain: [0, 1, 0], grainS: 1.4, dirt: '#4a3a2a', crust: '#efe3bd', scratch: .6, cell: [160, 192] });
    const body = it.part('body');
    body.add(extrude(spline(BODY_PTS), T * 2, .12, 6), sb);
    body.add(rbox(.95, 1.0, .1, .05, 2), mat('#160f0a', { roughness: 1 }), { p: [0, 1.4, TOP - .03], nohit: true });
    body.add(rbox(.35, .6, .05, .1, 2), mat('#1a1410', { roughness: .8 }), { p: [1.95, -1.45, 0], r: [0, Math.PI / 2, -.35], nohit: true });
    /* pickguard with three single-coil pickups, knobs and switch */
    const guard = it.part('guard', { p: [0, 0, TOP + .03] });
    guard.add(extrude(spline(GUARD_PTS, 90), .04, .01, 4), mat('#e9e2cc', { roughness: .45 }));
    for (const [x, y, k] of [[1.0, -.85], [.65, -1.25], [.15, -1.38]].map(a => a)) guard.add(lathe([[.2, 0], [.21, .05], [.19, .22], [.13, .26], [0, .27]], 24), mat('#e9e2cc', { roughness: .35 }), { p: [x, y, .04], r: [Math.PI / 2, 0, 0] });
    guard.add(rbox(.09, .2, .18, .03, 2), mat('#e9e2cc', { roughness: .35 }), { p: [1.15, -.25, .1], r: [0, 0, -.5] });
    const sp = it.extra.poleSurf = it.surface('poles', { kind: 'metal', base: '#5b5956', baseR: .5, sand: '#c9ccce', pol: '#f1f3f5', polR: .05, rust1: '#2e1206', rust2: '#8a3c12', cell: [96, 64] });
    for (const [x, y, a] of PUPS) {
      guard.add(rbox(.95, .3, .16, .1, 3), mat('#ece6d0', { roughness: .4 }), { p: [x, y, .1], r: [0, 0, a] });
      for (let i = 0; i < 6; i++) { const dx = (i - 2.5) * .14; guard.add(cyl(.035, .035, .06, 12), sp, { p: [x + Math.cos(a) * dx, y + Math.sin(a) * dx, .19], r: [Math.PI / 2, 0, 0] }); }
    }
    /* tremolo bridge with six saddles */
    const sbr = it.surface('bridge', { kind: 'metal', base: '#6b6864', baseR: .45, sand: '#c3c7cb', pol: '#eef1f4', polR: .06, rust1: '#2e1206', rust2: '#8a3c12', cell: [96, 64] });
    const bridge = it.part('bridge', { p: [0, BR, TOP + .02] });
    bridge.add(rbox(1.35, .55, .06, .03, 2), sbr);
    for (let i = 0; i < 6; i++) bridge.add(rbox(.17, .38, .12, .03, 2), sbr, { p: [sxAt(i, BR), .05, .08] });
    bridge.add(cyl(.025, .025, .9, 8), metal('#c9cdd0', .3), { p: [.5, -.45, .05], r: [0, 0, .9] });
    /* maple neck + rosewood-free maple board, dot inlays, Strat headstock */
    const sn = it.surface('neck', { kind: 'wood', base: '#dcb67a', baseR: .55, sand: '#ecd29c', fin: '#d9a85e', finR: .25, finCC: .6, wood2: '#ffe2b0', grain: [0, 1, 0], grainS: 2.6, dirt: '#3e3020', cell: [64, 224] });
    const neck = it.part('neck');
    const ns = new THREE.Shape([new THREE.Vector2(-.43, 1.7), new THREE.Vector2(.43, 1.7), new THREE.Vector2(.33, NUT), new THREE.Vector2(-.33, NUT)]);
    neck.add(extrude(ns, .32, .05, 2), sn, { p: [0, 0, TOP + .1] });
    neck.add(extrude(spline(HEAD_PTS, 70), .18, .04, 4), sn, { p: [0, NUT, TOP + .07] });
    for (const f of [3, 5, 7, 9, 12, 15]) neck.add(cyl(.045, .045, .01, 12), mat('#141010', { roughness: .6 }), { p: [0, (FRETS[f - 2] + FRETS[f - 1]) / 2, TOP + .3], r: [Math.PI / 2, 0, 0], nohit: true });
    neck.add(box(.68, .06, .08), mat('#efe8d4', { roughness: .4 }), { p: [0, NUT, TOP + .3], nohit: true });
    /* worn old frets (replaced in the fret step) */
    it.extra.oldFrets = FRETS.map(y => { const w = .62 + (y - NUT) / (BR - NUT) * .2; return neck.add(box(w, .03, .03), metal('#6a6258', .6), { p: [0, y, TOP + .29], nohit: true }); });
    it.extra.newFrets = FRETS.map(y => { const w = .62 + (y - NUT) / (BR - NUT) * .2; const m = neck.add(cyl(.022, .022, w, 8, false), metal('#e8eaec', .12), { p: [0, y, TOP + .29], r: [0, 0, Math.PI / 2], nohit: true }); m.visible = false; return m; });
    /* six in-line tuners on the headstock */
    const st = it.surface('tuners', { kind: 'metal', base: '#6b6864', baseR: .45, sand: '#c3c7cb', pol: '#eef1f4', rust1: '#2e1206', rust2: '#8a3c12', cell: [64, 96] });
    const tuners = it.part('tuners', { p: [0, NUT, TOP + .07] }); it.extra.pegs = [];
    for (let i = 0; i < 6; i++) { const y = .3 + i * .28, x = -.38 - (i < 3 ? 0 : 0); tuners.add(cyl(.06, .06, .3, 12), st, { p: [x + .1, y, .32] }); tuners.add(rbox(.14, .2, .16, .04, 2), st, { p: [x - .02, y, -.05] }); const k = tuners.add(rbox(.26, .18, .05, .05, 2), st, { p: [x - .25, y, -.05], r: [0, Math.PI / 2, 0] }); it.extra.pegs.push([x - .25, y, -.05]); }
    /* strings: old rusty set, new bright set */
    const oldM = metal('#6a4a2e', .65), newM = metal('#e4e6e8', .15); it.extra.old = []; it.extra.newStrings = [];
    const strs = it.part('strings');
    for (let i = 0; i < 6; i++) {
      const a = [sxAt(i, BR), BR + .1, SZ - .06], b = [sxAt(i, NUT), NUT, TOP + .34], c = [-.28 + .1, NUT + .3 + (5 - i) * .28, TOP + .4];
      it.extra.old.push(strs.add(tube([a, b, c], .012 + (5 - i) * .004, 3, 5), oldM, { nohit: true }));
      const n = strs.add(tube([a, b, c], .011 + (5 - i) * .004, 3, 5), newM, { nohit: true }); n.visible = false; it.extra.newStrings.push(n);
    }
  },
  after(it) {
    const P = it.parts;
    P.body.surf.author('crust', (p, n, N) => 1 - smooth(.62, .72, N(2.6) + N(9) * .15));
    P.body.surf.author('dirt', (p, n, N) => .25 + .35 * smooth(.4, .75, N(2)));
    P.neck.surf.author('dirt', (p, n, N) => .5 + .45 * smooth(.3, .7, N(3)));
    for (const sf of [P.bridge.surf, P.tuners.surf, it.extra.poleSurf]) { sf.author('rust', (p, n, N) => smooth(.12, .45, N(3) + .2)); sf.author('dirt', () => .4); }
  },
  layouts: {
    bare: centered({ body: { c: [0, 0, 0], s: 1.05 } }),
    guard: centered({ guard: { c: [0, 0, 0], s: 1.5 } }),
    neck: centered({ neck: { c: [0, 0, 0], r: [0, 0, -Math.PI / 2], s: .62 } })
  },
  steps(it) {
    const P = () => I().parts, BODY = { preset: 'work', focus: [0, -.2, TOP], r: 3.9 };
    const showNew = v => { for (const s of it.extra.newStrings) s.visible = v; };
    const strum = { on: false };
    return [
      taps({ id: 'snip', name: 'Snip the Rusty Strings', tool: 'snips', hint: 'Tap each string to snip it. It springs loose.', done: 'Strings off', chip: 'Strings', cam: BODY,
        targets: () => [0, 1, 2, 3, 4, 5].map(i => ({ key: 'strings', p: [sxAt(i, .2), .2, SZ - .02], i, mr: 14 })),
        onHit(t) { const m = it.extra.old[t.i]; sfx('snip'); camImpulse(.12); const z0 = m.position.z; tween(.5, k => { m.position.z = z0 + Math.sin(k * Math.PI) * .8; m.rotation.z = k * (t.i % 2 ? .6 : -.6); m.scale.setScalar(1 - k * .4); }, () => { m.visible = false; }); },
        skip() { for (const m of it.extra.old) m.visible = false; },
        tut: { title: 'Snip the strings', body: 'The old strings are brown with rust. Tap each one to snip it with the wire cutters.' } }),
      extract({ id: 'strip', name: 'Strip the Hardware', hint: 'Pull the pickguard, the bridge and the neck off the body.', done: 'Body stripped', cam: { preset: 'full' }, chip: 'Parts',
        items: [{ key: 'guard', axis: [0, 0, 1], thr: 1.4, mk: [-.9, .4, .1], label: 'Lift', flakes: false }, { key: 'bridge', axis: [0, 0, 1], thr: 1.2, mk: [0, 0, .1], label: 'Lift', after: 'guard', flakes: false }, { key: 'neck', axis: [0, 1, 0], thr: 2, mk: [0, 5, .3], label: 'Slide off', after: 'bridge', flakes: false }],
        complete() { for (const k of ['guard', 'bridge', 'neck', 'tuners', 'strings']) I().toTray(k); } }),
      paint({ id: 'stripper', name: 'Brush On Paint Stripper', tool: 'stain', input: 'Brush', hint: 'Brush the stripper over the whole top. The old finish blisters.', done: 'Finish bubbling up', cam: { preset: 'full' }, canTurn: false,
        stage: () => stage({ layout: 'bare' }), parts: ['body'], layer: 'residue', mode: 'add', amt: .55, rad: .7, fx: 'stain', snd: 'soap', req: .8, faces: [4],
        onDab(hit) { if (Math.random() < .3) bubbles(hit.point, 1, .1, .5); },
        tut: { title: 'Paint stripper', body: 'Brush the chemical stripper over the chipped cream paint. Within seconds the finish starts to bubble and lift.' } }),
      paint({ id: 'scrape', name: 'Scrape Off the Old Paint', tool: 'scraper', input: 'Scrape', hint: 'Push the scraper across the body. The paint peels off in ribbons.', done: 'Down to the wood', cam: { preset: 'full' }, canTurn: false,
        stage: () => stage({ layout: 'bare' }), parts: ['body'], layer: 'crust', amt: .6, rad: .55, fx: 'none', snd: 'scrape', req: .8, faces: [4], also: [{ layer: 'residue', amt: .7, finish: 0 }, { layer: 'dirt', amt: .6, finish: 0 }],
        onDab(hit) { if (Math.random() < .5) flakes(hit.point, 1, [.85, .8, .62], { sz: 1.6 }); },
        tut: { title: 'Scrape it off', body: 'Drag the scraper over the softened finish. Long curls of old paint peel away to bare wood.' } }),
      paint({ id: 'sand', name: 'Sand to Bare Wood', tool: 'sand', input: 'Sand', hint: 'Sand the body until the wood is clean and smooth.', done: 'Smooth fresh alder', cam: { preset: 'full' }, canTurn: false,
        stage: () => stage({ layout: 'bare' }), parts: ['body'], layer: 'sand', mode: 'add', amt: .5, rad: .65, fx: 'woodsand', snd: 'sand', req: .8, faces: [4], also: [{ layer: 'crust', amt: .8, finish: 0 }] }),
      paint({ id: 'spray', name: 'Spray Metallic Red', tool: 'paint', input: 'Sweep', hint: 'Sweep the spray gun over the body for a deep gloss red.', done: 'Candy-apple red!', cam: { preset: 'full' }, canTurn: false,
        stage: () => stage({ layout: 'bare' }), parts: ['body'], layer: 'finish', mode: 'add', amt: .5, rad: .75, fx: 'paint', snd: 'soap', sndGap: 130, req: .82, faces: [4],
        enter() { STREAM_COL.paint = [.75, .06, .08]; }, exit() { STREAM_COL.paint = null; },
        tut: { title: 'Spray it red', body: 'Sweep the gun across the bare wood. Metallic candy-apple red goes on, finished with a gloss clear coat.' } }),
      hold({ id: 'poles', name: 'Polish the Pickup Poles', tool: 'buff', spin: true, hint: 'Hold the felt wheel on each pickup until its rusty poles turn to chrome.', done: 'Chrome poles', fx: 'glint', snd: 'polish', time: 1.2, shake: .05, chip: 'Pickups', cam: { preset: 'full' },
        stage: () => stage({ hide: ['body'], layout: 'guard' }), parts: () => ['guard'],
        spots: () => PUPS.map(([x, y]) => ({ key: 'guard', p: [x, y, .2], r: .55 })),
        onProg(s, k) { const sf = it.extra.poleSurf; sf.dab(new THREE.Vector3(s.p[0], s.p[1], s.p[2] + .05), new THREE.Vector3(0, 0, 1), .6, 'rust', 'sub', .4); sf.dab(new THREE.Vector3(s.p[0], s.p[1], s.p[2] + .05), new THREE.Vector3(0, 0, 1), .6, 'polish', 'add', .4); },
        complete() { const sf = it.extra.poleSurf; sf.setLayer('rust', 0); sf.setLayer('polish', 1); for (const k of ['bridge', 'tuners']) { const s = P()[k].surf; s.setLayer('rust', 0); s.setLayer('dirt', 0); s.setLayer('polish', .9); } } }),
      timing({ id: 'frets', name: 'Press In New Frets', tool: 'press', hint: 'Tap each slot to press a new fret in.', done: 'Twenty-one new frets', chip: 'Frets', label: 'Press in the green', speed: 2.8, win: .2, cam: { preset: 'full' },
        stage: () => stage({ hide: ['guard'], layout: 'neck', fn: () => { const s = P().neck.surf; s.setLayer('dirt', 0); } }),
        targets: () => [2, 5, 8, 11, 14, 18].map(f => ({ key: 'neck', p: [0, FRETS[f], TOP + .3], f })),
        onHit(t) { for (let f = 0; f < 21; f++) if (f <= t.f) { it.extra.oldFrets[f].visible = false; it.extra.newFrets[f].visible = true; } glints(P().neck.wp(t.p), 6, .3); },
        skip() { for (let f = 0; f < 21; f++) { it.extra.oldFrets[f].visible = false; it.extra.newFrets[f].visible = true; } },
        tut: { title: 'Fret press', body: 'Tap each glowing slot and the press seats a shiny new fret into it.' } }),
      tune({ id: 'tune', name: 'String Up & Tune', hint: 'Circle around each glowing peg to bring the string into tune.', done: 'In tune!', cam: { preset: 'work', focus: [0, NUT + 1, TOP], r: 2.4 }, chip: 'Strings',
        stage: () => stage({ home: ['body', 'neck', 'guard', 'bridge', 'tuners', 'strings'], fn: () => { for (const m of it.extra.old) m.visible = false; showNew(true); for (let f = 0; f < 21; f++) { it.extra.oldFrets[f].visible = false; it.extra.newFrets[f].visible = true; } } }),
        pegs: () => it.extra.pegs.map((p, i) => ({ key: 'tuners', p, label: 'EADGBE'[5 - i] + ' string', freq: FREQ[5 - i], start: i % 2 ? .8 : .2 })),
        onTurn(p, d) { },
        tut: { title: 'Tune it up', body: 'Circle your finger around the glowing tuning peg. The needle settles in the centre on its own: the string is in tune.' } }),
      { kind: 'strum', id: 'strum', name: 'Strum a Chord', tool: 'hand', toolLabel: 'Hand', input: 'Swipe', hint: 'Swipe across all six strings over the pickups.', done: 'What a sound!', grabAll: true, anywhere: true, lockRig: true, canTurn: false, prog: 0, cam: BODY,
        enter() { this.hit = new Set(); this.last = null; this.prog = 0; this.fin = false; G.chips = []; showNew(true); },
        nodes() { return []; },
        lines() { return [0, 1, 2, 3, 4, 5].map(i => [project(I().parts.strings.wp([sxAt(i, -.6), -.6, SZ])), project(I().parts.strings.wp([sxAt(i, 1.2), 1.2, SZ]))]); },
        onDown(h, r, o) { this.last = { x: o.x, y: o.y }; this.hit.clear(); },
        onMove(h, r, o) {
          if (!this.last || this.fin) return; const L = this.lines(), a = this.last, b = { x: o.x, y: o.y };
          L.forEach(([p, q], i) => { if (this.hit.has(i)) return; const s1 = (q.x - p.x) * (a.y - p.y) - (q.y - p.y) * (a.x - p.x), s2 = (q.x - p.x) * (b.y - p.y) - (q.y - p.y) * (b.x - p.x); if (s1 * s2 <= 0 && Math.min(a.y, b.y) < Math.max(p.y, q.y) + 30 && Math.max(a.y, b.y) > Math.min(p.y, q.y) - 30) { this.hit.add(i); sfx('string', 0, i); this.vib(i); } });
          this.last = b; this.prog = this.hit.size / 6;
          if (this.hit.size >= 6 && !this.fin) { this.fin = true; later(80, () => sfx('strum')); camImpulse(.3); for (let i = 0; i < 6; i++) this.vib(i, 2.2); glints(lp('body', [0, .3, TOP + .4]), 16, .8); later(2300, () => finishStep()); }
        },
        onUp() { this.last = null; if (!this.fin && this.hit.size) toast('Swipe across all six strings in one stroke'); this.hit.clear(); if (!this.fin) this.prog = 0; },
        vib(i, dur = 1) { const s = it.extra.newStrings[i]; if (!s) return; tween(dur, k => { s.position.x = Math.sin(k * 120) * .03 * (1 - k); }, () => { s.position.x = 0; }); },
        markers() { return this.fin ? [] : [{ pos: lp('body', [0, .3, SZ]), r: 50, label: 'Strum' }]; },
        skip() { }, tut: { title: 'Strum it', body: 'Swipe one finger across all six strings over the pickups and listen to that chord.', demo() { const a = lp('body', [-1.2, .3, SZ]), b = lp('body', [1.2, .1, SZ]); return { type: 'swipe', pts: [a, b] }; } } },
      compare({ enter() { showNew(true); } })
    ];
  }
};
