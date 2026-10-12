await W(() => { const s = window.__g.st(); window.__cnt = { dab: 0, last: null }; for (const t of s.tasks) { const o = t.surf.dab.bind(t.surf); t.surf.dab = (p, n, r, l, m, a) => { window.__cnt.dab++; window.__cnt.last = [p.x.toFixed(2), p.y.toFixed(2), p.z.toFixed(2), n.x.toFixed(2), n.y.toFixed(2), n.z.toFixed(2), r, l, m, a]; return o(p, n, r, l, m, a); }; } });
const a = await W(() => window.__g.auto()); const b = a.bbox; const x = (b.x0 + b.x1) / 2, y = (b.y0 + b.y1) / 2;
await M.move(x - 60, y); await M.down(); for (let i = 0; i < 20; i++) await M.move(x - 60 + i * 6, y + (i % 2) * 3); await M.up();
console.log(await W(() => JSON.stringify({ c: window.__cnt, frac: window.__g.st().tasks.map(t => t.frac()) })));
