// Kökskaos — shared constants & tuning
export const VERSION = '0.1.0';

export const MAX_PLAYERS = 9;          // host + 8 friends
export const PEER_PREFIX = 'kokskaos-v1-';

// ---- physics -------------------------------------------------------------
export const PHYS_DT = 1 / 60;
export const GRAVITY = -11.5;          // a bit heavier than real life = snappier cartoon feel
export const SNAP_HZ = 20;             // host -> client snapshot rate
export const INPUT_HZ = 30;            // client -> host input rate
export const MAX_ITEMS = 720;          // hard cap on loose dynamic bodies

// collision groups (membership << 16 | filter)
export const G_STATIC = 0x0001, G_ITEM = 0x0002, G_FIXTURE = 0x0004, G_PLAYER = 0x0008,
  G_HELD = 0x0010, G_NPC = 0x0020;
const grp = (member, filter) => ((member << 16) | filter) >>> 0;
export const GROUPS = {
  static: grp(G_STATIC, G_ITEM | G_HELD | G_PLAYER | G_NPC),
  item: grp(G_ITEM, G_STATIC | G_ITEM | G_FIXTURE | G_PLAYER | G_HELD | G_NPC),
  held: grp(G_HELD, G_STATIC | G_ITEM | G_FIXTURE | G_HELD | G_NPC),   // held things pass through chefs
  heldBits: grp(G_HELD, G_STATIC | G_ITEM | G_FIXTURE | G_NPC),          // a handful of bits: they don't shove each other in the hand
  fixture: grp(G_FIXTURE, G_ITEM | G_HELD | G_PLAYER),                 // doors never fight their cabinet
  player: grp(G_PLAYER, G_STATIC | G_ITEM | G_FIXTURE),
  npc: grp(G_NPC, G_ITEM | G_HELD),
  // query filters
  qWalk: grp(0xffff, G_STATIC),                                        // character controller sees statics only
  qGrab: grp(0xffff, G_STATIC | G_ITEM | G_FIXTURE | G_HELD),
};

// ---- player --------------------------------------------------------------
export const PLAYER = {
  radius: 0.28, halfHeight: 0.55,      // capsule (total height 1.66)
  eye: 1.58, eyeCrouch: 0.95,
  walk: 3.3, sprint: 5.4, crouchSpeed: 1.8, accel: 16, airAccel: 5,
  jump: 4.6, gravity: -15,
  reachMin: 0.42, reachMax: 1.55, reachDefault: 0.95, grabRange: 2.3,
  handSide: 0.2,                        // lateral offset when both hands are full
};

export const HOLD = {
  linGain: 16, maxSpeed: 7.5, angGain: 14, maxAngSpeed: 14,
  breakDist: 1.25, breakTime: 0.45,
  fixtureK: 140, fixtureC: 14, fixtureMaxF: 75, fixtureBreak: 1.0,
  knobRate: 22, knobMax: 5,
  throwMin: 3.2, throwMax: 11.5, throwChargeTime: 0.9,
  handful: 12, gatherR: 0.15, sweepR: 0.11,   // small cut food: max pieces per hand, pick-up radius around the first piece, sweep radius
};

// ---- cooking -------------------------------------------------------------
export const COOK = {
  done: 1.0, perfectMax: 1.55, overMax: 2.1, burnt: 2.1, fire: 3.2,
  panHeatUp: 3.5, panCool: 7, waterBoilTime: 9, oilHeatTime: 6, ovenHeatTime: 5,
};

// ---- service -------------------------------------------------------------
export const SERVICE = {
  duration: 420,                        // seconds per shift
  firstOrderDelay: 4,
  orderIntervalBase: 40, orderIntervalPerPlayer: 3.2, orderIntervalMin: 13,
  maxOpenBase: 2, maxOpenPerPlayer: 0.75,
  resultTime: 14,
};

// kitchen dimensions (meters). Kitchen: x -13..13, z -9..9. Dining room north of it: z -17..-9
export const ROOM = { hx: 13, hz: 9, wallH: 4.2, diningDepth: 8, benchH: 0.92, passX: 6.5 };
