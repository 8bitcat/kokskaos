// Kökskaos — audio.js
// Every sound is synthesized at runtime with the WebAudio API (oscillators, noise
// buffers, filters, envelopes). No assets, no imports, no AudioWorklet.
//
//   audio.init()                          create/resume the AudioContext (call from a user gesture)
//   audio.setListener(pos, yaw)           per frame
//   audio.play(name, pos?, vol?, pitch?)  one-shot (pos omitted/null = non-positional UI sound)
//   audio.setLoop(key, name, pos?, vol)   continuous sound; vol <= 0 fades it out and frees it
//   audio.stopAllLoops() · audio.setMuted(bool) · audio.muted
//
// Until init() has succeeded every call is a silent no-op, and nothing here ever throws.
// Set globalThis.KOKSKAOS_AUDIO_DEBUG = true to get swallowed errors logged to the console.

const MASTER_VOL = 0.5;
const MAX_VOICES = 24;   // simultaneous one-shots (quiet newcomers are dropped above this)
const MAX_LOOPS = 16;    // simultaneous audible loops
const MIN_GAP_MS = 40;   // rate limit per one-shot name
const MAX_DIST = 25;     // one-shots farther away than this are skipped

let ctx = null, master = null, white = null, crackle = null;
let dead = false, muted = false, voices = 0, liveLoops = 0;
let P = 1;               // pitch multiplier of the one-shot currently being built
let srcs = null;         // collects never-ending sources while a loop is being built
const last = {};         // one-shot name → performance.now() of its last play
const loops = new Map(); // key → { name, pos, vol, g, pan, live }
const L = { x: 0, y: 0, z: 0, rx: 1, rz: 0 };  // listener position + right vector
const S = { g: 1, pan: 0, d: 0 };              // scratch result of spatial()

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const oops = (e) => { if (globalThis.KOKSKAOS_AUDIO_DEBUG) console.warn('[audio]', e); };

// ───────────────────────────── node helpers ─────────────────────────────

function gain(dest, v) { const g = ctx.createGain(); g.gain.value = v; g.connect(dest); return g; }

// Biquad. Note: Q is linear for bandpass but in dB for lowpass/highpass (≈0.7 = flat).
function filt(dest, type, f, q = 0.7) {
  const b = ctx.createBiquadFilter();
  b.type = type; b.frequency.value = clamp(f * P, 20, 18000); b.Q.value = q;
  b.connect(dest);
  return b;
}

// Envelope gain: 0 → peak in `a` s, optional hold, exponential decay over `d` s, then true zero.
function env(dest, t, peak, a, d, hold = 0) {
  const g = gain(dest, 0), p = g.gain, end = t + a + hold + d;
  peak = Math.max(peak, 1e-4);
  p.setValueAtTime(0, t);
  p.linearRampToValueAtTime(peak, t + a);
  if (hold > 0) p.setValueAtTime(peak, t + a + hold);
  p.exponentialRampToValueAtTime(peak * 0.001, end);
  p.linearRampToValueAtTime(0, end + 0.01);
  return g;
}

// Oscillator with optional glide f0 → f1. dur = 0 means "runs until the loop is killed".
function osc(dest, type, t, dur, f0, f1, glide) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(Math.min(f0 * P, 20000), t);
  if (f1) o.frequency.exponentialRampToValueAtTime(Math.min(f1 * P, 20000), t + (glide || dur));
  o.connect(dest); o.start(t);
  if (dur) o.stop(t + dur + 0.03); else if (srcs) srcs.push(o);
  return o;
}

// Looping noise-buffer source, started at a random offset so instances never line up.
function noise(dest, t, dur, buf = white, rate = 1) {
  const s = ctx.createBufferSource();
  s.buffer = buf; s.loop = true; s.playbackRate.value = rate;
  s.connect(dest); s.start(t, Math.random() * buf.duration * 0.9);
  if (dur) s.stop(t + dur + 0.03); else if (srcs) srcs.push(s);
  return s;
}

// Filtered noise gets quieter the narrower the filter is; this factor compensates so that
// "level" means roughly the same loudness for every filter setting.
function nrm(type, f, q) {
  const bw = type === 'lowpass' ? f : type === 'highpass' ? 20000 - f : 1.57 * f / q;
  return clamp(Math.sqrt(20000 / Math.max(bw, 50)), 1, 10);
}

// tone = oscillator → envelope. Returns the oscillator (for vibrato).
function tone(o, t, type, f0, f1, peak, a, d, hold = 0, glide) {
  return osc(env(o, t, peak, a, d, hold), type, t, a + hold + d, f0, f1, glide);
}

// hiss = noise → filter (optional sweep f0 → f1) → envelope. Returns the filter.
function hiss(o, t, type, f0, f1, q, peak, a, d, hold = 0, glide) {
  const dur = a + hold + d;
  const fl = filt(env(o, t, peak * nrm(type, Math.max(f0, f1 || 0) * P, q), a, d, hold), type, f0, q);
  if (f1) {
    fl.frequency.setValueAtTime(clamp(f0 * P, 20, 18000), t);
    fl.frequency.exponentialRampToValueAtTime(clamp(f1 * P, 20, 18000), t + (glide || dur));
  }
  noise(fl, t, dur);
  return fl;
}

// bell/chime = a few decaying sine partials [freqMul, gainMul, decayMul].
const CHIME = [[1, 1, 1], [2, 0.3, 0.6], [3.01, 0.1, 0.35]];
const BELL = [[1, 1, 1], [2.76, 0.45, 0.7], [5.4, 0.22, 0.3]];
function bell(o, t, f, peak, d, parts = CHIME) {
  for (const [m, a, k] of parts) tone(o, t, 'sine', f * m, 0, peak * a, 0.003, d * k);
}

// bubble = short sine that glides upwards.
function bubble(o, t, peak, f = rnd(180, 520), k = 1.8, d = 0.06) {
  tone(o, t, 'sine', f, f * k, peak, 0.008, d);
}

// vox = saw through parallel formant bandpasses [freq, Q, gain]. Returns the oscillator.
function vox(o, t, dur, f0, f1, peak, forms) {
  const e = env(o, t, peak, 0.012, 0.05, Math.max(dur - 0.062, 0)), pre = ctx.createGain();
  for (const [f, q, a] of forms) pre.connect(filt(gain(e, a), 'bandpass', f, q));
  return osc(pre, 'sawtooth', t, dur, f0, f1);
}

// fizz = white noise amplitude-modulated by the sparse-impulse buffer → random crackle bursts.
// rate > 1 = denser/shorter crackles, rate < 1 = sparser/longer ones.
function fizz(dest, t, rate, depth, dur = 0) {
  const am = gain(dest, 0);
  noise(am, t, dur);
  noise(gain(am.gain, depth), t, dur, crackle, rate);
  return am;
}

// lfo / drift = slow modulation so loops never sound static. drift depth is relative to the
// param's base value (works for params set via .value, i.e. gain() and filt()).
function lfo(param, f, depth, t = ctx.currentTime, dur = 0) {
  return osc(gain(param, depth), 'sine', t, dur, f);
}
function drift(param, rel, fast = 1) {
  const v = param.value;
  lfo(param, rnd(0.13, 0.4) * fast, v * rel);
  lfo(param, rnd(0.6, 1.7) * fast, v * rel * 0.6);
}

// layer = endless filtered noise bed for loops. Returns [filter, gainNode].
function layer(dest, t, type, f, q, level) {
  const g = gain(dest, level * nrm(type, f, q)), fl = filt(g, type, f, q);
  noise(fl, t, 0);
  return [fl, g];
}

// ───────────────────────────── one-shots ─────────────────────────────
// name: [duration in seconds (for voice cleanup), (out, t) => build nodes]

const HUM = [[300, 2.5, 1], [1100, 5, 0.3], [2600, 6, 0.1]];               // closed-mouth "mm"
const VOWELS = [[800, 1200], [500, 1900], [320, 2300], [450, 850], [350, 1000]]; // a e i o u (F1, F2)
const TWINKLE = [1568, 1760, 2093, 2349, 2637, 3136];

const SOUNDS = {
  // service bell: bright inharmonic partials + tiny strike click
  ding: [1.35, (o, t) => { bell(o, t, 1760, 0.32, 1.25, BELL); hiss(o, t, 'highpass', 4000, 0, 0.7, 0.12, 0.0005, 0.015); }],
  // new order: two rising chime notes
  order: [0.75, (o, t) => { bell(o, t, 784, 0.3, 0.3); bell(o, t + 0.13, 1047, 0.3, 0.55); }],
  // order delivered: happy major arpeggio C-E-G-C
  success: [0.72, (o, t) => { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => bell(o, t + i * 0.085, f, 0.26, i === 3 ? 0.4 : 0.18)); }],
  // order failed: sad descending two-note buzzer, kept mellow by a lowpass
  fail: [0.6, (o, t) => {
    const f = filt(o, 'lowpass', 1000, 1);
    tone(f, t, 'sawtooth', 196, 0, 0.2, 0.01, 0.06, 0.13);
    tone(f, t + 0.21, 'sawtooth', 147, 131, 0.2, 0.01, 0.14, 0.17);
  }],
  // coin: two quick high square notes (B5 → E6)
  coin: [0.45, (o, t) => {
    const f = filt(o, 'lowpass', 6000);
    tone(f, t, 'square', 988, 0, 0.13, 0.002, 0.04, 0.03);
    tone(f, t + 0.07, 'square', 1319, 0, 0.13, 0.002, 0.3, 0.02);
  }],
  // knife chop: woody thunk + tiny high click
  chop: [0.15, (o, t) => {
    tone(o, t, 'sine', 230, 110, 0.45, 0.001, 0.07);
    hiss(o, t, 'bandpass', 1000, 0, 2, 0.3, 0.001, 0.04);
    hiss(o, t, 'highpass', 5000, 0, 0.7, 0.1, 0.0005, 0.01);
  }],
  // pot/pan hit: inharmonic partials, randomized per call, fast decay
  clank: [0.45, (o, t) => {
    const f = rnd(420, 640);
    [1, 1.58, 2.24, 2.92, 3.87, 5.12].forEach((m, i) =>
      tone(o, t, i % 2 ? 'sine' : 'triangle', f * m * rnd(0.97, 1.03), 0, 0.2 / (1 + i * 0.5), 0.001, 0.35 / (1 + i * 0.35)));
    hiss(o, t, 'bandpass', 3200, 0, 1, 0.2, 0.001, 0.03);
  }],
  // ceramic plate: short high ping
  clink: [0.25, (o, t) => {
    bell(o, t, rnd(2300, 2900), 0.26, 0.18, [[1, 1, 1], [2.31, 0.4, 0.5], [3.9, 0.15, 0.3]]);
    hiss(o, t, 'highpass', 6000, 0, 0.7, 0.08, 0.0005, 0.008);
  }],
  // food hitting a surface: low sine blip + dull noise
  thud: [0.25, (o, t) => { tone(o, t, 'sine', 120, 55, 0.55, 0.004, 0.15); hiss(o, t, 'lowpass', 350, 0, 0.7, 0.3, 0.004, 0.09); }],
  // wooden knock: two short partials + resonant noise
  wood: [0.15, (o, t) => {
    tone(o, t, 'sine', 400, 330, 0.4, 0.001, 0.07);
    tone(o, t, 'sine', 960, 0, 0.12, 0.001, 0.03);
    hiss(o, t, 'bandpass', 700, 0, 4, 0.3, 0.001, 0.035);
  }],
  // comedic head bonk: hollow tone, quick pitch drop, then a cartoon wobble
  bonk: [0.45, (o, t) => {
    const w = tone(o, t, 'sine', 330, 170, 0.55, 0.002, 0.34, 0, 0.12);
    lfo(w.frequency, 21, 26 * P, t + 0.04, 0.32);
    tone(o, t, 'triangle', 660, 420, 0.14, 0.001, 0.08);
    hiss(o, t, 'bandpass', 500, 0, 3, 0.25, 0.001, 0.03);
  }],
  // dizzy stars: a few quick random high pings
  star: [0.65, (o, t) => { for (let i = 0; i < 5; i++) bell(o, t + i * 0.075 + rnd(0, 0.02), pick(TWINKLE), 0.13, 0.25); }],
  // throw: bandpassed noise sweeping up
  whoosh: [0.35, (o, t) => { hiss(o, t, 'bandpass', 500, 2800, 1.5, 0.5, 0.09, 0.18); }],
  // item spawn: sine pitch-up blip
  pop: [0.15, (o, t) => { tone(o, t, 'sine', 380, 1300, 0.4, 0.002, 0.07); }],
  // item vanish: soft noise puff, lowpass closing
  poof: [0.4, (o, t) => { hiss(o, t, 'lowpass', 3500, 250, 0.7, 0.4, 0.015, 0.3); }],
  // wet splat: closing lowpass noise + resonant squelch + pitch-drop sine
  splat: [0.25, (o, t) => {
    hiss(o, t, 'lowpass', 3000, 350, 1, 0.45, 0.002, 0.16);
    hiss(o, t + 0.01, 'bandpass', 2000, 450, 6, 0.3, 0.004, 0.12);
    tone(o, t, 'sine', 320, 60, 0.35, 0.002, 0.1);
  }],
  // egg crack: cluster of tiny sharp clicks
  crack: [0.15, (o, t) => {
    for (let i = 0; i < 5; i++) hiss(o, t + i * rnd(0.005, 0.015), 'bandpass', rnd(2500, 6000), 0, 2, rnd(0.2, 0.45), 0.0005, rnd(0.004, 0.012));
  }],
  // water splash: bright spray + falling body + two bubbles
  splash: [0.4, (o, t) => {
    hiss(o, t, 'highpass', 1800, 0, 0.5, 0.25, 0.008, 0.3);
    hiss(o, t, 'bandpass', 1400, 500, 1.2, 0.35, 0.005, 0.22);
    bubble(o, t + 0.07, 0.14); bubble(o, t + 0.15, 0.1);
  }],
  // appliance door: low thud + short metallic rattle
  door: [0.25, (o, t) => {
    tone(o, t, 'sine', 100, 50, 0.55, 0.003, 0.14);
    hiss(o, t, 'lowpass', 600, 0, 0.7, 0.3, 0.002, 0.07);
    for (let i = 1; i < 4; i++) hiss(o, t + 0.03 + i * 0.028, 'bandpass', rnd(1800, 2800), 0, 6, 0.2 / i, 0.001, 0.02);
  }],
  // knob/switch: very short tick
  click: [0.06, (o, t) => { hiss(o, t, 'bandpass', 3200, 0, 1.5, 0.35, 0.0005, 0.012); tone(o, t, 'square', 1900, 0, 0.06, 0.0005, 0.008); }],
  // big lever: click, then a low clunk
  lever: [0.3, (o, t) => {
    hiss(o, t, 'bandpass', 2400, 0, 2, 0.4, 0.0005, 0.015);
    tone(o, t + 0.035, 'sine', 150, 60, 0.6, 0.003, 0.18);
    hiss(o, t + 0.035, 'lowpass', 700, 0, 0.7, 0.3, 0.002, 0.08);
    tone(o, t + 0.035, 'triangle', 520, 0, 0.08, 0.001, 0.08);
  }],
  // jump: tiny quiet boing
  jump: [0.22, (o, t) => { tone(o, t, 'sine', 300, 640, 0.18, 0.005, 0.14); }],
  // footstep: very quiet soft tap
  step: [0.12, (o, t) => { hiss(o, t, 'lowpass', rnd(500, 800), 0, 0.7, 0.12, 0.003, 0.05); }],
  // food lands in a hot pan: burst of hiss + crackle, fast attack, ~0.5 s decay
  sizzleStart: [0.65, (o, t) => {
    const hp = filt(env(o, t, 1, 0.006, 0.5), 'highpass', 3600, 0.5);
    noise(gain(hp, 0.2), t, 0.55);
    fizz(hp, t, 1.7, 0.8, 0.55);
  }],
  // gas burner: soft "fwoomp" (lowpass opening quickly) + low body
  ignite: [0.5, (o, t) => { hiss(o, t, 'lowpass', 250, 1600, 0.8, 0.5, 0.07, 0.33, 0, 0.15); tone(o, t, 'sine', 95, 55, 0.3, 0.03, 0.25); }],
  // one big bubble
  blub: [0.25, (o, t) => { bubble(o, t, 0.5, 110, 3.2, 0.17); }],
  // ticket printer: ~0.2 s of fast ticks over a little motor buzz
  ticket: [0.3, (o, t) => {
    for (let i = 0; i < 11; i++) hiss(o, t + i * 0.019, 'bandpass', 2600 + (i % 2) * 500, 0, 2.5, 0.25, 0.0005, 0.009);
    tone(filt(o, 'lowpass', 600), t, 'sawtooth', 90, 0, 0.08, 0.01, 0.03, 0.17);
  }],
  // happy customer: cute rising "mm-mm!"
  yum: [0.5, (o, t) => { vox(o, t, 0.13, 330, 370, 0.7, HUM); vox(o, t + 0.17, 0.24, 392, 520, 0.8, HUM); }],
  // grumpy customer: breathy "h" + low growly falling "rmph"
  angry: [0.45, (o, t) => {
    const w = vox(o, t + 0.03, 0.3, 150, 85, 1.5, [[380, 1.5, 1], [950, 3, 0.35]]);
    lfo(w.frequency, 38, 9 * P, t + 0.03, 0.32);
    hiss(o, t, 'bandpass', 1300, 700, 1.5, 0.1, 0.02, 0.1);
  }],
  // waiter chatter: three quick random-pitched vowel blips
  waiter: [0.32, (o, t) => {
    for (let i = 0; i < 3; i++) {
      const v = pick(VOWELS), f = rnd(280, 480);
      vox(o, t + i * 0.08, 0.07, f, f * rnd(0.9, 1.15), 0.8, [[v[0], 4, 1], [v[1], 6, 0.5]]);
    }
  }],
};

// ───────────────────────────── loops ─────────────────────────────
// name: (out, t) => build endless nodes; may return a tick() that is called every 100 ms.

const LOOPS = {
  // frying pan: thin hiss bed + two layers of random crackle bursts
  sizzle(o, t) {
    const [, bed] = layer(o, t, 'highpass', 4200, 0.5, 0.06);
    drift(bed.gain, 0.3, 2);
    const hp = filt(o, 'highpass', 2600, 0.5);
    fizz(hp, t, rnd(0.9, 1.15), 0.5); fizz(hp, t, rnd(1.5, 1.9), 0.3);
  },
  // boiling water: low rumble + surface fizz + randomly scheduled bubble blips
  boil(o, t) {
    const [fl, g] = layer(o, t, 'lowpass', 420, 1, 0.16);
    drift(g.gain, 0.3, 4); drift(fl.frequency, 0.25);
    const [, g2] = layer(o, t, 'bandpass', 1500, 1.2, 0.03);
    drift(g2.gain, 0.4, 3);
    return () => { for (let i = 0; i < 3; i++) if (Math.random() < 0.6) bubble(o, ctx.currentTime + rnd(0.01, 0.1), rnd(0.06, 0.2)); };
  },
  // deep fryer: brighter bed, three dense crackle layers
  fryer(o, t) {
    const [, bed] = layer(o, t, 'highpass', 5500, 0.5, 0.08);
    drift(bed.gain, 0.25, 3);
    const hp = filt(o, 'highpass', 3800, 0.5);
    fizz(hp, t, rnd(1.8, 2.3), 0.45); fizz(hp, t, rnd(2.8, 3.4), 0.35); fizz(hp, t, rnd(1.1, 1.4), 0.3);
  },
  // running tap: steady bandpassed noise + airy top + a bit of low splatter
  tap(o, t) {
    const [fl, g] = layer(o, t, 'bandpass', 2400, 0.7, 0.1);
    drift(fl.frequency, 0.1, 2); drift(g.gain, 0.12, 3);
    layer(o, t, 'highpass', 6000, 0.5, 0.03);
    layer(o, t, 'lowpass', 300, 0.7, 0.05);
  },
  // blender: detuned saws ~180 Hz with wobble + grinding noise
  blender(o, t) {
    const lp = filt(o, 'lowpass', 1500, 1.5);
    for (const [m, a] of [[1, 0.16], [1.503, 0.07], [2.01, 0.06]]) {
      const w = osc(gain(lp, a), 'sawtooth', t, 0, 180 * m);
      lfo(w.frequency, rnd(5, 8), 4 * m); lfo(w.frequency, rnd(0.3, 0.7), 6 * m);
    }
    const [, g] = layer(o, t, 'bandpass', 2800, 1, 0.08);
    lfo(g.gain, rnd(9, 13), g.gain.value * 0.4);
  },
  // gas burner: very soft hiss
  flame(o, t) {
    const [fl, g] = layer(o, t, 'bandpass', 1100, 0.6, 0.035);
    drift(g.gain, 0.3, 2); drift(fl.frequency, 0.18);
    layer(o, t, 'highpass', 7000, 0.5, 0.012);
  },
  // oven fan: low hum (two 100 Hz partials beating slowly) + soft air
  ovenhum(o, t) {
    for (const [f, a] of [[50, 0.12], [100, 0.08], [100.6, 0.05], [151, 0.03]]) osc(gain(o, a), 'sine', t, 0, f);
    const [, g] = layer(o, t, 'lowpass', 260, 0.7, 0.06);
    drift(g.gain, 0.3);
  },
  // fire: breathing low roar + sparse loud crackles + direct pops from the impulse buffer
  fire(o, t) {
    const [fl, g] = layer(o, t, 'lowpass', 500, 0.8, 0.12);
    drift(g.gain, 0.35, 3); drift(fl.frequency, 0.3, 2);
    const bp = filt(o, 'bandpass', 2600, 0.6);
    fizz(bp, t, rnd(0.3, 0.4), 1.1); fizz(bp, t, rnd(0.5, 0.65), 0.6);
    noise(filt(gain(o, 0.25), 'highpass', 1500, 0.5), t, 0, crackle, rnd(0.3, 0.45));
  },
};

// ───────────────────────────── engine ─────────────────────────────

function resume() {
  const p = ctx.resume();
  if (p && p.catch) p.catch(() => {});
}

function boot() {
  const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AC) { dead = true; return; }
  ctx = new AC();
  // master chain: masterGain → compressor → destination
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 4;
  comp.attack.value = 0.003; comp.release.value = 0.2;
  comp.connect(ctx.destination);
  master = gain(comp, muted ? 0 : MASTER_VOL);
  // shared buffers: 2 s of white noise + 3 s of sparse, randomly sized, fast-decaying impulses
  const sr = ctx.sampleRate;
  white = ctx.createBuffer(1, sr * 2, sr);
  const w = white.getChannelData(0);
  for (let i = 0; i < w.length; i++) w[i] = Math.random() * 2 - 1;
  crackle = ctx.createBuffer(1, sr * 3, sr);
  const c = crackle.getChannelData(0);
  let e = 0, k = 0;
  for (let i = 0; i < c.length; i++) {
    if (Math.random() < 28 / sr) { e = Math.max(e, Math.random() ** 3); k = Math.exp(-1 / (sr * rnd(0.001, 0.008))); }
    c[i] = e *= k;
  }
  for (let i = 1; i <= 512; i++) c[c.length - i] *= (i - 1) / 512;   // clean loop seam
  // browsers may suspend the context again (tab switch, iOS interruption): wake it on any gesture
  if (typeof addEventListener === 'function') {
    const wake = () => { try { if (ctx && ctx.state !== 'running') resume(); } catch (err) { oops(err); } };
    for (const ev of ['pointerdown', 'keydown', 'touchend']) addEventListener(ev, wake, { passive: true });
  }
}

// gain = 1 / (1 + (d/4)²), faded to silence between 16 and 22 m; pan = 0.8 · (dir · right)
function spatial(pos) {
  if (!pos) { S.g = 1; S.pan = 0; S.d = 0; return S; }
  const dx = (+pos.x || 0) - L.x, dy = (+pos.y || 0) - L.y, dz = (+pos.z || 0) - L.z;
  const d = Math.hypot(dx, dy, dz);
  S.d = d;
  S.g = clamp((22 - d) / 6, 0, 1) / (1 + (d / 4) ** 2);
  S.pan = clamp(0.8 * (dx * L.rx + dz * L.rz) / Math.max(d, 1.5), -1, 1);  // soft pan when very close
  return S;
}

function panner(pan) {
  if (!ctx.createStereoPanner) return null;
  const p = ctx.createStereoPanner();
  p.pan.value = pan; p.connect(master);
  return p;
}

function buildLoop(r, g, pan) {
  const t = ctx.currentTime, pn = panner(pan), out = gain(pn || master, 0);
  out.gain.setValueAtTime(0, t);
  out.gain.setTargetAtTime(g, t, 0.08);
  const live = { out, pn, srcs: [], timer: 0 };
  srcs = live.srcs; P = 1;
  try {
    const tick = LOOPS[r.name](out, t);
    if (tick) live.timer = setInterval(() => { try { if (ctx.state === 'running') tick(); } catch (e) { oops(e); } }, 100);
  } finally { srcs = null; }
  r.live = live; r.g = g; r.pan = pan; liveLoops++;
}

function killLoop(r) {
  const live = r.live;
  if (!live) return;
  r.live = null; r.g = 0; liveLoops--;
  if (live.timer) clearInterval(live.timer);
  live.out.gain.setTargetAtTime(0, ctx.currentTime, 0.06);
  setTimeout(() => {
    for (const s of live.srcs) { try { s.stop(); } catch (e) { /* already stopped */ } }
    try { live.out.disconnect(); if (live.pn) live.pn.disconnect(); } catch (e) { oops(e); }
  }, 500);
}

// Re-evaluates one loop against the listener: smooth gain/pan updates, frees loops that drift
// out of earshot (the record stays and revives), and enforces the MAX_LOOPS budget.
function refresh(r) {
  const s = spatial(r.pos), g = r.vol * s.g, pan = s.pan, live = r.live, t = ctx.currentTime;
  if (live) {
    if (g < 0.0015) { killLoop(r); return; }
    if (Math.abs(g - r.g) > 0.002 + r.g * 0.02) { live.out.gain.setTargetAtTime(g, t, 0.06); r.g = g; }
    if (live.pn && Math.abs(pan - r.pan) > 0.015) { live.pn.pan.setTargetAtTime(pan, t, 0.06); r.pan = pan; }
  } else if (g >= 0.004) {
    if (liveLoops >= MAX_LOOPS) {
      let q = null;
      for (const x of loops.values()) if (x.live && (!q || x.g < q.g)) q = x;
      if (!q || g < q.g * 1.5) return;   // over budget: the quieter/farther newcomer is ignored
      killLoop(q);
    }
    buildLoop(r, g, pan);
  }
}

export const audio = {
  init() {
    try {
      if (dead) return;
      if (!ctx) boot();
      if (ctx && ctx.state !== 'running' && ctx.state !== 'closed') resume();
    } catch (e) {
      oops(e); dead = true;
      try { if (ctx) ctx.close(); } catch (e2) { /* ignore */ }
      ctx = null;
    }
  },

  setListener(pos, yaw) {
    try {
      if (pos) { L.x = +pos.x || 0; L.y = +pos.y || 0; L.z = +pos.z || 0; }
      if (Number.isFinite(yaw)) { L.rx = Math.cos(yaw); L.rz = -Math.sin(yaw); }
      if (ctx) for (const r of loops.values()) refresh(r);
    } catch (e) { oops(e); }
  },

  play(name, pos, vol, pitch) {
    try {
      if (!ctx || muted || ctx.state !== 'running' || !has(SOUNDS, name)) return;
      vol = vol == null ? 1 : +vol;
      if (!(vol > 0)) return;
      const ms = performance.now();
      if (ms - (last[name] || -1e9) < MIN_GAP_MS) return;
      const s = spatial(pos);
      if (s.d > MAX_DIST) return;
      const g = Math.min(vol, 3) * s.g;
      if (g < 0.003 || (voices >= MAX_VOICES && g < 0.35) || voices >= MAX_VOICES + 8) return;
      last[name] = ms;
      const [dur, build] = SOUNDS[name];
      const pn = pos ? panner(s.pan) : null, out = gain(pn || master, g);
      voices++;
      setTimeout(() => {
        voices--;
        try { out.disconnect(); if (pn) pn.disconnect(); } catch (e) { oops(e); }
      }, (dur + 0.1) * 1000);
      P = clamp(+pitch || 1, 0.25, 4);
      try { build(out, ctx.currentTime + 0.005); } finally { P = 1; }
    } catch (e) { oops(e); }
  },

  setLoop(key, name, pos, vol) {
    try {
      if (!ctx) return;
      vol = vol == null ? 1 : +vol;
      let r = loops.get(key);
      if (!(vol > 0) || !has(LOOPS, name)) { if (r) { killLoop(r); loops.delete(key); } return; }
      if (r && r.name !== name) { killLoop(r); r.name = name; }
      if (!r) loops.set(key, r = { name, pos: null, vol: 0, g: 0, pan: 0, live: null });
      r.vol = Math.min(vol, 3);
      if (pos) {
        const p = r.pos || (r.pos = { x: 0, y: 0, z: 0 });
        p.x = +pos.x || 0; p.y = +pos.y || 0; p.z = +pos.z || 0;
      } else r.pos = null;
      refresh(r);
    } catch (e) { oops(e); }
  },

  stopAllLoops() {
    try {
      if (ctx) for (const r of loops.values()) killLoop(r);
      loops.clear();
    } catch (e) { oops(e); }
  },

  setMuted(m) {
    try {
      muted = !!m;
      if (ctx) master.gain.setTargetAtTime(muted ? 0 : MASTER_VOL, ctx.currentTime, 0.03);
    } catch (e) { oops(e); }
  },

  get muted() { return muted; },
};
