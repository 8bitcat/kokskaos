import { inject, wait } from './t_helpers.mjs';
export default async function (page, out, logs) {
  await inject(page);
  const log = (k, v) => logs.push('[test] ' + k + ' ' + JSON.stringify(v));
  await page.evaluate(() => { const K = game.K, b = K.burners[1], sim = game.sim; const f = sim.fixtures.get(b.knob), q = f.rest.clone().multiply(new (f.rest.constructor)().setFromAxisAngle(f.axis, -2.5)); f.body.setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }, true);
    window.pan = T.nearest('pan', b.pos[0], b.pos[2]); window.b = b;
    setTimeout(() => { window.sz = sim.spawn('sausage', [b.pos[0], b.pos[1] + 0.14, b.pos[2]], null); window.st = sim.spawn('steak', [b.pos[0] + 0.06, b.pos[1] + 0.2, b.pos[2] + 0.05], null); }, 1500);
    T.stand(b.pos[0] - 1.0, b.pos[2] + 0.3); T.look(b.pos[0], b.pos[1] + 0.05, b.pos[2]); });
  for (let i = 0; i < 12; i++) { await wait(page, 1000); log('t' + i, await page.evaluate(() => { const d = (e) => e ? [+(e.pos.x - window.pan.pos.x).toFixed(3), +(e.pos.y - window.pan.pos.y).toFixed(3), +(e.pos.z - window.pan.pos.z).toFixed(3), +(e.cookA || 0).toFixed(2), e.inC === window.pan, e.body.isSleeping()] : null; return { pan: [+(window.pan.pos.x - window.b.pos[0]).toFixed(3), +(window.pan.pos.y - window.b.pos[1]).toFixed(3)], panUp: +window.pan.up?.toFixed(3), sz: d(window.sz), st: d(window.st) }; })); if (i === 3) await page.screenshot({ path: out + '/sz1.png' }); }
  await page.screenshot({ path: out + '/sz2.png' });
}
