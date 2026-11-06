// Rules tests plus a balance simulation. The simulated player follows the advice
// the game gives (defend on telegraphs, heal when low, focus summons); the win
// rates below are what keep the difficulty honest as numbers change.

import test from 'node:test';
import assert from 'node:assert/strict';
import { Battle, baseDamage } from '../src/systems/combat.js';
import { ENEMIES } from '../src/data/enemies.js';
import { ITEMS } from '../src/data/items.js';
import {
  newGameState, gainXp, xpToNext, effectiveStats, applyInstinct, useConsumable, equipItem,
  feed, addItem,
} from '../src/core/state.js';

function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A cat of a given level, built the way a typical player would. */
function cat(level, gear = [], items = {}) {
  const s = newGameState();
  s.stats.hunger = 80;
  while (s.stats.level < level) gainXp(s, xpToNext(s.stats.level));
  const picks = ['claws', 'hide', 'lives', 'reflex'];
  let i = 0;
  while (s.pendingInstincts > 0) {
    applyInstinct(s, picks[i % picks.length]);
    i += 1;
  }
  s.stats.hp = effectiveStats(s).hpMax;
  for (const g of gear) {
    addItem(s, g);
    equipItem(s, g);
  }
  s.inv = { ...items };
  return s;
}

/** A sensible human-like policy. */
function play(state, group, rng, maxRounds = 200) {
  const b = new Battle(state, group, { rng });
  let rounds = 0;
  while (!b.result && rounds < maxRounds) {
    rounds += 1;
    b.startRound();
    if (b.status.stun > 0) {
      b.resolve({ type: 'stunned' });
      continue;
    }
    const hpMax = effectiveStats(state).hpMax;
    const ratio = state.stats.hp / hpMax;
    // Only brace for telegraphs that actually hurt: birthing or calling for help does not.
    const danger = b.living.some((e) => {
      const mv = e.data.moves[e.intent];
      return mv && mv.windup && (mv.power || mv.steal);
    });
    const heals = Object.keys(state.inv).filter((id) => ITEMS[id].hp && ITEMS[id].type !== 'battle');
    if (ratio < 0.4 && heals.length) {
      heals.sort((x, y) => ITEMS[y].hp - ITEMS[x].hp);
      b.resolve({ type: 'item', id: heals[0] });
    } else if (danger && ratio < 0.85 && !b.status.pounce) {
      b.resolve({ type: 'defend' });
    } else {
      // Thin the weakest first, as the game advises.
      const living = [...b.living].sort((x, y) => x.hp - y.hp);
      b.resolve({ type: 'attack', slot: living[0].slot });
    }
  }
  return { result: b.result, rounds, b };
}

function winRate(makeState, group, n = 300) {
  let wins = 0;
  let hpLeft = 0;
  let rounds = 0;
  for (let i = 0; i < n; i += 1) {
    const s = makeState();
    const r = play(s, group, seeded(i * 7919 + 13));
    if (r.result === 'win') {
      wins += 1;
      hpLeft += s.stats.hp / effectiveStats(s).hpMax;
    }
    rounds += r.rounds;
  }
  return { rate: wins / n, avgHpLeft: wins ? hpLeft / wins : 0, avgRounds: rounds / n };
}

// -------------------------------------------------------------------- Rules
test('damage is always at least 1 and rises with attack', () => {
  const rng = () => 0.5;
  assert.ok(baseDamage(1, 50, 0.1, rng) >= 1);
  assert.ok(baseDamage(10, 3, 1, rng) > baseDamage(5, 3, 1, rng));
});

test('defending softens a telegraphed hit', () => {
  const hit = () => {
    const s = cat(4);
    const b = new Battle(s, ['dog'], { rng: () => 0.5 });
    b.enemies[0].intent = 'maul';
    b.status.defending = false;
    const before = s.stats.hp;
    b.round = 1;
    b.resolve({ type: 'defend' });
    return before - s.stats.hp;
  };
  const plain = (() => {
    const s = cat(4, [], { crust: 1 });
    const b = new Battle(s, ['dog'], { rng: () => 0.5 });
    b.enemies[0].intent = 'maul';
    const before = s.stats.hp;
    b.resolve({ type: 'item', id: 'crust' });
    return before - s.stats.hp;
  })();
  assert.ok(hit() < plain * 0.6, `defend ${hit()} vs plain ${plain}`);
});

test('bracing against the Catcher\'s net avoids it and exposes him', () => {
  const s = cat(6);
  const b = new Battle(s, ['catcher'], { rng: () => 0.5 });
  b.enemies[0].intent = 'net';
  const before = s.stats.hp;
  b.resolve({ type: 'defend' });
  assert.equal(s.stats.hp, before);
  assert.equal(b.status.stun, 0);
  assert.ok(b.enemies[0].exposed);
});

test('taking the net costs you a turn', () => {
  const s = cat(6, [], { crust: 1 });
  const b = new Battle(s, ['catcher'], { rng: () => 0.5 });
  b.enemies[0].intent = 'net';
  b.resolve({ type: 'item', id: 'crust' });
  assert.equal(b.status.stun, 1);
});

test('bosses cannot be escaped', () => {
  const s = cat(6);
  const b = new Battle(s, ['grease'], {});
  assert.equal(b.canEscape, false);
});

test('escape chance grows with failures and eventually works', () => {
  const s = cat(1);
  const b = new Battle(s, ['dog'], { rng: seeded(5) });
  let tries = 0;
  s.stats.hp = 100000;
  s.stats.hpMax = 100000;
  while (!b.result && tries < 50) {
    b.startRound();
    b.resolve({ type: 'escape' });
    tries += 1;
  }
  assert.equal(b.result, 'escape');
});

test('Mother Gnaw heals only by eating living brood', () => {
  const s = cat(10);
  const b = new Battle(s, ['mother', 'brood'], { rng: () => 0.5 });
  const mother = b.enemies[0];
  mother.hp = 50;
  mother.intent = 'devour';
  b.enemies[1].intent = 'nip';
  b.resolve({ type: 'defend' });
  assert.ok(mother.hp > 50, 'she should have healed');
  assert.equal(b.enemies[1].alive, false);
  const hp = mother.hp;
  mother.intent = 'devour';
  b.resolve({ type: 'defend' });
  assert.equal(mother.hp, hp, 'no brood, no healing');
});

test('killing a boss ends the fight even with summons alive', () => {
  const s = cat(10);
  const b = new Battle(s, ['rat', 'grease'], { rng: () => 0.5 });
  b.enemies[1].hp = 1;
  b.startRound();
  b.resolve({ type: 'attack', slot: 1 });
  assert.equal(b.result, 'win');
});

test('a stolen item comes back if the thief dies first', () => {
  const s = cat(6, [], { crust: 1 });
  const b = new Battle(s, ['knife'], { rng: () => 0.5 });
  const kid = b.enemies[0];
  kid.intent = 'steal';
  b.status.pounce = false;
  // Kid is faster, so he steals before we swing; then the swing kills him.
  kid.hp = 1;
  b.resolve({ type: 'attack', slot: 0 });
  assert.equal(s.inv.crust, 1);
});

test('summoned enemies replacing corpses still pay out XP', () => {
  const s = cat(3);
  const b = new Battle(s, ['rat', 'grease'], { rng: () => 0.5 });
  const rat = b.enemies[0];
  rat.alive = false;
  rat.killed = true;
  b.addEnemy('rat', true);
  assert.equal(b.extraXp, ENEMIES.rat.xp);
});

test('hunger weakens the cat and well-fed helps', () => {
  const s = cat(3);
  s.stats.hunger = 10;
  const weak = effectiveStats(s);
  feed(s, 80);
  const strong = effectiveStats(s);
  assert.ok(weak.atk < strong.atk);
  assert.ok(strong.agi > weak.agi);
});

test('rotten food can poison you unless you are protected', () => {
  const s = cat(3, [], { rat_meat: 1 });
  useConsumable(s, 'rat_meat', () => 0);
  assert.ok(s.status.poison > 0);
  const t = cat(3, ['rubber'], { rat_meat: 1 });
  useConsumable(t, 'rat_meat', () => 0);
  assert.equal(t.status.poison, 0);
});

test('equipping swaps gear back into the bag', () => {
  const s = cat(1);
  addItem(s, 'nail');
  equipItem(s, 'nail');
  assert.equal(s.equip.claw, 'nail');
  assert.equal(s.inv.nail, undefined);
  addItem(s, 'razor');
  equipItem(s, 'razor');
  assert.equal(s.equip.claw, 'razor');
  assert.equal(s.inv.nail, 1);
});

test('every enemy has a working AI', () => {
  for (const id of Object.keys(ENEMIES)) {
    for (let seed = 0; seed < 30; seed += 1) {
      const s = cat(8);
      const b = new Battle(s, [id], { rng: seeded(seed) });
      for (let r = 0; r < 12 && !b.result; r += 1) {
        b.startRound();
        const e = b.living[0];
        if (e) assert.ok(e.data.moves[e.intent], `${id} chose unknown move ${e.intent}`);
        b.resolve({ type: 'defend' });
      }
    }
  }
});

// ------------------------------------------------------------------- Balance
const GEAR = {
  // Roughly what a player has on arrival at each fight.
  early: { lvl: 1, gear: [], items: { crust: 2 } },
  gutter: { lvl: 2, gear: ['nail', 'burlap'], items: { rag: 1, crust: 2 } },
  grease: { lvl: 3, gear: ['nail', 'burlap', 'mouse_skull'], items: { rag: 1, fish_head: 1 } },
  district: { lvl: 4, gear: ['nail', 'leather', 'mouse_skull'], items: { rag: 1, fish_head: 1 } },
  catcher: { lvl: 6, gear: ['razor', 'leather', 'capcharm'], items: { rag: 3, salve: 1, bandage: 1, firecracker: 1 } },
  sewer: { lvl: 7, gear: ['razor', 'studded', 'capcharm'], items: { rag: 2, salve: 2, fish_head: 1 } },
  mother: { lvl: 8, gear: ['razor', 'rubber', 'capcharm'], items: { rag: 3, salve: 2, bandage: 2, tuna: 1, firecracker: 1 } },
};
const at = (k) => () => cat(GEAR[k].lvl, GEAR[k].gear, GEAR[k].items);
const report = (name, r) => console.log(
  `  ${name.padEnd(30)} win ${(r.rate * 100).toFixed(0).padStart(3)}%   hp left ${(r.avgHpLeft * 100).toFixed(0).padStart(3)}%   ${r.avgRounds.toFixed(1)} rounds`,
);

const CASES = [
  // name, fixture, group, min win, max win
  ['one rat, fresh start', 'early', ['rat'], 0.9, 1],
  ['two rats, fresh start', 'early', ['rat', 'rat'], 0.45, 1],
  ['three rats, geared', 'gutter', ['rat', 'rat', 'rat'], 0.6, 1],
  ['Grease', 'grease', ['rat', 'grease'], 0.55, 0.98],
  ['stray dog on arrival', 'district', ['dog'], 0.5, 1],
  ['drunk on arrival', 'district', ['drunk'], 0.75, 1],
  ['knife kid on arrival', 'district', ['knife'], 0.7, 1],
  ['scarred hound', 'catcher', ['hound'], 0.5, 1],
  ['The Catcher', 'catcher', ['catcher'], 0.5, 0.97],
  ['mutated rat', 'sewer', ['mutant'], 0.7, 1],
  ['two mutated rats (run away!)', 'sewer', ['mutant', 'mutant'], 0.05, 0.8],
  ['bloater', 'sewer', ['bloater'], 0.7, 1],
  ['exterminator', 'sewer', ['exterminator'], 0.7, 1],
  ['Mother Gnaw', 'mother', ['mother'], 0.5, 0.97],
];

test('difficulty stays inside its intended range', () => {
  console.log('\n  Balance report (simulated sensible player):');
  const failures = [];
  for (const [name, fixture, group, lo, hi] of CASES) {
    const r = winRate(at(fixture), group);
    report(name, r);
    if (r.rate < lo || r.rate > hi) failures.push(`${name}: ${(r.rate * 100).toFixed(0)}% (wanted ${lo * 100}-${hi * 100}%)`);
  }
  assert.deepEqual(failures, []);
});

test('a dog is far too dangerous for a brand new cat', () => {
  const r = winRate(at('early'), ['dog']);
  assert.ok(r.rate < 0.35, `level 1 cat beats a dog ${(r.rate * 100).toFixed(0)}% of the time`);
});
