/* Input component: touch, mouse, pen, wheel and keyboard → game intents.
   one finger / left mouse on the object → use the tool
   drag on empty space                  → spin the object freely (trackball)
   two fingers                          → pan + twist + pinch zoom
   right mouse drag                     → spin   ·   middle / shift+right drag → pan
   wheel / trackpad pinch               → zoom
   keys: arrows spin, +/- zoom, WASD pan, R reset view, T turn over */
import { R, raycast } from '../render/engine.js';
import { G, RIG, CAM, HOOK, st, canAct, pickAt, freePoint, endTool, rigDrag, rigRoll, camPan, camZoom, resetView, setView, turnItem } from '../game/game.js';
import { T, toolAim } from '../assets/tools.js';

const ptrs = new Map();
let mode = null, two = null;
const ui = (ev, ...a) => HOOK.ui && HOOK.ui(ev, ...a);
const rigLocked = () => { const s = st(); return G.mode === 'play' && s && s.lockRig; };

/* a stroke that starts on (or within a finger's width of) the object's silhouette goes to the tool */
function nearObject(x, y) {
  const it = G.item; if (!it) return false; const objs = [];
  it.root.traverseVisible(o => { if (o.isMesh && !o.userData.proxy && !o.userData.nofit) objs.push(o); });
  for (let k = 0; k < 9; k++) { const a = k / 8 * Math.PI * 2, r = k === 8 ? 0 : 24; if (raycast(x + Math.cos(a) * r, y + Math.sin(a) * r, objs)) return true; }
  return false;
}

function startTool(s, r) {
  mode = 'tool'; G.down = true; toolAim(r.hit, r.ray, true, freePoint(r.ray)); ui('used');
  try { s.onDown && s.onDown(r.hit, r.ray, r); } catch (er) { console.error(er); }
}
function startTwo() {
  if (mode === 'tool') endTool(); RIG.drag = false; mode = 'two';
  const [a, b] = [...ptrs.values()];
  two = { d: Math.hypot(a.x - b.x, a.y - b.y), ang: Math.atan2(b.y - a.y, b.x - a.x), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
}

export function bindControls(cv) {
  cv.addEventListener('contextmenu', e => e.preventDefault());
  cv.addEventListener('pointerdown', e => {
    if (G.mode === 'boot' || G.paused) return; ui('nudge'); try { cv.setPointerCapture(e.pointerId); } catch (_) { }
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, t: e.timeStamp, btn: e.button, shift: e.shiftKey });
    if (ptrs.size === 2) { startTwo(); return; }
    if (ptrs.size > 2) return;
    if (e.button === 1 || (e.button === 2 && e.shiftKey)) { mode = 'pan'; return; }
    if (e.button === 2) { mode = 'spin'; RIG.drag = !rigLocked(); RIG.w.set(0, 0, 0); return; }
    const s = st();
    if (s && canAct() && e.button === 0) {
      const r = pickAt(e.clientX, e.clientY); if (!r.hit && s.assist) r.hit = s.assist(e.clientX, e.clientY);
      if (r.hit || (s.grabAll && nearObject(e.clientX, e.clientY))) { startTool(s, r); return; }
    }
    mode = 'spin'; RIG.drag = !rigLocked(); RIG.w.set(0, 0, 0);
  });
  cv.addEventListener('pointermove', e => {
    const p = ptrs.get(e.pointerId), s = st();
    if (!p) { if (e.pointerType === 'mouse' && s && canAct() && T.node) { const r = pickAt(e.clientX, e.clientY); toolAim(r.hit, r.ray, false, freePoint(r.ray)); } return; }
    ui('nudge'); const dx = e.clientX - p.x, dy = e.clientY - p.y, dt = (e.timeStamp - p.t) / 1000; p.x = e.clientX; p.y = e.clientY; p.t = e.timeStamp;
    if (mode === 'two' && ptrs.size >= 2 && two) {
      const [a, b] = [...ptrs.values()], d = Math.max(20, Math.hypot(a.x - b.x, a.y - b.y)), ang = Math.atan2(b.y - a.y, b.x - a.x), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      camZoom(two.d / d); let da = ang - two.ang; da = Math.atan2(Math.sin(da), Math.cos(da));
      if (!rigLocked()) rigRoll(da); camPan(mx - two.mx, my - two.my);
      two.d = d; two.ang = ang; two.mx = mx; two.my = my;
    }
    else if (mode === 'spin') { if (RIG.drag) rigDrag(dx, dy, dt); }
    else if (mode === 'pan') camPan(dx, dy);
    else if (mode === 'tool' && s) { const r = pickAt(e.clientX, e.clientY); toolAim(r.hit, r.ray, true, freePoint(r.ray)); try { s.onMove && s.onMove(r.hit, r.ray, r); } catch (er) { console.error(er); } }
  });
  const up = e => {
    if (!ptrs.has(e.pointerId)) return; ptrs.delete(e.pointerId);
    if (mode === 'two') { if (ptrs.size < 2) { mode = ptrs.size ? 'wait' : null; two = null; } return; }
    if (mode === 'wait') { if (!ptrs.size) mode = null; return; }
    if (mode === 'tool') endTool(); else if (mode === 'spin') RIG.drag = false;
    mode = null;
  };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.addEventListener('wheel', e => { e.preventDefault(); if (G.mode === 'boot') return; ui('nudge'); camZoom(Math.exp(e.deltaY * (e.ctrlKey ? .01 : .0012))); }, { passive: false });
  /* keyboard */
  const held = new Set();
  addEventListener('keydown', e => {
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    const k = e.key.toLowerCase();
    if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'w', 'a', 's', 'd'].includes(k)) { held.add(k); e.preventDefault(); ui('nudge'); }
    else if (k === '+' || k === '=') camZoom(.88); else if (k === '-' || k === '_') camZoom(1 / .88);
    else if (k === 'r' || k === '0') { resetView(); const s = st(); if (G.mode === 'play') setView((s && s.cam) || { preset: 'full' }); }
    else if (k === 't') { const s = st(); if (s && s.canTurn && canAct()) turnItem(); }
  });
  addEventListener('keyup', e => held.delete(e.key.toLowerCase()));
  addEventListener('blur', () => held.clear());
  return dt => {
    if (!held.size || G.paused) return; const v = 420 * dt, p = 360 * dt;
    if (!rigLocked()) { if (held.has('arrowleft')) rigDrag(-v, 0, dt); if (held.has('arrowright')) rigDrag(v, 0, dt); if (held.has('arrowup')) rigDrag(0, -v, dt); if (held.has('arrowdown')) rigDrag(0, v, dt); RIG.w.set(0, 0, 0); }
    if (held.has('a')) camPan(p, 0); if (held.has('d')) camPan(-p, 0); if (held.has('w')) camPan(0, p); if (held.has('s')) camPan(0, -p);
  };
}
export function resetPointers() { ptrs.clear(); mode = null; two = null; G.down = false; RIG.drag = false; }
