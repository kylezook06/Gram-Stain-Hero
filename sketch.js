// MicroBuddyz Gram Stain – Per-cell Game Version
// Paste into editor.p5js.org and remove any old sketch code first.

// ---------- CONFIG ----------

const WIDTH = 900;
const HEIGHT = 600;

const COLORS = {
  bg: "#fdf7f2",
  table: "#f0e4da",
  tableShadow: "#d5c1b2",
  slide: "#f7fbff",
  slideBorder: "#b1c8dd",
  purple: "#7b4fff",
  pink: "#ff639b",
  neutralPos: "#f6d8a8", // pale beige
  neutralNeg: "#c7f0eb", // pale teal
  bottleOutline: "#2b2b3a",
  textDark: "#3b2f2a",
  uiPanel: "#2f2931"
};

const CELLS_PER_SLIDE = 20;
const GAUGE_SPEED = 1.6;
const GAUGE_MIN = 35; // "good" low bound
const GAUGE_MAX = 75; // "good" high bound

// ---------- GLOBAL STATE ----------

// Overall state machine walks through: smear prep -> heat-fix -> staining flow -> microscope -> results
let gameState = "smear"; // "smear", "heatFix", "stain", "decolor", "microscope", "results"
let steps = ["crystal", "iodine", "decolor", "safranin"];
let currentStep = 0;

let reagents = [];
let slide;
let isPouring = false;
let decolorGauge = 0;

// Smear + heat-fix data
const GRID_COLS = 18;
const GRID_ROWS = 6;
let smearGrid;
let smearCoverage = 0;
let smearOverload = 0;

let heat = 0;
let isHeating = false;

let totalScore = 0;
let totalSlides = 0;

// ---------- SETUP ----------

function setup() {
  createCanvas(WIDTH, HEIGHT);
  textFont("sans-serif");
  startNewSlide();
}

function startNewSlide() {
  slide = new Slide();
  reagents = [];
  currentStep = 0;
  gameState = "smear";
  isPouring = false;
  decolorGauge = 0;
  initSmearGrid();
  heat = 0;
  isHeating = false;

  const labels = [
    { id: "crystal", name: "Crystal Violet", color: COLORS.purple },
    { id: "iodine", name: "Iodine", color: "#c28e1b" },
    { id: "decolor", name: "Decolorizer", color: "#b7d7ff" },
    { id: "safranin", name: "Safranin", color: COLORS.pink }
  ];

  const offsets = [-270, -90, 90, 270];
  for (let i = 0; i < labels.length; i++) {
    reagents.push(
      new ReagentButton(
        width / 2 + offsets[i],
        90,
        labels[i].id,
        labels[i].name,
        labels[i].color
      )
    );
  }
}

// ---------- MAIN DRAW ----------

function draw() {
  background(COLORS.bg);
  drawTable();
  drawHeader();

  if (gameState === "smear") {
    drawSlideBench();
    drawSmearStep();
    drawStatusBar();
  } else if (gameState === "heatFix") {
    drawSlideBench();
    drawHeatFixStep();
    drawStatusBar();
  } else if (gameState === "stain" || gameState === "decolor") {
    drawSlideBench();
    drawReagents();
    drawStatusBar();
    if (gameState === "decolor") {
      updateDecolorGauge();
      drawDecolorGauge();
    }
  } else if (gameState === "microscope") {
    drawMicroscope();
  } else if (gameState === "results") {
    drawResults();
  }
}

// ---------- LAYOUT ----------

function drawTable() {
  noStroke();
  fill(COLORS.tableShadow);
  rect(40, 130, width - 80, height - 160, 30);

  fill(COLORS.table);
  rect(20, 120, width - 40, height - 140, 26);
}

function drawHeader() {
  fill(COLORS.textDark);
  textAlign(CENTER, CENTER);
  textSize(22);
  text("MicroBuddyz Gram Stain Hero", width / 2, 32);

  textSize(14);
  let sub = "";
  if (gameState === "smear") sub = "Step 0 – Smear prep: paint an even layer.";
  else if (gameState === "heatFix") sub = "Step 0.5 – Heat fix: pass through the flame to stick cells.";
  else {
    let stepName = steps[currentStep] || "done";
    if (stepName === "crystal") sub = "Step 1 – Crystal Violet (primary stain)";
    if (stepName === "iodine") sub = "Step 2 – Iodine (mordant)";
    if (stepName === "decolor") sub = "Step 3 – Decolorizer (timing matters!)";
    if (stepName === "safranin") sub = "Step 4 – Safranin (counterstain)";
  }
  fill(80, 90);
  text(sub, width / 2, 58);

  // Simple total score HUD
  textAlign(RIGHT, CENTER);
  textSize(14);
  fill(COLORS.textDark);
  text(
    "Total score: " + totalScore + "   Slides played: " + totalSlides,
    width - 40,
    35
  );
}

// ---------- BENCH VIEW ----------

function drawSlideBench() {
  // slide
  push();
  rectMode(CENTER);
  translate(width / 2, height / 2 + 50);

  // shadow
  noStroke();
  fill(0, 0, 0, 40);
  rect(12, 18, width * 0.56, height * 0.2, 20);

  stroke(COLORS.slideBorder);
  strokeWeight(4);
  fill(COLORS.slide);
  rect(0, 0, width * 0.56, height * 0.2, 20);
  pop();

  slide.drawCellsBench(steps[currentStep]);
}

function drawReagents() {
  for (let i = 0; i < reagents.length; i++) {
    let r = reagents[i];
    let isCurrent = steps[currentStep] === r.id;
    let isDone = i < currentStep;
    r.draw(isCurrent, isDone);
  }
}

function drawStatusBar() {
  push();
  noStroke();
  fill(COLORS.uiPanel);
  rect(0, height - 80, width, 80);

  fill(255);
  textAlign(CENTER, CENTER);
  textSize(16);
  let msg = "";
  if (gameState === "smear") {
    msg = "Click and drag to paint an even smear. Avoid thick blobs.";
  } else if (gameState === "heatFix") {
    msg = "Hold on the slide over the flame; stay in the green heat zone.";
  } else if (gameState === "stain") {
    let s = steps[currentStep];
    if (s === "crystal") msg = "Click CRYSTAL VIOLET to flood all MicroBuddyz.";
    if (s === "iodine") msg = "Click IODINE to lock in the purple stain.";
    if (s === "decolor") msg = "Click DECOLORIZER, then hold on the slide to rinse.";
    if (s === "safranin") msg = "Click SAFRANIN to counterstain Gram– buddies pink.";
  } else if (gameState === "decolor") {
    msg = "Hold on the slide to decolorize. Release in the green zone to separate Gram+ from Gram–.";
  }
  text(msg, width / 2, height - 40);
  pop();
}

function drawDecolorGauge() {
  const x = width / 2 - 200;
  const y = height - 120;
  const w = 400;
  const h = 18;

  noStroke();
  fill(0, 0, 0, 40);
  rect(x - 2, y - 2, w + 4, h + 4, 10);

  // good window
  fill("#c5f2c7");
  let sx = x + (GAUGE_MIN / 100) * w;
  let sw = ((GAUGE_MAX - GAUGE_MIN) / 100) * w;
  rect(sx, y, sw, h, 10);

  // fill
  fill("#81a4ff");
  rect(x, y, (decolorGauge / 100) * w, h, 10);

  noFill();
  stroke(255);
  strokeWeight(2);
  rect(x, y, w, h, 10);

  noStroke();
  fill(255);
  textAlign(CENTER, BOTTOM);
  textSize(12);
  text("Decolorizer Flow", width / 2, y - 5);
}

// ---------- SMEAR + HEAT-FIX MINI-GAMES ----------

function initSmearGrid() {
  smearGrid = [];
  for (let y = 0; y < GRID_ROWS; y++) {
    smearGrid[y] = [];
    for (let x = 0; x < GRID_COLS; x++) smearGrid[y][x] = 0;
  }
  smearCoverage = 0;
  smearOverload = 0;
}

function computeSmearStats() {
  const total = GRID_COLS * GRID_ROWS;
  let covered = 0;
  let overloaded = 0;
  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 0; x < GRID_COLS; x++) {
      let t = smearGrid[y][x];
      if (t > 0) covered++;
      if (t > 3) overloaded++;
    }
  }
  smearCoverage = covered / total;
  smearOverload = overloaded / total;
}

function drawSmearStep() {
  drawSmearPaint();

  const coveragePct = floor(smearCoverage * 100);
  const overloadPct = floor(smearOverload * 100);

  // Status box
  fill(0, 0, 0, 50);
  noStroke();
  rect(width / 2 - 150, height / 2 + 120, 300, 60, 10);
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(14);
  text(`Coverage: ${coveragePct}%   Thick spots: ${overloadPct}%`, width / 2, height / 2 + 150);

  drawActionButton(width / 2 - 70, height - 120, 140, 36, "Finish Smear");
}

function drawSmearPaint() {
  // smear overlay based on grid thickness
  let sx = width / 2 - (width * 0.56) / 2 + 24;
  let sy = height / 2 + 50 - (height * 0.2) / 2 + 12;
  let cw = (width * 0.56 - 48) / GRID_COLS;
  let ch = (height * 0.2 - 24) / GRID_ROWS;

  noStroke();
  for (let gy = 0; gy < GRID_ROWS; gy++) {
    for (let gx = 0; gx < GRID_COLS; gx++) {
      let t = smearGrid?.[gy]?.[gx] ?? 0;
      if (t > 0) {
        let alpha = constrain(40 + t * 35, 40, 170);
        fill(120, 80, 160, alpha);
        rect(sx + gx * cw, sy + gy * ch, cw, ch, 4);
      }
    }
  }
}

function finalizeSmear() {
  computeSmearStats();
  slide.setSmearStats(smearCoverage, smearOverload);
  gameState = "heatFix";
}

function drawHeatFixStep() {
  drawFlame();

  // Thermometer
  const barX = width - 80;
  const barY = height / 2 + 40;
  const barH = 220;
  stroke(0, 50);
  strokeWeight(2);
  noFill();
  rect(barX, barY - barH / 2, 24, barH, 8);

  noStroke();
  fill(140, 240, 140, 160);
  const targetMin = 40;
  const targetMax = 72;
  let ty1 = map(targetMax, 0, 100, barY + barH / 2, barY - barH / 2);
  let ty2 = map(targetMin, 0, 100, barY + barH / 2, barY - barH / 2);
  rect(barX + 2, ty1, 20, ty2 - ty1, 6);

  fill(255, 110, 120, 220);
  let hy = map(heat, 0, 100, barY + barH / 2, barY - barH / 2);
  rect(barX + 2, hy, 20, barY + barH / 2 - hy, 6);

  fill(0, 80);
  textAlign(CENTER, CENTER);
  textSize(12);
  text("Heat", barX + 12, barY - barH / 2 - 12);

  drawActionButton(width / 2 - 90, height - 120, 180, 38, "Done Heat-Fix");
}

function drawFlame() {
  push();
  translate(width / 2, height / 2 + 160);
  noStroke();
  fill(30, 144, 255, 160);
  ellipse(0, 0, 180, 30);
  fill(255, 190, 80, 180);
  triangle(-20, 0, 0, -60, 20, 0);
  pop();

  if (isHeating) {
    heat = min(100, heat + 0.7);
  } else {
    heat = max(0, heat - 0.35);
  }
}

function finalizeHeatFix() {
  slide.setHeatLevel(heat);
  gameState = "stain";
}

function getHeatQuality(level) {
  const ideal = 56;
  const tolerance = 24;
  const delta = abs(level - ideal);
  const penalty = constrain(delta / tolerance, 0, 1);
  return constrain(1 - penalty * 0.6, 0.25, 1);
}

function updateDecolorGauge() {
  if (gameState === "decolor" && isPouring) {
    decolorGauge = constrain(decolorGauge + GAUGE_SPEED, 0, 100);
  }
}

// ---------- MICROSCOPE & RESULTS ----------

function drawMicroscope() {
  background("#151018");
  fill(255);
  textAlign(CENTER, TOP);
  textSize(22);
  text("Microscope View", width / 2, 25);

  const cx = width / 2;
  const cy = height / 2 + 20;
  const r = 190;

  // vignette
  noStroke();
  fill(10);
  rect(0, 80, width, height - 120);

  // scope circle
  fill("#1d1b29");
  ellipse(cx, cy, r * 2 + 18, r * 2 + 18);
  fill("#f8f9ff");
  ellipse(cx, cy, r * 2, r * 2);

  slide.drawCellsMicroscope(cx, cy, r);

  fill(255);
  textAlign(CENTER, TOP);
  textSize(15);
  text("Purple = Gram+, Pink = Gram–. How many did you nail?", width / 2, 90);

  drawButton(width / 2 - 70, height - 80, 140, 42, "Show Results");
}

function drawResults() {
  background("#17151e");
  fill(255);
  textAlign(CENTER, TOP);
  textSize(24);
  text("Slide Result", width / 2, 60);

  textSize(16);
  text(
    `Correctly stained cells: ${slide.correctCount} / ${slide.aliveCount || slide.cells.length}`,
    width / 2,
    130
  );

  textSize(14);
  const resultsTextWidth = 600;
  const resultsTextX = (width - resultsTextWidth) / 2;
  textAlign(LEFT, TOP);
  text(slide.feedback, resultsTextX, 170, resultsTextWidth, 230); // keep within canvas width
  textAlign(CENTER, TOP);

  drawButton(width / 2 - 150, height - 100, 120, 42, "Replay View");
  drawButton(width / 2 + 30, height - 100, 120, 42, "Next Slide");
}

function drawButton(x, y, w, h, label) {
  let hover = mouseX > x && mouseX < x + w && mouseY > y && mouseY < y + h;
  noStroke();
  fill(hover ? "#ff9f7b" : "#ff845b");
  rect(x, y, w, h, 10);
  fill(30);
  textAlign(CENTER, CENTER);
  textSize(14);
  text(label, x + w / 2, y + h / 2);
}

function drawActionButton(x, y, w, h, label) {
  drawButton(x, y, w, h, label);
}

// ---------- MODEL: SLIDE & CELLS ----------

class Slide {
  constructor() {
    this.cells = [];
    this.correctCount = 0;
    this.feedback = "";
    this.smearCoverage = 1;
    this.smearOverload = 0;
    this.heatLevel = 55;

    // bench positions
    let slideX1 = width / 2 - (width * 0.56) / 2 + 40;
    let slideX2 = width / 2 + (width * 0.56) / 2 - 40;
    let slideY = height / 2 + 50;
    let slideH = height * 0.2 - 40;

    for (let i = 0; i < CELLS_PER_SLIDE; i++) {
      let x = random(slideX1, slideX2);
      let y = random(slideY - slideH / 2, slideY + slideH / 2);

      // microscope positions
      let ang = random(TWO_PI);
      let radius = random(25, 160);
      let sx = cos(ang) * radius;
      let sy = sin(ang) * radius;

      let gram = random() < 0.5 ? "positive" : "negative";
      let morph = random() < 0.5 ? "coccus" : "rod";

      this.cells.push(new Cell(x, y, sx, sy, gram, morph));
    }
  }

  drawCellsBench(step) {
    for (let c of this.cells) {
      if (!c.alive) continue;
      c.drawBench(step);
    }
  }

  drawCellsMicroscope(cx, cy, r) {
    for (let c of this.cells) {
      if (!c.alive) continue;
      let px = cx + c.scopeX;
      let py = cy + c.scopeY;
      if (dist(px, py, cx, cy) < r - 8) {
        c.drawMicroscope(px, py);
      }
    }
  }

  setSmearStats(coverage, overload) {
    this.smearCoverage = coverage;
    this.smearOverload = overload;
  }

  setHeatLevel(level) {
    this.heatLevel = level;
  }

  applyDecolorAndSafranin() {
    // Map gauge to qualitative level 0..1
    let g = decolorGauge / 100;

    const smearQuality = constrain(this.smearCoverage - this.smearOverload * 0.5, 0, 1);
    const heatQuality = getHeatQuality(this.heatLevel);

    // For each cell, decide final color
    this.correctCount = 0;
    this.aliveCount = 0;

    for (let c of this.cells) {
      const survivalProb = constrain(smearQuality * heatQuality, 0, 1);
      c.alive = random() < survivalProb;
      if (!c.alive) {
        c.finalColor = null;
        continue;
      }
      this.aliveCount++;

      // Jitter per cell so it's not perfectly deterministic
      let jitter = random(-0.08, 0.08);
      let effective = constrain(g + jitter, 0, 1);

      if (c.trueGram === "positive") {
        // Gram+: stay purple unless very strong decolorization
        if (effective < 0.7) {
          c.finalColor = COLORS.purple;
        } else {
          // over-decolorized, picks up safranin
          c.finalColor = COLORS.pink;
        }
      } else {
        // Gram–: need decent decolorization to lose purple
        if (effective < 0.4) {
          c.finalColor = COLORS.purple; // under-decolorized
        } else {
          c.finalColor = COLORS.pink;
        }
      }

      // scoring
      let expected = c.trueGram === "positive" ? COLORS.purple : COLORS.pink;
      if (c.finalColor === expected) {
        this.correctCount++;
      }
    }

    totalScore += this.correctCount;
    totalSlides++;

    this.buildFeedback(g);
  }

  buildFeedback(g) {
    let line;
    if (g < GAUGE_MIN / 100) {
      line = "You under-decolorized overall, so many Gram– buddies stayed falsely purple.";
    } else if (g > GAUGE_MAX / 100) {
      line = "You over-decolorized overall, so some Gram+ buddies lost their purple and turned pink.";
    } else {
      line = "Nice timing! Most Gram+ buddies stayed purple and most Gram– buddies picked up pink.";
    }

    this.feedback =
      "Each MicroBuddy has a true Gram type.\n\n" +
      "Purple bodies = Gram positive, Pink bodies = Gram negative.\n\n" +
      line + "\n\n" +
      `You correctly stained ${this.correctCount} out of ${this.aliveCount || this.cells.length} visible cells on this slide.`;
  }
}

class Cell {
  constructor(x, y, sx, sy, gram, morph) {
    this.slideX = x;
    this.slideY = y;
    this.scopeX = sx;
    this.scopeY = sy;
    this.trueGram = gram; // "positive" or "negative"
    this.morph = morph; // "coccus" or "rod"
    this.finalColor = null; // set after decolor + safranin
    this.alive = true;
  }

  drawBuddyBody(size, colorHex) {
    stroke(lerpColor(color(colorHex), color("#333333"), 0.45));
    strokeWeight(size * 0.08);
    fill(colorHex);

    if (this.morph === "coccus") {
      ellipse(0, 0, size, size);
    } else {
      rectMode(CENTER);
      rect(0, 0, size * 1.2, size * 0.7, size * 0.35);
    }

    // highlight
    noStroke();
    fill(255, 255, 255, 70);
    ellipse(-size * 0.25, -size * 0.25, size * 0.35, size * 0.25);

    // eyes
    let eyeOffset = this.morph === "coccus" ? size * 0.3 : size * 0.32;
    stroke(0, 70);
    strokeWeight(size * 0.04);
    fill(255);
    ellipse(-eyeOffset, -size * 0.12, size * 0.3, size * 0.3);
    ellipse(eyeOffset, -size * 0.12, size * 0.3, size * 0.3);

    noStroke();
    fill(40);
    ellipse(-eyeOffset, -size * 0.12, size * 0.16, size * 0.16);
    ellipse(eyeOffset, -size * 0.12, size * 0.16, size * 0.16);

    // “safety eye” glint
    fill(255, 255, 255, 230);
    ellipse(-eyeOffset - size * 0.06, -size * 0.17, size * 0.08, size * 0.08);
    ellipse(eyeOffset - size * 0.06, -size * 0.17, size * 0.08, size * 0.08);

    // mouth
    stroke(40);
    strokeWeight(size * 0.04);
    noFill();
    arc(0, size * 0.15, size * 0.35, size * 0.25, 0, PI);
  }

  drawBench(step) {
    push();
    translate(this.slideX, this.slideY);

    // shadow
    noStroke();
    fill(0, 0, 0, 40);
    ellipse(4, 6, 26, 14);

    // choose color by step
    let colorHex;
    if (step === "crystal" || step === "iodine" || step === "decolor") {
      colorHex = COLORS.purple; // all purple after CV+iodine
    } else if (step === "safranin") {
      // show final colors if already decided
      colorHex = this.finalColor || COLORS.purple;
    } else {
      // base, before staining
      colorHex = this.trueGram === "positive" ? COLORS.neutralPos : COLORS.neutralNeg;
    }

    this.drawBuddyBody(26, colorHex);
    pop();
  }

  drawMicroscope(px, py) {
    push();
    translate(px, py);

    let colorHex = this.finalColor || COLORS.purple;
    this.drawBuddyBody(32, colorHex);

    pop();
  }
}

// ---------- INPUT ----------

function mousePressed() {
  if (gameState === "smear") {
    if (isMouseOverButton(width / 2 - 70, height - 120, 140, 36)) {
      finalizeSmear();
      return;
    }
  } else if (gameState === "heatFix") {
    if (isMouseOnSlide()) {
      isHeating = true;
    }
    if (isMouseOverButton(width / 2 - 90, height - 120, 180, 38)) {
      finalizeHeatFix();
      return;
    }
  } else if (gameState === "stain") {
    // reagent clicks
    for (let r of reagents) {
      if (r.isMouseOver()) {
        handleReagentClick(r.id);
        return;
      }
    }
  } else if (gameState === "decolor") {
    if (isMouseOnSlide()) {
      isPouring = true;
    }
  } else if (gameState === "microscope") {
    // "Show Results" button
    if (isMouseOverButton(width / 2 - 70, height - 80, 140, 42)) {
      gameState = "results";
    }
  } else if (gameState === "results") {
    if (isMouseOverButton(width / 2 - 150, height - 100, 120, 42)) {
      gameState = "microscope";
    } else if (isMouseOverButton(width / 2 + 30, height - 100, 120, 42)) {
      startNewSlide();
    }
  }
}

function mouseReleased() {
  if (gameState === "decolor" && isPouring) {
    isPouring = false;
    // finalize cell colors based on gauge
    slide.applyDecolorAndSafranin();
    // move to saf step
    currentStep = 3; // saf
    gameState = "stain";
  }
  if (gameState === "heatFix") {
    isHeating = false;
  }
}

function mouseDragged() {
  if (gameState === "smear" && isMouseOnSlide()) {
    let sx = width / 2 - (width * 0.56) / 2 + 24;
    let sy = height / 2 + 50 - (height * 0.2) / 2 + 12;
    let cw = (width * 0.56 - 48) / GRID_COLS;
    let ch = (height * 0.2 - 24) / GRID_ROWS;

    let gx = floor((mouseX - sx) / cw);
    let gy = floor((mouseY - sy) / ch);
    if (gx >= 0 && gx < GRID_COLS && gy >= 0 && gy < GRID_ROWS) {
      smearGrid[gy][gx] = min(smearGrid[gy][gx] + 1, 6);
      computeSmearStats();
    }
  }
}

function handleReagentClick(id) {
  let expected = steps[currentStep];
  if (id !== expected) return;

  if (id === "crystal" || id === "iodine") {
    currentStep++;
  } else if (id === "decolor") {
    gameState = "decolor";
    decolorGauge = 0;
    isPouring = false;
  } else if (id === "safranin") {
    // after saf, go to microscope
    gameState = "microscope";
  }
}

function isMouseOnSlide() {
  let wSlide = width * 0.56;
  let hSlide = height * 0.2;
  let cx = width / 2;
  let cy = height / 2 + 50;

  return (
    mouseX > cx - wSlide / 2 + 20 &&
    mouseX < cx + wSlide / 2 - 20 &&
    mouseY > cy - hSlide / 2 + 10 &&
    mouseY < cy + hSlide / 2 - 10
  );
}

function isMouseOverButton(x, y, w, h) {
  return mouseX > x && mouseX < x + w && mouseY > y && mouseY < y + h;
}

// ---------- REAGENT BUTTONS ----------

class ReagentButton {
  constructor(x, y, id, label, colorHex) {
    this.x = x;
    this.y = y;
    this.id = id;
    this.label = label;
    this.colorHex = colorHex;
    this.w = 110;
    this.h = 130;
  }

  draw(isCurrent, isDone) {
    push();
    translate(this.x, this.y);

    let enabled = isCurrent && gameState === "stain";
    let hovered = enabled && this.isMouseOver();

    if (enabled) {
      noStroke();
      fill(this.colorHex + "33");
      ellipse(0, 60, this.w, this.h + 30);
    }

    stroke(COLORS.bottleOutline);
    strokeWeight(isCurrent ? 3 : 2);
    let c = color(this.colorHex);
    if (!enabled && !isDone) c = lerpColor(c, color("#cccccc"), 0.4);
    fill(c);
    rectMode(CENTER);
    rect(0, 60, this.w * 0.7, this.h * 0.65, 18); // body
    rect(0, 25, this.w * 0.35, this.h * 0.22, 10); // neck

    // label
    noStroke();
    fill(255, enabled ? 240 : 190);
    rect(0, 65, this.w * 0.48, this.h * 0.24, 8);

    // face
    fill(40);
    ellipse(-14, 60, 7, 7);
    ellipse(14, 60, 7, 7);
    noFill();
    stroke(40);
    strokeWeight(1.5);
    arc(0, 69, 12, 6, 0, 180);

    // text
    noStroke();
    fill(40);
    textAlign(CENTER, CENTER);
    textSize(11);
    text(this.label.split(" ")[0], 0, 84);

    fill(0, 120);
    textSize(10);
    text(this.id.toUpperCase(), 0, 5);

    if (isDone) {
      textSize(11);
      fill("#1d7f3b");
      text("✓", 0, -8);
    }

    if (hovered) {
      noFill();
      stroke(255, 220);
      strokeWeight(2);
      rect(0, 60, this.w * 0.8, this.h * 0.75, 20);
    }

    pop();
  }

  isMouseOver() {
    return (
      mouseX > this.x - this.w * 0.4 &&
      mouseX < this.x + this.w * 0.4 &&
      mouseY > this.y - 10 &&
      mouseY < this.y + this.h
    );
  }
}
