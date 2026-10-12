console.log(await W(() => { const g = window.__g, s = g.st(), t = s.tasks[0], surf = t.surf; const sm = surf.samples[100];
  const before = t.frac(); let cnt = 0; surf.forCells(sm.p, sm.n, (c, x, y, w) => { cnt++; });
  for (let i = 0; i < 400; i++) { const q = surf.samples[i * 13 % surf.samples.length]; surf.dab(q.p, q.n, .42, 'wet', 'add', .55); }
  const A = surf.A; let mx = 0; for (let i = 3; i < A.length; i += 4) mx = Math.max(mx, A[i]);
  return JSON.stringify({ before, after: t.frac(), cnt, mx, doneV: t.doneV, ch: t.ch, sameD: t.D === surf.A, W: surf.W, H: surf.H, bmin: surf.bmin, bs: surf.bsize }); }));
