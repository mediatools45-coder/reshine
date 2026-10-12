/* headless regression: every level from workshop to finale via skip, plus screenshots */
import { chromium } from 'playwright-core';
import fs from 'fs';
const OUT = 'test/out'; fs.mkdirSync(OUT, { recursive: true });
const args = process.argv.slice(2), only = args.filter(a => !a.startsWith('--')), shots = args.includes('--shots'), play = args.includes('--play');
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 420, height: 820 }, deviceScaleFactor: 1 });
const errs = [];
page.on('console', m => { if (m.type() === 'error' && !/fonts\.g|ERR_TUNNEL|net::/.test(m.text())) errs.push(m.text()); });
page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
await page.goto('file://' + process.cwd() + '/dist/index.html?lowq=1');
await page.waitForFunction(() => window.__g && !document.getElementById('load').classList.contains('on'), null, { timeout: 180000 });
const W = (f, a) => page.evaluate(f, a);
const ids = await W(() => window.__g.LEVELS.map(l => l.id));
const shot = async name => { await page.screenshot({ path: `${OUT}/${name}.png` }); };
if (shots) await shot('00_shop');
let fail = 0;
for (const id of ids) {
  if (only.length && !only.includes(id)) continue;
  const e0 = errs.length;
  await W(id => { const g = window.__g; g.openLevel(id); }, id);
  await page.waitForTimeout(600);
  if (shots) await shot(`${id}_00_intro`);
  const n = await W(() => { const g = window.__g; g.startLevel(g.G.level, 0); return g.G.steps.length; });
  for (let i = 0; i < n; i++) {
    await page.waitForTimeout(play ? 900 : 350);
    const info = await W(() => { const g = window.__g, s = g.st(); return s ? { i: g.G.step, id: s.id, name: s.name } : null; });
    if (!info) break;
    if (shots) await shot(`${id}_${String(i + 1).padStart(2, '0')}_${info.id}`);
    await W(() => window.__g.skipStep());
    await page.waitForFunction(i => { const g = window.__g; return g.G.step !== i || g.G.mode === 'done'; }, info.i, { timeout: 20000 }).catch(() => { errs.push(`${id}: stuck at step ${info.i} ${info.id}`); });
  }
  await page.waitForTimeout(2200);
  const res = await W(() => { const g = window.__g; return { mode: g.G.mode, step: g.G.step, n: g.G.steps.length, saved: g.save[g.G.level.id] }; });
  if (shots) await shot(`${id}_99_done`);
  const ok = res.mode === 'done' && res.saved && res.saved.restored && errs.length === e0;
  if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${id}: ${n} steps, mode=${res.mode}, restored=${res.saved && res.saved.restored}` + (errs.length > e0 ? '\n  ' + errs.slice(e0).join('\n  ') : ''));
  await W(() => window.__g.toShop());
}
await browser.close();
process.exit(fail ? 1 : 0);
