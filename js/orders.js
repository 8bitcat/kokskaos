// Kökskaos — recipes, the service (orders, judging plates on the pass, scoring) and the waiters. Host only,
// except RECIPES / describeReq which the HUD uses everywhere.
import * as THREE from '../vendor/three.module.js';
import { COOK, SERVICE, GROUPS, ROOM } from './config.js';
import { ITEMS, METHODS } from './items.js';
import { SUPPLY, SUPPLY_MAX } from './supplier.js';

// req: k = item kind, n = how many, cooked = allowed dominant methods (omit = served raw), unit = bodies per "one"
// tier = first restaurant that serves it (0 Sunkhaket, 1 Kvarterskrogen, 2 Storköket, 3 Stjärnkrogen), lvl = chef level needed
const PAN = ['fry', 'grill', 'bake'], ANY = ['fry', 'grill', 'boil', 'bake', 'deepfry'];
export const RECIPES = [
  // ---------------- tier 0: Sunkhaket
  { id: 'friesketchup', n: ['Pommes med ketchup', 'Fries & ketchup'], icon: '🍟', price: 70, patience: 150, w: 2, tier: 0, lvl: 1,
    req: [{ k: 'fry', n: 6, cooked: ['deepfry'] }, { k: 'ketchupblob', n: 2 }] },
  { id: 'sausagefries', n: ['Korv med pommes', 'Sausage & fries'], icon: '🌭', price: 110, patience: 180, w: 3, tier: 0, lvl: 1,
    req: [{ k: 'sausage', n: 2, cooked: ANY }, { k: 'fry', n: 5, cooked: ['deepfry'] }] },
  { id: 'hotdog', n: ['Varmkorv', 'Hot dog'], icon: '🌭', price: 90, patience: 150, w: 3, tier: 0, lvl: 1,
    req: [{ k: 'hotdogbun', n: 1 }, { k: 'sausage', n: 1, cooked: ANY }, { k: 'ketchupblob', n: 1 }, { k: 'mustardblob', n: 1 }] },
  { id: 'breakfast', n: ['Ägg & korv', 'Eggs & sausage'], icon: '🍳', price: 110, patience: 170, w: 2, tier: 0, lvl: 2,
    req: [{ k: 'eggblob', n: 2, cooked: ['fry', 'bake'] }, { k: 'sausage', n: 1, cooked: ANY }] },
  { id: 'burger', n: ['Hamburgare', 'Burger'], icon: '🍔', price: 160, patience: 210, w: 3, tier: 0, lvl: 2,
    req: [{ k: 'bunbottom', n: 1 }, { k: 'patty', n: 1, cooked: PAN }, { k: 'cheeseslice', n: 1 }, { k: 'lettuceleaf', n: 1 }, { k: 'tomatoslice', n: 1 }, { k: 'buntop', n: 1 }] },
  { id: 'salad', n: ['Sallad', 'Salad'], icon: '🥗', price: 90, patience: 150, w: 2, tier: 0, lvl: 3,
    req: [{ k: 'lettuceleaf', n: 3 }, { k: 'tomatoslice', n: 2 }, { k: 'cucumberslice', n: 3 }] },
  { id: 'fishchips', n: ['Fish & chips', 'Fish & chips'], icon: '🐟', price: 140, patience: 190, w: 3, tier: 0, lvl: 3,
    req: [{ k: 'fish', n: 1, cooked: ['deepfry', 'fry'] }, { k: 'fry', n: 5, cooked: ['deepfry'] }] },
  { id: 'steakfries', n: ['Biff med pommes', 'Steak & fries'], icon: '🥩', price: 150, patience: 210, w: 3, tier: 0, lvl: 4,
    req: [{ k: 'steak', n: 1, cooked: PAN }, { k: 'fry', n: 6, cooked: ['deepfry'] }] },
  { id: 'onionrings', n: ['Lökringar', 'Onion rings'], icon: '🧅', price: 80, patience: 150, w: 1, tier: 0, lvl: 4,
    req: [{ k: 'onionring', n: 5, cooked: ['deepfry'] }] },
  { id: 'baconeggs', n: ['Bacon & ägg med toast', 'Bacon, eggs & toast'], icon: '🥓', price: 140, patience: 190, w: 2, tier: 0, lvl: 5,
    req: [{ k: 'bacon', n: 3, cooked: PAN }, { k: 'eggblob', n: 2, cooked: ['fry', 'bake'] }, { k: 'breadslice', n: 1, cooked: ['fry', 'bake'] }] },
  { id: 'grilledcheese', n: ['Varm ostmacka', 'Grilled cheese'], icon: '🥪', price: 100, patience: 160, w: 2, tier: 0, lvl: 5,
    req: [{ k: 'breadslice', n: 2, cooked: ['fry', 'bake'] }, { k: 'cheeseslice', n: 2 }] },
  { id: 'nuggets', n: ['Nuggets med pommes', 'Nuggets & fries'], icon: '🍗', price: 130, patience: 180, w: 2, tier: 0, lvl: 6,
    req: [{ k: 'nugget', n: 5, cooked: ['deepfry', 'bake'] }, { k: 'fry', n: 5, cooked: ['deepfry'] }] },
  // ---------------- tier 1: Kvarterskrogen
  { id: 'spaghetti', n: ['Spaghetti med tomatsås', 'Spaghetti & tomato sauce'], icon: '🍝', price: 150, patience: 220, w: 3, tier: 1, lvl: 4,
    req: [{ k: 'noodle', n: 3, unit: 4, cooked: ['boil'] }, { k: 'sauce', n: 3 }] },
  { id: 'meatballmash', n: ['Köttbullar med potatismos', 'Meatballs & mash'], icon: '🧆', price: 170, patience: 230, w: 3, tier: 1, lvl: 5,
    req: [{ k: 'meatball', n: 5, cooked: PAN }, { k: 'mash', n: 4 }] },
  { id: 'pancakes', n: ['Pannkakor med sylt', 'Pancakes & jam'], icon: '🥞', price: 120, patience: 180, w: 3, tier: 1, lvl: 5,
    req: [{ k: 'pancake', n: 3, cooked: ['fry'] }, { k: 'jamblob', n: 2 }] },
  { id: 'chicken', n: ['Ugnskyckling med potatis', 'Roast chicken & potatoes'], icon: '🍗', price: 170, patience: 240, w: 2, tier: 1, lvl: 6,
    req: [{ k: 'chicken', n: 1, cooked: ['bake', 'deepfry'] }, { k: 'potato', n: 2, cooked: ['boil', 'bake'] }] },
  { id: 'carrots', n: ['Fisk med kokta morötter', 'Fish & boiled carrots'], icon: '🥕', price: 140, patience: 210, w: 1, tier: 1, lvl: 6,
    req: [{ k: 'fish', n: 1, cooked: ['fry', 'bake', 'deepfry'] }, { k: 'carrotcoin', n: 4, cooked: ['boil'] }] },
  { id: 'fishfingers', n: ['Fiskpinnar med mos', 'Fish fingers & mash'], icon: '🐠', price: 150, patience: 210, w: 2, tier: 1, lvl: 7,
    req: [{ k: 'fishfinger', n: 4, cooked: ['deepfry', 'fry', 'bake'] }, { k: 'mash', n: 3 }] },
  { id: 'tomatosoup', n: ['Tomatsoppa med bröd', 'Tomato soup & bread'], icon: '🍅', price: 130, patience: 200, w: 2, tier: 1, lvl: 7,
    req: [{ k: 'sauce', n: 6, cooked: ['fry', 'boil', 'bake'] }, { k: 'breadslice', n: 1 }] },
  { id: 'meatballpasta', n: ['Spaghetti & köttbullar', 'Spaghetti & meatballs'], icon: '🍝', price: 190, patience: 250, w: 2, tier: 1, lvl: 8,
    req: [{ k: 'noodle', n: 3, unit: 4, cooked: ['boil'] }, { k: 'meatball', n: 4, cooked: PAN }, { k: 'sauce', n: 2 }] },
  { id: 'doubleburger', n: ['Dubbel ostburgare', 'Double cheeseburger'], icon: '🍔', price: 200, patience: 230, w: 2, tier: 1, lvl: 8,
    req: [{ k: 'bunbottom', n: 1 }, { k: 'patty', n: 2, cooked: PAN }, { k: 'cheeseslice', n: 2 }, { k: 'buntop', n: 1 }] },
  { id: 'pizza', n: ['Pizza Margherita', 'Pizza Margherita'], icon: '🍕', price: 180, patience: 260, w: 3, tier: 1, lvl: 9,
    req: [{ k: 'pizza', n: 1, cooked: ['bake'] }] },
  // ---------------- tier 2: Storköket
  { id: 'baconburger', n: ['Baconburgare', 'Bacon burger'], icon: '🥓', price: 210, patience: 230, w: 2, tier: 2, lvl: 9,
    req: [{ k: 'bunbottom', n: 1 }, { k: 'patty', n: 1, cooked: PAN }, { k: 'bacon', n: 2, cooked: PAN }, { k: 'cheeseslice', n: 1 }, { k: 'buntop', n: 1 }] },
  { id: 'schnitzel', n: ['Schnitzel med citron', 'Schnitzel & lemon'], icon: '🍋', price: 200, patience: 240, w: 2, tier: 2, lvl: 10,
    req: [{ k: 'schnitzel', n: 1, cooked: ['fry', 'deepfry', 'bake'] }, { k: 'lemonslice', n: 1 }, { k: 'fry', n: 5, cooked: ['deepfry'] }] },
  { id: 'pizzafunghi', n: ['Pizza Funghi', 'Pizza Funghi'], icon: '🍄', price: 210, patience: 270, w: 2, tier: 2, lvl: 10,
    req: [{ k: 'pizzafunghi', n: 1, cooked: ['bake'] }] },
  { id: 'pizzasalami', n: ['Pizza Salami', 'Pizza Salami'], icon: '🍕', price: 210, patience: 270, w: 2, tier: 2, lvl: 11,
    req: [{ k: 'pizzasalami', n: 1, cooked: ['bake'] }] },
  { id: 'mushroompasta', n: ['Pasta med stekt svamp', 'Mushroom pasta'], icon: '🍄', price: 180, patience: 240, w: 2, tier: 2, lvl: 11,
    req: [{ k: 'noodle', n: 3, unit: 4, cooked: ['boil'] }, { k: 'mushroomslice', n: 4, cooked: ['fry', 'bake'] }, { k: 'gratedcheese', n: 2 }] },
  { id: 'cornchicken', n: ['Kyckling med majskolv', 'Chicken & corn cob'], icon: '🌽', price: 190, patience: 250, w: 2, tier: 2, lvl: 12,
    req: [{ k: 'chicken', n: 1, cooked: ['bake', 'deepfry'] }, { k: 'corn', n: 1, cooked: ['boil', 'fry', 'bake', 'grill'] }] },
  { id: 'steakbroccoli', n: ['Biff med broccoli & potatis', 'Steak, broccoli & potatoes'], icon: '🥦', price: 220, patience: 260, w: 2, tier: 2, lvl: 12,
    req: [{ k: 'steak', n: 1, cooked: PAN }, { k: 'broccoli', n: 2, cooked: ['boil', 'fry'] }, { k: 'potato', n: 2, cooked: ['boil', 'bake'] }] },
  // ---------------- tier 3: Stjärnkrogen
  { id: 'salmonrice', n: ['Lax med ris & citron', 'Salmon, rice & lemon'], icon: '🍣', price: 240, patience: 260, w: 3, tier: 3, lvl: 13,
    req: [{ k: 'salmon', n: 1, cooked: PAN }, { k: 'rice', n: 5, cooked: ['boil'] }, { k: 'lemonslice', n: 1 }] },
  { id: 'shrimprice', n: ['Räkor med ris & paprika', 'Shrimp, rice & peppers'], icon: '🍤', price: 250, patience: 260, w: 2, tier: 3, lvl: 14,
    req: [{ k: 'shrimp', n: 5, cooked: ['fry', 'boil', 'deepfry'] }, { k: 'rice', n: 5, cooked: ['boil'] }, { k: 'paprikastrip', n: 2 }] },
  { id: 'shrimpsalad', n: ['Räksallad', 'Shrimp salad'], icon: '🥗', price: 200, patience: 220, w: 2, tier: 3, lvl: 14,
    req: [{ k: 'lettuceleaf', n: 3 }, { k: 'shrimp', n: 4, cooked: ['boil', 'fry'] }, { k: 'cucumberslice', n: 2 }, { k: 'lemonslice', n: 1 }] },
  { id: 'shrimptoast', n: ['Räkmacka', 'Shrimp toast'], icon: '🍞', price: 190, patience: 210, w: 2, tier: 3, lvl: 15,
    req: [{ k: 'breadslice', n: 1, cooked: ['fry', 'bake'] }, { k: 'shrimp', n: 4, cooked: ['boil', 'fry'] }, { k: 'lettuceleaf', n: 1 }, { k: 'lemonslice', n: 1 }] },
  { id: 'vegwok', n: ['Grönsakswok', 'Veggie wok'], icon: '🥢', price: 210, patience: 240, w: 2, tier: 3, lvl: 15,
    req: [{ k: 'paprikastrip', n: 3, cooked: ['fry'] }, { k: 'carrotcoin', n: 3, cooked: ['fry', 'boil'] }, { k: 'broccoli', n: 2, cooked: ['fry', 'boil'] }, { k: 'mushroomslice', n: 2, cooked: ['fry'] }] },
  { id: 'surfturf', n: ['Biff & räkor de luxe', 'Surf & turf de luxe'], icon: '🦐', price: 320, patience: 280, w: 2, tier: 3, lvl: 16,
    req: [{ k: 'steak', n: 1, cooked: PAN }, { k: 'shrimp', n: 3, cooked: ['boil', 'fry'] }, { k: 'broccoli', n: 2, cooked: ['boil', 'fry'] }, { k: 'lemonslice', n: 1 }] },
];
export const menuFor = (tier, lvl, only) => RECIPES.filter(r => (only ? only.includes(r.id) : r.tier <= tier) && r.lvl <= lvl);
export const RECIPE_BY_ID = Object.fromEntries(RECIPES.map(r => [r.id, r]));
const METHOD_NAME = { fry: ['stekt', 'fried'], grill: ['grillad', 'grilled'], bake: ['ugnsbakad', 'baked'], boil: ['kokt', 'boiled'], deepfry: ['friterad', 'deep-fried'] };
export function describeReq(q, lang) {
  const i = lang === 'en' ? 1 : 0, def = ITEMS[q.k];
  const name = (q.cooked && def.cookedName ? def.cookedName : def.n)[i];
  const how = q.cooked ? ' (' + q.cooked.slice(0, 2).map(m => METHOD_NAME[m][i]).join('/') + ')' : '';
  return `${q.n}× ${name}${how}`;
}

const GARNISH = new Set(['ketchupblob', 'mustardblob', 'jamblob', 'lemonslice', 'gratedcheese', 'sauce']);
// judge a set of food ents against a recipe
export function judge(contents, recipe) {
  const used = new Set(); let quality = 0, qn = 0; const missing = [];
  for (const q of recipe.req) {
    const unit = q.unit || 1; let have = 0, raw = 0, burnt = 0, wrong = 0;
    for (const e of contents) {
      if (e.kind !== q.k || used.has(e)) continue;
      const lo = Math.min(e.cookA, e.cookB), hi = Math.max(e.cookA, e.cookB);
      if (hi >= COOK.burnt) { burnt++; continue; }
      if (q.cooked) { if (lo < 0.82) { raw++; continue; } if (!q.cooked.includes(METHODS[e.method])) { wrong++; continue; } }
      if (have >= q.n * unit) break;
      used.add(e); have++;
      quality += !q.cooked ? 1 : hi <= COOK.perfectMax && lo >= COOK.done ? 1 : lo < COOK.done ? 0.7 : 0.55; qn++;
    }
    const got = Math.floor(have / unit);
    if (got < q.n) missing.push([q.k, got, q.n, Math.floor(raw / unit), Math.floor(burnt / unit), Math.floor(wrong / unit)]);
  }
  let junk = 0; for (const e of contents) if (!used.has(e) && e.kind !== 'noodle' && !GARNISH.has(e.kind)) junk++;
  return { ok: missing.length === 0, missing, quality: qn ? quality / qn : 0, junk };
}

const inZone = (p, z) => p.x > z.min[0] && p.x < z.max[0] && p.y > z.min[1] && p.y < z.max[1] && p.z > z.min[2] && p.z < z.max[2];

export class Service {
  constructor(sim, K, hooks) {
    this.sim = sim; this.K = K; this.hooks = hooks;
    this.running = false; this.timeLeft = 0; this.coins = 0; this.served = 0; this.failed = 0; this.orders = []; this.nextOrder = 1; this.orderT = 0;
    this.labels = []; this.result = null; this.resultT = 0; this.players = 1; this.evalT = 0; this.leverArmed = true; this.dirty = true; this.best = 0;
    this.menu = RECIPES; this.mods = { patience: 1, pay: 1, interval: 1, maxOpen: 0, stars: 1 }; this.day = 1;
    this.waiters = []; this.resultN = 0; this.deliveries = []; this.phoneArmed = true;
    this.truck = !!(K.rest && K.rest.truck); this.term = null; this.payOrder = null;
    const R = sim.R;
    K.waiterIdle.slice(0, 3).forEach((p, i) => {
      const body = sim.world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(p[0], 0.9, p[1]));
      const col = sim.world.createCollider(R.ColliderDesc.capsule(0.55, 0.3).setCollisionGroups(GROUPS.npc).setActiveEvents(R.ActiveEvents.COLLISION_EVENTS), body);
      const w = { id: i, pos: new THREE.Vector3(p[0], 0, p[1]), yaw: Math.PI, home: p, path: [], state: 'idle', order: null, plate: null, carry: false, shock: 0, body, moving: false };
      sim.colOwner.set(col.handle, { npc: w }); this.waiters.push(w);
    });
    sim.hooks.npcHit = (w, ent) => { if (w.shock <= 0) { w.shock = 1.6; sim.sfxBudget++; sim.sfx('angry', w.pos, 1, 1.2); if (this.running) { this.coins = Math.max(0, this.coins - 5); this.dirty = true; hooks.toast?.('hitwaiter', -5); } } };
  }
  start(players) {
    this.running = true; this.players = Math.max(1, players); this.timeLeft = SERVICE.duration; this.coins = 0; this.served = 0; this.failed = 0;
    this.orders = []; this.orderT = SERVICE.firstOrderDelay; this.result = null; this.dirty = true;
    this.hooks.sfx?.('ding'); this.hooks.toast?.('start');
  }
  stop() {
    this.running = false;
    const base = (0.55 + 0.45 * this.players) * this.mods.stars, th = [260 * base, 560 * base, 900 * base];
    this.result = { coins: this.coins, served: this.served, failed: this.failed, stars: th.filter(t => this.coins >= t).length, th: th.map(Math.round), n: ++this.resultN };
    this.hooks.result?.(this.result);
    this.best = Math.max(this.best, this.coins);
    for (const o of this.orders) if (o.st === 'open') o.st = 'gone';
    this.orders = this.orders.filter(o => o.st !== 'gone'); this.resultT = SERVICE.resultTime; this.dirty = true;
    this.hooks.sfx?.(this.result.stars > 0 ? 'success' : 'fail');
  }
  newOrder() {
    const busy = new Set(this.orders.map(o => o.table));
    const free = this.K.tables.map((t, i) => i).filter(i => this.K.tables[i].order && !busy.has(i));
    if (!free.length) return;
    const table = free[Math.floor(Math.random() * free.length)];
    const last = this.orders.length ? this.orders[this.orders.length - 1].r : null;
    const menu = this.menu.length > 1 ? this.menu.filter(r => r.id !== last) : this.menu;
    let total = 0; for (const r of menu) total += r.w;
    let x = Math.random() * total, rec = menu[0];
    for (const r of menu) { x -= r.w; if (x <= 0) { rec = r; break; } }
    const T = rec.patience * (this.players <= 2 ? 1.25 : 1) * this.mods.patience;
    this.orders.push({ id: this.nextOrder++, r: rec.id, table, t: T, T, st: 'open' });
    this.dirty = true; this.hooks.sfx?.('ticket'); this.hooks.toast?.('order', rec.id);
  }
  update(dt) {
    const sim = this.sim, K = this.K;
    // the big lever starts a shift
    const lever = sim.fixtures.get(K.lever);
    if (lever.value > 0.8 && this.leverArmed && !this.running && !this.result) { this.leverArmed = false; sim.sfxBudget++; sim.sfx('lever', lever.pos, 1); this.start(sim.players.size); }
    if (lever.value < 0.3) this.leverArmed = true;
    // lifting the wall phone's handset opens the order menu for whoever lifted it
    const ph = K.phone && sim.fixtures.get(K.phone);
    if (ph) { if (ph.value > 0.6 && this.phoneArmed && ph.heldBy) { this.phoneArmed = false; sim.sfxBudget++; sim.sfx('ding', ph.pos, 0.5, 1.7); this.hooks.shop?.(ph.heldBy.p.id); } if (ph.value < 0.25) this.phoneArmed = true; }
    for (const fx of sim.presses.splice(0)) this.keyPress(fx);
    for (const d of this.deliveries) { d.t -= dt; if (d.t <= 0 && !d.crate) this.dropCrate(d); else if (d.crate && d.t <= -0.9) this.fillCrate(d); }
    this.deliveries = this.deliveries.filter(d => !d.filled);
    if (this.result) { this.resultT -= dt; if (this.resultT <= 0) { this.result = null; this.dirty = true; } }

    if (this.running) {
      this.timeLeft -= dt;
      this.orderT -= dt;
      const open = this.orders.filter(o => o.st === 'open').length, maxOpen = Math.min(this.K.tables.filter(t => t.order).length, Math.floor(SERVICE.maxOpenBase + SERVICE.maxOpenPerPlayer * this.players) + this.mods.maxOpen);
      if (this.orderT <= 0 && open < maxOpen && this.timeLeft > 25) {
        this.newOrder();
        this.orderT = Math.max(SERVICE.orderIntervalMin, SERVICE.orderIntervalBase - SERVICE.orderIntervalPerPlayer * this.players) * (0.8 + Math.random() * 0.4) * this.mods.interval;
      }
      for (const o of this.orders) {
        if (o.st !== 'open') continue;
        o.t -= dt;
        if (o.t <= 0) { o.st = 'gone'; this.failed++; this.coins = Math.max(0, this.coins - 30); this.dirty = true; this.hooks.sfx?.('fail'); this.hooks.toast?.('timeout', o.r); this.hooks.mood?.(o.table, -1); }
      }
      this.orders = this.orders.filter(o => o.st !== 'gone');
      if (this.timeLeft <= 0 && !this.orders.some(o => o.st === 'plated' || o.st === 'carried')) this.stop();
      else if (this.timeLeft <= -30) this.stop();
    }
    // judge plates standing on the pass
    this.evalT -= dt;
    if (this.evalT <= 0) { this.evalT = 0.5; this.judgePass(); }
    this.updateWaiters(dt);
  }
  // ---- paying at the hatch: cash with change, or a card terminal you type the amount into
  keyPress(fx) {
    const t = this.term; if (!t || fx.key === undefined) return;
    if (fx.key === 'C') t.typed = 0;
    else if (fx.key === 'OK') {
      if (t.typed === t.want) { t.ok = 0.9; this.hooks.sfx?.('ding'); } else { t.bad = 1.2; t.typed = 0; this.hooks.sfx?.('fail'); }
    } else t.typed = Math.min(9990, t.typed + fx.key);
    this.dirty = true;
  }
  tender(owed, exact) {
    if (exact) { const out = []; let left = owed; for (const [k, v] of [['note500', 500], ['note200', 200], ['note100', 100], ['note50', 50], ['coin10', 10]]) while (left >= v) { out.push(k); left -= v; } return out; }
    for (const [k, v] of [['note50', 50], ['note100', 100], ['note200', 200], ['note500', 500]]) if (v >= owed) return [k];
    return ['note500'];
  }
  moneyNear(x) {
    const P = this.K.pass, out = []; let sum = 0;
    for (const e of this.sim.ents.values()) {
      if (e.fixture || !e.def || !e.def.money || e.heldBy || e.dead || e.tender) continue;
      if (Math.abs(e.pos.x - x) > 0.5 || e.pos.y < P.topY - 0.05 || e.pos.y > P.topY + 0.4) continue;
      if (e.pos.z < P.zone.min[2] - 0.15 || e.pos.z > P.zone.max[2] + 0.15) continue;
      out.push(e); sum += e.def.money;
    }
    return { items: out, sum };
  }
  payStep(w, o, dt) {
    const sim = this.sim, K = this.K, rec = RECIPE_BY_ID[o.r];
    if (!o.owed) {
      const j = o.judge;
      o.owed = Math.max(10, Math.round((rec.price * (0.55 + 0.45 * j.quality) + rec.price * 0.35 * o.frac - j.junk * 8) * this.mods.pay / 10) * 10);
      o.card = (o.id % 5) >= 3;
      if (o.card) { this.term = { want: o.owed, typed: 0, ok: 0, bad: 0 }; this.payOrder = o; }
      else {
        const notes = this.tender(o.owed, o.id % 3 === 0);
        o.tendered = 0;
        notes.forEach((k, i) => { const e = sim.spawn(k, [w.pos.x - 0.12 + i * 0.1, K.pass.topY + 0.3, K.pass.zone.min[2] + 0.18], null, { v: [0, -0.3, 0.5] }); if (e) { e.tender = true; o.tendered += e.def.money; } });
        this.payOrder = o;
        this.hooks.sfx?.('coin');
      }
      this.dirty = true;
    }
    o.payT = (o.payT || 0) + dt;
    if (o.card) {
      const t = this.term;
      if (t && t.ok > 0) { t.ok -= dt; if (t.ok <= 0) { o.paid = true; this.term = null; this.payOrder = null; this.coins += o.owed; this.dirty = true; sim.sfxBudget++; sim.sfx('coin', w.pos, 0.9); } }
      if (t && t.bad > 0) t.bad -= dt;
    } else {
      const need = o.tendered - o.owed;
      if (need <= 0) { o.paid = true; this.payOrder = null; this.coins += o.owed; this.dirty = true; }
      else {
        const got = this.moneyNear(w.pos.x);
        if (got.sum >= need) {
          for (const e of got.items) sim.despawn(e);
          this.coins += o.owed - (got.sum - need); this.payOrder = null; o.paid = true; this.dirty = true;
          sim.sfxBudget++; sim.sfx('coin', w.pos, 0.9);
          if (got.sum > need) this.hooks.toast?.('overchange', got.sum - need);
        }
      }
    }
    if (!o.paid && o.payT > 45) {      // gave up waiting: takes the food, pays nothing, and is not happy
      o.paid = true; this.payOrder = null; if (this.term) this.term = null;
      this.hooks.toast?.('nopay'); this.hooks.mood?.(o.table, -1); this.dirty = true;
    }
  }
  // ---- the wholesaler: validate, charge the till during service (free play is free), then a crate arrives
  order(items, pid) {
    if (!this.K.delivery || !items || typeof items !== 'object') return;
    const list = []; let n = 0, cost = 0;
    for (const s of SUPPLY) { const c = Math.max(0, Math.min(SUPPLY_MAX, Math.floor(+items[s.k] || 0))); if (c) { list.push([s.k, c]); n += c; cost += c * s.p; } }
    if (!n || n > SUPPLY_MAX || this.deliveries.length >= 3) { this.hooks.toast?.('supplyfail'); return; }
    if (this.running) { if (cost > this.coins) { this.hooks.toast?.('nomoney', cost); return; } this.coins -= cost; this.dirty = true; } else cost = 0;
    list.sort((a, b) => (ITEMS[b[0]].fragile ? 1 : 0) - (ITEMS[a[0]].fragile ? 1 : 0));   // eggs at the bottom of the crate
    this.deliveries.push({ t: 5, list, n });
    this.hooks.sfx?.('ticket'); this.hooks.toast?.('supply', n, cost);
  }
  dropCrate(d) {
    const sim = this.sim, D = this.K.delivery;
    let busy = 0; for (const e of sim.ents.values()) if (e.kind === 'deliverycrate' && Math.hypot(e.pos.x - D.x, e.pos.z - D.z) < 1.4) busy++;
    d.crate = sim.spawn('deliverycrate', [D.x + busy * 0.7, 0.8, D.z], null);
    sim.sfxBudget += 2; sim.sfx('door', d.crate.pos, 1); sim.hooks.fx?.('poof', [D.x + busy * 0.7, 0.5, D.z]);
    this.hooks.toast?.('delivered');
  }
  fillCrate(d) {
    d.filled = true; const c = d.crate, sim = this.sim; if (!c || c.dead) return;
    let i = 0;
    for (const [k, cnt] of d.list) for (let j = 0; j < cnt; j++, i++) {
      const layer = Math.floor(i / 12), col = i % 4, row = Math.floor(i / 4) % 3, yaw = (i * 2.39) % 6.283;
      sim.spawn(k, [c.pos.x - 0.2 + col * 0.133, c.pos.y + 0.08 + layer * 0.09, c.pos.z - 0.12 + row * 0.12], { x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) });
    }
  }
  judgePass() {
    const sim = this.sim, zone = this.K.pass.zone, labels = [];
    const open = this.orders.filter(o => o.st === 'open');
    for (const c of sim.ents.values()) {
      if (c.fixture || !c.def.container || !c.def.container.serve || c.heldBy || c.locked || !inZone(c.pos, zone)) continue;
      const contents = sim.contentsOf(c); if (!contents.length) continue;
      if (c.up < 0.9 || c.pv.lengthSq() > 0.02) continue;
      let best = null;
      for (const o of open) {
        if (o.claimed) continue;
        const j = judge(contents, RECIPE_BY_ID[o.r]);
        const score = j.missing.reduce((s, m) => s + (m[2] - m[1]), 0);
        if (!best || score < best.score || (score === best.score && o.t < best.o.t)) best = { o, j, score };
      }
      if (!best) { if (this.running) labels.push({ id: c.id, ok: 0, r: null }); continue; }
      if (best.j.ok) {
        const o = best.o; o.st = 'plated'; o.claimed = true; o.plate = c; o.judge = best.j; o.frac = Math.max(0, o.t / o.T);
        c.locked = true; c.body.setBodyType(sim.R.RigidBodyType.Fixed, true);
        for (const e of contents) { e.locked = true; if (e.heldBy) sim.release(e.heldBy.p, e.heldBy.h); e.body.setBodyType(sim.R.RigidBodyType.Fixed, true); }
        o.contents = contents; this.dirty = true;
        sim.sfxBudget++; sim.sfx('ding', c.pos, 1);
        labels.push({ id: c.id, ok: 1, r: o.r });
      } else labels.push({ id: c.id, ok: 0, r: best.o.r, m: best.j.missing });
    }
    for (const o of this.orders) if (o.st === 'plated' && o.plate && !o.plate.dead) labels.push({ id: o.plate.id, ok: 1, r: o.r });
    const key = JSON.stringify(labels); if (key !== this.labelKey) { this.labelKey = key; this.labels = labels; this.dirty = true; }
  }
  pathTo(w, x, z) { const az = -ROOM.hz - 1.75; w.path = [[w.pos.x, az], [x, az], [x, z]]; w.moving = true; }
  updateWaiters(dt) {
    const K = this.K, sim = this.sim;
    for (const o of this.orders) {
      if (o.st !== 'plated' || o.waiter != null) continue;
      let best = null; for (const w of this.waiters) if (w.state === 'idle' && (!best || Math.abs(w.pos.x - o.plate.pos.x) < Math.abs(best.pos.x - o.plate.pos.x))) best = w;
      if (!best) break;
      o.waiter = best.id; best.state = 'fetch'; best.order = o; this.pathTo(best, o.plate.pos.x, K.pass.waiterZ);
    }
    for (const w of this.waiters) {
      w.shock = Math.max(0, w.shock - dt);
      if (w.path.length && w.shock <= 0) {
        const [tx, tz] = w.path[0], dx = tx - w.pos.x, dz = tz - w.pos.z, d = Math.hypot(dx, dz), sp = (w.carry ? 2.3 : 3.0) * dt;
        if (d <= sp) { w.pos.x = tx; w.pos.z = tz; w.path.shift(); }
        else { w.pos.x += dx / d * sp; w.pos.z += dz / d * sp; const ty = Math.atan2(-dx, -dz); let dy = ty - w.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI; w.yaw += dy * Math.min(1, dt * 10); }
        w.moving = w.path.length > 0;
        w.body.setNextKinematicTranslation({ x: w.pos.x, y: 0.9, z: w.pos.z });
      } else w.moving = false;
      if (w.path.length) continue;
      const o = w.order;
      if (w.state === 'fetch' && this.truck && !o.paid && !o.plate.dead) { w.yaw = Math.PI; this.payStep(w, o, dt); continue; }
      if (w.state === 'fetch') {
        w.yaw = Math.PI;   // face the pass (+z)
        const plate = o.plate, inv = plate.rot.clone().invert();
        const items = o.contents.filter(e => !e.dead).map(e => { const p = e.pos.clone().sub(plate.pos).applyQuaternion(inv), q = inv.clone().multiply(e.rot); return [e.kind, +p.x.toFixed(3), +p.y.toFixed(3), +p.z.toFixed(3), +q.x.toFixed(3), +q.y.toFixed(3), +q.z.toFixed(3), +q.w.toFixed(3), e.cookA, e.cookB]; });
        const carry = { w: w.id, plate: plate.kind, items, order: o.id };
        for (const e of o.contents) sim.despawn(e); sim.despawn(plate);
        o.st = 'carried'; o.carry = carry; w.carry = true; w.state = 'deliver'; this.dirty = true;
        this.hooks.carry?.(carry); sim.sfxBudget++; sim.sfx('waiter', w.pos, 0.9);
        const st = K.tables[o.table].stand; this.pathTo(w, st[0], st[2]);
      } else if (w.state === 'deliver') {
        const rec = RECIPE_BY_ID[o.r], j = o.judge;
        const pay = o.owed || Math.max(10, Math.round((rec.price * (0.55 + 0.45 * j.quality) + rec.price * 0.35 * o.frac - j.junk * 8) * this.mods.pay));
        if (!this.truck) this.coins += pay;
        this.served++; o.st = 'gone'; this.orders = this.orders.filter(x => x !== o); this.dirty = true;
        w.carry = false; w.state = 'return'; w.order = null;
        this.hooks.delivered?.({ w: w.id, table: o.table, carry: o.carry, pay, quality: j.quality });
        this.hooks.sfx?.('success'); this.hooks.toast?.('served', rec.id, pay); this.hooks.mood?.(o.table, 1);
        this.pathTo(w, w.home[0], w.home[1]);
      } else if (w.state === 'return') { w.state = 'idle'; w.yaw = Math.PI; }
    }
  }
  state() {
    const o = this.payOrder, pay = !o ? null : o.card ? { card: 1, want: o.want || o.owed, typed: this.term ? this.term.typed : 0, bad: this.term && this.term.bad > 0 ? 1 : 0, ok: this.term && this.term.ok > 0 ? 1 : 0 }
      : { card: 0, owed: o.owed, tendered: o.tendered, change: o.tendered - o.owed, got: this.moneyNear(this.waiters.find(w => w.order === o)?.pos.x ?? 0).sum };
    return { pay, run: this.running ? 1 : 0, time: Math.max(0, Math.ceil(this.timeLeft)), coins: this.coins, served: this.served, failed: this.failed, best: this.best,
      orders: this.orders.map(o => ({ id: o.id, r: o.r, table: o.table, t: Math.round(o.t), T: Math.round(o.T), st: o.st })), labels: this.labels, result: this.result };
  }
}
