/* Level 06 - Old PC Keyboard: keycap removal, deep debris cleaning and beige plastic restoration.
   Built lying in the XY plane with key tops facing +Z. */
import * as THREE from 'three';
import { rbox, cyl, box, mesh, mat, metal, extrude, roundRectShape, lump, tube, canvasTex } from '../assets/geo.js';
import { paint, screws, hold, heat, load, bath, taps, compare, stage, centered, I, lp, toast } from '../game/systems/index.js';
import { G, camImpulse, STAGE } from '../game/game.js';
import { sfx } from '../fx/audio.js';
import { glints, puff, dust } from '../fx/particles.js';
import { smooth, later, tween, rnd, lerp, clamp } from '../core/util.js';

const ROWS = ['1234567890-=', 'QWERTYUIOP[]', "ASDFGHJKL;'", 'ZXCVBNM,./'], KS = .66, KW = .6;
const BW = 9.6, BD = 3.9, WORD = 'THANKYOU', MANUAL = ['Q', 'W', 'E', 'A', 'S', 'D', 'Z', 'X', 'R', 'F'];
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
    it.extra.ledHaze = new THREE.Color('#8a8f7a'); it.extra.ledM = mat('#8a8f7a', { roughness: .8, emissive: '#0a1a06' });
    shell.add(rbox(.9, .3, .06, .03, 2), it.extra.ledM, { p: [3.6, 1.72, .14], nohit: true });
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
    for (let i = 0; i < 26; i++) { const m = mesh(lump(.06 + Math.random() * .05, i, 1.2, .8, 1), crumbM); m.position.set(rnd(-4, 4), rnd(-1.3, 1.3), -.04); base.g.add(m); m.visible = false; it.extra.crumbs.push(m); }
    it.extra.hairs = []; it.extra.hairM = mat('#5a3a1a', { roughness: .8, emissive: '#3a1004' });
    [[-2.6, .6], [-.4, -.5], [1.6, .4], [3.1, -.6]].forEach(([x, y]) => { const m = mesh(tube([[x - .45, y, .02], [x - .15, y + .25, .06], [x + .15, y - .15, .03], [x + .45, y + .2, .05]], .022, 24, 5), hairM, { cast: false }); m.userData.c = [x, y, .04]; base.g.add(m); m.visible = false; it.extra.hairs.push(m); });
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
    const P = () => I().parts, caps = () => I().extra.caps;
    const popKey = (c, fly = true) => { const k = caps()[c]; if (!k || k.out) return; k.out = true; const g = k.g, z0 = g.position.z; sfx('keycap'); const w = g.getWorldPosition(new THREE.Vector3()); dust(w, 1);
      if (!fly) { g.visible = false; return; } tween(.45, t => { g.position.z = z0 + Math.sin(t * Math.PI) * 1.1 + t * .6; g.rotation.x = t * 3; g.scale.setScalar(1 - t * .6); }, () => { g.visible = false; }); };
    const putKey = c => { const k = caps()[c]; if (!k) return; k.out = false; const g = k.g; g.visible = true; g.rotation.set(0, 0, 0); g.scale.setScalar(1); const h = k.home; g.position.set(h.x, h.y, h.z + .8); tween(.22, t => { g.position.z = h.z + .8 * (1 - t); }, () => sfx('keycap')); };
    const allCaps = () => Object.keys(caps());
    const showCaps = v => { for (const c of allCaps()) { const k = caps()[c]; k.g.visible = v; k.out = !v; k.g.position.copy(k.home); k.g.rotation.set(0, 0, 0); k.g.scale.setScalar(1); } };
    const whiten = k => { it.extra.capM.color.copy(DIRTY).lerp(CLEAN, k); it.extra.legM.color.copy(it.extra.capM.color); };
    let washer = null;
    const machine = () => {
      if (washer) return washer; const g = new THREE.Group(), wire = metal('#c9cdd0', .3), W = 11, D = 4.6, H = 2.2;
      for (let i = 0; i <= 12; i++) { const x = -W / 2 + i / 12 * W; g.add(mesh(cyl(.035, .035, D, 6), wire, { p: [x, 0, 0], r: [Math.PI / 2, 0, 0] })); }
      for (let j = 0; j <= 5; j++) { const z = -D / 2 + j / 5 * D; g.add(mesh(cyl(.035, .035, W, 6), wire, { p: [0, 0, z], r: [0, 0, Math.PI / 2] })); }
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(mesh(cyl(.05, .05, H, 6), wire, { p: [sx * W / 2, H / 2, sz * D / 2] }));
      for (const y of [H * .5, H]) for (const sz of [-1, 1]) g.add(mesh(cyl(.04, .04, W, 6), wire, { p: [0, y, sz * D / 2], r: [0, 0, Math.PI / 2] }));
      g.add(mesh(box(W + .8, .3, D + .8), mat('#3a4248', { roughness: .4, metalness: .6 }), { p: [0, -.25, 0] }));
      g.traverse(m => { if (m.isMesh) m.userData.nofit = true; }); g.position.set(STAGE.x, STAGE.y - 2.2, STAGE.z - .5); washer = g; return g;
    };
    return [
      taps({ id: 'pull', name: 'Pop Off the Keycaps', tool: 'puller', hint: 'Tap each glowing key to pop it off. The rest follow.', done: 'All keycaps off', chip: 'Keycaps', cam: { preset: 'full' }, assistPx: 34,
        targets: () => MANUAL.map(c => ({ key: 'keys', p: caps()[c].home.toArray().map((v, i) => i === 2 ? v + .2 : v), c, mr: 16 })), onHit(t) { popKey(t.c); camImpulse(.15); },
        onDone() { if (this.list.every(x => x.done)) allCaps().filter(c => !caps()[c].out).forEach((c, i) => later(150 + i * 25, () => popKey(c))); },
        complete() { for (const m of I().extra.crumbs) m.visible = true; }, delay: 1800,
        tut: { title: 'Pop the keycaps', body: 'Tap a glowing key: the puller grabs it and it pops off with a click. After a few, the rest come off in one go.' } }),
      paint({ id: 'brush', name: 'Brush Out the Hair & Crumbs', tool: 'soft', input: 'Sweep', hint: 'Sweep the brush over the plate to clear the crumbs and dust.', done: 'Loose debris gone', cam: { preset: 'full' }, canTurn: false,
        stage: () => stage({ fn: () => { showCaps(false); for (const m of I().extra.crumbs) m.visible = true; } }),
        parts: ['shell', 'base'], layer: 'crust', amt: .55, rad: .7, fx: 'dust', snd: 'brush', req: .8, need: .3,
        onDab(hit) { const lp_ = P().base.g.worldToLocal(hit.point.clone()); for (const m of I().extra.crumbs) if (m.visible && m.position.distanceTo(lp_) < .9) { m.visible = false; sfx('pop', 40); } },
        exit() { for (const m of I().extra.crumbs) m.visible = false; },
        tut: { title: 'Brush it out', body: 'Crumbs and dust are packed between the switches. Sweep the soft brush across the plate to flick them out.', demo() { return { type: 'scrub', pts: [lp('base', [-3, 0, 0]), lp('base', [3, 0, 0])] }; } } }),
      heat({ id: 'singe', name: 'Singe the Last Hairs', tool: 'lighter', hint: 'Hold the little flame over each hair until it curls away.', done: 'Not a hair left', time: .9, chip: 'Hairs', cam: { preset: 'full' }, parts: () => ['base', 'plate'],
        spots: () => I().extra.hairs.map((m, i) => ({ key: 'base', p: m.userData.c, r: .45, glow: .18, i })),
        onHeat(s, k) { const m = I().extra.hairs[s.i]; m.scale.setScalar(1 - k * .7); m.material = I().extra.hairM; },
        onSpot(s) { const m = I().extra.hairs[s.i]; m.visible = false; puff(P().base.wp(s.p), [.3, .3, .3], 2, { a: .3, s0: .05, s1: .2 }); },
        stage: () => stage({ fn: () => { for (const m of I().extra.hairs) { m.visible = true; m.scale.setScalar(1); } } }),
        tut: { title: 'Burn off the hairs', body: 'A few fine hairs are wrapped around the switches. Hold the lighter flame over each one until it curls up and vanishes.' } }),
      screws({ id: 'screws', name: 'Unscrew the Case', hint: 'Press and hold each corner screw.', done: 'Case open', keys: ['screw0', 'screw1', 'screw2', 'screw3'], dir: 'out', axis: [0, 0, 1], spinAxis: [0, 0, 1], rise: .45, cam: { preset: 'full' },
        complete() { for (const k of ['screw0', 'screw1', 'screw2', 'screw3']) I().toTray(k); } }),
      load({ id: 'dishwasher', name: 'Run It Through the Dishwasher', hint: 'Tap the shell, base and plate to load them, then hold the button to wash.', done: 'Squeaky clean (but still yellow)', chip: 'Wash', time: 3, cam: { preset: 'full' },
        items: () => [{ key: 'shell', label: 'Shell' }, { key: 'plate', label: 'Plate' }, { key: 'base', label: 'Base' }],
        machine, slot: i => machine().position.clone().add(new THREE.Vector3((i - 1) * .4, .6 + i * .45, 0)),
        onProg(k) { for (const n of ['shell', 'base', 'cable']) { const s = P()[n].surf; s.u.uDirtRO.value.y = 1 - k; } },
        onDone() { for (const n of ['shell', 'base', 'cable']) { const s = P()[n].surf; s.setLayer('dirt', 0); s.setLayer('crust', 0); s.u.uDirtRO.value.y = 1; } },
        tut: { title: 'Into the dishwasher', body: 'Tap each plastic part to drop it in the dishwasher basket, then hold the button to run a wash cycle. The grime goes, but the yellowing stays.' } }),
      bath({ id: 'uv', kind: 'tank', name: 'Peroxide & UV Bath', hint: 'Lower the keyboard into the peroxide, then hold the button to switch on the UV lamps.', done: 'White again!', liquid: '#cfe8f2', murk: '#e8f4ff', time: 3.6, snd: 'hiss',
        stage: () => stage({ home: ['shell', 'base', 'plate'], fn: () => showCaps(true) }),
        onProg(k) { whiten(k); for (const n of ['shell', 'base']) P()[n].surf.u.uGlow.value.setRGB(k * .02, k * .01, k * .06); },
        onDone() { whiten(1); for (const n of ['shell', 'base']) { const s = P()[n].surf; s.setLayer('rust', 0); s.u.uGlow.value.setRGB(0, 0, 0); } },
        update(dt) { if (this.phase === 'hold' && G.hold) for (const n of ['shell', 'base']) P()[n].surf.u.uGlow.value.setRGB(.05 + Math.random() * .02, .02, .18); },
        tut: { title: 'Retr0bright', body: 'Hydrogen peroxide plus UV light reverses the yellowing. Drag the keyboard into the tub and hold the button to turn on the UV lamps.' } }),
      hold({ id: 'led', name: 'Polish the LED Window', tool: 'buff', hint: 'Hold the polishing pad on the hazy LED window until it is clear.', done: 'Crystal clear', spin: true, fx: 'glint', snd: 'polish', time: 1.6, shake: 0, chip: 'Window', cam: { preset: 'work', focus: [3.2, 1.4, .1], r: 3.2 },
        parts: () => ['shell'], spots: () => [{ key: 'shell', p: [3.6, 1.72, .17], r: .6, label: 'LED' }],
        onProg(s, k) { const m = I().extra.ledM; m.color.copy(I().extra.ledHaze).lerp(new THREE.Color('#79d65a'), k); m.emissive.copy(new THREE.Color('#0a1a06')).lerp(new THREE.Color('#2fa01a'), k); } }),
      taps({ id: 'keys', name: 'Click the Keycaps Back On', tool: 'hand', hint: 'Tap the glowing slots to press keys back on. The rest snap in by themselves.', done: 'Keys back on', chip: 'Keycaps', cam: { preset: 'full' }, assistPx: 34,
        stage: () => stage({ home: ['screw0', 'screw1', 'screw2', 'screw3'], fn: () => { showCaps(false); } }),
        targets: () => MANUAL.map(c => ({ key: 'keys', p: caps()[c].home.toArray(), c, mr: 16 })), onHit(t) { putKey(t.c); },
        onDone() { if (this.list.every(x => x.done)) allCaps().filter(c => caps()[c].out).forEach((c, i) => later(200 + i * 30, () => putKey(c))); },
        skip() { showCaps(true); }, delay: 1800 }),
      taps({ id: 'type', name: 'Typing Test', tool: 'hand', hint: `Type ${WORD} on the glowing keys.`, done: 'Every key clicks', ordered: true, chip: 'Typed', cam: { preset: 'full' }, assistPx: 34,
        stage: () => stage({ fn: () => showCaps(true) }),
        targets: () => [...WORD].map(c => ({ key: 'keys', p: caps()[c].home.toArray(), c, label: c, mr: 18 })),
        onHit(t) { const g = caps()[t.c].g, z = caps()[t.c].home.z; sfx('key'); tween(.12, k => { g.position.z = z - .12 * Math.sin(k * Math.PI); }); glints(g.getWorldPosition(new THREE.Vector3()), 3, .2); } }),
      compare({ stage: () => stage({ fn: () => showCaps(true) }) })
    ];
  }
};
