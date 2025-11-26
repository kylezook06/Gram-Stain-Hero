# Gram-Stain-Hero

MicroBuddyz-style Gram staining mini-game built with p5.js. Flood with crystal violet, lock with iodine, time your decolorizer rinse → safranin, then hop to the microscope to see how many cells you stained correctly.

## Try it locally
1. Open `index.html` in a browser (no build step required). The canvas centers under the page heading via CSS.
2. Click the reagent bottle buddies in order. Hold on the slide during the Decolorizer step; release in the green zone.
3. Finish with safranin, jump to the microscope, and check your per-cell score.

> Looking for the “real game” plan instead of the current prototype? See [`DESIGN.md`](./DESIGN.md) for a step-by-step breakdown of how to turn each protocol step into a skill-based mini-game (smear grid, heat-fix thermometer, live decolor fade, interpretation scoring, and more).

## What's included
- **Plushy MicroBuddy cells:** mixed cocci and rods every slide, safety eyes, soft highlights, and scope-ready shading.
- **Bottle buddies UI:** clickable reagent bottles with hover/active states, gating, and completion checkmarks.
- **Per-cell scoring loop:** each slide contains a mix of Gram+ and Gram– cells; your decolorizer timing flips colors per-cell and adds to your total score.
- **Lab & scope layout:** centered canvas, warm bench palette, decolorizer gauge mini-game, microscope view, and results screen text constrained to the page.

Paste the included `sketch.js` into editor.p5js.org to iterate, or tweak the HTML/CSS locally to fit your lesson plan.
