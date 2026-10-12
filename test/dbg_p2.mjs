const a = await W(() => window.__g.auto()); const b = a.bbox; const y = (b.y0 + b.y1) / 2;
await W(() => { window.__ev = []; const cv = document.getElementById('cv'); for (const t of ['pointerdown', 'pointermove', 'pointerup']) cv.addEventListener(t, e => { if (window.__ev.length < 6 || t !== 'pointermove') window.__ev.push(t + ' ' + Math.round(e.clientX) + ' down=' + window.__g.G.down); }); });
console.log(await W(([x, y]) => document.elementFromPoint(x, y).id, [b.x0, y]));
await M.move(b.x0, y); await M.down(); await M.move(b.x1, y, { steps: 20 }); await M.up();
console.log(await W(() => JSON.stringify({ ev: window.__ev, grab: window.__g.st().grabAll, frac: window.__g.st().tasks.map(t => t.frac()) })));
