const crop = async n => { await sleep(1200); await page.screenshot({ path: `test/out/blk_${n}.png`, clip: { x: 100, y: 330, width: 200, height: 150 } }); };
await crop('a');
await W(() => { for (const s of window.__g.G.item.surfs) s.u.uBump.value = 0; }); await crop('nobump');
await W(() => { for (const s of window.__g.G.item.surfs) { s.u.uBump.value = .45; s.setLayer('rust', 0); s.setLayer('dirt', 0); } }); await crop('norust');
