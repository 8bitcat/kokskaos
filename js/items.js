// Kökskaos — item definitions (physics colliders + procedural cartoon visuals), all data-driven.
// Every loose object in the kitchen is one of these. Body origin = visual origin.
import * as THREE from '../vendor/three.module.js';
import { COOK } from './config.js';

import { box, cyl, ball, cap, ring, CAPX, C, FOOD_PHYS } from './itemkit.js';
import { UTENSILS } from './items_utensils.js';
import { FOODS } from './items_food.js';
export { C };

// ---------------------------------------------------------------- item table
// cook.t = seconds to reach "done" per method. sides:2 => top/bottom cook separately in a pan.
export const ITEMS = {
  // ======================= cookware & tools =======================
  pan: {
    n: ['Stekpanna', 'Frying pan'], mass: 1.1, mat: 'metal', friction: 0.55,
    col: [cyl(0.008, 0.175, [0, 0.008, 0], null, 0.62), ...ring(12, 0.165, 0.014, 0.062, 0.014, 0.26),
      box(0.12, 0.011, 0.02, [0.295, 0.05, 0], null, 0.12)],
    container: { r: 0.165, y0: 0.012, h: 0.2, heat: true, floorY: 0.016 },
    parts: [
      { g: 'cyl', r: 0.178, h: 0.016, p: [0, 0.008, 0], c: C.iron },
      { g: 'tube', r: 0.178, h: 0.05, p: [0, 0.04, 0], c: C.iron },
      { g: 'cyl', r: 0.165, h: 0.004, p: [0, 0.018, 0], c: C.ironLight },
      { g: 'torus', r: 0.178, t: 0.008, p: [0, 0.064, 0], c: C.ironLight },
      { g: 'box', sz: [0.09, 0.018, 0.034], p: [0.215, 0.05, 0], c: C.iron },
      { g: 'cap', r: 0.02, len: 0.13, p: [0.335, 0.05, 0], r3: CAPX, c: C.red },
    ],
  },
  saucepan: {
    n: ['Kastrull', 'Saucepan'], mass: 1.0, mat: 'metal', friction: 0.5,
    col: [cyl(0.008, 0.125, [0, 0.008, 0], null, 0.6), ...ring(10, 0.115, 0.014, 0.13, 0.014, 0.3),
      box(0.1, 0.011, 0.018, [0.225, 0.11, 0], null, 0.1)],
    container: { r: 0.115, y0: 0.012, h: 0.24, heat: true, fill: true, floorY: 0.016, waterH: 0.1 },
    parts: [
      { g: 'cyl', r: 0.128, h: 0.016, p: [0, 0.008, 0], c: C.steelDark },
      { g: 'tube', r: 0.128, h: 0.118, p: [0, 0.073, 0], c: C.steel },
      { g: 'torus', r: 0.128, t: 0.007, p: [0, 0.132, 0], c: C.steelDark },
      { g: 'cap', r: 0.017, len: 0.17, p: [0.225, 0.11, 0], r3: CAPX, c: C.black },
    ],
  },
  pot: {
    n: ['Stor gryta', 'Stock pot'], mass: 1.9, mat: 'metal', friction: 0.5,
    col: [cyl(0.009, 0.19, [0, 0.009, 0], null, 0.55), ...ring(12, 0.178, 0.016, 0.24, 0.016, 0.39),
      box(0.03, 0.012, 0.045, [0.225, 0.19, 0], null, 0.03), box(0.03, 0.012, 0.045, [-0.225, 0.19, 0], null, 0.03)],
    container: { r: 0.178, y0: 0.014, h: 0.36, heat: true, fill: true, floorY: 0.018, waterH: 0.2 },
    parts: [
      { g: 'cyl', r: 0.194, h: 0.018, p: [0, 0.009, 0], c: C.steelDark },
      { g: 'tube', r: 0.194, h: 0.226, p: [0, 0.129, 0], c: C.steel },
      { g: 'torus', r: 0.194, t: 0.009, p: [0, 0.243, 0], c: C.steelDark },
      { g: 'box', sz: [0.06, 0.022, 0.09], p: [0.225, 0.19, 0], c: C.black },
      { g: 'box', sz: [0.06, 0.022, 0.09], p: [-0.225, 0.19, 0], c: C.black },
    ],
  },
  tray: {
    n: ['Ugnsplåt', 'Baking tray'], mass: 0.8, mat: 'metal', friction: 0.6,
    col: [box(0.22, 0.007, 0.16, [0, 0.007, 0], null, 0.7), box(0.22, 0.016, 0.008, [0, 0.028, 0.152], null, 0.075),
      box(0.22, 0.016, 0.008, [0, 0.028, -0.152], null, 0.075), box(0.008, 0.016, 0.16, [0.212, 0.028, 0], null, 0.075),
      box(0.008, 0.016, 0.16, [-0.212, 0.028, 0], null, 0.075)],
    container: { bx: 0.21, bz: 0.15, y0: 0.01, h: 0.22, floorY: 0.014 },
    parts: [
      { g: 'box', sz: [0.44, 0.014, 0.32], p: [0, 0.007, 0], c: C.iron },
      { g: 'box', sz: [0.44, 0.032, 0.016], p: [0, 0.028, 0.152], c: C.ironLight },
      { g: 'box', sz: [0.44, 0.032, 0.016], p: [0, 0.028, -0.152], c: C.ironLight },
      { g: 'box', sz: [0.016, 0.032, 0.32], p: [0.212, 0.028, 0], c: C.ironLight },
      { g: 'box', sz: [0.016, 0.032, 0.32], p: [-0.212, 0.028, 0], c: C.ironLight },
    ],
  },
  basket: {
    n: ['Fritöskorg', 'Fry basket'], mass: 0.7, mat: 'metal', friction: 0.6,
    col: [box(0.13, 0.006, 0.095, [0, 0.006, 0], null, 0.5), box(0.13, 0.065, 0.006, [0, 0.07, 0.089], null, 0.1),
      box(0.13, 0.065, 0.006, [0, 0.07, -0.089], null, 0.1), box(0.006, 0.065, 0.095, [0.124, 0.07, 0], null, 0.1),
      box(0.006, 0.065, 0.095, [-0.124, 0.07, 0], null, 0.1), box(0.13, 0.012, 0.016, [0.25, 0.35, 0], null, 0.08),
      box(0.012, 0.11, 0.016, [0.13, 0.24, 0], null, 0.02)],
    container: { bx: 0.125, bz: 0.09, y0: 0.008, h: 0.22, floorY: 0.012 },
    parts: [
      { g: 'box', sz: [0.26, 0.012, 0.19], p: [0, 0.006, 0], c: C.steelDark, m: 'mesh' },
      { g: 'box', sz: [0.26, 0.13, 0.008], p: [0, 0.07, 0.089], c: C.steel, m: 'mesh' },
      { g: 'box', sz: [0.26, 0.13, 0.008], p: [0, 0.07, -0.089], c: C.steel, m: 'mesh' },
      { g: 'box', sz: [0.008, 0.13, 0.19], p: [0.124, 0.07, 0], c: C.steel, m: 'mesh' },
      { g: 'box', sz: [0.008, 0.13, 0.19], p: [-0.124, 0.07, 0], c: C.steel, m: 'mesh' },
      { g: 'box', sz: [0.02, 0.23, 0.02], p: [0.13, 0.24, 0], c: C.steelDark },
      { g: 'cap', r: 0.018, len: 0.2, p: [0.26, 0.35, 0], r3: CAPX, c: C.red },
    ],
  },
  plate: {
    n: ['Tallrik', 'Plate'], mass: 0.45, friction: 0.9, sfx: 'clink',
    col: [cyl(0.008, 0.15, [0, 0.008, 0], null, 0.8), ...ring(10, 0.138, 0.014, 0.036, 0.014, 0.2)],
    container: { r: 0.15, y0: 0.01, h: 0.3, floorY: 0.016, serve: true },
    parts: [
      { g: 'lathe', pts: [[0, 0.002], [0.1, 0.002], [0.155, 0.03], [0.158, 0.038], [0.15, 0.036], [0.1, 0.016], [0, 0.016]], c: C.white },
      { g: 'torus', r: 0.154, t: 0.006, p: [0, 0.035, 0], c: 0x4aa3df },
    ],
  },
  bowl: {
    n: ['Skål', 'Bowl'], mass: 0.45, friction: 0.9, sfx: 'clink',
    col: [cyl(0.008, 0.085, [0, 0.008, 0], null, 0.7), ...ring(10, 0.118, 0.014, 0.095, 0.014, 0.3)],
    container: { r: 0.125, y0: 0.01, h: 0.3, floorY: 0.016, serve: true },
    parts: [
      { g: 'lathe', pts: [[0, 0.002], [0.08, 0.002], [0.125, 0.05], [0.135, 0.098], [0.122, 0.098], [0.11, 0.05], [0.07, 0.016], [0, 0.016]], c: C.white },
      { g: 'torus', r: 0.129, t: 0.006, p: [0, 0.098, 0], c: 0xf08a24 },
    ],
  },
  board: {
    n: ['Skärbräda', 'Cutting board'], mass: 1.6, friction: 0.9, sfx: 'wood',
    col: [box(0.23, 0.016, 0.16, [0, 0.016, 0])],
    parts: [{ g: 'box', sz: [0.46, 0.032, 0.32], p: [0, 0.016, 0], c: C.wood, round: 1 },
      { g: 'box', sz: [0.4, 0.004, 0.26], p: [0, 0.0325, 0], c: 0xd9a566 }],
  },
  knife: {
    n: ['Kockkniv', "Chef's knife"], mass: 0.25, mat: 'metal', friction: 0.5, blade: 1,
    col: [box(0.06, 0.013, 0.012, [-0.06, 0, 0], null, 0.6), box(0.105, 0.024, 0.005, [0.105, -0.004, 0], null, 0.4, { blade: 1 })],
    parts: [{ g: 'cap', r: 0.015, len: 0.09, p: [-0.06, 0, 0], r3: CAPX, c: C.black },
      { g: 'blade', len: 0.21, h: 0.05, p: [0, 0.02, 0], c: C.steel }],
  },
  cleaver: {
    n: ['Köttyxa', 'Cleaver'], mass: 0.45, mat: 'metal', friction: 0.5, blade: 1,
    col: [box(0.06, 0.014, 0.013, [-0.06, 0, 0], null, 0.4), box(0.09, 0.055, 0.006, [0.09, -0.02, 0], null, 0.6, { blade: 1 })],
    parts: [{ g: 'cap', r: 0.016, len: 0.09, p: [-0.06, 0, 0], r3: CAPX, c: C.woodDark },
      { g: 'box', sz: [0.18, 0.11, 0.008], p: [0.09, -0.02, 0], c: C.steel },
      { g: 'box', sz: [0.18, 0.012, 0.012], p: [0.09, 0.034, 0], c: C.steelDark }],
  },
  spatula: {
    n: ['Stekspade', 'Spatula'], mass: 0.18, friction: 0.6,
    col: [box(0.13, 0.01, 0.011, [-0.13, 0.012, 0], null, 0.6), box(0.055, 0.005, 0.045, [0.05, 0, 0], null, 0.4)],
    parts: [{ g: 'cap', r: 0.011, len: 0.24, p: [-0.13, 0.012, 0], r3: CAPX, c: C.black },
      { g: 'box', sz: [0.11, 0.008, 0.09], p: [0.05, 0, 0], c: C.steel, round: 1 }],
  },
  spoon: {
    n: ['Träslev', 'Wooden spoon'], mass: 0.12, friction: 0.8, sfx: 'wood',
    col: [box(0.13, 0.009, 0.009, [-0.1, 0, 0], null, 0.6), box(0.04, 0.007, 0.028, [0.065, 0, 0], null, 0.4)],
    parts: [{ g: 'cap', r: 0.009, len: 0.24, p: [-0.1, 0, 0], r3: CAPX, c: C.wood },
      { g: 'ball', r: 0.04, sc: [1, 0.22, 0.7], p: [0.065, 0, 0], c: C.wood }],
  },
  rollingpin: {
    n: ['Kavel', 'Rolling pin'], mass: 0.6, friction: 0.7, sfx: 'wood',
    col: [cap(0.11, 0.032, [0, 0, 0], CAPX, 0.9), cap(0.19, 0.012, [0, 0, 0], CAPX, 0.1)],
    parts: [{ g: 'cap', r: 0.032, len: 0.22, p: [0, 0, 0], r3: CAPX, c: C.wood },
      { g: 'cap', r: 0.013, len: 0.4, p: [0, 0, 0], r3: CAPX, c: C.woodDark }],
  },
  jar: {
    n: ['Mixerkanna', 'Blender jar'], mass: 0.6, friction: 0.6, sfx: 'clink',
    col: [cyl(0.009, 0.085, [0, 0.009, 0], null, 0.6), ...ring(8, 0.078, 0.016, 0.25, 0.012, 0.35),
      box(0.012, 0.07, 0.012, [0.125, 0.14, 0], null, 0.05)],
    container: { r: 0.08, y0: 0.012, h: 0.3, floorY: 0.018, blend: true },
    parts: [
      { g: 'cyl', r: 0.09, h: 0.02, p: [0, 0.01, 0], c: C.black },
      { g: 'tube', r: 0.09, h: 0.235, p: [0, 0.135, 0], c: C.glass, m: 'glass' },
      { g: 'torus', r: 0.09, t: 0.006, p: [0, 0.252, 0], c: C.black },
      { g: 'box', sz: [0.024, 0.14, 0.024], p: [0.125, 0.14, 0], c: C.black },
      { g: 'box', sz: [0.05, 0.02, 0.02], p: [0.105, 0.2, 0], c: C.black },
      { g: 'box', sz: [0.05, 0.02, 0.02], p: [0.105, 0.08, 0], c: C.black },
      { g: 'box', sz: [0.1, 0.008, 0.02], p: [0, 0.03, 0], c: C.steel },
    ],
  },
  salt: {
    n: ['Saltkar', 'Salt shaker'], mass: 0.15, friction: 0.7, sfx: 'clink',
    col: [cyl(0.05, 0.028, [0, 0.05, 0])],
    parts: [{ g: 'cyl', r: 0.028, rt: 0.022, h: 0.085, p: [0, 0.0425, 0], c: C.white }, { g: 'hemi', r: 0.023, p: [0, 0.085, 0], c: C.steel, flip: 1 }],
  },
  pepper: {
    n: ['Pepparkvarn', 'Pepper mill'], mass: 0.2, friction: 0.7, sfx: 'wood',
    col: [cyl(0.075, 0.028, [0, 0.075, 0])],
    parts: [{ g: 'cyl', r: 0.03, rt: 0.02, h: 0.1, p: [0, 0.05, 0], c: C.woodDark }, { g: 'ball', r: 0.028, p: [0, 0.12, 0], c: C.woodDark },
      { g: 'cyl', r: 0.024, h: 0.012, p: [0, 0.1, 0], c: C.steel }],
  },

  // ======================= raw ingredients =======================
  steak: {
    n: ['Biff', 'Steak'], food: 1, mass: 0.28, ...FOOD_PHYS,
    col: [box(0.085, 0.02, 0.06, [0, 0, 0])],
    cook: { t: { fry: 11, bake: 20, deepfry: 12 }, sides: 2, to: C.beefCooked },
    parts: [{ g: 'ball', r: 0.09, sc: [1, 0.22, 0.72], p: [0, 0.009, 0], c: C.beef, tint: 'a' },
      { g: 'ball', r: 0.09, sc: [1, 0.22, 0.72], p: [0, -0.009, 0], c: C.beef, tint: 'b' },
      { g: 'ball', r: 0.03, sc: [1.6, 0.3, 0.5], p: [-0.02, 0.022, 0.01], c: 0xf3d3c6, tint: 'a', fat: 1 }],
  },
  patty: {
    n: ['Burgare', 'Burger patty'], food: 1, mass: 0.16, ...FOOD_PHYS,
    col: [cyl(0.016, 0.062, [0, 0, 0])],
    cook: { t: { fry: 9, bake: 18, deepfry: 10 }, sides: 2, to: 0x5e3a22 },
    parts: [{ g: 'cyl', r: 0.064, h: 0.017, p: [0, 0.0085, 0], c: C.patty, tint: 'a', round: 1 },
      { g: 'cyl', r: 0.064, h: 0.017, p: [0, -0.0085, 0], c: C.patty, tint: 'b', round: 1 }],
  },
  chicken: {
    n: ['Kycklingklubba', 'Chicken drumstick'], food: 1, mass: 0.3, ...FOOD_PHYS,
    col: [ball(0.055, [0.02, 0, 0], 0.8), cap(0.05, 0.018, [-0.075, 0, 0], CAPX, 0.2)],
    cook: { t: { bake: 22, deepfry: 14, fry: 20 }, to: C.chickenCooked },
    parts: [{ g: 'ball', r: 0.058, sc: [1.25, 0.95, 0.95], p: [0.025, 0, 0], c: C.chicken, tint: 'all' },
      { g: 'cap', r: 0.014, len: 0.09, p: [-0.075, 0, 0], r3: CAPX, c: C.white },
      { g: 'ball', r: 0.02, p: [-0.13, 0, 0.01], c: C.white }, { g: 'ball', r: 0.02, p: [-0.13, 0, -0.01], c: C.white }],
  },
  fish: {
    n: ['Fiskfilé', 'Fish fillet'], food: 1, mass: 0.2, ...FOOD_PHYS,
    col: [box(0.1, 0.016, 0.042, [0, 0, 0])],
    cook: { t: { deepfry: 10, fry: 9, bake: 16 }, sides: 2, to: C.fishCooked },
    parts: [{ g: 'ball', r: 0.1, sc: [1.05, 0.16, 0.45], p: [0, 0.007, 0], c: C.fish, tint: 'a' },
      { g: 'ball', r: 0.1, sc: [1.05, 0.16, 0.45], p: [0, -0.007, 0], c: 0xcfd8dc, tint: 'b' }],
  },
  sausage: {
    n: ['Korv', 'Sausage'], food: 1, mass: 0.1, ...FOOD_PHYS, angDamp: 1.6,
    col: [cap(0.05, 0.02, [0, 0, 0], CAPX)],
    cook: { t: { fry: 8, deepfry: 8, bake: 14, boil: 8 }, to: C.sausageCooked },
    parts: [{ g: 'cap', r: 0.021, len: 0.1, p: [0, 0, 0], r3: CAPX, c: C.sausage, tint: 'all' }],
  },
  egg: {
    n: ['Ägg', 'Egg'], food: 1, mass: 0.07, friction: 0.7, rest: 0.1, linDamp: 0.1, angDamp: 0.8, fragile: 'eggblob',
    col: [ball(0.03)],
    parts: [{ g: 'ball', r: 0.03, sc: [1, 1.28, 1], p: [0, 0, 0], c: C.egg }],
  },
  eggblob: {
    n: ['Ägg', 'Egg'], cookedName: ['Stekt ägg', 'Fried egg'], food: 1, mass: 0.07, ...FOOD_PHYS, linDamp: 0.6,
    col: [cyl(0.009, 0.06, [0, 0, 0])],
    cook: { t: { fry: 7, bake: 12 }, to: 0xffffff, rawAlpha: 1 },
    parts: [{ g: 'ball', r: 0.066, sc: [1, 0.12, 0.92], p: [0, 0, 0], c: 0xf3ecd9, tint: 'all' },
      { g: 'ball', r: 0.024, sc: [1, 0.6, 1], p: [0.008, 0.008, 0.004], c: C.yolk }],
  },
  potato: {
    n: ['Potatis', 'Potato'], food: 1, mass: 0.2, friction: 0.9, rest: 0.25, linDamp: 0.12, angDamp: 1.4,
    col: [ball(0.048)], cut: { into: 'fry', n: 6 },
    cook: { t: { boil: 13, bake: 20 }, to: 0xe8c878 },
    parts: [{ g: 'ball', r: 0.05, sc: [1.3, 0.95, 1], p: [0, 0, 0], c: C.potato, tint: 'all' }],
  },
  fry: {
    n: ['Potatisstav', 'Potato stick'], cookedName: ['Pommes frites', 'French fries'], food: 1, mass: 0.04, ...FOOD_PHYS,
    col: [box(0.046, 0.0095, 0.0095)],
    cook: { t: { deepfry: 9, bake: 18, fry: 16 }, to: C.fryCooked },
    parts: [{ g: 'box', sz: [0.092, 0.019, 0.019], p: [0, 0, 0], c: C.potatoIn, tint: 'all' }],
  },
  tomato: {
    n: ['Tomat', 'Tomato'], food: 1, mass: 0.13, friction: 0.9, rest: 0.3, linDamp: 0.12, angDamp: 1.4,
    col: [ball(0.045)], cut: { into: 'tomatoslice', n: 4 }, blend: { into: 'sauce', n: 3 },
    parts: [{ g: 'ball', r: 0.047, sc: [1, 0.86, 1], p: [0, 0, 0], c: C.tomato },
      { g: 'cone', r: 0.016, h: 0.014, p: [0, 0.042, 0], c: C.lettuceDark }],
  },
  tomatoslice: {
    n: ['Tomatskiva', 'Tomato slice'], food: 1, mass: 0.04, ...FOOD_PHYS, blend: { into: 'sauce', n: 1 },
    col: [cyl(0.007, 0.044)],
    parts: [{ g: 'cyl', r: 0.045, h: 0.013, p: [0, 0, 0], c: C.tomato }, { g: 'cyl', r: 0.034, h: 0.0145, p: [0, 0, 0], c: 0xf46a55 }],
  },
  lettuce: {
    n: ['Salladshuvud', 'Lettuce'], food: 1, mass: 0.2, friction: 0.9, rest: 0.25, linDamp: 0.15, angDamp: 1.4,
    col: [ball(0.085)], cut: { into: 'lettuceleaf', n: 5 },
    parts: [{ g: 'ball', r: 0.088, sc: [1, 0.9, 1], p: [0, 0, 0], c: C.lettuce, flat: 1 },
      { g: 'ball', r: 0.07, sc: [1.1, 0.8, 1.1], p: [0.01, 0.03, 0], c: C.lettuceDark, flat: 1 }],
  },
  lettuceleaf: {
    n: ['Salladsblad', 'Lettuce leaf'], food: 1, mass: 0.03, ...FOOD_PHYS, linDamp: 0.5,
    col: [cyl(0.006, 0.065)],
    parts: [{ g: 'ball', r: 0.07, sc: [1, 0.12, 0.85], p: [0, 0, 0], c: C.lettuce, flat: 1 },
      { g: 'box', sz: [0.1, 0.012, 0.008], p: [0, 0.003, 0], c: 0xc9f0a0 }],
  },
  onion: {
    n: ['Lök', 'Onion'], food: 1, mass: 0.13, friction: 0.9, rest: 0.3, linDamp: 0.12, angDamp: 1.4,
    col: [ball(0.045)], cut: { into: 'onionring', n: 4 },
    parts: [{ g: 'ball', r: 0.046, sc: [1, 0.95, 1], p: [0, 0, 0], c: C.onion }, { g: 'cone', r: 0.014, h: 0.03, p: [0, 0.05, 0], c: 0xb98a4a }],
  },
  onionring: {
    n: ['Lökring', 'Onion ring'], cookedName: ['Friterad lökring', 'Fried onion ring'], food: 1, mass: 0.035, ...FOOD_PHYS,
    col: [cyl(0.008, 0.042)],
    cook: { t: { deepfry: 8, fry: 12 }, to: 0xe0a030 },
    parts: [{ g: 'torus', r: 0.032, t: 0.011, p: [0, 0, 0], c: C.onionIn, tint: 'all' }],
  },
  carrot: {
    n: ['Morot', 'Carrot'], food: 1, mass: 0.1, ...FOOD_PHYS, angDamp: 1.4,
    col: [cap(0.06, 0.02, [0, 0, 0], CAPX)], cut: { into: 'carrotcoin', n: 5 },
    cook: { t: { boil: 10, bake: 16 }, to: 0xe8a040 },
    parts: [{ g: 'cone', r: 0.023, h: 0.17, p: [0, 0, 0], r3: [0, 0, Math.PI / 2], c: C.carrot, tint: 'all' },
      { g: 'cone', r: 0.018, h: 0.05, p: [-0.1, 0, 0], r3: [0, 0, Math.PI / 2], c: C.lettuceDark }],
  },
  carrotcoin: {
    n: ['Morotsslant', 'Carrot coin'], food: 1, mass: 0.03, ...FOOD_PHYS,
    col: [cyl(0.007, 0.022)],
    cook: { t: { boil: 8, fry: 10, bake: 14 }, to: 0xe8a040 },
    parts: [{ g: 'cyl', r: 0.023, h: 0.014, p: [0, 0, 0], c: C.carrot, tint: 'all' }],
  },
  cucumber: {
    n: ['Gurka', 'Cucumber'], food: 1, mass: 0.15, ...FOOD_PHYS, angDamp: 1.4,
    col: [cap(0.08, 0.023, [0, 0, 0], CAPX)], cut: { into: 'cucumberslice', n: 6 },
    parts: [{ g: 'cap', r: 0.024, len: 0.16, p: [0, 0, 0], r3: CAPX, c: C.cucumber }],
  },
  cucumberslice: {
    n: ['Gurkskiva', 'Cucumber slice'], food: 1, mass: 0.03, ...FOOD_PHYS,
    col: [cyl(0.006, 0.024)],
    parts: [{ g: 'cyl', r: 0.025, h: 0.012, p: [0, 0, 0], c: C.cucumber }, { g: 'cyl', r: 0.02, h: 0.0135, p: [0, 0, 0], c: C.cucumberIn }],
  },
  cheese: {
    n: ['Ost', 'Cheese'], food: 1, mass: 0.2, ...FOOD_PHYS,
    col: [box(0.06, 0.035, 0.045)], cut: { into: 'cheeseslice', n: 4 },
    parts: [{ g: 'box', sz: [0.12, 0.07, 0.09], p: [0, 0, 0], c: C.cheese, round: 1 },
      { g: 'cyl', r: 0.012, h: 0.092, p: [0.02, 0.01, 0], r3: [Math.PI / 2, 0, 0], c: 0xd9a21e }, { g: 'cyl', r: 0.008, h: 0.092, p: [-0.03, -0.012, 0], r3: [Math.PI / 2, 0, 0], c: 0xd9a21e }],
  },
  cheeseslice: {
    n: ['Ostskiva', 'Cheese slice'], food: 1, mass: 0.03, ...FOOD_PHYS,
    col: [box(0.045, 0.006, 0.045)],
    parts: [{ g: 'box', sz: [0.09, 0.011, 0.09], p: [0, 0, 0], c: C.cheese }],
  },
  bun: {
    n: ['Hamburgerbröd', 'Burger bun'], food: 1, mass: 0.09, ...FOOD_PHYS, rest: 0.2,
    col: [cyl(0.035, 0.068)], cut: { into: ['bunbottom', 'buntop'] },
    parts: [{ g: 'cyl', r: 0.07, h: 0.026, p: [0, -0.022, 0], c: C.bun, round: 1 },
      { g: 'hemi', r: 0.07, sc: [1, 0.62, 1], p: [0, -0.004, 0], c: C.bun, flip: 1 }],
  },
  bunbottom: {
    n: ['Bröd (botten)', 'Bun bottom'], food: 1, mass: 0.04, ...FOOD_PHYS,
    col: [cyl(0.013, 0.068)],
    parts: [{ g: 'cyl', r: 0.07, h: 0.024, p: [0, 0, 0], c: C.bun, round: 1 }, { g: 'cyl', r: 0.064, h: 0.0255, p: [0, 0.001, 0], c: C.bunIn }],
  },
  buntop: {
    n: ['Bröd (lock)', 'Bun top'], food: 1, mass: 0.05, ...FOOD_PHYS,
    col: [cyl(0.02, 0.068)],
    parts: [{ g: 'hemi', r: 0.07, sc: [1, 0.6, 1], p: [0, -0.02, 0], c: C.bun, flip: 1 }, { g: 'cyl', r: 0.064, h: 0.004, p: [0, -0.019, 0], c: C.bunIn },
      { g: 'ball', r: 0.005, p: [0.02, 0.018, 0.01], c: C.cream }, { g: 'ball', r: 0.005, p: [-0.025, 0.014, -0.015], c: C.cream }, { g: 'ball', r: 0.005, p: [0.0, 0.02, -0.02], c: C.cream }],
  },
  spaghetti: {
    n: ['Spaghetti (torr)', 'Spaghetti (dry)'], food: 1, mass: 0.04, friction: 0.8, rest: 0.05, linDamp: 0.15, angDamp: 0.8,
    col: [box(0.17, 0.0085, 0.0085)],
    cook: { t: { boil: 10 }, to: C.pastaCooked, becomes: 'noodle' },
    parts: [{ g: 'cap', r: 0.0085, len: 0.325, p: [0, 0, 0], r3: CAPX, c: C.pasta, tint: 'all' }],
  },
  noodle: {   // one segment of a floppy cooked strand (4 segments chained with ball joints)
    n: ['Spaghetti', 'Spaghetti'], food: 1, mass: 0.025, friction: 1.0, rest: 0.0, linDamp: 0.6, angDamp: 1.2, chainLen: 4, segLen: 0.085,
    col: [cap(0.034, 0.0115, [0, 0, 0], CAPX)],
    cook: { t: { boil: 10 }, to: 0xefe0a8 },
    parts: [{ g: 'cap', r: 0.012, len: 0.085, p: [0, 0, 0], r3: CAPX, c: C.pastaCooked, tint: 'all' }],
  },
  sauce: {
    n: ['Tomatsås', 'Tomato sauce'], food: 1, mass: 0.05, friction: 1.2, rest: 0.0, linDamp: 1.2, angDamp: 3,
    col: [ball(0.026)],
    parts: [{ g: 'ball', r: 0.03, sc: [1.15, 0.75, 1.15], p: [0, 0, 0], c: C.sauce }],
  },
  mush: {
    n: ['Sörja', 'Mush'], food: 1, mass: 0.05, friction: 1.2, rest: 0.0, linDamp: 1.2, angDamp: 3,
    col: [ball(0.026)],
    parts: [{ g: 'ball', r: 0.03, sc: [1.15, 0.75, 1.15], p: [0, 0, 0], c: C.mush }],
  },
};
Object.assign(ITEMS, UTENSILS, FOODS);
// how the core ingredients react to the new tools / extra cooking
ITEMS.sausage.cut = { into: 'sausagecoin', n: 5 };
ITEMS.sauce.cook = { t: { fry: 6, boil: 6, bake: 10 }, to: 0xa82114 };
ITEMS.sauce.parts[0].tint = 'all';
ITEMS.potato.use = { mash: { into: 'mash', n: 3, cooked: 1 } };
ITEMS.steak.use = { pound: { into: 'schnitzel', n: 1 } };
ITEMS.cheese.use = { grate: { into: 'gratedcheese', n: 2, uses: 5 } };
for (const k in ITEMS) ITEMS[k].kind = k;
export const KINDS = Object.keys(ITEMS);
export const METHODS = ['none', 'fry', 'boil', 'deepfry', 'bake', 'grill'];

// bounding radius (used for grab assist + bonk checks)
for (const k in ITEMS) {
  let r = 0.02;
  for (const c of ITEMS[k].col) {
    const e = c.s === 'box' ? Math.hypot(c.hx, c.hy, c.hz) : c.s === 'ball' ? c.rad : Math.hypot(c.hh + (c.s === 'cap' ? c.rad : 0), c.rad);
    r = Math.max(r, Math.hypot(c.p[0], c.p[1], c.p[2]) + e);
  }
  ITEMS[k].bound = r;
}

// ---------------------------------------------------------------- physics construction
const _e = new THREE.Euler(), _q = new THREE.Quaternion();
export function eulerQuat(r) { _e.set(r[0], r[1], r[2]); _q.setFromEuler(_e); return { x: _q.x, y: _q.y, z: _q.z, w: _q.w }; }

export function colliderDesc(R, c) {
  let d;
  if (c.s === 'box') d = R.ColliderDesc.cuboid(c.hx, c.hy, c.hz);
  else if (c.s === 'cyl') d = R.ColliderDesc.cylinder(c.hh, c.rad);
  else if (c.s === 'ball') d = R.ColliderDesc.ball(c.rad);
  else d = R.ColliderDesc.capsule(c.hh, c.rad);
  d.setTranslation(c.p[0], c.p[1], c.p[2]);
  if (c.r) d.setRotation(eulerQuat(c.r));
  return d;
}

// attaches all colliders of an item def to a body. returns {colliders, blades}
export function attachColliders(R, world, body, def, groups) {
  const total = def.col.reduce((s, c) => s + (c.m || 1), 0), cols = [], blades = [];
  for (const c of def.col) {
    const d = colliderDesc(R, c).setMass(def.mass * (c.m || 1) / total)
      .setFriction(def.friction ?? 0.7).setRestitution(def.rest ?? 0.12).setCollisionGroups(groups);
    d.setFrictionCombineRule(R.CoefficientCombineRule.Max);
    if (c.blade || def.fragile || def.tool) d.setActiveEvents(R.ActiveEvents.COLLISION_EVENTS);
    const col = world.createCollider(d, body);
    cols.push(col);
    if (c.blade) blades.push(col.handle);
  }
  return { cols, blades };
}

// ---------------------------------------------------------------- visuals
let _grad = null;
export function toonGradient() {
  if (_grad) return _grad;
  const d = new Uint8Array([90, 90, 90, 255, 150, 150, 150, 255, 215, 215, 215, 255, 255, 255, 255, 255]);
  _grad = new THREE.DataTexture(d, 4, 1, THREE.RGBAFormat);
  _grad.minFilter = _grad.magFilter = THREE.NearestFilter; _grad.needsUpdate = true;
  return _grad;
}
let _meshTex = null;
function wireTexture() {
  if (_meshTex) return _meshTex;
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const g = cv.getContext('2d'); g.clearRect(0, 0, 64, 64); g.strokeStyle = '#fff'; g.lineWidth = 7;
  g.strokeRect(0, 0, 64, 64);
  _meshTex = new THREE.CanvasTexture(cv); _meshTex.wrapS = _meshTex.wrapT = THREE.RepeatWrapping; _meshTex.repeat.set(7, 5);
  _meshTex.colorSpace = THREE.SRGBColorSpace;
  return _meshTex;
}
const matCache = new Map();
export function mat(color, type = 'toon') {
  const key = type + color;
  let m = matCache.get(key);
  if (m) return m;
  if (type === 'glass') m = new THREE.MeshToonMaterial({ color, gradientMap: toonGradient(), transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false });
  else if (type === 'mesh') m = new THREE.MeshToonMaterial({ color, gradientMap: toonGradient(), alphaMap: wireTexture(), alphaTest: 0.5, side: THREE.DoubleSide });
  else if (type === 'glow') m = new THREE.MeshBasicMaterial({ color });
  else if (type === 'double') m = new THREE.MeshToonMaterial({ color, gradientMap: toonGradient(), side: THREE.DoubleSide });
  else if (type === 'flat') m = new THREE.MeshToonMaterial({ color, gradientMap: toonGradient(), flatShading: true });
  else m = new THREE.MeshToonMaterial({ color, gradientMap: toonGradient() });
  matCache.set(key, m);
  return m;
}
const geoCache = new Map();
export function geo(p) {
  const key = JSON.stringify([p.g, p.sz, p.r, p.rt, p.h, p.len, p.t, p.pts, p.round, p.flat]);
  let g = geoCache.get(key);
  if (g) return g;
  switch (p.g) {
    case 'box': g = new THREE.BoxGeometry(p.sz[0], p.sz[1], p.sz[2]); break;
    case 'cyl': g = new THREE.CylinderGeometry(p.rt ?? p.r, p.r, p.h, 20); break;
    case 'tube': g = new THREE.CylinderGeometry(p.r, p.r, p.h, 24, 1, true); break;
    case 'ball': g = p.flat ? new THREE.IcosahedronGeometry(p.r, 1) : new THREE.SphereGeometry(p.r, 16, 12); break;
    case 'hemi': g = new THREE.SphereGeometry(p.r, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2); break;
    case 'cap': g = new THREE.CapsuleGeometry(p.r, p.len, 5, 12); break;
    case 'cone': g = new THREE.ConeGeometry(p.r, p.h, 14); break;
    case 'torus': g = new THREE.TorusGeometry(p.r, p.t, 8, 24); g.rotateX(Math.PI / 2); break;
    case 'lathe': g = new THREE.LatheGeometry(p.pts.map(a => new THREE.Vector2(a[0], a[1])), 24); break;
    case 'blade': {   // chef knife blade silhouette, in XY plane, thin in Z
      const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(p.len, -0.012); s.quadraticCurveTo(p.len * 0.7, -p.h, 0, -p.h); s.lineTo(0, 0);
      g = new THREE.ExtrudeGeometry(s, { depth: 0.006, bevelEnabled: false }); g.translate(0, 0, -0.003); break;
    }
    default: g = new THREE.BoxGeometry(0.05, 0.05, 0.05);
  }
  geoCache.set(key, g);
  return g;
}

// Build the THREE.Group for an item kind. Tinted (cookable) parts get their own material instance.
export function buildParts(parts, isFood = false) {
  const group = new THREE.Group(), tints = [];
  for (const p of parts) {
    let type = p.m || (p.g === 'tube' || p.g === 'lathe' || p.g === 'hemi' ? 'double' : p.flat ? 'flat' : 'toon');
    let m = mat(p.c, type);
    if (p.tint) { m = m.clone(); tints.push({ m, side: p.tint, raw: new THREE.Color(p.c), fat: p.fat }); }
    const mesh = new THREE.Mesh(geo(p), m);
    if (p.p) mesh.position.set(p.p[0], p.p[1], p.p[2]);
    if (p.r3) mesh.rotation.set(p.r3[0], p.r3[1], p.r3[2]);
    if (p.sc) mesh.scale.set(p.sc[0], p.sc[1], p.sc[2]);
    if (p.flip) mesh.rotation.x += Math.PI;
    if (p.flip && p.sc) mesh.scale.y = p.sc[1];
    mesh.castShadow = p.m !== 'glass' && p.m !== 'glow'; mesh.receiveShadow = !isFood;
    group.add(mesh);
  }
  group.userData.tints = tints;
  return group;
}
export function buildItemMesh(kind) {
  const def = ITEMS[kind], group = buildParts(def.parts, !!def.food);
  const ct = def.container;
  if (ct && ct.fill) {   // water surface disc, shown by the view when water > 0
    const w = new THREE.Mesh(new THREE.CylinderGeometry(ct.r * 0.98, ct.r * 0.98, 0.004, 20),
      new THREE.MeshToonMaterial({ color: C.water, gradientMap: toonGradient(), transparent: true, opacity: 0.72 }));
    w.visible = false; w.renderOrder = 2; group.add(w); group.userData.water = w;
  }
  group.userData.kind = kind;
  return group;
}

const _cTo = new THREE.Color(), _cBurnt = new THREE.Color(C.burnt), _cOut = new THREE.Color();
function cookColor(raw, to, lvl, out) {
  if (lvl <= COOK.done) out.copy(raw).lerp(to, Math.min(1, lvl / COOK.done));
  else out.copy(to).lerp(_cBurnt, Math.min(1, Math.max(0, (lvl - COOK.perfectMax * 0.92) / (COOK.burnt + 0.35 - COOK.perfectMax * 0.92))));
  return out;
}
// Update cookable tint from cook levels (a = +Y face, b = -Y face)
export function applyCookLook(group, def, a, b) {
  const tints = group.userData.tints;
  if (!tints || !def.cook) return;
  _cTo.set(def.cook.to);
  for (const t of tints) {
    const lvl = t.side === 'a' ? a : t.side === 'b' ? b : (a + b) / 2;
    cookColor(t.raw, _cTo, lvl, _cOut);
    if (t.fat) _cOut.lerp(t.raw, 0.35);
    t.m.color.copy(_cOut);
  }
}

// human readable doneness: 0 raw, 1 cooking, 2 perfect, 3 overdone, 4 burnt
export function doneness(def, a, b) {
  if (!def.cook) return -1;
  const lo = Math.min(a, b), hi = Math.max(a, b);
  if (hi >= COOK.burnt) return 4;
  if (lo < 0.12) return 0;
  if (lo < COOK.done) return 1;
  if (hi <= COOK.perfectMax) return 2;
  return 3;
}
export function itemName(def, lang, a = 0, b = 0) {
  const i = lang === 'en' ? 1 : 0;
  if (def.cookedName && Math.min(a, b) >= COOK.done) return def.cookedName[i];
  return def.n[i];
}
