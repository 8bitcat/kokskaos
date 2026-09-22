// camera tour: screenshots from a list of viewpoints
export default async function (page, out, logs) {
  await page.evaluate(() => { document.getElementById('help').style.display = 'none'; document.getElementById('lockmsg').style.display = 'none'; });
  const views = JSON.parse(process.env.VIEWS || '[]');
  for (const [name, x, y, z, yaw, pitch] of views) {
    await page.evaluate(([x, y, z, yaw, pitch]) => { const p = window.game.player; p.pos.set(x, y, z); p.vel.set(0, 0, 0); p.yaw = yaw; p.pitch = pitch; }, [x, y, z, yaw, pitch]);
    await page.waitForTimeout(700);
    await page.screenshot({ path: out + '/' + name + '.png' });
  }
  const info = await page.evaluate(() => ({ items: window.game.sim.itemCount, fixtures: window.game.sim.fixtures.size, fps: document.getElementById('fps').textContent, calls: window.game.view.renderer.info.render.calls, tris: window.game.view.renderer.info.render.triangles }));
  logs.push('[info] ' + JSON.stringify(info));
}
