// photo session: host camera looks at two joined chefs in different poses
import { createRequire } from 'node:module'; import fs from 'node:fs';
const require = createRequire(process.env.PW_DIR + '/'); const { chromium } = require('playwright');
const out = process.argv[2], exe = 'C:/Users/palss/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe';
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const logs = [];
const mk = async (tag, w = 640, h = 360) => { const p = await browser.newPage({ viewport: { width: w, height: h } }); p.on('pageerror', e => logs.push(`[${tag}:pageerror] ${e.message}\n${(e.stack || '').split('\n').slice(0, 5).join('\n')}`)); return p; };
const started = (p) => p.waitForFunction(() => window.game && window.game.player && window.game.last, null, { timeout: 90000 });
const host = await mk('host', 1280, 720);
await host.goto('http://localhost:8123/?test=host&lang=en'); await started(host);
const code = await host.evaluate(() => game.code);
const hide = (p) => p.evaluate(() => { for (const id of ['help', 'lockmsg', 'freeplay', 'fps']) document.getElementById(id).style.display = 'none'; });
await hide(host);
const A = await mk('a'), B = await mk('b');
await A.goto(`http://localhost:8123/?test=join&join=${code}&lang=en`); await started(A);
await B.goto(`http://localhost:8123/?test=join&join=${code}&lang=en`); await started(B);
await A.evaluate(() => { game.roster.get(game.localId); });
// names
await host.evaluate(() => { const names = { 1: 'Astrid', 2: 'William' }; for (const [id, n] of Object.entries(names)) { const info = game.roster.get(+id); if (info) { info.name = n; game.view.upsertPlayer({ ...info }); } } });
const place = (p, x, z, yaw, pitch = 0) => p.evaluate(([x, z, yaw, pitch]) => { const pl = game.player; pl.pos.set(x, 0, z); pl.vel.set(0, 0, 0); pl.yaw = yaw; pl.pitch = pitch; pl.keys.clear(); }, [x, z, yaw, pitch]);
const cam = (x, z, tx, ty, tz, y = 0) => host.evaluate(([x, y, z, tx, ty, tz]) => { const p = game.player; p.pos.set(x, y, z); p.vel.set(0, 0, 0); const e = [x, y + p.eyeH, z], dx = tx - e[0], dy = ty - e[1], dz = tz - e[2]; p.yaw = Math.atan2(-dx, -dz); p.pitch = Math.asin(dy / Math.hypot(dx, dy, dz)); }, [x, y, z, tx, ty, tz]);
// open floor between the pass and bench 1: chefs face south (yaw = PI => facing +z), host camera stands south of them looking north
await place(A, -1.0, -7.2, Math.PI); await place(B, 1.0, -7.2, Math.PI);
await cam(0, -5.0, 0, 1.25, -7.2); await host.waitForTimeout(2500);
await host.screenshot({ path: out + '/chef1_idle.png' });
// A grabs a pan + spatula (spawned in front of them), B grabs a pot
await host.evaluate(() => { const s = game.sim; window.it = { pan: s.spawn('pan', [-1.15, 1.1, -6.45], null).id, spat: s.spawn('spatula', [-0.8, 1.15, -6.45], null).id, pot: s.spawn('pot', [1.0, 1.05, -6.4], null).id }; for (const k in window.it) { const e = s.ents.get(window.it[k]); e.body.setGravityScale(0, true); e.body.setLinearDamping(20); } });
const aim = (p, tx, ty, tz) => p.evaluate(([tx, ty, tz]) => { const pl = game.player, e = [pl.pos.x, pl.pos.y + pl.eyeH, pl.pos.z], dx = tx - e[0], dy = ty - e[1], dz = tz - e[2]; pl.yaw = Math.atan2(-dx, -dz); pl.pitch = Math.asin(dy / Math.hypot(dx, dy, dz)); }, [tx, ty, tz]);
await aim(A, -1.15, 1.12, -6.45); await A.waitForTimeout(500); await A.evaluate(() => { game.player.mouse[0] = true; }); await A.waitForTimeout(900);
await aim(A, -0.8, 1.15, -6.45); await A.waitForTimeout(600); await A.evaluate(() => { game.player.mouse[1] = true; }); await A.waitForTimeout(900);
await aim(B, 1.0, 1.15, -6.4); await B.waitForTimeout(500); await B.evaluate(() => { game.player.mouse[0] = true; }); await B.waitForTimeout(900);
await host.evaluate(() => { const s = game.sim; for (const k in window.it) { const e = s.ents.get(window.it[k]); e.body.setGravityScale(1, true); e.body.setLinearDamping(0.1); } });
await aim(A, -0.9, 1.2, -5.0); await aim(B, 0.9, 1.0, -5.0); await host.waitForTimeout(2000);
logs.push('[held] ' + JSON.stringify(await host.evaluate(() => [...game.sim.players.values()].map(p => p.hands.map(h => h.ent && h.ent.kind)))));
await host.screenshot({ path: out + '/chef2_holding.png' });
await cam(-0.2, -5.9, -1.0, 1.35, -7.2); await host.waitForTimeout(1200); await host.screenshot({ path: out + '/chef3_closeup.png' });
// B runs toward the camera while A crouches
await A.evaluate(() => { game.player.keys.add('ControlLeft'); game.player.locked = true; }); await place(B, 2.5, -8.0, Math.PI - 0.5);
await B.evaluate(() => { const pl = game.player; pl.locked = true; pl.keys.add('KeyW'); pl.keys.add('ShiftLeft'); }); await cam(0.3, -4.6, 0.4, 1.0, -7.0);
await host.waitForTimeout(700); await host.screenshot({ path: out + '/chef4_run_crouch.png' });
await B.evaluate(() => { game.player.keys.clear(); }); await A.evaluate(() => { game.player.keys.clear(); });
// bonk B with a flying rolling pin => dizzy stars
await place(B, 0.8, -7.0, Math.PI); await cam(0.2, -5.2, 0.8, 1.45, -7.0); await host.waitForTimeout(1200);
await host.evaluate(() => { game.sim.spawn('rollingpin', [3.2, 1.55, -7.0], null, { v: [-9, 0.6, 0], w: [0, 0, 12] }); }); await host.waitForTimeout(900);
await host.screenshot({ path: out + '/chef5_bonk.png' });
// what client A sees: the host chef + B
await place(A, 0, -8.0, Math.PI); await aim(A, 0.3, 1.3, -5.5); await hide(A); await A.waitForTimeout(1500); await A.screenshot({ path: out + '/chef6_clientview.png' });
fs.writeFileSync(out + '/chef_log.txt', logs.join('\n')); console.log(logs.join('\n')); await browser.close();
