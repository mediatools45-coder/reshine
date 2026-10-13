/* screen-space target rings that follow 3D points (dimmed when hidden behind the object) */
import * as THREE from 'three';
import { G, CAM } from '../game/game.js';
import { R, project } from '../render/engine.js';
import { clamp, $ } from '../core/util.js';

const UI = { markers: [] };
let nudge = () => { };
export function onMarkerTap(fn) { nudge = fn; }
/* ---------- markers ---------- */
const RC = new THREE.Raycaster();
function occluded(m, pos) {
  if (--m.occT > 0) return m.occ; m.occT = 8 + (Math.random() * 4 | 0);
  const cp = R.camera.position, d = pos.clone().sub(cp), dist = d.length(); RC.set(cp, d.normalize()); RC.far = dist - .15;
  const objs = []; G.item.root.traverse(o => { if (o.isMesh && o.visible && !o.userData.proxy && o.material && o.material.visible !== false && !o.material.transparent) objs.push(o); });
  m.occ = RC.intersectObjects(objs, false).length > 0; return m.occ;
}
export function updateMarkers(list) {
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

