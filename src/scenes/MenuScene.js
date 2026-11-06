import Phaser from 'phaser';
import { GAME_W, GAME_H, UI } from '../config.js';
import { Keys } from '../core/input.js';
import { Audio } from '../core/audio.js';
import { Session } from '../core/session.js';
import { latestSave, saveGame } from '../core/save.js';
import {
  effectiveStats, xpToNext, useConsumable, equipItem, unequipSlot, INSTINCTS, applyInstinct,
} from '../core/state.js';
import { ITEMS, SLOT_NAMES, isUsableIn } from '../data/items.js';
import { QUESTS, questText } from '../data/quests.js';
import { wrapText, textWidth } from '../art/font.js';
import { txt, drawPanel, Bar } from '../ui/widgets.js';

const TABS = ['ITEMS', 'GEAR', 'STATUS', 'JOURNAL', 'SYSTEM'];
const WX = 12;
const WY = 8;
const WW = GAME_W - 24;
const WH = GAME_H - 16;

/** The pause menu. Everything on it is rebuilt from scratch when anything changes. */
export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create(data) {
    this.nearSave = !!(data && data.nearSave);
    this.tab = 0;
    this.index = 0;
    this.subMode = null;
    this.message = '';
    this.items = [];
    this.dyn = [];
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000, 0.62).setOrigin(0);
    this.frame = this.add.graphics();
    this.add.tileSprite(0, 0, GAME_W, GAME_H, 'scanlines').setOrigin(0).setDepth(100).setAlpha(0.1);
    this.rebuild();
  }

  addT(...args) {
    const t = txt(this, ...args);
    this.dyn.push(t);
    return t;
  }

  addImg(x, y, tex, frame) {
    const i = this.add.image(x, y, tex, frame);
    this.dyn.push(i);
    return i;
  }

  rebuild() {
    this.dyn.forEach((o) => o.destroy());
    this.dyn = [];
    const f = this.frame;
    f.clear();
    drawPanel(f, WX, WY, WW, WH, { alpha: 1 });

    // Tabs
    let x = WX + 10;
    TABS.forEach((name, i) => {
      const w = textWidth(name) + 14;
      if (i === this.tab) {
        f.fillStyle(0x2c2a24, 1);
        f.fillRect(x, WY + 6, w, 14);
        f.fillStyle(UI.accent, 1);
        f.fillRect(x, WY + 19, w, 1);
      }
      this.addT(x + 7, WY + 9, name, i === this.tab ? UI.accent : UI.dim);
      x += w + 5;
    });
    f.fillStyle(UI.panelEdge, 1);
    f.fillRect(WX + 6, WY + 22, WW - 12, 1);

    [this.drawItems, this.drawGear, this.drawStatus, this.drawJournal, this.drawSystem][this.tab].call(this);

    // Footer
    f.fillStyle(UI.panelEdge, 1);
    f.fillRect(WX + 6, WY + WH - 30, WW - 12, 1);
    const lines = wrapText(this.message || this.footer || '', WW - 24);
    this.addT(WX + 10, WY + WH - 26, lines.slice(0, 2).join('\n'), this.message ? UI.accent : UI.dim).setLineSpacing(1);
  }

  // ------------------------------------------------------------------ Items
  drawItems() {
    const s = Session.state;
    const f = this.frame;
    this.list = Object.keys(s.inv).filter((id) => ITEMS[id].type !== 'equip');
    this.list.sort((a, b) => order(ITEMS[a]) - order(ITEMS[b]));
    this.index = clamp(this.index, this.list.length);
    const left = WX + 10;
    const top = WY + 28;
    const rows = 14;
    const first = Math.max(0, Math.min(this.index - 6, this.list.length - rows));
    if (!this.list.length) {
      this.addT(left, top, 'Nothing. Your bag is as empty as your stomach.', UI.dim);
    }
    this.list.slice(first, first + rows).forEach((id, i) => {
      const it = ITEMS[id];
      const y = top + i * 13;
      const sel = i + first === this.index;
      if (sel) this.addT(left, y, '>', UI.accent);
      this.addImg(left + 16, y + 4, 'icons', it.icon);
      const usable = isUsableIn(it, 'field');
      this.addT(left + 26, y, it.name, sel ? UI.accent : usable ? UI.text : UI.dim);
      if (it.type !== 'key') this.addT(left + 124, y, `x${s.inv[id]}`, UI.dim);
    });

    // Vitals beside the list, so you can see what eating will do.
    f.fillStyle(UI.panelEdge, 1);
    f.fillRect(WX + 168, WY + 26, 1, WH - 58);
    this.drawVitals(WX + 178, WY + 30);

    if (this.list.length) {
      const it = ITEMS[this.list[this.index]];
      this.footer = it.desc + (isUsableIn(it, 'field') ? '   [E] Use' : it.type === 'battle' ? '   (battle only)' : '');
    } else {
      this.footer = '';
    }
  }

  drawVitals(x, y) {
    const s = Session.state;
    const eff = effectiveStats(s);
    this.addImg(x + 4, y + 5, 'icons', 'heart');
    this.addT(x + 14, y, `HP ${s.stats.hp} / ${eff.hpMax}`);
    const hp = new Bar(this, x + 14, y + 11, 110, 7, UI.hp, { low: UI.hpLow });
    hp.set(s.stats.hp, eff.hpMax);
    this.dyn.push(hp.g);
    this.addImg(x + 4, y + 28, 'icons', 'hunger');
    this.addT(x + 14, y + 23, `HUNGER ${s.stats.hunger} / 100`);
    const hu = new Bar(this, x + 14, y + 34, 110, 7, UI.hunger, { low: UI.danger, lowAt: 0.25 });
    hu.set(s.stats.hunger, 100);
    this.dyn.push(hu.g);
    this.addT(x + 14, y + 48, `Bottlecaps: ${s.caps}`, UI.accent);
    if (s.status.poison > 0) this.addT(x + 14, y + 60, 'POISONED', UI.poison);
    if (eff.starving) this.addT(x + 80, y + 60, 'HUNGRY', UI.danger);
    const tips = wrapText('Above 50 Hunger, wounds slowly close as you walk. Below 25, your attack weakens. At 0, you start to die.', 240);
    this.addT(x, y + 80, tips.join('\n'), UI.faint).setLineSpacing(1);
  }

  useItem() {
    const s = Session.state;
    const id = this.list[this.index];
    if (!id) return;
    const it = ITEMS[id];
    if (!isUsableIn(it, 'field')) {
      Audio.play('cancel');
      this.message = it.type === 'battle' ? 'That is only useful in a fight.' : 'You cannot use that here.';
      return;
    }
    if (it.hp && !it.hunger && s.stats.hp >= effectiveStats(s).hpMax && !(it.cure && s.status.poison > 0)) {
      Audio.play('cancel');
      this.message = 'You are not hurt. Better save it.';
      return;
    }
    Audio.play(it.type === 'food' ? 'eat' : 'heal');
    const res = useConsumable(s, id);
    this.message = `${it.name}: ${res.text}.`;
  }

  // ------------------------------------------------------------------- Gear
  drawGear() {
    const s = Session.state;
    const f = this.frame;
    const left = WX + 10;
    const top = WY + 28;
    const slots = ['claw', 'collar', 'charm'];

    if (this.subMode === 'gearlist') {
      this.addT(left, top, `Equip ${SLOT_NAMES[this.gearSlot]}:`, UI.accent);
      this.list = [...Object.keys(s.inv).filter((id) => ITEMS[id].type === 'equip' && ITEMS[id].slot === this.gearSlot), '__none'];
      this.index = clamp(this.index, this.list.length);
      this.list.forEach((id, i) => {
        const y = top + 14 + i * 13;
        const sel = i === this.index;
        if (sel) this.addT(left, y, '>', UI.accent);
        if (id === '__none') {
          this.addT(left + 12, y, '(nothing)', sel ? UI.accent : UI.dim);
        } else {
          this.addImg(left + 16, y + 4, 'icons', ITEMS[id].icon);
          this.addT(left + 26, y, ITEMS[id].name, sel ? UI.accent : UI.text);
        }
      });
      const id = this.list[this.index];
      this.footer = id === '__none' ? 'Take it off.' : `${ITEMS[id].desc}   ${this.gearDelta(id)}`;
    } else {
      this.list = slots;
      this.index = clamp(this.index, 3);
      slots.forEach((slot, i) => {
        const y = top + i * 26;
        const sel = i === this.index;
        if (sel) this.addT(left, y + 2, '>', UI.accent);
        this.addT(left + 12, y, SLOT_NAMES[slot], sel ? UI.accent : UI.dim);
        const eq = s.equip[slot];
        if (eq) {
          this.addImg(left + 16, y + 16, 'icons', ITEMS[eq].icon);
          this.addT(left + 26, y + 12, ITEMS[eq].name);
        } else {
          this.addT(left + 12, y + 12, '-- empty --', UI.faint);
        }
      });
      const eq = s.equip[slots[this.index]];
      const spare = Object.keys(s.inv).filter((id) => ITEMS[id].type === 'equip' && ITEMS[id].slot === slots[this.index]).length;
      this.footer = `${eq ? ITEMS[eq].desc : 'Nothing equipped.'}${spare ? `   [E] Change (${spare} spare)` : ''}`;
    }

    f.fillStyle(UI.panelEdge, 1);
    f.fillRect(WX + 196, WY + 26, 1, WH - 58);
    this.drawStats(WX + 206, WY + 30);
  }

  gearDelta(id) {
    const s = Session.state;
    const it = ITEMS[id];
    const cur = s.equip[it.slot] ? ITEMS[s.equip[it.slot]] : {};
    const parts = [];
    for (const [k, name] of [['atk', 'ATK'], ['def', 'DEF'], ['agi', 'AGI']]) {
      const d = (it[k] || 0) - (cur[k] || 0);
      if (d) parts.push(`${name}${d > 0 ? '+' : ''}${d}`);
    }
    return parts.length ? `(${parts.join(' ')})` : '';
  }

  drawStats(x, y) {
    const eff = effectiveStats(Session.state);
    const rows = [['ATTACK', eff.atk], ['DEFENSE', eff.def], ['AGILITY', eff.agi], ['CRIT', `${Math.round(eff.crit)}%`]];
    rows.forEach(([k, v], i) => {
      this.addT(x, y + i * 13, k, UI.dim);
      this.addT(x + 70, y + i * 13, String(v), UI.text);
    });
    if (eff.starving) this.addT(x, y + 56, 'Hunger is weakening your attack.', UI.danger);
    if (eff.wellFed) this.addT(x, y + 56, 'Well fed: Agility +1.', UI.good);
  }

  // ----------------------------------------------------------------- Status
  drawStatus() {
    const s = Session.state;
    const st = s.stats;
    const left = WX + 14;
    const top = WY + 30;
    this.addImg(left + 22, top + 22, 'face_cat');
    this.addT(left + 52, top, 'THE STRAY', UI.accent);
    this.addT(left + 52, top + 13, `Level ${st.level}`);
    const need = xpToNext(st.level);
    this.addT(left + 52, top + 26, `XP ${st.xp} / ${need}`, UI.dim);
    const xp = new Bar(this, left + 52, top + 37, 110, 6, UI.xp);
    xp.set(st.xp, need);
    this.dyn.push(xp.g);
    this.drawVitals(left + 180, top);
    this.drawStats(left, top + 58);
    this.addT(left, top + 124, `Steps walked: ${s.steps}`, UI.faint);
    this.addT(left, top + 136, `Fights survived: ${s.battlesWon}`, UI.faint);
    this.addT(left, top + 148, `Time: ${formatTime(s.playMs)}`, UI.faint);
    this.footer = 'Attack strikes harder. Defense softens hits. Agility acts first, dodges, and helps you flee.';
    if (s.pendingInstincts > 0) {
      this.footer = '';
      this.list = INSTINCTS;
      this.index = clamp(this.index, INSTINCTS.length);
      const x = left + 150;
      this.addT(x, top + 112, 'A NEW INSTINCT:', UI.accent);
      INSTINCTS.forEach((ins, i) => {
        const sel = i === this.index;
        if (sel) this.addT(x, top + 124 + i * 11, '>', UI.accent);
        this.addT(x + 10, top + 124 + i * 11, ins.name, sel ? UI.accent : UI.text);
      });
      this.footer = INSTINCTS[this.index].desc;
    } else {
      this.list = [];
    }
  }

  // ---------------------------------------------------------------- Journal
  drawJournal() {
    const s = Session.state;
    let y = WY + 30;
    const left = WX + 12;
    this.list = [];
    for (const [id, q] of Object.entries(QUESTS)) {
      const st = s.quests[id];
      if (!st) continue;
      this.addT(left, y, `${st.done ? '[x]' : '[ ]'} ${q.name}`, st.done ? UI.good : id === 'main' ? UI.accent : UI.text);
      y += 12;
      const lines = wrapText(questText(id, st.stage), WW - 40);
      this.addT(left + 16, y, lines.join('\n'), UI.dim).setLineSpacing(1);
      y += lines.length * 11 + 8;
    }
    this.footer = 'The main objective is also shown at the top of the screen.';
  }

  // ----------------------------------------------------------------- System
  systemOptions() {
    return [
      { key: 'save', label: this.nearSave ? 'Save progress' : 'Save (only beside a dry box)', dim: !this.nearSave },
      { key: 'load', label: 'Load last save', dim: !latestSave() },
      { key: 'sound', label: `Sound: ${Audio.muted ? 'OFF' : 'ON'}  (M key)` },
      { key: 'controls', label: 'Controls' },
      { key: 'quit', label: 'Quit to title' },
    ];
  }

  drawSystem() {
    const left = WX + 14;
    const top = WY + 32;
    if (this.subMode === 'quit') {
      this.addT(left, top, 'Quit to the title screen? Unsaved progress is lost.', UI.danger);
      this.list = ['Stay', 'Quit'];
      this.index = clamp(this.index, 2);
      this.list.forEach((l, i) => {
        const sel = i === this.index;
        if (sel) this.addT(left, top + 18 + i * 14, '>', UI.accent);
        this.addT(left + 12, top + 18 + i * 14, l, sel ? UI.accent : UI.text);
      });
      this.footer = '';
      return;
    }
    if (this.subMode === 'controls') {
      this.list = [];
      const rows = [
        ['WASD / ARROWS', 'Move, and choose in menus'],
        ['E / SPACE / ENTER', 'Interact, confirm, skip text'],
        ['ESC / TAB / I', 'Open and close this menu'],
        ['X / Q / BACKSPACE', 'Go back in menus'],
        ['M', 'Mute sound'],
      ];
      rows.forEach(([k, v], i) => {
        this.addT(left, top + i * 15, k, UI.accent);
        this.addT(left + 130, top + i * 15, v);
      });
      this.footer = 'Press X to go back.';
      return;
    }
    this.list = this.systemOptions();
    this.index = clamp(this.index, this.list.length);
    this.list.forEach((o, i) => {
      const sel = i === this.index;
      if (sel) this.addT(left, top + i * 16, '>', UI.accent);
      this.addT(left + 12, top + i * 16, o.label, o.dim ? UI.faint : sel ? UI.accent : UI.text);
    });
    this.footer = 'Your game also saves itself when you change areas and after big events.';
  }

  doSystem() {
    if (this.subMode === 'quit') {
      if (this.index === 1) {
        this.toTitle();
      } else {
        this.subMode = null;
        this.index = 0;
      }
      return;
    }
    if (this.subMode === 'controls') return;
    const o = this.list[this.index];
    switch (o.key) {
      case 'save':
        if (!this.nearSave) {
          Audio.play('cancel');
          this.message = 'Find a dry cardboard box to save. The game also saves when you change areas.';
        } else {
          saveGame(Session.state, 'manual');
          Audio.play('save');
          this.message = 'Progress saved.';
        }
        break;
      case 'load': {
        const save = latestSave();
        if (!save) {
          Audio.play('cancel');
          this.message = 'There is nothing to load.';
          break;
        }
        Audio.setHeartbeat(false);
        Session.state = save.state;
        this.scene.stop('UI');
        this.scene.stop('World');
        this.scene.start('World');
        break;
      }
      case 'sound':
        Audio.toggleMute();
        break;
      case 'controls':
        this.subMode = 'controls';
        break;
      case 'quit':
        this.subMode = 'quit';
        this.index = 0;
        break;
      default:
    }
  }

  toTitle() {
    Audio.setHeartbeat(false);
    this.scene.stop('UI');
    this.scene.stop('World');
    this.scene.start('Title');
  }

  // ------------------------------------------------------------------ Input
  close() {
    Audio.play('cancel');
    Keys.flush();
    this.scene.stop();
    this.scene.resume('World');
  }

  update() {
    let dirty = false;
    const n = this.list ? this.list.length : 0;
    const startMessage = this.message;

    if (Keys.take('menu')) {
      this.close();
      return;
    }
    if (Keys.take('cancel')) {
      if (this.subMode) {
        Audio.play('cancel');
        this.subMode = null;
        this.index = 0;
        dirty = true;
      } else {
        this.close();
        return;
      }
    }
    if (!this.subMode) {
      if (Keys.take('left')) {
        this.tab = (this.tab + TABS.length - 1) % TABS.length;
        this.index = 0;
        this.message = '';
        Audio.play('select');
        dirty = true;
      }
      if (Keys.take('right')) {
        this.tab = (this.tab + 1) % TABS.length;
        this.index = 0;
        this.message = '';
        Audio.play('select');
        dirty = true;
      }
    }
    if (n) {
      if (Keys.take('up')) {
        this.index = (this.index + n - 1) % n;
        this.message = '';
        Audio.play('select');
        dirty = true;
      }
      if (Keys.take('down')) {
        this.index = (this.index + 1) % n;
        this.message = '';
        Audio.play('select');
        dirty = true;
      }
    }
    if (Keys.take('confirm')) {
      dirty = true;
      this.message = '';
      const s = Session.state;
      if (this.tab === 0) {
        this.useItem();
      } else if (this.tab === 1) {
        if (this.subMode === 'gearlist') {
          const id = this.list[this.index];
          if (id === '__none') unequipSlot(s, this.gearSlot);
          else equipItem(s, id);
          Audio.play('confirm');
          this.subMode = null;
          this.index = ['claw', 'collar', 'charm'].indexOf(this.gearSlot);
        } else {
          this.gearSlot = this.list[this.index];
          this.subMode = 'gearlist';
          this.index = 0;
          Audio.play('select');
        }
      } else if (this.tab === 2 && s.pendingInstincts > 0) {
        applyInstinct(s, INSTINCTS[this.index].key);
        Audio.play('levelup');
        this.index = 0;
      } else if (this.tab === 4) {
        Audio.play('select');
        this.doSystem();
        if (!this.scene.isActive()) return;
      }
    }
    if (dirty || this.message !== startMessage) this.rebuild();
  }
}

const clamp = (i, n) => (n <= 0 ? 0 : Math.max(0, Math.min(n - 1, i)));

function order(it) {
  return { food: 0, med: 1, battle: 2, key: 3 }[it.type] ?? 4;
}

export function formatTime(ms) {
  const m = Math.floor(ms / 60000);
  const h = Math.floor(m / 60);
  return h ? `${h}h ${m % 60}m` : `${m}m ${Math.floor(ms / 1000) % 60}s`;
}
