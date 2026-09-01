// main.js — app bootstrap: tab nav + view init.

import { initExplore } from './explore.js';

const views = {
  explore: document.getElementById('explore-view'),
  quiz: document.getElementById('quiz-view'),
};

document.getElementById('app-nav').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-view]');
  if (!btn) return;
  const target = btn.dataset.view;

  document.querySelectorAll('#app-nav button').forEach((b) => b.classList.toggle('active', b === btn));
  Object.entries(views).forEach(([name, el]) => el.classList.toggle('active', name === target));
});

initExplore(views.explore);
