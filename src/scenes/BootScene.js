import Phaser from 'phaser';
import { createFont, glyphGrid } from '../art/font.js';
import { createTileset } from '../art/tiles.js';
import { createSprites } from '../art/sprites.js';
import { buildBattleArt, portraits } from '../art/battle.js';
import {
  battleBackdrop, titleBackdrop, titleLogo, endingPicture, sleepingCat,
  deadCatBackdrop, vignetteTexture, scanlineTexture, fogTexture, iconFrames,
} from '../art/scenery.js';
import { addSheet } from '../art/pixel.js';

/** Draws every asset in the game. There is nothing to download. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    const add = (key, pb) => this.textures.addCanvas(key, pb.toCanvas());

    createFont(this);
    this.registry.set('tileIndex', createTileset(this));

    const art = buildBattleArt();
    for (const [key, pb] of Object.entries(art)) add(key, pb);
    for (const [key, pb] of Object.entries(portraits())) add(`face_${key}`, pb);

    createSprites(this, [
      ['grease', art.b_grease, 0.42],
      ['mother', art.b_mother, 0.52],
      ['bloater', art.b_bloater, 0.34],
    ]);

    add('bg_gutter', battleBackdrop('gutter'));
    add('bg_district', battleBackdrop('district'));
    add('bg_sewer', battleBackdrop('sewer'));
    add('bg_title', titleBackdrop());
    add('logo', titleLogo(glyphGrid));
    add('bg_ending', endingPicture());
    add('sleepcat', sleepingCat());
    add('bg_dead', deadCatBackdrop());
    add('vignette', vignetteTexture());
    add('scanlines', scanlineTexture());
    add('fog', fogTexture());
    addSheet(this, 'icons', iconFrames(), 10, 8);

    this.scene.start('Title');
  }
}
