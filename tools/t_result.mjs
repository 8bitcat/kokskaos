import { inject, wait } from './t_helpers.mjs';
export default async function (page, out, logs) {
  await inject(page);
  await page.evaluate(() => { const s = game.service; s.start(1); s.orderT = 999; s.coins = 640; s.served = 5; s.failed = 1; s.timeLeft = 0.5; });
  await wait(page, 3500); await page.screenshot({ path: out + '/c3_result.png' });
  logs.push('[test] gain ' + (await page.evaluate(() => document.getElementById('gain')?.innerText)));
}
