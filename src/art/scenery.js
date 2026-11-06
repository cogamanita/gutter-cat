// Painted full-screen pictures: battle backdrops, the title screen, the ending.
// Plus the small item icons and shared overlay textures.

import { PB, rng, bayer, mix } from './pixel.js';
import { GAME_W, GAME_H } from '../config.js';

const W = GAME_W;

function brickWall(p, y0, y1, ramp, mortar, seed) {
  const r = rng(seed);
  const bh = 8;
  const bw = 20;
  const ids = {};
  for (let y = y0; y < y1; y += 1) {
    const row = Math.floor((y - y0) / bh);
    const off = row % 2 ? bw / 2 : 0;
    for (let x = 0; x < W; x += 1) {
      const col = Math.floor((x + off) / bw);
      if ((y - y0) % bh === bh - 1 || (x + off) % bw === bw - 1) {
        p.set(x, y, mortar);
      } else {
        const id = `${row}:${col}`;
        if (ids[id] === undefined) ids[id] = Math.floor(r() * ramp.length);
        p.set(x, y, ramp[ids[id]]);
      }
    }
  }
}

/** Darkens a picture towards its edges with a dithered vignette. */
function vignette(p, strength = 1, cx = W / 2, cy = p.h / 2) {
  for (let y = 0; y < p.h; y += 1) {
    for (let x = 0; x < p.w; x += 1) {
      const dx = (x - cx) / (p.w * 0.62);
      const dy = (y - cy) / (p.h * 0.62);
      const d = (dx * dx + dy * dy) * strength;
      if (d > bayer(x, y) + 0.25) p.over(x, y, 0x020204, Math.min(0.85, d * 0.6));
    }
  }
}

function lightPool(p, cx, cy, rx, ry, c, amount) {
  for (let y = Math.floor(cy - ry); y < cy + ry; y += 1) {
    for (let x = Math.floor(cx - rx); x < cx + rx; x += 1) {
      const u = (x - cx) / rx;
      const v = (y - cy) / ry;
      const d = u * u + v * v;
      if (d > 1) continue;
      const a = (1 - d) * amount;
      if (a > bayer(x, y) * 0.5) p.over(x, y, c, Math.min(0.8, a));
    }
  }
}

function wetGround(p, y0, y1, base, seed, reflect) {
  const r = rng(seed);
  p.vgrad(0, y0, W, y1 - y0, base);
  for (let i = 0; i < 500; i += 1) {
    p.rect(r() * W, y0 + r() * (y1 - y0), 1 + r() * 3, 1, base[Math.floor(r() * base.length)]);
  }
  for (let i = 0; i < 14; i += 1) {
    const x = r() * W;
    const y = y0 + 6 + r() * (y1 - y0 - 8);
    const w = 16 + r() * 50;
    p.ellipse(x, y, w, 2 + r() * 3, reflect);
    p.rect(x - w / 2, y, w * 0.6, 1, mix(reflect, 0xa0c0c8, 0.4));
  }
}

export function battleBackdrop(kind) {
  const H = 190;
  const p = new PB(W, H);
  if (kind === 'sewer') {
    p.fill(0x05070a);
    brickWall(p, 0, 120, [0x2e3a26, 0x273220, 0x35422c, 0x222c1c], 0x10160c, 901);
    // arches
    for (const cx of [90, 240, 390]) {
      p.ellipse(cx, 96, 58, 66, 0x0c120a);
      p.ellipse(cx, 96, 52, 60, 0x040604);
      p.rect(cx - 52, 96, 104, 26, 0x040604);
      for (let a = 0; a < Math.PI; a += 0.14) {
        p.rect(cx + Math.cos(a) * 55 - 2, 96 - Math.sin(a) * 63 - 2, 5, 5, 0x3e4c30);
      }
    }
    // slime drips and pipes
    const r = rng(902);
    for (let i = 0; i < 46; i += 1) {
      const x = r() * W;
      const len = 6 + r() * 34;
      p.rect(x, r() * 18, 1 + r() * 2, len, r() < 0.5 ? 0x5a7a24 : 0x7a9a30);
    }
    p.rect(0, 10, W, 7, 0x4a3a2a);
    p.rect(0, 10, W, 2, 0x7a5e3e);
    p.speckle(0, 10, W, 7, [0x2a2016, 0x8a5a30], 0.2, r);
    wetGround(p, 120, H, [0x2e3a1c, 0x38482a, 0x445a2a, 0x263014], 903, 0x6a8a2a);
    lightPool(p, 240, 40, 170, 90, 0x88a840, 0.24);
    lightPool(p, 240, 150, 240, 40, 0xa0c040, 0.18);
    vignette(p, 1.3);
  } else if (kind === 'district') {
    p.vgrad(0, 0, W, 60, [0x0a0c12, 0x10141c, 0x161b24]);
    brickWall(p, 28, 128, [0x4a2c26, 0x40261f, 0x56332b, 0x38211b], 0x1c1412, 911);
    // boarded windows
    for (const x of [46, 180, 320, 432]) {
      p.rect(x - 2, 44, 38, 46, 0x1c1410);
      p.rect(x, 46, 34, 42, 0x06070a);
      p.rect(x - 4, 54, 42, 5, 0x5e4830);
      p.rect(x - 4, 72, 42, 5, 0x4e3c28);
    }
    // one lit window, a long way off
    p.rect(258, 50, 22, 28, 0x241a12);
    p.rect(260, 52, 18, 24, 0xc89a48);
    p.rect(268, 52, 2, 24, 0x241a12);
    // fence, trash, poster
    for (let y = 92; y < 128; y += 1) for (let x = 70; x < 170; x += 1) {
      if ((x + y) % 6 === 0 || (x - y + 600) % 6 === 0) p.set(x, y, 0x6a6e68);
    }
    p.rect(70, 90, 100, 2, 0x8a8e88);
    p.rect(350, 70, 26, 34, 0xa8a088);
    p.rect(354, 74, 18, 10, 0x4a4a50);
    p.rect(354, 88, 14, 1, 0x3a342a); p.rect(354, 92, 16, 1, 0x3a342a);
    wetGround(p, 128, H, [0x1e2024, 0x282a2e, 0x32343a, 0x16171a], 913, 0x34485a);
    lightPool(p, 268, 90, 150, 70, 0xc89048, 0.22);
    lightPool(p, 240, 160, 240, 36, 0x7a8a9a, 0.12);
    vignette(p, 1.1);
  } else {
    // The Gutter: curb, drain and storm water.
    p.vgrad(0, 0, W, 40, [0x0a0d12, 0x12161e]);
    brickWall(p, 22, 110, [0x4e3029, 0x432821, 0x5a372e, 0x3a221d], 0x1c1412, 921);
    // drain pipe and streaks
    p.rect(92, 0, 12, 112, 0x34363a); p.rect(92, 0, 3, 112, 0x54565a);
    for (const x of [30, 150, 202, 288, 350, 440]) {
      for (let y = 40; y < 110; y += 1) {
        if ((y * 7 + x) % 5 !== 0) p.over(x + Math.sin(y * 0.2) * 2, y, 0x101410, 0.5);
      }
    }
    // storm drain
    p.rect(190, 96, 110, 22, 0x4a4c48);
    p.rect(194, 100, 102, 18, 0x050606);
    for (let x = 198; x < 294; x += 8) p.rect(x, 100, 3, 18, 0x54564e);
    // curb
    p.rect(0, 110, W, 8, 0x5e5e56);
    p.rect(0, 110, W, 2, 0x7a7a70);
    wetGround(p, 118, H, [0x1c2428, 0x242e34, 0x2c3a40, 0x161c20], 923, 0x3a5664);
    lightPool(p, 380, 70, 130, 80, 0xb89a60, 0.2);
    lightPool(p, 240, 150, 240, 40, 0x7a9aa8, 0.12);
    vignette(p, 1.1);
  }
  return p;
}

function brickWallRect(p, x0, y0, w, h, ramp, mortar) {
  for (let y = 0; y < h; y += 1) {
    const row = Math.floor(y / 6);
    for (let x = 0; x < w; x += 1) {
      const off = row % 2 ? 7 : 0;
      const seam = y % 6 === 5 || (x + off) % 14 === 13;
      p.set(x0 + x, y0 + y, seam ? mortar : ramp[(Math.floor((x + off) / 14) + row * 2) % ramp.length]);
    }
  }
}

export function titleBackdrop() {
  const H = GAME_H;
  const p = new PB(W, H);
  p.vgrad(0, 0, W, 120, [0x06080c, 0x0a0e14, 0x10161e, 0x161e26]);
  const r = rng(931);

  // Far skyline
  let x = 0;
  while (x < W) {
    const bw = 22 + r() * 38;
    const bh = 60 + r() * 70;
    p.rect(x, 150 - bh, bw, bh + 10, 0x0a0d12);
    for (let wy = 150 - bh + 6; wy < 150; wy += 9) {
      for (let wx = x + 4; wx < x + bw - 4; wx += 8) {
        if (r() < 0.05) p.rect(wx, wy, 3, 4, 0x6a5428);
      }
    }
    x += bw;
  }

  // Alley walls in perspective
  for (let i = 0; i < 2; i += 1) {
    const left = i === 0;
    for (let px = 0; px < 150; px += 1) {
      const sx = left ? px : W - 1 - px;
      const t = px / 150;
      const top = 0 + t * 74;
      const bot = 270 - t * 88;
      for (let y = Math.floor(top); y < bot; y += 1) {
        const brick = Math.floor((y - top) / (11 - t * 5));
        const mortar = (y - top) % Math.max(3, 11 - t * 5) < 1;
        const seam = (px + (brick % 2) * 8) % 15 < 1;
        const base = mortar || seam ? 0x0e0a08 : [0x2e1c17, 0x281814, 0x34201a][brick % 3];
        p.set(sx, y, base);
      }
    }
  }

  // Ground, wet and reflecting the lamp
  p.vgrad(0, 182, W, 88, [0x101416, 0x14191c, 0x1a2024, 0x12161a]);
  for (let i = 0; i < 700; i += 1) {
    p.rect(r() * W, 182 + r() * 88, 1 + r() * 4, 1, [0x20262a, 0x0c1012, 0x262e34][Math.floor(r() * 3)]);
  }

  // Street lamp at the end of the alley
  // Close the alley off with a dark far wall, so the light has something to fall on.
  brickWallRect(p, 150, 118, 180, 66, [0x241814, 0x201512, 0x2a1c17], 0x0e0a08);
  p.rect(238, 126, 3, 60, 0x34383a);
  p.rect(238, 126, 18, 3, 0x34383a);
  p.rect(250, 129, 10, 3, 0xffe6a0);
  lightPool(p, 254, 168, 74, 54, 0xc8a050, 0.42);
  lightPool(p, 254, 215, 90, 34, 0xd8a850, 0.32);

  // Reflection column
  for (let y = 190; y < 262; y += 1) {
    const w = 3 + (y - 190) * 0.32;
    for (let px = -w; px < w; px += 1) {
      if (bayer(Math.floor(px) + 300, y) < 0.32) p.over(254 + px + Math.sin(y * 0.8) * 2, y, 0xf0c870, 0.5);
    }
  }

  // Dumpster and bags as dark shapes
  p.rect(58, 168, 60, 42, 0x0c100c); p.rect(54, 164, 68, 6, 0x141a14);
  p.ellipse(136, 208, 16, 11, 0x08080a);
  p.ellipse(150, 214, 12, 9, 0x0a0a0c);
  p.ellipse(356, 216, 22, 12, 0x08080a);
  p.rect(372, 172, 48, 40, 0x0a0a0c);

  // The cat: a small black silhouette under the light, looking back at you
  const ck = 0x040405;
  p.ellipse(255, 222, 12, 8, ck);        // body
  p.ellipse(247, 213, 7, 6, ck);         // head
  for (let i = 0; i < 6; i += 1) {
    p.rect(241 + i * 0.3, 203 + i, 5 - i * 0.7, 1, ck);
    p.rect(249 + i * 0.3, 203 + i, 5 - i * 0.7, 1, ck);
  }
  p.thick(266, 224, 274, 214, 1.2, ck);
  p.thick(274, 214, 272, 204, 1.2, ck);
  p.rect(247, 226, 3, 6, ck); p.rect(259, 226, 3, 6, ck);
  // eyes
  p.rect(243, 212, 3, 2, 0xf4d43c);
  p.rect(249, 212, 3, 2, 0xf4d43c);

  vignette(p, 1.2, W / 2, H * 0.6);
  return p;
}

/** The title lettering, dripping. Painted once, scaled up from the bitmap font. */
export function titleLogo(glyphs) {
  const scale = 4;
  const p = new PB(W, 60);
  // glyphs is a function giving rows for a character from font.js
  const word = 'GUTTER CAT';
  let cursor = 0;
  const widths = [];
  for (const ch of word) widths.push(ch === ' ' ? 4 : glyphs(ch).w);
  const total = widths.reduce((a, b) => a + (b + 1) * scale, 0) - scale;
  cursor = Math.floor((W - total) / 2);
  const r = rng(941);
  [...word].forEach((ch, idx) => {
    if (ch !== ' ') {
      const g = glyphs(ch);
      for (let y = 0; y < g.rows.length; y += 1) {
        for (let x = 0; x < g.w; x += 1) {
          if (!g.rows[y][x]) continue;
          for (let sy = 0; sy < scale + 1; sy += 1) {
            for (let sx = 0; sx < scale; sx += 1) {
              const px = cursor + x * scale + sx;
              const py = 8 + y * (scale + 1) + sy;
              const t = (y * (scale + 1) + sy) / (g.rows.length * (scale + 1));
              const shade = t + (bayer(px, py) - 0.5) * 0.18;
              const c = shade < 0.2 ? 0xd8c8a8 : shade < 0.45 ? 0xb89a70 : shade < 0.7 ? 0x9a3a2a : 0x6e1e18;
              p.set(px, py, c);
            }
          }
        }
      }
      // rust drips off the bottom of the letters
      for (let x = 0; x < g.w; x += 1) {
        if (g.rows[g.rows.length - 1][x] && r() < 0.8) {
          const dx = cursor + x * scale + Math.floor(r() * scale);
          const len = 2 + r() * 10;
          p.rect(dx, 8 + g.rows.length * (scale + 1), 1, len, 0x6e1e18);
          p.set(dx, 8 + g.rows.length * (scale + 1) + len, 0x9a3a2a);
        }
      }
    }
    cursor += (widths[idx] + 1) * scale;
  });
  p.speckle(0, 0, W, 60, [0x1a0a08], 0.05, rng(942));
  p.outline(0x050303);
  return p;
}

/** The ending picture: the first warm image in the whole game. */
export function endingPicture() {
  const H = GAME_H;
  const p = new PB(W, H);
  const r = rng(951);

  // Warm wallpaper
  for (let y = 0; y < 186; y += 1) {
    for (let x = 0; x < W; x += 1) {
      p.set(x, y, Math.floor(x / 12) % 2 ? 0xd8a668 : 0xcf9c5e);
    }
  }
  p.rect(0, 150, W, 36, 0x8a5a30);
  p.rect(0, 150, W, 2, 0xc08a50);
  for (let x = 12; x < W; x += 28) p.rect(x, 154, 1, 32, 0x6a4424);

  // Floorboards
  for (let y = 186; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) p.set(x, y, 0xa86e3c);
  }
  for (let y = 186; y < H; y += 12) p.rect(0, y, W, 1, 0x6a4220);
  for (let i = 0; i < 26; i += 1) {
    const y = 186 + Math.floor(r() * 7) * 12;
    p.rect(r() * W, y, 1, 12, 0x6a4220);
  }

  // Window, with the rain on the far side of it
  p.rect(310, 26, 122, 92, 0x5e3a1e);
  p.rect(316, 32, 110, 80, 0x1a2838);
  for (let i = 0; i < 90; i += 1) {
    const x = 316 + r() * 108;
    const y = 32 + r() * 72;
    p.rect(x, y, 1, 3 + r() * 6, 0x5a7c94);
  }
  p.rect(368, 32, 5, 80, 0x5e3a1e);
  p.rect(316, 68, 110, 4, 0x5e3a1e);
  p.rect(304, 116, 134, 7, 0x8a5a30);
  p.rect(304, 116, 134, 2, 0xb88a50);

  // Picture of a small gray cat on the wall
  p.rect(232, 42, 40, 48, 0x5e3a1e);
  p.rect(236, 46, 32, 40, 0xe8dcc0);
  p.ellipse(252, 70, 9, 10, 0x8a8690);
  p.ellipse(252, 60, 7, 6, 0x8a8690);
  p.rect(246, 52, 3, 4, 0x8a8690); p.rect(255, 52, 3, 4, 0x8a8690);
  p.ellipse(252, 70, 4, 5, 0xf0ece0);

  // The fireplace
  p.rect(14, 44, 150, 142, 0x8a4a30);
  for (let y = 44; y < 186; y += 6) {
    for (let x = 14 + ((y / 6) % 2) * 6; x < 164; x += 12) p.rect(x, y, 1, 6, 0x5e2e1c);
    p.rect(14, y, 150, 1, 0x5e2e1c);
  }
  p.rect(8, 36, 162, 10, 0x5e3218);
  p.rect(8, 36, 162, 2, 0x8a5428);
  p.rect(44, 88, 90, 98, 0x120806);
  p.ellipse(89, 88, 45, 22, 0x120806);

  // Mantel clock and a mug
  p.rect(112, 18, 22, 18, 0x4e2c14);
  p.ellipse(123, 27, 7, 7, 0xf0e8d0);
  p.line(123, 27, 123, 22, 0x1a1208); p.line(123, 27, 127, 28, 0x1a1208);
  p.rect(40, 26, 12, 10, 0xd8d0b8);

  // Warm glow from the fire across the room
  lightPool(p, 89, 180, 240, 110, 0xffb050, 0.34);
  lightPool(p, 89, 150, 120, 80, 0xffd080, 0.34);

  // The rug
  p.ellipse(238, 238, 190, 30, 0x7a2c20);
  p.ellipse(238, 238, 184, 27, 0xb04a30);
  p.ellipse(238, 238, 168, 22, 0xd07a40);
  p.ellipse(238, 238, 150, 18, 0xb04a30);

  // The bed: a low basket with a dent in it
  const bx = 250;
  const by = 214;
  p.ellipse(bx, by + 8, 70, 24, 0x5e3a1e);
  p.ellipse(bx, by + 4, 68, 22, 0x8a5a30);
  p.ellipse(bx, by + 2, 60, 17, 0xe8dcc0);
  p.ellipse(bx, by + 4, 52, 13, 0xfaf4e4);

  return p;
}

/** Cat curled up asleep. Drawn separately so its breathing can be animated. */
export function sleepingCat() {
  const p = new PB(84, 48);
  const f = [0x2c2a32, 0x46434c, 0x6a6670, 0x928e98, 0xb4b0b8];
  p.thick(16, 34, 40, 42, 3.5, f[1]);
  p.blob(44, 26, 34, 18, f);
  for (const x of [28, 36, 44, 52, 60]) p.thick(x, 12, x - 3, 26, 0.7, f[0]);
  p.thick(54, 42, 18, 40, 3, f[2]);
  p.blob(20, 28, 15, 13, f);
  for (let i = 0; i < 8; i += 1) {
    p.rect(9 + i * 0.3, 11 + i, 7 - i * 0.6, 1, f[2]);
    p.rect(22 + i * 0.3, 11 + i, 7 - i * 0.6, 1, f[2]);
  }
  p.blob(19, 33, 7, 5, [0xb8b4a8, 0xe0dccf, 0xf4f0e6]);
  // closed eyes, content
  p.line(11, 27, 14, 29, 0x101014); p.line(14, 29, 17, 27, 0x101014);
  p.line(22, 27, 25, 29, 0x101014); p.line(25, 29, 28, 27, 0x101014);
  p.rect(18, 32, 3, 2, 0xd08a8a);
  p.outline(0x1a1208);
  return p;
}

/** Sleeping-in-the-rain frame for the game over screen. */
export function deadCatBackdrop() {
  const p = new PB(W, GAME_H);
  const r = rng(961);
  p.vgrad(0, 0, W, GAME_H, [0x020203, 0x060305, 0x0a0406, 0x100608, 0x180808]);
  for (let i = 0; i < 700; i += 1) {
    p.rect(r() * W, 150 + r() * 120, 1 + r() * 4, 1, [0x180a0c, 0x0c0506, 0x241012][Math.floor(r() * 3)]);
  }
  // the small shape on the ground
  const ck = 0x25222a;
  p.ellipse(240, 204, 26, 9, ck);
  p.ellipse(218, 204, 9, 7, ck);
  p.thick(264, 206, 288, 212, 1.5, ck);
  for (let i = 0; i < 5; i += 1) p.rect(214 + i * 0.3, 196 + i, 4 - i * 0.6, 1, ck);
  p.rect(240, 211, 12, 2, ck);
  // X eye
  p.line(216, 202, 219, 205, 0x8a8690); p.line(219, 202, 216, 205, 0x8a8690);
  p.ellipse(240, 214, 58, 5, 0x3a1014);
  vignette(p, 1.3, W / 2, 200);
  return p;
}

// ---------------------------------------------------------------- Overlays
export function vignetteTexture() {
  const p = new PB(W, GAME_H);
  for (let y = 0; y < GAME_H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const dx = (x - W / 2) / (W * 0.55);
      const dy = (y - GAME_H / 2) / (GAME_H * 0.55);
      const d = dx * dx + dy * dy;
      if (d > 0.5) p.set(x, y, 0x000000, Math.min(170, (d - 0.5) * 240 * (0.7 + bayer(x, y) * 0.6)));
    }
  }
  return p;
}

export function scanlineTexture() {
  const p = new PB(4, 2);
  p.rect(0, 1, 4, 1, 0x000000);
  return p;
}

export function fogTexture() {
  const s = 128;
  const p = new PB(s, s);
  const r = rng(971);
  for (let i = 0; i < 60; i += 1) {
    const cx = r() * s;
    const cy = r() * s;
    const rad = 10 + r() * 24;
    for (let y = -rad; y <= rad; y += 1) {
      for (let x = -rad; x <= rad; x += 1) {
        const d = (x * x + y * y) / (rad * rad);
        if (d > 1) continue;
        const px = (Math.floor(cx + x) + s) % s;
        const py = (Math.floor(cy + y) + s) % s;
        if ((1 - d) * 0.75 > bayer(px, py)) p.set(px, py, 0xffffff, 255);
      }
    }
  }
  return p;
}

// ------------------------------------------------------------------- Icons
const ICON = {
  crust: { pal: { a: 0xb88a50, b: 0x8a6030, c: 0xd8b070 }, rows: ['..........', '..cccccc..', '.caaaaaab.', '.aaaaaaab.', '.aaaaaaab.', '.bbbbbbbb.', '..........'] },
  meat: { pal: { a: 0xa83a30, b: 0x6e2420, c: 0xe8e0c8 }, rows: ['..........', '...aaaa...', '..aaaaab..', '..aaaaab.c', '...aabbccc', '.......c..', '..........'] },
  fish: { pal: { a: 0x8ab0b8, b: 0x4a6e78, c: 0x101014 }, rows: ['..........', '...aaaa..b', '.aacaaaabb', 'aaaaaaaaab', '.aaaaaaabb', '...bbbb..b', '..........'] },
  milk: { pal: { a: 0xe8e4d8, b: 0xa8a498, c: 0x4a7ab0 }, rows: ['...aa.....', '..aaaa....', '.aaaaaa...', '.ccccca...', '.ccccca...', '.aaaaab...', '.bbbbbb...'] },
  tuna: { pal: { a: 0xa8acac, b: 0x6a6e70, c: 0xc84a3a }, rows: ['..........', '.aaaaaaaa.', '.bbbbbbbb.', '.cccccccc.', '.cccccccc.', '.bbbbbbbb.', '..........'] },
  rag: { pal: { a: 0xe0dcd0, b: 0xa8a498 }, rows: ['..........', '.aaaaaab..', '.aabaaab..', '.aaaabaa..', '..baaaab..', '..bbbbb...', '..........'] },
  salve: { pal: { a: 0xc84a3a, b: 0xe8e4d8, c: 0x6a6e70 }, rows: ['...cc.....', '...cc.....', '..bbbb....', '..baab....', '.baaaab...', '..baab....', '..bbbb....'] },
  catnip: { pal: { a: 0x6a9a48, b: 0x3e6e2e }, rows: ['....a.....', '...aab....', '.aaaab.aa.', '.baaabaab.', '...baaab..', '....bb....', '....b.....'] },
  cracker: { pal: { a: 0xc84a3a, b: 0x8a2c22, c: 0xf0d060 }, rows: ['.......c..', '......c...', '.....b....', '...aaa....', '..aaab....', '.aaab.....', '.bbb......'] },
  flare: { pal: { a: 0xe05030, b: 0x8a2c22, c: 0xfff0a0 }, rows: ['........cc', '.......cc.', '......aa..', '.....aab..', '....aab...', '...aab....', '...bb.....'] },
  claw: { pal: { a: 0xc8ccd0, b: 0x6e7274 }, rows: ['a...a...a.', 'aa..aa..aa', '.aa..aa..a', '.ba..ba..b', '..b...b...', '..........', '..........'] },
  collar: { pal: { a: 0x8a5a30, b: 0x5e3a1e, c: 0xd8c070 }, rows: ['..aaaaaa..', '.ab....ba.', '.a......a.', '.ab....ba.', '..aaccaa..', '....cc....', '..........'] },
  charm: { pal: { a: 0xd8c070, b: 0x8a7a40, c: 0xfff0b0 }, rows: ['....b.....', '...b.b....', '...aaa....', '..acaaa...', '..aaaaa...', '...aab....', '..........'] },
  paper: { pal: { a: 0xc8c0a4, b: 0x6a6450 }, rows: ['.aaaaaa...', '.abbbba...', '.aaaaaa...', '.abbbaa...', '.aaaaaa...', '.abbaa....', '.aaaa.....'] },
  key: { pal: { a: 0xc8ac60, b: 0x8a7440 }, rows: ['..........', '.aaa......', 'a...aaaaaa', 'a...abbabb', '.aaa......', '..........', '..........'] },
  heart: { pal: { a: 0xc84a3a, b: 0x8a2c22, c: 0xf08070 }, rows: ['.aa.aa....', 'acaaaab...', 'aaaaaab...', '.aaaab....', '..aab.....', '...b......', '..........'] },
  hunger: { pal: { a: 0xc89a48, b: 0x8a6830, c: 0x101014 }, rows: ['..........', '...aaa..b.', '.aacaaabb.', 'aaaaaaaab.', '.aaaaabbb.', '...bbb..b.', '..........'] },
};

export function iconFrames() {
  const out = {};
  for (const [k, v] of Object.entries(ICON)) {
    const p = new PB(10, 8);
    p.art(v.rows, v.pal, 0, 0);
    out[k] = p;
  }
  return out;
}
