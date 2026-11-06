// Retro UI building blocks shared by every scene.

import { FONT, UI } from '../config.js';

export function txt(scene, x, y, str, color = UI.text) {
  return scene.add.bitmapText(x, y, FONT, str, 10).setTint(color);
}

/** Double-bevelled window, the classic RPG panel. */
export function drawPanel(g, x, y, w, h, opts = {}) {
  const fill = opts.fill ?? UI.panel;
  const alpha = opts.alpha ?? 0.94;
  g.fillStyle(0x000000, 1);
  g.fillRect(x, y, w, h);
  g.fillStyle(opts.edge ?? UI.panelEdge, 1);
  g.fillRect(x + 1, y + 1, w - 2, h - 2);
  g.fillStyle(0x000000, 1);
  g.fillRect(x + 2, y + 2, w - 4, h - 4);
  g.fillStyle(fill, alpha);
  g.fillRect(x + 3, y + 3, w - 6, h - 6);
  g.fillStyle(opts.lit ?? UI.panelEdgeLit, 1);
  g.fillRect(x + 1, y + 1, w - 2, 1);
  g.fillRect(x + 1, y + 1, 1, h - 2);
  return g;
}

export function panel(scene, x, y, w, h, opts) {
  return drawPanel(scene.add.graphics(), x, y, w, h, opts);
}

/** A segmented gauge, redrawn only when its value changes. */
export class Bar {
  constructor(scene, x, y, w, h, color, opts = {}) {
    this.g = scene.add.graphics();
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.color = color;
    this.low = opts.low ?? null;
    this.lowAt = opts.lowAt ?? 0.3;
    this.last = -1;
    this.display = null;
  }

  set(value, max) {
    const ratio = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
    if (ratio === this.last) return;
    this.last = ratio;
    const { g, x, y, w, h } = this;
    g.clear();
    g.fillStyle(0x000000, 1);
    g.fillRect(x, y, w, h);
    g.fillStyle(0x24221e, 1);
    g.fillRect(x + 1, y + 1, w - 2, h - 2);
    const fw = Math.ceil((w - 2) * ratio);
    const c = this.low !== null && ratio <= this.lowAt ? this.low : this.color;
    g.fillStyle(c, 1);
    g.fillRect(x + 1, y + 1, fw, h - 2);
    g.fillStyle(0xffffff, 0.22);
    g.fillRect(x + 1, y + 1, fw, 1);
    g.fillStyle(0x000000, 0.28);
    for (let i = 8; i < w - 2; i += 8) g.fillRect(x + i, y + 1, 1, h - 2);
  }

  setDepth(d) {
    this.g.setDepth(d);
    return this;
  }

  setVisible(v) {
    this.g.setVisible(v);
  }

  destroy() {
    this.g.destroy();
  }
}

/** Small promise helper tied to the scene clock. */
export function wait(scene, ms) {
  return new Promise((resolve) => scene.time.delayedCall(ms, resolve));
}

export function tween(scene, cfg) {
  return new Promise((resolve) => scene.tweens.add({ ...cfg, onComplete: resolve }));
}
