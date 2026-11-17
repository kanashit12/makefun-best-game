// Lumen Drift — all sound is synthesised live with WebAudio: no audio files,
// no network, nothing to load. Short blips for play, a soft pad for ambience.
// The context is created on the first player gesture; before that every call
// is a no-op, so headless renders and the title screen stay silent and safe.
// (game/src/audio.js)
export function makeAudio() {
  let ctx = null;
  let pad = null;
  let muted = false;
  let unlocked = false;

  function ensure() {
    if (ctx || typeof window === 'undefined') return ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    } catch {
      ctx = null;
    }
    return ctx;
  }

  /** Call from a real user gesture (start / key / click). */
  function unlock() {
    const ac = ensure();
    if (!ac) return;
    unlocked = true;
    if (ac.state === 'suspended') ac.resume().catch(() => {});
    startPad();
  }

  function startPad() {
    if (!ctx || pad || muted) return;
    try {
      const gain = ctx.createGain();
      gain.gain.value = 0.035;
      gain.connect(ctx.destination);
      const notes = [110, 164.81, 220];
      const oscs = notes.map((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = i === 0 ? 'sine' : 'triangle';
        osc.frequency.value = freq;
        osc.detune.value = i === 1 ? 4 : -3;
        const g = ctx.createGain();
        g.gain.value = i === 0 ? 0.6 : 0.35;
        osc.connect(g).connect(gain);
        osc.start();
        return osc;
      });
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.07;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.015;
      lfo.connect(lfoGain).connect(gain.gain);
      lfo.start();
      pad = { gain, oscs, lfo };
    } catch {
      pad = null;
    }
  }

  function stopPad() {
    if (!pad) return;
    try {
      pad.oscs.forEach((o) => o.stop());
      pad.lfo.stop();
      pad.gain.disconnect();
    } catch {
      /* already stopped */
    }
    pad = null;
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (!ctx || muted || !unlocked) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + dur);
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + dur + 0.02);
    } catch {
      /* audio is decoration, never a crash */
    }
  }

  function note(freq, delay, dur, type, vol) {
    if (!ctx || muted || !unlocked) return;
    try {
      const now = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(vol, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + dur + 0.05);
    } catch {
      /* ignore */
    }
  }

  return {
    unlock,
    get muted() {
      return muted;
    },
    toggleMute() {
      muted = !muted;
      if (muted) stopPad();
      else if (unlocked) startPad();
      return muted;
    },
    collect(combo) {
      const base = 520 * Math.pow(1.059, Math.min(combo, 12));
      tone(base, 0.12, 'sine', 0.16, base * 1.5);
      tone(base * 2, 0.08, 'triangle', 0.05);
    },
    dash() {
      tone(300, 0.18, 'sawtooth', 0.08, 900);
    },
    wispPop() {
      tone(220, 0.16, 'square', 0.1, 60);
    },
    hurt() {
      tone(180, 0.3, 'sawtooth', 0.16, 55);
      tone(90, 0.35, 'sine', 0.14, 40);
    },
    powerup() {
      [523.25, 659.25, 783.99].forEach((f, i) => note(f, i * 0.07, 0.22, 'triangle', 0.12));
    },
    waveClear() {
      [392, 523.25, 659.25, 783.99].forEach((f, i) => note(f, i * 0.09, 0.3, 'sine', 0.12));
    },
    gameOver() {
      [392, 329.63, 261.63, 196].forEach((f, i) => note(f, i * 0.16, 0.32, 'triangle', 0.12));
    },
    victory() {
      [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => note(f, i * 0.1, 0.4, 'sine', 0.12));
    },
  };
}
