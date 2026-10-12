/* plays every step with real pointer gestures (no skip unless a step stalls) */
import { chromium } from 'playwright-core';
import fs from 'fs';
const OUT = 'test/out'; fs.mkdirSync(OUT, { recursive: true });
const args = process.argv.slice(2), only = args.filter(a => !a.startsWith('--')), shots = args.includes('--shots');
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 400, height: 780 }, deviceScaleFactor: 1 });
const errs = []; page.on('console', m => { if (m.type() === 'error' && !/fonts\.g|ERR_TUNNEL|net::/.test(m.text())) errs.push(m.text()); }); page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
await page.goto('file://' + process.cwd() + '/dist/index.html?lowq=1');
await page.waitForFunction(() => window.__g && !document.getElementById('load').classList.contains('on'), null, { timeout: 180000 });
const W = (f, a) => page.evaluate(f, a), M = page.mouse, sleep = ms => page.waitForTimeout(ms);
await W(() => { window.__g.G.dtCap = .12; localStorage.setItem('rw_tips', '0'); });
const ids = await W(() => window.__g.LEVELS.map(l => l.id));
async function drag(pts, stepMs = 12, sub = 4) { if (!pts.length) return; await M.move(pts[0].x, pts[0].y); await M.down(); for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i]; for (let k = 1; k <= sub; k++) { await M.move(a.x + (b.x - a.x) * k / sub, a.y + (b.y - a.y) * k / sub); } await sleep(stepMs); } await M.up(); }
const line = (a, b, n = 8) => Array.from({ length: n + 1 }, (_, i) => ({ x: a.x + (b.x - a.x) * i / n, y: a.y + (b.y - a.y) * i / n }));
async function act(a) {
  switch (a.kind) {
    case 'paint': {
      const b = a.bbox, rows = 9, pts = []; if (!b || b.x1 < b.x0) return;
      const pad = 0.06 * (b.x1 - b.x0);
      for (let r = 0; r <= rows; r++) { const y = b.y0 + (b.y1 - b.y0) * (r + .5) / (rows + 1); pts.push({ x: r % 2 ? b.x1 - pad : b.x0 + pad, y }, { x: r % 2 ? b.x0 + pad : b.x1 - pad, y }); }
      for (let c = 0; c <= 6; c++) { const x = b.x0 + (b.x1 - b.x0) * (c + .5) / 7; pts.push({ x, y: c % 2 ? b.y1 : b.y0 }); }
      await drag(pts.flatMap((p, i) => i ? line(pts[i - 1], p, 6).slice(1) : [p]), 4, 2); return;
    }
    case 'pick': case 'taps': case 'inspect': {
      for (const m of a.mk.slice(0, 6)) { if (a.id === 'debris' || a.kind !== 'pick') { await M.click(m.x, m.y); await sleep(250); } else { await drag([{ x: m.x - 18, y: m.y }, { x: m.x + 18, y: m.y }, { x: m.x - 18, y: m.y + 4 }, { x: m.x + 18, y: m.y - 4 }, { x: m.x - 18, y: m.y }], 30, 6); } }
      if (!a.mk.length && a.demo && a.demo.pts.length) await M.click(a.demo.pts[0].x, a.demo.pts[0].y); return;
    }
    case 'extract': { const d = a.demo; if (!d || d.pts.length < 2) return; const p0 = d.pts[0], p1 = d.pts[1]; await M.move(p0.x, p0.y); await M.down(); for (let i = 1; i <= 30; i++) { await M.move(p0.x + (p1.x - p0.x) * Math.min(1, i / 12) + (i % 2), p0.y + (p1.y - p0.y) * Math.min(1, i / 12)); await sleep(30); } await M.up(); return; }
    case 'screws': case 'hold': { const m = a.mk[0] || (a.demo && a.demo.pts[0]); if (!m) return; await M.move(m.x, m.y); await M.down(); for (let i = 0; i < 25; i++) { await M.move(m.x + (i % 3) - 1, m.y); await sleep(80); } await M.up(); return; }
    case 'snap': { if (!a.from) return; await drag(line(a.from, a.to, 14), 25, 2); return; }
    case 'trace': { for (const p of a.paths || []) await drag(p.filter((_, i) => i % 3 === 0), 10, 2); return; }
    case 'rotate': { const c = a.mk[0]; if (!c) return; const pts = []; for (let i = 0; i <= 48; i++) { const t = i / 12 * Math.PI; pts.push({ x: c.x + Math.cos(t) * 60, y: c.y + Math.sin(t) * 60 }); } await drag(pts, 15, 2); return; }
    case 'bath': {
      if (a.phase === 'carry') { await drag(line(a.item, { x: a.item.x, y: a.item.y + a.depthPx + 30 }, 12), 30, 2); return; }
      if (a.needsHold) { const b = await page.$('#btnHold'); const bb = await b.boundingBox(); await M.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await M.down(); await sleep(4000); await M.up(); return; }
      if (a.phase === 'swirl') { const c = a.c; const pts = []; for (let i = 0; i <= 60; i++) { const t = i / 12 * Math.PI; pts.push({ x: c.x + Math.cos(t) * 70, y: c.y + Math.sin(t) * 50 }); } await drag(pts, 15, 2); }
      return;
    }
    case 'cycle': { await drag(line(a.a, a.b, 10), 30, 2); await sleep(300); return; }
    case 'compare': { const y = 400; await drag([{ x: 200, y }, { x: 30, y }, { x: 380, y }, { x: 200, y }], 40, 8); await sleep(300); if (a.canFinish || true) { const f = await page.$('#btnFinish'); if (f && await f.isVisible()) await f.click(); } return; }
  }
}
let total = 0, played = 0;
for (const id of ids) {
  if (only.length && !only.includes(id)) continue;
  const e0 = errs.length; const skipped = [];
  await W(id => window.__g.openLevel(id), id); await sleep(400);
  const n = await W(() => { const g = window.__g; g.startLevel(g.G.level, 0); return g.G.steps.length; });
  for (let i = 0; i < n; i++) {
    await sleep(900);
    let a = await W(() => window.__g.auto()); if (!a) break; const step = await W(() => window.__g.G.step), t0 = Date.now(); let tries = 0;
    while (Date.now() - t0 < 45000) {
      a = await W(() => window.__g.auto()); const cur = await W(() => window.__g.G.step);
      if (!a || cur !== step) break;
      if (a.busy) { await sleep(300); continue; }
      await act(a); tries++; await sleep(350);
    }
    const cur = await W(() => window.__g.G.step); total++;
    if (cur === step && (await W(() => window.__g.G.mode)) === 'play') { skipped.push(a ? a.id : '?'); if (shots) await page.screenshot({ path: `${OUT}/stall_${id}_${a && a.id}.png` }); await W(() => window.__g.skipStep()); await sleep(1500); }
    else played++;
  }
  await sleep(2500);
  const res = await W(() => ({ mode: window.__g.G.mode, saved: window.__g.save[window.__g.G.level.id] }));
  console.log(`${skipped.length ? 'PART' : 'PLAY'} ${id}: mode=${res.mode} restored=${res.saved && res.saved.restored} skipped=[${skipped.join(', ')}]` + (errs.length > e0 ? '\n  ' + errs.slice(e0).join('\n  ') : ''));
  await W(() => window.__g.toShop());
}
console.log(`played ${played}/${total} steps with real input`);
await browser.close();
