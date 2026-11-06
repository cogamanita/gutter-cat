// Turn-based combat rules. No Phaser in here: a Battle takes commands and returns
// a list of events, which BattleScene plays back as animation. The same class
// runs in the headless balance tests.

import { ENEMIES } from '../data/enemies.js';
import { ITEMS } from '../data/items.js';
import {
  effectiveStats, removeItem, addItem, useConsumable, gainXp,
} from '../core/state.js';

export const DEFEND_FACTOR = 0.45;
export const POUNCE_BONUS = 1.4;
export const EXPOSED_BONUS = 1.5;
const MAX_ENEMIES = 3;

/** Core damage curve: defense matters a lot at parity, less when outclassed. */
export function baseDamage(atk, def, power, rng) {
  const variance = 0.85 + rng() * 0.3;
  return Math.max(1, Math.round(((atk * atk) / (atk + def)) * power * variance));
}

export class Battle {
  constructor(state, group, opts = {}) {
    this.s = state;
    this.rng = opts.rng || Math.random;
    this.opts = opts;
    this.enemies = [];
    this.extraXp = 0;
    group.forEach((id) => this.addEnemy(id));
    this.isBoss = this.enemies.some((e) => e.boss);
    this.canEscape = !this.isBoss && !opts.noEscape;
    this.round = 0;
    this.escapeFails = 0;
    this.status = {
      poison: state.status.poison || 0,
      stun: 0, atkBuff: 1, atkBuffTurns: 0, pounce: false, defending: false,
    };
    this.result = null;
    this.stolen = [];
    this.fleeing = 0;
    this._announce = [];
  }

  addEnemy(id, spawned = false) {
    const d = ENEMIES[id];
    const e = {
      id,
      name: d.name,
      data: d,
      hp: d.hp,
      maxHp: d.hp,
      atk: d.atk,
      def: d.def,
      agi: d.agi,
      boss: !!d.boss,
      alive: true,
      exposed: false,
      blind: 0,
      buff: 1,
      mem: {},
      intent: null,
      label: null,
      slot: -1,
      spawned,
    };
    // Reuse a dead slot so the formation on screen stays stable.
    const free = this.enemies.findIndex((x) => !x.alive);
    if (free >= 0 && spawned) {
      if (this.enemies[free].killed) this.extraXp += this.enemies[free].data.xp;
      e.slot = free;
      this.enemies[free] = e;
    } else {
      e.slot = this.enemies.length;
      this.enemies.push(e);
    }
    return e;
  }

  get living() {
    return this.enemies.filter((e) => e.alive);
  }

  playerHasFood() {
    return Object.keys(this.s.inv).some((id) => ITEMS[id].type === 'food');
  }

  announce(text) {
    this._announce.push(text);
  }

  stats() {
    const st = effectiveStats(this.s);
    st.atk = Math.max(1, Math.round(st.atk * this.status.atkBuff));
    return st;
  }

  /** Enemies decide what they will do; heavy moves are shown to the player. */
  startRound() {
    this.round += 1;
    this.status.defending = false;
    const events = [];
    for (const e of this.living) {
      e.label = null;
      const key = e.data.ai(e, this);
      e.intent = key;
      const mv = e.data.moves[key];
      if (mv.label) e.label = mv.label;
      for (const text of this._announce) events.push({ t: 'msg', text });
      this._announce = [];
      if (mv.windup) {
        events.push({ t: 'msg', text: this.fmt(mv.windup, e) });
        events.push({ t: 'telegraph', slot: e.slot, label: mv.label });
      }
    }
    events.push({ t: 'intents' });
    return events;
  }

  fmt(text, e) {
    const name = e.name.startsWith('The ') || e.boss || e.name === 'Grease' ? e.name : `the ${e.name.toLowerCase()}`;
    const out = text.replace('{e}', name);
    return out.charAt(0).toUpperCase() + out.slice(1);
  }

  /**
   * Resolve a full round.
   * action: {type:'attack',slot} | {type:'defend'} | {type:'item',id,slot?} |
   *         {type:'escape'} | {type:'stunned'}
   */
  resolve(action) {
    const ev = [];
    const pst = this.stats();

    // Bracing is a reflex: it always happens before anyone moves.
    if (action.type === 'defend') {
      this.status.defending = true;
      this.status.pounce = true;
      ev.push({ t: 'defend' });
      ev.push({ t: 'msg', text: 'You flatten your ears and brace. Your next strike will land harder.' });
    }
    if (action.type === 'stunned') {
      this.status.stun = Math.max(0, this.status.stun - 1);
      ev.push({ t: 'msg', text: 'You thrash against the net and cannot act!' });
    }

    const order = [
      ...this.living.map((e) => ({ who: e, agi: e.agi + this.rng() * 2 })),
      { who: 'player', agi: pst.agi + this.rng() * 2 },
    ].sort((a, b) => b.agi - a.agi);

    for (const turn of order) {
      if (this.result) break;
      if (turn.who === 'player') {
        if (action.type === 'attack') this.playerAttack(action.slot, ev);
        if (action.type === 'item') this.playerItem(action, ev);
        if (action.type === 'escape') this.playerEscape(ev);
      } else if (turn.who.alive) {
        this.enemyAct(turn.who, ev);
      }
      this.checkEnd(ev);
    }

    if (!this.result) this.endOfRound(ev);
    this.checkEnd(ev);
    this.s.status.poison = this.status.poison;
    return ev;
  }

  // ---------------------------------------------------------------- Player
  playerAttack(slot, ev) {
    let target = this.enemies[slot];
    if (!target || !target.alive) target = this.living[0];
    if (!target) return;
    const st = this.stats();

    // Agility gap gives the target a small chance to slip away.
    const dodge = Math.min(0.25, 0.03 + Math.max(0, target.agi - st.agi) * 0.025);
    ev.push({ t: 'playerLunge', slot: target.slot });
    if (this.rng() < dodge) {
      ev.push({ t: 'sfx', name: 'miss' });
      ev.push({ t: 'miss', slot: target.slot });
      ev.push({ t: 'msg', text: `${this.fmt('{e}', target)} twists away from your claws.` });
      this.status.pounce = false;
      return;
    }
    let power = 1;
    if (this.status.pounce) power *= POUNCE_BONUS;
    if (target.exposed) power *= EXPOSED_BONUS;
    const crit = this.rng() * 100 < st.crit;
    if (crit) power *= 1.7;
    const dmg = baseDamage(st.atk, target.def, power, this.rng);
    const wasPounce = this.status.pounce;
    const wasExposed = target.exposed;
    this.status.pounce = false;
    target.exposed = false;
    target.hp -= dmg;
    ev.push({ t: 'sfx', name: crit ? 'crit' : 'claw' });
    ev.push({ t: 'hitEnemy', slot: target.slot, dmg, crit });
    let text = `You rake ${this.fmt('{e}', target).replace(/^The /, 'the ')} for ${dmg}.`;
    if (crit) text = `A savage strike! ${dmg} damage.`;
    else if (wasPounce) text = `You pounce from your crouch! ${dmg} damage.`;
    else if (wasExposed) text = `You catch it wide open! ${dmg} damage.`;
    ev.push({ t: 'msg', text });
    if (target.hp <= 0) this.killEnemy(target, ev);
  }

  playerItem(action, ev) {
    const it = ITEMS[action.id];
    ev.push({ t: 'sfx', name: it.type === 'food' ? 'eat' : 'heal' });
    if (it.type === 'battle') {
      removeItem(this.s, action.id);
      if (it.atkBuff) {
        this.status.atkBuff = it.atkBuff;
        this.status.atkBuffTurns = it.turns + 1;
        ev.push({ t: 'buff' });
        ev.push({ t: 'msg', text: 'Catnip floods your skull. Everything looks like prey.' });
      }
      if (it.damageAll) {
        ev.push({ t: 'sfx', name: 'explode' });
        ev.push({ t: 'flash' });
        ev.push({ t: 'msg', text: `The ${it.name.toLowerCase()} goes off in their faces!` });
        for (const e of this.living) {
          if (!e.alive) continue;
          e.hp -= it.damageAll;
          ev.push({ t: 'hitEnemy', slot: e.slot, dmg: it.damageAll });
          if (e.hp <= 0) this.killEnemy(e, ev);
        }
      }
      if (it.blind) {
        ev.push({ t: 'flash' });
        ev.push({ t: 'msg', text: 'The flare spits red light. They cannot see you!' });
        for (const e of this.living) e.blind = it.blind + 1;
      }
    } else {
      this.s.status.poison = this.status.poison;
      const res = useConsumable(this.s, action.id, this.rng);
      this.status.poison = this.s.status.poison;
      ev.push({ t: 'playerHealed' });
      ev.push({ t: 'msg', text: `${it.name}: ${res.text}.` });
    }
  }

  playerEscape(ev) {
    if (!this.canEscape) {
      ev.push({ t: 'msg', text: 'There is nowhere to run!' });
      return;
    }
    const st = this.stats();
    const fastest = Math.max(...this.living.map((e) => e.agi));
    const chance = Math.max(0.15, Math.min(0.95, 0.55 + (st.agi - fastest) * 0.06 + this.escapeFails * 0.15));
    if (this.rng() < chance) {
      ev.push({ t: 'sfx', name: 'whoosh' });
      ev.push({ t: 'msg', text: 'You bolt for the shadows!' });
      this.result = 'escape';
      ev.push({ t: 'end', result: 'escape' });
    } else {
      this.escapeFails += 1;
      ev.push({ t: 'sfx', name: 'miss' });
      ev.push({ t: 'msg', text: 'You scramble, but they cut you off!' });
    }
  }

  // ----------------------------------------------------------------- Enemy
  enemyAct(e, ev) {
    const key = e.intent || 'none';
    const mv = e.data.moves[key];
    if (!mv) return;
    e.mem.last = key;
    e.label = null;

    if (mv.flee) {
      e.alive = false;
      e.fled = true;
      ev.push({ t: 'msg', text: this.fmt(mv.text, e) });
      ev.push({ t: 'fleeEnemy', slot: e.slot });
      return;
    }
    if (mv.selfExpose) {
      e.exposed = true;
      ev.push({ t: 'sfx', name: mv.sfx });
      ev.push({ t: 'msg', text: this.fmt(mv.text, e) });
      ev.push({ t: 'exposed', slot: e.slot });
      return;
    }
    if (mv.summon) {
      ev.push({ t: 'sfx', name: mv.sfx });
      if (this.living.length >= MAX_ENEMIES) {
        ev.push({ t: 'msg', text: `${this.fmt('{e}', e)} calls, but nothing more can fit.` });
        return;
      }
      const n = this.addEnemy(mv.summon, true);
      ev.push({ t: 'msg', text: this.fmt(mv.text, e) });
      ev.push({ t: 'spawn', slot: n.slot });
      return;
    }
    if (mv.buffSelf) {
      e.buff *= mv.buffSelf;
      ev.push({ t: 'sfx', name: mv.sfx });
      ev.push({ t: 'enemyBuff', slot: e.slot });
      ev.push({ t: 'msg', text: this.fmt(mv.text, e) });
      return;
    }
    if (mv.devour) {
      const prey = this.living.find((x) => x.id === mv.devour);
      if (!prey) {
        ev.push({ t: 'msg', text: `${this.fmt('{e}', e)} gropes for her brood. It is all dead.` });
        return;
      }
      prey.alive = false;
      prey.devoured = true;
      const healed = Math.min(mv.healAmount, e.maxHp - e.hp);
      e.hp += healed;
      ev.push({ t: 'sfx', name: mv.sfx });
      ev.push({ t: 'deathEnemy', slot: prey.slot, quiet: true });
      ev.push({ t: 'healEnemy', slot: e.slot, amount: healed });
      ev.push({ t: 'msg', text: this.fmt(mv.text, e) });
      return;
    }
    if (mv.steal) {
      ev.push({ t: 'enemyLunge', slot: e.slot, anim: 'lunge' });
      if (this.status.defending) {
        ev.push({ t: 'sfx', name: 'miss' });
        ev.push({ t: 'msg', text: `You keep your food pinned under you. ${this.fmt('{e}', e)} gets nothing.` });
        return;
      }
      const foods = Object.keys(this.s.inv).filter((id) => ITEMS[id].type === 'food');
      if (!foods.length) {
        ev.push({ t: 'msg', text: `${this.fmt('{e}', e)} grabs at nothing.` });
        return;
      }
      const id = foods[Math.floor(this.rng() * foods.length)];
      removeItem(this.s, id);
      e.mem.stolen = id;
      ev.push({ t: 'sfx', name: mv.sfx });
      ev.push({ t: 'msg', text: `${this.fmt('{e}', e)} snatches your ${ITEMS[id].name}! Stop him before he runs!` });
      return;
    }

    // --- Direct attacks -------------------------------------------------
    const pst = this.stats();
    const hits = mv.hits || 1;
    ev.push({ t: 'msg', text: this.fmt(mv.text, e) });
    ev.push({ t: 'enemyLunge', slot: e.slot, anim: mv.anim || 'lunge' });
    if (mv.sfx) ev.push({ t: 'sfx', name: mv.sfx });

    let atk = e.atk * e.buff;
    if (e.data.passive === 'pack') {
      const pack = this.living.filter((x) => x !== e).length;
      atk *= 1 + pack * 0.2;
    }

    // The net is the one attack that bracing avoids outright, and it punishes him.
    if (mv.net && this.status.defending) {
      e.exposed = true;
      ev.push({ t: 'msg', text: 'You slip the net! He stumbles after it, wide open!' });
      ev.push({ t: 'exposed', slot: e.slot });
      return;
    }

    for (let i = 0; i < hits; i += 1) {
      const blinded = e.blind > 0;
      const dodgeChance = Math.min(0.3, 0.03 + Math.max(0, pst.agi - e.agi) * 0.022);
      const accuracy = (mv.acc ?? 0.95) * (blinded ? 0.25 : 1);
      if (this.rng() > accuracy || (!mv.selfDestruct && this.rng() < dodgeChance)) {
        ev.push({ t: 'playerDodge' });
        ev.push({ t: 'sfx', name: 'miss' });
        ev.push({ t: 'msg', text: blinded ? 'It swings blind, and misses.' : 'You twist aside!' });
        continue;
      }
      let dmg = baseDamage(atk, pst.def, mv.power ?? 1, this.rng);
      if (this.status.defending) dmg = Math.max(1, Math.round(dmg * DEFEND_FACTOR));
      this.s.stats.hp -= dmg;
      ev.push({ t: 'hitPlayer', dmg, heavy: (mv.power || 1) >= 1.5, blocked: this.status.defending });
      if (mv.poison && this.rng() < mv.poison.chance) {
        if (pst.poisonGuard && this.rng() < 0.75) {
          ev.push({ t: 'msg', text: 'The rubber coat turns the filth aside.' });
        } else {
          const was = this.status.poison;
          this.status.poison = Math.max(this.status.poison, mv.poison.turns);
          ev.push({ t: 'statusPlayer', status: 'poison' });
          if (!was) ev.push({ t: 'msg', text: 'You are poisoned!' });
        }
      }
      if (mv.net) {
        this.status.stun = 1;
        ev.push({ t: 'statusPlayer', status: 'net' });
        ev.push({ t: 'msg', text: 'The net drags you down! You will lose a turn.' });
      }
      if (this.s.stats.hp <= 0) break;
    }

    if (mv.selfDestruct) {
      e.hp = 0;
      e.alive = false;
      e.burst = true;
      ev.push({ t: 'deathEnemy', slot: e.slot });
    }
  }

  killEnemy(e, ev) {
    e.alive = false;
    e.killed = true;
    ev.push({ t: 'deathEnemy', slot: e.slot });
    ev.push({ t: 'sfx', name: e.boss ? 'bossDie' : (e.data.cry === 'bark' ? 'whine' : 'die') });
    ev.push({ t: 'msg', text: `${this.fmt('{e}', e)} ${e.data.human ? 'collapses and does not get up.' : 'goes still.'}` });
    if (e.mem.stolen) {
      addItem(this.s, e.mem.stolen);
      ev.push({ t: 'msg', text: `You drag your ${ITEMS[e.mem.stolen].name} back.` });
    }
    // When a boss goes down its summons scatter.
    if (e.boss) {
      for (const o of this.living) {
        o.alive = false;
        o.fled = true;
        ev.push({ t: 'fleeEnemy', slot: o.slot });
      }
    }
  }

  // ----------------------------------------------------------------- Round
  endOfRound(ev) {
    const st = this.status;
    if (st.poison > 0) {
      const dmg = Math.max(1, Math.round(effectiveStats(this.s).hpMax * 0.05));
      this.s.stats.hp -= dmg;
      st.poison -= 1;
      ev.push({ t: 'sfx', name: 'poison' });
      ev.push({ t: 'hitPlayer', dmg, poison: true });
      ev.push({ t: 'msg', text: `The poison burns. ${dmg} damage.` });
    }
    if (st.atkBuffTurns > 0) {
      st.atkBuffTurns -= 1;
      if (st.atkBuffTurns === 0) {
        st.atkBuff = 1;
        ev.push({ t: 'msg', text: 'The catnip wears off.' });
      }
    }
    for (const e of this.living) if (e.blind > 0) e.blind -= 1;
  }

  checkEnd(ev) {
    if (this.result) return;
    if (this.s.stats.hp <= 0) {
      this.s.stats.hp = 0;
      this.result = 'lose';
      ev.push({ t: 'end', result: 'lose' });
    } else if (this.living.length === 0) {
      this.result = 'win';
      ev.push({ t: 'end', result: 'win' });
    }
  }

  // --------------------------------------------------------------- Rewards
  /** Grants XP, caps and loot. Call once, after a win. */
  grantRewards() {
    const r = { xp: 0, caps: 0, items: [], levels: 0 };
    for (const e of this.enemies) {
      if (!(e.killed || e.burst)) continue;
      r.xp += e.data.xp;
      const [lo, hi] = e.data.caps;
      r.caps += lo + Math.floor(this.rng() * (hi - lo + 1));
      for (const [id, chance] of e.data.drops) {
        if (this.rng() < chance) {
          // Key items and gear are never duplicated.
          const it = ITEMS[id];
          const owned = (this.s.inv[id] || 0) > 0 || Object.values(this.s.equip).includes(id);
          if ((it.type === 'key' || it.type === 'equip') && owned) continue;
          addItem(this.s, id);
          r.items.push(id);
        }
      }
    }
    // Slots replaced by a summon lose their corpse, so count those kills too.
    r.xp += this.extraXp || 0;
    this.s.caps += r.caps;
    r.levels = gainXp(this.s, r.xp);
    this.s.battlesWon += 1;
    this.s.stats.hunger = Math.max(0, this.s.stats.hunger - 2);
    return r;
  }
}
