// Overworld sprites: hand-keyed 16x16 cats and vermin, plus small procedural
// people. Palette swaps cover the NPC cats and mutated rats.

import { PB, addSheet } from './pixel.js';

const CAT_FRONT = [
  '................',
  '...k.......k....',
  '..kgk.....kdk...',
  '..kpgkkkkkgpk...',
  '.kgggdgdgdgggk..',
  '.kgggggggggggk..',
  '.kgyygggggyygk..',
  '.kgybgggggbygk..',
  '.kllgggpgggllk..',
  '..kllgwwwgllk...',
  '...kkgwwwgkk....',
  '...kgdwwwdgk.kk.',
  '...kggwwwggkkgk.',
  '...kgggggggkgk..',
];
const CAT_FRONT_LEGS = [
  ['...kgk.k.kgkk...', '...kk.....kk....'],
  ['...kgk...kk.....', '....k...kgk.....'],
];

const CAT_BACK = [
  '................',
  '...k.......k....',
  '..kgk.....kdk...',
  '..kggkkkkkggk...',
  '.kgggdgdgdgggk..',
  '.kgggdgdgdgggk..',
  '.kgggggdggg ggk.',
  '.kdgggdgdgggdk..',
  '..kgggggggggk...',
  '...kkggdggkk....',
  '...kgdgggdgk.kk.',
  '...kgggdgggkkgk.',
  '...kdgggggdkgk..',
  '...kgggdgggkk...',
];
const CAT_BACK_LEGS = [
  ['...kgk.k.kgk....', '...kk.....kk....'],
  ['...kgk...kk.....', '....k...kgk.....'],
];

const CAT_SIDE = [
  '................',
  '..........k...k.',
  '..kk.....kgk.kdk',
  '.kgk.....kpgkgpk',
  '.kgk....kgggggggk'.slice(0, 16),
  '.kgk....kgyygyyk',
  '.kgk....kgybgybk',
  '.kgdk.kkkggggpgk',
  '..kgkkgdgdllwwk.',
  '...kggdgdggwwk..',
  '...kgggdgggggk..',
  '...kgggggggggk..',
];
const CAT_SIDE_LEGS = [
  ['...kgkkgggkkgk..', '...kgk.kk...kgk.', '...kk.......kk..', '................'],
  ['...kgggkkkgggk..', '....kgk..kgk....', '....kk...kk.....', '................'],
];

const RAT = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '..........kk.k..',
  '.....kkkkkgpkgk.',
  '...kkggggggggggk',
  'k.kgggdgggggyggk',
  'gkkggggdgggggggp',
  '.kggggggggggkkk.',
  '..kggggggggk....',
];
const RAT_LEGS = [
  ['...kpk.kpk.kpk..', '................', '................'],
  ['....kpk.kpkk.pk.', '................', '................'],
];

const DOG = [
  '........................',
  '.................kk.....',
  '................kdgk....',
  '................kddgk...',
  '...............kdggggkk.',
  '...............kgyggggdk',
  '.k.............kgggggggk',
  'kdk.kkkkkkkkkkkkggwwkkk.',
  'kdkkdgggggggggggggwkk...',
  '.kdgdggdgggdggdgggk.....',
  '..kggggdgggggdggggk.....',
  '..kgggggggggggggggk.....',
  '..kgkggkkkkkkkkkgkgk....',
];
const DOG_LEGS = [
  ['..kgkgk.......kgkgk.....', '..kgkgk.......kgkgk.....', '..kkkkk.......kkkkk.....'],
  ['...kgk.kgk...kgk.kgk....', '...kgk.kgk...kgk.kgk....', '...kk..kk....kk..kk.....'],
];

const CROW = [
  '................',
  '................',
  '................',
  '......kkkk......',
  '.....kggggk.....',
  '.....kgygbkk....',
  '.....kggggyyk...',
  '....kgggggkk....',
  '...kgdgggggk....',
  '...kgdggdggk....',
  '...kgdggdggk....',
  '....kggdggk.....',
  '.....kkkkk......',
  '.....k...k......',
  '....kyk.kyk.....',
  '................',
];

const CAT_PAL = {
  k: 0x0e0d12, g: 0x8a8690, d: 0x5a5660, l: 0xb8b4b8, w: 0xe8e4da,
  y: 0xf4d43c, b: 0x0e0d12, p: 0xd08a8a,
};
const TOM_PAL = { ...CAT_PAL, g: 0xa0683a, d: 0x6e4424, l: 0xc89a6a, w: 0xd8c8a8, y: 0x9ac850 };
const PATCH_PAL = { ...CAT_PAL, g: 0xc8c0b0, d: 0x3a3430, l: 0xc0783a, w: 0xf0ece0, y: 0x70c0a0 };
const KIT_PAL = { ...CAT_PAL, g: 0x77737a, d: 0x4e4a50, l: 0xa09ca0, y: 0x7ab0d0 };
const RAT_PAL = { k: 0x0c0b0e, g: 0x6e6252, d: 0x4e4438, y: 0xe03828, p: 0xc88a7a };
const MUT_PAL = { k: 0x0c0b0e, g: 0x6a7a40, d: 0xa05a50, y: 0xd8e830, p: 0xd06a5a };
const PALE_PAL = { k: 0x2a2a2a, g: 0xd8d4cc, d: 0xb0aca4, y: 0xd8d4cc, p: 0xe8b0b0 };
const DOG_PAL = { k: 0x0c0b0e, g: 0x7a6248, d: 0x4e3e2e, w: 0xe8e0d0, y: 0xe8b040 };
const HOUND_PAL = { k: 0x0c0b0e, g: 0x46424a, d: 0x7a3a34, w: 0xe8e0d0, y: 0xe84030 };
const CROW_PAL = { k: 0x08080c, g: 0x2e2e3a, d: 0x4a4a5e, y: 0xd8c040, b: 0x08080c };

function frame16(rows, legs, pal, w = 16, h = 16) {
  const p = new PB(w, h);
  p.art(rows, pal);
  p.art(legs, pal, 0, rows.length);
  return p;
}

function catSheet(scene, key, pal) {
  addSheet(scene, key, {
    down0: frame16(CAT_FRONT, CAT_FRONT_LEGS[0], pal),
    down1: frame16(CAT_FRONT, CAT_FRONT_LEGS[1], pal),
    up0: frame16(CAT_BACK, CAT_BACK_LEGS[0], pal),
    up1: frame16(CAT_BACK, CAT_BACK_LEGS[1], pal),
    side0: frame16(CAT_SIDE, CAT_SIDE_LEGS[0], pal),
    side1: frame16(CAT_SIDE, CAT_SIDE_LEGS[1], pal),
  }, 16, 16);
}

function sideSheet(scene, key, rows, legs, pal, w = 16, h = 16) {
  const a = frame16(rows, legs[0], pal, w, h);
  const b = frame16(rows, legs[1], pal, w, h);
  addSheet(scene, key, { side0: a, side1: b, down0: a, down1: b, up0: a, up1: b }, w, h);
}

/** Small people, 16x24, recoloured by role. */
function person(dir, f, c) {
  const p = new PB(16, 24);
  const stride = f === 0 ? 0 : 1;
  // legs
  if (dir === 'side') {
    p.rect(6, 16, 3, 6 - stride, c.leg);
    p.rect(8, 16, 3, 6 + stride - 1, c.legD);
    p.rect(6, 22 - stride, 3, 1, c.boot);
    p.rect(8 + stride, 21 + stride - 1, 3, 2, c.boot);
  } else {
    p.rect(5, 16, 3, 6 - stride, c.leg);
    p.rect(9, 16, 3, 6 - (1 - stride), c.leg);
    p.rect(5, 22 - stride, 3, 2, c.boot);
    p.rect(9, 21 + stride, 3, 2, c.boot);
  }
  // torso
  const fat = c.fat ? 1 : 0;
  p.rect(4 - fat, 8, 8 + fat * 2, 9, c.coat);
  p.rect(4 - fat, 8, 8 + fat * 2, 1, c.coatL);
  p.rect(4 - fat, 15, 8 + fat * 2, 2, c.coatD);
  if (dir !== 'side') {
    p.rect(3 - fat, 9, 2, 7 + (f ? 1 : 0), c.coatD);
    p.rect(11 + fat, 9, 2, 7 + (f ? 0 : 1), c.coatD);
    p.rect(3 - fat, 16, 2, 1, c.skin);
    p.rect(11 + fat, 16, 2, 1, c.skin);
  } else {
    p.rect(7, 9, 3, 7, c.coatD);
    p.rect(7, 16, 3, 1, c.skin);
  }
  // head
  p.rect(5, 2, 6, 6, c.skin);
  p.rect(5, 7, 6, 1, c.skinD);
  if (dir === 'down') {
    p.set(6, 5, 0x0a0a0c); p.set(9, 5, 0x0a0a0c);
  } else if (dir === 'side') {
    p.set(9, 5, 0x0a0a0c);
    p.set(11, 5, c.skin);
  }
  // hair or hood
  if (c.mask) {
    p.rect(5, 4, 6, 3, c.mask);
    if (dir !== 'up') p.rect(6, 5, 1, 1, 0xc8e070), p.rect(9, 5, 1, 1, 0xc8e070);
  }
  p.rect(5, 1, 6, dir === 'up' ? 6 : 2, c.hair);
  if (c.hood) {
    p.rect(4, 2, 1, 6, c.hair);
    p.rect(11, 2, 1, 6, c.hair);
  }
  if (c.cap) p.rect(dir === 'side' ? 6 : 4, 2, dir === 'side' ? 7 : 8, 1, c.cap);
  p.outline(0x0c0b0e);
  return p;
}

function personSheet(scene, key, colors) {
  const frames = {};
  for (const dir of ['down', 'up', 'side']) {
    for (const f of [0, 1]) frames[`${dir}${f}`] = person(dir, f, colors);
  }
  addSheet(scene, key, frames, 16, 24);
}

const PEOPLE = {
  drunk: { leg: 0x3a3e4a, legD: 0x2c2f3a, boot: 0x2a2018, coat: 0x6a5a3e, coatL: 0x867450, coatD: 0x4e4230, skin: 0xc09a7a, skinD: 0x9a7458, hair: 0x4a3a2e, fat: true },
  knife: { leg: 0x2e2e36, legD: 0x22222a, boot: 0x18181c, coat: 0x5a2c30, coatL: 0x763c3e, coatD: 0x3e1e22, skin: 0xb08a6e, skinD: 0x8a684e, hair: 0x2a1a1e, hood: true },
  exterm: { leg: 0x4a5426, legD: 0x3a421e, boot: 0x1a1a14, coat: 0x667436, coatL: 0x82924a, coatD: 0x4a5426, skin: 0x667436, skinD: 0x4a5426, hair: 0x4a5426, mask: 0x1e2014 },
  catcher: { leg: 0x2a2c3a, legD: 0x20222e, boot: 0x14141a, coat: 0x4a4e5e, coatL: 0x666a7c, coatD: 0x343846, skin: 0xb88e70, skinD: 0x926c50, hair: 0x20222e, cap: 0x14141a, fat: true },
  lady: { leg: 0x8a6a5a, legD: 0x7a5a4a, boot: 0x6a3a2a, coat: 0xa86a8a, coatL: 0xc88aa4, coatD: 0x86506c, skin: 0xe0b89a, skinD: 0xc09878, hair: 0xd8d4d0 },
};

export function createSprites(scene, makeBig) {
  catSheet(scene, 'cat', CAT_PAL);
  catSheet(scene, 'tom', TOM_PAL);
  catSheet(scene, 'patch', PATCH_PAL);
  catSheet(scene, 'kitten', KIT_PAL);
  sideSheet(scene, 'rat', RAT, RAT_LEGS, RAT_PAL);
  sideSheet(scene, 'mutant', RAT, RAT_LEGS, MUT_PAL);
  sideSheet(scene, 'pale', RAT, RAT_LEGS, PALE_PAL);
  sideSheet(scene, 'dog', DOG, DOG_LEGS, DOG_PAL, 24, 16);
  sideSheet(scene, 'hound', DOG, DOG_LEGS, HOUND_PAL, 24, 16);
  const crow = new PB(16, 16).art(CROW, CROW_PAL);
  addSheet(scene, 'crow', { down0: crow, down1: crow, up0: crow, up1: crow, side0: crow, side1: crow }, 16, 16);
  for (const [k, c] of Object.entries(PEOPLE)) personSheet(scene, k, c);

  // Bosses and bloaters on the map are shrunken versions of their battle art.
  for (const [key, source, factor] of makeBig) {
    const small = source.scaled(factor);
    addSheet(scene, key, { down0: small, down1: small, up0: small, up1: small, side0: small, side1: small }, small.w, small.h);
  }

  // Shadow blob under actors
  const sh = new PB(14, 6);
  sh.ellipse(7, 3, 6, 2, 0x000000);
  scene.textures.addCanvas('shadow', sh.toCanvas());

  // Loot glint
  const glint = new PB(7, 7);
  glint.rect(3, 0, 1, 7, 0xfff0b0);
  glint.rect(0, 3, 7, 1, 0xfff0b0);
  glint.rect(2, 2, 3, 3, 0xffffff);
  scene.textures.addCanvas('glint', glint.toCanvas());

  // Eyes that catch the light. Drawn above the darkness.
  const eyes = new PB(4, 1);
  eyes.set(0, 0, 0xffffff);
  eyes.set(3, 0, 0xffffff);
  scene.textures.addCanvas('eyes', eyes.toCanvas());

  // Alert mark
  const alert = new PB(5, 9);
  alert.rect(1, 0, 3, 6, 0xe84030);
  alert.rect(1, 7, 3, 2, 0xe84030);
  alert.outline(0x000000);
  scene.textures.addCanvas('alert', alert.toCanvas());
}
