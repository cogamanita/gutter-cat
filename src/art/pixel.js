// A tiny software pixel buffer. All game art is drawn through this, with no
// anti-aliasing, then handed to Phaser as canvas textures.

const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
].map((row) => row.map((v) => (v + 0.5) / 16));

export const bayer = (x, y) => BAYER[((y % 4) + 4) % 4][((x % 4) + 4) % 4];

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function mix(c1, c2, t) {
  const r = ((c1 >> 16) & 255) + (((c2 >> 16) & 255) - ((c1 >> 16) & 255)) * t;
  const g = ((c1 >> 8) & 255) + (((c2 >> 8) & 255) - ((c1 >> 8) & 255)) * t;
  const b = (c1 & 255) + ((c2 & 255) - (c1 & 255)) * t;
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
}

export class PB {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.d = new Uint8ClampedArray(w * h * 4);
  }

  set(x, y, c, a = 255) {
    x = Math.floor(x);
    y = Math.floor(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    this.d[i] = (c >> 16) & 255;
    this.d[i + 1] = (c >> 8) & 255;
    this.d[i + 2] = c & 255;
    this.d[i + 3] = a;
  }

  /** Blend a colour over what is already there. */
  over(x, y, c, a) {
    x = Math.floor(x);
    y = Math.floor(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    const srcA = a;
    const dstA = this.d[i + 3] / 255;
    const outA = srcA + dstA * (1 - srcA);
    if (outA <= 0) return;
    this.d[i] = (((c >> 16) & 255) * srcA + this.d[i] * dstA * (1 - srcA)) / outA;
    this.d[i + 1] = (((c >> 8) & 255) * srcA + this.d[i + 1] * dstA * (1 - srcA)) / outA;
    this.d[i + 2] = ((c & 255) * srcA + this.d[i + 2] * dstA * (1 - srcA)) / outA;
    this.d[i + 3] = outA * 255;
  }

  alpha(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
    return this.d[(y * this.w + x) * 4 + 3];
  }

  rect(x, y, w, h, c) {
    for (let j = 0; j < h; j += 1) for (let i = 0; i < w; i += 1) this.set(x + i, y + j, c);
    return this;
  }

  fill(c) {
    return this.rect(0, 0, this.w, this.h, c);
  }

  /** Vertical gradient with ordered dithering between ramp colours. */
  vgrad(x, y, w, h, ramp) {
    for (let j = 0; j < h; j += 1) {
      const t = (j / Math.max(1, h - 1)) * (ramp.length - 1);
      for (let i = 0; i < w; i += 1) {
        const idx = Math.min(ramp.length - 1, Math.floor(t + bayer(x + i, y + j)));
        this.set(x + i, y + j, ramp[idx]);
      }
    }
    return this;
  }

  line(x0, y0, x1, y1, c) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
    return this;
  }

  thick(x0, y0, x1, y1, r, c) {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let s = 0; s <= steps; s += 1) {
      const t = s / steps;
      this.ellipse(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r, r, c);
    }
    return this;
  }

  ellipse(cx, cy, rx, ry, c) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y += 1) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += 1) {
        const u = (x - cx) / Math.max(rx, 0.5);
        const v = (y - cy) / Math.max(ry, 0.5);
        if (u * u + v * v <= 1) this.set(x, y, c);
      }
    }
    return this;
  }

  /**
   * A shaded ball: per-pixel lighting from the upper left, dithered down a
   * colour ramp. This gives the plump "pre-rendered" look of 90s battle sprites.
   */
  blob(cx, cy, rx, ry, ramp, opts = {}) {
    const lx = opts.lx ?? -0.55;
    const ly = opts.ly ?? -0.7;
    const lz = opts.lz ?? 0.45;
    const dither = opts.dither ?? 0.9;
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y += 1) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += 1) {
        const u = (x - cx) / Math.max(rx, 0.5);
        const v = (y - cy) / Math.max(ry, 0.5);
        const d = u * u + v * v;
        if (d > 1) continue;
        const nz = Math.sqrt(1 - d);
        const l = u * lx + v * ly + nz * lz;
        const t = Math.max(0, Math.min(1, l * 0.62 + 0.42));
        const f = t * (ramp.length - 1) + (bayer(x, y) - 0.5) * dither;
        this.set(x, y, ramp[Math.max(0, Math.min(ramp.length - 1, Math.round(f)))]);
      }
    }
    return this;
  }

  /** Shaded limb between two points, built from overlapping balls. */
  limb(x0, y0, x1, y1, r0, r1, ramp, opts) {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1) * 2;
    for (let s = 0; s <= steps; s += 1) {
      const t = s / steps;
      const r = r0 + (r1 - r0) * t;
      this.blob(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r, r, ramp, opts);
    }
    return this;
  }

  /** Stamp a dark 1px outline around everything opaque. */
  outline(c = 0x0c0b0e) {
    const edge = [];
    for (let y = 0; y < this.h; y += 1) {
      for (let x = 0; x < this.w; x += 1) {
        if (this.alpha(x, y) !== 0) continue;
        if (this.alpha(x - 1, y) > 128 || this.alpha(x + 1, y) > 128 || this.alpha(x, y - 1) > 128 || this.alpha(x, y + 1) > 128) {
          edge.push([x, y]);
        }
      }
    }
    for (const [x, y] of edge) this.set(x, y, c);
    return this;
  }

  /** Random specks, only on opaque pixels. */
  speckle(x, y, w, h, colors, density, r) {
    for (let j = 0; j < h; j += 1) {
      for (let i = 0; i < w; i += 1) {
        if (this.alpha(x + i, y + j) > 0 && r() < density) {
          this.set(x + i, y + j, colors[Math.floor(r() * colors.length)]);
        }
      }
    }
    return this;
  }

  blit(src, ox = 0, oy = 0, flip = false) {
    for (let y = 0; y < src.h; y += 1) {
      for (let x = 0; x < src.w; x += 1) {
        const sx = flip ? src.w - 1 - x : x;
        const i = (y * src.w + sx) * 4;
        const a = src.d[i + 3];
        if (a === 0) continue;
        const c = (src.d[i] << 16) | (src.d[i + 1] << 8) | src.d[i + 2];
        if (a === 255) this.set(ox + x, oy + y, c);
        else this.over(ox + x, oy + y, c, a / 255);
      }
    }
    return this;
  }

  /** Draw ASCII art. pal maps characters to colours; "." is transparent. */
  art(rows, pal, ox = 0, oy = 0, flip = false) {
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x += 1) {
        const ch = row[flip ? row.length - 1 - x : x];
        if (ch === '.' || ch === ' ') continue;
        const c = pal[ch];
        if (c !== undefined) this.set(ox + x, oy + y, c);
      }
    });
    return this;
  }

  /** Half-size copy, for turning battle art into map sprites. */
  scaled(factor) {
    const w = Math.max(1, Math.round(this.w * factor));
    const h = Math.max(1, Math.round(this.h * factor));
    const out = new PB(w, h);
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const sx = Math.min(this.w - 1, Math.floor(x / factor));
        const sy = Math.min(this.h - 1, Math.floor(y / factor));
        const i = (sy * this.w + sx) * 4;
        if (this.d[i + 3] === 0) continue;
        out.set(x, y, (this.d[i] << 16) | (this.d[i + 1] << 8) | this.d[i + 2], this.d[i + 3]);
      }
    }
    return out;
  }

  toCanvas() {
    const c = document.createElement('canvas');
    c.width = this.w;
    c.height = this.h;
    const ctx = c.getContext('2d');
    ctx.putImageData(new ImageData(this.d, this.w, this.h), 0, 0);
    return c;
  }
}

/** Packs named same-size frames into one canvas texture. */
export function addSheet(scene, key, frames, fw, fh) {
  const names = Object.keys(frames);
  const cols = Math.ceil(Math.sqrt(names.length));
  const rows = Math.ceil(names.length / cols);
  const sheet = new PB(cols * fw, rows * fh);
  names.forEach((name, i) => sheet.blit(frames[name], (i % cols) * fw, Math.floor(i / cols) * fh));
  const tex = scene.textures.addCanvas(key, sheet.toCanvas());
  names.forEach((name, i) => tex.add(name, 0, (i % cols) * fw, Math.floor(i / cols) * fh, fw, fh));
  return tex;
}
