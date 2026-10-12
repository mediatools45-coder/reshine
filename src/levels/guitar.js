/* Level 08 - Acoustic Guitar: large wood restoration, string replacement and an audible strum. Top faces +Z, neck along +Y. */
import * as THREE from 'three';
import { rbox, cyl, box, torus, mesh, mat, metal, extrude, tube, lump, sphere } from '../core/geo.js';
import { paint, screws, snap, hold, trace, taps, rotate, compare, stage, centered, I, lp, toast } from '../core/systems.js';
import { G, finishStep, camImpulse, st } from '../core/game.js';
import { R, project } from '../core/engine.js';
import { sfx, tone } from '../core/audio.js';
import { glints, dust, puff } from '../core/particles.js';
import { smooth, later, tween, clamp } from '../core/util.js';
import { knurlMat } from '../core/tex.js';

const TOPZ = .5, NUTY = 7.0, BRY = -1.6, SZ = .78;
const sx = (i, y) => { const t = (y - BRY) / (NUTY - BRY); return (i - 2.5) * (.2 * (1 - t) + .12 * t); };
function bodyShape() {
  const pts = []; const hw = y => { const l = 2.05 * Math.sqrt(Math.max(0, 1 - ((y + 1.2) / 2.1) ** 2)), u = 1.58 * Math.sqrt(Math.max(0, 1 - ((y - 1.5) / 1.45) ** 2)); return Math.max(l, u, .05) - .28 * Math.exp(-(((y - .45) / .45) ** 2)); };
  for (let i = 0; i <= 60; i++) { const y = -3.3 + i / 60 * 6.25; pts.push([hw(y), y]); } for (let i = 60; i >= 0; i--) { const y = -3.3 + i / 60 * 6.25; pts.push([-hw(y), y]); }
  const s = new THREE.Shape(pts.map(p => new THREE.Vector2(p[0], p[1]))); s.holes.push(new THREE.Path().absarc(0, 1.05, .56, 0, Math.PI * 2, true)); return s;
}
const crackPts = [[[1.3, -2.4, TOPZ + .01], [1.1, -2.0, TOPZ + .01], [1.2, -1.6, TOPZ + .01], [.95, -1.2, TOPZ + .01], [.85, -.85, TOPZ + .01]], [[-1.25, 1.6, TOPZ + .01], [-1.05, 1.85, TOPZ + .01], [-1.1, 2.1, TOPZ + .01], [-.85, 2.35, TOPZ + .01]]];

export default {
  id: 'guitar', num: 8, name: 'Acoustic Guitar', complexity: 'High', minutes: '6-8 min', seed: 81,
  blurb: 'Dusty dreadnought', intro: 'An acoustic guitar from an attic: broken strings, a dusty sound hole, grimy fretboard, rusty tuners, a dull scratched finish and two hairline cracks. Restore the wood and make it sing.',
  outro: 'Warm, glossy wood, bright new strings, and one clean chord to prove it.',
  pose: [-.15, .12], turnAxis: 'y', toolScale: 1.1,
  build(it) {
    const sb = it.surface('body', { kind: 'wood', base: '#b48a55', baseR: .85, sand: '#e2c48e', sandR: .7, fin: '#b0601e', finR: .18, finCC: 1, polR: .08, wood2: '#ffd9a0', grain: [0, 1, 0], grainS: 1.6, dirt: '#5a4632', crust: '#a9a397', bump: .3, scratch: 1, cell: [160, 192] });
    const body = it.part('body'); body.add(extrude(bodyShape(), 1, .06, 24), sb);
    body.add(cyl(.56, .56, .02, 40), mat('#0c0907', { roughness: 1 }), { p: [0, 1.05, -.3], r: [Math.PI / 2, 0, 0], nohit: true });
    for (const [r, c] of [[.66, '#3a2416'], [.72, '#e8dcc0'], [.78, '#3a2416']]) body.add(torus(r, .025, 6, 60), mat(c, { roughness: .5 }), { p: [0, 1.05, TOPZ + .045], nohit: true });
    body.add(rbox(1.6, .38, .14, .05, 2), mat('#3a2014', { roughness: .45 }), { p: [0, BRY, TOPZ + .1], nohit: true }); body.add(box(1.2, .05, .1), mat('#efe8d4', { roughness: .4 }), { p: [0, BRY + .1, TOPZ + .2], nohit: true });
    body.add(rbox(1.3, 1.9, .03, .2, 2), mat('#2a1810', { roughness: .4 }), { p: [1.05, -.1, TOPZ + .045], r: [0, 0, -.35], nohit: true });
    const sn = it.surface('neck', { kind: 'wood', base: '#4a2c1c', baseR: .7, sand: '#6a4028', fin: '#3a1e10', finR: .35, finCC: .4, grain: [0, 1, 0], grainS: 3, dirt: '#2a2018', cell: [64, 224] });
    const neck = it.part('neck'); neck.add(box(.86, 4.6, .42), sn, { p: [0, 4.7, .2] }); neck.add(box(.82, 4.5, .08), sn, { p: [0, 4.75, .45] });
    neck.add(rbox(1.15, 1.9, .16, .12, 2), sn, { p: [0, 7.95, .25], r: [-.18, 0, 0] });
    const fret = metal('#d8d2c2', .25); for (let i = 0; i < 18; i++) { const y = NUTY - 4.4 * (1 - Math.pow(2, -i / 12)) * 1.7; if (y < 2.5) break; neck.add(box(.82, .025, .03), fret, { p: [0, y, .5], nohit: true }); }
    for (const y of [5.85, 5.15, 4.55, 4.0, 3.5]) neck.add(cyl(.04, .04, .02, 12), mat('#efe8d4'), { p: [0, y, .5], r: [Math.PI / 2, 0, 0], nohit: true });
    neck.add(box(.84, .06, .1), mat('#efe8d4', { roughness: .4 }), { p: [0, NUTY, .52], nohit: true });
    for (const [k, s] of [['tunersL', -1], ['tunersR', 1]]) {
      const tn = it.part(k, { p: [s * .5, 7.95, .25], r: [-.18, 0, 0] }); const st_ = it.surface(k, { kind: 'metal', base: '#7a6a52', sand: '#c9ccce', pol: '#eef0f2', dirt: '#4a3a2a', cell: [64, 96] });
      for (let i = 0; i < 3; i++) { const y = -.55 + i * .55; tn.add(cyl(.06, .06, .5, 10), st_, { p: [0, y, .2], r: [Math.PI / 2, 0, 0] }); tn.add(rbox(.18, .3, .22, .05, 2), st_, { p: [s * .2, y, -.15] }); tn.add(rbox(.32, .2, .07, .04, 2), knurlMat('#e8dfc8', 0), { p: [s * .5, y, -.15], nohit: true }); tn.add(cyl(.04, .04, .3, 8), st_, { p: [s * .3, y, -.15], r: [0, 0, Math.PI / 2] }); }
    }
    /* old strings (one snapped) */
    const oldM = metal('#7a5a3a', .6), strs = it.part('oldStrings'); it.extra.old = [];
    for (let i = 0; i < 6; i++) { const pts = i === 4 ? [[sx(i, BRY), BRY, SZ], [sx(i, 1), 1, SZ + .02], [sx(i, 2.2) + .4, 2.1, SZ + .3], [sx(i, 2) + .9, 1.6, SZ + .5]] : [[sx(i, BRY), BRY, SZ - .04], [sx(i, NUTY), NUTY, SZ - .2]]; const m = mesh(tube(pts, .012 + i * .004, i === 4 ? 30 : 2, 5), oldM); m.userData.part = strs; strs.g.add(m); strs.meshes.push(m); it.extra.old.push(m); }
    const pins = []; for (let i = 0; i < 6; i++) { const p = it.part('pin' + i, { p: [sx(i, BRY) * 1.3, BRY - .1, TOPZ + .2] }); p.add(cyl(.045, .03, .2, 10), mat('#e8e0cc', { roughness: .4 }), { r: [Math.PI / 2, 0, 0] }); p.add(sphere(.06, 10, 8), mat('#e8e0cc', { roughness: .4 }), { p: [0, 0, .1] }); p.hit(.12, [0, 0, .1]); pins.push(p); }
    const cr = it.part('cracks'); for (const pts of crackPts) cr.add(tube(pts, .012, 40, 4), mat('#120a06', { roughness: 1 }), { cast: false });
    const db = it.part('holeDebris'); it.extra.debris = []; for (let i = 0; i < 9; i++) { const a = i * 2.3, r = .1 + (i % 4) * .1; const m = mesh(lump(.06 + (i % 3) * .02, i + 20, 1.2, .8, 1), mat(i % 2 ? '#8a7a60' : '#5a4632', { roughness: 1 })); m.position.set(Math.cos(a) * r, 1.05 + Math.sin(a) * r, -.2); db.g.add(m); it.extra.debris.push(m); }
  },
  after(it) {
    const P = it.parts;
    P.body.surf.author('crust', (p, n, N) => .4 + .5 * smooth(.3, .7, N(1.6))); P.body.surf.author('dirt', (p, n, N) => .3 * smooth(.4, .7, N(2)));
    P.neck.surf.author('dirt', (p, n, N) => .6 + .4 * smooth(.3, .7, N(3)));
    for (const k of ['tunersL', 'tunersR']) { P[k].surf.author('rust', (p, n, N) => smooth(.25, .55, N(4) + .15)); P[k].surf.author('dirt', () => .4); }
  },
  layouts: { tuners: centered({ tunersL: { c: [-1.2, 0, 0], r: [0, 0, 0], s: 1.6 }, tunersR: { c: [1.2, 0, 0], r: [0, 0, 0], s: 1.6 } }) },
  steps(it) {
    const P = () => I().parts, BODY = { preset: 'work', focus: [0, -.2, .5], r: 3.6 }, HEAD = { preset: 'work', focus: [0, 7.8, .3], r: 2.2 };
    const strum = { on: false, t: 0 };
    return [
      taps({ id: 'strings', name: 'Remove the Old Strings', tool: 'pliers', hint: 'Tap each old string to snip it and coil it away.', done: 'Strings off', cam: { preset: 'full' }, chip: 'Strings',
        targets: () => [0, 1, 2, 3, 4, 5].map(i => ({ key: 'oldStrings', p: i === 4 ? [sx(i, 1.6) + .4, 1.9, SZ + .3] : [sx(i, 3.5), 3.5, SZ - .1], i, mr: 18 })),
        onHit(t) { const m = I().extra.old[t.i]; sfx('twang'); tween(.5, k => { m.scale.set(1 - k, 1 - k * .2, 1); m.rotation.z = k * 2; }, () => { m.visible = false; }); } }),
      taps({ id: 'pins', name: 'Pull the Bridge Pins', tool: 'pliers', hint: 'Tap each bridge pin to pop it out.', done: 'Pins out', cam: BODY, chip: 'Pins',
        targets: () => [0, 1, 2, 3, 4, 5].map(i => ({ key: 'pin' + i, p: [0, 0, .1], mr: 14 })),
        onHit(t) { const p = P()[t.key]; sfx('pop'); const z0 = p.g.position.z; tween(.4, k => { p.g.position.z = z0 + Math.sin(k * Math.PI) * .8 + k * .3; p.g.rotation.x = k * 4; }, () => { I().hide(t.key); }); } }),
      screws({ id: 'tuners', name: 'Remove the Tuning Hardware', hint: 'Hold the screwdriver on each tuner bank to free it.', done: 'Tuners off', keys: ['tunersL', 'tunersR'], dir: 'out', axis: [0, 0, -1], spinAxis: [0, 0, 1], rise: .01, time: 1.1, cam: HEAD, mr: 30, to: 'stay',
        complete() { const it2 = I(); it2.toTray('tunersL'); it2.toTray('tunersR'); }, update_: null }),
      paint({ id: 'dust', name: 'Dust the Body', tool: 'soft', hint: 'Sweep the big brush over the top and back.', done: 'Dust cleared', cam: { preset: 'full' },
        parts: ['body'], layer: 'crust', amt: .5, rad: .8, fx: 'dust', snd: 'brush', req: .8 }),
      hold({ id: 'hole', name: 'Vacuum the Sound Hole', tool: 'vacuum', hint: 'Hold the vacuum over the sound hole.', done: 'Sound hole clear', cam: BODY, fx: 'none', snd: 'brush', time: 2.2, shake: 0, chip: 'Debris',
        parts: () => ['body'], spots: () => [{ key: 'body', p: [0, 1.05, TOPZ], r: 1.1, label: 'Sound hole', onProg: k => { const d = I().extra.debris, n = Math.floor(k * d.length); d.forEach((m, i) => { if (i < n && m.visible) { m.visible = false; sfx('pop', 50); } }); } }] }),
      paint({ id: 'fretboard', name: 'Clean the Fretboard', tool: 'cloth', input: 'Long scrub', hint: 'Scrub along the fretboard to lift the finger grime.', done: 'Fretboard clean', cam: { preset: 'work', focus: [0, 4.8, .45], r: 2.8 }, canTurn: false,
        parts: ['neck'], layer: 'dirt', amt: .5, rad: .4, fx: 'dirt', snd: 'wipe', req: .8, faces: [4], dir: [0, 1, 0], dirHint: 'Scrub along the neck' }),
      paint({ id: 'derust', name: 'De-rust the Tuning Parts', tool: 'wire', hint: 'Scrub the rust off both tuner banks.', done: 'Tuners bright', cam: { preset: 'full' }, canTurn: false,
        stage: () => stage({ hide: ['body', 'neck', 'oldStrings', 'cracks', 'holeDebris'], layout: 'tuners' }), parts: ['tunersL', 'tunersR'], layer: 'rust', amt: .55, rad: .3, fx: 'rust', snd: 'wire', sndGap: 55, req: .8, faces: null, also: [{ layer: 'dirt', amt: .6, finish: 0 }, { layer: 'polish', mode: 'add', amt: .3, finish: 1 }],
        exit() { const it2 = I(); it2.toTray('tunersL'); it2.toTray('tunersR'); } }),
      paint({ id: 'sand', name: 'Sand Out the Scratches', tool: 'sand', input: 'Long swipes', hint: 'Sand with the grain, along the length of the body.', done: 'Scratches gone', cam: { preset: 'full' }, canTurn: false,
        stage: () => stage({ home: ['body', 'neck', 'cracks'] }), parts: ['body'], layer: 'sand', mode: 'add', amt: .5, rad: .7, fx: 'woodsand', snd: 'sand', req: .8, faces: [4], dir: [0, 1, 0], also: [{ layer: 'dirt', amt: .8, finish: 0 }, { layer: 'crust', amt: .8, finish: 0 }] }),
      trace({ id: 'cracks', name: 'Fill the Cosmetic Cracks', tool: 'filler', hint: 'Trace along each crack to fill it.', done: 'Cracks filled', cam: BODY, width: .045, bead: '#d9b47e', keepBead: true,
        paths: () => crackPts.map(pts => ({ key: 'body', pts })), onPath() { sfx('ping'); }, exit() { } }),
      hold({ id: 'blend', name: 'Sand the Repair Areas', tool: 'sand', hint: 'Hold the sanding pad on each repair until it blends in.', done: 'Repairs invisible', cam: BODY, fx: 'dust', snd: 'sand', time: 1.2, shake: 0, chip: 'Repairs',
        parts: () => ['body'], spots: () => crackPts.map((p, i) => ({ key: 'body', p: p[Math.floor(p.length / 2)], r: 1, label: 'Repair', onDone: () => { const st0 = G.steps.find(s => s.id === 'cracks'); if (st0 && st0.paths) st0.paths[i].bead.visible = false; P().cracks.meshes[i].visible = false; } })),
        complete() { const st0 = G.steps.find(s => s.id === 'cracks'); if (st0 && st0.paths) for (const p of st0.paths) p.bead.visible = false; I().hide('cracks'); } }),
      paint({ id: 'finish', name: 'Apply Wood Stain and Finish', tool: 'finish', input: 'Brush', hint: 'Brush the finish over the whole body for a rich, even tone.', done: 'Rich warm tone', cam: { preset: 'full' }, canTurn: true,
        parts: ['body'], layer: 'finish', mode: 'add', amt: .5, rad: .75, fx: 'stain', snd: 'soap', req: .85 }),
      paint({ id: 'polish', name: 'Polish the Guitar Body', tool: 'cloth', input: 'Circles', hint: 'Rub in circles until the finish glows.', done: 'Mirror gloss', cam: { preset: 'full' }, canTurn: true,
        parts: ['body', 'neck'], layer: 'polish', mode: 'add', amt: .45, rad: .75, fx: 'polish', snd: 'polish', circles: true, req: .8 }),
      snap({ id: 'tunersIn', name: 'Reinstall the Tuners', hint: 'Drag each tuner bank back onto the headstock.', done: 'Tuners fitted', keys: ['tunersL', 'tunersR'], cam: HEAD }),
      trace({ id: 'newStrings', name: 'Install New Strings', tool: 'hand', hint: 'Drag each new string from the bridge up to the nut.', done: 'Strings on', cam: { preset: 'full' }, width: .022, bead: '#dedad0', tol: .7, keepBead: true, chip: 'Strings',
        enter() { for (let i = 0; i < 6; i++) { const p = I().parts['pin' + i]; I().home('pin' + i, 0); p.g.traverse(o => { if (o.isMesh && o.material.color) o.material = mat('#f6f2e6', { roughness: .3 }); }); } },
        paths: () => [0, 1, 2, 3, 4, 5].map(i => ({ key: 'body', pts: [[sx(i, BRY), BRY, SZ], [sx(i, 2.75), 2.75, SZ], [sx(i, NUTY), NUTY, SZ]] })),
        onGrow(p) { if (Math.random() < .2) sfx('scrape', 80); }, exit() { const s = G.steps.find(x => x.id === 'newStrings'); if (s) it.extra.newStrings = s.paths.map(p => p.bead); for (const b of it.extra.newStrings || []) { b.visible = true; b.material = metal('#e8e4da', .2); } } }),
      rotate({ id: 'tension', name: 'Tension the Strings', tool: 'hand', toolLabel: 'Tuning Pegs', hint: 'Turn the pegs in circles to bring the strings up to pitch.', done: 'In tune', cam: HEAD, turns: 2.2, chip: 'Tension',
        center: () => lp('neck', [0, 7.95, .35]), onTurn(d, k) { for (const s of ['tunersL', 'tunersR']) P()[s].g.children.forEach((c, i) => { if (i % 4 === 2) c.rotateZ(d * 2); }); if (Math.random() < .15) tone(110 + k * 220, 120 + k * 230, .15, 'triangle', .03); } }),
      { kind: 'strum', id: 'strum', name: 'Final Strum Check', tool: 'hand', toolLabel: 'Hand', input: 'Swipe', hint: 'Swipe across all six strings over the sound hole.', done: 'What a sound!', grabAll: true, lockRig: true, canTurn: false, prog: 0, cam: BODY,
        enter() { this.hit = new Set(); this.last = null; this.prog = 0; this.fin = false; G.chips = []; },
        nodes() { return []; },
        lines() { return [0, 1, 2, 3, 4, 5].map(i => [project(I().parts.body.wp([sx(i, .2), .2, SZ])), project(I().parts.body.wp([sx(i, 1.7), 1.7, SZ]))]); },
        onDown(h, r, o) { this.last = { x: o.x, y: o.y }; this.hit.clear(); },
        onMove(h, r, o) {
          if (!this.last || this.fin) return; const L = this.lines(), a = this.last, b = { x: o.x, y: o.y };
          L.forEach(([p, q], i) => { if (this.hit.has(i)) return; const cr = (p2, q2) => (q2.x - p2.x) * (a.y - p2.y) - (q2.y - p2.y) * (a.x - p2.x); const s1 = (q.x - p.x) * (a.y - p.y) - (q.y - p.y) * (a.x - p.x), s2 = (q.x - p.x) * (b.y - p.y) - (q.y - p.y) * (b.x - p.x); if (s1 * s2 <= 0 && Math.min(a.y, b.y) < Math.max(p.y, q.y) + 30 && Math.max(a.y, b.y) > Math.min(p.y, q.y) - 30) { this.hit.add(i); sfx('string', 0, i); this.vib(i); } });
          this.last = b; this.prog = this.hit.size / 6;
          if (this.hit.size >= 6 && !this.fin) { this.fin = true; later(80, () => sfx('strum')); camImpulse(.3); for (let i = 0; i < 6; i++) this.vib(i, 2.2); glints(lp('body', [0, 1.05, TOPZ + .3]), 16, .8); later(2300, () => finishStep()); }
        },
        onUp() { this.last = null; if (!this.fin && this.hit.size) { toast('Swipe across all six strings in one stroke'); } this.hit.clear(); this.prog = 0; },
        vib(i, dur = 1) { const b = (it.extra.newStrings || [])[i]; if (!b) return; tween(dur, k => { b.scale.x = 1 + Math.sin(k * 120) * .25 * (1 - k); }, () => { b.scale.x = 1; }); },
        markers() { return this.fin ? [] : [{ pos: lp('body', [0, 1.05, SZ]), r: 50, label: 'Strum' }]; },
        skip() { }, tut: { title: 'Strum it', body: 'Swipe one finger across all six strings over the sound hole. Listen to that chord.', demo() { const a = lp('body', [-1, 1.05, SZ]), b = lp('body', [1, .9, SZ]); return { type: 'swipe', pts: [a, b] }; } } },
      compare({ enter() { for (const b of it.extra.newStrings || []) b.visible = true; } })
    ];
  }
};
