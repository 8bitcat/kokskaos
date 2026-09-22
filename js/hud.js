// Kökskaos — DOM HUD: order tickets, till + timer, crosshair + item tooltip, toasts, recipe book, results, pause menu
import { STR } from './i18n.js';
import { RECIPES, RECIPE_BY_ID, describeReq } from './orders.js';
import { ITEMS, itemName, doneness } from './items.js';

const $ = (id) => document.getElementById(id);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export class Hud {
  constructor(lang) { this.lang = lang; this.S = STR[lang]; this.ticketEls = new Map(); this.helpOn = true; this.buildStatic(); }
  buildStatic() {
    const S = this.S;
    $('help').innerHTML = '<h3>' + (this.lang === 'en' ? 'Controls' : 'Kontroller') + '</h3>' + S.controls.map(([k, v]) => `<div><kbd>${k}</kbd><span>${v}</span></div>`).join('');
    $('lockmsg').textContent = S.clickToPlay;
  }
  // recipe book: today's menu + the dishes that unlock next in this restaurant
  setMenu(ids, rest, level) {
    const S = this.S, li = this.lang === 'en' ? 1 : 0, have = new Set(ids);
    const menu = RECIPES.filter(r => have.has(r.id)), next = RECIPES.filter(r => !have.has(r.id) && r.tier <= rest.tier).sort((a, b) => a.lvl - b.lvl).slice(0, 6);
    const card = (r, locked) => `<div class="card${locked ? ' locked' : ''}"><div class="ico">${r.icon}</div><b>${r.n[li]}</b>${locked ? `<p>🔒 ${li ? 'chef level' : 'kocknivå'} ${r.lvl}</p>` : `<ul>${r.req.map(q => `<li>${describeReq(q, this.lang)}</li>`).join('')}</ul><i>${r.price} kr</i>`}</div>`;
    $('book').innerHTML = `<h2>${rest.icon} ${rest.n[li]} — ${S.recipes} <small>(${li ? 'chef level' : 'kocknivå'} ${level})</small></h2><div class="howto">${S.howto.map(h => `<p>• ${h}</p>`).join('')}</div><div class="cards">${menu.map(r => card(r)).join('')}${next.map(r => card(r, true)).join('')}</div>`;
  }
  setEmotes(list) { $('emotes').innerHTML = list.map((e, i) => `<span><kbd>${(i + 1) % 10}</kbd>${e.icon}</span>`).join(''); }
  setGain(html) { const g = $('gain'); if (g) g.innerHTML = html; }
  show(on) { $('hud').style.display = on ? 'block' : 'none'; }
  setLocked(locked, paused) { $('lockmsg').style.display = locked || paused ? 'none' : 'flex'; $('cross').style.display = locked ? 'block' : 'none'; }
  toggleHelp() { this.helpOn = !this.helpOn; $('help').style.display = this.helpOn ? 'block' : 'none'; }
  book(on) { $('book').style.display = on ? 'block' : 'none'; }
  setRoom(code, n, online) { $('room').innerHTML = online ? `${this.S.kitchenCode}: <b>${code}</b> · ${n} ${this.S.chefs}` : `<span class="off">${this.S.solo}</span>`; }

  setService(svc) {
    const S = this.S, li = this.lang === 'en' ? 1 : 0;
    $('coins').textContent = svc.coins + ' kr';
    $('timer').textContent = svc.run ? `${Math.floor(svc.time / 60)}:${String(svc.time % 60).padStart(2, '0')}` : '–:––';
    $('timer').classList.toggle('low', svc.run && svc.time < 45);
    $('freeplay').style.display = svc.run || svc.result ? 'none' : 'block'; $('freeplay').textContent = S.freeplay;
    const box = $('tickets'), seen = new Set();
    for (const o of svc.orders) {
      seen.add(o.id); let t = this.ticketEls.get(o.id); const rec = RECIPE_BY_ID[o.r];
      if (!t) {
        t = el('div', 'ticket', `<div class="th"><span class="ico">${rec.icon}</span><span class="nm">${rec.n[li]}</span></div><ul>${rec.req.map(q => `<li>${describeReq(q, this.lang)}</li>`).join('')}</ul><div class="meta">#${o.id} · ${S.table} ${o.table + 1}</div><div class="bar"><i></i></div>`);
        box.appendChild(t); this.ticketEls.set(o.id, t);
      }
      const f = Math.max(0, o.t / o.T); const bar = t.querySelector('.bar i'); bar.style.width = (f * 100).toFixed(1) + '%'; bar.style.background = f > 0.5 ? '#3fbf5f' : f > 0.25 ? '#f2b632' : '#e5483d';
      t.classList.toggle('plated', o.st !== 'open'); t.classList.toggle('urgent', o.st === 'open' && f < 0.2);
    }
    for (const [id, t] of this.ticketEls) if (!seen.has(id)) { t.classList.add('out'); this.ticketEls.delete(id); setTimeout(() => t.remove(), 400); }
    const r = svc.result, res = $('result');
    if (r) {
      if (res.dataset.k !== 'n' + r.n) {
        res.dataset.k = 'n' + r.n;
        res.innerHTML = `<h2>${S.resultTitle}</h2><div class="stars">${[0, 1, 2].map(i => `<span class="${i < r.stars ? 'on' : ''}">★</span>`).join('')}</div><div class="big">${r.coins} kr</div><p>${S.served}: <b>${r.served}</b> · ${S.failed}: <b>${r.failed}</b> · ${S.best}: <b>${svc.best} kr</b></p><p class="th3">★ ${r.th[0]} · ★★ ${r.th[1]} · ★★★ ${r.th[2]}</p><div id="gain"></div>`;
      }
      res.style.display = 'block';
    } else { res.style.display = 'none'; res.dataset.k = ''; }
  }
  toast(kind, a, b) {
    const S = this.S, li = this.lang === 'en' ? 1 : 0, rec = a && RECIPE_BY_ID[a];
    let text = '', cls = '';
    if (kind === 'start') text = '🔔 ' + S.t_start; else if (kind === 'order') text = `🧾 ${S.t_order}: ${rec.icon} ${rec.n[li]}`;
    else if (kind === 'served') { text = `✅ ${S.t_served}: ${rec.icon} ${rec.n[li]}  +${b} kr`; cls = 'good'; }
    else if (kind === 'timeout') { text = `😠 ${S.t_timeout}: ${rec.icon} ${rec.n[li]}  −30 kr`; cls = 'bad'; }
    else if (kind === 'hitwaiter') { text = `🤕 ${S.t_hitwaiter}  −5 kr`; cls = 'bad'; }
    else if (kind === 'text') text = esc(a);
    const t = el('div', 'toast ' + cls, text); $('toasts').appendChild(t);
    setTimeout(() => t.classList.add('out'), 3600); setTimeout(() => t.remove(), 4200);
  }
  // crosshair + tooltip for what the chef is looking at
  setAim(pick, holding, charge) {
    const cross = $('cross'), tip = $('tip');
    cross.classList.toggle('can', !!pick && !holding); cross.classList.toggle('hold', !!holding);
    if (!pick) { tip.style.display = 'none'; } else {
      const it = pick.item, S = this.S, li = this.lang === 'en' ? 1 : 0; let html = '';
      if (it.fixture) html = `<b>${esc(it.fixture.n ? it.fixture.n[li] : '')}</b>`;
      else {
        html = `<b>${esc(itemName(it.def, this.lang, it.cookA, it.cookB))}</b>`;
        const d = doneness(it.def, it.cookA, it.cookB);
        if (d >= 0) html += ` <span class="d${d}">${S.done[d]}</span>`;
        if (it.def.cook && it.def.cook.sides === 2 && d > 0 && d < 4) html += ` <small>${Math.round(Math.min(1.5, it.cookA) * 100)}% / ${Math.round(Math.min(1.5, it.cookB) * 100)}%</small>`;
        if (it.def.container) { if (it.water > 0.03) html += ` <span class="w">${S.water} ${Math.round(it.water * 100)}%${it.boiling ? ' · ' + S.boiling : ''}</span>`; if (it.heat > 0.3) html += ` <span class="d3">${S.hot}</span>`; }
      }
      tip.innerHTML = html; tip.style.display = 'block';
    }
    const c = $('charge'); if (charge >= 0) { c.style.display = 'block'; c.firstElementChild.style.width = Math.min(100, charge * 100) + '%'; } else c.style.display = 'none';
  }
  setWrist(on, p, r) { const w = $('wrist'); w.style.display = on ? 'block' : 'none'; if (on) w.firstElementChild.style.transform = `rotate(${(-r * 57.3).toFixed(0)}deg) scaleY(${Math.cos(p).toFixed(2)})`; }
  setFps(t) { $('fps').textContent = t; }
}
