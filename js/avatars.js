// avatars.js — procedural goofy characters for Kökskaos: chefs, waiters, customers, first-person glove.
// Everything is three.js primitives + MeshToonMaterial. Y up, meters, characters face local -Z, origin at feet.
import * as THREE from '../vendor/three.module.js';

export const CHEF_COLORS = [0xe8413c, 0x2f7fe8, 0x35b34a, 0xffcf33, 0x9656e0, 0xff8a24, 0xff6fb0, 0x19bfb0, 0xa6dd1f];

const SKINS = [0xffd2a8, 0xf3bd8e, 0xd99a6c, 0xa9714a, 0x7b4b2d];
const HAIRS = [0x2a1c14, 0x6b3e1e, 0xd8b064, 0xb5482a, 0x8f8f94];
const SHIRTS = [0xff5d5d, 0x4da3ff, 0x5fd068, 0xffc93c, 0xb57bff, 0xff944d, 0xff8ac2, 0x2ec4b6, 0xf4f1e8, 0x7ad1ff];
const PANTS = [0x34495e, 0x5b4636, 0x2d3436, 0x3d5a80];
const EMPTY = Object.freeze({});
const clamp = THREE.MathUtils.clamp;

// ---------- shared caches (never disposed by instances) ----------
let _grad = null;
function gradientMap() {
  if (_grad) return _grad;
  _grad = new THREE.DataTexture(new Uint8Array([95, 160, 215, 255]), 4, 1, THREE.RedFormat);
  _grad.minFilter = _grad.magFilter = THREE.NearestFilter;
  _grad.generateMipmaps = false;
  _grad.needsUpdate = true;
  return _grad;
}
const _geo = new Map(), _mat = new Map();
function geo(key, make) { let g = _geo.get(key); if (!g) { g = make(); _geo.set(key, g); } return g; }
function sharedMat(color) {
  let m = _mat.get(color);
  if (!m) { m = new THREE.MeshToonMaterial({ color, gradientMap: gradientMap() }); _mat.set(color, m); }
  return m;
}
function ownMat(own, color) {
  const m = new THREE.MeshToonMaterial({ color, gradientMap: gradientMap() });
  own.push(m);
  return m;
}
// Unit-sized geometries; meshes are scaled per use.
const G = {
  sphere: () => geo('sphere', () => new THREE.SphereGeometry(1, 16, 12)),
  dome: () => geo('dome', () => new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2)),
  cyl: () => geo('cyl', () => new THREE.CylinderGeometry(1, 1, 1, 14)),
  cone: () => geo('cone', () => new THREE.ConeGeometry(1, 1, 10)),
  box: () => geo('box', () => new THREE.BoxGeometry(1, 1, 1)),
  star: () => geo('star', () => new THREE.OctahedronGeometry(1, 0)),
  torus: () => geo('torus', () => new THREE.TorusGeometry(1, 0.1, 8, 20)),   // thin ring (trim, glasses)
  ring: () => geo('ring', () => new THREE.TorusGeometry(1, 0.28, 8, 16)),    // fat ring (neckerchief, cuff)
  // tapered tube from the origin toward -Z, length 1 (rubber-hose arm / limb segment)
  hose: () => geo('hose', () => new THREE.CylinderGeometry(0.8, 1, 1, 10).translate(0, 0.5, 0).rotateX(-Math.PI / 2)),
  // capsule toward -Z with the rear cap centre at the origin; far cap centre at z = -2
  finger: () => geo('finger', () => new THREE.CapsuleGeometry(1, 2, 4, 8).rotateX(-Math.PI / 2).translate(0, 0, -1)),
};

function mesh(g, m, parent, x = 0, y = 0, z = 0, sx = 1, sy = sx, sz = sx) {
  const o = new THREE.Mesh(g, m);
  o.castShadow = true;
  o.position.set(x, y, z);
  o.scale.set(sx, sy, sz);
  if (parent) parent.add(o);
  return o;
}
function rng(seed) { // mulberry32
  let a = ((seed * 9301 + 49297) | 0) + 0x6d2b79f5 | 0;
  return () => {
    a = a + 0x6d2b79f5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const pick = (rnd, arr) => arr[Math.floor(rnd() * arr.length) % arr.length];
function tintHex(hex, toward, k) { return new THREE.Color(hex).lerp(new THREE.Color(toward), k).getHex(); }

// ---------- springs + motion tracking (allocation-free) ----------
const S = () => ({ x: 0, v: 0 });
function spring(s, target, k, c, dt) { s.v += (k * (target - s.x) - c * s.v) * dt; s.x += s.v * dt; return s.x; }

function makeMotion() {
  return { init: false, px: 0, py: 0, pz: 0, vx: 0, vy: 0, vz: 0, ax: 0, ay: 0, az: 0, lvx: 0, lvz: 0, lax: 0, laz: 0, hspeed: 0 };
}
// Derives smoothed velocity/acceleration from group.position; l* = in the character's local (yaw) frame.
function trackMotion(m, group, dt) {
  const p = group.position;
  if (!m.init) { m.init = true; m.px = p.x; m.py = p.y; m.pz = p.z; }
  let dx = p.x - m.px, dy = p.y - m.py, dz = p.z - m.pz;
  m.px = p.x; m.py = p.y; m.pz = p.z;
  if (dx * dx + dy * dy + dz * dz > 9) { dx = dy = dz = 0; m.vx = m.vy = m.vz = 0; } // teleport
  const inv = 1 / dt, fv = 1 - Math.exp(-dt * 20), fa = 1 - Math.exp(-dt * 10);
  const ovx = m.vx, ovy = m.vy, ovz = m.vz;
  m.vx += (dx * inv - m.vx) * fv; m.vy += (dy * inv - m.vy) * fv; m.vz += (dz * inv - m.vz) * fv;
  m.ax += (clamp((m.vx - ovx) * inv, -25, 25) - m.ax) * fa;
  m.ay += (clamp((m.vy - ovy) * inv, -40, 40) - m.ay) * fa;
  m.az += (clamp((m.vz - ovz) * inv, -25, 25) - m.az) * fa;
  const c = Math.cos(group.rotation.y), s = Math.sin(group.rotation.y);
  m.lvx = m.vx * c - m.vz * s; m.lvz = m.vx * s + m.vz * c;
  m.lax = m.ax * c - m.az * s; m.laz = m.ax * s + m.az * c;
  m.hspeed = Math.hypot(m.vx, m.vz);
}

// ---------- shared body parts ----------
const FWD = new THREE.Vector3(0, 0, -1);
const _d = new THREE.Vector3(), _s = new THREE.Vector3(), _r = new THREE.Vector3(), _u = new THREE.Vector3();

// Big goofy head: skull, nose, googly eyes, mouth. Pivot = neck.
function buildHead(parent, neckY, skinMat, skinHex) {
  const head = new THREE.Group();
  head.position.y = neckY;
  parent.add(head);
  mesh(G.sphere(), skinMat, head, 0, 0.23, 0, 0.27, 0.26, 0.26);
  mesh(G.sphere(), sharedMat(tintHex(skinHex, 0xe2604a, 0.45)), head, 0, 0.2, -0.27, 0.055, 0.05, 0.06);
  const eyes = [];
  for (let i = 0; i < 2; i++) {
    const g = new THREE.Group();
    g.position.set(i ? 0.105 : -0.105, 0.28, -0.2);
    head.add(g);
    mesh(G.sphere(), sharedMat(0xffffff), g, 0, 0, 0, 0.085);
    const pupil = mesh(G.sphere(), sharedMat(0x15151a), g, 0, 0, -0.07, 0.04, 0.04, 0.022);
    eyes.push({ g, pupil, sx: S(), sy: S(), k: i ? 105 : 150 });
  }
  const mouth = mesh(G.sphere(), sharedMat(0x4a1420), head, 0, 0.1, -0.238, 0.06, 0.014, 0.03);
  return { head, eyes, mouth, blinkT: 0, nextBlink: 1 + Math.random() * 3 };
}
// Googly pupils on springs, random blinks, dizzy orbit, "wide" eye scale.
function animFace(f, dt, t, lookX, lookY, dizzy, wide, talk, mouthW, shut = 0) {
  f.nextBlink -= dt;
  if (f.nextBlink <= 0) { f.blinkT = 0.13; f.nextBlink = 1.8 + Math.random() * 3.5; }
  f.blinkT = Math.max(0, f.blinkT - dt);
  const lid = Math.min(f.blinkT > 0 && dizzy < 0.3 ? 0.12 : 1, 1 - 0.88 * shut);
  for (let i = 0; i < 2; i++) {
    const e = f.eyes[i], ph = t * 9 + i * 2.2;
    const x = clamp(spring(e.sx, lookX, e.k, 5.5, dt) + Math.cos(ph) * 0.03 * dizzy, -0.036, 0.036);
    const y = clamp(spring(e.sy, lookY, e.k, 5.5, dt) + Math.sin(ph) * 0.03 * dizzy, -0.036, 0.036);
    e.pupil.position.set(x, y, -Math.sqrt(0.0052 - x * x - y * y));
    e.g.scale.set(wide, wide * lid, wide);
  }
  f.mouth.scale.set(mouthW, 0.013 + talk * 0.05, 0.03);
}

// Stubby standing legs with big shoes. Returns [L, R] hip pivots.
function buildLegs(root, legMat, shoeMat, hipY, spread) {
  const out = [];
  for (let i = 0; i < 2; i++) {
    const p = new THREE.Group();
    p.position.set(i ? spread : -spread, hipY, 0);
    root.add(p);
    mesh(G.cyl(), legMat, p, 0, -0.18, 0, 0.088, 0.36, 0.088);
    mesh(G.sphere(), shoeMat, p, 0, -0.36, -0.05, 0.1, 0.065, 0.155);
    out.push(p);
  }
  return out;
}

// Rubber-hose arm: two tapered segments (+ optional elbow ball) and a mitten hand, all parented to the root group.
function buildArm(root, side, sleeveMat, handMat, radius, rest, withElbow) {
  const a = {
    side, r: radius, rest, w: 0, grip: 0, init: false,
    upper: mesh(G.hose(), sleeveMat, root), lower: mesh(G.hose(), sleeveMat, root),
    elbow: withElbow ? mesh(G.sphere(), sleeveMat, root) : null,
    hand: new THREE.Group(),
    sh: new THREE.Vector3(), el: new THREE.Vector3(), pos: new THREE.Vector3(),
    relax: new THREE.Vector3(), tgt: new THREE.Vector3(),
  };
  root.add(a.hand);
  a.mitt = mesh(G.sphere(), handMat, a.hand);
  a.thumb = mesh(G.sphere(), handMat, a.hand);
  return a;
}
function placeSeg(m, from, to, r) {
  _s.subVectors(to, from);
  let l = _s.length();
  if (l < 1e-5) { _s.set(0, -1, 0); l = 1e-5; } else _s.multiplyScalar(1 / l);
  m.position.copy(from);
  m.quaternion.setFromUnitVectors(FWD, _s);
  m.scale.set(r, r, l);
}
// a.sh (shoulder) and a.pos (hand) are in root-local space. Slack arms sag at the elbow, stretched arms get thinner.
function solveArm(a, grip, dt) {
  a.grip += (grip - a.grip) * Math.min(1, dt * 16);
  const len = Math.max(_d.subVectors(a.pos, a.sh).length(), 0.02);
  const slack = Math.max(0, a.rest - len);
  a.el.addVectors(a.sh, a.pos).multiplyScalar(0.5);
  a.el.x += a.side * slack * 0.45; a.el.y -= slack * 0.55; a.el.z += slack * 0.25;
  const r = a.r * clamp(Math.sqrt(a.rest / len), 0.5, 1.2);
  placeSeg(a.upper, a.sh, a.el, r);
  placeSeg(a.lower, a.el, a.pos, r * 0.8);
  if (a.elbow) { a.elbow.position.copy(a.el); a.elbow.scale.setScalar(r * 0.84); }
  a.hand.position.copy(a.pos);
  a.hand.quaternion.copy(a.lower.quaternion);
  const g = a.grip; // open mitten (flat, thumb out) -> fist (rounder, smaller, thumb tucked)
  a.mitt.scale.set(0.082 - 0.014 * g, 0.048 + 0.02 * g, 0.098 - 0.026 * g);
  a.mitt.position.set(0, 0, -0.06 + 0.014 * g);
  a.thumb.scale.set(0.034, 0.03, 0.05 - 0.012 * g);
  a.thumb.position.set(-a.side * (0.078 - 0.034 * g), -0.012 * g, -0.045 - 0.02 * g);
}
// Blend the relaxed pose toward an optional WORLD-space target (exact once fully blended in).
function aimArm(a, worldTarget, group, dt) {
  if (worldTarget) { group.worldToLocal(a.tgt.copy(worldTarget)); a.w = Math.min(1, a.w + dt * 10); }
  else a.w = Math.max(0, a.w - dt * 7);
  a.pos.lerpVectors(a.relax, a.tgt, a.w * a.w * (3 - 2 * a.w));
}
function relaxArm(a, target, dt, rate = 14) {
  if (!a.init) { a.init = true; a.relax.copy(target); } else a.relax.lerp(target, 1 - Math.exp(-dt * rate));
}

// Floating name tag sprite (canvas pill).
function makeNameTag() {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 128;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, sizeAttenuation: true });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(0.9, 0.225, 1);
  sprite.renderOrder = 999;
  function draw(name, color) {
    const ctx = canvas.getContext('2d'), text = String(name ?? '').slice(0, 18) || '?';
    ctx.clearRect(0, 0, 512, 128);
    let px = 64;
    ctx.font = `bold ${px}px "Segoe UI", system-ui, Arial, sans-serif`;
    let tw = ctx.measureText(text).width;
    if (tw > 420) { px = Math.floor(px * 420 / tw); ctx.font = `bold ${px}px "Segoe UI", system-ui, Arial, sans-serif`; tw = ctx.measureText(text).width; }
    const w = Math.min(496, tw + 76), h = 100, x = (512 - w) / 2, y = 14, rad = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + rad, y); ctx.lineTo(x + w - rad, y);
    ctx.arc(x + w - rad, y + rad, rad, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(x + rad, y + h);
    ctx.arc(x + rad, y + rad, rad, Math.PI / 2, Math.PI * 1.5);
    ctx.closePath();
    ctx.fillStyle = 'rgba(22,24,34,0.85)'; ctx.fill();
    ctx.lineWidth = 9; ctx.strokeStyle = '#' + (color >>> 0).toString(16).padStart(6, '0').slice(-6); ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 66);
    tex.needsUpdate = true;
  }
  return { sprite, draw, dispose() { tex.dispose(); mat.dispose(); } };
}

// ============================================================================
// Chef cosmetics: catalog (pure data) + procedural builders
// ============================================================================
// lvl = chef level required, price = coins (0 = free at that level), ach = achievement id that unlocks it instead.
const item = (id, sv, en, lvl, price, ach) => (ach ? { id, n: [sv, en], lvl, price, ach } : { id, n: [sv, en], lvl, price });
export const COSMETICS = {
  hats: [
    item('toque', 'Kockmössa', 'Chef hat', 1, 0), item('party', 'Partyhatt', 'Party hat', 1, 0),
    item('pot', 'Kastrull', 'Saucepan', 1, 0), item('cone', 'Trafikkon', 'Traffic cone', 1, 0),
    item('colander', 'Durkslag', 'Colander', 2, 150), item('bucket', 'Kycklinghink', 'Chicken bucket', 3, 250),
    item('flowerpot', 'Blomkruka', 'Flower pot', 4, 350), item('friedegg', 'Stekt ägg', 'Fried egg', 5, 450),
    item('cheese', 'Ostbit', 'Cheese wedge', 6, 600), item('cowboy', 'Cowboyhatt', 'Cowboy hat', 7, 750),
    item('duck', 'Badanka', 'Rubber duck', 8, 900), item('fish', 'Färsk fisk', 'Fresh fish', 9, 1100),
    item('plunger', 'Vaskrensare', 'Plunger', 10, 1300), item('propeller', 'Propellerkeps', 'Propeller beanie', 11, 1500),
    item('pancakes', 'Pannkaksstapel', 'Pancake stack', 12, 1700), item('sombrero', 'Sombrero', 'Sombrero', 13, 1900),
    item('pirate', 'Pirathatt', 'Pirate hat', 14, 2100), item('tophat', 'Hög hatt', 'Top hat', 15, 2400),
    item('viking', 'Vikingahjälm', 'Viking helmet', 16, 2700), item('unicorn', 'Enhörning', 'Unicorn', 18, 3000),
    item('nest', 'Fågelbo', "Bird's nest", 1, 0, 'served50'), item('crown', 'Guldkrona', 'Golden crown', 1, 0, 'coins10000'),
  ],
  outfits: [
    item('classic', 'Klassisk vit', 'Classic white', 1, 0), item('black', 'Nattkock', 'Night chef', 1, 0),
    item('pink', 'Rosa', 'Pink', 1, 0), item('denim', 'Jeans', 'Denim', 1, 0),
    item('polka', 'Prickig', 'Polka dots', 2, 150), item('stripes', 'Fångränder', 'Prison stripes', 3, 300),
    item('banana', 'Banan', 'Banana', 5, 500), item('strawberry', 'Jordgubbe', 'Strawberry', 6, 650),
    item('cow', 'Ko', 'Cow print', 7, 800), item('camo', 'Kamouflage', 'Camo', 9, 1000),
    item('hawaii', 'Hawaiiskjorta', 'Hawaiian shirt', 10, 1300), item('rainbow', 'Regnbåge', 'Rainbow', 13, 1900),
    item('skeleton', 'Skelett', 'Skeleton', 15, 2400), item('tux', 'Smoking', 'Tuxedo', 18, 3000),
    item('superhero', 'Superhjälte', 'Superhero', 1, 0, 'stars3x5'), item('gold', 'Guldkostym', 'Golden suit', 1, 0, 'level20'),
  ],
  aprons: [
    item('plain', 'Vitt förkläde', 'Plain white', 1, 0), item('heart', 'Kyss kocken', 'Kiss the cook', 1, 0),
    item('star', 'Stjärna', 'Star', 1, 0), item('egg', 'Stekt ägg', 'Fried egg', 1, 0),
    item('pizza', 'Pizza', 'Pizza', 2, 150), item('cat', 'Katt', 'Cat', 3, 250),
    item('duck', 'Anka', 'Duck', 4, 400), item('bacon', 'Bacon', 'Bacon', 5, 550),
    item('fishbone', 'Fiskben', 'Fishbone', 6, 700), item('rainbow', 'Regnbåge', 'Rainbow', 8, 900),
    item('help', 'HJÄLP!', 'HELP!', 9, 1100), item('tie', 'Kontorsslips', 'Office tie', 11, 1400),
    item('flames', 'Lågor', 'Flames', 13, 1800), item('skull', 'Dödskalle', 'Skull', 15, 2200),
    item('muscles', 'Sexpack', 'Six-pack', 17, 2800),
    item('crown', 'Chefen', 'The boss', 1, 0, 'served200'), item('bonk', 'BONK!', 'BONK!', 1, 0, 'bonked25'),
  ],
  faces: [
    item('none', 'Inget', 'None', 1, 0), item('moustache', 'Mustasch', 'Moustache', 1, 0),
    item('glasses', 'Nördglasögon', 'Nerd glasses', 1, 0), item('blush', 'Rosiga kinder', 'Rosy cheeks', 1, 0),
    item('freckles', 'Fräknar', 'Freckles', 2, 150), item('unibrow', 'Monobryn', 'Unibrow', 4, 400),
    item('eyepatch', 'Ögonlapp', 'Eyepatch', 8, 1000), item('beard', 'Helskägg', 'Bushy beard', 11, 1500),
    item('sunglasses', 'Solglasögon', 'Sunglasses', 14, 2200),
    item('clownnose', 'Clownnäsa', 'Clown nose', 1, 0, 'thrown200'), item('monocle', 'Monokel', 'Monocle', 1, 0, 'level10'),
  ],
};
export const DEFAULT_LOOK = Object.freeze({ hat: 'toque', outfit: 'classic', apron: 'plain', face: 'none' });

// ---- cosmetic helpers: shared textures / textured materials (module-level caches, shared by all chefs) ----
const _tex = new Map();
const C = sharedMat;
const TAU = Math.PI * 2, HP = Math.PI / 2;
function canvasTex(key, w, h, paint, repX = 1) {
  let t = _tex.get(key);
  if (t) return t;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  paint(c.getContext('2d'), w, h);
  t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repX !== 1) { t.wrapS = THREE.RepeatWrapping; t.repeat.set(repX, 1); }
  _tex.set(key, t);
  return t;
}
function keyMat(key, make) { let m = _mat.get(key); if (!m) { m = make(); _mat.set(key, m); } return m; }
const mapMat = (key, tex, extra) => keyMat(key, () => new THREE.MeshToonMaterial({ color: 0xffffff, map: tex, gradientMap: gradientMap(), ...extra }));
const glassMat = (hex, opacity) => keyMat('glass' + hex + opacity, () => new THREE.MeshToonMaterial({ color: hex, gradientMap: gradientMap(), transparent: true, opacity }));
function rot(o, x = 0, y = 0, z = 0) { o.rotation.set(x, y, z); return o; }
function sub(parent, x = 0, y = 0, z = 0) { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; }
const EMOJI = '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
function dots(ctx, W, H, seed, n, r0, r1, colors, lumps = 1) { // random blobs, wrapped horizontally so the texture tiles
  const rnd = rng(seed);
  for (let i = 0; i < n; i++) {
    const x = rnd() * W, y = rnd() * H, r = r0 + rnd() * (r1 - r0);
    ctx.fillStyle = colors[i % colors.length];
    for (let k = 0; k < lumps; k++) {
      const ox = k ? (rnd() - 0.5) * r * 1.6 : 0, oy = k ? (rnd() - 0.5) * r * 1.6 : 0, rr = k ? r * (0.5 + rnd() * 0.5) : r;
      for (let w = -1; w <= 1; w++) { ctx.beginPath(); ctx.ellipse(x + ox + w * W, y + oy, rr, rr * (0.7 + rnd() * 0.5), rnd() * 3, 0, TAU); ctx.fill(); }
    }
  }
}
// extra shared geometries used only by cosmetics
const fr = (ratio) => geo('fr' + ratio, () => new THREE.CylinderGeometry(ratio, 1, 1, 14).translate(0, 0.5, 0)); // frustum, base (r = 1) at y = 0, top r = ratio
G.prism = () => geo('prism', () => { const g = new THREE.CylinderGeometry(1, 1, 1, 3).toNonIndexed(); g.computeVertexNormals(); return g; }); // corner toward +Z
G.rim = () => geo('rim', () => new THREE.TorusGeometry(1, 0.17, 8, 20));
G.thread = () => geo('thread', () => new THREE.TorusGeometry(1, 0.022, 6, 24));
G.apron = () => geo('apron', () => new THREE.SphereGeometry(1, 14, 8, Math.PI * 1.5 - 0.8, 1.6, Math.PI * 0.27, Math.PI * 0.5)); // belly-hugging front panel, faces -Z
G.daisy = () => geo('daisy', () => {
  const s = new THREE.Shape();
  for (let i = 0; i <= 64; i++) { const a = i / 64 * TAU, r = 0.42 + 0.58 * Math.abs(Math.cos(a * 4)); s[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); }
  return new THREE.ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: false }).translate(0, 0, -0.06);
});

// ---- HATS ----
// Builder (h, accent) -> { top, wob?, sq?, anim? }. `h` is a throwaway group inside the springy hat pivot:
// y = 0 is the brim line (skull radius there ~0.17, skull crown at y ~ +0.06), -Z is the face side.
// top = hat height above the pivot (drives the name tag + dizzy stars), wob = wobble multiplier (floppy > 1),
// sq = squash & stretch amount (hard hats < 1), anim(fx) = per-frame animation (fx: see makeChef).
const STEEL = 0xb9c0c9, STEEL_D = 0x8d949e, GOLD = 0xffc81e, WOOD = 0xb98a4e;
const HATS = {
  toque(h, accent) {                                       // the classic: band, stem, puff + two lobes
    const white = C(0xfafaf7);
    mesh(G.cyl(), accent, h, 0, 0.04, 0, 0.205, 0.08, 0.205);
    mesh(G.cyl(), white, h, 0, 0.16, 0, 0.19, 0.2, 0.19);
    mesh(G.sphere(), white, h, 0, 0.29, 0, 0.27, 0.13, 0.27);
    mesh(G.sphere(), white, h, -0.13, 0.31, 0.05, 0.13);
    mesh(G.sphere(), white, h, 0.12, 0.32, -0.05, 0.12);
    return { top: 0.44 };
  },
  cone(h) {                                                // traffic cone: square base, two reflective stripes
    const o = C(0xff6a13), w = C(0xf4f4f0);
    mesh(G.box(), o, h, 0, 0.015, 0, 0.5, 0.035, 0.5);
    mesh(fr(0.12), o, h, 0, 0.03, 0, 0.19, 0.56, 0.19);
    mesh(fr(0.745), w, h, 0, 0.03 + 0.56 * 0.35, 0, 0.137, 0.112, 0.137);
    mesh(fr(0.745), w, h, 0, 0.03 + 0.56 * 0.68, 0, 0.08, 0.067, 0.08);
    return { top: 0.62, wob: 1.7, sq: 0.6 };
  },
  nest(h) {                                                // twig nest with three live birds
    rot(mesh(G.ring(), C(0x8a5a2b), h, 0, 0.05, 0, 0.2), HP);
    rot(mesh(G.ring(), C(0xa8733a), h, 0, 0.115, 0, 0.235, 0.235, 0.17), HP, 0, 0.4);
    mesh(G.sphere(), C(0x5d3a1a), h, 0, 0.05, 0, 0.2, 0.05, 0.2);
    rot(mesh(G.box(), C(0x6e4520), h, 0.24, 0.1, 0.08, 0.2, 0.014, 0.014), 0, 0.5, 0.3);
    rot(mesh(G.box(), C(0xa8733a), h, -0.22, 0.13, -0.1, 0.22, 0.012, 0.012), 0, -0.7, -0.25);
    const birds = [];
    const defs = [[0xffd84a, -0.09, 0.185, 0.05, 1.25], [0x5ab4ff, 0.095, 0.18, 0.02, 1.1], [0xff6a5a, 0.01, 0.105, -0.16, 1]];
    for (let i = 0; i < 3; i++) {
      const [col, x, y, z, s] = defs[i], g = sub(h, x, y, z), dark = C(tintHex(col, 0x000000, 0.25));
      g.scale.setScalar(s);
      mesh(G.sphere(), C(col), g, 0, 0, 0, 0.062, 0.058, 0.062);
      rot(mesh(G.cone(), C(0xff8a1e), g, 0, -0.005, -0.068, 0.018, 0.04, 0.014), -HP);
      mesh(G.sphere(), C(0x15151a), g, -0.025, 0.02, -0.052, 0.011);
      mesh(G.sphere(), C(0x15151a), g, 0.025, 0.02, -0.052, 0.011);
      const wings = [mesh(G.sphere(), dark, g, -0.06, 0, 0.008, 0.014, 0.03, 0.042), mesh(G.sphere(), dark, g, 0.06, 0, 0.008, 0.014, 0.03, 0.042)];
      birds.push({ g, wings, y0: y, peek: i === 2, look: S(), yaw: 0, next: Math.random() * 2, flap: 0, hop: 0, ph: i * 2.1 });
    }
    return {
      top: 0.36, wob: 1.15,
      anim(fx) {
        for (let i = 0; i < 3; i++) {
          const b = birds[i], dt = fx.dt, T = fx.T;
          b.next -= dt * (1 + fx.dizzy * 6 + fx.shake * 3);
          if (b.next <= 0) {                               // pick something to do: look around / flap / hop
            const r = Math.random();
            if (r < 0.5) b.yaw = (Math.random() - 0.5) * 2.6; else if (r < 0.78) b.flap = 0.45; else { b.hop = 0.35; b.flap = 0.35; }
            b.next = 0.5 + Math.random() * 2.2;
          }
          if (fx.shake > 0.55 && b.flap <= 0) b.flap = 0.4;   // head got jolted -> panic flap
          b.flap = Math.max(0, b.flap - dt); b.hop = Math.max(0, b.hop - dt);
          const wild = Math.max(fx.dizzy, b.flap > 0 ? 1 : 0), f = Math.sin(T * 38 + b.ph) * 0.95 * wild;
          const hopY = b.hop > 0 ? Math.sin((1 - b.hop / 0.35) * Math.PI) * 0.07 : 0;
          const peekY = b.peek ? (0.5 + 0.5 * Math.sin(T * 0.9)) * 0.075 : 0;
          b.g.position.y = b.y0 + peekY + hopY + Math.sin(T * 3 + b.ph) * 0.006 + Math.abs(Math.sin(T * 11 + b.ph)) * 0.06 * fx.dizzy;
          b.g.rotation.set(clamp(fx.hx * 0.05, -0.5, 0.5) + Math.sin(T * 2.3 + b.ph) * 0.07,
            spring(b.look, b.yaw, 70, 9, dt) + Math.sin(T * 17 + b.ph) * 0.8 * fx.dizzy, clamp(fx.hz * 0.05, -0.5, 0.5));
          b.wings[0].rotation.z = f + 0.15; b.wings[1].rotation.z = -f - 0.15;
          b.wings[0].position.y = b.wings[1].position.y = Math.abs(f) * 0.02;
        }
      },
    };
  },
  pot(h) {                                                 // upside-down saucepan, handle sticking out
    mesh(G.cyl(), C(STEEL), h, 0, 0.09, 0, 0.25, 0.25, 0.25);
    mesh(G.cyl(), C(STEEL_D), h, 0, 0.222, 0, 0.235, 0.02, 0.235);
    rot(mesh(G.torus(), C(STEEL_D), h, 0, -0.03, 0, 0.255, 0.255, 0.3), HP);
    rot(mesh(G.box(), C(0x22232b), h, 0.4, 0.0, 0.06, 0.34, 0.035, 0.055), 0, -0.25, 0.08);
    return { top: 0.27, wob: 0.8, sq: 0.3 };
  },
  colander(h) {                                            // steel colander helmet (holes painted on)
    const t = canvasTex('colander', 128, 64, (c, W, H) => {
      c.fillStyle = '#c3cad3'; c.fillRect(0, 0, W, H); c.fillStyle = '#4a4f59';
      for (let y = 0; y < 5; y++) for (let x = 0; x < 16; x++) { c.beginPath(); c.arc(x * 8 + (y % 2 ? 6 : 2), 12 + y * 10, 1.9, 0, TAU); c.fill(); }
    });
    mesh(G.dome(), mapMat('colander', t), h, 0, -0.04, 0, 0.275, 0.27, 0.275);
    rot(mesh(G.torus(), C(STEEL_D), h, 0, -0.04, 0, 0.28, 0.28, 0.35), HP);
    rot(mesh(G.torus(), C(STEEL_D), h, 0, 0.225, 0, 0.09, 0.09, 0.3), HP);
    for (const s of [-1, 1]) rot(mesh(G.torus(), C(STEEL_D), h, s * 0.31, -0.02, 0, 0.055, 0.055, 0.25), HP, 0, 0);
    return { top: 0.27, sq: 0.3 };
  },
  cowboy(h, accent) {
    const br = C(0x9a6a3a), dk = C(0x7c5229);
    mesh(G.sphere(), br, h, 0, 0.03, 0, 0.43, 0.022, 0.36);
    for (const s of [-1, 1]) rot(mesh(G.sphere(), br, h, s * 0.37, 0.075, 0, 0.1, 0.02, 0.3), 0, 0, s * 0.85);   // curled brim
    mesh(fr(0.82), br, h, 0, 0.03, 0, 0.2, 0.2, 0.2);
    mesh(G.sphere(), dk, h, 0, 0.23, 0, 0.15, 0.035, 0.19);
    mesh(G.cyl(), accent, h, 0, 0.065, 0, 0.203, 0.045, 0.203);
    return { top: 0.3, wob: 1.1 };
  },
  crown(h) {                                               // gold crown, velvet, gems
    const g = C(GOLD), gems = [0xe8413c, 0x2f7fe8, 0x35b34a];
    mesh(G.cyl(), g, h, 0, 0.07, 0, 0.2, 0.11, 0.2);
    mesh(G.sphere(), C(0xa01f3a), h, 0, 0.1, 0, 0.18, 0.12, 0.18);
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * TAU + Math.PI;
      mesh(G.cone(), g, h, Math.sin(a) * 0.175, 0.19, Math.cos(a) * 0.175, 0.045, 0.14, 0.045);
    }
    for (let i = 0; i < 3; i++) { const a = Math.PI + (i - 1) * 0.62; mesh(G.star(), C(gems[i]), h, Math.sin(a) * 0.205, 0.07, Math.cos(a) * 0.205, 0.03); }
    return { top: 0.3, sq: 0.4 };
  },
  viking(h) {                                              // helmet with two-segment horns
    const horn = C(0xf1e6c8);
    mesh(G.dome(), C(STEEL), h, 0, -0.04, 0, 0.275, 0.26, 0.275);
    rot(mesh(G.rim(), C(0xb07a2a), h, 0, -0.03, 0, 0.27), HP);
    mesh(G.box(), C(0xb07a2a), h, 0, -0.06, -0.272, 0.05, 0.13, 0.025);
    mesh(G.sphere(), C(0xb07a2a), h, 0, 0.225, 0, 0.04);
    for (const s of [-1, 1]) {
      rot(mesh(fr(0.62), horn, h, s * 0.23, 0.06, 0, 0.065, 0.17, 0.065), 0, 0, -s * 1.15);
      rot(mesh(G.cone(), horn, h, s * 0.415, 0.215, 0, 0.041, 0.2, 0.041), 0, 0, -s * 0.2);
    }
    return { top: 0.34, sq: 0.3 };
  },
  propeller(h) {                                           // beanie; the propeller spins with walking speed
    const t = canvasTex('beanie', 64, 8, (c, W, H) => ['#e8413c', '#ffcf33', '#2f7fe8', '#35b34a'].forEach((col, i) => { c.fillStyle = col; c.fillRect(i * W / 4, 0, W / 4, H); }), 2);
    mesh(G.dome(), mapMat('beanie', t), h, 0, -0.02, 0, 0.24, 0.23, 0.24);
    mesh(G.sphere(), C(0xe8413c), h, 0, -0.012, -0.22, 0.13, 0.014, 0.1);
    mesh(G.cyl(), C(0xf4f4f0), h, 0, 0.245, 0, 0.014, 0.08, 0.014);
    const rotor = sub(h, 0, 0.29, 0);
    mesh(G.sphere(), C(0xffcf33), rotor, 0, 0, 0, 0.03);
    rot(mesh(G.sphere(), C(0xe8413c), rotor, 0.1, 0, 0, 0.1, 0.008, 0.034), 0.35);
    rot(mesh(G.sphere(), C(0x2f7fe8), rotor, -0.1, 0, 0, 0.1, 0.008, 0.034), -0.35);
    return { top: 0.34, anim(fx) { rotor.rotation.y = (rotor.rotation.y + fx.dt * (1.5 + fx.speed * 11 + fx.shake * 8 + fx.dizzy * 30)) % TAU; } };
  },
  party(h) {                                               // party cone, pom-pom, elastic under the chin
    const t = canvasTex('party', 64, 64, (c, W, H) => {
      c.fillStyle = '#9656e0'; c.fillRect(0, 0, W, H);
      ['#ffcf33', '#19bfb0', '#ff6fb0'].forEach((col, i) => { c.fillStyle = col; for (let k = 0; k < 8; k++) { c.beginPath(); c.arc((k * 16 + i * 5) % W, 8 + i * 20 + (k % 2) * 6, 3.5, 0, TAU); c.fill(); } });
    }, 2);
    const g = sub(h, 0.05, 0, 0); g.rotation.z = -0.2;
    mesh(fr(0.03), mapMat('party', t), g, 0, 0.0, 0, 0.15, 0.44, 0.15);
    mesh(G.sphere(), C(0xffcf33), g, 0, 0.45, 0, 0.05);
    rot(mesh(G.ring(), C(0xff6fb0), g, 0, 0.01, 0, 0.14, 0.14, 0.1), HP);
    mesh(G.thread(), C(0xf4f4f0), h, 0, -0.245, 0, 0.268, 0.3, 0.268);
    return { top: 0.52, wob: 1.8 };
  },
  tophat(h, accent) {
    const bk = C(0x1d1d24);
    mesh(G.cyl(), bk, h, 0, 0.03, 0, 0.31, 0.025, 0.31);
    mesh(fr(1.1), bk, h, 0, 0.03, 0, 0.19, 0.37, 0.19);
    mesh(G.cyl(), accent, h, 0, 0.08, 0, 0.197, 0.06, 0.197);
    rot(mesh(G.box(), C(0xf4f4f0), h, 0.13, 0.13, -0.16, 0.07, 0.1, 0.006), 0, -0.65, 0.2);   // card tucked in the band
    return { top: 0.43, wob: 1.35, sq: 0.7 };
  },
  flowerpot(h) {                                           // terracotta pot, daisy swaying on its own spring
    const tc = C(0xc9643a);
    mesh(fr(1.35), tc, h, 0, 0.0, 0, 0.15, 0.22, 0.15);
    mesh(G.cyl(), tc, h, 0, 0.225, 0, 0.222, 0.05, 0.222);
    mesh(G.cyl(), C(0x4a2f1c), h, 0, 0.245, 0, 0.19, 0.02, 0.19);
    const stem = sub(h, 0, 0.25, 0), sx = S(), sz = S();
    mesh(G.cyl(), C(0x3f9a3a), stem, 0, 0.15, 0, 0.012, 0.3, 0.012);
    rot(mesh(G.sphere(), C(0x3f9a3a), stem, 0.05, 0.11, 0, 0.055, 0.008, 0.025), 0, 0, 0.5);
    const flower = sub(stem, 0, 0.31, -0.01); flower.rotation.x = 0.35;
    mesh(G.daisy(), C(0xfafaf7), flower, 0, 0, 0, 0.1, 0.1, 0.1);
    mesh(G.sphere(), C(0xffcf33), flower, 0, 0, 0, 0.042, 0.042, 0.03);
    return {
      top: 0.68, wob: 1.2, sq: 0.5,
      anim(fx) {
        spring(sx, clamp(-fx.hx * 0.12, -1, 1), 38, 2.2, fx.dt); spring(sz, clamp(-fx.hz * 0.12, -1, 1) + Math.sin(fx.T * 5) * 0.5 * fx.dizzy, 38, 2.2, fx.dt);
        stem.rotation.set(clamp(sx.x, -0.9, 0.9), 0, clamp(sz.x, -0.9, 0.9) + Math.sin(fx.T * 1.7) * 0.06);
        flower.rotation.z = -stem.rotation.z * 0.6;
      },
    };
  },
  friedegg(h) {                                            // floppy fried egg draped over the skull
    const w = C(0xfdfbf2), lobes = [];
    mesh(G.dome(), w, h, 0, -0.035, 0, 0.29, 0.125, 0.29);
    for (let i = 0; i < 5; i++) {
      const a = i * 1.3 + 0.4, r = 0.25 + (i % 2) * 0.03, p = sub(h, Math.sin(a) * r, -0.005, Math.cos(a) * r);
      p.rotation.y = a;
      mesh(G.sphere(), w, p, 0, -0.02, 0.03, 0.1 + (i % 3) * 0.02, 0.022, 0.1);
      lobes.push(p);
    }
    mesh(G.sphere(), C(0xffb81f), h, 0.03, 0.095, -0.04, 0.095, 0.06, 0.095);
    mesh(G.sphere(), C(0xffffff), h, 0.0, 0.14, -0.08, 0.022, 0.012, 0.018);
    return {
      top: 0.2, wob: 1.3,
      anim(fx) { for (let i = 0; i < 5; i++) lobes[i].rotation.x = 0.55 + Math.sin(fx.phase * 2 + i * 1.9) * 0.3 * fx.amp + Math.sin(fx.T * 14 + i) * 0.25 * Math.max(fx.dizzy, fx.shake) - fx.air * 0.5; },
    };
  },
  fish(h) {                                                // a fish lying across the head, tail slaps now and then
    const body = C(0x6fa8c9), fin = C(0x3f7fa6);
    mesh(G.sphere(), body, h, -0.02, 0.105, 0, 0.27, 0.075, 0.12);
    mesh(G.sphere(), C(0xdfeef5), h, -0.02, 0.085, -0.03, 0.22, 0.06, 0.1);
    rot(mesh(G.cone(), fin, h, 0.0, 0.12, 0.13, 0.09, 0.1, 0.02), HP, 0, 0);
    mesh(G.sphere(), C(0xffffff), h, -0.2, 0.165, -0.02, 0.032);
    mesh(G.sphere(), C(0x15151a), h, -0.205, 0.19, -0.025, 0.015);
    const tail = sub(h, 0.22, 0.1, 0);
    rot(mesh(G.cone(), fin, tail, 0.09, 0, 0, 0.02, 0.18, 0.13), 0, 0, HP);
    let next = 1.5, burst = 0;
    return {
      top: 0.26, wob: 1.2,
      anim(fx) {
        next -= fx.dt * (1 + fx.dizzy * 5 + fx.shake * 2);
        if (next <= 0) { burst = 0.7; next = 1.6 + Math.random() * 3.5; }
        burst = Math.max(0, burst - fx.dt);
        tail.rotation.z = -0.35 + (burst > 0 ? Math.sin(fx.T * 26) * 0.7 * Math.min(1, burst * 4) : 0);
      },
    };
  },
  duck(h) {                                                // rubber duck, rocking
    const y = C(0xffd21f), g = sub(h, 0, 0.04, 0);
    mesh(G.sphere(), y, g, 0, 0.12, 0.02, 0.17, 0.125, 0.2);
    rot(mesh(G.cone(), y, g, 0, 0.19, 0.2, 0.07, 0.12, 0.05), 0.9);
    mesh(G.sphere(), y, g, 0, 0.29, -0.09, 0.105);
    mesh(G.sphere(), C(0xff7a1a), g, 0, 0.275, -0.2, 0.055, 0.022, 0.06);
    for (const s of [-1, 1]) { mesh(G.sphere(), C(0x15151a), g, s * 0.05, 0.325, -0.175, 0.016); mesh(G.sphere(), y, g, s * 0.16, 0.13, 0.04, 0.03, 0.07, 0.11); }
    return { top: 0.46, wob: 1.25, anim(fx) { g.rotation.set(Math.sin(fx.T * 2.2) * 0.08, Math.sin(fx.T * 0.8) * 0.25, Math.sin(fx.T * 3.1) * 0.1 * (1 + fx.amp * 2)); } };
  },
  cheese(h) {                                              // big cheese wedge with holes
    const hole = C(0xd99a16), g = sub(h);
    g.rotation.y = Math.PI + 0.45; h = g;
    mesh(G.prism(), C(0xffc93c), h, 0, 0.15, 0.03, 0.3, 0.2, 0.3);
    mesh(G.box(), C(0xe8413c), h, 0, 0.15, -0.125, 0.52, 0.205, 0.014);   // wax rind on the wide end
    mesh(G.sphere(), hole, h, 0.06, 0.252, 0.0, 0.05, 0.012, 0.05);
    mesh(G.sphere(), hole, h, -0.07, 0.252, -0.06, 0.03, 0.012, 0.03);
    rot(mesh(G.sphere(), hole, h, 0.15, 0.14, 0.07, 0.045, 0.045, 0.012), 0, 1.047, 0);
    rot(mesh(G.sphere(), hole, h, -0.1, 0.17, 0.157, 0.035, 0.035, 0.012), 0, -1.047, 0);
    return { top: 0.3, sq: 0.6 };
  },
  plunger(h) {                                             // toilet plunger stuck on, stick wobbling on a spring
    const g = sub(h, 0.03, 0.02, 0), sx = S(), sz = S();
    g.rotation.set(-0.15, 0, -0.3);
    mesh(G.dome(), C(0xc8322b), g, 0, 0, 0, 0.17, 0.12, 0.17);
    rot(mesh(G.rim(), C(0xa82620), g, 0, 0.005, 0, 0.165, 0.165, 0.12), HP);
    const stick = sub(g, 0, 0.11, 0);
    mesh(G.cyl(), C(WOOD), stick, 0, 0.23, 0, 0.02, 0.46, 0.02);
    mesh(G.sphere(), C(WOOD), stick, 0, 0.46, 0, 0.026);
    return {
      top: 0.66, wob: 1.6, sq: 0.8,
      anim(fx) {
        spring(sx, clamp(-fx.hx * 0.1, -1, 1), 45, 1.8, fx.dt); spring(sz, clamp(-fx.hz * 0.1, -1, 1) + Math.sin(fx.T * 6) * 0.4 * fx.dizzy, 45, 1.8, fx.dt);
        stick.rotation.set(clamp(sx.x, -0.7, 0.7), 0, clamp(sz.x, -0.7, 0.7));
      },
    };
  },
  pirate(h, accent) {                                      // tricorn over a bandana, skull badge in front
    const bk = C(0x1d1d24), t = canvasTex('skullbadge', 64, 64, (c) => { c.font = `50px ${EMOJI}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('☠️', 32, 35); });
    rot(mesh(G.ring(), accent, h, 0, 0.0, 0, 0.2, 0.2, 0.16), HP);
    mesh(G.dome(), bk, h, 0, 0.03, 0, 0.215, 0.17, 0.215);
    mesh(G.prism(), bk, h, 0, 0.045, 0.02, 0.43, 0.03, 0.43);
    for (let i = 0; i < 3; i++) {
      const a = Math.PI + i * TAU / 3, f = mesh(G.box(), bk, h, Math.sin(a) * 0.2, 0.115, 0.02 + Math.cos(a) * 0.2, 0.62, 0.15, 0.02);
      f.rotation.order = 'YXZ'; f.rotation.set(-0.4, a, 0);
    }
    const badge = mesh(geo('plane', () => new THREE.PlaneGeometry(1, 1)), mapMat('skullbadge', t, { transparent: true, alphaTest: 0.4 }), h, 0, 0.125, -0.197, 0.13);
    badge.rotation.order = 'YXZ'; badge.rotation.set(-0.4, Math.PI, 0);
    return { top: 0.3, wob: 1.1 };
  },
  unicorn(h) {                                             // spiral horn, ears, pastel mane
    const t = canvasTex('horn', 32, 64, (c, W, H) => {
      c.fillStyle = '#fff3fb'; c.fillRect(0, 0, W, H); c.strokeStyle = '#ff9ad5'; c.lineWidth = 5;
      for (let y = -32; y < H + 32; y += 16) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y + 24); c.stroke(); }
    }, 2);
    const wh = C(0xfafaf7), mane = [0xff8ac2, 0xb57bff, 0x7ad1ff];
    rot(mesh(fr(0.04), mapMat('horn', t), h, 0, 0.04, -0.09, 0.05, 0.36, 0.05), -0.3);
    rot(mesh(G.torus(), C(0xff8ac2), h, 0, 0.0, 0, 0.205, 0.205, 0.3), HP);
    for (const s of [-1, 1]) {
      rot(mesh(G.cone(), wh, h, s * 0.15, 0.1, 0.0, 0.05, 0.13, 0.03), 0, 0, -s * 0.35);
      rot(mesh(G.cone(), C(0xff9ad5), h, s * 0.148, 0.095, -0.014, 0.028, 0.09, 0.02), 0, 0, -s * 0.35);
    }
    for (let i = 0; i < 3; i++) mesh(G.sphere(), C(mane[i]), h, 0, 0.04 - i * 0.13, 0.17 + i * 0.045 - i * i * 0.012, 0.085 - i * 0.008);
    return { top: 0.42, wob: 1.25 };
  },
  bucket(h) {                                              // striped chicken bucket, upside down
    const t = canvasTex('bucket', 256, 128, (c, W, H) => {
      for (let i = 0; i < 16; i++) { c.fillStyle = i % 2 ? '#f6f3ea' : '#d8202c'; c.fillRect(i * 16, 0, 16, H); }
      c.fillStyle = '#f6f3ea'; c.beginPath(); c.arc(W * 0.75, H * 0.52, 34, 0, TAU); c.fill();
      c.font = `44px ${EMOJI}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('🍗', W * 0.75, H * 0.55);
    });
    mesh(fr(0.78), mapMat('bucket', t), h, 0, -0.05, 0, 0.265, 0.33, 0.265);
    rot(mesh(G.torus(), C(0xf6f3ea), h, 0, -0.045, 0, 0.27, 0.27, 0.3), HP);
    rot(mesh(G.torus(), C(STEEL_D), h, 0, 0.12, 0.04, 0.262, 0.2, 0.12), 0.5, HP, 0);
    return { top: 0.3, sq: 0.5 };
  },
  pancakes(h) {                                            // pancake stack, syrup + butter
    for (let i = 0; i < 3; i++) mesh(G.sphere(), C(i % 2 ? 0xe0a24a : 0xd18f3a), h, (i - 1) * 0.015, 0.06 + i * 0.058, (i % 2) * 0.02, 0.26 - i * 0.015, 0.036, 0.26 - i * 0.015);
    mesh(G.sphere(), C(0x8a4513), h, 0, 0.2, 0, 0.19, 0.022, 0.18);
    mesh(G.sphere(), C(0x8a4513), h, 0.17, 0.13, -0.1, 0.035, 0.08, 0.03);
    rot(mesh(G.box(), C(0xffe680), h, 0.02, 0.23, -0.01, 0.075, 0.035, 0.075), 0, 0.4, 0);
    return { top: 0.28, wob: 1.3 };
  },
  sombrero(h, accent) {
    const st = C(0xe9c46a);
    mesh(G.sphere(), st, h, 0, 0.03, 0, 0.5, 0.03, 0.5);
    rot(mesh(G.torus(), accent, h, 0, 0.04, 0, 0.49, 0.49, 0.5), HP);
    mesh(fr(0.35), st, h, 0, 0.03, 0, 0.2, 0.3, 0.2);
    rot(mesh(G.torus(), C(0xd8202c), h, 0, 0.08, 0, 0.19, 0.19, 0.4), HP);
    return { top: 0.36, wob: 1.4 };
  },
};

// ---- OUTFITS ----
// j = jacket (+ sleeve) colour, p = trousers colour, paint = jacket pattern (256 px canvas; sphere UVs: the chest
// centre is at u = 0.75, canvas top = neck), rep = horizontal repeats, sl / pm = sleeves / trousers reuse the pattern,
// limb = separate pattern for sleeves + trousers, btn / knot = show jacket buttons / kerchief knot, extra = body add-on.
const fill = (c, W, H, col) => { c.fillStyle = col; c.fillRect(0, 0, W, H); };
const OUTFITS = {
  classic: { j: 0xfafaf7, p: 0x3a4454 },
  black: { j: 0x2a2a33, p: 0x16161c },
  pink: { j: 0xff7eb6, p: 0x8e3a6a },
  denim: {
    j: 0x4a78b8, p: 0x2f4f85, rep: 2, sl: true,
    paint(c, W, H) {
      fill(c, W, H, '#4a78b8'); c.lineWidth = 1;
      for (let i = -H; i < W; i += 4) { c.strokeStyle = i % 8 ? 'rgba(255,255,255,0.16)' : 'rgba(10,20,60,0.2)'; c.beginPath(); c.moveTo(i, 0); c.lineTo(i + H, H); c.stroke(); }
      c.strokeStyle = '#f0a63a'; c.setLineDash([7, 5]); c.lineWidth = 2;
      for (const x of [W * 0.25, W * 0.75]) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
    },
  },
  polka: {
    j: 0xe8334f, p: 0x7d1a2b, rep: 2, sl: true,
    paint(c, W, H) { fill(c, W, H, '#e8334f'); c.fillStyle = '#fff'; for (let y = 0; y < 8; y++) for (let x = 0; x < 4; x++) { c.beginPath(); c.arc(x * 64 + (y % 2 ? 48 : 16), y * 32 + 16, 10, 0, TAU); c.fill(); } },
  },
  stripes: {
    j: 0xf4f4f0, p: 0x22222a, sl: true, pm: true, btn: false,
    paint(c, W, H) { fill(c, W, H, '#f4f4f0'); c.fillStyle = '#1d1d24'; for (let y = 0; y < H; y += 32) c.fillRect(0, y, W, 16); },
  },
  banana: {
    j: 0xffd92e, p: 0x7a5a1e, rep: 2, sl: true,
    paint(c, W, H) { fill(c, W, H, '#ffd92e'); dots(c, W, H, 7, 16, 3, 11, ['#6b4a1e', '#8a6424']); c.fillStyle = 'rgba(190,140,20,0.35)'; for (let x = 20; x < W; x += 64) c.fillRect(x, 0, 4, H); },
  },
  strawberry: {
    j: 0xe8283c, p: 0x2e8b3a, rep: 2, sl: true,
    paint(c, W, H) {
      fill(c, W, H, '#e8283c'); c.fillStyle = '#ffe27a';
      for (let y = 0; y < 8; y++) for (let x = 0; x < 6; x++) { c.beginPath(); c.ellipse(x * 43 + (y % 2 ? 30 : 9), y * 32 + 18, 3.5, 6, 0, 0, TAU); c.fill(); }
    },
  },
  cow: { j: 0xfafaf7, p: 0x22222a, rep: 2, sl: true, pm: true, paint(c, W, H) { fill(c, W, H, '#fafaf7'); dots(c, W, H, 11, 9, 16, 30, ['#1d1d24'], 4); } },
  camo: {
    j: 0x5b6b3a, p: 0x3e4a2a, rep: 2, sl: true, pm: true,
    paint(c, W, H) { fill(c, W, H, '#5b6b3a'); dots(c, W, H, 3, 8, 16, 30, ['#3e4a2a', '#8a8f5a', '#2f3622'], 3); dots(c, W, H, 5, 8, 10, 20, ['#8a8f5a', '#2f3622'], 3); },
  },
  hawaii: {
    j: 0x19b5c9, p: 0xe9d8a6, rep: 2, sl: true,
    paint(c, W, H) {
      fill(c, W, H, '#19b5c9');
      const rnd = rng(21), cols = ['#ffffff', '#ffcf33', '#ff6fb0', '#ff8a24'];
      dots(c, W, H, 9, 10, 8, 14, ['#1f8f4a']);
      for (let i = 0; i < 9; i++) {
        const x = rnd() * W, y = rnd() * H, r = 9 + rnd() * 6;
        for (let w = -1; w <= 1; w++) {
          c.fillStyle = cols[i % 4];
          for (let k = 0; k < 5; k++) { c.beginPath(); c.arc(x + w * W + Math.cos(k * 1.257) * r, y + Math.sin(k * 1.257) * r, r * 0.72, 0, TAU); c.fill(); }
          c.fillStyle = '#d8202c'; c.beginPath(); c.arc(x + w * W, y, r * 0.45, 0, TAU); c.fill();
        }
      }
    },
  },
  rainbow: {
    j: 0xffcf33, p: 0x9656e0, sl: true,
    paint(c, W, H) { ['#e8413c', '#ff8a24', '#ffcf33', '#35b34a', '#2f7fe8', '#9656e0'].forEach((col, i) => { c.fillStyle = col; c.fillRect(0, i * H / 6, W, H / 6 + 1); }); },
  },
  skeleton: {
    j: 0x15151a, p: 0x15151a, btn: false,
    paint(c, W, H) {                                       // rib cage front (u = 0.75) and back (u = 0.25)
      fill(c, W, H, '#15151a'); c.strokeStyle = '#f4f4ee'; c.lineCap = 'round';
      for (const x of [W * 0.75, W * 0.25]) {
        c.lineWidth = 9; c.beginPath(); c.moveTo(x, 26); c.lineTo(x, 200); c.stroke();
        c.lineWidth = 6;
        for (let k = 0; k < 6; k++) { c.beginPath(); c.ellipse(x, 44 + k * 17, 44 - k * 3, 9, 0, 0.15, Math.PI - 0.15); c.stroke(); }
        c.beginPath(); c.ellipse(x, 214, 30, 14, 0, Math.PI, TAU); c.stroke();
      }
    },
    limb(c, W, H) {                                        // one long bone front and back
      fill(c, W, H, '#15151a'); c.strokeStyle = c.fillStyle = '#f4f4ee'; c.lineCap = 'round'; c.lineWidth = 9;
      for (const x of [0, W / 2, W]) {
        c.beginPath(); c.moveTo(x, 18); c.lineTo(x, H - 18); c.stroke();
        for (const [dx, y] of [[-5, 14], [5, 14], [-5, H - 14], [5, H - 14]]) { c.beginPath(); c.arc(x + dx, y, 6, 0, TAU); c.fill(); }
      }
    },
  },
  tux: {
    j: 0x1d1d24, p: 0x1d1d24, btn: false, knot: false,
    paint(c, W, H) {                                       // white shirt front with studs, satin lapels
      fill(c, W, H, '#1d1d24');
      const x = W * 0.75;
      c.fillStyle = '#fafaf7'; c.beginPath(); c.moveTo(x - 30, 0); c.lineTo(x + 30, 0); c.lineTo(x + 5, 150); c.lineTo(x - 5, 150); c.closePath(); c.fill();
      c.strokeStyle = '#3a3a48'; c.lineWidth = 7; c.beginPath(); c.moveTo(x - 33, 0); c.lineTo(x - 6, 152); c.moveTo(x + 33, 0); c.lineTo(x + 6, 152); c.stroke();
      c.fillStyle = '#1d1d24'; for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(x, 62 + k * 22, 3.2, 0, TAU); c.fill(); }
    },
    extra(body, accent) {                                  // bow tie in the player colour
      for (const s of [-1, 1]) rot(mesh(G.cone(), accent, body, s * 0.06, 0.775, -0.215, 0.05, 0.11, 0.03), 0, 0, s * HP);
      mesh(G.sphere(), accent, body, 0, 0.775, -0.225, 0.028);
      return null;
    },
  },
  superhero: {
    j: 0x1e62d0, p: 0x1e62d0, btn: false,
    paint(c, W, H) {
      fill(c, W, H, '#1e62d0');
      const x = W * 0.75;
      c.fillStyle = '#d8202c'; c.fillRect(0, 168, W, H); c.fillStyle = '#ffcf33'; c.fillRect(0, 156, W, 13);
      c.beginPath(); c.moveTo(x, 40); c.lineTo(x + 30, 72); c.lineTo(x, 112); c.lineTo(x - 30, 72); c.closePath(); c.fill();
      c.fillStyle = '#d8202c'; c.font = '900 40px "Arial Black", Impact, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('K', x, 76);
    },
    extra(body, accent) {                                  // two-segment cape that streams out with speed
      const a = sub(body, 0, 0.8, 0.2), b = sub(a, 0, -0.36, 0), s = S();
      mesh(G.box(), accent, a, 0, -0.18, 0, 0.44, 0.37, 0.014);
      mesh(G.box(), accent, b, 0, -0.17, 0, 0.52, 0.35, 0.014);
      return (fx) => {
        const lift = clamp(spring(s, clamp(fx.speed * 0.3, 0, 1.15) + fx.air * 0.5 + fx.shake * 0.25, 40, 6, fx.dt), -0.1, 1.4);
        const flap = Math.sin(fx.T * 10) * (0.04 + 0.13 * Math.min(1, lift * 2));
        a.rotation.set(-(0.32 + lift + flap), 0, Math.sin(fx.T * 6.3) * 0.08 * lift - clamp(fx.hz * 0.02, -0.3, 0.3));
        b.rotation.x = 0.12 - lift * 0.3 - Math.sin(fx.T * 10 - 1.2) * (0.08 + 0.22 * Math.min(1, lift * 2));   // hem hangs back down at rest
      };
    },
  },
  gold: {
    j: 0xf2b81f, p: 0xc98f12, rep: 2, sl: true, pm: true,
    paint(c, W, H) {
      const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#ffe27a'); g.addColorStop(0.5, '#f2b81f'); g.addColorStop(1, '#c98f12');
      fill(c, W, H, g); dots(c, W, H, 13, 40, 1, 3.5, ['#fffbe0']);
    },
  },
};
function outfitMats(id) {
  const o = OUTFITS[id], k = 'outfit:' + id;
  const jacket = o.paint ? mapMat(k, canvasTex(k, 256, 256, o.paint, o.rep || 1)) : C(o.j);
  const limb = o.limb ? mapMat(k + ':limb', canvasTex(k + ':limb', 64, 128, o.limb)) : null;
  return { jacket, sleeve: limb || (o.sl ? jacket : C(o.j)), pants: limb || (o.pm ? jacket : C(o.p)) };
}

// ---- APRONS ---- bg = apron colour, e = big emoji, t = slogan lines, tc = slogan colour, paint = custom drawing (256 px canvas)
const APRONS = {
  plain: { bg: '#efe6d4', none: true },
  heart: { bg: '#fff3f3', e: '❤️', t: ['KISS THE', 'COOK'] },
  star: { bg: '#2f4f9f', e: '⭐' },
  egg: { bg: '#d9f2ff', e: '🍳' },
  pizza: { bg: '#fff1d0', e: '🍕' },
  cat: { bg: '#ffd9ec', e: '🐱' },
  duck: { bg: '#ffd21f', e: '🦆' },
  bacon: { bg: '#ffe3e0', e: '🥓' },
  rainbow: { bg: '#9ad8ff', e: '🌈' },
  flames: { bg: '#1d1d24', e: '🔥', t: ['HOT', 'STUFF'], tc: '#ff8a24' },
  skull: { bg: '#1d1d24', e: '💀' },
  crown: { bg: '#5b2a86', e: '👑', t: ['BOSS'], tc: '#ffcf33' },
  bonk: { bg: '#ffcf33', e: '💥', t: ['BONK!'], tc: '#d8202c' },
  help: { bg: '#fafaf7', e: '😱', t: ['HJÄLP!'], tc: '#d8202c' },
  fishbone: {
    bg: '#19bfb0',
    paint(c) {                                             // drawn fish skeleton
      c.strokeStyle = c.fillStyle = '#fafaf7'; c.lineCap = 'round'; c.lineWidth = 9;
      c.beginPath(); c.moveTo(92, 128); c.lineTo(204, 128); c.stroke();
      c.lineWidth = 7;
      for (let i = 0; i < 5; i++) { const x = 108 + i * 20, r = 40 - i * 6; c.beginPath(); c.moveTo(x + 8, 128 - r); c.lineTo(x, 128); c.lineTo(x + 8, 128 + r); c.stroke(); }
      c.beginPath(); c.moveTo(204, 128); c.lineTo(236, 96); c.lineTo(228, 128); c.lineTo(236, 160); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(20, 128); c.quadraticCurveTo(60, 70, 96, 92); c.lineTo(96, 164); c.quadraticCurveTo(60, 186, 20, 128); c.fill();
      c.fillStyle = '#19bfb0'; c.beginPath(); c.arc(64, 116, 9, 0, TAU); c.fill();
    },
  },
  muscles: {
    bg: '#f3bd8e',
    paint(c) {                                             // painted-on pecs + six-pack
      c.strokeStyle = '#a9714a'; c.lineWidth = 6; c.lineCap = 'round'; c.fillStyle = '#f7c9a0';
      for (const s of [-1, 1]) { c.beginPath(); c.ellipse(128 + s * 46, 58, 42, 30, 0, 0, Math.PI); c.stroke(); }
      for (let r = 0; r < 3; r++) for (const s of [-1, 1]) { c.beginPath(); if (c.roundRect) c.roundRect(128 + (s < 0 ? -50 : 6), 104 + r * 40, 44, 32, 12); else c.rect(128 + (s < 0 ? -50 : 6), 104 + r * 40, 44, 32); c.fill(); c.stroke(); }
      c.fillStyle = '#a9714a'; c.beginPath(); c.arc(128, 236, 5, 0, TAU); c.fill();
    },
  },
  tie: {
    bg: '#cfe3ff',
    paint(c) {                                             // office shirt, collar, striped tie, pocket with pens
      c.fillStyle = '#ffffff'; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(128, 34); c.lineTo(128 + s * 70, 8); c.lineTo(128 + s * 50, 62); c.closePath(); c.fill(); }
      c.fillStyle = '#d8202c'; c.beginPath(); c.moveTo(114, 30); c.lineTo(142, 30); c.lineTo(136, 58); c.lineTo(156, 200); c.lineTo(128, 236); c.lineTo(100, 200); c.lineTo(120, 58); c.closePath(); c.fill();
      c.save(); c.clip(); c.strokeStyle = '#ffcf33'; c.lineWidth = 7; for (let y = 20; y < 300; y += 26) { c.beginPath(); c.moveTo(90, y); c.lineTo(170, y - 40); c.stroke(); } c.restore();
      c.strokeStyle = '#8fb0e0'; c.lineWidth = 3; c.strokeRect(176, 96, 50, 50);
      c.fillStyle = '#2f7fe8'; c.fillRect(186, 78, 7, 26); c.fillStyle = '#1d1d24'; c.fillRect(200, 82, 7, 22);
    },
  },
};
function apronTex(id) {
  const a = APRONS[id];
  return canvasTex('apron:' + id, 256, 256, (c, W, H) => {
    fill(c, W, H, a.bg);
    c.strokeStyle = 'rgba(128,128,128,0.45)'; c.lineWidth = 3; c.setLineDash([9, 7]); c.strokeRect(9, 9, W - 18, H - 18); c.setLineDash([]);
    if (a.paint) a.paint(c, W, H);
    c.textAlign = 'center'; c.textBaseline = 'middle';
    const n = a.t ? a.t.length : 0;                        // slogan lines under the emoji
    if (a.e) { c.font = `${[170, 128, 104][n]}px ${EMOJI}`; c.fillStyle = '#000'; c.fillText(a.e, W / 2, [134, 98, 76][n]); }
    for (let i = 0; i < n; i++) { c.font = `900 ${n > 1 ? 44 : 54}px "Arial Black", Impact, sans-serif`; c.fillStyle = a.tc || '#d8202c'; c.fillText(a.t[i], W / 2, n > 1 ? 158 + i * 46 : 200, W - 36); }
  });
}

// ---- FACES ---- builder (f, skinHex): f is a throwaway group in head space (eyes at (+-0.105, 0.28, -0.2) r 0.085, nose tip z -0.33)
const HAIR = 0x3a2416;
const FACES = {
  none() {},
  moustache(f) {                                           // big curly handlebar
    for (const s of [-1, 1]) {
      rot(mesh(G.sphere(), C(HAIR), f, s * 0.075, 0.152, -0.268, 0.09, 0.036, 0.04), 0, 0, s * 0.3);
      mesh(G.ring(), C(HAIR), f, s * 0.175, 0.185, -0.235, 0.034, 0.034, 0.03).rotation.y = -s * 0.5;
    }
  },
  sunglasses(f) {                                          // big shades; the googly eyes keep working behind them
    const bk = C(0x111116), lens = glassMat(0x0b0b12, 0.86);
    for (const s of [-1, 1]) {
      rot(mesh(G.cyl(), lens, f, s * 0.108, 0.285, -0.322, 0.112, 0.02, 0.1), HP);
      mesh(G.box(), bk, f, s * 0.232, 0.31, -0.17, 0.012, 0.018, 0.3);
    }
    mesh(G.box(), bk, f, 0, 0.345, -0.322, 0.44, 0.03, 0.022);
  },
  clownnose(f) { mesh(G.sphere(), C(0xe8202c), f, 0, 0.2, -0.295, 0.082); mesh(G.sphere(), C(0xffffff), f, -0.028, 0.232, -0.36, 0.016); },
  monocle(f) {                                             // gold monocle + bead chain
    mesh(G.rim(), C(GOLD), f, 0.105, 0.28, -0.3, 0.095, 0.095, 0.06);
    rot(mesh(G.cyl(), glassMat(0xcfe8ff, 0.3), f, 0.105, 0.28, -0.3, 0.09, 0.006, 0.09), HP);
    for (let i = 0; i < 5; i++) { const k = i / 4; mesh(G.sphere(), C(GOLD), f, 0.2 + Math.sin(k * 3) * 0.035, 0.24 - k * 0.27, -0.27 + k * 0.17, 0.012); }
  },
  beard(f) {                                               // big bushy beard (leaves the mouth free)
    const c = C(0x8a4b22);
    mesh(G.sphere(), c, f, 0, -0.04, -0.15, 0.21, 0.125, 0.15);
    mesh(G.sphere(), c, f, 0, -0.15, -0.16, 0.12, 0.1, 0.09);
    for (const s of [-1, 1]) mesh(G.sphere(), c, f, s * 0.185, 0.1, -0.1, 0.1, 0.13, 0.11);
    mesh(G.sphere(), c, f, 0, 0.152, -0.264, 0.11, 0.028, 0.035);
  },
  eyepatch(f) {
    rot(mesh(G.cyl(), C(0x111116), f, -0.105, 0.285, -0.312, 0.1, 0.022, 0.1), HP);
    rot(mesh(G.torus(), C(0x111116), f, 0, 0.27, 0, 0.272, 0.272, 0.1), HP, 0.35, 0);   // strap, tilted across the head
  },
  glasses(f) {                                             // thick round nerd glasses
    const bk = C(0x1d1d24), lens = glassMat(0xcfe8ff, 0.28);
    for (const s of [-1, 1]) {
      mesh(G.rim(), bk, f, s * 0.108, 0.28, -0.3, 0.1, 0.1, 0.08);
      rot(mesh(G.cyl(), lens, f, s * 0.108, 0.28, -0.3, 0.095, 0.006, 0.095), HP);
      mesh(G.box(), bk, f, s * 0.226, 0.29, -0.16, 0.012, 0.016, 0.28);
    }
    mesh(G.box(), bk, f, 0, 0.29, -0.3, 0.05, 0.018, 0.016);
  },
  unibrow(f) { mesh(G.sphere(), C(0x2a1c14), f, 0, 0.378, -0.243, 0.185, 0.028, 0.03); },
  freckles(f, skin) {
    const c = C(tintHex(skin, 0x8a3b12, 0.5));
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) mesh(G.sphere(), c, f, s * (0.13 + i * 0.035), 0.175 + (i % 2) * 0.03, -0.232 + i * 0.016, 0.011, 0.011, 0.006);
  },
  blush(f) { for (const s of [-1, 1]) mesh(G.sphere(), C(0xff7d8e), f, s * 0.17, 0.165, -0.2, 0.05, 0.035, 0.02).rotation.y = -s * 0.6; },
};

// ============================================================================
// Chef emotes: catalog + procedural pose functions
// ============================================================================
// dur = seconds (one-shots return to neutral by themselves at dur), loop = runs until state.emote is cleared.
const emote = (id, sv, en, icon, dur, loop, lvl, price, ach) => (ach ? { id, n: [sv, en], icon, dur, loop, lvl, price, ach } : { id, n: [sv, en], icon, dur, loop, lvl, price });
export const EMOTES = [
  emote('wave', 'Vinka', 'Wave', '👋', 2.4, false, 1, 0), emote('nod', 'Nicka', 'Nod', '👍', 1.6, false, 1, 0),
  emote('headshake', 'Skaka på huvudet', 'Head shake', '🙅', 1.8, false, 1, 0), emote('clap', 'Applådera', 'Clap', '👏', 3, true, 1, 0),
  emote('cheer', 'Jubla', 'Cheer', '🙌', 2, false, 1, 0), emote('shrug', 'Rycka på axlarna', 'Shrug', '🤷', 1.8, false, 1, 0),
  emote('point', 'Peka', 'Point', '👉', 1.6, false, 2, 100), emote('buttshake', 'Rumpskak', 'Butt shake', '🍑', 3, true, 2, 200),
  emote('salute', 'Honnör', 'Salute', '🫡', 1.8, false, 3, 150), emote('bow', 'Bocka', 'Bow', '🙇', 2.6, false, 4, 200),
  emote('facepalm', 'Facepalm', 'Facepalm', '🤦', 2.4, false, 4, 250), emote('laugh', 'Gapskratt', 'Belly laugh', '🤣', 3, true, 5, 350),
  emote('cry', 'Gråta', 'Cry', '😭', 3, true, 6, 400), emote('dance', 'Disco', 'Disco dance', '🕺', 4, true, 7, 500),
  emote('sleep', 'Sova', 'Snooze', '😴', 5, true, 8, 600), emote('kiss', 'Kockkyss', "Chef's kiss", '😘', 1.8, false, 9, 700),
  emote('flex', 'Spänna musklerna', 'Flex', '💪', 4.2, true, 10, 800), emote('chicken', 'Kycklingdans', 'Chicken dance', '🐔', 4, true, 11, 1000),
  emote('jumpingjacks', 'Sprattelgubbe', 'Jumping jacks', '🤸', 3, true, 12, 1100), emote('tantrum', 'Utbrott', 'Tantrum', '😡', 2.5, false, 12, 1200),
  emote('robot', 'Robotdans', 'Robot dance', '🤖', 4, true, 13, 1400), emote('twirl', 'Piruett', 'Twirl', '🩰', 2.2, false, 14, 1600),
  emote('headbang', 'Headbanga', 'Headbang', '🤘', 3, true, 15, 1800), emote('dab', 'Dab', 'Dab', '😎', 1.5, false, 15, 2000),
  emote('floss', 'Floss', 'Floss', '💃', 4, true, 16, 2300), emote('kazachok', 'Kosackdans', 'Cossack dance', '🪆', 4, true, 17, 2600),
  emote('moonwalk', 'Moonwalk', 'Moonwalk', '🌙', 4, true, 1, 0, 'served200'), emote('backflip', 'Bakåtvolt', 'Backflip', '🔄', 1.4, false, 1, 0, 'stars3x5'),
];
const EMOTE_DEF = new Map(EMOTES.map((e) => [e.id, e]));

// Pose = offsets on top of the normal animation, all scaled by the emote blend weight:
// yaw/px/pz/hop: inner root pivot · spin/flip: absolute pivot turns (must end on a full turn) · crouch, sq: squash
// bx/by/bz + sway: body lean (-x = forward) / twist / roll + hip shift · hx/hy/hz: head · legL/legR (+ = kick forward), legZ = spread
// l*/r*: hand targets in BODY space (shoulders (+-0.26, 0.66, 0), mouth (0, 0.97, -0.26), eyes y 1.15), lw/rw = ownership, lg/rg = fist
// shut (eyelids), talk (mouth open), mw (mouth width), wide (eyes), belly (bounce)
const POSE_W = ['yaw', 'px', 'pz', 'hop', 'crouch', 'bx', 'by', 'bz', 'sway', 'sq', 'hx', 'hy', 'hz', 'lw', 'lg', 'rw', 'rg', 'legL', 'legR', 'legZ', 'shut', 'talk', 'mw', 'wide', 'belly'];
const POSE_KEYS = POSE_W.concat(['spin', 'flip', 'lx', 'ly', 'lz', 'rx', 'ry', 'rz']);   // the raw ones are never weight-scaled
function makePose() { const p = {}; for (const k of POSE_KEYS) p[k] = 0; return p; }
function resetPose(p) { for (let i = 0; i < POSE_KEYS.length; i++) p[POSE_KEYS[i]] = 0; }
const sin = Math.sin, cos = Math.cos, abs = Math.abs;
const sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const win = (t, a, b, f = 0.25) => sm((t - a) / f) * (1 - sm((t - b) / f));
const mix = (a, b, k) => a + (b - a) * k;
function armL(p, x, y, z, g = 0) { p.lx = x; p.ly = y; p.lz = z; p.lw = 1; p.lg = g; }
function armR(p, x, y, z, g = 0) { p.rx = x; p.ry = y; p.rz = z; p.rw = 1; p.rg = g; }
function arms2(p, x, y, z, g = 0) { armL(p, -x, y, z, g); armR(p, x, y, z, g); }
const robo = (i, f, k) => mix(sin((i - 1) * (1.7 + k) + k * 2.3), sin(i * (1.7 + k) + k * 2.3), f);   // stepped pseudo-random pose value

const wrapPi = (x) => x - TAU * Math.round(x / TAU);
const pickId = (table, v, d) => (typeof v === 'string' && Object.hasOwn(table, v) ? v : d);

const EMOTE_FN = {
  wave(t, p) { armR(p, 0.55 + sin(t * 12) * 0.22, 1.5, -0.05); p.bz = -0.08 + sin(t * 12) * 0.04; p.hz = 0.15; p.hop = abs(sin(t * 6)) * 0.03; p.talk = 0.5; p.mw = 0.03; },
  nod(t, p) { p.hx = 0.12 - (0.5 - 0.5 * cos(t * 15)) * 0.75; p.bx = p.hx * 0.25; p.talk = 0.15; p.mw = 0.025; p.hop = abs(sin(t * 7.5)) * 0.02; },
  headshake(t, p) { p.hy = sin(t * 13) * 0.8; p.by = -sin(t * 13) * 0.12; p.shut = 0.7; p.mw = -0.02; armR(p, 0.3 + sin(t * 13) * 0.09, 1.0, -0.38, 1); },
  clap(t, p) {
    arms2(p, 0.03 + 0.17 * (0.5 + 0.5 * cos(t * 20)), 0.85, -0.4);
    p.hop = abs(sin(t * 10)) * 0.015; p.hz = sin(t * 5) * 0.09; p.talk = 0.35; p.mw = 0.03;
  },
  cheer(t, p) {                                            // two big hops, arms up, "yay"
    const h = t < 1.6 ? abs(sin(t * 3.927)) : 0;
    p.hop = h * 0.38; p.crouch = (1 - h) * 0.35; p.sq = h * 0.1; p.legZ = h * 0.35; p.hx = 0.3;
    arms2(p, 0.42 + sin(t * 20) * 0.08, 1.62, -0.05); p.talk = 0.9; p.wide = 0.2; p.mw = 0.03;
  },
  shrug(t, p) { arms2(p, 0.64, 0.8 + sin(t * 7) * 0.03, -0.14); p.sq = 0.07; p.hz = 0.24; p.hx = 0.1; p.wide = 0.15; p.mw = -0.012; },
  point(t, p) {
    armR(p, 0.1, 0.95, -0.82 - abs(sin(t * 9)) * 0.14, 1); armL(p, -0.35, 0.4, -0.04, 1);
    p.bx = -0.3; p.legL = -0.35; p.legR = 0.3; p.wide = 0.2; p.talk = 0.5;
  },
  buttshake(t, p) {                                        // turn around, bend over, wiggle, look back over the shoulder
    const w = sin(t * 16);
    p.yaw = Math.PI; p.bx = -0.8; p.bz = w * 0.2; p.by = w * 0.24; p.sway = w * 0.065; p.crouch = 0.25;
    p.hy = 1.9; p.hx = 0.55; p.hz = -0.25; arms2(p, 0.22, 0.12, -0.3);
    p.legL = w * 0.14; p.legR = -w * 0.14; p.belly = w * 0.12; p.talk = 0.3; p.mw = 0.035; p.wide = 0.1;
  },
  salute(t, p) { armR(p, 0.2, 1.23, -0.27); armL(p, -0.3, 0.17, 0, 1); p.sq = 0.07; p.bx = 0.06; p.hx = 0.08; p.legZ = -0.04; p.mw = -0.012; },
  bow(t, p) {
    const b = win(t, 0.1, 1.9, 0.55);
    p.bx = -1.1 * b; p.hx = -0.3 * b; p.legR = -0.3 * b; p.shut = 0.8 * b;
    armR(p, -0.1, 0.45, -0.32); armL(p, -0.55, 0.72, 0.3);
  },
  facepalm(t, p) { armR(p, 0.04, 1.06, -0.35); armL(p, -0.35, 0.4, -0.04, 1); p.hx = -0.45; p.hy = sin(t * 5) * 0.13; p.bx = -0.15; p.shut = 1; p.mw = -0.015; },
  laugh(t, p) {                                            // lean back, belly bouncing, head thrown back
    const w = sin(t * 16);
    p.bx = 0.35; p.hx = 0.5 + w * 0.08; p.belly = w * 0.25; p.hop = abs(w) * 0.02; p.sq = w * 0.04;
    arms2(p, 0.2, 0.4 + w * 0.03, -0.34); p.shut = 1; p.talk = 0.8 + w * 0.2; p.mw = 0.035;
  },
  cry(t, p) {                                              // fists rubbing the eyes, sobbing shudder
    const w = sin(t * 18);
    p.hx = -0.5; p.bx = -0.25 + w * 0.03; p.hop = abs(w) * 0.012; p.sq = sin(t * 9) * 0.04; p.belly = w * 0.06;
    armL(p, -0.12 - sin(t * 9) * 0.03, 1.08 + sin(t * 9 + 1) * 0.02, -0.37, 1); armR(p, 0.12 + sin(t * 9) * 0.03, 1.08 - sin(t * 9 + 1) * 0.02, -0.37, 1);
    p.shut = 1; p.talk = 0.3 + abs(sin(t * 4.5)) * 0.3; p.mw = -0.015;
  },
  dance(t, p) {                                            // disco: alternating points up / down + hip sway
    const m = sm(0.5 + sin(t * TAU) * 1.5), b = sin(t * TAU * 2);
    armR(p, mix(0.35, 0.55, m), mix(0.2, 1.5, m), -0.12, 1); armL(p, -mix(0.55, 0.35, m), mix(1.5, 0.2, m), -0.12, 1);
    p.sway = b * 0.07; p.bz = b * 0.12; p.by = (m - 0.5) * 0.5; p.hop = abs(b) * 0.05; p.hz = -b * 0.15;
    p.legL = b * 0.25; p.legR = -b * 0.25; p.talk = 0.3; p.mw = 0.03;
  },
  sleep(t, p) {                                            // standing snooze with the odd head jerk
    const br = sin(t * 1.6), j = t % 4.5;
    p.hx = -0.55 + (j > 4 ? sin((j - 4) * TAU) * 0.5 : 0); p.hz = 0.25 + sin(t * 0.9) * 0.1;
    p.bz = sin(t * 0.9) * 0.1; p.bx = -0.12 + sin(t * 0.7) * 0.05; p.sq = br * 0.04; p.belly = br * 0.12;
    p.shut = 1; p.talk = 0.25 + br * 0.25; p.mw = -0.02;
  },
  kiss(t, p) {                                             // fingers to the mouth ... mwah! hand bursts open
    const m = sm((t - 0.75) / 0.18);
    armR(p, mix(0.04, 0.45, m), mix(0.99, 1.28, m), mix(-0.34, -0.6, m), 1 - m);
    p.shut = 1 - m * 0.6; p.hx = mix(-0.1, 0.25, m); p.bx = mix(-0.1, 0.12, m); p.mw = mix(-0.035, 0.02, m); p.talk = m * 0.7; p.wide = m * 0.2;
  },
  flex(t, p) {                                             // cycles double biceps -> side chest -> most muscular
    const c = (t / 1.4) % 3, a = win(c, 0, 1), b = win(c, 1, 2), d = win(c, 2, 3) + win(c + 3, 2, 3), tr = sin(t * 30) * 0.012;
    armL(p, a * -0.42 + b * -0.1 + d * -0.18, a * 1.12 + b * 0.55 + d * 0.5 + tr, b * -0.35 + d * -0.4, 1);
    armR(p, a * 0.42 + b * 0.3 + d * 0.18, a * 1.12 + b * 0.6 + d * 0.5 - tr, b * -0.3 + d * -0.4, 1);
    p.by = b * 0.6; p.bx = d * -0.3; p.hy = b * -0.5; p.sq = 0.05; p.talk = 0.3; p.mw = 0.035; p.shut = 0.3;
  },
  chicken(t, p) {                                          // elbows flapping, knees bending, head pecking
    const f = sin(t * 14), k = sin(t * 7);
    arms2(p, 0.3 + f * 0.12, 0.6 + f * 0.12, -0.08, 1);
    p.crouch = 0.25 + k * 0.25; p.hx = -0.35 * (0.5 + 0.5 * f); p.by = sin(t * 3.5) * 0.3;
    p.legL = Math.max(0, k) * 0.5; p.legR = Math.max(0, -k) * 0.5; p.talk = 0.2 + f * 0.2; p.wide = 0.15;
  },
  jumpingjacks(t, p) {
    const u = t * 9, open = 0.5 - 0.5 * cos(u), a = open * 2.95;
    arms2(p, 0.26 + sin(a) * 0.6, 0.66 - cos(a) * 0.6, 0); p.hop = abs(sin(u)) * 0.14; p.legZ = open * 0.5; p.talk = 0.3;
  },
  tantrum(t, p) {                                          // stomping, fists shaking
    const s = sin(t * 14);
    p.legL = Math.max(0, s) * 0.9; p.legR = Math.max(0, -s) * 0.9; p.hop = abs(s) * 0.05; p.bz = s * 0.12; p.bx = -0.15; p.by = sin(t * 7) * 0.2;
    armL(p, -0.42, 1.25 + sin(t * 28) * 0.1, -0.15, 1); armR(p, 0.42, 1.25 - sin(t * 28) * 0.1, -0.15, 1);
    p.hy = sin(t * 21) * 0.3; p.shut = 0.35; p.talk = 0.7; p.mw = 0.02;
  },
  robot(t, p) {                                            // stiff stepped poses
    const st = t * 2.5, i = Math.floor(st), f = sm((st - i) * 4);
    armL(p, -0.42, 0.66 + robo(i, f, 0) * 0.4, -0.12 - abs(robo(i, f, 1)) * 0.35); armR(p, 0.42, 0.66 + robo(i, f, 2) * 0.4, -0.12 - abs(robo(i, f, 3)) * 0.35);
    p.by = robo(i, f, 4) * 0.45; p.hy = robo(i, f, 5) * 0.7; p.hz = robo(i, f, 6) * 0.15; p.bx = robo(i, f, 7) * 0.12; p.wide = 0.2; p.mw = -0.02;
  },
  twirl(t, p) {                                            // pirouette: three turns on tiptoe, arms out
    p.spin = TAU * 3 * sm(t / 1.9); arms2(p, 0.78, 0.8, 0); p.hop = 0.06; p.sq = 0.08; p.legR = -0.6; p.hx = 0.2; p.talk = 0.4; p.shut = 0.5;
  },
  headbang(t, p) {
    const w = sin(t * 11);
    p.hx = -0.25 - w * 0.6; p.bx = -0.2 - w * 0.22; p.crouch = 0.15; armR(p, 0.4, 1.45 + w * 0.1, -0.15, 1); armL(p, -0.3, 0.75, -0.3, 1);
    p.shut = 0.8; p.talk = 0.6; p.legZ = 0.15;
  },
  dab(t, p) { armL(p, -0.85, 1.35, -0.05); armR(p, -0.3, 1.2, -0.3); p.hx = -0.35; p.hy = -0.5; p.hz = 0.2; p.bz = 0.2; p.by = 0.25; p.shut = 0.8; },
  floss(t, p) {                                            // arms swing side to side, swapping front / back each swing
    const s = sin(t * 11), zf = clamp(sin(t * 5.5) * 3, -1, 1);
    armL(p, -0.14 + s * 0.42, 0.22, -0.3 * zf, 1); armR(p, 0.14 + s * 0.42, 0.22, 0.3 * zf, 1);
    p.sway = -s * 0.09; p.bz = -s * 0.1; p.by = s * 0.15; p.hz = s * 0.1; p.legL = s * 0.1; p.legR = -s * 0.1; p.mw = 0.02;
  },
  kazachok(t, p) {                                         // squat + alternating kicks, arms folded
    const k = sin(t * 9);
    p.crouch = 0.85; p.legL = Math.max(0, k) * 1.3; p.legR = Math.max(0, -k) * 1.3; p.hop = abs(k) * 0.06; p.bx = 0.12;
    armL(p, 0.08, 0.72, -0.3, 1); armR(p, -0.08, 0.78, -0.3, 1); p.talk = 0.4; p.mw = 0.03; p.hz = k * 0.08;
  },
  moonwalk(t, p) {                                         // side-on glide, hand on the hat
    const s = sin(t * 5);
    p.yaw = 1.25; p.px = sin(t * 1.25) * 0.16; p.legL = s * 0.6; p.legR = -s * 0.6; p.bx = -0.2; p.hx = -0.25;
    armR(p, 0.1, 1.4, -0.24); armL(p, -0.5, 0.5, 0.1); p.sway = s * 0.03;
  },
  backflip(t, p) {
    const u = clamp((t - 0.25) / 0.85, 0, 1);
    p.crouch = win(t, 0, 0.25, 0.12) * 0.6 + win(t, 1.1, 1.3, 0.1) * 0.4; p.hop = sin(u * Math.PI) * 0.95; p.flip = TAU * sm(u);
    arms2(p, 0.35, mix(1.5, 0.5, sm(u * 2)), -0.1, 1); p.legL = p.legR = sin(u * Math.PI) * 0.7; p.wide = 0.25; p.talk = 0.6;
  },
};


// ============================================================================
// Player chef
// ============================================================================
export function makeChef(opts = {}) {
  const own = [];
  let color = opts.color ?? CHEF_COLORS[0];
  let name = opts.name ?? 'Kock';
  const skin = opts.skin ?? SKINS[1];
  const group = new THREE.Group();
  const root = sub(group);                                 // inner pivot: emotes turn / hop / flip this, never `group` itself
  const accent = ownMat(own, color);                       // neckerchief, apron trim, hat band, shoes, cape, bow tie
  const white = sharedMat(0xfafaf7), skinM = sharedMat(skin);

  const legs = buildLegs(root, sharedMat(0x3a4454), accent, 0.42, 0.13);
  const body = new THREE.Group();                          // pivot at the hips: lean / squash happens here
  body.position.y = 0.4;
  root.add(body);
  const jacket = mesh(G.sphere(), white, body, 0, 0.42, 0, 0.31, 0.46, 0.27);              // jacket bean
  const belly = mesh(G.sphere(), sharedMat(0xefe6d4), body, 0, 0.3, -0.07, 0.27, 0.27, 0.25); // apron belly
  const trim = rot(mesh(G.torus(), accent, body, 0, 0.3, -0.035, 0.325, 0.3, 0.3), HP);       // apron string
  mesh(G.ring(), accent, body, 0, 0.85, 0, 0.17, 0.16, 0.2).rotation.x = HP;                  // neckerchief
  const knot = rot(mesh(G.cone(), accent, body, 0, 0.76, -0.19, 0.06, 0.13, 0.035), 0, 0, Math.PI);
  const buttons = [mesh(G.sphere(), sharedMat(0x2b2f3a), body, -0.07, 0.62, -0.235, 0.022), mesh(G.sphere(), sharedMat(0x2b2f3a), body, 0.07, 0.62, -0.235, 0.022)];

  const face = buildHead(body, 0.87, skinM, skin);
  const head = face.head;
  const hat = new THREE.Group();                           // springy hat pivot; the worn hat lives in a sub-group
  hat.position.set(0, 0.43, 0.01);
  head.add(hat);

  const stars = [];
  for (let i = 0; i < 4; i++) {
    const s = mesh(G.star(), sharedMat(0xffe14a), head, 0, 0.6, 0, 0.05);
    s.visible = false;
    stars.push(s);
  }
  const arms = [buildArm(root, -1, white, skinM, 0.06, 0.55, true), buildArm(root, 1, white, skinM, 0.06, 0.55, true)];

  const tag = makeNameTag();
  tag.draw(name, color);
  tag.sprite.position.set(0, 2.37, 0);
  group.add(tag.sprite);

  // ---- cosmetics: every slot owns a throwaway group (+ a list of per-instance disposables) that setLook swaps out ----
  const look = { hat: null, outfit: null, apron: null, face: null };
  const slotOwn = { hat: [], outfit: [], apron: [], face: [] };
  let hatRoot = null, hatFx = null, outfitRoot = null, outfitAnim = null, apronPanel = null, faceRoot = null;
  let tagBase = 2.37, starY = 0.6, hatWob = 1, hatSq = 1, hatK = 85, hatC = 5;
  function clearSlot(g, list) {
    if (g) g.removeFromParent();
    for (const d of list) d.dispose();
    list.length = 0;
  }
  function setLook(l) {
    l = l || EMPTY;
    const h = pickId(HATS, l.hat, DEFAULT_LOOK.hat), o = pickId(OUTFITS, l.outfit, DEFAULT_LOOK.outfit);
    const ap = pickId(APRONS, l.apron, DEFAULT_LOOK.apron), f = pickId(FACES, l.face, DEFAULT_LOOK.face);
    if (h !== look.hat) {
      clearSlot(hatRoot, slotOwn.hat);
      look.hat = h; hatRoot = sub(hat);
      hatFx = HATS[h](hatRoot, accent, slotOwn.hat);
      hatWob = hatFx.wob ?? 1; hatSq = hatFx.sq ?? 1; hatK = 85 / hatWob; hatC = 5 / Math.sqrt(hatWob);
      tagBase = 1.93 + hatFx.top; starY = 0.45 + hatFx.top * 0.35;   // toque: 2.37 / 0.6 exactly as before
    }
    if (o !== look.outfit) {
      clearSlot(outfitRoot, slotOwn.outfit);
      look.outfit = o; outfitRoot = null; outfitAnim = null;
      const d = OUTFITS[o], m = outfitMats(o);
      jacket.material = m.jacket;
      for (const a of arms) a.upper.material = a.lower.material = a.elbow.material = m.sleeve;
      for (const L of legs) L.children[0].material = m.pants;
      buttons[0].visible = buttons[1].visible = d.btn !== false;
      knot.visible = d.knot !== false;
      if (d.extra) { outfitRoot = sub(body); outfitAnim = d.extra(outfitRoot, accent, slotOwn.outfit); }
    }
    if (ap !== look.apron) {
      clearSlot(apronPanel, slotOwn.apron);
      look.apron = ap; apronPanel = null;
      const d = APRONS[ap];
      belly.material = C(parseInt(d.bg.slice(1), 16));
      if (!d.none) apronPanel = mesh(G.apron(), mapMat('apron:' + ap, apronTex(ap)), body, 0, 0.3, -0.07, 0.281, 0.281, 0.26);
      // motif aprons hang from a string tied above the belly so it never cuts through the picture
      if (d.none) { trim.position.set(0, 0.3, -0.035); trim.scale.set(0.325, 0.3, 0.3); } else { trim.position.set(0, 0.47, -0.01); trim.scale.set(0.318, 0.285, 0.3); }
    }
    if (f !== look.face) {
      clearSlot(faceRoot, slotOwn.face);
      look.face = f; faceRoot = sub(head);
      FACES[f](faceRoot, skin, slotOwn.face);
    }
  }
  setLook(opts.look);

  // animation state
  const mo = makeMotion();
  const leanX = S(), leanZ = S(), headX = S(), headZ = S(), hatX = S(), hatZ = S(), hatS = S(), bel = S(), sq = S();
  let T = Math.random() * 10, phase = 0, ampS = 0, cr = 0, air = 0;
  // emote state: P = raw pose written by the emote, Q = weight-scaled + smoothed pose that is actually applied
  const P = makePose(), Q = makePose();
  const kin = { ex: 0, ez: 0, ey: 0, eh: 0, vy: 0, wx: 0, wz: 0, wy: 0, ay: 0 };   // emote-induced angular velocity / hop acceleration
  const fx = { dt: 0, T: 0, speed: 0, amp: 0, phase: 0, dizzy: 0, air: 0, hx: 0, hz: 0, shake: 0 };   // fed to cosmetic anim()
  let eLast = null, eId = null, eT = 0, eW = 0, spinCur = 0, flipCur = 0;

  function update(dt, st) {
    st = st || EMPTY;
    dt = clamp(dt || 0.016, 1e-4, 0.05);
    T += dt;
    trackMotion(mo, group, dt);
    const speed = st.speed ?? mo.hspeed;
    const grounded = st.grounded !== false;
    const dizzy = clamp(st.dizzy || 0, 0, 1), pitch = clamp(st.pitch || 0, -0.9, 0.9);

    // emote: (re)start when the id changes, blend in / out in ~0.2 s, walking suppresses the pose
    const eReq = st.emote || null;
    if (eReq !== eLast) { eLast = eReq; if (eReq && Object.hasOwn(EMOTE_FN, eReq)) { eId = eReq; eT = 0; } }
    const eOn = eReq !== null && eReq === eId && speed <= 0.6;
    eW += ((eOn ? 1 : 0) - eW) * Math.min(1, dt * 14);
    let W = 0;
    resetPose(P);
    if (eId && (eOn || eW > 0.003)) {
      eT += dt;
      EMOTE_FN[eId](eT, P);
      const d = EMOTE_DEF.get(eId);
      W = eW * (d.loop ? 1 : 1 - sm((eT - d.dur + 0.3) / 0.3));
    }
    const qf = 1 - Math.exp(-dt * 25);
    for (let i = 0; i < POSE_W.length; i++) { const k = POSE_W[i]; Q[k] += (P[k] * W - Q[k]) * qf; }
    if (P.lw > 0) { if (Q.lw < 0.02) { Q.lx = P.lx; Q.ly = P.ly; Q.lz = P.lz; } else { Q.lx += (P.lx - Q.lx) * qf; Q.ly += (P.ly - Q.ly) * qf; Q.lz += (P.lz - Q.lz) * qf; } }
    if (P.rw > 0) { if (Q.rw < 0.02) { Q.rx = P.rx; Q.ry = P.ry; Q.rz = P.rz; } else { Q.rx += (P.rx - Q.rx) * qf; Q.ry += (P.ry - Q.ry) * qf; Q.rz += (P.rz - Q.rz) * qf; } }
    if (eOn && W > 0.01) { spinCur = P.spin; flipCur = P.flip; }            // absolute turns; unwind the remainder when cancelled
    else { const k = Math.exp(-dt * 12); spinCur = wrapPi(spinCur) * k; flipCur = wrapPi(flipCur) * k; }
    root.rotation.set(flipCur, Q.yaw + spinCur, 0);
    root.position.set(Q.px, Q.hop + 0.75 * (1 - Math.cos(flipCur)), Q.pz - 0.75 * Math.sin(flipCur));   // flips turn about the belly, not the feet
    // emote-induced motion feeds the secondary springs (head bobble, hat, belly, cosmetics)
    const inv = 1 / dt, kf = 1 - Math.exp(-dt * 30), ex = Q.bx + Q.hx + flipCur, ez = Q.bz + Q.hz, ey = Q.yaw + spinCur + Q.by + Q.hy;
    kin.wx += (clamp(wrapPi(ex - kin.ex) * inv, -15, 15) - kin.wx) * kf; kin.ex = ex;
    kin.wz += (clamp((ez - kin.ez) * inv, -15, 15) - kin.wz) * kf; kin.ez = ez;
    kin.wy += (clamp(wrapPi(ey - kin.ey) * inv, -15, 15) - kin.wy) * kf; kin.ey = ey;
    const evy = (Q.hop - kin.eh) * inv;
    kin.ay += (clamp((evy - kin.vy) * inv, -40, 40) - kin.ay) * kf * 0.5; kin.vy = evy; kin.eh = Q.hop;
    const ay = clamp(mo.ay + kin.ay, -40, 40);

    ampS += (Math.min(1, speed / 3) - ampS) * Math.min(1, dt * 10);
    cr += (Math.max(st.crouch ? 1 : 0, Q.crouch) - cr) * Math.min(1, dt * 12);
    air += ((grounded ? 0 : 1) - air) * Math.min(1, dt * 10);
    if (speed > 0.1) phase += dt * (5 + speed * 2.4);
    const sw = Math.sin(phase), bobY = Math.abs(sw) * 0.045 * ampS;

    // body: lean with velocity, against acceleration; squash on landings / crouch
    const moving = mo.hspeed > 0.05;
    const fvz = moving ? mo.lvz : -speed, fvx = moving ? mo.lvx : 0;
    spring(leanX, clamp(fvz * 0.05 - mo.laz * 0.018, -0.45, 0.45), 70, 9, dt);
    spring(leanZ, clamp(-fvx * 0.04 + mo.lax * 0.018, -0.4, 0.4), 70, 9, dt);
    spring(sq, clamp(-ay * 0.004, -0.2, 0.2), 90, 8, dt);
    const sqv = clamp(sq.x + Q.sq, -0.25, 0.25);
    const sy = (1 - 0.3 * cr) * (1 + sqv), sxz = 1 + 0.15 * cr - sqv * 0.4;
    const hipK = 1 - 0.5 * cr;
    body.position.set(Q.sway, 0.4 * hipK + bobY, 0);
    body.rotation.set(leanX.x - air * 0.15 + Q.bx, sw * 0.06 * ampS + Q.by, leanZ.x + sw * 0.075 * ampS + Q.bz);
    body.scale.set(sxz, sy, sxz);
    head.scale.set(1 / sxz, 1 / sy, 1 / sxz);              // keep the head round while the bean squashes

    // belly bounce (the apron panel rides on it)
    spring(bel, Math.sin(phase * 2) * 0.07 * ampS - clamp(ay * 0.003, -0.15, 0.15) + Q.belly, 120, 7, dt);
    const b = clamp(bel.x, -0.3, 0.3);
    belly.scale.set(0.27 * (1 - b * 0.5), 0.27 * (1 + b), 0.25 * (1 - b * 0.5));
    belly.position.y = 0.3 - b * 0.12;
    if (apronPanel) { apronPanel.scale.copy(belly.scale).multiplyScalar(1.04); apronPanel.position.copy(belly.position); }

    // legs: waddle cycle, tuck + flail in the air
    const flail = Math.sin(T * 13) * 0.25;
    for (let i = 0; i < 2; i++) {
      const L = legs[i], dir = i ? -1 : 1;
      L.position.y = 0.42 * hipK + air * 0.06;
      L.scale.y = hipK * (1 - air * 0.25);
      L.rotation.x = (1 - air) * sw * 0.9 * ampS * dir + air * ((i ? -0.5 : 0.9) + flail * dir) + (i ? Q.legR : Q.legL);
      L.rotation.z = dir * (0.06 * ampS - Q.legZ);
    }

    // head bobble (underdamped), counter-leans a bit, follows look pitch, lags behind emote motion
    spring(headX, pitch * 0.85 - leanX.x * 0.6 + clamp(-mo.laz * 0.012, -0.3, 0.3) - clamp(kin.wx * 0.02, -0.3, 0.3), 110, 7, dt);
    spring(headZ, -leanZ.x * 0.6 + clamp(mo.lax * 0.012, -0.3, 0.3) - clamp(kin.wz * 0.02, -0.3, 0.3), 110, 7, dt);
    head.rotation.set(
      clamp(headX.x, -1.1, 1.1) + Math.cos(T * 4.3) * 0.16 * dizzy + Q.hx,
      Math.sin(T * 2.1) * 0.3 * dizzy + Q.hy,
      clamp(headZ.x, -0.6, 0.6) + Math.sin(T * 5) * 0.28 * dizzy + Q.hz);

    // hat: lags behind the head, jiggles, squash & stretch (floppy hats: softer spring, bigger swing)
    spring(hatX, (-headX.v * 0.06 - leanX.v * 0.05 - kin.wx * 0.06) * hatWob, hatK, hatC, dt);
    spring(hatZ, (-headZ.v * 0.06 - leanZ.v * 0.05 - kin.wz * 0.06 + kin.wy * 0.015 + Math.sin(T * 5) * 0.2 * dizzy) * hatWob, hatK, hatC, dt);
    spring(hatS, -Math.sin(phase * 2) * 0.06 * ampS + clamp(-ay * 0.006, -0.3, 0.3), 100, 6, dt);
    const hl = 0.6 * Math.min(1.5, Math.max(1, hatWob));
    hat.rotation.set(clamp(hatX.x, -hl, hl), 0, clamp(hatZ.x, -hl, hl));
    const hs = 1 + clamp(hatS.x, -0.35, 0.5) * hatSq, hw = 1 / Math.sqrt(hs);
    hat.scale.set(hw, hs, hw);

    // cosmetic animation (birds, propeller, daisy, fish tail, plunger, cape ...)
    fx.dt = dt; fx.T = T; fx.speed = speed + Math.abs(kin.wy) * 0.35; fx.amp = ampS; fx.phase = phase; fx.dizzy = dizzy; fx.air = air;
    fx.hx = headX.v + leanX.v + kin.wx; fx.hz = headZ.v + leanZ.v + kin.wz;
    fx.shake = clamp((Math.abs(fx.hx) + Math.abs(fx.hz)) * 0.1 + Math.abs(ay) * 0.03 + Math.abs(kin.wy) * 0.05, 0, 1);
    if (hatFx.anim) hatFx.anim(fx);
    if (outfitAnim) outfitAnim(fx);

    // face
    animFace(face, dt, T, clamp(mo.lax * 0.0025 - leanZ.v * 0.01, -0.03, 0.03),
      clamp(-mo.vy * 0.008 + pitch * 0.02 + headX.v * 0.004, -0.03, 0.03), dizzy, (1 + air * 0.15) * (1 + Q.wide),
      Math.max(clamp(st.talk || 0, 0, 1), Q.talk), 0.06 + Q.mw, clamp(Q.shut, 0, 1));

    // dizzy stars (orbit above whatever hat is worn)
    const showStars = dizzy > 0.03;
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      s.visible = showStars;
      if (!showStars) continue;
      const a = T * 4 + i * (Math.PI * 2 / stars.length);
      s.position.set(Math.cos(a) * 0.37, starY + Math.sin(T * 6 + i) * 0.04, Math.sin(a) * 0.37);
      s.rotation.set(T * 3, T * 5, 0);
      s.scale.setScalar(0.05 * Math.min(1, dizzy * 2.5));
    }

    // arms: shoulders ride on the leaning body; relaxed hands swing + lag, stretch to world targets, or follow the emote
    if (st.handL || st.handR) root.updateWorldMatrix(true, false);
    for (let i = 0; i < 2; i++) {
      const a = arms[i], ow = Math.min(1, i ? Q.rw : Q.lw);
      a.sh.set(a.side * 0.26, 0.66, 0).multiply(body.scale).applyEuler(body.rotation).add(body.position);
      _r.set(
        a.sh.x + a.side * (0.1 + air * 0.22) - clamp(mo.lax * 0.01, -0.15, 0.15),
        a.sh.y - 0.5 + air * 0.6 + cr * 0.12,
        a.sh.z - a.side * sw * 0.28 * ampS - clamp(mo.laz * 0.01, -0.15, 0.15) - air * 0.08);
      if (ow > 0.001) {                                    // emote hand target, given in body space
        _u.set(i ? Q.rx : Q.lx, i ? Q.ry : Q.ly, i ? Q.rz : Q.lz).multiply(body.scale).applyEuler(body.rotation).add(body.position);
        _r.lerp(_u, ow);
      }
      relaxArm(a, _r, dt, 14 + 30 * ow);
      const mine = ow > 0.5;                               // the emote owns this arm: ignore world targets / grips
      aimArm(a, mine ? null : (i ? st.handR : st.handL), root, dt);
      solveArm(a, mine ? ((i ? Q.rg : Q.lg) > 0.5 ? 1 : 0) : ((i ? st.gripR : st.gripL) ? 1 : 0), dt);
    }
    tag.sprite.position.y = tagBase - 0.6 * cr + Q.hop;
  }

  return {
    group, update, setLook, nameSprite: tag.sprite,
    setName(n) { name = n; tag.draw(name, color); },
    setColor(c) { color = c; accent.color.setHex(c); tag.draw(name, color); },
    dispose() {
      group.removeFromParent();
      clearSlot(hatRoot, slotOwn.hat); clearSlot(outfitRoot, slotOwn.outfit); clearSlot(apronPanel, slotOwn.apron); clearSlot(faceRoot, slotOwn.face);
      for (const m of own) m.dispose();
      tag.dispose();
    },
  };
}

// ============================================================================
// NPC waiter
// ============================================================================
export function makeWaiter(opts = {}) {
  const rnd = rng((opts.seed ?? 1) + 101);
  const skin = pick(rnd, SKINS), hairM = sharedMat(pick(rnd, HAIRS.slice(0, 3)));
  const style = Math.floor(rnd() * 3);                     // 0 slick hair, 1 slick + moustache, 2 bald + moustache
  const group = new THREE.Group();
  const black = sharedMat(0x1d1d24), white = sharedMat(0xfafaf7), skinM = sharedMat(skin), red = sharedMat(0xd8202c);

  const legs = buildLegs(group, black, sharedMat(0x101014), 0.42, 0.12);
  const body = new THREE.Group();
  body.position.y = 0.4;
  group.add(body);
  mesh(G.sphere(), white, body, 0, 0.42, 0, 0.27, 0.45, 0.235);          // shirt (shows through the open vest front)
  mesh(G.sphere(), black, body, 0, 0.41, 0.04, 0.285, 0.43, 0.235);      // vest
  mesh(G.sphere(), black, body, 0, 0.1, 0.005, 0.275, 0.2, 0.24);        // trousers top
  mesh(G.cone(), red, body, 0.055, 0.8, -0.16, 0.04, 0.09, 0.03).rotation.z = Math.PI / 2;   // bow tie
  mesh(G.cone(), red, body, -0.055, 0.8, -0.16, 0.04, 0.09, 0.03).rotation.z = -Math.PI / 2;

  const face = buildHead(body, 0.87, skinM, skin);
  const head = face.head;
  if (style < 2) mesh(G.dome(), hairM, head, 0, 0.25, 0.02, 0.282, 0.27, 0.275).rotation.x = 0.28;
  if (style > 0) mesh(G.sphere(), hairM, head, 0, 0.152, -0.262, 0.095, 0.022, 0.03);

  const arms = [buildArm(group, -1, white, white, 0.052, 0.55, true), buildArm(group, 1, white, white, 0.052, 0.55, true)];
  const carryAnchor = new THREE.Object3D();
  carryAnchor.position.set(0, 1.15, -0.38);
  group.add(carryAnchor);
  const tray = mesh(G.cyl(), sharedMat(0xc9ced6), group, 0, 1.135, -0.38, 0.2, 0.014, 0.2);
  tray.visible = false;
  const towel = mesh(G.box(), sharedMat(0xf6f4ec), group, 0, 0, 0, 0.13, 0.2, 0.1);

  const mo = makeMotion();
  const leanX = S(), leanZ = S(), headX = S(), headZ = S();
  let T = rnd() * 10, phase = 0, ampS = 0, carryS = 0, shockS = 0;

  function update(dt, st) {
    st = st || EMPTY;
    dt = clamp(dt || 0.016, 1e-4, 0.05);
    T += dt;
    trackMotion(mo, group, dt);
    const speed = st.speed ?? mo.hspeed;
    carryS += ((st.carrying ? 1 : 0) - carryS) * Math.min(1, dt * 8);
    shockS += (clamp(st.shocked || 0, 0, 1) - shockS) * Math.min(1, dt * 14);
    ampS += (Math.min(1, speed / 2.5) - ampS) * Math.min(1, dt * 10);
    if (speed > 0.1) phase += dt * (5 + speed * 2.6);
    const sw = Math.sin(phase), wob = ampS * (1 - 0.55 * carryS);   // glide smoothly while carrying
    const bobY = Math.abs(sw) * 0.04 * wob, shake = Math.sin(T * 31) * shockS;

    const moving = mo.hspeed > 0.05;
    spring(leanX, clamp((moving ? mo.lvz : -speed) * 0.04 - mo.laz * 0.015, -0.35, 0.35) + shockS * 0.28, 70, 9, dt);
    spring(leanZ, clamp(-(moving ? mo.lvx : 0) * 0.03 + mo.lax * 0.015, -0.3, 0.3), 70, 9, dt);
    body.position.set(shake * 0.012, 0.4 + bobY, 0);
    body.rotation.set(leanX.x, sw * 0.05 * wob, leanZ.x + sw * 0.06 * wob + shake * 0.07);
    for (let i = 0; i < 2; i++) legs[i].rotation.x = sw * 0.85 * ampS * (i ? -1 : 1);

    spring(headX, -leanX.x * 0.6 + clamp(-mo.laz * 0.01, -0.25, 0.25) + shockS * 0.2, 110, 7, dt);
    spring(headZ, -leanZ.x * 0.6 + clamp(mo.lax * 0.01, -0.25, 0.25), 110, 7, dt);
    head.rotation.set(headX.x, shake * 0.12, headZ.x - shake * 0.08);
    animFace(face, dt, T, clamp(mo.lax * 0.0025, -0.03, 0.03), clamp(headX.v * 0.004, -0.03, 0.03),
      0, 1 + shockS * 0.4, Math.max(clamp(st.talk || 0, 0, 1), shockS * 0.9), 0.055 - shockS * 0.02);

    carryAnchor.position.y = 1.15 + bobY * 0.4;
    tray.visible = carryS > 0.5;
    tray.position.y = carryAnchor.position.y - 0.015;

    for (let i = 0; i < 2; i++) {
      const a = arms[i];
      a.sh.set(a.side * 0.235, 0.66, 0).applyEuler(body.rotation).add(body.position);
      if (i === 0) {                                       // service arm: towel pose <-> tray pose
        _r.set(-0.07, 0.95 + bobY, -0.27);
        _u.set(-0.02, carryAnchor.position.y - 0.05, -0.37);
        _r.lerp(_u, carryS);
      } else {
        _r.set(a.sh.x + 0.09, a.sh.y - 0.5, a.sh.z - sw * 0.25 * wob - clamp(mo.laz * 0.01, -0.12, 0.12));
      }
      _u.set(a.side * 0.43 + shake * 0.05, 1.82 + bobY, -0.06);           // "hands up!" when hit by food
      _r.lerp(_u, shockS);
      relaxArm(a, _r, dt);
      a.pos.copy(a.relax);
      solveArm(a, 0, dt);
    }
    // folded towel hangs over the service forearm
    const sa = arms[0];
    towel.visible = carryS < 0.5 && shockS < 0.3;
    towel.position.addVectors(sa.el, sa.pos).multiplyScalar(0.5);
    towel.position.y -= 0.065;
    towel.rotation.y = Math.atan2(sa.el.z - sa.pos.z, sa.pos.x - sa.el.x);   // local X along the forearm
  }

  return { group, carryAnchor, update, dispose() { group.removeFromParent(); } };
}

// ============================================================================
// Seated dining customer (hips ~0.48 m, hands rest at table height ~0.8 m in front)
// ============================================================================
const RED_FACE = new THREE.Color(0xe23a2a);

export function makeCustomer(opts = {}) {
  const rnd = rng((opts.seed ?? 1) + 907);
  const own = [];
  const skin = pick(rnd, SKINS), shirtM = sharedMat(pick(rnd, SHIRTS)), pantsM = sharedMat(pick(rnd, PANTS));
  const hairM = sharedMat(pick(rnd, HAIRS)), hairStyle = Math.floor(rnd() * 5); // bald / bowl / bun / spiky / cap
  const glasses = rnd() < 0.3, moustache = rnd() < 0.25 && hairStyle !== 2;
  const skinC = new THREE.Color(skin), faceM = ownMat(own, skin), skinM = sharedMat(skin);
  const group = new THREE.Group();

  // seated legs: thighs forward, shins down, shoes on the floor
  const shins = [];
  for (let i = 0; i < 2; i++) {
    const x = i ? 0.12 : -0.12;
    mesh(G.hose(), pantsM, group, x, 0.5, 0.02, 0.095, 0.095, 0.42);
    const shin = new THREE.Group();
    shin.position.set(x, 0.5, -0.4);
    shin.rotation.x = -Math.PI / 2;
    group.add(shin);
    mesh(G.hose(), pantsM, shin, 0, 0, 0, 0.082, 0.082, 0.42);
    mesh(G.sphere(), sharedMat(0x2a2a30), shin, 0, 0.05, -0.44, 0.09, 0.14, 0.06);    // shoe (shin space: -Z is down, +Y is forward)
    shins.push(shin);
  }
  const body = new THREE.Group();
  body.position.y = 0.46;
  group.add(body);
  mesh(G.sphere(), shirtM, body, 0, 0.33, 0, 0.27, 0.37, 0.23);

  const face = buildHead(body, 0.64, faceM, skin);
  const head = face.head;
  const brows = [
    mesh(G.box(), sharedMat(0x2a1c14), head, -0.105, 0.385, -0.238, 0.095, 0.022, 0.02),
    mesh(G.box(), sharedMat(0x2a1c14), head, 0.105, 0.385, -0.238, 0.095, 0.022, 0.02),
  ];
  if (hairStyle === 1) mesh(G.dome(), hairM, head, 0, 0.27, 0.01, 0.288, 0.25, 0.283);                 // bowl cut
  if (hairStyle === 2) {                                                                                // bun
    mesh(G.dome(), hairM, head, 0, 0.26, 0.02, 0.282, 0.26, 0.275).rotation.x = 0.25;
    mesh(G.sphere(), hairM, head, 0, 0.52, 0.1, 0.09);
  }
  if (hairStyle === 3) {                                                                                // spiky quiff
    mesh(G.dome(), hairM, head, 0, 0.27, 0.02, 0.28, 0.25, 0.275).rotation.x = 0.2;
    mesh(G.cone(), hairM, head, 0, 0.56, -0.06, 0.1, 0.24, 0.1).rotation.x = -0.45;
  }
  if (hairStyle === 4) {                                                                                // cap + visor
    const capM = sharedMat(pick(rnd, CHEF_COLORS));
    mesh(G.dome(), capM, head, 0, 0.29, 0, 0.285, 0.23, 0.28);
    mesh(G.sphere(), capM, head, 0, 0.31, -0.3, 0.17, 0.015, 0.15);
  }
  if (glasses) for (let i = 0; i < 2; i++) mesh(G.torus(), sharedMat(0x22222a), head, i ? 0.105 : -0.105, 0.28, -0.278, 0.098, 0.098, 0.2);
  if (moustache) mesh(G.sphere(), hairM, head, 0, 0.152, -0.262, 0.095, 0.022, 0.03);
  const steam = [];
  for (let i = 0; i < 2; i++) {
    const s = mesh(G.sphere(), sharedMat(0xf2f2f2), head, 0, 0.5, 0, 0.01);
    s.visible = false;
    steam.push(s);
  }
  const arms = [buildArm(group, -1, shirtM, skinM, 0.05, 0.5, false), buildArm(group, 1, shirtM, skinM, 0.05, 0.5, false)];

  let T = rnd() * 20, moodS = 0, eatS = 0;
  const ph = rnd() * 6.28;

  function update(dt, st) {
    st = st || EMPTY;
    dt = clamp(dt || 0.016, 1e-4, 0.05);
    T += dt;
    moodS += (clamp(st.mood || 0, -1, 1) - moodS) * Math.min(1, dt * 4);
    eatS += ((st.eating ? 1 : 0) - eatS) * Math.min(1, dt * 6);
    const happy = Math.max(0, moodS), anger = Math.max(0, -moodS);
    const bite = (0.5 - 0.5 * Math.cos(T * 3.2 + ph)) * eatS;          // 0 = hand on table, 1 = hand at mouth
    const bang = Math.abs(Math.sin(T * 9 + ph)) * anger;

    body.position.set(Math.sin(T * 45) * 0.012 * anger, 0.46 + Math.abs(Math.sin(T * 5 + ph)) * 0.035 * happy, 0);
    body.rotation.set(-0.05 + Math.sin(T * 0.7 + ph) * 0.02 - bite * 0.1 - anger * 0.08, 0,
      Math.sin(T * 0.9 + ph) * 0.03 + Math.sin(T * 5 + ph) * 0.05 * happy);
    head.rotation.set(-0.12 * anger - bite * 0.12 + Math.sin(T * 1.3 + ph) * 0.03,
      Math.sin(T * 0.5 + ph) * 0.28 * (1 - anger) * (1 - eatS), Math.sin(T * 2.4 + ph) * 0.1 * happy + Math.sin(T * 38) * 0.03 * anger);
    faceM.color.copy(skinC).lerp(RED_FACE, anger * 0.55);
    for (let i = 0; i < 2; i++) {
      brows[i].rotation.z = (i ? 1 : -1) * (anger * 0.55 - happy * 0.15);
      brows[i].position.y = 0.385 + happy * 0.025 - anger * 0.02;
      shins[i].rotation.x = -Math.PI / 2 + Math.sin(T * 6 + ph + i * Math.PI) * 0.3 * happy;   // happy leg dangle
    }
    animFace(face, dt, T, Math.sin(T * 0.8 + ph) * 0.015, -0.01 * eatS, 0, 1 + anger * 0.1,
      Math.max(bite * 0.8, happy * 0.35), 0.05 + happy * 0.035 - anger * 0.012);

    // steam puffs when furious
    for (let i = 0; i < 2; i++) {
      const s = steam[i], p = (T * 0.9 + i * 0.5) % 1;
      s.visible = anger > 0.4;
      if (!s.visible) continue;
      s.position.set((i ? 0.2 : -0.2) + Math.sin(p * 5 + i) * 0.03, 0.5 + p * 0.35, 0);
      s.scale.setScalar(0.01 + Math.sin(p * Math.PI) * 0.07 * anger);
    }

    // arms: hands on the table; right hand shuttles food to the mouth; angry fists bang the table
    for (let i = 0; i < 2; i++) {
      const a = arms[i];
      a.sh.set(a.side * 0.235, 0.52, 0).applyEuler(body.rotation).add(body.position);
      _r.set(a.side * 0.2, 0.8 + bang * 0.09 + Math.abs(Math.sin(T * 5 + ph)) * 0.04 * happy, -0.36);
      if (i === 1) { _u.set(0.05 + body.position.x, 0.66 + body.position.y, -0.33); _r.lerp(_u, bite); }
      relaxArm(a, _r, dt);
      a.pos.copy(a.relax);
      solveArm(a, anger > 0.3 || (i === 1 && eatS > 0.5) ? 1 : 0, dt);
    }
  }

  return { group, update, dispose() { group.removeFromParent(); for (const m of own) m.dispose(); } };
}

// ============================================================================
// First-person floating cartoon glove. Origin = palm centre, fingers -> -Z, palm down (-Y),
// thumb toward +X for the LEFT hand (opts.side 'L' default, 'R' mirrors).
// ============================================================================
export function makeHand(opts = {}) {
  const own = [];
  const sx = opts.side === 'R' ? -1 : 1;
  const group = new THREE.Group();
  const white = sharedMat(0xffffff), line = sharedMat(0x2a2a33);
  const cuffM = ownMat(own, opts.color ?? CHEF_COLORS[0]);
  const FR = 0.0185;                                       // finger radius

  const palm = mesh(G.sphere(), white, group, 0, 0, 0, 0.078, 0.036, 0.085);
  for (let i = 0; i < 3; i++) mesh(G.box(), line, group, (i - 1) * 0.03, 0.034, -0.012, 0.005, 0.004, 0.045); // Mickey lines
  mesh(G.cyl(), white, group, 0, 0, 0.085, 0.054, 0.05, 0.04).rotation.x = Math.PI / 2;                       // wrist sleeve
  mesh(G.ring(), cuffM, group, 0, 0, 0.115, 0.056, 0.044, 0.06);                                              // player-colour cuff

  const fingers = [];
  const LEN = [1.0, 1.12, 1.02, 0.84];                     // index .. pinky
  for (let i = 0; i < 4; i++) {
    const n = 1 - i * (2 / 3);                             // +1 (index, next to the thumb) .. -1 (pinky)
    const prox = new THREE.Group();
    prox.position.set(sx * n * 0.054, 0, -0.064 + Math.abs(n) * 0.008);
    group.add(prox);
    mesh(G.finger(), white, prox, 0, 0, 0, FR, FR, FR * LEN[i]);
    const dist = new THREE.Group();
    dist.position.z = -2 * FR * LEN[i];
    prox.add(dist);
    mesh(G.finger(), white, dist, 0, 0, 0, FR * 0.96, FR * 0.96, FR * LEN[i] * 0.85);
    fingers.push({ prox, dist, n });
  }
  const tProx = new THREE.Group(), tDist = new THREE.Group();
  group.add(tProx);
  mesh(G.finger(), white, tProx, 0, 0, 0, 0.022, 0.022, 0.02);
  tDist.position.z = -0.04;
  tProx.add(tDist);
  mesh(G.finger(), white, tDist, 0, 0, 0, 0.021, 0.021, 0.017);

  function setGrip(g) {
    g = clamp(g || 0, 0, 1);
    for (let i = 0; i < 4; i++) {
      const f = fingers[i];
      f.prox.rotation.set(-(0.1 + 1.3 * g), -sx * f.n * 0.17 * (1 - g), 0);   // curl down + spread when open
      f.dist.rotation.x = -(0.12 + 1.45 * g);
    }
    tProx.position.set(sx * (0.07 - 0.012 * g), -0.004 - 0.022 * g, -0.005 - 0.04 * g);
    tProx.rotation.set(-0.75 * g, -sx * (1.05 - 1.5 * g), 0);                 // out to the side -> folded across the fist
    tDist.rotation.y = sx * (0.25 + 0.8 * g);
    palm.scale.set(0.078 - 0.008 * g, 0.036 + 0.012 * g, 0.085 - 0.012 * g);
  }
  setGrip(0);

  return {
    group, setGrip,
    setColor(c) { cuffM.color.setHex(c); },
    dispose() { group.removeFromParent(); for (const m of own) m.dispose(); },
  };
}

