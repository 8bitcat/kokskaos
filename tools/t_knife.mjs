import { inject, wait } from './t_helpers.mjs';
// grip snapping: knife points forward when grabbed, a chop from that pose cuts; pan hangs off its handle; waiters at the pass
export default async function (page, out, logs) {
  await inject(page);
  const log = (k, v) => logs.push('[test] ' + k + ' ' + JSON.stringify(v));
  const s = await page.evaluate(() => { const b = T.nearest('board', -3, -4.5), k = T.nearest('knife', b.pos.x, b.pos.z); T.stand(b.pos.x + 0.1, b.pos.z + 0.95); T.look(k.pos.x - 0.05, k.pos.y, k.pos.z); return { board: T.info(b), knife: k.id }; });
  await wait(page, 500); await page.evaluate(() => T.grip(1, true)); await wait(page, 900);
  const kd = await page.evaluate((s) => { const k = T.ent(s.knife), fwd = new (k.rot.constructor)(); const x = { x: 1, y: 0, z: 0 }; const v = new k.pos.constructor(1, 0, 0).applyQuaternion(k.rot); const p = game.player; return { bladeDir: [+v.x.toFixed(2), +v.y.toFixed(2), +v.z.toFixed(2)], playerFwd: [+(-Math.sin(p.yaw)).toFixed(2), 0, +(-Math.cos(p.yaw)).toFixed(2)], held: !!k.heldBy }; }, s);
  log('knife when held', kd);
  await page.screenshot({ path: out + '/kn1_held.png' });
  // chop: raise, put a potato under the blade tip, swing down
  await page.evaluate(() => { game.player.pitch += 0.35; }); await wait(page, 700);
  const pid = await page.evaluate((s) => { const k = T.ent(s.knife); const v = new k.pos.constructor(0.12, 0, 0).applyQuaternion(k.rot).add(k.pos); return game.sim.spawn('potato', [v.x, s.board.p[1] + 0.09, v.z], null).id; }, s); await wait(page, 900);
  await page.screenshot({ path: out + '/kn2_raised.png' });
  await page.evaluate(() => { game.player.pitch -= 0.5; }); await wait(page, 700);
  log('fries after chop', await page.evaluate(() => T.count('fry'))); log('potato alive', await page.evaluate((id) => !!T.ent(id), pid));
  await page.evaluate(() => T.grip(1, false)); await wait(page, 400);
  // pan grip: handle toward the player
  await page.evaluate(() => { const b = game.K.burners[0]; const pan = T.nearest('pan', b.pos[0], b.pos[2]); T.stand(pan.pos.x - 1.0, pan.pos.z + 0.3); T.look(pan.pos.x, pan.pos.y + 0.02, pan.pos.z); window.panId = pan.id; }); await wait(page, 400);
  await page.evaluate(() => T.grip(0, true)); await wait(page, 900);
  log('pan when held', await page.evaluate(() => { const k = T.ent(window.panId), v = new k.pos.constructor(1, 0, 0).applyQuaternion(k.rot), up = new k.pos.constructor(0, 1, 0).applyQuaternion(k.rot), p = game.player; return { handleDir: [+v.x.toFixed(2), +v.y.toFixed(2), +v.z.toFixed(2)], up: +up.y.toFixed(2), playerFwd: [+(-Math.sin(p.yaw)).toFixed(2), 0, +(-Math.cos(p.yaw)).toFixed(2)] }; }));
  await page.screenshot({ path: out + '/kn3_pan.png' });
  await page.evaluate(() => T.grip(0, false));
  // sausage fried in a pan reaches "done" and the pass explains rejected items
  const sz = await page.evaluate(() => { const K = game.K, b = K.burners[1], sim = game.sim; const f = sim.fixtures.get(b.knob), q = f.rest.clone().multiply(new (f.rest.constructor)().setFromAxisAngle(f.axis, -2.5)); f.body.setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }, true);
    const pan = T.nearest('pan', b.pos[0], b.pos[2]); return sim.spawn('sausage', [pan.pos.x, pan.pos.y + 0.15, pan.pos.z], null).id; });
  await wait(page, 14000); log('sausage after 14s in pan', await page.evaluate((id) => T.info(T.ent(id)), sz));
  await page.evaluate(() => { const s = game.service; s.start(1); s.orderT = 999; s.orders.push({ id: s.nextOrder++, r: 'sausagefries', table: 0, t: 150, T: 150, st: 'open' }); const sim = game.sim, y = game.K.pass.topY, z = -game.K.rest.room.hz;
    sim.spawn('plate', [1.0, y + 0.02, z], null); sim.spawn('sausage', [1.0, y + 0.08, z], null); sim.spawn('sausage', [1.02, y + 0.12, z + 0.02], null, { cookA: 2.5, cookB: 2.5, by: { fry: 2.5 }, method: 1 }); for (let i = 0; i < 5; i++) sim.spawn('fry', [1.0 + (i - 2) * 0.02, y + 0.16 + i * 0.02, z], null, { cookA: 1.2, cookB: 1.2, by: { deepfry: 1.2 }, method: 3 });
    T.stand(1.0, z + 1.9); T.look(1.0, y + 0.1, z); });
  await wait(page, 4000); log('pass label', await page.evaluate(() => game.service.labels)); await page.screenshot({ path: out + '/kn4_label.png' });
  await page.evaluate(() => { T.stand(0, -game.K.rest.room.hz + 1.6); T.look(0, 1.2, -game.K.rest.room.hz - 1.2); }); await wait(page, 800); await page.screenshot({ path: out + '/kn5_waiters.png' });
  log('waiters', await page.evaluate(() => game.service.waiters.map(w => [+w.pos.x.toFixed(1), +w.pos.z.toFixed(1)])));
}
