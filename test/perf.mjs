/* rough perf probe: boot time + average frame time in a level at default quality (headless, software GL: relative numbers only) */
import { chromium } from 'playwright-core';
const q = process.argv[2] ?? 'auto';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 400, height: 780 }, deviceScaleFactor: 2 });
const t0 = Date.now();
await page.goto('file://' + process.cwd() + '/dist/index.html' + (q === 'auto' ? '?noadapt=1' : '?noadapt=1&q=' + q));
await page.waitForFunction(() => window.__g && !document.getElementById('load').classList.contains('on'), null, { timeout: 900000 });
const boot = (Date.now() - t0) / 1000;
const ms = async () => page.evaluate(() => new Promise(r => { const ts = []; const f = t => { ts.push(t); if (ts.length < 40) requestAnimationFrame(f); else r((ts[ts.length - 1] - ts[0]) / (ts.length - 1)); }; requestAnimationFrame(f); }));
const shop = await ms();
const open = Date.now(); await page.evaluate(() => { const g = window.__g; g.openLevel('padlock'); g.startLevel(g.G.level, 0); }); const load = (Date.now() - open) / 1000;
await page.waitForTimeout(1500); const play = await ms();
console.log(JSON.stringify({ q: await page.evaluate(() => window.__g.R.q), boot, shopFrameMs: +shop.toFixed(1), levelLoadS: load, playFrameMs: +play.toFixed(1) }));
await browser.close();
