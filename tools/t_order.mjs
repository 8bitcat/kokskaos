import { inject, wait } from './t_helpers.mjs';
export default async function (page, out, logs) {
  await inject(page);
  const log = (k, v) => logs.push('[test] ' + k + ' ' + JSON.stringify(v));
  // pull the service lever physically
  const lv = await page.evaluate(() => { const l = game.sim.fixtures.get(game.K.lever); T.stand(l.pos.x, l.pos.z + 1.0); T.look(l.pos.x, l.pos.y + 0.3, l.pos.z + 0.04); return T.info(l); });
  await wait(page, 500); await page.screenshot({ path: out + '/o0_lever.png' });
  await page.evaluate(() => T.grip(1, true)); await wait(page, 400); log('lever held', await page.evaluate(() => T.held(1)));
  for (let i = 0; i < 8; i++) { await page.evaluate(() => { game.player.pitch -= 0.1; game.player.reachOff -= 0.03; }); await wait(page, 120); }
  await wait(page, 600); log('lever', await page.evaluate((id) => T.info(T.ent(id)), lv.id));
  await page.evaluate(() => T.grip(1, false)); await wait(page, 500);
  log('running', await page.evaluate(() => game.service.running));
  // force a salad order and plate it on the pass
  await page.evaluate(() => { const s = game.service; s.orders = []; s.orderT = 999; s.orders.push({ id: s.nextOrder++, r: 'salad', table: 2, t: 150, T: 150, st: 'open' }); s.dirty = true;
    const sim = game.sim, y = game.K.pass.topY, x = 1.0, z = -9.0; const plate = sim.spawn('plate', [x, y + 0.02, z], null); window.plate = plate;
    const put = (k, n) => { for (let i = 0; i < n; i++) sim.spawn(k, [x + (Math.random() - 0.5) * 0.05, y + 0.06 + (window.ni = (window.ni || 0) + 1) * 0.03, z + (Math.random() - 0.5) * 0.05], null); };
    put('lettuceleaf', 3); put('tomatoslice', 2); put('cucumberslice', 2);
    T.stand(1.0, -7.2); T.look(1.0, y + 0.1, -9.0); });
  await wait(page, 3000);
  log('labels (missing 1 cucumber)', await page.evaluate(() => game.service.labels)); await page.screenshot({ path: out + '/o1_missing.png' });
  await page.evaluate(() => { const y = game.K.pass.topY; game.sim.spawn('cucumberslice', [1.0, y + 0.25, -9.0], null); });
  await wait(page, 3500);
  log('orders', await page.evaluate(() => game.service.state().orders)); await page.screenshot({ path: out + '/o2_plated.png' });
  await wait(page, 5000); await page.screenshot({ path: out + '/o3_carry.png' });
  log('waiters', await page.evaluate(() => game.service.waiters.map(w => ({ s: w.state, x: +w.pos.x.toFixed(1), z: +w.pos.z.toFixed(1), carry: w.carry }))));
  await wait(page, 9000);
  log('state', await page.evaluate(() => { const s = game.service.state(); return { coins: s.coins, served: s.served, orders: s.orders.length }; }));
  await page.evaluate(() => { T.stand(0, -7.0); T.look(0, 1.0, -12.9); }); await wait(page, 800); await page.screenshot({ path: out + '/o4_delivered.png' });
}
