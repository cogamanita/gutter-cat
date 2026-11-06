// Dithered software lighting. A quarter-resolution light map is computed every
// frame, quantised through a Bayer matrix (so falloff has the chunky banding of
// 16-bit hardware) and multiplied over the whole world.

import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../config.js';

const SCALE = 2;
const LEVELS = 9;
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

export class LightMap {
  constructor(scene, depth) {
    this.scene = scene;
    this.w = Math.ceil(GAME_W / SCALE);
    this.h = Math.ceil(GAME_H / SCALE);
    this.key = 'lightmap';
    const tex = scene.textures.exists(this.key)
      ? scene.textures.get(this.key)
      : scene.textures.createCanvas(this.key, this.w, this.h);
    this.tex = tex;
    this.ctx = tex.getContext();
    this.img = this.ctx.createImageData(this.w, this.h);
    this.r = new Float32Array(this.w * this.h);
    this.g = new Float32Array(this.w * this.h);
    this.b = new Float32Array(this.w * this.h);
    this.image = scene.add.image(0, 0, this.key)
      .setOrigin(0).setScrollFactor(0).setScale(SCALE)
      .setBlendMode(Phaser.BlendModes.MULTIPLY)
      .setDepth(depth);
  }

  setVisible(v) {
    this.image.setVisible(v);
  }

  /** lights: [{x, y, r, color:[r,g,b], intensity}] in world pixels. */
  render(cam, lights, ambient, flash = 0) {
    const { w, h, r, g, b } = this;
    const ar = Math.min(1, ambient[0] + flash);
    const ag = Math.min(1, ambient[1] + flash);
    const ab = Math.min(1, ambient[2] + flash * 1.1);
    r.fill(ar);
    g.fill(ag);
    b.fill(ab);

    const sx = cam.scrollX;
    const sy = cam.scrollY;
    for (const l of lights) {
      const cx = (l.x - sx) / SCALE;
      const cy = (l.y - sy) / SCALE;
      const rad = l.r / SCALE;
      if (cx + rad < 0 || cy + rad < 0 || cx - rad > w || cy - rad > h) continue;
      const x0 = Math.max(0, Math.floor(cx - rad));
      const x1 = Math.min(w - 1, Math.ceil(cx + rad));
      const y0 = Math.max(0, Math.floor(cy - rad));
      const y1 = Math.min(h - 1, Math.ceil(cy + rad));
      const lr = l.color[0] * l.intensity;
      const lg = l.color[1] * l.intensity;
      const lb = l.color[2] * l.intensity;
      const inv = 1 / (rad * rad);
      for (let y = y0; y <= y1; y += 1) {
        const dy = y - cy;
        let i = y * w + x0;
        for (let x = x0; x <= x1; x += 1, i += 1) {
          const dx = x - cx;
          const d = (dx * dx + dy * dy) * inv;
          if (d >= 1) continue;
          const f = (1 - d) * (1 - d);
          r[i] += lr * f;
          g[i] += lg * f;
          b[i] += lb * f;
        }
      }
    }

    // Quantise. The dither pattern is anchored to the world so it doesn't crawl.
    const ox = Math.floor(sx / SCALE);
    const oy = Math.floor(sy / SCALE);
    const data = this.img.data;
    const steps = LEVELS - 1;
    let i = 0;
    for (let y = 0; y < h; y += 1) {
      const row = ((y + oy) & 3) * 4;
      for (let x = 0; x < w; x += 1, i += 1) {
        const t = BAYER4[row + ((x + ox) & 3)];
        const j = i * 4;
        data[j] = (Math.min(steps, Math.floor(r[i] * steps + t)) / steps) * 255;
        data[j + 1] = (Math.min(steps, Math.floor(g[i] * steps + t)) / steps) * 255;
        data[j + 2] = (Math.min(steps, Math.floor(b[i] * steps + t)) / steps) * 255;
        data[j + 3] = 255;
      }
    }
    this.ctx.putImageData(this.img, 0, 0);
    this.tex.refresh();
  }

  destroy() {
    this.image.destroy();
  }
}
