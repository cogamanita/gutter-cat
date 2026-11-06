// Rain, splashes, fog and lightning, drawn in screen space above the world.

import { GAME_W, GAME_H } from '../config.js';
import { Audio } from '../core/audio.js';

const PRESETS = {
  none: { drops: 0, fog: 0 },
  battle: { drops: 110, fog: 0.05, wind: 0.32, speed: 620, fogTint: 0x8a9aa8 },
  rain: { drops: 150, fog: 0.07, ripples: 0.5, lightning: true, wind: 0.32, speed: 620, fogTint: 0x8a9aa8 },
  drizzle: { drops: 60, fog: 0.05, ripples: 0.18, wind: 0.14, speed: 480, fogTint: 0xa8a090 },
  drizzle_light: { drops: 18, fog: 0.04, ripples: 0.05, wind: 0.08, speed: 360, fogTint: 0xa8a090 },
  drip: { drops: 0, fog: 0.1, drips: true, fogTint: 0x6a8a30 },
  title: { drops: 170, fog: 0.05, ripples: 0.5, lightning: true, wind: 0.34, speed: 640, fogTint: 0x8a9aa8 },
};

export class Weather {
  constructor(scene, depth) {
    this.scene = scene;
    this.depth = depth;
    this.g = scene.add.graphics().setScrollFactor(0).setDepth(depth);
    this.fog = scene.add.tileSprite(0, 0, GAME_W, GAME_H, 'fog')
      .setOrigin(0).setScrollFactor(0).setDepth(depth - 1).setAlpha(0);
    this.drops = [];
    this.ripples = [];
    this.flash = 0;
    this.nextLightning = 6000 + Math.random() * 12000;
    this.preset = PRESETS.none;
    this.t = 0;
  }

  set(kind) {
    this.preset = PRESETS[kind] || PRESETS.none;
    const p = this.preset;
    this.drops = [];
    for (let i = 0; i < p.drops; i += 1) this.drops.push(this.newDrop(true));
    this.fog.setAlpha(p.fog || 0);
    if (p.fogTint) this.fog.setTint(p.fogTint);
    this.ripples = [];
  }

  newDrop(anywhere) {
    return {
      x: Math.random() * (GAME_W + 60) - 30,
      y: anywhere ? Math.random() * GAME_H : -10 - Math.random() * 60,
      len: 4 + Math.random() * 7,
      speed: (this.preset.speed || 500) * (0.75 + Math.random() * 0.5),
      a: 0.16 + Math.random() * 0.3,
    };
  }

  update(dtMs, cam) {
    const dt = dtMs / 1000;
    const p = this.preset;
    this.t += dtMs;
    const g = this.g;
    g.clear();

    if (p.fog) {
      this.fog.tilePositionX = cam.scrollX * 0.5 + this.t * 0.006;
      this.fog.tilePositionY = cam.scrollY * 0.5 + Math.sin(this.t * 0.0002) * 16;
    }

    for (const d of this.drops) {
      d.y += d.speed * dt;
      d.x -= d.speed * p.wind * dt;
      if (d.y > GAME_H + 4 || d.x < -24) Object.assign(d, this.newDrop(false));
      g.lineStyle(1, 0xa8c0d0, d.a);
      g.lineBetween(d.x, d.y, d.x + d.len * p.wind, d.y - d.len);
    }

    if (p.ripples && Math.random() < p.ripples) {
      this.ripples.push({ x: Math.random() * GAME_W, y: Math.random() * GAME_H, t: 0 });
    }
    if (p.drips && Math.random() < 0.05) {
      this.ripples.push({ x: Math.random() * GAME_W, y: Math.random() * GAME_H, t: 0, green: true });
    }
    for (const r of this.ripples) {
      r.t += dtMs;
      const k = r.t / 260;
      g.lineStyle(1, r.green ? 0x90b040 : 0xb8d0dc, 0.2 * (1 - k));
      g.strokeEllipse(Math.round(r.x), Math.round(r.y), 2 + k * 6, 1 + k * 2);
    }
    this.ripples = this.ripples.filter((r) => r.t < 260);

    // Lightning
    if (p.lightning) {
      this.nextLightning -= dtMs;
      if (this.nextLightning <= 0) {
        this.nextLightning = 10000 + Math.random() * 18000;
        this.flash = 0.75;
        this.doubleStrike = 90;
        setTimeout(() => Audio.play('thunder'), 300 + Math.random() * 1200);
      }
    }
    if (this.doubleStrike > 0) {
      this.doubleStrike -= dtMs;
      if (this.doubleStrike <= 0) this.flash = 0.6;
    }
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 2.2);
  }

  destroy() {
    this.g.destroy();
    this.fog.destroy();
  }
}
