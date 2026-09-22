// photo session for the recipe notebook: one plated photo per recipe (img/recipes/<id>.jpg) + technique photos (img/howto/<name>.jpg)
// run:  PW_DIR=<folder with node_modules/playwright> EXTRA='&rest=grand&cheat=1' node tools/shot.mjs <logdir> tools/photos.mjs
// env:  ONLY=recipes | howto | <comma list of recipe ids and/or howto names>   (default: everything)
// Output: JPEG 480x360 (the centre of the 1280x720 render), quality 82.
import { inject, wait } from './t_helpers.mjs';
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REC_DIR = path.join(ROOT, 'img', 'recipes'), HOW_DIR = path.join(ROOT, 'img', 'howto');
const CLIP = { x: 400, y: 200, width: 480, height: 360 };
const HUD_IDS = ['help', 'lockmsg', 'freeplay', 'fps', 'emotes', 'toasts', 'topright', 'tickets', 'cross', 'tip', 'hud'];
const ISLAND = { x: -7.8, top: 0.92, z: -3.2 };            // the wooden island in Storköket: clean white top, warm wood body
const PLATE_CAM = { d: 0.85, fov: 34, ty: 0.955 };          // same framing for all 36 dishes

// ---------------------------------------------------------------- page helpers
async function setup(page) {
  await inject(page);
  await page.evaluate((ids) => {
    for (const id of ids) { const el = document.getElementById(id); if (el) el.style.display = 'none'; }
    const sim = game.sim;
    // clear the island (board, knife, plates, bowl, bottles) so it is an empty backdrop; keep the tool refill from putting them back
    for (const e of [...sim.ents.values()]) if (!e.fixture && e.pos.x > -9.5 && e.pos.x < -6.1 && e.pos.z > -4 && e.pos.z < -2.4) { if (e.home && sim.toolCounts[e.kind]) sim.toolCounts[e.kind]--; sim.despawn(e); }
    window.PH = {
      missing: [], aim: null,
      V: sim.players.get(0).pos.constructor,
      spawn(kind, p, q, opts) { const e = sim.spawn(kind, p, q || null, opts || {}); if (!e) this.missing.push(kind); else if (opts && opts.damp) this.damp(e); return e; },
      damp(e) { e.body.setLinearDamping(2.5); e.body.setAngularDamping(5); },   // gentle landing for photos: nothing bounces or rolls off the plate
      cooked(method) { return { cookA: 1.2, cookB: 1.2, by: { [method]: 1.2 }, method: { fry: 1, boil: 2, deepfry: 3, bake: 4, grill: 5 }[method] }; },
      yawQ(a) { return { x: 0, y: Math.sin(a / 2), z: 0, w: Math.cos(a / 2) }; },
      fixture(id, ang) { const f = sim.fixtures.get(id), q = f.rest.clone().multiply(new (f.rest.constructor)().setFromAxisAngle(f.axis, ang)); f.body.setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }, true); f.body.wakeUp(); },
      freeze(e) { e.body.setGravityScale(0, true); e.body.setLinearDamping(50); e.body.setAngularDamping(50); e.body.setLinvel({ x: 0, y: 0, z: 0 }, true); e.body.setAngvel({ x: 0, y: 0, z: 0 }, true); },
      clearFrom(id0) { for (const e of [...sim.ents.values()]) if (e.id >= id0 && !e.fixture) sim.despawn(e); },
    };
  }, HUD_IDS);
}
async function reload(page) {
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.game && window.game.player && window.game.last, null, { timeout: 60000 });
  await wait(page, 1500);
  await setup(page);
}
// camera: stand at (x,z), look at (tx,ty,tz), vertical fov, optional crouch (eye 0.95 instead of 1.58)
async function cam(page, x, z, tx, ty, tz, fov = 40, crouch = false) {
  await page.evaluate(([x, z, tx, ty, tz, fov, crouch]) => {
    const p = game.player, c = game.view.camera;
    if (crouch) { p.keys.add('ControlLeft'); p.locked = true; } else p.keys.delete('ControlLeft');
    c.fov = fov; c.updateProjectionMatrix(); T.stand(x, z); T.look(tx, ty, tz); window.PH.aim = [tx, ty, tz];
  }, [x, z, tx, ty, tz, fov, crouch]);
  await wait(page, 600);
  await page.evaluate(() => T.look(...window.PH.aim));   // re-aim once the eye height has settled
  await wait(page, 150);
}
const mark = (page) => page.evaluate(() => game.sim.nextId);
const clearFrom = (page, id0) => page.evaluate((id0) => window.PH.clearFrom(id0), id0);
const shoot = (page, file) => page.screenshot({ path: file, clip: CLIP, type: 'jpeg', quality: 82 });
const missing = (page) => page.evaluate(() => window.PH.missing.splice(0));

// ---------------------------------------------------------------- plating
// req groups get their own spot on the plate; stacked dishes (burgers, hot dog) pile up in the middle in recipe order.
const CENTRES = { 1: [[0, 0]], 2: [[-0.045, 0.01], [0.05, -0.01]], 3: [[-0.05, 0.025], [0.05, 0.03], [0, -0.045]], 4: [[-0.045, 0.04], [0.045, 0.04], [-0.045, -0.04], [0.045, -0.04]] };
const NOODLE_DIRS = [[1, 0, 0.2], [0.35, 0, 1], [-1, 0, 0.55], [0.7, 0, -0.8]];
const BLOBS = new Set(['ketchupblob', 'mustardblob', 'jamblob', 'sauce', 'mash', 'gratedcheese', 'rice', 'eggblob']);
const STICKS = new Set(['fry', 'fishfinger', 'paprikastrip', 'bacon', 'sausage']);   // laid side by side like a real portion
let seed = 7; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
function spot(kind, n, i) {   // -> [dx, dz, yaw] inside the group's spot
  if (n === 1) return [0, 0, rnd() * Math.PI * 2];
  if (STICKS.has(kind)) { const cols = Math.min(n, 3), row = Math.floor(i / cols), rows = Math.ceil(n / cols); return [(i % cols - (cols - 1) / 2) * 0.03, (row - (rows - 1) / 2) * 0.035, 0.35 + (rnd() - 0.5) * 0.25]; }
  const r = BLOBS.has(kind) ? 0.028 : n <= 3 ? 0.035 : 0.05, a = i / n * Math.PI * 2 + 0.6;
  return [Math.cos(a) * r + (rnd() - 0.5) * 0.012, Math.sin(a) * r + (rnd() - 0.5) * 0.012, rnd() * Math.PI * 2];
}
function plan(recipe) {   // -> ordered spawn list relative to the plate centre (dx, dz)
  const groups = recipe.req, stack = groups.some(q => q.k === 'bunbottom' || q.k === 'hotdogbun'), out = [];
  const centres = stack ? groups.map(() => [0, 0]) : (CENTRES[groups.length] || CENTRES[4]);
  groups.forEach((q, gi) => {
    const c = centres[gi], method = q.cooked ? q.cooked[0] : null;
    if (q.k === 'noodle') { for (let i = 0; i < q.n; i++) out.push({ noodle: true, dx: c[0] * 0.5 + (rnd() - 0.5) * 0.02, dz: c[1] * 0.5 + (rnd() - 0.5) * 0.02, dir: NOODLE_DIRS[i % NOODLE_DIRS.length] }); return; }
    for (let i = 0; i < q.n; i++) {
      const [ox, oz, yaw] = stack ? [(rnd() - 0.5) * 0.008, (rnd() - 0.5) * 0.008, 0] : spot(q.k, q.n, i);
      // the hot dog's sausage would roll off the round bun: hold it in the bun's groove instead
      out.push({ kind: q.k, dx: c[0] + ox, dz: c[1] + oz, method, yaw, hold: recipe.id === 'hotdog' && q.k === 'sausage' ? 0.085 : 0 });
    }
  });
  return out;
}
async function plateDish(page, recipe, x, top, z) {
  const items = plan(recipe), stack = items.every(it => !it.yaw && !it.noodle);
  const gap = stack ? 240 : 130;   // ms between drops: each piece lands before the next arrives, so nothing spawns inside anything
  await page.evaluate(([items, x, top, z, gap, stack]) => {
    const PH = window.PH, sim = game.sim;
    PH.spawn('plate', [x, top + 0.02, z], null, {});
    items.forEach((it, i) => setTimeout(() => {
      const y = top + 0.09 + (stack ? i * 0.012 : 0);
      if (it.noodle) {   // a strand hung almost upright above the plate crumples into a heap instead of lying across the rim
        const id0 = sim.nextId; sim.spawnNoodle(new PH.V(x + it.dx, top + 0.26, z + it.dz), new PH.V(it.dir[0] * 0.25, 1, it.dir[2] * 0.25), 1.1, null);
        for (const e of sim.ents.values()) if (e.id >= id0 && e.kind === 'noodle') PH.damp(e);
        return;
      }
      const e = PH.spawn(it.kind, [x + it.dx, it.hold ? top + it.hold : y, z + it.dz], it.yaw ? PH.yawQ(it.yaw) : null, { ...(it.method ? PH.cooked(it.method) : {}), damp: 1 });
      if (e && it.hold) PH.freeze(e);
    }, 250 + i * gap));
  }, [items, x, top, z, gap, stack]);
  await wait(page, 250 + items.length * gap + 2600);
}

// ---------------------------------------------------------------- recipe photos
async function recipes(page, logs, only) {
  // every recipe in the game (not just this restaurant's menu), so all photos share one kitchen + framing
  const list = await page.evaluate(async () => { const { RECIPES } = await import('/js/orders.js'); return RECIPES.map(r => ({ id: r.id, req: r.req })); });
  const failed = []; let n = 0;
  for (const r of list) {
    if (only && !only.has(r.id)) continue;
    if (n && n % 8 === 0) await reload(page);
    n++;
    const id0 = await mark(page);
    await cam(page, ISLAND.x, ISLAND.z + PLATE_CAM.d, ISLAND.x, PLATE_CAM.ty, ISLAND.z, PLATE_CAM.fov);
    await plateDish(page, r, ISLAND.x, ISLAND.top, ISLAND.z);
    await shoot(page, path.join(REC_DIR, r.id + '.jpg'));
    const miss = await missing(page);
    if (miss.length) { failed.push(r.id); logs.push(`[photos] ${r.id}: could not spawn ${miss.join(',')}`); }
    else logs.push(`[photos] recipe ${r.id} ok`);
    await clearFrom(page, id0);
    await wait(page, 200);
  }
  return failed;
}

// ---------------------------------------------------------------- technique photos
const HOWTO = {
  async hob(page) {   // frying pan on a lit burner with a half-done steak; knob row visible below
    const b = await page.evaluate(() => { const b = game.K.burners[1]; window.PH.fixture(b.knob, -2.5); const pan = T.nearest('pan', b.pos[0], b.pos[2]);
      window.PH.spawn('steak', [pan.pos.x, pan.pos.y + 0.15, pan.pos.z], null, { cookA: 0.6, cookB: 0.9, by: { fry: 0.9 }, method: 1 }); return b.pos; });
    await cam(page, b[0] - 1.35, b[2] + 0.12, b[0] - 0.12, 0.9, b[2], 52);
    await wait(page, 2500);
  },
  async fryer(page, logs) {   // basket lifted to the oil surface so the six golden fries in it are visible, knob turned on
    const f = await page.evaluate(() => { const f = game.K.fryers[0]; window.PH.fixture(f.knob, -2.5); const bk = T.nearest('basket', f.pos[0], f.pos[2] - 0.12);
      bk.body.setBodyType(game.sim.R.RigidBodyType.KinematicPositionBased, true);   // pinned at the oil surface (a frozen dynamic body gets pushed back down by the vat)
      bk.body.setTranslation({ x: f.pos[0], y: f.oilY + 0.03, z: f.pos[2] }, true); bk.body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true); window.bk = bk;
      bk.pos.set(f.pos[0], f.oilY + 0.03, f.pos[2]); bk.rot.set(0, 0, 0, 1); bk.dirty = true;   // the pose sync skips kinematic (sleeping) bodies, so move the drawn basket too
      setTimeout(() => { for (let i = 0; i < 6; i++) window.PH.spawn('fry', [f.pos[0] + (i % 3 - 1) * 0.04, f.oilY + 0.14 + i * 0.03, f.pos[2] + (i < 3 ? -0.03 : 0.03)], window.PH.yawQ(0.25 + (i % 2) * 0.2), { ...window.PH.cooked('deepfry'), damp: 1 }); }, 400);
      return f.pos; });
    await cam(page, f[0] - 0.85, f[2] + 0.02, f[0], 0.95, f[2], 50);
    await wait(page, 3500);
    logs.push('[photos] fryer basket ' + JSON.stringify(await page.evaluate(() => [T.info(window.bk), ...[...game.sim.ents.values()].filter(e => e.kind === 'fry').slice(-6).map(e => T.info(e).p)])));
  },
  async tap(page) {   // pot under an open tap, water stream
    const t = await page.evaluate(() => { const t = game.K.taps[0]; window.PH.spawn('pot', [t.spout[0], t.spout[1] - 0.6, t.spout[2]], null, {}); window.PH.fixture(t.lever, -0.9); return t.spout; });
    await cam(page, t[0], t[2] - 1.25, t[0], t[1] - 0.26, t[2], 46);
    await wait(page, 3000);
  },
  async boil(page) {   // stock pot of boiling water on a lit burner, spaghetti leaning out of it, steam
    const b = await page.evaluate(() => { const b = game.K.burners[3]; window.PH.fixture(b.knob, -2.5); const pot = T.nearest('pot', b.pos[0], b.pos[2]); pot.water = 0.8; pot.temp = 1; pot.heat = 1;
      const V = window.PH.V, sim = game.sim, id0 = sim.nextId;
      const dirs = [[-0.25, 1, 0.55], [-0.2, 1, -0.5], [-0.55, 1, 0.05]];   // strands lean out of the pot in different directions (camera is on the -x side)
      for (let i = 0; i < 3; i++) { const d = dirs[i]; sim.spawnNoodle(new V(pot.pos.x + d[0] * 0.12, pot.pos.y + 0.27, pot.pos.z + d[2] * 0.12), new V(d[0], d[1], d[2]), 1.1, null); }
      for (const e of sim.ents.values()) if (e.id >= id0 && e.kind === 'noodle') window.PH.freeze(e);
      return [pot.pos.x, pot.pos.y, pot.pos.z]; });
    await cam(page, b[0] - 0.85, b[2] + 0.05, b[0] + 0.02, b[1] + 0.2, b[2], 48);
    await wait(page, 3500);
  },
  async knife(page) {   // cutting board: whole potato, six sticks beside it, the knife lying in front; from above at an angle
    await page.evaluate(([x, top, z]) => { const PH = window.PH;
      PH.spawn('board', [x, top + 0.02, z], null, {});
      PH.spawn('potato', [x - 0.12, top + 0.1, z - 0.02], null, {});
      for (let i = 0; i < 6; i++) PH.spawn('fry', [x + 0.06 + (i % 3) * 0.04, top + 0.09 + i * 0.02, z - 0.06 + (i < 3 ? 0 : 0.06)], PH.yawQ(Math.PI / 2 + (i - 2.5) * 0.08), {});
      PH.spawn('knife', [x - 0.02, top + 0.09, z + 0.11], PH.yawQ(0.15), {});
    }, [ISLAND.x, ISLAND.top, ISLAND.z]);
    await cam(page, ISLAND.x, ISLAND.z + 0.7, ISLAND.x, ISLAND.top + 0.03, ISLAND.z, 38);
    await wait(page, 2800);
  },
  async oven(page, logs) {   // open oven door, glowing, tray with a chicken inside
    const o = await page.evaluate(() => { const o = game.K.ovens[0]; window.PH.fixture(o.knob, -2.5); window.PH.fixture(o.door, 1.3);
      window.PH.spawn('tray', [o.pos[0] + 0.02, o.pos[1] - 0.02, o.pos[2]], null, {});
      window.PH.spawn('chicken', [o.pos[0] + 0.02, o.pos[1] + 0.1, o.pos[2]], window.PH.yawQ(Math.PI / 2 + 0.3), { cookA: 0.9, cookB: 0.9, by: { bake: 0.9 }, method: 4 }); return o.pos; });
    await cam(page, o[0] - 1.7, o[2] + 0.05, o[0] - 0.1, 0.5, o[2], 60, true);   // low camera straight into the open oven: knobs, glow, tray + chicken on the rack, the open door's inner face at the bottom
    await wait(page, 3000);
    logs.push('[photos] oven door ' + JSON.stringify(await page.evaluate(() => { const f = game.sim.fixtures.get(game.K.ovens[0].door); return { angle: +f.angle.toFixed(2), on: game.K.ovens[0].on, temp: game.K.ovens[0].temp }; })));
  },
  async pass(page, logs) {   // burger on the pass, waiter waiting behind it (low camera so the waiter's face fits above the plate)
    const r = await page.evaluate(() => { const r = game.service.menu.find(r => r.id === 'burger'); return { id: r.id, req: r.req }; });
    const y = await page.evaluate(() => game.K.pass.topY);
    await cam(page, 0, -7.7, 0, y + 0.3, -9.6, 52, true);
    await plateDish(page, r, 0, y, -9.05);
  },
  async blender(page) {   // jar on the blender with a tomato inside, switch flipped on
    const b = await page.evaluate(() => { const b = game.K.blenders[0]; window.PH.spawn('tomato', [b.pos[0], b.pos[1] + 0.2, b.pos[2]], null, {}); window.PH.fixture(b.lever, 0.6); return b.pos; });
    await cam(page, b[0], b[2] + 1.1, b[0], b[1] + 0.08, b[2], 44);
    await wait(page, 2500);
  },
  async squeeze(page, logs) {   // ketchup bottle upside down over a hot dog bun with blobs on it
    await page.evaluate(([x, top, z]) => { const PH = window.PH;
      PH.spawn('hotdogbun', [x, top + 0.05, z], PH.yawQ(0.2), { damp: 1 });
      setTimeout(() => { for (let i = 0; i < 3; i++) PH.spawn('ketchupblob', [x - 0.04 + i * 0.04, top + 0.12 + i * 0.015, z + (i - 1) * 0.006], null, { damp: 1 }); }, 500);
      setTimeout(() => { const b = PH.spawn('ketchup', [x + 0.02, top + 0.36, z - 0.01], { x: 1, y: 0, z: 0, w: 0 }, {}); PH.freeze(b); }, 1000);
    }, [ISLAND.x, ISLAND.top, ISLAND.z]);
    await cam(page, ISLAND.x, ISLAND.z + 0.8, ISLAND.x, ISLAND.top + 0.17, ISLAND.z, 36);
    await wait(page, 3200);
    logs.push('[photos] squeeze items ' + JSON.stringify(await page.evaluate(() => [...game.sim.ents.values()].filter(e => e.kind === 'ketchupblob' || e.kind === 'hotdogbun').map(e => T.info(e)))));
  },
  async bin(page) {   // burnt steak dropping into a green bin, looking down into it
    const c = await page.evaluate(() => { const t = game.K.trash[0], cx = (t.min[0] + t.max[0]) / 2, cz = (t.min[2] + t.max[2]) / 2;
      const s = window.PH.spawn('steak', [cx, 0.9, cz + 0.02], { x: 0.38, y: 0.1, z: 0.25, w: 0.88 }, { cookA: 2.5, cookB: 2.5, by: { fry: 2.5 }, method: 1 }); window.PH.freeze(s); return [cx, cz]; });
    await cam(page, c[0], c[1] + 0.95, c[0], 0.74, c[1], 52);
    await wait(page, 2200);
  },
  async plate(page) {   // an empty plate and a bowl side by side
    await page.evaluate(([x, top, z]) => { window.PH.spawn('plate', [x - 0.14, top + 0.02, z], null, {}); window.PH.spawn('bowl', [x + 0.16, top + 0.02, z], null, {}); }, [ISLAND.x, ISLAND.top, ISLAND.z]);
    await cam(page, ISLAND.x, ISLAND.z + 0.85, ISLAND.x, ISLAND.top + 0.04, ISLAND.z, 46);
    await wait(page, 2000);
  },
  async mash(page) {   // the masher raised over a boiled potato, three mash blobs beside it on the board
    await page.evaluate(([x, top, z]) => { const PH = window.PH;
      PH.spawn('board', [x, top + 0.02, z], null, {});
      PH.spawn('potato', [x - 0.11, top + 0.1, z - 0.01], null, { ...PH.cooked('boil'), damp: 1 });
      for (let i = 0; i < 3; i++) PH.spawn('mash', [x + 0.05 + (i % 2) * 0.05, top + 0.09 + i * 0.02, z - 0.05 + i * 0.045], null, { damp: 1 });
      setTimeout(() => { const m = PH.spawn('masher', [x - 0.11, top + 0.17, z - 0.01], { x: 0, y: 0, z: -0.7071, w: 0.7071 }, {}); PH.freeze(m); }, 800);   // head down, handle up, hovering
    }, [ISLAND.x, ISLAND.top, ISLAND.z]);
    await cam(page, ISLAND.x, ISLAND.z + 0.75, ISLAND.x, ISLAND.top + 0.12, ISLAND.z, 40);
    await wait(page, 3000);
  },
  async mallet(page) {   // the meat mallet raised over a schnitzel on the board
    await page.evaluate(([x, top, z]) => { const PH = window.PH;
      PH.spawn('board', [x, top + 0.02, z], null, {});
      PH.spawn('schnitzel', [x - 0.04, top + 0.09, z], PH.yawQ(0.3), { damp: 1 });
      setTimeout(() => { const m = PH.spawn('mallet', [x - 0.04, top + 0.17, z], { x: 0.7071, y: 0, z: 0, w: 0.7071 }, {}); PH.freeze(m); }, 800);   // striking face down, handle out to the left
    }, [ISLAND.x, ISLAND.top, ISLAND.z]);
    await cam(page, ISLAND.x, ISLAND.z + 0.75, ISLAND.x, ISLAND.top + 0.08, ISLAND.z, 40);
    await wait(page, 3000);
  },
  async pizza(page) {   // unbaked: base + 2 sauce + 2 cheese on a tray, next to a finished pizza
    await page.evaluate(([x, top, z]) => { const PH = window.PH;
      PH.spawn('tray', [x - 0.24, top + 0.02, z], null, {});
      PH.spawn('pizzabase', [x - 0.24, top + 0.09, z], null, {});
      setTimeout(() => { for (const [k, dx, dz] of [['sauce', 0.04, 0.03], ['sauce', -0.05, -0.02], ['cheeseslice', 0.0, 0.06], ['cheeseslice', 0.02, -0.06]]) PH.spawn(k, [x - 0.24 + dx, top + 0.13, z + dz], null, {}); }, 500);
      PH.spawn('pizza', [x + 0.2, top + 0.05, z], PH.yawQ(0.4), PH.cooked('bake'));
    }, [ISLAND.x, ISLAND.top, ISLAND.z]);
    await cam(page, ISLAND.x, ISLAND.z + 0.95, ISLAND.x, ISLAND.top + 0.03, ISLAND.z, 44);
    await wait(page, 3000);
  },
};

async function howto(page, logs, only) {
  const done = [];
  for (const name of Object.keys(HOWTO)) {
    if (only && !only.has(name)) continue;
    await reload(page);
    const id0 = await mark(page);
    try {
      await HOWTO[name](page, logs);
      await shoot(page, path.join(HOW_DIR, name + '.jpg'));
      const miss = await missing(page);
      logs.push(`[photos] howto ${name} ${miss.length ? 'MISSING ' + miss.join(',') : 'ok'}`);
      done.push(name);
    } catch (e) { logs.push(`[photos] howto ${name} FAILED: ${e.message}`); }
    await clearFrom(page, id0);
  }
  return done;
}

// ---------------------------------------------------------------- main
export default async function (page, out, logs) {
  fs.mkdirSync(REC_DIR, { recursive: true }); fs.mkdirSync(HOW_DIR, { recursive: true });
  const only = process.env.ONLY, sel = only && only !== 'recipes' && only !== 'howto' ? new Set(only.split(',')) : null;
  await setup(page);
  let failed = [], done = [];
  if (only !== 'howto') failed = await recipes(page, logs, sel);
  if (only !== 'recipes') done = await howto(page, logs, sel);
  const files = fs.readdirSync(REC_DIR).filter(f => f.endsWith('.jpg'));
  logs.push(`[photos] recipe files: ${files.length}, howto: ${done.join(',')}, failed recipes: ${failed.join(',') || 'none'}`);
  console.log(logs.filter(l => l.startsWith('[photos]')).join('\n'));
}
