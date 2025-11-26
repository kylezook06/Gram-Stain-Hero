# Gram-Stain-Hero

MicroBuddyz-style Gram staining mini-game built with p5.js. Work through crystal violet → iodine → a timing-based decolorizer rinse → safranin, then read your slide in the microscope to see if you called the Gram reaction correctly.

## Try it locally
1. Open `index.html` in a browser (no build step required).
2. Click the reagent bottle buddies in order. Time the decolorizer in the green zone, then finish with safranin and check the microscope.

## What's included
- **MicroBuddy cells:** plush cocci and rods with safety eyes and soft shading on both the bench view and microscope view.
- **Reagent bottle buddies:** clickable bottles with hover/active states, step gating, and completion checkmarks.
- **Lab bench & microscope layout:** warm palette, slide shadows, decolorizer gauge mini-game, microscope readout, and score/replay screen.
- **Gameplay loop:** each slide randomizes Gram+ or Gram– cells, applies your decolorization quality (under/good/over), and explains how that affected your interpretation.

Paste the included `sketch.js` into editor.p5js.org to iterate further, or tweak the HTML/CSS locally to fit your lesson plan.
