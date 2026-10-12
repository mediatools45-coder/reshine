const a = await W(() => window.__g.auto()); const b = a.bbox; const x = (b.x0 + b.x1) / 2, y = (b.y0 + b.y1) / 2;
console.log(await W(([x, y]) => { const g = window.__g; const el = document.elementFromPoint(x, y); return JSON.stringify({ el: el && (el.id || el.className), canAct: !!(g.G.mode === 'play' && !g.G.paused && !g.G.busy && !g.G.finishing), busy: g.G.busy, fin: g.G.finishing, flip: g.RIG.flipping, nodes: g.st().nodes().length }); }, [x, y]));
await M.move(x, y); await M.down(); await sleep(300);
console.log(await W(() => JSON.stringify({ down: window.__g.G.down, prev: !!window.__g.st().prev, tool: window.__g.T.onSurf })));
await M.move(x + 30, y, { steps: 5 }); await M.up();
