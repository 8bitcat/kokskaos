// Kökskaos — career UI outside the kitchen: chef level, restaurant select, renovation/upgrade shop and the wardrobe
// (hats, outfits, aprons, faces, emotes) with a live 3D preview of your chef. Pure DOM + one small WebGL preview.
import * as THREE from '../vendor/three.module.js';
import { makeChef, COSMETICS, DEFAULT_LOOK, EMOTES, CHEF_COLORS } from './avatars.js';
import { RESTAURANTS, REST_BY_ID } from './restaurants.js';
import { ACHIEVEMENTS, MAX_LEVEL } from './profile.js';
import { menuFor, RECIPES } from './orders.js';
import { audio } from './audio.js';

const $ = (id) => document.getElementById(id);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const CATS = [['hats', '🎩', 'Hattar', 'Hats', 'hat'], ['outfits', '👕', 'Kläder', 'Outfits', 'outfit'], ['aprons', '🎽', 'Förkläden', 'Aprons', 'apron'], ['faces', '🥸', 'Ansikte', 'Face', 'face'], ['emotes', '🕺', 'Emotes', 'Emotes', null]];

export class Meta {
  constructor(profile, lang, cb) {
    this.p = profile; this.lang = lang; this.cb = cb; this.li = lang === 'en' ? 1 : 0; this.tab = 'hats'; this.try = null; this.color = cb.getColor();
    if (!profile.d.look) profile.d.look = { ...DEFAULT_LOOK };
    for (const k in DEFAULT_LOOK) if (!this.item(k + 's', profile.d.look[k])) profile.d.look[k] = DEFAULT_LOOK[k];
  }
  L(sv, en) { return this.li ? en : sv; }
  item(cat, id) { const list = cat === 'emotes' ? EMOTES : COSMETICS[cat]; return list && list.find(i => i.id === id); }
  get look() { return this.p.d.look; }
  ownedEmotes() { return EMOTES.filter(e => this.p.owns('emotes', e)); }

  // ------------------------------------------------------------------ career panel in the main menu
  renderCareer() {
    const p = this.p, box = $('career'), L = this.L.bind(this), lvl = p.level;
    box.innerHTML = '';
    const head = el('div', 'lvlrow', `<div class="lvl">${lvl}</div><div class="lvlinfo"><b>${L('Kocknivå', 'Chef level')} ${lvl}${lvl >= MAX_LEVEL ? ' · MAX' : ''}</b><div class="xpbar"><i style="width:${(p.levelProgress * 100).toFixed(1)}%"></i></div></div><div class="wallet">💰 <b>${p.coins}</b> kr</div>`);
    box.appendChild(head);
    const cards = el('div', 'rests');
    for (const r of RESTAURANTS) {
      const un = p.restUnlocked(r), rs = p.rest(r.id), need = r.unlock ? `${p.rest(r.unlock.rest).stars}/${r.unlock.stars} ★ ${L('i', 'in')} ${REST_BY_ID[r.unlock.rest].n[this.li]}` : '';
      const nUp = r.upgrades.filter(u => rs.up[u.id]).length;
      const c = el('button', 'rest' + (p.d.sel === r.id ? ' on' : '') + (un ? '' : ' locked'),
        `<span class="ri">${un ? r.icon : '🔒'}</span><b>${r.n[this.li]}</b><small>${un ? `★ ${rs.stars} · ${L('dag', 'day')} ${rs.days + 1} · 🔧 ${nUp}/${r.upgrades.length}` : need}</small>`);
      c.title = r.d[this.li];
      c.onclick = () => { if (!un) { audio.play('fail', null, 0.5); return; } p.select(r.id); audio.play('click', null, 0.8); this.renderCareer(); };
      cards.appendChild(c);
    }
    box.appendChild(cards);
    const sel = REST_BY_ID[p.d.sel], menu = menuFor(sel.tier, lvl), next = RECIPES.filter(r => r.tier <= sel.tier && r.lvl > lvl).sort((a, b) => a.lvl - b.lvl)[0];
    box.appendChild(el('p', 'restd', `${sel.d[this.li]}<br><span class="menuline">${L('Meny', 'Menu')}: ${menu.map(r => r.icon).join(' ')}${next ? ` <i>· ${L('nästa rätt på nivå', 'next dish at level')} ${next.lvl}: ${next.icon}</i>` : ''}</span>`));
    const row = el('div', 'row2');
    const b1 = el('button', 'btn small', `🔧 ${L('Renovera & uppgradera', 'Renovate & upgrade')}`); b1.onclick = () => this.openShop();
    const b2 = el('button', 'btn small', `🎩 ${L('Garderob', 'Wardrobe')}`); b2.onclick = () => this.openWardrobe();
    row.append(b1, b2); box.appendChild(row);
  }

  // ------------------------------------------------------------------ renovation / upgrade shop for the selected restaurant
  openShop() {
    const p = this.p, r = REST_BY_ID[p.d.sel], rs = p.rest(r.id), L = this.L.bind(this), dlg = $('dialog');
    const draw = () => {
      dlg.innerHTML = `<div class="panel wide"><h2>🔧 ${r.n[this.li]}</h2><p>${L('Köp renoveringar och bättre utrustning. Gäller nästa gång köket öppnas.', 'Buy renovations and better equipment. Applies the next time the kitchen opens.')} <b class="wallet">💰 ${p.coins} kr</b></p><div class="ups"></div><button class="btn ghost" id="dlgclose">${L('Stäng', 'Close')}</button></div>`;
      const ups = dlg.querySelector('.ups');
      for (const u of r.upgrades) {
        const own = !!rs.up[u.id], can = p.coins >= u.price;
        const c = el('button', 'up' + (own ? ' own' : can ? '' : ' poor'), `<span class="ri">${u.icon}</span><div><b>${u.n[this.li]}</b><small>${u.d[this.li]}</small></div><em>${own ? '✔' : u.price + ' kr'}</em>`);
        c.onclick = () => { if (own) return; if (p.buyUpgrade(r.id, u)) { audio.play('coin', null, 0.9); draw(); this.renderCareer(); } else audio.play('fail', null, 0.5); };
        ups.appendChild(c);
      }
      $('dlgclose').onclick = () => { dlg.style.display = 'none'; };
    };
    draw(); dlg.style.display = 'flex';
  }

  // ------------------------------------------------------------------ wardrobe with live preview
  openWardrobe() {
    const dlg = $('dialog'), L = this.L.bind(this);
    dlg.innerHTML = `<div class="panel wardrobe"><div class="wl"><canvas id="prev" width="340" height="440"></canvas><div class="wallet big">💰 <b id="wcoins"></b> kr</div></div><div class="wr"><h2>🎩 ${L('Garderob', 'Wardrobe')}</h2><div class="tabs" id="wtabs"></div><div class="grid" id="wgrid"></div><div class="wfoot"><span id="winfo"></span><button class="btn small" id="wbuy" style="display:none"></button><button class="btn ghost small" id="dlgclose">${L('Klar', 'Done')}</button></div></div></div>`;
    dlg.style.display = 'flex';
    this.try = null; this.startPreview();
    const tabs = $('wtabs');
    for (const [cat, icon, sv, en] of [...CATS, ['color', '🎨', 'Färg', 'Colour']]) { const b = el('button', 'tab' + (this.tab === cat ? ' on' : ''), `${icon} ${this.li ? en : sv}`); b.onclick = () => { this.tab = cat; this.try = null; this.applyPreview(); [...tabs.children].forEach(x => x.classList.remove('on')); b.classList.add('on'); this.drawGrid(); }; tabs.appendChild(b); }
    $('dlgclose').onclick = () => { this.stopPreview(); dlg.style.display = 'none'; this.p.save(); this.cb.onLook(this.look, this.color); };
    this.drawGrid();
  }
  drawGrid() {
    const grid = $('wgrid'), p = this.p, L = this.L.bind(this), cat = this.tab; grid.innerHTML = ''; $('wcoins').textContent = p.coins; $('wbuy').style.display = 'none'; $('winfo').textContent = '';
    if (cat === 'color') {
      for (const c of CHEF_COLORS) { const b = el('button', 'sw big' + (c === this.color ? ' on' : '')); b.style.background = '#' + c.toString(16).padStart(6, '0'); b.onclick = () => { this.color = c; this.cb.setColor(c); this.prevChef?.setColor(c); this.drawGrid(); }; grid.appendChild(b); }
      return;
    }
    const list = cat === 'emotes' ? EMOTES : COSMETICS[cat], slot = CATS.find(c => c[0] === cat)[4];
    list.forEach((it, idx) => {
      const own = p.owns(cat, it), un = p.unlocked(it), equipped = slot && this.look[slot] === it.id;
      let tag = own ? (equipped ? '✔' : cat === 'emotes' ? `⌨ ${this.ownedEmotes().indexOf(it) < 10 ? (this.ownedEmotes().indexOf(it) + 1) % 10 : '–'}` : '') : !un ? (it.ach ? '🏆' : `🔒 ${L('nivå', 'lvl')} ${it.lvl}`) : `${it.price} kr`;
      const c = el('button', 'item' + (equipped ? ' on' : '') + (own ? '' : un ? ' buyable' : ' locked') + (this.try === it.id ? ' try' : ''), `${it.icon ? `<span class="ri">${it.icon}</span>` : ''}<b>${it.n[this.li]}</b><small>${tag}</small>`);
      c.onclick = () => {
        audio.play('click', null, 0.6);
        if (own && slot) { this.look[slot] = it.id; this.try = null; } else this.try = it.id;
        this.applyPreview(); this.drawGrid();
        if (!own) {
          const a = it.ach && ACHIEVEMENTS.find(x => x.id === it.ach);
          $('winfo').textContent = !un ? (a ? `🏆 ${a.d[this.li]} (${Math.min(p.stat(a.stat), a.goal)}/${a.goal})` : `${L('Låses upp på kocknivå', 'Unlocks at chef level')} ${it.lvl}`) : `${it.n[this.li]} — ${it.price} kr`;
          if (un) { const b = $('wbuy'); b.style.display = ''; b.textContent = `${L('Köp', 'Buy')} · ${it.price} kr`; b.className = 'btn small' + (p.coins >= it.price ? '' : ' disabled'); b.onclick = () => { if (p.buy(cat, it)) { audio.play('coin', null, 0.9); if (slot) this.look[slot] = it.id; this.try = null; this.applyPreview(); this.drawGrid(); this.renderCareer(); } else audio.play('fail', null, 0.5); }; }
        }
      };
      grid.appendChild(c);
    });
  }
  applyPreview() {
    if (!this.prevChef) return;
    const look = { ...this.look }, slot = (CATS.find(c => c[0] === this.tab) || [])[4];
    if (this.try && slot) look[slot] = this.try;
    this.prevChef.setLook(look);
    this.prevEmote = this.tab === 'emotes' ? this.try : null; this.prevEmoteT = 0;
  }
  startPreview() {
    const cv = $('prev'); if (!cv) return;
    const r = this.prevR = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true }); r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); r.outputColorSpace = THREE.SRGBColorSpace;
    const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(32, cv.width / cv.height, 0.1, 30); cam.position.set(0, 1.45, 5.4); cam.lookAt(0, 1.25, 0);
    scene.add(new THREE.HemisphereLight(0xfffaf0, 0xc9b79c, 1.7)); const sun = new THREE.DirectionalLight(0xfff1d8, 2.0); sun.position.set(3, 6, 5); scene.add(sun);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(1.1, 40), new THREE.MeshBasicMaterial({ color: 0xe9c98a })); floor.rotation.x = -Math.PI / 2; scene.add(floor);
    const chef = this.prevChef = makeChef({ color: this.color, name: this.cb.getName(), look: this.look }); chef.group.rotation.y = Math.PI; scene.add(chef.group);
    let last = performance.now(), t = 0; this.prevEmote = null; this.prevEmoteT = 0;
    const tick = () => {
      if (!this.prevR) return;
      const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
      chef.group.rotation.y = Math.PI + Math.sin(t * 0.6) * (this.prevEmote ? 0.15 : 0.7);
      let em = this.prevEmote; if (em) { this.prevEmoteT += dt; const d = EMOTES.find(e => e.id === em); if (d && !d.loop && this.prevEmoteT > d.dur + 0.8) { this.prevEmoteT = 0; em = null; chef.update(dt, { speed: 0, grounded: true, emote: null }); } }
      chef.update(dt, { speed: 0, grounded: true, emote: em || null });
      r.render(scene, cam); requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  stopPreview() { if (this.prevR) { this.prevChef.dispose(); this.prevR.dispose(); this.prevR.forceContextLoss?.(); this.prevR = null; this.prevChef = null; } }

  // ------------------------------------------------------------------ after a service: what did we earn?
  resultHtml(res) {
    const L = this.L.bind(this), p = this.p; let h = `<div class="gain">+${res.xp} XP · 💰 +${res.coins} kr</div>`;
    if (res.level > res.levelBefore) h += `<div class="lvlup">⬆ ${L('Kocknivå', 'Chef level')} ${res.level}!</div>`;
    if (res.newRecipes.length) h += `<div class="newr">${L('Nya rätter', 'New dishes')}: ${res.newRecipes.map(r => `${r.icon} ${r.n[this.li]}`).join(' · ')}</div>`;
    for (const r of res.newRest) h += `<div class="lvlup">🔓 ${L('Ny restaurang', 'New restaurant')}: ${r.icon} ${r.n[this.li]}!</div>`;
    for (const a of res.newAch) h += `<div class="newr">🏆 ${a.n[this.li]} — ${a.d[this.li]}</div>`;
    const nextR = RESTAURANTS.find(r => r.unlock && r.unlock.rest === res.restId && !p.restUnlocked(r));
    if (nextR) h += `<div class="th3">${L('Stjärnor här', 'Stars here')}: ${res.restStars}/${nextR.unlock.stars} → ${nextR.icon} ${nextR.n[this.li]}</div>`;
    return h;
  }
}
