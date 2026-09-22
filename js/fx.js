// Kökskaos — tiny GPU point-sprite particle system (steam, smoke, sizzle, splats, poofs, stars...)
import * as THREE from '../vendor/three.module.js';

const MAX = 1800;
export class Fx {
  constructor(scene) {
    this.n = 0; this.head = 0;
    this.pos = new Float32Array(MAX * 3); this.col = new Float32Array(MAX * 4); this.size = new Float32Array(MAX);
    this.vel = new Float32Array(MAX * 3); this.life = new Float32Array(MAX); this.max = new Float32Array(MAX);
    this.s0 = new Float32Array(MAX); this.s1 = new Float32Array(MAX); this.grav = new Float32Array(MAX); this.drag = new Float32Array(MAX); this.a0 = new Float32Array(MAX);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('pcolor', new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('psize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    this.mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, uniforms: { uScale: { value: 600 } },
      vertexShader: `attribute vec4 pcolor; attribute float psize; varying vec4 vC; uniform float uScale;
        void main(){ vC = pcolor; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = psize * uScale / max(0.1,-mv.z); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying vec4 vC; void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5 || vC.a <= 0.003) discard;
        float rim = smoothstep(0.5, 0.42, d); gl_FragColor = vec4(vC.rgb * (0.86 + 0.14 * smoothstep(0.5, 0.2, d)), vC.a * rim); }`,
    });
    this.points = new THREE.Points(g, this.mat); this.points.frustumCulled = false; this.points.renderOrder = 5;
    scene.add(this.points);
    this.c = new THREE.Color();
  }
  one(x, y, z, vx, vy, vz, life, s0, s1, color, alpha = 1, grav = 0, drag = 0) {
    const i = this.head; this.head = (this.head + 1) % MAX;
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
    this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;
    this.life[i] = life; this.max[i] = life; this.s0[i] = s0; this.s1[i] = s1; this.grav[i] = grav; this.drag[i] = drag; this.a0[i] = alpha;
    this.c.set(color); this.col[i * 4] = this.c.r; this.col[i * 4 + 1] = this.c.g; this.col[i * 4 + 2] = this.c.b; this.col[i * 4 + 3] = alpha;
  }
  emit(type, p, data) {
    const r = Math.random, [x, y, z] = p;
    switch (type) {
      case 'steam': { const rad = data || 0.1; for (let i = 0; i < 2; i++) this.one(x + (r() - 0.5) * rad * 1.4, y, z + (r() - 0.5) * rad * 1.4, (r() - 0.5) * 0.1, 0.35 + r() * 0.25, (r() - 0.5) * 0.1, 1.6 + r(), 0.06, 0.24, 0xffffff, 0.5, 0, 0.3); break; }
      case 'smoke': for (let i = 0; i < 2; i++) this.one(x + (r() - 0.5) * 0.05, y, z + (r() - 0.5) * 0.05, (r() - 0.5) * 0.12, 0.45 + r() * 0.3, (r() - 0.5) * 0.12, 2 + r(), 0.06, 0.32, 0x30302f, 0.7, 0, 0.3); break;
      case 'sizzle': for (let i = 0; i < 3; i++) this.one(x + (r() - 0.5) * 0.08, y, z + (r() - 0.5) * 0.08, (r() - 0.5) * 0.7, 0.6 + r() * 0.9, (r() - 0.5) * 0.7, 0.25 + r() * 0.2, 0.014, 0.006, 0xfff3b0, 1, -6, 0);
        this.one(x, y + 0.02, z, (r() - 0.5) * 0.08, 0.3, (r() - 0.5) * 0.08, 1.1, 0.04, 0.16, 0xffffff, 0.3, 0, 0.3); break;
      case 'bubbles': for (let i = 0; i < 4; i++) this.one(x + (r() - 0.5) * 0.12, y + 0.02, z + (r() - 0.5) * 0.12, (r() - 0.5) * 0.2, 0.25 + r() * 0.4, (r() - 0.5) * 0.2, 0.3 + r() * 0.25, 0.012, 0.03, 0xfff0a8, 0.9, -2, 0); break;
      case 'pour': for (let i = 0; i < 3; i++) this.one(x + (r() - 0.5) * 0.04, y, z + (r() - 0.5) * 0.04, (r() - 0.5) * 0.4, -0.2, (r() - 0.5) * 0.4, 0.6, 0.035, 0.02, 0x7fd0ff, 0.85, -9, 0); break;
      case 'tap': for (let i = 0; i < 2; i++) this.one(x + (r() - 0.5) * 0.03, y, z + (r() - 0.5) * 0.03, (r() - 0.5) * 0.9, 0.5 + r() * 0.6, (r() - 0.5) * 0.9, 0.3, 0.025, 0.012, 0xa6e2ff, 0.8, -8, 0); break;
      case 'splat': for (let i = 0; i < 14; i++) { const a = r() * 6.28, s = 0.6 + r() * 1.6; this.one(x, y + 0.02, z, Math.cos(a) * s, 0.6 + r() * 1.8, Math.sin(a) * s, 0.45 + r() * 0.3, 0.035, 0.015, data || 0xd62f1f, 1, -9, 0.5); } break;
      case 'chop': for (let i = 0; i < 10; i++) { const a = r() * 6.28, s = 0.4 + r() * 1.2; this.one(x, y + 0.02, z, Math.cos(a) * s, 1 + r() * 1.5, Math.sin(a) * s, 0.4 + r() * 0.2, 0.024, 0.01, data || 0xffffff, 1, -9, 0.5); } break;
      case 'poof': for (let i = 0; i < 12; i++) { const a = i / 12 * 6.28, s = 0.5 + r() * 0.5; this.one(x, y + 0.05, z, Math.cos(a) * s, 0.3 + r() * 0.5, Math.sin(a) * s, 0.5 + r() * 0.3, 0.09, 0.2, 0xf4f4f4, 0.75, 0, 2.5); } break;
      case 'bonk': for (let i = 0; i < 9; i++) { const a = i / 9 * 6.28, s = 1.2 + r() * 0.8; this.one(x, y, z, Math.cos(a) * s, 0.8 + r() * 1.2, Math.sin(a) * s, 0.6 + r() * 0.3, 0.07, 0.02, i % 2 ? 0xffe14d : 0xffffff, 1, -4, 1.5); } break;
      case 'coin': for (let i = 0; i < 12; i++) { const a = r() * 6.28; this.one(x + Math.cos(a) * 0.2, y, z + Math.sin(a) * 0.2, Math.cos(a) * 0.4, 1 + r() * 1.2, Math.sin(a) * 0.4, 0.8 + r() * 0.4, 0.05, 0.015, 0xffd84d, 1, -2.5, 0.5); } break;
      case 'angry': for (let i = 0; i < 6; i++) this.one(x + (r() - 0.5) * 0.3, y, z + (r() - 0.5) * 0.3, (r() - 0.5) * 0.3, 0.7 + r() * 0.5, (r() - 0.5) * 0.3, 0.9, 0.08, 0.16, 0xd84a3a, 0.8, 0, 0.8); break;
      case 'heart': for (let i = 0; i < 6; i++) this.one(x + (r() - 0.5) * 0.4, y, z + (r() - 0.5) * 0.4, (r() - 0.5) * 0.2, 0.6 + r() * 0.5, (r() - 0.5) * 0.2, 1.1, 0.07, 0.1, 0xff6fa5, 0.95, 0, 0.5); break;
    }
  }
  update(dt, renderer, camera) {
    const { pos, vel, life, max, col, size } = this;
    for (let i = 0; i < MAX; i++) {
      if (life[i] <= 0) continue;
      life[i] -= dt;
      if (life[i] <= 0) { col[i * 4 + 3] = 0; size[i] = 0; continue; }
      const k = 1 - this.drag[i] * dt, i3 = i * 3;
      vel[i3] *= k; vel[i3 + 2] *= k; vel[i3 + 1] = vel[i3 + 1] * k + this.grav[i] * dt;
      pos[i3] += vel[i3] * dt; pos[i3 + 1] += vel[i3 + 1] * dt; pos[i3 + 2] += vel[i3 + 2] * dt;
      if (pos[i3 + 1] < 0.01 && this.grav[i] < 0) { pos[i3 + 1] = 0.01; vel[i3 + 1] = 0; vel[i3] = 0; vel[i3 + 2] = 0; }
      const t = 1 - life[i] / max[i];
      size[i] = this.s0[i] + (this.s1[i] - this.s0[i]) * t;
      col[i * 4 + 3] = this.a0[i] * (t < 0.7 ? 1 : (1 - t) / 0.3);
    }
    const g = this.points.geometry;
    g.attributes.position.needsUpdate = true; g.attributes.pcolor.needsUpdate = true; g.attributes.psize.needsUpdate = true;
    this.mat.uniforms.uScale.value = renderer.domElement.height / (2 * Math.tan(camera.fov * Math.PI / 360));
  }
}
