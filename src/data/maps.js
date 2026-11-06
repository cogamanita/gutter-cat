// Every playable map, carved out of solid wall with explicit coordinates.
// Global tile characters are documented in world/mapdata.js; per-map entities
// are listed in `marks` and placed by character.

function carve(w, h, fn) {
  const g = Array.from({ length: h }, () => Array(w).fill('#'));
  const under = Array.from({ length: h }, () => Array(w).fill(null));
  const place = (x, y, ch) => {
    if (g[y][x] !== '#') under[y][x] = under[y][x] || g[y][x];
    g[y][x] = ch;
  };
  const api = {
    /** Fill a rectangle with one character. */
    rect(x, y, rw, rh, ch) {
      for (let j = y; j < y + rh; j += 1) for (let i = x; i < x + rw; i += 1) g[j][i] = ch;
    },
    /** Write one or more rows of characters starting at x,y. */
    put(x, y, ...rows) {
      rows.forEach((row, j) => [...row].forEach((ch, i) => {
        if (ch !== ' ') place(x + i, y + j, ch);
      }));
    },
    /** Same character at many [x,y] positions. */
    at(ch, ...points) {
      for (const [x, y] of points) place(x, y, ch);
    },
  };
  fn(api);
  const rows = g.map((r) => r.join(''));
  rows.under = under;
  return rows;
}

const CAR = ['AEI', 'OUV'];

const HUNT = {
  rat: { type: 'hunter', sprite: 'rat', group: ['rat'], speed: 300, aggro: 4 },
  rats: { type: 'hunter', sprite: 'rat', group: ['rat', 'rat'], speed: 280, aggro: 5 },
  dog: { type: 'hunter', sprite: 'dog', group: ['dog'], speed: 185, aggro: 6 },
  hound: { type: 'hunter', sprite: 'hound', group: ['hound'], speed: 175, aggro: 7 },
  drunk: { type: 'hunter', sprite: 'drunk', group: ['drunk'], speed: 480, aggro: 4 },
  knife: { type: 'hunter', sprite: 'knife', group: ['knife'], speed: 220, aggro: 6 },
  mutant: { type: 'hunter', sprite: 'mutant', group: ['mutant'], speed: 260, aggro: 6 },
  bloater: { type: 'hunter', sprite: 'bloater', group: ['bloater'], speed: 500, aggro: 4 },
  exterm: { type: 'hunter', sprite: 'exterm', group: ['exterminator'], speed: 380, aggro: 6 },
};

const CITY_GROUND = ['asphalt', 'asphalt', 'asphalt', 'asphalt', 'asphalt2', 'asphalt', 'asphalt', 'asphalt', 'asphalt3', 'asphalt', 'asphalt'];
const WALK_GROUND = ['sidewalk', 'sidewalk', 'sidewalk', 'sidewalk', 'sidewalk', 'sidewalk2'];
const SEWER_GROUND = ['s_floor', 's_floor', 's_floor', 's_floor2', 's_floor', 's_floor', 's_moss', 's_floor'];

export const MAPS = {
  // ================================================================== GUTTER
  gutter: {
    id: 'gutter', name: 'THE GUTTER', wallStyle: 'brick',
    ground: CITY_GROUND, ground2: WALK_GROUND, markGround: '.',
    weather: 'rain', ambient: [0.26, 0.28, 0.34], playerLight: 72, ambience: 'rain',
    encounters: { table: 'gutter', rate: 0.1, base: 0.004 },
    rows: carve(50, 30, ({ rect, put, at }) => {
      // Open ground
      rect(18, 4, 14, 4, ',');   // Old Tom's courtyard
      rect(34, 4, 13, 4, ',');   // north-east alley
      rect(23, 8, 4, 2, ',');
      rect(38, 8, 4, 2, ',');
      rect(1, 10, 43, 2, ',');   // north sidewalk
      rect(1, 12, 43, 6, '.');   // street
      rect(1, 18, 43, 2, '~');   // the gutter itself
      rect(1, 20, 43, 1, ',');   // south sidewalk
      rect(44, 13, 5, 4, '.');   // culvert approach
      rect(10, 21, 4, 3, ',');
      rect(36, 21, 4, 3, ',');
      rect(2, 24, 23, 4, '.');   // trash yard
      rect(31, 24, 17, 4, '.');  // scrap yard
      rect(25, 26, 6, 1, '.');   // gap between the yards

      // Facade dressing
      at('W', [20, 2], [30, 2], [36, 2], [45, 2], [2, 8], [10, 8], [14, 8], [18, 8], [28, 8], [36, 8], [45, 11], [48, 11]);
      at('W', [3, 22], [8, 22], [15, 22], [25, 22], [30, 22], [41, 22], [48, 22]);
      at('P', [25, 2], [6, 8], [32, 8], [20, 22], [45, 22]);
      at('Y', [41, 2]);

      // Tom's courtyard
      put(20, 4, 'Cc');
      at('T', [30, 4]);
      at('1', [20, 5]);
      at('F', [22, 5]);
      at('c', [30, 5]);
      at('2', [24, 6]);
      at('t', [30, 6]);
      at('T', [28, 7]);
      at('h', [30, 7]);

      // North-east alley
      put(35, 5, 'bd');
      at('3', [43, 5]);
      at('T', [46, 4], [35, 7]);
      at('e', [41, 7]);
      at('r', [38, 6]);

      // Street
      at('L', [10, 10], [30, 10], [21, 20]);
      at('%', [10, 12], [16, 13], [28, 14], [30, 15], [42, 14], [43, 12], [9, 17], [22, 16]);
      at('y', [21, 12], [17, 17]);
      at('v', [19, 14]);
      at('x', [7, 16]);
      put(21, 13, ...CAR);
      put(36, 15, ...CAR);
      at('|', [1, 13], [1, 14], [1, 15], [1, 16]);
      at('s', [3, 15]);
      at('r', [15, 15], [34, 13]);
      at('q', [30, 17]);

      // Grease blocks the way east
      at('n', [43, 13], [43, 14], [43, 15], [43, 16]);
      at('G', [46, 14]);
      at('>', [49, 14], [49, 15]);

      // Trash yard
      put(3, 24, 'T');
      put(5, 24, 'tt');
      put(19, 24, 'ctt');
      at('f', [22, 24]);
      at('T', [24, 24]);
      put(3, 25, 'Dd');
      put(6, 25, 'tt');
      at('t', [13, 25]);
      put(21, 25, 'tt');
      at('r', [12, 26]);
      put(15, 26, 'tt');
      at('a', [2, 27]);
      put(4, 27, 'tt');
      at('T', [8, 27]);
      put(13, 27, 'tt');
      at('i', [18, 27]);
      at('t', [21, 27]);
      at('u', [23, 27]);

      // Scrap yard
      at('X', [33, 25]);
      at('r', [39, 25]);
      at('j', [44, 25]);
      at('x', [34, 26]);
      put(40, 26, 'oo');
      at('c', [33, 27]);
      at('q', [38, 27]);
      at('T', [46, 27]);
    }),
    marks: {
      s: { type: 'spawn', name: 'start' },
      1: { type: 'npc', sprite: 'tom', face: 'right', script: 'tom', name: 'Old Tom', on: ',', prompt: 'Talk' },
      2: { type: 'save', tile: 'box', on: ',' },
      3: { type: 'sign', tile: 'sign_post', on: ',', solid: true, prompt: 'Read', lines: ['A rain-streaked notice, stapled over a dozen others:', '"CONDEMNED. BLOCKS 4 THROUGH 19. BY ORDER OF SANITATION."', 'Under it, in a child\'s crayon: "where did everyone go"'] },
      b: { type: 'loot', tile: 'dumpster_l', on: ',', item: 'burlap', text: 'Under the slop, a square of burlap. It smells of onions and old rain.' },
      e: { type: 'loot', tile: 'bags', on: ',', item: 'crust', text: 'You tear the bag open. A heel of bread, only a little green.' },
      a: { type: 'loot', tile: 'can', item: 'mouse_skull', text: 'Under the lid: a tiny skull, licked clean. Something about it steadies you.' },
      f: { type: 'loot', tile: 'crate', item: 'fish_head', text: 'A crate of ice long since melted. One fish head remains.' },
      h: { type: 'loot', tile: 'can', on: ',', item: 'rag', text: 'A clean rag, folded neatly. Somebody meant to come back for it.' },
      i: { type: 'pickup', caps: 3 },
      j: { type: 'pickup', item: 'nail' },
      u: { type: 'sign', tile: 'bones', solid: false, prompt: 'Examine', lines: ['Small bones, arranged in a careful circle.', 'Someone stayed here with them until the end.'] },
      n: { type: 'trigger', script: 'greaseAmbush', unless: 'killed_grease' },
      G: { type: 'bossnpc', sprite: 'grease', hideIf: 'killed_grease' },
      '>': { type: 'exit', to: 'district', at: 'fromGutter', tile: 'culvert' },
      r: { ...HUNT.rat },
      q: { ...HUNT.rats },
    },
    extraSpawns: { fromDistrict: [47, 15], fromTitle: [3, 15] },
  },

  // ================================================================ DISTRICT
  district: {
    id: 'district', name: 'THE ABANDONED DISTRICT', wallStyle: 'brick', onEnter: 'enterDistrict',
    ground: CITY_GROUND, ground2: WALK_GROUND, markGround: '.',
    weather: 'rain', ambient: [0.19, 0.2, 0.26], playerLight: 62, ambience: 'rain',
    encounters: { table: 'district', rate: 0.07, base: 0.008 },
    rows: carve(60, 40, ({ rect, put, at }) => {
      rect(2, 4, 15, 6, '"');    // Patch's burned lot
      rect(20, 4, 17, 6, ',');   // the plaza
      rect(40, 4, 11, 6, ',');   // meat plant forecourt
      rect(51, 4, 9, 34, 'w');   // the canal
      rect(8, 10, 3, 2, ',');
      rect(27, 10, 3, 2, ',');
      rect(44, 10, 3, 2, ',');
      rect(1, 12, 50, 2, ',');   // avenue
      rect(1, 14, 50, 4, '.');
      rect(1, 18, 50, 2, ',');
      rect(51, 15, 4, 2, ':');   // the broken bridge
      rect(10, 20, 3, 3, ',');
      rect(34, 20, 3, 3, ',');
      rect(2, 23, 17, 13, '.');  // back alleys
      rect(22, 23, 29, 13, ','); // the Catcher's yard
      rect(19, 29, 3, 1, '.');   // back way into the yard

      // Alley walls, to make the back alleys a place to get cornered in
      rect(9, 26, 5, 4, '#');
      rect(2, 29, 3, 1, '#');
      rect(13, 32, 3, 4, '#');
      rect(6, 31, 1, 3, 'X');

      // Facades
      at('W', [4, 2], [12, 2], [22, 2], [28, 2], [33, 2], [42, 2], [49, 2], [19, 10], [23, 10], [32, 10], [36, 10], [14, 21], [20, 21], [28, 21], [39, 21], [47, 21], [4, 21]);
      at('P', [8, 2], [25, 2], [38, 10], [16, 10], [24, 21], [7, 21], [43, 21]);
      at('Y', [46, 2]);

      // Patch's lot
      put(2, 4, '..');
      put(8, 4, '...');
      at('.', [4, 7], [5, 7], [9, 6], [10, 6], [13, 8], [14, 8], [6, 9], [7, 9], [8, 9], [9, 9], [8, 8], [9, 8], [8, 7]);
      at('1', [7, 5]);
      at('2', [9, 5]);
      at('T', [14, 5], [8, 6], [16, 9]);
      at('t', [16, 7], [3, 8]);
      at('z', [12, 7]);

      // Plaza
      at('c', [22, 5], [34, 8]);
      at('3', [27, 5]);
      at('T', [35, 5], [21, 9]);
      at('4', [22, 7]);
      at('5', [31, 7]);
      at('b', [36, 4]);
      at('F', [30, 5]);

      // Forecourt
      at('6', [45, 3]);
      at('B', [49, 5]);
      at('C', [41, 6]);
      at('7', [42, 8]);
      at('T', [49, 8]);

      // Avenue
      at('<', [0, 15], [0, 16]);
      at('L', [7, 12], [33, 12], [27, 18]);
      at('%', [9, 14], [32, 14], [5, 16], [29, 16], [24, 17], [45, 17]);
      at('y', [15, 14], [12, 17]);
      put(22, 14, ...CAR);
      put(37, 16, ...CAR);
      at('F', [20, 17]);
      at('q', [13, 16]);
      at('d', [42, 14]);
      at('k', [38, 15]);
      at('f', [50, 15]);
      at('5', [38, 19]);

      // Back alleys
      put(3, 24, 'ttt');
      put(14, 24, 'ttt');
      at('t', [3, 25], [16, 25]);
      at('c', [5, 25]);
      at('a', [5, 26]);
      put(3, 27, 'ttt');
      at('T', [17, 23]);
      at('j', [15, 28]);
      at('X', [14, 27]);
      at('u', [4, 31]);
      at('q', [7, 30]);
      at('d', [16, 30]);
      at('e', [10, 32]);
      at('t', [11, 33], [3, 33], [7, 34], [3, 34], [4, 34]);
      at('h', [10, 31]);

      // The yard gate, cages and kennels
      at('8', [35, 22]);
      at('n', [33, 23], [34, 23], [35, 23], [36, 23], [37, 23], [21, 29]);
      rect(22, 30, 1, 5, '=');
      rect(22, 23, 1, 6, '=');
      rect(46, 28, 1, 8, '=');
      rect(47, 28, 3, 1, ',');
      at('9', [24, 24], [26, 24], [28, 24], [30, 24]);
      at('m', [35, 29]);
      at('B', [26, 29]);
      at('C', [44, 29]);
      put(27, 32, ...CAR);
      at('F', [40, 32]);
      at('B', [48, 25]);
      at('g', [48, 29]);
      at('x', [32, 33], [38, 27]);
    }),
    marks: {
      '<': { type: 'exit', to: 'gutter', at: 'fromDistrict', tile: 'culvert_w' },
      6: { type: 'door', to: 'plant', at: 'entry', tile: 'door_shop', wall: true, prompt: 'Enter' },
      7: { type: 'script', tile: 'manhole', script: 'manhole', on: ',', solid: false, prompt: 'Examine' },
      1: { type: 'npc', sprite: 'patch', face: 'right', script: 'patch', name: 'Patch', on: '"', prompt: 'Talk' },
      2: { type: 'npc', sprite: 'kitten', face: 'left', script: 'kittens', name: 'Kittens', on: '"', prompt: 'Look' },
      3: { type: 'npc', sprite: 'crow', face: 'down', script: 'rag', name: 'Rag', on: ',', prompt: 'Barter' },
      4: { type: 'script', tile: 'sign_post', script: 'poster', on: ',', solid: true, prompt: 'Read' },
      5: { type: 'save', tile: 'box', on: ',' },
      8: { type: 'sign', tile: 'gate_open', on: ',', solid: false, prompt: 'Read', lines: ['A wire gate, standing open. A sign:', '"CITY ANIMAL CONTROL. RESIDENTS WILL NOT BE ADMITTED."', 'From inside comes a thin, tired sound. Cats.', 'Better save first. There will be no running from this.'] },
      9: { type: 'script', tile: 'cage', script: 'cage', on: ',', solid: true, prompt: 'Look', altFlag: 'cage_{x}', altTile: 'cage_open' },
      f: { type: 'sign', tile: 'sign_post', on: '.', solid: true, prompt: 'Read', lines: ['BRIDGE OUT.', 'Past the snapped planks the black canal slides by.', 'Far across it, small as a match head: one yellow window.'] },
      a: { type: 'loot', tile: 'crate', item: 'shard', text: 'A long splinter of window glass, wrapped in tape. It fits your paw. Almost.' },
      g: { type: 'loot', tile: 'crate', on: ',', item: 'tuna', text: 'Behind the kennels, a dented can. The Catcher\'s lunch. Not any more.' },
      e: { type: 'loot', tile: 'bags', item: 'firecracker', text: 'A paper tube with a fuse. Fourth of July, some other year.' },
      b: { type: 'loot', tile: 'can', on: ',', item: 'fish_head', text: 'Under a sodden newspaper: a fish head. For once, luck is on your side.' },
      j: { type: 'pickup', item: 'fishbone' },
      k: { type: 'pickup', caps: 5 },
      z: { type: 'loot', tile: 'crate', on: '"', item: 'milk', text: 'A carton, swollen but unbroken. Somebody left it for the kittens and never came back.' },
      u: { type: 'sign', tile: 'bones', solid: false, prompt: 'Examine', lines: ['A collar with no tag. The buckle was chewed through from the inside.'] },
      h: { type: 'pickup', item: 'rag' },
      n: { type: 'trigger', script: 'catcherAmbush', unless: 'killed_catcher' },
      m: { type: 'bossnpc', sprite: 'catcher', hideIf: 'killed_catcher', on: ',' },
      d: { ...HUNT.dog },
      q: { ...HUNT.drunk },
    },
    extraHunters: [
      { x: 43, y: 6, ...HUNT.knife },
      { x: 25, y: 16, ...HUNT.dog },
      { x: 11, y: 24, ...HUNT.hound },
    ],
    extraSpawns: { fromGutter: [2, 15], plantdoor: [45, 4], manhole: [43, 8] },
  },

  // =================================================================== PLANT
  plant: {
    id: 'plant', name: 'MEAT PLANT No. 9', wallStyle: 'concrete', onEnter: 'enterPlant',
    ground: 'checker', ground2: 'checker', markGround: '_',
    weather: 'none', ambient: [0.22, 0.2, 0.2], playerLight: 72, ambience: 'indoor',
    encounters: { table: 'plant', rate: 0.04, base: 0.012 },
    rows: carve(26, 18, ({ rect, put, at }) => {
      rect(2, 4, 22, 11, '_');
      rect(4, 7, 5, 1, '#');
      rect(17, 7, 5, 1, '#');
      rect(11, 10, 3, 2, '#');
      at('W', [5, 2], [20, 2]);
      at('P', [12, 2]);
      at('H', [8, 4], [8, 5], [16, 4], [16, 5], [5, 10], [5, 11], [8, 12], [16, 11], [19, 10], [19, 11], [18, 12]);
      put(3, 13, 'NN');
      at('a', [23, 4]);
      at('b', [12, 5]);
      at('c', [12, 8]);
      at('k', [8, 10]);
      at('f', [22, 11]);
      at('e', [12, 13]);
      at('s', [13, 14]);
      at('<', [13, 15]);
      at('r', [21, 5]);
      at('r', [3, 9]);
    }),
    marks: {
      '<': { type: 'door', tile: 'door_shop', wall: true, to: 'district', at: 'plantdoor', prompt: 'Leave' },
      s: { type: 'spawn', name: 'entry', on: '_' },
      a: { type: 'loot', tile: 'crate', on: '_', item: 'razor', text: 'A foreman\'s tin. Inside, one razor blade, barely rusted.' },
      b: { type: 'script', tile: 'ledger', on: '_', script: 'ledger', solid: true, prompt: 'Read' },
      c: { type: 'pickup', item: 'catnip', on: '_' },
      e: { type: 'loot', tile: 'crate', on: '_', item: 'bandage', text: 'A first aid box with one roll of vet wrap left. Why does a meat plant need vet wrap?' },
      f: { type: 'loot', tile: 'can', on: '_', item: 'rag', n: 2, text: 'Clean shop rags. Two of them.' },
      k: { ...HUNT.knife, on: '_' },
      r: { ...HUNT.rats, on: '_' },
    },
  },

  // ================================================================== SEWERS
  sewers: {
    id: 'sewers', name: 'THE SEWERS', wallStyle: 'sewer', waterStyle: 'sludge',
    ground: SEWER_GROUND, ground2: 's_moss', markGround: '.',
    weather: 'drip', ambient: [0.2, 0.26, 0.17], playerLight: 80, ambience: 'sewer',
    encounters: { table: 'sewer', rate: 0.07, base: 0.012 },
    rows: carve(60, 40, ({ rect, at, put }) => {
      rect(3, 4, 10, 6, '.');     // entry chamber
      rect(13, 6, 17, 3, '.');    // north passage
      rect(30, 4, 11, 6, '.');    // pump room
      rect(41, 6, 3, 3, '.');
      rect(44, 4, 13, 6, '.');    // Pale's room
      rect(6, 10, 3, 2, '.');
      rect(50, 10, 3, 2, '.');
      rect(6, 12, 47, 5, '.');    // the great channel
      rect(9, 13, 41, 3, 'w');
      rect(28, 13, 3, 3, 'g');    // grating across it
      rect(6, 17, 3, 3, '.');
      rect(28, 17, 3, 15, '.');
      rect(50, 17, 3, 3, '.');
      rect(3, 20, 12, 8, '.');    // west sluice room
      rect(44, 20, 13, 8, '.');   // east sluice room
      rect(8, 28, 3, 4, '.');
      rect(50, 28, 3, 4, '.');
      rect(8, 32, 45, 3, '.');    // south passage
      rect(28, 35, 3, 1, '&');    // flooded culvert, drained by the valves
      rect(28, 36, 3, 1, '>');    // onward to the cistern

      // Shallow sludge is where things live
      rect(14, 6, 4, 3, '~');
      rect(22, 7, 3, 2, '~');
      rect(42, 12, 8, 1, '~');
      rect(10, 16, 10, 1, '~');
      rect(4, 25, 6, 2, '~');
      rect(46, 21, 5, 2, '~');
      rect(14, 33, 10, 2, '~');
      rect(34, 32, 12, 2, '~');
      rect(29, 22, 2, 4, '~');

      // Dressing
      at('W', [8, 2], [34, 2], [48, 2], [54, 2], [18, 4], [24, 4], [12, 10], [20, 10], [38, 10], [46, 10], [8, 18], [50, 18]);
      at('P', [37, 2], [15, 10], [30, 10], [5, 18], [46, 18]);
      at('<', [7, 3]);
      at('s', [7, 4]);
      at('2', [10, 5]);
      at('t', [4, 8], [11, 8]);
      at('|', [12, 4]);
      at('v', [5, 6]);

      // Pump room and the dead exterminator
      at('a', [36, 5]);
      at('b', [34, 7]);
      at('c', [38, 8]);
      at('C', [31, 4], [39, 4]);
      at('B', [40, 9], [30, 9]);

      // Pale
      at('p', [52, 5]);
      at('e', [46, 8]);
      at('T', [55, 8]);
      at('H', [45, 4]);

      // Valves
      at('A', [5, 21]);
      at('Z', [55, 21]);
      at('f', [12, 26]);
      at('h', [46, 26]);
      at('B', [14, 20], [44, 20]);
      at('u', [40, 34]);
      at('j', [18, 32]);
      at('2', [25, 32]);

      // Hunters
      at('m', [36, 7], [18, 12], [40, 16], [11, 23], [47, 24], [20, 33]);
      at('o', [29, 28], [9, 12], [38, 33]);
      at('x', [49, 6]);
      at('q', [52, 22]);
    }),
    marks: {
      '<': { type: 'door', tile: 'ladder', wall: true, to: 'district', at: 'manhole', prompt: 'Climb' },
      s: { type: 'spawn', name: 'entry' },
      2: { type: 'save', tile: 'box' },
      a: { type: 'script', tile: 'corpse', script: 'deadExterminator', solid: true, prompt: 'Search' },
      b: { type: 'sign', tile: 'ledger', solid: true, prompt: 'Read', lines: ['A clipboard, dry under an overturned bucket.', '"WEEK 6. Compound 9 is working. Rat counts down 80% in sectors 2 to 5."', '"WEEK 9. Counts rising. Bodies are BIGGER. Asked supervisor. Told to pour more."', '"WEEK 11. Something is moving in the cistern. It ate the sampling crew\'s boots. Not the crew. Just the boots. We can\'t find the crew."'] },
      c: { type: 'pickup', item: 'salve' },
      p: { type: 'npc', sprite: 'pale', face: 'down', script: 'pale', name: 'Pale', prompt: 'Talk' },
      e: { type: 'loot', tile: 'crate', item: 'tuna', text: 'A wet crate of relief rations from a flood nobody remembers. One can left.' },
      A: { type: 'script', tile: 'valve', script: 'valveA', solid: true, prompt: 'Examine' },
      Z: { type: 'script', tile: 'valve', script: 'valveB', solid: true, prompt: 'Examine' },
      f: { type: 'loot', tile: 'can', item: 'firecracker', text: 'A pest-control smoke charge. Near enough to a firecracker.' },
      h: { type: 'loot', tile: 'crate', item: 'bandage', text: 'A sealed medical pouch, floating in a crate. Vet wrap, somehow.' },
      j: { type: 'sign', tile: 'bones', solid: false, prompt: 'Examine', lines: ['A big old tomcat, long dead. His left ear was notched exactly like Tom\'s.', 'You leave him be.'] },
      u: { type: 'pickup', item: 'flare' },
      '&': { type: 'gate', flag: 'sluice_open', closed: 's_deep0', open: 's_floor', closedAnim: ['s_deep0', 's_deep1'] },
      '>': { type: 'exit', to: 'cistern', at: 'south', tile: 'culvert_d' },
      m: { ...HUNT.mutant },
      o: { ...HUNT.bloater },
      q: { ...HUNT.exterm },
      x: { ...HUNT.mutant },
    },
    extraSpawns: { fromCistern: [29, 34] },
  },

  // ================================================================= CISTERN
  cistern: {
    id: 'cistern', name: 'THE CISTERN', wallStyle: 'sewer', waterStyle: 'sludge', onEnter: 'enterCistern',
    ground: SEWER_GROUND, ground2: 's_moss', markGround: '.',
    weather: 'drip', ambient: [0.16, 0.22, 0.12], playerLight: 76, ambience: 'sewer',
    rows: carve(30, 22, ({ rect, at }) => {
      rect(3, 4, 24, 14, '.');
      rect(3, 4, 3, 14, 'w');
      rect(24, 4, 3, 14, 'w');
      rect(6, 4, 18, 2, 'w');
      rect(13, 4, 4, 2, '.');
      rect(13, 18, 4, 2, '.');
      rect(6, 7, 3, 2, '~');
      rect(21, 7, 3, 2, '~');
      rect(10, 14, 10, 1, '~');
      at('W', [7, 2], [22, 2]);
      at('<', [15, 3]);
      at('M', [15, 7]);
      at('T', [7, 12], [22, 12]);
      at('v', [12, 16], [18, 10], [9, 10]);
      at('B', [6, 17], [23, 17]);
      at('2', [18, 17]);
      at('s', [15, 19]);
      at('n', [7, 11], [8, 11], [9, 11], [10, 11], [11, 11], [12, 11], [13, 11], [14, 11], [15, 11], [16, 11], [17, 11], [18, 11], [19, 11], [20, 11], [21, 11], [22, 11], [23, 11], [6, 11]);
      at('>', [14, 20], [15, 20]);
    }),
    marks: {
      '<': { type: 'door', tile: 'ladder', wall: true, to: 'marrow', at: 'manhole', need: 'killed_mother', prompt: 'Climb', locked: 'The ladder is behind her. You will have to go through.' },
      s: { type: 'spawn', name: 'south' },
      2: { type: 'save', tile: 'box' },
      '>': { type: 'exit', to: 'sewers', at: 'fromCistern', tile: 'culvert_d' },
      n: { type: 'trigger', script: 'motherAmbush', unless: 'killed_mother' },
      M: { type: 'bossnpc', sprite: 'mother', hideIf: 'killed_mother' },
    },
    glowLights: [
      { tx: 8, ty: 8, r: 54, color: [0.45, 0.8, 0.2], flicker: 0.1 },
      { tx: 22, ty: 8, r: 54, color: [0.45, 0.8, 0.2], flicker: 0.1 },
      { tx: 15, ty: 6, r: 80, color: [0.5, 0.75, 0.25], flicker: 0.12 },
    ],
    extraSpawns: { top: [15, 4] },
  },

  // ================================================================== MARROW
  marrow: {
    id: 'marrow', name: 'MARROW LANE', wallStyle: 'brick', onEnter: 'enterMarrow',
    ground: CITY_GROUND, ground2: WALK_GROUND, markGround: '.',
    weather: 'drizzle', ambient: [0.3, 0.27, 0.27], playerLight: 74, ambience: 'lane', calm: true,
    styleRegions: [{ x: 30, y: 0, w: 14, h: 5, style: 'house' }],
    rows: carve(44, 16, ({ rect, at, put }) => {
      rect(1, 5, 42, 2, ',');
      rect(1, 7, 42, 4, '.');
      rect(1, 11, 42, 2, ',');
      // The little house at the end of the lane
      at('Y', [33, 3], [39, 3]);
      at('K', [36, 4]);
      at('b', [37, 5]);
      at('W', [4, 3], [9, 3], [14, 3], [19, 3], [24, 3]);
      at('P', [12, 3]);
      at('W', [7, 14], [16, 14], [26, 14], [36, 14]);
      at('L', [6, 5], [16, 5], [26, 5], [34, 11]);
      at('s', [2, 9]);
      at('m', [2, 10]);
      at('%', [8, 8], [19, 9], [27, 10], [31, 7], [13, 10]);
      at('y', [12, 8]);
      put(11, 11, 'T');
      put(21, 5, 'c');
      at('e', [10, 6]);
      for (let y = 5; y <= 12; y += 1) at('f', [22, y]);
      for (let y = 5; y <= 12; y += 1) at('h', [30, y]);
    }),
    marks: {
      s: { type: 'spawn', name: 'manhole' },
      m: { type: 'door', tile: 'manhole', to: 'cistern', at: 'top', solid: false, prompt: 'Go back down' },
      K: { type: 'script', tile: 'door_home', wall: true, script: 'homeDoor', prompt: 'Scratch', light: { r: 90, color: [1, 0.78, 0.42], flicker: 0.03, dy: 8 } },
      b: { type: 'script', tile: 'bowl_full', on: ',', script: 'stepBowl', solid: false, prompt: 'Sniff' },
      e: { type: 'sign', tile: 'sign_post', on: ',', solid: true, prompt: 'Read', lines: ['MARROW LANE.', 'Someone has been sweeping this pavement. You stop and stare at that for a while.'] },
      f: { type: 'trigger', script: 'rainThins', unless: 'rain_thinned' },
      h: { type: 'trigger', script: 'almostHome', unless: 'almost_home' },
    },
    extraSpawns: { doorstep: [36, 5] },
  },

  // =================================================================== HOUSE
  house: {
    id: 'house', name: '14 MARROW LANE', wallStyle: 'house',
    ground: 'wood', ground2: 'carpet', markGround: ';',
    weather: 'none', noLighting: true, ambience: 'home', calm: true,
    rows: carve(18, 12, ({ rect, at, put }) => {
      rect(2, 4, 14, 6, ';');
      rect(5, 5, 7, 4, 'R');
      at('Q', [3, 3]);
      at('w', [8, 2], [13, 2]);
      at('<', [9, 10]);
      at('s', [9, 9]);
      at('1', [6, 5]);
      at('t', [2, 4]);
      put(14, 4, 'be');
      at('c', [12, 8]);
      at('T', [2, 9], [15, 9]);
    }),
    marks: {
      Q: { type: 'decor', tile: 'hearth0', wall: true, anim: ['hearth0', 'hearth1'], light: { r: 70, color: [1, 0.6, 0.25], flicker: 0.1 } },
      w: { wall: true, type: 'decor', tile: 'window_rain' },
      '<': { type: 'sign', tile: 'door_home', wall: true, prompt: 'Look', lines: ['The door is shut. For once that is a good thing.', 'Outside, the rain is somebody else\'s problem.'] },
      s: { type: 'spawn', name: 'door', on: ';' },
      1: { type: 'npc', sprite: 'lady', face: 'down', script: 'lady', name: 'The Old Woman', on: 'R', prompt: 'Rub against' },
      t: { type: 'decor', tile: 'plant_pot', on: ';', solid: true },
      b: { type: 'script', tile: 'bed_l', on: ';', script: 'bed', solid: true, prompt: 'Curl up' },
      e: { type: 'script', tile: 'bed_r', on: ';', script: 'bed', solid: true, prompt: 'Curl up' },
      c: { type: 'script', tile: 'bowl_full', on: ';', script: 'bowl', solid: true, prompt: 'Eat', altFlag: 'ate_home', altTile: 'bowl_empty' },
      T: { type: 'decor', tile: 'chair', on: ';', solid: true },
    },
    music: 'home',
  },
};
