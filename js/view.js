// Kökskaos — rendering: scene, lights, item/fixture meshes (interpolated from snapshots), appliance visuals,
// chefs, waiters, customers, plate labels and particles. Runs identically on host and clients.
import * as THREE from '../vendor/three.module.js';
import { ITEMS, buildItemMesh, buildParts, applyCookLook, toonGradient } from './items.js';
import { makeChef, makeWaiter, makeCustomer, makeHand, CHEF_COLORS, EMOTES } from './avatars.js';
import { RECIPE_BY_ID, describeReq } from './orders.js';
import { Fx } from './fx.js';
import { audio } from './audio.js';
import { PLAYER } from './config.js';

const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _q = new THREE.Quaternion(), _m = new THREE.Matrix4();

export class View {
  constructor(canvas, lang) {
    this.lang = lang;
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap; r.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene(); this.scene.background = new THREE.Color(0xf6d9b0);
    this.camera = new THREE.PerspectiveCamera(74, 1, 0.05, 80); this.camera.rotation.order = 'YXZ';
    this.scene.add(this.camera);
    this.hemi = new THREE.HemisphereLight(0xfffaf0, 0xc9b79c, 1.55); this.scene.add(this.hemi); this.flick = 1; this.flickT = 0;
    const sun = this.sun = new THREE.DirectionalLight(0xfff1d8, 2.1);
    sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.025;
    const sc = sun.shadow.camera; sc.left = -11; sc.right = 11; sc.top = 11; sc.bottom = -11; sc.near = 1; sc.far = 40;
    this.scene.add(sun, sun.target);
    this.items = new Map(); this.itemRoot = new THREE.Group(); this.scene.add(this.itemRoot);
    this.players = new Map(); this.waiters = []; this.customers = []; this.labels = new Map(); this.tickets = []; this.served = [];
    this.fx = new Fx(this.scene); this.K = null; this.app = null; this.time = 0; this.localId = -1; this.hands = null;
    this.ray = new THREE.Raycaster(); this.ray.far = PLAYER.grabRange;
    window.addEventListener('resize', () => this.resize()); this.resize();
  }
  resize() { const w = window.innerWidth, h = window.innerHeight; this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }

  // ------------------------------------------------------------------ entities
  addFixture(fx) {
    const group = buildParts(fx.parts); if (fx.decor) group.add(fx.decor);
    group.position.set(fx.wp[0], fx.wp[1], fx.wp[2]); group.quaternion.set(fx.q.x, fx.q.y, fx.q.z, fx.q.w);
    if (fx.start) group.quaternion.multiply(_q.setFromAxisAngle(_v.set(fx.axis === 'x' ? 1 : 0, fx.axis === 'y' ? 1 : 0, fx.axis === 'z' ? 1 : 0), fx.start));
    this.itemRoot.add(group);
    const it = { id: fx.id, fixture: fx, def: { n: fx.n }, group, tp: group.position.clone(), tq: group.quaternion.clone(), fresh: true };
    group.userData.item = it; this.items.set(fx.id, it);
  }
  spawn(id, kind, p, q, st) {
    if (this.items.has(id)) return;
    const def = ITEMS[kind]; if (!def) return;
    const group = buildItemMesh(kind);
    group.position.set(p[0], p[1], p[2]); if (q) group.quaternion.set(q[0], q[1], q[2], q[3]);
    this.itemRoot.add(group);
    const it = { id, kind, def, group, tp: group.position.clone(), tq: group.quaternion.clone(), cookA: 0, cookB: 0, method: 0, water: 0, boiling: 0, heat: 0, fresh: true };
    group.userData.item = it; this.items.set(id, it);
    if (st) this.setItemState(st);
  }
  despawn(id) {
    const it = this.items.get(id); if (!it) return;
    this.itemRoot.remove(it.group);
    for (const t of it.group.userData.tints || []) t.m.dispose();
    if (it.group.userData.water) it.group.userData.water.material.dispose();
    this.items.delete(id);
  }
  setPose(id, x, y, z, qx, qy, qz, qw, snap) {
    const it = this.items.get(id); if (!it) return;
    it.tp.set(x, y, z); it.tq.set(qx, qy, qz, qw);
    if (snap || it.fresh) { it.group.position.copy(it.tp); it.group.quaternion.copy(it.tq); it.fresh = false; it.still = true; } else it.still = false;
  }
  setItemState(s) {
    const it = this.items.get(s[0]); if (!it || it.fixture) return;
    it.cookA = s[1] / 50; it.cookB = s[2] / 50; it.method = s[3]; it.water = s[4] / 100; it.boiling = s[5]; it.heat = s[6] / 100;
    applyCookLook(it.group, it.def, it.cookA, it.cookB);
    const w = it.group.userData.water;
    if (w) { w.visible = it.water > 0.03; w.position.y = it.def.container.y0 + 0.01 + it.def.container.waterH * it.water; }
  }

  // ------------------------------------------------------------------ kitchen hookup + appliance visuals
  setKitchen(K) {
    this.K = K; this.lightK = K.light || 1; this.hemi.intensity = 1.55 * this.lightK; this.sun.intensity = 2.1 * this.lightK; if (K.bg) this.scene.background.set(K.bg);
    K.tables.forEach((t, ti) => t.seats.forEach((s, si) => {
      if ((ti * 7 + si * 3) % 4 === 3) return;
      const c = makeCustomer({ seed: ti * 10 + si + 1 }); c.group.position.set(s.p[0], 0, s.p[2]); c.group.rotation.y = s.yaw; c.table = ti; c.mood = 0; c.moodT = 0;
      this.scene.add(c.group); this.customers.push(c);
    }));
    K.waiterIdle.slice(0, 3).forEach((p, i) => { const w = makeWaiter({ seed: i + 1 }); w.group.position.set(p[0], 0, p[1]); w.group.rotation.y = Math.PI; w.tp = w.group.position.clone(); w.ty = Math.PI; w.flags = 0; w.speed = 0; this.scene.add(w.group); this.waiters.push(w); });
    for (const t of K.taps) { const h = t.spout[1] - t.floorY; t.stream.scale.y = h; t.stream.position.y = t.floorY + h / 2; }
  }
  setApp(app) {
    const K = this.K; this.app = app;
    K.burners.forEach((b, i) => { b.lvl = app.b[i] / 100; b.flame.visible = b.lvl > 0; });
    K.ovens.forEach((o, i) => { o.glow.visible = !!(app.o[i] & 1); });
    K.fryers.forEach((f, i) => { f.hot = !!(app.f[i] & 2); f.busyV = !!(app.f[i] & 4); f.oil.material.color.set(f.hot ? 0xf5a623 : 0xf2c14e); });
    K.taps.forEach((t, i) => { t.flowV = app.t[i] / 100; t.stream.visible = t.flowV > 0; t.stream.scale.x = t.stream.scale.z = 0.6 + t.flowV; });
  }
  setLoops(loops) {
    const seen = new Set();
    loops.forEach((l, i) => { const key = l[0] + ':' + Math.round(l[1][0] * 2) + ':' + Math.round(l[1][2] * 2); seen.add(key); audio.setLoop(key, l[0], { x: l[1][0], y: l[1][1], z: l[1][2] }, l[2]); });
    if (this.loopKeys) for (const k of this.loopKeys) if (!seen.has(k)) audio.setLoop(k, null, null, 0);
    this.loopKeys = seen;
  }

  // ------------------------------------------------------------------ chefs
  setLocal(id, color) {
    this.localId = id;
    if (!this.hands) { this.hands = [makeHand({ color, side: 'L' }), makeHand({ color, side: 'R' })]; for (const h of this.hands) { this.scene.add(h.group); h.group.scale.setScalar(0.8); h.grip = 0; h.p = new THREE.Vector3(); h.init = false; } }
    else for (const h of this.hands) h.setColor(color);
  }
  upsertPlayer(info) {
    let p = this.players.get(info.id);
    if (!p) {
      const chef = makeChef({ color: info.color, name: info.name, look: info.look || undefined });
      p = { id: info.id, chef, emote: null, emoteT: 0, lookKey: JSON.stringify(info.look || null), tp: new THREE.Vector3(0, 0, -6), yaw: 0, pitch: 0, flags: 0, hl: new THREE.Vector3(), hr: new THREE.Vector3(), hasL: false, hasR: false, prev: new THREE.Vector3(), speed: 0, dizzy: 0, fresh: true, name: info.name, color: info.color };
      this.scene.add(chef.group); this.players.set(info.id, p);
    } else {
      if (p.name !== info.name) p.chef.setName(info.name); if (p.color !== info.color) p.chef.setColor(info.color); p.name = info.name; p.color = info.color;
      const lk = JSON.stringify(info.look || null); if (lk !== p.lookKey && info.look) { p.lookKey = lk; p.chef.setLook(info.look); }
    }
    if (info.id === this.localId) { p.chef.group.visible = false; if (p.chef.nameSprite) p.chef.nameSprite.visible = false; }
    return p;
  }
  removePlayer(id) { const p = this.players.get(id); if (!p) return; this.scene.remove(p.chef.group); p.chef.dispose(); this.players.delete(id); }
  setWaiter(i, x, z, yaw, flags) { const w = this.waiters[i]; if (!w) return; w.tp.set(x, 0, z); w.ty = yaw; w.flags = flags; }

  buildServed(desc) {
    const g = buildItemMesh(desc.plate);
    for (const it of desc.items) {
      const m = buildItemMesh(it[0]); m.position.set(it[1], it[2], it[3]); m.quaternion.set(it[4], it[5], it[6], it[7]);
      applyCookLook(m, ITEMS[it[0]], it[8], it[9]); g.add(m);
    }
    return g;
  }
  carry(desc) { const w = this.waiters[desc.w]; if (!w) return; if (w.plate) w.carryAnchor.remove(w.plate); w.plate = this.buildServed(desc); w.carryAnchor.add(w.plate); }
  delivered(d) {
    const w = this.waiters[d.w], t = this.K.tables[d.table]; if (!w || !t) return;
    const g = w.plate || this.buildServed(d.carry); if (w.plate) { w.carryAnchor.remove(w.plate); w.plate = null; }
    g.position.set(t.p[0] + 0.0, t.p[1], t.p[2] + 0.25); g.quaternion.identity(); this.scene.add(g); this.served.push({ g, t: 22 });
    this.fx.emit('coin', [t.p[0], t.p[1] + 0.4, t.p[2]]); this.fx.emit('heart', [t.p[0], 1.7, t.p[2]]);
    audio.play('yum', { x: t.p[0], y: 1, z: t.p[2] }, 1);
    this.mood(d.table, 1);
  }
  mood(table, m) { for (const c of this.customers) if (c.table === table) { c.mood = m; c.moodT = 9; } if (m < 0) { const t = this.K.tables[table]; this.fx.emit('angry', [t.p[0], 1.8, t.p[2]]); audio.play('angry', { x: t.p[0], y: 1, z: t.p[2] }, 1); } }

  // ------------------------------------------------------------------ service visuals: labels over plates on the pass + paper tickets
  setService(svc) {
    const T = this.K && this.K.term, p = svc.pay, li = this.lang === 'en' ? 1 : 0;
    if (T) {
      const key = p ? `${p.card}|${p.want || p.owed}|${p.typed}|${p.change}|${p.got}|${p.bad}|${p.ok}` : '-';
      if (key !== T.key) {
        T.key = key;
        if (!p) T.draw(li ? 'READY' : 'KLAR', '—');
        else if (p.card) T.draw(p.ok ? (li ? 'TAP NOW' : 'BLIPPA NU') : p.bad ? (li ? 'WRONG' : 'FEL BELOPP') : `${li ? 'CARD' : 'KORT'} ${p.want} kr`, `${p.typed}`, !!p.bad);
        else T.draw(li ? `GOT ${p.tendered}` : `FICK ${p.tendered}`, `${li ? 'CHANGE' : 'VÄXEL'} ${Math.max(0, p.change - p.got)}`);
      }
    }
    this.waiting = new Map(); for (const o of svc.orders) if (o.st === 'open') this.waiting.set(o.table, o.t / o.T);
    const want = new Map(svc.labels.map(l => [l.id, l]));
    for (const [id, lb] of this.labels) if (!want.has(id) || !this.items.has(id)) { this.scene.remove(lb.sprite); lb.sprite.material.map.dispose(); lb.sprite.material.dispose(); this.labels.delete(id); }
    for (const l of svc.labels) {
      const it = this.items.get(l.id); if (!it) continue;
      const rec = l.r ? RECIPE_BY_ID[l.r] : null;
      const li0 = this.lang === 'en' ? 1 : 0, why = (m) => { const r = []; if (m[3]) r.push(m[3] + (li0 ? ' raw' : ' rå')); if (m[4]) r.push(m[4] + (li0 ? ' burnt' : ' bränd')); if (m[5]) r.push(li0 ? 'wrong method' : 'fel tillagning'); return r.length ? ` (${r.join(', ')})` : ''; };
      const text = l.ok ? `${rec.icon} ✔` : rec ? `${rec.icon} ` + l.m.map(m => { const q = rec.req.find(r => r.k === m[0]), d = ITEMS[m[0]]; return `${(q && q.cooked && d.cookedName ? d.cookedName : d.n)[li0]} ${m[1]}/${m[2]}${why(m)}`; }).join(' · ') : (li0 ? 'no matching order' : 'ingen beställning på detta');
      let lb = this.labels.get(l.id);
      if (!lb) { const cv = document.createElement('canvas'); cv.width = 512; cv.height = 96; const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true })); sprite.scale.set(1.3, 0.245, 1); sprite.renderOrder = 20; this.scene.add(sprite); lb = { sprite, cv, tex, text: '' }; this.labels.set(l.id, lb); }
      if (lb.text !== text) {
        lb.text = text; const g = lb.cv.getContext('2d'); g.clearRect(0, 0, 512, 96);
        g.fillStyle = l.ok ? 'rgba(46,160,67,0.92)' : 'rgba(30,32,40,0.82)'; g.beginPath(); g.roundRect(4, 8, 504, 80, 30); g.fill();
        g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; let size = 44; do { g.font = `bold ${size}px Fredoka, "Trebuchet MS", sans-serif`; size -= 3; } while (g.measureText(text).width > 480 && size > 16);
        g.fillText(text, 256, 50); lb.tex.needsUpdate = true;
      }
      lb.item = it;
    }
    // paper tickets on the rail
    const P = this.K.pass, open = svc.orders;
    while (this.tickets.length < open.length) { const cv = document.createElement('canvas'); cv.width = 128; cv.height = 160; const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; const m = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.375), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide })); this.scene.add(m); this.tickets.push({ m, cv, tex, key: '' }); }
    this.tickets.forEach((t, i) => {
      const o = open[i]; t.m.visible = !!o; if (!o) return;
      t.m.position.set(P.railX + i * 0.42, P.railY - 0.06, P.railZ + 0.01); t.m.rotation.z = Math.sin(i * 2.3) * 0.06;
      const key = o.id + o.st; if (key === t.key) return; t.key = key;
      const g = t.cv.getContext('2d'), rec = RECIPE_BY_ID[o.r]; g.fillStyle = o.st === 'open' ? '#fffdf2' : '#c9f2c7'; g.fillRect(0, 0, 128, 160); g.fillStyle = '#e5483d'; g.fillRect(0, 0, 128, 16);
      g.font = '64px serif'; g.textAlign = 'center'; g.fillStyle = '#222'; g.fillText(rec.icon, 64, 90); g.font = 'bold 22px sans-serif'; g.fillText('#' + o.id + '  ' + (this.lang === 'en' ? 'T' : 'B') + (o.table + 1), 64, 140); t.tex.needsUpdate = true;
    });
  }

  // ------------------------------------------------------------------ aim hint for the local player
  pick() {
    const cam = this.camera; cam.getWorldPosition(_v); const near = [];
    for (const it of this.items.values()) if (it.group.position.distanceToSquared(_v) < 9.5) near.push(it.group);
    this.ray.setFromCamera({ x: 0, y: 0 }, cam);
    const hits = this.ray.intersectObjects(near, true);
    for (const h of hits) { let o = h.object; while (o && !o.userData.item) o = o.parent; if (o) return { item: o.userData.item, dist: h.distance }; }
    return null;
  }

  // ------------------------------------------------------------------ per-frame
  update(dt, local) {
    this.time += dt; const k = 1 - Math.exp(-dt * 24), t = this.time;
    for (const it of this.items.values()) {
      if (it.still) continue;
      it.group.position.lerp(it.tp, k); it.group.quaternion.slerp(it.tq, k);
      if (it.group.position.distanceToSquared(it.tp) < 1e-7) it.still = true;
    }
    const K = this.K;
    if (K && K.flicker) {          // dying fluorescent tubes: random dips + the odd blackout
      this.flickT -= dt;
      if (this.flickT <= 0) { const r = Math.random(); this.flick = r < 0.12 ? 0.35 : r < 0.3 ? 0.7 : 1; this.flickT = this.flick < 1 ? 0.04 + Math.random() * 0.12 : 0.15 + Math.random() * 1.6; }
      const f = this.flick * this.lightK; this.hemi.intensity = 1.55 * f; this.sun.intensity = 2.1 * f;
      K.lampGlows.forEach((m, i) => { const on = this.flick >= 1 || (i + Math.floor(this.time * 20)) % 3 !== 0; m.material.color.setHex(on ? 0xf4ffe8 : 0x4a4f48); });
    }
    if (K) {
      for (const b of K.burners) if (b.flame.visible) { const s = b.lvl * (0.85 + 0.25 * Math.sin(t * 31 + b.id * 1.7)); b.flame.scale.set(0.8 + b.lvl * 0.35, 0.5 + s, 0.8 + b.lvl * 0.35); }
      for (const f of K.fryers) { f.oil.position.y = f.oilY + (f.hot ? Math.sin(t * 9 + f.id) * 0.004 : 0); if (f.busyV && Math.random() < dt * 14) this.fx.emit('bubbles', [f.pos[0] + (Math.random() - 0.5) * 0.4, f.oilY, f.pos[2] + (Math.random() - 0.5) * 0.3]); }
      for (const tp of K.taps) if (tp.flowV > 0 && Math.random() < dt * 25) this.fx.emit('tap', [tp.spout[0], tp.floorY + 0.03, tp.spout[2]]);
    }
    // chefs
    for (const p of this.players.values()) {
      const g = p.chef.group;
      if (p.fresh) { g.position.copy(p.tp); p.prev.copy(p.tp); p.fresh = false; }
      g.position.lerp(p.tp, 1 - Math.exp(-dt * 16));
      let dy = p.yaw - g.rotation.y; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2; g.rotation.y += dy * Math.min(1, dt * 16);
      const sp = _v.copy(g.position).sub(p.prev).setY(0).length() / Math.max(dt, 1e-4); p.speed += (sp - p.speed) * Math.min(1, dt * 10); p.prev.copy(g.position);
      p.dizzy = Math.max(0, p.dizzy - dt * 0.6);
      if (p.emote) { p.emoteT += dt; const d = EMOTES.find(e => e.id === p.emote); if (!d || (!d.loop && p.emoteT > d.dur + 0.3)) p.emote = null; }
      if (g.visible) p.chef.update(dt, { emote: p.emote, speed: p.speed, pitch: p.pitch, handL: p.hasL ? p.hl : null, handR: p.hasR ? p.hr : null, gripL: !!(p.flags & 1), gripR: !!(p.flags & 2), crouch: !!(p.flags & 4), grounded: !(p.flags & 8), dizzy: p.dizzy });
    }
    for (const w of this.waiters) {
      const g = w.group, before = _v.copy(g.position); g.position.lerp(w.tp, 1 - Math.exp(-dt * 14));
      let dy = w.ty - g.rotation.y; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2; g.rotation.y += dy * Math.min(1, dt * 12);
      const sp = before.sub(g.position).length() / Math.max(dt, 1e-4); w.speed += (sp - w.speed) * Math.min(1, dt * 10);
      w.update(dt, { speed: w.speed, carrying: !!(w.flags & 1), shocked: (w.flags & 2) ? 1 : 0, talk: 0 });
    }
    for (const c of this.customers) {
      c.moodT -= dt; if (c.moodT <= 0) c.mood = 0;
      const w = this.waiting && this.waiting.get(c.table);
      if (w != null && c.moodT <= 0) { c.mood = w > 0.55 ? 0 : w > 0.3 ? -0.45 : -1; c.rant = (c.rant || 0) - dt; if (w < 0.3 && c.rant <= 0) { c.rant = 3 + Math.random() * 4; const t = this.K.tables[c.table]; this.fx.emit('angry', [t.p[0], 1.75, t.p[2]]); audio.play('angry', { x: t.p[0], y: 1, z: t.p[2] }, 0.8, 0.9 + Math.random() * 0.4); } } if (c.group.position.distanceToSquared(this.camera.position) < 500) c.update(dt, { mood: c.mood, eating: c.mood > 0.5 });
    }
    for (let i = this.served.length - 1; i >= 0; i--) { const s = this.served[i]; s.t -= dt; if (s.t <= 0) { this.scene.remove(s.g); this.served.splice(i, 1); } else if (s.t < 0.5) s.g.scale.setScalar(s.t * 2); }
    for (const lb of this.labels.values()) if (lb.item) lb.sprite.position.copy(lb.item.group.position).add(_v.set(0, 0.55, 0));
    // shadow frustum follows the local chef
    if (local) { const sx = Math.round(local.x), sz = Math.round(local.z); this.sun.position.set(sx + 5, 16, sz + 6); this.sun.target.position.set(sx, 0, sz); }
    this.fx.update(dt, this.renderer, this.camera);
  }
  // first-person gloves: idle pose near the bottom of the screen, or stuck to whatever they hold
  updateHands(dt, cam, holdL, holdR, gripL, gripR, hide) {
    if (!this.hands) return;
    for (const h of this.hands) h.group.visible = !hide;
    const holds = [holdL, holdR], grips = [gripL, gripR];
    for (let h = 0; h < 2; h++) {
      const hand = this.hands[h], g = hand.group;
      hand.grip += ((grips[h] ? 1 : 0) - hand.grip) * Math.min(1, dt * 18); hand.setGrip(hand.grip);
      if (holds[h]) _v.copy(holds[h]); else { _v.set(h ? 0.36 : -0.36, -0.34 + Math.sin(this.time * 2 + h) * 0.008, grips[h] ? -0.8 : -0.62); cam.localToWorld(_v); }
      if (!hand.init) { g.position.copy(_v); hand.init = true; }
      g.position.lerp(_v, 1 - Math.exp(-dt * (holds[h] ? 30 : 22)));
      g.quaternion.copy(cam.quaternion);
    }
  }
  render() { this.renderer.render(this.scene, this.camera); }
}
export { CHEF_COLORS };
