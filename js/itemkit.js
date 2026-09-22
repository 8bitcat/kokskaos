// Kökskaos — shared helpers + palette for item definition files (no dependencies, so every items_*.js can import it)

// ---------------------------------------------------------------- collider spec helpers
export const box = (hx, hy, hz, p = [0, 0, 0], r = null, m = 1, extra) => ({ s: 'box', hx, hy, hz, p, r, m, ...extra });
export const cyl = (hh, rad, p = [0, 0, 0], r = null, m = 1) => ({ s: 'cyl', hh, rad, p, r, m });
export const ball = (rad, p = [0, 0, 0], m = 1) => ({ s: 'ball', rad, p, m });
export const cap = (hh, rad, p = [0, 0, 0], r = null, m = 1) => ({ s: 'cap', hh, rad, p, r, m });
export const CAPX = [0, 0, Math.PI / 2];      // capsule/cylinder along X instead of Y

// ring of wall boxes approximating a round container wall
export function ring(n, radius, y0, y1, t, m = 1) {
  const out = [], hw = Math.tan(Math.PI / n) * (radius + t) * 1.04;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    out.push(box(t / 2, (y1 - y0) / 2, hw, [Math.cos(a) * (radius + t / 2), (y0 + y1) / 2, -Math.sin(a) * (radius + t / 2)], [0, a, 0], m / n));
  }
  return out;
}
// bowl-shaped collider: bottom disc + two tiers of wall rings
export const bowlCol = (r0, r1, h, t, mBottom = 0.5) => [cyl(0.008, r0 + 0.01, [0, 0.008, 0], null, mBottom),
  ...ring(10, r0 + (r1 - r0) * 0.4, 0.012, h * 0.5, t, (1 - mBottom) * 0.5), ...ring(10, r1, h * 0.5, h, t, (1 - mBottom) * 0.5)];

// ---------------------------------------------------------------- palette
export const C = {
  steel: 0xc3ced6, steelDark: 0x8896a3, iron: 0x3b4048, ironLight: 0x565c66, wood: 0xc98d4f, woodDark: 0x8a5a2b,
  white: 0xfaf6ee, cream: 0xf4e4c1, black: 0x22252b, red: 0xe5483d, glass: 0xbfe6f2,
  beef: 0xc8434a, beefCooked: 0x7a4a2c, patty: 0xd0606a, chicken: 0xf1c6a8, chickenCooked: 0xd98a3a,
  fish: 0xf3d9cf, fishCooked: 0xe0a44a, sausage: 0xd9776a, sausageCooked: 0x9a4a2a,
  potato: 0xd8b26a, potatoIn: 0xf3e2a0, fryCooked: 0xf5c33b, tomato: 0xe8342c, lettuce: 0x7ed04b, lettuceDark: 0x4ea63a,
  onion: 0xd9a0d6, onionIn: 0xf6ecf7, carrot: 0xf08a24, cucumber: 0x3f9a45, cucumberIn: 0xc9eaa0,
  cheese: 0xf7c53c, bun: 0xe0a458, bunIn: 0xf6e3b4, pasta: 0xf2dc8a, pastaCooked: 0xf7e9b0, egg: 0xfbf3e4, yolk: 0xf9b91e,
  sauce: 0xd62f1f, mush: 0x8a7a5a, burnt: 0x1d1a18, water: 0x56b8ea,
  bacon: 0xd9656a, baconFat: 0xf5d5c8, baconCooked: 0x8e3a26, salmon: 0xf78d6b, salmonCooked: 0xf2b08f, shrimp: 0xb9c2c9, shrimpCooked: 0xf58a6c,
  meatball: 0xc4606a, meatballCooked: 0x6a3e22, batter: 0xf6e7b4, pancake: 0xe0a04a, jam: 0xb0123a, dough: 0xf1e2bd, crust: 0xd9a055,
  mushroom: 0xe9dcc8, mushroomCooked: 0xa98560, paprika: 0xf2c31b, broccoli: 0x3f9a45, broccoliCooked: 0x5fb04a, corn: 0xf7d33c, cornCooked: 0xf0b428,
  lemon: 0xf9e04c, bread: 0xd8a35c, breadIn: 0xf6e6c2, toast: 0xb9772e, rice: 0xf6f3ea, riceCooked: 0xfffdf6, breading: 0xe0a743, breadingCooked: 0xc9822a,
};

export const FOOD_PHYS = { friction: 1.0, rest: 0.08, linDamp: 0.15, angDamp: 0.9 };
