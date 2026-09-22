// injected test helpers (window.T) for driving the local chef without pointer lock
export async function inject(page) {
  await page.evaluate(() => {
    document.getElementById('help').style.display = 'none'; document.getElementById('lockmsg').style.display = 'none';
    const g = window.game, p = g.player, sim = g.sim;
    window.T = {
      eye() { return [p.pos.x, p.pos.y + p.eyeH, p.pos.z]; },
      look(x, y, z) { const e = this.eye(), dx = x - e[0], dy = y - e[1], dz = z - e[2], l = Math.hypot(dx, dy, dz); p.yaw = Math.atan2(-dx, -dz); p.pitch = Math.asin(dy / l); },
      stand(x, z, y = 0) { p.pos.set(x, y, z); p.vel.set(0, 0, 0); },
      nearest(kind, x, z) { let best = null, bd = 1e9; for (const e of sim.ents.values()) { if (e.kind !== kind) continue; const d = Math.hypot(e.pos.x - x, e.pos.z - z); if (d < bd) { bd = d; best = e; } } return best; },
      ent(id) { return sim.ents.get(id); },
      info(e) { return e ? { id: e.id, kind: e.kind, p: [+e.pos.x.toFixed(2), +e.pos.y.toFixed(2), +e.pos.z.toFixed(2)], cookA: +(e.cookA || 0).toFixed(2), cookB: +(e.cookB || 0).toFixed(2), method: e.method, heat: +(e.heat || 0).toFixed(2), water: +(e.water || 0).toFixed(2), temp: +(e.temp || 0).toFixed(2), held: !!e.heldBy, angle: e.angle != null ? +e.angle.toFixed(2) : undefined, value: e.value != null ? +e.value.toFixed(2) : undefined } : null; },
      grip(h, on) { p.mouse[h] = on; },
      held(h) { const e = sim.players.get(0).hands[h].ent; return e ? this.info(e) : null; },
      count(kind) { let n = 0; for (const e of sim.ents.values()) if (e.kind === kind) n++; return n; },
    };
  });
}
export const wait = (page, ms) => page.waitForTimeout(ms);
