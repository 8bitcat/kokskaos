// Kökskaos — the bigger pantry: more raw ingredients, cut pieces, tool-made foods (mash, schnitzel, pizza base,
// grated cheese), squeeze-bottle blobs and oven-fused pizzas.
import { box, cyl, ball, cap, CAPX, C, FOOD_PHYS } from './itemkit.js';

const BLOB = { food: 1, mass: 0.04, friction: 1.3, rest: 0.0, linDamp: 1.3, angDamp: 3 };
const ROUND = { friction: 0.9, rest: 0.25, linDamp: 0.12, angDamp: 1.4 };

const pizzaParts = (toppings) => [
  { g: 'cyl', r: 0.155, h: 0.02, p: [0, 0, 0], c: C.crust, tint: 'all', round: 1 },
  { g: 'cyl', r: 0.135, h: 0.006, p: [0, 0.011, 0], c: 0xd63a22 },
  ...[[0.05, 0.04], [-0.06, 0.03], [0.0, -0.07], [-0.04, -0.03], [0.08, -0.04], [-0.085, -0.045], [0.02, 0.085]].map(([x, z], i) => ({ g: 'ball', r: 0.032 + (i % 3) * 0.006, sc: [1, 0.14, 1], p: [x, 0.015, z], c: 0xfbe08a })),
  ...toppings,
];

export const FOODS = {
  // ======================= meat & fish =======================
  bacon: {
    n: ['Bacon', 'Bacon'], food: 1, mass: 0.05, ...FOOD_PHYS,
    col: [box(0.085, 0.007, 0.022)],
    cook: { t: { fry: 6, bake: 10, deepfry: 6 }, sides: 2, to: C.baconCooked },
    parts: [{ g: 'box', sz: [0.17, 0.007, 0.044], p: [0, 0.0035, 0], c: C.bacon, tint: 'a' }, { g: 'box', sz: [0.17, 0.007, 0.044], p: [0, -0.0035, 0], c: C.bacon, tint: 'b' },
      { g: 'box', sz: [0.17, 0.0155, 0.01], p: [0, 0, 0.008], c: C.baconFat }, { g: 'box', sz: [0.17, 0.0155, 0.008], p: [0, 0, -0.012], c: C.baconFat }],
  },
  salmon: {
    n: ['Laxfilé', 'Salmon fillet'], food: 1, mass: 0.22, ...FOOD_PHYS,
    col: [box(0.09, 0.02, 0.045)],
    cook: { t: { fry: 9, bake: 14, deepfry: 10 }, sides: 2, to: C.salmonCooked },
    parts: [{ g: 'box', sz: [0.18, 0.02, 0.09], p: [0, 0.01, 0], c: C.salmon, tint: 'a', round: 1 }, { g: 'box', sz: [0.18, 0.02, 0.09], p: [0, -0.01, 0], c: 0xb9c2c9, tint: 'b' },
      { g: 'box', sz: [0.004, 0.003, 0.085], p: [-0.04, 0.021, 0], c: 0xfbc4ae }, { g: 'box', sz: [0.004, 0.003, 0.085], p: [0.0, 0.021, 0], c: 0xfbc4ae }, { g: 'box', sz: [0.004, 0.003, 0.085], p: [0.04, 0.021, 0], c: 0xfbc4ae }],
  },
  shrimp: {
    n: ['Räka', 'Shrimp'], food: 1, mass: 0.04, ...FOOD_PHYS, angDamp: 1.6,
    col: [ball(0.022)],
    cook: { t: { fry: 5, boil: 5, deepfry: 5, bake: 9 }, to: C.shrimpCooked },
    parts: [{ g: 'torus', r: 0.018, t: 0.011, p: [0, 0, 0], r3: [Math.PI / 2, 0, 0], c: C.shrimp, tint: 'all' }, { g: 'cone', r: 0.01, h: 0.02, p: [0.022, -0.012, 0], r3: [0, 0, -2.2], c: 0xf5a08a }],
  },
  meatball: {
    n: ['Köttbulle', 'Meatball'], food: 1, mass: 0.06, friction: 1.0, rest: 0.15, linDamp: 0.2, angDamp: 1.5,
    col: [ball(0.027)],
    cook: { t: { fry: 8, bake: 13, deepfry: 7 }, to: C.meatballCooked },
    parts: [{ g: 'ball', r: 0.028, p: [0, 0, 0], c: C.meatball, tint: 'all', flat: 1 }],
  },
  fishfinger: {
    n: ['Fiskpinne', 'Fish finger'], food: 1, mass: 0.06, ...FOOD_PHYS,
    col: [box(0.045, 0.011, 0.017)],
    cook: { t: { fry: 7, deepfry: 6, bake: 10 }, to: C.breadingCooked },
    parts: [{ g: 'box', sz: [0.09, 0.022, 0.034], p: [0, 0, 0], c: C.breading, tint: 'all', round: 1 }],
  },
  nugget: {
    n: ['Kycklingnugget', 'Chicken nugget'], food: 1, mass: 0.05, ...FOOD_PHYS, angDamp: 1.4,
    col: [ball(0.025)],
    cook: { t: { deepfry: 7, bake: 12, fry: 10 }, to: C.breadingCooked },
    parts: [{ g: 'ball', r: 0.03, sc: [1.15, 0.7, 0.95], p: [0, 0, 0], c: C.breading, tint: 'all', flat: 1 }],
  },
  schnitzel: {   // made by whacking a steak with the meat mallet
    n: ['Schnitzel', 'Schnitzel'], food: 1, mass: 0.26, ...FOOD_PHYS,
    col: [box(0.105, 0.011, 0.08)],
    cook: { t: { fry: 8, deepfry: 8, bake: 14 }, sides: 2, to: C.breadingCooked },
    parts: [{ g: 'ball', r: 0.11, sc: [1, 0.1, 0.76], p: [0, 0.005, 0], c: C.breading, tint: 'a', flat: 1 }, { g: 'ball', r: 0.11, sc: [1, 0.1, 0.76], p: [0, -0.005, 0], c: C.breading, tint: 'b', flat: 1 }],
  },
  sausagecoin: {
    n: ['Korvslant', 'Sausage slice'], food: 1, mass: 0.025, ...FOOD_PHYS,
    col: [cyl(0.007, 0.021)],
    cook: { t: { fry: 5, bake: 9 }, to: C.sausageCooked },
    parts: [{ g: 'cyl', r: 0.022, h: 0.014, p: [0, 0, 0], c: C.sausage, tint: 'all' }],
  },
  // ======================= veg & fruit =======================
  mushroom: {
    n: ['Champinjon', 'Mushroom'], food: 1, mass: 0.05, ...ROUND,
    col: [ball(0.033)], cut: { into: 'mushroomslice', n: 4 },
    cook: { t: { fry: 7, bake: 10 }, to: C.mushroomCooked },
    parts: [{ g: 'hemi', r: 0.04, sc: [1, 0.8, 1], p: [0, 0.0, 0], c: C.mushroom, tint: 'all', flip: 1 }, { g: 'cyl', r: 0.014, h: 0.035, p: [0, -0.016, 0], c: 0xf6efe2 }],
  },
  mushroomslice: {
    n: ['Svampskiva', 'Mushroom slice'], food: 1, mass: 0.02, ...FOOD_PHYS,
    col: [cyl(0.006, 0.028)],
    cook: { t: { fry: 5, bake: 8 }, to: C.mushroomCooked },
    parts: [{ g: 'cyl', r: 0.03, h: 0.011, p: [0.004, 0, 0], sc: [1, 1, 0.75], c: C.mushroom, tint: 'all' }, { g: 'box', sz: [0.02, 0.0112, 0.014], p: [-0.022, 0, 0], c: 0xf6efe2 }],
  },
  paprika: {
    n: ['Paprika', 'Bell pepper'], food: 1, mass: 0.14, ...ROUND,
    col: [ball(0.048)], cut: { into: 'paprikastrip', n: 5 },
    parts: [{ g: 'ball', r: 0.05, sc: [1, 1.1, 1], p: [0, 0, 0], c: C.paprika, flat: 1 }, { g: 'cyl', r: 0.008, h: 0.03, p: [0, 0.06, 0], c: C.lettuceDark }],
  },
  paprikastrip: {
    n: ['Paprikastrimla', 'Pepper strip'], food: 1, mass: 0.02, ...FOOD_PHYS,
    col: [box(0.036, 0.006, 0.01)],
    cook: { t: { fry: 5, bake: 8 }, to: 0xe09a14 },
    parts: [{ g: 'box', sz: [0.072, 0.011, 0.02], p: [0, 0, 0], c: C.paprika, tint: 'all' }],
  },
  broccoli: {
    n: ['Broccoli', 'Broccoli'], food: 1, mass: 0.07, ...FOOD_PHYS, angDamp: 1.4,
    col: [ball(0.036)],
    cook: { t: { boil: 8, fry: 9, bake: 12 }, to: C.broccoliCooked },
    parts: [{ g: 'ball', r: 0.036, p: [0, 0.012, 0], c: C.broccoli, tint: 'all', flat: 1 }, { g: 'ball', r: 0.022, p: [0.025, 0.02, 0.01], c: 0x358a3c, flat: 1 }, { g: 'ball', r: 0.022, p: [-0.02, 0.025, -0.015], c: 0x358a3c, flat: 1 },
      { g: 'cyl', r: 0.012, h: 0.04, p: [0, -0.025, 0], c: 0x8fc46a }],
  },
  corn: {
    n: ['Majskolv', 'Corn cob'], food: 1, mass: 0.16, ...FOOD_PHYS, angDamp: 1.4,
    col: [cap(0.055, 0.027, [0, 0, 0], CAPX)],
    cook: { t: { boil: 9, fry: 10, bake: 13 }, to: C.cornCooked },
    parts: [{ g: 'cap', r: 0.028, len: 0.11, p: [0, 0, 0], r3: CAPX, c: C.corn, tint: 'all', flat: 1 }, { g: 'cone', r: 0.02, h: 0.04, p: [-0.095, 0, 0], r3: [0, 0, Math.PI / 2], c: 0x9bcf5a }],
  },
  lemon: {
    n: ['Citron', 'Lemon'], food: 1, mass: 0.1, ...ROUND,
    col: [ball(0.036)], cut: { into: 'lemonslice', n: 4 },
    parts: [{ g: 'ball', r: 0.037, sc: [1.3, 1, 1], p: [0, 0, 0], c: C.lemon }, { g: 'cone', r: 0.012, h: 0.014, p: [0.052, 0, 0], r3: [0, 0, -Math.PI / 2], c: C.lemon }],
  },
  lemonslice: {
    n: ['Citronskiva', 'Lemon slice'], food: 1, mass: 0.02, ...FOOD_PHYS,
    col: [cyl(0.006, 0.034)],
    parts: [{ g: 'cyl', r: 0.036, h: 0.011, p: [0, 0, 0], c: C.lemon }, { g: 'cyl', r: 0.03, h: 0.0125, p: [0, 0, 0], c: 0xfdf3a8 }],
  },
  // ======================= bakery & dry goods =======================
  bread: {
    n: ['Limpa', 'Bread loaf'], food: 1, mass: 0.35, ...FOOD_PHYS,
    col: [box(0.12, 0.05, 0.055)], cut: { into: 'breadslice', n: 5 },
    parts: [{ g: 'cap', r: 0.055, len: 0.13, p: [0, 0, 0], r3: CAPX, sc: [1, 1, 1], c: C.bread }, { g: 'box', sz: [0.2, 0.05, 0.1], p: [0, -0.025, 0], c: C.bread }],
  },
  breadslice: {
    n: ['Brödskiva', 'Bread slice'], cookedName: ['Rostat bröd', 'Toast'], food: 1, mass: 0.04, ...FOOD_PHYS,
    col: [box(0.05, 0.008, 0.05)],
    cook: { t: { fry: 5, bake: 7 }, to: C.toast },
    parts: [{ g: 'box', sz: [0.1, 0.016, 0.1], p: [0, 0, 0], c: C.bread, round: 1 }, { g: 'box', sz: [0.086, 0.0175, 0.086], p: [0, 0, 0], c: C.breadIn, tint: 'all' }],
  },
  hotdogbun: {
    n: ['Korvbröd', 'Hot dog bun'], food: 1, mass: 0.06, ...FOOD_PHYS,
    col: [box(0.08, 0.02, 0.03)],
    parts: [{ g: 'cap', r: 0.028, len: 0.11, p: [0, 0, 0], r3: CAPX, sc: [1, 1, 0.8], c: C.bun }, { g: 'box', sz: [0.13, 0.006, 0.014], p: [0, 0.024, 0], c: C.bunIn }],
  },
  rice: {
    n: ['Ris', 'Rice'], food: 1, mass: 0.03, friction: 1.2, rest: 0.0, linDamp: 0.9, angDamp: 2.5,
    col: [ball(0.02)],
    cook: { t: { boil: 8 }, to: C.riceCooked, grow: 1.35 },
    parts: [{ g: 'ball', r: 0.022, sc: [1.1, 0.8, 1.1], p: [0, 0, 0], c: 0xe9e2cf, tint: 'all', flat: 1 }],
  },
  pizzadough: {  // flatten with the rolling pin
    n: ['Pizzadeg', 'Pizza dough'], food: 1, mass: 0.25, friction: 1.1, rest: 0.05, linDamp: 0.3, angDamp: 1.6,
    col: [ball(0.06)], use: { roll: { into: 'pizzabase', n: 1 } },
    parts: [{ g: 'ball', r: 0.062, sc: [1, 0.85, 1], p: [0, 0, 0], c: C.dough }],
  },
  pizzabase: {   // add sauce + cheese (+ toppings) and bake: the oven fuses it into a pizza
    n: ['Pizzabotten', 'Pizza base'], food: 1, mass: 0.25, ...FOOD_PHYS,
    col: [cyl(0.007, 0.15)],
    container: { r: 0.15, y0: 0.0, h: 0.12, pizza: true },
    cook: { t: { bake: 11 }, to: C.crust },
    parts: [{ g: 'cyl', r: 0.152, h: 0.014, p: [0, 0, 0], c: C.dough, tint: 'all', round: 1 }, { g: 'torus', r: 0.145, t: 0.009, p: [0, 0.006, 0], c: C.dough, tint: 'all' }],
  },
  pizza: {
    n: ['Pizza Margherita', 'Pizza Margherita'], food: 1, mass: 0.4, ...FOOD_PHYS,
    col: [cyl(0.011, 0.152)], cook: { t: { bake: 11 }, to: 0xb98040 },
    parts: pizzaParts([{ g: 'ball', r: 0.014, sc: [1.4, 0.3, 0.8], p: [0.03, 0.021, -0.01], c: C.lettuceDark }, { g: 'ball', r: 0.014, sc: [0.8, 0.3, 1.4], p: [-0.05, 0.021, 0.05], c: C.lettuceDark }]),
  },
  pizzafunghi: {
    n: ['Pizza Funghi', 'Pizza Funghi'], food: 1, mass: 0.42, ...FOOD_PHYS,
    col: [cyl(0.011, 0.152)], cook: { t: { bake: 11 }, to: 0xb98040 },
    parts: pizzaParts([[0.06, 0.0], [-0.03, 0.07], [-0.07, -0.02], [0.02, -0.06], [0.09, 0.06]].map(([x, z]) => ({ g: 'cyl', r: 0.024, h: 0.008, p: [x, 0.022, z], sc: [1, 1, 0.75], c: C.mushroomCooked }))),
  },
  pizzasalami: {
    n: ['Pizza Salami', 'Pizza Salami'], food: 1, mass: 0.42, ...FOOD_PHYS,
    col: [cyl(0.011, 0.152)], cook: { t: { bake: 11 }, to: 0xb98040 },
    parts: pizzaParts([[0.06, 0.0], [-0.03, 0.07], [-0.07, -0.02], [0.02, -0.06], [0.09, 0.06], [-0.01, 0.01]].map(([x, z]) => ({ g: 'cyl', r: 0.021, h: 0.008, p: [x, 0.022, z], c: 0xb0402e }))),
  },
  // ======================= made with tools =======================
  mash: {        // boiled potato + masher
    n: ['Potatismos', 'Mashed potato'], ...BLOB, mass: 0.06,
    col: [ball(0.028)], parts: [{ g: 'ball', r: 0.033, sc: [1.15, 0.8, 1.15], p: [0, 0, 0], c: 0xf7e7a6, flat: 1 }],
  },
  gratedcheese: { // cheese + grater
    n: ['Riven ost', 'Grated cheese'], ...BLOB, mass: 0.02,
    col: [ball(0.015)], parts: [{ g: 'box', sz: [0.035, 0.006, 0.006], p: [0, 0, 0], r3: [0, 0.5, 0.3], c: C.cheese }, { g: 'box', sz: [0.03, 0.006, 0.006], p: [0.004, 0.006, 0.004], r3: [0, -0.9, -0.2], c: C.cheese }, { g: 'box', sz: [0.03, 0.006, 0.006], p: [-0.004, -0.004, -0.004], r3: [0.3, 2.0, 0], c: 0xf9d45c }],
  },
  pancake: {     // a batter blob landing in a hot pan
    n: ['Pannkaka', 'Pancake'], food: 1, mass: 0.05, ...FOOD_PHYS,
    col: [cyl(0.006, 0.072)],
    cook: { t: { fry: 5 }, sides: 2, to: C.pancake },
    parts: [{ g: 'cyl', r: 0.075, h: 0.006, p: [0, 0.003, 0], c: C.batter, tint: 'a' }, { g: 'cyl', r: 0.075, h: 0.006, p: [0, -0.003, 0], c: C.batter, tint: 'b' }],
  },
  // ======================= squeeze-bottle blobs =======================
  ketchupblob: { n: ['Ketchup', 'Ketchup'], ...BLOB, mass: 0.03, col: [ball(0.018)], parts: [{ g: 'ball', r: 0.021, sc: [1.2, 0.7, 1.2], p: [0, 0, 0], c: 0xc4200f }] },
  mustardblob: { n: ['Senap', 'Mustard'], ...BLOB, mass: 0.03, col: [ball(0.018)], parts: [{ g: 'ball', r: 0.021, sc: [1.2, 0.7, 1.2], p: [0, 0, 0], c: 0xe8b80c }] },
  jamblob: { n: ['Sylt', 'Jam'], ...BLOB, mass: 0.03, col: [ball(0.018)], parts: [{ g: 'ball', r: 0.021, sc: [1.2, 0.7, 1.2], p: [0, 0, 0], c: C.jam }] },
  batterblob: { n: ['Pannkakssmet', 'Pancake batter'], ...BLOB, mass: 0.04, onHot: 'pancake', col: [ball(0.022)], parts: [{ g: 'ball', r: 0.026, sc: [1.2, 0.7, 1.2], p: [0, 0, 0], c: C.batter }] },
};
