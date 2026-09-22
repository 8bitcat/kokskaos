import { inject, wait } from './t_helpers.mjs';
// full shift in the current restaurant: start, serve two dishes, fast-forward to the end, check XP / stars / level
export default async function (page, out, logs) {
  await inject(page);
  const log = (k, v) => logs.push('[test] ' + k + ' ' + JSON.stringify(v));
  log('profile before', await page.evaluate(() => ({ lvl: game.profile.level, xp: game.profile.xp, coins: game.profile.coins, menu: game.menu.map(r => r.id) })));
  await page.evaluate(() => { game.service.start(1); const s = game.service; s.orderT = 999; });
  const serve = (recipe, items) => page.evaluate(([recipe, items]) => {
    const s = game.service, sim = game.sim, z = (game.K.pass.zone.min[2] + game.K.pass.zone.max[2]) / 2, y = game.K.pass.topY, x = (window.sx = (window.sx || -1.6) + 0.8);
    s.orders.push({ id: s.nextOrder++, r: recipe, table: s.orders.length % 3, t: 150, T: 150, st: 'open' }); s.dirty = true;
    sim.spawn('plate', [x, y + 0.02, z], null);
    let i = 0; for (const [k, n, cooked, method] of items) for (let j = 0; j < n; j++, i++) sim.spawn(k, [x + (Math.random() - 0.5) * 0.12, y + 0.07 + i * 0.025, z + (Math.random() - 0.5) * 0.12], null, cooked ? { cookA: 1.2, cookB: 1.2, by: { [method]: 1.2 }, method: { fry: 1, boil: 2, deepfry: 3, bake: 4 }[method] } : {});
    T.stand(x, z + 1.9); T.look(x, y + 0.1, z);
  }, [recipe, items]);
  await serve('friesketchup', [['fry', 6, 1, 'deepfry'], ['ketchupblob', 2]]); await wait(page, 5000);
  await page.screenshot({ path: out + '/c1_pass.png' });
  await serve('hotdog', [['hotdogbun', 1], ['sausage', 1, 1, 'fry'], ['ketchupblob', 1], ['mustardblob', 1]]); await wait(page, 16000);
  log('service', await page.evaluate(() => { const s = game.service.state(); return { coins: s.coins, served: s.served, open: s.orders.length }; }));
  // an order left to rot => angry customers
  await page.evaluate(() => { const s = game.service; s.orders.push({ id: s.nextOrder++, r: 'sausagefries', table: 1, t: 12, T: 150, st: 'open' }); s.dirty = true; const t = game.K.tables[1]; T.stand(t.p[0], game.K.pass.zone.max[2] + 1.2); T.look(t.p[0], 1.1, t.p[2]); });
  await wait(page, 5000); await page.screenshot({ path: out + '/c2_angry.png' });
  await page.evaluate(() => { game.service.timeLeft = 1; }); await wait(page, 22000);
  log('result', await page.evaluate(() => game.svcState && game.svcState.result)); await page.screenshot({ path: out + '/c3_result.png' });
  log('profile after', await page.evaluate(() => ({ lvl: game.profile.level, xp: game.profile.xp, coins: game.profile.coins, stars: game.profile.rest(game.rest.id).stars, days: game.profile.rest(game.rest.id).days })));
}
