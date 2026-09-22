import { inject, wait } from './t_helpers.mjs';
export default async function (page, out, logs) {
  await inject(page);
  const log = (k, v) => logs.push('[test] ' + k + ' ' + JSON.stringify(v));
  const info = await page.evaluate(() => { const f = game.K.fixtures.find(x => x.role === 'till'), fx = game.sim.fixtures.get(f.id);
    return { id: f.id, wp: f.wp, pos: [+fx.pos.x.toFixed(2), +fx.pos.y.toFixed(2), +fx.pos.z.toFixed(2)], limits: f.limits, axisW: [+fx.axisW.x.toFixed(2), +fx.axisW.y.toFixed(2), +fx.axisW.z.toFixed(2)] }; });
  log('drawer', info);
  // stand in front of the handle and aim at it
  await page.evaluate((info) => { T.stand(info.pos[0], info.pos[2] + 0.72); T.look(info.pos[0], info.pos[1] + 0.02, info.pos[2] + 0.22); }, info);
  await wait(page, 600);
  log('aim', await page.evaluate(() => document.getElementById('tip').innerText));
  await page.evaluate(() => T.grip(0, true)); await wait(page, 600);
  log('held', await page.evaluate(() => { const h = game.sim.players.get(0).hands[0]; return h.ent ? { kind: h.ent.kind, role: h.ent.fixture && h.ent.fixture.role } : null; }));
  for (let i = 0; i < 10; i++) { await page.evaluate(() => { game.player.pos.z += 0.035; }); await wait(page, 110); }
  await wait(page, 500);
  log('after stepping back', await page.evaluate((id) => +game.sim.fixtures.get(id).value.toFixed(2), info.id));
  await page.evaluate(() => { T.grip(0, false); game.player.pitch = -0.45; }); await wait(page, 800);
  await page.screenshot({ path: out + '/tk1_drawer.png' });
  log('money reachable', await page.evaluate(() => { const c = {}; for (const e of game.sim.ents.values()) if (e.def && e.def.money && e.pos.y > 0.6) c[e.kind] = (c[e.kind] || 0) + 1; return c; }));
}
