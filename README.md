# Gram-Stain-Hero

MicroBuddyz-style Gram staining mini-game built with p5.js. Work through crystal violet → iodine → a timing-based decolorizer rinse → safranin, then read your slide in the microscope to see if you called the Gram reaction correctly.

## Try it locally
1. Open `index.html` in a browser (no build step required). The canvas auto-centers under the page heading.
2. Click the reagent bottle buddies in order. Time the decolorizer in the green zone, then finish with safranin and check the microscope.

## What's included
- **MicroBuddy cells:** plush mixed cocci and rods with safety eyes and soft shading on both the bench view and microscope view.
- **Reagent bottle buddies:** clickable bottles with hover/active states, step gating, and completion checkmarks.
- **Lab bench & microscope layout:** warm palette, centered canvas, decolorizer gauge mini-game, microscope readout, and score/replay screen.
- **Gameplay loop:** alternating Gram+ and Gram– slides, mixed morphologies regardless of Gram reaction, timing-based scoring (score/lives HUD), and explanations of how your decolorization affected the interpretation.

Paste the included `sketch.js` into editor.p5js.org to iterate further, or tweak the HTML/CSS locally to fit your lesson plan.
