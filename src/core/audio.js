// All sound is synthesised live with the Web Audio API. There are no audio files.
// The AudioContext may only start after a user gesture, so everything here is a
// safe no-op until init() runs.

import { loadSettings, saveSettings } from './save.js';

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

// Step-sequencer tracks. Notes are MIDI numbers; 0 is a rest.
const TRACKS = {
  title: {
    bpm: 58, steps: 32,
    voices: [
      { type: 'triangle', gain: 0.14, decay: 2.6, notes: [45, 0, 0, 0, 52, 0, 0, 0, 48, 0, 0, 0, 52, 0, 0, 0, 45, 0, 0, 0, 52, 0, 0, 0, 44, 0, 0, 0, 50, 0, 0, 0] },
      { type: 'sine', gain: 0.09, decay: 3.2, notes: [0, 0, 69, 0, 0, 0, 0, 72, 0, 0, 71, 0, 0, 0, 64, 0, 0, 0, 69, 0, 0, 0, 0, 65, 0, 0, 64, 0, 0, 0, 0, 0] },
    ],
  },
  battle: {
    bpm: 132, steps: 32,
    voices: [
      { type: 'sawtooth', gain: 0.11, decay: 0.22, cutoff: 500, notes: [38, 0, 38, 38, 0, 38, 41, 0, 38, 0, 38, 38, 0, 44, 43, 0, 38, 0, 38, 38, 0, 38, 41, 0, 36, 0, 36, 36, 0, 37, 37, 0] },
      { type: 'square', gain: 0.035, decay: 0.34, cutoff: 1400, notes: [0, 0, 0, 0, 62, 0, 0, 0, 0, 0, 0, 0, 65, 0, 68, 0, 0, 0, 0, 0, 62, 0, 0, 0, 0, 0, 0, 0, 61, 0, 60, 0] },
    ],
    drums: { k: [0, 6, 8, 14, 16, 22, 24, 30], s: [4, 12, 20, 28], h: [2, 10, 18, 26] },
  },
  boss: {
    bpm: 148, steps: 32,
    voices: [
      { type: 'sawtooth', gain: 0.13, decay: 0.2, cutoff: 620, notes: [33, 33, 0, 33, 39, 0, 33, 33, 0, 33, 40, 0, 39, 0, 36, 0, 33, 33, 0, 33, 39, 0, 33, 33, 0, 45, 44, 0, 39, 0, 38, 37] },
      { type: 'square', gain: 0.045, decay: 0.5, cutoff: 1600, notes: [69, 0, 0, 0, 0, 0, 75, 0, 0, 0, 0, 0, 72, 0, 0, 0, 69, 0, 0, 0, 0, 0, 75, 0, 76, 0, 75, 0, 72, 0, 70, 0] },
    ],
    drums: { k: [0, 3, 6, 8, 11, 14, 16, 19, 22, 24, 27, 30], s: [4, 12, 20, 28], h: [2, 6, 10, 14, 18, 22, 26, 30] },
  },
  safe: {
    bpm: 66, steps: 32,
    voices: [
      { type: 'triangle', gain: 0.1, decay: 2.2, notes: [48, 0, 0, 0, 55, 0, 0, 0, 53, 0, 0, 0, 55, 0, 0, 0, 45, 0, 0, 0, 52, 0, 0, 0, 53, 0, 0, 0, 55, 0, 0, 0] },
      { type: 'sine', gain: 0.1, decay: 1.8, notes: [0, 67, 0, 72, 0, 74, 0, 72, 0, 69, 0, 72, 0, 67, 0, 0, 0, 64, 0, 69, 0, 72, 0, 71, 0, 69, 0, 67, 0, 0, 0, 0] },
    ],
  },
  home: {
    bpm: 72, steps: 48,
    voices: [
      { type: 'sine', gain: 0.13, decay: 1.5, bell: true, notes: [
        76, 0, 72, 79, 0, 76, 74, 0, 71, 72, 0, 67,
        69, 0, 72, 76, 0, 74, 72, 0, 69, 67, 0, 0,
        76, 0, 72, 79, 0, 84, 83, 0, 79, 81, 0, 79,
        77, 0, 76, 74, 0, 71, 72, 0, 0, 72, 0, 0] },
      { type: 'triangle', gain: 0.09, decay: 2.4, notes: [
        48, 0, 0, 55, 0, 0, 43, 0, 0, 52, 0, 0,
        45, 0, 0, 52, 0, 0, 41, 0, 0, 43, 0, 0,
        48, 0, 0, 55, 0, 0, 43, 0, 0, 45, 0, 0,
        41, 0, 0, 43, 0, 0, 48, 0, 0, 48, 0, 0] },
    ],
  },
  gameover: {
    bpm: 44, steps: 16, once: true,
    voices: [
      { type: 'triangle', gain: 0.16, decay: 3.4, notes: [57, 0, 56, 0, 53, 0, 52, 0, 45, 0, 0, 0, 0, 0, 0, 0] },
      { type: 'sine', gain: 0.1, decay: 3.4, notes: [64, 0, 63, 0, 60, 0, 57, 0, 52, 0, 0, 0, 0, 0, 0, 0] },
    ],
  },
};

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.settings = loadSettings();
    this.muted = !!this.settings.muted;
    this.amb = null;
    this.ambKind = 'none';
    this.musicKind = 'none';
    this.heartbeatOn = false;
    this.wantAmb = 'none';
    this.wantMusic = 'none';
    this.timers = [];
  }

  /** Call from a user gesture. Safe to call many times. */
  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    const c = this.ctx;
    this.master = c.createGain();
    this.master.gain.value = this.muted ? 0 : 0.85;
    const comp = c.createDynamicsCompressor();
    this.master.connect(comp);
    comp.connect(c.destination);
    this.sfxBus = c.createGain();
    this.sfxBus.gain.value = 0.9;
    this.sfxBus.connect(this.master);
    this.ambBus = c.createGain();
    this.ambBus.gain.value = 0.8;
    this.ambBus.connect(this.master);
    this.musicBus = c.createGain();
    this.musicBus.gain.value = 0.8;
    this.musicBus.connect(this.master);

    // A long seamless block of white noise, reused by rain and every hit sound.
    const len = c.sampleRate * 2;
    this.noiseBuf = c.createBuffer(1, len, c.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i += 1) d[i] = Math.random() * 2 - 1;

    this.startSequencer();
    this.setAmbience(this.wantAmb);
    this.setMusic(this.wantMusic);
  }

  toggleMute() {
    this.muted = !this.muted;
    this.settings.muted = this.muted;
    saveSettings(this.settings);
    if (this.ctx) this.master.gain.setTargetAtTime(this.muted ? 0 : 0.85, this.ctx.currentTime, 0.02);
    return this.muted;
  }

  // ----------------------------------------------------------- Primitives
  tone(freq, dur, opts = {}) {
    if (!this.ctx) return;
    const c = this.ctx;
    const t = c.currentTime + (opts.delay || 0);
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = opts.type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (opts.to) o.frequency.exponentialRampToValueAtTime(Math.max(1, opts.to), t + dur);
    const vol = opts.gain ?? 0.2;
    g.gain.setValueAtTime(opts.attack ? 0.0001 : vol, t);
    if (opts.attack) g.gain.exponentialRampToValueAtTime(vol, t + opts.attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    let tail = g;
    if (opts.cutoff) {
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = opts.cutoff;
      g.connect(f);
      tail = f;
    }
    tail.connect(opts.bus || this.sfxBus);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  noise(dur, opts = {}) {
    if (!this.ctx) return;
    const c = this.ctx;
    const t = c.currentTime + (opts.delay || 0);
    const s = c.createBufferSource();
    s.buffer = this.noiseBuf;
    s.loop = true;
    const f = c.createBiquadFilter();
    f.type = opts.filter || 'lowpass';
    f.frequency.setValueAtTime(opts.freq || 2000, t);
    if (opts.to) f.frequency.exponentialRampToValueAtTime(Math.max(20, opts.to), t + dur);
    f.Q.value = opts.q || 0.7;
    const g = c.createGain();
    const vol = opts.gain ?? 0.2;
    g.gain.setValueAtTime(opts.attack ? 0.0001 : vol, t);
    if (opts.attack) g.gain.exponentialRampToValueAtTime(vol, t + opts.attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f);
    f.connect(g);
    g.connect(opts.bus || this.sfxBus);
    s.start(t, Math.random() * 1.5);
    s.stop(t + dur + 0.02);
  }

  // ------------------------------------------------------------- Effects
  play(name) {
    if (!this.ctx) return;
    const fx = SFX[name];
    if (fx) fx(this);
  }

  // ------------------------------------------------------------ Ambience
  setAmbience(kind) {
    this.wantAmb = kind;
    if (!this.ctx || this.ambKind === kind) return;
    this.ambKind = kind;
    const c = this.ctx;
    const t = c.currentTime;
    if (this.amb) {
      const old = this.amb;
      old.gain.gain.setTargetAtTime(0, t, 0.5);
      setTimeout(() => {
        old.nodes.forEach((n) => {
          try { n.stop(); } catch { /* already stopped */ }
        });
        old.gain.disconnect();
      }, 2500);
      this.amb = null;
    }
    if (kind === 'none') return;

    const gain = c.createGain();
    gain.gain.value = 0.0001;
    gain.gain.setTargetAtTime(1, t, 0.6);
    gain.connect(this.ambBus);
    const nodes = [];

    const noiseLayer = (type, freq, vol, q = 0.7) => {
      const s = c.createBufferSource();
      s.buffer = this.noiseBuf;
      s.loop = true;
      const f = c.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      f.Q.value = q;
      const g = c.createGain();
      g.gain.value = vol;
      s.connect(f);
      f.connect(g);
      g.connect(gain);
      s.start(0, Math.random());
      nodes.push(s);
    };
    const drone = (freq, vol, type = 'sawtooth', cutoff = 160) => {
      const o = c.createOscillator();
      o.type = type;
      o.frequency.value = freq;
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = cutoff;
      const g = c.createGain();
      g.gain.value = vol;
      o.connect(f);
      f.connect(g);
      g.connect(gain);
      o.start();
      nodes.push(o);
    };

    if (kind === 'rain') {
      noiseLayer('highpass', 1800, 0.08);
      noiseLayer('bandpass', 700, 0.06, 0.4);
      noiseLayer('lowpass', 180, 0.1);
      drone(41, 0.02);
    } else if (kind === 'lane') {
      noiseLayer('highpass', 2400, 0.035);
      noiseLayer('lowpass', 240, 0.05);
    } else if (kind === 'sewer') {
      noiseLayer('lowpass', 220, 0.11);
      noiseLayer('bandpass', 900, 0.008, 3);
      drone(36.7, 0.05);
      drone(38.9, 0.035);
    } else if (kind === 'indoor') {
      noiseLayer('lowpass', 300, 0.05);
      drone(60, 0.02, 'square', 240);
    } else if (kind === 'home') {
      noiseLayer('lowpass', 500, 0.03);
      noiseLayer('highpass', 3000, 0.006);
    }
    this.amb = { gain, nodes, kind };
    this.scheduleAmbientEvents(kind);
  }

  /** Random one-shots layered over the ambience loop. */
  scheduleAmbientEvents(kind) {
    const tick = () => {
      if (this.ambKind !== kind) return;
      if (kind === 'sewer') {
        const roll = Math.random();
        if (roll < 0.6) this.play('drip');
        else if (roll < 0.74) this.play('groan');
        else if (roll < 0.82) this.play('scuttle');
      } else if (kind === 'rain') {
        const roll = Math.random();
        if (roll < 0.15) this.play('distant');
        else if (roll < 0.25) this.play('rattle');
      } else if (kind === 'indoor') {
        const roll = Math.random();
        if (roll < 0.4) this.play('creak');
        else if (roll < 0.6) this.play('drip');
      } else if (kind === 'home') {
        for (let i = 0; i < 3; i += 1) {
          this.noise(0.03 + Math.random() * 0.05, { filter: 'bandpass', freq: 800 + Math.random() * 3000, q: 2, gain: 0.05 + Math.random() * 0.05, delay: Math.random() * 0.5 });
        }
      } else {
        return;
      }
      const wait = kind === 'home' ? 400 + Math.random() * 500 : 2200 + Math.random() * 4500;
      setTimeout(tick, wait);
    };
    setTimeout(tick, 1000);
  }

  // --------------------------------------------------------------- Music
  setMusic(kind) {
    this.wantMusic = kind;
    if (!this.ctx || this.musicKind === kind) return;
    this.musicKind = kind;
    this.seqStep = 0;
    this.seqNext = this.ctx.currentTime + 0.1;
    this.seqDone = false;
  }

  startSequencer() {
    this.musicKind = 'none';
    setInterval(() => {
      if (!this.ctx) return;
      const track = TRACKS[this.musicKind];
      if (!track || this.seqDone) return;
      const stepDur = 60 / track.bpm / 2;
      while (this.seqNext < this.ctx.currentTime + 0.25) {
        this.playStep(track, this.seqStep, this.seqNext);
        this.seqNext += stepDur;
        this.seqStep += 1;
        if (this.seqStep >= track.steps) {
          this.seqStep = 0;
          if (track.once) {
            this.seqDone = true;
            break;
          }
        }
      }
    }, 60);
  }

  playStep(track, step, when) {
    const delay = Math.max(0, when - this.ctx.currentTime);
    for (const v of track.voices) {
      const n = v.notes[step % v.notes.length];
      if (!n) continue;
      this.tone(midi(n), v.decay, { type: v.type, gain: v.gain, delay, cutoff: v.cutoff, bus: this.musicBus });
      if (v.bell) this.tone(midi(n) * 3, v.decay * 0.4, { type: 'sine', gain: v.gain * 0.25, delay, bus: this.musicBus });
    }
    if (track.drums) {
      const d = track.drums;
      if (d.k.includes(step)) this.tone(110, 0.14, { to: 34, gain: 0.3, delay, bus: this.musicBus });
      if (d.s.includes(step)) this.noise(0.12, { filter: 'bandpass', freq: 1500, q: 0.6, gain: 0.12, delay, bus: this.musicBus });
      if (d.h.includes(step)) this.noise(0.04, { filter: 'highpass', freq: 6000, gain: 0.05, delay, bus: this.musicBus });
    }
  }

  // ----------------------------------------------------------- Heartbeat
  setHeartbeat(on) {
    if (on === this.heartbeatOn) return;
    this.heartbeatOn = on;
    if (on) this.beat();
  }

  beat() {
    if (!this.heartbeatOn) return;
    if (this.ctx) {
      this.tone(62, 0.14, { to: 34, gain: 0.34 });
      this.tone(58, 0.12, { to: 32, gain: 0.24, delay: 0.2 });
    }
    setTimeout(() => this.beat(), 1000);
  }
}

// One function per sound, all built from the two primitives above.
const SFX = {
  step: (a) => a.noise(0.05, { filter: 'bandpass', freq: 500 + Math.random() * 300, q: 1.2, gain: 0.06 }),
  splash: (a) => {
    a.noise(0.12, { filter: 'bandpass', freq: 1600 + Math.random() * 800, q: 0.8, gain: 0.08, to: 700 });
    a.tone(700 + Math.random() * 300, 0.05, { to: 300, gain: 0.02 });
  },
  rustle: (a) => a.noise(0.12, { filter: 'highpass', freq: 2600, gain: 0.05, attack: 0.02 }),
  bump: (a) => a.tone(90, 0.06, { to: 60, gain: 0.08, type: 'square', cutoff: 300 }),
  blip: (a) => a.tone(520, 0.025, { type: 'square', gain: 0.018, cutoff: 1600 }),
  voiceLow: (a) => a.tone(180 + Math.random() * 30, 0.03, { type: 'square', gain: 0.03, cutoff: 800 }),
  select: (a) => a.tone(660, 0.05, { type: 'square', gain: 0.04, cutoff: 2400 }),
  confirm: (a) => {
    a.tone(520, 0.07, { type: 'square', gain: 0.05, cutoff: 2400 });
    a.tone(780, 0.1, { type: 'square', gain: 0.05, cutoff: 2400, delay: 0.06 });
  },
  cancel: (a) => a.tone(320, 0.1, { type: 'square', gain: 0.05, to: 200, cutoff: 1600 }),
  pickup: (a) => {
    [660, 880, 1100].forEach((f, i) => a.tone(f, 0.12, { type: 'triangle', gain: 0.09, delay: i * 0.06 }));
  },
  paper: (a) => a.noise(0.14, { filter: 'highpass', freq: 3200, gain: 0.08, attack: 0.03 }),
  unlock: (a) => {
    a.noise(0.04, { filter: 'highpass', freq: 3000, gain: 0.14 });
    a.noise(0.05, { filter: 'bandpass', freq: 2000, q: 3, gain: 0.14, delay: 0.1 });
  },
  door: (a) => {
    a.noise(0.5, { filter: 'bandpass', freq: 300, q: 2, gain: 0.16, attack: 0.05 });
    a.tone(70, 0.3, { to: 40, gain: 0.24, delay: 0.42 });
  },
  valve: (a) => {
    a.noise(1.1, { filter: 'bandpass', freq: 1900, q: 9, gain: 0.14, to: 620, attack: 0.1 });
    a.tone(58, 0.9, { type: 'sawtooth', gain: 0.1, to: 44, cutoff: 280 });
  },
  flood: (a) => {
    a.noise(1.5, { filter: 'lowpass', freq: 500, gain: 0.4, to: 2800, attack: 0.25 });
    a.tone(44, 1.5, { type: 'sawtooth', gain: 0.18, to: 30, cutoff: 200 });
  },
  save: (a) => {
    [523, 659, 784, 1047].forEach((f, i) => a.tone(f, 0.5, { type: 'sine', gain: 0.1, delay: i * 0.13 }));
  },
  heal: (a) => {
    [440, 554, 659, 880].forEach((f, i) => a.tone(f, 0.22, { type: 'triangle', gain: 0.08, delay: i * 0.05 }));
  },
  eat: (a) => {
    for (let i = 0; i < 3; i += 1) a.noise(0.07, { filter: 'bandpass', freq: 900 + i * 250, q: 1.6, gain: 0.14, delay: i * 0.13 });
  },
  purr: (a) => {
    for (let i = 0; i < 14; i += 1) a.tone(58, 0.06, { type: 'sawtooth', gain: 0.1, delay: i * 0.08, cutoff: 280 });
  },
  levelup: (a) => {
    [523, 659, 784, 1047, 1319].forEach((f, i) => a.tone(f, 0.3, { type: 'square', gain: 0.06, delay: i * 0.09, cutoff: 3200 }));
  },
  // Combat
  claw: (a) => {
    a.noise(0.09, { filter: 'highpass', freq: 3000, gain: 0.2, to: 7000 });
    a.tone(180, 0.08, { to: 90, type: 'square', gain: 0.08, cutoff: 800, delay: 0.03 });
  },
  crit: (a) => {
    a.noise(0.16, { filter: 'highpass', freq: 2200, gain: 0.3, to: 8000 });
    a.tone(220, 0.2, { to: 50, type: 'square', gain: 0.16, cutoff: 1100 });
    a.tone(1320, 0.14, { type: 'triangle', gain: 0.08, delay: 0.04 });
  },
  miss: (a) => a.noise(0.14, { filter: 'bandpass', freq: 1500, q: 2, gain: 0.08, to: 500 }),
  whoosh: (a) => a.noise(0.24, { filter: 'bandpass', freq: 500, q: 1.2, gain: 0.14, to: 2400 }),
  bite: (a) => {
    a.noise(0.06, { filter: 'bandpass', freq: 1400, q: 1, gain: 0.26 });
    a.tone(140, 0.09, { to: 70, type: 'square', gain: 0.16, cutoff: 700 });
  },
  heavy: (a) => {
    a.tone(110, 0.26, { to: 34, gain: 0.5 });
    a.noise(0.2, { filter: 'lowpass', freq: 900, gain: 0.32, to: 200 });
  },
  slash: (a) => a.noise(0.08, { filter: 'highpass', freq: 3800, gain: 0.2, to: 8000 }),
  hurt: (a) => {
    a.tone(800, 0.13, { type: 'sawtooth', gain: 0.09, to: 300, cutoff: 2400 });
    a.tone(620, 0.16, { type: 'sawtooth', gain: 0.06, to: 240, cutoff: 2000, delay: 0.03 });
  },
  poison: (a) => a.tone(260, 0.22, { type: 'sawtooth', gain: 0.07, to: 110, cutoff: 900 }),
  gas: (a) => a.noise(0.6, { filter: 'bandpass', freq: 2600, q: 0.6, gain: 0.16, attack: 0.05, to: 1100 }),
  glass: (a) => {
    a.noise(0.1, { filter: 'highpass', freq: 4400, gain: 0.26 });
    [2600, 3400, 4200].forEach((f, i) => a.tone(f, 0.11, { type: 'triangle', gain: 0.05, delay: i * 0.02 }));
  },
  net: (a) => a.noise(0.34, { filter: 'bandpass', freq: 700, q: 1, gain: 0.2, to: 2200, attack: 0.04 }),
  whistle: (a) => a.tone(2300, 0.5, { gain: 0.1, to: 2500, attack: 0.03 }),
  burst: (a) => {
    a.noise(0.6, { filter: 'lowpass', freq: 1800, gain: 0.46, to: 240 });
    a.tone(90, 0.42, { to: 30, gain: 0.5 });
  },
  explode: (a) => {
    a.noise(0.5, { filter: 'lowpass', freq: 4000, gain: 0.5, to: 200 });
    a.tone(130, 0.4, { to: 34, gain: 0.5 });
  },
  squeak: (a) => {
    a.tone(1900 + Math.random() * 500, 0.09, { type: 'sawtooth', gain: 0.05, to: 2700, cutoff: 5000 });
    a.tone(2300, 0.07, { type: 'sawtooth', gain: 0.04, to: 1500, cutoff: 5000, delay: 0.1 });
  },
  bark: (a) => {
    a.tone(330, 0.1, { type: 'sawtooth', gain: 0.12, to: 150, cutoff: 1600 });
    a.noise(0.08, { filter: 'bandpass', freq: 800, q: 1, gain: 0.12 });
    a.tone(300, 0.1, { type: 'sawtooth', gain: 0.1, to: 130, cutoff: 1600, delay: 0.18 });
  },
  howl: (a) => {
    a.tone(260, 1.3, { type: 'sawtooth', gain: 0.1, to: 520, cutoff: 1100, attack: 0.25 });
  },
  whine: (a) => a.tone(800, 0.4, { type: 'sawtooth', gain: 0.07, to: 300, cutoff: 1800 }),
  grunt: (a) => a.tone(120, 0.14, { type: 'sawtooth', gain: 0.14, to: 70, cutoff: 700 }),
  gurgle: (a) => {
    for (let i = 0; i < 5; i += 1) a.tone(90 + Math.random() * 90, 0.09, { type: 'sine', gain: 0.2, delay: i * 0.07, to: 50 });
  },
  die: (a) => a.tone(700, 0.3, { type: 'square', gain: 0.05, to: 80, cutoff: 1400 }),
  bossDie: (a) => {
    a.noise(1.5, { filter: 'lowpass', freq: 1200, gain: 0.46, to: 100 });
    a.tone(180, 1.5, { type: 'sawtooth', gain: 0.2, to: 26, cutoff: 900 });
  },
  victory: (a) => {
    [392, 523, 659, 784].forEach((f, i) => a.tone(f, 0.28, { type: 'square', gain: 0.05, delay: i * 0.11, cutoff: 2600 }));
  },
  // Atmosphere
  stinger: (a) => {
    [233, 247, 311, 330].forEach((f) => a.tone(f, 1.3, { type: 'sawtooth', gain: 0.07, cutoff: 1400, attack: 0.02 }));
    a.noise(0.6, { filter: 'highpass', freq: 3000, gain: 0.08, to: 8000 });
    a.tone(52, 1.1, { gain: 0.34 });
  },
  encounter: (a) => {
    [277, 294].forEach((f) => a.tone(f, 0.55, { type: 'sawtooth', gain: 0.1, cutoff: 1800 }));
    a.tone(70, 0.5, { gain: 0.34, to: 40 });
    a.noise(0.3, { filter: 'highpass', freq: 3000, gain: 0.1 });
  },
  alert: (a) => {
    a.tone(880, 0.1, { type: 'square', gain: 0.05, cutoff: 2400 });
    a.tone(830, 0.16, { type: 'square', gain: 0.05, cutoff: 2400, delay: 0.1 });
  },
  thunder: (a) => {
    a.noise(2.6, { filter: 'lowpass', freq: 380, gain: 0.55, to: 50, attack: 0.05 });
    a.noise(0.3, { filter: 'lowpass', freq: 1800, gain: 0.25, to: 300 });
  },
  distant: (a) => a.noise(2.2, { filter: 'lowpass', freq: 160, gain: 0.26, attack: 0.5, to: 50 }),
  rattle: (a) => {
    for (let i = 0; i < 4; i += 1) a.noise(0.03, { filter: 'bandpass', freq: 2200, q: 4, gain: 0.04, delay: i * 0.09 });
  },
  drip: (a) => {
    const f = 900 + Math.random() * 1400;
    a.tone(f, 0.09, { gain: 0.09, to: f * 1.9 });
    a.tone(f * 0.6, 0.14, { gain: 0.03, delay: 0.16, to: f });
  },
  groan: (a) => a.tone(58 + Math.random() * 16, 2.3, { type: 'sawtooth', gain: 0.1, to: 44, cutoff: 280, attack: 0.5 }),
  scuttle: (a) => {
    for (let i = 0; i < 6; i += 1) a.noise(0.02, { filter: 'bandpass', freq: 3000, q: 3, gain: 0.04, delay: i * 0.05 + Math.random() * 0.02 });
  },
  creak: (a) => a.tone(180 + Math.random() * 90, 0.75, { type: 'sawtooth', gain: 0.03, to: 130, cutoff: 900, attack: 0.15 }),
  gameover: (a) => a.tone(60, 2.4, { type: 'sawtooth', gain: 0.2, to: 28, cutoff: 300 }),
};

export const Audio = new AudioEngine();
