import { wait } from './t_helpers.mjs';
// a line-up of dressed-up chefs (view-only fake players) in front of the camera
export default async function (page, out, logs) {
  await page.evaluate(() => { for (const id of ['help', 'lockmsg', 'freeplay', 'fps', 'emotes', 'toasts']) document.getElementById(id).style.display = 'none'; });
  const looks = JSON.parse(process.env.LOOKS);
  await page.evaluate((looks) => {
    const v = game.view, colors = [0xe8413c, 0x2f7fe8, 0x35b34a, 0xffcf33, 0x9656e0, 0xff8a24, 0xff6fb0, 0x19bfb0];
    const z0 = game.K.spawns[0][2] - 1.0;
    looks.forEach((lk, i) => { const p = v.upsertPlayer({ id: 60 + i, name: lk.name, color: colors[i % colors.length], look: lk }); p.tp.set((i - (looks.length - 1) / 2) * 0.95, 0, z0 + (i % 2) * 0.25); p.yaw = Math.PI; p.chef.group.rotation.y = Math.PI; p.emote = lk.emote || null; });
    const pl = game.player; pl.pos.set(0, 0, z0 + 3.3); pl.yaw = 0; pl.pitch = -0.04;
  }, looks);
  await wait(page, 2500); await page.screenshot({ path: out + '/' + (process.env.SHOT || 'lineup') + '.png' });
  await page.evaluate(() => { const pl = game.player; pl.pos.z -= 1.35; pl.pos.x = -1.0; pl.pitch = 0.02; }); await wait(page, 1200); await page.screenshot({ path: out + '/' + (process.env.SHOT || 'lineup') + '_close1.png' });
  await page.evaluate(() => { const pl = game.player; pl.pos.x = 1.0; }); await wait(page, 1200); await page.screenshot({ path: out + '/' + (process.env.SHOT || 'lineup') + '_close2.png' });
}
