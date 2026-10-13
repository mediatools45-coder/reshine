import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1400, height: 800 } }); await p.goto('file://' + process.cwd() + '/' + process.argv[2]); await p.waitForTimeout(800); await p.screenshot({ path: process.argv[3], fullPage: true }); await b.close();
