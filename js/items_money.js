// Kökskaos — cash. Notes and coins are ordinary physics items you can grab (a handful at a time), stack in the cash
// drawer and hand back as change. `money` is the value in kronor; the aim tooltip shows the name so you can count.
import { box, cyl, C } from './itemkit.js';

const NOTE = { friction: 1.15, rest: 0.0, linDamp: 2.4, angDamp: 5, grip: 'up', sfx: 'wood' };
const note = (value, col, dark) => ({
  n: [`${value} kr`, `${value} kr`], money: value, mass: 0.012, ...NOTE,
  col: [box(0.068, 0.0025, 0.034)],
  parts: [{ g: 'box', sz: [0.136, 0.004, 0.068], p: [0, 0, 0], c: col },
    { g: 'box', sz: [0.03, 0.005, 0.044], p: [0.045, 0, 0], c: dark },
    { g: 'box', sz: [0.03, 0.005, 0.044], p: [-0.045, 0, 0], c: dark },
    { g: 'cyl', r: 0.016, h: 0.005, p: [0, 0, 0], c: dark }],
});

export const MONEY = {
  note50: note(50, 0xf2a93c, 0xc9782a),
  note100: note(100, 0x4f8fd1, 0x2f5f96),
  note200: note(200, 0x5fb04a, 0x3a7a2e),
  note500: note(500, 0xe5483d, 0xa8271e),
  coin10: {
    n: ['10 kr', '10 kr'], money: 10, mass: 0.008, friction: 0.9, rest: 0.1, linDamp: 1.2, angDamp: 2.5, sfx: 'clink', grip: 'up',
    col: [cyl(0.0025, 0.021)],
    parts: [{ g: 'cyl', r: 0.021, h: 0.005, p: [0, 0, 0], c: 0xe8c14a }, { g: 'cyl', r: 0.014, h: 0.006, p: [0, 0, 0], c: 0xd0a32e }],
  },
};
