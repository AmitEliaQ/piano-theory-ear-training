# PianoScale Pro — Piano Theory & Ear Training

Interactive web app for learning piano scales visually and training your ear on intervals and scales. Zero-build static site — no Node, no bundler.

**Live:** https://amiteliaq.github.io/piano-theory-ear-training/

## Features

1. **Explore** — pick any of the 12 keys and 12 scale types (major, natural/harmonic/melodic minor, all 7 modes, major/minor pentatonic, blues). See the scale lit up on a piano keyboard (root in magenta, scale tones in cyan), its semitone-step formula, a full degree table, and play it ascending, descending, or as a chord.
2. **Quiz** — ear training for intervals (all 12, played ascending/descending/harmonic) and scale identification, across 3 difficulty tiers, with streak scoring persisted locally.

## Run locally

```sh
git clone https://github.com/AmitEliaQ/piano-theory-ear-training.git
cd piano-theory-ear-training
python3 -m http.server 8000
# open http://localhost:8000
```

No build step, no dependencies — just a static file server (any will do).

## Project structure

```
index.html          # app shell, tab nav
css/
  tokens.css         # design tokens (Stitch "Midnight Studio" design system)
  app.css            # component styles
js/
  theory.js           # note/scale/interval math (pure, tested)
  audio.js             # Web Audio synth engine
  keyboard.js           # SVG piano widget
  explore.js              # Feature 1
  quiz.js                  # Feature 2
  storage.js                # progress persistence
  main.js                    # bootstrap
design/              # Stitch design reference exports
```

## Dev workflow

- Design: [Stitch](https://stitch.withgoogle.com) project `764963942059691026` ("Piano Scale Master").
- A `post-commit` git hook (`.githooks/post-commit`, wired via `core.hooksPath`) auto-appends every commit's summary to an Obsidian dev log.
- Progress log: `~/dev/obsidian_files/Amit Project/Piano Theory App/02 - Dev Log.md`.
