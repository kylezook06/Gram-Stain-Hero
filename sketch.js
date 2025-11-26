// MicroBuddyz Gram Stain Mini-Game
// Warm lab palette, reagent bottle buddies, timing mini-game, and microscope score view

let mode = "stain"; // "stain", "decolor", "microscope", "score"
let steps = ["crystal", "iodine", "decolor", "safranin"];
let currentStepIndex = 0;

let reagents = [];
let slideObj;

let isPouring = false;
let decolorGauge = 0;
const GAUGE_SPEED = 1.2; // how fast the decolor bar fills
const GAUGE_MIN = 35; // sweet spot low %
const GAUGE_MAX = 75; // sweet spot high %

const COLORS = {
  bg: "#fdf7f2",
  table: "#f0e4da",
  tableShadow: "#d5c1b2",
  slide: "#f7fbff",
  slideBorder: "#b1c8dd",
  gramPosBase: "#f6d8a8",
  gramNegBase: "#c7f0eb",
  purple: "#7b4fff",
  pink: "#ff639b",
  bottleOutline: "#2b2b3a",
  textDark: "#3b2f2a",
  uiPanel: "#2f2931"
};

function setup() {
  const canvas = createCanvas(900, 600);
  canvas.parent("canvas-container");
  angleMode(DEGREES);
  textFont("Helvetica, Arial, sans-serif");
  startNewSlide();
}

function startNewSlide() {
  slideObj = new Slide();
  reagents = [];
  currentStepIndex = 0;
  mode = "stain";
  isPouring = false;
  decolorGauge = 0;

  const labels = [
    { id: "crystal", name: "Crystal Violet", color: COLORS.purple },
    { id: "iodine", name: "Iodine", color: "#c28e1b" },
    { id: "decolor", name: "Decolorizer", color: "#b7d7ff" },
    { id: "safranin", name: "Safranin", color: COLORS.pink }
  ];

  let startX = 100;
  for (let i = 0; i < labels.length; i++) {
    reagents.push(
      new ReagentButton(
        startX + i * 200,
        80,
        labels[i].id,
        labels[i].name,
        labels[i].color
      )
    );
  }
}

function draw() {
  background(COLORS.bg);
  drawTable();

  if (mode === "stain" || mode === "decolor") {
    drawStepHeader();
    drawSlideBenchView();
    drawReagents();
    drawStatusBar();
    if (mode === "decolor") {
      updateDecolorGauge();
      drawDecolorGauge();
    }
  } else if (mode === "microscope") {
    drawMicroscopeView();
  } else if (mode === "score") {
    drawScoreScreen();
  }
}

// ----------------- Layout & UI -----------------

function drawTable() {
  // table shadow
  noStroke();
  fill(COLORS.tableShadow);
  rect(40, 130, width - 80, height - 160, 30);

  // main tabletop
  fill(COLORS.table);
  rect(20, 120, width - 40, height - 140, 26);
}

function drawStepHeader() {
  fill(COLORS.textDark);
  textAlign(LEFT, CENTER);
  textSize(20);
  text("MicroBuddyz Gram Stain Lab", 40, 30);

  textSize(14);
  let stepName = steps[currentStepIndex] || "done";
  let human = "";
  if (stepName === "crystal") human = "Step 1 – Crystal Violet (primary stain)";
  if (stepName === "iodine") human = "Step 2 – Iodine (mordant)";
  if (stepName === "decolor") human = "Step 3 – Decolorizer (timing matters!)";
  if (stepName === "safranin") human = "Step 4 – Safranin (counterstain)";

  fill(80, 60);
  text(human, 40, 55);
}

function drawReagents() {
  for (let i = 0; i < reagents.length; i++) {
    const r = reagents[i];
    const isCurrent = steps[currentStepIndex] === r.id;
    const isDone = i < currentStepIndex;
    r.draw(isCurrent, isDone);
  }
}

function drawSlideBenchView() {
  // slide rectangle
  push();
  rectMode(CENTER);
  translate(width / 2, height / 2 + 50);

  // shadow
  noStroke();
  fill(0, 0, 0, 40);
  rect(10, 18, width * 0.56, height * 0.18, 18);

  stroke(COLORS.slideBorder);
  strokeWeight(4);
  fill(COLORS.slide);
  rect(0, 0, width * 0.56, height * 0.18, 18);

  pop();

  // cells on slide
  slideObj.drawCellsBench();
}

function drawStatusBar() {
  push();
  noStroke();
  fill(COLORS.uiPanel);
  rect(0, height - 80, width, 80);

  fill(255);
  textAlign(CENTER, CENTER);
  textSize(18);
  let msg = "";

  if (mode === "stain") {
    const s = steps[currentStepIndex];
    if (s === "crystal") msg = "Click CRYSTAL VIOLET to flood the slide.";
    if (s === "iodine") msg = "Click IODINE to lock in the stain.";
    if (s === "decolor") msg = "Click DECOLORIZER, then control the flow on the slide.";
    if (s === "safranin") msg = "Click SAFRANIN to counterstain Gram– buddies.";
  } else if (mode === "decolor") {
    msg = "Hold on the slide to apply decolorizer. Release in the green zone!";
  }

  text(msg, width / 2, height - 40);
  pop();
}

function drawDecolorGauge() {
  const x = width / 2 - 200;
  const y = height - 120;
  const w = 400;
  const h = 18;

  // bar background
  noStroke();
  fill(0, 0, 0, 40);
  rect(x - 2, y - 2, w + 4, h + 4, 10);

  // sweet zone
  fill("#c5f2c7");
  let sweetX = x + (GAUGE_MIN / 100) * w;
  let sweetW = ((GAUGE_MAX - GAUGE_MIN) / 100) * w;
  rect(sweetX, y, sweetW, h, 10);

  // fill
  fill("#81a4ff");
  let fillW = (decolorGauge / 100) * w;
  rect(x, y, fillW, h, 10);

  // border
  noFill();
  stroke(255);
  strokeWeight(2);
  rect(x, y, w, h, 10);

  // text
  noStroke();
  fill(255);
  textAlign(CENTER, BOTTOM);
  textSize(12);
  text("Decolorizer Flow", width / 2, y - 5);
}

function updateDecolorGauge() {
  if (mode === "decolor" && isPouring) {
    decolorGauge = constrain(decolorGauge + GAUGE_SPEED, 0, 100);
  }
}

// ----------------- Microscope & Score -----------------

function drawMicroscopeView() {
  background("#151018");

  // header
  fill(255);
  textAlign(CENTER, TOP);
  textSize(22);
  text("Microscope View", width / 2, 20);

  const cx = width / 2;
  const cy = height / 2 + 20;
  const r = 170;

  // vignette
  noStroke();
  fill(10);
  rect(0, 80, width, height - 120);

  // scope circle
  fill("#1d1b29");
  ellipse(cx, cy, r * 2 + 16, r * 2 + 16);
  fill("#f8f9ff");
  ellipse(cx, cy, r * 2, r * 2);

  slideObj.ensureEvaluated();

  // draw cells inside scope
  slideObj.drawCellsMicroscope(cx, cy, r);

  // labels
  fill(255);
  textAlign(CENTER, TOP);
  textSize(16);
  text(
    "True type: Gram " + (slideObj.type === "positive" ? "+" : "–") +
      "   |   Your result: Gram " + (slideObj.observedGram === "positive" ? "+" : "–"),
    width / 2,
    80
  );

  // button to score screen
  drawButton(width / 2 - 70, height - 80, 140, 40, "Show Score");
}

function drawScoreScreen() {
  background("#17151e");
  fill(255);
  textAlign(CENTER, TOP);
  textSize(26);
  text("Slide Result", width / 2, 60);

  slideObj.ensureEvaluated();

  textSize(18);
  text(
    "True type: Gram " + (slideObj.type === "positive" ? "+" : "–"),
    width / 2,
    130
  );
  text(
    "Your interpretation: Gram " + (slideObj.observedGram === "positive" ? "+" : "–"),
    width / 2,
    170
  );

  textSize(16);
  text(slideObj.message, width / 2, 220, 500, 200);

  let verdict = slideObj.correct ? "✅ Correct!" : "❌ Not quite.";
  textSize(22);
  text(verdict, width / 2, 340);

  // buttons
  drawButton(width / 2 - 150, height - 100, 120, 40, "Replay View");
  drawButton(width / 2 + 30, height - 100, 120, 40, "New Slide");
}

function drawButton(x, y, w, h, label) {
  let hovered = mouseX > x && mouseX < x + w && mouseY > y && mouseY < y + h;

  noStroke();
  fill(hovered ? "#ff9f7b" : "#ff845b");
  rect(x, y, w, h, 10);

  fill(30);
  textAlign(CENTER, CENTER);
  textSize(14);
  text(label, x + w / 2, y + h / 2);
}

// ----------------- Slide & Cells -----------------

class Slide {
  constructor() {
    // Gram+ = cocci, Gram– = rods
    this.type = random() < 0.5 ? "positive" : "negative";
    this.cells = [];
    this.decolorResult = null; // "under", "good", "over"
    this.observedGram = null; // "positive" or "negative"
    this.correct = false;
    this.message = "";

    // create cell positions (same positions reused for bench & scope)
    let slideX1 = width / 2 - (width * 0.56) / 2 + 40;
    let slideX2 = width / 2 + (width * 0.56) / 2 - 40;
    let slideY = height / 2 + 50;
    let slideH = height * 0.18 - 40;

    for (let i = 0; i < 12; i++) {
      let x = random(slideX1, slideX2);
      let y = random(slideY - slideH / 2, slideY + slideH / 2);

      // scope positions relative to center (for microscope)
      let angle = random(360);
      let radius = random(20, 150);
      let sx = cos(angle) * radius;
      let sy = sin(angle) * radius;

      this.cells.push(new MicroBuddyCell(x, y, sx, sy));
    }
  }

  drawCellsBench() {
    for (let c of this.cells) {
      let baseColor = this.type === "positive" ? COLORS.gramPosBase : COLORS.gramNegBase;
      c.drawOnSlide(this.type, baseColor);
    }
  }

  drawCellsMicroscope(cx, cy, r) {
    let gramColor = this.getObservedColor();
    for (let c of this.cells) {
      let px = cx + c.scopeX;
      let py = cy + c.scopeY;
      if (dist(px, py, cx, cy) < r - 10) {
        c.drawInScope(px, py, this.type, gramColor);
      }
    }
  }

  setDecolorFromGauge(g) {
    if (g < GAUGE_MIN) this.decolorResult = "under";
    else if (g > GAUGE_MAX) this.decolorResult = "over";
    else this.decolorResult = "good";
  }

  ensureEvaluated() {
    if (this.observedGram == null) {
      this.evaluate();
    }
  }

  evaluate() {
    let t = this.type;
    let dec = this.decolorResult || "good";

    if (t === "positive") {
      this.observedGram = dec === "over" ? "negative" : "positive";
    } else {
      this.observedGram = dec === "under" ? "positive" : "negative";
    }

    this.correct = this.observedGram === this.type;
    this.message = this.buildMessage(t, dec);
  }

  buildMessage(t, dec) {
    let base =
      this.type === "positive"
        ? "This slide was Gram POSITIVE (thick peptidoglycan cell walls)."
        : "This slide was Gram NEGATIVE (thin wall with outer membrane).";

    let decMsg = "";
    if (dec === "under") {
      decMsg =
        "You UNDER-decolorized. Extra crystal violet stayed on the slide, so Gram– cells can look falsely Gram positive.";
    } else if (dec === "good") {
      decMsg =
        "You hit the sweet spot on decolorizer. Crystal violet stayed in Gram+ cells but washed out of Gram– cells.";
    } else if (dec === "over") {
      decMsg =
        "You OVER-decolorized. Even Gram+ buddies started losing their purple, making them look falsely Gram negative.";
    }

    let resultMsg = this.correct
      ? "Your interpretation matched the true Gram reaction."
      : "Your interpretation did NOT match the true Gram reaction.";

    return base + "\n\n" + decMsg + "\n\n" + resultMsg;
  }

  getObservedColor() {
    return this.observedGram === "positive" ? COLORS.purple : COLORS.pink;
  }
}

class MicroBuddyCell {
  constructor(slideX, slideY, scopeX, scopeY) {
    this.slideX = slideX;
    this.slideY = slideY;
    this.scopeX = scopeX;
    this.scopeY = scopeY;
  }

  drawOnSlide(type, baseColor) {
    push();
    translate(this.slideX, this.slideY);

    noStroke();
    fill(0, 0, 0, 40);
    ellipse(4, 6, 26, 14);

    stroke(lerpColor(color(baseColor), color("#333333"), 0.45));
    strokeWeight(2.5);
    fill(baseColor);

    if (type === "positive") {
      ellipse(0, 0, 26, 26);
    } else {
      rectMode(CENTER);
      rect(0, 0, 30, 18, 9);
    }

    noStroke();
    fill(255, 255, 255, 60);
    ellipse(-6, -6, 10, 7);

    let ex = type === "positive" ? 8 : 9;
    stroke(0, 70);
    strokeWeight(1.5);
    fill(255);
    ellipse(-ex, -3, 7.5, 7.5);
    ellipse(ex, -3, 7.5, 7.5);

    noStroke();
    fill(40);
    ellipse(-ex, -3, 4, 4);
    ellipse(ex, -3, 4, 4);

    fill(255, 255, 255, 220);
    ellipse(-ex - 1, -4, 2, 2);
    ellipse(ex - 1, -4, 2, 2);

    stroke(40);
    strokeWeight(1.6);
    noFill();
    arc(0, 3, 8, 5, 0, 180);

    pop();
  }

  drawInScope(px, py, type, gramColor) {
    push();
    translate(px, py);

    stroke(lerpColor(color(gramColor), color("#121212"), 0.5));
    strokeWeight(2.3);
    fill(gramColor);

    if (type === "positive") {
      ellipse(0, 0, 32, 32);
    } else {
      rectMode(CENTER);
      rect(0, 0, 38, 20, 10);
    }

    noStroke();
    fill(255, 255, 255, 80);
    ellipse(-7, -7, 12, 9);

    let ex = type === "positive" ? 9 : 10;
    stroke(0, 80);
    strokeWeight(2);
    fill(255);
    ellipse(-ex, -4, 9, 9);
    ellipse(ex, -4, 9, 9);

    noStroke();
    fill(30);
    ellipse(-ex, -4, 4.2, 4.2);
    ellipse(ex, -4, 4.2, 4.2);

    fill(255, 255, 255, 220);
    ellipse(-ex - 1, -5, 2.4, 2.4);
    ellipse(ex - 1, -5, 2.4, 2.4);

    stroke(30);
    strokeWeight(1.8);
    noFill();
    arc(0, 4, 10, 6, 0, 180);

    pop();
  }
}

// ----------------- Input -----------------

function mousePressed() {
  if (mode === "stain") {
    for (let i = 0; i < reagents.length; i++) {
      let r = reagents[i];
      if (r.isMouseOver()) {
        handleReagentClick(r.id);
        return;
      }
    }
  } else if (mode === "decolor") {
    if (isMouseOnSlideArea()) {
      isPouring = true;
    }
  } else if (mode === "microscope") {
    if (isMouseOverButton(width / 2 - 70, height - 80, 140, 40)) {
      mode = "score";
    }
  } else if (mode === "score") {
    if (isMouseOverButton(width / 2 - 150, height - 100, 120, 40)) {
      mode = "microscope";
    } else if (isMouseOverButton(width / 2 + 30, height - 100, 120, 40)) {
      startNewSlide();
    }
  }
}

function mouseReleased() {
  if (mode === "decolor" && isPouring) {
    isPouring = false;
    slideObj.setDecolorFromGauge(decolorGauge);
    currentStepIndex = 3; // index of "safranin"
    mode = "stain";
  }
}

function handleReagentClick(id) {
  let expected = steps[currentStepIndex];
  if (id !== expected) {
    return;
  }

  if (id === "crystal") {
    currentStepIndex++;
  } else if (id === "iodine") {
    currentStepIndex++;
  } else if (id === "decolor") {
    mode = "decolor";
    decolorGauge = 0;
    isPouring = false;
  } else if (id === "safranin") {
    currentStepIndex++;
    slideObj.ensureEvaluated();
    mode = "microscope";
  }
}

function isMouseOnSlideArea() {
  let wSlide = width * 0.56;
  let hSlide = height * 0.18;
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

// ----------------- Reagent Buttons -----------------

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

    let enabled = isCurrent && mode === "stain";
    let hovered = enabled && this.isMouseOver();

    if (enabled) {
      noStroke();
      fill(this.colorHex + "33");
      ellipse(0, 60, this.w, this.h + 30);
    }

    stroke(COLORS.bottleOutline);
    strokeWeight(isCurrent ? 3 : 2);
    let c = color(this.colorHex);
    if (!enabled && !isDone) {
      c = lerpColor(c, color("#cccccc"), 0.5);
    }
    fill(c);
    rectMode(CENTER);
    rect(0, 60, this.w * 0.7, this.h * 0.65, 18);

    rect(0, 25, this.w * 0.35, this.h * 0.22, 10);

    noStroke();
    fill(255, enabled ? 240 : 180);
    rect(0, 65, this.w * 0.48, this.h * 0.24, 8);

    fill(40);
    ellipse(-14, 60, 7, 7);
    ellipse(14, 60, 7, 7);

    noFill();
    stroke(40);
    strokeWeight(1.5);
    arc(0, 68, 12, 6, 0, 180);

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
      stroke(255, 200);
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
