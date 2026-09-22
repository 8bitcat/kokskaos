import { inject, wait } from './t_helpers.mjs';
// screenshot specific notebook pages: PAGES env = comma-separated page ids (recipe ids or tech ids)
export default async function (page, out, logs) {
  await inject(page);
  await page.evaluate(() => game.toggleBook(true));
  for (const id of (process.env.PAGES || 'burger').split(',')) {
    const idx = await page.evaluate((id) => game.hud.nb.pages.findIndex(p => p.id === id), id);
    if (idx < 0) { logs.push('[test] no page ' + id); continue; }
    await page.evaluate((i) => { game.hud.page = i; game.hud.renderPage(); }, idx); await wait(page, 900);
    await page.screenshot({ path: `${out}/page_${id}.png` });
  }
}
