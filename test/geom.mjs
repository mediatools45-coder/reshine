/* geometry QA: for every step of every level (after it settles) report laid-out parts that sink into the bench,
   laid-out parts that overlap each other, and visible parts that sit off-screen. node test/geom.mjs [levels...] */
import { chromium } from 'playwright-core';
const only = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 400, height: 780 } });
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.goto('file://' + process.cwd() + '/dist/index.html?lowq=1');
await page.waitForFunction(() => window.__g && !document.getElementById('load').classList.contains('on'), null, { timeout: 900000 });
const ids = only.length ? only : await page.evaluate(() => window.__g.LEVELS.map(d => d.id));
for (const id of ids) {
  const n = await page.evaluate(l => { const g = window.__g; g.G.dtCap = .5; g.openLevel(l); g.startLevel(g.G.level, 0); return g.G.steps.length; }, id);
  for (let i = 0; i < n; i++) {
    await page.waitForTimeout(1800);
    const rep = await page.evaluate(() => {
      const g = window.__g, T3 = g.THREE, it = g.G.item, s = g.st(), out = []; if (!it || !s) return { id: '?', out };
      g.R.scene.updateMatrixWorld(true);
      const boxOf = p => { const b = new T3.Box3(); p.g.traverse(o => { if (o.isMesh && o.material.visible !== false && !o.userData.proxy && o.visible) { o.geometry.computeBoundingBox(); b.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld)); } }); return b; };
      const vis = p => { for (let o = p.g; o; o = o.parent) if (!o.visible) return false; return true; };
      const lay = Object.values(it.parts).filter(p => p.state === 'layout' && vis(p));
      const boxes = lay.map(p => [p, boxOf(p)]).filter(([, b]) => !b.isEmpty());
      for (const [p, b] of boxes) if (b.min.y < g.BENCH_Y - .03) out.push(`${p.key} sinks ${(g.BENCH_Y - b.min.y).toFixed(2)} into bench`);
      for (let a = 0; a < boxes.length; a++) for (let c = a + 1; c < boxes.length; c++) { const [pa, ba] = boxes[a], [pc, bc] = boxes[c]; if (pa.g.parent === pc.g || pc.g.parent === pa.g) continue; const x = ba.clone().intersect(bc); if (!x.isEmpty()) { const v = x.getSize(new T3.Vector3()), m = Math.min(ba.getSize(new T3.Vector3()).length(), bc.getSize(new T3.Vector3()).length()); if (v.length() > m * .25) out.push(`${pa.key} overlaps ${pc.key}`); } }
      for (const p of Object.values(it.parts)) { if (!vis(p) || p.state === 'tray' || p.nofit) continue; const b = boxOf(p); if (b.isEmpty()) continue; const c = b.getCenter(new T3.Vector3()).project(g.R.camera); if (Math.abs(c.x) > 1.02 || Math.abs(c.y) > 1.02 || c.z > 1) out.push(`${p.key} off-screen (${p.state})`); }
      return { id: s.id, out };
    });
    if (rep.out.length) console.log(`${id} ${i + 1} ${rep.id}: ${rep.out.join('; ')}`);
    await page.evaluate(() => window.__g.skipStep());
  }
}
console.log('geom done', errs.length ? 'ERRORS ' + [...new Set(errs)].join(' | ') : 'no errors');
await browser.close();
