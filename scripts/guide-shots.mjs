/* renders the step-guide pictures: one shot of the object at the start of every step (per level),
   one studio render per tool, and docs/guide/steps.json with each step's id, name, tool and hint */
import { chromium } from 'playwright-core';
import { writeFileSync, mkdirSync } from 'node:fs';
const OUT = 'docs/guide/img';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 640, height: 640 } });
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.goto('file://' + process.cwd() + '/dist/index.html?noadapt=1&q=2');
await page.waitForFunction(() => window.__g && !document.getElementById('load').classList.contains('on'), null, { timeout: 900000 });
await page.addStyleTag({ content: 'body > *:not(#cv){display:none!important}' });
const W = (f, a) => page.evaluate(f, a), sleep = ms => page.waitForTimeout(ms);
const cv = await page.$('#cv');
const only = process.argv[2], LIST = only ? only.split(',') : null, TOOLS_ONLY = process.env.TOOLS ? process.env.TOOLS.split(',') : null;
const ids = await W(() => window.__g.LEVELS.map(d => d.id));
const out = {}; const kinds = new Set();
for (const id of ids) {
  if (TOOLS_ONLY || (LIST && !LIST.includes(id))) continue;
  mkdirSync(`${OUT}/${id}`, { recursive: true });
  const meta = await W(id => { const g = window.__g; g.G.dtCap = .5; g.openLevel(id); g.startLevel(g.G.level, 0); const d = g.G.level;
    return { name: d.name, steps: g.G.steps.map(s => ({ id: s.id, name: s.name, tool: s.tool || null, toolLabel: s.toolLabel || null, input: s.input || null, hint: s.hint || null, done: s.done || null })) }; }, id);
  for (let i = 0; i < meta.steps.length; i++) {
    await W(i => { const g = window.__g; g.startLevel(g.G.level, 0); g.ff(i); if (g.G.steps[i].compare) g.G.cmp = .5; }, i);
    await sleep(2200);
    await cv.screenshot({ path: `${OUT}/${id}/${String(i + 1).padStart(2, '0')}-${meta.steps[i].id}.jpg`, type: 'jpeg', quality: 82 });
    if (meta.steps[i].tool) kinds.add(meta.steps[i].tool);
  }
  out[id] = meta; console.log(id, meta.steps.length);
}
/* tools: one at a time on the clean studio set */
mkdirSync(`${OUT}/tools`, { recursive: true });
for (const k of TOOLS_ONLY || (process.env.NOTOOLS ? [] : kinds)) {
  if (['hand', 'none', 'crown', 'magnify'].includes(k)) continue;
  const ok = await W(k => { const g = window.__g, T3 = g.THREE; g.toShop(); document.getElementById('shop').classList.remove('on');
    if (g.G.item) g.G.item.root.removeFromParent(); if (g.G.before) g.G.before.root.removeFromParent();
    g.R.scene.children.filter(o => o.name === 'gallery').forEach(o => g.R.scene.remove(o));
    try { g.gallery([k]); } catch (e) { return String(e); }
    const gal = g.R.scene.children.find(o => o.name === 'gallery'), t = gal.children[0];
    t.position.set(0, 0, 0); t.userData.body.rotation.set(.25, .5, -.85); t.updateMatrixWorld(true);
    const box = new T3.Box3().setFromObject(t), c = box.getCenter(new T3.Vector3()), sz = box.getSize(new T3.Vector3()).length();
    g.CAM.gt.copy(c); g.CAM.t.copy(c); g.CAM.gdist = g.CAM.dist = Math.max(2.5, sz * 1.9); g.CAM.el = g.CAM.gel = .25; g.CAM.az = g.CAM.gaz = 0; return true; }, k);
  if (ok !== true) { console.log('tool fail', k, ok); continue; }
  await sleep(1200);
  await cv.screenshot({ path: `${OUT}/tools/${k}.jpg`, type: 'jpeg', quality: 85 });
}
if (!LIST && !TOOLS_ONLY) writeFileSync('docs/guide/steps.json', JSON.stringify({ levels: out, tools: [...kinds] }, null, 1));
console.log('tools', [...kinds].join(' '), 'errors', errs.length, errs.slice(0, 3).join(' | '));
await browser.close();
