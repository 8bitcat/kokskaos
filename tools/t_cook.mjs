import { inject, wait } from './t_helpers.mjs';
export default async function (page, out, logs) {
  await inject(page);
  const log = (k, v) => logs.push('[test] ' + k + ' ' + JSON.stringify(v));
  const setKnob = (id, ang) => page.evaluate(([id, ang]) => { const f = game.sim.fixtures.get(id), q = f.rest.clone().multiply(new (f.rest.constructor)().setFromAxisAngle(f.axis, ang)); f.body.setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }, true); }, [id, ang]);
  // --- frying: burner 1 on (east range 0), pan is on burner index1. drop a steak in it
  const ids = await page.evaluate(() => { const K = game.K, b = K.burners[1]; const pan = T.nearest('pan', b.pos[0], b.pos[2]); const s = game.sim.spawn('steak', [pan.pos.x, pan.pos.y + 0.2, pan.pos.z], null); T.stand(b.pos[0] - 1.1, b.pos[2] + 0.3); T.look(pan.pos.x, pan.pos.y, pan.pos.z); return { knob: b.knob, pan: pan.id, steak: s.id, fryKnob: K.fryers[0].knob, fz: K.fryers[0].zone, tap: K.taps[0].lever, spout: K.taps[0].spout }; });
  await setKnob(ids.knob, -2.4);
  await wait(page, 6000);
  log('pan@6s', await page.evaluate((id) => T.info(T.ent(id)), ids.pan)); log('steak@6s', await page.evaluate((id) => T.info(T.ent(id)), ids.steak));
  await page.screenshot({ path: out + '/c1_fry.png' });
  // flip the steak by tossing the pan: grab pan, jerk up
  await wait(page, 5000);
  log('steak@11s', await page.evaluate((id) => T.info(T.ent(id)), ids.steak));
  // --- fryer: on, drop raw fries
  await setKnob(ids.fryKnob, -2.4);
  const fr = await page.evaluate((z) => { const out = []; for (let i = 0; i < 6; i++) out.push(game.sim.spawn('fry', [(z.min[0] + z.max[0]) / 2 + (i - 3) * 0.03, z.max[1] + 0.25 + i * 0.03, (z.min[2] + z.max[2]) / 2], null).id); T.stand(z.min[0] - 1.0, (z.min[2] + z.max[2]) / 2); T.look((z.min[0] + z.max[0]) / 2, z.max[1], (z.min[2] + z.max[2]) / 2); return out; }, ids.fz);
  await wait(page, 9000);
  log('fry@9s', await page.evaluate((id) => T.info(T.ent(id)), fr[0])); log('fryer', await page.evaluate(() => ({ t: game.K.fryers[0].temp, busy: game.K.fryers[0].busy })));
  await page.screenshot({ path: out + '/c2_fryer.png' });
  await wait(page, 6000);
  log('fry@15s', await page.evaluate((id) => T.info(T.ent(id)), fr[0]));
  // --- tap: put a pot under the spout, open lever
  const pot = await page.evaluate((sp) => { const p = game.sim.spawn('pot', [sp[0], sp[1] - 0.6, sp[2]], null); T.stand(sp[0], sp[2] - 1.2); T.look(sp[0], sp[1] - 0.3, sp[2]); return p.id; }, ids.spout);
  await setKnob(ids.tap, -0.9);
  await wait(page, 3000);
  log('pot water', await page.evaluate((id) => T.info(T.ent(id)), pot)); log('tap', await page.evaluate(() => game.K.taps[0].flow));
  await page.screenshot({ path: out + '/c3_tap.png' });
  await setKnob(ids.tap, 0);
}
