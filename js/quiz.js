// quiz.js — Feature 2: audio ear-training. Two modes (Interval ID, Scale
// ID), three difficulty tiers, multiple choice, streak scoring persisted
// via storage.js. Shares PianoKeyboard/AudioEngine with explore.js.

import { ALL_SCALE_TYPES, intervalName, scaleWithMidi } from './theory.js';
import { audioEngine } from './audio.js';
import { PianoKeyboard } from './keyboard.js';
import { loadProgress, recordAnswer, resetProgress } from './storage.js';

const INTERVAL_TIERS = {
  easy: [3, 4, 5, 7, 12],                                   // m3, M3, P4, P5, Octave
  medium: [2, 3, 4, 5, 7, 9, 10, 12],                       // + M2, M6, m7
  hard: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],            // all 12 + octave
};

const SCALE_TIERS = {
  easy: ['major', 'naturalMinor'],
  medium: ['major', 'naturalMinor', 'harmonicMinor', 'melodicMinor', 'majorPentatonic', 'minorPentatonic'],
  hard: Object.keys(ALL_SCALE_TYPES),
};

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildOptions(pool, correctValue) {
  const opts = new Set([correctValue]);
  const maxOpts = Math.min(4, pool.length);
  let guard = 0;
  while (opts.size < maxOpts && guard++ < 50) opts.add(randomChoice(pool));
  return shuffle([...opts]);
}

function generateIntervalQuestion(difficulty, lastAnswer) {
  const pool = INTERVAL_TIERS[difficulty];
  let semitones;
  do { semitones = randomChoice(pool); } while (pool.length > 1 && semitones === lastAnswer);

  const rootMidi = 55 + Math.floor(Math.random() * 13); // G3..G4-ish, comfortable register
  const targetMidi = rootMidi + semitones;
  const mode = randomChoice(['ascending', 'descending', 'harmonic']);

  return {
    type: 'interval',
    answerKey: semitones,
    rootMidi,
    targetMidi,
    mode,
    options: buildOptions(pool, semitones).map((s) => ({ value: s, label: intervalName(s) })),
    correctLabel: intervalName(semitones),
  };
}

function generateScaleQuestion(difficulty, lastAnswer) {
  const pool = SCALE_TIERS[difficulty];
  let scaleType;
  do { scaleType = randomChoice(pool); } while (pool.length > 1 && scaleType === lastAnswer);

  const rootPc = Math.floor(Math.random() * 12);
  const notes = scaleWithMidi(rootPc, scaleType);

  return {
    type: 'scale',
    answerKey: scaleType,
    rootPc,
    notes,
    options: buildOptions(pool, scaleType).map((key) => ({ value: key, label: ALL_SCALE_TYPES[key].label })),
    correctLabel: ALL_SCALE_TYPES[scaleType].label,
  };
}

export function initQuiz(container) {
  let quizMode = 'interval';   // 'interval' | 'scale'
  let difficulty = 'medium';   // 'easy' | 'medium' | 'hard'
  let progress = loadProgress();
  let question = null;
  let lastAnswerKey = null;
  let answered = false;
  let keyboard;

  container.innerHTML = `
    <div class="glass-panel">
      <div class="quiz-topbar">
        <div class="control-group" style="margin:0;">
          <span class="control-label">Mode</span>
          <div class="mode-tabs" id="quiz-mode-tabs">
            <button data-mode="interval" class="chip-button selected">Intervals</button>
            <button data-mode="scale" class="chip-button">Scales</button>
          </div>
        </div>
        <div class="control-group" style="margin:0;">
          <span class="control-label">Difficulty</span>
          <div class="mode-tabs" id="quiz-difficulty-tabs">
            <button data-difficulty="easy" class="chip-button">Easy</button>
            <button data-difficulty="medium" class="chip-button selected">Medium</button>
            <button data-difficulty="hard" class="chip-button">Hard</button>
          </div>
        </div>
      </div>

      <div class="quiz-scoreboard" id="quiz-scoreboard"></div>

      <div class="quiz-play-row">
        <button class="play-button big-play-button" id="quiz-play">▶ Play</button>
        <span class="quiz-question-hint" id="quiz-hint"></span>
      </div>

      <div class="answer-grid" id="quiz-answers"></div>

      <div class="quiz-feedback" id="quiz-feedback" hidden></div>

      <div class="keyboard-container" id="quiz-keyboard-container"></div>

      <div class="quiz-actions">
        <button class="play-button" id="quiz-next" hidden>Next Question →</button>
        <button class="play-button" id="quiz-reset">Reset Progress</button>
      </div>
    </div>
  `;

  keyboard = new PianoKeyboard(container.querySelector('#quiz-keyboard-container'), {
    startMidi: 48,
    octaves: 3,
    onKeyClick: (midi) => audioEngine.playNote(midi, 0.6),
  });
  keyboard.setNoteStates({}); // fully dim until an answer is revealed

  const scoreboardEl = container.querySelector('#quiz-scoreboard');
  const answersEl = container.querySelector('#quiz-answers');
  const feedbackEl = container.querySelector('#quiz-feedback');
  const hintEl = container.querySelector('#quiz-hint');
  const nextBtn = container.querySelector('#quiz-next');

  function renderScoreboard() {
    const bucket = progress[quizMode];
    const pct = bucket.total ? Math.round((bucket.correct / bucket.total) * 100) : 0;
    scoreboardEl.innerHTML = `
      <span><strong>${bucket.correct}</strong>/${bucket.total} correct (${pct}%)</span>
      <span>Streak: <strong>${bucket.streak}</strong> (best ${bucket.bestStreak})</span>
    `;
  }

  function playQuestion() {
    if (!question) return;
    if (question.type === 'interval') {
      audioEngine.playInterval(question.rootMidi, question.targetMidi, question.mode);
    } else {
      audioEngine.playSequence(question.notes.map((n) => n.midi), 320, 0.4);
    }
  }

  function renderAnswers() {
    answersEl.innerHTML = '';
    question.options.forEach((opt) => {
      const btn = document.createElement('button');
      btn.className = 'chip-button answer-button';
      btn.textContent = opt.label;
      btn.dataset.value = opt.value;
      btn.addEventListener('click', () => selectAnswer(opt.value));
      answersEl.appendChild(btn);
    });
  }

  function selectAnswer(value) {
    if (answered) return;
    answered = true;

    const correct = value === question.answerKey;
    progress = recordAnswer(progress, quizMode, question.answerKey, correct);
    renderScoreboard();

    answersEl.querySelectorAll('.answer-button').forEach((btn) => {
      const btnValue = btn.dataset.value;
      // dataset values are strings; compare loosely against both key types.
      if (String(btnValue) === String(question.answerKey)) btn.classList.add('correct');
      else if (String(btnValue) === String(value) && !correct) btn.classList.add('incorrect');
      btn.disabled = true;
    });

    feedbackEl.hidden = false;
    feedbackEl.textContent = correct
      ? `✅ Correct — ${question.correctLabel}`
      : `❌ Incorrect — it was ${question.correctLabel}`;
    feedbackEl.className = `quiz-feedback ${correct ? 'is-correct' : 'is-incorrect'}`;

    revealOnKeyboard();
    nextBtn.hidden = false;
  }

  function revealOnKeyboard() {
    const states = new Map();
    if (question.type === 'interval') {
      states.set(question.rootMidi, 'root');
      states.set(question.targetMidi, 'scale');
    } else {
      question.notes.forEach((n, i) => states.set(n.midi, i === 0 ? 'root' : 'scale'));
    }
    keyboard.setNoteStates(states);
  }

  function nextQuestion() {
    answered = false;
    feedbackEl.hidden = true;
    nextBtn.hidden = true;
    keyboard.setNoteStates({});

    question = quizMode === 'interval'
      ? generateIntervalQuestion(difficulty, lastAnswerKey)
      : generateScaleQuestion(difficulty, lastAnswerKey);
    lastAnswerKey = question.answerKey;

    hintEl.textContent = quizMode === 'interval' ? 'Identify the interval' : 'Identify the scale';
    renderAnswers();
    playQuestion();
  }

  container.querySelector('#quiz-mode-tabs').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-mode]');
    if (!btn) return;
    quizMode = btn.dataset.mode;
    container.querySelectorAll('#quiz-mode-tabs .chip-button').forEach((b) => b.classList.toggle('selected', b === btn));
    lastAnswerKey = null;
    renderScoreboard();
    nextQuestion();
  });

  container.querySelector('#quiz-difficulty-tabs').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-difficulty]');
    if (!btn) return;
    difficulty = btn.dataset.difficulty;
    container.querySelectorAll('#quiz-difficulty-tabs .chip-button').forEach((b) => b.classList.toggle('selected', b === btn));
    lastAnswerKey = null;
    nextQuestion();
  });

  container.querySelector('#quiz-play').addEventListener('click', playQuestion);
  nextBtn.addEventListener('click', nextQuestion);
  container.querySelector('#quiz-reset').addEventListener('click', () => {
    progress = resetProgress();
    renderScoreboard();
  });

  renderScoreboard();
  nextQuestion();
}
