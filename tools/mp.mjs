// two-browser multiplayer test: host + one joining client
import { createRequire } from 'node:module'; import fs from 'node:fs';
const require = createRequire(process.env.PW_DIR + '/'); const { chromium } = require('playwright');
const out = process.argv[2], exe = 'C:/Users/palss/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe';
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const logs = [];
const mk = async (tag) => { const p = await browser.newPage({ viewport: { width: 960, height: 540 } }); if (process.env.SHIM) await p.route('**/js/avatars.js', async (route) => { const r = await route.fetch(); let t = await r.text(); if (!/export const EMOTES/.test(t)) t += String.fromCharCode(10) + 'export const EMOTES = [];'; await route.fulfill({ response: r, body: t }); }); p.on('console', m => { const t = m.text(); if (!/AudioContext|flatShading|nominal range/.test(t)) logs.push(`[${tag}:${m.type()}] ${t}`); }); p.on('pageerror', e => logs.push(`[${tag}:pageerror] ${e.message}\n${(e.stack || '').split('\n').slice(0, 5).join('\n')}`)); return p; };
const host = await mk('host');
await host.goto('http://localhost:8123/?test=host&lang=sv' + (process.env.EXTRA || '')); await host.waitForFunction(() => window.game && window.game.player && window.game.last, null, { timeout: 90000 });
const code = await host.evaluate(() => ({ code: game.code, online: game.net.online })); logs.push('[mp] host ' + JSON.stringify(code));
if (code.online) {
  const cl = await mk('client');
  await cl.goto(`http://localhost:8123/?test=join&join=${code.code}&lang=en`);
  try { await cl.waitForFunction(() => window.game && window.game.player && window.game.last, null, { timeout: 60000 }); } catch (e) { logs.push('[mp] client failed to start'); }
  await cl.waitForTimeout(4000);
  logs.push('[mp] client ' + JSON.stringify(await cl.evaluate(() => ({ id: game.localId, items: game.view.items.size, players: game.view.players.size, rest: game.rest.id, fixtures: game.K.fixtures.length, roster: [...game.roster.values()].map(r => r.name + ':' + JSON.stringify(r.look)) }))));
  logs.push('[mp] host sees ' + JSON.stringify(await host.evaluate(() => ({ items: game.view.items.size, players: game.sim.players.size, ready: [...game.ready], rest: game.rest.id, fixtures: game.K.fixtures.length }))));
  // client walks + grabs a pan from the bench; host watches
  await cl.evaluate(() => { document.getElementById('help').style.display = 'none'; document.getElementById('lockmsg').style.display = 'none'; const p = game.player; let pan = null, bd = 1e9; for (const it of game.view.items.values()) if (it.kind === 'pan') { const d = Math.hypot(it.group.position.x - 2, it.group.position.z - 0.3); if (d < bd) { bd = d; pan = it; } } window.pan = pan;
    p.pos.set(pan.group.position.x, 0, pan.group.position.z + 1.0); const e = [p.pos.x, p.pos.y + p.eyeH, p.pos.z], dx = pan.group.position.x - e[0], dy = pan.group.position.y + 0.03 - e[1], dz = pan.group.position.z - e[2]; p.yaw = Math.atan2(-dx, -dz); p.pitch = Math.asin(dy / Math.hypot(dx, dy, dz)); });
  await cl.waitForTimeout(800); await cl.evaluate(() => { game.player.mouse[0] = true; }); await cl.waitForTimeout(1000);
  await cl.evaluate(() => { game.player.pitch += 0.45; game.player.yaw += 0.3; }); await cl.waitForTimeout(1500);
  logs.push('[mp] client pan pos ' + JSON.stringify(await cl.evaluate(() => window.pan.group.position.toArray().map(v => +v.toFixed(2)))));
  logs.push('[mp] host pan ' + JSON.stringify(await host.evaluate((id) => { const e = game.sim.ents.get(id); return { p: e.pos.toArray().map(v => +v.toFixed(2)), held: !!e.heldBy }; }, await cl.evaluate(() => window.pan.id))));
  await host.evaluate(() => { document.getElementById('help').style.display = 'none'; document.getElementById('lockmsg').style.display = 'none'; const p = game.player, o = game.sim.players.get(1); p.pos.set(o.pos.x + 1.6, 0, o.pos.z + 1.8); const dx = o.pos.x - p.pos.x, dz = o.pos.z - p.pos.z; p.yaw = Math.atan2(-dx, -dz); p.pitch = -0.05; });
  await host.waitForTimeout(1500);
  await host.screenshot({ path: out + '/mp_host.png' }); await cl.screenshot({ path: out + '/mp_client.png' });
  // host throws something at the client => bonk
  await cl.evaluate(() => { game.player.mouse[0] = false; }); 
  await host.evaluate(() => { const o = game.sim.players.get(1); game.sim.spawn('tomato', [o.pos.x + 1.0, 1.4, o.pos.z + 1.1], null, { v: [-6, 0.5, -6.6] }); }); await host.waitForTimeout(1200);
  logs.push('[mp] client dizzy ' + JSON.stringify(await cl.evaluate(() => +game.player.dizzy.toFixed(2))));
  // bandwidth estimate
  const bytes = await host.evaluate(async () => { let n = 0; const orig = game.net.broadcast.bind(game.net); game.net.broadcast = (m, r) => { n += typeof m === 'string' ? m.length : m.byteLength || JSON.stringify(m).length; orig(m, r); }; await new Promise(r => setTimeout(r, 3000)); return n / 3; });
  logs.push('[mp] host->client bytes/s (idle kitchen) ' + Math.round(bytes));
}
fs.writeFileSync(out + '/mp_log.txt', logs.join('\n')); console.log(logs.join('\n')); await browser.close();
