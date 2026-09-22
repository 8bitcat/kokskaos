// screenshots of the main menu, shop and wardrobe
import { createRequire } from 'node:module';
const require = createRequire(process.env.PW_DIR + '/'); const { chromium } = require('playwright');
const out = process.argv[2], exe = 'C:/Users/palss/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe';
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
const logs = []; page.on('console', m => { if (!/AudioContext|flatShading/.test(m.text())) logs.push(`[${m.type()}] ${m.text()}`); }); page.on('pageerror', e => logs.push('[pageerror] ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
if (process.env.SHIM) await page.route('**/js/avatars.js', async (route) => { const r = await route.fetch(); let t = await r.text(); if (!/export const EMOTES/.test(t)) t += String.fromCharCode(10) + 'export const EMOTES = [];'; await route.fulfill({ response: r, body: t }); });
await page.goto('http://localhost:8123/?lang=' + (process.env.LANGUAGE_UI || 'sv') + (process.env.EXTRA || ''), { waitUntil: 'load' });
await page.waitForSelector('#career .rest', { timeout: 30000 }); await page.waitForTimeout(1500);
await page.screenshot({ path: out + '/m1_menu.png' });
await page.click('#career .btn.small >> nth=0'); await page.waitForTimeout(500); await page.screenshot({ path: out + '/m2_shop.png' });
await page.click('#dlgclose'); await page.click('#career .btn.small >> nth=1'); await page.waitForTimeout(2500); await page.screenshot({ path: out + '/m3_wardrobe.png' });
const steps = JSON.parse(process.env.CLICKS || '[]');
for (const [i, sel] of steps.entries()) { await page.click(sel); await page.waitForTimeout(1800); await page.screenshot({ path: `${out}/m4_${i}.png` }); }
console.log(logs.join('\n')); await browser.close();
