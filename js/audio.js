// audio.js — Web Audio synth engine. No samples shipped; oscillator + ADSR envelope.

export class AudioEngine {
  constructor() {
    this._ctx = null;
    this._activeNodes = new Set();
  }

  // Lazily create/resume the AudioContext. Must be called from inside a
  // user-gesture handler (click/tap) or browsers (esp. iOS) keep it suspended.
  _ensureContext() {
    if (!this._ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      this._ctx = new Ctx();
    }
    if (this._ctx.state === 'suspended') {
      this._ctx.resume();
    }
    return this._ctx;
  }

  midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  /**
   * Play a single note with a short attack/decay/sustain/release envelope.
   * @param {number} midi
   * @param {number} duration - sustain length in seconds
   * @param {{delay?: number, velocity?: number}} opts
   */
  playNote(midi, duration = 0.8, { delay = 0, velocity = 0.6 } = {}) {
    const ctx = this._ensureContext();
    const now = ctx.currentTime + delay;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = this.midiToFreq(midi);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(velocity, now + 0.015);        // attack
    gain.gain.linearRampToValueAtTime(velocity * 0.7, now + 0.08);   // decay -> sustain
    gain.gain.setTargetAtTime(0, now + duration, 0.12);              // release (smooth, no click)

    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    const stopAt = now + duration + 0.5; // let the release tail finish before hard stop
    osc.stop(stopAt);

    const entry = { osc, gain };
    this._activeNodes.add(entry);
    osc.onended = () => {
      gain.disconnect();
      osc.disconnect();
      this._activeNodes.delete(entry);
    };
    return entry;
  }

  /** Play notes one after another (e.g. a scale run). Returns total duration in seconds. */
  playSequence(midis, gapMs = 400, noteDuration = 0.5) {
    const gap = gapMs / 1000;
    midis.forEach((midi, i) => this.playNote(midi, noteDuration, { delay: i * gap }));
    return (midis.length - 1) * gap + noteDuration;
  }

  /**
   * Play an interval between two MIDI notes.
   * @param {'harmonic'|'ascending'|'descending'} mode
   */
  playInterval(midiA, midiB, mode = 'ascending', noteDuration = 0.9) {
    const lo = Math.min(midiA, midiB);
    const hi = Math.max(midiA, midiB);
    if (mode === 'harmonic') {
      this.playNote(lo, noteDuration);
      this.playNote(hi, noteDuration);
    } else if (mode === 'descending') {
      this.playNote(hi, noteDuration, { delay: 0 });
      this.playNote(lo, noteDuration, { delay: noteDuration * 0.6 });
    } else {
      this.playNote(lo, noteDuration, { delay: 0 });
      this.playNote(hi, noteDuration, { delay: noteDuration * 0.6 });
    }
  }

  /** Stop everything currently ringing (e.g. on navigation away from a view). */
  stopAll() {
    if (!this._ctx) return;
    const now = this._ctx.currentTime;
    this._activeNodes.forEach(({ osc, gain }) => {
      try {
        gain.gain.cancelScheduledValues(now);
        gain.gain.setTargetAtTime(0, now, 0.05);
        osc.stop(now + 0.1);
      } catch {
        // already stopped — ignore
      }
    });
  }
}

// Single shared instance — Explore and Quiz views both import this.
export const audioEngine = new AudioEngine();
