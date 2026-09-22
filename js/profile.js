// Kökskaos — the player's career save (localStorage): chef level + XP, wallet, stats, achievements, owned cosmetics,
// equipped look, and per-restaurant progress (stars, days worked, bought upgrades).
import { RESTAURANTS, REST_BY_ID } from './restaurants.js';
import { RECIPES } from './orders.js';

const KEY = 'kokskaos.profile.v1';
export const MAX_LEVEL = 20;
export const xpForLevel = (L) => 150 * (L - 1) * L;            // total xp needed to BE level L

export const ACHIEVEMENTS = [
  { id: 'served50', icon: '🍽️', n: ['Flitig kock', 'Busy chef'], d: ['Servera 50 rätter', 'Serve 50 dishes'], stat: 'served', goal: 50 },
  { id: 'served200', icon: '🏅', n: ['Serveringsmaskin', 'Serving machine'], d: ['Servera 200 rätter', 'Serve 200 dishes'], stat: 'served', goal: 200 },
  { id: 'stars3x5', icon: '🌟', n: ['Stjärnregn', 'Star shower'], d: ['Få tre stjärnor fem gånger', 'Get three stars five times'], stat: 'threeStars', goal: 5 },
  { id: 'bonked25', icon: '🤕', n: ['Hård skalle', 'Thick skull'], d: ['Bli bonkad 25 gånger', 'Get bonked 25 times'], stat: 'bonked', goal: 25 },
  { id: 'thrown200', icon: '🤾', n: ['Kastarm', 'Throwing arm'], d: ['Kasta 200 saker', 'Throw 200 things'], stat: 'thrown', goal: 200 },
  { id: 'coins10000', icon: '💰', n: ['Krösus', 'Moneybags'], d: ['Tjäna 10 000 kr totalt', 'Earn 10,000 kr in total'], stat: 'earned', goal: 10000 },
  { id: 'level10', icon: '🎖️', n: ['Souschef', 'Sous-chef'], d: ['Nå kocknivå 10', 'Reach chef level 10'], stat: 'level', goal: 10 },
  { id: 'level20', icon: '👑', n: ['Köksmästare', 'Master chef'], d: ['Nå kocknivå 20', 'Reach chef level 20'], stat: 'level', goal: 20 },
];

export class Profile {
  constructor() {
    this.d = { v: 1, xp: 0, coins: 0, stats: { served: 0, earned: 0, services: 0, threeStars: 0, bonked: 0, thrown: 0, failed: 0 }, ach: [], owned: { hats: [], outfits: [], aprons: [], faces: [], emotes: [] },
      look: null, rest: {}, sel: 'dump', seen: {} };
    try { const raw = localStorage.getItem(KEY); if (raw) { const o = JSON.parse(raw); if (o && o.v === 1) { Object.assign(this.d.stats, o.stats || {}); Object.assign(this.d.owned, o.owned || {}); delete o.stats; delete o.owned; Object.assign(this.d, o); } } } catch (e) { /* fresh profile */ }
    if (!REST_BY_ID[this.d.sel] || !this.restUnlocked(REST_BY_ID[this.d.sel])) this.d.sel = 'dump';
  }
  save() { try { localStorage.setItem(KEY, JSON.stringify(this.d)); } catch (e) { /* private mode */ } }
  get xp() { return this.d.xp; } get coins() { return this.d.coins; }
  get level() { let L = 1; while (L < MAX_LEVEL && this.d.xp >= xpForLevel(L + 1)) L++; return L; }
  get levelProgress() { const L = this.level; if (L >= MAX_LEVEL) return 1; const a = xpForLevel(L), b = xpForLevel(L + 1); return (this.d.xp - a) / (b - a); }
  stat(name) { return name === 'level' ? this.level : (this.d.stats[name] || 0); }
  hasAch(id) { return this.d.ach.includes(id); }

  // ---- restaurants
  rest(id) { return this.d.rest[id] || (this.d.rest[id] = { stars: 0, days: 0, best: 0, up: {} }); }
  restUnlocked(r) { return !r.unlock || this.rest(r.unlock.rest).stars >= r.unlock.stars; }
  select(id) { if (REST_BY_ID[id] && this.restUnlocked(REST_BY_ID[id])) { this.d.sel = id; this.save(); } }
  buyUpgrade(restId, u) { const rs = this.rest(restId); if (rs.up[u.id] || this.d.coins < u.price) return false; this.d.coins -= u.price; rs.up[u.id] = 1; this.save(); return true; }

  // ---- cosmetics (cat = hats | outfits | aprons | faces | emotes)
  unlocked(item) { return item.ach ? this.hasAch(item.ach) : this.level >= (item.lvl || 1); }
  owns(cat, item) { return this.unlocked(item) && (!item.price || item.ach || this.d.owned[cat].includes(item.id)); }
  buy(cat, item) { if (!this.unlocked(item) || this.owns(cat, item) || this.d.coins < item.price) return false; this.d.coins -= item.price; this.d.owned[cat].push(item.id); this.save(); return true; }

  // ---- a finished service: everyone in the kitchen is credited
  addService(result, restId, tier) {
    const before = this.level, rs = this.rest(restId), st = this.d.stats, wasUnlocked = RESTAURANTS.map(r => this.restUnlocked(r));
    const xp = result.coins + result.stars * 150 + result.served * 10;
    this.d.xp += xp; this.d.coins += result.coins;
    st.served += result.served; st.failed += result.failed; st.earned += result.coins; st.services++; if (result.stars >= 3) st.threeStars++;
    rs.stars += result.stars; rs.days++; rs.best = Math.max(rs.best, result.coins);
    const after = this.level, newAch = this.checkAch();
    const newRecipes = RECIPES.filter(r => r.lvl > before && r.lvl <= after && r.tier <= tier);
    const newRest = RESTAURANTS.filter((r, i) => !wasUnlocked[i] && this.restUnlocked(r));
    this.save();
    return { xp, levelBefore: before, level: after, newRecipes, newAch, newRest, restStars: rs.stars };
  }
  bump(stat, n = 1) { this.d.stats[stat] = (this.d.stats[stat] || 0) + n; const a = this.checkAch(); if (a.length || Math.random() < 0.1) this.save(); return a; }
  checkAch() { const got = []; for (const a of ACHIEVEMENTS) if (!this.hasAch(a.id) && this.stat(a.stat) >= a.goal) { this.d.ach.push(a.id); got.push(a); } return got; }
}
