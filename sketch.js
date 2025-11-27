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
const GAUGE_MIN = 35; // "good" low bound (used for easy-mode guidance)
const GAUGE_MAX = 75; // "good" high bound (used for easy-mode guidance)

// Decolorizer tuning
const DECOLOR_RATE_NEG = 1.2; // how quickly Gram– fade while alcohol flows
const DECOLOR_RATE_POS = 0.45; // slower fade for Gram+
const DECOLOR_POS_GRACE = 0.35; // seconds before Gram+ begin to fade
const DECOLOR_PREVIEW_CAP = 1.15; // cap for per-cell decolorLevel
const DECOLOR_SHOW_GAUGE = true; // easy mode: show a sweet-zone gauge

// Pointer tilt helpers for rinses
const POINTER_TILT_MAX = {
  crystal: 32,
  iodine: 30,
  safranin: 28
};

// Crystal violet mini-game tuning
const CV_GRID_COLS = 16;
const CV_GRID_ROWS = 5;
const CV_SOAK_GOAL_SEC = 3; // seconds you should hold once fully flooded
const CV_RINSE_PROGRESS_GOAL = 100; // arbitrary progress units before rinse is considered complete
const CV_RINSE_HARSH_TARGET = 6; // higher values = harsher rinse penalty threshold

// Iodine mini-game tuning
const IO_GRID_COLS = 16;
const IO_GRID_ROWS = 5;
const IO_SOAK_GOAL_SEC = 1.6; // shorter soak than crystal violet
const IO_RINSE_PROGRESS_GOAL = 80;
const IO_RINSE_HARSH_TARGET = 5;

// Safranin mini-game tuning
const SAF_GRID_COLS = 16;
const SAF_GRID_ROWS = 5;
const SAF_SOAK_GOAL_SEC = 1.2; // brief soak
const SAF_RINSE_PROGRESS_GOAL = 70;
const SAF_RINSE_HARSH_TARGET = 5;

// ---------- GLOBAL STATE ----------

// Overall state machine walks through: smear prep -> heat-fix -> staining flow -> dry -> microscope -> results
let gameState = "smear"; // "smear", "heatFix", "stain", "decolor", "dry", "microscope", "results"
let steps = ["crystal", "iodine", "decolor", "safranin"];
let currentStep = 0;

let reagents = [];
let slide;
let decolorGauge = 0;
let isDecolorFlowing = false;
let decolorRunoffHint = 0; // visual clarity cue (0 dull, 1 clear)

// Crystal violet mini-game state
let cvGrid;
let cvCoverage = 0;
let cvSoakTime = 0;
let cvStage = "flood"; // "flood" -> "soak" -> "rinse" -> "done"
let cvRinseProgress = 0;
let cvRinseHarshness = 0;
let cvTilt = -24; // degrees, negative tilts left for runoff
let isCvPouring = false;
let isCvRinsing = false;
let cvRinseTag = { label: "", color: "#ffffff", tiltNorm: 0 };

// Iodine mini-game state
let ioGrid;
let ioCoverage = 0;
let ioSoakTime = 0;
let ioStage = "flood"; // "flood" -> "soak" -> "rinse" -> "done"
let ioRinseProgress = 0;
let ioRinseHarshness = 0;
let ioTilt = -18;
let isIoPouring = false;
let isIoRinsing = false;
let ioRinseTag = { label: "", color: "#ffffff", tiltNorm: 0 };

// Safranin mini-game state
let safGrid;
let safCoverage = 0;
let safSoakTime = 0;
let safStage = "flood"; // "flood" -> "soak" -> "rinse" -> "done"
let safRinseProgress = 0;
let safRinseHarshness = 0;
let safTilt = -14;
let isSafPouring = false;
let isSafRinsing = false;
let safRinseTag = { label: "", color: "#ffffff", tiltNorm: 0 };

// Dry & observe mini-game state
let blotMarks = [];
let dryProgress = 0; // 0..1
let smearDragPenalty = 0;
let isBlotting = false;
let lastBlotX = 0;
let lastBlotY = 0;
let playerInterpretation = null; // "positive" | "negative"

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
let totalCalls = 0;
let totalCorrectCalls = 0;

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
  decolorGauge = 0;
  isDecolorFlowing = false;
  decolorRunoffHint = 0;
  initCrystalStage();
  initIodineStage();
  initSafraninStage();
  initSmearGrid();
  heat = 0;
  isHeating = false;
  blotMarks = [];
  dryProgress = 0;
  smearDragPenalty = 0;
  isBlotting = false;
  lastBlotX = 0;
  lastBlotY = 0;
  playerInterpretation = null;

  const labels = [
    { id: "crystal", name: "Crystal Violet", color: COLORS.purple },
    { id: "iodine", name: "Iodine", color: "#c28e1b" },
    { id: "decolor", name: "Decolorizer", color: "#b7d7ff" },
    { id: "safranin", name: "Safranin", color: COLORS.pink }
  ];

  const baseOffsets = [-270, -90, 90, 270];
  const offsets = baseOffsets.slice();

  // Starting on the second slide, shuffle the bottle layout to make the flow less obvious.
  if (totalSlides >= 1) {
    shuffleArray(offsets);
  }

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

// Fisher-Yates shuffle for small layout arrays
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = floor(random(i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
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
  } else if (gameState === "crystal") {
    drawSlideBench();
    drawCrystalStep();
    drawStatusBar();
  } else if (gameState === "iodine") {
    drawSlideBench();
    drawIodineStep();
    drawStatusBar();
  } else if (gameState === "safranin") {
    drawSlideBench();
    drawSafraninStep();
    drawStatusBar();
  } else if (gameState === "dry") {
    drawSlideBench("safranin");
    drawDryStep();
    drawStatusBar();
    drawDryPrompts();
  } else if (gameState === "stain") {
    drawSlideBench();
    drawReagents();
    drawStatusBar();
  } else if (gameState === "decolor") {
    drawSlideBench("decolorFlow", 0);
    drawDecolorStep();
    drawStatusBar();
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
    "Total score: " + totalScore + "   Slides: " + totalSlides + "   Calls: " + totalCorrectCalls + "/" + totalCalls,
    width - 40,
    35
  );
}

// ---------- BENCH VIEW ----------

function drawSlideBench(customStep = null, tiltOverride = null) {
  const slideCx = width / 2;
  const slideCy = height / 2 + 50;
  const tiltAngle =
    tiltOverride !== null
      ? tiltOverride
      : gameState === "crystal" && cvStage === "rinse"
        ? cvTilt * 0.35
        : gameState === "iodine" && ioStage === "rinse"
          ? ioTilt * 0.35
          : gameState === "safranin" && safStage === "rinse"
            ? safTilt * 0.35
            : 0; // gentle visual tilt

  // Slide with optional ghost tilt overlay to show rinse angle
  push();
  rectMode(CENTER);
  translate(slideCx, slideCy);

  // subtle ghost to show target tilt during rinse
  if (tiltAngle !== 0) {
    push();
    rotate(radians(tiltAngle));
    noFill();
    stroke(160, 190);
    strokeWeight(3);
    rect(0, 0, width * 0.56 + 10, height * 0.2 + 10, 22);
    pop();
  }

  // shadow
  noStroke();
  fill(0, 0, 0, 40);
  rect(12, 18, width * 0.56, height * 0.2, 20);

  stroke(COLORS.slideBorder);
  strokeWeight(4);
  fill(COLORS.slide);
  rect(0, 0, width * 0.56, height * 0.2, 20);
  pop();

  const stepKey = customStep ?? steps[currentStep];
  slide.drawCellsBench(stepKey, tiltAngle);
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
  } else if (gameState === "crystal") {
    if (cvStage === "flood") msg = "Flood the smear with crystal violet until the outline is solid.";
    else if (cvStage === "soak") msg = "Keep it covered while the soak timer finishes.";
    else if (cvStage === "rinse") msg = "Hold to rinse; tilt ◀ ▶ / A-D — more tilt slows flow and cuts harshness.";
  } else if (gameState === "iodine") {
    if (ioStage === "flood") msg = "Flood with iodine until the outline is solid.";
    else if (ioStage === "soak") msg = "Hold coverage for the quick iodine lock-in.";
    else if (ioStage === "rinse") msg = "Hold to rinse gently; tilt ◀ ▶ / A-D to slow the rinse and ease harshness.";
  } else if (gameState === "safranin") {
    if (safStage === "flood") msg = "Flood with safranin until the outline is solid.";
    else if (safStage === "soak") msg = "Brief soak to tint the pale spots.";
    else if (safStage === "rinse") msg = "Hold to rinse; tilt ◀ ▶ / A-D — more tilt = slower but gentler wash.";
  } else if (gameState === "stain") {
    let s = steps[currentStep];
    if (s === "crystal") msg = "Click CRYSTAL VIOLET to flood all MicroBuddyz.";
    if (s === "iodine") msg = "Click IODINE to lock in the purple stain.";
    if (s === "decolor") msg = "Click DECOLORIZER to start the live fade mini-game.";
    if (s === "safranin") msg = "Click SAFRANIN to counterstain Gram– buddies pink.";
  } else if (gameState === "decolor") {
    msg = "Hold on the slide to flow alcohol. Release when Gram– fade and runoff clears.";
  } else if (gameState === "dry") {
    msg = "Click to blot dry. Dragging while blotting will smear the slide slightly.";
  } else if (gameState === "microscope") {
    msg = "Choose Mostly Gram+ or Mostly Gram–, then show results.";
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

function getSlidePaintArea(cols = CV_GRID_COLS, rows = CV_GRID_ROWS) {
  const x = width / 2 - (width * 0.56) / 2 + 24;
  const y = height / 2 + 50 - (height * 0.2) / 2 + 12;
  const cw = (width * 0.56 - 48) / cols;
  const ch = (height * 0.2 - 24) / rows;
  return { x, y, cw, ch };
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
  let area = getSlidePaintArea(GRID_COLS, GRID_ROWS);

  noStroke();
  for (let gy = 0; gy < GRID_ROWS; gy++) {
    for (let gx = 0; gx < GRID_COLS; gx++) {
      let t = smearGrid?.[gy]?.[gx] ?? 0;
      if (t > 0) {
        let alpha = constrain(40 + t * 35, 40, 170);
        fill(120, 80, 160, alpha);
        rect(area.x + gx * area.cw, area.y + gy * area.ch, area.cw, area.ch, 4);
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

// ---------- CRYSTAL VIOLET MINI-GAME ----------

function initCrystalStage() {
  cvGrid = [];
  for (let y = 0; y < CV_GRID_ROWS; y++) {
    cvGrid[y] = [];
    for (let x = 0; x < CV_GRID_COLS; x++) cvGrid[y][x] = 0;
  }
  cvCoverage = 0;
  cvSoakTime = 0;
  cvStage = "flood";
  cvRinseProgress = 0;
  cvRinseHarshness = 0;
  cvTilt = -24;
  isCvPouring = false;
  isCvRinsing = false;
  cvRinseTag = computeRinseDynamics(cvTilt, 32);
}

// ---------- IODINE MINI-GAME ----------

function initIodineStage() {
  ioGrid = [];
  for (let y = 0; y < IO_GRID_ROWS; y++) {
    ioGrid[y] = [];
    for (let x = 0; x < IO_GRID_COLS; x++) ioGrid[y][x] = 0;
  }
  ioCoverage = 0;
  ioSoakTime = 0;
  ioStage = "flood";
  ioRinseProgress = 0;
  ioRinseHarshness = 0;
  ioTilt = -18;
  isIoPouring = false;
  isIoRinsing = false;
  ioRinseTag = computeRinseDynamics(ioTilt, 30);
}

function drawIodineStep() {
  progressIoSoak();
  drawIodineOverlay();
  drawIodineHUD();
  drawIodinePrompts();
}

function drawIodineOverlay() {
  let area = getSlidePaintArea(IO_GRID_COLS, IO_GRID_ROWS);
  noStroke();
  for (let gy = 0; gy < IO_GRID_ROWS; gy++) {
    for (let gx = 0; gx < IO_GRID_COLS; gx++) {
      let t = ioGrid?.[gy]?.[gx] ?? 0;
      if (t > 0) {
        let alpha = constrain(50 + t * 40, 50, 180);
        fill(194, 142, 27, alpha);
        rect(area.x + gx * area.cw, area.y + gy * area.ch, area.cw, area.ch, 5);
      }
    }
  }

  noFill();
  stroke(ioCoverage >= 0.95 ? color("#c28e1b") : color(130, 100));
  strokeWeight(3);
  rect(area.x - 4, area.y - 4, area.cw * IO_GRID_COLS + 8, area.ch * IO_GRID_ROWS + 8, 10);

  if (ioStage === "soak" || ioStage === "rinse") {
    drawIoSoakBar();
  }

  if (ioStage === "rinse") {
    updateIoRinse();
    drawIoRinseHUD();
  }
}

function drawIoSoakBar() {
  const barW = 240;
  const barH = 14;
  const x = width / 2 - barW / 2;
  const y = height / 2 + 130;
  const progress = constrain(ioSoakTime / IO_SOAK_GOAL_SEC, 0, 1);

  noStroke();
  fill(0, 0, 0, 40);
  rect(x - 2, y - 2, barW + 4, barH + 4, 8);

  fill("#f3d89c");
  rect(x, y, barW * progress, barH, 8);

  noFill();
  stroke(255);
  strokeWeight(2);
  rect(x, y, barW, barH, 8);

  noStroke();
  fill(40);
  textAlign(CENTER, BOTTOM);
  textSize(12);
  text("Iodine lock-in", width / 2, y - 6);
}

function drawIoRinseHUD() {
  const progressW = 300;
  const progressH = 14;
  const px = width / 2 - progressW / 2;
  const py = height / 2 + 160;
  const progress = constrain(ioRinseProgress / IO_RINSE_PROGRESS_GOAL, 0, 1);

  noStroke();
  fill(0, 0, 0, 40);
  rect(px - 2, py - 2, progressW + 4, progressH + 4, 8);

  fill("#cde6ff");
  rect(px, py, progressW * progress, progressH, 8);

  noFill();
  stroke(255);
  strokeWeight(2);
  rect(px, py, progressW, progressH, 8);

  const arrowY = height / 2 + 40;
  const arrowX = width / 2;
  stroke(40, 200);
  strokeWeight(3);
  line(arrowX - 60, arrowY, arrowX + 60, arrowY);
  push();
  translate(arrowX, arrowY);
  rotate(ioTilt);
  stroke(40);
  fill("#ffe8c4");
  triangle(-14, -8, 14, 0, -14, 8);
  pop();

  textAlign(CENTER, BOTTOM);
  textSize(13);
  fill(40);
  const harsh = ioRinseHarshness.toFixed(1);
  text(
    `Rinse harshness: ${harsh}   Progress: ${Math.floor(progress * 100)}%`,
    width / 2,
    py - 8
  );

  if (ioStage === "rinse") {
    textAlign(CENTER, TOP);
    fill(ioRinseTag.color);
    text(ioRinseTag.label + " (more tilt = slower/gentler)", width / 2, py + 20);
  }

  // gentle rinse warning
  if (ioRinseHarshness > IO_RINSE_HARSH_TARGET * 0.9) {
    fill(200, 80, 40);
    textAlign(CENTER, TOP);
    text("Too flat! Tilt more to keep iodine from blasting cells off.", width / 2, py + 24);
  } else {
    fill(40);
    textAlign(CENTER, TOP);
    text("Move mouse left/right while rinsing to tilt and slow runoff", width / 2, py + 24);
  }
}

function drawIodineHUD() {
  const coveragePct = floor(ioCoverage * 100);
  const boxW = 360;
  const boxH = 70;
  const boxX = width / 2 - boxW / 2;
  const boxY = height / 2 + 60;
  fill(0, 0, 0, 45);
  noStroke();
  rect(boxX, boxY, boxW, boxH, 12);

  fill(255);
  textAlign(CENTER, CENTER);
  textSize(14);
  let line1 = `Coverage: ${coveragePct}%`;
  let line2 = "";
  if (ioStage === "flood") line2 = "Click/drag to flood with iodine.";
  if (ioStage === "soak") line2 = "Hold coverage for a quick lock-in.";
  if (ioStage === "rinse") line2 = "Hold to rinse; move mouse left/right to tilt for gentler flow.";
  text(line1 + "\n" + line2, width / 2, boxY + boxH / 2);
}

function drawIodinePrompts() {
  if (ioStage === "soak" && ioSoakTime >= IO_SOAK_GOAL_SEC) {
    drawActionButton(width / 2 - 90, height - 120, 180, 38, "Start Iodine Rinse");
  } else if (ioStage === "rinse") {
    if (!isIoRinsing) {
      drawActionButton(width / 2 - 100, height - 120, 200, 38, "Hold on slide to rinse");
    }
    if (ioRinseProgress >= IO_RINSE_PROGRESS_GOAL && !isIoRinsing) {
      drawActionButton(width / 2 - 90, height - 70, 180, 38, "Finish Iodine Step");
    }
  }
}

function updateIoRinse() {
  if (ioStage !== "rinse") return;

  if (isIoRinsing) {
    ioTilt = getPointerTilt(POINTER_TILT_MAX.iodine);
    const frameScale = deltaTime / 16.67;
    const dynamics = computeRinseDynamics(ioTilt, POINTER_TILT_MAX.iodine);
    ioRinseTag = dynamics;

    ioRinseHarshness += dynamics.harshRate * frameScale;
    ioRinseProgress = min(ioRinseProgress + dynamics.flowRate * frameScale, IO_RINSE_PROGRESS_GOAL);
  }

  if (ioRinseProgress >= IO_RINSE_PROGRESS_GOAL && !isIoRinsing) {
    finishIodineStep();
  }
}

function paintIodineAt(mx, my) {
  let area = getSlidePaintArea(IO_GRID_COLS, IO_GRID_ROWS);
  if (mx < area.x || mx > area.x + area.cw * IO_GRID_COLS) return;
  if (my < area.y || my > area.y + area.ch * IO_GRID_ROWS) return;

  let gx = floor((mx - area.x) / area.cw);
  let gy = floor((my - area.y) / area.ch);
  if (gx >= 0 && gx < IO_GRID_COLS && gy >= 0 && gy < IO_GRID_ROWS) {
    ioGrid[gy][gx] = min(ioGrid[gy][gx] + 1, 5);
    computeIoCoverage();
    if (ioCoverage >= 0.95 && ioStage === "flood") {
      ioStage = "soak";
    }
  }
}

function computeIoCoverage() {
  let filled = 0;
  for (let y = 0; y < IO_GRID_ROWS; y++) {
    for (let x = 0; x < IO_GRID_COLS; x++) {
      if ((ioGrid?.[y]?.[x] ?? 0) > 0) filled++;
    }
  }
  ioCoverage = filled / (IO_GRID_COLS * IO_GRID_ROWS);
}

function progressIoSoak() {
  if (ioStage === "soak" && ioCoverage >= 0.95) {
    ioSoakTime += deltaTime / 1000;
    if (ioSoakTime > IO_SOAK_GOAL_SEC * 1.5) {
      ioStage = "rinse";
    }
  }
}

function finishIodineStep() {
  slide.setIodineStats(ioCoverage, ioSoakTime, ioRinseHarshness, ioRinseProgress);
  ioStage = "done";
  currentStep++;
  gameState = "stain";
}

// ---------- SAFRANIN MINI-GAME ----------

function initSafraninStage() {
  safGrid = [];
  for (let y = 0; y < SAF_GRID_ROWS; y++) {
    safGrid[y] = [];
    for (let x = 0; x < SAF_GRID_COLS; x++) safGrid[y][x] = 0;
  }
  safCoverage = 0;
  safSoakTime = 0;
  safStage = "flood";
  safRinseProgress = 0;
  safRinseHarshness = 0;
  safTilt = -14;
  isSafPouring = false;
  isSafRinsing = false;
  safRinseTag = computeRinseDynamics(safTilt, 28);
}

function drawSafraninStep() {
  progressSafSoak();
  drawSafraninOverlay();
  drawSafraninHUD();
  drawSafraninPrompts();
}

function drawSafraninOverlay() {
  let area = getSlidePaintArea(SAF_GRID_COLS, SAF_GRID_ROWS);
  noStroke();
  for (let gy = 0; gy < SAF_GRID_ROWS; gy++) {
    for (let gx = 0; gx < SAF_GRID_COLS; gx++) {
      let t = safGrid?.[gy]?.[gx] ?? 0;
      if (t > 0) {
        let alpha = constrain(50 + t * 45, 50, 190);
        fill(255, 99, 155, alpha);
        rect(area.x + gx * area.cw, area.y + gy * area.ch, area.cw, area.ch, 5);
      }
    }
  }

  noFill();
  stroke(safCoverage >= 0.95 ? color(COLORS.pink) : color(150, 90, 110));
  strokeWeight(3);
  rect(area.x - 4, area.y - 4, area.cw * SAF_GRID_COLS + 8, area.ch * SAF_GRID_ROWS + 8, 10);

  if (safStage === "soak" || safStage === "rinse") {
    drawSafSoakBar();
  }

  if (safStage === "rinse") {
    updateSafRinse();
    drawSafRinseHUD();
  }
}

function drawSafSoakBar() {
  const barW = 260;
  const barH = 14;
  const x = width / 2 - barW / 2;
  const y = height / 2 + 130;
  const progress = constrain(safSoakTime / SAF_SOAK_GOAL_SEC, 0, 1);

  noStroke();
  fill(0, 0, 0, 40);
  rect(x - 2, y - 2, barW + 4, barH + 4, 8);

  fill("#ffc1d7");
  rect(x, y, barW * progress, barH, 8);

  noFill();
  stroke(255);
  strokeWeight(2);
  rect(x, y, barW, barH, 8);

  noStroke();
  fill(40);
  textAlign(CENTER, BOTTOM);
  textSize(12);
  text("Safranin soak", width / 2, y - 6);
}

function drawSafRinseHUD() {
  const progressW = 300;
  const progressH = 14;
  const px = width / 2 - progressW / 2;
  const py = height / 2 + 160;
  const progress = constrain(safRinseProgress / SAF_RINSE_PROGRESS_GOAL, 0, 1);

  noStroke();
  fill(0, 0, 0, 40);
  rect(px - 2, py - 2, progressW + 4, progressH + 4, 8);

  fill("#f7b3c9");
  rect(px, py, progressW * progress, progressH, 8);

  noFill();
  stroke(255);
  strokeWeight(2);
  rect(px, py, progressW, progressH, 8);

  const arrowY = height / 2 + 40;
  const arrowX = width / 2;
  stroke(40, 200);
  strokeWeight(3);
  line(arrowX - 60, arrowY, arrowX + 60, arrowY);
  push();
  translate(arrowX, arrowY);
  rotate(safTilt);
  stroke(40);
  fill("#ffd2a6");
  triangle(-18, 0, 18, 0, 0, -18);
  pop();

  noStroke();
  fill(40);
  textAlign(CENTER, TOP);
  textSize(12);
  text("Move mouse left/right while rinsing to tilt and keep Gram– pink.", width / 2, arrowY + 12);

  textAlign(CENTER, BOTTOM);
  textSize(13);
  const harsh = safRinseHarshness.toFixed(1);
  text(`Rinse harshness: ${harsh}   Progress: ${Math.floor(progress * 100)}%`, width / 2, py - 8);

  if (safStage === "rinse") {
    textAlign(CENTER, TOP);
    fill(safRinseTag.color);
    text(safRinseTag.label + " (more tilt = slower/gentler)", width / 2, py + 20);
  }
}

function drawSafraninHUD() {
  const coveragePct = floor(safCoverage * 100);
  fill(0, 0, 0, 40);
  const boxW = 360;
  const boxH = 74;
  const boxX = width / 2 - boxW / 2;
  const boxY = height / 2 - 170;
  noStroke();
  rect(boxX, boxY, boxW, boxH, 12);

  fill(255);
  textAlign(CENTER, CENTER);
  textSize(14);
  let line1 = "Flood the smear with safranin.";
  let line2 = "Only decolorized spots soak up bright pink.";
  if (safStage === "soak") {
    line1 = "Hold coverage for a quick tint.";
    line2 = "Pink strength scales with soak + prior fade.";
  } else if (safStage === "rinse") {
    line1 = "Rinse gently with tilt to slow the flow.";
    line2 = "Move mouse left/right to tilt; more tilt = slower but gentler rinse.";
  }
  text(line1 + "\n" + line2, width / 2, boxY + boxH / 2);
}

function drawSafraninPrompts() {
  if (safStage === "flood") {
    drawActionButton(width / 2 - 120, height - 70, 240, 38, "Click + drag to flood safranin");
  } else if (safStage === "soak") {
    if (safSoakTime >= SAF_SOAK_GOAL_SEC) {
      drawActionButton(width / 2 - 90, height - 120, 180, 38, "Start Safranin Rinse");
    } else {
      drawActionButton(width / 2 - 110, height - 70, 220, 38, "Hold coverage while it soaks");
    }
  } else if (safStage === "rinse") {
    if (!isSafRinsing) {
      drawActionButton(width / 2 - 100, height - 120, 200, 38, "Hold on slide to rinse");
    }
    if (safRinseProgress >= SAF_RINSE_PROGRESS_GOAL && !isSafRinsing) {
      drawActionButton(width / 2 - 90, height - 70, 180, 38, "Finish Safranin Step");
    }
  }
}

function updateSafRinse() {
  if (safStage !== "rinse") return;

  if (isSafRinsing) {
    safTilt = getPointerTilt(POINTER_TILT_MAX.safranin);
    const frameScale = deltaTime / 16.67;
    const dynamics = computeRinseDynamics(safTilt, POINTER_TILT_MAX.safranin);
    safRinseTag = dynamics;

    safRinseHarshness += dynamics.harshRate * frameScale;
    safRinseProgress = min(safRinseProgress + dynamics.flowRate * frameScale, SAF_RINSE_PROGRESS_GOAL);
  }

  if (safRinseProgress >= SAF_RINSE_PROGRESS_GOAL && !isSafRinsing) {
    finishSafraninStep();
  }
}

function paintSafraninAt(mx, my) {
  let area = getSlidePaintArea(SAF_GRID_COLS, SAF_GRID_ROWS);
  if (mx < area.x || mx > area.x + area.cw * SAF_GRID_COLS) return;
  if (my < area.y || my > area.y + area.ch * SAF_GRID_ROWS) return;

  let gx = floor((mx - area.x) / area.cw);
  let gy = floor((my - area.y) / area.ch);
  if (gx >= 0 && gx < SAF_GRID_COLS && gy >= 0 && gy < SAF_GRID_ROWS) {
    safGrid[gy][gx] = min(safGrid[gy][gx] + 1, 5);
    computeSafCoverage();
    if (safCoverage >= 0.95 && safStage === "flood") {
      safStage = "soak";
    }
  }
}

function computeSafCoverage() {
  let filled = 0;
  for (let y = 0; y < SAF_GRID_ROWS; y++) {
    for (let x = 0; x < SAF_GRID_COLS; x++) {
      if ((safGrid?.[y]?.[x] ?? 0) > 0) filled++;
    }
  }
  safCoverage = filled / (SAF_GRID_COLS * SAF_GRID_ROWS);
}

function progressSafSoak() {
  if (safStage === "soak" && safCoverage >= 0.95) {
    safSoakTime += deltaTime / 1000;
    if (safSoakTime > SAF_SOAK_GOAL_SEC * 1.25) {
      safStage = "rinse";
    }
  }
}

function finishSafraninStep() {
  slide.setSafraninStats(safCoverage, safSoakTime, safRinseHarshness, safRinseProgress);
  slide.applyFinalSafranin();
  safStage = "done";
  currentStep++;
  gameState = "dry";
}

// ---------- DRY & OBSERVE MINI-GAME ----------

function drawDryStep() {
  // overlay blot marks on top of the slide
  drawBlotMarks();
  drawDryHUD();
}

function drawBlotMarks() {
  for (let blot of blotMarks) {
    push();
    translate(blot.x, blot.y);
    noStroke();
    fill(255, 255, 255, 120);
    ellipse(0, 0, blot.r * 2, blot.r * 1.4);
    pop();
  }
}

function drawDryHUD() {
  const boxW = 380;
  const boxH = 80;
  const boxX = width / 2 - boxW / 2;
  const boxY = height / 2 + 110;
  fill(0, 0, 0, 45);
  noStroke();
  rect(boxX, boxY, boxW, boxH, 12);

  fill(255);
  textAlign(CENTER, CENTER);
  textSize(14);
  const drynessPct = floor(dryProgress * 100);
  const smearPct = floor(constrain(smearDragPenalty, 0, 1) * 100);
  text(`Blot dry with clicks (do not drag). Dryness: ${drynessPct}%  |  Smear risk: ${smearPct}%`, width / 2, boxY + boxH / 2);

  // dryness bar
  const barW = 260;
  const barH = 12;
  const barX = width / 2 - barW / 2;
  const barY = boxY + boxH + 14;
  fill(0, 0, 0, 40);
  rect(barX - 2, barY - 2, barW + 4, barH + 4, 8);
  fill("#d6f6d2");
  rect(barX, barY, barW * dryProgress, barH, 8);
  noFill();
  stroke(255);
  strokeWeight(2);
  rect(barX, barY, barW, barH, 8);
}

function drawDryPrompts() {
  if (dryProgress >= 1) {
    drawActionButton(width / 2 - 90, height - 90, 180, 40, "Go to Microscope");
  } else {
    drawActionButton(width / 2 - 110, height - 90, 220, 40, "Click pads to blot the slide");
  }
}

function addBlotAt(mx, my, dragged = false) {
  if (!isMouseOnSlide()) return;
  const r = random(18, 26);
  blotMarks.push({ x: mx, y: my, r });
  if (!dragged) {
    dryProgress = min(1, dryProgress + 0.18);
  } else {
    smearDragPenalty = min(1.2, smearDragPenalty + dist(mx, my, lastBlotX, lastBlotY) * 0.01);
  }
  lastBlotX = mx;
  lastBlotY = my;
}

function finalizeDryStep() {
  slide.setDryStats(dryProgress, smearDragPenalty, blotMarks.length);
  gameState = "microscope";
}

function ensureDryStatsCaptured() {
  if (slide.dryness === undefined) {
    slide.setDryStats(dryProgress, smearDragPenalty, blotMarks.length);
  }
}

// ---------- DECOLORIZER MINI-GAME ----------

  function startDecolorStage() {
    gameState = "decolor";
    isDecolorFlowing = false;
    decolorRunoffHint = 0;
    decolorGauge = 0;
    slide.resetDecolorLevels();
  }

function drawDecolorStep() {
  slide.updateDecolorLevels(isDecolorFlowing);
  if (isDecolorFlowing) {
    drawAlcoholOverlay();
  }
  drawDecolorHUD();
  drawDecolorPrompts();
}

function drawDecolorHUD() {
  // Status box
  const boxW = 420;
  const boxH = 110;
  const boxX = width / 2 - boxW / 2;
    const boxY = height / 2 + 60;
  fill(0, 0, 0, 45);
  noStroke();
  rect(boxX, boxY, boxW, boxH, 12);

  fill(255);
  textAlign(CENTER, CENTER);
  textSize(14);
  textLeading(18);
  let line1 = "Hold on the slide to flow alcohol.";
  let line2 = "Release when Gram– look pale and runoff clears.";
  let line3 = "Runoff bar stays near green when the stream clears.";
  if (DECOLOR_SHOW_GAUGE) {
    line2 = "Watch the fade or use the gauge; release near the sweet zone.";
    line3 = "Gauge = average fade. Green band = good timing.";
  }
  text(line1 + "\n" + line2 + "\n" + line3, width / 2, boxY + boxH / 2);
  textLeading(16);

  if (DECOLOR_SHOW_GAUGE) {
    drawDecolorGaugeEasy();
  } else {
    drawRunoffHintBar();
  }
}

function drawRunoffHintBar() {
  const barW = 320;
  const barH = 12;
  const x = width / 2 - barW / 2;
  const y = height - 120;

  noStroke();
  fill(0, 0, 0, 40);
  rect(x - 2, y - 2, barW + 4, barH + 4, 8);

  fill("#c5f2c7");
  rect(x, y, barW * constrain(decolorRunoffHint, 0, 1), barH, 8);

  noFill();
  stroke(255);
  strokeWeight(2);
  rect(x, y, barW, barH, 8);

  noStroke();
  fill(255);
  textAlign(CENTER, BOTTOM);
  textSize(12);
  text("Runoff clarity", width / 2, y - 6);
}

function drawDecolorGaugeEasy() {
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

  // fill based on live average decolor level
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
  text("Decolorizer Flow (avg)", width / 2, y - 5);
}

// Shared helper to make tilt clearly affect rinse speed/harshness
function computeRinseDynamics(tilt, maxTilt) {
  const tiltNorm = constrain(abs(tilt) / maxTilt, 0, 1);

  // High tilt = slower flow and softer harshness; flat = faster, harsher
  const flowRate = lerp(1.65, 0.45, tiltNorm); // progress increment scale
  const harshRate = lerp(1.35, 0.18, tiltNorm); // harshness increment scale

  let label = "Flat = fast/harsh";
  let color = "#d54b4b";
  if (tiltNorm > 0.25 && tiltNorm < 0.65) {
    label = "Moderate tilt";
    color = "#e6a93f";
  } else if (tiltNorm >= 0.65) {
    label = "High tilt = slow/gentle";
    color = "#2fa169";
  }

  return { flowRate, harshRate, label, color, tiltNorm };
}

function getPointerTilt(maxTilt) {
  const slideCx = width / 2;
  const slideHalfW = (width * 0.56) / 2;
  const norm = constrain((mouseX - slideCx) / slideHalfW, -1, 1);
  return norm * maxTilt;
}

function drawDecolorPrompts() {
  // Inline hint bar instead of a floating button so the slide stays unobstructed
  const hintY = height - 110;
  fill(0, 0, 0, 45);
  noStroke();
  rect(width / 2 - 230, hintY - 26, 460, 52, 12);

  fill(255);
  textAlign(CENTER, CENTER);
  textSize(13);
  const hint = isDecolorFlowing
    ? "Release when Gram– look pale and runoff clears."
    : "Press on the slide to start flow; move mouse left/right to steer runoff.";
  text(hint, width / 2, hintY);
}

function drawAlcoholOverlay() {
  const slideW = width * 0.56;
  const slideH = height * 0.2;
  const cx = width / 2;
  const cy = height / 2 + 50;
  push();
  rectMode(CENTER);
  translate(cx, cy);
  noStroke();
  fill(183, 215, 255, 70);
  rect(0, 0, slideW - 18, slideH - 12, 18);
  pop();
}

function drawCrystalStep() {
  progressCvSoak();
  drawCrystalOverlay();
  drawCrystalHUD();
  drawCrystalPrompts();
}

function drawCrystalOverlay() {
  let area = getSlidePaintArea();
  noStroke();
  for (let gy = 0; gy < CV_GRID_ROWS; gy++) {
    for (let gx = 0; gx < CV_GRID_COLS; gx++) {
      let t = cvGrid?.[gy]?.[gx] ?? 0;
      if (t > 0) {
        let alpha = constrain(60 + t * 45, 60, 200);
        fill(123, 79, 255, alpha);
        rect(area.x + gx * area.cw, area.y + gy * area.ch, area.cw, area.ch, 5);
      }
    }
  }

  // Outline turns solid when coverage is complete
  noFill();
  stroke(cvCoverage >= 0.95 ? COLORS.purple : color(120, 90));
  strokeWeight(3);
  rect(area.x - 4, area.y - 4, area.cw * CV_GRID_COLS + 8, area.ch * CV_GRID_ROWS + 8, 10);

  if (cvStage === "soak" || cvStage === "rinse") {
    drawCvSoakBar();
  }

  if (cvStage === "rinse") {
    updateCvRinse();
    drawCvRinseHUD();
  }
}

function drawCvSoakBar() {
  const barW = 280;
  const barH = 14;
  const x = width / 2 - barW / 2;
  const y = height / 2 + 130;
  const progress = constrain(cvSoakTime / CV_SOAK_GOAL_SEC, 0, 1);

  noStroke();
  fill(0, 0, 0, 40);
  rect(x - 2, y - 2, barW + 4, barH + 4, 8);

  fill("#d8c7ff");
  rect(x, y, barW * progress, barH, 8);

  noFill();
  stroke(255);
  strokeWeight(2);
  rect(x, y, barW, barH, 8);

  noStroke();
  fill(40);
  textAlign(CENTER, BOTTOM);
  textSize(12);
  text("Crystal violet soak", width / 2, y - 6);
}

function drawCvRinseHUD() {
  const progressW = 320;
  const progressH = 14;
  const px = width / 2 - progressW / 2;
  const py = height / 2 + 160;
  const progress = constrain(cvRinseProgress / CV_RINSE_PROGRESS_GOAL, 0, 1);

  noStroke();
  fill(0, 0, 0, 40);
  rect(px - 2, py - 2, progressW + 4, progressH + 4, 8);

  fill("#a4d0ff");
  rect(px, py, progressW * progress, progressH, 8);

  noFill();
  stroke(255);
  strokeWeight(2);
  rect(px, py, progressW, progressH, 8);

  // Tilt arrow
  const arrowY = height / 2 + 40;
  const arrowX = width / 2;
  stroke(40, 200);
  strokeWeight(3);
  line(arrowX - 60, arrowY, arrowX + 60, arrowY);
  push();
  translate(arrowX, arrowY);
  rotate(cvTilt);
  stroke(40);
  fill("#ffd2a6");
  triangle(-18, 0, 18, 0, 0, -18);
  pop();

  noStroke();
  fill(40);
  textAlign(CENTER, TOP);
  textSize(12);
  text("Move mouse left/right while rinsing to tilt the slide", width / 2, arrowY + 12);

  textAlign(CENTER, BOTTOM);
  textSize(13);
  const harsh = cvRinseHarshness.toFixed(1);
  text(`Rinse harshness: ${harsh}   Progress: ${Math.floor(progress * 100)}%`, width / 2, py - 8);

  if (cvStage === "rinse") {
    textAlign(CENTER, TOP);
    fill(cvRinseTag.color);
    text(cvRinseTag.label + " (more tilt = slower/gentler)", width / 2, py + 22);
  }
}

function drawCrystalHUD() {
  const coveragePct = floor(cvCoverage * 100);
  const boxW = 360;
  const boxH = 70;
  const boxX = width / 2 - boxW / 2;
  const boxY = height / 2 + 90;
  fill(0, 0, 0, 45);
  noStroke();
  rect(boxX, boxY, boxW, boxH, 12);

  fill(255);
  textAlign(CENTER, CENTER);
  textSize(14);
  let line1 = `Coverage: ${coveragePct}%`;
  let line2 = "";
  if (cvStage === "flood") line2 = "Click/drag to flood the smear.";
  if (cvStage === "soak") line2 = "Hold coverage until the soak bar fills.";
  if (cvStage === "rinse") line2 = "Hold to rinse; move mouse left/right to tilt for gentler flow.";
  text(line1 + "\n" + line2, width / 2, boxY + boxH / 2);
}

function drawCrystalPrompts() {
  if (cvStage === "soak" && cvSoakTime >= CV_SOAK_GOAL_SEC) {
    drawActionButton(width / 2 - 90, height - 120, 180, 38, "Start CV Rinse");
  } else if (cvStage === "rinse") {
    if (!isCvRinsing) {
      drawActionButton(width / 2 - 100, height - 120, 200, 38, "Hold on slide to rinse");
    }
    if (cvRinseProgress >= CV_RINSE_PROGRESS_GOAL && !isCvRinsing) {
      drawActionButton(width / 2 - 90, height - 70, 180, 38, "Finish CV Step");
    }
  }
}

function updateCvRinse() {
  if (cvStage !== "rinse") return;

  if (isCvRinsing) {
    cvTilt = getPointerTilt(POINTER_TILT_MAX.crystal);
    const frameScale = deltaTime / 16.67;
    const dynamics = computeRinseDynamics(cvTilt, POINTER_TILT_MAX.crystal);
    cvRinseTag = dynamics;

    cvRinseHarshness += dynamics.harshRate * frameScale;
    cvRinseProgress = min(cvRinseProgress + dynamics.flowRate * frameScale, CV_RINSE_PROGRESS_GOAL);
  }

  if (cvRinseProgress >= CV_RINSE_PROGRESS_GOAL && !isCvRinsing) {
    finishCrystalStep();
  }
}

function paintCrystalAt(mx, my) {
  let area = getSlidePaintArea();
  if (mx < area.x || mx > area.x + area.cw * CV_GRID_COLS) return;
  if (my < area.y || my > area.y + area.ch * CV_GRID_ROWS) return;

  let gx = floor((mx - area.x) / area.cw);
  let gy = floor((my - area.y) / area.ch);
  if (gx >= 0 && gx < CV_GRID_COLS && gy >= 0 && gy < CV_GRID_ROWS) {
    cvGrid[gy][gx] = min(cvGrid[gy][gx] + 1, 6);
    computeCvCoverage();
    if (cvCoverage >= 0.95 && cvStage === "flood") {
      cvStage = "soak";
    }
  }
}

function computeCvCoverage() {
  let filled = 0;
  for (let y = 0; y < CV_GRID_ROWS; y++) {
    for (let x = 0; x < CV_GRID_COLS; x++) {
      if ((cvGrid?.[y]?.[x] ?? 0) > 0) filled++;
    }
  }
  cvCoverage = filled / (CV_GRID_COLS * CV_GRID_ROWS);
}

function progressCvSoak() {
  if (cvStage === "soak" && cvCoverage >= 0.95) {
    cvSoakTime += deltaTime / 1000;
    if (cvSoakTime > CV_SOAK_GOAL_SEC * 1.6) {
      cvStage = "rinse"; // auto-advance if they linger forever
    }
  }
}

function finishCrystalStep() {
  slide.setCrystalStats(cvCoverage, cvSoakTime, cvRinseHarshness, cvRinseProgress);
  cvStage = "done";
  currentStep++;
  gameState = "stain";
}

// ---------- MICROSCOPE & RESULTS ----------

function drawMicroscope() {
  ensureDryStatsCaptured();

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

  const clarity = constrain(1 - smearDragPenalty * 0.25, 0.65, 1);
  slide.drawCellsMicroscope(cx, cy, r, clarity);

  fill(255);
  textAlign(CENTER, TOP);
  textSize(15);
  text("Purple = Gram+, Pink = Gram–. Pick the dominant Gram reaction.", width / 2, 90);

  drawInterpretButtons();

  const ready = playerInterpretation !== null;
  const btnLabel = ready ? "Show Results" : "Choose an interpretation";
  drawButton(width / 2 - 90, height - 80, 180, 42, btnLabel, !ready);
}

function drawInterpretButtons() {
  const btnW = 170;
  const btnH = 44;
  const y = height - 140;
  const leftX = width / 2 - btnW - 15;
  const rightX = width / 2 + 15;

  const pickBtn = (x, label, gramKey) => {
    const selected = playerInterpretation === gramKey;
    const hover = mouseX > x && mouseX < x + btnW && mouseY > y && mouseY < y + btnH;
    const bg = selected ? "#7bffa6" : hover ? "#ffd8a6" : "#ffffff";
    stroke(50);
    strokeWeight(selected ? 3 : 2);
    fill(bg);
    rect(x, y, btnW, btnH, 10);
    fill(30);
    textAlign(CENTER, CENTER);
    textSize(13);
    text(label, x + btnW / 2, y + btnH / 2);
  };

  pickBtn(leftX, "Mostly Gram+", "positive");
  pickBtn(rightX, "Mostly Gram–", "negative");
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

  text(
    `Your call: ${slide.playerCallLabel || "(none)"}  |  Seen on slide: ${slide.observedMajorityLabel || "(not set)"}`,
    width / 2,
    170
  );

  textSize(15);
  const callVerdict = slide.interpretationCorrect
    ? "You matched what was visible under the scope."
    : "Your call didn’t match the colors you produced.";
  text(callVerdict + `  True mix: ${slide.trueMajorityLabel}`, width / 2, 200);

  textSize(14);
  const resultsTextWidth = 600;
  const resultsTextX = (width - resultsTextWidth) / 2;
  const resultsTextY = 230;
  textAlign(LEFT, TOP);
  text(slide.feedback, resultsTextX, resultsTextY, resultsTextWidth, 240); // keep within canvas width
  textAlign(CENTER, TOP);

  drawButton(width / 2 - 150, height - 100, 120, 42, "Replay View");
  drawButton(width / 2 + 30, height - 100, 120, 42, "Next Slide");
}

function drawButton(x, y, w, h, label, disabled = false) {
  let hover = !disabled && mouseX > x && mouseX < x + w && mouseY > y && mouseY < y + h;
  noStroke();
  const base = disabled ? color("#c9c9c9") : color("#ff845b");
  const hoverCol = disabled ? base : color("#ff9f7b");
  fill(hover ? hoverCol : base);
  rect(x, y, w, h, 10);
  fill(disabled ? 120 : 30);
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
    this.truePositiveCount = 0;
    this.trueNegativeCount = 0;
    this.trueMajorityLabel = "";
    this.observedPositiveCount = 0;
    this.observedNegativeCount = 0;
    this.observedMajorityLabel = "";
    this.smearCoverage = 1;
    this.smearOverload = 0;
    this.heatLevel = 55;
    this.cvCoverage = 0;
    this.cvSoakTime = 0;
    this.cvRinseHarshness = 0;
    this.cvRinseProgress = 0;
    this.ioCoverage = 0;
    this.ioSoakTime = 0;
    this.ioRinseHarshness = 0;
    this.ioRinseProgress = 0;
    this.safCoverage = 0;
    this.safSoakTime = 0;
    this.safRinseHarshness = 0;
    this.safRinseProgress = 0;

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
      if (gram === "positive") this.truePositiveCount++;
      else this.trueNegativeCount++;
      let morph = random() < 0.5 ? "coccus" : "rod";

      this.cells.push(new Cell(x, y, sx, sy, gram, morph));
    }

    this.trueMajorityLabel = this.truePositiveCount >= this.trueNegativeCount ? "Mostly Gram+" : "Mostly Gram–";
    this.playerCallLabel = "";
    this.interpretationCorrect = false;
    this.interpretationScored = false;
  }

  drawCellsBench(step, tiltAngle = 0) {
    const tiltActive = tiltAngle !== 0 && (gameState === "crystal" || gameState === "iodine" || gameState === "safranin");
    if (tiltActive) {
      const cx = width / 2;
      const cy = height / 2 + 50;
      push();
      translate(cx, cy);
      rotate(radians(tiltAngle));
      for (let c of this.cells) {
        if (!c.alive) continue;
        const dx = c.slideX - cx;
        const dy = c.slideY - cy;
        c.drawBench(step, dx, dy);
      }
      pop();
      return;
    }

    for (let c of this.cells) {
      if (!c.alive) continue;
      c.drawBench(step);
    }
  }

  drawCellsMicroscope(cx, cy, r, clarity = 1) {
    push();
    drawingContext.globalAlpha = clarity;
    for (let c of this.cells) {
      if (!c.alive) continue;
      let px = cx + c.scopeX;
      let py = cy + c.scopeY;
      if (dist(px, py, cx, cy) < r - 8) {
        c.drawMicroscope(px, py);
      }
    }
    pop();
  }

  setSmearStats(coverage, overload) {
    this.smearCoverage = coverage;
    this.smearOverload = overload;
  }

  setHeatLevel(level) {
    this.heatLevel = level;
  }

  setCrystalStats(coverage, soakSeconds, rinseHarshness, rinseProgress) {
    this.cvCoverage = coverage;
    this.cvSoakTime = soakSeconds;
    this.cvRinseHarshness = rinseHarshness;
    this.cvRinseProgress = rinseProgress;
  }

  setIodineStats(coverage, soakSeconds, rinseHarshness, rinseProgress) {
    this.ioCoverage = coverage;
    this.ioSoakTime = soakSeconds;
    this.ioRinseHarshness = rinseHarshness;
    this.ioRinseProgress = rinseProgress;
  }

  setSafraninStats(coverage, soakSeconds, rinseHarshness, rinseProgress) {
    this.safCoverage = coverage;
    this.safSoakTime = soakSeconds;
    this.safRinseHarshness = rinseHarshness;
    this.safRinseProgress = rinseProgress;
  }

  setDryStats(dryness, smearDrag, blotCount) {
    this.dryness = dryness;
    this.smearDrag = smearDrag;
    this.blotCount = blotCount;
  }

  resetDecolorLevels() {
    this.meanDecolorLevel = 0;
    this.meanDecolorLevelNorm = 0;
    this.decolorRunoff = 0;
    for (let c of this.cells) {
      c.decolorLevel = 0;
      c.decolorElapsed = 0;
    }
  }

  updateDecolorLevels(flowing) {
    const dt = deltaTime / 1000;
    let totalLevel = 0;
    let count = 0;

    for (let c of this.cells) {
      if (!c.alive) continue;
      if (flowing) {
        c.decolorElapsed += dt;
        const grace = c.trueGram === "positive" && c.decolorElapsed < DECOLOR_POS_GRACE;
        const rate = c.trueGram === "negative" ? DECOLOR_RATE_NEG : grace ? 0.08 : DECOLOR_RATE_POS;
        c.decolorLevel = constrain(c.decolorLevel + rate * dt, 0, DECOLOR_PREVIEW_CAP);
      }
      totalLevel += c.decolorLevel;
      count++;
    }

    this.meanDecolorLevel = count ? totalLevel / count : 0;
    this.meanDecolorLevelNorm = constrain(this.meanDecolorLevel / DECOLOR_PREVIEW_CAP, 0, 1);

    // Runoff clarity leans on Gram– fade
    this.decolorRunoff = this.getGramAvgLevel("negative") / DECOLOR_PREVIEW_CAP;
    decolorRunoffHint = constrain(this.decolorRunoff, 0, 1);
    decolorGauge = constrain(this.meanDecolorLevelNorm * 100, 0, 100);
  }

  getGramAvgLevel(type) {
    let total = 0;
    let count = 0;
    for (let c of this.cells) {
      if (!c.alive) continue;
      if (c.trueGram === type) {
        total += c.decolorLevel;
        count++;
      }
    }
    return count ? total / count : 0;
  }

  applyFinalSafranin() {
    const globalExposure = this.meanDecolorLevelNorm ?? 0;

    const smearQuality = constrain(this.smearCoverage - this.smearOverload * 0.5, 0, 1);
    const heatQuality = getHeatQuality(this.heatLevel);
    const cvBinding = this.getCrystalBindingQuality();
    const rinseAdequacy = constrain(this.cvRinseProgress / CV_RINSE_PROGRESS_GOAL, 0, 1);
    const iodineLock = this.getIodineLockQuality();
    const iodineRinsePenalty = constrain(this.ioRinseHarshness / IO_RINSE_HARSH_TARGET, 0, 1);

    const safCoverageQuality = constrain(this.safCoverage, 0, 1);
    const safSoakQuality = constrain(this.safSoakTime / SAF_SOAK_GOAL_SEC, 0, 1.2);
    const safRinsePenalty = constrain(this.safRinseHarshness / (SAF_RINSE_HARSH_TARGET * 2), 0, 1);
    const safRinseCompleteness = constrain(this.safRinseProgress / SAF_RINSE_PROGRESS_GOAL, 0, 1);
    const muddyBias = safRinseCompleteness < 0.35 ? map(safRinseCompleteness, 0, 0.35, 0.25, 0) : 0;

    this.correctCount = 0;
    this.aliveCount = 0;
    this.observedPositiveCount = 0;
    this.observedNegativeCount = 0;

    const harshPenalty = constrain(this.cvRinseHarshness / (CV_RINSE_HARSH_TARGET * 2), 0, 1);

    for (let c of this.cells) {
      const prepQuality = smearQuality * heatQuality * cvBinding * (0.75 + 0.25 * iodineLock);
      const survivalProb = constrain(
        0.2 +
          prepQuality * (1 - 0.6 * harshPenalty) * (1 - 0.35 * iodineRinsePenalty) *
          (0.9 - 0.25 * safRinsePenalty),
        0,
        1
      );

      c.alive = random() < survivalProb;
      if (!c.alive) {
        c.finalColor = null;
        continue;
      }
      this.aliveCount++;

      let jitter = random(-0.08, 0.08);
      const cellExposure = c.decolorLevel ? constrain(c.decolorLevel / DECOLOR_PREVIEW_CAP, 0, 1) : globalExposure;
      let effective = constrain(
        cellExposure + jitter + map(rinseAdequacy, 0, 1, -0.2, 0.05) + (1 - iodineLock) * 0.25,
        0,
        1
      );

      let pinkStrength;
      if (c.trueGram === "positive") {
        pinkStrength = constrain(map(effective, 0.7, 1, 0, 1), 0, 1);
      } else {
        pinkStrength = constrain(map(effective, 0.35, 0.9, 0, 1), 0, 1);
      }

      const soakBoost = constrain(0.4 + 0.6 * safSoakQuality, 0, 1.15);
      const rinseRetention = constrain(0.9 - 0.5 * safRinsePenalty + safRinseCompleteness * 0.25, 0, 1.05);
      pinkStrength = constrain(pinkStrength * safCoverageQuality * soakBoost * rinseRetention + muddyBias, 0, 1);

      const finalCol = lerpColor(color(COLORS.purple), color(COLORS.pink), pinkStrength);
      c.finalColor = finalCol;

      const observedTone = pinkStrength >= 0.5 ? "pink" : "purple";
      if (observedTone === "purple") this.observedPositiveCount++;
      else this.observedNegativeCount++;
      const expectedTone = c.trueGram === "positive" ? "purple" : "pink";
      if (observedTone === expectedTone) {
        this.correctCount++;
      }
    }

    this.observedMajorityLabel = this.observedPositiveCount >= this.observedNegativeCount ? "Mostly Gram+" : "Mostly Gram–";

    totalScore += this.correctCount;
    totalSlides++;

    this.buildFeedback(globalExposure, safSoakQuality, safRinsePenalty, safRinseCompleteness);
  }

  setInterpretation(callKey) {
    this.playerCallLabel = callKey === "positive" ? "Mostly Gram+" : "Mostly Gram–";
    const seenPositive = this.observedPositiveCount >= this.observedNegativeCount;
    this.interpretationCorrect =
      (callKey === "positive" && seenPositive) ||
      (callKey === "negative" && !seenPositive);
    if (!this.interpretationScored) {
      totalCalls++;
      if (this.interpretationCorrect) {
        totalCorrectCalls++;
        totalScore += 10; // small bonus for a correct read
      }
      this.interpretationScored = true;
    }
  }

  buildFeedback(g, safSoakQuality, safRinsePenalty, safRinseCompleteness) {
    let line;
    if (g < GAUGE_MIN / 100) {
      line = "You under-decolorized overall, so many Gram– buddies stayed falsely purple.";
    } else if (g > GAUGE_MAX / 100) {
      line = "You over-decolorized overall, so some Gram+ buddies lost their purple and turned pink.";
    } else {
      line = "Nice timing! Most Gram+ buddies stayed purple and most Gram– buddies picked up pink.";
    }

    const safLine = safRinseCompleteness < 0.35
      ? "You barely rinsed safranin, so everything looks muddier red."
      : safRinsePenalty > 0.7
        ? "Rinse was strong, so some Gram– are faint pink."
        : safSoakQuality < 0.75
          ? "Short safranin soak left Gram– a bit pale."
          : "Safranin soak and rinse kept Gram– nicely pink.";

    this.feedback =
      "Each MicroBuddy has a true Gram type.\n\n" +
      "Purple bodies = Gram positive, Pink bodies = Gram negative.\n\n" +
      line + "\n" + safLine + "\n\n" +
      this.getCrystalNote() + this.getIodineNote() + this.getSafraninNote(safSoakQuality, safRinsePenalty) + this.getDryNote() +
      `You correctly stained ${this.correctCount} out of ${this.aliveCount || this.cells.length} visible cells on this slide.`;
  }

  getCrystalBindingQuality() {
    const coverageFactor = constrain(this.cvCoverage, 0, 1);
    const soakFactor = constrain(this.cvSoakTime / CV_SOAK_GOAL_SEC, 0, 1);
    const rinsePenalty = constrain(this.cvRinseHarshness / CV_RINSE_HARSH_TARGET, 0, 1);
    const baseBinding = constrain(0.35 + 0.4 * coverageFactor + 0.25 * soakFactor, 0, 1);
    return constrain(baseBinding - rinsePenalty * 0.35, 0.15, 1);
  }

  getCrystalNote() {
    const soakText = this.cvSoakTime >= CV_SOAK_GOAL_SEC
      ? `You soaked crystal violet for ${this.cvSoakTime.toFixed(1)}s.`
      : `Crystal violet soak was short (${this.cvSoakTime.toFixed(1)}s).`;
    const rinseText = this.cvRinseHarshness > CV_RINSE_HARSH_TARGET
      ? "Rinse was harsh and knocked off some cells."
      : "Gentle rinse kept most cells on the slide.";
    return `${soakText} ${rinseText}\n\n`;
  }

  getIodineLockQuality() {
    const coverageFactor = constrain(this.ioCoverage, 0, 1);
    const soakFactor = constrain(this.ioSoakTime / IO_SOAK_GOAL_SEC, 0, 1);
    const rinsePenalty = constrain(this.ioRinseHarshness / IO_RINSE_HARSH_TARGET, 0, 1);
    const base = constrain(0.35 + 0.45 * coverageFactor + 0.3 * soakFactor, 0, 1);
    return constrain(base - rinsePenalty * 0.35, 0.1, 1);
  }

  getIodineNote() {
    const soakText = this.ioSoakTime >= IO_SOAK_GOAL_SEC
      ? `Iodine lock-in time: ${this.ioSoakTime.toFixed(1)}s.`
      : `Iodine soak was short (${this.ioSoakTime.toFixed(1)}s).`;
    const rinseText = this.ioRinseHarshness > IO_RINSE_HARSH_TARGET
      ? "Iodine rinse was rough and loosened some stain."
      : "Iodine rinse stayed gentle, keeping Gram+ stain locked in.";
    return `${soakText} ${rinseText}\n\n`;
  }

  getSafraninNote(soakQuality, rinsePenalty) {
    const soakText = soakQuality >= 1
      ? "Safranin soak covered the pale areas well."
      : "Safranin soak was brief, so pink uptake may be light.";
    const rinseText = rinsePenalty > 0.7
      ? "Rinse was strong and may have washed Gram– too pale."
      : "Rinse stayed gentle so Gram– held onto pink.";
    return `${soakText} ${rinseText}\n\n`;
  }

  getDryNote() {
    const dryness = this.dryness ?? 0;
    const smear = constrain(this.smearDrag ?? 0, 0, 1);
    let line = "Drying: " + floor(dryness * 100) + "% blotted. ";
    if (smear > 0.6) line += "Dragging the blotter smeared the field a bit.";
    else if (smear > 0.25) line += "A little smear from dragging the blotter.";
    else line += "Slide stayed clean during blotting.";
    return line + "\n";
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
    this.decolorLevel = 0;
    this.decolorElapsed = 0;
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

  drawBench(step, overrideX = null, overrideY = null) {
    push();
    const tx = overrideX ?? this.slideX;
    const ty = overrideY ?? this.slideY;
    translate(tx, ty);

    // shadow
    noStroke();
    fill(0, 0, 0, 40);
    ellipse(4, 6, 26, 14);

    // choose color by step
    let colorHex;
    if (step === "decolorFlow") {
      colorHex = this.getDecolorPreviewColor();
    } else if (step === "crystal" || step === "iodine" || step === "decolor") {
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

  getDecolorPreviewColor() {
    const purple = color(COLORS.purple);
    const pink = color(COLORS.pink);
    const level = constrain(this.decolorLevel / DECOLOR_PREVIEW_CAP, 0, 1);

    if (this.trueGram === "negative") {
      // Gram– fade fast: purple -> pink as level rises
      return lerpColor(purple, pink, constrain(level * 1.1, 0, 1));
    }

    // Gram+ hold longer: grace then slow lerp toward pink
    const start = 0.45;
    const fraction = constrain((level - start) / 0.55, 0, 1);
    return lerpColor(purple, pink, fraction);
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
  } else if (gameState === "crystal") {
    if (cvStage === "soak" && cvSoakTime >= CV_SOAK_GOAL_SEC &&
        isMouseOverButton(width / 2 - 90, height - 120, 180, 38)) {
      cvStage = "rinse";
      return;
    }
    if (cvStage === "rinse" && cvRinseProgress >= CV_RINSE_PROGRESS_GOAL &&
        isMouseOverButton(width / 2 - 90, height - 70, 180, 38)) {
      finishCrystalStep();
      return;
    }
    if (isMouseOnSlide()) {
      if (cvStage === "flood" || cvStage === "soak") {
        isCvPouring = true;
        paintCrystalAt(mouseX, mouseY);
      } else if (cvStage === "rinse") {
        isCvRinsing = true;
      }
    }
  } else if (gameState === "iodine") {
    if (ioStage === "soak" && ioSoakTime >= IO_SOAK_GOAL_SEC &&
        isMouseOverButton(width / 2 - 90, height - 120, 180, 38)) {
      ioStage = "rinse";
      return;
    }
    if (ioStage === "rinse" && ioRinseProgress >= IO_RINSE_PROGRESS_GOAL &&
        isMouseOverButton(width / 2 - 90, height - 70, 180, 38)) {
      finishIodineStep();
      return;
    }
    if (isMouseOnSlide()) {
      if (ioStage === "flood" || ioStage === "soak") {
        isIoPouring = true;
        paintIodineAt(mouseX, mouseY);
      } else if (ioStage === "rinse") {
        isIoRinsing = true;
      }
    }
  } else if (gameState === "safranin") {
    if (safStage === "soak" && safSoakTime >= SAF_SOAK_GOAL_SEC &&
        isMouseOverButton(width / 2 - 90, height - 120, 180, 38)) {
      safStage = "rinse";
      return;
    }
    if (safStage === "rinse" && safRinseProgress >= SAF_RINSE_PROGRESS_GOAL &&
        isMouseOverButton(width / 2 - 90, height - 70, 180, 38)) {
      finishSafraninStep();
      return;
    }
    if (isMouseOnSlide()) {
      if (safStage === "flood" || safStage === "soak") {
        isSafPouring = true;
        paintSafraninAt(mouseX, mouseY);
      } else if (safStage === "rinse") {
        isSafRinsing = true;
      }
    }
  } else if (gameState === "dry") {
    if (isMouseOnSlide()) {
      isBlotting = true;
      addBlotAt(mouseX, mouseY, false);
      return;
    }
    if (dryProgress >= 1 && isMouseOverButton(width / 2 - 90, height - 90, 180, 40)) {
      finalizeDryStep();
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
      isDecolorFlowing = true;
    }
  } else if (gameState === "microscope") {
    // interpretation buttons
    const pick = interpretButtonHit(mouseX, mouseY);
    if (pick) {
      playerInterpretation = pick;
      slide.setInterpretation(pick);
    }

    // "Show Results" button
    if (playerInterpretation && isMouseOverButton(width / 2 - 90, height - 80, 180, 42)) {
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
  if (gameState === "decolor" && isDecolorFlowing) {
    isDecolorFlowing = false;
    // move to saf step, preserving per-cell decolor levels for the safranin mini-game
    currentStep = 3; // saf
    gameState = "stain";
  }
  if (gameState === "heatFix") {
    isHeating = false;
  }
  if (gameState === "crystal") {
    isCvPouring = false;
    isCvRinsing = false;
  }
  if (gameState === "iodine") {
    isIoPouring = false;
    isIoRinsing = false;
  }
  if (gameState === "safranin") {
    isSafPouring = false;
    isSafRinsing = false;
  }
  if (gameState === "dry") {
    isBlotting = false;
  }
}

function mouseDragged() {
  if (gameState === "smear" && isMouseOnSlide()) {
    const area = getSlidePaintArea(GRID_COLS, GRID_ROWS);

    let gx = floor((mouseX - area.x) / area.cw);
    let gy = floor((mouseY - area.y) / area.ch);
    if (gx >= 0 && gx < GRID_COLS && gy >= 0 && gy < GRID_ROWS) {
      smearGrid[gy][gx] = min(smearGrid[gy][gx] + 1, 6);
      computeSmearStats();
    }
  } else if (gameState === "crystal" && isMouseOnSlide() && (cvStage === "flood" || cvStage === "soak") && isCvPouring) {
    paintCrystalAt(mouseX, mouseY);
  } else if (gameState === "iodine" && isMouseOnSlide() && (ioStage === "flood" || ioStage === "soak") && isIoPouring) {
    paintIodineAt(mouseX, mouseY);
  } else if (gameState === "safranin" && isMouseOnSlide() && (safStage === "flood" || safStage === "soak") && isSafPouring) {
    paintSafraninAt(mouseX, mouseY);
  } else if (gameState === "dry" && isBlotting && isMouseOnSlide()) {
    addBlotAt(mouseX, mouseY, true);
  }
}

function handleReagentClick(id) {
  let expected = steps[currentStep];
  if (id !== expected) return;

  if (id === "crystal") {
    gameState = "crystal";
  } else if (id === "iodine") {
    gameState = "iodine";
  } else if (id === "decolor") {
    startDecolorStage();
  } else if (id === "safranin") {
    initSafraninStage();
    gameState = "safranin";
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

function interpretButtonHit(mx, my) {
  const btnW = 170;
  const btnH = 44;
  const y = height - 140;
  const leftX = width / 2 - btnW - 15;
  const rightX = width / 2 + 15;

  if (mx > leftX && mx < leftX + btnW && my > y && my < y + btnH) return "positive";
  if (mx > rightX && mx < rightX + btnW && my > y && my < y + btnH) return "negative";
  return null;
}

function keyPressed() {
  if (gameState === "crystal" && cvStage === "rinse") {
    if (keyCode === LEFT_ARROW || key === 'a' || key === 'A') {
      cvTilt = max(-32, cvTilt - 3);
    }
    if (keyCode === RIGHT_ARROW || key === 'd' || key === 'D') {
      cvTilt = min(32, cvTilt + 3);
    }
  } else if (gameState === "iodine" && ioStage === "rinse") {
    if (keyCode === LEFT_ARROW || key === 'a' || key === 'A') {
      ioTilt = max(-30, ioTilt - 3);
    }
    if (keyCode === RIGHT_ARROW || key === 'd' || key === 'D') {
      ioTilt = min(30, ioTilt + 3);
    }
  } else if (gameState === "safranin" && safStage === "rinse") {
    if (keyCode === LEFT_ARROW || key === 'a' || key === 'A') {
      safTilt = max(-28, safTilt - 3);
    }
    if (keyCode === RIGHT_ARROW || key === 'd' || key === 'D') {
      safTilt = min(28, safTilt + 3);
    }
  }
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
