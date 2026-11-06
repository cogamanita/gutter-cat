// Validates the world data: every map parses, everything important can be reached
// on foot, every link goes somewhere, every tile and script actually exists.
// Maps are carved by hand, so this catches the mistakes eyes miss.

import test from 'node:test';
import assert from 'node:assert/strict';
import { MAPS } from '../src/data/maps.js';
import { SCRIPTS } from '../src/data/scripts.js';
import { ITEMS } from '../src/data/items.js';
import { ENEMIES } from '../src/data/enemies.js';
import { parseMap, isWalkable } from '../src/world/mapdata.js';
import { TILE_NAMES } from '../src/art/tiles.js';

const parsed = Object.fromEntries(Object.entries(MAPS).map(([id, def]) => [id, parseMap(def)]));

// Story flags that hold at the end of the game, so every gate counts as open.
const ALL_OPEN = {
  killed_grease: true, killed_catcher: true, killed_mother: true, sluice_open: true,
};

function floodFill(map, sx, sy, flags) {
  const seen = new Set([`${sx},${sy}`]);
  const stack = [[sx, sy]];
  while (stack.length) {
    const [x, y] = stack.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      const key = `${nx},${ny}`;
      if (seen.has(key) || !isWalkable(map, nx, ny, flags)) continue;
      seen.add(key);
      stack.push([nx, ny]);
    }
  }
  return seen;
}

const near = (seen, e) => seen.has(`${e.x},${e.y}`)
  || [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen.has(`${e.x + dx},${e.y + dy}`));

for (const [id, map] of Object.entries(parsed)) {
  test(`${id}: every entity can be reached`, () => {
    const start = Object.values(map.spawns)[0];
    assert.ok(start, `${id} has no spawn point`);
    const seen = floodFill(map, start.x, start.y, ALL_OPEN);
    for (const e of map.entities) {
      if (e.type === 'spawn') continue;
      assert.ok(near(seen, e), `${id}: ${e.type} at ${e.x},${e.y} (${e.script || e.item || e.sprite || ''}) is unreachable`);
    }
  });

  test(`${id}: all spawn points stand on open ground`, () => {
    for (const [name, sp] of Object.entries(map.spawns)) {
      assert.ok(isWalkable(map, sp.x, sp.y, ALL_OPEN), `${id}: spawn "${name}" at ${sp.x},${sp.y} is blocked`);
    }
  });

  test(`${id}: all tiles exist in the tileset`, () => {
    for (const row of map.cells) {
      for (const c of row) {
        assert.ok(TILE_NAMES.includes(c.ground), `${id}: unknown ground "${c.ground}"`);
        if (c.object) assert.ok(TILE_NAMES.includes(c.object), `${id}: unknown object "${c.object}"`);
        if (c.overhead) assert.ok(TILE_NAMES.includes(c.overhead), `${id}: unknown overhead "${c.overhead}"`);
      }
    }
    for (const a of map.anim) {
      assert.ok(TILE_NAMES.includes(a.a) && TILE_NAMES.includes(a.b), `${id}: unknown animated tile`);
    }
  });

  test(`${id}: references to scripts, items, maps and enemies are valid`, () => {
    if (map.def.onEnter) assert.ok(SCRIPTS[map.def.onEnter], `missing script ${map.def.onEnter}`);
    for (const e of map.entities) {
      if (e.script) assert.ok(SCRIPTS[e.script], `${id}: missing script ${e.script}`);
      if (e.item) assert.ok(ITEMS[e.item], `${id}: missing item ${e.item}`);
      if (e.to) {
        assert.ok(parsed[e.to], `${id}: link to unknown map ${e.to}`);
        assert.ok(parsed[e.to].spawns[e.at], `${id}: link to unknown spawn ${e.to}/${e.at}`);
      }
      if (e.group) e.group.forEach((g) => assert.ok(ENEMIES[g], `${id}: unknown enemy ${g}`));
    }
  });

  test(`${id}: the player cannot walk off the edge of the map`, () => {
    const start = Object.values(map.spawns)[0];
    const seen = floodFill(map, start.x, start.y, ALL_OPEN);
    const exits = new Set(map.entities.filter((e) => e.type === 'exit').map((e) => `${e.x},${e.y}`));
    for (const key of seen) {
      const [x, y] = key.split(',').map(Number);
      const onEdge = x === 0 || y === 0 || x === map.w - 1 || y === map.h - 1;
      if (onEdge) assert.ok(exits.has(key), `${id}: open edge square at ${key}`);
    }
  });
}

test('story gates really do block progress until opened', () => {
  // The Sewers: with the sluice closed, the Cistern exit cannot be reached.
  const sewers = parsed.sewers;
  const closed = floodFill(sewers, sewers.spawns.entry.x, sewers.spawns.entry.y, {});
  const exit = sewers.entities.find((e) => e.type === 'exit');
  assert.ok(!closed.has(`${exit.x},${exit.y}`), 'sewer exit reachable before draining');
  const open = floodFill(sewers, sewers.spawns.entry.x, sewers.spawns.entry.y, ALL_OPEN);
  assert.ok(open.has(`${exit.x},${exit.y}`), 'sewer exit unreachable after draining');
});

test('the Grease and Mother triggers cannot be walked around', () => {
  // Removing trigger squares must cut the map in two: there is no way past them.
  for (const [id, script] of [['gutter', 'greaseAmbush'], ['cistern', 'motherAmbush']]) {
    const map = parsed[id];
    const triggers = new Set(map.entities.filter((e) => e.script === script).map((e) => `${e.x},${e.y}`));
    const start = Object.values(map.spawns)[0];
    const seen = new Set([`${start.x},${start.y}`]);
    const stack = [[start.x, start.y]];
    while (stack.length) {
      const [x, y] = stack.pop();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx;
        const ny = y + dy;
        const key = `${nx},${ny}`;
        if (seen.has(key) || triggers.has(key) || !isWalkable(map, nx, ny, {})) continue;
        seen.add(key);
        stack.push([nx, ny]);
      }
    }
    const beyond = id === 'gutter'
      ? map.entities.find((e) => e.type === 'exit')
      : map.entities.find((e) => e.type === 'door' && e.to === 'marrow');
    assert.ok(!near(seen, beyond), `${id}: can walk around the ${script} trigger`);
  }
});

test('the Catcher\'s yard triggers cover every way in', () => {
  const map = parsed.district;
  const triggers = new Set(map.entities.filter((e) => e.script === 'catcherAmbush').map((e) => `${e.x},${e.y}`));
  const start = map.spawns.fromGutter;
  const seen = new Set([`${start.x},${start.y}`]);
  const stack = [[start.x, start.y]];
  while (stack.length) {
    const [x, y] = stack.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      const key = `${nx},${ny}`;
      if (seen.has(key) || triggers.has(key) || !isWalkable(map, nx, ny, {})) continue;
      seen.add(key);
      stack.push([nx, ny]);
    }
  }
  const boss = map.entities.find((e) => e.sprite === 'catcher');
  assert.ok(!near(seen, boss), 'you can reach the Catcher without triggering him');
});
