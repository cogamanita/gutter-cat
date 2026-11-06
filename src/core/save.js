// Save slots in localStorage. Every access is guarded: storage can throw in
// private windows or when blocked, and the game must keep working regardless.

import { SAVE_KEYS } from '../config.js';

function read(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function isValid(save) {
  return !!(save && save.state && save.state.version === 1 && save.state.stats && save.state.map);
}

export function saveGame(state, slot = 'manual') {
  return write(SAVE_KEYS[slot], { time: Date.now(), state });
}

export function readSlot(slot) {
  const s = read(SAVE_KEYS[slot]);
  return isValid(s) ? s : null;
}

/** The newest save across the manual and auto slots. */
export function latestSave() {
  const m = readSlot('manual');
  const a = readSlot('auto');
  if (m && a) return m.time >= a.time ? m : a;
  return m || a;
}

export function loadSettings() {
  return read(SAVE_KEYS.settings) || { muted: false, scanlines: true };
}

export function saveSettings(settings) {
  write(SAVE_KEYS.settings, settings);
}

export function eraseSaves() {
  try {
    localStorage.removeItem(SAVE_KEYS.manual);
    localStorage.removeItem(SAVE_KEYS.auto);
  } catch {
    // nothing to do
  }
}
