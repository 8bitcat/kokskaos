// Kökskaos — boot, menu, career, and the game loop that glues simulation (host), networking, view and HUD together.
import RAPIER from '../vendor/rapier.es.js';
import * as THREE from '../vendor/three.module.js';
import { PHYS_DT, GRAVITY, SNAP_HZ, INPUT_HZ, VERSION } from './config.js';
import { STR } from './i18n.js';
import { buildKitchen } from './kitchen.js';
import { Sim } from './sim.js';
import { Service, menuFor } from './orders.js';
import { View, CHEF_COLORS } from './view.js';
import { LocalPlayer } from './player.js';
import { Net, makeCode, encodeInput, decodeInput, encodeSnapshot, decodeSnapshot } from './net.js';
import { Hud } from './hud.js';
import { audio } from './audio.js';
import { Profile } from './profile.js';
import { Meta } from './meta.js';
import { REST_BY_ID } from './restaurants.js';
import { EMOTES } from './avatars.js';
import { setText, getText } from './cookbook.js';
import { addPosters } from './kitchen.js';

const $ = (id) => document.getElementById(id);
const store = { get: (k, d) => { try { return localStorage.getItem('kokskaos.' + k) ?? d; } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem('kokskaos.' + k, v); } catch (e) { /* private mode */ } } };
const params = new URLSearchParams(location.search);
let lang = params.get('lang') || store.get('lang', (navigator.language || 'sv').toLowerCase().startsWith('sv') ? 'sv' : 'en'); if (!STR[lang]) lang = 'sv';
const S = STR[lang];

class Game {
  constructor(profile, meta) {
    this.profile = profile; this.meta = meta; this.net = new Net(); this.hud = new Hud(lang); this.isHost = true; this.localId = 0; this.roster = new Map(); this.ready = new Set();
    this.ev = this.newEv(); this.snapN = 0; this.svcState = null; this.frames = 0; this.fpsT = 0; this.lastResN = 0; this.emote = null; this.emoteT = 0; this.camBlend = 0;
  }
  newEv() { return { s: [], d: [], st: [], fx: [], sfx: [], x: [] }; }
  myInfo() { return { name: this.name, color: this.color, look: { ...this.profile.d.look } }; }

  // world + kitchen for a restaurant (host decides which one; clients get it in the welcome)
  setupWorld(restId, up) {
    const R = this.R = RAPIER; this.rest = REST_BY_ID[restId] || REST_BY_ID.dump; this.up = up || {};
    this.world = new R.World({ x: 0, y: GRAVITY, z: 0 }); this.world.timestep = PHYS_DT;
    this.view = new View($('game'), lang);
    if (this.isHost) {
      this.sim = new Sim(R, this.world, {
        spawn: (e) => { this.view.spawn(e.id, e.kind, [e.pos.x, e.pos.y, e.pos.z], [e.rot.x, e.rot.y, e.rot.z, e.rot.w], this.sim.itemState(e)); this.ev.s.push(this.spawnMsg(e)); },
        despawn: (id) => { this.view.despawn(id); this.ev.d.push(id); },
        sfx: (n, p, v, pi) => { this.playSfx(n, p, v, pi); this.ev.sfx.push([n, p.map(x => +x.toFixed(2)), +v.toFixed(2), +pi.toFixed(2)]); },
        fx: (t, p, d) => { this.view.fx.emit(t, p, d); this.ev.fx.push([t, p.map(x => +x.toFixed(2)), d]); },
        bonk: (pid, dx, dz, pw) => { const vp = this.view.players.get(pid); if (vp) vp.dizzy = 1; this.ev.x.push({ t: 'dz', id: pid }); if (pid === this.localId) this.onBonk(dx, dz, pw); else this.net.sendTo(pid, { t: 'bonk', dx, dz, pw }); },
      });
    }
    this.K = buildKitchen({ R, world: this.world, scene: this.view.scene, sim: this.sim, view: this.view, lang, rest: this.rest, up: this.up });
    this.view.setKitchen(this.K);
  }

  async start(mode, code, name, color) {
    this.name = name; this.color = color; this.isHost = mode !== 'join';
    if (this.isHost) {
      const p = this.profile, rest = REST_BY_ID[p.d.sel];
      this.setupWorld(rest.id, { ...p.rest(rest.id).up });
      this.sim.populate(this.K);
      const up = this.up; Object.assign(this.sim.mods, { heat: up.burners ? 1.5 : 1, oven: up.oven ? 1.4 : 1, fry: up.fryer ? 1.35 : 1 });
      this.service = new Service(this.sim, this.K, {
        sfx: (n) => { audio.play(n, null, 0.9); this.ev.sfx.push([n, null, 0.9, 1]); },
        toast: (k, a, b) => { this.hud.toast(k, a, b); this.ev.x.push({ t: 'toast', k, a, b }); },
        carry: (c) => { this.view.carry(c); this.ev.x.push({ t: 'carry', c }); },
        delivered: (d) => { this.view.delivered(d); this.ev.x.push({ t: 'deliv', d: { w: d.w, table: d.table, carry: d.carry, pay: d.pay } }); },
        mood: (table, m) => { this.view.mood(table, m); this.ev.x.push({ t: 'mood', table, m }); },
      });
      this.level = p.level; this.menu = menuFor(rest.tier, this.level);
      this.service.menu = this.menu; this.service.best = p.rest(rest.id).best; this.service.day = p.rest(rest.id).days + 1;
      Object.assign(this.service.mods, rest.mods, { patience: rest.mods.patience * (up.bread ? 1.2 : 1), pay: rest.mods.pay * (up.tipjar ? 1.15 : 1), interval: rest.mods.interval * Math.max(0.72, 1 - 0.015 * (this.level - 1)), maxOpen: Math.floor(this.level / 6) });
      for (let i = 0; i < 90; i++) this.sim.step();          // let the pantry settle before anyone looks
      this.view.setApp(this.sim.appState());
      this.localId = 0;
      const sp = this.K.spawns[4];
      this.sim.addPlayer(0, { name, color, pos: sp });
      this.roster.set(0, { id: 0, ...this.myInfo() });
      this.player = new LocalPlayer(RAPIER, this.world, $('game'), sp);
      this.wireHost();
      if (mode === 'host') {
        $('status').textContent = S.hosting;
        let ok = await this.net.host(code);
        if (!ok && this.codeTaken) { code = makeCode(); this.net = new Net(); this.wireHost(); ok = await this.net.host(code); }
        if (!ok) this.hud.toast('text', S.offline);
      }
      this.code = code;
    } else {
      this.wireClient();
      this.net.send({ t: 'hello', ...this.myInfo(), v: VERSION });
      await new Promise((res, rej) => { this.onWelcome = res; setTimeout(() => rej(new Error('timeout')), 15000); });
      this.player = new LocalPlayer(RAPIER, this.world, $('game'), this.spawnPos);
      this.code = code;
    }
    this.hud.setMenu(this.menu.map(r => r.id), this.rest, this.level, this.K);
    addPosters(this.K, this.view.scene, this.menu, lang, getText().TIPS);
    this.view.setLocal(this.localId, color);
    for (const p of this.roster.values()) this.view.upsertPlayer(p);
    this.player.enabled = true; this.player.yaw = 0; this.player.home = this.K.spawns[4];
    this.player.onLock = (l) => { this.hud.setLocked(l, this.paused); if (!l && !this.testMode) { if (!this.bookFromPause) this.toggleBook(false); this.setPaused(true); } };
    $('menu').style.display = 'none'; this.hud.show(true); this.hud.setLocked(false, false);
    this.hud.setEmotes(this.meta.ownedEmotes().slice(0, 10));
    this.bindKeys(); this.updateRoom();
    this.hud.toast('text', `${this.rest.icon} ${this.rest.n[lang === 'en' ? 1 : 0]}${this.isHost ? ` · ${lang === 'en' ? 'day' : 'dag'} ${this.service.day}` : ''}`);
    this.last = performance.now(); this.acc = 0; this.snapAcc = 0; this.inAcc = 0; this.aimT = 0;
    if (this.isHost) { try { const w = new Worker(URL.createObjectURL(new Blob(['setInterval(()=>postMessage(0),16)']))); w.onmessage = () => { if (document.hidden) this.hostAdvance(); }; } catch (e) { /* no worker: host pauses when hidden */ } }
    const loop = () => { this.frame(); requestAnimationFrame(loop); }; requestAnimationFrame(loop);
  }
  spawnMsg(e) { return [e.id, e.kind, +e.pos.x.toFixed(3), +e.pos.y.toFixed(3), +e.pos.z.toFixed(3), +e.rot.x.toFixed(4), +e.rot.y.toFixed(4), +e.rot.z.toFixed(4), +e.rot.w.toFixed(4), this.sim.itemState(e)]; }
  playSfx(n, p, v, pi) { audio.play(n, p ? { x: p[0], y: p[1], z: p[2] } : null, v, pi); }
  updateRoom() { this.hud.setRoom(this.code, this.roster.size, this.net.online); $('pcode').textContent = this.net.online ? this.code : '—'; }
  onBonk(dx, dz, pw) { this.player.bonk(dx, dz, pw); this.setEmote(null); for (const a of this.profile.bump('bonked')) this.hud.toast('text', `🏆 ${a.n[lang === 'en' ? 1 : 0]}`); }

  // ------------------------------------------------------------------ service state -> HUD, and career credit when a shift ends
  onSvc(svc) {
    this.svcState = svc; this.hud.setService(svc); this.view.setService(svc);
    if (svc.result && svc.result.n !== this.lastResN) {
      this.lastResN = svc.result.n;
      const res = this.profile.addService(svc.result, this.rest.id, this.rest.tier); res.coins = svc.result.coins; res.restId = this.rest.id;
      this.hud.setGain(this.meta.resultHtml(res));
      this.hud.setEmotes(this.meta.ownedEmotes().slice(0, 10));
      if (res.level > res.levelBefore) audio.play('success', null, 1, 1.2);
    }
  }
  setEmote(id) {
    if (id === this.emote) return;
    this.emote = id; this.emoteT = 0;
    const vp = this.view.players.get(this.localId); if (vp) { vp.emote = id; vp.emoteT = 0; }
    if (this.isHost) this.ev.x.push({ t: 'em', id: this.localId, e: id }); else this.net.send({ t: 'emote', e: id });
  }
  sendLook() {
    const info = { id: this.localId, ...this.myInfo() }; this.roster.set(this.localId, info); this.view.upsertPlayer(info); this.view.setLocal(this.localId, this.color);
    if (this.isHost) this.ev.x.push({ t: 'pj', p: info, quiet: 1 }); else this.net.send({ t: 'look', look: info.look, color: info.color });
  }

  // ------------------------------------------------------------------ host networking
  wireHost() {
    const net = this.net;
    net.on('codeTaken', () => { this.codeTaken = true; });
    net.on('msg', (pid, m) => {
      if (m.t === 'hello') {
        const used = new Set([...this.roster.values()].map(p => p.color));
        let color = m.color; if (used.has(color)) color = CHEF_COLORS.find(c => !used.has(c)) ?? color;
        const info = { id: pid, name: String(m.name || 'Kock').slice(0, 14), color, look: m.look && typeof m.look === 'object' ? m.look : null };
        const sp = this.K.spawns[pid % this.K.spawns.length];
        this.sim.addPlayer(pid, { ...info, pos: sp }); this.roster.set(pid, info); this.view.upsertPlayer(info);
        net.sendTo(pid, { t: 'welcome', id: pid, spawn: sp, players: [...this.roster.values()], app: this.sim.appState(), svc: this.service.state(), rest: this.rest.id, up: this.up, menu: this.menu.map(r => r.id), level: this.level });
        const items = []; for (const e of this.sim.ents.values()) { e.netMoved = true; if (!e.fixture) items.push(this.spawnMsg(e)); }
        for (let i = 0; i < items.length; i += 120) net.sendTo(pid, { t: 'items', s: items.slice(i, i + 120) });
        for (const w of this.service.waiters) if (w.carry && w.order) net.sendTo(pid, { t: 'ev', x: [{ t: 'carry', c: w.order.carry }] });
        net.sendTo(pid, { t: 'go' });
        this.ready.add(pid);
        this.ev.x.push({ t: 'pj', p: info }); this.hud.toast('text', `👨‍🍳 ${info.name} ${S.joined}`); audio.play('pop', null, 0.8); this.updateRoom();
      } else if (!this.ready.has(pid)) return;
      else if (m.t === 'throw') this.sim.throwHeld(pid, +m.power || 0);
      else if (m.t === 'level') this.sim.levelHeld(pid);
      else if (m.t === 'emote') { const e = typeof m.e === 'string' && EMOTES.some(x => x.id === m.e) ? m.e : null; const vp = this.view.players.get(pid); if (vp) { vp.emote = e; vp.emoteT = 0; } this.ev.x.push({ t: 'em', id: pid, e }); }
      else if (m.t === 'look') { const info = this.roster.get(pid); if (info && m.look && typeof m.look === 'object') { info.look = m.look; if (CHEF_COLORS.includes(m.color)) info.color = m.color; this.view.upsertPlayer(info); this.ev.x.push({ t: 'pj', p: info, quiet: 1 }); } }
    });
    net.on('bin', (pid, buf) => { if (!this.ready.has(pid) || buf.byteLength < 34) return; const i = decodeInput(buf); if ([i.x, i.y, i.z, i.yaw, i.pitch].every(Number.isFinite)) { this.sim.setInput(pid, i); const p = this.sim.players.get(pid); if (p) p.air = i.air; } });
    net.on('leave', (pid) => { const info = this.roster.get(pid); this.ready.delete(pid); this.sim.removePlayer(pid); this.roster.delete(pid); this.view.removePlayer(pid); this.ev.x.push({ t: 'pl', id: pid }); if (info) this.hud.toast('text', `👋 ${info.name} ${S.left}`); this.updateRoom(); });
  }
  hostAdvance() {
    const now = performance.now(); let dt = Math.min(0.15, (now - this.last) / 1000); this.last = now;
    this.sim.setInput(0, this.player.input()); const me = this.sim.players.get(0); if (me) me.air = !this.player.grounded;
    this.acc += dt; let n = 0;
    while (this.acc >= PHYS_DT && n < 9) { this.sim.step(); this.service.update(PHYS_DT); this.acc -= PHYS_DT; n++; }
    if (this.acc > PHYS_DT * 9) this.acc = 0;
    this.snapAcc += dt;
    if (this.snapAcc >= 1 / SNAP_HZ) { this.snapAcc = 0; this.hostSnapshot(); }
    return dt;
  }
  hostSnapshot() {
    const sim = this.sim, slow = (++this.snapN % 4) === 0, ev = this.ev;
    if (slow) {
      for (const e of sim.ents.values()) if (e.dirty && !e.fixture) { e.dirty = false; const st = sim.itemState(e); this.view.setItemState(st); ev.st.push(st); }
      if (sim.appDirty) { sim.appDirty = false; ev.app = sim.appState(); this.view.setApp(ev.app); }
      const lk = JSON.stringify(sim.loops); if (lk !== this.loopKey) { this.loopKey = lk; ev.loops = sim.loops.map(l => [l[0], l[1].map(x => +x.toFixed(2)), +l[2].toFixed(2)]); this.view.setLoops(sim.loops); }
      if (this.service.dirty || this.snapN % 20 === 0) { this.service.dirty = false; ev.svc = this.service.state(); this.onSvc(ev.svc); }
    }
    if (!this.ready.size) { this.ev = this.newEv(); for (const e of sim.ents.values()) e.netMoved = false; return; }
    if (ev.s.length || ev.d.length || ev.st.length || ev.fx.length || ev.sfx.length || ev.x.length || ev.app || ev.loops || ev.svc) {
      const m = { t: 'ev' }; for (const k in ev) if (Array.isArray(ev[k]) ? ev[k].length : ev[k]) m[k] = ev[k];
      this.net.broadcast(m, this.ready);
    }
    this.ev = this.newEv();
    const players = []; for (const p of sim.players.values()) players.push({ id: p.id, flags: (p.grip[0] ? 1 : 0) | (p.grip[1] ? 2 : 0) | (p.crouch ? 4 : 0) | (p.air ? 8 : 0), x: p.pos.x, y: p.pos.y, z: p.pos.z, yaw: p.yaw, pitch: p.pitch, holdL: p.hands[0].ent ? p.hands[0].pos : null, holdR: p.hands[1].ent ? p.hands[1].pos : null });
    const waiters = this.service.waiters.map(w => ({ id: w.id, flags: (w.carry ? 1 : 0) | (w.shock > 0 ? 2 : 0), x: w.pos.x, z: w.pos.z, yaw: w.yaw }));
    const bodies = []; for (const e of sim.ents.values()) if (e.netMoved) { if (bodies.length >= 650) break; e.netMoved = false; bodies.push(e); }
    this.net.broadcast(encodeSnapshot(sim.tick, players, waiters, bodies), this.ready);
  }

  // ------------------------------------------------------------------ client networking
  wireClient() {
    const net = this.net;
    net.on('msg', (_, m) => {
      if (m.t === 'welcome') {
        this.localId = m.id; this.spawnPos = m.spawn; this.setupWorld(m.rest, m.up);
        this.level = m.level || 1; this.menu = (m.menu || []).map(id => menuFor(9, 99).find(r => r.id === id)).filter(Boolean);
        for (const p of m.players) this.roster.set(p.id, p); this.view.setApp(m.app); this.lastResN = m.svc.result ? m.svc.result.n : 0; this.onSvc(m.svc);
      }
      else if (m.t === 'items') { for (const s of m.s) this.view.spawn(s[0], s[1], [s[2], s[3], s[4]], [s[5], s[6], s[7], s[8]], s[9]); }
      else if (m.t === 'go') { this.onWelcome?.(); }
      else if (m.t === 'full') { alert(S.full); location.reload(); }
      else if (m.t === 'bonk') { if (this.player) this.onBonk(m.dx, m.dz, m.pw); }
      else if (m.t === 'ev') this.applyEv(m);
    });
    net.on('bin', (_, buf) => {
      if (new DataView(buf).getUint8(0) !== 2 || !this.view) return;
      decodeSnapshot(buf, {
        player: (id, fl, x, y, z, yaw, pitch, hl, hr) => {
          const p = this.view.players.get(id); if (!p) return;
          if (id !== this.localId) { p.tp.set(x, y, z); p.yaw = yaw; } p.pitch = pitch; p.flags = fl; p.hasL = !!hl; p.hasR = !!hr; if (hl) p.hl.set(hl[0], hl[1], hl[2]); if (hr) p.hr.set(hr[0], hr[1], hr[2]);
        },
        waiter: (id, x, z, yaw, fl) => this.view.setWaiter(id, x, z, yaw, fl),
        body: (id, x, y, z, qx, qy, qz, qw) => this.view.setPose(id, x, y, z, qx, qy, qz, qw, false),
      });
    });
    net.on('closed', () => { alert(S.hostLeft); location.href = location.pathname; });
  }
  applyEv(m) {
    const v = this.view;
    if (m.s) for (const s of m.s) v.spawn(s[0], s[1], [s[2], s[3], s[4]], [s[5], s[6], s[7], s[8]], s[9]);
    if (m.d) for (const id of m.d) v.despawn(id);
    if (m.st) for (const s of m.st) v.setItemState(s);
    if (m.fx) for (const f of m.fx) v.fx.emit(f[0], f[1], f[2]);
    if (m.sfx) for (const s of m.sfx) this.playSfx(s[0], s[1], s[2], s[3]);
    if (m.app) v.setApp(m.app);
    if (m.loops) v.setLoops(m.loops);
    if (m.svc) this.onSvc(m.svc);
    if (m.x) for (const x of m.x) {
      if (x.t === 'toast') this.hud.toast(x.k, x.a, x.b);
      else if (x.t === 'carry') v.carry(x.c); else if (x.t === 'deliv') v.delivered(x.d); else if (x.t === 'mood') v.mood(x.table, x.m);
      else if (x.t === 'dz') { const p = v.players.get(x.id); if (p) p.dizzy = 1; }
      else if (x.t === 'em') { const p = v.players.get(x.id); if (p && x.id !== this.localId) { p.emote = x.e; p.emoteT = 0; } }
      else if (x.t === 'pj') { const isNew = !this.roster.has(x.p.id); this.roster.set(x.p.id, x.p); v.upsertPlayer(x.p); if (isNew && !x.quiet && x.p.id !== this.localId) { this.hud.toast('text', `👨‍🍳 ${x.p.name} ${S.joined}`); audio.play('pop', null, 0.8); } this.updateRoom(); }
      else if (x.t === 'pl') { const info = this.roster.get(x.id); this.roster.delete(x.id); v.removePlayer(x.id); if (info) this.hud.toast('text', `👋 ${info.name} ${S.left}`); this.updateRoom(); }
    }
  }

  // ------------------------------------------------------------------ frame
  frame() {
    const pl = this.player, view = this.view; let dt;
    for (const ev of pl.events.splice(0)) {
      if (ev.t === 'emote') { const e = this.meta.ownedEmotes()[ev.idx]; if (e) this.setEmote(this.emote === e.id ? null : e.id); continue; }
      if (ev.t === 'throw') for (const a of this.profile.bump('thrown')) this.hud.toast('text', `🏆 ${a.n[lang === 'en' ? 1 : 0]}`);
      if (this.isHost) { if (ev.t === 'throw') this.sim.throwHeld(0, ev.power); else if (ev.t === 'level') this.sim.levelHeld(0); } else this.net.send(ev);
    }
    if (this.emote) {           // emotes end on their own, or as soon as you move / grab
      this.emoteT += 1 / 60; const d = EMOTES.find(e => e.id === this.emote);
      if (pl.speed > 0.8 || pl.gripL || pl.gripR || (d && !d.loop && this.emoteT > d.dur + 0.3)) this.setEmote(null);
    }
    if (this.isHost) {
      const others = []; for (const p of this.sim.players.values()) if (p.id !== 0) others.push(p.pos);
      const pdt = Math.min(0.05, (performance.now() - this.last) / 1000);
      pl.update(pdt, others);
      dt = this.hostAdvance();
      for (const e of this.sim.ents.values()) if (e.moved) { e.moved = false; view.setPose(e.id, e.pos.x, e.pos.y, e.pos.z, e.rot.x, e.rot.y, e.rot.z, e.rot.w, true); }
      for (const p of this.sim.players.values()) {
        const vp = view.players.get(p.id); if (!vp) continue;
        vp.tp.copy(p.pos); vp.yaw = p.yaw; vp.pitch = p.pitch; vp.flags = (p.grip[0] ? 1 : 0) | (p.grip[1] ? 2 : 0) | (p.crouch ? 4 : 0) | (p.air ? 8 : 0);
        vp.hasL = !!p.hands[0].ent; vp.hasR = !!p.hands[1].ent; if (vp.hasL) vp.hl.copy(p.hands[0].pos); if (vp.hasR) vp.hr.copy(p.hands[1].pos);
      }
      this.service.waiters.forEach(w => view.setWaiter(w.id, w.pos.x, w.pos.z, w.yaw, (w.carry ? 1 : 0) | (w.shock > 0 ? 2 : 0)));
    } else {
      const now = performance.now(); dt = Math.min(0.1, (now - this.last) / 1000); this.last = now;
      const others = []; for (const p of view.players.values()) if (p.id !== this.localId) others.push(p.tp);
      pl.update(Math.min(dt, 0.05), others); this.world.step();
      this.inAcc += dt; if (this.inAcc >= 1 / INPUT_HZ) { this.inAcc = 0; this.net.send(encodeInput(pl.input())); }
      const me0 = view.players.get(this.localId); if (me0) { me0.tp.copy(pl.pos); me0.yaw = pl.yaw; }
    }
    // camera: first person, or a selfie cam while emoting so you can enjoy your own silly chef
    this.camBlend += ((this.emote ? 1 : 0) - this.camBlend) * Math.min(1, dt * 7);
    pl.applyCamera(view.camera);
    const me = view.players.get(this.localId);
    if (me) me.chef.group.visible = this.camBlend > 0.05;
    if (this.camBlend > 0.01) {
      const b = this.camBlend, fx = -Math.sin(pl.yaw), fz = -Math.cos(pl.yaw), cam = view.camera;
      cam.position.set(pl.pos.x + fx * 2.7 * b, pl.pos.y + pl.eyeH + (1.35 - pl.eyeH) * b + 0.25 * b, pl.pos.z + fz * 2.7 * b);
      cam.rotation.set(pl.pitch * (1 - b) - 0.12 * b, pl.yaw + Math.PI * b, 0);
    }
    view.updateHands(dt, view.camera, me && me.hasL && pl.gripL ? me.hl : null, me && me.hasR && pl.gripR ? me.hr : null, pl.gripL, pl.gripR, this.camBlend > 0.3);
    audio.setListener(pl.pos, pl.yaw);
    view.update(dt, pl.pos);
    this.aimT -= dt;
    if (this.aimT <= 0) { this.aimT = 0.1; const holding = me && ((me.hasL && pl.gripL) || (me.hasR && pl.gripR)); this.hud.setAim((pl.locked || this.testMode) && !this.emote ? view.pick() : null, holding, pl.charge >= 0 ? pl.charge / 0.9 : -1); this.hud.setWrist(pl.rotating, pl.wristP, pl.wristR); }
    view.render();
    this.frames++; this.fpsT += dt; if (this.fpsT >= 1) { this.hud.setFps(`${this.frames} fps · ${view.items.size} obj`); this.frames = 0; this.fpsT = 0; }
  }

  bindKeys() {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Tab') { e.preventDefault(); if (!e.repeat) this.toggleBook(!this.hud.bookOpen); }
      else if (this.hud.bookOpen && (e.code === 'ArrowLeft' || e.code === 'KeyA' || e.code === 'PageUp')) this.hud.flip(-1);
      else if (this.hud.bookOpen && (e.code === 'ArrowRight' || e.code === 'KeyD' || e.code === 'PageDown' || e.code === 'Space')) { e.preventDefault(); this.hud.flip(1); }
      else if (this.hud.bookOpen && e.code === 'Escape') this.toggleBook(false);
      else if (e.code === 'KeyH' && this.player.locked) this.hud.toggleHelp();
      else if (e.code === 'KeyM' && this.player.locked) { audio.setMuted(!audio.muted); this.hud.toast('text', audio.muted ? '🔇' : '🔊'); }
    });
    $('resume').onclick = () => { this.setPaused(false); $('game').requestPointerLock?.(); };
    $('startsvc').onclick = () => { if (this.isHost && !this.service.running) this.service.start(this.sim.players.size); this.setPaused(false); $('game').requestPointerLock?.(); };
    $('pwardrobe').onclick = () => this.meta.openWardrobe();
    $('pbook').onclick = () => { this.bookFromPause = true; $('pause').style.display = 'none'; this.toggleBook(true); };
    $('bclose').addEventListener('click', () => this.toggleBook(false));
    $('quit').onclick = () => { this.net.close(); location.href = location.pathname; };
    $('startsvc').style.display = this.isHost ? '' : 'none';
    window.addEventListener('beforeunload', () => { this.profile.save(); this.net.close(); });
  }
  toggleBook(on) {
    this.hud.book(on); this.player.frozen = on;
    if (!on && this.bookFromPause) { this.bookFromPause = false; $('pause').style.display = 'flex'; }
  }
  setPaused(p) { this.paused = p; $('pause').style.display = p ? 'flex' : 'none'; this.hud.setLocked(this.player.locked, p); }
}

// ------------------------------------------------------------------ menu
async function boot() {
  document.documentElement.lang = lang;
  $('tagline').textContent = S.tagline; $('lname').textContent = S.name; $('bhost').textContent = S.host; $('bjoin').textContent = S.join; $('bsolo').textContent = S.solo;
  $('code').placeholder = S.code; $('resume').textContent = S.resume; $('startsvc').textContent = S.startService; $('quit').textContent = S.quit; $('ptitle').textContent = S.paused; $('pcodel').textContent = S.kitchenCode;
  $('pwardrobe').textContent = '🎩 ' + (lang === 'en' ? 'Wardrobe' : 'Garderob'); $('pbook').textContent = '📖 ' + (lang === 'en' ? "Chef's notes" : 'Kockens anteckningar');
  $('langbtn').textContent = lang === 'sv' ? 'English' : 'Svenska'; $('langbtn').onclick = () => { store.set('lang', lang === 'sv' ? 'en' : 'sv'); location.href = location.pathname; };
  $('ver').textContent = 'v' + VERSION;
  const nameEl = $('name'); nameEl.value = store.get('name', ''); nameEl.placeholder = lang === 'sv' ? 'Kocken' : 'Chef';
  let color = +store.get('color', CHEF_COLORS[Math.floor(Math.random() * CHEF_COLORS.length)]); if (!CHEF_COLORS.includes(color)) color = CHEF_COLORS[0];
  const profile = new Profile();
  if (params.get('cheat')) { profile.d.xp = Math.max(profile.d.xp, 60000); profile.d.coins = Math.max(profile.d.coins, 99999); for (const id of ['dump', 'bistro', 'grand']) profile.rest(id).stars = Math.max(profile.rest(id).stars, 30); }
  if (params.get('rest')) profile.select(params.get('rest'));
  let game = null;
  const meta = new Meta(profile, lang, {
    getColor: () => color, setColor: (c) => { color = c; store.set('color', c); if (game) game.color = c; }, getName: () => (nameEl.value.trim() || nameEl.placeholder).slice(0, 14),
    onLook: () => { if (game && game.player) game.sendLook(); },
  });
  meta.renderCareer();
  if (params.get('join')) $('code').value = params.get('join').toUpperCase().slice(0, 4);
  $('status').textContent = S.loading;
  const fontsReady = Promise.race([document.fonts.load('700 30px Caveat').then(() => document.fonts.load('20px "Patrick Hand"')), new Promise(r => setTimeout(r, 3000))]).catch(() => {});
  const txt = await import('./cookbook_text.js').then(m => ({ NOTES: m.NOTES || {}, TIPS: m.TIPS || [], INTRO: m.INTRO || ['', ''], DONENESS: m.DONENESS || ['', ''] })).catch(() => ({}));
  setText(txt);
  await RAPIER.init(); await fontsReady;
  $('status').textContent = ''; $('buttons').classList.remove('disabled');
  game = window.game = new Game(profile, meta);
  const go = async (mode) => {
    const name = (nameEl.value.trim() || nameEl.placeholder).slice(0, 14); store.set('name', nameEl.value.trim()); store.set('color', color); audio.init();
    $('buttons').classList.add('disabled');
    try {
      if (mode === 'join') {
        const code = $('code').value.trim().toUpperCase(); if (code.length !== 4) { $('status').textContent = S.joinFail; $('buttons').classList.remove('disabled'); return; }
        $('status').textContent = S.connecting; await game.net.join(code); await game.start('join', code, name, color);
      } else await game.start(mode, makeCode(), name, color);
    } catch (e) { console.error(e); $('status').textContent = S.joinFail; $('buttons').classList.remove('disabled'); }
  };
  $('bhost').onclick = () => go('host'); $('bsolo').onclick = () => go('solo'); $('bjoin').onclick = () => go('join');
  $('code').addEventListener('keydown', (e) => { if (e.key === 'Enter') go('join'); });
  if (params.get('test')) { game.testMode = true; await go(params.get('test') === 'join' ? 'join' : params.get('test') === 'host' ? 'host' : 'solo'); }
}
boot().catch((e) => { console.error(e); $('status').textContent = 'Error: ' + e.message; });
