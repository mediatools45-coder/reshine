/* renders every level's shelf picture once from dist/index.html and stores them in src/levels/thumbs.json
   (run after a build, then build again): the game then shows the shelf without building 10 models at boot */
import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 400, height: 780 } });
await page.goto('file://' + process.cwd() + '/dist/index.html?bake=1&noadapt=1&q=1');
await page.waitForFunction(() => window.__g && !document.getElementById('load').classList.contains('on'), null, { timeout: 900000 });
const t = await page.evaluate(() => window.__g.thumbs());
writeFileSync('src/levels/thumbs.json', JSON.stringify(t));
console.log(Object.keys(t).length + ' thumbs, ' + Math.round(JSON.stringify(t).length / 1024) + ' KB');
await browser.close();
