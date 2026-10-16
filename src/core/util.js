import * as THREE from 'three';

export const TAU = Math.PI * 2;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const rnd = (a, b) => a + Math.random() * (b - a);
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
export const easeOut = t => 1 - Math.pow(1 - t, 3);
export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const $ = id => document.getElementById(id);

/* seeded rng so the "before" copy of an object matches the one being restored */
export function rng(seed) {
  let s = (seed * 2654435761) >>> 0 || 1;
  const f = () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  f.range = (a, b) => a + f() * (b - a);
  f.pick = arr => arr[Math.floor(f() * arr.length) % arr.length];
  return f;
}

export const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { } },
  json(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  setJson(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
};

export const vib = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { } };

/* tweens + timers driven by game time */
const tweens = [], timers = [];
export const clock = { t: 0, ff: false };
export function tween(dur, fn, done, e = ease) {
  if (clock.ff || dur <= 0) { fn(1); if (done) done(); return; }
  const w = { t: 0, dur, fn, done, e }; tweens.push(w); return w;
}
export function later(ms, fn) { const t = { t: clock.t + ms / 1000, fn }; timers.push(t); return t; }
export function cancelAll() { tweens.length = 0; timers.length = 0; }
export function tickTweens(dt) {
  clock.t += dt;
  for (let i = timers.length - 1; i >= 0; i--) if (clock.t >= timers[i].t) { const f = timers[i].fn; timers.splice(i, 1); try { f(); } catch (e) { console.error(e); } }
  for (let i = tweens.length - 1; i >= 0; i--) {
    const w = tweens[i]; w.t += dt; const k = Math.min(1, w.t / w.dur);
    try { w.fn(w.e(k)); } catch (e) { console.error(e); }
    if (k >= 1) { tweens.splice(i, 1); if (w.done) try { w.done(); } catch (e) { console.error(e); } }
  }
}

/* move an Object3D toward a transform */
export function moveTo(obj, to, dur = .5, cb, arc = 0) {
  /* a newer move always wins: the previous one stops moving the object (its callback still fires on time) */
  const prev = obj.userData.mv; if (prev) prev.dead = true; obj.userData.mv = null;
  if (clock.ff || dur <= 0) {
    if (to.pos) obj.position.copy(to.pos); if (to.quat) obj.quaternion.copy(to.quat); if (to.scl != null) obj.scale.setScalar(to.scl);
    if (cb) cb(); return;
  }
  const p0 = obj.position.clone(), q0 = obj.quaternion.clone(), s0 = obj.scale.x, me = { dead: false }; obj.userData.mv = me;
  return tween(dur, k => {
    if (me.dead) return;
    if (to.pos) { obj.position.lerpVectors(p0, to.pos, k); if (arc) obj.position.y += Math.sin(k * Math.PI) * arc; }
    if (to.quat) obj.quaternion.slerpQuaternions(q0, to.quat, k);
    if (to.scl != null) obj.scale.setScalar(lerp(s0, to.scl, k));
  }, cb);
}

export const eulerQ = (x = 0, y = 0, z = 0) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z));
