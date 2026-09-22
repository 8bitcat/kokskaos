import { inject, wait } from './t_helpers.mjs';
// the notebook: open, flip to intro / technique / a recipe; wall posters
export default async function (page, out, logs) {
  await inject(page);
  const log = (k, v) => logs.push('[test] ' + k + ' ' + JSON.stringify(v));
  log('pages', await page.evaluate(() => game.hud.nb.pages.map(p => p.kind + ':' + (p.id || p.kind))));
  await page.evaluate(() => game.toggleBook(true)); await wait(page, 700); await page.screenshot({ path: out + '/bk1_intro.png' });
  log('frozen', await page.evaluate(() => game.player.frozen));
  await page.evaluate(() => game.hud.flip(1)); await wait(page, 500); await page.screenshot({ path: out + '/bk2_tech.png' });
  const idx = await page.evaluate(() => game.hud.nb.pages.findIndex(p => p.id === 'hotdog' || p.id === 'sausagefries'));
  await page.evaluate((i) => { game.hud.page = i; game.hud.renderPage(); }, idx); await wait(page, 600); await page.screenshot({ path: out + '/bk3_recipe.png' });
  log('recipe steps', await page.evaluate(() => { const p = game.hud.nb.pages[game.hud.page]; return { title: p.title, note: p.note, ing: p.ingredients, steps: p.steps }; }));
  await page.evaluate(() => game.toggleBook(false)); await wait(page, 300);
  log('frozen after', await page.evaluate(() => game.player.frozen));
  await page.evaluate(() => { const K = game.K, r = K.rest.room; T.stand(-r.passX - 0.5, -r.hz + 3.2); T.look(-r.passX - (r.hx - r.passX) / 2, 2.0, -r.hz); }); await wait(page, 700); await page.screenshot({ path: out + '/bk4_board.png' });
  await page.evaluate(() => { const K = game.K, r = K.rest.room; T.stand(r.passX + 1.0, -r.hz + 2.6); T.look(r.passX + 0.8, 2.0, -r.hz); }); await wait(page, 700); await page.screenshot({ path: out + '/bk5_stickies.png' });
}
