import { inject, wait } from './t_helpers.mjs';
// knobs: aim + look right turns clockwise, stops at max (no full turn), stays when released, can't go left of OFF. Dial + post-it screenshots.
export default async function (page, out, logs) {
  await inject(page);
  const log = (k, v) => logs.push('[test] ' + k + ' ' + JSON.stringify(v));
  const kn = () => page.evaluate(() => { const f = game.sim.fixtures.get(game.K.fryers[0].knob); return { angle: +f.angle.toFixed(2), value: +f.value.toFixed(2), held: !!f.heldBy, fryerOn: game.K.fryers[0].on }; });
  await page.evaluate(() => { const fr = game.K.fryers[0], f = game.sim.fixtures.get(fr.knob); T.stand(f.pos.x - 0.85, f.pos.z); T.look(f.pos.x, f.pos.y, f.pos.z); });
  await wait(page, 600); await page.screenshot({ path: out + '/kb1_fryerknob.png' });
  log('aim tooltip', await page.evaluate(() => document.getElementById('tip').innerText));
  await page.evaluate(() => T.grip(0, true)); await wait(page, 500); log('grabbed', await kn());
  for (let i = 0; i < 5; i++) { await page.evaluate(() => { game.player.yaw -= 0.08; }); await wait(page, 150); }
  await wait(page, 400); log('looked right 0.4 rad', await kn());
  for (let i = 0; i < 12; i++) { await page.evaluate(() => { game.player.yaw -= 0.1; }); await wait(page, 120); }
  await wait(page, 500); log('looked right 1.6 rad (way past max)', await kn());
  await page.evaluate(() => T.grip(0, false)); await wait(page, 800); log('released', await kn());
  await page.evaluate(() => { const f = game.sim.fixtures.get(game.K.fryers[0].knob); T.look(f.pos.x, f.pos.y, f.pos.z); }); await wait(page, 500);
  log('tooltip when on', await page.evaluate(() => document.getElementById('tip').innerText));
  await page.screenshot({ path: out + '/kb2_fryer_on.png' });
  // turn it back off by looking left, then try to go further left than OFF
  await page.evaluate(() => T.grip(0, true)); await wait(page, 400);
  for (let i = 0; i < 20; i++) { await page.evaluate(() => { game.player.yaw += 0.1; }); await wait(page, 100); }
  await wait(page, 500); log('looked left 2 rad (past OFF)', await kn());
  await page.evaluate(() => T.grip(0, false)); await wait(page, 300);
  // dials on a range front
  await page.evaluate(() => { const b = game.K.burners[1], f = game.sim.fixtures.get(b.knob); T.stand(f.pos.x - 0.7, f.pos.z + 0.25); T.look(f.pos.x, f.pos.y + 0.02, f.pos.z + 0.25); }); await wait(page, 800);
  await page.screenshot({ path: out + '/kb3_range_dials.png' });
  // post-its + chalkboard
  await page.evaluate(() => { const r = game.K.rest.room; T.stand(r.passX + 2.3, -r.hz + 2.2); T.look(r.passX + 2.35, 1.75, -r.hz); }); await wait(page, 800);
  await page.screenshot({ path: out + '/kb4_postits.png' });
}
