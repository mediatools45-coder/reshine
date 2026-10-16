/* visibility QA: at every step of every level, at each quality tier given (default 0 and 2), the frame must not be
   blank. node test/visible.mjs [levels...]   env TIERS=0,2 */
import { chromium } from 'playwright-core';
const tiers = (process.env.TIERS || '0,2').split(',').map(Number), only = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 400, height: 780 } });
const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('crash', () => errs.push('PAGE CRASHED'));
page.on('console', m => { if (/GL_INVALID|Feedback loop|CONTEXT_LOST/.test(m.text())) errs.push(m.text().slice(0, 120)); });
await page.goto('file://' + process.cwd() + '/dist/index.html?noadapt=1&noprobe=1&q=' + tiers[0]);
await page.waitForFunction(() => window.__g && !document.getElementById('load').classList.contains('on'), null, { timeout: 900000 });
const ids = only.length ? only : await page.evaluate(() => window.__g.LEVELS.map(l => l.id));
let bad = 0, checks = 0;
for (const id of ids) {
  const n = await page.evaluate(id => { const g = window.__g; g.G.dtCap = .5; g.openLevel(id); g.startLevel(g.G.level, 0); return g.G.steps.length; }, id);
  const dark = [];
  for (let i = 0; i < n; i++) {
    await page.waitForTimeout(1300);
    for (const q of tiers) { const v = await page.evaluate(q => { const g = window.__g; g.setQuality(q); return g.probe(); }, q); checks++; if (v < 3) dark.push(`${i + 1}@q${q}:${v.toFixed(1)}`); }
    await page.evaluate(() => window.__g.skipStep());
  }
  bad += dark.length; console.log(`${dark.length ? 'FAIL' : 'ok  '} ${id}${dark.length ? ' blank at ' + dark.join(' ') : ''}`);
}
console.log(`${checks} frame checks, ${bad} blank` + (errs.length ? '\nERRORS: ' + [...new Set(errs)].slice(0, 5).join(' | ') : ', no GL errors'));
await browser.close(); process.exit(bad || errs.length ? 1 : 0);
