/* Level 06 - Old PC Keyboard: keycap removal, deep debris cleaning and beige plastic restoration.
   Built lying in the XY plane with key tops facing +Z. */
import * as THREE from 'three';
import { rbox, cyl, box, mesh, mat, metal, extrude, roundRectShape, lump, tube, canvasTex } from '../core/geo.js';
import { paint, extract, screws, snap, hold, bath, taps, compare, stage, centered, I, lp, toast } from '../core/systems.js';
import { G, camImpulse } from '../core/game.js';
import { sfx } from '../core/audio.js';
import { glints, puff, dust } from '../core/particles.js';
import { smooth, later, tween, rnd, lerp, clamp } from '../core/util.js';

const ROWS = ['1234567890-=', 'QWERTYUIOP[]', "ASDFGHJKL;'", 'ZXCVBNM,./'], KS = .66, KW = .6;
const BW = 9.6, BD = 3.9, WORD = 'CLEAN', MANUAL = ['Q', 'W', 'E', 'A', 'S', 'D', 'Z', 'X', 'R', 'F'];
const DIRTY = new THREE.Color('#b9a170'), CLEAN = new THREE.Color('#e9e2cf');
function legendAtlas() {
  const chars = ROWS.join('') + ' ';
  const t = canvasTex(512, 512, g => { g.fillStyle = '#fff'; g.fillRect(0, 0, 512, 512); g.fillStyle = '#3a3428'; g.font = '700 34px Nunito, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; [...chars].forEach((c, i) => g.fillText(c, (i % 8) * 64 + 32, Math.floor(i / 8) * 64 + 34)); });
  t.chars = chars; return t;
}

export default {
  id: 'keyboard', num: 6, name: 'Old PC Keyboard', complexity: 'High', minutes: '6-8 min', seed: 61,
  blurb: 'Yellowed 1980s keyboard', intro: 'A yellowed beige keyboard from the 1980s: dust, crumbs and hair under every key, sticky caps and a grimy cable. Strip it, deep clean it and bring the plastic back to an even beige.',
  outro: 'Every key clicks clean and the yellowed shell is back to its original beige.',
  pose: [0, -.62], turnAxis: 'y', toolScale: .9,
  build(it) {
    const pl = (n, o = {}) => it.surface(n, { kind: 'plastic', base: '#ddd3bb', baseR: .55, sand: '#ddd3bb', sandR: .5, pol: '#ece5d2', polR: .3, dirt: '#6e5a3e', dirtR: .85, rust1: '#b29a58', rust2: '#c9ad62', crust: '#b6b1a6', bump: .04, cell: [176, 80], ...o });
    const sb = pl('base'), base = it.part('base'); base.add(rbox(BW, BD, .5, .16, 3), sb, { p: [0, 0, -.4] });
    for (const sx of [-1, 1]) base.add(rbox(.6, .3, .25, .05, 2), mat('#3a3630', { roughness: .8 }), { p: [sx * 3.8, 1.6, -.72] });
    const ss = pl('shell'), shell = it.part('shell');
    const sh = roundRectShape(BW, BD, .2); sh.holes.push(new THREE.Path().copy(roundRectShape(BW - .9, BD - 1.0, .08)));
    shell.add(extrude(sh, .32, .05, 8), ss, { p: [0, 0, -.04] });
    shell.add(rbox(.9, .3, .06, .03, 2), mat('#4b7a3a', { roughness: .4, emissive: '#2a5a1a' }), { p: [3.6, 1.72, .14], nohit: true });
    const plate = it.part('plate'); plate.add(box(BW - 1.0, BD - 1.1, .06), metal('#7b8084', .45), { p: [0, 0, -.12] });
    const stemG = cyl(.08, .08, .2, 8), stems = new THREE.InstancedMesh(stemG, mat('#2f2f33', { roughness: .6 }), 60), M = new THREE.Matrix4(); let n = 0;
    ROWS.forEach((r, j) => [...r].forEach((c, i) => { M.makeRotationX(Math.PI / 2).setPosition(this.kx(i, j), this.ky(j), -.02); stems.setMatrixAt(n++, M); })); stems.count = n; plate.g.add(stems);
    /* keycaps: one part holding every cap mesh */
    const keys = it.part('keys'), atlas = legendAtlas(), capM = new THREE.MeshStandardMaterial({ color: DIRTY.clone(), roughness: .6 });
    const legendM = new THREE.MeshStandardMaterial({ map: atlas, color: DIRTY.clone(), roughness: .6, polygonOffset: true, polygonOffsetFactor: -2 });
    it.extra.capM = capM; it.extra.legM = legendM; it.extra.caps = {};
    const capG = rbox(KW, KW, .34, .09, 3);
    ROWS.forEach((r, j) => [...r].forEach((c, i) => {
      const g = new THREE.Group(); g.position.set(this.kx(i, j), this.ky(j), .2); keys.g.add(g);
      const m = mesh(capG, capM); m.userData.part = keys; g.add(m); keys.meshes.push(m);
      const ci = atlas.chars.indexOf(c), pg = new THREE.PlaneGeometry(KW * .8, KW * .8), uv = pg.attributes.uv;
      for (let k = 0; k < uv.count; k++) uv.setXY(k, ((ci % 8) + uv.getX(k)) / 8, 1 - (Math.floor(ci / 8) + 1 - uv.getY(k)) / 8);
      const lg = mesh(pg, legendM, { p: [0, 0, .171], cast: false }); lg.userData.part = keys; g.add(lg);
      it.extra.caps[c] = { g, home: g.position.clone(), out: false };
    }));
    const sp = new THREE.Group(); sp.position.set(0, this.ky(4), .2); keys.g.add(sp); const spm = mesh(rbox(KS * 6.5, KW, .34, .09, 3), capM); spm.userData.part = keys; sp.add(spm); keys.meshes.push(spm); it.extra.caps[' '] = { g: sp, home: sp.position.clone(), out: false };
    /* screws */
    [[-4.45, 1.6], [4.45, 1.6], [-4.45, -1.6], [4.45, -1.6]].forEach(([x, y], i) => { const s = it.part('screw' + i, { p: [x, y, .3] }); s.add(cyl(.13, .11, .06, 16), metal('#8f8a80', .45), { r: [Math.PI / 2, 0, 0] }); s.add(box(.2, .03, .02), mat('#111'), { p: [0, 0, .035], nohit: true }); s.hit(.24); });
    /* crumbs + hair in the tray */
    const crumbM = mat('#8a6a3a', { roughness: 1 }), hairM = mat('#2a2018', { roughness: .8 }); it.extra.crumbs = [];
    for (let i = 0; i < 26; i++) { const m = mesh(lump(.06 + Math.random() * .05, i, 1.2, .8, 1), crumbM); m.position.set(rnd(-4, 4), rnd(-1.3, 1.3), -.12); base.g.add(m); m.visible = false; it.extra.crumbs.push(m); }
    for (let i = 0; i < 5; i++) { const x = rnd(-3.5, 3.5), y = rnd(-1, 1); const m = mesh(tube([[x, y, -.13], [x + .3, y + .2, -.12], [x + .6, y - .1, -.13], [x + .9, y + .15, -.12]], .012, 20, 4), hairM); base.g.add(m); m.visible = false; it.extra.crumbs.push(m); }
    const sc = it.surface('cable', { kind: 'plastic', base: '#d8cfb6', baseR: .5, dirt: '#5a4a34', cell: [64, 160] }), cable = it.part('cable');
    cable.add(tube([[0, 1.95, -.4], [0, 2.6, -.45], [-.6, 3.4, -.6], [-1.8, 3.9, -.7], [-3.2, 3.8, -.7]], .09, 60, 10), sc);
  },
  kx(i, j) { return -3.9 + j * .22 + i * KS; }, ky(j) { return 1.1 - j * KS; },
  after(it) {
    const P = it.parts;
    for (const k of ['shell', 'base']) { const s = P[k].surf; s.author('crust', (p, n, N) => .45 + .45 * smooth(.3, .7, N(2.5))); s.author('dirt', (p, n, N) => .35 + .55 * smooth(.35, .7, N(3))); s.author('rust', (p, n, N) => .65 + .35 * smooth(.3, .7, N(1.2))); }
    P.base.surf.u.uDirtC.value.set('#5a4630');
    P.cable.surf.author('dirt', (p, n, N) => .6 + .4 * smooth(.3, .7, N(4)));
  },
  layouts: { pile: centered({ keys: { c: [0, 0, 0] } }) },
  steps(it) {
    const P = () => I().parts, def = this, caps = () => I().extra.caps;
    const popKey = (c, fly = true) => { const k = caps()[c]; if (!k || k.out) return; k.out = true; const g = k.g, z0 = g.position.z; sfx('keycap'); const w = g.getWorldPosition(new THREE.Vector3()); dust(w, 1);
      if (!fly) { g.visible = false; return; } tween(.45, t => { g.position.z = z0 + Math.sin(t * Math.PI) * 1.1 + t * .6; g.rotation.x = t * 3; g.scale.setScalar(1 - t * .6); }, () => { g.visible = false; }); };
    const putKey = c => { const k = caps()[c]; if (!k) return; k.out = false; const g = k.g; g.visible = true; g.rotation.set(0, 0, 0); g.scale.setScalar(1); const h = k.home; g.position.set(h.x, h.y, h.z + .8); tween(.22, t => { g.position.z = h.z + .8 * (1 - t); }, () => { sfx('key'); }); };
    const allCaps = () => Object.keys(caps());
    return [
      paint({ id: 'blow', name: 'Blow Away Loose Dust', tool: 'blower', input: 'Sweep', hint: 'Sweep the air blower over the keyboard.', done: 'Loose dust gone', cam: { preset: 'full' }, canTurn: false,
        parts: ['shell', 'base'], layer: 'crust', amt: .5, rad: .7, fx: 'blow', snd: 'whoosh', sndGap: 400, req: .8, need: .3,
        onDab() { it.extra.capM.color.lerp(new THREE.Color('#c7b182'), .01); } }),
      taps({ id: 'pull', name: 'Pull the Keycaps', tool: 'puller', hint: 'Tap each glowing key to pop it off with the puller.', done: 'Keys popped', chip: 'Keycaps', cam: { preset: 'full' }, assistPx: 34,
        targets: () => MANUAL.map(c => ({ key: 'keys', p: caps()[c].home.toArray().map((v, i) => i === 2 ? v + .2 : v), c, mr: 16 })), onHit(t) { popKey(t.c); vib_(); },
        tut: { title: 'Pop the keycaps', body: 'Tap a glowing key: the puller grabs it and it pops into the tray with a satisfying click.' } }),
      taps({ id: 'collect', name: 'Collect the Remaining Keycaps', tool: 'puller', hint: 'Tap the keyboard to pop off the rest in one go.', done: 'All keycaps off', chip: 'Keycaps', cam: { preset: 'full' },
        targets: () => [{ key: 'keys', p: [0, 0, .4], label: 'Tap', mr: 40 }],
        onHit() { allCaps().filter(c => !caps()[c].out).forEach((c, i) => later(i * 28, () => popKey(c))); }, delay: 1800 }),
      screws({ id: 'screws', name: 'Remove the Case Screws', hint: 'Press and hold each corner screw.', done: 'Screws out', keys: ['screw0', 'screw1', 'screw2', 'screw3'], dir: 'out', axis: [0, 0, 1], spinAxis: [0, 0, 1], rise: .45, cam: { preset: 'full' }, time: .8,
        stage: () => stage({ fn: () => { for (const c of allCaps()) caps()[c].g.visible = false; } }) }),
      extract({ id: 'shell', name: 'Open the Upper Shell', hint: 'Lift the top shell off the keyboard.', done: 'Shell off', cam: { preset: 'full' }, chip: 'Shell',
        items: [{ key: 'shell', axis: [0, 0, 1], thr: 2, mk: [0, 1.6, .2], label: 'Lift', flakes: false }] }),
      extract({ id: 'plate', name: 'Remove the Internal Plate', hint: 'Lift the switch plate out of the tray.', done: 'Plate out', cam: { preset: 'full' }, chip: 'Plate',
        items: [{ key: 'plate', axis: [0, 0, 1], thr: 1.8, mk: [0, 0, 0], label: 'Lift', flakes: false, after_() { for (const m of I().extra.crumbs) m.visible = true; } }],
        complete() { for (const m of I().extra.crumbs) m.visible = true; } }),
      paint({ id: 'vacuum', name: 'Vacuum the Deep Debris', tool: 'vacuum', input: 'Sweep', hint: 'Sweep the vacuum over the tray to suck up crumbs and hair.', done: 'Debris gone', cam: { preset: 'full' }, canTurn: false,
        parts: ['base'], layer: 'dirt', amt: .55, rad: .7, fx: 'vacuum', snd: 'brush', req: .8, faces: [4], region: p => Math.abs(p.x) < 4.2 && Math.abs(p.y) < 1.5,
        onDab(hit) { const lp_ = P().base.g.worldToLocal(hit.point.clone()); for (const m of I().extra.crumbs) if (m.visible && m.position.distanceTo(lp_) < .8) { m.visible = false; sfx('pop', 40); } },
        onDone() { for (const m of I().extra.crumbs) m.visible = false; }, exit() { for (const m of I().extra.crumbs) m.visible = false; } }),
      hold({ id: 'corners', name: 'Brush the Tight Corners', tool: 'detail', hint: 'Hold the detail brush in each corner until it is clean.', done: 'Corners clean', cam: { preset: 'full' }, fx: 'dust', snd: 'brush', time: 1, shake: 0, chip: 'Corners',
        parts: () => ['base'], spots: () => [[-4.1, 1.35], [4.1, 1.35], [-4.1, -1.35], [4.1, -1.35]].map(([x, y]) => ({ key: 'base', p: [x, y, -.12], r: .7, onProg: k => P().base.surf.dab(new THREE.Vector3(x, y, -.12), new THREE.Vector3(0, 0, 1), .6, 'crust', 'sub', .2 + k) })) }),
      bath({ id: 'wash', kind: 'bowl', name: 'Wash the Keycaps', hint: 'Drop the keycaps into the foam bowl, then hold the button.', done: 'Keycaps washed', liquid: '#a9d6dc', murk: '#9a8a60', time: 3, snd: 'bubble',
        stage: () => stage({ hide: ['base', 'cable'], layout: 'pile', fn: () => { for (const c of allCaps()) { const k = caps()[c]; k.g.visible = true; k.g.rotation.set(rnd(-.4, .4), rnd(-.4, .4), rnd(-.5, .5)); k.g.scale.setScalar(1); k.g.position.copy(k.home); } } }),
        onProg(k) { it.extra.capM.color.copy(DIRTY).lerp(CLEAN, k * .6); it.extra.legM.color.copy(it.extra.capM.color); }, dipOnly: false, stay: true }),
      bath({ id: 'swirl', kind: 'bowl', name: 'Rotate the Key Bowl', hint: 'Swirl in circles to tumble the keys in the foam.', done: 'Keys sparkling', liquid: '#a9d6dc', murk: '#9a8a60', swirl: true, startIn: true, turns: 2.2, chip: 'Swirl',
        stage: () => stage({ hide: ['base', 'cable'], layout: 'pile' }),
        onProg(k) { it.extra.capM.color.copy(DIRTY).lerp(CLEAN, .6 + k * .4); it.extra.legM.color.copy(it.extra.capM.color); },
        exit() { for (const c of allCaps()) { const k = caps()[c]; k.g.visible = false; k.g.rotation.set(0, 0, 0); k.out = true; } } }),
      paint({ id: 'scrub', name: 'Scrub the Keyboard Case', tool: 'sponge', hint: 'Scrub the grime off the case.', done: 'Case clean', cam: { preset: 'full' }, canTurn: false,
        stage: () => stage({ home: ['base', 'shell', 'cable'], hide: ['plate'] }), parts: ['shell'], layer: 'dirt', amt: .5, rad: .6, fx: 'foam', snd: 'soap', req: .8, also: [{ layer: 'crust', amt: .8, finish: 0 }],
        complete() { P().base.surf.setLayer('dirt', 0); P().base.surf.setLayer('crust', 0); } }),
      paint({ id: 'retro', name: 'Restore the Plastic Color', tool: 'pad', input: 'Wipe', hint: 'Wipe the treatment over the yellowed plastic.', done: 'Even beige again', cam: { preset: 'full' }, canTurn: false,
        parts: ['shell'], layer: 'rust', amt: .5, rad: .65, fx: 'plastic', snd: 'wipe', req: .82, complete() { P().base.surf.setLayer('rust', 0); },
        tut: { title: 'Reverse the yellowing', body: 'Old ABS plastic turns yellow with age. Wipe the treatment pad over the shell and watch the original beige come back.' } }),
      paint({ id: 'cable', name: 'Clean the Cable', tool: 'cloth', input: 'Long drag', hint: 'Drag the cloth along the cable.', done: 'Cable clean', cam: { preset: 'full' }, canTurn: false,
        parts: ['cable'], layer: 'dirt', amt: .6, rad: .4, fx: 'wipe', snd: 'wipe', req: .8, faces: null }),
      snap({ id: 'assemble', name: 'Reassemble the Shell', hint: 'Drop the plate and the shell back on, then the screws.', done: 'Keyboard closed', keys: ['plate', 'shell', 'screw0', 'screw1', 'screw2', 'screw3'], ordered: true, cam: { preset: 'full' },
        stage: () => stage({ home: ['base', 'cable'], tray: ['plate', 'shell', 'screw0', 'screw1', 'screw2', 'screw3'] }) }),
      taps({ id: 'keys', name: 'Replace the Keycaps', tool: 'hand', hint: 'Tap the glowing slots to press keys back on. The rest snap in by themselves.', done: 'Keys back on', chip: 'Keycaps', cam: { preset: 'full' }, assistPx: 34,
        targets: () => MANUAL.map(c => ({ key: 'keys', p: caps()[c].home.toArray(), c, mr: 16 })), onHit(t) { putKey(t.c); },
        onDone(t) { if (this.list.every(x => x.done)) allCaps().filter(c => caps()[c].out).forEach((c, i) => later(200 + i * 30, () => putKey(c))); } }),
      taps({ id: 'type', name: 'Typing Test', tool: 'hand', hint: `Type ${WORD} on the glowing keys.`, done: 'Every key clicks', ordered: true, chip: 'Typed', cam: { preset: 'full' }, assistPx: 34,
        targets: () => [...WORD].map(c => ({ key: 'keys', p: caps()[c].home.toArray(), c, label: c, mr: 18 })),
        onHit(t) { const g = caps()[t.c].g, z = caps()[t.c].home.z; sfx('key'); tween(.12, k => { g.position.z = z - .12 * Math.sin(k * Math.PI); }); glints(g.getWorldPosition(new THREE.Vector3()), 3, .2); } }),
      compare({ stage: () => stage({ fn: () => { for (const c of allCaps()) { caps()[c].g.visible = true; } } }) })
    ];
    function vib_() { camImpulse(.15); }
  }
};
