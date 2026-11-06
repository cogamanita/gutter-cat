import Phaser from 'phaser';
import { GAME_W, GAME_H, TILE, STEP_MS, UI } from '../config.js';
import { Keys } from '../core/input.js';
import { Audio } from '../core/audio.js';
import { Session } from '../core/session.js';
import { saveGame } from '../core/save.js';
import {
  addItem, removeItem, hasItem, effectiveStats, gainXp, setQuest, questStage, heal,
  STARVING_AT, INSTINCTS, applyInstinct,
} from '../core/state.js';
import { MAPS } from '../data/maps.js';
import { ITEMS } from '../data/items.js';
import { ENCOUNTERS } from '../data/enemies.js';
import { SCRIPTS } from '../data/scripts.js';
import { parseMap, isWalkable, entityBlocks } from '../world/mapdata.js';
import { LightMap } from '../systems/lighting.js';
import { Weather } from '../systems/weather.js';
import { wait } from '../ui/widgets.js';

const DEPTH = { ground: 0, object: 1, actor: 100, overhead: 5000, weatherLow: 6000, light: 7000, weather: 7100, vignette: 7200 };
const DIR = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const GRACE_MS = 2600;
const REST_COST = 12;

// Where each creature's eyes sit, so they can shine out of the dark.
const EYES = {
  rat: { x: 3, y: 8, tint: 0xd04030 },
  mutant: { x: 3, y: 8, tint: 0xc8e040 },
  dog: { x: 4, y: 12, tint: 0xe0a030 },
  hound: { x: 4, y: 12, tint: 0xe83020 },
  bloater: { x: 8, y: 18, tint: 0xc8e040 },
  drunk: { x: 0, y: 19, tint: 0x8a7a60 },
  knife: { x: 0, y: 19, tint: 0xa08a70 },
  exterm: { x: 0, y: 19, tint: 0xc8e070 },
};

const parsedCache = {};
function getMap(id) {
  if (!parsedCache[id]) parsedCache[id] = parseMap(MAPS[id]);
  return parsedCache[id];
}

// ------------------------------------------------------------------- Actors
class Actor {
  constructor(scene, texture, tx, ty) {
    this.scene = scene;
    this.texture = texture;
    this.tx = tx;
    this.ty = ty;
    this.px = tx * TILE;
    this.py = ty * TILE;
    this.fromX = this.px;
    this.fromY = this.py;
    this.moving = false;
    this.moveT = 0;
    this.moveDur = STEP_MS;
    this.facing = 'down';
    this.flip = false;
    this.anim = 0;
    this.shadow = scene.add.image(0, 0, 'shadow').setAlpha(0.45);
    this.sprite = scene.add.sprite(0, 0, texture, 'down0').setOrigin(0.5, 1);
    this.applyPosition();
    this.applyFrame();
  }

  face(dir) {
    this.facing = dir;
    if (dir === 'left') this.flip = true;
    if (dir === 'right') this.flip = false;
    this.applyFrame();
  }

  applyFrame() {
    const base = this.facing === 'up' || this.facing === 'down' ? this.facing : 'side';
    this.sprite.setFrame(`${base}${this.anim}`);
    this.sprite.setFlipX(this.flip);
  }

  applyPosition() {
    const x = Math.round(this.px + TILE / 2);
    const y = Math.round(this.py + TILE);
    this.sprite.setPosition(x, y);
    this.sprite.setDepth(DEPTH.actor + y);
    this.shadow.setPosition(x, y - 2);
    this.shadow.setDepth(DEPTH.actor + y - 1);
  }

  moveTo(nx, ny, dur) {
    this.fromX = this.px;
    this.fromY = this.py;
    this.tx = nx;
    this.ty = ny;
    this.moving = true;
    this.moveT = 0;
    this.moveDur = dur;
  }

  /** Advances any step in progress. True on the frame it finishes. */
  tick(dt) {
    if (!this.moving) return false;
    this.moveT += dt;
    const k = Math.min(1, this.moveT / this.moveDur);
    this.px = this.fromX + (this.tx * TILE - this.fromX) * k;
    this.py = this.fromY + (this.ty * TILE - this.fromY) * k;
    const a = k < 0.5 ? 1 : 0;
    if (a !== this.anim) {
      this.anim = a;
      this.applyFrame();
    }
    this.applyPosition();
    if (k >= 1) {
      this.moving = false;
      return true;
    }
    return false;
  }

  setVisible(v) {
    this.sprite.setVisible(v);
    this.shadow.setVisible(v);
  }

  destroy() {
    this.sprite.destroy();
    this.shadow.destroy();
  }
}

// ---------------------------------------------------------- Script interface
class ScriptContext {
  constructor(world) {
    this.world = world;
    this.ui = world.ui;
  }

  get state() { return Session.state; }

  say(name, face, text) { return this.ui.say(name, face, text); }
  choose(prompt, options) { return this.ui.choose(prompt, options); }
  titleCard(text) { return this.ui.titleCard(text); }
  setBlack(on) { this.ui.setBlack(on); }
  hint(text) { this.ui.hint(text); }
  wait(ms) { return wait(this.world, ms); }
  sfx(name) { Audio.play(name); }
  shake(ms) { this.world.cameras.main.shake(ms, 0.006); }
  warmFlash() { this.ui.warmFlash(); }

  flag(k, v = true) { Session.state.flags[k] = v; }
  flagged(k) { return !!Session.state.flags[k]; }
  has(id) {
    return hasItem(Session.state, id) || Object.values(Session.state.equip).includes(id);
  }
  give(id, n = 1) {
    addItem(Session.state, id, n);
    Audio.play('pickup');
    this.ui.toast(`Got: ${ITEMS[id].name}${n > 1 ? ` x${n}` : ''}`, UI.accent);
  }
  take(id, n = 1) { removeItem(Session.state, id, n); }
  itemName(id) { return ITEMS[id].name; }
  effective() { return effectiveStats(Session.state); }
  gainXp(n) {
    const levels = gainXp(Session.state, n);
    this.ui.toast(`+${n} XP`, UI.accent);
    if (levels) this.world.pendingLevelUp = true;
  }

  mainStage() { return questStage(Session.state, 'main'); }
  questStage(id) { return questStage(Session.state, id); }
  setQuest(id, stage, done = false) {
    setQuest(Session.state, id, stage, done);
    this.ui.toast('Journal updated', UI.good);
  }
  /** Move the main quest forward, never backward. */
  advance(id, stage) {
    if (questStage(Session.state, id) < stage) {
      setQuest(Session.state, id, stage);
      Audio.play('select');
      this.ui.toast('Objective updated', UI.good);
    }
  }

  save(slot = 'auto') { this.world.saveNow(slot); }
  battle(group, opts) { return this.world.startBattle(group, opts); }
  travel(map, at) { return this.world.travel(map, at); }
  refreshEntities() { this.world.refreshEntities(); }
  setWeather(kind) { this.world.weather.set(kind); }
  setMusic(kind) { Audio.setMusic(kind); }
  setEntityTile(e, tile) { this.world.setObjectTile(e.x, e.y, tile); }
  ending() { return this.world.goToEnding(); }
}

// ----------------------------------------------------------------- The scene
export class WorldScene extends Phaser.Scene {
  constructor() {
    super('World');
  }

  create() {
    this.tiles = this.registry.get('tileIndex');
    this.busy = 1; // hold input until the UI scene is up
    this.layers = [];
    this.actors = [];
    this.hunters = [];
    this.pickups = [];
    this.lootGlints = [];
    this.bump = 0;
    this.grace = 0;
    this.sinceEncounter = 0;
    this.animToggle = false;
    this.animTimer = 0;
    this.pendingLevelUp = false;

    this.cameras.main.setRoundPixels(true);
    this.lightMap = new LightMap(this, DEPTH.light);
    this.weather = new Weather(this, DEPTH.weather);
    this.add.image(0, 0, 'vignette').setOrigin(0).setScrollFactor(0).setDepth(DEPTH.vignette);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.lightMap.destroy();
      this.weather.destroy();
    });

    this.scene.launch('UI');
    this.ui = this.scene.get('UI');
    this.ui.events.once(Phaser.Scenes.Events.CREATE, () => this.begin());
    this.ctx = null;
  }

  begin() {
    this.ctx = new ScriptContext(this);
    const s = Session.state;
    if (s.x !== null && s.x !== undefined) this.loadMap(s.map, { x: s.x, y: s.y, facing: s.facing });
    else this.loadMap(s.map, { at: s.spawn });
    this.busy = 0;
    this.ui.setHud(true);
    this.ui.areaCard(this.map.def.name);
    if (!s.flags.intro_done) this.runScript('intro');
  }

  // ---------------------------------------------------------------- Maps
  loadMap(id, where) {
    const s = Session.state;
    this.clearMap();
    const map = getMap(id);
    this.map = map;
    s.map = id;

    const grid = (fn) => map.cells.map((row) => row.map(fn));
    const layerOf = (data, depth) => {
      const tm = this.make.tilemap({ data, tileWidth: TILE, tileHeight: TILE });
      const ts = tm.addTilesetImage('tiles', 'tiles', TILE, TILE, 0, 0);
      const layer = tm.createLayer(0, ts, 0, 0).setDepth(depth);
      this.layers.push({ tm, layer });
      return layer;
    };
    this.groundLayer = layerOf(grid((c) => this.tiles[c.ground] ?? 0), DEPTH.ground);
    this.objectLayer = layerOf(grid((c) => (c.object ? this.tiles[c.object] ?? -1 : -1)), DEPTH.object);
    this.overheadLayer = layerOf(grid((c) => (c.overhead ? this.tiles[c.overhead] ?? -1 : -1)), DEPTH.overhead);

    // Player
    let tx;
    let ty;
    if (where.at !== undefined) {
      const sp = map.spawns[where.at] || Object.values(map.spawns)[0] || { x: 1, y: 1 };
      tx = sp.x;
      ty = sp.y;
    } else {
      tx = where.x;
      ty = where.y;
    }
    this.player = new Actor(this, 'cat', tx, ty);
    this.player.face(where.facing || 'down');

    this.buildEntities();

    // World lights
    this.lightsWorld = map.lights.map((l) => ({
      x: l.tx * TILE + TILE / 2,
      y: l.ty * TILE + TILE / 2 + (l.dy || 0),
      r: l.r,
      color: l.color,
      flicker: l.flicker || 0,
      intensity: 1,
      seed: Math.random() * 100,
    }));

    const def = map.def;
    this.lightMap.setVisible(!def.noLighting);
    this.weather.set(s.flags.rain_thinned && id === 'marrow' ? 'drizzle_light' : (def.weather || 'none'));
    Audio.setAmbience(def.ambience || 'none');
    Audio.setMusic(def.music || 'none');

    this.updateCamera();
    this.refreshEntities();
    if (this.ui.scene.isActive()) this.ui.prompt(null);
    this.sinceEncounter = 0;
  }

  clearMap() {
    for (const { tm } of this.layers) tm.destroy();
    this.layers = [];
    for (const a of this.actors) a.actor.destroy();
    this.actors = [];
    for (const h of this.hunters) this.destroyHunter(h);
    this.hunters = [];
    for (const p of this.pickups) p.sprite.destroy();
    this.pickups = [];
    if (this.player) this.player.destroy();
    this.player = null;
  }

  buildEntities() {
    const s = Session.state;
    for (const e of this.map.entities) {
      if (e.type === 'hunter') {
        const killedAt = s.killed[e.key];
        if (killedAt !== undefined && s.steps - killedAt < 450) continue;
        const actor = new Actor(this, e.sprite, e.x, e.y);
        actor.face(Math.random() < 0.5 ? 'left' : 'right');
        this.hunters.push({
          e, actor, homeX: e.x, homeY: e.y, state: 'wander',
          timer: 300 + Math.random() * 1500, lost: 0, alert: null,
          eyes: this.add.image(0, 0, 'eyes').setDepth(DEPTH.light + 1).setTint(EYES[e.sprite] ? EYES[e.sprite].tint : 0xc04030),
        });
      } else if (e.type === 'npc' || e.type === 'bossnpc') {
        const actor = new Actor(this, e.sprite, e.x, e.y);
        actor.face(e.face || 'down');
        if (e.sprite === 'mother') actor.shadow.setVisible(false);
        this.actors.push({ e, actor });
      } else if (e.type === 'pickup') {
        const sprite = this.add.image(e.x * TILE + TILE / 2, e.y * TILE + TILE / 2, 'glint').setDepth(DEPTH.actor);
        this.pickups.push({ e, sprite });
      }
      if (e.altFlag && s.flags[e.altFlag.replace('{x}', e.x)]) this.setObjectTile(e.x, e.y, e.altTile);
    }
  }

  /** Re-applies everything that depends on story flags. */
  refreshEntities() {
    const s = Session.state;
    for (const a of this.actors) {
      const hidden = a.e.hideIf && s.flags[a.e.hideIf];
      a.actor.setVisible(!hidden);
    }
    for (const p of this.pickups) p.sprite.setVisible(!s.looted[p.e.key]);
    for (const e of this.map.entities) {
      if (e.type === 'gate') {
        const open = s.flags[e.flag];
        const tile = this.groundLayer.getTileAt(e.x, e.y, true);
        if (tile) tile.index = this.tiles[open ? e.open : e.closed];
      }
    }
  }

  setObjectTile(x, y, name) {
    this.objectLayer.putTileAt(this.tiles[name], x, y);
  }

  // ------------------------------------------------------------- Movement
  flags() {
    return Session.state.flags;
  }

  canWalk(x, y) {
    if (!isWalkable(this.map, x, y, this.flags())) return false;
    for (const a of this.actors) {
      if (a.actor.tx === x && a.actor.ty === y && !(a.e.hideIf && this.flags()[a.e.hideIf])) return false;
    }
    return true;
  }

  updatePlayer(dt) {
    const p = this.player;
    if (p.tick(dt)) this.onStep();
    if (p.moving || this.busy) return;

    const dir = Keys.direction();
    if (dir) {
      const turned = dir !== p.facing;
      p.face(dir);
      const [dx, dy] = DIR[dir];
      if (this.canWalk(p.tx + dx, p.ty + dy)) {
        p.moveTo(p.tx + dx, p.ty + dy, STEP_MS);
        const cell = this.map.cells[p.ty][p.tx];
        if (cell.wet) Audio.play('splash');
        else if (cell.object === 'trash') Audio.play('rustle');
        else Audio.play('step');
      } else if (!turned && this.time.now > this.bump) {
        this.bump = this.time.now + 260;
        Audio.play('bump');
      }
    } else if (p.anim !== 0) {
      p.anim = 0;
      p.applyFrame();
    }

    if (Keys.take('confirm')) this.interact();
    if (Keys.take('menu')) this.openMenu();
  }

  onStep() {
    const s = Session.state;
    const p = this.player;
    s.steps += 1;
    this.sinceEncounter += 1;

    // Hunger, wounds and poison all tick as you walk.
    if (s.steps % 10 === 0) {
      s.stats.hunger = Math.max(0, s.stats.hunger - 1);
      if (s.stats.hunger === STARVING_AT - 1) this.hintOnce('hint_hungry', 'You are getting weak with hunger. Your attack suffers. Open the menu (ESC) and eat something.');
    }
    const eff = effectiveStats(s);
    if (s.stats.hunger === 0 && s.steps % 6 === 0) {
      if (s.stats.hp > 1) {
        s.stats.hp -= 1;
        this.cameras.main.flash(120, 90, 10, 10);
      }
      this.hintOnce('hint_starve', 'You are starving. Your body is eating itself. Find food.');
    }
    if (s.status.poison > 0 && s.steps % 5 === 0) {
      s.status.poison -= 1;
      if (s.stats.hp > 1) s.stats.hp -= 1;
      this.cameras.main.flash(120, 40, 60, 10);
    }
    if (s.stats.hunger >= 50 && s.status.poison === 0 && s.steps % 9 === 0 && s.stats.hp < eff.hpMax) {
      heal(s, 1);
    }

    // What did we just step on?
    for (const e of this.map.entities) {
      if (e.x !== p.tx || e.y !== p.ty) continue;
      if (e.type === 'exit') {
        this.travel(e.to, e.at);
        return;
      }
      if (e.type === 'trigger' && !(e.unless && s.flags[e.unless])) {
        this.runScript(e.script, e);
        return;
      }
    }
    for (const pick of this.pickups) {
      if (pick.e.x === p.tx && pick.e.y === p.ty && !s.looted[pick.e.key]) this.takePickup(pick);
    }

    this.rollEncounter();
  }

  takePickup(pick) {
    const s = Session.state;
    s.looted[pick.e.key] = true;
    pick.sprite.setVisible(false);
    if (pick.e.caps) {
      s.caps += pick.e.caps;
      Audio.play('pickup');
      this.ui.toast(`Found ${pick.e.caps} bottlecaps`, UI.accent);
    } else {
      this.ctx.give(pick.e.item, pick.e.n || 1);
      this.hintOnce('hint_equip', 'Open the menu (ESC) to equip gear and use items.');
    }
  }

  rollEncounter() {
    const enc = this.map.def.encounters;
    if (!enc || this.busy || this.map.def.calm) return;
    if (this.sinceEncounter < 12 || this.time.now < this.grace) return;
    const p = this.player;
    const cell = this.map.cells[p.ty][p.tx];
    const rate = cell.danger ? enc.rate : (enc.base || 0);
    if (Math.random() >= rate) {
      this.scavenge(cell);
      return;
    }
    this.sinceEncounter = 0;
    const table = ENCOUNTERS[enc.table];
    const group = table[Math.floor(Math.random() * table.length)];
    this.startBattle(group, {});
  }

  /** Picking through trash sometimes turns up a scrap, so food never truly runs out. */
  scavenge(cell) {
    if (cell.object !== 'trash' || Math.random() > 0.05) return;
    this.ctx.give('crust', 1);
    this.ui.toast('You nose something edible out of the trash.', UI.good);
  }

  // -------------------------------------------------------------- Hunters
  hasSight(ax, ay, bx, by) {
    let x = ax;
    let y = ay;
    const dx = Math.abs(bx - ax);
    const dy = Math.abs(by - ay);
    const sx = ax < bx ? 1 : -1;
    const sy = ay < by ? 1 : -1;
    let err = dx - dy;
    let guard = 0;
    while ((x !== bx || y !== by) && guard < 64) {
      guard += 1;
      const e2 = err * 2;
      if (e2 > -dy) { err -= dy; x += sx; }
      if (e2 < dx) { err += dx; y += sy; }
      if (x === bx && y === by) break;
      const c = this.map.cells[y][x];
      if (c.solid && !c.ground.startsWith('deep') && !c.ground.startsWith('s_deep') && c.object !== 'fence') return false;
    }
    return true;
  }

  hunterCanWalk(h, x, y) {
    if (!this.canWalk(x, y)) return false;
    if (this.player.tx === x && this.player.ty === y) return false;
    for (const o of this.hunters) {
      if (o !== h && o.actor.tx === x && o.actor.ty === y) return false;
    }
    for (const e of this.map.entities) {
      if (e.x === x && e.y === y && (e.type === 'exit' || (e.type === 'door' && e.solid !== false))) return false;
    }
    return true;
  }

  /** First step of the shortest route to the player, within a limited search. */
  nextStepToPlayer(h) {
    const p = this.player;
    const a = h.actor;
    const start = `${a.tx},${a.ty}`;
    const target = `${p.tx},${p.ty}`;
    const queue = [[a.tx, a.ty, null]];
    const seen = new Set([start]);
    let head = 0;
    while (head < queue.length && queue.length < 500) {
      const [x, y, first] = queue[head];
      head += 1;
      for (const [dx, dy] of Object.values(DIR)) {
        const nx = x + dx;
        const ny = y + dy;
        const key = `${nx},${ny}`;
        if (seen.has(key)) continue;
        const f = first || [dx, dy];
        if (key === target) return f;
        if (!this.hunterCanWalk(h, nx, ny)) continue;
        seen.add(key);
        queue.push([nx, ny, f]);
      }
    }
    return null;
  }

  stepHunter(h, dx, dy) {
    const a = h.actor;
    if (dx < 0) a.face('left');
    else if (dx > 0) a.face('right');
    a.moveTo(a.tx + dx, a.ty + dy, h.e.speed);
  }

  updateHunters(dt) {
    const p = this.player;
    for (const h of this.hunters) {
      const a = h.actor;
      a.tick(dt);
      h.timer -= dt;

      const dist = Math.abs(a.tx - p.tx) + Math.abs(a.ty - p.ty);

      if (this.busy || this.time.now < this.grace) {
        if (h.alert) { h.alert.destroy(); h.alert = null; }
        continue;
      }

      if (dist <= 1 && !a.moving) {
        this.encounterHunter(h);
        return;
      }
      if (a.moving) continue;

      const sees = dist <= h.e.aggro && this.hasSight(a.tx, a.ty, p.tx, p.ty);
      if (h.state !== 'chase' && sees) {
        h.state = 'chase';
        h.lost = 0;
        h.alert = this.add.image(0, 0, 'alert').setDepth(DEPTH.overhead - 1);
        this.time.delayedCall(700, () => { if (h.alert) { h.alert.destroy(); h.alert = null; } });
        Audio.play(h.e.sprite === 'dog' || h.e.sprite === 'hound' ? 'bark' : (h.e.sprite === 'rat' || h.e.sprite === 'mutant') ? 'squeak' : 'alert');
        h.timer = 200;
      }
      if (h.alert) h.alert.setPosition(a.sprite.x, a.sprite.y - a.sprite.height - 6);

      if (h.state === 'chase') {
        h.lost = sees ? 0 : h.lost + dt;
        if (h.lost > 2200 || dist > h.e.aggro + 6) {
          h.state = 'wander';
          h.timer = 1000;
          continue;
        }
        if (h.timer <= 0) {
          h.timer = 0;
          const step = this.nextStepToPlayer(h);
          if (step) this.stepHunter(h, step[0], step[1]);
          else h.timer = 300;
        }
      } else if (h.timer <= 0) {
        h.timer = 500 + Math.random() * 1600;
        const opts = Object.values(DIR).filter(([dx, dy]) => {
          const nx = a.tx + dx;
          const ny = a.ty + dy;
          return Math.abs(nx - h.homeX) + Math.abs(ny - h.homeY) <= 5 && this.hunterCanWalk(h, nx, ny);
        });
        if (opts.length) {
          const [dx, dy] = opts[Math.floor(Math.random() * opts.length)];
          this.stepHunter(h, dx, dy);
        }
      }
    }
  }

  destroyHunter(h) {
    h.actor.destroy();
    if (h.eyes) h.eyes.destroy();
    if (h.alert) h.alert.destroy();
  }

  /** Eyes blink out now and then, and only show when something could see them. */
  updateEyes(time) {
    for (const h of this.hunters) {
      const a = h.actor;
      const cfg = EYES[h.e.sprite] || { x: 0, y: 10 };
      const dir = a.flip ? -1 : 1;
      h.eyes.setPosition(a.sprite.x + cfg.x * dir, a.sprite.y - cfg.y);
      const blink = Math.sin(time * 0.0017 + a.homeX * 7) > 0.97;
      h.eyes.setVisible(!blink && !this.map.def.noLighting);
      h.eyes.setAlpha(h.state === 'chase' ? 1 : 0.55);
    }
  }

  encounterHunter(h) {
    this.startBattle(h.e.group, { hunter: h });
  }

  // --------------------------------------------------------------- Battle
  startBattle(group, opts = {}) {
    return new Promise((resolve) => {
      this.busy += 1;
      this.ui.prompt(null);
      Audio.play(opts.boss ? 'stinger' : 'encounter');
      this.cameras.main.flash(180, 180, 30, 20);
      this.time.delayedCall(opts.boss ? 500 : 320, () => {
        Keys.reset();
        this.ui.setHud(false);
        this.scene.launch('Battle', {
          group,
          boss: !!opts.boss,
          bg: opts.bg || this.battleBg(),
          music: opts.music || 'battle',
          onEnd: (result) => this.afterBattle(result, opts, resolve),
        });
        this.scene.bringToTop('Battle');
        this.scene.pause();
      });
    });
  }

  battleBg() {
    const id = this.map.id;
    if (id === 'gutter') return 'gutter';
    if (id === 'sewers' || id === 'cistern') return 'sewer';
    return 'district';
  }

  afterBattle(result, opts, resolve) {
    const s = Session.state;
    this.busy -= 1;
    if (result === 'lose') {
      Audio.setHeartbeat(false);
      this.scene.stop('UI');
      this.scene.start('GameOver');
      return;
    }
    this.scene.resume();
    this.ui.setHud(true);
    Audio.setMusic(this.map.def.music || 'none');
    this.grace = this.time.now + GRACE_MS;
    this.sinceEncounter = 0;
    if (opts.hunter) {
      if (result === 'win') {
        s.killed[opts.hunter.e.key] = s.steps;
        this.destroyHunter(opts.hunter);
        this.hunters = this.hunters.filter((x) => x !== opts.hunter);
      } else {
        opts.hunter.state = 'wander';
        opts.hunter.timer = GRACE_MS;
      }
    }
    if (result === 'win' && !s.flags.hint_gear && Object.keys(s.inv).some((k) => ITEMS[k].type === 'equip')) {
      this.hintOnce('hint_gear', 'You found something useful. Equip it from the menu (ESC).');
    }
    resolve(result);
  }

  // --------------------------------------------------------- Interactions
  entityInFront() {
    const p = this.player;
    const [dx, dy] = DIR[p.facing];
    const fx = p.tx + dx;
    const fy = p.ty + dy;
    const flags = this.flags();
    const interactive = (e) => ['npc', 'loot', 'sign', 'script', 'save', 'door'].includes(e.type)
      && !(e.hideIf && flags[e.hideIf]);
    const found = this.map.entities.find((e) => e.x === fx && e.y === fy && interactive(e));
    if (found) return found;
    return this.map.entities.find((e) => e.x === p.tx && e.y === p.ty && interactive(e) && !entityBlocks(e, flags));
  }

  promptFor(e) {
    const s = Session.state;
    switch (e.type) {
      case 'loot':
        return s.looted[e.key] ? null : `[E] ${e.prompt || 'Search'}`;
      case 'save':
        return '[E] Rest and save';
      default:
        return `[E] ${e.prompt || 'Examine'}`;
    }
  }

  interact() {
    const e = this.entityInFront();
    if (!e) return;
    switch (e.type) {
      case 'npc': {
        const actor = this.actors.find((a) => a.e === e);
        if (actor) {
          const p = this.player;
          if (p.tx < e.x) actor.actor.face('left');
          else if (p.tx > e.x) actor.actor.face('right');
          else if (p.ty < e.y) actor.actor.face('up');
          else actor.actor.face('down');
        }
        this.runScript(e.script, e);
        break;
      }
      case 'loot':
        this.runInline(async () => {
          const s = Session.state;
          if (s.looted[e.key]) return;
          s.looted[e.key] = true;
          Audio.play('rustle');
          await this.ctx.say(null, null, e.text);
          if (e.item) this.ctx.give(e.item, e.n || 1);
          if (e.caps) s.caps += e.caps;
          if (e.item && ITEMS[e.item].type === 'food') this.hintOnce('hint_eat', 'Food goes in your bag. Open the menu (ESC) and use it to eat.');
          if (e.item && ITEMS[e.item].type === 'equip') this.hintOnce('hint_equip', 'Open the menu (ESC) and go to GEAR to equip this.');
        });
        break;
      case 'sign':
        this.runInline(async () => {
          Audio.play('paper');
          for (const line of e.lines) await this.ctx.say(null, null, line);
        });
        break;
      case 'script':
        this.runScript(e.script, e);
        break;
      case 'save':
        this.runInline(() => this.useSavePoint());
        break;
      case 'door':
        this.runInline(async () => {
          if (e.need && !this.ctx.flagged(e.need) && !this.ctx.has(e.need)) {
            Audio.play('bump');
            await this.ctx.say(null, null, e.locked || 'It will not open.');
            return;
          }
          Audio.play('door');
          await this.travel(e.to, e.at);
        });
        break;
      default:
    }
  }

  async useSavePoint() {
    const s = Session.state;
    Audio.setMusic('safe');
    if (!s.flags.hint_box) {
      s.flags.hint_box = true;
      await this.ctx.say(null, null, 'A dry cardboard box. Someone left a stub of candle in it. For a moment, nothing is trying to kill you.');
    }
    for (;;) {
      const eff = effectiveStats(s);
      const pick = await this.ctx.choose('The rain sounds far away.', [
        `Sleep (HP ${s.stats.hp}/${eff.hpMax} to full, Hunger -${REST_COST})`,
        'Save your progress',
        'Leave',
      ]);
      if (pick === 0) {
        if (s.stats.hp >= eff.hpMax && s.status.poison === 0) {
          await this.ctx.say(null, null, 'You are not hurt. You sit a while anyway, and then you make yourself get up.');
        } else {
          // Too hungry to sleep well, but never so hungry that resting is impossible:
          // being hurt and foodless must not be a dead end.
          const fed = s.stats.hunger >= REST_COST;
          s.stats.hp = fed ? eff.hpMax : Math.max(s.stats.hp, Math.ceil(eff.hpMax / 2));
          s.stats.hunger = Math.max(0, s.stats.hunger - REST_COST);
          s.status.poison = 0;
          Audio.play('heal');
          this.ui.toast(fed ? 'Fully rested' : 'Barely rested', UI.good);
          await this.ctx.say(null, null, fed
            ? 'You curl up tight and sleep without dreaming. You wake up hungrier.'
            : 'Hunger keeps waking you. You get a little strength back, and no more. Find food.');
        }
      } else if (pick === 1) {
        this.saveNow('manual');
        Audio.play('save');
        this.ui.toast('Progress saved', UI.good);
      } else {
        break;
      }
    }
    Audio.setMusic(this.map.def.music || 'none');
  }

  hintOnce(key, text) {
    const s = Session.state;
    if (s.flags[key]) return;
    s.flags[key] = true;
    this.ui.hint(text);
  }

  async runScript(name, ent) {
    const fn = SCRIPTS[name];
    if (!fn) return;
    await this.runInline(() => fn(this.ctx, ent));
  }

  async runInline(fn) {
    this.busy += 1;
    this.ui.prompt(null);
    try {
      await fn();
      // Experience from story events can level you up outside of battle.
      while (Session.state.pendingInstincts > 0) {
        const pick = await this.ui.choose('You have grown. A new instinct:', INSTINCTS.map((i) => `${i.name}: ${i.desc}`));
        applyInstinct(Session.state, INSTINCTS[pick].key);
        Audio.play('levelup');
      }
    } catch (err) {
      console.error('Script failed:', err);
    }
    this.busy -= 1;
    Keys.flush();
  }

  // -------------------------------------------------------------- Travel
  syncPosition() {
    const s = Session.state;
    const p = this.player;
    s.x = p.tx;
    s.y = p.ty;
    s.facing = p.facing;
    s.map = this.map.id;
  }

  saveNow(slot) {
    this.syncPosition();
    saveGame(Session.state, slot);
  }

  async travel(mapId, at) {
    this.busy += 1;
    const cam = this.cameras.main;
    this.ui.prompt(null);
    cam.fadeOut(220, 0, 0, 0);
    await wait(this, 240);
    this.loadMap(mapId, { at });
    this.ui.areaCard(this.map.def.name);
    this.saveNow('auto');
    cam.fadeIn(280, 0, 0, 0);
    await wait(this, 200);
    this.busy -= 1;
    const def = this.map.def;
    if (def.onEnter) await this.runScript(def.onEnter);
  }

  async goToEnding() {
    this.busy += 1;
    const cam = this.cameras.main;
    cam.fadeOut(1800, 255, 190, 110);
    await wait(this, 1900);
    this.scene.stop('UI');
    this.scene.start('Ending');
  }

  openMenu() {
    Keys.flush();
    this.syncPosition();
    Audio.play('select');
    this.scene.launch('Menu', { nearSave: this.nearSavePoint() });
    this.scene.bringToTop('Menu');
    this.scene.pause();
  }

  nearSavePoint() {
    const p = this.player;
    return this.map.entities.some((e) => e.type === 'save' && Math.abs(e.x - p.tx) + Math.abs(e.y - p.ty) <= 1);
  }

  // --------------------------------------------------------------- Frame
  updateCamera() {
    const cam = this.cameras.main;
    const mw = this.map.w * TILE;
    const mh = this.map.h * TILE;
    const target = (pos, view, world) => {
      if (world <= view) return Math.round((world - view) / 2);
      return Math.round(Math.max(0, Math.min(world - view, pos - view / 2)));
    };
    cam.scrollX = target(this.player.px + TILE / 2, GAME_W, mw);
    cam.scrollY = target(this.player.py + TILE / 2, GAME_H, mh);
  }

  updateLights(time) {
    const def = this.map.def;
    if (def.noLighting) return;
    const eff = effectiveStats(Session.state);
    const lights = this.lightsWorld;
    for (const l of lights) {
      l.intensity = 1 - l.flicker * (0.5 + 0.5 * Math.sin(time * 0.013 + l.seed * 3)) - (Math.random() < 0.02 ? l.flicker : 0);
    }
    const p = this.player;
    const playerLight = {
      x: p.px + TILE / 2,
      y: p.py + TILE / 2,
      r: (def.playerLight || 60) + eff.light,
      color: eff.light ? [0.62, 0.95, 0.5] : [0.8, 0.82, 0.88],
      intensity: 0.85,
    };
    this.lightMap.render(this.cameras.main, [...lights, playerLight], def.ambient || [0.3, 0.3, 0.3], this.weather.flash);
  }

  updateAnimTiles(dt) {
    this.animTimer += dt;
    if (this.animTimer < 340) return;
    this.animTimer = 0;
    this.animToggle = !this.animToggle;
    for (const a of this.map.anim) {
      const layer = a.layer === 'ground' ? this.groundLayer : this.objectLayer;
      const tile = layer.getTileAt(a.x, a.y, true);
      if (tile) tile.index = this.tiles[this.animToggle ? a.b : a.a];
    }
  }

  update(time, dt) {
    if (!this.map || !this.player) return;
    Session.state.playMs += dt;

    this.updatePlayer(dt);
    this.updateHunters(dt);
    this.updateCamera();
    this.updateAnimTiles(dt);
    this.weather.update(dt, this.cameras.main);
    this.updateLights(time);
    this.updateEyes(time);

    // Pickups glint now and then
    const blink = Math.sin(time * 0.006) > 0.2;
    for (const pk of this.pickups) {
      if (!Session.state.looted[pk.e.key]) pk.sprite.setAlpha(blink ? 1 : 0.35);
    }

    if (!this.busy && !this.player.moving) {
      const e = this.entityInFront();
      this.ui.prompt(e ? this.promptFor(e) : null);
    } else if (this.player.moving) {
      this.ui.prompt(null);
    }
  }
}
