import { inject, wait } from './t_helpers.mjs';
// handful: grab one potato stick → neighbours come along; sweep over more → they're scooped up; release over the basket
export default async function (page, out, logs) {
  await inject(page);
  const log = (k, v) => logs.push('[test] ' + k + ' ' + JSON.stringify(v));
  const held = () => page.evaluate(() => { const h = game.sim.players.get(0).hands; return h.map(x => x.ent ? { kind: x.ent.kind, n: 1 + x.extra.length, kinds: [...new Set(x.extra.map(e => e.ent.kind))] } : null); });
  // real chop: grab knife, chop a potato
  const s = await page.evaluate(() => { const b = T.nearest('board', -3, -4.5), k = T.nearest('knife', b.pos.x, b.pos.z); T.stand(b.pos.x + 0.1, b.pos.z + 0.95); T.look(k.pos.x - 0.05, k.pos.y, k.pos.z); return { board: T.info(b), knife: k.id }; });
  await wait(page, 500); await page.evaluate(() => T.grip(1, true)); await wait(page, 900);
  log('knife held', await held());
  await page.evaluate((s) => game.sim.spawn('potato', [s.board.p[0] + 0.05, s.board.p[1] + 0.09, s.board.p[2] - 0.05], null), s); await wait(page, 800);
  await page.evaluate((s) => { const p = game.player, eye = [p.pos.x, p.pos.y + p.eyeH, p.pos.z], tx = s.board.p[0] + 0.05, tz = s.board.p[2] - 0.05; const h = game.sim.players.get(0).hands[1]; p.yaw = Math.atan2(-(tx - eye[0]), -(tz - eye[2])); p.pitch = Math.atan2(s.board.p[1] + 0.25 - eye[1], h.reach); }, s);
  await wait(page, 900); await page.evaluate(() => { game.player.pitch -= 0.28; }); await wait(page, 700);
  log('sticks after chop', await page.evaluate(() => T.count('fry')));
  await page.evaluate(() => { T.grip(1, false); game.player.pitch += 0.3; }); await wait(page, 700);
  // grab one stick with the left hand
  await page.evaluate(() => { const f = T.nearest('fry', -3, -4.5); window.first = f.id; const p = game.player; T.stand(f.pos.x + 0.05, f.pos.z + 0.75); T.look(f.pos.x, f.pos.y, f.pos.z); }); await wait(page, 500);
  await page.evaluate(() => T.grip(0, true)); await wait(page, 800);
  log('after grabbing one stick', await held());
  await page.screenshot({ path: out + '/hf1_grab.png' });
  // lift, then sweep over 4 more sticks lying 0.35 m to the side
  await page.evaluate(() => { game.player.pitch += 0.3; }); await wait(page, 500);
  const more = await page.evaluate(() => { const f = T.ent(window.first), sim = game.sim, y = 0.95; const ids = []; for (let i = 0; i < 4; i++) ids.push(sim.spawn('fry', [f.pos.x - 0.35 + (i % 2) * 0.05, y, f.pos.z + (i - 1.5) * 0.03], null).id); sim.spawn('tomatoslice', [f.pos.x - 0.33, y, f.pos.z + 0.1], null); return ids; });
  await wait(page, 900);
  await page.evaluate(() => { const f = T.ent(window.first); T.look(f.pos.x - 0.35, 0.93, f.pos.z); }); await wait(page, 1500);
  log('after sweeping over 4 more (and a tomato slice)', await held());
  await page.screenshot({ path: out + '/hf2_sweep.png' });
  // carry to the fryer basket and let go
  // walk there at 2 m/s (a teleport would snap the grip)
  const path = await page.evaluate(() => { const fr = game.K.fryers[0], p = game.player; return { x0: p.pos.x, z0: p.pos.z, x1: fr.pos[0] - 1.0, z1: fr.pos[2] }; });
  const steps = Math.ceil(Math.hypot(path.x1 - path.x0, path.z1 - path.z0) / 0.1);
  for (let i = 1; i <= steps; i++) { await page.evaluate(([path, f]) => { const p = game.player; p.pos.set(path.x0 + (path.x1 - path.x0) * f, 0, path.z0 + (path.z1 - path.z0) * f); p.vel.set(0, 0, 0); p.yaw = Math.atan2(-(path.x1 - path.x0), -(path.z1 - path.z0)); p.pitch = -0.2; }, [path, i / steps]); await wait(page, 50); if (i % 25 === 0) log('walk ' + i + '/' + steps, await page.evaluate(() => { const h = game.sim.players.get(0).hands[0]; return { n: h.ent ? 1 + h.extra.length : 0, far: h.extra.map(x => +x.ent.pos.distanceTo(h.ent.pos).toFixed(2)), mainY: h.ent && +h.ent.pos.y.toFixed(2) }; })); }
  await page.evaluate(() => { const fr = game.K.fryers[0]; T.look(fr.pos[0], fr.oilY + 0.35, fr.pos[2]); }); await wait(page, 1500);
  log('carried', await held());
  await page.evaluate(() => T.grip(0, false)); await wait(page, 1500);
  log('in fryer zone', await page.evaluate(() => { const z = game.K.fryers[0].zone; let n = 0; for (const e of game.sim.ents.values()) if (e.kind === 'fry' && e.pos.x > z.min[0] - 0.05 && e.pos.x < z.max[0] + 0.05 && e.pos.z > z.min[2] - 0.05 && e.pos.z < z.max[2] + 0.05 && e.pos.y < z.max[1] + 0.3) n++; return n; }));
  await page.screenshot({ path: out + '/hf3_fryer.png' });
  // pans and pots are always single
  await page.evaluate(() => { const b = game.K.burners[0]; const pan = T.nearest('pan', b.pos[0], b.pos[2]); T.stand(pan.pos.x - 1.0, pan.pos.z + 0.3); T.look(pan.pos.x, pan.pos.y + 0.02, pan.pos.z); }); await wait(page, 400);
  await page.evaluate(() => T.grip(0, true)); await wait(page, 800);
  log('pan grab', await held());
  await page.evaluate(() => T.grip(0, false)); await wait(page, 300);
}
