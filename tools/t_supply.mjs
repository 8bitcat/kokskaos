import { inject, wait } from './t_helpers.mjs';
// ordering: lift the phone handset → order menu → pick items → crate lands on the DELIVERY spot with them inside → empty crate vanishes
export default async function (page, out, logs) {
  await inject(page);
  const log = (k, v) => logs.push('[test] ' + k + ' ' + JSON.stringify(v));
  const ph = await page.evaluate(() => { const f = game.sim.fixtures.get(game.K.phone); T.stand(f.pos.x + 0.95, f.pos.z); T.look(f.pos.x, f.pos.y + 0.12, f.pos.z); return T.info(f); });
  await wait(page, 700); log('phone tooltip', await page.evaluate(() => document.getElementById('tip').innerText));
  await page.screenshot({ path: out + '/sp1_phone.png' });
  await page.evaluate(() => T.grip(1, true)); await wait(page, 400);
  for (let i = 0; i < 8; i++) { await page.evaluate(() => { game.player.pitch -= 0.1; game.player.reachOff -= 0.04; }); await wait(page, 120); }
  await wait(page, 800);
  log('dialog open', await page.evaluate(() => ({ open: !!game.supplyOpen, shown: document.getElementById('dialog').style.display, items: document.querySelectorAll('#dialog .sit').length })));
  await page.evaluate(() => T.grip(1, false));
  const click = async (k, d, times = 1) => { for (let i = 0; i < times; i++) await page.click(`#dialog .sit[data-k="${k}"] button[data-d="${d}"]`); };
  await click('potato', 5); await click('carrot', 1, 3); await click('mushroom', 5); await click('egg', 1, 4); await click('steak', 1, 2);
  await wait(page, 300); await page.screenshot({ path: out + '/sp2_menu.png' });
  log('cart', await page.evaluate(() => document.getElementById('stot').innerText));
  await page.click('#sorder'); await wait(page, 500);
  log('after order', await page.evaluate(() => ({ open: !!game.supplyOpen, deliveries: game.service.deliveries.length })));
  await wait(page, 9000);
  const D = await page.evaluate(() => game.K.delivery);
  log('crate + items near spot', await page.evaluate((D) => { const c = {}; for (const e of game.sim.ents.values()) if (Math.hypot(e.pos.x - D.x, e.pos.z - D.z) < 1.0) c[e.kind] = (c[e.kind] || 0) + 1; return c; }, D));
  log('cracked eggs', await page.evaluate(() => T.count('eggblob')));
  await page.evaluate((D) => { T.stand(D.x + 1.6, D.z + 0.4); T.look(D.x, 0.2, D.z); }, D); await wait(page, 900);
  await page.screenshot({ path: out + '/sp3_crate.png' });
  // empty it: everything inside goes away → crate poofs after a while
  await page.evaluate(() => { const c = [...game.sim.ents.values()].find(e => e.kind === 'deliverycrate'); window.crate = c; for (const e of [...game.sim.ents.values()]) if (e.inC === c) game.sim.despawn(e); });
  await wait(page, 16000);
  log('crate after being emptied', await page.evaluate(() => ({ alive: !window.crate.dead })));
}
