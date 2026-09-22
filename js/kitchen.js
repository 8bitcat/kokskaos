// Kökskaos — builds a restaurant: static geometry (batched visuals + colliders), hinged/sliding fixtures, appliance
// zones, stock rules and tool homes — from a descriptor in restaurants.js (room, theme, layout, bought upgrades).
// Built identically on host and clients so fixture ids match.
import * as THREE from '../vendor/three.module.js';
import { ROOM, GROUPS } from './config.js';
import { C, mat, toonGradient, buildParts } from './items.js';

const H = ROOM.benchH, D = 0.9;
let COL = {};
const quatY = (yaw) => ({ x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) });
const hex = (c) => '#' + c.toString(16).padStart(6, '0');
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ------------------------------------------------------------------ static batching
class Batch {
  constructor() { this.map = new Map(); this.q = new THREE.Quaternion(); this.e = new THREE.Euler(); }
  add(shape, x, y, z, sx, sy, sz, yaw, color, type = 'toon', shadow = true) {
    const key = shape + '|' + type + '|' + color + '|' + (shadow ? 1 : 0);
    let arr = this.map.get(key);
    if (!arr) this.map.set(key, arr = { shape, type, color, shadow, mats: [] });
    this.e.set(0, yaw, 0); this.q.setFromEuler(this.e);
    arr.mats.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), this.q, new THREE.Vector3(sx, sy, sz)));
  }
  build(parent) {
    const unitBox = new THREE.BoxGeometry(1, 1, 1), unitCyl = new THREE.CylinderGeometry(1, 1, 1, 20);
    for (const b of this.map.values()) {
      const im = new THREE.InstancedMesh(b.shape === 'box' ? unitBox : unitCyl, mat(b.color, b.type), b.mats.length);
      b.mats.forEach((m, i) => im.setMatrixAt(i, m));
      im.castShadow = b.shadow && b.type !== 'glow' && b.type !== 'glass'; im.receiveShadow = b.type !== 'glow';
      im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere();
      parent.add(im);
    }
  }
}

// ------------------------------------------------------------------ oriented local frame (a bench run)
class Frame {
  constructor(K, x, z, yaw) { this.K = K; this.x = x; this.z = z; this.yaw = yaw; this.c = Math.cos(yaw); this.s = Math.sin(yaw); this.q = quatY(yaw); }
  pt(lx, ly, lz) { return [this.x + lx * this.c + lz * this.s, ly, this.z - lx * this.s + lz * this.c]; }
  box(lx, ly, lz, sx, sy, sz, color, o = {}) {
    const p = this.pt(lx, ly, lz);
    if (o.vis !== false) this.K.batch.add('box', p[0], p[1], p[2], sx, sy, sz, this.yaw, color, o.mat, o.shadow !== false);
    if (o.solid) this.K.solid(p[0], p[1], p[2], sx, sy, sz, this.yaw);
  }
  cyl(lx, ly, lz, r, h, color, o = {}) {
    const p = this.pt(lx, ly, lz);
    this.K.batch.add('cyl', p[0], p[1], p[2], r, h, r, this.yaw, color, o.mat, o.shadow !== false);
    if (o.solid) this.K.solidCyl(p[0], p[1], p[2], r, h);
  }
  solid(lx, ly, lz, sx, sy, sz) { const p = this.pt(lx, ly, lz); this.K.solid(p[0], p[1], p[2], sx, sy, sz, this.yaw); }
  aabb(lx, ly, lz, sx, sy, sz) {
    const a = this.pt(lx - sx / 2, ly - sy / 2, lz - sz / 2), b = this.pt(lx + sx / 2, ly + sy / 2, lz + sz / 2);
    return { min: [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.min(a[2], b[2])], max: [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.max(a[2], b[2])] };
  }
  obj(o, lx, ly, lz) { const p = this.pt(lx, ly, lz); o.position.set(p[0], p[1], p[2]); o.rotation.y = this.yaw; this.K.scene.add(o); return o; }
}

export function signMesh(text, w, h, fg = '#fff', bg = '#e5483d', font = 'bold 120px Fredoka, Trebuchet MS, sans-serif') {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = Math.round(512 * h / w);
  const g = cv.getContext('2d');
  if (bg) { g.fillStyle = bg; g.beginPath(); g.roundRect(4, 4, cv.width - 8, cv.height - 8, 28); g.fill(); }
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  let size = 120; while (size > 20) { g.font = font.replace('120px', size + 'px'); if (g.measureText(text).width < cv.width - 50) break; size -= 6; }
  g.fillText(text, cv.width / 2, cv.height / 2 + size * 0.06);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: !bg }));
}
function canvasPlane(w, h, px, draw, opacity = 1) {
  const cv = document.createElement('canvas'); cv.width = px; cv.height = Math.round(px * h / w);
  draw(cv.getContext('2d'), cv.width, cv.height);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity, depthWrite: false }));
}
function floorTexture(a, b, n, grime) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const g = cv.getContext('2d');
  g.fillStyle = hex(a); g.fillRect(0, 0, 128, 128); g.fillStyle = hex(b); g.fillRect(0, 0, 64, 64); g.fillRect(64, 64, 64, 64);
  g.strokeStyle = grime ? 'rgba(30,20,10,0.35)' : 'rgba(0,0,0,0.08)'; g.lineWidth = grime ? 3 : 2;
  for (const [x, y] of [[0, 0], [64, 64], [64, 0], [0, 64]]) g.strokeRect(x, y, 64, 64);
  if (grime) { const r = rng(7); for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(40,28,14,${0.05 + r() * 0.1})`; g.beginPath(); g.arc(r() * 128, r() * 128, 3 + r() * 12, 0, 6.3); g.fill(); } }
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(n[0], n[1]); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

// knob dial: OFF at 12 o'clock, a clockwise arc from pale yellow to deep red with flames growing towards max
const DIAL_GEO = new THREE.PlaneGeometry(0.21, 0.21), DIAL_TEX = {};
function dialTexture(lang) {
  if (DIAL_TEX[lang]) return DIAL_TEX[lang];
  const cv = document.createElement('canvas'); cv.width = cv.height = 256; const g = cv.getContext('2d'), c = 128, R = 98;
  g.fillStyle = 'rgba(28,30,36,0.9)'; g.beginPath(); g.arc(c, c, 126, 0, Math.PI * 2); g.fill();
  const a0 = -Math.PI / 2, a1 = a0 + 2.4, N = 48;          // canvas y points down, so +angle = clockwise on screen
  for (let i = 0; i < N; i++) { const t = i / N, a = a0 + (a1 - a0) * t; g.strokeStyle = `hsl(${52 - 52 * t}, 95%, ${62 - 16 * t}%)`; g.lineWidth = 14 + 20 * t; g.beginPath(); g.arc(c, c, R, a, a + (a1 - a0) / N + 0.012); g.stroke(); }
  const ex = c + Math.cos(a1) * R, ey = c + Math.sin(a1) * R, tx = -Math.sin(a1), ty = Math.cos(a1);   // arrow head, pointing clockwise
  g.fillStyle = '#c0180e'; g.beginPath(); g.moveTo(ex + tx * 30, ey + ty * 30); g.lineTo(ex - ty * 22, ey + tx * 22); g.lineTo(ex + ty * 22, ey - tx * 22); g.fill();
  g.textAlign = 'center'; g.textBaseline = 'middle';
  for (const [t, sz] of [[0.28, 26], [0.6, 36], [0.9, 48]]) { const a = a0 + (a1 - a0) * t; g.font = `${sz}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`; g.fillText('🔥', c + Math.cos(a) * (R + 4), c + Math.sin(a) * (R + 4)); }
  g.fillStyle = '#fff'; g.fillRect(c - 3, 12, 6, 20);
  g.font = 'bold 22px Fredoka, sans-serif'; g.fillText(lang === 'en' ? 'OFF' : 'AV', c - 34, 22);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return (DIAL_TEX[lang] = tex);
}

// ==================================================================================================
export function buildKitchen({ R, world, scene, sim, view, lang = 'sv', rest, up = {} }) {
  const L = (sv, en) => (lang === 'en' ? en : sv);
  Object.assign(ROOM, rest.room);
  COL = { ...rest.theme, black: 0x23262d, oil: 0xf2b632, wood: C.wood, woodDark: C.woodDark };
  if (up.paint) Object.assign(COL, { wall: 0xf6ecd2, wallTile: 0xfbf6e8, stripe: 0xd9822b, diningWall: 0xf0d2a0, cracks: false });
  if (up.clean) Object.assign(COL, { floorA: 0xe6dcc0, floorB: 0x86a596, grime: false, top: 0xd9d3c3 });
  if (up.lights) Object.assign(COL, { flicker: false, light: 1.0 });
  const lay = rest.layout(L, up);
  const truck = !!rest.truck;
  const K = {
    R, world, scene, batch: new Batch(), nextFix: 1, rest, theme: COL,
    burners: [], ovens: [], fryers: [], taps: [], blenders: [], trash: [], stock: [], tools: [], tables: [], fixtures: [],
    pass: null, lever: 0, spawns: [], lampGlows: [], flicker: !!COL.flicker, light: COL.light || 1, bg: COL.bg, truck,
    solid(x, y, z, sx, sy, sz, yaw = 0) {
      world.createCollider(R.ColliderDesc.cuboid(sx / 2, sy / 2, sz / 2).setTranslation(x, y, z).setRotation(quatY(yaw))
        .setCollisionGroups(GROUPS.static).setFriction(0.8).setRestitution(0.1));
    },
    solidCyl(x, y, z, r, h) {
      world.createCollider(R.ColliderDesc.cylinder(h / 2, r).setTranslation(x, y, z).setCollisionGroups(GROUPS.static).setFriction(0.8));
    },
  };
  const tool = (kind, p, yaw = 0, home = true, q = null) => K.tools.push({ kind, p, yaw, home, q });

  // ---- fixture factory (doors, drawers, knobs, levers). Same order everywhere => same ids.
  function fixture(f, o) {
    const id = K.nextFix++;
    const wp = f.pt(o.lp[0], o.lp[1], o.lp[2]);
    const fx = { id, wp, yaw: f.yaw, q: f.q, ...o };
    K.fixtures.push(fx);
    view.addFixture(fx);
    if (sim) sim.addFixture(fx);
    return id;
  }
  const knobParts = (color) => [
    { g: 'cyl', r: 0.046, h: 0.045, p: [0, 0, 0.0225], r3: [Math.PI / 2, 0, 0], c: color },
    { g: 'cyl', r: 0.05, h: 0.012, p: [0, 0, 0.006], r3: [Math.PI / 2, 0, 0], c: C.steel },
    { g: 'box', sz: [0.014, 0.05, 0.012], p: [0, 0.02, 0.046], c: C.white },
  ];
  const knob = (f, lx, ly, lz, color, role, where) => {
    const dial = new THREE.Mesh(DIAL_GEO, new THREE.MeshBasicMaterial({ map: dialTexture(lang), transparent: true, depthWrite: false }));
    f.obj(dial, lx, ly, lz + 0.003);   // the dial picture behind the knob: OFF at the top, clockwise towards the big red flames = max
    return fixture(f, {
      type: 'knob', lp: [lx, ly, lz], axis: 'z', limits: [-2.4, 0], mass: 0.3, damp: 6, role, where,
      n: [{ burner: 'Spisvred', oven: 'Ugnsvred', fryer: 'Fritösvred' }[role] || 'Vred', { burner: 'Burner knob', oven: 'Oven knob', fryer: 'Fryer knob' }[role] || 'Knob'],
      hint: ['ta tag och dra musen åt höger = PÅ (medsols)', 'grab it and drag the mouse right = ON (clockwise)'],
      col: [{ s: 'cyl', hh: 0.024, rad: 0.05, p: [0, 0, 0.024], r: [Math.PI / 2, 0, 0] }], parts: knobParts(color),
    });
  };

  // ================================================================ room shell
  const { hx, hz, wallH, diningDepth, passX } = ROOM, zN = -hz, zD = -hz - diningDepth;
  if (!truck) {
    const fm = new THREE.Mesh(new THREE.PlaneGeometry(hx * 2, hz * 2), new THREE.MeshToonMaterial({ map: floorTexture(COL.floorA, COL.floorB, [hx, hz], COL.grime), gradientMap: toonGradient() }));
    fm.rotation.x = -Math.PI / 2; fm.receiveShadow = true; scene.add(fm);
    const dm = new THREE.Mesh(new THREE.PlaneGeometry(hx * 2, diningDepth), new THREE.MeshToonMaterial({ map: floorTexture(COL.diningFloorA, COL.diningFloorB, [hx * 2, diningDepth], COL.grime), gradientMap: toonGradient() }));
    dm.rotation.x = -Math.PI / 2; dm.position.set(0, 0, (zN + zD) / 2); dm.receiveShadow = true; scene.add(dm);
    K.solid(0, -0.5, (hz + zD) / 2, hx * 2 + 2, 1, hz - zD + 2);                  // floor
    K.solid(0, wallH + 0.5, (hz + zD) / 2, hx * 2 + 2, 1, hz - zD + 2);           // ceiling
    const cm = new THREE.Mesh(new THREE.PlaneGeometry(hx * 2, hz - zD), mat(COL.ceiling)); cm.rotation.x = Math.PI / 2; cm.position.set(0, wallH, (hz + zD) / 2); scene.add(cm);
  }
  const W = new Frame(K, 0, 0, 0);
  const wall = (x, y, z, sx, sy, sz, c) => W.box(x, y, z, sx, sy, sz, c, { solid: true, shadow: false });
  const sideW = hx - passX;                     // wall either side of the pass / hatch (also used by the wall decor)
  if (!truck) {
  wall(0, wallH / 2, hz + 0.15, hx * 2 + 0.6, wallH, 0.3, COL.wall);                          // south
  wall(-hx - 0.15, wallH / 2, (hz + zD) / 2, 0.3, wallH, hz - zD, COL.wall);                  // west
  wall(hx + 0.15, wallH / 2, (hz + zD) / 2, 0.3, wallH, hz - zD, COL.wall);                   // east
  wall(0, wallH / 2, zD - 0.15, hx * 2 + 0.6, wallH, 0.3, COL.diningWall);                    // dining far wall
  wall(-passX - sideW / 2, wallH / 2, zN, sideW, wallH, 0.3, COL.wall);                       // north wall left of pass
  wall(passX + sideW / 2, wallH / 2, zN, sideW, wallH, 0.3, COL.wall);
  wall(0, (2.55 + wallH) / 2, zN, passX * 2, wallH - 2.55, 0.3, COL.wall);                    // above pass window
  // tile band + stripe around the kitchen
  for (const [x, z, sx, sz] of [[0, hz - 0.005, hx * 2, 0.02], [-hx + 0.005, 0, 0.02, hz * 2], [hx - 0.005, 0, 0.02, hz * 2]]) {
    W.box(x, 1.1, z, sx, 2.2, sz, COL.wallTile, { shadow: false }); W.box(x, 2.26, z, sx + 0.004, 0.12, sz + 0.004, COL.stripe, { shadow: false });
  }
  for (const s of [-1, 1]) { W.box(s * (passX + sideW / 2), 1.1, zN + 0.155, sideW, 2.2, 0.02, COL.wallTile, { shadow: false }); W.box(s * (passX + sideW / 2), 2.26, zN + 0.157, sideW, 0.12, 0.02, COL.stripe, { shadow: false }); }
  // dining room windows (glow) + wainscot
  const nWin = Math.max(1, Math.floor((hx - 1.6) / 4.6));
  for (let i = -nWin; i <= nWin; i++) { W.box(i * 4.6, 2.0, zD + 0.02, 2.6, 1.5, 0.04, COL.grime ? 0x8aa6b3 : 0xaee3ff, { mat: 'glow', shadow: false }); W.box(i * 4.6, 2.0, zD + 0.04, 0.08, 1.5, 0.05, 0xffffff, { shadow: false }); W.box(i * 4.6, 2.0, zD + 0.04, 2.6, 0.08, 0.05, 0xffffff, { shadow: false }); }
  W.box(0, 0.5, zD + 0.02, hx * 2, 1.0, 0.04, COL.wainscot, { shadow: false });
  // ceiling lamps
  const lampXs = []; for (let x = -hx + 2.6; x <= hx - 2.5; x += 5.3) lampXs.push(x);
  const off = lampXs.length ? -(lampXs[0] + lampXs[lampXs.length - 1]) / 2 : 0;
  for (const lz of [-hz / 2, 0, hz / 2]) for (const lx0 of lampXs) {
    const lx = lx0 + off;
    if (COL.lamp === 'tube') {
      W.box(lx, wallH - 0.06, lz, 1.5, 0.08, 0.24, 0x8a8f8f, { shadow: false });
      const m = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.04, 0.16), new THREE.MeshBasicMaterial({ color: 0xf4ffe8 })); m.position.set(lx, wallH - 0.12, lz); scene.add(m); K.lampGlows.push(m);
    } else if (COL.lamp === 'chandelier') {
      W.cyl(lx, wallH - 0.4, lz, 0.012, 0.8, 0xd4af37, { shadow: false }); W.cyl(lx, wallH - 0.85, lz, 0.42, 0.05, 0xd4af37, { shadow: false }); W.cyl(lx, wallH - 0.95, lz, 0.2, 0.05, 0xd4af37, { shadow: false });
      for (let k = 0; k < 6; k++) W.cyl(lx + Math.cos(k * 1.047) * 0.4, wallH - 0.76, lz + Math.sin(k * 1.047) * 0.4, 0.035, 0.12, 0xfff3c4, { mat: 'glow', shadow: false });
    } else {
      W.cyl(lx, wallH - 0.45, lz, 0.015, 0.9, COL.black, { shadow: false }); W.cyl(lx, wallH - 0.98, lz, 0.32, 0.2, 0xf9d65c, { shadow: false });
      W.cyl(lx, wallH - 1.09, lz, 0.26, 0.04, 0xfffbe0, { mat: 'glow', shadow: false });
    }
  }

  } else buildTruckShell();

  // ---- a food truck instead of a building: street, body on wheels, hatch with a propped-open flap
  function buildTruckShell() {
    const T = 0.12, sideW = hx - passX, bw = hx + T, bd = hz + T;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshToonMaterial({ map: floorTexture(COL.groundA, COL.groundB, [26, 26], false), gradientMap: toonGradient() }));
    ground.rotation.x = -Math.PI / 2; ground.position.set(0, -0.004, -10); ground.receiveShadow = true; scene.add(ground);
    K.solid(0, -0.55, -10, 80, 1, 80);
    const fm = new THREE.Mesh(new THREE.PlaneGeometry(hx * 2, hz * 2), new THREE.MeshToonMaterial({ map: floorTexture(COL.floorA, COL.floorB, [hx * 2, hz * 2], COL.grime), gradientMap: toonGradient() }));
    fm.rotation.x = -Math.PI / 2; fm.position.y = 0.004; fm.receiveShadow = true; scene.add(fm);
    K.solid(0, -0.5, 0, hx * 2 + 1, 1, hz * 2 + 1);
    // body: back + ends + the two panels beside the hatch + the header above it
    W.box(0, wallH / 2, hz + T / 2, hx * 2 + T * 2, wallH, T, COL.truck, { solid: true });
    for (const s of [-1, 1]) W.box(s * (hx + T / 2), wallH / 2, 0, T, wallH, hz * 2, COL.truck, { solid: true });
    for (const s of [-1, 1]) W.box(s * (passX + sideW / 2), wallH / 2, -(hz + T / 2), sideW, wallH, T, COL.truck, { solid: true });
    W.box(0, (2.02 + wallH) / 2, -(hz + T / 2), passX * 2, wallH - 2.02, T, COL.truck, { solid: true });
    W.box(0, wallH + 0.07, 0, hx * 2 + T * 2 + 0.18, 0.14, hz * 2 + T * 2 + 0.18, COL.truckRoof);      // roof
    K.solid(0, wallH + 0.4, 0, hx * 2, 1, hz * 2);
    const cm = new THREE.Mesh(new THREE.PlaneGeometry(hx * 2, hz * 2), mat(COL.ceiling)); cm.rotation.x = Math.PI / 2; cm.position.y = wallH; scene.add(cm);
    for (const s of [-1, 1]) { W.box(0, 1.28, s * (hz + T + 0.012), hx * 2 + T * 2, 0.2, 0.02, COL.stripe, { shadow: false }); W.box(0, 0.3, s * (hz + T + 0.012), hx * 2 + T * 2, 0.6, 0.02, 0x2b2f38, { shadow: false }); }
    for (const s of [-1, 1]) { W.box(s * (hx + T + 0.012), 1.28, 0, 0.02, 0.2, hz * 2 + T * 2, COL.stripe, { shadow: false }); W.box(s * (hx + T + 0.012), 0.3, 0, 0.02, 0.6, hz * 2 + T * 2, 0x2b2f38, { shadow: false }); }
    const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 18), hubGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.26, 10);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (const [geo, col] of [[wheelGeo, 0x1d1f24], [hubGeo, 0xc9ced4]]) {
      const m = new THREE.Mesh(geo, mat(col)); m.rotation.x = Math.PI / 2; m.position.set(sx * (hx - 0.95), 0.34, sz * (hz + T + 0.13)); m.castShadow = true; scene.add(m);
    }
    // the hatch flap, propped open over the counter
    const flap = new THREE.Mesh(new THREE.BoxGeometry(passX * 2 + 0.24, 0.06, 1.5), mat(COL.truck));
    flap.position.set(0, 2.02 + Math.sin(0.34) * 0.75, -(hz + T) - Math.cos(0.34) * 0.75); flap.rotation.x = 0.34; flap.castShadow = true; scene.add(flap);
    const stripes = canvasPlane(passX * 2 + 0.24, 1.5, 256, (g, W2, H2) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#e5483d' : '#f7f2e6'; g.fillRect(i * W2 / 8, 0, W2 / 8, H2); } });
    stripes.position.copy(flap.position); stripes.position.y -= 0.035; stripes.rotation.set(-Math.PI / 2 + 0.34, 0, 0); scene.add(stripes);
    for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.0, 8), mat(C.steelDark)); p.position.set(s * (passX - 0.1), 1.62, -(hz + T) - 1.35); p.rotation.x = 0.34; p.castShadow = true; scene.add(p); }
    // roof sign + a giant burger, vent
    const sg = signMesh(L('KÖKSKAOS FOODTRUCK', 'KÖKSKAOS FOOD TRUCK'), Math.min(3.4, hx * 1.7), 0.56, COL.signFg, COL.sign);
    sg.position.set(0, wallH + 0.55, -(hz + T + 0.01)); scene.add(sg);
    W.box(0, wallH + 0.15, -(hz + T - 0.06), Math.min(3.4, hx * 1.7) + 0.1, 0.1, 0.12, COL.truckRoof, { shadow: false });
    const bun = (y, r, sc, col) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), mat(col)); m.scale.set(1, sc, 1); m.position.set(hx - 1.2, wallH + y, 0.2); m.castShadow = true; scene.add(m); };
    bun(0.34, 0.42, 0.55, 0xe0a458); bun(0.16, 0.4, 0.3, 0x7a4a2c); bun(0.05, 0.42, 0.22, 0xe0a458);
    W.box(-hx + 1.1, wallH + 0.28, 0.1, 0.5, 0.3, 0.5, C.steelDark); W.box(-hx + 1.1, wallH + 0.46, 0.1, 0.6, 0.06, 0.6, C.steel);
    // street dressing: parking box, queue line, lamp posts, trees, a skyline
    const paint = (w2, h2, draw, x, z, rot) => { const m = canvasPlane(w2, h2, 256, draw); m.rotation.x = -Math.PI / 2; m.rotation.z = rot || 0; m.position.set(x, 0.006, z); scene.add(m); };
    paint(passX * 2 + 1.2, 1.3, (g, W2, H2) => { g.fillStyle = '#f2e14a'; g.fillRect(0, H2 - 16, W2, 16); g.font = 'bold 48px Fredoka, sans-serif'; g.textAlign = 'center'; g.fillStyle = '#f2e14a'; g.fillText(L('KÖ HÄR', 'QUEUE HERE'), W2 / 2, 60); }, 0, -(hz + 2.6));
    for (const s of [-1, 1]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 4.2, 10), mat(0x3b4048)); post.position.set(s * (hx + 3.4), 2.1, -(hz + 5.2)); post.castShadow = true; scene.add(post);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.16, 0.34), mat(0x3b4048)); head.position.set(s * (hx + 3.4) - s * 0.3, 4.18, -(hz + 5.2)); scene.add(head);
      const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.24), mat(0xfff3c4, 'glow')); bulb.position.set(s * (hx + 3.4) - s * 0.3, 4.09, -(hz + 5.2)); scene.add(bulb); }
    for (const [tx, tz, r] of [[-hx - 2.6, -hz - 7.6, 1.1], [hx + 3.2, -hz - 8.4, 1.3], [-hx - 5.5, -hz - 4.2, 0.95]]) {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 1.8, 8), mat(C.woodDark)); trunk.position.set(tx, 0.9, tz); trunk.castShadow = true; scene.add(trunk);
      const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), mat(0x4ea63a, 'flat')); leaf.position.set(tx, 1.8 + r * 0.6, tz); leaf.castShadow = true; scene.add(leaf);
    }
    for (let i = 0; i < 14; i++) { const w2 = 3 + (i % 4) * 1.6, h2 = 4 + ((i * 7) % 9); W.box(-24 + i * 3.6, h2 / 2, -hz - 22 - (i % 3) * 2.5, w2, h2, 4, [0xb9c3cc, 0xa8b3bd, 0xc7d0d8][i % 3], { shadow: false }); }
  }

  // ================================================================ module builders
  function cabinetFace(f, lx, w, color) {       // decorative door lines + handles on the front
    const n = w > 0.7 ? 2 : 1, dw = (w - 0.06) / n;
    for (let i = 0; i < n; i++) {
      const cx = lx - w / 2 + 0.03 + dw * (i + 0.5);
      f.box(cx, 0.1 + (H - 0.2) / 2, D / 2 + 0.006, dw - 0.03, H - 0.26, 0.02, color, { shadow: false });
      f.box(cx + (i === 0 && n === 2 ? dw / 2 - 0.07 : -dw / 2 + 0.07), 0.62, D / 2 + 0.03, 0.025, 0.16, 0.025, COL.steel, { shadow: false });
    }
  }
  function counter(f, lx, w, o = {}) {
    const body = o.wood ? COL.cabWood : COL.cab, top = o.top === 'steel' ? COL.topSteel : COL.top, face = o.wood ? COL.woodDark : COL.cabDark;
    f.box(lx, 0.05, -0.03, w, 0.1, D - 0.14, COL.kick);
    f.box(lx, 0.1 + (H - 0.16) / 2, 0, w - 0.004, H - 0.16, D, body);
    f.box(lx, H - 0.03, 0, w, 0.06, D + 0.08, top);
    f.solid(lx, H / 2, 0, w, H, D + 0.06);
    cabinetFace(f, lx, w, face);
    if (o.back) cabinetFace({ box: (x, y, z, ...r) => f.box(x, y, -z, ...r) }, lx, w, face);
    if (o.shelf) {           // wall shelf above the counter
      f.box(lx, 1.5, -D / 2 + 0.17, w - 0.08, 0.04, 0.38, COL.wood, { solid: true });
      for (const s of [-1, 1]) f.box(lx + s * (w / 2 - 0.12), 1.4, -D / 2 + 0.1, 0.04, 0.18, 0.2, COL.steelDark, { shadow: false });
      for (const [kind, ox] of o.shelf) tool(kind, f.pt(lx + ox, 1.53, -D / 2 + 0.17), f.yaw, true);
    }
  }
  function crock(f, lx, lz, kinds) {             // utensil crock: static ring of walls, tools standing in it
    const r = 0.085, h = 0.17, n = 8, t = 0.015, p = f.pt(lx, H, lz);
    const g = buildParts([{ g: 'tube', r: r + t, h, p: [0, h / 2, 0], c: 0xe9e2d2 }, { g: 'cyl', r: r + t, h: 0.012, p: [0, 0.006, 0], c: 0xd9cfb8 }, { g: 'torus', r: r + t, t: 0.008, p: [0, h, 0], c: 0x4aa3df }]);
    g.position.set(p[0], H, p[2]); scene.add(g);
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; K.solid(p[0] + Math.cos(a) * (r + t / 2), H + h / 2, p[2] - Math.sin(a) * (r + t / 2), t, h, 2 * Math.tan(Math.PI / n) * (r + t) * 1.05, a); }
    kinds.forEach((kind, i) => {
      const a = i / kinds.length * Math.PI * 2 + 0.4, ya = a + 1.2, s = Math.SQRT1_2;   // q = yaw(ya) * rotZ(90°): tool head (+x) points up
      const q = { x: Math.sin(ya / 2) * s, y: Math.sin(ya / 2) * s, z: Math.cos(ya / 2) * s, w: Math.cos(ya / 2) * s };
      tool(kind, [p[0] + Math.cos(a) * 0.035, H + 0.31, p[2] + Math.sin(a) * 0.035], 0, true, q);
    });
  }
  function drawers(f, lx, w = 1.0, contents = []) {
    f.box(lx, 0.05, -0.03, w, 0.1, D - 0.14, COL.kick);
    f.box(lx, 0.13, 0, w, 0.06, D, COL.cab, { solid: true });                          // bottom
    f.box(lx, H - 0.03, 0, w, 0.06, D + 0.08, COL.top); f.solid(lx, H - 0.06, 0, w, 0.12, D + 0.06);
    for (const s of [-1, 1]) f.box(lx + s * (w / 2 - 0.025), 0.48, 0, 0.05, 0.7, D, COL.cab, { solid: true });
    f.box(lx, 0.48, -D / 2 + 0.025, w, 0.7, 0.05, COL.cab, { solid: true });
    f.box(lx, 0.48, 0, w - 0.1, 0.03, D - 0.06, COL.cabDark, { solid: true });          // divider shelf between the drawers
    const iw = w - 0.14, idp = D - 0.16, ih = 0.2;
    [0.665, 0.325].forEach((cy, i) => {
      fixture(f, {
        type: 'slide', lp: [lx, cy, 0.02], axis: 'z', limits: [0, 0.52], mass: 3, damp: 9, role: 'drawer', n: ['Låda', 'Drawer'], hint: ['dra ut', 'pull it out'],
        col: [{ s: 'box', hx: iw / 2, hy: 0.01, hz: idp / 2, p: [0, -ih / 2, 0] }, { s: 'box', hx: 0.012, hy: ih / 2, hz: idp / 2, p: [iw / 2, 0, 0] },
          { s: 'box', hx: 0.012, hy: ih / 2, hz: idp / 2, p: [-iw / 2, 0, 0] }, { s: 'box', hx: iw / 2, hy: ih / 2, hz: 0.012, p: [0, 0, -idp / 2] },
          { s: 'box', hx: w / 2 - 0.03, hy: 0.15, hz: 0.014, p: [0, 0.01, idp / 2 + 0.014] }, { s: 'box', hx: 0.12, hy: 0.018, hz: 0.025, p: [0, 0.03, idp / 2 + 0.05] }],
        parts: [{ g: 'box', sz: [iw, 0.02, idp], p: [0, -ih / 2, 0], c: 0xe9e2d2 }, { g: 'box', sz: [0.024, ih, idp], p: [iw / 2, 0, 0], c: 0xe9e2d2 },
          { g: 'box', sz: [0.024, ih, idp], p: [-iw / 2, 0, 0], c: 0xe9e2d2 }, { g: 'box', sz: [iw, ih, 0.024], p: [0, 0, -idp / 2], c: 0xe9e2d2 },
          { g: 'box', sz: [w - 0.06, 0.3, 0.028], p: [0, 0.01, idp / 2 + 0.014], c: COL.cabDark }, { g: 'box', sz: [0.24, 0.036, 0.05], p: [0, 0.03, idp / 2 + 0.05], c: COL.steel }],
      });
      (contents[i] || []).forEach((kind, j) => tool(kind, f.pt(lx - 0.24 + j * 0.24, cy - 0.06, 0.02), f.yaw + Math.PI / 2, false));
    });
  }
  const flameGeo = new THREE.ConeGeometry(0.022, 0.07, 6), flameMatA = mat(0x4fb4ff, 'glow'), flameMatB = mat(0xffb03a, 'glow');
  function range(f, lx) {
    const w = 1.2;
    f.box(lx, 0.05, -0.03, w, 0.1, D - 0.14, COL.kick);
    f.box(lx, 0.15, 0, w, 0.1, D, COL.steel, { solid: true });
    for (const s of [-1, 1]) f.box(lx + s * (w / 2 - 0.04), 0.47, 0, 0.08, 0.54, D, COL.steel, { solid: true });
    f.box(lx, 0.47, -D / 2 + 0.03, w, 0.54, 0.06, COL.steelDark, { solid: true });
    f.box(lx, 0.83, 0, w, 0.18, D, COL.steel, { solid: true });
    f.box(lx, H + 0.006, 0, w, 0.03, D + 0.08, COL.black); f.solid(lx, H + 0.006, 0, w, 0.03, D + 0.08);
    f.box(lx, 0.43, -0.02, w - 0.16, 0.02, D - 0.16, COL.steelDark, { solid: true });   // oven rack
    const glow = f.obj(new THREE.Mesh(new THREE.BoxGeometry(w - 0.2, 0.46, 0.02), mat(0xff8a2a, 'glow')), lx, 0.47, -D / 2 + 0.075);
    glow.visible = false;
    const top = H + 0.021;
    const bp = [[-0.29, -0.2], [-0.29, 0.2], [0.29, 0.2], [0.29, -0.2]], kx = [-0.46, -0.24, 0.24, 0.46];
    bp.forEach(([bx, bz], i) => {
      f.cyl(lx + bx, top + 0.006, bz, 0.155, 0.012, 0x3a3d45, { shadow: false }); f.cyl(lx + bx, top + 0.012, bz, 0.06, 0.02, 0x15171b, { shadow: false });
      f.box(lx + bx, top + 0.022, bz, 0.36, 0.014, 0.03, 0x15171b, { shadow: false }); f.box(lx + bx, top + 0.022, bz, 0.03, 0.014, 0.36, 0x15171b, { shadow: false });
      f.solid(lx + bx, top + 0.015, bz, 0.36, 0.03, 0.36);
      const flame = new THREE.Group();
      for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2, m = new THREE.Mesh(flameGeo, k % 2 ? flameMatA : flameMatB); m.position.set(Math.cos(a) * 0.085, 0.03, Math.sin(a) * 0.085); m.rotation.z = -Math.cos(a) * 0.5; m.rotation.x = Math.sin(a) * 0.5; flame.add(m); }
      flame.visible = false; f.obj(flame, lx + bx, top + 0.012, bz);
      const kid = knob(f, lx + kx[i], 0.83, D / 2, C.black, 'burner', [['bakre vänstra plattan', 'back-left burner'], ['främre vänstra plattan', 'front-left burner'], ['främre högra plattan', 'front-right burner'], ['bakre högra plattan', 'back-right burner']][i]);
      K.burners.push({ id: K.burners.length, pos: f.pt(lx + bx, top + 0.03, bz), knob: kid, flame });
    });
    const ovenKnob = knob(f, lx, 0.83, D / 2, C.red, 'oven', ['ugnen', 'the oven']);
    const dw = w - 0.14;
    const door = fixture(f, {
      type: 'hinge', lp: [lx, 0.2, D / 2], axis: 'x', limits: [0, 1.5], mass: 3.5, damp: 3.5, latch: { at: 0.22, to: 0, k: 40 }, role: 'ovendoor', n: ['Ugnslucka', 'Oven door'], hint: ['dra ner i handtaget', 'pull down by the handle'],
      col: [{ s: 'box', hx: dw / 2, hy: 0.27, hz: 0.02, p: [0, 0.27, 0.02] }, { s: 'box', hx: dw / 2 - 0.08, hy: 0.018, hz: 0.03, p: [0, 0.47, 0.07] }],
      parts: [{ g: 'box', sz: [dw, 0.54, 0.04], p: [0, 0.27, 0.02], c: COL.steel }, { g: 'box', sz: [dw - 0.24, 0.26, 0.046], p: [0, 0.23, 0.02], c: 0x1b2026 },
        { g: 'cap', r: 0.018, len: dw - 0.22, p: [0, 0.47, 0.085], r3: [0, 0, Math.PI / 2], c: C.black },
        { g: 'box', sz: [0.03, 0.03, 0.07], p: [dw / 2 - 0.1, 0.47, 0.055], c: C.black }, { g: 'box', sz: [0.03, 0.03, 0.07], p: [-dw / 2 + 0.1, 0.47, 0.055], c: C.black }],
    });
    K.ovens.push({ id: K.ovens.length, zone: f.aabb(lx, 0.47, 0, w - 0.18, 0.52, D - 0.08), door, knob: ovenKnob, glow, pos: f.pt(lx, 0.47, 0) });
    return { w, top };
  }
  function fridge(f, lx, shelves, label, color) {
    const w = 1.2, FH = 2.1, sy = [0.34, 0.78, 1.22, 1.66];
    f.box(lx, 0.06, 0, w, 0.12, D, COL.fridge, { solid: true }); f.box(lx, FH - 0.05, 0, w, 0.1, D, COL.fridge, { solid: true });
    for (const s of [-1, 1]) f.box(lx + s * (w / 2 - 0.03), FH / 2, 0, 0.06, FH - 0.2, D, COL.fridge, { solid: true });
    f.box(lx, FH / 2, -D / 2 + 0.03, w, FH - 0.2, 0.06, 0xdfe9ee, { solid: true });
    f.box(lx, FH - 0.13, -D / 2 + 0.09, w - 0.2, 0.04, 0.04, 0xeaf6ff, { mat: 'glow', shadow: false });
    shelves.forEach((sh, i) => {
      const y = sy[i];
      f.box(lx, y, -0.03, w - 0.12, 0.03, D - 0.16, 0xffffff, { solid: true });
      f.box(lx, y + 0.035, D / 2 - 0.12, w - 0.12, 0.04, 0.02, 0xbfe6f2, { solid: true, mat: 'glass' });
      const per = (w - 0.2) / sh.length;
      if (sh.length > 1) f.box(lx, y + 0.08, -0.03, 0.02, 0.13, D - 0.2, 0xbfe6f2, { solid: true, mat: 'glass' });
      sh.forEach(([kind, n], j) => {
        const cx = lx - (w - 0.2) / 2 + per * (j + 0.5);
        K.stock.push({ kind, n, src: 'fridge', label, zone: f.aabb(cx, y + 0.2, -0.03, per, 0.4, D - 0.16), spawn: (r) => f.pt(cx + (r() - 0.5) * (per - 0.22), y + 0.1 + r() * 0.08, -0.06 + (r() - 0.5) * 0.4), every: 4 });
      });
    });
    const dh = FH - 0.16;
    const s = signMesh(label, 0.7, 0.2, '#fff', color); s.position.set(w / 2, dh * 0.8, 0.071);
    fixture(f, {
      type: 'hinge', lp: [lx - w / 2, 0.12, D / 2], axis: 'y', limits: [-2.1, 0], mass: 7, damp: 2.5, latch: { at: -0.2, to: 0, k: 30 }, role: 'fridgedoor', n: ['Kylskåpsdörr', 'Fridge door'], hint: ['ta handtaget och dra upp dörren', 'grab the handle and pull it open'],
      col: [{ s: 'box', hx: w / 2, hy: dh / 2, hz: 0.035, p: [w / 2, dh / 2, 0.035] }, { s: 'box', hx: 0.025, hy: 0.3, hz: 0.035, p: [w - 0.12, dh * 0.5, 0.105] }],
      parts: [{ g: 'box', sz: [w, dh, 0.07], p: [w / 2, dh / 2, 0.035], c: COL.fridge, round: 1 },
        { g: 'cap', r: 0.025, len: 0.56, p: [w - 0.12, dh * 0.5, 0.115], c: COL.fridge === 0x2a2d35 ? 0xd4af37 : C.steelDark },
        { g: 'box', sz: [0.04, 0.04, 0.06], p: [w - 0.12, dh * 0.5 + 0.22, 0.09], c: C.steelDark }, { g: 'box', sz: [0.04, 0.04, 0.06], p: [w - 0.12, dh * 0.5 - 0.22, 0.09], c: C.steelDark }],
      decor: s,
    });
    return w;
  }
  function crate(f, lx, kind, n, label) {
    const w = 1.1, iw = 0.86, idp = 0.62, y0 = 0.5, wh = 0.28, t = 0.04;
    f.box(lx, y0 / 2, 0, w - 0.1, y0, D - 0.1, COL.woodDark, { solid: true });
    f.box(lx, y0 + wh / 2, idp / 2 + t / 2, iw + t * 2, wh, t, COL.wood, { solid: true }); f.box(lx, y0 + wh / 2, -idp / 2 - t / 2, iw + t * 2, wh, t, COL.wood, { solid: true });
    for (const s of [-1, 1]) f.box(lx + s * (iw / 2 + t / 2), y0 + wh / 2, 0, t, wh, idp, COL.wood, { solid: true });
    const s = signMesh(label, 0.8, 0.22, '#fff', '#4e9a3a'); f.obj(s, lx, 1.55, -D / 2 + 0.02);
    K.stock.push({ kind, n, src: 'crate', label, zone: f.aabb(lx, y0 + 0.3, 0, iw, 0.6, idp), spawn: (r) => f.pt(lx + (r() - 0.5) * 0.6, y0 + 0.2 + r() * 0.25, (r() - 0.5) * 0.4), every: 3 });
    return w;
  }
  function shelfUnit(f, lx, rows, label, color = '#c77d2e') {
    const w = 1.3, sy = [0.5, 0.95, 1.4], sd = 0.62, z0 = -D / 2 + sd / 2;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) f.box(lx + sx * (w / 2 - 0.03), 0.95, z0 + sz * (sd / 2 - 0.03), 0.05, 1.9, 0.05, COL.steelDark);
    f.solid(lx - w / 2 + 0.03, 0.95, z0, 0.06, 1.9, sd); f.solid(lx + w / 2 - 0.03, 0.95, z0, 0.06, 1.9, sd);
    f.box(lx, 1.88, z0, w, 0.04, sd, COL.steel, { solid: true });
    sy.forEach((y, i) => {
      f.box(lx, y, z0, w - 0.06, 0.04, sd, COL.steel, { solid: true });
      f.box(lx, y + 0.045, z0 + sd / 2 - 0.015, w - 0.06, 0.05, 0.02, COL.steelDark, { solid: true });   // front lip
      f.box(lx, y + 0.1, z0 - sd / 2 + 0.01, w - 0.06, 0.2, 0.02, COL.steelDark, { solid: true });       // back stop
      const row = rows[i]; if (!row) return;
      const per = (w - 0.2) / row.length;
      row.forEach((it, j) => {
        const cx = lx - (w - 0.2) / 2 + per * (j + 0.5);
        if (row.length > 1 && j > 0 && it.stock) f.box(cx - per / 2, y + 0.09, z0, 0.02, 0.14, sd - 0.06, COL.steelDark, { solid: true });
        if (it.stock) K.stock.push({ kind: it.kind, n: it.n, src: 'shelf', label, zone: f.aabb(cx, y + 0.22, z0, per, 0.4, sd), spawn: (r) => f.pt(cx + (r() - 0.5) * Math.max(0.02, per - 0.3), y + 0.1 + r() * 0.1, z0 + (r() - 0.5) * 0.25), every: 4, yaw: it.yaw });
        else for (let k = 0; k < it.n; k++) tool(it.kind, f.pt(cx, y + 0.022 + k * (it.dy || 0.05), z0), f.yaw, it.home !== false);
      });
    });
    if (label) { const s = signMesh(label, 0.9, 0.22, '#fff', color); f.obj(s, lx, 2.08, -D / 2 + 0.02); }
    return w;
  }
  function sink(f, lx) {
    const w = 1.2, bw = 0.78, bd = 0.52, bz = 0.02, by = H - 0.3;
    f.box(lx, 0.05, -0.03, w, 0.1, D - 0.14, COL.kick);
    f.box(lx, by / 2 + 0.05, 0, w, by - 0.1, D, COL.cab); f.solid(lx, by / 2, 0, w, by, D);
    cabinetFace(f, lx, w, COL.cabDark);
    f.box(lx, by + 0.005, bz, bw, 0.01, bd, COL.steelDark, { shadow: false });
    const sw = (w - bw) / 2, fd = D / 2 + 0.04 - (bz + bd / 2), bk = (bz - bd / 2) + D / 2 + 0.04;
    for (const s of [-1, 1]) f.box(lx + s * (bw / 2 + sw / 2), by + 0.15, 0, sw, 0.3, D + 0.08, COL.topSteel, { solid: true });
    f.box(lx, by + 0.15, bz + bd / 2 + fd / 2, bw, 0.3, fd, COL.topSteel, { solid: true });
    f.box(lx, by + 0.15, bz - bd / 2 - bk / 2, bw, 0.3, bk, COL.topSteel, { solid: true });
    const pz = -0.33, fc = COL.kick === 0xd4af37 ? 0xd4af37 : COL.steel;
    f.cyl(lx, H + 0.22, pz, 0.028, 0.44, fc); f.box(lx, H + 0.44, pz + 0.15, 0.05, 0.05, 0.34, fc); f.box(lx, H + 0.39, pz + 0.3, 0.05, 0.1, 0.05, fc);
    f.solid(lx, H + 0.22, pz, 0.06, 0.44, 0.06);
    const spout = f.pt(lx, H + 0.34, pz + 0.3);
    const stream = f.obj(new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.02, 1, 8), new THREE.MeshBasicMaterial({ color: 0x8fd6ff, transparent: true, opacity: 0.8 })), lx, H, pz + 0.3);
    stream.visible = false;
    const lever = fixture(f, {
      type: 'hinge', lp: [lx + 0.16, H + 0.08, pz], axis: 'x', limits: [-1.0, 0], mass: 0.5, damp: 7, role: 'tap', n: ['Kranspak', 'Tap lever'], hint: ['lyft spaken = vatten', 'lift the lever = water'],
      col: [{ s: 'box', hx: 0.025, hy: 0.022, hz: 0.11, p: [0, 0, 0.11] }, { s: 'ball', rad: 0.04, p: [0, 0, 0.23] }],
      parts: [{ g: 'box', sz: [0.04, 0.035, 0.22], p: [0, 0, 0.11], c: C.steel }, { g: 'ball', r: 0.04, p: [0, 0, 0.23], c: 0x3d8bff }, { g: 'cyl', r: 0.035, h: 0.08, p: [0, -0.04, 0], c: C.steelDark }],
    });
    K.taps.push({ id: K.taps.length, spout, lever, stream, floorY: by + 0.01 });
    return w;
  }
  function fryer(f, lx) {
    const w = 0.9, vw = 0.62, vd = 0.52, by = H - 0.32;
    f.box(lx, 0.05, -0.03, w, 0.1, D - 0.14, COL.kick);
    f.box(lx, by / 2 + 0.05, 0, w, by - 0.1, D, COL.steel); f.solid(lx, by / 2, 0, w, by, D);
    const sw = (w - vw) / 2, sd = (D + 0.08 - vd) / 2, wy = by + 0.175;
    for (const s of [-1, 1]) f.box(lx + s * (vw / 2 + sw / 2), wy, 0, sw, 0.35, D + 0.08, COL.steel, { solid: true });
    f.box(lx, wy, vd / 2 + sd / 2, vw, 0.35, sd, COL.steel, { solid: true }); f.box(lx, wy, -vd / 2 - sd / 2, vw, 0.35, sd, COL.steel, { solid: true });
    f.box(lx, by + 0.005, 0, vw, 0.01, vd, COL.steelDark, { shadow: false });
    const oil = f.obj(new THREE.Mesh(new THREE.BoxGeometry(vw, 0.01, vd), new THREE.MeshToonMaterial({ color: COL.oil, gradientMap: toonGradient(), transparent: true, opacity: 0.82 })), lx, by + 0.22, 0);
    oil.renderOrder = 2;
    const s = signMesh(L('FRITÖS', 'FRYER'), 0.4, 0.1, '#fff', '#d9822b'); f.obj(s, lx, 0.5, D / 2 + 0.006);
    const kid = knob(f, lx, 0.72, D / 2 + 0.04, 0xd9822b, 'fryer', ['fritösen', 'the fryer']);   // flush with the fryer's front wall (it was buried 4 cm)
    K.fryers.push({ id: K.fryers.length, zone: f.aabb(lx, by + 0.11, 0, vw, 0.22, vd), knob: kid, oil, pos: f.pt(lx, by + 0.22, 0), oilY: by + 0.22 });
    tool('basket', f.pt(lx - 0.12, by + 0.02, 0), f.yaw, true);
    return w;
  }
  function broken(f, lx, w, label) {            // an appliance that has given up (buy the repair in the shop)
    f.box(lx, 0.05, -0.03, w, 0.1, D - 0.14, COL.kick);
    f.box(lx, H / 2 + 0.03, 0, w - 0.02, H - 0.06, D, 0x6e7476); f.solid(lx, H / 2, 0, w, H, D + 0.04);
    f.box(lx, H - 0.01, 0, w, 0.04, D + 0.06, 0x4f5557);
    for (let i = -2; i <= 2; i++) f.box(lx + i * (w / 6), H + 0.012, 0, w / 12, 0.006, D + 0.04, i % 2 ? 0x1d1d1d : 0xf2c31b, { shadow: false });
    const s = signMesh(label, w - 0.16, 0.2, '#1d1d1d', '#f2c31b'); f.obj(s, lx, 0.55, D / 2 + 0.006); s.rotation.z = -0.07;
  }
  function blender(f, lx, lz = -0.12) {
    f.box(lx, H + 0.07, lz, 0.26, 0.14, 0.26, COL.black, { solid: true }); f.cyl(lx, H + 0.145, lz, 0.1, 0.012, C.steelDark, { shadow: false });
    const lever = fixture(f, {
      type: 'hinge', lp: [lx, H + 0.06, lz + 0.14], axis: 'x', limits: [-0.75, 0.75], mass: 0.4, damp: 2, bistable: { a: -0.7, b: 0.7, k: 60 }, start: -0.7, role: 'blender', n: ['Mixerspak', 'Blender switch'], hint: ['fäll spaken = på/av', 'flip it = on/off'],
      col: [{ s: 'box', hx: 0.02, hy: 0.06, hz: 0.02, p: [0, 0.06, 0] }, { s: 'ball', rad: 0.035, p: [0, 0.14, 0] }],
      parts: [{ g: 'box', sz: [0.03, 0.12, 0.03], p: [0, 0.06, 0], c: C.steel }, { g: 'ball', r: 0.035, p: [0, 0.14, 0], c: C.red }],
    });
    K.blenders.push({ id: K.blenders.length, pos: f.pt(lx, H + 0.15, lz), lever });
    tool('jar', f.pt(lx, H + 0.152, lz), f.yaw, true);
  }
  function trashBin(x, z) {
    const f = new Frame(K, x, z, 0), s = 0.5, h = 0.72, t = 0.04, c = COL.grime ? 0x5d7058 : 0x55a860;
    for (const d of [-1, 1]) { f.box(d * (s / 2 - t / 2), h / 2, 0, t, h, s, c, { solid: true }); f.box(0, h / 2, d * (s / 2 - t / 2), s - t * 2, h, t, c, { solid: true }); }
    f.box(0, 0.03, 0, s, 0.06, s, 0x2d5a34, { solid: true });
    const sg = signMesh('♻', 0.26, 0.26, '#fff', null); sg.position.set(x, 0.42, z + s / 2 + 0.003); scene.add(sg);
    K.trash.push({ min: [x - s / 2 + t, 0.05, z - s / 2 + t], max: [x + s / 2 - t, h - 0.12, z + s / 2 - t] });
  }

  // lays out a run of modules along a frame's local +x. spec = array of [type, ...args]
  function run(f, spec) {
    let x = 0;
    for (const m of spec) {
      const [type, a, b, c] = m; let w = 1.0;
      const tools = (list) => (list || []).forEach(([kind, ox, oz, yaw]) => { if (kind === 'crock') crock(f, x + w / 2 + ox, oz, yaw); else tool(kind, f.pt(x + w / 2 + ox, H + 0.01, oz), f.yaw + (yaw || 0)); });
      if (type === 'gap') w = a;
      else if (type === 'counter') { w = a || 1.0; counter(f, x + w / 2, w, b || {}); tools(c); }
      else if (type === 'board') { counter(f, x + w / 2, w, a || {}); tool('board', f.pt(x + 0.5, H + 0.005, 0.05), f.yaw); tool(b || 'knife', f.pt(x + 0.5, H + 0.06, 0.1), f.yaw); }
      else if (type === 'drawers') drawers(f, x + w / 2, w, a);
      else if (type === 'range') { w = 1.2; const r = range(f, x + w / 2); (a || []).forEach(([kind, bi]) => { const bp = [[-0.29, -0.2], [-0.29, 0.2], [0.29, 0.2], [0.29, -0.2]][bi]; tool(kind, f.pt(x + w / 2 + bp[0], r.top + 0.035, bp[1]), f.yaw + (bi < 2 ? Math.PI : 0) + 0.5); }); }
      else if (type === 'fridge') w = fridge(f, x + 0.6, a, b, c);
      else if (type === 'crate') w = crate(f, x + 0.55, a, b, c);
      else if (type === 'shelf') w = shelfUnit(f, x + 0.65, a, b, c);
      else if (type === 'sink') w = sink(f, x + 0.6);
      else if (type === 'fryer') w = fryer(f, x + 0.45);
      else if (type === 'broken') { w = a; broken(f, x + w / 2, w, b); }
      else if (type === 'blender') { counter(f, x + w / 2, w, a || {}); blender(f, x + w / 2); }
      if ((type === 'range' || type === 'fryer' || type === 'broken') && f.hood) { f.box(x + w / 2, 2.5, -0.02, w, 0.44, 0.95, COL.steel, { shadow: false }); f.box(x + w / 2, 2.25, -0.02, w + 0.02, 0.07, 1.05, COL.steelDark, { shadow: false }); }
      x += w;
    }
  }

  // ================================================================ layout from the restaurant descriptor
  for (const r of lay.runs) { const f = new Frame(K, r.x, r.z, r.yaw); f.hood = Math.abs(Math.abs(r.x) - (hx - D / 2 - 0.02)) < 0.01 && Math.abs(r.yaw) === Math.PI / 2 && r.x > 0; run(f, r.spec); }
  for (const [tx, tz] of lay.bins) trashBin(tx, tz);
  if (lay.junk && !up.clean) lay.junk.forEach(([jx, jz], i) => {     // cardboard junk piles
    const r = rng(i + 3), s1 = 0.5 + r() * 0.2, s2 = 0.35 + r() * 0.15;
    W.box(jx, s1 / 2, jz, s1 + 0.1, s1, s1, 0xa98255, { solid: true }); W.box(jx + 0.05, s1 + s2 / 2, jz - 0.03, s2 + 0.1, s2, s2, 0x96703f, { solid: true });
    W.box(jx, s1 * 0.7, jz - s1 / 2 - 0.002, s1 * 0.5, 0.06, 0.004, 0xd9cfb0, { shadow: false });
  });

  // --- the pass (serving counter between kitchen and dining room)
  {
    const f = new Frame(K, 0, zN, 0), pw = passX * 2, pd = truck ? 0.7 : 1.25;
    f.box(0, 0.05, 0, pw, 0.1, pd - 0.2, COL.kick); f.box(0, 0.1 + (H - 0.16) / 2, 0, pw, H - 0.16, pd - 0.06, COL.pass);
    f.box(0, H - 0.03, 0, pw, 0.06, pd + 0.06, COL.topSteel);
    if (truck) {                    // leave a recess in the counter so the cash drawer can be pulled out
      const g0 = -1.32, g1 = -0.58;
      f.solid((-passX + g0) / 2, H / 2, 0, g0 + passX, H, pd + 0.04); f.solid((g1 + passX) / 2, H / 2, 0, passX - g1, H, pd + 0.04);
      f.solid((g0 + g1) / 2, H - 0.05, 0, g1 - g0, 0.1, pd + 0.04); f.solid((g0 + g1) / 2, H / 2, -pd / 2 + 0.07, g1 - g0, H, 0.14);
    } else f.solid(0, H / 2, 0, pw, H, pd + 0.04);
    const np = Math.floor(passX);
    for (let i = -np; i <= np; i++) { const px = i * (passX / (np + 0.5)); if (truck && Math.abs(px + 0.95) < 0.5) continue; f.box(px, 0.5, pd / 2 - 0.02, passX / (np + 0.5) - 0.1, 0.62, 0.02, COL.passTrim, { shadow: false }); }
    if (!truck) {
      f.box(0, 2.42, 0.1, pw, 0.06, 0.12, COL.steelDark, { shadow: false });     // heat-lamp bar + ticket rail
      for (let x = -passX + 1; x <= passX - 0.9; x += 2.2) { f.cyl(x, 2.3, 0.1, 0.13, 0.16, 0xd9822b, { shadow: false }); f.cyl(x, 2.215, 0.1, 0.1, 0.02, 0xfff0b8, { mat: 'glow', shadow: false }); }
      f.box(0, 2.12, 0.32, pw - 0.6, 0.04, 0.04, COL.steel, { shadow: false });
    } else f.box(0, 1.9, 0.5, pw - 0.3, 0.035, 0.035, COL.steel, { shadow: false });
    K.pass = { zone: { min: [-passX, H - 0.05, zN - pd / 2 - 0.05], max: [passX, H + 0.7, zN + pd / 2 + 0.05] }, railY: truck ? 1.8 : 2.0, railZ: zN + (truck ? 0.5 : 0.33), railX: -passX + (truck ? 0.5 : 1.2), waiterZ: zN - pd / 2 - 0.45, topY: H };
    for (const sx of (truck ? [-passX + 0.45, -passX + 1.1] : [-passX + 0.9, -passX + 1.6, passX - 1.6, passX - 0.9])) for (let k = 0; k < 4; k++) tool('plate', [sx, H + 0.002 + k * 0.0375, zN + (truck ? 0.12 : 0.2)], 0);
    // service lever on the wall right of the pass
    const lf = new Frame(K, passX + 1.0, zN + 0.16, 0);
    lf.box(0, 1.25, 0.03, 0.34, 0.5, 0.06, 0x2b2f38, { solid: true });
    lf.obj(signMesh(L('STARTA SERVERING', 'START SERVICE'), 1.1, 0.24, '#fff', '#e5483d'), 0, 1.75, 0.012);
    lf.obj(signMesh(L('⬇ dra i spaken ⬇', '⬇ pull the lever ⬇'), 0.9, 0.16, '#2b2f38', '#ffd84d'), 0, 1.55, 0.072);
    K.lever = fixture(lf, {
      type: 'hinge', lp: [0, 1.3, 0.07], axis: 'x', limits: [0, 1.35], mass: 1.2, damp: 3, spring: { to: 0, k: 14 }, role: 'service', n: ['Serveringsspak', 'Service lever'], hint: ['dra ner = starta serveringen', 'pull down = start the service'],
      col: [{ s: 'box', hx: 0.022, hy: 0.16, hz: 0.022, p: [0, 0.16, 0.02] }, { s: 'ball', rad: 0.06, p: [0, 0.34, 0.02] }],
      parts: [{ g: 'box', sz: [0.04, 0.32, 0.04], p: [0, 0.16, 0.02], c: C.steel }, { g: 'ball', r: 0.06, p: [0, 0.34, 0.02], c: C.red }, { g: 'cyl', r: 0.05, h: 0.1, p: [0, 0, 0.0], r3: [0, 0, Math.PI / 2], c: C.steelDark }],
    });
    K.leverPos = lf.pt(0, 1.4, 0.2);
    if (truck) {
      // ---- cash drawer in the counter (pull it out to reach the change)
      const dw = 0.5, dd = 0.34, dh = 0.11;
      fixture(f, {
        type: 'slide', lp: [-0.95, H - 0.2, 0.15], axis: 'z', limits: [0, 0.3], mass: 2.5, damp: 9, role: 'till', n: ['Kassalåda', 'Cash drawer'], hint: ['dra ut = växel', 'pull it out = change'],
        col: [{ s: 'box', hx: dw / 2, hy: 0.008, hz: dd / 2, p: [0, -dh / 2, 0] }, { s: 'box', hx: 0.01, hy: dh / 2, hz: dd / 2, p: [dw / 2, 0, 0] }, { s: 'box', hx: 0.01, hy: dh / 2, hz: dd / 2, p: [-dw / 2, 0, 0] },
          { s: 'box', hx: dw / 2, hy: dh / 2, hz: 0.01, p: [0, 0, -dd / 2] }, { s: 'box', hx: dw / 2 + 0.02, hy: 0.1, hz: 0.012, p: [0, 0.02, dd / 2 + 0.012] }, { s: 'box', hx: 0.1, hy: 0.016, hz: 0.022, p: [0, 0.04, dd / 2 + 0.045] },
          { s: 'box', hx: 0.012, hy: dh / 2, hz: dd / 2, p: [0.1, 0, 0] }, { s: 'box', hx: 0.012, hy: dh / 2, hz: dd / 2, p: [-0.1, 0, 0] }],
        parts: [{ g: 'box', sz: [dw, 0.016, dd], p: [0, -dh / 2, 0], c: 0x8a5a2b }, { g: 'box', sz: [0.02, dh, dd], p: [dw / 2, 0, 0], c: C.wood }, { g: 'box', sz: [0.02, dh, dd], p: [-dw / 2, 0, 0], c: C.wood },
          { g: 'box', sz: [dw, dh, 0.02], p: [0, 0, -dd / 2], c: C.wood }, { g: 'box', sz: [dw + 0.04, 0.2, 0.024], p: [0, 0.02, dd / 2 + 0.012], c: COL.passTrim }, { g: 'box', sz: [0.2, 0.032, 0.044], p: [0, 0.04, dd / 2 + 0.045], c: C.steel },
          { g: 'box', sz: [0.024, dh, dd], p: [0.1, 0, 0], c: C.wood }, { g: 'box', sz: [0.024, dh, dd], p: [-0.1, 0, 0], c: C.wood }],
      });
      const money = [['note100', 3, -0.19], ['note50', 5, -0.02], ['coin10', 8, 0.16]];
      for (const [kind, n, ox] of money) for (let i = 0; i < n; i++) tool(kind, f.pt(-0.95 + ox, H - 0.23 + i * 0.006, 0.15 + (i % 3) * 0.02 - 0.02), f.yaw, true);
      // ---- card terminal: five big keys and a little display
      const tx = 1.05;
      f.box(tx, H + 0.035, 0.02, 0.26, 0.07, 0.3, 0x2b2f38, { solid: true });
      f.box(tx, H + 0.13, -0.11, 0.26, 0.19, 0.05, 0x2b2f38, { solid: true });
      const tcv = document.createElement('canvas'); tcv.width = 256; tcv.height = 128;
      const ttex = new THREE.CanvasTexture(tcv); ttex.colorSpace = THREE.SRGBColorSpace;
      const tm = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.11), new THREE.MeshBasicMaterial({ map: ttex }));
      f.obj(tm, tx, H + 0.14, -0.078); tm.rotation.x = -0.32;
      K.term = { cv: tcv, tex: ttex, lang,
        draw(a, b, warn) {
          const g = this.cv.getContext('2d');
          g.fillStyle = warn ? '#3a1414' : '#0d241a'; g.fillRect(0, 0, 256, 128);
          g.strokeStyle = '#2f6b52'; g.lineWidth = 6; g.strokeRect(3, 3, 250, 122);
          g.textAlign = 'center'; g.fillStyle = warn ? '#ff9a8a' : '#8cf7c0';
          g.font = 'bold 34px Fredoka, sans-serif'; g.fillText(a || '', 128, 50);
          g.font = 'bold 52px Fredoka, sans-serif'; g.fillText(b || '', 128, 104);
          this.tex.needsUpdate = true;
        } };
      K.term.draw(lang === 'en' ? 'READY' : 'KLAR', '—');
      const keys = [[100, '+100', -0.075, 0.075, 0x3fbf5f], [50, '+50', 0, 0.075, 0x3fbf5f], [10, '+10', 0.075, 0.075, 0x3fbf5f], ['C', 'C', -0.05, -0.01, 0xe5483d], ['OK', '✓', 0.05, -0.01, 0x2e86c1]];
      for (const [key, label, kx, kz, col] of keys) {
        const lab = signMesh(label, 0.05, 0.03, '#fff', null, 'bold 90px Fredoka, sans-serif');
        f.obj(lab, tx + kx, H + 0.086, 0.02 + kz); lab.rotation.x = -Math.PI / 2;
        fixture(f, {
          type: 'button', key, lp: [tx + kx, H + 0.082, 0.02 + kz], axis: 'y', limits: [-0.012, 0], mass: 0.2, damp: 4, spring: { to: 0, k: 60 }, role: 'key',
          n: [`Knapp ${label}`, `Key ${label}`], hint: ['tryck (vänster musknapp)', 'press it (left mouse button)'],
          col: [{ s: 'box', hx: 0.028, hy: 0.012, hz: 0.026, p: [0, 0, 0] }],
          parts: [{ g: 'box', sz: [0.056, 0.024, 0.052], p: [0, 0, 0], c: col, round: 1 }],
        });
      }
    }
  }
  // --- deliveries: a marked floor spot by the west wall + a wall phone for ordering ingredients
  if (lay.delivery) {
    const [dx, dz] = lay.delivery;
    const mk = canvasPlane(1.2, 1.2, 256, (g, W2) => {
      for (let i = -8; i < 16; i++) { g.fillStyle = i % 2 ? '#1d1d1d' : '#f2c31b'; g.beginPath(); g.moveTo(i * 24, 0); g.lineTo(i * 24 + 24, 0); g.lineTo(i * 24 + 24 - W2, W2); g.lineTo(i * 24 - W2, W2); g.fill(); }
      g.fillStyle = COL.grime ? '#8d8469' : '#d9d3c3'; g.fillRect(22, 22, W2 - 44, W2 - 44);
      g.fillStyle = '#1d1d1d'; g.font = 'bold 40px Fredoka, sans-serif'; g.textAlign = 'center'; g.fillText(L('LEVERANS', 'DELIVERY'), W2 / 2, W2 / 2 + 14);
    });
    mk.rotation.x = -Math.PI / 2; mk.position.set(dx, 0.009, dz); scene.add(mk);
    const [px, pz] = lay.phone || [-hx, dz + 0.95];
    const pf = new Frame(K, px, pz, Math.PI / 2);          // on the west wall, facing into the kitchen
    pf.box(0, 1.35, 0.045, 0.26, 0.4, 0.09, 0xd9534f, { solid: true }); pf.box(0, 1.47, 0.092, 0.16, 0.1, 0.006, 0xf4ecd2, { shadow: false });
    for (let i = 0; i < 9; i++) pf.box(-0.04 + (i % 3) * 0.04, 1.27 - Math.floor(i / 3) * 0.035, 0.093, 0.026, 0.022, 0.006, 0x2b2f38, { shadow: false });
    pf.obj(signMesh(L('📞 BESTÄLL RÅVAROR', '📞 ORDER INGREDIENTS'), 0.95, 0.2, '#fff', '#2e86c1'), 0, 1.78, 0.03);
    pf.obj(signMesh(L('lyft luren', 'lift the handset'), 0.42, 0.1, '#2b2f38', '#ffd84d'), 0, 1.08, 0.095);
    K.phone = fixture(pf, {
      type: 'hinge', lp: [0.17, 1.22, 0.07], axis: 'x', limits: [0, 1.25], mass: 0.6, damp: 3, spring: { to: 0, k: 12 }, role: 'phone', n: ['Telefonlur', 'Phone handset'], hint: ['lyft luren = beställ råvaror', 'lift the handset = order ingredients'],
      col: [{ s: 'box', hx: 0.03, hy: 0.13, hz: 0.03, p: [0, 0.13, 0.02] }],
      parts: [{ g: 'cap', r: 0.024, len: 0.16, p: [0, 0.13, 0.03], c: 0x22252b }, { g: 'ball', r: 0.042, sc: [1, 0.7, 1], p: [0, 0.02, 0.045], c: 0x22252b }, { g: 'ball', r: 0.042, sc: [1, 0.7, 1], p: [0, 0.24, 0.045], c: 0x22252b }],
    });
    K.delivery = { x: dx, z: dz };
  }
  // restaurant sign above the pass (crooked in the dump)
  if (!truck) { const s = signMesh(rest.n[lang === 'en' ? 1 : 0].toUpperCase(), Math.min(3.6, passX * 0.9), 0.62, COL.signFg, COL.sign); s.position.set(0, Math.min(wallH - 0.45, 3.3), zN + 0.16); if (COL.grime || COL.cracks) s.rotation.z = -0.06; scene.add(s); }

  // ================================================================ run-down decor: cracks, bare brick, stains, cobwebs
  const wallSpots = (n, seed) => {      // deterministic spots on the four kitchen walls: [x, y, z, rotY]
    const r = rng(seed), out = [];
    for (let i = 0; i < n; i++) {
      const side = i % 4, y = 1.0 + r() * (wallH - 1.8);
      if (side === 0) out.push([(r() - 0.5) * hx * 1.7, y, hz - 0.03, Math.PI]);
      else if (side === 1) out.push([-hx + 0.03, y, (r() - 0.5) * hz * 1.7, Math.PI / 2]);
      else if (side === 2) out.push([hx - 0.03, y, (r() - 0.5) * hz * 1.7, -Math.PI / 2]);
      else out.push([(r() < 0.5 ? -1 : 1) * (passX + 0.4 + r() * (sideW - 0.8)), y, zN + 0.18, 0]);
    }
    return out;
  };
  if (COL.cracks) {
    wallSpots(11, 5).forEach(([x, y, z, ry], i) => {
      const r = rng(i * 13 + 1), w = 1.2 + r() * 1.3, h = 1.0 + r() * 1.2;
      const m = canvasPlane(w, h, 256, (g, W2, H2) => {
        g.strokeStyle = 'rgba(38,28,20,0.9)'; g.lineCap = 'round';
        const branch = (px, py, ang, len, lw) => { g.lineWidth = lw; g.beginPath(); g.moveTo(px, py); let a = ang; for (let k = 0; k < len; k++) { a += (r() - 0.5) * 1.1; px += Math.cos(a) * 14; py += Math.sin(a) * 14; g.lineTo(px, py); if (lw > 1.6 && r() < 0.3) { g.stroke(); branch(px, py, a + (r() - 0.5) * 2, len * 0.5, lw * 0.6); g.lineWidth = lw; g.beginPath(); g.moveTo(px, py); } } g.stroke(); };
        branch(W2 * (0.3 + r() * 0.4), 4, Math.PI / 2, 14, 4);
      });
      m.position.set(x, y, z); m.rotation.y = ry; scene.add(m);
    });
    wallSpots(5, 23).forEach(([x, y, z, ry], i) => {           // plaster fallen off: bare brick
      const r = rng(i * 7 + 2), w = 0.9 + r() * 0.8, h = 0.7 + r() * 0.6;
      const m = canvasPlane(w, h, 256, (g, W2, H2) => {
        g.save(); g.beginPath(); for (let k = 0; k <= 16; k++) { const a = k / 16 * 6.283, rr = 0.34 + r() * 0.14; g.lineTo(W2 / 2 + Math.cos(a) * W2 * rr, H2 / 2 + Math.sin(a) * H2 * rr); } g.closePath(); g.clip();
        g.fillStyle = '#5d4a3c'; g.fillRect(0, 0, W2, H2);
        for (let row = 0; row < 9; row++) for (let cx = -1; cx < 6; cx++) { g.fillStyle = ['#a5512f', '#b35c36', '#964628'][(row + cx + 9) % 3]; g.fillRect(cx * 52 + (row % 2 ? 26 : 0) + 2, row * 26 + 2, 48, 22); }
        g.restore();
      });
      m.position.set(x, Math.min(y, 2.6), z + (ry === 0 ? 0.004 : ry === Math.PI ? -0.004 : 0)); m.rotation.y = ry; if (ry === Math.PI / 2) m.position.x += 0.004; if (ry === -Math.PI / 2) m.position.x -= 0.004; scene.add(m);
    });
  }
  if (COL.grime) {
    const r = rng(11);
    for (let i = 0; i < 16; i++) {                               // floor stains
      const s = 0.5 + r() * 1.1, m = canvasPlane(s, s, 64, (g) => { const gr = g.createRadialGradient(32, 32, 2, 32, 32, 30); gr.addColorStop(0, 'rgba(45,32,15,0.55)'); gr.addColorStop(0.7, 'rgba(45,32,15,0.3)'); gr.addColorStop(1, 'rgba(45,32,15,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(32, 32, 30, 20 + r() * 10, r() * 3, 0, 6.3); g.fill(); });
      m.rotation.x = -Math.PI / 2; m.position.set((r() - 0.5) * hx * 1.8, 0.006 + i * 0.0004, (r() - 0.5) * hz * 1.8); scene.add(m);
    }
    for (const [cx, cz, ry] of [[-hx + 0.02, hz - 0.02, Math.PI * 0.75], [hx - 0.02, hz - 0.02, -Math.PI * 0.75], [-hx + 0.02, zN + 0.2, Math.PI / 4], [hx - 0.02, zN + 0.2, -Math.PI / 4]]) {   // cobwebs
      const m = canvasPlane(1.3, 1.3, 128, (g) => { g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 1.2; for (let k = 0; k <= 5; k++) { const a = k / 5 * Math.PI / 2; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * 128, Math.sin(a) * 128); g.stroke(); } for (let rr = 24; rr < 128; rr += 22) { g.beginPath(); for (let k = 0; k <= 5; k++) { const a = k / 5 * Math.PI / 2, q = rr * (k % 2 ? 0.92 : 1); g.lineTo(Math.cos(a) * q, Math.sin(a) * q); } g.stroke(); } });
      m.position.set(cx, wallH - 0.62, cz); m.rotation.y = ry; m.material.side = THREE.DoubleSide; scene.add(m);
    }
  }
  if (up.plants) for (const s of [-1, 1]) {                       // bistro decoration upgrade
    for (const pz of [zN - 0.9, zD + 0.8]) { W.cyl(s * (hx - 0.7), 0.25, pz, 0.22, 0.5, 0xb5553a); const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 1), mat(0x3f9a45, 'flat')); b.position.set(s * (hx - 0.7), 0.95, pz); b.castShadow = true; scene.add(b); }
    for (let i = 0; i < 3; i++) { W.box(s * (hx - 0.02), 2.0, zN - 2 - i * 2, 0.04, 0.8, 1.0, [0xd9822b, 0x2e86c1, 0xc0392b][i], { shadow: false }); W.box(s * (hx - 0.045), 2.0, zN - 2 - i * 2, 0.02, 0.62, 0.82, 0xfff6e6, { shadow: false }); }
  }
  if (lay.fancy) { W.box(0, 0.012, zN - 1.75, hx * 2 - 1, 0.02, 1.6, 0xd4af37, { shadow: false }); W.box(0, 0.016, zN - 1.75, hx * 2 - 1.2, 0.02, 1.4, 0xa81d34, { shadow: false }); }

  // ================================================================ dining room tables
  const tableAt = (x, z, order) => {
    W.cyl(x, 0.74, z, 0.62, 0.06, COL.table); W.cyl(x, 0.37, z, 0.07, 0.7, COL.black); W.cyl(x, 0.02, z, 0.3, 0.04, COL.black);
    K.solidCyl(x, 0.385, z, 0.6, 0.77);
    const seats = [];
    for (const [sx, sz, yaw] of [[-0.95, 0, -Math.PI / 2], [0.95, 0, Math.PI / 2], [0, -0.95, Math.PI]]) {
      W.box(x + sx, 0.44, z + sz, 0.42, 0.06, 0.42, COL.chair); W.box(x + sx * 1.2, 0.75, z + sz * 1.2, sx ? 0.06 : 0.42, 0.6, sz ? 0.06 : 0.42, COL.chair);
      for (const a of [-1, 1]) for (const b of [-1, 1]) W.box(x + sx + a * 0.17, 0.21, z + sz + b * 0.17, 0.05, 0.42, 0.05, COL.black, { shadow: false });
      seats.push({ p: [x + sx, 0, z + sz], yaw });
    }
    K.tables.push({ p: [x, 0.77, z], seats, order, stand: [x, 0, z + 1.15] });
  };
  const tz = lay.tableZ || [zN - 3.9, zN - 6.3];
  for (const x of lay.tablesFront) tableAt(x, tz[0], true);
  if (lay.tablesBack && lay.tablesBack.length) for (const x of lay.tablesBack) tableAt(x, tz[1], false);
  K.waiterIdle = truck ? [[0.15, zN - 0.8], [-0.12, zN - 1.55], [0.18, zN - 2.3]]        // a queue in front of the hatch
    : [[-passX + 1.0, zN - 1.15], [passX - 1.0, zN - 1.15], [0, zN - 1.15]];             // waiting at the pass, in view of the kitchen
  const gap = truck ? (hx * 2 - 1.4) / 8 : Math.min(1.2, (passX * 2 - 1) / 8);
  for (let i = 0; i < 9; i++) K.spawns.push([(i - 4) * gap, 0, truck ? -0.12 : zN + 2.4]);
  K.batch.build(scene);
  return K;
}

// ================================================================ wall posters: chalkboard menu + sticky-note tips
function wrapLines(g, text, maxW) {
  const words = String(text).split(/\s+/), lines = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (g.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur); return lines;
}
export function addPosters(K, scene, menu, lang, tips = []) {
  const { hx, hz, passX } = ROOM, zN = -hz, sideW = hx - passX, li = lang === 'en' ? 1 : 0;
  const plane = (w, h, px, draw) => { const cv = document.createElement('canvas'); cv.width = px; cv.height = Math.round(px * h / w); draw(cv.getContext('2d'), cv.width, cv.height); const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex })); scene.add(m); return m; };
  // chalkboard on the wall left of the pass
  if ((sideW > 1.6 || K.truck) && menu.length) {
    const w = K.truck ? Math.min(2.0, sideW - 0.15) : Math.min(2.8, sideW - 0.5), h = w * 0.66;
    const m = plane(w, h, 1024, (g, W, H) => {
      g.fillStyle = '#6b4a2b'; g.fillRect(0, 0, W, H); g.fillStyle = '#243d2f'; g.fillRect(22, 22, W - 44, H - 44);
      g.fillStyle = '#f4f1e6'; g.font = 'bold 74px Caveat, cursive'; g.textAlign = 'center'; g.fillText(li ? "TODAY'S MENU" : 'DAGENS MENY', W / 2, 96);
      g.strokeStyle = '#f4f1e6'; g.lineWidth = 3; g.beginPath(); g.moveTo(90, 112); g.lineTo(W - 90, 112); g.stroke();
      const cols = menu.length > 7 ? 2 : 1, rows = Math.ceil(menu.length / cols), size = Math.max(28, Math.min(72, Math.floor((H - 150) / rows / 1.25)));
      g.font = `${size}px Caveat, cursive`; g.textAlign = 'left';
      menu.forEach((r, i) => { const c = i % cols, row = Math.floor(i / cols), x = 60 + c * (W - 100) / cols, y = 150 + row * (H - 160) / rows + size * 0.8; g.fillStyle = '#fff0b0'; g.fillText(r.icon, x, y); g.fillStyle = '#f4f1e6'; g.fillText(r.n[li], x + size * 1.4, y); });
    });
    if (K.truck) { m.position.set(-(passX + sideW / 2), 1.42, zN - 0.155); m.rotation.y = Math.PI; }   // facing the queue outside
    else m.position.set(-(passX + sideW / 2), Math.min(2.05, ROOM.wallH - h / 2 - 0.3), zN + 0.185);
  }
  // sticky notes: right of the pass (above the lever sign) and along the south wall over the sinks
  const spots = [];
  if (K.truck) { for (let i = 0; i < 8; i++) { const s = i < 4 ? 1 : -1, j = i % 4; spots.push([s * (passX + 0.38 + (j % 2) * 0.55), 1.78 - Math.floor(j / 2) * 0.46, zN + 0.03, 0]); } }
  else {
    for (let i = 0; i < 6; i++) spots.push([passX + 1.85 + (i % 3) * 0.5, 2.0 - Math.floor(i / 3) * 0.5, zN + 0.19, 0]);   // right of the service-lever sign
    for (let i = 0; i < 8; i++) spots.push([hx - 1.2 - i * 1.0, 1.72 + (i % 2) * 0.46, hz - 0.045, Math.PI]);
  }
  const colors = ['#fff59b', '#ffc4d6', '#bfe4ff', '#c9f0a0'];
  tips.slice(0, spots.length).forEach((tip, i) => {
    const [x, y, z, ry] = spots[i]; if (Math.abs(x) > hx - 0.3) return;
    const m = plane(0.42, 0.42, 256, (g, W, H) => {
      g.fillStyle = colors[i % 4]; g.fillRect(0, 0, W, H); g.fillStyle = 'rgba(0,0,0,0.06)'; g.fillRect(0, H - 14, W, 14);
      g.fillStyle = '#2b2a33'; g.textAlign = 'center'; let size = 44; let lines;
      do { g.font = `bold ${size}px Caveat, cursive`; lines = wrapLines(g, tip[li], W - 30); size -= 4; } while (lines.length > 4 && size > 22);
      const lh = size * 1.05; lines.forEach((l, k) => g.fillText(l, W / 2, H / 2 + (k - (lines.length - 1) / 2) * lh + size * 0.35));
    });
    m.position.set(x, y, z); m.rotation.y = ry; m.rotation.z = (((i * 7) % 9) - 4) * 0.035;
  });
}
