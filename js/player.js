// Kökskaos — the local chef: pointer-lock mouse look, WASD movement through a Rapier character controller
// (against static geometry only), two physical hands (mouse buttons), wrist rotation, reach and throwing.
import * as THREE from '../vendor/three.module.js';
import { PLAYER, GROUPS, HOLD, ROOM } from './config.js';
import { audio } from './audio.js';

export class LocalPlayer {
  constructor(R, world, canvas, spawn) {
    this.R = R; this.world = world; this.canvas = canvas;
    this.pos = new THREE.Vector3(spawn[0], spawn[1], spawn[2]); this.vel = new THREE.Vector3(); this.yaw = 0; this.pitch = 0;
    this.grounded = true; this.crouch = false; this.eyeH = PLAYER.eye; this.keys = new Set(); this.locked = false; this.enabled = false;
    this.mouse = [false, false]; this.latch = [false, false]; this.reachOff = 0; this.wristP = 0; this.wristR = 0; this.rotating = false;
    this.charge = -1; this.events = []; this.dizzy = 0; this.speed = 0; this.home = spawn; this.stepT = 0; this.bob = 0; this.sens = 0.0023; this.shake = 0;
    this.col = world.createCollider(R.ColliderDesc.capsule(PLAYER.halfHeight, PLAYER.radius).setCollisionGroups(0).setTranslation(this.pos.x, this.pos.y + PLAYER.halfHeight + PLAYER.radius, this.pos.z));
    const cc = this.cc = world.createCharacterController(0.02);
    cc.enableAutostep(0.22, 0.15, false); cc.enableSnapToGround(0.15); cc.setMaxSlopeClimbAngle(0.9); cc.setApplyImpulsesToDynamicBodies(false); cc.setSlideEnabled(true);
    this.bind();
  }
  get gripL() { return this.mouse[0] || this.latch[0]; }
  get gripR() { return this.mouse[1] || this.latch[1]; }
  bind() {
    const cv = this.canvas;
    document.addEventListener('pointerlockchange', () => { this.locked = document.pointerLockElement === cv; if (!this.locked) { this.mouse = [false, false]; this.keys.clear(); this.charge = -1; this.rotating = false; } this.onLock?.(this.locked); });
    cv.addEventListener('mousedown', (e) => {
      if (!this.enabled) return;
      audio.init();
      if (!this.locked) { cv.requestPointerLock?.(); return; }
      if (e.button === 0) { this.mouse[0] = true; this.latch[0] = false; } else if (e.button === 2) { this.mouse[1] = true; this.latch[1] = false; } else if (e.button === 1) { this.charge = 0; e.preventDefault(); }
    });
    window.addEventListener('mouseup', (e) => { if (e.button === 0) this.mouse[0] = false; else if (e.button === 2) this.mouse[1] = false; else if (e.button === 1) this.fireThrow(); });
    cv.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      const dx = e.movementX || 0, dy = e.movementY || 0; if (Math.abs(dx) > 400 || Math.abs(dy) > 400) return;
      if (this.rotating) { this.wristR = THREE.MathUtils.clamp(this.wristR - dx * 0.006, -Math.PI, Math.PI); this.wristP = THREE.MathUtils.clamp(this.wristP + dy * 0.006, -Math.PI, Math.PI); }
      else { this.yaw -= dx * this.sens; this.pitch = THREE.MathUtils.clamp(this.pitch - dy * this.sens, -1.5, 1.5); }
    });
    cv.addEventListener('wheel', (e) => { if (this.locked) this.reachOff = THREE.MathUtils.clamp(this.reachOff - Math.sign(e.deltaY) * 0.09, -1.2, 1.2); e.preventDefault(); }, { passive: false });
    window.addEventListener('keydown', (e) => {
      if (!this.locked || e.repeat) return;
      this.keys.add(e.code);
      if (e.code === 'KeyQ') this.latch[0] = !this.latch[0];
      else if (e.code === 'KeyE') this.latch[1] = !this.latch[1];
      else if (e.code === 'KeyR') this.rotating = true;
      else if (e.code === 'KeyT') { this.wristP = 0; this.wristR = 0; this.events.push({ t: 'level' }); }
      else if (e.code === 'KeyF') this.charge = 0;
      else if (/^Digit\d$/.test(e.code)) this.events.push({ t: 'emote', idx: (+e.code[5] + 9) % 10 });
      if (['Space', 'Tab', 'KeyQ', 'KeyE', 'KeyR', 'KeyF'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => { this.keys.delete(e.code); if (e.code === 'KeyR') this.rotating = false; else if (e.code === 'KeyF') this.fireThrow(); });
    window.addEventListener('blur', () => { this.keys.clear(); this.mouse = [false, false]; });
  }
  fireThrow() { if (this.charge < 0) return; this.events.push({ t: 'throw', power: Math.min(1, this.charge / HOLD.throwChargeTime) }); this.charge = -1; this.mouse = [false, false]; this.latch = [false, false]; }
  bonk(dx, dz, power) { this.vel.x += dx * 5 * power; this.vel.z += dz * 5 * power; this.vel.y = Math.max(this.vel.y, 2.2 * power); this.dizzy = 1; this.shake = 0.6; }

  update(dt, others) {
    const k = this.keys, P = PLAYER;
    if (this.charge >= 0) this.charge += dt;
    this.dizzy = Math.max(0, this.dizzy - dt * 0.55); this.shake = Math.max(0, this.shake - dt * 2);
    this.crouch = k.has('ControlLeft') || k.has('KeyC');
    let fx = 0, fz = 0;
    if (k.has('KeyW') || k.has('ArrowUp')) fz -= 1; if (k.has('KeyS') || k.has('ArrowDown')) fz += 1;
    if (k.has('KeyA') || k.has('ArrowLeft')) fx -= 1; if (k.has('KeyD') || k.has('ArrowRight')) fx += 1;
    const l = Math.hypot(fx, fz) || 1; fx /= l; fz /= l;
    const sp = this.crouch ? P.crouchSpeed : k.has('ShiftLeft') ? P.sprint : P.walk, s = Math.sin(this.yaw), c = Math.cos(this.yaw);
    let wx = (fx * c + fz * s) * sp, wz = (-fx * s + fz * c) * sp;
    if (this.dizzy > 0.4) { const a = Math.sin(performance.now() * 0.004) * this.dizzy * 1.2; const tx = wx * Math.cos(a) - wz * Math.sin(a); wz = wx * Math.sin(a) + wz * Math.cos(a); wx = tx; }
    const acc = (this.grounded ? P.accel : P.airAccel) * dt;
    this.vel.x += THREE.MathUtils.clamp(wx - this.vel.x, -acc, acc); this.vel.z += THREE.MathUtils.clamp(wz - this.vel.z, -acc, acc);
    // gentle separation from other chefs instead of hard collisions
    for (const o of others) { const dx = this.pos.x - o.x, dz = this.pos.z - o.z, d = Math.hypot(dx, dz); if (d < 0.62 && d > 0.001 && Math.abs(this.pos.y - o.y) < 1.2) { const push = (0.62 - d) * 9 * dt; this.vel.x += dx / d * push * 4; this.vel.z += dz / d * push * 4; } }
    this.vel.y += P.gravity * dt;
    if (this.grounded && k.has('Space') && !this.crouch) { this.vel.y = P.jump; this.grounded = false; audio.play('jump', null, 0.35); }
    const cy = P.halfHeight + P.radius;
    this.col.setTranslation({ x: this.pos.x, y: this.pos.y + cy, z: this.pos.z });
    this.cc.computeColliderMovement(this.col, { x: this.vel.x * dt, y: this.vel.y * dt, z: this.vel.z * dt }, undefined, GROUPS.qWalk);
    const m = this.cc.computedMovement(); this.grounded = this.cc.computedGrounded();
    this.pos.x += m.x; this.pos.y += m.y; this.pos.z += m.z;
    if (this.grounded && this.vel.y < 0) this.vel.y = -1;
    if (Math.abs(m.x) < Math.abs(this.vel.x * dt) * 0.3) this.vel.x *= 0.5; if (Math.abs(m.z) < Math.abs(this.vel.z * dt) * 0.3) this.vel.z *= 0.5;
    if (this.pos.y < -3 || Math.abs(this.pos.x) > ROOM.hx + 3) { const h = this.home || [0, 0, 0]; this.pos.set(h[0], 0.2, h[2]); this.vel.set(0, 0, 0); }
    const hs = Math.hypot(this.vel.x, this.vel.z);
    if (this.grounded && hs > 0.8) { this.bob += dt * hs * 2.6; this.stepT -= dt * hs; if (this.stepT <= 0) { this.stepT = 1.9; audio.play('step', null, 0.22, 0.9 + Math.random() * 0.3); } }
    this.eyeH += ((this.crouch ? P.eyeCrouch : P.eye) - this.eyeH) * Math.min(1, dt * 12);
    if (!this.gripL && !this.gripR) { this.reachOff *= Math.max(0, 1 - dt * 8); if (!this.rotating) { this.wristP *= Math.max(0, 1 - dt * 8); this.wristR *= Math.max(0, 1 - dt * 8); } }
    this.speed = hs;
  }
  applyCamera(cam) {
    const bobY = this.grounded ? Math.sin(this.bob * 2) * 0.018 * Math.min(1, this.speed / 3) : 0;
    const sh = this.shake, t = performance.now() * 0.001;
    cam.position.set(this.pos.x + Math.sin(t * 47) * sh * 0.03, this.pos.y + this.eyeH + bobY + Math.sin(t * 53) * sh * 0.03, this.pos.z);
    cam.rotation.set(this.pitch + Math.sin(t * 5.1) * this.dizzy * 0.05, this.yaw + Math.sin(t * 3.7) * this.dizzy * 0.06, Math.sin(t * 4.3) * this.dizzy * 0.09 + Math.sin(this.bob) * 0.004);
  }
  input() { return { x: this.pos.x, y: this.pos.y, z: this.pos.z, yaw: this.yaw, pitch: this.pitch, crouch: this.crouch, gripL: this.gripL, gripR: this.gripR, reachOff: this.reachOff, wristP: this.wristP, wristR: this.wristR, air: !this.grounded }; }
}
