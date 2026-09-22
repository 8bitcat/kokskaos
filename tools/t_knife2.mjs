import { inject, wait } from './t_helpers.mjs';
// realistic chop: grab knife, aim the blade over the potato, flick the view down. Then: sausage actually in a pan on a lit burner.
export default async function (page, out, logs) {
  await inject(page);
  const log = (k, v) => logs.push('[test] ' + k + ' ' + JSON.stringify(v));
  const s = await page.evaluate(() => { const b = T.nearest('board', -3, -4.5), k = T.nearest('knife', b.pos.x, b.pos.z); T.stand(b.pos.x + 0.1, b.pos.z + 0.95); T.look(k.pos.x - 0.05, k.pos.y, k.pos.z); return { board: T.info(b), knife: k.id }; });
  await wait(page, 500); await page.evaluate(() => T.grip(1, true)); await wait(page, 900);
  const pid = await page.evaluate((s) => game.sim.spawn('potato', [s.board.p[0] + 0.05, s.board.p[1] + 0.09, s.board.p[2] - 0.05], null).id, s); await wait(page, 800);
  // aim: look so the blade (0..0.21 m ahead of the hand) hovers ~0.15 m above the potato
  await page.evaluate((s) => { const p = game.player, eye = [p.pos.x, p.pos.y + p.eyeH, p.pos.z], tx = s.board.p[0] + 0.05 + 0.0, tz = s.board.p[2] - 0.05; const h = game.sim.players.get(0).hands[1]; const dx = tx - eye[0], dz = tz - eye[2]; p.yaw = Math.atan2(-dx, -dz); const R = h.reach; const hy = s.board.p[1] + 0.09 + 0.16; p.pitch = Math.atan2(hy - eye[1], R); }, s);
  await wait(page, 900); await page.screenshot({ path: out + '/kn2_raised.png' });
  const before = await page.evaluate((s) => { const k = T.ent(s.knife); return { knife: [+k.pos.x.toFixed(2), +k.pos.y.toFixed(2), +k.pos.z.toFixed(2)], potato: T.info(T.ent(1e9) || { pos: { x: 0, y: 0, z: 0 }, def: { n: [] } }) }; }, s);
  log('knife above potato', before.knife);
  await page.evaluate(() => { game.player.pitch -= 0.28; }); await wait(page, 600);   // the flick
  log('fries after chop', await page.evaluate(() => T.count('fry'))); log('potato alive', await page.evaluate((id) => !!T.ent(id), pid));
  await page.screenshot({ path: out + '/kn2_cut.png' });
  await page.evaluate(() => T.grip(1, false)); await wait(page, 400);
  // sausage in a pan on burner 1 of the first east range
  const sz = await page.evaluate(() => { const K = game.K, b = K.burners[1], sim = game.sim; const f = sim.fixtures.get(b.knob), q = f.rest.clone().multiply(new (f.rest.constructor)().setFromAxisAngle(f.axis, -2.5)); f.body.setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }, true);
    const pan = sim.spawn('pan', [b.pos[0], b.pos[1] + 0.03, b.pos[2]], null); window.pan = pan; return sim.spawn('sausage', [b.pos[0], b.pos[1] + 0.14, b.pos[2]], null).id; });
  for (const t of [5000, 5000, 5000]) { await wait(page, t); log('sausage', await page.evaluate((id) => { const e = T.ent(id); return e ? { ...T.info(e), inPan: e.inC === window.pan, panHeat: +window.pan.heat.toFixed(2) } : null; }, sz)); }
}
