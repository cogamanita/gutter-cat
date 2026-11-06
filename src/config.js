// Global constants shared by every module.

export const GAME_W = 480;
export const GAME_H = 270;
export const TILE = 16;

export const FONT = 'pixel';

// UI colours. World art has its own ramps in art/palette.js
export const UI = {
  text: 0xd8d2c0,
  dim: 0x8a8678,
  faint: 0x56544c,
  accent: 0xd8b050,
  danger: 0xc84a3a,
  good: 0x8ab060,
  poison: 0x9ab83a,
  cold: 0x7a9aa8,
  panel: 0x101014,
  panelEdge: 0x4a4640,
  panelEdgeLit: 0x8a8070,
  hp: 0xb03a30,
  hpLow: 0xe05040,
  hunger: 0xb08030,
  xp: 0x5a7a90,
};

export const SAVE_KEYS = {
  manual: 'guttercat.save.manual',
  auto: 'guttercat.save.auto',
  settings: 'guttercat.settings',
};

export const STEP_MS = 150; // time to cross one tile at walking pace
