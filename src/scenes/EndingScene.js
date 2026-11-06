import Phaser from 'phaser';
import { GAME_W, GAME_H, UI } from '../config.js';
import { Keys } from '../core/input.js';
import { Audio } from '../core/audio.js';
import { Session } from '../core/session.js';
import { textWidth } from '../art/font.js';
import { txt, wait, tween } from '../ui/widgets.js';
import { formatTime } from './MenuScene.js';

const STORY = [
  'The fire ticks.',
  'Outside, the rain goes on falling. On somebody else.',
  'Nothing is coming. You keep checking. Nothing is coming.',
  'Somewhere nearby, someone is humming, badly, and you find you have started to purr.',
  'You did not know you could still do that.',
];

const center = (s, scale = 1) => Math.round((GAME_W - textWidth(s) * scale) / 2);

export class EndingScene extends Phaser.Scene {
  constructor() {
    super('Ending');
  }

  create() {
    Keys.reset();
    Audio.setHeartbeat(false);
    Audio.setAmbience('home');
    Audio.setMusic('home');

    this.add.image(0, 0, 'bg_ending').setOrigin(0);
    this.fire = this.add.graphics().setDepth(5);

    this.cat = this.add.image(250, 232, 'sleepcat').setOrigin(0.5, 1).setDepth(6);
    this.tweens.add({ targets: this.cat, scaleY: 1.05, duration: 1700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

    // The light breathes too, like firelight does.
    this.glow = this.add.rectangle(0, 0, GAME_W, GAME_H, 0xff9030, 0.1).setOrigin(0).setDepth(7).setBlendMode(Phaser.BlendModes.ADD);

    this.textPanel = this.add.rectangle(0, GAME_H - 40, GAME_W, 40, 0x1a0e06, 0.0).setOrigin(0).setDepth(20);
    this.line = txt(this, 0, GAME_H - 24, '', 0xffe8c0).setDepth(21);

    this.overlay = this.add.rectangle(0, 0, GAME_W, GAME_H, 0xffbe6e, 1).setOrigin(0).setDepth(100);
    this.tweens.add({ targets: this.overlay, alpha: 0, duration: 2600 });

    this.zzz = [];
    this.zTimer = 0;
    this.play();
  }

  async say(text) {
    this.line.setText(text).setX(center(text)).setAlpha(0);
    await tween(this, { targets: this.line, alpha: 1, duration: 900 });
    await this.holdOrSkip(2700);
    await tween(this, { targets: this.line, alpha: 0, duration: 700 });
  }

  holdOrSkip(ms) {
    Keys.flush();
    return new Promise((resolve) => {
      this.holding = { until: this.time.now + ms, resolve };
    });
  }

  async play() {
    await wait(this, 2800);
    this.tweens.add({ targets: this.textPanel, fillAlpha: 0.72, duration: 800 });
    for (const line of STORY) await this.say(line);
    await this.say('You sleep.');
    this.tweens.add({ targets: this.textPanel, fillAlpha: 0, duration: 800 });
    await wait(this, 2200);
    await this.credits();
  }

  async credits() {
    const s = Session.state;
    const fade = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x140a04, 0).setOrigin(0).setDepth(30);
    await tween(this, { targets: fade, fillAlpha: 0.72, duration: 1600 });

    const logo = this.add.image(GAME_W / 2, 26, 'logo').setOrigin(0.5, 0).setDepth(31).setAlpha(0);
    await tween(this, { targets: logo, alpha: 1, duration: 1000 });
    const end = 'THE END';
    const endT = txt(this, center(end, 2), 86, end, 0xffd890).setScale(2).setDepth(31).setAlpha(0);
    await tween(this, { targets: endT, alpha: 1, duration: 800 });

    const q = s.quests;
    const rows = [
      `Level ${s.stats.level}  -  ${s.battlesWon} fights survived  -  ${s.steps} steps  -  ${formatTime(s.playMs)}`,
    ];
    if (q.patch && q.patch.done) rows.push('Patch\'s kittens grew up. All three of them.');
    if (q.cages && q.cages.done) rows.push('Four cats got out of the Catcher\'s yard, and they stayed out.');
    if (s.flags.tom_fed) rows.push('Old Tom kept his fire going through the winter.');
    if (q.pale && q.pale.stage >= 1) rows.push('Pale listens to the water, and it is only water.');
    rows.push('');
    rows.push('The light at 14 Marrow Lane is still on.');
    rows.push('She says it is for whoever comes next.');
    rows.forEach((r, i) => {
      const t = txt(this, center(r), 118 + i * 13, r, i === 0 ? 0xe8c890 : 0xd8c8a8).setDepth(31).setAlpha(0);
      this.tweens.add({ targets: t, alpha: 1, duration: 800, delay: i * 500 });
    });
    await wait(this, rows.length * 500 + 900);

    const press = 'Press E to return to the title';
    const p = txt(this, center(press), GAME_H - 16, press, 0xa89878).setDepth(31);
    this.tweens.add({ targets: p, alpha: 0.4, duration: 800, yoyo: true, repeat: -1 });
    Keys.flush();
    this.canExit = true;
  }

  drawFire(time) {
    const g = this.fire;
    g.clear();
    const flick = Math.sin(time * 0.02) * 2;
    for (let i = 0; i < 26; i += 1) {
      const x = 52 + (i * 37) % 76;
      const h = 12 + ((i * 53 + Math.floor(time / 90)) % 24) + flick;
      const c = [0xe05010, 0xff9020, 0xffd060, 0xfff0a0][(i + Math.floor(time / 130)) % 4];
      g.fillStyle(c, 1);
      g.fillRect(x, 182 - h, 3, h);
    }
    g.fillStyle(0x3a1c0c, 1);
    g.fillRect(50, 178, 80, 8);
  }

  update(time, delta) {
    this.drawFire(time);
    this.glow.fillAlpha = 0.09 + Math.sin(time * 0.011) * 0.02 + Math.sin(time * 0.031) * 0.012;

    this.zTimer -= delta;
    if (this.zTimer <= 0) {
      this.zTimer = 1900;
      const z = txt(this, 228, 182, 'z', 0xf8f0d8).setDepth(10);
      this.tweens.add({ targets: z, x: 214 + Math.random() * 10, y: 138, alpha: 0, scale: 2, duration: 2800, onComplete: () => z.destroy() });
    }

    if (this.holding) {
      if (Keys.take('confirm') || this.time.now >= this.holding.until) {
        const { resolve } = this.holding;
        this.holding = null;
        resolve();
      }
    }
    if (this.canExit && Keys.take('confirm')) {
      this.canExit = false;
      this.tweens.add({
        targets: this.overlay, alpha: 1, duration: 900,
        onComplete: () => this.scene.start('Title'),
      });
    }
  }
}
