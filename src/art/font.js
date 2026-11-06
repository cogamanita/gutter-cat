// A hand-keyed proportional pixel font. Each glyph is rows of 5-bit values (16 =
// leftmost column); empty side columns are trimmed so narrow letters stay narrow.
// Rows 0-6 sit on the baseline, rows 7-8 are descenders.

import { FONT } from '../config.js';
import { PB } from './pixel.js';

const G = {
  ' ': [0, 0, 0, 0, 0, 0, 0],
  A: [14, 17, 17, 31, 17, 17, 17], B: [30, 17, 17, 30, 17, 17, 30], C: [14, 17, 16, 16, 16, 17, 14],
  D: [30, 17, 17, 17, 17, 17, 30], E: [31, 16, 16, 30, 16, 16, 31], F: [31, 16, 16, 30, 16, 16, 16],
  G: [14, 17, 16, 23, 17, 17, 15], H: [17, 17, 17, 31, 17, 17, 17], I: [14, 4, 4, 4, 4, 4, 14],
  J: [7, 2, 2, 2, 2, 18, 12], K: [17, 18, 20, 24, 20, 18, 17], L: [16, 16, 16, 16, 16, 16, 31],
  M: [17, 27, 21, 21, 17, 17, 17], N: [17, 25, 21, 19, 17, 17, 17], O: [14, 17, 17, 17, 17, 17, 14],
  P: [30, 17, 17, 30, 16, 16, 16], Q: [14, 17, 17, 17, 21, 18, 13], R: [30, 17, 17, 30, 20, 18, 17],
  S: [15, 16, 16, 14, 1, 1, 30], T: [31, 4, 4, 4, 4, 4, 4], U: [17, 17, 17, 17, 17, 17, 14],
  V: [17, 17, 17, 17, 17, 10, 4], W: [17, 17, 17, 21, 21, 27, 17], X: [17, 17, 10, 4, 10, 17, 17],
  Y: [17, 17, 10, 4, 4, 4, 4], Z: [31, 1, 2, 4, 8, 16, 31],
  a: [0, 0, 14, 1, 15, 17, 15], b: [16, 16, 30, 17, 17, 17, 30], c: [0, 0, 14, 16, 16, 16, 14],
  d: [1, 1, 15, 17, 17, 17, 15], e: [0, 0, 14, 17, 31, 16, 14], f: [6, 8, 8, 28, 8, 8, 8],
  g: [0, 0, 15, 17, 17, 17, 15, 1, 14], h: [16, 16, 30, 17, 17, 17, 17], i: [4, 0, 12, 4, 4, 4, 14],
  j: [2, 0, 6, 2, 2, 2, 2, 18, 12], k: [16, 16, 18, 20, 24, 20, 18], l: [12, 4, 4, 4, 4, 4, 14],
  m: [0, 0, 26, 21, 21, 21, 21], n: [0, 0, 30, 17, 17, 17, 17], o: [0, 0, 14, 17, 17, 17, 14],
  p: [0, 0, 30, 17, 17, 17, 30, 16, 16], q: [0, 0, 15, 17, 17, 17, 15, 1, 1], r: [0, 0, 22, 25, 16, 16, 16],
  s: [0, 0, 15, 16, 14, 1, 30], t: [8, 8, 28, 8, 8, 9, 6], u: [0, 0, 17, 17, 17, 17, 15],
  v: [0, 0, 17, 17, 17, 10, 4], w: [0, 0, 17, 17, 21, 21, 10], x: [0, 0, 17, 10, 4, 10, 17],
  y: [0, 0, 17, 17, 17, 17, 15, 1, 14], z: [0, 0, 31, 2, 4, 8, 31],
  0: [14, 17, 19, 21, 25, 17, 14], 1: [4, 12, 4, 4, 4, 4, 14], 2: [14, 17, 1, 2, 4, 8, 31],
  3: [30, 1, 1, 14, 1, 1, 30], 4: [2, 6, 10, 18, 31, 2, 2], 5: [31, 16, 30, 1, 1, 17, 14],
  6: [6, 8, 16, 30, 17, 17, 14], 7: [31, 1, 2, 4, 8, 8, 8], 8: [14, 17, 17, 14, 17, 17, 14],
  9: [14, 17, 17, 15, 1, 2, 12],
  '.': [0, 0, 0, 0, 0, 0, 16], ',': [0, 0, 0, 0, 0, 8, 8, 16], '!': [16, 16, 16, 16, 16, 0, 16],
  '?': [14, 17, 1, 2, 4, 0, 4], ':': [0, 16, 0, 0, 0, 16, 0], ';': [0, 8, 0, 0, 0, 8, 8, 16],
  "'": [16, 16, 0, 0, 0, 0, 0], '"': [20, 20, 0, 0, 0, 0, 0], '-': [0, 0, 0, 28, 0, 0, 0],
  '+': [0, 4, 4, 31, 4, 4, 0], '/': [1, 2, 2, 4, 8, 8, 16], '%': [25, 25, 2, 4, 8, 19, 19],
  '(': [4, 8, 16, 16, 16, 8, 4], ')': [16, 8, 4, 4, 4, 8, 16], '*': [0, 10, 4, 31, 4, 10, 0],
  '[': [28, 16, 16, 16, 16, 16, 28], ']': [28, 4, 4, 4, 4, 4, 28], '>': [16, 8, 4, 2, 4, 8, 16],
  '<': [2, 4, 8, 16, 8, 4, 2], '=': [0, 0, 31, 0, 31, 0, 0], '_': [0, 0, 0, 0, 0, 0, 31],
  '#': [10, 10, 31, 10, 31, 10, 10],
};

const CELL_W = 7;
const CELL_H = 9;
export const LINE_HEIGHT = 10;

const glyphWidth = {};

function measureGlyph(rows) {
  let minX = 5;
  let maxX = -1;
  for (const r of rows) {
    for (let x = 0; x < 5; x += 1) {
      if (r & (1 << (4 - x))) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
      }
    }
  }
  return maxX < 0 ? { minX: 0, width: 3 } : { minX, width: maxX - minX + 1 };
}

/** Width in pixels of a string in the game font. */
export function textWidth(str) {
  let w = 0;
  for (const ch of str) w += (glyphWidth[ch] ?? 3) + 1;
  return Math.max(0, w - 1);
}

/** Breaks text so the typewriter effect never makes a word jump lines. */
export function wrapText(text, maxWidth) {
  const out = [];
  for (const para of String(text).split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      const candidate = line ? `${line} ${word}` : word;
      if (textWidth(candidate) > maxWidth && line) {
        out.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    out.push(line);
  }
  return out;
}

for (const [ch, rows] of Object.entries(G)) glyphWidth[ch] = measureGlyph(rows).width;

/** One glyph as a boolean grid, for painting oversized title lettering. */
export function glyphGrid(ch) {
  const rows = G[ch] || G[' '];
  const { minX, width } = measureGlyph(rows);
  return {
    w: width,
    rows: rows.slice(0, 7).map((bits) => {
      const out = [];
      for (let x = 0; x < width; x += 1) out.push(!!(bits & (1 << (4 - (x + minX)))));
      return out;
    }),
  };
}

/** Builds the font texture and registers it with Phaser's bitmap font cache. */
export function createFont(scene) {
  const chars = Object.keys(G);
  const cols = 16;
  const rows = Math.ceil(chars.length / cols);
  const pb = new PB(cols * CELL_W, rows * CELL_H);
  const data = { font: FONT, size: LINE_HEIGHT, lineHeight: LINE_HEIGHT, chars: {} };

  chars.forEach((ch, i) => {
    const gx = (i % cols) * CELL_W;
    const gy = Math.floor(i / cols) * CELL_H;
    const { minX, width } = measureGlyph(G[ch]);
    G[ch].forEach((bits, y) => {
      for (let x = 0; x < 5; x += 1) {
        if (bits & (1 << (4 - x))) pb.set(gx + x - minX, gy + y, 0xffffff);
      }
    });
    data.chars[ch.charCodeAt(0)] = {
      x: gx, y: gy, width, height: CELL_H,
      centerX: Math.floor(width / 2), centerY: Math.floor(CELL_H / 2),
      xOffset: 0, yOffset: 0, xAdvance: width + 1,
      data: {}, kerning: {},
      u0: gx / pb.w, v0: gy / pb.h,
      u1: (gx + width) / pb.w, v1: (gy + CELL_H) / pb.h,
    };
  });

  scene.textures.addCanvas(FONT, pb.toCanvas());
  scene.cache.bitmapFont.add(FONT, { data, texture: FONT, frame: null });
}
