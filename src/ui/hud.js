/* HUD: step title + progress, tool pill, chips, hold/finish buttons, toast, compare slider, pause menu, guide hand */
import { G, RIG, st, finishStep, skipStep, turnItem, resetView, setView, canAct, HOOK } from '../game/game.js';
import { sfx, AU } from '../fx/audio.js';
import { clamp, $, store } from '../core/util.js';
import { toolName } from '../game/systems/index.js';
import { ICONS } from './icons.js';
import { updateMarkers, onMarkerTap } from './markers.js';
import { startHand, stopHand, updateHand } from './hand.js';

export const ico = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[k] || ICONS.hand}</svg>`;
export const UI = { tt: null, chipsKey: null, chipEls: [], idle: 0, stuck: 0, guide: null };
export function toast(msg, ms = 2000) { const t = $('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(UI.tt); UI.tt = setTimeout(() => t.classList.remove('on'), ms); }
G.toast = toast;
const nudge = () => { UI.idle = 0; UI.stuck = 0; };
onMarkerTap(nudge);

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
  const turnOk = s && s.canTurn && !G.busy && !RIG.flipping && !G.finishing && G.mode === 'play';
  $('btnTurn').disabled = !turnOk;
  if (!s || G.mode !== 'play') { updateMarkers([]); updateHand(dt); return; }
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
  if (s.compare) { const x = G.cmp * innerWidth; $('cmpLine').style.left = x + 'px'; $('cmpGrab').style.left = x + 'px'; $('cmpL').style.opacity = G.cmp > .18 ? 1 : 0; $('cmpR').style.opacity = G.cmp < .82 ? 1 : 0; }
}

/* ---------- guide: the pointing hand shows the gesture (first time a step type appears, on Help, or when idle) ---------- */
export function startGuide(s, mode) { if (!s || !s.tut) return; UI.guide = { st: s, mode, until: G.time + (mode === 'stuck' ? 8 : 10) }; if (s.tut.demo) startHand(() => s.tut.demo.call(s)); UI.idle = 0; if (mode !== 'first') toast(s.hint || 'Follow the hand', 2400); }
export function endGuide() { if (!UI.guide) return; UI.guide = null; stopHand(); }
function firstTime(s) {
  if (!s.tut) return; const key = 'rw_t_' + (s.tutKey || s.kind || s.id);
  if (store.get(key) === '1') return; store.set(key, '1'); startGuide(s, 'first');
}

/* ---------- bindings ---------- */
export function bindUI(actions) {
  $('btnMenu').onclick = () => { sfx('click'); actions.menu(); };
  $('mResume').onclick = () => { sfx('click'); actions.closeMenu(); };
  $('mSnd').onclick = () => { AU.on = !AU.on; $('mSnd').textContent = 'Sound: ' + (AU.on ? 'on' : 'off'); store.set('rw_snd', AU.on ? '1' : '0'); if (AU.on) sfx('click'); };
  $('mAuto').onclick = () => { G.autoTurn = !G.autoTurn; store.set('rw_auto', G.autoTurn ? '1' : '0'); $('mAuto').textContent = 'Auto turn: ' + (G.autoTurn ? 'on' : 'off'); sfx('click'); };
  $('mQ').onclick = () => { actions.cycleQuality(); sfx('click'); };
  $('mShop').onclick = () => { sfx('click'); actions.closeMenu(); actions.shop(); };
  $('mRestart').onclick = () => { sfx('click'); actions.closeMenu(); actions.restart(); };
  $('btnSkip').onclick = () => { sfx('click'); nudge(); skipStep(); };
  $('btnHelp').onclick = () => { sfx('click'); nudge(); const s = st(); if (s) startGuide(s, 'help'); };
  $('btnView').onclick = () => { sfx('click'); nudge(); resetView(); const s = st(); setView((s && s.cam) || { preset: G.mode === 'play' ? 'full' : 'show' }); };
  $('btnTurn').onclick = () => { nudge(); const s = st(); if (s && s.canTurn && !G.busy && !G.finishing) turnItem(); };
  const hb = $('btnHold');
  const hd = e => { e.preventDefault(); G.hold = true; nudge(); try { hb.setPointerCapture(e.pointerId); } catch (_) { } endGuide(); }, hu = () => { G.hold = false; };
  hb.addEventListener('pointerdown', hd); hb.addEventListener('pointerup', hu); hb.addEventListener('pointercancel', hu); hb.addEventListener('lostpointercapture', hu);
  $('btnFinish').onclick = () => finishStep();
  const grab = $('cmpGrab'); let dragC = false; const mv = e => { const s = st(); if (s && s.compare) s.setX(e.clientX / innerWidth); };
  grab.addEventListener('pointerdown', e => { dragC = true; nudge(); endGuide(); grab.setPointerCapture(e.pointerId); mv(e); });
  grab.addEventListener('pointermove', e => { if (dragC) mv(e); }); const ue = () => { dragC = false; }; grab.addEventListener('pointerup', ue); grab.addEventListener('pointercancel', ue);
  G.ui = k => { const s = st(); if (!s) return; if (k === 'hold') $('btnHold').classList.toggle('hide', !s.needsHold); if (k === 'finishBtn') $('btnFinish').classList.toggle('hide', !(s.compare && s.canFinish)); };
  HOOK.ui = (ev, s, x) => {
    if (ev === 'nudge') nudge(); else if (ev === 'used') endGuide();
    else if (ev === 'enter') { endGuide(); refreshUI(); UI.idle = 0; UI.chipsKey = null; if (G.mode === 'play') setTimeout(() => { if (st() === s && !G.finishing) firstTime(s); }, 700); }
    else if (ev === 'finish') { endGuide(); toast(x ? 'Step skipped' : '✓ ' + (s.done || 'Done'), 1500); }
    else if (ev === 'progress') actions.progress && actions.progress(s);
  };
}
