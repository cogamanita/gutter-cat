// Large battle sprites and dialogue portraits, sculpted out of shaded blobs.

import { PB, rng } from './pixel.js';

const OUT = 0x0a090c;

const R = {
  catFur: [0x18171c, 0x2c2a32, 0x46434c, 0x6a6670, 0x928e98, 0xbcb8c0],
  ratFur: [0x15120e, 0x2a241c, 0x443a2e, 0x62543f, 0x7e6e54],
  grease: [0x100e0a, 0x241e14, 0x3a2f20, 0x584a2e, 0x806c3e, 0xb8a060],
  skinPink: [0x4a1e1e, 0x7a3a34, 0xa85e50, 0xd08a7a, 0xeab0a0],
  mutant: [0x10160a, 0x263018, 0x3e4c24, 0x5e6e34, 0x7e9044],
  tumor: [0x3a1c18, 0x6e3028, 0xa4503e, 0xc87a60, 0xe0a488],
  bloat: [0x1a2010, 0x344020, 0x546430, 0x7a8c40, 0xa0b058, 0xc4d078],
  dog: [0x14100c, 0x2c2218, 0x4a3a28, 0x6e583c, 0x907450],
  hound: [0x0e0d10, 0x201e24, 0x38353e, 0x524e58, 0x6e6a74],
  mother: [0x0e0a0c, 0x281a1e, 0x4a2c2e, 0x74463e, 0xa06a54, 0xc89478],
  skinH: [0x3a2418, 0x6a4630, 0x98704e, 0xc09a78, 0xe0c0a0],
  ragged: [0x1e1a12, 0x38301e, 0x54482e, 0x70623e, 0x8c7c50],
  hood: [0x16080c, 0x2e1218, 0x4c2026, 0x6c3034, 0x8a4446],
  rubber: [0x161a0a, 0x2c3414, 0x46521e, 0x62722c, 0x82943e],
  coat: [0x0e0f16, 0x20222e, 0x383c4c, 0x525668, 0x6e7486],
  jeans: [0x0e1018, 0x1c2030, 0x2e344a, 0x444c66],
  metal: [0x1e2022, 0x3a3e40, 0x6a6e70, 0xa0a4a6, 0xd8dcde],
  crow: [0x08080c, 0x14141c, 0x24242e, 0x3a3a48, 0x5a5a6e],
  lady: [0x4a2c3c, 0x6e4258, 0x985c7c, 0xc088a4],
  white: [0x6a6a66, 0x9a9a94, 0xc8c8c0, 0xeeeee6],
};

const eye = (p, x, y, r, c, glint = true) => {
  p.ellipse(x, y, r, r, c);
  if (glint) p.set(x - Math.floor(r / 2), y - Math.floor(r / 2), 0xffffff);
};

function done(p, seed, specks) {
  if (specks) p.speckle(0, 0, p.w, p.h, specks, 0.04, rng(seed));
  p.outline(OUT);
  return p;
}

// -------------------------------------------------------------- Player cat
export function battleCat(hurt = false) {
  const p = new PB(64, 56);
  const f = R.catFur;
  // tail
  p.thick(50, 38, 58, 26, 2, f[2]);
  p.thick(58, 26, 57, 14, 2, f[3]);
  p.thick(57, 14, 52, 8, 2, f[2]);
  // far legs
  p.limb(22, 38, 20, 50, 3, 2.4, f.map((c) => c));
  p.limb(46, 38, 47, 50, 3, 2.4, f);
  // body
  p.blob(36, 32, 17, 12, f);
  // stripes
  for (const x of [28, 34, 40, 46]) p.thick(x, 23, x + 2, 32, 0.6, f[1]);
  // near legs
  p.limb(26, 40, 24, 51, 3.5, 2.6, f);
  p.limb(43, 40, 43, 51, 3.5, 2.6, f);
  p.ellipse(23, 52, 3.5, 2, f[4]);
  p.ellipse(43, 52, 3.5, 2, f[4]);
  // chest
  p.blob(21, 34, 7, 8, R.white);
  // head
  p.blob(17, 20, 12, 11, f);
  // ears (the right one has a bite taken out of it)
  for (let i = 0; i < 9; i += 1) {
    p.rect(8 + i * 0.3, 7 + i, 8 - i * 0.6, 1, f[3]);
    p.rect(22 + i * 0.3, 7 + i, 7 - i * 0.6, 1, f[3]);
  }
  p.ellipse(11, 12, 2, 3, R.skinPink[3]);
  p.rect(25, 6, 3, 3, 0); for (let y = 6; y < 9; y += 1) for (let x = 25; x < 28; x += 1) p.d[(y * 64 + x) * 4 + 3] = 0;
  // face
  p.blob(14, 25, 7, 5, R.white);
  if (hurt) {
    p.line(8, 18, 13, 21, OUT); p.line(8, 21, 13, 18, OUT);
    p.line(19, 18, 24, 21, OUT); p.line(19, 21, 24, 18, OUT);
  } else {
    p.ellipse(10, 20, 3.4, 3.4, 0xf4d43c);
    p.ellipse(21, 20, 3.4, 3.4, 0xf4d43c);
    p.rect(9, 18, 2, 5, OUT);
    p.rect(20, 18, 2, 5, OUT);
    p.set(11, 18, 0xffffff); p.set(22, 18, 0xffffff);
  }
  p.rect(14, 24, 3, 2, 0xd08a8a);
  p.line(13, 27, 15, 28, f[1]); p.line(15, 28, 17, 27, f[1]);
  // whiskers
  p.line(3, 24, 9, 25, 0xdedad0); p.line(3, 28, 9, 27, 0xdedad0);
  p.line(21, 25, 27, 24, 0xdedad0); p.line(21, 27, 27, 28, 0xdedad0);
  // old scar
  p.line(22, 12, 25, 17, R.skinPink[2]);
  return done(p);
}

// -------------------------------------------------------------------- Rats
function ratBody(p, ox, oy, s, fur, tailC, feetC) {
  const X = (v) => ox + v * s;
  const Y = (v) => oy + v * s;
  for (let t = 0; t <= 1; t += 0.02) {
    const x = X(10 - t * 10);
    const y = Y(26 + Math.sin(t * 5) * 3 - t * 2);
    p.ellipse(x, y, Math.max(0.6, 1.4 * s * (1 - t * 0.7)), Math.max(0.6, 1.4 * s * (1 - t * 0.7)), tailC);
  }
  p.blob(X(22), Y(22), 14 * s, 10 * s, fur);
  p.ellipse(X(14), Y(32), 3 * s, 1.5 * s, feetC);
  p.ellipse(X(29), Y(32), 3 * s, 1.5 * s, feetC);
  p.blob(X(36), Y(21), 8 * s, 7 * s, fur);
  p.blob(X(42), Y(23), 4.5 * s, 3.5 * s, fur);
  p.ellipse(X(45.5), Y(23), 1.6 * s, 1.4 * s, feetC);
  p.blob(X(31), Y(14), 3.6 * s, 4 * s, R.skinPink);
  p.blob(X(37), Y(13), 3 * s, 3.4 * s, R.skinPink);
}

export function battleRat() {
  const p = new PB(52, 40);
  ratBody(p, 2, 2, 1, R.ratFur, R.skinPink[2], R.skinPink[3]);
  eye(p, 40, 21, 1.6, 0xe03828);
  p.rect(43, 26, 1, 3, 0xe8e0c0); p.rect(45, 26, 1, 2, 0xe8e0c0);
  return done(p, 501, [R.ratFur[0], R.ratFur[3]]);
}

export function battleGrease() {
  const p = new PB(104, 84);
  ratBody(p, 2, 2, 2, R.grease, R.skinPink[1], R.skinPink[2]);
  // sheen of grease and a bare, scabbed back
  p.ellipse(38, 32, 10, 3, 0xd8c47c);
  p.ellipse(56, 26, 5, 2, 0xd8c47c);
  p.ellipse(30, 50, 9, 5, R.skinPink[1]);
  p.line(24, 44, 36, 56, R.skinPink[0]);
  eye(p, 76, 41, 3, 0xf0d030);
  p.rect(79, 41, 2, 1, OUT);
  // broken yellow fangs
  p.rect(86, 52, 2, 7, 0xd8c888); p.rect(90, 52, 2, 4, 0xd8c888);
  return done(p, 502, [R.grease[1], R.grease[5]]);
}

export function battleMutant() {
  const p = new PB(80, 60);
  ratBody(p, 2, 2, 1.55, R.mutant, R.tumor[2], R.tumor[3]);
  // tumours and extra eyes
  p.blob(28, 26, 7, 6, R.tumor);
  p.blob(44, 30, 5, 5, R.tumor);
  p.blob(36, 44, 6, 4, R.tumor);
  eye(p, 62, 32, 2.4, 0xd8e830);
  eye(p, 56, 28, 1.4, 0xd8e830);
  eye(p, 28, 26, 1.6, 0xe8e0a0);
  // ribs
  for (const x of [32, 38, 44]) p.line(x, 37, x + 2, 47, 0xcfc8ae);
  p.rect(68, 40, 1, 5, 0xe8e0c0); p.rect(71, 40, 1, 4, 0xe8e0c0); p.rect(66, 40, 1, 3, 0xe8e0c0);
  return done(p, 503, [R.mutant[0], R.tumor[1]]);
}

export function battleBloater() {
  const p = new PB(80, 76);
  // stub legs and tail
  p.limb(22, 58, 16, 72, 4, 3, R.tumor);
  p.limb(58, 58, 62, 72, 4, 3, R.tumor);
  p.blob(40, 38, 32, 30, R.bloat);
  // veins
  const r = rng(504);
  for (let i = 0; i < 9; i += 1) {
    let x = 18 + r() * 44;
    let y = 16 + r() * 40;
    for (let k = 0; k < 8; k += 1) {
      const nx = x + (r() - 0.5) * 8;
      const ny = y + (r() - 0.5) * 8;
      p.line(x, y, nx, ny, R.tumor[1]);
      x = nx; y = ny;
    }
  }
  p.blob(28, 26, 6, 5, R.tumor);
  p.blob(52, 48, 7, 6, R.tumor);
  // tiny head, almost swallowed
  p.blob(64, 28, 10, 9, R.mutant);
  eye(p, 70, 26, 2, 0xd8e830);
  p.rect(73, 32, 1, 3, 0xe8e0c0);
  return done(p, 505, [R.bloat[0]]);
}

export function battleBrood() {
  const p = new PB(36, 26);
  p.limb(6, 18, 1, 14, 1.5, 0.6, R.skinPink);
  p.blob(16, 15, 10, 8, R.skinPink);
  p.blob(27, 14, 6, 5, R.skinPink);
  p.ellipse(28, 13, 1.5, 1.5, 0x8a3a30);
  p.line(30, 18, 32, 19, 0xe8e0c0);
  p.ellipse(10, 22, 2, 1, R.skinPink[1]); p.ellipse(22, 22, 2, 1, R.skinPink[1]);
  return done(p);
}

export function battleMother() {
  const p = new PB(180, 136);
  const m = R.mother;
  const r = rng(506);
  // vast, sagging mass
  p.blob(90, 80, 84, 54, m);
  p.blob(40, 96, 38, 34, m);
  p.blob(140, 98, 36, 32, m);
  p.blob(90, 44, 44, 34, m);
  // egg sacs and tumours
  for (let i = 0; i < 14; i += 1) {
    const a = r() * Math.PI * 2;
    const d = 18 + r() * 42;
    p.blob(90 + Math.cos(a) * d * 1.5, 88 + Math.sin(a) * d * 0.8, 4 + r() * 7, 4 + r() * 6, R.tumor);
  }
  // blind, milky eyes
  for (let i = 0; i < 16; i += 1) {
    const x = 34 + r() * 112;
    const y = 30 + r() * 70;
    const rad = 2 + r() * 4;
    p.ellipse(x, y, rad, rad, 0xd8d4c0);
    p.ellipse(x + 0.5, y + 0.5, rad * 0.4, rad * 0.4, 0x8a8a70);
  }
  // a huge vertical maw
  p.ellipse(90, 74, 18, 26, 0x1a080a);
  p.ellipse(90, 74, 13, 22, 0x4a1214);
  for (let y = 54; y < 96; y += 5) {
    p.rect(74 + Math.abs(y - 74) * 0.4, y, 6, 2, 0xe0d8b8);
    p.rect(101 - Math.abs(y - 74) * 0.4, y + 2, 6, 2, 0xe0d8b8);
  }
  // pink things crawling on her
  for (let i = 0; i < 11; i += 1) {
    const x = 20 + r() * 140;
    const y = 50 + r() * 76;
    p.blob(x, y, 4, 2.6, R.skinPink);
    p.line(x - 4, y, x - 8, y + 2, R.skinPink[2]);
  }
  // withered forelimbs
  p.limb(30, 110, 14, 130, 7, 4, R.skinPink);
  p.limb(150, 110, 166, 130, 7, 4, R.skinPink);
  return done(p, 507, [m[0], R.skinPink[1]]);
}

// -------------------------------------------------------------------- Dogs
function dogBody(p, fur, eyeC, scars) {
  p.limb(14, 44, 12, 62, 4, 3, fur);
  p.limb(52, 44, 54, 62, 4, 3, fur);
  p.thick(8, 28, 2, 18, 2, fur[2]);
  p.blob(32, 32, 26, 15, fur);
  p.blob(16, 36, 13, 12, fur);
  p.blob(50, 32, 14, 15, fur);
  p.limb(22, 44, 20, 64, 4.5, 3.4, fur);
  p.limb(48, 44, 47, 64, 4.5, 3.4, fur);
  p.blob(64, 22, 13, 12, fur);
  p.blob(74, 28, 8, 6, fur);
  // ragged ear
  p.limb(56, 14, 52, 28, 4, 2.5, [fur[0], fur[1], fur[2]]);
  eye(p, 68, 19, 2, eyeC);
  // snarl
  p.ellipse(75, 33, 6.5, 3.5, 0x2a0a0c);
  for (let x = 70; x < 81; x += 2) {
    p.rect(x, 30, 1, 3, 0xe8e0c8);
    p.rect(x + 1, 35, 1, 2, 0xe8e0c8);
  }
  p.ellipse(80, 26, 2, 2, OUT);
  if (scars) {
    p.line(26, 22, 34, 36, 0x9a4a40);
    p.line(40, 20, 44, 34, 0x9a4a40);
    p.line(60, 14, 70, 26, 0x9a4a40);
  }
}

export function battleDog() {
  const p = new PB(88, 70);
  dogBody(p, R.dog, 0xe8b040, false);
  return done(p, 508, [R.dog[0], R.dog[4]]);
}

export function battleHound() {
  const p = new PB(88, 70);
  dogBody(p, R.hound, 0xe84030, true);
  p.rect(58, 32, 16, 3, 0x6a5a48);
  p.set(62, 31, 0xc8c8c0); p.set(68, 31, 0xc8c8c0);
  return done(p, 509, [R.hound[0], R.hound[4]]);
}

// ------------------------------------------------------------------ People
function human(p, o) {
  const cx = o.cx ?? 44;
  const fat = o.fat ?? 0;
  const shoulder = 15 + fat;
  // legs
  p.limb(cx - 8, 76, cx - 11, 106, 6, 5, o.leg);
  p.limb(cx + 8, 76, cx + 11, 106, 6, 5, o.leg);
  p.blob(cx - 12, 110, 8, 4, [0x0c0c0e, 0x1e1a16, 0x38302a]);
  p.blob(cx + 13, 110, 8, 4, [0x0c0c0e, 0x1e1a16, 0x38302a]);
  // far arm
  if (o.farArm) o.farArm(p, cx, shoulder);
  // torso
  p.blob(cx, 56, shoulder, 26, o.top);
  if (fat) p.blob(cx + 2, 66, shoulder + 2, 16, o.top);
  // near arm
  if (o.nearArm) o.nearArm(p, cx, shoulder);
  // head
  p.blob(cx + 1, 22, 11, 12, o.skin);
  p.rect(cx - 2, 31, 8, 4, o.skin[1]);
  if (o.head) o.head(p, cx);
}

export function battleDrunk() {
  const p = new PB(100, 116);
  human(p, {
    cx: 46, fat: 5, leg: R.jeans, top: R.ragged, skin: R.skinH,
    farArm(pp, cx, s) {
      pp.limb(cx + s - 2, 44, cx + s + 8, 66, 4.5, 4, R.ragged);
    },
    nearArm(pp, cx, s) {
      pp.limb(cx - s + 2, 44, cx - s - 8, 58, 5, 4, R.ragged);
      pp.limb(cx - s - 8, 58, cx - s + 4, 44, 4, 3.5, R.ragged);
      // bottle
      pp.rect(cx - s + 1, 26, 6, 16, 0x3e6e3a);
      pp.rect(cx - s + 2, 20, 4, 7, 0x3e6e3a);
      pp.rect(cx - s + 2, 28, 1, 12, 0x8ac080);
      pp.blob(cx - s + 4, 44, 4, 4, R.skinH);
    },
    head(pp, cx) {
      pp.blob(cx + 1, 13, 12, 7, [0x1e1a22, 0x34303c, 0x4e4a58]);
      pp.rect(cx - 11, 15, 24, 2, 0x4e4a58);
      pp.ellipse(cx - 3, 23, 1.6, 1, OUT);
      pp.ellipse(cx + 5, 23, 1.6, 1, OUT);
      pp.ellipse(cx + 1, 27, 2, 2, 0xa84a3a);
      pp.line(cx - 4, 31, cx + 6, 32, OUT);
      pp.speckle(cx - 8, 28, 18, 7, [0x3e2e22], 0.5, rng(510));
    },
  });
  return done(p, 511, [R.ragged[0]]);
}

export function battleKnife() {
  const p = new PB(100, 116);
  human(p, {
    cx: 50, fat: -3, leg: R.jeans, top: R.hood, skin: R.skinH,
    farArm(pp, cx, s) {
      pp.limb(cx + s - 2, 44, cx + s + 4, 70, 3.5, 3, R.hood);
    },
    nearArm(pp, cx, s) {
      pp.limb(cx - s + 2, 44, cx - s - 12, 56, 4, 3, R.hood);
      pp.limb(cx - s - 12, 56, cx - s - 22, 50, 3, 3, R.hood);
      pp.blob(cx - s - 24, 49, 3.5, 3.5, R.skinH);
      // blade
      pp.line(cx - s - 26, 47, cx - s - 38, 38, 0xdadee0);
      pp.line(cx - s - 26, 48, cx - s - 38, 39, 0x8a8e90);
    },
    head(pp, cx) {
      pp.ellipse(cx + 1, 19, 13, 13, R.hood[1]);
      pp.blob(cx + 1, 16, 13, 10, R.hood);
      pp.blob(cx, 24, 8, 8, R.skinH);
      pp.rect(cx - 6, 21, 12, 2, R.skinH[0]);
      pp.ellipse(cx - 3, 22, 1.5, 1, 0xd8d0b8);
      pp.ellipse(cx + 3, 22, 1.5, 1, 0xd8d0b8);
      pp.line(cx - 3, 29, cx + 3, 29, OUT);
    },
  });
  return done(p, 512, [R.hood[0]]);
}

export function battleExterm() {
  const p = new PB(100, 116);
  human(p, {
    cx: 52, fat: 2, leg: R.rubber, top: R.rubber, skin: R.rubber,
    farArm(pp, cx, s) {
      // tank on his back
      pp.blob(cx + s + 4, 54, 8, 20, R.metal);
      pp.rect(cx + s - 2, 44, 12, 2, R.metal[0]);
    },
    nearArm(pp, cx, s) {
      pp.limb(cx - s + 2, 44, cx - s - 14, 58, 5, 4, R.rubber);
      pp.blob(cx - s - 16, 58, 4, 4, [0x101010, 0x242424, 0x3a3a3a]);
      // sprayer wand
      pp.line(cx - s - 16, 58, cx - s - 38, 50, R.metal[2]);
      pp.line(cx - s - 16, 59, cx - s - 38, 51, R.metal[1]);
      pp.rect(cx - s - 42, 47, 5, 6, R.metal[1]);
    },
    head(pp, cx) {
      // gas mask
      pp.blob(cx + 1, 22, 12, 13, [0x0e0e0c, 0x1e1e1a, 0x34342c]);
      pp.ellipse(cx - 4, 19, 4, 4, 0x54662a);
      pp.ellipse(cx + 6, 19, 4, 4, 0x54662a);
      pp.set(cx - 6, 17, 0xe0f0a0); pp.set(cx + 4, 17, 0xe0f0a0);
      pp.blob(cx + 1, 29, 5, 5, R.metal);
      for (let y = 26; y < 33; y += 2) pp.rect(cx - 2, y, 6, 1, OUT);
    },
  });
  return done(p, 513, [R.rubber[0]]);
}

export function battleCatcher() {
  const p = new PB(130, 130);
  const ox = 74;
  human(p, {
    cx: ox, fat: 8, leg: R.jeans, top: R.coat, skin: R.skinH,
    farArm(pp, cx, s) {
      pp.limb(cx + s - 2, 42, cx + s + 10, 66, 6, 5, R.coat);
      pp.blob(cx + s + 11, 68, 5, 5, R.skinH);
      // the net, hanging in a lump
      for (let y = 66; y < 106; y += 3) {
        const w = 8 + (y - 66) * 0.28;
        for (let x = -w; x <= w; x += 3) pp.rect(cx + s + 11 + x + (y % 6 ? 0 : 1), y, 1, 2, 0xb0aa90);
      }
    },
    nearArm(pp, cx, s) {
      pp.limb(cx - s + 2, 42, cx - s - 12, 56, 6, 5, R.coat);
      pp.limb(cx - s - 12, 56, cx - s - 22, 48, 5, 4, R.coat);
      pp.blob(cx - s - 24, 47, 5, 5, R.skinH);
      // the catch-pole with its noose
      pp.thick(cx - s - 8, 74, cx - s - 44, 18, 1.2, 0x6a6e70);
      pp.line(cx - s - 44, 18, cx - s - 46, 8, 0xc8c0a0);
      pp.line(cx - s - 46, 8, cx - s - 54, 10, 0xc8c0a0);
      pp.line(cx - s - 54, 10, cx - s - 54, 18, 0xc8c0a0);
      pp.line(cx - s - 54, 18, cx - s - 44, 18, 0xc8c0a0);
    },
    head(pp, cx) {
      pp.blob(cx + 1, 12, 13, 6, [0x08080c, 0x14141c, 0x24242e]);
      pp.rect(cx - 15, 14, 24, 3, 0x14141c);
      pp.rect(cx - 8, 22, 5, 2, OUT);
      pp.rect(cx + 3, 22, 5, 2, OUT);
      pp.ellipse(cx + 1, 28, 7, 3, 0x7a5a44);
      pp.line(cx - 4, 29, cx + 6, 29, OUT);
      pp.rect(cx - 10, 86, 22, 3, 0x14141c);
      pp.rect(cx - 2, 85, 5, 5, 0xc8b070);
    },
  });
  return done(p, 514, [R.coat[0]]);
}

// --------------------------------------------------------------- Portraits
function catFace(ramp, eyeC, opts = {}) {
  const p = new PB(40, 40);
  const earL = opts.earL ?? ramp[2];
  for (let i = 0; i < 11; i += 1) {
    p.rect(5 + i * 0.25, 2 + i, 11 - i * 0.7, 1, earL);
    p.rect(24 + i * 0.25, 2 + i, 11 - i * 0.7, 1, ramp[2]);
  }
  p.ellipse(10, 9, 2, 4, 0xd08a8a);
  p.ellipse(30, 9, 2, 4, 0xd08a8a);
  p.blob(20, 22, 16, 14, ramp);
  p.blob(20, 29, 8, 6, opts.muzzle || R.white);
  p.ellipse(12, 21, 3.6, 3.6, eyeC);
  p.ellipse(28, 21, 3.6, 3.6, eyeC);
  p.rect(11, 18, 2, 7, OUT);
  p.rect(27, 18, 2, 7, OUT);
  p.set(13, 19, 0xffffff); p.set(29, 19, 0xffffff);
  p.rect(18, 27, 4, 2, 0xc06a6a);
  p.line(16, 31, 20, 32, ramp[0]); p.line(20, 32, 24, 31, ramp[0]);
  p.line(2, 27, 12, 29, 0xdedad0); p.line(28, 29, 38, 27, 0xdedad0);
  if (opts.after) opts.after(p);
  return done(p);
}

export function portraits() {
  const out = {};
  out.tom = catFace([0x24140a, 0x4a2c14, 0x7a4c24, 0xa8703a, 0xc89a64], 0x9ac850, {
    after(p) {
      p.line(7, 13, 16, 27, 0x5e2e1e);
      p.ellipse(12, 21, 4, 4, 0x2c1a10);
      p.line(8, 19, 15, 23, 0x8a5a44);
      for (const x of [14, 20, 26]) p.rect(x, 9, 2, 5, 0x4a2c14);
      p.rect(27, 2, 7, 4, 0);
      for (let y = 2; y < 6; y += 1) for (let x = 27; x < 34; x += 1) p.d[(y * 40 + x) * 4 + 3] = 0;
    },
  });
  out.patch = catFace([0x4a463e, 0x8a8478, 0xc0b8a8, 0xdcd4c4, 0xf0ece0], 0x70c0a0, {
    earL: 0x38302a,
    after(p) {
      p.blob(13, 14, 7, 6, [0x1a1612, 0x342c24, 0x4a4036]);
      p.blob(29, 16, 6, 5, [0x6a3a1a, 0xa45c28, 0xc87a3a]);
      p.ellipse(12, 21, 3.6, 3.6, 0x70c0a0);
      p.rect(11, 18, 2, 7, OUT);
      p.ellipse(28, 21, 3.6, 3.6, 0x70c0a0);
      p.rect(27, 18, 2, 7, OUT);
    },
  });
  out.cat = catFace(R.catFur, 0xf4d43c);

  // crow
  const crow = new PB(40, 40);
  crow.blob(20, 26, 15, 16, R.crow);
  crow.blob(20, 15, 11, 11, R.crow);
  for (let i = 0; i < 12; i += 1) crow.rect(28, 13 + i * 0.25, 11 - i * 0.8, 1, i < 6 ? 0x4a4a50 : 0x2e2e32);
  eye(crow, 24, 12, 2.4, 0xd8c040);
  crow.set(24, 12, OUT);
  out.crow = done(crow);

  // pale
  const pale = new PB(40, 40);
  pale.blob(11, 9, 6, 7, R.skinPink);
  pale.blob(28, 9, 6, 7, R.skinPink);
  pale.blob(19, 22, 15, 14, R.white);
  pale.blob(20, 30, 8, 6, R.white);
  pale.rect(18, 32, 4, 2, 0xd88a8a);
  pale.line(9, 20, 15, 20, 0x8a8a84);
  pale.line(25, 20, 31, 20, 0x8a8a84);
  pale.rect(18, 35, 1, 3, 0xe8e0c0); pale.rect(21, 35, 1, 3, 0xe8e0c0);
  out.pale = done(pale);

  // the old woman
  const lady = new PB(40, 40);
  lady.blob(20, 36, 16, 10, R.lady);
  lady.blob(20, 20, 13, 14, [0x8a5e48, 0xb88a6c, 0xe0b89a, 0xf0d0b4]);
  lady.blob(20, 10, 14, 8, [0x8a8680, 0xb8b4ae, 0xd8d4d0, 0xf0ece8]);
  lady.blob(8, 18, 3, 7, [0x8a8680, 0xb8b4ae, 0xd8d4d0]);
  lady.blob(32, 18, 3, 7, [0x8a8680, 0xb8b4ae, 0xd8d4d0]);
  lady.ellipse(14, 20, 4, 4, 0xe8e4d4); lady.ellipse(26, 20, 4, 4, 0xe8e4d4);
  lady.ellipse(14, 20, 2, 2, 0x4a6a8a); lady.ellipse(26, 20, 2, 2, 0x4a6a8a);
  lady.line(9, 16, 18, 16, 0x6a4a3a); lady.line(22, 16, 31, 16, 0x6a4a3a);
  lady.rect(18, 20, 4, 1, 0x6a4a3a);
  lady.line(14, 28, 20, 30, 0xa05a50); lady.line(20, 30, 26, 28, 0xa05a50);
  out.lady = done(lady);

  // the catcher
  const c = new PB(40, 40);
  c.blob(20, 38, 19, 10, R.coat);
  c.blob(20, 21, 14, 15, R.skinH);
  c.blob(20, 9, 15, 7, [0x08080c, 0x14141c, 0x24242e]);
  c.rect(4, 11, 26, 3, 0x14141c);
  c.rect(11, 19, 6, 2, OUT); c.rect(23, 19, 6, 2, OUT);
  c.ellipse(20, 28, 9, 4, 0x7a5a44);
  c.line(14, 29, 26, 29, OUT);
  out.catcher = done(c);

  // grease
  const g = new PB(40, 40);
  g.blob(9, 10, 6, 7, R.skinPink); g.blob(31, 10, 6, 7, R.skinPink);
  g.blob(20, 23, 16, 14, R.grease);
  g.ellipse(13, 19, 3, 3, 0xf0d030); g.ellipse(27, 19, 3, 3, 0xf0d030);
  g.set(13, 19, OUT); g.set(27, 19, OUT);
  g.blob(20, 30, 8, 6, R.grease);
  g.ellipse(20, 26, 2.4, 2, R.skinPink[3]);
  g.rect(17, 34, 2, 5, 0xd8c888); g.rect(22, 34, 2, 4, 0xd8c888);
  g.ellipse(26, 13, 6, 2, 0xd8c47c);
  out.grease = done(g);

  return out;
}

export function buildBattleArt() {
  return {
    b_cat: battleCat(false),
    b_cat_hurt: battleCat(true),
    b_rat: battleRat(),
    b_grease: battleGrease(),
    b_mutant: battleMutant(),
    b_bloater: battleBloater(),
    b_brood: battleBrood(),
    b_mother: battleMother(),
    b_dog: battleDog(),
    b_hound: battleHound(),
    b_drunk: battleDrunk(),
    b_knife: battleKnife(),
    b_exterm: battleExterm(),
    b_catcher: battleCatcher(),
  };
}
