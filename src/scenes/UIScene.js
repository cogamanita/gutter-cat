import Phaser from 'phaser';
import { GAME_W, GAME_H, UI } from '../config.js';
import { Keys } from '../core/input.js';
import { Audio } from '../core/audio.js';
import { Session } from '../core/session.js';
import { effectiveStats, STARVING_AT } from '../core/state.js';
import { questText } from '../data/quests.js';
import { wrapText, textWidth } from '../art/font.js';
import { txt, panel, Bar, drawPanel } from '../ui/widgets.js';

const LINES_PER_PAGE = 4;
const LINE_H = 11;

/** HUD, dialogue boxes, choices, tooltips and notices. Runs on top of the world. */
export class UIScene extends Phaser.Scene {
  constructor() {
    super('UI');
  }

  create() {
    this.dialog = null;
    this.choice = null;
    this.toasts = [];
    this.lastHud = {};

    // --- HUD ---------------------------------------------------------
    this.hud = this.add.container(0, 0).setDepth(10);
    const hudPanel = panel(this, 3, 3, 126, 35);
    const face = this.add.image(19, 20, 'face_cat').setDisplaySize(26, 26);
    this.lvText = txt(this, 34, 6, 'LV 1', UI.accent);
    this.hpIcon = this.add.image(39, 20, 'icons', 'heart');
    this.hungerIcon = this.add.image(39, 30, 'icons', 'hunger');
    this.hpBar = new Bar(this, 46, 17, 78, 7, UI.hp, { low: UI.hpLow, lowAt: 0.3 });
    this.hungerBar = new Bar(this, 46, 27, 78, 7, UI.hunger, { low: UI.danger, lowAt: STARVING_AT / 100 });
    this.hpText = txt(this, 66, 6, '', UI.text);
    this.statusText = txt(this, 132, 6, '', UI.poison);
    this.hud.add([hudPanel, face, this.lvText, this.hpIcon, this.hungerIcon, this.hpBar.g, this.hungerBar.g, this.hpText, this.statusText]);

    // Objective, top right
    this.objG = this.add.graphics();
    this.objText = txt(this, 0, 7, '', UI.dim);
    this.hud.add([this.objG, this.objText]);

    // Contextual prompt
    this.promptG = this.add.graphics().setDepth(20);
    this.promptText = txt(this, 0, 0, '', UI.text).setDepth(21);
    this.promptValue = null;

    // Tutorial hints
    this.hintG = this.add.graphics().setDepth(22);
    this.hintText = txt(this, 0, 0, '', UI.accent).setDepth(23);
    this.hintUntil = 0;

    // Sound indicator
    this.muteText = txt(this, GAME_W - 30, GAME_H - 12, 'MUTE', UI.danger).setDepth(90);
    this.muteText.setVisible(Audio.muted);

    // Low health warning
    this.lowHp = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x800000, 0).setOrigin(0).setDepth(5);

    // Area name card
    this.areaText = txt(this, 0, 52, '', UI.text).setDepth(30).setAlpha(0);

    // Black screen for scene cuts and narration
    this.black = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000, 1).setOrigin(0).setDepth(60).setVisible(false);
    this.cardText = txt(this, 0, 0, '', UI.text).setDepth(61);

    // --- Dialogue ----------------------------------------------------
    this.boxG = this.add.graphics().setDepth(40);
    this.boxFace = this.add.image(0, 0, 'face_cat').setDepth(41).setVisible(false);
    this.boxName = txt(this, 0, 0, '', UI.accent).setDepth(41);
    this.boxText = txt(this, 0, 0, '', UI.text).setDepth(41);
    this.boxArrow = txt(this, 0, 0, '>', UI.accent).setDepth(41).setVisible(false);

    // --- Choices -----------------------------------------------------
    this.choiceG = this.add.graphics().setDepth(50);
    this.choiceTexts = [];

    this.toastLayer = this.add.container(0, 0).setDepth(35);

    // Warm wash for the moment the door opens
    this.warm = this.add.rectangle(0, 0, GAME_W, GAME_H, 0xffc060, 0).setOrigin(0).setDepth(70);

    const scan = this.add.tileSprite(0, 0, GAME_W, GAME_H, 'scanlines').setOrigin(0).setDepth(95).setAlpha(0.1);
    this.scan = scan;
  }

  setHud(visible) {
    this.hud.setVisible(visible);
    this.promptG.setVisible(visible);
    this.promptText.setVisible(visible);
    this.hintG.setVisible(visible);
    this.hintText.setVisible(visible);
    this.lowHp.setVisible(visible);
    this.toastLayer.setVisible(visible);
    this.areaText.setVisible(visible);
  }

  refreshHud() {
    const s = Session.state;
    if (!s) return;
    const st = s.stats;
    const eff = effectiveStats(s);
    const key = (name, val, fn) => {
      if (this.lastHud[name] !== val) {
        this.lastHud[name] = val;
        fn(val);
      }
    };
    key('lv', st.level, (v) => this.lvText.setText(`LV ${v}`));
    key('hp', `${st.hp}/${eff.hpMax}`, (v) => this.hpText.setText(v));
    this.hpBar.set(st.hp, eff.hpMax);
    this.hungerBar.set(st.hunger, 100);
    const tags = [];
    if (s.status.poison > 0) tags.push('POISONED');
    if (st.hunger < STARVING_AT) tags.push(st.hunger === 0 ? 'STARVING!' : 'HUNGRY');
    key('status', tags.join('  '), (v) => this.statusText.setText(v));

    const objective = s.quests.main ? questText('main', s.quests.main.stage) : '';
    key('obj', objective, (v) => {
      const lines = wrapText(v, 190);
      this.objText.setText(lines.join('\n'));
      this.objText.setPosition(GAME_W - 200, 7);
      this.objText.setLineSpacing(1);
      this.objG.clear();
      drawPanel(this.objG, GAME_W - 206, 3, 203, 8 + lines.length * 11, { alpha: 0.8 });
    });

    const low = st.hp / eff.hpMax < 0.25 && st.hp > 0;
    Audio.setHeartbeat(low && !s.flags.finished);
    this.lowHp.fillAlpha = low ? 0.1 + Math.sin(this.time.now * 0.006) * 0.08 : 0;
    this.muteText.setVisible(Audio.muted);
  }

  // ------------------------------------------------------ Contextual prompt
  prompt(text) {
    if (text === this.promptValue) return;
    this.promptValue = text;
    this.promptG.clear();
    if (!text) {
      this.promptText.setText('');
      return;
    }
    const w = textWidth(text) + 16;
    const x = Math.round((GAME_W - w) / 2);
    const y = GAME_H - 26;
    drawPanel(this.promptG, x, y, w, 18, { alpha: 0.88 });
    this.promptText.setText(text).setPosition(x + 8, y + 5);
  }

  hint(text, ms = 7000) {
    const lines = wrapText(text, 340);
    const w = Math.max(...lines.map(textWidth)) + 16;
    const h = lines.length * 11 + 10;
    const x = Math.round((GAME_W - w) / 2);
    const y = 44;
    this.hintG.clear();
    drawPanel(this.hintG, x, y, w, h, { alpha: 0.92, edge: 0x6a5a30, lit: 0xd8b050 });
    this.hintText.setText(lines.join('\n')).setPosition(x + 8, y + 5).setLineSpacing(1).setAlpha(1);
    this.hintG.setAlpha(1);
    this.hintUntil = this.time.now + ms;
  }

  clearHint() {
    this.hintUntil = 0;
    this.hintG.clear();
    this.hintText.setText('');
  }

  // ---------------------------------------------------------------- Toasts
  toast(text, color = UI.text) {
    const w = textWidth(text) + 14;
    const c = this.add.container(0, 0);
    const g = panel(this, Math.round((GAME_W - w) / 2), 0, w, 18, { alpha: 0.9 });
    const t = txt(this, Math.round((GAME_W - w) / 2) + 7, 5, text, color);
    c.add([g, t]);
    const row = this.toasts.length;
    c.y = 60 + row * 20;
    this.toasts.push(c);
    this.toastLayer.add(c);
    this.tweens.add({
      targets: c, alpha: 0, delay: 1800, duration: 400,
      onComplete: () => {
        c.destroy();
        this.toasts = this.toasts.filter((x) => x !== c);
      },
    });
  }

  areaCard(name) {
    this.areaText.setText(`- ${name} -`);
    this.areaText.setPosition(Math.round((GAME_W - textWidth(`- ${name} -`)) / 2), 52);
    this.tweens.killTweensOf(this.areaText);
    this.areaText.setAlpha(0);
    this.tweens.add({ targets: this.areaText, alpha: 1, duration: 500, yoyo: true, hold: 1800 });
  }

  // -------------------------------------------------------------- Dialogue
  say(name, faceKey, text) {
    Keys.flush();
    return new Promise((resolve) => {
      const hasFace = !!faceKey;
      const width = hasFace ? 396 : 448;
      const lines = wrapText(text, width);
      const pages = [];
      for (let i = 0; i < lines.length; i += LINES_PER_PAGE) {
        pages.push(lines.slice(i, i + LINES_PER_PAGE).join('\n'));
      }
      this.dialog = { pages, page: 0, shown: 0, resolve, name, faceKey, voice: name ? (name === 'RAG' ? 'select' : 'voiceLow') : 'blip' };
      this.drawBox();
    });
  }

  drawBox() {
    const d = this.dialog;
    const x = 8;
    const y = GAME_H - 66;
    const w = GAME_W - 16;
    const h = 60;
    this.boxG.clear();
    this.boxG.setVisible(true);
    drawPanel(this.boxG, x, y, w, h);
    let tx = x + 10;
    if (d.faceKey) {
      this.boxFace.setTexture(`face_${d.faceKey}`).setPosition(x + 26, y + 30).setVisible(true);
      this.boxG.lineStyle(1, UI.panelEdge, 1);
      this.boxG.strokeRect(x + 5, y + 9, 42, 42);
      tx = x + 52;
    } else {
      this.boxFace.setVisible(false);
    }
    if (d.name) {
      const nw = textWidth(d.name) + 12;
      drawPanel(this.boxG, tx - 4, y - 8, nw, 16, { alpha: 1 });
      this.boxName.setText(d.name).setPosition(tx + 2, y - 4).setVisible(true);
    } else {
      this.boxName.setVisible(false);
    }
    this.boxText.setPosition(tx, y + 10).setLineSpacing(1).setText('').setVisible(true);
    this.boxArrow.setPosition(x + w - 14, y + h - 14).setVisible(false);
  }

  closeBox() {
    this.boxG.clear();
    this.boxFace.setVisible(false);
    this.boxName.setVisible(false);
    this.boxText.setVisible(false);
    this.boxArrow.setVisible(false);
  }

  updateDialog(delta) {
    const d = this.dialog;
    const page = d.pages[d.page];
    if (d.shown < page.length) {
      const before = Math.floor(d.shown);
      d.shown = Math.min(page.length, d.shown + delta * 0.05);
      const now = Math.floor(d.shown);
      if (now !== before) {
        this.boxText.setText(page.slice(0, now));
        if (now % 3 === 0 && page[now - 1] !== ' ') Audio.play(d.voice);
      }
      if (Keys.take('confirm')) {
        d.shown = page.length;
        this.boxText.setText(page);
      }
      return;
    }
    this.boxArrow.setVisible(Math.floor(this.time.now / 350) % 2 === 0);
    if (Keys.take('confirm')) {
      Audio.play('select');
      if (d.page < d.pages.length - 1) {
        d.page += 1;
        d.shown = 0;
        this.boxText.setText('');
        this.boxArrow.setVisible(false);
      } else {
        const { resolve } = d;
        this.dialog = null;
        this.closeBox();
        resolve();
      }
    }
  }

  // --------------------------------------------------------------- Choices
  choose(promptText, options) {
    Keys.flush();
    return new Promise((resolve) => {
      this.choice = { options, index: 0, resolve };
      const widest = Math.max(textWidth(promptText || ''), ...options.map(textWidth)) + 30;
      const h = options.length * 12 + (promptText ? 26 : 12);
      const x = Math.round((GAME_W - widest) / 2);
      const y = Math.max(30, GAME_H - 76 - h);
      this.choiceG.clear();
      drawPanel(this.choiceG, x, y, widest, h, { alpha: 1 });
      this.choice.items = [];
      let row = y + 7;
      if (promptText) {
        this.choiceTexts.push(txt(this, x + 8, row, promptText, UI.accent).setDepth(51));
        row += 14;
      }
      options.forEach((opt) => {
        const t = txt(this, x + 18, row, opt, UI.text).setDepth(51);
        this.choiceTexts.push(t);
        this.choice.items.push(t);
        row += 12;
      });
      this.choice.cursor = txt(this, x + 8, 0, '>', UI.accent).setDepth(51);
      this.choiceTexts.push(this.choice.cursor);
      this.placeCursor();
    });
  }

  placeCursor() {
    const c = this.choice;
    c.items.forEach((t, i) => t.setTint(i === c.index ? UI.accent : UI.text));
    c.cursor.setY(c.items[c.index].y);
  }

  updateChoice() {
    const c = this.choice;
    if (Keys.take('up')) {
      c.index = (c.index + c.options.length - 1) % c.options.length;
      Audio.play('select');
      this.placeCursor();
    }
    if (Keys.take('down')) {
      c.index = (c.index + 1) % c.options.length;
      Audio.play('select');
      this.placeCursor();
    }
    if (Keys.take('confirm')) {
      Audio.play('confirm');
      const { index, resolve } = c;
      this.choice = null;
      this.choiceG.clear();
      this.choiceTexts.forEach((t) => t.destroy());
      this.choiceTexts = [];
      resolve(index);
    }
  }

  // ----------------------------------------------------------- Screen cuts
  setBlack(on) {
    this.black.setVisible(on);
    this.black.setAlpha(1);
  }

  titleCard(text) {
    Keys.flush();
    return new Promise((resolve) => {
      const lines = wrapText(text, 400);
      const w = Math.max(...lines.map(textWidth));
      this.cardText.setText(lines.join('\n')).setPosition(Math.round((GAME_W - w) / 2), 128).setAlpha(0);
      this.tweens.add({
        targets: this.cardText, alpha: 1, duration: 800,
      });
      this.card = {
        resolve,
        ready: this.time.now + 700,
        timeout: this.time.now + 3400,
      };
    });
  }

  updateCard() {
    const c = this.card;
    const skip = this.time.now > c.ready && Keys.take('confirm');
    if (skip || this.time.now > c.timeout) {
      this.card = null;
      this.tweens.killTweensOf(this.cardText);
      this.tweens.add({
        targets: this.cardText, alpha: 0, duration: 400, onComplete: () => c.resolve(),
      });
    }
  }

  warmFlash() {
    this.tweens.add({ targets: this.warm, fillAlpha: 0.8, duration: 500, yoyo: true, hold: 300 });
  }

  update(_time, delta) {
    this.refreshHud();
    if (this.card) this.updateCard();
    else if (this.choice) this.updateChoice();
    else if (this.dialog) this.updateDialog(delta);

    if (this.hintUntil && this.time.now > this.hintUntil) this.clearHint();
    if (this.wasMuted !== undefined && this.wasMuted !== Audio.muted) this.toast(Audio.muted ? 'Sound off' : 'Sound on');
    this.wasMuted = Audio.muted;
  }
}
