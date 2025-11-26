# Gram Stain Hero — Game Design

This document captures a gameplay-first plan for turning the Gram stain protocol into a skill-based mini-game sequence instead of a passive coloring demo. Each real lab action maps to a mini-game with its own win/fail bands, feeds numeric outcomes into later steps, and culminates in an interpretation/score phase.

## Core goals
- Mirror the authentic Gram-staining flow while surfacing the ways a real tech can succeed or fail.
- Give every step an interactive skill element (timing, precision, coverage, gentle rinsing) rather than a "click to continue" gate.
- Chain mini-game outcomes into the final microscope view and scoring so early mistakes stay visible.
- Keep a light arcade feel: clear feedback, short loops, escalating difficulty, and streak/grade scoring.

## Step-by-step mini-games

### 1) Smear prep (coverage + thickness)
- **Mechanic:** Mouse-scribble inside a smear box; behind the scenes a small grid tracks coverage and thickness.
- **Feedback:** Darker pigment where thickness is high; a live coverage meter.
- **Scoring variables:** `coverage` (% cells touched) and `overload` (% over-thick). Poor coverage → bald patches later; overload → muddy purple later.

### 2) Heat-fix (thermometer juggling)
- **Mechanic:** Drag the slide through a flame; heat rises fast in the flame and decays outside it.
- **Feedback:** Thermometer with a green target band; scorch smoke if overheated.
- **Scoring variables:** `heat` final value. Too low → cells rinse off in later steps; too high → cracked/ghosted cells.

### 3) Crystal violet stain + gentle rinse
- **Mechanic:** Flood-to-cover then hold for a soak timer; rinse by tilting the slide to let water run off an edge without blasting the smear.
- **Feedback:** Coverage outline turns solid when flooded; soak timer bar; rinse angle arrow; cell loss if rinse is too strong.
- **Scoring variables:** `cvSoakTime`, `cvRinseHarshness`, and cell retention after rinse.

### 4) Iodine (mordant) + rinse
- **Mechanic:** Similar to crystal violet but with a shorter soak; rinse can still wash cells off.
- **Feedback:** Lock-in meter; gentle rinse warning flashes.
- **Scoring variables:** `iodineSoakTime`, `iodineRinseHarshness`. Low soak makes Gram+ easier to wash out during decolorization.

### 5) Decolorizer (the boss fight)
- **Mechanic:** Live MicroBuddy view while alcohol flows. Gram– fade rapidly; Gram+ fade slowly after a grace period. Hold mouse to flow; release when runoff visually clears.
- **Modes:** Easy shows a gauge with a sweet zone; hard relies only on visual fade and runoff clarity.
- **Scoring variables:** `decolorLevel` per cell (with slight jitter) → drives whether each cell stays purple or loses stain.

### 6) Safranin + rinse
- **Mechanic:** Flood, brief soak, gentle rinse. Only decolorized areas pick up strong pink; over-rinsing makes Gram– too faint.
- **Feedback:** Pink intensity tied to prior decolor level; muddy red if not rinsed at all.
- **Scoring variables:** `safSoakTime`, `safRinseHarshness` influence final pink strength and residual purple.

### 7) Dry & observe
- **Mechanic:** Blot with bibulous pads (clicks). Dragging while blotting smears the image slightly.
- **Observation:** Large circular scope view. Player chooses an interpretation: "Mostly Gram+" or "Mostly Gram–" (or a finer grading later).
- **Scoring variables:** Technique score (sum of earlier variables → per-cell correctness) and interpretation score (did the call match the true mix?).

## Slide variety & difficulty
- Alternate or randomize slide biology: classic Gram+, classic Gram–, old Gram+ (decolorizes easier), mixed samples, low-density smears.
- Difficulty ramps by tightening timing windows, hiding gauges (especially in decolorization), and making rinse/heat tolerances stricter.
- Scoring: per-cell correctness (+1 per correctly colored cell), slide grade (S/A/B/C), streak bonuses for consecutive correct interpretations, and a life/strike system for sloppy runs.

## State machine structure (p5.js)
Use a thin state machine that forwards draw/update/input to each mini-game module:
```js
let state = "smear"; // smear, heatFix, crystal, iodine, decolor, safranin, dry, microscope, results

function draw() {
  background(240);
  switch (state) {
    case "smear":      smear.draw();      break;
    case "heatFix":    heatFix.draw();    break;
    case "crystal":    crystal.draw();    break;
    case "iodine":     iodine.draw();     break;
    case "decolor":    decolor.draw();    break;
    case "safranin":   safranin.draw();   break;
    case "dry":        dry.draw();        break;
    case "microscope": microscope.draw(); break;
    case "results":    results.draw();    break;
  }
}

function mouseDragged() {
  if (state === "smear") smear.handleDrag();
  // ...forward other inputs similarly per state
}
```
Each module owns its timers/meters and exposes a summary object (e.g., `{coverage, overload}`) that the `Slide` model stores. The microscope view reads those values to compute per-cell outcomes.

## Immediate build order
1. **Implement smear grid + heat thermometer** to make the opening steps skillful.
2. **Upgrade decolorizer to live-fade MicroBuddyz** (with optional gauge), using the per-cell timing jitter already present in `slide.applyDecolorAndSafranin()` as a starting point.
3. **Wire per-step outputs into scoring** so early mistakes persist through microscope grading.
4. **Add interpretation buttons** on the microscope screen to grade both technique and player diagnosis.

## Centering & layout guardrails
- Keep the slide and UI anchored to `width/2` using `rectMode(CENTER)` and symmetric reagent positions (e.g., `width/2 ± 270`, `width/2 ± 90`).
- Use `textAlign(CENTER, …)` for titles/status text; constrain paragraphs with explicit widths (e.g., `text(msg, width/2, y, 600, h)`) to prevent drift.

This plan gives each protocol step a clear skill check, links failures to visible outcomes, and keeps the loop arcade-friendly for repeat play.
