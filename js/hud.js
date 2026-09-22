// Kökskaos — DOM HUD: order tickets, till + timer, crosshair + item tooltip, toasts, recipe book, results, pause menu
import { STR } from './i18n.js';
import { RECIPES, RECIPE_BY_ID, describeReq } from './orders.js';
import { ITEMS, itemName, doneness } from './items.js';
import { buildBook } from './cookbook.js';

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
  // the chef's notebook: intro + technique pages + one spread per dish on today's menu (+ teasers for locked dishes)
  setMenu(ids, rest, level, K) {
    this.nb = buildBook(this.lang, ids, rest.tier, level, K); this.page = 0; this.bookOpen = false; this.rest = rest;
    const b = $('book');
    b.innerHTML = `<div class="nb"><div class="pg left" id="pgL"></div><div class="pg right" id="pgR"></div><button class="flip prev" id="bprev">◀</button><button class="flip next" id="bnext">▶</button><div class="pgno" id="pgno"></div><button class="flip close" id="bclose">✕</button></div>`;
    $('bprev').onclick = () => this.flip(-1); $('bnext').onclick = () => this.flip(1); $('bclose').onclick = () => this.book_(false);
    this.renderPage();
  }
  flip(d) { if (!this.nb) return; const n = this.nb.pages.length; this.page = (this.page + d + n) % n; this.renderPage(); }
  renderPage() {
    if (!this.nb) return;
    const pg = this.nb.pages[this.page], L = this.nb.labels, li = this.lang === 'en' ? 1 : 0, esc2 = esc;
    const photo = (src, cls = '') => `<div class="photo ${cls}"><img src="${src}" alt="" onerror="this.parentElement.style.display='none'"></div>`;
    let left = '', right = '';
    if (pg.kind === 'intro') {
      left = `<h1 class="hand">${esc2(pg.title)}</h1><p class="hand big">${esc2(pg.text)}</p><p class="hl">${esc2(pg.doneness)}</p><p class="small">${esc2(pg.flip)}</p>`;
      right = `<h2 class="hand">${esc2(L.tips)}</h2><div class="stickies">${pg.tips.map((t, i) => `<div class="sticky c${i % 4}" style="transform:rotate(${((i * 7) % 9) - 4}deg)">${esc2(t)}</div>`).join('')}</div>`;
    } else if (pg.kind === 'tech') {
      left = `<h1 class="hand">${esc2(pg.title)}</h1>${photo(pg.photo, 'tape')}`;
      right = `<ul class="hand lines">${pg.lines.map(l => `<li>${esc2(l)}</li>`).join('')}</ul>`;
    } else if (pg.kind === 'recipe') {
      left = `<h1 class="hand">${pg.icon} ${esc2(pg.title)} <small>${pg.price} ${L.price}</small></h1>${photo(pg.photo, 'tape')}${pg.note ? `<p class="note hand">${esc2(pg.note)}</p>` : ''}<h3 class="hand">${esc2(L.ingredients)}</h3><ul class="ing">${pg.ingredients.map(x => `<li>${esc2(x)}</li>`).join('')}</ul>`;
      right = `<h3 class="hand">${esc2(L.steps)}</h3><ol class="steps">${pg.steps.map(s => `<li>${esc2(s)}</li>`).join('')}</ol><p class="hl small">${esc2(pg.doneness)}</p>`;
    } else if (pg.kind === 'locked') {
      left = `<h1 class="hand">${pg.icon} ${esc2(pg.title)}</h1>${photo(pg.photo, 'tape grey')}`;
      right = `<p class="hand big">🔒 ${esc2(pg.text)}</p>`;
    }
    $('pgL').innerHTML = left; $('pgR').innerHTML = right; $('pgno').textContent = `${this.page + 1} / ${this.nb.pages.length}`;
    $('pgL').scrollTop = 0; $('pgR').scrollTop = 0;
  }
  book_(on) { this.bookOpen = on; $('book').style.display = on ? 'flex' : 'none'; if (on) this.renderPage(); }
  book(on) { this.book_(on); }
  setEmotes(list) { $('emotes').innerHTML = list.map((e, i) => `<span><kbd>${(i + 1) % 10}</kbd>${e.icon}</span>`).join(''); }
  setGain(html) { const g = $('gain'); if (g) g.innerHTML = html; }
  show(on) { $('hud').style.display = on ? 'block' : 'none'; }
  setLocked(locked, paused) { $('lockmsg').style.display = locked || paused ? 'none' : 'flex'; $('cross').style.display = locked ? 'block' : 'none'; }
  toggleHelp() { this.helpOn = !this.helpOn; $('help').style.display = this.helpOn ? 'block' : 'none'; }
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
