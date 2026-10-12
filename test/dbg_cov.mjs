const stat = () => W(() => { const s = window.__g.st(); return JSON.stringify(s.tasks.map(t => { const h = new Array(6).fill(0), hn = new Array(6).fill(0); for (let k = 0; k < t.n; k++) { const i = t.idx[k], v = t.D[i * 4 + t.ch]; hn[t.cells[k]]++; if (t.mode === 'sub' ? v < t.doneV : v >= t.doneV) h[t.cells[k]]++; } return { key: t.key, n: t.n, frac: t.frac().toFixed(2), done: h, tot: hn }; })) + ' turned=' + window.__g.RIG.flip.toFixed(2); });
for (let pass = 0; pass < 4; pass++) {
  const a = await W(() => window.__g.auto()); const b = a.bbox;
  const pts = []; for (let r = 0; r < 12; r++) { const y = b.y0 + (b.y1 - b.y0) * (r + .5) / 12; pts.push([b.x0, y], [b.x1, y]); }
  await M.move(pts[0][0], pts[0][1]); await M.down(); for (const [x, y] of pts) await M.move(x, y, { steps: 14 }); await M.up(); await sleep(1500);
  console.log('pass', pass, await stat());
}
await page.screenshot({ path: 'test/out/dbg_cov.png' });
