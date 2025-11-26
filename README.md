# Gram-Stain-Hero

MicroBuddyz-style Gram staining mini-game built with p5.js. Flood with crystal violet, lock with iodine, time your decolorizer rinse → safranin, then hop to the microscope to see how many cells you stained correctly.

## Try it locally
1. Open `index.html` in a browser (no build step required). The canvas centers under the page heading via CSS.
2. Prep the slide: paint an even smear with your mouse, then heat-fix it by hovering over the flame until the thermometer sits in the green band.
3. Click the reagent bottle buddies in order. Hold on the slide during the Decolorizer step; release in the green zone.
4. Finish with safranin, jump to the microscope, and check your per-cell score.

> Looking for the “real game” plan instead of the current prototype? See [`DESIGN.md`](./DESIGN.md) for a step-by-step breakdown of how to turn each protocol step into a skill-based mini-game (smear grid, heat-fix thermometer, live decolor fade, interpretation scoring, and more).

## What's included
- **Plushy MicroBuddy cells:** mixed cocci and rods every slide, safety eyes, soft highlights, and scope-ready shading.
- **Bottle buddies UI:** clickable reagent bottles with hover/active states, gating, and completion checkmarks.
- **Smear + heat-fix mini-games:** draw an even smear and heat it without burning to keep cells alive for scoring.
- **Per-cell scoring loop:** each slide contains a mix of Gram+ and Gram– cells; your smear, heat, and decolorizer timing flip colors per-cell and add to your total score.
- **Lab & scope layout:** centered canvas, warm bench palette, decolorizer gauge mini-game, microscope view, and results screen text constrained to the page.

Paste the included `sketch.js` into editor.p5js.org to iterate, or tweak the HTML/CSS locally to fit your lesson plan.
