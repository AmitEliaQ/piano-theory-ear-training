// storage.js — quiz progress persistence (localStorage). Wrapped in
// try/catch throughout: private-browsing / storage-disabled must degrade
// to an in-memory session rather than crash the quiz.

const STORAGE_KEY = 'pianoTheoryApp.progress.v1';

function defaultProgress() {
  return {
    interval: { correct: 0, total: 0, streak: 0, bestStreak: 0, perType: {} },
    scale: { correct: 0, total: 0, streak: 0, bestStreak: 0, perType: {} },
  };
}

export function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProgress();
    const parsed = JSON.parse(raw);
    // Merge over defaults so a future field addition doesn't crash on old saves.
    return { ...defaultProgress(), ...parsed };
  } catch {
    return defaultProgress();
  }
}

export function saveProgress(progress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // storage unavailable — quiz still works, just doesn't persist
  }
}

/**
 * Record one answer and persist. `quizType` is 'interval' | 'scale';
 * `answerKey` identifies the question (semitone count or scale type key).
 */
export function recordAnswer(progress, quizType, answerKey, correct) {
  const bucket = progress[quizType];
  bucket.total += 1;
  if (correct) {
    bucket.correct += 1;
    bucket.streak += 1;
    bucket.bestStreak = Math.max(bucket.bestStreak, bucket.streak);
  } else {
    bucket.streak = 0;
  }
  if (!bucket.perType[answerKey]) bucket.perType[answerKey] = { correct: 0, total: 0 };
  bucket.perType[answerKey].total += 1;
  if (correct) bucket.perType[answerKey].correct += 1;

  saveProgress(progress);
  return progress;
}

export function resetProgress() {
  const p = defaultProgress();
  saveProgress(p);
  return p;
}
