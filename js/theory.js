// theory.js — pure note/scale/interval math. No DOM. No dependencies.

export const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const LETTER_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const ACCIDENTAL_SYMBOL = { '-2': '𝄫', '-1': '♭', 0: '', 1: '♯', 2: '𝄪' };
// (bb, b, '', #, x) — using flat/sharp unicode symbols; double accidentals rare but supported.

// Canonical 12 roots: letter + accidental chosen per common convention
// (sharps up to F#, flats from Ab onward) so generated scales read naturally.
export const ROOTS = [
  { pc: 0, letter: 'C', acc: 0 },
  { pc: 1, letter: 'D', acc: -1 }, // D♭
  { pc: 2, letter: 'D', acc: 0 },
  { pc: 3, letter: 'E', acc: -1 }, // E♭
  { pc: 4, letter: 'E', acc: 0 },
  { pc: 5, letter: 'F', acc: 0 },
  { pc: 6, letter: 'F', acc: 1 },  // F♯
  { pc: 7, letter: 'G', acc: 0 },
  { pc: 8, letter: 'A', acc: -1 }, // A♭
  { pc: 9, letter: 'A', acc: 0 },
  { pc: 10, letter: 'B', acc: -1 }, // B♭
  { pc: 11, letter: 'B', acc: 0 },
];

export function rootByPc(pc) {
  return ROOTS[((pc % 12) + 12) % 12];
}

// 7-note diatonic scale interval sets (semitone offsets from the tonic).
export const SCALES = {
  major: { label: 'Major (Ionian)', intervals: [0, 2, 4, 5, 7, 9, 11], formula: 'W-W-H-W-W-W-H' },
  dorian: { label: 'Dorian', intervals: [0, 2, 3, 5, 7, 9, 10], formula: 'W-H-W-W-W-H-W' },
  phrygian: { label: 'Phrygian', intervals: [0, 1, 3, 5, 7, 8, 10], formula: 'H-W-W-W-H-W-W' },
  lydian: { label: 'Lydian', intervals: [0, 2, 4, 6, 7, 9, 11], formula: 'W-W-W-H-W-W-H' },
  mixolydian: { label: 'Mixolydian', intervals: [0, 2, 4, 5, 7, 9, 10], formula: 'W-W-H-W-W-H-W' },
  naturalMinor: { label: 'Natural Minor (Aeolian)', intervals: [0, 2, 3, 5, 7, 8, 10], formula: 'W-H-W-W-H-W-W' },
  locrian: { label: 'Locrian', intervals: [0, 1, 3, 5, 6, 8, 10], formula: 'H-W-W-H-W-W-W' },
  harmonicMinor: { label: 'Harmonic Minor', intervals: [0, 2, 3, 5, 7, 8, 11], formula: 'W-H-W-W-H-WH-H' },
  melodicMinor: { label: 'Melodic Minor (asc.)', intervals: [0, 2, 3, 5, 7, 9, 11], formula: 'W-H-W-W-W-W-H' },
};

// Derived 5/6-note scales, built from a parent diatonic spelling so letter
// names stay theory-correct instead of re-deriving from scratch.
export const DERIVED_SCALES = {
  majorPentatonic: { label: 'Major Pentatonic', parent: 'major', degreeIndices: [0, 1, 2, 4, 5] },
  minorPentatonic: { label: 'Minor Pentatonic', parent: 'naturalMinor', degreeIndices: [0, 2, 3, 4, 6] },
  blues: { label: 'Blues', parent: 'naturalMinor', degreeIndices: [0, 2, 3, null, 4, 6] }, // null = inserted ♭5
};

export const ALL_SCALE_TYPES = { ...SCALES, majorPentatonic: DERIVED_SCALES.majorPentatonic,
  minorPentatonic: DERIVED_SCALES.minorPentatonic, blues: DERIVED_SCALES.blues };

/**
 * Spell a 7-note diatonic scale from a root letter/accidental and an
 * interval pattern, assigning each degree the next consecutive letter so
 * enharmonics come out correctly (e.g. F# major -> F# G# A# B C# D# E#,
 * not F# G# A# B C# D# F).
 */
function spellDiatonic(rootLetter, rootAcc, intervals) {
  const startIdx = LETTERS.indexOf(rootLetter);
  const rootPc = ((LETTER_PC[rootLetter] + rootAcc) % 12 + 12) % 12;
  return intervals.map((offset, i) => {
    const letter = LETTERS[(startIdx + i) % 7];
    const targetPc = (rootPc + offset) % 12;
    const naturalPc = LETTER_PC[letter];
    let acc = ((targetPc - naturalPc) % 12 + 12) % 12;
    if (acc > 6) acc -= 12; // fold into [-6, 6]; valid diatonic spellings land in [-2, 2]
    return { letter, acc, pc: targetPc, degree: i + 1 };
  });
}

/**
 * Get a scale's spelled notes for a given root.
 * @param {number} rootPc - pitch class 0-11
 * @param {string} scaleType - key into ALL_SCALE_TYPES
 */
export function getScale(rootPc, scaleType) {
  const root = rootByPc(rootPc);
  if (SCALES[scaleType]) {
    return spellDiatonic(root.letter, root.acc, SCALES[scaleType].intervals);
  }
  const derived = DERIVED_SCALES[scaleType];
  if (!derived) throw new Error(`Unknown scale type: ${scaleType}`);
  const parentNotes = spellDiatonic(root.letter, root.acc, SCALES[derived.parent].intervals);

  if (scaleType === 'blues') {
    // minor pentatonic degrees (1, b3, 4, 5, b7) plus an inserted b5
    // (the "blue note") spelled as the 5th degree's letter, flattened.
    const fifth = parentNotes[4];
    const flatFive = { letter: fifth.letter, acc: fifth.acc - 1, pc: (fifth.pc + 11) % 12, degree: '♭5' };
    return [parentNotes[0], parentNotes[2], parentNotes[3], flatFive, parentNotes[4], parentNotes[6]];
  }
  return derived.degreeIndices.map((idx) => parentNotes[idx]);
}

/** e.g. { letter:'F', acc:1 } -> "F♯" */
export function noteLabel(note) {
  return `${note.letter}${ACCIDENTAL_SYMBOL[note.acc] || ''}`;
}

/** MIDI note number from pitch class + octave (octave 4 = middle-C octave). */
export function toMidi(pc, octave = 4) {
  return 12 * (octave + 1) + ((pc % 12) + 12) % 12;
}

/**
 * Spell a scale AND place each note on a strictly-ascending MIDI range
 * starting at `baseOctave`. Shared by explore.js and quiz.js so both get
 * playable note sequences from the same logic.
 */
export function scaleWithMidi(rootPc, scaleType, baseOctave = 4) {
  const notes = getScale(rootPc, scaleType);
  const rootPcVal = notes[0].pc;
  return notes.map((n) => ({
    ...n,
    midi: toMidi(n.pc, baseOctave) + (n.pc < rootPcVal ? 12 : 0),
  }));
}

const INTERVAL_NAMES = [
  'Unison', 'Minor 2nd', 'Major 2nd', 'Minor 3rd', 'Major 3rd', 'Perfect 4th',
  'Tritone', 'Perfect 5th', 'Minor 6th', 'Major 6th', 'Minor 7th', 'Major 7th', 'Octave',
];

export function intervalName(semitones) {
  const n = ((semitones % 12) + 12) % 12;
  return semitones % 12 === 0 && semitones !== 0 ? 'Octave' : INTERVAL_NAMES[n];
}

export function semitonesBetween(midiA, midiB) {
  return Math.abs(midiB - midiA);
}
