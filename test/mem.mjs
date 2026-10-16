/* resource check: plays levels via skip and reports GPU objects + JS heap after each, to catch leaks
   node test/mem.mjs [levels...] */
import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-precise-memory-info'] });
const page = await browser.newPage({ viewport: { width: 400, height: 780 } });
page.on('crash', () => console.log('PAGE CRASHED')); page.on('pageerror', e => console.log('ERR', e.message));
await page.goto('file://' + process.cwd() + '/dist/index.html?lowq=1');
await page.waitForFunction(() => window.__g && !document.getElementById('load').classList.contains('on'), null, { timeout: 900000 });
const stat = () => page.evaluate(() => { const g = window.__g, m = g.R.renderer.info.memory, r = g.R.renderer.info; let objs = 0; g.R.scene.traverse(o => { if (o.isMesh || o.isPoints) objs++; }); return `geo=${m.geometries} tex=${m.textures} progs=${r.programs ? r.programs.length : '?'} sceneObjs=${objs} heap=${(performance.memory.usedJSHeapSize / 1e6).toFixed(0)}MB`; });
console.log('boot       ', await stat());
const ids = process.argv.slice(2).length ? process.argv.slice(2) : await page.evaluate(() => window.__g.LEVELS.map(l => l.id));
for (const id of ids) {
  await page.evaluate(id => { const g = window.__g; g.G.dtCap = .5; g.openLevel(id); g.startLevel(g.G.level, 0); }, id);
  const n = await page.evaluate(() => window.__g.G.steps.length);
  for (let i = 0; i < n; i++) { await page.waitForTimeout(1200); await page.evaluate(() => window.__g.skipStep()); }
  await page.waitForTimeout(2500);
  console.log(id.padEnd(11), await stat());
  await page.evaluate(() => window.__g.toShop()); await page.waitForTimeout(500);
}
console.log('shop       ', await stat());
await browser.close();
