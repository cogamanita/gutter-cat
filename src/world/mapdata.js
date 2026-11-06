// Turns a map definition into grids the engine can use. Pure logic, no Phaser,
// so tests can run it. Each character means either a global tile (LEGEND) or a
// per-map entity (map.marks).

const STYLE = {
  brick: { top: 'brick_top', up: 'brick_up', low: 'brick_low' },
  concrete: { top: 'conc_top', up: 'conc_up', low: 'conc_low' },
  sewer: { top: 'sewer_top', up: 'sewer_up', low: 'sewer_low' },
  house: { top: 'house_top', up: 'house_up', low: 'house_low' },
};

// g: ground, o: object drawn above ground, solid: blocks walking
// wet: splash sound, danger: rolls for random encounters, light: emits light
export const LEGEND = {
  ' ': { g: 'void', solid: true },
  '#': { wall: true },
  W: { wall: true, overlay: 'window_board' },
  Y: { wall: true, overlay: 'window_lit', light: { r: 58, color: [1, 0.72, 0.32], flicker: 0.03, dy: 10 } },
  P: { wall: true, overlay: 'poster_torn' },
  '.': { ground1: true },
  ',': { ground2: true },
  '~': { water: 'shallow', wet: true },
  w: { water: 'deep', solid: true },
  '%': { g: 'puddle', anim: 'puddle', wet: true },
  '=': { ground1: true, o: 'fence', solid: true },
  t: { ground1: true, o: 'trash', danger: true },
  T: { ground1: true, o: 'bags', solid: true },
  D: { ground1: true, o: 'dumpster_l', solid: true },
  d: { ground1: true, o: 'dumpster_r', solid: true },
  c: { ground1: true, o: 'can', solid: true },
  B: { ground1: true, o: 'barrel', solid: true },
  F: { ground1: true, o: 'fire0', anim: 'fire', solid: true, light: { r: 76, color: [1, 0.55, 0.22], flicker: 0.14 } },
  C: { ground1: true, o: 'crate', solid: true },
  L: { ground1: true, o: 'lamp_base', top: 'lamp_top', solid: true, light: { r: 84, color: [0.95, 0.78, 0.5], flicker: 0.06, dy: -8 } },
  l: { ground1: true, o: 'lamp_base', top: 'lamp_dead', solid: true },
  X: { ground1: true, o: 'rubble', solid: true },
  x: { ground1: true, o: 'rubble_s' },
  o: { ground1: true, o: 'tire', solid: true },
  g: { g: 'grate' },
  ':': { g: 'planks' },
  '"': { g: 'grass_dead', danger: true },
  _: { g: 'checker' },
  ';': { g: 'wood' },
  z: { g: 'carpet' },
  R: { g: 'carpet' },
  A: { ground1: true, o: 'car_tl', solid: true },
  E: { ground1: true, o: 'car_tm', solid: true },
  I: { ground1: true, o: 'car_tr', solid: true },
  O: { ground1: true, o: 'car_bl', solid: true },
  U: { ground1: true, o: 'car_bm', solid: true },
  V: { ground1: true, o: 'car_br', solid: true },
  '|': { ground1: true, o: 'pipe', solid: true },
  v: { ground1: true, o: 'bones' },
  y: { ground1: true, o: 'bottle' },
  H: { ground1: true, o: 'carcass', solid: true },
  N: { ground1: true, o: 'table', solid: true },
};

// A proper integer hash: simple multiples of x and y make visible diagonal patterns.
function hash2(x, y) {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) % 997;
}

const pickVariant = (ground, n) => (Array.isArray(ground) ? ground[n % ground.length] : ground);

export function parseMap(def) {
  const w = def.rows.reduce((m, r) => Math.max(m, r.length), 0);
  const h = def.rows.length;
  const chars = def.rows.map((r) => r.padEnd(w, '#'));
  const under = def.rows.under || null;
  const marks = def.marks || {};
  const baseStyle = STYLE[def.wallStyle || 'brick'];

  const styleAt = (x, y) => {
    for (const r of def.styleRegions || []) {
      if (x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h) return STYLE[r.style];
    }
    return baseStyle;
  };

  const isWallAt = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return true;
    const ch = chars[y][x];
    if (marks[ch]) return !!marks[ch].wall;
    return !!(LEGEND[ch] && LEGEND[ch].wall);
  };

  // What was this square before an object or entity was placed on it?
  const floorUnder = (x, y) => {
    const ch = under && under[y][x];
    return ch && ch !== '#' && LEGEND[ch] ? ch : null;
  };

  const groundName = (leg, noise) => {
    if (leg.g) return leg.g;
    if (leg.ground2) return pickVariant(def.ground2 || def.ground, noise);
    if (leg.water === 'shallow') return def.waterStyle === 'sludge' ? 's_shallow0' : 'gutter0';
    if (leg.water === 'deep') return def.waterStyle === 'sludge' ? 's_deep0' : 'deep0';
    return pickVariant(def.ground, noise);
  };

  const cells = [];
  const entities = [];
  const lights = [];
  const anim = [];

  for (let y = 0; y < h; y += 1) {
    const row = [];
    for (let x = 0; x < w; x += 1) {
      const ch = chars[y][x];
      const mark = marks[ch] || null;
      const leg = mark ? null : (LEGEND[ch] || LEGEND['#']);
      const noise = hash2(x, y);
      const cell = { x, y, ground: null, object: null, overhead: null, solid: false, wet: false, danger: false, ch };

      const wallHere = mark ? !!mark.wall : !!leg.wall;
      if (wallHere) {
        const s = styleAt(x, y);
        if (!isWallAt(x, y + 1)) cell.ground = s.low;
        else if (!isWallAt(x, y + 2)) cell.ground = s.up;
        else cell.ground = s.top;
        cell.solid = true;
        if (leg && leg.overlay && cell.ground !== s.top) cell.object = leg.overlay;
      } else {
        let groundChar = ch;
        if (mark) groundChar = mark.on || floorUnder(x, y) || def.markGround || '.';
        else if (leg.ground1 || leg.ground2) groundChar = leg.ground2 ? ch : (floorUnder(x, y) || '.');
        const gLeg = LEGEND[groundChar] || LEGEND['.'];
        cell.ground = groundName(gLeg, noise);
        if (gLeg.wet) cell.wet = true;
        if (gLeg.solid) cell.solid = true;
        if (gLeg.danger) cell.danger = true;
        if (gLeg.water === 'shallow' && def.dangerWater !== false && def.waterStyle === 'sludge') cell.danger = true;
        if (gLeg.water) {
          const sl = def.waterStyle === 'sludge';
          const deep = gLeg.water === 'deep';
          anim.push({
            x, y, layer: 'ground',
            a: deep ? (sl ? 's_deep0' : 'deep0') : (sl ? 's_shallow0' : 'gutter0'),
            b: deep ? (sl ? 's_deep1' : 'deep1') : (sl ? 's_shallow1' : 'gutter1'),
          });
        }
        if (gLeg.anim === 'puddle') anim.push({ x, y, layer: 'ground', a: 'puddle', b: 'puddle1' });
      }

      if (leg) {
        if (leg.o) cell.object = leg.o;
        if (leg.solid) cell.solid = true;
        if (leg.danger) cell.danger = true;
        if (leg.anim === 'fire') anim.push({ x, y, layer: 'object', a: 'fire0', b: 'fire1' });
        if (leg.top) cell.overheadAbove = leg.top;
        if (leg.light) lights.push({ tx: x, ty: y, ...leg.light, flicker: leg.light.flicker || 0, dy: leg.light.dy || 0 });
      }

      if (mark) {
        if (mark.tile) cell.object = mark.tile;
        if (mark.solid === true) cell.solid = true;
        if (mark.danger) cell.danger = true;
        if (mark.anim) anim.push({ x, y, layer: 'object', a: mark.anim[0], b: mark.anim[1] });
        if (mark.type !== 'decor') entities.push({ ...mark, x, y, key: `${def.id}:${x},${y}` });
        if (mark.light) lights.push({ tx: x, ty: y, ...mark.light, flicker: mark.light.flicker || 0, dy: mark.light.dy || 0 });
      }

      row.push(cell);
    }
    cells.push(row);
  }

  for (const h2 of def.extraHunters || []) {
    entities.push({ ...h2, key: `${def.id}:${h2.x},${h2.y}` });
  }
  for (const l of def.glowLights || []) lights.push({ ...l, dy: l.dy || 0 });

  // Lamp posts and the like draw a second tile above themselves.
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const c = cells[y][x];
      if (c.overheadAbove && y > 0) cells[y - 1][x].overhead = c.overheadAbove;
      delete c.overheadAbove;
    }
  }

  const spawns = {};
  for (const e of entities) if (e.type === 'spawn') spawns[e.name] = { x: e.x, y: e.y };
  for (const [name, [x, y]] of Object.entries(def.extraSpawns || {})) spawns[name] = { x, y };

  return { id: def.id, def, w, h, cells, entities, lights, anim, spawns };
}

/** Does an entity currently block walking, given story flags? */
export function entityBlocks(e, flags) {
  if (e.hideIf && flags && flags[e.hideIf]) return false;
  switch (e.type) {
    case 'npc':
    case 'bossnpc':
      return true;
    case 'loot':
    case 'save':
    case 'script':
    case 'sign':
    case 'door':
      return e.solid !== false;
    case 'gate':
      return !(flags && flags[e.flag]);
    default:
      return false;
  }
}

/** Is a square walkable, ignoring moving actors? */
export function isWalkable(parsed, x, y, flags) {
  if (x < 0 || y < 0 || x >= parsed.w || y >= parsed.h) return false;
  if (parsed.cells[y][x].solid) return false;
  return !parsed.entities.some((e) => e.x === x && e.y === y && entityBlocks(e, flags));
}
