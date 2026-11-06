// Every item in the game. Effects are plain data so the same definition drives
// the field menu, the battle menu and the headless balance tests.
//
// type: food | med | battle | key | equip
// use:  field | battle | both (who can consume it)

export const ITEMS = {
  // --- Food -------------------------------------------------------------
  crust: {
    name: 'Stale Crust', type: 'food', use: 'both', icon: 'crust',
    hunger: 15,
    desc: 'Hard as a brick. Still food. Hunger +15.',
  },
  rat_meat: {
    name: 'Rat Haunch', type: 'food', use: 'both', icon: 'meat',
    hunger: 22, poisonRisk: 0.3,
    desc: 'Raw and strange. Hunger +22. May make you sick.',
  },
  fish_head: {
    name: 'Fish Head', type: 'food', use: 'both', icon: 'fish',
    hunger: 35, hp: 6,
    desc: 'One clouded eye stares back. Hunger +35, HP +6.',
  },
  milk: {
    name: 'Spoiled Milk', type: 'food', use: 'both', icon: 'milk',
    hunger: 20, hp: 10,
    desc: 'Lumpy. You have had worse. Hunger +20, HP +10.',
  },
  tuna: {
    name: 'Dented Tuna', type: 'food', use: 'both', icon: 'tuna',
    hunger: 60, hp: 20,
    desc: 'A miracle in a dented can. Hunger +60, HP +20.',
  },

  // --- Medicine ---------------------------------------------------------
  rag: {
    name: 'Clean Rag', type: 'med', use: 'both', icon: 'rag',
    hp: 18,
    desc: 'Press it to the wound and lick it clean. HP +18.',
  },
  salve: {
    name: 'Antiseptic', type: 'med', use: 'both', icon: 'salve',
    hp: 12, cure: true,
    desc: 'It stings. Cures poison. HP +12.',
  },
  bandage: {
    name: 'Vet Bandage', type: 'med', use: 'both', icon: 'rag',
    hp: 40,
    desc: 'From somebody who once cared. HP +40.',
  },

  // --- Battle items -----------------------------------------------------
  catnip: {
    name: 'Wild Catnip', type: 'battle', use: 'battle', icon: 'catnip',
    atkBuff: 1.4, turns: 3,
    desc: 'The world narrows. Attack +40% for 3 turns.',
  },
  firecracker: {
    name: 'Firecracker', type: 'battle', use: 'battle', icon: 'cracker',
    damageAll: 22,
    desc: 'Bats it into the enemy. 22 damage to ALL foes.',
  },
  flare: {
    name: 'Road Flare', type: 'battle', use: 'battle', icon: 'flare',
    blind: 2,
    desc: 'Blinding light. Foes mostly miss for 2 turns.',
  },

  // --- Equipment --------------------------------------------------------
  nail: {
    name: 'Rusty Nail', type: 'equip', slot: 'claw', icon: 'claw',
    atk: 2,
    desc: 'Wedged between your toes. Attack +2.',
  },
  shard: {
    name: 'Glass Shard', type: 'equip', slot: 'claw', icon: 'claw',
    atk: 4, def: -1,
    desc: 'Cuts deep, cuts you too. Attack +4, Defense -1.',
  },
  razor: {
    name: 'Razor Blade', type: 'equip', slot: 'claw', icon: 'claw',
    atk: 6,
    desc: 'Barely rusted. Attack +6.',
  },
  meat_hook: {
    name: 'Bent Meat Hook', type: 'equip', slot: 'claw', icon: 'claw',
    atk: 9, agi: -1,
    desc: 'Too heavy for a cat. Attack +9, Agility -1.',
  },
  burlap: {
    name: 'Burlap Scrap', type: 'equip', slot: 'collar', icon: 'collar',
    def: 1,
    desc: 'Keeps a little rain off. Defense +1.',
  },
  leather: {
    name: 'Leather Collar', type: 'equip', slot: 'collar', icon: 'collar',
    def: 2,
    desc: 'The tag has been torn away. Defense +2.',
  },
  studded: {
    name: 'Spiked Dog Collar', type: 'equip', slot: 'collar', icon: 'collar',
    def: 4, agi: -1,
    desc: 'Taken off something bigger. Defense +4, Agility -1.',
  },
  rubber: {
    name: 'Rubber Scrap Coat', type: 'equip', slot: 'collar', icon: 'collar',
    def: 5, poisonGuard: true,
    desc: 'Cut from a work boot. Defense +5. Blocks most poison.',
  },
  capcharm: {
    name: 'Lucky Bottlecap', type: 'equip', slot: 'charm', icon: 'charm',
    crit: 12,
    desc: 'It has always landed face up. Critical chance +12%.',
  },
  mouse_skull: {
    name: 'Mouse Skull', type: 'equip', slot: 'charm', icon: 'charm',
    atk: 1, agi: 1,
    desc: 'Your first kill, maybe. Attack +1, Agility +1.',
  },
  fishbone: {
    name: 'Fish Bone Pin', type: 'equip', slot: 'charm', icon: 'charm',
    agi: 3,
    desc: 'Pricks you awake. Agility +3.',
  },
  glowstick: {
    name: 'Cracked Glowstick', type: 'equip', slot: 'charm', icon: 'charm',
    light: 34, def: 1,
    desc: 'Sickly green glow. See much further. Defense +1.',
  },
  tom_tag: {
    name: "Old Tom's Tag", type: 'equip', slot: 'charm', icon: 'charm',
    atk: 2, def: 2, agi: 1,
    desc: '"TOM". Worn smooth. Attack +2, Defense +2, Agility +1.',
  },

  // --- Key items --------------------------------------------------------
  poster: {
    name: 'Torn Poster', type: 'key', icon: 'paper',
    desc: 'LOST: BUTTON. Small gray cat. 14 Marrow Lane. PLEASE.',
  },
  hook: {
    name: 'Manhole Hook', type: 'key', icon: 'key',
    desc: 'An iron hook from the Catcher. Lifts sewer covers.',
  },
  cage_key: {
    name: 'Cage Key', type: 'key', icon: 'key',
    desc: 'A small key on a greasy loop of string.',
  },
  valve_wheel: {
    name: 'Valve Wheel', type: 'key', icon: 'key',
    desc: 'A rusted wheel. It fits the sluice valves below.',
  },
};

export const SLOT_NAMES = { claw: 'CLAWS', collar: 'COAT', charm: 'CHARM' };

export function isUsableIn(item, where) {
  if (!item || !item.use) return false;
  return item.use === 'both' || item.use === where;
}
