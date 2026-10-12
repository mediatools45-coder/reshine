const a = await W(() => window.__g.auto()); const b = a.bbox;
console.log(await W(([x, y]) => { const out = []; for (const yy of [y, y + 40, 300, 500]) { const e = document.elementFromPoint(x, yy); out.push(yy + ':' + (e.id || e.className || e.tagName) + '/' + (e.parentElement && e.parentElement.id)); } return out.join(' '); }, [b.x0, b.y0 + 18]));
