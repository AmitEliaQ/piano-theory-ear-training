// keyboard.js — SVG piano widget. Pure render-from-state: callers set note
// roles (root/scale/dim) and pass a click handler; this module owns no
// theory or audio logic itself. Shared by explore.js and quiz.js.

const BLACK_PCS = new Set([1, 3, 6, 8, 10]);

export class PianoKeyboard {
  /**
   * @param {HTMLElement} container
   * @param {{startMidi?: number, octaves?: number, onKeyClick?: (midi:number)=>void}} opts
   */
  constructor(container, opts = {}) {
    this.container = container;
    this.startMidi = opts.startMidi ?? 60; // C4
    this.octaves = opts.octaves ?? 2;
    this.onKeyClick = opts.onKeyClick ?? (() => {});
    this.noteStates = new Map(); // midi -> 'root' | 'scale' | undefined (dim)
    this._render();
  }

  /** @param {Map<number,string>|Record<number,string>} states */
  setNoteStates(states) {
    this.noteStates = states instanceof Map
      ? states
      : new Map(Object.entries(states).map(([k, v]) => [Number(k), v]));
    this._updateClasses();
  }

  _range() {
    const total = this.octaves * 12;
    const notes = [];
    for (let m = this.startMidi; m <= this.startMidi + total; m++) {
      const pc = ((m % 12) + 12) % 12;
      notes.push({ midi: m, pc, isBlack: BLACK_PCS.has(pc) });
    }
    return notes;
  }

  _render() {
    const notes = this._range();
    const whiteNotes = notes.filter((n) => !n.isBlack);
    const svgW = 800;
    const svgH = 200;
    const whiteW = svgW / whiteNotes.length;
    const blackW = whiteW * 0.6;

    // White keys first (so black keys stack visually on top in DOM order).
    let x = 0;
    const whiteXByMidi = new Map();
    const whiteRects = whiteNotes.map((n) => {
      whiteXByMidi.set(n.midi, x);
      const rect = `<rect data-midi="${n.midi}" class="piano-key piano-key-white" x="${x}" y="0" width="${whiteW}" height="${svgH}" rx="3"/>`;
      x += whiteW;
      return rect;
    });

    const blackRects = notes
      .filter((n) => n.isBlack)
      .map((n) => {
        const prevWhite = [...notes].filter((p) => p.midi < n.midi && !p.isBlack).pop();
        const baseX = whiteXByMidi.get(prevWhite.midi);
        const bx = baseX + whiteW - blackW / 2;
        return `<rect data-midi="${n.midi}" class="piano-key piano-key-black" x="${bx.toFixed(2)}" y="0" width="${blackW.toFixed(2)}" height="${(svgH * 0.62).toFixed(2)}" rx="2"/>`;
      });

    this.container.innerHTML = `
      <svg viewBox="0 0 ${svgW} ${svgH}" class="piano-keyboard-svg" role="img" aria-label="Piano keyboard" preserveAspectRatio="xMidYMid meet">
        ${whiteRects.join('')}
        ${blackRects.join('')}
      </svg>`;

    this.svg = this.container.querySelector('svg');
    this.svg.addEventListener('click', (e) => {
      const midiAttr = e.target.getAttribute?.('data-midi');
      if (midiAttr == null) return;
      this.onKeyClick(Number(midiAttr));
    });

    this._updateClasses();
  }

  _updateClasses() {
    if (!this.svg) return;
    this.svg.querySelectorAll('[data-midi]').forEach((el) => {
      const midi = Number(el.getAttribute('data-midi'));
      const role = this.noteStates.get(midi);
      el.classList.remove('key-root', 'key-scale', 'key-dim');
      el.classList.add(role === 'root' ? 'key-root' : role === 'scale' ? 'key-scale' : 'key-dim');
    });
  }

  /** Rebuild for a new range (e.g. switching octave count on mobile). */
  setRange(startMidi, octaves) {
    this.startMidi = startMidi;
    this.octaves = octaves;
    this._render();
  }
}
