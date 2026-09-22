import { inject, wait } from './t_helpers.mjs';
// new mechanics: tools (mash/pound/roll/grate), squeeze bottles, jug -> pot pouring, lids, pancakes, pizza fusing
export default async function (page, out, logs) {
  await inject(page);
  const log = (k, v) => logs.push('[test] ' + k + ' ' + JSON.stringify(v));
  const s = await page.evaluate(() => { const b = T.nearest('board', -3, -4.5); T.stand(b.pos.x, b.pos.z + 1.1); T.look(b.pos.x, b.pos.y + 0.05, b.pos.z); return T.info(b); });
  const drop = (tool, food, opts) => page.evaluate(([tool, food, opts, s]) => {
    const sim = game.sim, x = s.p[0] + (opts.dx || 0), z = s.p[2];
    sim.spawn(food, [x, s.p[1] + 0.09, z], null, opts.cooked ? { cookA: 1.1, cookB: 1.1, by: { boil: 1.1 }, method: 2 } : {});
    setTimeout(() => sim.spawn(tool, [x - 0.03, s.p[1] + 0.75, z], opts.q || null, { v: [0, -4.5, 0] }), 600);
  }, [tool, food, opts, s]);
  await drop('masher', 'potato', { cooked: 1, dx: -0.15, q: { x: 0, y: 0, z: -0.7071, w: 0.7071 } }); await wait(page, 2500);
  log('mash blobs', await page.evaluate(() => T.count('mash')));
  await drop('mallet', 'steak', { dx: 0.12 }); await wait(page, 2500);
  log('schnitzel', await page.evaluate(() => T.count('schnitzel')));
  await drop('rollingpin', 'pizzadough', { dx: 0 }); await wait(page, 2500);
  log('pizzabase', await page.evaluate(() => T.count('pizzabase')));
  await page.evaluate((s) => { const sim = game.sim; sim.spawn('grater', [s.p[0] + 0.5, s.p[1] + 0.02, s.p[2]], null); setTimeout(() => sim.spawn('cheese', [s.p[0] + 1.0, s.p[1] + 0.13, s.p[2]], null, { v: [-3.0, 0.6, 0] }), 1200); }, s); await wait(page, 2500);
  log('gratedcheese', await page.evaluate(() => T.count('gratedcheese')));
  await page.screenshot({ path: out + '/t1_tools.png' });
  // squeeze bottle: grab it, turn the wrist upside-down
  await page.evaluate(() => { const k = T.nearest('ketchup', -3, -4.5); T.stand(k.pos.x, k.pos.z + 1.0); T.look(k.pos.x, k.pos.y + 0.08, k.pos.z); }); await wait(page, 400);
  await page.evaluate(() => T.grip(0, true)); await wait(page, 500);
  log('holding', await page.evaluate(() => T.held(0) && T.held(0).kind));
  await page.evaluate(() => { game.player.pitch += 0.35; game.player.wristR = 3.0; game.player.rotating = true; }); await wait(page, 2500);
  log('ketchup blobs', await page.evaluate(() => T.count('ketchupblob')));
  await page.screenshot({ path: out + '/t2_ketchup.png' });
  await page.evaluate(() => { game.player.rotating = false; game.player.wristR = 0; T.grip(0, false); }); await wait(page, 500);
  // jug -> pot pouring (direct state: a tilted held jug above a pot)
  const r = await page.evaluate(() => { const sim = game.sim, b = game.K.burners[0]; const pot = sim.spawn('pot', [b.pos[0], b.pos[1] + 0.02, b.pos[2]], null);
    const jug = sim.spawn('jug', [b.pos[0] - 0.12, b.pos[1] + 0.55, b.pos[2]], { x: 0, y: 0, z: -0.85, w: 0.53 }); jug.water = 1; jug.body.setGravityScale(0, true); jug.body.setLinearDamping(50); jug.body.setAngularDamping(50); window.pot = pot; window.jug = jug; return 1; });
  await wait(page, 3000);
  log('pour', await page.evaluate(() => ({ jug: +window.jug.water.toFixed(2), pot: +window.pot.water.toFixed(2) })));
  // lid: two pots of water on lit burners, one lidded
  await page.evaluate(() => { const sim = game.sim, K = game.K; window.jug.body.setGravityScale(1, true); sim.despawn(window.jug);
    const setKnob = (id, ang) => { const f = sim.fixtures.get(id), q = f.rest.clone().multiply(new (f.rest.constructor)().setFromAxisAngle(f.axis, ang)); f.body.setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }, true); };
    const b0 = K.burners[0], b1 = K.burners[2]; setKnob(b0.knob, -2.5); setKnob(b1.knob, -2.5);
    window.pot.water = 0.8; const p2 = sim.spawn('pot', [b1.pos[0], b1.pos[1] + 0.02, b1.pos[2]], null); p2.water = 0.8; window.pot2 = p2;
    sim.spawn('lid', [b1.pos[0], b1.pos[1] + 0.32, b1.pos[2]], null); });
  await wait(page, 9000);
  log('boil no lid vs lid', await page.evaluate(() => ({ open: +window.pot.temp.toFixed(2), lidded: +window.pot2.temp.toFixed(2) })));
  // pancake: batter blob into a hot pan
  await page.evaluate(() => { const sim = game.sim, K = game.K, b = K.burners[1]; const f = sim.fixtures.get(b.knob), q = f.rest.clone().multiply(new (f.rest.constructor)().setFromAxisAngle(f.axis, -2.5)); f.body.setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }, true);
    const pan = T.nearest('pan', b.pos[0], b.pos[2]); pan.heat = 1; window.pan = pan; sim.spawn('batterblob', [pan.pos.x, pan.pos.y + 0.25, pan.pos.z], null); T.stand(pan.pos.x + 1.0, pan.pos.z); T.look(pan.pos.x, pan.pos.y, pan.pos.z); });
  await wait(page, 3500);
  log('pancakes', await page.evaluate(() => T.count('pancake'))); await page.screenshot({ path: out + '/t3_pancake.png' });
  // pizza: base + 2 sauce + 2 cheese in a hot oven
  await page.evaluate(() => { const sim = game.sim, o = game.K.ovens[0]; o.temp = 1; const f = sim.fixtures.get(o.knob), q = f.rest.clone().multiply(new (f.rest.constructor)().setFromAxisAngle(f.axis, -2.5)); f.body.setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }, true);
    const y = 0.47, base = sim.spawn('pizzabase', [o.pos[0], y, o.pos[2]], null, { cookA: 0.9, cookB: 0.9, by: { bake: 0.9 }, method: 4 }); window.base = base;
    for (const [k, dx, dz] of [['sauce', 0.04, 0.03], ['sauce', -0.05, -0.02], ['cheeseslice', 0.0, 0.06], ['cheeseslice', 0.02, -0.06], ['mushroomslice', 0.07, 0], ['mushroomslice', -0.07, 0.03], ['mushroomslice', 0, 0]]) sim.spawn(k, [o.pos[0] + dx, y + 0.06, o.pos[2] + dz], null); });
  await wait(page, 6000);
  log('pizzas', await page.evaluate(() => ({ marg: T.count('pizza'), funghi: T.count('pizzafunghi'), baseLeft: T.count('pizzabase') })));
  log('items total', await page.evaluate(() => game.sim.itemCount));
}
