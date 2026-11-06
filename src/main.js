import Phaser from 'phaser';
import { GAME_W, GAME_H } from './config.js';
import { Keys } from './core/input.js';
import { Audio } from './core/audio.js';
import { Session } from './core/session.js';
import { BootScene } from './scenes/BootScene.js';
import { TitleScene } from './scenes/TitleScene.js';
import { WorldScene } from './scenes/WorldScene.js';
import { UIScene } from './scenes/UIScene.js';
import { BattleScene } from './scenes/BattleScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';
import { EndingScene } from './scenes/EndingScene.js';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_W,
  height: GAME_H,
  backgroundColor: '#000000',
  pixelArt: true,
  roundPixels: true,
  antialias: false,
  disableContextMenu: true,
  banner: false,
  audio: { noAudio: true }, // all sound goes through our own Web Audio engine
  scale: { mode: Phaser.Scale.NONE },
  fps: { target: 60 },
  scene: [BootScene, TitleScene, WorldScene, UIScene, BattleScene, MenuScene, GameOverScene, EndingScene],
});

// Whole-number scaling keeps pixels square and the small font crisp. Fall back to
// fractional scaling only when an integer scale would waste too much of the window.
function applyScale() {
  const z = Math.min(window.innerWidth / GAME_W, window.innerHeight / GAME_H);
  const whole = Math.floor(z);
  game.scale.setZoom(whole >= 1 && whole / z >= 0.8 ? whole : z);
}
game.events.once(Phaser.Core.Events.READY, applyScale);
window.addEventListener('resize', applyScale);

Keys.attach();
Keys.onAnyKey = () => Audio.init();
window.addEventListener('pointerdown', () => Audio.init());
game.events.on(Phaser.Core.Events.POST_STEP, () => {
  // Handled here rather than in a scene, so M works on every screen.
  if (Keys.take('mute')) Audio.toggleMute();
});
game.events.on(Phaser.Core.Events.POST_RENDER, () => Keys.endFrame());

// Lets the automated playthrough test read game state. Harmless in a single-player game.
window.GUTTER_CAT = { game, Session, Keys, Audio };
