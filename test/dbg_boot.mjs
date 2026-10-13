import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 400, height: 780 } });
page.on('pageerror', e => console.log('ERR', e.message)); page.on('console', m => console.log(m.type(), m.text().slice(0, 300)));
await page.goto('file:///home/user/reshine/dist/index.html' + (process.argv[2] || ''));
for (let i = 0; i < 12; i++) { await page.waitForTimeout(5000); console.log(i, await page.evaluate(() => document.getElementById('loadTxt').textContent + ' ' + document.getElementById('load').className)); if (await page.evaluate(() => !document.getElementById('load').classList.contains('on'))) break; }
await browser.close();
