/* HUD, markers, tutorial hand + outline, coach tips, toast, compare slider, menus */
import * as THREE from 'three';
import { G, RIG, CAM, st, finishStep, skipStep, turnItem, resetView, setView, canAct, HOOK } from './game.js';
import { R, project } from './engine.js';
import { sfx, AU } from './audio.js';
import { clamp, lerp, ease, $, store } from './util.js';
import { toolName } from './systems.js';

const ICONS = {
  hammer: '<path d="M13 4l7 7-3 3-7-7z"/><path d="M11.5 9.5L4 17l3 3 7.5-7.5"/>', punch: '<path d="M4 20l9-9"/><path d="M13 11l5-5 2 2-5 5z"/>',
  wire: '<rect x="3" y="10" width="15" height="5" rx="1.5"/><path d="M6 15v5M9 15v5M12 15v5M15 15v5M18 12h3"/>', soft: '<rect x="3" y="10" width="15" height="5" rx="1.5"/><path d="M6 15v4M9 15v4M12 15v4M15 15v4"/>', detail: '<path d="M4 20l9-9"/><path d="M13 11l3-6 3 3-6 3z"/>',
  soap: '<rect x="3" y="11" width="13" height="7" rx="2.5"/><circle cx="19" cy="7" r="2.2"/><circle cx="14" cy="6" r="1.3"/>',
  pick: '<path d="M4 20L14 10"/><path d="M11 4c5 0 9 4 9 9l-4-3-3-2z"/>', sand: '<rect x="3" y="8" width="18" height="9" rx="2"/><path d="M7 12h.01M11 12h.01M15 12h.01M9 14.5h.01M13 14.5h.01"/>',
  grind: '<circle cx="8.5" cy="15.5" r="5"/><path d="M12.5 11.5l7-7M16 4h4v4"/>', buff: '<circle cx="9" cy="15" r="6"/><circle cx="9" cy="15" r="2"/><path d="M13 11l7-7"/>',
  file: '<path d="M3 21l10-10"/><path d="M12 5l7 7M15 2l7 7-3 3-7-7z"/>', cloth: '<path d="M3 8c4-3 12 3 18 0v9c-6 3-14-3-18 0z"/>', micro: '<path d="M3 8c4-3 12 3 18 0v9c-6 3-14-3-18 0z"/><path d="M8 11v3M13 12v3"/>',
  sponge: '<rect x="4" y="7" width="16" height="11" rx="3"/><circle cx="9" cy="11" r="1"/><circle cx="14" cy="13" r="1"/>', pad: '<rect x="4" y="8" width="16" height="9" rx="3"/><path d="M7 12h10"/>',
  stain: '<path d="M5 21l8-8"/><path d="M13 13l5-6 3 3-6 5z"/>', finish: '<path d="M5 21l8-8"/><path d="M13 13l5-6 3 3-6 5z"/><path d="M3 18h3"/>',
  hand: '<path d="M8 13V6.5a1.5 1.5 0 013 0V11M11 11V4.5a1.5 1.5 0 013 0V11M14 11V6a1.5 1.5 0 013 0v7c0 4-2 8-6 8-3 0-4.5-2-6.5-5.5L4 12.5a1.5 1.5 0 012.5-1.5L8 13"/>',
  spray: '<rect x="7" y="9" width="8" height="12" rx="2"/><path d="M9 9V6h4v3M16 5h.01M18.5 3.5h.01M18.5 7h.01"/>', paint: '<rect x="7" y="9" width="8" height="12" rx="2"/><path d="M9 9V6h4v3M17 4l4 1M17 7l4 .5"/>',
  oil: '<path d="M6 20h9l2-9H8z"/><path d="M15 11l5-5"/>', water: '<path d="M12 3s6 6.5 6 11a6 6 0 01-12 0c0-4.5 6-11 6-11z"/>',
  screw: '<path d="M3 21l9-9"/><path d="M12 12l4-4 4 1-1-4-4-1-4 4"/>', pry: '<path d="M3 20l11-11"/><path d="M14 9l4-5 3 3-5 4z"/>',
  tweez: '<path d="M4 20L14 6l2 1L8 21zM20 20L10 6 8 7l8 14z"/>', puller: '<path d="M7 20V9M17 20V9M7 9a5 5 0 0110 0"/>', pliers: '<path d="M6 21l5-9M18 21l-5-9"/><path d="M11 12L8 3M13 12l3-9"/>',
  sandgun: '<path d="M3 11h11v5H3zM14 12h5l2-2M7 16v4"/>', shiner: '<path d="M6 20h12v-8l-3-3H9l-3 3z"/><path d="M9 6V3h6v3"/>', compound: '<path d="M6 20h12v-8l-3-3H9l-3 3z"/><path d="M10 14h4"/>',
  vacuum: '<path d="M4 20l8-8"/><path d="M12 12a4 4 0 118 0v8h-8z"/>', blower: '<path d="M3 12h10"/><path d="M13 8h5a4 4 0 010 8h-5z"/><path d="M5 8c2 0 2 2 4 2M5 16c2 0 2-2 4-2"/>',
  filler: '<path d="M4 20l5-5"/><rect x="9" y="5" width="6" height="12" rx="1" transform="rotate(45 12 11)"/>', press: '<path d="M12 3v9"/><rect x="6" y="12" width="12" height="4" rx="2"/><path d="M4 20h16"/>',
  heat: '<path d="M8 20c-2-3 0-5 2-7s2-5 0-7c4 1 7 5 6 9-1 3-4 5-8 5z"/>', bath: '<path d="M13 2L5 14h6l-1 8 9-12h-6z"/>', magnify: '<circle cx="10" cy="10" r="6.5"/><path d="M15 15l6 6"/>',
  slider: '<path d="M12 3v18M7 8l-4 4 4 4M17 8l4 4-4 4"/>', crown: '<circle cx="12" cy="12" r="6"/><path d="M12 6V3M18 12h3"/>', none: '<circle cx="12" cy="12" r="3"/>'
};
export const ico = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[k] || ICONS.hand}</svg>`;

export const UI = { tt: null, markers: [], chipsKey: null, chipEls: [], idle: 0, stuck: 0, guide: null, tipsOff: store.get('rw_tips') === '0' };
export function toast(msg, ms = 2000) { const t = $('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(UI.tt); UI.tt = setTimeout(() => t.classList.remove('on'), ms); }
G.toast = toast;
const nudge = () => { UI.idle = 0; UI.stuck = 0; };

export function refreshUI() {
  const s = st(); if (!s) return;
  $('stepName').textContent = s.name; $('lvl').textContent = G.level.name + ' · Step ' + (G.step + 1) + ' of ' + G.steps.length;
  $('hint').textContent = s.hint || ''; $('sbLab').textContent = 'Step ' + (G.step + 1); $('sbPct').textContent = '0%'; $('stepBar').classList.remove('ok'); $('stepBar').querySelector('b').style.width = '0%';
  $('btnSkip').classList.remove('pulse'); UI.stuck = 0;
  const icoK = s.compare ? 'slider' : s.kind === 'bath' ? 'bath' : (s.tool || 'hand');
  $('toolIco').innerHTML = ico(icoK); $('toolName').textContent = s.toolLabel || toolName(s.tool); $('gest').textContent = s.input || '';
  $('btnHold').classList.toggle('hide', !s.needsHold); $('btnFinish').classList.toggle('hide', !(s.compare && s.canFinish)); $('cmp').classList.toggle('hide', !s.compare);
  const b = document.body; b.classList.remove('stepIn'); void b.offsetWidth; b.classList.add('stepIn');
}
export function updateUI(dt) {
  const s = st();
  $('coins').textContent = G.coins;
  const turnOk = s && s.canTurn && !G.busy && !RIG.flipping && !G.finishing && G.mode === 'play';
  $('btnTurn').disabled = !turnOk;
  if (!s || G.mode !== 'play') { updateMarkers([]); updateHand(dt); outline(null); return; }
  const p = clamp(s.prog || 0, 0, 1), sb = $('stepBar');
  sb.querySelector('b').style.width = (p * 100).toFixed(1) + '%'; $('sbPct').textContent = p >= .995 ? '✓' : Math.round(p * 100) + '%'; sb.classList.toggle('ok', p >= .995);
  const chips = G.chips || [];
  if (UI.chipsKey !== chips) { UI.chipsKey = chips; const box = $('chips'); box.innerHTML = ''; UI.chipEls = chips.length > 1 ? chips.map(c => { const d = document.createElement('div'); d.className = 'chip'; d.innerHTML = `<span>${c.label}<em>0%</em></span><u><b></b></u>`; box.appendChild(d); return d; }) : []; }
  UI.chipEls.forEach((d, i) => { const v = clamp(chips[i].get(), 0, 1); d.querySelector('b').style.width = (v * 100).toFixed(0) + '%'; d.querySelector('em').textContent = v >= .985 ? '✓' : Math.round(v * 100) + '%'; d.classList.toggle('ok', v >= .985); });
  $('btnHold').classList.toggle('hide', !s.needsHold); if (s.needsHold) $('btnHold').classList.toggle('down', !!G.hold);
  let mk = []; try { mk = !G.finishing && !G.busy && s.markers ? s.markers.call(s) : []; } catch (e) { console.error(e); }
  updateMarkers(mk);
  UI.idle += dt; UI.stuck += dt;
  if (UI.guide && (UI.guide.st !== s || G.time > UI.guide.until || G.finishing)) endGuide();
  if (!UI.guide && UI.idle > 8 && canAct() && s.tut && !G.down) { UI.idle = 0; startGuide(s, 'stuck'); }
  $('btnSkip').classList.toggle('pulse', UI.stuck > 20 && !G.finishing);
  updateHand(dt);
  outline(UI.guide ? guideNodes(UI.guide.st) : null);
  if (s.compare) { const x = G.cmp * innerWidth; $('cmpLine').style.left = x + 'px'; $('cmpGrab').style.left = x + 'px'; $('cmpL').style.opacity = G.cmp > .18 ? 1 : 0; $('cmpR').style.opacity = G.cmp < .82 ? 1 : 0; }
}

/* ---------- markers ---------- */
const RC = new THREE.Raycaster();
function occluded(m, pos) {
  if (--m.occT > 0) return m.occ; m.occT = 8 + (Math.random() * 4 | 0);
  const cp = R.camera.position, d = pos.clone().sub(cp), dist = d.length(); RC.set(cp, d.normalize()); RC.far = dist - .15;
  const objs = []; G.item.root.traverse(o => { if (o.isMesh && o.visible && !o.userData.proxy && o.material && o.material.visible !== false && !o.material.transparent) objs.push(o); });
  m.occ = RC.intersectObjects(objs, false).length > 0; return m.occ;
}
function updateMarkers(list) {
  const box = $('markers'), sc = clamp(14 / CAM.dist, .75, 1.4);
  while (UI.markers.length < list.length) {
    const el = document.createElement('div'); el.className = 'mk'; el.innerHTML = '<div class="ring"></div><div class="fill"></div><div class="lab"></div>'; box.appendChild(el);
    const m = { el, ring: el.firstChild, fill: el.children[1], lab: el.children[2], tap: null, occT: 0, occ: false };
    el.addEventListener('pointerdown', e => { if (!m.tap) return; e.stopPropagation(); nudge(); m.tap(); }); UI.markers.push(m);
  }
  UI.markers.forEach((m, i) => {
    const d = list[i]; if (!d || d.vis === false) { m.el.style.display = 'none'; return; }
    const q = project(d.pos); if (!q.ok) { m.el.style.display = 'none'; return; }
    m.el.style.display = 'block'; m.el.style.transform = `translate(${q.x.toFixed(1)}px,${q.y.toFixed(1)}px)`;
    m.el.style.opacity = occluded(m, d.pos) ? .25 : 1; const r = (d.r || 26) * sc * 2;
    m.ring.style.width = m.ring.style.height = m.fill.style.width = m.fill.style.height = r + 'px';
    m.fill.style.setProperty('--p', d.prog || 0); m.fill.style.display = d.prog ? 'block' : 'none';
    m.lab.style.display = d.label ? 'block' : 'none'; if (d.label) { m.lab.textContent = d.label; m.lab.style.top = (r / 2 + 6) + 'px'; }
    m.tap = d.tap || null; m.el.classList.toggle('tap', !!d.tap);
  });
}

/* ---------- tutorial hand ---------- */
const HAND = { on: false, t: 0, fn: null, d: null };
function startHand(fn) { HAND.fn = fn; HAND.t = 0; HAND.on = true; }
function stopHand() { HAND.on = false; HAND.fn = null; $('hand').classList.remove('on', 'press', 'rip'); }
const tri = k => 1 - Math.abs(2 * (k % 1) - 1);
function handPose(d, t) {
  const W = innerWidth, H = innerHeight, P = (d.pts || []).map(w => project(w)).filter(q => q.ok);
  const lift = (k, a) => (1 - ease(clamp(k / a, 0, 1))) * 46;
  switch (d.type) {
    case 'tap': { if (!P.length) return null; const cyc = 1.15, i = Math.floor(t / cyc) % P.length, k = (t % cyc) / cyc, q = P[i]; return { x: q.x, y: q.y + (k < .4 ? lift(k, .4) : (k > .7 ? ease((k - .7) / .3) * 30 : 0)), p: k > .4 && k < .62, rip: k > .4 && k < .75 }; }
    case 'drag': { if (P.length < 2) return null; const cyc = 2.6, k = (t % cyc) / cyc, a = P[0], b = P[1]; let e = 0, p = false, off = 0; if (k < .2) off = lift(k, .2); else if (k < .3) p = true; else if (k < .78) { p = true; e = ease((k - .3) / .48); } else if (k < .86) { p = true; e = 1; } else { e = 1; off = ease((k - .86) / .14) * 40; } return { x: lerp(a.x, b.x, e), y: lerp(a.y, b.y, e) + off, p }; }
    case 'scrub': { if (P.length < 2) return null; const cyc = 3, k = (t % cyc) / cyc, a = P[0], b = P[1]; if (k < .12) return { x: a.x, y: a.y + lift(k, .12), p: false }; if (k > .9) return { x: a.x, y: a.y + ease((k - .9) / .1) * 40, p: false }; const m = ease(tri(((k - .12) / .78) * 2)); return { x: lerp(a.x, b.x, m), y: lerp(a.y, b.y, m), p: true }; }
    case 'hold': { if (!P.length) return null; const cyc = 2.4, k = (t % cyc) / cyc, q = P[0]; return { x: q.x, y: q.y + (k < .2 ? lift(k, .2) : k > .88 ? ease((k - .88) / .12) * 40 : 0), p: k > .2 && k < .88, rip: k > .2 && k < .88 }; }
    case 'circle': { if (!P.length) return null; const cyc = 2.8, k = (t % cyc) / cyc, q = P[0], R0 = 34; if (k < .1) return { x: q.x + R0, y: q.y + lift(k, .1), p: false }; if (k > .92) return { x: q.x + R0, y: q.y + 30, p: false }; const a = ((k - .1) / .82) * Math.PI * 4; return { x: q.x + Math.cos(a) * R0, y: q.y + Math.sin(a) * R0 * .75, p: true }; }
    case 'slide': { const k = (t % 3) / 3, e = ease(tri(k)); return { x: W * (.2 + .6 * e), y: H * .55, p: true }; }
    case 'swipe': { if (P.length < 2) return null; const cyc = 1.6, k = (t % cyc) / cyc, a = P[0], b = P[1]; if (k < .25) return { x: a.x, y: a.y + lift(k, .25), p: false }; const e = ease(clamp((k - .25) / .45, 0, 1)); return { x: lerp(a.x, b.x, e), y: lerp(a.y, b.y, e), p: k < .75 }; }
  }
  return null;
}
function updateHand(dt) {
  const h = $('hand'); if (!HAND.on) return; HAND.t += dt;
  let d = null; try { d = HAND.fn ? HAND.fn() : null; } catch (e) { }
  const o = d ? handPose(d, HAND.t) : null; if (!o) { h.classList.remove('on'); return; }
  h.classList.add('on'); h.style.transform = `translate(${o.x.toFixed(1)}px,${o.y.toFixed(1)}px)`; h.classList.toggle('press', !!o.p); h.classList.toggle('rip', !!o.rip);
}
/* ---------- guide: white outline on the target + pointer hand ---------- */
export function startGuide(s, mode) { if (!s || !s.tut) return; UI.guide = { st: s, mode, until: G.time + (mode === 'stuck' ? 8 : 12) }; if (s.tut.demo) startHand(() => s.tut.demo.call(s)); UI.idle = 0; if (mode === 'stuck') toast(s.hint || 'Follow the hand', 2400); }
export function endGuide() { if (!UI.guide) return; UI.guide = null; stopHand(); }
function guideNodes(s) { let l = []; try { l = (s.hl ? s.hl() : s.nodes()) || []; } catch (e) { } return l.filter(n => n && n.isMesh && !n.userData.proxy && shown(n)); }
const shown = n => { for (let k = n; k; k = k.parent) if (!k.visible) return false; return true; };
const OL = { m: document.createElement('canvas'), f: 0, on: false, s: .55 };
function outline(nodes) {
  const c = $('outl');
  if (!nodes || !nodes.length) { if (OL.on) { c.style.opacity = 0; OL.on = false; } return; }
  const w = Math.max(2, Math.round(innerWidth * OL.s)), h = Math.max(2, Math.round(innerHeight * OL.s));
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; OL.m.width = w; OL.m.height = h; }
  if (!OL.on) { OL.on = true; c.style.opacity = 1; }
  const m = OL.m.getContext('2d'), ctx = c.getContext('2d');
  if ((OL.f++ & 1) === 0) {
    m.clearRect(0, 0, w, h); m.fillStyle = '#fff'; const mvp = new THREE.Matrix4(), cam = R.camera, v = new THREE.Vector4();
    let budget = 60000;
    for (const n of nodes) {
      const g = n.geometry, P = g.attributes.position, I = g.index, nv = P.count; mvp.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse).multiply(n.matrixWorld);
      const X = new Float32Array(nv), Y = new Float32Array(nv), Wv = new Float32Array(nv), e = mvp.elements;
      for (let i = 0; i < nv; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i), ww = e[3] * x + e[7] * y + e[11] * z + e[15]; Wv[i] = ww; X[i] = ((e[0] * x + e[4] * y + e[8] * z + e[12]) / ww * .5 + .5) * w; Y[i] = (1 - ((e[1] * x + e[5] * y + e[9] * z + e[13]) / ww * .5 + .5)) * h; }
      const cnt = I ? I.count : nv, step = cnt > 30000 ? 6 : 3; if ((budget -= cnt) < 0) break;
      m.beginPath();
      for (let t = 0; t < cnt; t += step) { const a = I ? I.getX(t) : t, b = I ? I.getX(t + 1) : t + 1, d = I ? I.getX(t + 2) : t + 2; if (Wv[a] <= 0 || Wv[b] <= 0 || Wv[d] <= 0) continue; m.moveTo(X[a], Y[a]); m.lineTo(X[b], Y[b]); m.lineTo(X[d], Y[d]); m.closePath(); }
      m.fill('nonzero'); m.lineWidth = 1.2; m.strokeStyle = '#fff'; m.stroke();
    }
  }
  ctx.globalCompositeOperation = 'source-over'; ctx.clearRect(0, 0, w, h);
  const r = 2.4 * (1 + .25 * Math.sin(G.time * 5)), k = 12; for (let i = 0; i < k; i++) { const a = i / k * Math.PI * 2; ctx.drawImage(OL.m, Math.cos(a) * r, Math.sin(a) * r); }
  ctx.globalCompositeOperation = 'destination-out'; ctx.drawImage(OL.m, 0, 0); ctx.globalCompositeOperation = 'source-over';
}

/* ---------- coach (first time a step type shows up) ---------- */
const seen = id => store.get('rw_t_' + id) === '1';
export function maybeCoach(s) {
  if (UI.tipsOff || !s.tut) return;
  const key = (s.tutKey || s.kind || s.id); if (seen(key)) { return; } store.set('rw_t_' + key, '1');
  startGuide(s, 'first');
  $('cTitle').textContent = s.tut.title || s.name; $('cBody').textContent = s.tut.body || s.hint || ''; $('coach').classList.add('on');
  clearTimeout(UI.ct); UI.ct = setTimeout(hideCoach, 6500);
}
export function hideCoach() { $('coach').classList.remove('on'); }

/* ---------- bindings ---------- */
export function bindUI(actions) {
  $('btnMenu').onclick = () => { sfx('click'); actions.menu(); };
  $('mResume').onclick = () => { sfx('click'); actions.closeMenu(); };
  $('mTut').onclick = () => { UI.tipsOff = false; store.set('rw_tips', '1'); for (const k of Object.keys(localStorage)) if (k.startsWith('rw_t_')) store.set(k, '0'); actions.closeMenu(); const s = st(); if (s) { maybeCoach(s); startGuide(s, 'help'); } };
  $('mSnd').onclick = () => { AU.on = !AU.on; $('mSnd').textContent = 'Sound: ' + (AU.on ? 'on' : 'off'); store.set('rw_snd', AU.on ? '1' : '0'); if (AU.on) sfx('click'); };
  $('mAuto').onclick = () => { G.autoTurn = !G.autoTurn; store.set('rw_auto', G.autoTurn ? '1' : '0'); $('mAuto').textContent = 'Auto turn: ' + (G.autoTurn ? 'on' : 'off'); sfx('click'); };
  $('mQ').onclick = () => { actions.cycleQuality(); sfx('click'); };
  $('mShop').onclick = () => { sfx('click'); actions.closeMenu(); actions.shop(); };
  $('mRestart').onclick = () => { sfx('click'); actions.closeMenu(); actions.restart(); };
  $('btnSkip').onclick = () => { sfx('click'); nudge(); skipStep(); };
  $('btnHelp').onclick = () => { sfx('click'); nudge(); const s = st(); if (s) { startGuide(s, 'help'); if (s.tut) { $('cTitle').textContent = s.tut.title || s.name; $('cBody').textContent = s.tut.body || s.hint; $('coach').classList.add('on'); clearTimeout(UI.ct); UI.ct = setTimeout(hideCoach, 6500); } } };
  $('btnView').onclick = () => { sfx('click'); nudge(); resetView(); const s = st(); setView((s && s.cam) || { preset: 'full' }); };
  $('btnTurn').onclick = () => { nudge(); const s = st(); if (s && s.canTurn && !G.busy && !G.finishing) turnItem(); };
  $('cBtn').onclick = () => { sfx('click'); hideCoach(); };
  $('cSkip').onclick = () => { UI.tipsOff = true; store.set('rw_tips', '0'); hideCoach(); endGuide(); toast('Tips off. Tap Help any time.'); };
  const hb = $('btnHold');
  const hd = e => { e.preventDefault(); G.hold = true; nudge(); try { hb.setPointerCapture(e.pointerId); } catch (_) { } endGuide(); }, hu = () => { G.hold = false; };
  hb.addEventListener('pointerdown', hd); hb.addEventListener('pointerup', hu); hb.addEventListener('pointercancel', hu); hb.addEventListener('lostpointercapture', hu);
  $('btnFinish').onclick = () => finishStep();
  const grab = $('cmpGrab'); let dragC = false; const mv = e => { const s = st(); if (s && s.compare) s.setX(e.clientX / innerWidth); };
  grab.addEventListener('pointerdown', e => { dragC = true; nudge(); endGuide(); grab.setPointerCapture(e.pointerId); mv(e); });
  grab.addEventListener('pointermove', e => { if (dragC) mv(e); }); const ue = () => { dragC = false; }; grab.addEventListener('pointerup', ue); grab.addEventListener('pointercancel', ue);
  G.ui = k => { const s = st(); if (!s) return; if (k === 'hold') $('btnHold').classList.toggle('hide', !s.needsHold); if (k === 'finishBtn') $('btnFinish').classList.toggle('hide', !(s.compare && s.canFinish)); };
  HOOK.ui = (ev, s, x) => {
    if (ev === 'nudge') nudge(); else if (ev === 'used') { endGuide(); hideCoach(); }
    else if (ev === 'enter') { endGuide(); refreshUI(); UI.idle = 0; UI.chipsKey = null; if (G.mode === 'play') setTimeout(() => { if (st() === s && !G.finishing) maybeCoach(s); }, 700); }
    else if (ev === 'finish') { endGuide(); hideCoach(); toast(x ? 'Step skipped' : '✓ ' + (s.done || 'Done'), 1500); }
    else if (ev === 'progress') actions.progress && actions.progress(s);
  };
}
