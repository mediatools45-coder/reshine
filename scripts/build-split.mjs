/* split build: one standalone HTML per level plus a launcher page, all in dist-split/
   node scripts/build-split.mjs  ->  dist-split/index.html, dist-split/<level>.html
   Each level page is self-contained (works offline from a folder); "back" returns to index.html. */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, renameSync, rmSync, mkdirSync, readdirSync } from 'node:fs';

const OUT = 'dist-split';
const reg = readFileSync('src/levels/index.js', 'utf8');
const ids = [...reg.matchAll(/^import (\w+) from '\.\/(\w+)\.js';/gm)].map(m => m[2]);
const field = (src, k) => (src.match(new RegExp(`\\b${k}: '([^']*)'`)) || [])[1] || '';
const levels = ids.map(id => {
  const src = readFileSync(`src/levels/${id}.js`, 'utf8');
  return { id, num: +(src.match(/\bnum: (\d+)/) || [0, 99])[1], name: field(src, 'name'), complexity: field(src, 'complexity'), minutes: field(src, 'minutes'), blurb: field(src, 'blurb') };
}).sort((a, b) => a.num - b.num);

rmSync(OUT, { recursive: true, force: true }); mkdirSync(OUT, { recursive: true });
for (const l of levels) {
  process.stdout.write(`building ${l.id}… `);
  execSync('npx vite build --logLevel warn', { env: { ...process.env, LEVEL: l.id }, stdio: ['ignore', 'ignore', 'inherit'] });
  renameSync(`${OUT}/.tmp-${l.id}/index.html`, `${OUT}/${l.id}.html`); rmSync(`${OUT}/.tmp-${l.id}`, { recursive: true, force: true });
  console.log('ok');
}

const thumbs = JSON.parse(readFileSync('src/levels/thumbs.json', 'utf8'));
const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const tiles = levels.map(l => `
    <a class="tile" href="${l.id}.html" data-id="${l.id}">
      <div class="th">${thumbs[l.id] ? `<img alt="" src="${thumbs[l.id]}">` : ''}<span class="num">${String(l.num).padStart(2, '0')}</span><span class="pc"></span></div>
      <div class="meta"><b>${esc(l.name)}</b><span>${esc(l.complexity)}${l.minutes ? ' · ' + esc(l.minutes) : ''}</span><u><i></i></u></div>
    </a>`).join('');

writeFileSync(`${OUT}/index.html`, `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Restoration Workshop</title>
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Lilita+One&family=Nunito:wght@600;700;800&display=swap" rel="stylesheet">
<style>
:root{--bg:#0a1218;--panel:rgba(14,24,30,.72);--ink:#f6efe2;--muted:#a9c3c0;--brass:#f2b84b;--good:#6fe0b0;--line:rgba(246,239,226,.14);
  --disp:'Lilita One','Trebuchet MS',system-ui,sans-serif;--body:'Nunito',system-ui,-apple-system,'Segoe UI',sans-serif}
*{box-sizing:border-box}
html,body{margin:0;min-height:100%;color:var(--ink);font-family:var(--body);font-weight:700;color-scheme:dark}
body{background:radial-gradient(120% 70% at 50% -10%,#1d2f5a 0%,#0e1830 40%,var(--bg) 75%) fixed,var(--bg);padding:max(28px,env(safe-area-inset-top)) 16px 40px}
header{max-width:1100px;margin:0 auto 22px;text-align:center}
h1{font-family:var(--disp);font-weight:400;font-size:clamp(34px,8vw,56px);margin:0;letter-spacing:.01em;text-shadow:0 4px 0 rgba(0,0,0,.35)}
h1 span{color:var(--brass)}
header p{margin:6px 0 0;color:var(--muted);font-size:15px}
.grid{max-width:1100px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,150px),1fr));gap:14px}
.tile{display:block;text-decoration:none;color:inherit;background:var(--panel);border:1px solid var(--line);border-radius:18px;overflow:hidden;box-shadow:0 8px 22px rgba(0,0,0,.35);transition:transform .12s,border-color .12s}
.tile:hover,.tile:focus-visible{transform:translateY(-3px);border-color:rgba(242,184,75,.6);outline:none}
.th{position:relative;aspect-ratio:1;background:#0b1520}
.th img{width:100%;height:100%;object-fit:cover;display:block}
.num{position:absolute;left:10px;top:8px;font-family:var(--disp);font-size:18px;color:var(--ink);text-shadow:0 2px 4px rgba(0,0,0,.6)}
.pc{position:absolute;right:8px;top:8px;font-size:11px;padding:2px 8px;border-radius:999px;background:rgba(10,18,24,.75);border:1px solid var(--line)}
.pc:empty{display:none}
.restored .pc{color:var(--good);border-color:rgba(111,224,176,.5)}
.meta{padding:10px 12px 12px;display:flex;flex-direction:column;gap:3px}
.meta b{font-family:var(--disp);font-weight:400;font-size:18px}
.meta span{font-size:12px;color:var(--muted)}
.meta u{display:block;height:4px;border-radius:2px;background:rgba(246,239,226,.12);margin-top:6px;overflow:hidden}
.meta u i{display:block;height:100%;width:0;background:var(--brass)}
.restored .meta u i{background:var(--good)}
footer{max-width:1100px;margin:22px auto 0;text-align:center;font-size:12px;color:var(--muted)}
</style>
</head>
<body>
<header><h1>Restoration <span>Workshop</span></h1><p id="sub">Pick any relic to bring back to life</p></header>
<main class="grid">${tiles}
</main>
<footer>Keep all these files together in one folder. Each relic opens in its own page.</footer>
<script>
/* progress is shared with the level pages through the same saved state */
(function () {
  var save = {}; try { save = JSON.parse(localStorage.getItem('rw_save_v1') || '{}') || {}; } catch (e) { }
  var done = 0, tiles = document.querySelectorAll('.tile');
  tiles.forEach(function (t) {
    var s = save[t.dataset.id] || {}, pct = s.restored ? 100 : (s.pct || 0);
    if (s.restored) { t.classList.add('restored'); done++; }
    t.querySelector('.pc').textContent = s.restored ? 'Restored' : pct ? pct + '%' : '';
    t.querySelector('.meta u i').style.width = pct + '%';
  });
  if (done) document.getElementById('sub').textContent = done + ' of ' + tiles.length + ' relics restored';
})();
</script>
</body>
</html>
`);
console.log(`${OUT}/: index.html + ${levels.length} level pages`, readdirSync(OUT).length);
