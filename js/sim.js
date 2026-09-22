// Kökskaos — host-side simulation: every loose object, fixtures (doors/knobs/drawers), the chefs' physical hands,
// heat + cooking, cutting, blending, restocking. Clients never run this; they only render snapshots.
import * as THREE from '../vendor/three.module.js';
import { PHYS_DT, GROUPS, PLAYER, HOLD, COOK, MAX_ITEMS, ROOM } from './config.js';
import { ITEMS, attachColliders, colliderDesc, METHODS } from './items.js';

const V = () => new THREE.Vector3(), Q = () => new THREE.Quaternion();
const _a = V(), _b = V(), _c = V(), _d = V(), _e = V(), _q1 = Q(), _q2 = Q(), _q3 = Q(), _eu = new THREE.Euler();
const AXES = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };
const M = { fry: 1, boil: 2, deepfry: 3, bake: 4, grill: 5 };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const inBox = (p, z) => p.x > z.min[0] && p.x < z.max[0] && p.y > z.min[1] && p.y < z.max[1] && p.z > z.min[2] && p.z < z.max[2];

export class Sim {
  constructor(R, world, hooks) {
    this.R = R; this.world = world; this.hooks = hooks;
    this.events = new R.EventQueue(true);
    this.ents = new Map(); this.fixtures = new Map(); this.players = new Map(); this.colOwner = new Map();
    this.nextId = 1000; this.nextChain = 1; this.tick = 0; this.time = 0; this.anchors = new Map();
    this.K = null; this.itemCount = 0; this.toolCounts = {}; this.rand = Math.random; this.sfxBudget = 0;
    this.removed = []; this.loops = []; this.appDirty = true; this.npcs = new Map();
    this.mods = { heat: 1, fry: 1, oven: 1 }; this.presses = [];
  }

  // ------------------------------------------------------------------ fixtures
  anchorFor(yaw, q) {
    const key = Math.round(yaw * 1000);
    let b = this.anchors.get(key);
    if (!b) { b = this.world.createRigidBody(this.R.RigidBodyDesc.fixed().setRotation(q)); this.anchors.set(key, b); }
    return b;
  }
  addFixture(fx) {
    const R = this.R, axis = AXES[fx.axis];
    const rest = new THREE.Quaternion(fx.q.x, fx.q.y, fx.q.z, fx.q.w), startQ = rest.clone();
    if (fx.start) startQ.multiply(_q1.setFromAxisAngle(axis, fx.start));
    const body = this.world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(fx.wp[0], fx.wp[1], fx.wp[2]).setRotation(startQ)
      .setGravityScale(0).setLinearDamping(0.3).setAngularDamping(0.3).setCanSleep(true));
    for (const c of fx.col) this.world.createCollider(colliderDesc(R, c).setMass(fx.mass / fx.col.length).setFriction(0.6).setRestitution(0.05).setCollisionGroups(GROUPS.fixture), body);
    const c = Math.cos(fx.yaw), s = Math.sin(fx.yaw), a1 = { x: fx.wp[0] * c - fx.wp[2] * s, y: fx.wp[1], z: fx.wp[0] * s + fx.wp[2] * c };
    const ax = { x: axis.x, y: axis.y, z: axis.z }, zero = { x: 0, y: 0, z: 0 };
    const jd = fx.type === 'slide' ? R.JointData.prismatic(a1, zero, ax) : R.JointData.revolute(a1, zero, ax);
    jd.limitsEnabled = true; jd.limits = fx.limits;
    const joint = this.world.createImpulseJoint(jd, this.anchorFor(fx.yaw, fx.q), body, true);
    joint.configureMotorPosition(0, 0, fx.damp ?? 3);
    const ent = { id: fx.id, fixture: fx, kind: fx.type, body, joint, rest, restPos: new THREE.Vector3(...fx.wp), axis, axisW: axis.clone().applyQuaternion(rest),
      angle: fx.start || 0, value: 0, mode: '', heldBy: null, pos: new THREE.Vector3(...fx.wp), rot: startQ.clone(), lastSent: null, bound: 0.3 };
    body.userData = ent;
    this.fixtures.set(fx.id, ent); this.ents.set(fx.id, ent);
    return ent;
  }
  updateFixture(f) {
    const fx = f.fixture, lim = fx.limits;
    if (fx.type === 'slide') f.angle = _a.copy(f.pos).sub(f.restPos).dot(f.axisW);
    else {
      _q1.copy(f.rest).invert().multiply(f.rot);
      f.angle = 2 * Math.atan2(_q1.x * f.axis.x + _q1.y * f.axis.y + _q1.z * f.axis.z, _q1.w);
      if (f.angle > Math.PI) f.angle -= Math.PI * 2; else if (f.angle < -Math.PI) f.angle += Math.PI * 2;
    }
    if (fx.type === 'knob' && (f.angle < lim[0] - 0.15 || f.angle > lim[1] + 0.15)) {      // never past the stops (no full turns)
      const t = f.angle > 1.2 ? lim[0] : clamp(f.angle, lim[0], lim[1]);
      _q1.copy(f.rest).multiply(_q2.setFromAxisAngle(f.axis, t)); f.body.setRotation({ x: _q1.x, y: _q1.y, z: _q1.z, w: _q1.w }, true);
      f.body.setAngvel({ x: 0, y: 0, z: 0 }, true); f.angle = t; f.rot.copy(_q1);
    }
    // "value": 0 at rest end, 1 at the far end of the travel
    const far = Math.abs(lim[0]) > Math.abs(lim[1]) ? lim[0] : lim[1];
    f.value = fx.bistable ? (f.angle > 0.15 ? 1 : 0) : clamp(f.angle / far, 0, 1);
    let mode = 'free', target = 0, k = 0;
    if (fx.spring) { mode = 'spring'; target = fx.spring.to; k = fx.spring.k; }
    else if (fx.bistable) { mode = f.angle > 0 ? 'b' : 'a'; target = f.angle > 0 ? fx.bistable.b : fx.bistable.a; k = fx.bistable.k; }
    else if (fx.latch && Math.abs(f.angle - fx.latch.to) < Math.abs(fx.latch.at - fx.latch.to) && !f.heldBy) { mode = 'latch'; target = fx.latch.to; k = fx.latch.k; }
    if (mode !== f.mode) {
      f.joint.configureMotorPosition(target, k, fx.damp ?? 3);
      if (f.mode && (mode === 'a' || mode === 'b')) this.sfx('click', f.pos, 0.8);
      if (f.mode === 'free' && mode === 'latch') this.sfx('door', f.pos, 0.7);
      f.mode = mode; f.body.wakeUp();
    }
  }

  // ------------------------------------------------------------------ items
  spawn(kind, p, q, opts) {
    const def = ITEMS[kind]; if (!def) return null; opts = opts || {};
    const R = this.R, id = opts.id || this.nextId++;
    const desc = R.RigidBodyDesc.dynamic().setTranslation(p[0], p[1], p[2]).setLinearDamping(def.linDamp ?? 0.1).setAngularDamping(def.angDamp ?? 0.5).setCcdEnabled(true).setCanSleep(true);
    if (q) desc.setRotation(q);
    const body = this.world.createRigidBody(desc);
    const { cols, blades } = attachColliders(R, this.world, body, def, GROUPS.item);
    const ent = { id, kind, def, body, cols, cookA: opts.cookA || 0, cookB: opts.cookB || 0, by: opts.by ? { ...opts.by } : {}, method: opts.method || 0,
      water: 0, temp: 0, heat: 0, heldBy: null, chain: opts.chain || 0, inC: null, floorT: 0, trashT: 0, blendT: 0, dirty: true, locked: false,
      pos: new THREE.Vector3(p[0], p[1], p[2]), rot: q ? new THREE.Quaternion(q.x, q.y, q.z, q.w) : new THREE.Quaternion(), pv: new THREE.Vector3(), lastSent: null,
      sfxT: 0, cutT: 0, bound: def.bound, home: opts.home || null, age: 0, fxT: 0 };
    body.userData = ent;
    // events: first collider of everything (impacts), blades and fragile always
    cols[0].setActiveEvents(R.ActiveEvents.COLLISION_EVENTS);
    for (const c of cols) this.colOwner.set(c.handle, ent);
    ent.blades = new Set(blades);
    if (opts.v) body.setLinvel({ x: opts.v[0], y: opts.v[1], z: opts.v[2] }, true);
    if (opts.w) body.setAngvel({ x: opts.w[0], y: opts.w[1], z: opts.w[2] }, true);
    this.ents.set(id, ent); this.itemCount++;
    this.hooks.spawn?.(ent);
    return ent;
  }
  despawn(ent, fx) {
    if (!this.ents.has(ent.id) || ent.fixture) return;
    if (ent.heldBy) this.unhold(ent);
    for (const c of ent.cols) this.colOwner.delete(c.handle);
    this.world.removeRigidBody(ent.body);
    this.ents.delete(ent.id); this.itemCount--; ent.dead = true;
    if (fx) this.hooks.fx?.(fx, [ent.pos.x, ent.pos.y, ent.pos.z]);
    this.hooks.despawn?.(ent.id);
  }
  spawnNoodle(p, dir, cook, v) {   // floppy strand = chain of ball-jointed capsules
    const def = ITEMS.noodle, n = def.chainLen, L = def.segLen, chain = this.nextChain++, R = this.R;
    _q1.setFromUnitVectors(AXES.x, _a.copy(dir).normalize());
    const q = { x: _q1.x, y: _q1.y, z: _q1.z, w: _q1.w };
    let prev = null;
    for (let i = 0; i < n; i++) {
      const o = (i - (n - 1) / 2) * L;
      const e = this.spawn('noodle', [p.x + dir.x * o, p.y + dir.y * o, p.z + dir.z * o], q, { chain, cookA: cook, cookB: cook, by: { boil: cook }, method: M.boil, v });
      if (!e) break;
      if (prev) {
        const j = this.world.createImpulseJoint(R.JointData.spherical({ x: L / 2, y: 0, z: 0 }, { x: -L / 2, y: 0, z: 0 }), prev.body, e.body, true);
        j.setContactsEnabled(false);
      }
      prev = e;
    }
  }
  setGroups(ent, g) { for (const c of ent.cols) c.setCollisionGroups(g); }
  sfx(name, pos, vol = 1, pitch = 1) { if (this.sfxBudget > 0) { this.sfxBudget--; this.hooks.sfx?.(name, [pos.x, pos.y, pos.z], vol, pitch); } }

  // ------------------------------------------------------------------ world setup from the kitchen descriptor
  populate(K) {
    this.K = K;
    for (const t of K.tools) {
      const e = this.spawn(t.kind, t.p, this.toolQuat(t), { home: t.home ? t : null });
      if (t.home) this.toolCounts[t.kind] = (this.toolCounts[t.kind] || 0) + 1;
      if (e && t.kind === 'plate') e.body.sleep();        // stacks stay put until somebody touches them
    }
    for (const s of K.stock) { s.t = 0; for (let i = 0; i < s.n; i++) this.stockSpawn(s); }
    for (const b of K.burners) b.level = 0;
    for (const o of K.ovens) { o.temp = 0; o.open = false; o.on = false; }
    for (const f of K.fryers) { f.temp = 0; f.on = false; }
    for (const t of K.taps) t.flow = 0;
    for (const b of K.blenders) b.on = false;
  }
  toolQuat(t) { return t.q || { x: 0, y: Math.sin(t.yaw / 2), z: 0, w: Math.cos(t.yaw / 2) }; }
  stockSpawn(s) {
    if (this.itemCount >= MAX_ITEMS) return;
    const p = s.spawn(this.rand), yaw = s.yaw ? (this.K ? Math.PI / 2 : 0) : this.rand() * 6.28;
    this.spawn(s.kind, p, { x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) });
  }

  // ------------------------------------------------------------------ players & hands
  addPlayer(id, info) {
    const R = this.R, sp = info.pos || [0, 0, 0];
    const body = this.world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(sp[0], sp[1] + PLAYER.halfHeight + PLAYER.radius, sp[2]));
    const col = this.world.createCollider(R.ColliderDesc.capsule(PLAYER.halfHeight, PLAYER.radius).setCollisionGroups(GROUPS.player).setFriction(0.2)
      .setActiveEvents(R.ActiveEvents.COLLISION_EVENTS), body);
    const hand = () => ({ ent: null, local: V(), relPos: V(), relRot: Q(), reach: PLAYER.reachDefault, off0: 0, stuck: 0, tryT: 0, lat: 0, pos: V(), was: false, extra: [] });
    const p = { id, body, col, pos: new THREE.Vector3(sp[0], sp[1], sp[2]), yaw: 0, pitch: 0, crouch: false, grip: [false, false], reachOff: 0, wristP: 0, wristR: 0,
      hands: [hand(), hand()], bonkT: 0, name: info.name, color: info.color };
    body.userData = { player: p }; this.colOwner.set(col.handle, { player: p });
    this.players.set(id, p);
    return p;
  }
  removePlayer(id) {
    const p = this.players.get(id); if (!p) return;
    this.release(p, 0); this.release(p, 1);
    this.colOwner.delete(p.col.handle); this.world.removeRigidBody(p.body); this.players.delete(id);
  }
  setInput(id, i) {
    const p = this.players.get(id); if (!p) return;
    p.pos.set(i.x, i.y, i.z); p.yaw = i.yaw; p.pitch = i.pitch; p.crouch = i.crouch; p.grip[0] = i.gripL; p.grip[1] = i.gripR;
    p.reachOff = i.reachOff; p.wristP = i.wristP; p.wristR = i.wristR;
  }
  eyeOf(p, out) { return out.set(p.pos.x, p.pos.y + (p.crouch ? PLAYER.eyeCrouch : PLAYER.eye), p.pos.z); }
  dirOf(p, out) { const cp = Math.cos(p.pitch); return out.set(-Math.sin(p.yaw) * cp, Math.sin(p.pitch), -Math.cos(p.yaw) * cp); }
  handQuat(p, out) { _eu.set(p.wristP, p.yaw, p.wristR, 'YXZ'); return out.setFromEuler(_eu); }
  // the hand sits `reach` metres straight ahead (horizontally); pitch sets its height. Looking down = a straight chop, not an arc.
  handPos(p, reach, out) { const eyeY = p.pos.y + (p.crouch ? PLAYER.eyeCrouch : PLAYER.eye); return out.set(p.pos.x - Math.sin(p.yaw) * reach, Math.max(0.04, eyeY + reach * Math.tan(clamp(p.pitch, -1.15, 1.15))), p.pos.z - Math.cos(p.yaw) * reach); }

  rayHit(eye, dir, p, max) {
    const hit = this.world.castRay(new this.R.Ray(eye, dir), max, true, 0, GROUPS.qGrab, undefined, p.body, (col) => {
      const b = col.parent(), u = b && b.userData; return !(u && u.heldBy && u.heldBy.p === p && !u.fixture);
    });
    if (!hit) return null;
    const body = hit.collider.parent();
    return { t: hit.timeOfImpact ?? hit.toi, ent: body && body.userData && body.userData.id ? body.userData : null };
  }
  tryGrab(p, h) {
    const eye = this.eyeOf(p, _a), dir = this.dirOf(p, _b), hand = p.hands[h];
    let best = this.rayHit(eye, dir, p, PLAYER.grabRange);
    if (!best || !best.ent) {               // forgiving aim: a small cone of extra rays
      const limit = best ? best.t + 0.08 : PLAYER.grabRange;
      _c.set(Math.cos(p.yaw), 0, -Math.sin(p.yaw)); _d.crossVectors(_c, dir).normalize();
      let found = null;
      for (const ang of [0.035, 0.075, 0.12]) {
        for (let k = 0; k < 8; k++) {
          const a = k / 8 * Math.PI * 2 + ang * 20;
          _e.copy(dir).addScaledVector(_c, Math.cos(a) * ang).addScaledVector(_d, Math.sin(a) * ang).normalize();
          const r = this.rayHit(eye, _e, p, limit);
          if (r && r.ent && !r.ent.fixture && (!found || r.t < found.t)) found = { ...r, dir: _e.clone() };
        }
        if (found) break;
      }
      if (!found) return false;
      best = found;
    }
    const ent = best.ent;
    if (ent.locked) return false;
    if (ent.fixture && ent.fixture.type === 'button') {          // keypad keys are poked with a finger, not held
      if (this.time - (ent.pressT || 0) > 0.22) {
        ent.pressT = this.time; ent.pressUntil = this.time + 0.12; ent.mode = 'press';
        ent.joint.configureMotorPosition(ent.fixture.limits[0], 120, 8); ent.body.wakeUp();
        this.presses.push(ent.fixture); this.sfxBudget++; this.sfx('click', ent.pos, 0.9, 1.5);
      }
      return false;
    }
    const other = p.hands[1 - h];
    if (other.ent === ent && !ent.fixture) return false;
    if (ent.heldBy && !ent.fixture) this.unhold(ent);      // steal!
    const hitP = _c.copy(eye).addScaledVector(best.dir || dir, best.t);
    hand.ent = ent; hand.stuck = 0; hand.off0 = p.reachOff; hand.lat = 0;
    hand.reach = clamp(_d.copy(hitP).sub(eye).dot(_e.set(-Math.sin(p.yaw), 0, -Math.cos(p.yaw))), PLAYER.reachMin, PLAYER.reachMax);
    hand.local.copy(hitP).sub(ent.pos).applyQuaternion(_q1.copy(ent.rot).invert());
    if (!ent.fixture) {
      ent.heldBy = { p, h }; this.setGroups(ent, GROUPS.held);
      const Hp = this.handPos(p, hand.reach, _e), Qh = this.handQuat(p, _q2), inv = _q3.copy(Qh).invert();
      hand.relPos.copy(ent.pos).sub(Hp).applyQuaternion(inv);
      hand.relRot.copy(inv).multiply(ent.rot);
      // tools snap into a sensible grip: knives/spatulas point forward, pans hang off their handle, containers level out
      const g = ent.def.grip;
      if (g) {
        if (g === 'up') { _a.set(1, 0, 0).applyQuaternion(ent.rot); _q1.setFromAxisAngle(AXES.y, Math.atan2(-_a.z, _a.x)); hand.relRot.copy(inv).multiply(_q1); }
        else hand.relRot.setFromAxisAngle(AXES.y, g === 'fwd' ? Math.PI / 2 : -Math.PI / 2);
        if (ent.def.hold) hand.local.set(ent.def.hold[0], ent.def.hold[1], ent.def.hold[2]);
        hand.relPos.copy(hand.local).applyQuaternion(hand.relRot).negate();
      }
      ent.floorT = 0;
      if (this.isBit(ent)) { this.setGroups(ent, GROUPS.heldBits); this.gather(p, h, ent.pos, HOLD.gatherR, 0.08); }
    } else { ent.heldBy = { p, h }; hand.k0 = ent.angle; hand.yaw0 = p.yaw; }
    ent.body.wakeUp();
    this.sfx('pop', ent.pos, 0.35, 1.5);
    return true;
  }
  // ---- handfuls: small loose food bits (potato sticks, slices, rings, blobs...). Never tools, pans, pots or whole ingredients.
  isBit(e) { const d = e.def; return !!(d && (d.food || d.money) && !d.container && !d.fragile && !e.chain && !e.fixture && e.bound <= 0.09 && d.mass <= 0.065); }
  gather(p, h, at, r, dy) {
    const hand = p.hands[h], main = hand.ent; if (!main || !this.isBit(main)) return 0;
    const kinds = new Set([main.kind]); for (const x of hand.extra) kinds.add(x.ent.kind);
    const near = [];
    for (const e of this.ents.values()) {
      if (e === main || e.heldBy || e.locked || e.dead || !kinds.has(e.kind) || !this.isBit(e)) continue;
      const dx = e.pos.x - at.x, dz = e.pos.z - at.z, ddy = e.pos.y - at.y;
      if (Math.abs(ddy) < dy && dx * dx + dz * dz < r * r) near.push([dx * dx + dz * dz, e]);
    }
    near.sort((a, b) => a[0] - b[0]);
    let added = 0; for (const [, e] of near) { if (!this.addBit(p, h, e)) break; added++; }
    if (added) this.sfx('pop', at, 0.3, 1.9);
    return added;
  }
  addBit(p, h, e) {
    const hand = p.hands[h]; if (hand.extra.length >= HOLD.handful - 1) return false;
    const inv = this.handQuat(p, Q()).invert(), k = hand.extra.length + 1, a = k * 2.4, r = 0.026 + 0.011 * Math.sqrt(k);
    // pile the pieces in a little heap around the first one (hand space: x right, y up, z back)
    const relPos = hand.relPos.clone().add(V().set(Math.cos(a) * r, 0.012 + 0.016 * Math.floor(k / 5), Math.sin(a) * r * 0.8));
    e.heldBy = { p, h, extra: true }; this.setGroups(e, GROUPS.heldBits); e.floorT = 0; e.body.wakeUp();
    hand.extra.push({ ent: e, relPos, relRot: inv.multiply(e.rot) });
    return true;
  }
  // let go of one entity wherever it is held (a single handful piece, or the whole hand's grip)
  unhold(e) {
    const hb = e.heldBy; if (!hb) return;
    if (hb.extra) { const x = hb.p.hands[hb.h].extra, i = x.findIndex(v => v.ent === e); if (i >= 0) x.splice(i, 1); e.heldBy = null; if (!e.dead) this.setGroups(e, GROUPS.item); }
    else this.release(hb.p, hb.h);
  }
  release(p, h) {
    const hand = p.hands[h], ent = hand.ent; if (!ent) return;
    hand.ent = null;
    for (const x of hand.extra) if (x.ent.heldBy && x.ent.heldBy.p === p) { x.ent.heldBy = null; if (!x.ent.dead) this.setGroups(x.ent, GROUPS.item); }
    hand.extra.length = 0;
    if (ent.heldBy && ent.heldBy.p === p && ent.heldBy.h === h) { ent.heldBy = null; if (!ent.fixture && !ent.dead) this.setGroups(ent, GROUPS.item); }
    const o = p.hands[1 - h]; if (o.ent === ent && ent.fixture) ent.heldBy = { p, h: 1 - h };
    else if (ent.fixture && ent.fixture.type === 'knob') ent.joint.configureMotorPosition(ent.angle, 0, ent.fixture.damp ?? 6);   // stays where you left it
  }
  throwHeld(id, power) {
    const p = this.players.get(id); if (!p) return;
    const dir = this.dirOf(p, _b).clone();
    for (let h = 0; h < 2; h++) {
      const ent = p.hands[h].ent; if (!ent || ent.fixture) { if (ent) this.release(p, h); continue; }
      const bits = p.hands[h].extra.map(x => x.ent);
      this.release(p, h);
      const m = ent.body.mass(), sp = (HOLD.throwMin + (HOLD.throwMax - HOLD.throwMin) * clamp(power, 0, 1)) / (1 + m * 0.16);
      ent.body.setLinvel({ x: dir.x * sp, y: dir.y * sp + 1.2, z: dir.z * sp }, true);
      ent.body.setAngvel({ x: (this.rand() - 0.5) * 8, y: (this.rand() - 0.5) * 8, z: (this.rand() - 0.5) * 8 }, true);
      ent.thrownBy = p.id; ent.thrownT = this.time;
      for (const b of bits) if (!b.dead) { const f = 0.85 + this.rand() * 0.3; b.body.setLinvel({ x: dir.x * sp * f + (this.rand() - 0.5) * 0.8, y: dir.y * sp * f + 1.2 + this.rand() * 0.4, z: dir.z * sp * f + (this.rand() - 0.5) * 0.8 }, true); b.thrownBy = p.id; b.thrownT = this.time; }
      this.sfx('whoosh', ent.pos, 0.8);
    }
  }
  levelHeld(id) {
    const p = this.players.get(id); if (!p) return;
    const Qh = this.handQuat(p, _q2), inv = _q3.copy(Qh).invert();
    for (const hand of p.hands) {
      const ent = hand.ent; if (!ent || ent.fixture) continue;
      _a.set(1, 0, 0).applyQuaternion(ent.rot); const yaw = Math.atan2(-_a.z, _a.x);
      _q1.setFromAxisAngle(AXES.y, yaw); hand.relRot.copy(inv).multiply(_q1);
    }
  }
  updateHands(p, dt) {
    const eye = this.eyeOf(p, V()), dir = this.dirOf(p, V()), right = V().set(Math.cos(p.yaw), 0, -Math.sin(p.yaw));
    const Qh = this.handQuat(p, Q()), both = p.hands[0].ent && p.hands[1].ent && !p.hands[0].ent.fixture && !p.hands[1].ent.fixture;
    for (let h = 0; h < 2; h++) {
      const hand = p.hands[h], want = p.grip[h];
      if (want && !hand.was) hand.tryT = 0.3;
      if (!want) { if (hand.ent) this.release(p, h); hand.tryT = 0; }
      else if (!hand.ent && hand.tryT > 0) { hand.tryT -= dt; if (this.tryGrab(p, h)) hand.tryT = 0; }
      hand.was = want;
      const ent = hand.ent;
      const idle = _a.copy(eye).addScaledVector(dir, 0.55).addScaledVector(right, h ? 0.3 : -0.3); idle.y -= 0.28;
      if (!ent) { hand.pos.copy(idle); continue; }
      if (ent.dead) { hand.ent = null; continue; }
      const reach = clamp(hand.reach + (p.reachOff - hand.off0), PLAYER.reachMin, PLAYER.reachMax);
      const gp = _b.copy(hand.local).applyQuaternion(ent.rot).add(ent.pos);
      hand.pos.copy(gp);
      if (ent.fixture) {
        const Hp = this.handPos(p, reach, _c), err = _d.copy(Hp).sub(gp), dist = err.length();
        const fx = ent.fixture, body = ent.body;
        if (dist > (fx.type === 'knob' ? 2.2 : HOLD.fixtureBreak)) { this.release(p, h); continue; }
        if (fx.type === 'knob') {
          // look right = turn clockwise; the knob is position-driven so it can never spin past its stops
          let d = p.yaw - hand.yaw0; if (d > Math.PI) d -= Math.PI * 2; else if (d < -Math.PI) d += Math.PI * 2;
          const target = clamp(hand.k0 + d * HOLD.knobGain, fx.limits[0], fx.limits[1]);
          ent.joint.configureMotorPosition(target, 90, 9); body.wakeUp();
        } else {
          const lv = body.linvel(), av = body.angvel(), com = body.worldCom();
          _e.set(av.x, av.y, av.z).cross(_a.copy(gp).sub(com)).add(_a.set(lv.x, lv.y, lv.z));     // velocity of the grab point
          const m = body.mass(), F = err.multiplyScalar(HOLD.fixtureK * m).addScaledVector(_e, -HOLD.fixtureC * m);
          const fl = F.length(), maxF = HOLD.fixtureMaxF * Math.max(1, m * 0.5); if (fl > maxF) F.multiplyScalar(maxF / fl);
          body.applyImpulseAtPoint({ x: F.x * dt, y: F.y * dt, z: F.z * dt }, gp, true);
        }
        continue;
      }
      // free body: velocity-drive its pose to follow the hand frame
      hand.lat += ((both ? (h ? 1 : -1) * PLAYER.handSide : 0) - hand.lat) * Math.min(1, dt * 6);
      const Hp = this.handPos(p, reach, _c).addScaledVector(right, hand.lat);
      const tp = _d.copy(hand.relPos).applyQuaternion(Qh).add(Hp), body = ent.body, m = body.mass();
      if (tp.y < 0.04) tp.y = 0.04;
      const err = tp.sub(ent.pos), dist = err.length();
      if (dist > HOLD.breakDist) { hand.stuck += dt; if (hand.stuck > HOLD.breakTime) { this.release(p, h); continue; } } else hand.stuck = 0;
      const gain = HOLD.linGain / (1 + m * 0.12);
      err.multiplyScalar(gain); const sp = err.length(); if (sp > HOLD.maxSpeed) err.multiplyScalar(HOLD.maxSpeed / sp);
      body.setLinvel({ x: err.x, y: err.y, z: err.z }, true);
      const tq = _q1.copy(Qh).multiply(hand.relRot), qe = _q2.copy(tq).multiply(_q3.copy(ent.rot).invert());
      if (qe.w < 0) { qe.x = -qe.x; qe.y = -qe.y; qe.z = -qe.z; qe.w = -qe.w; }
      const s = Math.sqrt(Math.max(0, 1 - qe.w * qe.w));
      if (s > 1e-4) {
        let w = 2 * Math.acos(clamp(qe.w, -1, 1)) * HOLD.angGain / (1 + m * 0.1); if (w > HOLD.maxAngSpeed) w = HOLD.maxAngSpeed;
        body.setAngvel({ x: qe.x / s * w, y: qe.y / s * w, z: qe.z / s * w }, true);
      } else body.setAngvel({ x: 0, y: 0, z: 0 }, true);
      if (hand.extra.length || this.isBit(ent)) {
        for (let i = hand.extra.length - 1; i >= 0; i--) {
          const x = hand.extra[i], e = x.ent;
          if (e.dead || !e.heldBy || e.heldBy.p !== p) { hand.extra.splice(i, 1); continue; }
          const t = _e.copy(x.relPos).applyQuaternion(Qh).add(Hp); if (t.y < 0.04) t.y = 0.04;
          const er = t.sub(e.pos);
          if (er.lengthSq() > 0.25) { x.stuck = (x.stuck || 0) + dt; if (x.stuck > 0.4) { this.unhold(e); continue; } } else x.stuck = 0;   // snagged for a while: that piece falls out
          er.multiplyScalar(HOLD.linGain); const s2 = er.length(); if (s2 > HOLD.maxSpeed) er.multiplyScalar(HOLD.maxSpeed / s2);
          e.body.setLinvel({ x: er.x, y: er.y, z: er.z }, true); e.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
        }
        if ((this.tick + h) % 3 === 0 && hand.extra.length < HOLD.handful - 1) this.gather(p, h, ent.pos, HOLD.sweepR, 0.07);   // sweeping over more
      }
      // swinging cookware into a colleague = bonk
      if (sp > 3.2) for (const o of this.players.values()) {
        if (o === p || o.bonkT > 0) continue;
        const dy = clamp(ent.pos.y - o.pos.y, 0.2, 1.7), dx = ent.pos.x - o.pos.x, dz = ent.pos.z - o.pos.z;
        if (Math.hypot(dx, ent.pos.y - (o.pos.y + dy), dz) < PLAYER.radius + ent.bound * 0.6) this.bonk(o, err.x, err.z, Math.min(1, sp / 7), ent);
      }
    }
  }
  bonk(o, dx, dz, power, ent) {
    o.bonkT = 1.2; const l = Math.hypot(dx, dz) || 1;
    this.hooks.bonk?.(o.id, dx / l, dz / l, power);
    this.sfxBudget++; this.sfx('bonk', _a.set(o.pos.x, o.pos.y + 1.6, o.pos.z), 1, 0.9 + this.rand() * 0.3);
    this.hooks.fx?.('bonk', [o.pos.x, o.pos.y + 1.85, o.pos.z]);
  }

  // ------------------------------------------------------------------ main step
  step() {
    const dt = PHYS_DT; this.tick++; this.time += dt; this.sfxBudget = Math.min(6, this.sfxBudget + 1);
    for (const p of this.players.values()) {
      p.bonkT = Math.max(0, p.bonkT - dt);
      p.body.setNextKinematicTranslation({ x: p.pos.x, y: p.pos.y + (p.crouch ? 0.55 : PLAYER.halfHeight + PLAYER.radius), z: p.pos.z });
      this.updateHands(p, dt);
    }
    // sticky-sauce assist: food riding in a carried, upright container follows it a little
    for (const e of this.ents.values()) {
      if (e.fixture) continue;
      if (!e.body.isSleeping()) { const v = e.body.linvel(); e.pv.set(v.x, v.y, v.z); } else e.pv.set(0, 0, 0);
      const c = e.inC;
      if (c && !c.dead && c.heldBy && !e.heldBy && c.up > 0.8) {
        const cv = c.pv, k = 0.22;
        e.body.setLinvel({ x: e.pv.x + (cv.x - e.pv.x) * k, y: e.pv.y, z: e.pv.z + (cv.z - e.pv.z) * k }, true);
      }
    }
    this.world.step(this.events);
    for (const f of this.fixtures.values()) if (f.pressUntil && this.time > f.pressUntil) { f.pressUntil = 0; f.mode = ''; }
    for (const e of this.ents.values()) {
      if (e.body.isSleeping()) continue;
      const t = e.body.translation(), r = e.body.rotation();
      e.pos.set(t.x, t.y, t.z); e.rot.set(r.x, r.y, r.z, r.w); e.moved = e.netMoved = true;
      if (e.fixture) this.updateFixture(e);
    }
    this.events.drainCollisionEvents((h1, h2, started) => { if (started) this.onCollide(h1, h2); });
    if (this.tick % 6 === 0) this.logic(dt * 6);
  }

  onCollide(h1, h2) {
    let a = this.colOwner.get(h1), b = this.colOwner.get(h2);
    if (!a && !b) return;
    if (a && a.player) { const t = a; a = b; b = t; }
    if (b && b.player) {        // something hit a chef
      if (a && !a.player && !a.dead && !a.heldBy) {
        const sp = a.pv.length();
        if (sp > 3.4 && b.player.bonkT <= 0 && !(a.thrownBy === b.player.id && this.time - a.thrownT < 0.25)) this.bonk(b.player, a.pv.x, a.pv.z, Math.min(1, sp / 9), a);
      }
      return;
    }
    if (a && a.npc) { const t = a; a = b; b = t; }
    if (b && b.npc) { if (a && !a.dead && a.pv && a.pv.length() > 2.5) this.hooks.npcHit?.(b.npc, a); return; }
    if ((a && a.dead) || (b && b.dead)) return;
    // knife work
    if (a && b) {
      let knife = null, food = null;
      if (a.blades && a.blades.has(h1) && b.def && b.def.cut) { knife = a; food = b; } else if (b.blades && b.blades.has(h2) && a.def && a.def.cut) { knife = b; food = a; }
      if (knife && this.time - knife.cutT > 0.12 && _a.copy(knife.pv).sub(food.pv).length() > 0.85) { knife.cutT = this.time; this.cut(food, knife); return; }
    }
    // tools: masher, meat mallet, rolling pin, grater
    if (a && b && a.def && b.def) {
      const tool = a.def.tool ? a : b.def.tool ? b : null, food = tool === a ? b : a;
      if (tool && food.def.use && food.def.use[tool.def.tool] && this.time - tool.cutT > 0.2) {
        const u = food.def.use[tool.def.tool], sp = _a.copy(tool.pv).sub(food.pv).length();
        if (sp > (tool.def.tool === 'grate' ? 0.5 : 1.0) && (!u.cooked || Math.min(food.cookA, food.cookB) >= 0.82)) { tool.cutT = this.time; this.useTool(tool, food, u); return; }
      }
    }
    // fragile things (eggs) + impact sounds
    for (const [e, o] of [[a, b], [b, a]]) {
      if (!e || e.dead || !e.def) continue;
      const rel = _a.copy(e.pv); if (o && o.pv) rel.sub(o.pv);
      const sp = rel.length();
      if (e.def.fragile && sp > 2.3 && e.age > 0.3) { this.crack(e); continue; }
      if (sp > 1.1 && this.time - e.sfxT > 0.18) {
        e.sfxT = this.time;
        const name = e.def.sfx || (e.def.mat === 'metal' ? 'clank' : e.def.food ? 'thud' : 'wood');
        this.sfx(name, e.pos, Math.min(1, sp / 6) * (e.def.food ? 0.5 : 0.9), 0.85 + this.rand() * 0.3 + (e.def.mass < 0.3 ? 0.3 : 0));
        if ((e.kind === 'sauce' || e.kind === 'mush' || e.kind === 'eggblob') && sp > 3) this.hooks.fx?.('splat', [e.pos.x, e.pos.y, e.pos.z], e.kind === 'sauce' ? 0xd62f1f : 0xf3ecd9);
      }
    }
  }
  cut(food, knife) {
    const into = food.def.cut.into, list = Array.isArray(into) ? into : Array(food.def.cut.n).fill(into);
    const p = food.pos, n = list.length;
    this.sfxBudget++; this.sfx('chop', p, 1, 0.9 + this.rand() * 0.25);
    this.hooks.fx?.('chop', [p.x, p.y, p.z], food.def.parts[0].c);
    const base = { cookA: food.cookA, cookB: food.cookB, by: food.by, method: food.method };
    _b.set(1, 0, 0).applyQuaternion(knife.rot); _b.y = 0; if (_b.lengthSq() < 0.01) _b.set(1, 0, 0); _b.normalize();
    _c.set(-_b.z, 0, _b.x);                    // spread the pieces sideways from the blade
    this.despawn(food);
    list.forEach((kind, i) => {
      const o = (i - (n - 1) / 2), sdef = ITEMS[kind], step = Math.min(0.03, sdef.bound * 0.9);
      const stacked = Array.isArray(into);
      const pos = stacked ? [p.x, p.y + (i ? 0.03 : -0.02), p.z] : [p.x + _c.x * o * step + (this.rand() - 0.5) * 0.01, p.y + 0.01 + Math.abs(o) * 0.004, p.z + _c.z * o * step + (this.rand() - 0.5) * 0.01];
      const yaw = kind === 'fry' ? Math.atan2(-_b.z, _b.x) : this.rand() * 6.28;
      this.spawn(kind, pos, { x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) }, { ...base, v: [_c.x * o * 0.25, 0.5 + this.rand() * 0.4, _c.z * o * 0.25] });
    });
  }
  useTool(tool, food, u) {
    const p = food.pos.clone(), base = { cookA: food.cookA, cookB: food.cookB, by: food.by, method: food.method };
    this.sfxBudget += 2; this.sfx(tool.def.tool === 'grate' ? 'chop' : 'splat', p, 0.9, tool.def.tool === 'grate' ? 1.6 : 0.8); this.sfx('thud', p, 1, 0.7);
    this.hooks.fx?.('chop', [p.x, p.y, p.z], food.def.parts[0].c);
    if (u.uses) {           // grating: the block survives a few strokes
      food.uses = (food.uses || 0) + 1;
      for (let i = 0; i < u.n; i++) this.spawn(u.into, [p.x + (this.rand() - 0.5) * 0.06, p.y - 0.02, p.z + (this.rand() - 0.5) * 0.06], null, { v: [(this.rand() - 0.5) * 0.6, 0.4, (this.rand() - 0.5) * 0.6] });
      if (food.uses >= u.uses) this.despawn(food, 'poof');
      return;
    }
    _a.set(1, 0, 0).applyQuaternion(food.rot); const yaw = Math.atan2(-_a.z, _a.x);
    this.despawn(food);
    for (let i = 0; i < u.n; i++) this.spawn(u.into, [p.x + (u.n > 1 ? (this.rand() - 0.5) * 0.07 : 0), Math.max(p.y - 0.02, 0.03) + i * 0.02, p.z + (u.n > 1 ? (this.rand() - 0.5) * 0.07 : 0)],
      { x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) }, u.n === 1 ? base : {});
  }
  crack(egg) {
    const p = egg.pos; this.sfxBudget += 2; this.sfx('crack', p, 1); this.sfx('splat', p, 0.7);
    this.hooks.fx?.('splat', [p.x, p.y, p.z], 0xf9b91e);
    this.despawn(egg);
    this.spawn(egg.def.fragile, [p.x, p.y + 0.01, p.z], null, { v: [0, 0.3, 0] });
  }

  // ------------------------------------------------------------------ slow logic (10 Hz): heat, cooking, water, blending, trash, restock
  logic(dt) {
    const K = this.K; if (!K) return;
    const loops = [];
    const fv = (id) => this.fixtures.get(id).value;
    for (const b of K.burners) {
      const v = fv(b.knob), lvl = v > 0.1 ? 0.35 + 0.65 * v : 0;
      if ((lvl > 0) !== (b.level > 0)) { this.sfxBudget++; this.sfx(lvl > 0 ? 'ignite' : 'click', _a.set(...b.pos), 0.8); }
      if (Math.abs(lvl - b.level) > 0.01) this.appDirty = true; b.level = lvl;
      if (lvl > 0) loops.push(['flame', b.pos, 0.25 + lvl * 0.3]);
    }
    for (const o of K.ovens) {
      const on = fv(o.knob) > 0.1, open = fv(o.door) > 0.12;
      if (on !== o.on || open !== o.open) this.appDirty = true;
      o.on = on; o.open = open; o.temp = clamp(o.temp + (on ? dt / COOK.ovenHeatTime : -dt / 12), 0, 1);
      if (on) loops.push(['ovenhum', o.pos, 0.5]);
    }
    for (const f of K.fryers) {
      const on = fv(f.knob) > 0.1; if (on !== f.on) this.appDirty = true;
      f.on = on; const t0 = f.temp; f.temp = clamp(f.temp + (on ? dt / COOK.oilHeatTime : -dt / 20), 0, 1); f.busy = 0;
      if ((t0 > 0.5) !== (f.temp > 0.5)) this.appDirty = true;
    }
    for (const t of K.taps) { const fl = fv(t.lever); const v = fl > 0.08 ? fl : 0; if (Math.abs(v - t.flow) > 0.02 || (v > 0) !== (t.flow > 0)) this.appDirty = true; t.flow = v; if (v > 0) loops.push(['tap', t.spout, 0.4 + v * 0.5]); }
    for (const b of K.blenders) { const on = fv(b.lever) > 0.5; if (on !== b.on) this.appDirty = true; b.on = on; b.jar = null; if (on) loops.push(['blender', b.pos, 0.8]); }

    // containers
    const conts = [], lids = [], fillables = [];
    for (const c of this.ents.values()) if (!c.fixture) { if (c.kind === 'lid') lids.push(c); else if (c.def.container && c.def.container.fill) fillables.push(c); }
    for (const c of this.ents.values()) {
      if (c.fixture) continue;
      c.age += dt;
      if (c.def.squeeze) this.squeeze(c, dt);
      const ct = c.def.container; if (!ct) continue;
      conts.push(c);
      c.up = _a.set(0, 1, 0).applyQuaternion(c.rot).y; c.count = 0; c.cooking = 0;
      if (ct.heat) {
        let target = 0;
        if (c.up > 0.9) for (const b of K.burners) {
          if (b.level <= 0) continue;
          const dx = c.pos.x - b.pos[0], dz = c.pos.z - b.pos[2], dy = c.pos.y - b.pos[1];
          if (dx * dx + dz * dz < 0.03 && dy > -0.06 && dy < 0.14) { target = b.level; break; }
        }
        const h0 = c.heat;
        c.heat = target > c.heat ? Math.min(target, c.heat + dt * this.mods.heat / COOK.panHeatUp) : Math.max(target, c.heat - dt / COOK.panCool);
        if (Math.abs(c.heat - h0) > 0.001) c.dirty = true;
      }
      if (ct.fill) {
        const w0 = c.water, t0 = c.temp;
        for (const t of K.taps) {
          if (t.flow <= 0) continue;
          const dx = c.pos.x - t.spout[0], dz = c.pos.z - t.spout[2];
          if (dx * dx + dz * dz < ct.r * ct.r && c.pos.y < t.spout[1] && c.up > 0.8) { c.water = Math.min(1, c.water + t.flow * dt / 2.2); c.temp *= 1 - 0.3 * dt; }
        }
        if (c.water > 0) {
          if (c.up < 0.6) {            // pouring out
            const out = Math.min(c.water, dt * (0.62 - c.up) * 2.2); c.water -= out;
            _b.set(0, 1, 0).applyQuaternion(c.rot); _b.y = 0; _b.normalize().multiplyScalar(ct.r);
            const px = c.pos.x + _b.x, pz = c.pos.z + _b.z;
            for (const o of fillables) {      // pour from the jug into the pot
              if (o === c || o.dead || o.pos.y > c.pos.y + 0.05) continue;
              const oc = o.def.container, dx = o.pos.x - px, dz = o.pos.z - pz;
              if (dx * dx + dz * dz < (oc.r + 0.03) * (oc.r + 0.03) && (o.up ?? 1) > 0.8) { const w1 = Math.min(1, o.water + out * (ct.vol || 1) / (oc.vol || 1)); o.temp = o.water > 0 ? (o.temp * o.water + c.temp * (w1 - o.water)) / w1 : c.temp; o.water = w1; o.dirty = true; break; }
            }
            this.hooks.fx?.('pour', [c.pos.x + _b.x, c.pos.y + 0.12, c.pos.z + _b.z]);
            if (this.tick % 30 === 0) this.sfx('splash', c.pos, 0.6);
          }
          let lidded = false; const topY = c.pos.y + (ct.waterH || 0.1) + 0.04;
          for (const l of lids) if (!l.dead && Math.abs(l.pos.x - c.pos.x) < 0.07 && Math.abs(l.pos.z - c.pos.z) < 0.07 && l.pos.y > topY - 0.05 && l.pos.y < topY + 0.14) { lidded = true; break; }
          c.temp = clamp(c.temp + (c.heat > 0.25 ? c.heat * dt * (lidded ? 2.2 : 1) * this.mods.heat / COOK.waterBoilTime : -dt / 25), 0, 1);
          if (c.temp >= 1) { c.water = Math.max(0, c.water - dt / 150); loops.push(['boil', [c.pos.x, c.pos.y, c.pos.z], 0.7]); c.fxT -= dt; if (c.fxT <= 0) { c.fxT = 0.3; this.hooks.fx?.('steam', [c.pos.x, c.pos.y + ct.waterH, c.pos.z], ct.r); } }
        } else c.temp = 0;
        if (Math.abs(c.water - w0) > 0.001 || (c.temp >= 1) !== (t0 >= 1)) c.dirty = true;
        c.body.setAdditionalMass?.(c.water * 2.5, false);
      }
      if (ct.blend && c.up > 0.9) for (const b of K.blenders) { const dx = c.pos.x - b.pos[0], dz = c.pos.z - b.pos[2]; if (b.on && dx * dx + dz * dz < 0.006 && Math.abs(c.pos.y - b.pos[1]) < 0.08) b.jar = c; }
    }

    // food
    const foods = [];
    for (const e of this.ents.values()) {
      if (e.fixture || !e.def.food) continue;
      foods.push(e); e.inC = null; e.onPizza = null;
      for (const c of conts) {
        if (c === e) continue;
        const ct = c.def.container, dx = e.pos.x - c.pos.x, dz = e.pos.z - c.pos.z, rr = (ct.r || Math.max(ct.bx, ct.bz) * 1.5) + 0.05;
        if (dx * dx + dz * dz > rr * rr || Math.abs(e.pos.y - c.pos.y) > ct.h + 0.1) continue;
        _a.copy(e.pos).sub(c.pos).applyQuaternion(_q1.copy(c.rot).invert());
        if (_a.y < ct.y0 - 0.015 || _a.y > ct.h) continue;
        if (ct.r ? _a.x * _a.x + _a.z * _a.z < ct.r * ct.r : Math.abs(_a.x) < ct.bx && Math.abs(_a.z) < ct.bz) {
          if (ct.pizza) { e.onPizza = c; continue; }
          // prefer: a heated vessel over a cold one, a real container over a scoop, then the floor closest under the food (stacked pans)
          const cur = e.inC && e.inC.def.container;
          if (!cur || (ct.heat && !cur.heat) || (cur.small && !ct.small) || (!!ct.heat === !!cur.heat && !!ct.small === !!cur.small && _a.y < e.inY)) { e.inC = c; e.inY = _a.y; }
          c.count++;
        }
      }
    }
    for (const e of foods) {
      if (e.dead) continue;
      const ck = e.def.cook, c = e.inC;
      let method = 0, rate = 0;
      if (ck) {
        for (const o of K.ovens) if (o.temp > 0.3 && inBox(e.pos, o.zone)) { method = M.bake; rate = o.temp * (o.open ? 0.35 : 1) * this.mods.oven; }
        if (!method) for (const f of K.fryers) if (inBox(e.pos, f.zone)) { if (f.temp > 0.5) { method = M.deepfry; rate = f.temp * this.mods.fry; f.busy++; } break; }
        if (!method && c && c.def.container.heat && c.heat > 0.3) {
          if (c.water > 0.12) { if (c.temp >= 1 && e.inY < c.def.container.waterH * c.water + 0.06) { method = M.boil; rate = 1; } }
          else if (e.inY < 0.09) { method = M.fry; rate = c.heat; c.cooking++; }
        }
        if (!method && !c && !e.heldBy) for (const b of K.burners) {
          if (b.level <= 0) continue;
          const dx = e.pos.x - b.pos[0], dz = e.pos.z - b.pos[2], dy = e.pos.y - b.pos[1];
          if (dx * dx + dz * dz < 0.026 && dy > -0.05 && dy < 0.12) { method = M.grill; rate = b.level * 1.7; break; }
        }
      }
      if (e.def.onHot && c && c.def.container.heat && c.heat > 0.3 && c.water < 0.1 && e.inY < 0.08) {
        const p = e.pos.clone(); this.despawn(e); this.sfxBudget++; this.sfx('sizzleStart', p, 0.8);
        this.spawn(e.def.onHot, [p.x, c.pos.y + c.def.container.floorY + 0.012, p.z], null); continue;
      }
      if (e.kind === 'pizzabase' && Math.min(e.cookA, e.cookB) >= COOK.done && this.fusePizza(e, foods)) continue;
      if (method) {
        const name = METHODS[method], t = ck.t[name === 'grill' ? 'fry' : name] || 26, inc = rate * dt / t;
        if (ck.sides === 2 && (method === M.fry || method === M.grill)) {
          const upY = _a.set(0, 1, 0).applyQuaternion(e.rot).y;
          if (upY > 0) { e.cookB += inc; e.cookA += inc * 0.1; } else { e.cookA += inc; e.cookB += inc * 0.1; }
        } else { e.cookA += inc; e.cookB += inc; }
        e.by[name] = (e.by[name] || 0) + inc;
        let bm = 0, bv = 0; for (const k in e.by) if (e.by[k] > bv) { bv = e.by[k]; bm = M[k]; } e.method = bm;
        e.dirty = true; e.fxT -= dt;
        const hi = Math.max(e.cookA, e.cookB);
        if (e.fxT <= 0) { e.fxT = 0.5 + this.rand() * 0.4; this.hooks.fx?.(hi > COOK.burnt ? 'smoke' : method === M.deepfry ? 'bubbles' : method === M.boil ? 'none' : 'sizzle', [e.pos.x, e.pos.y + 0.03, e.pos.z]); }
        if (ck.becomes && Math.min(e.cookA, e.cookB) >= COOK.done && method === M.boil) {
          _b.set(1, 0, 0).applyQuaternion(e.rot); const p = e.pos.clone(), cook = e.cookA;
          this.despawn(e); this.spawnNoodle(p, _b.clone(), cook, null);
          continue;
        }
      }
      // blender
      if (c && c.def.container.blend) {
        const bl = K.blenders.find(b => b.jar === c);
        if (bl) {
          const dx = e.pos.x - c.pos.x, dz = e.pos.z - c.pos.z;
          e.body.setLinvel({ x: -dz * 22 + (this.rand() - 0.5) * 2, y: e.inY > 0.14 ? -1.5 : (this.rand() - 0.55) * 1.8, z: dx * 22 + (this.rand() - 0.5) * 2 }, true);
          e.blendT += dt;
          if (e.blendT > 2.2 && e.kind !== 'sauce' && e.kind !== 'mush') {
            const bd = e.def.blend, kind = bd ? bd.into : 'mush', n = bd ? bd.n : clamp(Math.round(e.def.mass / 0.07), 1, 3), p = e.pos.clone();
            this.hooks.fx?.('splat', [p.x, p.y, p.z], e.def.parts[0].c); this.despawn(e);
            for (let i = 0; i < n; i++) this.spawn(kind, [p.x + (this.rand() - 0.5) * 0.05, p.y + i * 0.05, p.z + (this.rand() - 0.5) * 0.05], null);
            continue;
          }
        }
      }
      // floor litter + bins
      if (e.pos.y < 0.16 && !e.heldBy && e.pos.z > -ROOM.hz) { e.floorT += dt; if (e.floorT > 45) { this.despawn(e, 'poof'); continue; } } else e.floorT = 0;
    }
    for (const b of K.blenders) if (b.on && b.jar) { b.jar.body.applyImpulse({ x: (this.rand() - 0.5) * 0.06, y: 0, z: (this.rand() - 0.5) * 0.06 }, true); }
    for (const c of conts) if (c.kind === 'deliverycrate' && !c.heldBy) { if (c.count === 0 && c.age > 12) { c.emptyT = (c.emptyT || 0) + dt; if (c.emptyT > 6) this.despawn(c, 'poof'); } else c.emptyT = 0; }
    for (const c of conts) if (c.cooking > 0) loops.push(['sizzle', [c.pos.x, c.pos.y, c.pos.z], Math.min(1, 0.45 + c.cooking * 0.12)]);
    for (const f of K.fryers) { if (f.busy > 0) loops.push(['fryer', f.pos, Math.min(1, 0.5 + f.busy * 0.05)]); if ((f.busy > 0) !== f.wasBusy) { f.wasBusy = f.busy > 0; this.appDirty = true; } }

    // bins, lost items
    for (const e of this.ents.values()) {
      if (e.fixture || e.heldBy) continue;
      let inBin = false; for (const z of K.trash) if (inBox(e.pos, z)) { inBin = true; break; }
      if (inBin) { e.trashT += dt; if (e.trashT > 0.7) { this.sfxBudget++; this.sfx('poof', e.pos, 0.7); this.despawn(e, 'poof'); } } else e.trashT = 0;
      if (!e.dead && (e.pos.y < -2 || Math.abs(e.pos.x) > ROOM.hx + 1 || e.pos.z > ROOM.hz + 1 || e.pos.z < -ROOM.hz - ROOM.diningDepth - 1)) this.despawn(e);
      if (!e.dead && !e.def.food && e.pos.y < 0.2 && e.home) { e.floorT += dt; if (e.floorT > 75) { e.floorT = 0; this.sendHome(e); } }
    }
    // fryer oil drag
    for (const f of K.fryers) for (const e of foods) if (!e.dead && !e.heldBy && inBox(e.pos, f.zone) && !e.body.isSleeping()) {
      const v = e.body.linvel(); e.body.setLinvel({ x: v.x * 0.7, y: v.y * 0.7 + 0.25, z: v.z * 0.7 }, false);
    }
    // restock
    if (this.tick % 60 === 0) {
      for (const s of K.stock) {
        s.t += 1; if (s.t < s.every) continue;
        let n = 0; for (const e of this.ents.values()) if (e.kind === s.kind && inBox(e.pos, s.zone)) n++;
        if (n < s.n) { s.t = 0; this.stockSpawn(s); }
      }
      if (this.tick % 300 === 0) {
        const counts = {}; for (const e of this.ents.values()) if (!e.fixture) counts[e.kind] = (counts[e.kind] || 0) + 1;
        for (const kind in this.toolCounts) if ((counts[kind] || 0) < this.toolCounts[kind]) {
          const home = K.tools.find(t => t.kind === kind && t.home && this.homeFree(t));
          if (home) { const e = this.spawn(kind, [home.p[0], home.p[1] + 0.05, home.p[2]], this.toolQuat(home), { home }); if (e) this.hooks.fx?.('poof', home.p); }
        }
      }
    }
    this.loops = loops;
  }
  // a baked base with sauce + cheese on it becomes a pizza (toppings decide which one)
  fusePizza(base, foods) {
    const on = foods.filter(f => f.onPizza === base && !f.dead && !f.heldBy), n = (k) => on.filter(f => f.kind === k).length;
    if (n('sauce') < 2 || n('cheeseslice') + n('gratedcheese') / 2 < 2) return false;
    const kind = n('mushroomslice') >= 3 ? 'pizzafunghi' : n('sausagecoin') >= 3 ? 'pizzasalami' : 'pizza', p = base.pos.clone(), q = base.rot.clone(), cook = Math.max(base.cookA, 1);
    for (const f of on) this.despawn(f); this.despawn(base);
    this.spawn(kind, [p.x, p.y + 0.01, p.z], { x: q.x, y: q.y, z: q.z, w: q.w }, { cookA: cook, cookB: cook, by: { bake: cook }, method: M.bake });
    this.sfxBudget++; this.sfx('ding', p, 0.6, 1.4); this.hooks.fx?.('steam', [p.x, p.y + 0.05, p.z], 0.15);
    return true;
  }
  // squeeze bottles squirt blobs while held upside-down (they refill slowly)
  squeeze(b, dt) {
    b.ammo = Math.min(14, (b.ammo ?? 14) + dt / 2.5); b.sqT = (b.sqT || 0) - dt;
    if (!b.heldBy || b.sqT > 0 || b.ammo < 1 || this.itemCount >= MAX_ITEMS - 20) return;
    const up = _a.set(0, 1, 0).applyQuaternion(b.rot);
    if (up.y > -0.25) return;
    b.ammo -= 1; b.sqT = 0.3;
    const tip = _b.copy(up).multiplyScalar(0.23).add(b.pos);
    this.spawn(b.def.squeeze, [tip.x, tip.y, tip.z], null, { v: [up.x * 1.2, up.y * 1.2, up.z * 1.2] });
    this.sfxBudget++; this.sfx('splat', tip, 0.45, 1.7);
  }
  homeFree(t) { for (const e of this.ents.values()) if (!e.fixture && Math.abs(e.pos.x - t.p[0]) < 0.22 && Math.abs(e.pos.z - t.p[2]) < 0.22 && Math.abs(e.pos.y - t.p[1]) < 0.4) return false; return true; }
  sendHome(e) {
    const t = e.home; if (!this.homeFree(t)) return;
    this.hooks.fx?.('poof', [e.pos.x, e.pos.y, e.pos.z]);
    e.body.setTranslation({ x: t.p[0], y: t.p[1] + 0.05, z: t.p[2] }, true); e.body.setRotation(this.toolQuat(t), true);
    e.body.setLinvel({ x: 0, y: 0, z: 0 }, true); e.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
  }

  // food resting on a plate/bowl (used by the service to judge a dish)
  contentsOf(c) { const out = []; for (const e of this.ents.values()) if (e.inC === c && !e.dead && !e.heldBy) out.push(e); return out; }

  appState() {
    const K = this.K;
    return { b: K.burners.map(b => Math.round(b.level * 100)), o: K.ovens.map(o => (o.on ? 1 : 0) | (o.open ? 2 : 0)), f: K.fryers.map(f => (f.on ? 1 : 0) | (f.temp > 0.5 ? 2 : 0) | (f.busy > 0 ? 4 : 0)),
      t: K.taps.map(t => Math.round(t.flow * 100)), bl: K.blenders.map(b => (b.on ? 1 : 0)) };
  }
  itemState(e) { return [e.id, Math.min(255, Math.round(e.cookA * 50)), Math.min(255, Math.round(e.cookB * 50)), e.method, Math.round(e.water * 100), e.temp >= 1 ? 1 : 0, Math.round(e.heat * 100)]; }
}
