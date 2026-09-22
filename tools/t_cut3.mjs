import { inject, wait } from './t_helpers.mjs';
export default async function (page, out, logs) {
  await inject(page);
  const log = (k, v) => logs.push('[test] ' + k + ' ' + JSON.stringify(v));
  const s = await page.evaluate(() => { const board = T.nearest('board', -3, -4.5), knife = T.nearest('knife', board.pos.x, board.pos.z);
    T.stand(board.pos.x + 0.1, board.pos.z + 0.95); T.look(knife.pos.x - 0.05, knife.pos.y, knife.pos.z); return { board: T.info(board), knife: knife.id }; });
  await wait(page, 500); await page.evaluate(() => T.grip(1, true)); await wait(page, 500);
  const land = await page.evaluate((s) => T.info(T.ent(s.knife)), s); log('knife rest', land);
  await page.evaluate(() => { game.player.pitch += 0.4; }); await wait(page, 900);
  const pid = await page.evaluate(([s, land]) => game.sim.spawn('potato', [land.p[0] + 0.1, s.board.p[1] + 0.09, land.p[2]], null).id, [s, land]); await wait(page, 1200);
  await page.screenshot({ path: out + '/k1_raise.png' });
  await page.evaluate(() => { game.player.pitch -= 0.45; }); await wait(page, 700);
  log('fries after chop', await page.evaluate(() => T.count('fry'))); log('potato alive', await page.evaluate((id) => !!T.ent(id), pid));
  await page.evaluate(() => { game.player.pitch += 0.25; }); await wait(page, 1200);
  await page.screenshot({ path: out + '/k2_cut.png' });
}
