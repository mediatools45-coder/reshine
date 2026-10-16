/* split build check: each dist-split/<level>.html opens straight into its level, plays to the end via skip,
   and "back" returns to the launcher; the launcher lists every level page. */
import { chromium } from 'playwright-core';
import { readdirSync } from 'node:fs';
const dir = process.cwd() + '/dist-split/';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 400, height: 780 } });
let fails = 0;
const page = await ctx.newPage();
await page.goto('file://' + dir + 'index.html');
const links = await page.$$eval('a.tile', as => as.map(a => a.getAttribute('href')));
const pages = readdirSync(dir).filter(f => f.endsWith('.html') && f !== 'index.html');
const missing = pages.filter(p => !links.includes(p));
console.log((links.length === pages.length && !missing.length ? 'ok  ' : 'FAIL') + ` launcher lists ${links.length}/${pages.length} level pages`); if (missing.length) fails++;
for (const href of links) {
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + dir + href + '?lowq=1');
  await p.waitForFunction(() => window.__g && window.__g.G.mode === 'intro', null, { timeout: 600000 });
  const r = await p.evaluate(async () => { const g = window.__g; g.G.dtCap = .5; const id = g.G.level.id; g.startLevel(g.G.level, 0); const n = g.G.steps.length;
    for (let i = 0; i < n + 2 && g.G.mode === 'play'; i++) { await new Promise(r => setTimeout(r, 900)); g.skipStep(); }
    await new Promise(r => setTimeout(r, 2500)); return { id, n, mode: g.G.mode, levels: g.LEVELS.length }; });
  await p.click('#btnShop').catch(() => {}); await p.waitForTimeout(1500);
  const back = p.url().endsWith('/index.html');
  const ok = r.mode === 'done' && r.levels === 1 && back && !errs.length;
  if (!ok) fails++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${href}: ${r.id}, ${r.n} steps, mode=${r.mode}, bundled levels=${r.levels}, back to launcher=${back}${errs.length ? ' errors: ' + errs.join(' | ') : ''}`);
  await p.close();
}
console.log(fails ? fails + ' FAILED' : 'split build passed');
await browser.close(); process.exit(fails ? 1 : 0);
