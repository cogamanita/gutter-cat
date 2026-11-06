// Keyboard handling that does not care which Phaser scene is running. Scenes pause
// and overlap constantly here, so a single window-level listener is simpler and
// avoids stale key state when control passes between them.

const BINDINGS = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  KeyE: 'confirm', Space: 'confirm', Enter: 'confirm',
  Escape: 'menu', KeyI: 'menu', Tab: 'menu',
  KeyX: 'cancel', Backspace: 'cancel', KeyQ: 'cancel',
  KeyM: 'mute',
};

const DIRS = ['up', 'down', 'left', 'right'];

class KeyState {
  constructor() {
    this.held = new Set();
    this.queue = new Set();
    this.order = [];
    this.onAnyKey = null;
    this.attached = false;
  }

  attach() {
    if (this.attached) return;
    this.attached = true;
    window.addEventListener('keydown', (e) => {
      if (this.onAnyKey) this.onAnyKey();
      const action = BINDINGS[e.code];
      if (!action) return;
      e.preventDefault();
      if (e.repeat) {
        // OS key repeat drives menu scrolling only.
        if (DIRS.includes(action)) this.queue.add(action);
        return;
      }
      this.held.add(e.code);
      this.queue.add(action);
      if (DIRS.includes(action)) {
        this.order = this.order.filter((a) => a !== action);
        this.order.push(action);
      }
    });
    window.addEventListener('keyup', (e) => {
      this.held.delete(e.code);
      const action = BINDINGS[e.code];
      if (DIRS.includes(action) && !this.isDown(action)) {
        this.order = this.order.filter((a) => a !== action);
      }
    });
    window.addEventListener('blur', () => this.reset());
  }

  isDown(action) {
    for (const code of this.held) if (BINDINGS[code] === action) return true;
    return false;
  }

  /** The direction held most recently, if any. */
  direction() {
    return this.order.length ? this.order[this.order.length - 1] : null;
  }

  /** True once per key press. Consumes it, so only one reader sees it. */
  take(action) {
    if (this.queue.has(action)) {
      this.queue.delete(action);
      return true;
    }
    return false;
  }

  endFrame() {
    this.queue.clear();
  }

  /** Drop pending presses (not held keys), used when control changes hands. */
  flush() {
    this.queue.clear();
  }

  reset() {
    this.held.clear();
    this.queue.clear();
    this.order = [];
  }
}

export const Keys = new KeyState();
