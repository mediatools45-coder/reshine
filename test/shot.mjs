/* screenshot helper: node test/shot.mjs <level> <stepIndex> <out.png> [W H] */
import { chromium } from 'playwright-core';
const [lv, si, out, w = 400, h = 780] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
page.on('pageerror', e => console.log('PAGEERROR', e.message));
await page.goto('file://' + process.cwd() + '/dist/index.html' + (process.env.Q ? '?noadapt=1' : '?lowq=1'));
await page.waitForFunction(() => window.__g && !document.getElementById('load').classList.contains('on'), null, { timeout: 400000 });
if (lv === 'shop') { await page.waitForTimeout(1500); }
else { await page.evaluate(([l, s]) => { const g = window.__g; g.G.dtCap = .5; g.openLevel(l); if (+s >= 0) g.startLevel(g.G.level, +s); }, [lv, si]); await page.waitForTimeout(+(process.env.WAIT || 3500)); }
await page.screenshot({ path: out });
await browser.close();
