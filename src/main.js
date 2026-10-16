import * as THREE from 'three';
import { R, initEngine, resize, render, setQuality, project, TIERS } from './render/engine.js';
import { buildStudio, BENCH_Y } from './render/studio.js';
import { initParticles, updateParticles, confetti, glints, clearParticles, P } from './fx/particles.js';
import { initTools, setTool, T, makeTool } from './assets/tools.js';
import { G, RIG, CAM, HOOK, loadLevel, enterStep, ff, skipStep, finishStep, updateGame, setView, resetView, st } from './game/game.js';
import { bindControls, resetPointers } from './input/controls.js';
import { bindUI, updateUI, toast, endGuide } from './ui/hud.js';
import { sfx, setLoop, ac, AU } from './fx/audio.js';
import { tickTweens, clock, cancelAll, later, $, store, vib } from './core/util.js';
import { LEVELS, UPCOMING } from './levels/index.js';
import THUMBS from './levels/thumbs.json'; /* pre-rendered shelf pictures (scripts/bake-thumbs.mjs): no level is built at boot */

const SAVE_KEY = 'rw_save_v1';
const save = store.json(SAVE_KEY, {});
const persist = () => store.setJson(SAVE_KEY, save);
/* padlock lost its first (inspection) step: shift an in-progress save back by one */
if (!save._v3) { for (const k in save) if (save[k] && typeof save[k] === 'object') save[k].step = 0; save._v3 = 1; save._v2 = 1; store.setJson(SAVE_KEY, save); }
if (!save._v2) { if (save.padlock && save.padlock.step > 0) save.padlock.step--; save._v2 = 1; store.setJson(SAVE_KEY, save); }
const qs = new URLSearchParams(location.search);
/* split build: this page holds one level; "back" goes to the launcher page (index.html) next to it */
const SPLIT = typeof __SPLIT__ !== 'undefined' && __SPLIT__;
const toLauncher = () => { location.href = 'index.html'; };
let tickKeys = () => { };
/* default tier: phones/tablets and low-core machines start on medium, everything else on high; ultra only by choice */
const weak = matchMedia('(pointer:coarse)').matches || (navigator.hardwareConcurrency || 4) <= 4 || (navigator.deviceMemory || 8) <= 4;
let qCap = +(qs.get('q') ?? store.get('rw_q2') ?? (weak ? 1 : 2)), dprCap = 1, lastTs = 0, slow = 0, frames = 0, res = 1;

function boot() {
  const cv = $('cv');
  let ok = false; try { ok = initEngine(cv); } catch (e) { console.error(e); }
  if (!ok) { $('nogl').style.display = 'flex'; $('load').classList.remove('on'); return; }
  if (qs.get('lowq')) qCap = 0;
  applyQuality(qCap);
  buildStudio(R.scene); initParticles(R.scene); initTools(R.scene);
  addEventListener('resize', () => resize(dprCap * res)); addEventListener('orientationchange', () => setTimeout(() => resize(dprCap * res), 200));
  G.autoTurn = store.get('rw_auto') !== '0'; AU.on = store.get('rw_snd') !== '0';
  $('mAuto').textContent = 'Auto turn: ' + (G.autoTurn ? 'on' : 'off'); $('mSnd').textContent = 'Sound: ' + (AU.on ? 'on' : 'off');
  tickKeys = bindControls(cv);
  bindUI({ menu: openMenu, closeMenu, shop: toShop, restart: () => startLevel(G.level, 0), cycleQuality, progress: n => { if (G.level && n < G.steps.length) { const s = save[G.level.id] || (save[G.level.id] = {}); s.step = n; s.pct = Math.max(s.pct || 0, Math.round(n / G.steps.length * 100)); persist(); } } });
  HOOK.complete = complete;
  $('inBack').onclick = () => { sfx('click'); toShop(); };
  $('inStart').onclick = () => { sfx('click'); ac(); startLevel(G.level, 0); };
  $('inCont').onclick = () => { sfx('click'); ac(); startLevel(G.level, (save[G.level.id] || {}).step || 0); };
  $('btnShop').onclick = () => { sfx('click'); toShop(); };
  $('btnLook').onclick = () => { $('done').classList.remove('on'); toast('Drag to spin · two fingers to move · pinch to zoom', 2600); };
  document.addEventListener('visibilitychange', () => { if (document.hidden && G.mode === 'play') openMenu(); });
  window.__g = { P, gallery, auto, G, RIG, CAM, T, R, LEVELS, openLevel, startLevel, ff, skipStep, finishStep, enterStep, st, save, setQuality: applyQuality, toShop, clock, setView, THREE, BENCH_Y, thumbs: () => Object.fromEntries(LEVELS.map(d => [d.id, d.thumb])) };
  resize(dprCap * res);
  requestAnimationFrame(frame);
  if (SPLIT) { $('btnShop').textContent = 'Back to All Relics'; $('mShop').textContent = 'Back to All Relics'; $('load').classList.remove('on'); $('shop').classList.remove('on'); openLevel(LEVELS[0].id); return; }
  makeThumbs().then(() => { $('load').classList.remove('on'); buildShop(); G.mode = 'shop'; if (qs.get('level')) openLevel(qs.get('level')); });
}

/* ---------- quality ---------- */
function applyQuality(q) { qCap = q; R.q = q; dprCap = TIERS[q].dpr; res = 1; setQuality(q); resize(dprCap * res); $('mQ').textContent = 'Effects: ' + ['low', 'medium', 'high', 'ultra'][q]; }
function cycleQuality() { const q = (qCap + 3) % 4; store.set('rw_q2', q); applyQuality(q); }

/* ---------- workshop ---------- */
async function makeThumbs() {
  const all = LEVELS; let i = 0;
  for (const def of all) {
    $('loadTxt').textContent = 'Laying out ' + def.name + '…'; $('loadBar').style.width = (i / all.length * 100) + '%';
    const tk = 'rw_td4_' + def.id; def.thumb = (!qs.get('bake') && THUMBS[def.id]) || store.get(tk);
    if (!def.thumb) await new Promise(r => setTimeout(r, 16));
    try { if (!def.thumb) { def.thumb = snapshot(def); store.set(tk, def.thumb); } } catch (e) { console.error('thumb ' + def.id, e); }
    i++;
  }
  $('loadBar').style.width = '100%';
  if (G.item) { G.item.dispose(); G.item = null; } if (G.before) { G.before.dispose(); G.before = null; }
}
function snapshot(def, keep) {
  if (!keep) loadLevel(def, { noBefore: true });
  const S = 360, old = CAM.off; CAM.off = 0; const q = R.q; R.q = Math.min(1, R.q);
  R.renderer.setPixelRatio(1); R.renderer.setSize(S, S, false); R.composer.setPixelRatio(1); R.composer.setSize(S, S); R.W = R.H = S;
  R.camera.aspect = 1; R.camera.updateProjectionMatrix(); RIG.spin = 0; RIG.home = false;
  if (!keep) { RIG.q.setFromEuler(new THREE.Euler(.32, -.5, 0, 'YXZ')); } setView({ preset: 'full', k: .95 }, true);
  G.time += .016; updateGame(0); updateParticles(0, R.camera, S); render();
  const url = R.renderer.domElement.toDataURL('image/jpeg', .82);
  CAM.off = old; R.q = q; resize(dprCap * res); R.camera.aspect = innerWidth / innerHeight; R.camera.updateProjectionMatrix();
  return url;
}
function buildShop() {
  const grid = $('grid'); grid.innerHTML = '';
  const list = LEVELS.concat(UPCOMING).sort((a, b) => a.num - b.num);
  list.forEach((def, i) => {
    const s = save[def.id] || {}, up = !def.build, el = document.createElement('button'); el.className = 'tile' + (s.restored ? ' restored' : '') + (up ? ' up' : '');
    const img = store.get('rw_thumb_' + def.id) || def.thumb || '';
    el.innerHTML = `<div class="th">${img ? `<img alt="" src="${img}">` : ''}<span class="num">${String(def.num || i + 1).padStart(2, '0')}</span><span class="pc">${up ? 'Soon' : s.restored ? 'Restored' : (s.pct || 0) + '%'}</span></div><div class="meta"><b>${def.name}</b><span>${def.complexity || ''}${def.minutes ? ' · ' + def.minutes : ''}</span><u><i style="width:${s.restored ? 100 : (s.pct || 0)}%"></i></u></div>`;
    if (up) el.style.opacity = .55;
    el.onclick = () => { sfx('click'); ac(); if (up) { toast('This relic is still on its way to the workshop'); return; } openLevel(def.id); };
    grid.appendChild(el);
  });
  const done = LEVELS.filter(d => (save[d.id] || {}).restored).length; $('shopSub').textContent = done ? `${done} of ${list.length} relics restored` : 'Pick any relic to bring back to life';
}
function toShop() {
  if (SPLIT) { toLauncher(); return; }
  endGuide(); cancelAll(); setLoop(null); resetPointers();
  G.mode = 'shop'; document.body.className = 'shop'; $('done').classList.remove('on'); $('intro').classList.remove('on'); $('shop').classList.add('on'); $('cmp').classList.add('hide');
  R.cmp = null; setTool(null); buildShop(); if (G.item) { RIG.spin = .25; setView({ preset: 'show' }); }
}
function openLevel(id) {
  const def = LEVELS.find(d => d.id === id); if (!def) return;
  loadLevel(def); G.mode = 'intro'; document.body.className = 'intro'; $('shop').classList.remove('on'); $('intro').classList.add('on');
  $('inName').textContent = def.name; $('inMeta').textContent = `${def.complexity} · ${G.steps.length} steps · ${def.minutes}`;
  $('inDesc').textContent = def.intro || def.blurb || '';
  const s = save[id] || {}; const can = s.step > 0 && s.step < G.steps.length && !s.restored; $('inCont').classList.toggle('hide', !can); if (can) $('inCont').textContent = 'Continue from step ' + (s.step + 1);
  $('inStart').textContent = s.restored ? 'Restore Again' : 'Start Restoring';
  RIG.spin = .3; setView({ preset: 'show' });
}
function startLevel(def, from = 0) {
  if (G.mode !== 'intro' || G.level !== def) loadLevel(def);
  $('intro').classList.remove('on'); $('shop').classList.remove('on'); $('done').classList.remove('on'); document.body.className = 'play';
  G.mode = 'play'; G.t0 = G.time; RIG.spin = 0; resetView();
  if (from > 0) ff(from); else enterStep(0);
}
function complete() {
  G.mode = 'done'; G.step = G.steps.length; setTool(null); setLoop(null); endGuide(); document.body.className = 'done'; R.cmp = null; $('cmp').classList.add('hide');
  sfx('win'); vib([40, 60, 40]); resetView(); setView({ preset: 'show' }); RIG.spin = .35;
  for (let i = 0; i < 10; i++) later(i * 150, () => confetti(new THREE.Vector3(CAM.t.x, CAM.t.y + 2, CAM.t.z), 18));
  const s = save[G.level.id] || (save[G.level.id] = {}); s.restored = true; s.pct = 100; s.step = 0; s.time = Math.round(G.time - (G.t0 || 0)); persist();
  later(900, () => { try { const url = snapshot(G.level, true); store.set('rw_thumb_' + G.level.id, url); } catch (e) { console.error(e); } });
  $('doneSub').textContent = G.level.outro || 'From a neglected relic to a showroom piece.'; $('dSteps').textContent = G.steps.length + '/' + G.steps.length;
  const t = s.time; $('dTime').textContent = Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0');
  later(1500, () => { if (G.mode === 'done') $('done').classList.add('on'); });
}
function openMenu() { if (G.mode !== 'play') return; G.paused = true; $('menuSub').textContent = G.level.name + ' · Step ' + (G.step + 1) + ' of ' + G.steps.length; $('menu').classList.add('on'); }
function closeMenu() { G.paused = false; $('menu').classList.remove('on'); }

function gallery(kinds) {
  const g = new THREE.Group(); g.name = 'gallery'; R.scene.add(g); if (G.item) G.item.root.visible = false;
  kinds.forEach((k, i) => { const t = makeTool(k); t.userData.body.rotation.set(.35, .6, -.25); t.position.set((i % 4 - 1.5) * 2.3, 2.4 - Math.floor(i / 4) * 2.6, 0); g.add(t); });
  CAM.gt.set(0, -.2, 0); CAM.t.copy(CAM.gt); CAM.gdist = CAM.dist = 15.5; CAM.el = CAM.gel = .15; CAM.az = CAM.gaz = 0; G.mode = 'gallery'; $('shop').classList.remove('on'); document.body.className = 'intro';
}
/* ---------- test helper: what to do on screen for the current step ---------- */
function auto() {
  const s = st(); if (!s || G.mode !== 'play') return null;
  const P = v => { const q = project(v); return { x: Math.round(q.x), y: Math.round(q.y), ok: q.ok }; };
  let mk = []; try { mk = (s.markers ? s.markers.call(s) : []).filter(m => m.vis !== false).map(m => P(m.pos)); } catch (e) { }
  let demo = null; try { const d = s.tut && s.tut.demo && s.tut.demo.call(s); if (d) demo = { type: d.type, pts: (d.pts || []).map(P) }; } catch (e) { }
  const out = { kind: s.kind, id: s.id, mk, demo, busy: G.busy || G.finishing || RIG.flipping, needsHold: !!s.needsHold, phase: s.phase, canFinish: !!s.canFinish };
  if (s.kind === 'paint') {
    const bb = { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 }; const keys = s.groups ? s.groups[s.sq].keys : s.keys;
    for (const k of keys) { const p = G.item.parts[k]; if (!p || !p.g.visible) continue; p.g.traverse(o => { if (!o.isMesh || o.userData.proxy) return; o.geometry.computeBoundingBox(); const b = o.geometry.boundingBox; for (let i = 0; i < 8; i++) { const v = new THREE.Vector3(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z).applyMatrix4(o.matrixWorld), q = P(v); bb.x0 = Math.min(bb.x0, q.x); bb.y0 = Math.min(bb.y0, q.y); bb.x1 = Math.max(bb.x1, q.x); bb.y1 = Math.max(bb.y1, q.y); } }); }
    out.bbox = bb;
  }
  if (s.kind === 'trace') out.paths = s.paths.filter(p => p.cur < 1).map(p => p.samples.map(v => P(G.item.parts[p.key].g.localToWorld(v.clone()))));
  if (s.kind === 'snap') { const x = s.items.find(i => !i.done && s.ready(i)); if (x) { const pp = G.item.parts[x.key]; out.from = P(pp.g.localToWorld(pp.center.clone())); out.to = P(s.goalWorld(x)); } }
  if (s.kind === 'cycle') { out.a = P(s.tip(s.t > .5 ? 1 : 0)); out.b = P(s.tip(s.t > .5 ? 0 : 1)); }
  if (s.kind === 'bath') { out.item = P(G.item.root.position); out.depthPx = P(G.item.root.position.clone().add(new THREE.Vector3(0, -(s.depth || 2.5), 0))).y - out.item.y; out.c = P(s.c ? s.c.position.clone().add(new THREE.Vector3(0, 1.2, 0)) : new THREE.Vector3()); }
  if (s.kind === 'rotate') { const c = P(s.c || (s.center ? s.center() : new THREE.Vector3())); out.c = c; }
  return out;
}
/* ---------- loop ---------- */
let shopSkip = 0;
function frame(ts) {
  requestAnimationFrame(frame);
  const raw = (ts - lastTs) / 1000 || .016;
  let dt = Math.min(G.dtCap || .05, raw); lastTs = ts; if (G.paused) dt = 0;
  /* adaptive quality: after a short warm-up, if most recent frames miss ~36 fps drop a tier;
     below the lowest tier shrink the render resolution instead. Long hitches (level loads) are ignored. */
  if (dt > 0 && raw < .25 && !qs.get('lowq') && !qs.get('noadapt')) {
    frames++; slow = slow * .94 + (raw > .028 ? .06 : 0);
    if (frames > 45 && slow > .6) {
      slow = 0; frames = 0;
      if (qCap > 0) applyQuality(qCap - 1);
      else if (res > .55) { res = Math.max(.55, res - .15); resize(dprCap * res); }
    }
  }
  /* the workshop shelf only needs a slow spin behind the menu: draw it at ~20 fps */
  if (G.mode === 'shop' && $('shop').classList.contains('on') && (shopSkip++ % 3)) { tickTweens(dt); return; }
  G.time += dt; tickTweens(dt); tickKeys(dt);
  updateGame(dt);
  const s = st();
  if (G.mode === 'play' && s && s.compare && G.before) { R.cmp = { x: G.cmp, before: b => { G.before.root.visible = b; G.item.root.visible = !b; } }; }
  else { R.cmp = null; if (G.item) G.item.root.visible = true; if (G.before) G.before.root.visible = false; }
  updateParticles(dt, R.camera, R.H * R.dpr);
  render();
  if (G.item && R.cmp) { G.item.root.visible = true; G.before.root.visible = false; }
  updateUI(dt);
}

boot();
