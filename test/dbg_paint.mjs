await W(() => { window.__ev = []; const cv = document.getElementById('cv'); for (const t of ['pointerdown', 'pointerup', 'pointercancel', 'lostpointercapture']) cv.addEventListener(t, e => window.__ev.push(t + ' ' + Math.round(e.clientX) + ',' + Math.round(e.clientY))); });
const a = await W(() => window.__g.auto()); const b = a.bbox;
const pts = []; for (let r = 0; r < 10; r++) { const y = b.y0 + (b.y1 - b.y0) * (r + .5) / 10; pts.push([b.x0, y], [b.x1, y]); }
await M.move(pts[0][0], pts[0][1]); await M.down();
for (const [x, y] of pts) { await M.move(x, y, { steps: 12 }); }
await M.up(); await sleep(500);
console.log(await W(() => { const s = window.__g.st(); return JSON.stringify({ ev: window.__ev, step: window.__g.G.step, flip: window.__g.RIG.flipping, prog: s.prog, tasks: (s.tasks || []).map(t => [t.key, t.n, t.frac().toFixed(2)]) }); }));
