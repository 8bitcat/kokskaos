import { wait } from './t_helpers.mjs';
// the local player's emote: selfie camera + own dressed-up chef
export default async function (page, out, logs) {
  await page.evaluate(() => { for (const id of ['help', 'lockmsg', 'freeplay', 'fps']) document.getElementById(id).style.display = 'none';
    game.profile.d.look = { hat: 'nest', outfit: 'banana', apron: 'cat', face: 'glasses' }; game.sendLook();
    const pl = game.player; pl.pos.set(0, 0, game.K.spawns[0][2] + 0.6); pl.yaw = Math.PI; });
  await wait(page, 800);
  await page.evaluate(() => game.setEmote('cheer')); await wait(page, 1100);
  await page.screenshot({ path: out + '/selfie.png' });
  logs.push('[test] emote ' + JSON.stringify(await page.evaluate(() => ({ emote: game.emote, blend: +game.camBlend.toFixed(2), visible: game.view.players.get(0).chef.group.visible, owned: game.meta.ownedEmotes().map(e => e.id) }))));
  await page.evaluate(() => { game.player.vel.x = 3; game.player.keys.add('KeyW'); game.player.locked = true; }); await wait(page, 900);
  logs.push('[test] after moving ' + JSON.stringify(await page.evaluate(() => ({ emote: game.emote, blend: +game.camBlend.toFixed(2) }))));
}
