/* visual QA: node test/qa.mjs <level...>  -> test/out/qa/<level>/NN-a.jpg (step start, HUD on) and NN-b.jpg (mid finish animation) */
import { chromium } from 'playwright-core';
import fs from 'fs';
const lvls = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 400, height: 780 } });
const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/fonts|net::/.test(m.text())) errs.push(m.text()); });
await page.goto('file://' + process.cwd() + '/dist/index.html?noadapt=1&q=' + (process.env.Q ?? 2));
await page.waitForFunction(() => window.__g && !document.getElementById('load').classList.contains('on'), null, { timeout: 900000 });
const sleep = ms => page.waitForTimeout(ms);
for (const lv of lvls) {
  const dir = `test/out/qa/${lv}`; fs.mkdirSync(dir, { recursive: true });
  const n = await page.evaluate(l => { const g = window.__g; g.G.dtCap = .2; g.openLevel(l); g.startLevel(g.G.level, 0); return g.G.steps.length; }, lv);
  for (let i = 0; i < n; i++) {
    await sleep(2600);
    const id = await page.evaluate(() => { const s = window.__g.st(); return s ? s.id : 'none'; });
    const nn = String(i + 1).padStart(2, '0');
    await page.screenshot({ path: `${dir}/${nn}-a-${id}.jpg`, type: 'jpeg', quality: 80 });
    await page.evaluate(() => window.__g.skipStep());
    await sleep(900);
    await page.screenshot({ path: `${dir}/${nn}-b-${id}.jpg`, type: 'jpeg', quality: 80 });
  }
  await sleep(2500); await page.screenshot({ path: `${dir}/99-done.jpg`, type: 'jpeg', quality: 80 });
  console.log(lv, n, 'steps', await page.evaluate(() => window.__g.G.mode));
}
console.log(errs.length ? 'ERRORS:\n' + [...new Set(errs)].join('\n') : 'no errors');
await browser.close();
