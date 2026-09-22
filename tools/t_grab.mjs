import { inject, wait } from './t_helpers.mjs';
export default async function (page, out, logs) {
  await inject(page);
  const log = (k, v) => logs.push('[test] ' + k + ' ' + JSON.stringify(v));
  // --- 1. grab a pan from the east wall range, carry it, release
  let r = await page.evaluate(() => { const pan = T.nearest('pan', 12.5, -7); T.stand(pan.pos.x - 1.0, pan.pos.z); T.look(pan.pos.x, pan.pos.y + 0.03, pan.pos.z); return T.info(pan); });
  log('pan before', r); await wait(page, 300);
  await page.evaluate(() => T.grip(0, true)); await wait(page, 500);
  log('held after grip', await page.evaluate(() => T.held(0)));
  await page.screenshot({ path: out + '/g1_hold.png' });
  await page.evaluate(() => { game.player.pitch += 0.35; game.player.yaw += 0.5; }); await wait(page, 700);
  log('held after look move', await page.evaluate(() => T.held(0)));
  await page.screenshot({ path: out + '/g2_moved.png' });
  await page.evaluate(() => T.grip(0, false)); await wait(page, 900);
  log('pan after release', await page.evaluate((id) => T.info(T.ent(id)), r.id));
  // --- 2. oven door: grab the handle and pull down/out
  r = await page.evaluate(() => { const o = game.K.ovens[0], d = game.sim.fixtures.get(o.door); T.stand(d.pos.x - 1.1, d.pos.z); T.look(d.pos.x - 0.09, d.pos.y + 0.47, d.pos.z); return T.info(d); });
  log('door before', r); await wait(page, 300);
  await page.evaluate(() => T.grip(1, true)); await wait(page, 400);
  log('door held', await page.evaluate(() => T.held(1)));
  for (let i = 0; i < 6; i++) { await page.evaluate(() => { game.player.pitch -= 0.13; game.player.reachOff -= 0.05; }); await wait(page, 150); }
  await wait(page, 500);
  log('door pulled', await page.evaluate((id) => T.info(T.ent(id)), r.id));
  await page.screenshot({ path: out + '/g3_door.png' });
  await page.evaluate(() => T.grip(1, false)); await wait(page, 800);
  log('door released', await page.evaluate((id) => T.info(T.ent(id)), r.id));
  // --- 3. knob: grab + drag right => burner on
  r = await page.evaluate(() => { const b = game.K.burners[1], k = game.sim.fixtures.get(b.knob); T.stand(k.pos.x - 0.9, k.pos.z); game.player.reachOff = 0; T.look(k.pos.x, k.pos.y, k.pos.z); return T.info(k); });
  log('knob before', r); await wait(page, 300);
  await page.evaluate(() => T.grip(0, true)); await wait(page, 300);
  log('knob held', await page.evaluate(() => T.held(0)));
  await page.evaluate(() => { game.player.yaw -= 0.12; }); await wait(page, 900);
  await page.evaluate(() => T.grip(0, false)); await wait(page, 600);
  log('knob after', await page.evaluate((id) => T.info(T.ent(id)), r.id));
  log('burner level', await page.evaluate(() => game.K.burners[1].level));
  await page.evaluate(() => { game.player.yaw += 0.12; game.player.pitch = -0.2; }); await wait(page, 400);
  await page.screenshot({ path: out + '/g4_burner.png' });
}
