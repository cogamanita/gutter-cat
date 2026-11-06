// The whole save-game lives in one plain object, so saving is a JSON.stringify.
// Functions take the state as an argument (rather than reading a global) so the
// rules can be exercised by tests without a browser.

import { ITEMS } from '../data/items.js';

export const HUNGER_MAX = 100;
export const STARVING_AT = 25;
export const WELL_FED_AT = 70;

export function newGameState() {
  return {
    version: 1,
    map: 'gutter',
    spawn: 'start',
    x: null,
    y: null,
    facing: 'down',
    stats: { level: 1, xp: 0, hp: 24, hpMax: 24, atk: 5, def: 2, agi: 6, hunger: 55 },
    inv: { crust: 1 },
    caps: 0,
    equip: { claw: null, collar: null, charm: null },
    flags: {},
    quests: { main: { stage: 0, done: false } },
    looted: {},
    killed: {},
    steps: 0,
    battlesWon: 0,
    playMs: 0,
    pendingInstincts: 0,
    status: { poison: 0 },
  };
}

/** Stats after equipment and hunger have been applied. */
export function effectiveStats(s) {
  const out = {
    atk: s.stats.atk, def: s.stats.def, agi: s.stats.agi,
    hpMax: s.stats.hpMax, crit: 4, light: 0, poisonGuard: false,
  };
  for (const id of Object.values(s.equip)) {
    if (!id) continue;
    const it = ITEMS[id];
    out.atk += it.atk || 0;
    out.def += it.def || 0;
    out.agi += it.agi || 0;
    out.crit += it.crit || 0;
    out.light += it.light || 0;
    if (it.poisonGuard) out.poisonGuard = true;
  }
  out.crit += out.agi * 0.5;
  out.starving = s.stats.hunger < STARVING_AT;
  out.wellFed = s.stats.hunger >= WELL_FED_AT;
  if (out.starving) out.atk = Math.max(1, Math.floor(out.atk * 0.8));
  if (out.wellFed) out.agi += 1;
  return out;
}

export function xpToNext(level) {
  return Math.floor(11 * Math.pow(level, 1.55));
}

export function addItem(s, id, n = 1) {
  s.inv[id] = (s.inv[id] || 0) + n;
}

export function removeItem(s, id, n = 1) {
  if (!s.inv[id]) return false;
  s.inv[id] -= n;
  if (s.inv[id] <= 0) delete s.inv[id];
  return true;
}

export function hasItem(s, id) {
  return (s.inv[id] || 0) > 0;
}

export function heal(s, amount) {
  const before = s.stats.hp;
  s.stats.hp = Math.min(effectiveStats(s).hpMax, s.stats.hp + amount);
  return s.stats.hp - before;
}

export function feed(s, amount) {
  const before = s.stats.hunger;
  s.stats.hunger = Math.max(0, Math.min(HUNGER_MAX, s.stats.hunger + amount));
  return s.stats.hunger - before;
}

/**
 * Apply a consumable's HP/hunger/cure effects (battle-only effects live in
 * systems/combat.js). Consumes the item. Returns a description for the UI.
 */
export function useConsumable(s, id, rng = Math.random) {
  const it = ITEMS[id];
  const parts = [];
  if (it.hunger) {
    const got = feed(s, it.hunger);
    parts.push(`Hunger +${got}`);
  }
  if (it.hp) {
    const got = heal(s, it.hp);
    parts.push(`HP +${got}`);
  }
  if (it.cure && s.status.poison > 0) {
    s.status.poison = 0;
    parts.push('Poison cured');
  }
  let sick = false;
  if (it.poisonRisk && rng() < it.poisonRisk && !effectiveStats(s).poisonGuard) {
    s.status.poison = Math.max(s.status.poison, 3);
    sick = true;
    parts.push('It was rotten. POISONED');
  }
  removeItem(s, id);
  return { text: parts.join(', ') || 'Nothing happens.', sick };
}

export function equipItem(s, id) {
  const it = ITEMS[id];
  const old = s.equip[it.slot];
  if (old) addItem(s, old);
  removeItem(s, id);
  s.equip[it.slot] = id;
  // Max HP is not changed by gear today, but keep HP in range regardless.
  s.stats.hp = Math.min(s.stats.hp, effectiveStats(s).hpMax);
}

export function unequipSlot(s, slot) {
  const old = s.equip[slot];
  if (!old) return;
  addItem(s, old);
  s.equip[slot] = null;
}

// --- Levels -------------------------------------------------------------

/**
 * Add XP, applying automatic level-up gains. Each level also grants one
 * "instinct" the player picks by hand (see INSTINCTS).
 */
export function gainXp(s, amount) {
  const st = s.stats;
  st.xp += amount;
  let levels = 0;
  while (st.xp >= xpToNext(st.level)) {
    st.xp -= xpToNext(st.level);
    st.level += 1;
    levels += 1;
    st.hpMax += 3;
    st.hp += 3;
    st.atk += 1;
    if (st.level % 2 === 0) st.def += 1;
    else st.agi += 1;
    s.pendingInstincts += 1;
  }
  return levels;
}

export const INSTINCTS = [
  { key: 'claws', name: 'SHARPER CLAWS', desc: 'Attack +2. Kill it before it kills you.' },
  { key: 'hide', name: 'THICKER HIDE', desc: 'Defense +2. Scar tissue is still armor.' },
  { key: 'reflex', name: 'QUICKER REFLEX', desc: 'Agility +2. Act first, dodge more, flee better.' },
  { key: 'lives', name: 'NINE LIVES', desc: 'Max HP +7, and heal 7. Refuse to die.' },
];

export function applyInstinct(s, key) {
  const st = s.stats;
  if (key === 'claws') st.atk += 2;
  if (key === 'hide') st.def += 2;
  if (key === 'reflex') st.agi += 2;
  if (key === 'lives') {
    st.hpMax += 7;
    st.hp += 7;
  }
  s.pendingInstincts = Math.max(0, s.pendingInstincts - 1);
}

// --- Quests -------------------------------------------------------------

export function questStage(s, id) {
  return s.quests[id] ? s.quests[id].stage : -1;
}

export function setQuest(s, id, stage, done = false) {
  s.quests[id] = { stage, done };
}
