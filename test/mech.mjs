/* real-input checks for the new mechanics: heat+twist, timing, tune, strokes, load (dishwasher) */
import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 400, height: 780 } });
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.goto('file://' + process.cwd() + '/dist/index.html?lowq=1');
await page.waitForFunction(() => window.__g && !document.getElementById('load').classList.contains('on'), null, { timeout: 400000 });
const W = (f, a) => page.evaluate(f, a), M = page.mouse, sleep = ms => page.waitForTimeout(ms);
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
async function goto(level, id) { await W(([l, id]) => { const g = window.__g; g.G.dtCap = .5; g.openLevel(l); g.startLevel(g.G.level, 0); const i = g.G.steps.findIndex(s => s.id === id); g.ff(i); }, [level, id]); await sleep(2500); }
const step = () => W(() => { const s = window.__g.st(); return s ? s.id : null; });
const auto = () => W(() => window.__g.auto());
async function circle(c, r = 60, turns = 3) { await M.move(c.x + r, c.y); await M.down(); for (let i = 0; i <= turns * 24; i++) { const a = i / 24 * Math.PI * 2; await M.move(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r); await sleep(12); } await M.up(); }
async function waitStep(id, ms = 20000) { const t = Date.now(); while (Date.now() - t < ms) { if (await step() !== id) return true; await sleep(300); } return false; }

/* heat + twist (padlock key) */
await goto('padlock', 'key');
let a = await auto(); const h = a.mk[0]; await M.move(h.x, h.y); await M.down(); for (let i = 0; i < 40; i++) { await M.move(h.x + (i % 2), h.y); await sleep(100); } await M.up();
a = await auto(); ok(a.mk.length && /Twist/.test(JSON.stringify(await W(() => window.__g.st().markers().map(m => m.label)))), 'heat phase reaches twist');
const c = a.mk[0]; for (let k = 0; k < 3 && (await step()) === 'key'; k++) await circle(c, 70, 2);
ok(await waitStep('key'), 'key twisted out (padlock)');

/* timing (padlock rivets) */
await goto('padlock', 'rivets');
for (let n = 0; n < 40 && (await step()) === 'rivets'; n++) { await W(() => new Promise(r => { const f = () => { const m = window.__g.G.meter; if (!m || (m.v > m.lo + .03 && m.v < m.hi - .03)) r(); else requestAnimationFrame(f); }; f(); })); await M.click(200, 380); await sleep(500); }
ok(await waitStep('rivets', 4000), 'rivets peened with timing taps');

/* strokes (knife sharpen) */
await goto('knife', 'sharpen');
for (let n = 0; n < 12 && (await step()) === 'sharpen'; n++) { const d = await auto(); const p = d.mk; if (p.length < 2) break; await M.move(p[0].x, p[0].y); await M.down(); for (let i = 0; i <= 20; i++) { await M.move(p[0].x + (p[1].x - p[0].x) * i / 20, p[0].y + (p[1].y - p[0].y) * i / 20); await sleep(10); } for (let i = 20; i >= 0; i--) { await M.move(p[0].x + (p[1].x - p[0].x) * i / 20, p[0].y + (p[1].y - p[0].y) * i / 20); await sleep(10); } await M.up(); }
ok(await waitStep('sharpen', 4000), 'blade sharpened with strokes');

/* tune (guitar) */
await goto('guitar', 'tune');
for (let n = 0; n < 30 && (await step()) === 'tune'; n++) {
  const d = await auto(); const p = d.mk[0]; if (!p) break;
  const v = await W(() => { const s = window.__g.st(), c = s.cur(); return c ? c.v : .5; });
  const dir = v < .5 ? 1 : -1; await M.move(p.x + 50, p.y); await M.down();
  for (let i = 0; i < 60; i++) { const vv = await W(() => { const s = window.__g.st(), c = s.cur && s.cur(); return c ? c.v : .5; }); if (Math.abs(vv - .5) < .03) break; const a2 = dir * i / 18 * Math.PI * 2; await M.move(p.x + Math.cos(a2) * 50, p.y + Math.sin(a2) * 50); await sleep(8); }
  await M.up(); await sleep(700);
}
ok(await waitStep('tune', 4000), 'all six strings tuned');

/* load (keyboard dishwasher) */
await goto('keyboard', 'dishwasher');
for (let n = 0; n < 6; n++) { const d = await auto(); if (!d.mk.length) break; await M.click(d.mk[0].x, d.mk[0].y); await sleep(900); }
await sleep(1000); const hb = await page.$('#btnHold'); const bb = await hb.boundingBox(); await M.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await M.down(); await sleep(6000); await M.up();
ok(await waitStep('dishwasher', 4000), 'dishwasher loaded and run');

ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
console.log(fails ? fails + ' FAILED' : 'all mechanic checks passed');
await browser.close(); process.exit(fails ? 1 : 0);
