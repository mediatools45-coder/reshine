/* quick per-level check: node test/lvl.mjs <level> [--shots]  -> steps, errors, screenshot per step */
import { chromium } from 'playwright-core';
import fs from 'fs';
const [lv] = process.argv.slice(2), shots = process.argv.includes('--shots'); fs.mkdirSync('test/out/lvl', { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 400, height: 780 } });
const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/fonts|net::/.test(m.text())) errs.push(m.text()); });
await page.goto('file://' + process.cwd() + '/dist/index.html?lowq=1');
await page.waitForFunction(() => window.__g && !document.getElementById('load').classList.contains('on'), null, { timeout: 400000 });
const n = await page.evaluate(l => { const g = window.__g; g.G.dtCap = .5; g.openLevel(l); g.startLevel(g.G.level, 0); return g.G.steps.length; }, lv);
console.log(lv, n, 'steps');
for (let i = 0; i < n; i++) {
  await page.waitForTimeout(2200);
  const id = await page.evaluate(() => { const s = window.__g.st(); return s ? s.id + ' | ' + s.name : 'none'; });
  console.log(i + 1, id);
  if (shots) await page.screenshot({ path: `test/out/lvl/${lv}_${String(i + 1).padStart(2, '0')}.png` });
  await page.evaluate(() => window.__g.skipStep());
}
await page.waitForTimeout(2500);
console.log('mode', await page.evaluate(() => window.__g.G.mode), errs.length ? '\nERRORS:\n' + [...new Set(errs)].join('\n') : 'no errors');
await browser.close();
