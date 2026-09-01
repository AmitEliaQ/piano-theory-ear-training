// explore.js — Feature 1: visual/theory breakdown of scales.
// Key + scale-type selectors drive a shared keyboard + degree table.

import { ROOTS, ALL_SCALE_TYPES, noteLabel, intervalName, scaleWithMidi } from './theory.js';
import { audioEngine } from './audio.js';
import { PianoKeyboard } from './keyboard.js';

const SCALE_OPTIONS = Object.entries(ALL_SCALE_TYPES); // [key, {label, ...}]

function semitoneStepsLabel(notes) {
  const pcs = notes.map((n) => n.pc);
  const steps = pcs.map((pc, i) => {
    const next = i + 1 < pcs.length ? pcs[i + 1] : pcs[0] + 12;
    let diff = next - pc;
    if (diff <= 0) diff += 12;
    return diff;
  });
  return steps.join('-');
}

export function initExplore(container) {
  let rootPc = 0;       // C
  let scaleType = 'major';
  let keyboard;

  container.innerHTML = `
    <div class="glass-panel">
      <div class="control-group">
        <span class="control-label">Key</span>
        <div class="root-grid" id="root-grid"></div>
      </div>
      <div class="control-group">
        <span class="control-label">Scale</span>
        <select class="scale-select" id="scale-select"></select>
      </div>
      <div class="keyboard-container" id="keyboard-container"></div>
      <div class="formula-display" id="formula-display"></div>
      <table class="degree-table">
        <thead>
          <tr><th>Degree</th><th>Note</th><th>Interval from Root</th></tr>
        </thead>
        <tbody id="degree-body"></tbody>
      </table>
      <div class="play-buttons">
        <button class="play-button" id="play-asc">▶ Ascending</button>
        <button class="play-button" id="play-desc">◀ Descending</button>
        <button class="play-button" id="play-chord">♫ As Chord</button>
      </div>
    </div>
  `;

  const rootGrid = container.querySelector('#root-grid');
  ROOTS.forEach((r) => {
    const btn = document.createElement('button');
    btn.className = 'chip-button';
    btn.textContent = noteLabel(r);
    btn.dataset.pc = r.pc;
    btn.addEventListener('click', () => {
      rootPc = r.pc;
      render();
    });
    rootGrid.appendChild(btn);
  });

  const scaleSelect = container.querySelector('#scale-select');
  SCALE_OPTIONS.forEach(([key, def]) => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = def.label;
    scaleSelect.appendChild(opt);
  });
  scaleSelect.value = scaleType;
  scaleSelect.addEventListener('change', () => {
    scaleType = scaleSelect.value;
    render();
  });

  keyboard = new PianoKeyboard(container.querySelector('#keyboard-container'), {
    startMidi: 60,
    octaves: 2,
    onKeyClick: (midi) => audioEngine.playNote(midi, 0.8),
  });

  function currentNotesWithMidi() {
    return scaleWithMidi(rootPc, scaleType);
  }

  function render() {
    const notes = currentNotesWithMidi();
    const rootLabel = noteLabel(notes[0]);

    // root grid selection state
    rootGrid.querySelectorAll('.chip-button').forEach((btn) => {
      btn.classList.toggle('selected', Number(btn.dataset.pc) === rootPc);
    });

    // keyboard state
    const states = new Map();
    notes.forEach((n, i) => states.set(n.midi, i === 0 ? 'root' : 'scale'));
    keyboard.setNoteStates(states);

    // formula
    container.querySelector('#formula-display').textContent =
      `${rootLabel} ${ALL_SCALE_TYPES[scaleType].label}  —  ${semitoneStepsLabel(notes)} (semitone steps)`;

    // degree table
    const tbody = container.querySelector('#degree-body');
    tbody.innerHTML = '';
    notes.forEach((n, i) => {
      const semitonesFromRoot = ((n.pc - notes[0].pc) % 12 + 12) % 12;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${n.degree ?? i + 1}</td>
        <td class="note-name">${noteLabel(n)}</td>
        <td>${i === 0 ? 'Root' : intervalName(semitonesFromRoot)}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  container.querySelector('#play-asc').addEventListener('click', () => {
    const notes = currentNotesWithMidi();
    audioEngine.playSequence(notes.map((n) => n.midi), 350, 0.4);
  });
  container.querySelector('#play-desc').addEventListener('click', () => {
    const notes = currentNotesWithMidi();
    audioEngine.playSequence([...notes].reverse().map((n) => n.midi), 350, 0.4);
  });
  container.querySelector('#play-chord').addEventListener('click', () => {
    const notes = currentNotesWithMidi();
    const idxs = notes.length >= 5 ? [0, 2, 4] : notes.map((_, i) => i);
    idxs.forEach((i) => audioEngine.playNote(notes[i].midi, 1.2));
  });

  render();
}
