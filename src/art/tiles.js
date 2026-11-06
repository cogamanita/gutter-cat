// The world tileset, drawn procedurally. Base colours are deliberately brighter
// than they appear in play: the lighting pass multiplies everything down.

import { PB, rng, bayer, mix } from './pixel.js';
import { TILE } from '../config.js';

const T = TILE;

function base(c, seed, specks = [], density = 0.12) {
  const p = new PB(T, T).fill(c);
  const r = rng(seed);
  if (specks.length) p.speckle(0, 0, T, T, specks, density, r);
  return p;
}

// ---------------------------------------------------------------- Ground
const AS = [0x55575c, 0x4a4c51, 0x626469, 0x3e4044];

function asphalt(seed) {
  return base(AS[0], seed, [AS[1], AS[2], AS[1], AS[3]], 0.28);
}

function bricks(p, seed, y0, y1, ramp, mortar) {
  const r = rng(seed);
  for (let y = y0; y < y1; y += 1) {
    const row = Math.floor((y - y0) / 4);
    const off = row % 2 ? 4 : 0;
    for (let x = 0; x < T; x += 1) {
      const isMortar = (y - y0) % 4 === 3 || (x + off) % 8 === 7;
      if (isMortar) p.set(x, y, mortar);
      else {
        const brickId = (Math.floor((x + off) / 8) * 7 + row * 13 + seed) % 5;
        p.set(x, y, ramp[brickId % ramp.length]);
      }
    }
  }
  p.speckle(0, y0, T, y1 - y0, [mortar, ramp[0]], 0.05, r);
  return p;
}

const BR = [0x7c4b3e, 0x6e4136, 0x86554a, 0x613a31, 0x74463a];
const BM = 0x3a2d28;
const CO = [0x74766e, 0x68685f, 0x7f8078];
const SB = [0x4c5d40, 0x435438, 0x546548, 0x3b4c32];
const SM = 0x232c1c;
const WAL = [0xd9b07a, 0xcfa56e, 0xe3bd8a];

const TILES = {
  void: () => new PB(T, T).fill(0x000000),

  asphalt: () => asphalt(11),
  asphalt2() {
    const p = asphalt(12);
    p.line(2, 3, 6, 7, 0x2e2f33); p.line(6, 7, 5, 12, 0x2e2f33); p.line(6, 7, 11, 9, 0x2e2f33);
    return p;
  },
  asphalt3() {
    const p = asphalt(13);
    p.ellipse(9, 8, 5, 3, 0x46484c);
    p.speckle(0, 0, T, T, [0x3a3c40], 0.05, rng(15));
    return p;
  },
  sidewalk() {
    const p = base(0x7e7e74, 21, [0x72726a, 0x8a8a80, 0x68685f], 0.2);
    p.rect(0, 15, T, 1, 0x4e4e48);
    p.rect(15, 0, 1, T, 0x4e4e48);
    return p;
  },
  sidewalk2() {
    const p = TILES.sidewalk();
    p.line(3, 0, 8, 6, 0x4e4e48); p.line(8, 6, 7, 11, 0x4e4e48);
    p.speckle(0, 0, T, T, [0x5a6638], 0.03, rng(22));
    return p;
  },
  grass_dead() {
    const p = base(0x5a5238, 31, [0x4e4830, 0x665e40], 0.3);
    const r = rng(32);
    for (let i = 0; i < 11; i += 1) {
      const x = Math.floor(r() * T);
      const y = Math.floor(r() * T);
      p.line(x, y, x + (r() < 0.5 ? -1 : 1), y - 2, r() < 0.5 ? 0x847a48 : 0x6e6a3c);
    }
    return p;
  },
  gutter0: () => water(0x2c4a56, 0x38606c, 0x6a9aa0, 41),
  gutter1: () => water(0x2c4a56, 0x38606c, 0x6a9aa0, 42),
  deep0: () => water(0x12242c, 0x1a303a, 0x3a5a66, 43, 0.5),
  deep1: () => water(0x12242c, 0x1a303a, 0x3a5a66, 44, 0.5),
  puddle() { return puddle(51); },
  puddle1() { return puddle(52); },
  grate() {
    const p = new PB(T, T).fill(0x56584f);
    p.rect(1, 1, 14, 14, 0x0e100c);
    for (let y = 2; y < 15; y += 3) p.rect(1, y, 14, 1, 0x6a6c60);
    for (let x = 3; x < 15; x += 4) p.rect(x, 1, 1, 14, 0x5a5c52);
    return p;
  },
  s_floor: () => floorStone(61),
  s_floor2() {
    const p = floorStone(62);
    p.line(1, 12, 6, 9, 0x323a2c); p.line(6, 9, 13, 11, 0x323a2c);
    return p;
  },
  s_moss() {
    const p = floorStone(63);
    const r = rng(64);
    for (let i = 0; i < 5; i += 1) {
      p.ellipse(2 + r() * 12, 2 + r() * 12, 1 + r() * 3, 1 + r() * 2, r() < 0.5 ? 0x5e7e30 : 0x4e6c28);
    }
    return p;
  },
  s_shallow0: () => sludge(0x3f5a1e, 0x4e6c24, 0x8cae34, 71),
  s_shallow1: () => sludge(0x3f5a1e, 0x4e6c24, 0x8cae34, 72),
  s_deep0: () => sludge(0x222f10, 0x2d3f16, 0x6e8c28, 73, 0.6),
  s_deep1: () => sludge(0x222f10, 0x2d3f16, 0x6e8c28, 74, 0.6),
  wood() {
    const p = new PB(T, T).fill(0xa86e3c);
    const r = rng(81);
    for (let y = 0; y < T; y += 1) for (let x = 0; x < T; x += 1) {
      if (r() < 0.12) p.set(x, y, 0xb87c46);
      else if (r() < 0.1) p.set(x, y, 0x98602f);
    }
    p.rect(0, 7, T, 1, 0x6a4220);
    p.rect(0, 15, T, 1, 0x6a4220);
    p.rect(5, 0, 1, 7, 0x6a4220);
    p.rect(12, 8, 1, 7, 0x6a4220);
    return p;
  },
  checker() {
    const p = new PB(T, T);
    for (let y = 0; y < T; y += 1) for (let x = 0; x < T; x += 1) {
      const c = (Math.floor(x / 8) + Math.floor(y / 8)) % 2 ? 0x7c7c70 : 0x585850;
      p.set(x, y, c);
    }
    p.speckle(0, 0, T, T, [0x4a4a44, 0x4e2a24], 0.07, rng(91));
    return p;
  },
  carpet() {
    const p = new PB(T, T).fill(0xa8402e);
    for (let y = 0; y < T; y += 1) for (let x = 0; x < T; x += 1) {
      if ((x + y) % 8 === 0 || (x - y + 16) % 8 === 0) p.set(x, y, 0xc45c38);
      if ((x + y) % 8 === 4 && (x - y + 16) % 8 === 4) p.set(x, y, 0xe0a050);
    }
    return p;
  },
  planks() {
    const p = new PB(T, T).fill(0x6a5438);
    for (let y = 0; y < T; y += 4) p.rect(0, y, T, 1, 0x2c2218);
    p.speckle(0, 0, T, T, [0x5a4630, 0x7a6444], 0.2, rng(95));
    return p;
  },

  // ------------------------------------------------------------- Walls
  brick_top() {
    const p = base(0x3c3633, 101, [0x332e2b, 0x45403c, 0x2a2523], 0.35);
    return p;
  },
  brick_up: () => bricks(new PB(T, T), 102, 0, 16, BR, BM),
  brick_low() {
    const p = bricks(new PB(T, T), 103, 0, 16, BR, BM);
    grimeBase(p, 0x2a221e, 0x3a4a30);
    return p;
  },
  conc_top: () => base(0x35363a, 111, [0x2e2f33, 0x3e3f42], 0.3),
  conc_up() {
    const p = base(CO[0], 112, [CO[1], CO[2]], 0.18);
    p.rect(0, 7, T, 1, 0x56564e);
    p.rect(0, 15, T, 1, 0x56564e);
    return p;
  },
  conc_low() {
    const p = TILES.conc_up();
    grimeBase(p, 0x3a3a34, 0x4e2a24);
    return p;
  },
  sewer_top: () => base(0x1a2216, 121, [0x141a10, 0x222c1c], 0.3),
  sewer_up() {
    const p = bricks(new PB(T, T), 122, 0, 16, SB, SM);
    slime(p, 123);
    return p;
  },
  sewer_low() {
    const p = bricks(new PB(T, T), 124, 0, 16, SB, SM);
    slime(p, 125);
    grimeBase(p, 0x1e2614, 0x6a8a2a);
    return p;
  },
  house_top: () => base(0x5a3c28, 131, [0x4e3220, 0x664630], 0.2),
  house_up() {
    const p = new PB(T, T);
    for (let y = 0; y < T; y += 1) for (let x = 0; x < T; x += 1) {
      p.set(x, y, x % 8 < 4 ? WAL[0] : WAL[1]);
    }
    p.rect(0, 0, T, 1, 0x8a6240);
    return p;
  },
  house_low() {
    const p = TILES.house_up();
    p.rect(0, 8, T, 8, 0x8a5a34);
    p.rect(0, 8, T, 1, 0xb07c48);
    for (let x = 3; x < T; x += 5) p.rect(x, 9, 1, 7, 0x6a4424);
    p.rect(0, 15, T, 1, 0x4e3218);
    return p;
  },

  // ---------------------------------------------------------- Wall overlays
  window_board() {
    const p = new PB(T, T);
    p.rect(2, 2, 12, 12, 0x3a2e28);
    p.rect(3, 3, 10, 10, 0x0e1014);
    p.rect(1, 5, 14, 2, 0x8a6a44); p.rect(2, 9, 12, 2, 0x7a5c3a);
    p.line(3, 13, 12, 2, 0x6e5234);
    p.set(2, 5, 0x2a2420); p.set(13, 9, 0x2a2420);
    return p;
  },
  window_lit() {
    const p = new PB(T, T);
    p.rect(2, 2, 12, 12, 0x3a2a20);
    p.rect(3, 3, 10, 10, 0xf6d070);
    p.rect(3, 3, 10, 3, 0xffe8a0);
    p.rect(7, 3, 2, 10, 0x4a3424);
    p.rect(3, 7, 10, 1, 0x4a3424);
    return p;
  },
  window_rain() {
    const p = new PB(T, T);
    p.rect(1, 2, 14, 12, 0x6a4424);
    p.rect(2, 3, 12, 10, 0x2a3e52);
    const r = rng(141);
    for (let i = 0; i < 9; i += 1) {
      const x = 2 + Math.floor(r() * 12);
      const y = 3 + Math.floor(r() * 7);
      p.rect(x, y, 1, 3, 0x7aa0b8);
    }
    p.rect(7, 3, 2, 10, 0x6a4424);
    p.rect(2, 7, 12, 1, 0x6a4424);
    p.rect(0, 13, T, 2, 0xe0c090);
    return p;
  },
  poster_torn() {
    const p = new PB(T, T);
    p.rect(3, 2, 10, 12, 0xb8b09a);
    p.rect(5, 4, 6, 3, 0x5a5a60);
    p.rect(4, 8, 8, 1, 0x4a4438); p.rect(4, 10, 6, 1, 0x4a4438);
    p.set(3, 13, 0); p.set(12, 2, 0);
    for (const [x, y] of [[12, 13], [11, 13], [12, 12], [3, 2]]) p.d[(y * T + x) * 4 + 3] = 0;
    return p;
  },
  door_shop() {
    const p = new PB(T, T);
    p.rect(1, 0, 14, 16, 0x5a2a22);
    p.rect(2, 1, 12, 15, 0x7a3a2c);
    p.speckle(2, 1, 12, 15, [0x8a5030, 0x5a2e22], 0.2, rng(151));
    p.rect(11, 8, 2, 2, 0xc8b070);
    p.rect(4, 3, 8, 3, 0x1a1a1e);
    return p;
  },
  door_home() {
    const p = new PB(T, T);
    p.rect(1, 0, 14, 16, 0x5e3218);
    p.rect(2, 1, 12, 15, 0xc0502e);
    p.rect(3, 2, 10, 5, 0xd86a3a);
    p.rect(3, 9, 10, 6, 0xd86a3a);
    p.rect(5, 3, 6, 3, 0xffe6a0);
    p.rect(11, 8, 2, 2, 0xffd860);
    return p;
  },
  ladder() {
    const p = new PB(T, T);
    p.rect(3, 0, 2, T, 0x8a7a5a); p.rect(11, 0, 2, T, 0x8a7a5a);
    p.rect(4, 0, 1, T, 0x5e5238); p.rect(12, 0, 1, T, 0x5e5238);
    for (let y = 2; y < T; y += 4) p.rect(5, y, 6, 1, 0xa89a70);
    return p;
  },
  culvert() { return culvert(false); },
  culvert_w() { return culvert(true); },
  culvert_d() {
    const p = new PB(T, T).fill(0x2a3424);
    p.rect(1, 1, 14, 14, 0x080a06);
    p.rect(0, 0, T, 1, 0x5e6e44);
    p.vgrad(1, 1, 14, 14, [0x1a2212, 0x0e120a, 0x040504]);
    return p;
  },

  // ------------------------------------------------------------- Objects
  fence() {
    const p = new PB(T, T);
    for (let y = 2; y < 15; y += 1) for (let x = 0; x < T; x += 1) {
      if ((x + y) % 4 === 0 || (x - y + 32) % 4 === 0) p.set(x, y, 0x8a8e88);
    }
    p.rect(0, 1, T, 1, 0xa0a49c);
    p.rect(7, 0, 2, T, 0x6a6e68);
    p.rect(7, 0, 1, T, 0x9a9e96);
    return p;
  },
  trash() {
    const p = new PB(T, T);
    const r = rng(161);
    for (let i = 0; i < 16; i += 1) {
      const x = 1 + Math.floor(r() * 12);
      const y = 4 + Math.floor(r() * 10);
      const c = [0x7a7262, 0x5a5448, 0xa8a088, 0x4a5a44, 0x884a38][Math.floor(r() * 5)];
      p.rect(x, y, 2 + Math.floor(r() * 2), 1 + Math.floor(r() * 2), c);
    }
    return p;
  },
  bags() {
    const p = new PB(T, T);
    const ramp = [0x101014, 0x1e1e24, 0x2e2e36, 0x46464e, 0x6a6a74];
    p.blob(5, 10, 5, 5, ramp);
    p.blob(11, 11, 4, 4, ramp);
    p.blob(8, 6, 4, 4, ramp);
    p.rect(8, 2, 1, 2, 0x46464e);
    return p;
  },
  dumpster_l: () => sliced(dumpster(), 0),
  dumpster_r: () => sliced(dumpster(), 1),
  can() {
    const p = new PB(T, T);
    p.vgrad(3, 4, 10, 11, [0x8a8e8e, 0x74787a, 0x54585a, 0x3e4244]);
    for (let x = 5; x < 13; x += 3) p.rect(x, 5, 1, 9, 0x4a4e50);
    p.rect(2, 3, 12, 2, 0xa8acac);
    p.rect(6, 1, 4, 2, 0x8a8e8e);
    return p;
  },
  barrel() {
    const p = new PB(T, T);
    p.vgrad(3, 3, 10, 12, [0x7c4e30, 0x683f28, 0x4c2e1e]);
    p.rect(3, 6, 10, 1, 0x3e2618); p.rect(3, 11, 10, 1, 0x3e2618);
    p.ellipse(8, 3, 5, 2, 0x2a1c14);
    p.speckle(3, 3, 10, 12, [0xa8602e, 0x3e2618], 0.14, rng(171));
    return p;
  },
  fire0: () => fire(0),
  fire1: () => fire(1),
  crate() {
    const p = new PB(T, T);
    p.rect(2, 3, 12, 12, 0x8a6a42);
    p.rect(2, 3, 12, 1, 0xb08a58); p.rect(2, 14, 12, 1, 0x4a3820);
    p.rect(2, 3, 1, 12, 0x4e3c24); p.rect(13, 3, 1, 12, 0x4e3c24);
    p.line(3, 4, 12, 13, 0x5e4830); p.line(3, 13, 12, 4, 0x5e4830);
    return p;
  },
  box() {
    // Save point: a dry cardboard box with a stub of candle. Warm on purpose.
    const p = new PB(T, T);
    p.rect(1, 6, 14, 9, 0xb88a50);
    p.rect(1, 6, 14, 1, 0xd8ac70);
    p.rect(1, 14, 14, 1, 0x7a5a30);
    p.rect(7, 7, 2, 8, 0x8a6a3a);
    p.line(1, 6, 4, 3, 0xc89a60); p.line(14, 6, 11, 3, 0xc89a60);
    p.rect(4, 3, 8, 3, 0x241a10);
    p.rect(7, 2, 2, 3, 0xe8e0c8);
    p.set(7, 0, 0xffe080); p.set(8, 1, 0xffb040); p.set(7, 1, 0xfff0a0);
    return p;
  },
  rubble() {
    const p = new PB(T, T);
    const ramp = [0x3e3a34, 0x56524a, 0x726c60, 0x8a8478];
    const r = rng(181);
    for (let i = 0; i < 8; i += 1) p.blob(2 + r() * 12, 5 + r() * 9, 2 + r() * 3, 2 + r() * 2, ramp);
    return p;
  },
  rubble_s() {
    const p = new PB(T, T);
    const ramp = [0x3e3a34, 0x56524a, 0x726c60];
    const r = rng(182);
    for (let i = 0; i < 5; i += 1) p.blob(2 + r() * 12, 4 + r() * 10, 1 + r(), 1 + r(), ramp);
    return p;
  },
  tire() {
    const p = new PB(T, T);
    p.ellipse(8, 10, 7, 5, 0x1e1e20);
    p.ellipse(8, 9, 7, 4, 0x2e2e30);
    p.ellipse(8, 9, 3, 2, 0x0a0a0c);
    return p;
  },
  lamp_base() {
    const p = new PB(T, T);
    p.rect(7, 0, 2, 13, 0x4a4e50);
    p.rect(7, 0, 1, 13, 0x6e7274);
    p.rect(5, 12, 6, 3, 0x34383a);
    return p;
  },
  lamp_top() {
    const p = new PB(T, T);
    p.rect(7, 4, 2, 12, 0x4a4e50);
    p.rect(7, 4, 1, 12, 0x6e7274);
    p.rect(4, 2, 8, 2, 0x34383a);
    p.rect(5, 4, 6, 2, 0xffe6a0);
    return p;
  },
  lamp_dead() {
    const p = new PB(T, T);
    p.rect(7, 4, 2, 12, 0x4a4e50);
    p.rect(4, 2, 8, 2, 0x34383a);
    p.rect(5, 4, 6, 2, 0x20201e);
    return p;
  },
  car_tl: () => sliced(car(), 0, 3),
  car_tm: () => sliced(car(), 1, 3),
  car_tr: () => sliced(car(), 2, 3),
  car_bl: () => sliced(car(), 3, 3),
  car_bm: () => sliced(car(), 4, 3),
  car_br: () => sliced(car(), 5, 3),
  pipe() {
    const p = new PB(T, T);
    p.vgrad(0, 1, 13, 14, [0x7a7a70, 0x5a5a52, 0x3a3a34]);
    p.rect(13, 0, 3, T, 0x4a4a42);
    p.rect(14, 2, 2, 12, 0x08080a);
    p.speckle(0, 1, 13, 14, [0x7a4a2c, 0x5a3a24], 0.14, rng(201));
    return p;
  },
  bones() {
    const p = new PB(T, T);
    const c = 0xcfc8ae;
    p.line(3, 11, 9, 8, c); p.line(5, 6, 8, 12, c); p.line(10, 12, 13, 10, c);
    p.rect(2, 10, 2, 2, c); p.rect(9, 7, 2, 2, c);
    p.rect(11, 4, 3, 3, c); p.set(12, 5, 0x20201c);
    return p;
  },
  bottle() {
    const p = new PB(T, T);
    p.rect(5, 10, 5, 2, 0x5a8a50);
    p.rect(10, 10, 3, 1, 0x7aaa70);
    p.set(6, 10, 0xb0d8a0);
    p.set(3, 13, 0x5a8a50); p.set(12, 13, 0x7aaa70); p.set(9, 14, 0x5a8a50);
    return p;
  },
  carcass() {
    const p = new PB(T, T);
    p.rect(7, 0, 2, 4, 0x8a8e8e);
    const ramp = [0x3c1412, 0x6a2420, 0x923830, 0xb85a4c, 0xd8a090];
    p.blob(8, 9, 5, 6, ramp);
    p.rect(6, 6, 1, 7, 0xd8c8b0); p.rect(9, 6, 1, 7, 0xd8c8b0);
    return p;
  },
  table() {
    const p = new PB(T, T);
    p.rect(0, 4, T, 8, 0x8e9090);
    p.rect(0, 4, T, 1, 0xb0b2b2);
    p.rect(0, 11, T, 1, 0x4a4c4c);
    p.rect(2, 12, 2, 3, 0x3e4040); p.rect(12, 12, 2, 3, 0x3e4040);
    p.ellipse(9, 7, 3, 2, 0x5c2420);
    return p;
  },
  sign_post() {
    const p = new PB(T, T);
    p.rect(7, 7, 2, 8, 0x4a4438);
    p.rect(2, 1, 12, 8, 0x9a947a);
    p.rect(2, 1, 12, 1, 0xc0b89a);
    p.rect(3, 3, 10, 1, 0x3a3428); p.rect(3, 5, 7, 1, 0x3a3428);
    return p;
  },
  gate_open() {
    const p = new PB(T, T);
    p.rect(0, 0, 2, T, 0x6a6e68);
    p.rect(14, 0, 2, T, 0x6a6e68);
    for (let y = 0; y < 8; y += 1) for (let x = 2; x < 6; x += 1) {
      if ((x + y) % 3 === 0) p.set(x, y + 3, 0x8a8e88);
    }
    return p;
  },
  cage() {
    const p = cageBase();
    // a caged cat, eyes only, huddled at the back
    p.ellipse(8, 11, 4, 3, 0x38363c);
    p.set(6, 9, 0xe0d050); p.set(10, 9, 0xe0d050);
    bars(p);
    return p;
  },
  cage_open() {
    const p = cageBase();
    p.rect(13, 3, 3, 12, 0x000000);
    for (let y = 3; y < 15; y += 1) for (let x = 13; x < 16; x += 1) p.d[(y * T + x) * 4 + 3] = 0;
    bars(p, 12);
    return p;
  },
  manhole() {
    const p = new PB(T, T);
    p.ellipse(8, 8, 7, 6, 0x34363a);
    p.ellipse(8, 8, 6, 5, 0x5a5e62);
    for (let y = 4; y < 13; y += 2) p.rect(4, y, 8, 1, 0x34363a);
    p.rect(7, 2, 2, 1, 0x0a0a0a);
    return p;
  },
  valve() {
    const p = new PB(T, T);
    p.rect(6, 7, 4, 8, 0x5a5e50);
    p.rect(3, 12, 10, 3, 0x3a3e34);
    p.ellipse(8, 5, 5, 5, 0xa83c28);
    p.ellipse(8, 5, 3, 3, 0x000000);
    for (let y = 2; y < 9; y += 1) for (let x = 5; x < 12; x += 1) {
      const u = x - 8; const v = y - 5;
      if (u * u + v * v <= 5) p.d[(y * T + x) * 4 + 3] = 0;
    }
    p.rect(7, 3, 2, 5, 0x5a5e50);
    p.rect(6, 5, 4, 1, 0x5a5e50);
    return p;
  },
  ledger() {
    const p = new PB(T, T);
    p.rect(2, 10, 12, 4, 0x4a4438);
    p.rect(3, 2, 10, 9, 0x6a4a2c);
    p.rect(4, 3, 8, 7, 0xc8c0a4);
    p.rect(5, 5, 6, 1, 0x3a3428); p.rect(5, 7, 5, 1, 0x3a3428);
    p.rect(7, 1, 2, 2, 0x8a8e8e);
    return p;
  },
  corpse() {
    const p = new PB(T, T);
    const ramp = [0x1a1e0e, 0x2e3618, 0x4a5426, 0x667436];
    p.blob(8, 10, 7, 4, ramp);
    p.blob(4, 7, 3, 3, ramp);
    p.set(3, 7, 0x0a0a08); p.set(5, 7, 0x0a0a08);
    p.rect(9, 12, 5, 2, 0x3c1412);
    p.rect(10, 6, 4, 3, 0x5a3a22);
    return p;
  },
  bowl_full() {
    const p = new PB(T, T);
    p.ellipse(8, 11, 6, 3, 0x3a70b8);
    p.ellipse(8, 10, 5, 2, 0xc8d8e8);
    p.ellipse(8, 10, 4, 1, 0xe0a070);
    p.set(6, 9, 0xf0c090); p.set(9, 9, 0xf0c090);
    return p;
  },
  bowl_empty() {
    const p = new PB(T, T);
    p.ellipse(8, 11, 6, 3, 0x3a70b8);
    p.ellipse(8, 10, 5, 2, 0xe0ecf4);
    p.ellipse(8, 10, 4, 1, 0xfafcff);
    return p;
  },
  bed_l: () => sliced(bed(), 0),
  bed_r: () => sliced(bed(), 1),
  hearth0: () => hearth(0),
  hearth1: () => hearth(1),
  chair() {
    const p = new PB(T, T);
    p.rect(3, 2, 10, 8, 0x7a4a26);
    p.rect(4, 3, 8, 6, 0xb86a38);
    p.rect(3, 9, 10, 3, 0x8a5a30);
    p.rect(3, 12, 2, 3, 0x4e3218); p.rect(11, 12, 2, 3, 0x4e3218);
    return p;
  },
  plant_pot() {
    const p = new PB(T, T);
    p.rect(5, 10, 6, 5, 0xc06a3a);
    p.rect(4, 9, 8, 2, 0xd88048);
    const ramp = [0x2a5a28, 0x3a7a34, 0x5a9e48];
    p.blob(8, 5, 4, 4, ramp);
    p.blob(5, 7, 2, 2, ramp);
    p.blob(11, 7, 2, 2, ramp);
    return p;
  },
};

// ------------------------------------------------------------------ Helpers

function water(c, c2, hi, seed, amt = 1) {
  const p = new PB(T, T).fill(c);
  const r = rng(seed);
  for (let i = 0; i < 6 * amt; i += 1) {
    const x = Math.floor(r() * T);
    const y = Math.floor(r() * T);
    p.rect(x, y, 3 + Math.floor(r() * 5), 1, c2);
  }
  for (let i = 0; i < 3 * amt; i += 1) {
    p.rect(Math.floor(r() * T), Math.floor(r() * T), 2 + Math.floor(r() * 2), 1, hi);
  }
  return p;
}

function puddle(seed) {
  const p = asphalt(14);
  p.ellipse(8, 8, 7, 5, 0x34525e);
  p.ellipse(7, 7, 5, 3, 0x3e606c);
  const r = rng(seed);
  p.rect(3 + Math.floor(r() * 6), 5 + Math.floor(r() * 5), 3, 1, 0x88b0b8);
  return p;
}

function floorStone(seed) {
  const p = base(0x5e6658, seed, [0x535b4e, 0x687062, 0x4a5246], 0.25);
  p.rect(0, 7, T, 1, 0x323a2c);
  p.rect(0, 15, T, 1, 0x323a2c);
  p.rect(7, 0, 1, 7, 0x323a2c);
  p.rect(15, 8, 1, 7, 0x323a2c);
  return p;
}

function sludge(c, c2, hi, seed, amt = 1) {
  const p = new PB(T, T).fill(c);
  const r = rng(seed);
  for (let i = 0; i < 7; i += 1) p.ellipse(r() * T, r() * T, 1 + r() * 3, 1 + r(), c2);
  for (let i = 0; i < 3 * amt; i += 1) {
    const x = 2 + Math.floor(r() * 12);
    const y = 2 + Math.floor(r() * 12);
    p.rect(x, y, 2, 1, hi);
    p.set(x, y - 1, c2);
  }
  return p;
}

function grimeBase(p, dark, stain) {
  for (let y = 11; y < T; y += 1) {
    for (let x = 0; x < T; x += 1) {
      if ((y - 10) / 6 > bayer(x, y)) p.set(x, y, dark);
    }
  }
  const r = rng(991);
  for (let i = 0; i < 2; i += 1) {
    const x = Math.floor(r() * T);
    const len = 4 + Math.floor(r() * 7);
    p.rect(x, T - len, 1, len, stain);
  }
}

function slime(p, seed) {
  const r = rng(seed);
  for (let i = 0; i < 3; i += 1) {
    const x = Math.floor(r() * T);
    const len = 2 + Math.floor(r() * 8);
    p.rect(x, 0, 1 + Math.floor(r() * 2), len, 0x6a8a2a);
    p.set(x, len, 0x9ab838);
  }
}

function culvert(flip) {
  const p = new PB(T, T).fill(0x4a4c4a);
  p.ellipse(8, 8, 7, 7, 0x70726c);
  p.ellipse(8, 8, 6, 6, 0x0a0c0c);
  p.ellipse(flip ? 9 : 7, 9, 4, 4, 0x030404);
  p.rect(2, 12, 12, 2, 0x2c4a56);
  return p;
}

function sliced(whole, i, cols = 2) {
  const p = new PB(T, T);
  const sx = (i % cols) * T;
  const sy = Math.floor(i / cols) * T;
  for (let y = 0; y < T; y += 1) for (let x = 0; x < T; x += 1) {
    const idx = ((sy + y) * whole.w + sx + x) * 4;
    if (whole.d[idx + 3]) p.set(x, y, (whole.d[idx] << 16) | (whole.d[idx + 1] << 8) | whole.d[idx + 2]);
  }
  return p;
}

const cache = {};
function dumpster() {
  if (cache.dump) return cache.dump;
  const p = new PB(32, 16);
  p.vgrad(1, 5, 30, 10, [0x4a6a44, 0x3e5a3a, 0x2e462c]);
  p.rect(0, 3, 32, 3, 0x2e3e2c);
  p.rect(0, 3, 32, 1, 0x5e7e56);
  for (let x = 5; x < 31; x += 6) p.rect(x, 6, 1, 8, 0x2a3e28);
  p.speckle(1, 5, 30, 10, [0x7a4a2c, 0x5a3a24], 0.07, rng(211));
  p.rect(5, 1, 4, 2, 0x6a6e62); p.rect(21, 1, 5, 2, 0x4a5a44);
  cache.dump = p;
  return p;
}

function car() {
  if (cache.car) return cache.car;
  const p = new PB(48, 32);
  const ramp = [0x28120e, 0x3e1e18, 0x5a2c22, 0x7a3c2a, 0x8a5038];
  // body
  for (let y = 12; y < 28; y += 1) {
    for (let x = 2; x < 46; x += 1) {
      const t = (y - 12) / 16;
      p.set(x, y, ramp[Math.max(0, Math.round((1 - t) * 4 + (bayer(x, y) - 0.5)))]);
    }
  }
  // cabin
  for (let y = 3; y < 14; y += 1) for (let x = 11; x < 37; x += 1) p.set(x, y, ramp[3]);
  p.rect(13, 5, 10, 8, 0x12181e);
  p.rect(25, 5, 10, 8, 0x12181e);
  p.line(14, 12, 20, 6, 0x4a5a64);
  p.line(26, 7, 30, 12, 0x4a5a64); p.line(30, 7, 33, 11, 0x4a5a64);
  // rust and damage
  p.speckle(2, 12, 44, 16, [0x201008, 0xa0562c, 0x7a4a2c], 0.13, rng(221));
  p.rect(2, 16, 3, 4, 0x8a8a70); // dead headlight
  p.rect(43, 16, 3, 3, 0x5a1a14); // tail light
  // flat tires
  p.rect(7, 26, 9, 5, 0x141416); p.rect(32, 26, 9, 5, 0x141416);
  p.rect(10, 27, 3, 3, 0x46464a); p.rect(35, 27, 3, 3, 0x46464a);
  cache.car = p;
  return p;
}

function fire(f) {
  const p = TILES.barrel();
  const r = rng(301 + f);
  for (let i = 0; i < 14; i += 1) {
    const x = 4 + r() * 8;
    const h = 1 + r() * 4;
    p.rect(x, 3 - h, 1, h + 1, [0xff9020, 0xffd060, 0xe05010][Math.floor(r() * 3)]);
  }
  return p;
}

function cageBase() {
  const p = new PB(T, T);
  p.rect(1, 3, 14, 12, 0x16161a);
  return p;
}

function bars(p, w = 15) {
  for (let x = 1; x < w; x += 2) p.rect(x, 3, 1, 12, 0x9a9e98);
  p.rect(1, 3, 14, 1, 0xb8bcb4);
  p.rect(1, 14, 14, 1, 0x6a6e68);
}

function bed() {
  if (cache.bed) return cache.bed;
  const p = new PB(32, 16);
  p.rect(0, 3, 32, 12, 0x7a4a26);
  p.rect(1, 4, 30, 9, 0xe8dcc0);
  p.rect(1, 9, 22, 4, 0xc0503a);
  p.rect(1, 9, 22, 1, 0xe07a50);
  p.rect(23, 4, 8, 9, 0xfaf4e4);
  p.ellipse(27, 8, 3, 2, 0xd8ccb0);
  for (let x = 3; x < 22; x += 4) p.rect(x, 11, 2, 2, 0xe8a050);
  cache.bed = p;
  return p;
}

function hearth(f) {
  const p = new PB(T, T).fill(0x8a4a30);
  bricks(p, 311, 0, T, [0x9a5238, 0x884630, 0xa45c40], 0x4e2c1c);
  p.rect(2, 4, 12, 12, 0x140a06);
  const r = rng(321 + f);
  for (let i = 0; i < 22; i += 1) {
    const x = 3 + r() * 10;
    const h = 2 + r() * 7;
    p.rect(x, 15 - h, 1, h, [0xff9020, 0xffd060, 0xe05010, 0xfff0a0][Math.floor(r() * 4)]);
  }
  p.rect(1, 2, 14, 2, 0x5e3218);
  return p;
}

/** Bakes every tile into one sheet. Returns {name: index}. */
export function createTileset(scene) {
  const names = Object.keys(TILES);
  const cols = 16;
  const rows = Math.ceil(names.length / cols);
  const sheet = new PB(cols * T, rows * T);
  const index = {};
  names.forEach((name, i) => {
    sheet.blit(TILES[name](), (i % cols) * T, Math.floor(i / cols) * T);
    index[name] = i;
  });
  scene.textures.addCanvas('tiles', sheet.toCanvas());
  return index;
}

export const TILE_NAMES = Object.keys(TILES);
export { mix };
