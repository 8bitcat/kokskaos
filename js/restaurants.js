// Kökskaos — the restaurant career: four kitchens from a filthy dump to a star restaurant. Each has its own room,
// theme, equipment layout, renovations/upgrades to buy, and difficulty. Layout specs are consumed by kitchen.js.
const PI = Math.PI;
const CROCK_A = ['spatula', 'spoon', 'whisk', 'tongs'], CROCK_B = ['spatula', 'skimmer', 'masher', 'carvingfork'], CROCK_C = ['spoon', 'whisk', 'spatula'];

// upgrades shared by the nicer kitchens (effects are read by main.js -> sim.mods / service.mods)
const proUpgrades = (k) => [
  { id: 'burners', icon: '🔥', n: ['Turbobrännare', 'Turbo burners'], d: ['Pannor och vatten blir varma 50 % snabbare', 'Pans and water heat 50% faster'], price: 700 * k },
  { id: 'oven', icon: '♨️', n: ['Varmluftsugn', 'Convection ovens'], d: ['Ugnarna bakar 40 % snabbare', 'Ovens bake 40% faster'], price: 700 * k },
  { id: 'fryer', icon: '🍟', n: ['Proffsfritös', 'Pro fryers'], d: ['Fritöserna friterar 35 % snabbare', 'Fryers cook 35% faster'], price: 700 * k },
  { id: 'bread', icon: '🥖', n: ['Gratis bröd till gästerna', 'Free bread for guests'], d: ['Gästerna väntar 20 % längre innan de blir arga', 'Guests wait 20% longer before they get angry'], price: 500 * k },
  { id: 'tipjar', icon: '🫙', n: ['Dricksburk', 'Tip jar'], d: ['+15 % betalt för varje rätt', '+15% pay for every dish'], price: 800 * k },
];

const benchSpec = (flip) => [
  ['range', [['pan', flip ? 2 : 1], [flip ? 'grillpan' : 'wok', 3]]], ['board', { back: 1 }], ['counter', 1.0, { back: 1 }, [['plate', -0.25, 0.05], ['crock', 0.25, -0.2, flip ? CROCK_B : CROCK_A], ['salt', 0.02, -0.25], ['pepper', 0.0, 0.25]]],
  ['drawers', [['spatula', 'peeler', 'paringknife'], ['ladle', 'knife', 'mallet']]], ['blender', { back: 1 }], ['counter', 1.0, { back: 1 }, [['bowl', -0.2, 0.1], ['ketchup', 0.2, -0.2], ['mustard', 0.32, -0.2], ['grater', 0.25, 0.15]]],
  ['board', { back: 1 }, flip ? 'cleaver' : 'breadknife'], ['drawers', [['spatula', 'knife', 'tongs'], ['spoon', 'rollingpin', 'masher']]], ['range', [['pan', flip ? 1 : 2], ['saucepan', 3]]],
];

export const RESTAURANTS = [
  // ============================================================================ 1. the dump
  {
    id: 'dump', tier: 0, icon: '🪳', n: ['Sunkhaket', 'The Greasy Spoon'], d: ['Sprickor i väggarna, blinkande lysrör och en fritös som gett upp. Härifrån kan det bara gå uppåt.', 'Cracked walls, flickering lights and a fryer that has given up. The only way is up.'],
    unlock: null, room: { hx: 8, hz: 6, wallH: 3.3, diningDepth: 6.5, passX: 3.5 }, mods: { patience: 1.25, interval: 1.15, pay: 1.0, stars: 0.7 },
    theme: { floorA: 0xb7ab8f, floorB: 0x6f7f72, wall: 0xcfc39f, wallTile: 0xd6cdb4, stripe: 0x7a5c3a, ceiling: 0xb8ae92, cab: 0x7d6a4f, cabDark: 0x57452f, cabWood: 0x8a6a42, top: 0xb9b2a0, topSteel: 0x9aa3a6,
      kick: 0x2b2a27, steel: 0xa7aeb0, steelDark: 0x767d80, fridge: 0xd8d3c0, pass: 0x80563a, passTrim: 0x6b452c, diningFloorA: 0x7a5a3c, diningFloorB: 0x6b4d33, diningWall: 0xb9a27c, wainscot: 0x5a4030, table: 0xd9d2bd, chair: 0x7d6a4f,
      sign: '#6b452c', signFg: '#f3e2b8', lamp: 'tube', bg: 0xb8ae92, light: 0.82, flicker: true, cracks: true, grime: true },
    upgrades: [
      { id: 'lights', icon: '💡', n: ['Byt lysrören', 'Replace the light tubes'], d: ['Slut på blinkandet — och mycket ljusare', 'No more flickering — and much brighter'], price: 250 },
      { id: 'paint', icon: '🖌️', n: ['Spackla & måla om', 'Fill the cracks & repaint'], d: ['Sprickorna och det blottade teglet försvinner', 'Cracks and bare brick disappear'], price: 400 },
      { id: 'clean', icon: '🧽', n: ['Storstädning', 'Deep clean'], d: ['Bort med fläckar, spindelväv och skräp', 'Away with stains, cobwebs and junk'], price: 300 },
      { id: 'fryer2', icon: '🍟', n: ['Laga fritös nr 2', 'Repair fryer no. 2'], d: ['En fritös till i varma linjen', 'A second working fryer on the hot line'], price: 500 },
      { id: 'range2', icon: '🍳', n: ['Köp en spis till', 'Buy a second range'], d: ['Fyra plattor och en ugn till', 'Four more burners and another oven'], price: 700 },
      { id: 'bread', icon: '🥖', n: ['Gratis bröd till gästerna', 'Free bread for guests'], d: ['Gästerna väntar 20 % längre innan de blir arga', 'Guests wait 20% longer before they get angry'], price: 400 },
      { id: 'tipjar', icon: '🫙', n: ['Dricksburk', 'Tip jar'], d: ['+15 % betalt för varje rätt', '+15% pay for every dish'], price: 600 },
    ],
    layout: (L, up) => ({
      runs: [
        { x: -7.53, z: 5.0, yaw: PI / 2, spec: [
          ['shelf', [[{ kind: 'bun', n: 5, stock: 1 }, { kind: 'hotdogbun', n: 5, stock: 1 }], [{ kind: 'bread', n: 2, stock: 1 }], [{ kind: 'plate', n: 5, dy: 0.0375 }, { kind: 'bowl', n: 3, dy: 0.06 }]], L('TORRVAROR', 'DRY GOODS'), '#7a5c3a'],
          ['gap', 0.15], ['crate', 'potato', 9, L('POTATIS', 'POTATOES')], ['crate', 'onion', 6, L('LÖK', 'ONIONS')], ['gap', 0.3],
          ['fridge', [[['lettuce', 3], ['tomato', 4]], [['cheese', 3], ['cucumber', 3]], [['egg', 8]], [['bacon', 6]]], L('KYL', 'FRIDGE'), '#4e7a5a'], ['gap', 0.12],
          ['fridge', [[['patty', 5], ['steak', 3]], [['sausage', 8]], [['fish', 4]], [['nugget', 10]]], L('KÖTT & FISK', 'MEAT & FISH'), '#8a3b2e'],
        ] },
        { x: 7.53, z: -4.6, yaw: -PI / 2, spec: [
          ['range', [['pan', 1], ['saucepan', 3]]], ['counter', 0.8, { top: 'steel' }, [['crock', 0, -0.15, CROCK_C], ['strainer', 0, 0.2, 1.4]]],
          up.range2 ? ['range', [['pan', 2]]] : ['broken', 1.2, L('SPIS PÅ LAGNING', 'RANGE BEING FIXED')], ['counter', 1.0, { top: 'steel' }, [['ketchup', -0.25, -0.2], ['mustard', -0.1, -0.2], ['bowl', 0.2, 0.05]]],
          ['fryer'], up.fryer2 ? ['fryer'] : ['broken', 0.9, L('TRASIG', 'OUT OF ORDER')], ['counter', 1.0, { top: 'steel' }, [['tray', 0, 0, 1.57]]],
        ] },
        { x: 5.6, z: 5.53, yaw: PI, spec: [
          ['sink'], ['counter', 1.0, { top: 'steel' }, [['pot', -0.05, 0], ['jug', 0.32, -0.2]]], ['drawers', [['spatula', 'spoon', 'peeler'], ['knife', 'ladle']]],
          ['counter', 1.2, {}, [['pan', -0.28, 0.05, 2.4], ['saucepan', 0.25, 0, 2.4]]], ['counter', 1.2, {}, [['lid', -0.25, 0], ['tray', 0.25, 0, 0]]],
          ['shelf', [[{ kind: 'mixbowl', n: 1 }], [{ kind: 'plate', n: 6, dy: 0.0375 }, { kind: 'plate', n: 5, dy: 0.0375 }], [{ kind: 'bowl', n: 3, dy: 0.06 }]], L('PORSLIN', 'DISHES'), '#5a6b73'],
        ] },
        { x: -3.1, z: 0.3, yaw: 0, spec: [
          ['board', { back: 1 }], ['counter', 1.0, { back: 1 }, [['plate', -0.25, 0.05], ['crock', 0.25, -0.2, CROCK_A], ['salt', 0, 0.25], ['pepper', 0.12, 0.25]]],
          ['drawers', [['spatula', 'tongs'], ['knife', 'rollingpin']]], ['counter', 1.0, { back: 1 }, [['bowl', 0, 0.1], ['plate', 0.3, -0.1]]], ['board', { back: 1 }, 'cleaver'], ['range', [['pan', 1]]],
        ] },
      ],
      bins: [[-4.6, -2.4], [4.9, 3.9], [-1.6, 3.6]],
      junk: [[-4.6, 5.2], [-3.4, 5.35], [-5.6, 5.3], [6.9, 4.6]],
      tablesFront: [-5, 0, 5], tablesBack: [], delivery: [-7.1, -4.0],
    }),
  },
  // ============================================================================ 2. the bistro
  {
    id: 'bistro', tier: 1, icon: '🍝', n: ['Kvarterskrogen', 'The Corner Bistro'], d: ['En riktig liten krog: två arbetsbänkar, mixer, frys och hungriga stamgäster.', 'A proper little bistro: two prep benches, blenders, a freezer and hungry regulars.'],
    unlock: { rest: 'dump', stars: 6 }, room: { hx: 11, hz: 8, wallH: 3.9, diningDepth: 8, passX: 5 }, mods: { patience: 1.1, interval: 1.0, pay: 1.1, stars: 0.9 },
    theme: { floorA: 0xefe0c2, floorB: 0xc9794a, wall: 0xfbe7c6, wallTile: 0xfff6e6, stripe: 0x2e7d5b, ceiling: 0xfdf3df, cab: 0x2e7d5b, cabDark: 0x1f5a40, cabWood: 0xd99a5b, top: 0xf1e7d3, topSteel: 0xcfd8de,
      kick: 0x23262d, steel: 0xc3ced6, steelDark: 0x8896a3, fridge: 0xe8eef2, pass: 0x2e7d5b, passTrim: 0x1f5a40, diningFloorA: 0xc98a55, diningFloorB: 0xb9794a, diningWall: 0xf3d2a2, wainscot: 0x2e7d5b, table: 0xffffff, chair: 0x2e7d5b,
      sign: '#2e7d5b', signFg: '#fff', lamp: 'pendant', bg: 0xf6d9b0, light: 1 },
    upgrades: [...proUpgrades(1), { id: 'plants', icon: '🪴', n: ['Krukväxter & tavlor', 'Plants & pictures'], d: ['Mysigare matsal (ren dekoration)', 'A cosier dining room (decoration only)'], price: 300 }],
    layout: (L, up) => ({
      runs: [
        { x: -10.53, z: 6.9, yaw: PI / 2, spec: [
          ['shelf', [[{ kind: 'bun', n: 6, stock: 1 }, { kind: 'hotdogbun', n: 5, stock: 1 }], [{ kind: 'spaghetti', n: 10, stock: 1, yaw: 1 }], [{ kind: 'bread', n: 2, stock: 1 }, { kind: 'pizzadough', n: 3, stock: 1 }]], L('TORRVAROR', 'DRY GOODS')],
          ['gap', 0.15], ['crate', 'potato', 9, L('POTATIS', 'POTATOES')], ['crate', 'onion', 6, L('LÖK', 'ONIONS')], ['crate', 'carrot', 6, L('MORÖTTER', 'CARROTS')], ['gap', 0.4],
          ['fridge', [[['lettuce', 3], ['broccoli', 4]], [['tomato', 6]], [['cucumber', 4], ['mushroom', 5]], [['cheese', 3]]], L('GRÖNT', 'VEGGIES'), '#4e9a3a'], ['gap', 0.12],
          ['fridge', [[['steak', 4], ['bacon', 6]], [['patty', 6]], [['chicken', 4]], [['sausage', 7], ['meatball', 10]]], L('KÖTT', 'MEAT'), '#c0392b'], ['gap', 0.12],
          ['fridge', [[['fish', 5]], [['egg', 8]], [['fishfinger', 8]], [['nugget', 10]]], L('FISK & FRYS', 'FISH & FROZEN'), '#2e86c1'],
        ] },
        { x: 10.53, z: -6.6, yaw: -PI / 2, spec: [
          ['range', [['pan', 1], ['pot', 3]]], ['counter', 0.8, { top: 'steel' }, [['crock', 0, -0.15, CROCK_B]]], ['range', [['grillpan', 2], ['saucepan', 0]]], ['counter', 0.8, { top: 'steel' }, [['tray', 0, 0, 1.57]]],
          ['range', [['pan', 1], ['casserole', 0]]], ['counter', 1.0, { top: 'steel' }, [['ladle', -0.2, 0.1, 1.3], ['strainer', 0.2, 0.1, 1.5]]],
          ['fryer'], ['fryer'], ['counter', 1.0, { top: 'steel' }, [['bowl', -0.25, 0], ['ketchup', 0.2, -0.2], ['mustard', 0.33, -0.2]]], ['fryer'], ['drawers', [['spatula', 'spoon', 'tongs'], ['rollingpin', 'cleaver', 'mallet']]],
        ] },
        { x: 8.6, z: 7.53, yaw: PI, spec: [
          ['sink'], ['counter', 1.0, { top: 'steel' }, [['pot', -0.1, 0], ['jug', 0.32, -0.2]]], ['sink'], ['counter', 1.0, { top: 'steel' }, [['saucepan', -0.2, 0, 2.5], ['jug', 0.3, -0.2]]],
          ['drawers', [['spatula', 'peeler', 'paringknife'], ['ladle', 'spoon', 'masher']]], ['counter', 1.2, { shelf: [['colander', -0.3], ['mixbowl', 0.25]] }, [['pot', -0.3, 0], ['lid', 0.3, 0]]],
          ['counter', 1.2, { shelf: [['wok', -0.25], ['lid', 0.3]] }, [['pan', -0.28, 0.05, 2.4], ['pan', 0.28, -0.05, 2.4]]], ['counter', 1.2, { shelf: [['ovendish', -0.2], ['ovendish', 0.25]] }, [['tray', 0, 0, 0], ['battermix', 0.45, -0.25], ['jam', -0.45, -0.25]]],
          ['drawers', [['knife', 'breadknife', 'carvingfork'], ['rollingpin', 'grater']]],
          ['shelf', [[{ kind: 'tray', n: 2, dy: 0.05 }], [{ kind: 'plate', n: 6, dy: 0.0375 }, { kind: 'plate', n: 6, dy: 0.0375 }], [{ kind: 'bowl', n: 3, dy: 0.06 }, { kind: 'bowl', n: 3, dy: 0.06 }]], L('PORSLIN', 'DISHES'), '#2e86c1'],
        ] },
        { x: -4.7, z: -3.2, yaw: 0, spec: benchSpec(false) }, { x: 4.7, z: 2.6, yaw: PI, spec: benchSpec(true) },
        { x: -8.3, z: -0.3, yaw: 0, spec: [['board', { wood: 1, back: 1 }, 'paringknife'], ['counter', 1.0, { wood: 1, back: 1 }, [['plate', -0.2, 0.1], ['plate', 0.2, 0.1], ['mortar', 0, -0.2], ['pestle', 0.2, -0.25]]]] },
        { x: 8.3, z: -0.3, yaw: PI, spec: [['board', { wood: 1, back: 1 }], ['counter', 1.0, { wood: 1, back: 1 }, [['plate', -0.2, 0.1], ['bowl', 0.2, 0.1], ['jam', 0, -0.2], ['battermix', 0.2, -0.22]]]] },
      ],
      bins: [[-6.0, -0.2], [6.0, -0.2], [-6.2, 5.6], [6.4, 5.6], [9.2, 5.9]],
      tablesFront: [-8, -4, 0, 4, 8], tablesBack: [-6, -2, 2, 6], delivery: [-10.1, -5.0],
    }),
  },
  // ============================================================================ 3 + 4 share the big MasterChef floor plan
  {
    id: 'grand', tier: 2, icon: '👨‍🍳', n: ['Storköket', 'The Grand Kitchen'], d: ['Tre långa bänkar, öar, hela varma linjen. Plats för nio kockar — och kaos.', 'Three long benches, islands, the whole hot line. Room for nine chefs — and chaos.'],
    unlock: { rest: 'bistro', stars: 12 }, room: { hx: 13, hz: 9, wallH: 4.2, diningDepth: 8, passX: 6.5 }, mods: { patience: 1.0, interval: 0.9, pay: 1.2, stars: 1.0 },
    theme: { floorA: 0xf2ead8, floorB: 0x8fc7c2, wall: 0xfff1d6, wallTile: 0xffffff, stripe: 0xe5483d, ceiling: 0xfdf8ec, cab: 0x4f8fd1, cabDark: 0x2f5f96, cabWood: 0xd99a5b, top: 0xf3f1ec, topSteel: 0xcfd8de,
      kick: 0x2b2f38, steel: 0xc3ced6, steelDark: 0x8896a3, fridge: 0xe8eef2, pass: 0xd9534f, passTrim: 0xb83e3a, diningFloorA: 0xc98a55, diningFloorB: 0xb9794a, diningWall: 0xf7c9a0, wainscot: 0x9c4f3a, table: 0xffffff, chair: 0xd9534f,
      sign: '#e5483d', signFg: '#fff', lamp: 'pendant', bg: 0xf6d9b0, light: 1 },
    upgrades: proUpgrades(2),
    layout: (L, up) => bigLayout(L, up),
  },
  {
    id: 'star', tier: 3, icon: '⭐', n: ['Stjärnkrogen', 'The Star Restaurant'], d: ['Marmor, guld och gäster utan tålamod. Lax, räkor och surf & turf — här sitter stjärnorna långt inne.', 'Marble, gold and guests with no patience. Salmon, shrimp and surf & turf — stars are hard-earned here.'],
    unlock: { rest: 'grand', stars: 18 }, room: { hx: 13, hz: 9, wallH: 4.6, diningDepth: 8, passX: 6.5 }, mods: { patience: 0.9, interval: 0.8, pay: 1.45, stars: 1.3 },
    theme: { floorA: 0x2b2b33, floorB: 0xf2efe8, wall: 0xf7f3ea, wallTile: 0xffffff, stripe: 0xd4af37, ceiling: 0xfbf8f0, cab: 0x2a2d35, cabDark: 0x15171b, cabWood: 0x3a2d22, top: 0xfafafa, topSteel: 0xdfe6ea,
      kick: 0xd4af37, steel: 0xd3dce3, steelDark: 0x9aa7b3, fridge: 0x2a2d35, pass: 0x2a2d35, passTrim: 0xd4af37, diningFloorA: 0x8e1b2a, diningFloorB: 0x7a1523, diningWall: 0x3b2433, wainscot: 0xd4af37, table: 0xffffff, chair: 0xd4af37,
      sign: '#15171b', signFg: '#d4af37', lamp: 'chandelier', bg: 0xefe6d2, light: 1.05 },
    upgrades: proUpgrades(3),
    layout: (L, up) => bigLayout(L, up, true),
  },
];

function bigLayout(L, up, fancy) {
  return {
    runs: [
      { x: -12.53, z: 7.9, yaw: PI / 2, spec: [
        ['shelf', [[{ kind: 'bun', n: 6, stock: 1 }, { kind: 'hotdogbun', n: 5, stock: 1 }], [{ kind: 'spaghetti', n: 10, stock: 1, yaw: 1 }], [{ kind: 'bread', n: 3, stock: 1 }, { kind: 'pizzadough', n: 4, stock: 1 }]], L('TORRVAROR', 'DRY GOODS')],
        ['gap', 0.15], ['crate', 'potato', 9, L('POTATIS', 'POTATOES')], ['crate', 'onion', 6, L('LÖK', 'ONIONS')], ['crate', 'carrot', 6, L('MORÖTTER', 'CARROTS')], ['crate', 'rice', 12, L('RIS', 'RICE')], ['gap', 0.4],
        ['fridge', [[['lettuce', 3], ['broccoli', 4]], [['tomato', 6], ['paprika', 3]], [['cucumber', 4], ['mushroom', 5]], [['lemon', 4], ['corn', 3]]], L('GRÖNT', 'VEGGIES'), '#4e9a3a'], ['gap', 0.12],
        ['fridge', [[['steak', 5], ['bacon', 6]], [['patty', 6], ['meatball', 10]], [['chicken', 4]], [['sausage', 7]]], L('KÖTT', 'MEAT'), '#c0392b'], ['gap', 0.12],
        ['fridge', [[['fish', 4], ['salmon', 4]], [['shrimp', 10]], [['egg', 8]], [['cheese', 4]]], L('FISK & ÄGG', 'FISH & EGGS'), '#2e86c1'], ['gap', 0.12],
        ['fridge', [[['fishfinger', 8]], [['nugget', 10]], [['patty', 4], ['steak', 3]], [['tomato', 4], ['lettuce', 2]]], L('FRYS', 'FREEZER'), '#5bb8e8'],
      ] },
      { x: 12.53, z: -7.6, yaw: -PI / 2, spec: [
        ['range', [['pan', 1], ['pot', 3]]], ['counter', 0.8, { top: 'steel' }, [['crock', 0, -0.15, CROCK_B]]], ['range', [['wok', 2], ['saucepan', 0]]], ['counter', 0.8, { top: 'steel' }, [['tray', 0, 0, 1.57]]],
        ['range', [['grillpan', 1], ['casserole', 0]]], ['counter', 1.0, { top: 'steel' }, [['ladle', -0.2, 0.1, 1.3], ['strainer', 0.2, 0.1, 1.5]]],
        ['fryer'], ['fryer'], ['counter', 1.0, { top: 'steel' }, [['bowl', -0.25, 0], ['strainer', 0.2, 0.1, 1.5], ['salt', 0, 0.28]]], ['fryer'], ['fryer'],
        ['counter', 1.0, { top: 'steel' }, [['tray', 0, 0, 1.57]]], ['drawers', [['spatula', 'spoon', 'tongs'], ['rollingpin', 'cleaver', 'mallet']]],
      ] },
      { x: 10.6, z: 8.53, yaw: PI, spec: [
        ['sink'], ['counter', 1.0, { top: 'steel' }, [['pot', -0.1, 0], ['jug', 0.32, -0.2]]], ['sink'], ['counter', 1.0, { top: 'steel' }, [['saucepan', -0.2, 0, 2.5], ['jug', 0.3, -0.2]]], ['sink'],
        ['drawers', [['spatula', 'peeler', 'paringknife'], ['ladle', 'spoon', 'masher']]],
        ['counter', 1.2, { shelf: [['colander', -0.3], ['mixbowl', 0.25]] }, [['pot', -0.3, 0], ['pot', 0.3, 0]]], ['counter', 1.2, { shelf: [['wok', -0.28], ['lid', 0.28]] }, [['pan', -0.28, 0.05, 2.4], ['pan', 0.28, -0.05, 2.4]]],
        ['counter', 1.2, { shelf: [['casserole', -0.28], ['lid', 0.28]] }, [['saucepan', -0.28, 0, 2.4], ['lid', 0.25, 0]]], ['counter', 1.2, { shelf: [['ovendish', -0.25], ['ovendish', 0.25]] }, [['tray', 0, 0, 0], ['battermix', 0.45, -0.25], ['jam', -0.45, -0.25]]],
        ['drawers', [['knife', 'breadknife', 'carvingfork'], ['rollingpin', 'grater', 'whisk']]],
        ['shelf', [[{ kind: 'tray', n: 2, dy: 0.05 }], [{ kind: 'plate', n: 6, dy: 0.0375 }, { kind: 'plate', n: 6, dy: 0.0375 }], [{ kind: 'bowl', n: 3, dy: 0.06 }, { kind: 'bowl', n: 3, dy: 0.06 }]], L('PORSLIN', 'DISHES'), '#2e86c1'],
      ] },
      { x: -4.7, z: -4.5, yaw: 0, spec: benchSpec(false) }, { x: 4.7, z: 0, yaw: PI, spec: benchSpec(true) }, { x: -4.7, z: 4.5, yaw: 0, spec: benchSpec(false) },
      ...[[-9.3, -3.2, 0], [-9.3, 3.0, 0], [7.2, -3.2, PI], [7.2, 3.0, PI]].map(([x, z, yaw], i) => ({ x, z, yaw, spec: [['board', { wood: 1, back: 1 }, i % 2 ? 'paringknife' : 'knife'],
        ['counter', 1.0, { wood: 1, back: 1 }, [['plate', -0.2, 0.1], ['plate', 0.2, 0.1], i % 2 ? ['mortar', 0, -0.2] : ['bowl', 0, -0.2], i % 2 ? ['pestle', 0.2, -0.25] : ['jam', 0.25, -0.25], ['battermix', -0.3, -0.25]]]] })),
    ],
    bins: [[-6.2, -2.2], [6.2, -2.2], [-6.2, 2.2], [6.2, 2.2], [11.2, 7.2], [-6.2, 6.8], [6.2, 6.8]],
    tablesFront: [-10, -5, 0, 5, 10], tablesBack: [-7.5, -2.5, 2.5, 7.5], fancy, delivery: [-12.1, -6.3],
  };
}
// ============================================================================ the food truck: a side mode, always open
RESTAURANTS.push({
  id: 'truck', tier: 0, truck: true, icon: '🚚', n: ['Foodtrucken', 'The Food Truck'],
  d: ['Sju kvadratmeter kök på hjul: lucka rakt ut mot kön, trångt, snabbt och gästerna betalar över disk.', 'Seven square metres of kitchen on wheels: a hatch straight out to the queue, cramped, fast, and the guests pay over the counter.'],
  unlock: null, room: { hx: 3.8, hz: 1.4, wallH: 2.3, diningDepth: 8, passX: 1.6 },
  mods: { patience: 0.85, interval: 0.6, pay: 1.2, stars: 0.8 },
  menu: ['friesketchup', 'hotdog', 'sausagefries', 'burger', 'fishchips', 'onionrings', 'grilledcheese', 'nuggets', 'doubleburger', 'baconburger'],
  theme: { floorA: 0xd9d3c3, floorB: 0x9aa7b0, wall: 0xf2c31b, wallTile: 0xf7f2e6, stripe: 0xe5483d, ceiling: 0xe8eef2, cab: 0x2e86c1, cabDark: 0x1f5f8a, cabWood: 0xd99a5b,
    top: 0xf3f1ec, topSteel: 0xcfd8de, kick: 0x23262d, steel: 0xc3ced6, steelDark: 0x8896a3, fridge: 0xe8eef2, pass: 0xe5483d, passTrim: 0xb83e3a,
    diningFloorA: 0x6f7378, diningFloorB: 0x7a7f85, diningWall: 0x8fd0f0, wainscot: 0x6f7378, table: 0xd9a05b, chair: 0x8a5a2b,
    sign: '#e5483d', signFg: '#fff', lamp: 'none', bg: 0x8fd0f0, light: 1.15, truck: 0xf2c31b, truckRoof: 0xe8eef2, groundA: 0x6f7378, groundB: 0x7a7f85 },
  upgrades: [
    { id: 'lights', icon: '💡', n: ['Ljusslinga', 'String lights'], d: ['Festivalkänsla — gästerna väntar 10 % längre', 'Festival vibes — guests wait 10% longer'], price: 250 },
    { id: 'paint', icon: '🎨', n: ['Folierad bil', 'New wrap'], d: ['Ny lack på bilen (och gästerna hittar hit)', 'A fresh wrap on the truck (and guests spot it)'], price: 400 },
    { id: 'fryer2', icon: '🍟', n: ['Andra fritösen', 'Second fryer'], d: ['Dubbel fritering — pommes till alla', 'Twice the frying — fries for everyone'], price: 500 },
    { id: 'awning', icon: '⛱️', n: ['Markis & ståbord', 'Awning & tables'], d: ['Gästerna väntar 20 % längre innan de blir arga', 'Guests wait 20% longer before they get angry'], price: 450 },
    { id: 'speaker', icon: '🔊', n: ['Högtalare', 'Speakers'], d: ['+15 % betalt (och dricks) för varje rätt', '+15% pay (and tips) for every dish'], price: 600 },
    { id: 'burners', icon: '🔥', n: ['Turbobrännare', 'Turbo burners'], d: ['Pannorna blir varma 50 % snabbare', 'Pans heat up 50% faster'], price: 700 },
  ],
  layout: (L, up) => ({
    runs: [
      { x: 3.75, z: 0.93, yaw: PI, spec: [
        ['range', [['pan', 1], ['pan', 2]]],
        ['fryer'],
        up.fryer2 ? ['fryer'] : ['counter', 0.9, { top: 'steel' }, [['tray', 0, 0, 1.57], ['salt', 0.28, -0.22], ['pepper', 0.36, -0.22]]],
        ['board', { top: 'steel' }, 'knife'],
        ['counter', 1.0, { top: 'steel', shelf: [['pot', -0.3], ['strainer', 0.3]] }, [['plate', -0.25, 0.05], ['crock', 0.28, -0.18, ['spatula', 'tongs', 'strainer']], ['ketchup', 0.02, 0.2], ['mustard', 0.14, 0.2]]],
        ['fridge', [[['potato', 6], ['fish', 3]], [['patty', 5], ['sausage', 6], ['bacon', 4]], [['cheese', 3], ['onion', 4]], [['tomato', 3], ['lettuce', 2]]], L('KYL', 'FRIDGE'), '#4e7a5a'],
        ['shelf', [[{ kind: 'bun', n: 5, stock: 1 }, { kind: 'hotdogbun', n: 5, stock: 1 }], [{ kind: 'bread', n: 2, stock: 1 }, { kind: 'nugget', n: 8, stock: 1 }], [{ kind: 'plate', n: 6, dy: 0.0375 }, { kind: 'bowl', n: 3, dy: 0.06 }]], L('TORRT', 'DRY'), '#7a5c3a'],
      ] },
    ],
    bins: [[3.45, -0.55]],
    tablesFront: [-3.4, 0, 3.4], tablesBack: [], tableZ: [-4.8],
    delivery: [-3.0, -0.35], phone: [-3.8, -0.35],
  }),
});
export const REST_BY_ID = Object.fromEntries(RESTAURANTS.map(r => [r.id, r]));
