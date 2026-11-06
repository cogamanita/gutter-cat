// Enemy definitions. Each enemy picks a move at the START of the round, and any
// move with `windup` is announced to the player before they choose a command.
// That is the heart of combat: read the telegraph, then decide whether to press
// the attack or brace.
//
// ai(e, b) receives the enemy instance and the Battle and returns a move key.

const pick = (b, table) => {
  let r = b.rng() * table.reduce((a, t) => a + t[1], 0);
  for (const [k, w] of table) {
    r -= w;
    if (r <= 0) return k;
  }
  return table[0][0];
};

const livingOf = (b, id) => b.enemies.filter((x) => x.alive && x.id === id);

export const ENEMIES = {
  // ---------------------------------------------------------------- Gutter
  rat: {
    name: 'Sewer Rat', hp: 11, atk: 4, def: 1, agi: 6, xp: 4,
    sprite: 'b_rat', cry: 'squeak',
    drops: [['rat_meat', 0.2], ['crust', 0.1]], caps: [0, 1],
    moves: {
      gnaw: { name: 'Gnaw', power: 1, acc: 0.92, sfx: 'bite', text: '{e} gnaws at you.' },
      filth: {
        name: 'Filthy Bite', power: 0.8, acc: 0.9, sfx: 'bite', poison: { chance: 0.5, turns: 2 },
        text: '{e} sinks in filthy teeth.',
      },
      flee: { name: 'Flee', flee: true, text: '{e} scurries away into the dark.' },
    },
    ai(e, b) {
      if (e.hp / e.maxHp < 0.3 && b.rng() < 0.35) return 'flee';
      return pick(b, [['gnaw', 3], ['filth', 1]]);
    },
  },

  grease: {
    name: 'Grease', boss: true, hp: 62, atk: 6, def: 3, agi: 5, xp: 34,
    sprite: 'b_grease', cry: 'squeak', scale: 1,
    drops: [['leather', 1], ['fish_head', 1]], caps: [4, 4],
    intro: 'The pack leader. Every rat alive makes him bolder.',
    passive: 'pack',
    moves: {
      lunge: { name: 'Lunge', power: 1, acc: 0.92, sfx: 'bite', text: '{e} lunges, all teeth!' },
      slam: {
        name: 'Body Slam', power: 1.9, acc: 0.95, sfx: 'heavy', windup: '{e} rears up on his hind legs!',
        label: 'SLAM', text: '{e} crashes down on you!',
      },
      shriek: {
        name: 'Shriek', summon: 'rat', sfx: 'squeak', windup: '{e} fills his lungs, ready to shriek.',
        label: 'CALLING', text: '{e} shrieks. Another rat answers!',
      },
    },
    ai(e, b) {
      const t = e.mem.t = (e.mem.t || 0) + 1;
      if (t % 4 === 3 && livingOf(b, 'rat').length < 2) return 'shriek';
      if (t % 4 === 0) return 'slam';
      return 'lunge';
    },
  },

  // -------------------------------------------------------------- District
  dog: {
    name: 'Stray Dog', hp: 36, atk: 10, def: 4, agi: 8, xp: 22,
    sprite: 'b_dog', cry: 'bark',
    drops: [['studded', 0.05], ['rag', 0.12], ['crust', 0.15]], caps: [0, 2],
    moves: {
      bite: { name: 'Bite', power: 1, acc: 0.9, sfx: 'bite', text: '{e} snaps at you.' },
      maul: {
        name: 'Maul', power: 1.9, acc: 0.95, sfx: 'heavy', windup: '{e} lowers its head, growling low.',
        label: 'MAUL', text: '{e} tears into you!',
      },
    },
    ai(e, b) {
      const chance = e.hp / e.maxHp < 0.4 ? 0.5 : 0.3;
      if (e.mem.last !== 'maul' && b.rng() < chance) return 'maul';
      return 'bite';
    },
  },

  yard_dog: {
    name: 'Yard Dog', hp: 26, atk: 10, def: 3, agi: 8, xp: 8,
    sprite: 'b_dog', cry: 'bark',
    drops: [], caps: [0, 0],
    moves: {
      bite: { name: 'Bite', power: 1, acc: 0.9, sfx: 'bite', text: '{e} snaps at you.' },
    },
    ai() { return 'bite'; },
  },

  hound: {
    name: 'Scarred Hound', hp: 70, atk: 14, def: 6, agi: 9, xp: 42,
    sprite: 'b_hound', cry: 'bark',
    drops: [['studded', 0.25], ['rag', 0.25], ['fish_head', 0.2]], caps: [1, 3],
    moves: {
      bite: { name: 'Bite', power: 1, acc: 0.92, sfx: 'bite', text: '{e} bites hard.' },
      maul: {
        name: 'Maul', power: 1.8, acc: 0.95, sfx: 'heavy', windup: '{e} crouches. Its scars pull tight.',
        label: 'MAUL', text: '{e} shakes you like a rag!',
      },
      howl: {
        name: 'Howl', buffSelf: 1.25, sfx: 'howl', windup: '{e} throws back its head.', label: 'HOWL',
        text: '{e} howls. It is getting angrier.',
      },
    },
    ai(e, b) {
      const t = e.mem.t = (e.mem.t || 0) + 1;
      if (t === 2) return 'howl';
      if (e.mem.last !== 'maul' && b.rng() < 0.3) return 'maul';
      return 'bite';
    },
  },

  drunk: {
    name: 'Drunk', hp: 34, atk: 9, def: 3, agi: 3, xp: 18, human: true,
    sprite: 'b_drunk', cry: 'grunt',
    drops: [['crust', 0.3], ['milk', 0.2], ['firecracker', 0.08]], caps: [1, 3],
    moves: {
      stumble: {
        name: 'Stumble', sfx: 'miss', selfExpose: true,
        text: '{e} trips over nothing. He is wide open!',
      },
      bottle: { name: 'Bottle', power: 1.1, acc: 0.75, sfx: 'glass', text: '{e} hurls a bottle!' },
      kick: {
        name: 'Boot', power: 1.7, acc: 0.85, sfx: 'heavy', windup: '{e} draws back a heavy boot.',
        label: 'KICK', text: '{e} swings his boot into you!',
      },
    },
    ai(e, b) {
      return pick(b, [['stumble', 3], ['bottle', 4], ['kick', 3]]);
    },
  },

  knife: {
    name: 'Knife Kid', hp: 28, atk: 10, def: 3, agi: 11, xp: 22, human: true,
    sprite: 'b_knife', cry: 'grunt',
    drops: [['shard', 0.15], ['rag', 0.25], ['flare', 0.12]], caps: [2, 5],
    moves: {
      jab: { name: 'Jab', power: 0.6, hits: 2, acc: 0.9, sfx: 'slash', text: '{e} jabs twice, too fast to see.' },
      steal: {
        name: 'Snatch', steal: true, sfx: 'whoosh', windup: '{e} is eyeing the food on you.',
        label: 'STEAL', text: '{e} snatches at your food!',
      },
      run: { name: 'Run', flee: true, keepsLoot: true, text: '{e} bolts with your food!' },
    },
    ai(e, b) {
      if (e.mem.stolen) return 'run';
      if (!e.mem.tried && b.playerHasFood() && b.rng() < 0.4) {
        e.mem.tried = true;
        return 'steal';
      }
      return 'jab';
    },
  },

  exterminator: {
    name: 'Exterminator', hp: 76, atk: 17, def: 8, agi: 4, xp: 36, human: true,
    sprite: 'b_exterm', cry: 'grunt',
    drops: [['salve', 0.35], ['rubber', 0.08], ['flare', 0.15]], caps: [2, 5],
    moves: {
      spray: {
        name: 'Gas Spray', power: 0.5, acc: 1, sfx: 'gas', anim: 'gas', poison: { chance: 1, turns: 3 },
        text: '{e} floods the air with gas!',
      },
      boot: {
        name: 'Stomp', power: 1.9, acc: 0.9, sfx: 'heavy', windup: '{e} lifts a steel-toed boot.',
        label: 'STOMP', text: '{e} stamps down!',
      },
    },
    ai(e, b) {
      if (b.status.poison > 0 && e.mem.last !== 'boot') return 'boot';
      if (e.mem.last === 'spray') return 'boot';
      return 'spray';
    },
  },

  catcher: {
    name: 'The Catcher', boss: true, hp: 160, atk: 14, def: 7, agi: 6, xp: 80, human: true,
    sprite: 'b_catcher', cry: 'grunt',
    drops: [['hook', 1], ['cage_key', 1], ['bandage', 1]], caps: [8, 8],
    intro: 'Watch his hands. Brace when he readies the net, and he leaves himself open.',
    moves: {
      pole: { name: 'Catch-Pole', power: 1, acc: 0.92, sfx: 'heavy', text: '{e} jabs the catch-pole at you.' },
      net: {
        name: 'Net', power: 0.8, acc: 1, sfx: 'net', anim: 'net', net: true, windup: '{e} shakes out a weighted net.',
        label: 'NET', text: '{e} hurls the net!',
      },
      whistle: {
        name: 'Whistle', summon: 'yard_dog', sfx: 'whistle', windup: '{e} lifts a whistle to his lips.',
        label: 'WHISTLE', text: '{e} whistles. A yard dog comes running!',
      },
      gaff: {
        name: 'Gaff Swing', power: 1.6, acc: 0.9, sfx: 'heavy', windup: '{e} winds up with both hands.',
        label: 'SWING', text: '{e} brings the pole around!',
      },
    },
    ai(e, b) {
      const t = e.mem.t = (e.mem.t || 0) + 1;
      if (e.hp / e.maxHp < 0.5 && !e.mem.whistled) {
        e.mem.whistled = true;
        return 'whistle';
      }
      if (t % 3 === 2) return 'net';
      if (t % 3 === 0) return 'gaff';
      return 'pole';
    },
  },

  // ---------------------------------------------------------------- Sewers
  mutant: {
    name: 'Mutated Rat', hp: 62, atk: 16, def: 6, agi: 6, xp: 30,
    sprite: 'b_mutant', cry: 'squeak',
    drops: [['rat_meat', 0.35], ['salve', 0.18], ['fish_head', 0.12]], caps: [0, 2],
    moves: {
      bite: { name: 'Bite', power: 1, acc: 0.9, sfx: 'bite', text: '{e} clamps on with too many teeth.' },
      acid: {
        name: 'Acid Spit', power: 0.7, acc: 0.95, sfx: 'gas', anim: 'gas', poison: { chance: 0.75, turns: 3 },
        text: '{e} retches burning bile on you.',
      },
      frenzy: {
        name: 'Frenzy', power: 0.75, hits: 2, acc: 0.85, sfx: 'bite', windup: '{e} is shaking, eyes rolling white.',
        label: 'FRENZY', text: '{e} thrashes in a frenzy!',
      },
    },
    ai(e, b) {
      if (e.hp / e.maxHp < 0.45) return 'frenzy';
      return pick(b, [['bite', 2], ['acid', 1]]);
    },
  },

  bloater: {
    name: 'Bloater', hp: 96, atk: 15, def: 4, agi: 2, xp: 34,
    sprite: 'b_bloater', cry: 'gurgle',
    drops: [['salve', 0.3], ['tuna', 0.1]], caps: [0, 2],
    moves: {
      slam: { name: 'Slam', power: 0.9, acc: 0.85, sfx: 'heavy', text: '{e} flops onto you, wet and heavy.' },
      burst: {
        name: 'Burst', power: 2.6, acc: 1, sfx: 'burst', anim: 'gas', selfDestruct: true, poison: { chance: 1, turns: 3 },
        windup: '{e} swells tight. It is going to burst!', label: 'BURSTING',
        text: '{e} ruptures in a wave of filth!',
      },
    },
    ai(e) {
      const t = e.mem.t = (e.mem.t || 0) + 1;
      if (t >= 4 || e.hp / e.maxHp < 0.4) return 'burst';
      return 'slam';
    },
  },

  brood: {
    name: 'Brood', hp: 22, atk: 12, def: 3, agi: 7, xp: 3,
    sprite: 'b_brood', cry: 'squeak',
    drops: [], caps: [0, 0],
    moves: {
      nip: { name: 'Nip', power: 0.7, acc: 0.9, sfx: 'bite', text: '{e} latches on.' },
    },
    ai() { return 'nip'; },
  },

  mother: {
    name: 'Mother Gnaw', boss: true, hp: 240, atk: 15, def: 8, agi: 4, xp: 180,
    sprite: 'b_mother', cry: 'gurgle',
    drops: [['tuna', 1]], caps: [12, 12],
    intro: 'Kill her brood before she eats it. When the water rises, brace.',
    passive: 'flood',
    moves: {
      crush: { name: 'Crush', power: 1.15, acc: 0.9, sfx: 'heavy', text: '{e} rolls her bulk across the floor!' },
      bile: {
        name: 'Bile', power: 0.7, acc: 1, sfx: 'gas', anim: 'gas', poison: { chance: 0.9, turns: 3 },
        text: '{e} vomits a black tide of bile.',
      },
      spawn: {
        name: 'Birth', summon: 'brood', sfx: 'gurgle', windup: 'Something moves under the skin of {e}.',
        label: 'BIRTHING', text: '{e} splits open and a brood drops free!',
      },
      devour: {
        name: 'Devour', devour: 'brood', healAmount: 28, sfx: 'eat', windup: '{e} turns her blind face to her brood.',
        label: 'DEVOUR', text: '{e} swallows her own young, and her wounds close!',
      },
      flood: {
        name: 'Flood', power: 2.5, acc: 1, sfx: 'flood', anim: 'flood', windup: 'The water surges to the ceiling. BRACE!',
        label: 'FLOOD', text: 'The sewers come down on you!',
      },
    },
    ai(e, b) {
      const t = e.mem.t = (e.mem.t || 0) + 1;
      const brood = livingOf(b, 'brood').length;
      if (e.hp / e.maxHp <= 0.5) {
        if (!e.mem.phase2) {
          e.mem.phase2 = true;
          e.mem.floodIn = 3;
          b.announce('The pipes scream. Black water starts rising in the chamber!');
        }
        e.mem.floodIn -= 1;
        if (e.mem.floodIn <= 0) {
          e.mem.floodIn = 4;
          return 'flood';
        }
        e.label = `FLOOD IN ${e.mem.floodIn}`;
      }
      if (brood > 0 && e.hp / e.maxHp < 0.75 && e.mem.last !== 'devour' && t % 2 === 0) return 'devour';
      if (brood < 2 && t % 4 === 1) return 'spawn';
      return pick(b, [['crush', 3], ['bile', 2]]);
    },
  },
};

// Encounter tables for random (tile-triggered) battles.
export const ENCOUNTERS = {
  gutter: [['rat'], ['rat'], ['rat', 'rat']],
  gutter_deep: [['rat', 'rat'], ['rat', 'rat', 'rat']],
  district: [['drunk'], ['dog'], ['knife'], ['rat', 'rat', 'rat']],
  plant: [['knife'], ['drunk', 'knife'], ['rat', 'rat', 'rat']],
  yard: [['dog'], ['dog', 'yard_dog']],
  sewer: [['mutant'], ['rat', 'rat', 'mutant'], ['bloater'], ['mutant']],
  sewer_deep: [['mutant', 'mutant'], ['bloater', 'mutant'], ['exterminator']],
};
