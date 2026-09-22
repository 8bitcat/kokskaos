import { inject, wait } from './t_helpers.mjs';
// a full truck shift: drawer money, queue, several guests paying, upgrades applied
export default async function (page, out, logs) {
  await inject(page);
  const log = (k, v) => logs.push('[test] ' + k + ' ' + JSON.stringify(v));
  log('drawer money', await page.evaluate(() => { const c = {}; for (const e of game.sim.ents.values()) if (e.def && e.def.money) c[e.kind] = (c[e.kind] || 0) + 1; return c; }));
  log('queue', await page.evaluate(() => game.service.waiters.map(w => [+w.pos.x.toFixed(1), +w.pos.z.toFixed(1)])));
  // open the cash drawer by hand and look inside
  await page.evaluate(() => { const f = game.K.fixtures.find(x => x.role === 'till'), fx = game.sim.fixtures.get(f.id); T.stand(fx.pos.x, fx.pos.z + 0.75); T.look(fx.pos.x, fx.pos.y + 0.05, fx.pos.z + 0.12); });
  await wait(page, 500); await page.evaluate(() => T.grip(0, true)); await wait(page, 400);
  for (let i = 0; i < 6; i++) { await page.evaluate(() => { game.player.reachOff -= 0.06; }); await wait(page, 120); }
  await wait(page, 600);
  log('drawer pulled', await page.evaluate(() => { const f = game.K.fixtures.find(x => x.role === 'till'); return +game.sim.fixtures.get(f.id).value.toFixed(2); }));
  await page.evaluate(() => { T.grip(0, false); game.player.pitch = -0.5; }); await wait(page, 600);
  await page.screenshot({ path: out + '/tk1_drawer.png' });
  // run a shift: serve three dishes back to back, paying each time
  await page.evaluate(() => { const s = game.service; s.start(1); s.orderT = 999; });
  for (let n = 0; n < 3; n++) {
    await page.evaluate(([n]) => {
      const s = game.service, sim = game.sim, P = game.K.pass, z = (P.zone.min[2] + P.zone.max[2]) / 2, y = P.topY, x = -0.2 + n * 0.25;
      s.orders.push({ id: n % 2 ? 3 : 1, r: 'friesketchup', table: n % 3, t: 150, T: 150, st: 'open' }); s.dirty = true;
      sim.spawn('plate', [x, y + 0.02, z], null);
      for (let i = 0; i < 6; i++) sim.spawn('fry', [x + (Math.random() - 0.5) * 0.05, y + 0.07 + i * 0.03, z], null, { cookA: 1.2, cookB: 1.2, by: { deepfry: 1.2 }, method: 3 });
      for (let i = 0; i < 2; i++) sim.spawn('ketchupblob', [x, y + 0.3 + i * 0.03, z], null);
      T.stand(x, z + 1.0); T.look(x, y + 0.1, z);
    }, [n]);
    await wait(page, 12000);
    const p = await page.evaluate(() => game.svcState && game.svcState.pay);
    log('guest ' + n, p);
    if (p && p.card) {
      let left = p.want; for (const k of [100, 50, 10]) while (left >= k) { await page.evaluate((k) => { game.sim.presses.push(game.K.fixtures.find(f => f.type === 'button' && f.key === k)); }, k); left -= k; await wait(page, 100); }
      await page.evaluate(() => { game.sim.presses.push(game.K.fixtures.find(f => f.type === 'button' && f.key === 'OK')); }); await wait(page, 2000);
    } else if (p && p.change > 0) {
      await page.evaluate((need) => { const sim = game.sim, P = game.K.pass, w = game.service.waiters.find(x => x.order); let left = need;
        for (const [k, v] of [['note100', 100], ['note50', 50], ['coin10', 10]]) while (left >= v) { sim.spawn(k, [w.pos.x + (Math.random() - 0.5) * 0.15, P.topY + 0.12, (P.zone.min[2] + P.zone.max[2]) / 2], null); left -= v; } }, p.change);
      await wait(page, 2500);
    }
    await wait(page, 4000);
    log('after guest ' + n, await page.evaluate(() => ({ coins: game.service.coins, served: game.service.served, pay: !!game.svcState.pay })));
  }
  await page.evaluate(() => { const r = game.K.rest.room; T.stand(0, -3.2); T.look(0, 1.3, 0); }); await wait(page, 1000);
  await page.screenshot({ path: out + '/tk2_queue.png' });
  log('final', await page.evaluate(() => ({ coins: game.service.coins, served: game.service.served, items: game.sim.itemCount })));
}
