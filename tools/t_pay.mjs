import { inject, wait } from './t_helpers.mjs';
// food truck: serve a dish, guest pays cash (give change) or by card (type the amount on the terminal)
export default async function (page, out, logs) {
  await inject(page);
  const log = (k, v) => logs.push('[test] ' + k + ' ' + JSON.stringify(v));
  log('truck', await page.evaluate(() => ({ truck: game.service.truck, fixtures: game.K.fixtures.length, term: !!game.K.term, menu: game.menu.map(r => r.id).length })));
  await page.evaluate(() => { const D = game.K.delivery; T.stand(0, 0); T.look(0, 1.2, -3); }); await wait(page, 500);
  await page.screenshot({ path: out + '/pay0_inside.png' });
  // start service and put a finished dish on the hatch so a guest comes to pay
  const serve = (recipe, items, forceCard) => page.evaluate(([recipe, items, forceCard]) => {
    const s = game.service, sim = game.sim, P = game.K.pass, z = (P.zone.min[2] + P.zone.max[2]) / 2, y = P.topY, x = 0;
    if (!s.running) { s.start(1); s.orderT = 999; }
    s.orders.push({ id: forceCard ? 3 : 1, r: recipe, table: 0, t: 150, T: 150, st: 'open' }); s.dirty = true;
    sim.spawn('plate', [x, y + 0.02, z], null);
    let i = 0; for (const [k, n, cooked, method] of items) for (let j = 0; j < n; j++, i++) sim.spawn(k, [x + (Math.random() - 0.5) * 0.05, y + 0.06 + i * 0.03, z + (Math.random() - 0.5) * 0.05], null, cooked ? { cookA: 1.2, cookB: 1.2, by: { [method]: 1.2 }, method: { fry: 1, deepfry: 3 }[method] } : {});
    T.stand(x, z + 1.0); T.look(x, y + 0.1, z);
  }, [recipe, items, forceCard]);
  // ---- cash guest
  await serve('friesketchup', [['fry', 6, 1, 'deepfry'], ['ketchupblob', 2]], false);
  await wait(page, 14000);
  let p = await page.evaluate(() => game.svcState && game.svcState.pay);
  log('cash payment pending', p); log('banner', await page.evaluate(() => document.getElementById('pay').innerText));
  await page.screenshot({ path: out + '/pay1_cash.png' });
  if (p && !p.card && p.change > 0) {
    // take change out of the drawer and put it on the counter in front of the guest
    log('change to give', p.change);
    await page.evaluate((need) => { const sim = game.sim, P = game.K.pass, w = game.service.waiters.find(x => x.order); let left = need;
      for (const [k, v] of [['note100', 100], ['note50', 50], ['coin10', 10]]) while (left >= v) { sim.spawn(k, [w.pos.x + (Math.random() - 0.5) * 0.2, P.topY + 0.12, (P.zone.min[2] + P.zone.max[2]) / 2], null); left -= v; }
    }, p.change);
    await wait(page, 3000);
    log('after change', await page.evaluate(() => ({ pay: game.svcState.pay, coins: game.service.coins, served: game.service.served })));
  }
  await wait(page, 9000);
  log('cash order done', await page.evaluate(() => ({ coins: game.service.coins, served: game.service.served, orders: game.service.orders.length })));
  // ---- card guest
  await serve('hotdog', [['hotdogbun', 1], ['sausage', 1, 1, 'fry'], ['ketchupblob', 1], ['mustardblob', 1]], true);
  await wait(page, 14000);
  p = await page.evaluate(() => game.svcState && game.svcState.pay);
  log('card payment pending', p); log('banner', await page.evaluate(() => document.getElementById('pay').innerText));
  await page.screenshot({ path: out + '/pay2_card.png' });
  if (p && p.card) {
    // press the keys: +100 / +50 / +10 as needed, then OK
    const press = (key) => page.evaluate((key) => { const fx = game.K.fixtures.find(f => f.type === 'button' && f.key === key); game.sim.presses.push(fx); }, key);
    let left = p.want; for (const k of [100, 50, 10]) while (left >= k) { await press(k); left -= k; await wait(page, 120); }
    await wait(page, 600); log('typed', await page.evaluate(() => game.svcState.pay && game.svcState.pay.typed));
    await press('OK'); await wait(page, 2500);
    log('after OK', await page.evaluate(() => ({ pay: game.svcState.pay, coins: game.service.coins })));
    await page.screenshot({ path: out + '/pay3_tapped.png' });
  }
  await wait(page, 8000);
  log('final', await page.evaluate(() => ({ coins: game.service.coins, served: game.service.served })));
}
