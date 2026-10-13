/* input + dust checks: free spin, right-drag, pan, wheel, keyboard, two-finger touch, brushing removes dust */
import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const vp = { width: +(process.env.W || 400), height: +(process.env.H || 780) };
const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, hasTouch: true });
const page = await ctx.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/fonts\.g|net::/.test(m.text())) errs.push(m.text()); });
await page.goto('file://' + process.cwd() + '/dist/index.html?lowq=1');
await page.waitForFunction(() => window.__g && !document.getElementById('load').classList.contains('on'), null, { timeout: 180000 });
const W = (f, a) => page.evaluate(f, a), M = page.mouse, sleep = ms => page.waitForTimeout(ms);
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
await W(() => { const g = window.__g; g.G.dtCap = .5; g.openLevel('knife'); });
await sleep(400);
await W(() => { const g = window.__g; g.startLevel(g.G.level, 0); });
await sleep(2500);
const q = () => W(() => window.__g.RIG.q.toArray());
const ang = (a, b) => 2 * Math.acos(Math.min(1, Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3])));
const cam = () => W(() => ({ z: window.__g.CAM.uzoom, p: window.__g.CAM.upan.length() }));
/* 1. drag on empty space (top-left corner area) spins the object */
let a = await q(); await M.move(200, 690); await M.down(); for (let i = 1; i <= 10; i++) { await M.move(200 + i * 12, 690 - i * 4); await sleep(16); } await M.up(); await sleep(100);
ok(ang(a, await q()) > .3, 'empty-space drag spins object');
/* 2. right drag spins */
a = await q(); await M.move(200, 400); await M.down({ button: 'right' }); for (let i = 1; i <= 10; i++) { await M.move(200, 400 + i * 10); await sleep(16); } await M.up({ button: 'right' });
ok(ang(a, await q()) > .3, 'right-drag spins object');
/* 3. middle drag pans */
await M.move(200, 400); await M.down({ button: 'middle' }); for (let i = 1; i <= 8; i++) { await M.move(200 + i * 10, 400); await sleep(16); } await M.up({ button: 'middle' });
ok((await cam()).p > .1, 'middle-drag pans view');
/* 4. wheel zoom */
let z = (await cam()).z; await M.move(200, 400); await M.wheel(0, 300); await sleep(100); ok((await cam()).z > z * 1.1, 'wheel zooms');
/* 5. keyboard */
a = await q(); await page.keyboard.down('ArrowLeft'); await sleep(900); await page.keyboard.up('ArrowLeft'); ok(ang(a, await q()) > .1, 'arrow key spins');
z = (await cam()).z; await page.keyboard.press('='); ok((await cam()).z < z, '+ zooms in');
await page.keyboard.press('r'); await sleep(50); const c = await cam(); ok(c.z === 1 && c.p === 0, 'R resets view');
/* 6. two-finger touch: pinch + twist + pan */
const cdp = await ctx.newCDPSession(page);
const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p, i) => ({ x: p[0], y: p[1], id: i })) });
a = await q(); z = (await cam()).z;
await touch('touchStart', [[150, 380], [250, 380]]);
for (let i = 1; i <= 10; i++) { const r = 50 + i * 6, t = i * .05; await touch('touchMove', [[200 + i * 3 - Math.cos(t) * r, 380 - Math.sin(t) * r], [200 + i * 3 + Math.cos(t) * r, 380 + Math.sin(t) * r]]); await sleep(20); }
await touch('touchEnd', []); await sleep(100);
const c2 = await cam(); ok(c2.z < z * .9, 'pinch zooms'); ok(ang(a, await q()) > .2, 'two-finger twist rotates'); ok(c2.p > .05, 'two-finger drag pans');
/* 7. brushing removes dust (knife step 2: dry brush the dirt) */
await page.keyboard.press('r'); await W(() => { const g = window.__g; g.enterStep(g.G.steps.findIndex(s => s.id === 'dust')); }); await sleep(2500);
const id = await W(() => window.__g.st().id); ok(id === 'dust', 'at dust step (' + id + ')');
const frac = () => W(() => { const s = window.__g.st(); let d = 0, n = 0; for (const t of s.tasks) { d += t.frac() * t.n; n += t.n; } return n ? d / n : 1; });
const f0 = await frac();
const au = await W(() => window.__g.auto()); const b = au.bbox;
for (let pass = 0; pass < 2; pass++) { await M.move((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2); await M.down(); for (let r = 0; r < 8; r++) { const y = b.y0 + (b.y1 - b.y0) * (r + .5) / 8; for (let i = 0; i <= 12; i++) { await M.move(b.x0 + (b.x1 - b.x0) * (r % 2 ? 1 - i / 12 : i / 12), y); await sleep(8); } } await M.up(); }
const f1 = await frac(); const step1 = await W(() => window.__g.G.step);
ok(f1 > f0 + .2 || step1 > 1, `brushing clears dust (${f0.toFixed(2)} → ${f1.toFixed(2)}, step ${step1})`);
await sleep(2500); const left = await W(() => window.__g.P.list.length); ok(left < 30, `debris clears after brushing stops (${left} particles left)`);
ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
console.log(fails ? `${fails} FAILED` : 'all input checks passed');
await browser.close(); process.exit(fails ? 1 : 0);
