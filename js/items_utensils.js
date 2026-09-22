// Kökskaos — more cookware & utensils. Several have a job: the ladle + spider strainer really scoop, the jug carries
// water, lids make pots boil faster, the masher mashes boiled potatoes, the mallet flattens steaks, the grater grates
// cheese, squeeze bottles squirt, bread/paring knives cut.
import { box, cyl, ball, cap, ring, bowlCol, CAPX, C } from './itemkit.js';

export const UTENSILS = {
  wok: {
    n: ['Wok', 'Wok'], mass: 1.2, mat: 'metal', friction: 0.55, grip: 'back', hold: [0.32, 0.095, 0],
    col: [...bowlCol(0.08, 0.18, 0.1, 0.014, 0.55), box(0.11, 0.011, 0.018, [0.3, 0.095, 0], null, 0.1)],
    container: { r: 0.18, y0: 0.008, h: 0.26, heat: true, floorY: 0.016 },
    parts: [{ g: 'lathe', pts: [[0, 0.002], [0.08, 0.004], [0.15, 0.05], [0.195, 0.1], [0.2, 0.104], [0.19, 0.104], [0.145, 0.058], [0.078, 0.016], [0, 0.014]], c: C.iron },
      { g: 'box', sz: [0.06, 0.016, 0.03], p: [0.215, 0.095, 0], c: C.iron }, { g: 'cap', r: 0.019, len: 0.15, p: [0.32, 0.095, 0], r3: CAPX, c: C.wood }],
  },
  grillpan: {
    n: ['Grillpanna', 'Grill pan'], mass: 1.4, mat: 'metal', friction: 0.6, grip: 'back', hold: [0.27, 0.045, 0],
    col: [box(0.16, 0.008, 0.16, [0, 0.008, 0], null, 0.62), box(0.16, 0.022, 0.007, [0, 0.036, 0.153], null, 0.07), box(0.16, 0.022, 0.007, [0, 0.036, -0.153], null, 0.07),
      box(0.007, 0.022, 0.16, [0.153, 0.036, 0], null, 0.07), box(0.007, 0.022, 0.16, [-0.153, 0.036, 0], null, 0.07), box(0.11, 0.011, 0.02, [0.27, 0.045, 0], null, 0.1)],
    container: { bx: 0.15, bz: 0.15, y0: 0.01, h: 0.2, heat: true, floorY: 0.016 },
    parts: [{ g: 'box', sz: [0.32, 0.016, 0.32], p: [0, 0.008, 0], c: C.iron }, { g: 'box', sz: [0.32, 0.044, 0.014], p: [0, 0.036, 0.153], c: C.iron }, { g: 'box', sz: [0.32, 0.044, 0.014], p: [0, 0.036, -0.153], c: C.iron },
      { g: 'box', sz: [0.014, 0.044, 0.32], p: [0.153, 0.036, 0], c: C.iron }, { g: 'box', sz: [0.014, 0.044, 0.32], p: [-0.153, 0.036, 0], c: C.iron },
      ...[-0.1, -0.05, 0, 0.05, 0.1].map(z => ({ g: 'box', sz: [0.28, 0.006, 0.014], p: [0, 0.018, z], c: C.ironLight })),
      { g: 'cap', r: 0.019, len: 0.17, p: [0.27, 0.045, 0], r3: CAPX, c: C.black }],
  },
  casserole: {
    n: ['Gjutjärnsgryta', 'Dutch oven'], mass: 2.4, mat: 'metal', friction: 0.55, grip: 'up',
    col: [cyl(0.009, 0.155, [0, 0.009, 0], null, 0.55), ...ring(12, 0.142, 0.016, 0.15, 0.016, 0.39), box(0.028, 0.012, 0.04, [0.185, 0.125, 0], null, 0.03), box(0.028, 0.012, 0.04, [-0.185, 0.125, 0], null, 0.03)],
    container: { r: 0.142, y0: 0.014, h: 0.28, heat: true, fill: true, floorY: 0.018, waterH: 0.12 },
    parts: [{ g: 'cyl', r: 0.16, h: 0.018, p: [0, 0.009, 0], c: 0xb5322a }, { g: 'tube', r: 0.16, h: 0.136, p: [0, 0.084, 0], c: 0xd63c32 }, { g: 'cyl', r: 0.143, h: 0.004, p: [0, 0.02, 0], c: C.cream },
      { g: 'torus', r: 0.16, t: 0.009, p: [0, 0.153, 0], c: 0xb5322a }, { g: 'box', sz: [0.056, 0.022, 0.08], p: [0.185, 0.125, 0], c: 0xb5322a }, { g: 'box', sz: [0.056, 0.022, 0.08], p: [-0.185, 0.125, 0], c: 0xb5322a }],
  },
  ovendish: {
    n: ['Ugnsform', 'Oven dish'], mass: 1.2, friction: 0.8, sfx: 'clink', grip: 'up',
    col: [box(0.17, 0.008, 0.12, [0, 0.008, 0], null, 0.6), box(0.17, 0.03, 0.008, [0, 0.044, 0.112], null, 0.1), box(0.17, 0.03, 0.008, [0, 0.044, -0.112], null, 0.1), box(0.008, 0.03, 0.12, [0.162, 0.044, 0], null, 0.1), box(0.008, 0.03, 0.12, [-0.162, 0.044, 0], null, 0.1)],
    container: { bx: 0.16, bz: 0.11, y0: 0.01, h: 0.22, floorY: 0.016 },
    parts: [{ g: 'box', sz: [0.34, 0.016, 0.24], p: [0, 0.008, 0], c: 0x3d7fc4 }, { g: 'box', sz: [0.34, 0.06, 0.016], p: [0, 0.044, 0.112], c: 0x3d7fc4 }, { g: 'box', sz: [0.34, 0.06, 0.016], p: [0, 0.044, -0.112], c: 0x3d7fc4 },
      { g: 'box', sz: [0.016, 0.06, 0.24], p: [0.162, 0.044, 0], c: 0x3d7fc4 }, { g: 'box', sz: [0.016, 0.06, 0.24], p: [-0.162, 0.044, 0], c: 0x3d7fc4 }, { g: 'box', sz: [0.305, 0.004, 0.205], p: [0, 0.018, 0], c: C.white }],
  },
  mixbowl: {
    n: ['Bunke', 'Mixing bowl'], mass: 0.6, mat: 'metal', friction: 0.6, grip: 'up',
    col: bowlCol(0.075, 0.155, 0.13, 0.014),
    container: { r: 0.155, y0: 0.008, h: 0.3, floorY: 0.016 },
    parts: [{ g: 'lathe', pts: [[0, 0.002], [0.075, 0.003], [0.135, 0.06], [0.168, 0.13], [0.175, 0.134], [0.163, 0.134], [0.128, 0.066], [0.072, 0.016], [0, 0.015]], c: C.steel }],
  },
  colander: {
    n: ['Durkslag', 'Colander'], mass: 0.5, mat: 'metal', friction: 0.6, grip: 'up',
    col: [...bowlCol(0.07, 0.14, 0.12, 0.014), box(0.025, 0.01, 0.035, [0.175, 0.11, 0], null, 0.03), box(0.025, 0.01, 0.035, [-0.175, 0.11, 0], null, 0.03)],
    container: { r: 0.14, y0: 0.008, h: 0.28, floorY: 0.016 },
    parts: [{ g: 'lathe', pts: [[0, 0.004], [0.07, 0.005], [0.125, 0.06], [0.152, 0.12]], c: 0xe8eef2, m: 'mesh' }, { g: 'torus', r: 0.153, t: 0.008, p: [0, 0.12, 0], c: C.steelDark }, { g: 'torus', r: 0.06, t: 0.008, p: [0, 0.004, 0], c: C.steelDark },
      { g: 'box', sz: [0.05, 0.018, 0.07], p: [0.175, 0.11, 0], c: C.steelDark }, { g: 'box', sz: [0.05, 0.018, 0.07], p: [-0.175, 0.11, 0], c: C.steelDark }],
  },
  jug: {        // carry water from the tap to a pot on the hob
    n: ['Måttkanna', 'Measuring jug'], mass: 0.4, friction: 0.7, sfx: 'clink', grip: 'up',
    col: [cyl(0.008, 0.068, [0, 0.008, 0], null, 0.6), ...ring(8, 0.06, 0.014, 0.17, 0.012, 0.35), box(0.012, 0.05, 0.012, [0.105, 0.1, 0], null, 0.05)],
    container: { r: 0.06, y0: 0.012, h: 0.26, fill: true, floorY: 0.016, waterH: 0.14, vol: 0.35 },
    parts: [{ g: 'cyl', r: 0.073, h: 0.014, p: [0, 0.007, 0], c: C.glass }, { g: 'tube', r: 0.073, h: 0.16, p: [0, 0.094, 0], c: C.glass, m: 'glass' }, { g: 'torus', r: 0.073, t: 0.005, p: [0, 0.174, 0], c: C.red },
      { g: 'box', sz: [0.022, 0.1, 0.022], p: [0.105, 0.1, 0], c: C.red }, { g: 'box', sz: [0.04, 0.018, 0.02], p: [0.088, 0.145, 0], c: C.red }, { g: 'box', sz: [0.04, 0.018, 0.02], p: [0.088, 0.055, 0], c: C.red },
      { g: 'box', sz: [0.003, 0.012, 0.03], p: [-0.0735, 0.06, 0], c: C.red }, { g: 'box', sz: [0.003, 0.012, 0.045], p: [-0.0735, 0.1, 0], c: C.red }, { g: 'box', sz: [0.003, 0.012, 0.03], p: [-0.0735, 0.14, 0], c: C.red }],
  },
  mortar: {
    n: ['Mortel', 'Mortar'], mass: 1.3, friction: 0.9, sfx: 'wood', grip: 'up',
    col: [cyl(0.012, 0.06, [0, 0.012, 0], null, 0.6), ...ring(8, 0.06, 0.02, 0.09, 0.02, 0.4)],
    container: { r: 0.06, y0: 0.015, h: 0.2, floorY: 0.024 },
    parts: [{ g: 'lathe', pts: [[0, 0.002], [0.055, 0.002], [0.082, 0.05], [0.084, 0.092], [0.062, 0.092], [0.055, 0.03], [0, 0.024]], c: 0x9aa0a6 }],
  },
  pestle: {
    n: ['Mortelstöt', 'Pestle'], mass: 0.35, friction: 0.9, sfx: 'wood', grip: 'fwd', hold: [-0.03, 0, 0],
    col: [cap(0.06, 0.02, [0, 0, 0], CAPX)],
    parts: [{ g: 'cap', r: 0.017, len: 0.11, p: [-0.015, 0, 0], r3: CAPX, c: 0x8a9096 }, { g: 'ball', r: 0.026, p: [0.06, 0, 0], c: 0x8a9096 }],
  },
  lid: {        // a lidded pot boils much faster
    n: ['Grytlock', 'Pot lid'], mass: 0.45, mat: 'metal', friction: 0.6, grip: 'up',
    col: [cyl(0.007, 0.2, [0, 0.007, 0], null, 0.9), ball(0.025, [0, 0.04, 0], 0.1)],
    parts: [{ g: 'cyl', r: 0.2, h: 0.012, p: [0, 0.006, 0], c: C.steel }, { g: 'hemi', r: 0.17, sc: [1, 0.16, 1], p: [0, 0.011, 0], c: C.steelDark, flip: 1 }, { g: 'ball', r: 0.026, p: [0, 0.052, 0], c: C.black }, { g: 'cyl', r: 0.012, h: 0.03, p: [0, 0.03, 0], c: C.black }],
  },
  ladle: {      // a real little cup: scoop sauce and pour it over the pasta
    n: ['Slev', 'Ladle'], mass: 0.22, mat: 'metal', friction: 0.7, grip: 'fwd', hold: [-0.27, 0.2, 0],
    col: [cyl(0.005, 0.04, [0, 0.005, 0], null, 0.3), ...ring(6, 0.04, 0.008, 0.055, 0.008, 0.3), box(0.15, 0.008, 0.008, [-0.17, 0.14, 0], [0, 0, -0.55], 0.4)],
    container: { r: 0.042, y0: -0.002, h: 0.1, floorY: 0.01, small: true },
    parts: [{ g: 'lathe', pts: [[0, 0.001], [0.03, 0.003], [0.046, 0.03], [0.05, 0.056], [0.044, 0.056], [0.04, 0.03], [0.027, 0.011], [0, 0.009]], c: C.steel },
      { g: 'cap', r: 0.008, len: 0.3, p: [-0.17, 0.14, 0], r3: [0, 0, Math.PI / 2 - 0.55], c: C.steel }, { g: 'cap', r: 0.012, len: 0.08, p: [-0.27, 0.2, 0], r3: [0, 0, Math.PI / 2 - 0.55], c: C.black }],
  },
  strainer: {   // long-handled spider: fish the fries out of the fryer
    n: ['Fritössil', 'Spider strainer'], mass: 0.25, mat: 'metal', friction: 0.8, grip: 'fwd', hold: [-0.34, 0.107, 0],
    col: [cyl(0.005, 0.06, [0, 0.005, 0], null, 0.3), ...ring(8, 0.078, 0.008, 0.06, 0.008, 0.3), box(0.16, 0.008, 0.008, [-0.235, 0.085, 0], [0, 0, -0.2], 0.4)],
    container: { r: 0.08, y0: -0.002, h: 0.14, floorY: 0.01, small: true },
    parts: [{ g: 'lathe', pts: [[0, 0.003], [0.055, 0.006], [0.088, 0.06]], c: 0xe8eef2, m: 'mesh' }, { g: 'torus', r: 0.089, t: 0.006, p: [0, 0.06, 0], c: C.steelDark },
      { g: 'cap', r: 0.008, len: 0.32, p: [-0.235, 0.085, 0], r3: [0, 0, Math.PI / 2 - 0.2], c: C.steelDark }, { g: 'cap', r: 0.013, len: 0.1, p: [-0.34, 0.107, 0], r3: [0, 0, Math.PI / 2 - 0.2], c: C.wood }],
  },
  skimmer: {
    n: ['Hålslev', 'Slotted spoon'], mass: 0.18, mat: 'metal', friction: 0.8, grip: 'fwd', hold: [-0.2, 0.03, 0],
    col: [box(0.13, 0.009, 0.009, [-0.14, 0.02, 0], [0, 0, -0.12], 0.5), cyl(0.005, 0.055, [0.04, 0, 0], null, 0.5)],
    parts: [{ g: 'cap', r: 0.009, len: 0.25, p: [-0.14, 0.02, 0], r3: [0, 0, Math.PI / 2 - 0.12], c: C.steel }, { g: 'cyl', r: 0.057, h: 0.008, p: [0.04, 0, 0], c: 0xe8eef2, m: 'mesh' }, { g: 'torus', r: 0.057, t: 0.005, p: [0.04, 0, 0], c: C.steel }],
  },
  whisk: {
    n: ['Visp', 'Whisk'], mass: 0.12, mat: 'metal', friction: 0.6, grip: 'fwd', hold: [-0.1, 0, 0],
    col: [box(0.07, 0.011, 0.011, [-0.1, 0, 0], null, 0.5), cap(0.05, 0.032, [0.06, 0, 0], CAPX, 0.5)],
    parts: [{ g: 'cap', r: 0.012, len: 0.12, p: [-0.1, 0, 0], r3: CAPX, c: C.black },
      ...[0, Math.PI / 3, 2 * Math.PI / 3].map(a => ({ g: 'torus', r: 0.034, t: 0.003, p: [0.06, 0, 0], r3: [a, 0, 0], sc: [2.1, 1, 1], c: C.steel }))],
  },
  tongs: {
    n: ['Tång', 'Tongs'], mass: 0.15, mat: 'metal', friction: 0.7, grip: 'fwd', hold: [-0.14, 0, 0],
    col: [box(0.14, 0.006, 0.01, [0, 0, 0.02], [0, 0.11, 0], 0.5), box(0.14, 0.006, 0.01, [0, 0, -0.02], [0, -0.11, 0], 0.5)],
    parts: [{ g: 'box', sz: [0.28, 0.01, 0.02], p: [0, 0, 0.02], r3: [0, 0.11, 0], c: C.steel }, { g: 'box', sz: [0.28, 0.01, 0.02], p: [0, 0, -0.02], r3: [0, -0.11, 0], c: C.steel },
      { g: 'ball', r: 0.016, p: [-0.14, 0, 0], c: C.red }, { g: 'box', sz: [0.04, 0.012, 0.028], p: [0.13, 0, 0.035], c: C.black }, { g: 'box', sz: [0.04, 0.012, 0.028], p: [0.13, 0, -0.035], c: C.black }],
  },
  masher: {     // smash it down on boiled potatoes => mashed potato
    n: ['Potatisstöt', 'Potato masher'], mass: 0.3, mat: 'metal', friction: 0.7, tool: 'mash', grip: 'fwd', hold: [-0.15, 0, 0],
    col: [box(0.12, 0.011, 0.011, [-0.1, 0, 0], null, 0.5), box(0.008, 0.045, 0.045, [0.03, 0, 0], null, 0.5, { head: 1 })],
    parts: [{ g: 'cap', r: 0.014, len: 0.11, p: [-0.15, 0, 0], r3: CAPX, c: C.black }, { g: 'cap', r: 0.006, len: 0.11, p: [-0.03, 0, 0], r3: CAPX, c: C.steel },
      { g: 'box', sz: [0.008, 0.09, 0.09], p: [0.03, 0, 0], c: 0xe8eef2, m: 'mesh' }],
  },
  peeler: {
    n: ['Potatisskalare', 'Peeler'], mass: 0.06, friction: 0.7, grip: 'fwd', hold: [-0.035, 0, 0],
    col: [box(0.08, 0.009, 0.014, [0, 0, 0])],
    parts: [{ g: 'cap', r: 0.011, len: 0.07, p: [-0.035, 0, 0], r3: CAPX, c: 0x3fbf5f }, { g: 'box', sz: [0.065, 0.004, 0.006], p: [0.045, 0, 0.012], c: C.steel }, { g: 'box', sz: [0.065, 0.004, 0.006], p: [0.045, 0, -0.012], c: C.steel }, { g: 'box', sz: [0.006, 0.004, 0.03], p: [0.078, 0, 0], c: C.steel }],
  },
  grater: {     // rub a block of cheese against it => grated cheese
    n: ['Rivjärn', 'Grater'], mass: 0.35, mat: 'metal', friction: 0.7, tool: 'grate', grip: 'up',
    col: [box(0.045, 0.09, 0.035, [0, 0.09, 0], null, 0.9, { head: 1 }), box(0.03, 0.01, 0.012, [0, 0.195, 0], null, 0.1)],
    parts: [{ g: 'cyl', r: 0.064, rt: 0.04, h: 0.18, p: [0, 0.09, 0], sc: [1, 1, 0.7], c: 0xe8eef2, m: 'mesh' }, { g: 'cyl', r: 0.062, rt: 0.038, h: 0.178, p: [0, 0.09, 0], sc: [1, 1, 0.7], c: C.steelDark },
      { g: 'torus', r: 0.028, t: 0.007, p: [0, 0.2, 0], r3: [Math.PI / 2, 0, 0], c: C.black }],
  },
  carvingfork: {
    n: ['Stekgaffel', 'Carving fork'], mass: 0.14, mat: 'metal', friction: 0.6, grip: 'fwd', hold: [-0.08, 0, 0],
    col: [box(0.06, 0.011, 0.011, [-0.08, 0, 0], null, 0.6), box(0.09, 0.005, 0.016, [0.07, 0, 0], null, 0.4)],
    parts: [{ g: 'cap', r: 0.012, len: 0.1, p: [-0.08, 0, 0], r3: CAPX, c: C.woodDark }, { g: 'cap', r: 0.005, len: 0.06, p: [0.01, 0, 0], r3: CAPX, c: C.steel },
      { g: 'cap', r: 0.004, len: 0.1, p: [0.1, 0, 0.012], r3: CAPX, c: C.steel }, { g: 'cap', r: 0.004, len: 0.1, p: [0.1, 0, -0.012], r3: CAPX, c: C.steel }, { g: 'box', sz: [0.008, 0.008, 0.03], p: [0.045, 0, 0], c: C.steel }],
  },
  mallet: {     // whack a steak flat => schnitzel
    n: ['Köttklubba', 'Meat mallet'], mass: 0.7, mat: 'metal', friction: 0.7, tool: 'pound', grip: 'fwd', hold: [-0.12, 0, 0],
    col: [box(0.11, 0.012, 0.012, [-0.07, 0, 0], null, 0.3), box(0.035, 0.035, 0.05, [0.07, 0, 0], null, 0.7, { head: 1 })],
    parts: [{ g: 'cap', r: 0.014, len: 0.2, p: [-0.07, 0, 0], r3: CAPX, c: C.wood }, { g: 'box', sz: [0.07, 0.07, 0.1], p: [0.07, 0, 0], c: C.steel },
      { g: 'box', sz: [0.06, 0.06, 0.012], p: [0.07, 0, 0.054], c: C.steelDark }, { g: 'box', sz: [0.06, 0.06, 0.012], p: [0.07, 0, -0.054], c: C.steelDark }],
  },
  rollingpin: { // roll/whack a dough ball flat => pizza base   (overrides the plain one)
    n: ['Kavel', 'Rolling pin'], mass: 0.6, friction: 0.7, sfx: 'wood', tool: 'roll', grip: 'up',
    col: [cap(0.11, 0.032, [0, 0, 0], CAPX, 0.9, ), cap(0.19, 0.012, [0, 0, 0], CAPX, 0.1)],
    parts: [{ g: 'cap', r: 0.032, len: 0.22, p: [0, 0, 0], r3: CAPX, c: C.wood }, { g: 'cap', r: 0.013, len: 0.4, p: [0, 0, 0], r3: CAPX, c: C.woodDark }],
  },
  breadknife: {
    n: ['Brödkniv', 'Bread knife'], mass: 0.22, mat: 'metal', friction: 0.5, blade: 1, grip: 'fwd', hold: [-0.06, 0, 0],
    col: [box(0.06, 0.013, 0.012, [-0.06, 0, 0], null, 0.6), box(0.13, 0.016, 0.005, [0.13, -0.002, 0], null, 0.4, { blade: 1 })],
    parts: [{ g: 'cap', r: 0.015, len: 0.09, p: [-0.06, 0, 0], r3: CAPX, c: C.woodDark }, { g: 'box', sz: [0.26, 0.032, 0.006], p: [0.13, -0.002, 0], c: C.steel },
      ...[0.03, 0.07, 0.11, 0.15, 0.19, 0.23].map(x => ({ g: 'cone', r: 0.012, h: 0.012, p: [x, -0.022, 0], r3: [Math.PI, 0, 0], sc: [1, 1, 0.25], c: C.steel }))],
  },
  paringknife: {
    n: ['Skalkniv', 'Paring knife'], mass: 0.1, mat: 'metal', friction: 0.5, blade: 1, grip: 'fwd', hold: [-0.045, 0, 0],
    col: [box(0.045, 0.011, 0.01, [-0.045, 0, 0], null, 0.6), box(0.055, 0.012, 0.005, [0.055, -0.002, 0], null, 0.4, { blade: 1 })],
    parts: [{ g: 'cap', r: 0.012, len: 0.07, p: [-0.045, 0, 0], r3: CAPX, c: 0x3d7fc4 }, { g: 'blade', len: 0.11, h: 0.026, p: [0, 0.011, 0], c: C.steel }],
  },
  // squeeze bottles: hold them upside-down to squirt blobs
  ketchup: {
    n: ['Ketchupflaska', 'Ketchup bottle'], mass: 0.3, friction: 0.8, squeeze: 'ketchupblob', grip: 'up',
    col: [cyl(0.075, 0.032, [0, 0.075, 0], null, 0.9), cyl(0.025, 0.012, [0, 0.175, 0], null, 0.1)],
    parts: [{ g: 'cap', r: 0.033, len: 0.09, p: [0, 0.078, 0], c: 0xd62f1f }, { g: 'cone', r: 0.022, h: 0.05, p: [0, 0.178, 0], c: C.white }, { g: 'cyl', r: 0.034, h: 0.035, p: [0, 0.07, 0], c: C.white }],
  },
  mustard: {
    n: ['Senapsflaska', 'Mustard bottle'], mass: 0.3, friction: 0.8, squeeze: 'mustardblob', grip: 'up',
    col: [cyl(0.075, 0.032, [0, 0.075, 0], null, 0.9), cyl(0.025, 0.012, [0, 0.175, 0], null, 0.1)],
    parts: [{ g: 'cap', r: 0.033, len: 0.09, p: [0, 0.078, 0], c: 0xf2c31b }, { g: 'cone', r: 0.022, h: 0.05, p: [0, 0.178, 0], c: 0x8a5a2b }, { g: 'cyl', r: 0.034, h: 0.035, p: [0, 0.07, 0], c: C.white }],
  },
  jam: {
    n: ['Syltflaska', 'Jam bottle'], mass: 0.3, friction: 0.8, squeeze: 'jamblob', grip: 'up',
    col: [cyl(0.075, 0.032, [0, 0.075, 0], null, 0.9), cyl(0.025, 0.012, [0, 0.175, 0], null, 0.1)],
    parts: [{ g: 'cap', r: 0.033, len: 0.09, p: [0, 0.078, 0], c: C.jam }, { g: 'cone', r: 0.022, h: 0.05, p: [0, 0.178, 0], c: C.white }, { g: 'cyl', r: 0.034, h: 0.035, p: [0, 0.07, 0], c: 0xffd9e2 }],
  },
  battermix: {
    n: ['Pannkakssmet', 'Pancake batter'], mass: 0.4, friction: 0.8, squeeze: 'batterblob', grip: 'up',
    col: [cyl(0.085, 0.04, [0, 0.085, 0], null, 0.9), cyl(0.025, 0.014, [0, 0.195, 0], null, 0.1)],
    parts: [{ g: 'cap', r: 0.041, len: 0.1, p: [0, 0.088, 0], c: C.batter }, { g: 'cone', r: 0.026, h: 0.055, p: [0, 0.2, 0], c: 0x3d7fc4 }, { g: 'cyl', r: 0.042, h: 0.04, p: [0, 0.08, 0], c: 0x3d7fc4 }],
  },
};
