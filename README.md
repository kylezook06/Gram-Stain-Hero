# Gram-Stain-Hero

MicroBuddyz-style Gram staining mini-game built with p5.js. Flood with crystal violet, lock with iodine, time your decolorizer rinse → safranin, then hop to the microscope to see how many cells you stained correctly.

## Try it locally
1. Open `index.html` in a browser (no build step required). The canvas centers under the page heading via CSS.
2. Prep the slide: paint an even smear with your mouse, then heat-fix it by hovering over the flame until the thermometer sits in the green band.
3. Crystal violet mini-game: flood to 100% coverage, hold the soak bar until it fills, then tilt the slide by moving the mouse left/right while rinsing—more tilt slows the rinse and keeps the flow gentle. The ghost outline tilts with you and the step auto-finishes once the rinse bar fills.
4. Iodine mini-game: flood/soak quickly, watch the lock-in meter, then rinse with a visible tilt arrow and gentle-rinse warning. Mouse left/right controls tilt to slow the rinse and lower harshness; the step wraps when the rinse bar fills.
5. Decolorizer boss-fight: click the Decolorizer bottle to enter a live fade view. Hold on the slide to flow alcohol; Gram– buddies fade fast, Gram+ fade slowly after a grace period. In easy mode a gauge shows the sweet zone; otherwise rely on the visual fade/runoff clarity. Release to lock in your decolor level.
6. Safranin mini-game: flood/soak quickly, then rinse while tilting by moving the mouse horizontally. More tilt slows the rinse but softens the wash; decolorized areas drink in bright pink, over-rinsing makes Gram– faint, and skipping rinse leaves a muddy red sheen.
7. Dry & observe: click blot pads to dry the slide (dragging while blotting adds a small smear penalty), then head to the microscope. In the scope view, pick “Mostly Gram+” or “Mostly Gram–”; the call is graded against the colors you produced, while the “true mix” is shown separately for reference.
8. From slide two onward, the reagent bottle positions shuffle horizontally so you can’t follow the same left-to-right lane every round.

> Looking for the “real game” plan instead of the current prototype? See [`DESIGN.md`](./DESIGN.md) for a step-by-step breakdown of how to turn each protocol step into a skill-based mini-game (smear grid, heat-fix thermometer, live decolor fade, interpretation scoring, and more).

## What's included
- **Plushy MicroBuddy cells:** mixed cocci and rods every slide, safety eyes, soft highlights, and scope-ready shading.
- **Bottle buddies UI:** clickable reagent bottles with hover/active states, gating, and completion checkmarks.
- **Smear + heat-fix + crystal violet + iodine + safranin mini-games:** draw an even smear, heat it without burning, flood/soak/tilt-rinse crystal violet and iodine, then flood/soak/tilt-rinse safranin so only decolorized buddies pick up bright pink.
- **Decolorizer boss fight:** live MicroBuddy fade while alcohol flows; Gram– wash out fast, Gram+ resist. Easy mode shows a sweet-zone gauge; hard mode leans on runoff clarity and visual fade. Per-cell `decolorLevel` feeds final Gram reaction, safranin pickup, and scoring.
- **Per-cell scoring loop + interpretation calls:** each slide contains a mix of Gram+ and Gram– cells; your prep/stain timing flips colors per-cell for technique score, then you make a Gram call (graded against the observed colors you produced) for a small bonus to total score. True mix is still surfaced for learning.
- **Lab & scope layout:** centered canvas, warm bench palette, decolorizer gauge mini-game, microscope view, and results screen text constrained to the page.

Paste the included `sketch.js` into editor.p5js.org to iterate, or tweak the HTML/CSS locally to fit your lesson plan.
