import Phaser from 'phaser';
import { GAME_W, GAME_H, UI } from '../config.js';
import { Keys } from '../core/input.js';
import { Audio } from '../core/audio.js';
import { Session } from '../core/session.js';
import { latestSave } from '../core/save.js';
import { Weather } from '../systems/weather.js';
import { textWidth } from '../art/font.js';
import { txt } from '../ui/widgets.js';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver');
  }

  create() {
    Keys.reset();
    Audio.setMusic('gameover');
    Audio.setAmbience('rain');
    this.add.image(0, 0, 'bg_dead').setOrigin(0);
    this.weather = new Weather(this, 50);
    this.weather.set('drizzle');
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.weather.destroy());

    const big = 'THE RAIN KEEPS FALLING';
    const title = txt(this, Math.round((GAME_W - textWidth(big) * 2) / 2), 62, big, UI.danger).setScale(2).setDepth(60).setAlpha(0);
    const small = 'Nobody noticed.';
    const sub = txt(this, Math.round((GAME_W - textWidth(small)) / 2), 88, small, UI.dim).setDepth(60).setAlpha(0);
    this.tweens.add({ targets: title, alpha: 1, duration: 1400 });
    this.tweens.add({ targets: sub, alpha: 1, duration: 1400, delay: 1100 });

    this.save = latestSave();
    this.options = this.save ? ['Try again', 'Quit to title'] : ['Quit to title'];
    this.index = 0;
    this.texts = this.options.map((o, i) => txt(this, GAME_W / 2 - 34, 118 + i * 14, o, UI.text).setDepth(60).setAlpha(0));
    this.cursor = txt(this, GAME_W / 2 - 46, 118, '>', UI.accent).setDepth(60).setAlpha(0);
    this.ready = false;
    this.time.delayedCall(1500, () => {
      this.ready = true;
      Keys.flush();
      this.tweens.add({ targets: [...this.texts, this.cursor], alpha: 1, duration: 500 });
      this.place();
    });
    this.add.tileSprite(0, 0, GAME_W, GAME_H, 'scanlines').setOrigin(0).setDepth(90).setAlpha(0.12);
    this.overlay = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000, 1).setOrigin(0).setDepth(100);
    this.tweens.add({ targets: this.overlay, alpha: 0, duration: 800 });
  }

  place() {
    this.texts.forEach((t, i) => t.setTint(i === this.index ? UI.accent : UI.text));
    this.cursor.setY(this.texts[this.index].y);
  }

  update(_t, delta) {
    this.weather.update(delta, this.cameras.main);
    if (!this.ready) return;
    const n = this.options.length;
    if (Keys.take('up') || Keys.take('down')) {
      this.index = (this.index + 1) % n;
      Audio.play('select');
      this.place();
    }
    if (Keys.take('confirm')) {
      this.ready = false;
      Audio.play('confirm');
      const retry = this.options[this.index] === 'Try again';
      this.tweens.add({
        targets: this.overlay, alpha: 1, duration: 500,
        onComplete: () => {
          if (retry) {
            Session.state = latestSave().state;
            this.scene.start('World');
          } else {
            this.scene.start('Title');
          }
        },
      });
    }
  }
}
