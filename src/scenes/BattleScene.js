import Phaser from 'phaser';
import { GAME_W, GAME_H, UI } from '../config.js';
import { Keys } from '../core/input.js';
import { Audio } from '../core/audio.js';
import { Session } from '../core/session.js';
import { effectiveStats, INSTINCTS, applyInstinct } from '../core/state.js';
import { ITEMS, isUsableIn } from '../data/items.js';
import { Battle } from '../systems/combat.js';
import { Weather } from '../systems/weather.js';
import { wrapText, textWidth } from '../art/font.js';
import { txt, panel, Bar, drawPanel, wait, tween } from '../ui/widgets.js';

const COMMANDS = [
  { key: 'attack', label: 'ATTACK', help: 'Claw one enemy.' },
  { key: 'defend', label: 'DEFEND', help: 'Brace: take under half damage, and your next strike is 40% harder.' },
  { key: 'item', label: 'ITEM', help: 'Use something from your bag. It takes your turn.' },
  { key: 'escape', label: 'ESCAPE', help: 'Run for it. It can fail, and fast enemies are harder to shake.' },
];
const PLAYER_X = 408;
const PLAYER_Y = 184;

export class BattleScene extends Phaser.Scene {
  constructor() {
    super('Battle');
  }

  create(data) {
    this.params = data;
    const s = Session.state;
    this.s = s;
    this.b = new Battle(s, data.group, {});
    this.mode = null;
    this.pausing = null;
    this.logLines = [];
    this.views = {};

    // --- Stage -------------------------------------------------------
    this.add.image(0, 0, `bg_${data.bg}`).setOrigin(0).setDepth(0);
    this.weather = new Weather(this, 100);
    this.weather.set(data.bg === 'sewer' ? 'drip' : 'battle');
    this.add.image(0, 0, 'vignette').setOrigin(0).setDepth(150);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.weather.destroy());

    this.playerShadow = this.add.ellipse(PLAYER_X, PLAYER_Y, 62, 10, 0x000000, 0.5).setDepth(19);
    this.player = this.add.image(PLAYER_X, PLAYER_Y, 'b_cat').setOrigin(0.5, 1).setDepth(20);
    this.tweens.add({ targets: this.player, scaleY: 1.03, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

    this.b.enemies.forEach((e) => this.makeEnemyView(e));

    // --- Windows -----------------------------------------------------
    const y = 190;
    const h = GAME_H - y;
    panel(this, 2, y, 92, h - 2).setDepth(200);
    panel(this, 96, y, 254, h - 2).setDepth(200);
    panel(this, 352, y, 126, h - 2).setDepth(200);

    this.cmdTexts = COMMANDS.map((c, i) => txt(this, 20, y + 9 + i * 14, c.label, UI.text).setDepth(201));
    this.cursor = txt(this, 9, y + 9, '>', UI.accent).setDepth(201);

    this.logText = txt(this, 104, y + 8, '', UI.text).setDepth(201).setLineSpacing(2);

    this.nameText = txt(this, 360, y + 7, 'STRAY', UI.accent).setDepth(201);
    this.lvText = txt(this, 442, y + 7, `LV ${s.stats.level}`, UI.dim).setDepth(201);
    this.add.image(365, y + 25, 'icons', 'heart').setDepth(201);
    this.hpBar = new Bar(this, 372, y + 21, 100, 8, UI.hp, { low: UI.hpLow, lowAt: 0.3 }).setDepth(201);
    this.hpText = txt(this, 372, y + 31, '', UI.text).setDepth(201);
    this.add.image(365, y + 49, 'icons', 'hunger').setDepth(201);
    this.hungerBar = new Bar(this, 372, y + 45, 100, 6, UI.hunger, { low: UI.danger, lowAt: 0.25 }).setDepth(201);
    this.tagText = txt(this, 360, y + 55, '', UI.poison).setDepth(201);

    // Tooltip above the windows
    this.helpG = this.add.graphics().setDepth(202);
    this.helpText = txt(this, 0, 0, '', UI.dim).setDepth(203);

    // Sub-menu for items
    this.subG = this.add.graphics().setDepth(210);
    this.subItems = [];

    this.targetArrow = txt(this, 0, 0, 'v', UI.accent).setDepth(250).setVisible(false).setScale(2);

    this.overlay = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000, 1).setOrigin(0).setDepth(400);
    this.flashRect = this.add.rectangle(0, 0, GAME_W, GAME_H, 0xffffff, 0).setOrigin(0).setDepth(390);

    this.add.tileSprite(0, 0, GAME_W, GAME_H, 'scanlines').setOrigin(0).setDepth(420).setAlpha(0.1);

    Audio.setMusic(data.music || 'battle');
    this.refreshStatus();
    this.run();
  }

  // ------------------------------------------------------------- Formation
  slotPos(slot) {
    const enemies = this.b.enemies;
    const bossIdx = enemies.findIndex((e) => e.boss);
    if (bossIdx >= 0) {
      if (slot === bossIdx) return { x: 170, y: 184 };
      const others = enemies.map((_, i) => i).filter((i) => i !== bossIdx);
      const pos = others.indexOf(slot);
      return [{ x: 44, y: 182 }, { x: 306, y: 184 }, { x: 306, y: 150 }][pos] || { x: 44, y: 182 };
    }
    const n = this.initialCount || enemies.length;
    this.initialCount = n;
    if (n === 1) return { x: 172, y: 182 };
    if (n === 2) return [{ x: 104, y: 178 }, { x: 250, y: 184 }, { x: 300, y: 150 }][slot] || { x: 170, y: 180 };
    return [{ x: 60, y: 174 }, { x: 172, y: 184 }, { x: 290, y: 176 }][slot] || { x: 170, y: 180 };
  }

  makeEnemyView(e) {
    if (this.views[e.slot]) this.destroyView(this.views[e.slot]);
    const { x, y } = this.slotPos(e.slot);
    const sprite = this.add.image(x, y, e.data.sprite).setOrigin(0.5, 1).setDepth(10 + e.slot);
    const shadow = this.add.ellipse(x, y, sprite.width * 0.85, 10, 0x000000, 0.5).setDepth(9);
    const top = Math.max(10, y - sprite.height - 2);
    const barW = e.boss ? 100 : 54;
    const nameW = textWidth(e.name);
    const name = txt(this, Math.round(x - nameW / 2), top - 9 < 1 ? 1 : top - 9, e.name, UI.text).setDepth(180);
    const bar = new Bar(this, Math.round(x - barW / 2), name.y + 10, barW, 5, UI.danger, {}).setDepth(180);
    bar.set(e.hp, e.maxHp);
    const label = txt(this, 0, name.y + 16, '', UI.danger).setDepth(181);
    this.tweens.add({ targets: sprite, scaleY: 1.025, duration: 700 + Math.random() * 400, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.views[e.slot] = { e, sprite, shadow, name, bar, label, x, y, labelValue: '' };
    return this.views[e.slot];
  }

  destroyView(v) {
    this.tweens.killTweensOf(v.sprite);
    v.sprite.destroy();
    v.shadow.destroy();
    v.name.destroy();
    v.bar.destroy();
    v.label.destroy();
  }

  // --------------------------------------------------------------- Main loop
  async run() {
    const b = this.b;
    this.tweens.add({ targets: this.overlay, alpha: 0, duration: 260 });
    await wait(this, 200);

    const first = b.enemies[0];
    if (b.isBoss) {
      const boss = b.enemies.find((e) => e.boss);
      await this.say(`${boss.name} blocks the way!`);
      if (boss.data.intro) await this.say(boss.data.intro);
    } else if (b.enemies.length > 1) {
      await this.say(`${b.enemies.length} enemies close in!`);
    } else {
      await this.say(`A ${first.name.toLowerCase()} comes at you!`);
    }
    Audio.play(b.enemies[0].data.cry);

    if (!this.s.flags.tut_battle) {
      this.s.flags.tut_battle = true;
      await this.say('UP/DOWN to choose. E or SPACE to confirm. Watch enemies for red warnings, then DEFEND.', 1500);
    }

    while (!b.result) {
      await this.play(b.startRound());
      if (!this.s.flags.tut_telegraph && b.living.some((e) => e.label)) {
        this.s.flags.tut_telegraph = true;
        await this.say('A big attack is coming! Choose DEFEND now to blunt it.', 1300);
      }
      this.refreshLabels();
      const action = b.status.stun > 0 ? { type: 'stunned' } : await this.command();
      await this.play(b.resolve(action));
      this.refreshStatus();
    }

    if (b.result === 'win') await this.victory();
    else if (b.result === 'lose') await this.defeat();
    else await this.finish('escape');
  }

  // ------------------------------------------------------------ Event player
  async play(events) {
    for (const ev of events) {
      await this.playEvent(ev);
      this.refreshStatus();
    }
  }

  async playEvent(ev) {
    switch (ev.t) {
      case 'msg':
        await this.say(ev.text);
        break;
      case 'sfx':
        Audio.play(ev.name);
        break;
      case 'intents':
        this.refreshLabels();
        break;
      case 'telegraph': {
        const v = this.views[ev.slot];
        if (v) {
          Audio.play('alert');
          this.tweens.add({ targets: v.sprite, x: v.x + 3, duration: 50, yoyo: true, repeat: 3 });
          v.sprite.setTint(0xff9070);
          this.time.delayedCall(320, () => v.sprite.clearTint());
        }
        break;
      }
      case 'playerLunge': {
        const v = this.views[ev.slot];
        if (v) {
          await tween(this, { targets: this.player, x: v.x + 70, y: PLAYER_Y - 18, duration: 170, ease: 'Cubic.In' });
          this.slash(v);
          this.tweens.add({ targets: this.player, x: PLAYER_X, y: PLAYER_Y, duration: 260, ease: 'Cubic.Out' });
        }
        break;
      }
      case 'hitEnemy':
        await this.hitEnemy(ev);
        break;
      case 'miss': {
        const v = this.views[ev.slot];
        if (v) this.floatNumber(v.x, v.y - v.sprite.height / 2, 'MISS', UI.dim);
        break;
      }
      case 'deathEnemy':
        await this.killView(ev.slot, ev.quiet);
        break;
      case 'fleeEnemy': {
        const v = this.views[ev.slot];
        if (v) {
          v.name.setVisible(false);
          v.bar.setVisible(false);
          v.label.setText('');
          await tween(this, { targets: [v.sprite, v.shadow], x: -80, alpha: 0, duration: 420, ease: 'Cubic.In' });
          this.destroyView(v);
          delete this.views[ev.slot];
        }
        break;
      }
      case 'spawn': {
        const e = this.b.enemies[ev.slot];
        const v = this.makeEnemyView(e);
        v.sprite.setAlpha(0);
        v.sprite.y += 12;
        await tween(this, { targets: v.sprite, alpha: 1, y: v.y, duration: 300 });
        break;
      }
      case 'enemyLunge':
        await this.enemyLunge(ev);
        break;
      case 'hitPlayer':
        this.hitPlayer(ev);
        await wait(this, ev.poison ? 180 : 240);
        break;
      case 'playerDodge':
        this.floatNumber(PLAYER_X, PLAYER_Y - 60, 'MISS', UI.dim);
        await tween(this, { targets: this.player, x: PLAYER_X + 14, duration: 90, yoyo: true });
        break;
      case 'defend':
        Audio.play('whoosh');
        this.player.setTint(0x90b8e0);
        await tween(this, { targets: this.player, y: PLAYER_Y + 5, duration: 120 });
        break;
      case 'statusPlayer':
        this.floatNumber(PLAYER_X, PLAYER_Y - 74, ev.status === 'net' ? 'NETTED' : 'POISON', ev.status === 'net' ? UI.cold : UI.poison);
        break;
      case 'buff':
        this.floatNumber(PLAYER_X, PLAYER_Y - 74, 'ATK UP', UI.accent);
        this.player.setTint(0xe0ffa0);
        break;
      case 'flash':
        this.flashRect.fillAlpha = 0.8;
        await tween(this, { targets: this.flashRect, fillAlpha: 0, duration: 260 });
        break;
      case 'exposed': {
        const v = this.views[ev.slot];
        if (v) this.floatNumber(v.x, v.y - v.sprite.height / 2, 'OPEN!', UI.accent);
        this.refreshLabels();
        break;
      }
      case 'enemyBuff': {
        const v = this.views[ev.slot];
        if (v) {
          this.floatNumber(v.x, v.y - v.sprite.height / 2, 'RAGE', UI.danger);
          v.sprite.setTint(0xff8070);
          this.time.delayedCall(420, () => { if (v.sprite.active) v.sprite.clearTint(); });
        }
        break;
      }
      case 'healEnemy': {
        const v = this.views[ev.slot];
        if (v) {
          this.floatNumber(v.x, v.y - v.sprite.height / 2, `+${ev.amount}`, UI.good);
          v.bar.set(v.e.hp, v.e.maxHp);
        }
        break;
      }
      case 'playerHealed':
        this.floatNumber(PLAYER_X, PLAYER_Y - 60, 'HEAL', UI.good);
        this.sparkle();
        break;
      default:
    }
  }

  // ---------------------------------------------------------------- Effects
  slash(v) {
    const g = this.add.graphics().setDepth(170);
    const cx = v.x;
    const cy = v.y - v.sprite.height / 2;
    g.lineStyle(2, 0xffffff, 1);
    for (let i = -1; i <= 1; i += 1) g.lineBetween(cx - 16 + i * 8, cy - 20, cx + 8 + i * 8, cy + 20);
    this.tweens.add({ targets: g, alpha: 0, duration: 200, onComplete: () => g.destroy() });
  }

  async hitEnemy(ev) {
    const v = this.views[ev.slot];
    if (!v) return;
    v.bar.set(Math.max(0, v.e.hp), v.e.maxHp);
    v.sprite.setTintFill(0xffffff);
    this.time.delayedCall(70, () => { if (v.sprite.active) v.sprite.clearTint(); });
    this.floatNumber(v.x, v.y - v.sprite.height / 2 - 6, String(ev.dmg), ev.crit ? UI.accent : 0xffffff, ev.crit ? 3 : 2);
    this.blood(v.x, v.y - v.sprite.height / 2);
    if (ev.crit) this.cameras.main.shake(180, 0.01);
    this.tweens.add({ targets: v.sprite, x: v.x - 8, duration: 60, yoyo: true, repeat: 1 });
    await wait(this, 200);
  }

  async killView(slot, quiet) {
    const v = this.views[slot];
    if (!v) return;
    v.name.setVisible(false);
    v.bar.setVisible(false);
    v.label.setText('');
    this.tweens.killTweensOf(v.sprite);
    if (!quiet) {
      v.sprite.setTintFill(0xa02020);
      this.blood(v.x, v.y - v.sprite.height / 2);
      this.blood(v.x, v.y - v.sprite.height / 3);
    }
    await tween(this, { targets: [v.sprite, v.shadow], alpha: 0, scaleY: 0.6, duration: 360 });
    this.destroyView(v);
    delete this.views[slot];
  }

  blood(x, y) {
    for (let i = 0; i < 9; i += 1) {
      const r = this.add.rectangle(x, y, 2, 2, 0x8a1a18).setDepth(170);
      const a = Math.random() * Math.PI * 2;
      const d = 12 + Math.random() * 26;
      this.tweens.add({
        targets: r,
        x: x + Math.cos(a) * d,
        y: y + Math.sin(a) * d + 14,
        alpha: 0,
        duration: 320 + Math.random() * 200,
        onComplete: () => r.destroy(),
      });
    }
  }

  sparkle() {
    for (let i = 0; i < 10; i += 1) {
      const r = this.add.rectangle(PLAYER_X - 24 + Math.random() * 48, PLAYER_Y - Math.random() * 12, 2, 2, 0xa0e070).setDepth(170);
      this.tweens.add({ targets: r, y: r.y - 26 - Math.random() * 20, alpha: 0, duration: 520, delay: i * 26, onComplete: () => r.destroy() });
    }
  }

  floatNumber(x, y, str, color, scale = 1) {
    const w = textWidth(str) * scale;
    const t = txt(this, Math.round(x - w / 2), Math.round(y), str, color).setScale(scale).setDepth(300);
    this.tweens.add({ targets: t, y: y - 22, duration: 340, ease: 'Cubic.Out' });
    this.tweens.add({ targets: t, alpha: 0, delay: 500, duration: 220, onComplete: () => t.destroy() });
  }

  async enemyLunge(ev) {
    const v = this.views[ev.slot];
    if (!v) return;
    if (ev.anim === 'gas') {
      await this.gasCloud(v);
    } else if (ev.anim === 'net') {
      await this.throwNet(v);
    } else if (ev.anim === 'flood') {
      await this.flood();
    } else {
      const bigger = v.sprite.width > 120;
      await tween(this, { targets: v.sprite, x: v.x + (bigger ? 28 : 56), y: v.y + 4, duration: 140, ease: 'Cubic.In' });
      this.tweens.add({ targets: v.sprite, x: v.x, y: v.y, duration: 240, ease: 'Cubic.Out' });
    }
  }

  async gasCloud(v) {
    const parts = [];
    for (let i = 0; i < 18; i += 1) {
      const r = this.add.rectangle(v.x + 20, v.y - v.sprite.height / 2, 3, 3, 0x9ab83a, 0.8).setDepth(170);
      parts.push(r);
      this.tweens.add({
        targets: r,
        x: PLAYER_X - 20 + Math.random() * 40,
        y: PLAYER_Y - 44 + Math.random() * 44,
        alpha: 0.2,
        duration: 340 + Math.random() * 180,
        delay: i * 12,
        onComplete: () => r.destroy(),
      });
    }
    await wait(this, 420);
  }

  async throwNet(v) {
    const g = this.add.graphics().setDepth(170);
    g.lineStyle(1, 0xd8d0b0, 1);
    for (let i = -30; i <= 30; i += 10) {
      g.lineBetween(i, -30, i, 30);
      g.lineBetween(-30, i, 30, i);
    }
    g.setPosition(v.x + 30, v.y - 80).setScale(0.3);
    await tween(this, { targets: g, x: PLAYER_X, y: PLAYER_Y - 30, scaleX: 1.1, scaleY: 1, duration: 300, ease: 'Sine.In' });
    this.tweens.add({ targets: g, alpha: 0, delay: 120, duration: 240, onComplete: () => g.destroy() });
  }

  async flood() {
    const wave = this.add.rectangle(0, 190, GAME_W, 0, 0x3a5220, 0.92).setOrigin(0, 1).setDepth(160);
    this.cameras.main.shake(700, 0.012);
    await tween(this, { targets: wave, height: 190, duration: 360, ease: 'Cubic.In' });
    this.flashRect.fillColor = 0x90b040;
    this.flashRect.fillAlpha = 0.4;
    this.tweens.add({ targets: this.flashRect, fillAlpha: 0, duration: 300 });
    this.tweens.add({ targets: wave, alpha: 0, duration: 500, onComplete: () => wave.destroy() });
    this.time.delayedCall(320, () => { this.flashRect.fillColor = 0xffffff; });
  }

  hitPlayer(ev) {
    const big = ev.dmg >= 10;
    this.floatNumber(PLAYER_X, PLAYER_Y - 58, String(ev.dmg), ev.poison ? UI.poison : UI.danger, big ? 3 : 2);
    if (!ev.poison) Audio.play('hurt');
    this.player.setTexture('b_cat_hurt');
    this.player.setTintFill(ev.poison ? 0x9ab83a : 0xff3020);
    this.time.delayedCall(90, () => {
      if (!this.player.active) return;
      this.player.clearTint();
      if (this.b.status.defending) this.player.setTint(0x90b8e0);
    });
    this.time.delayedCall(420, () => { if (this.player.active && this.s.stats.hp > 0) this.player.setTexture('b_cat'); });
    this.cameras.main.shake(ev.heavy ? 260 : 120, ev.heavy ? 0.014 : 0.006);
    this.flashRect.fillColor = 0xa01010;
    this.flashRect.fillAlpha = ev.poison ? 0.1 : 0.22;
    this.tweens.add({
      targets: this.flashRect, fillAlpha: 0, duration: 170,
      onComplete: () => { this.flashRect.fillColor = 0xffffff; },
    });
  }

  // ------------------------------------------------------------------- HUD
  refreshStatus() {
    const s = this.s;
    const eff = effectiveStats(s);
    this.hpBar.set(s.stats.hp, eff.hpMax);
    this.hpText.setText(`${Math.max(0, s.stats.hp)} / ${eff.hpMax}`);
    this.hungerBar.set(s.stats.hunger, 100);
    this.lvText.setText(`LV ${s.stats.level}`);
    const st = this.b.status;
    const tags = [];
    if (st.poison > 0) tags.push(`PSN ${st.poison}`);
    if (st.atkBuff > 1) tags.push('NIP');
    if (st.pounce) tags.push('POUNCE');
    if (eff.starving) tags.push('WEAK');
    this.tagText.setText(tags.join(' '));
    Audio.setHeartbeat(s.stats.hp > 0 && s.stats.hp / eff.hpMax < 0.25);
    if (!st.defending && this.player.isTinted && !st.atkBuffTurns) this.player.clearTint();
  }

  refreshLabels() {
    for (const v of Object.values(this.views)) {
      let text = v.e.label || '';
      if (v.e.exposed) text = 'WIDE OPEN';
      v.label.setText(text ? `! ${text}` : '');
      v.label.setTint(v.e.exposed ? UI.accent : UI.danger);
      const w = textWidth(v.label.text);
      v.label.setX(Math.round(v.x - w / 2));
      v.bar.set(Math.max(0, v.e.hp), v.e.maxHp);
    }
  }

  /** Adds text to the battle log and holds long enough to read it. */
  async say(text, ms) {
    const lines = wrapText(text, 236);
    this.logLines.push(...lines);
    this.logLines = this.logLines.slice(-5);
    this.logText.setText(this.logLines.join('\n'));
    await this.hold(ms ?? Math.min(1100, 340 + text.length * 11));
  }

  hold(ms) {
    return new Promise((resolve) => {
      this.pausing = { until: this.time.now + ms, resolve, min: this.time.now + 90 };
    });
  }

  setHelp(text) {
    this.helpG.clear();
    if (!text) {
      this.helpText.setText('');
      return;
    }
    const w = textWidth(text) + 12;
    const x = Math.max(2, Math.round((GAME_W - w) / 2));
    drawPanel(this.helpG, x, 172, w, 16, { alpha: 0.9 });
    this.helpText.setText(text).setPosition(x + 6, 176);
  }

  // ---------------------------------------------------------------- Command
  command() {
    Keys.flush();
    return new Promise((resolve) => {
      this.resolveCommand = resolve;
      this.mode = 'root';
      this.cmdIndex = this.cmdIndex || 0;
      this.updateCursor();
    });
  }

  updateCursor() {
    this.cursor.setVisible(true);
    this.cursor.setY(this.cmdTexts[this.cmdIndex].y);
    this.cmdTexts.forEach((t, i) => t.setTint(i === this.cmdIndex ? UI.accent : UI.text));
    this.cmdTexts[3].setTint(this.b.canEscape ? (this.cmdIndex === 3 ? UI.accent : UI.text) : UI.faint);
    const c = COMMANDS[this.cmdIndex];
    this.setHelp(c.key === 'escape' && !this.b.canEscape ? 'There is no running from this one.' : c.help);
  }

  submit(action) {
    this.mode = null;
    this.cursor.setVisible(false);
    this.setHelp(null);
    this.targetArrow.setVisible(false);
    this.clearSub();
    const r = this.resolveCommand;
    this.resolveCommand = null;
    r(action);
  }

  updateRootMenu() {
    if (Keys.take('up')) {
      this.cmdIndex = (this.cmdIndex + 3) % 4;
      Audio.play('select');
      this.updateCursor();
    }
    if (Keys.take('down')) {
      this.cmdIndex = (this.cmdIndex + 1) % 4;
      Audio.play('select');
      this.updateCursor();
    }
    if (Keys.take('confirm')) {
      const c = COMMANDS[this.cmdIndex];
      if (c.key === 'attack') {
        Audio.play('select');
        if (this.b.living.length === 1) this.submit({ type: 'attack', slot: this.b.living[0].slot });
        else this.openTargets();
      } else if (c.key === 'defend') {
        Audio.play('confirm');
        this.submit({ type: 'defend' });
      } else if (c.key === 'item') {
        Audio.play('select');
        this.openItems();
      } else if (c.key === 'escape') {
        if (this.b.canEscape) {
          Audio.play('confirm');
          this.submit({ type: 'escape' });
        } else {
          Audio.play('cancel');
        }
      }
    }
  }

  // ---------------------------------------------------------------- Targets
  openTargets() {
    this.mode = 'target';
    const living = this.b.living;
    this.targetIdx = 0;
    // Default to the most wounded target.
    let best = 1.1;
    living.forEach((e, i) => {
      const r = e.hp / e.maxHp;
      if (r < best) {
        best = r;
        this.targetIdx = i;
      }
    });
    this.setHelp('Choose a target. LEFT/RIGHT to switch, X to go back.');
    this.placeTarget();
  }

  placeTarget() {
    const living = this.b.living;
    const e = living[this.targetIdx];
    const v = this.views[e.slot];
    Object.values(this.views).forEach((o) => o.name.setTint(o === v ? UI.accent : UI.text));
    this.targetArrow.setVisible(true).setPosition(v.x - 5, Math.max(0, v.name.y + 24));
  }

  updateTargets() {
    const n = this.b.living.length;
    if (Keys.take('left') || Keys.take('up')) {
      this.targetIdx = (this.targetIdx + n - 1) % n;
      Audio.play('select');
      this.placeTarget();
    }
    if (Keys.take('right') || Keys.take('down')) {
      this.targetIdx = (this.targetIdx + 1) % n;
      Audio.play('select');
      this.placeTarget();
    }
    if (Keys.take('cancel') || Keys.take('menu')) {
      Audio.play('cancel');
      this.mode = 'root';
      this.targetArrow.setVisible(false);
      Object.values(this.views).forEach((o) => o.name.setTint(UI.text));
      this.updateCursor();
      return;
    }
    if (Keys.take('confirm')) {
      Audio.play('confirm');
      Object.values(this.views).forEach((o) => o.name.setTint(UI.text));
      this.submit({ type: 'attack', slot: this.b.living[this.targetIdx].slot });
    }
  }

  // ------------------------------------------------------------------ Items
  openItems() {
    this.itemList = Object.keys(this.s.inv).filter((id) => isUsableIn(ITEMS[id], 'battle'));
    if (!this.itemList.length) {
      Audio.play('cancel');
      this.setHelp('Your bag has nothing useful in it.');
      return;
    }
    this.mode = 'item';
    this.itemIdx = 0;
    this.itemTop = 0;
    this.drawItems();
  }

  clearSub() {
    this.subG.clear();
    this.subItems.forEach((o) => o.destroy());
    this.subItems = [];
  }

  drawItems() {
    this.clearSub();
    const x = 96;
    const y = 190;
    const rows = 5;
    drawPanel(this.subG, x, y, 254, GAME_H - y - 2, { alpha: 1 });
    if (this.itemIdx < this.itemTop) this.itemTop = this.itemIdx;
    if (this.itemIdx >= this.itemTop + rows) this.itemTop = this.itemIdx - rows + 1;
    this.itemList.slice(this.itemTop, this.itemTop + rows).forEach((id, i) => {
      const it = ITEMS[id];
      const row = y + 7 + i * 14;
      const selected = i + this.itemTop === this.itemIdx;
      const color = selected ? UI.accent : UI.text;
      this.subItems.push(this.add.image(x + 20, row + 4, 'icons', it.icon).setDepth(211));
      this.subItems.push(txt(this, x + 30, row, it.name, color).setDepth(211));
      const count = `x${this.s.inv[id]}`;
      this.subItems.push(txt(this, x + 240 - textWidth(count), row, count, UI.dim).setDepth(211));
      if (selected) this.subItems.push(txt(this, x + 7, row, '>', UI.accent).setDepth(211));
    });
    this.setHelp(ITEMS[this.itemList[this.itemIdx]].desc);
  }

  updateItems() {
    const n = this.itemList.length;
    if (Keys.take('up')) {
      this.itemIdx = (this.itemIdx + n - 1) % n;
      Audio.play('select');
      this.drawItems();
    }
    if (Keys.take('down')) {
      this.itemIdx = (this.itemIdx + 1) % n;
      Audio.play('select');
      this.drawItems();
    }
    if (Keys.take('cancel') || Keys.take('menu')) {
      Audio.play('cancel');
      this.clearSub();
      this.mode = 'root';
      this.updateCursor();
      return;
    }
    if (Keys.take('confirm')) {
      Audio.play('confirm');
      this.submit({ type: 'item', id: this.itemList[this.itemIdx] });
    }
  }

  // ---------------------------------------------------------------- Results
  async victory() {
    Audio.setMusic('none');
    Audio.setHeartbeat(false);
    Audio.play('victory');
    const r = this.b.grantRewards();
    this.refreshStatus();
    this.setHelp(null);

    const lines = [`Gained ${r.xp} XP`];
    if (r.caps) lines.push(`Found ${r.caps} bottlecap${r.caps > 1 ? 's' : ''}`);
    r.items.forEach((id) => lines.push(`Found ${ITEMS[id].name}`));
    if (r.levels) lines.push(`You reached level ${this.s.stats.level}!`);

    const h = lines.length * 12 + 34;
    const w = 180;
    const x = Math.round((GAME_W - w) / 2);
    const y = Math.max(16, Math.round(95 - h / 2));
    const g = panel(this, x, y, w, h, { alpha: 0.97 }).setDepth(260);
    const parts = [g, txt(this, x + 10, y + 8, 'YOU SURVIVED', UI.accent).setDepth(261)];
    lines.forEach((l, i) => parts.push(txt(this, x + 10, y + 22 + i * 12, l, i === lines.length - 1 && r.levels ? UI.good : UI.text).setDepth(261)));
    if (r.levels) Audio.play('levelup');
    await this.waitConfirm();
    parts.forEach((p) => p.destroy());

    while (this.s.pendingInstincts > 0) await this.instinct();
    await this.finish('win');
  }

  /** Each level lets the player shape the cat. */
  instinct() {
    return new Promise((resolve) => {
      const w = 322;
      const h = 94;
      const x = Math.round((GAME_W - w) / 2);
      const y = 30;
      const g = panel(this, x, y, w, h, { alpha: 0.98 }).setDepth(260);
      const parts = [g, txt(this, x + 10, y + 8, 'A NEW INSTINCT. CHOOSE ONE:', UI.accent).setDepth(261)];
      const names = INSTINCTS.map((ins, i) => {
        const t = txt(this, x + 22, y + 24 + i * 11, ins.name, UI.text).setDepth(261);
        parts.push(t);
        return t;
      });
      const cur = txt(this, x + 10, y + 24, '>', UI.accent).setDepth(261);
      parts.push(cur);
      const desc = txt(this, x + 10, y + 74, '', UI.dim).setDepth(261);
      parts.push(desc);
      const show = (i) => {
        names.forEach((t, j) => t.setTint(j === i ? UI.accent : UI.text));
        cur.setY(names[i].y);
        desc.setText(INSTINCTS[i].desc);
      };
      show(0);
      Keys.flush();
      this.mode = 'instinct';
      this.instinctState = {
        index: 0,
        show,
        done: (i) => {
          applyInstinct(this.s, INSTINCTS[i].key);
          this.refreshStatus();
          Audio.play('levelup');
          parts.forEach((p) => p.destroy());
          this.mode = null;
          resolve();
        },
      };
    });
  }

  updateInstinct() {
    const st = this.instinctState;
    const n = INSTINCTS.length;
    if (Keys.take('up')) {
      st.index = (st.index + n - 1) % n;
      Audio.play('select');
      st.show(st.index);
    }
    if (Keys.take('down')) {
      st.index = (st.index + 1) % n;
      Audio.play('select');
      st.show(st.index);
    }
    if (Keys.take('confirm')) st.done(st.index);
  }

  waitConfirm() {
    Keys.flush();
    return new Promise((resolve) => {
      this.confirmWait = resolve;
    });
  }

  async defeat() {
    Audio.setMusic('none');
    Audio.setHeartbeat(false);
    Audio.play('gameover');
    this.player.setTexture('b_cat_hurt');
    this.tweens.killTweensOf(this.player);
    this.tweens.add({ targets: this.player, angle: -80, y: PLAYER_Y + 2, duration: 700, ease: 'Bounce.Out' });
    await this.say('Your legs stop answering you.', 1400);
    await tween(this, { targets: this.overlay, alpha: 1, duration: 900 });
    this.params.onEnd('lose');
    this.scene.stop();
  }

  async finish(result) {
    await tween(this, { targets: this.overlay, alpha: 1, duration: 240 });
    Audio.setHeartbeat(false);
    this.scene.stop();
    this.params.onEnd(result);
  }

  update(_t, delta) {
    this.weather.update(delta, this.cameras.main);

    if (this.pausing) {
      const p = this.pausing;
      const skip = this.time.now > p.min && Keys.take('confirm');
      if (skip || this.time.now >= p.until) {
        this.pausing = null;
        p.resolve();
      }
      return;
    }
    if (this.confirmWait) {
      if (Keys.take('confirm')) {
        const r = this.confirmWait;
        this.confirmWait = null;
        Audio.play('select');
        r();
      }
      return;
    }
    if (this.mode === 'root') this.updateRootMenu();
    else if (this.mode === 'target') this.updateTargets();
    else if (this.mode === 'item') this.updateItems();
    else if (this.mode === 'instinct') this.updateInstinct();
  }
}
