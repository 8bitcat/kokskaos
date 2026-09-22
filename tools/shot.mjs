// headless smoke test + screenshots:  node tools/shot.mjs <outdir> [script.mjs]
// env: PW_DIR (folder with node_modules/playwright), EXTRA (extra URL params, e.g. "&rest=dump&cheat=1"), LANGUAGE_UI
import { createRequire } from 'node:module'; import fs from 'node:fs'; import path from 'node:path'; import { pathToFileURL } from 'node:url';
const require = createRequire(process.env.PW_DIR + '/');
const { chromium } = require('playwright');
const out = process.argv[2] || '.', scriptFile = process.argv[3];
const exe = process.env.CHROME || 'C:/Users/palss/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe';
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const logs = []; page.on('console', m => logs.push(`[${m.type()}] ${m.text()}`)); page.on('pageerror', e => logs.push('[pageerror] ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
if (process.env.SHIM) await page.route('**/js/avatars.js', async (route) => {       // temporary: tolerate a half-finished avatars.js
  const r = await route.fetch(); let t = await r.text();
  if (!/export const EMOTES/.test(t)) t += String.fromCharCode(10) + 'export const EMOTES = [];' + String.fromCharCode(10);
  await route.fulfill({ response: r, body: t });
});
await page.goto((process.env.URL || 'http://localhost:8123/') + '?test=solo&lang=' + (process.env.LANGUAGE_UI || 'sv') + (process.env.EXTRA || ''), { waitUntil: 'load' });
try { await page.waitForFunction(() => window.game && window.game.player && window.game.last, null, { timeout: 60000 }); } catch (e) { logs.push('[timeout] game did not start'); }
await page.waitForTimeout(1500);
if (scriptFile) { const mod = await import(pathToFileURL(path.resolve(scriptFile)).href); await mod.default(page, out, logs); }
else await page.screenshot({ path: path.join(out, 'start.png') });
fs.writeFileSync(path.join(out, 'log.txt'), logs.join('\n'));
console.log(logs.slice(0, 40).join('\n')); await browser.close();
