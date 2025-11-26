// MicroBuddyz Gram Stain Hero – v2
// - Centered canvas
// - Mixed cocci/rods per slide (morphology != Gram type)
// - Alternating Gram type between slides
// - Score / Lives HUD
// - Plushier MicroBuddy cells

let canvas;

let mode = "stain"; // "stain", "decolor", "microscope", "score"
let steps = ["crystal", "iodine", "decolor", "safranin"];
let currentStepIndex = 0;

let reagents = [];
let slideObj;

let isPouring = false;
let decolorGauge = 0;
const GAUGE_SPEED = 1.4;
const GAUGE_MIN = 35;
const GAUGE_MAX = 75;

let score = 0;
let lives = 3;
let slideNumber = 1;
let lastSlideType = null; // alternate Gram+/Gram–

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
  canvas = createCanvas(900, 600);
  centerCanvas();
  angleMode(DEGREES);
  textFont("sans-serif");
  startNewSlide();
}

function centerCanvas() {
  const x = (windowWidth - width) / 2;
  const y = max(20, (windowHeight - height) / 2);
  canvas.position(x, y);
}

function windowResized() {
  centerCanvas();
}

function startNewSlide() {
  let type;
  if (lastSlideType === null) {
    type = random() < 0.5 ? "positive" : "negative";
  } else {
    type = lastSlideType === "positive" ? "negative" : "positive";
  }
  lastSlideType = type;

  slideObj = new Slide(type);
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

  let startX = 110;
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
  drawHeaderAndHUD();

  if (mode === "stain" || mode === "decolor") {
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
  noStroke();
  fill(COLORS.tableShadow);
  rect(40, 130, width - 80, height - 160, 30);

  fill(COLORS.table);
  rect(20, 120, width - 40, height - 140, 26);
}

function drawHeaderAndHUD() {
  fill(COLORS.textDark);
  textAlign(LEFT, CENTER);
  textSize(20);
  text("MicroBuddyz Gram Stain Lab", 40, 35);

  textSize(13);
  let stepName = steps[currentStepIndex] || "done";
  let human = "";
  if (stepName === "crystal") human = "Step 1 \u2013 Crystal Violet (primary stain)";
  if (stepName === "iodine") human = "Step 2 \u2013 Iodine (mordant)";
  if (stepName === "decolor") human = "Step 3 \u2013 Decolorizer (timing matters!)";
  if (stepName === "safranin") human = "Step 4 \u2013 Safranin (counterstain)";
  fill(80, 90);
  text(human, 40, 60);

  textAlign(RIGHT, CENTER);
  textSize(14);
  fill(COLORS.textDark);
  text(
    "Score: " + score + "   Lives: " + lives + "   Slide: " + slideNumber,
    width - 40,
    35
  );
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
  push();
  rectMode(CENTER);
  translate(width / 2, height / 2 + 50);

  noStroke();
  fill(0, 0, 0, 40);
  rect(12, 18, width * 0.56, height * 0.20, 20);

  stroke(COLORS.slideBorder);
  strokeWeight(4);
  fill(COLORS.slide);
  rect(0, 0, width * 0.56, height * 0.20, 20);

  pop();

  slideObj.drawCellsBench();
}

function drawStatusBar() {
  push();
  noStroke();
  fill(COLORS.uiPanel);
  rect(0, height - 80, width, 80);

  fill(255);
  textAlign(CENTER, CENTER);
  textSize(17);
  let msg = "";

  if (mode === "stain") {
    const s = steps[currentStepIndex];
    if (s === "crystal") msg = "Click CRYSTAL VIOLET to flood the slide.";
    if (s === "iodine") msg = "Click IODINE to lock the purple into Gram+ buddies.";
    if (s === "decolor") msg = "Click DECOLORIZER, then hold on the slide to rinse.";
    if (s === "safranin") msg = "Click SAFRANIN to give Gram\u2013 buddies a rosy glow.";
  } else if (mode === "decolor") {
    msg = "Hold the mouse on the slide to apply decolorizer. Release in the green zone!";
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

  fill("#c5f2c7");
  let sweetX = x + (GAUGE_MIN / 100) * w;
  let sweetW = ((GAUGE_MAX - GAUGE_MIN) / 100) * w;
  rect(sweetX, y, sweetW, h, 10);

  fill("#81a4ff");
  let fillW = (decolorGauge / 100) * w;
  rect(x, y, fillW, h, 10);

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

function updateDecolorGauge() {
  if (mode === "decolor" && isPouring) {
    decolorGauge = constrain(decolorGauge + GAUGE_SPEED, 0, 100);
  }
}

// ----------------- Microscope & Score -----------------

function drawMicroscopeView() {
  background("#151018");

  fill(255);
  textAlign(CENTER, TOP);
  textSize(22);
  text("Microscope View", width / 2, 25);

  const cx = width / 2;
  const cy = height / 2 + 20;
  const r = 190;

  noStroke();
  fill(10);
  rect(0, 80, width, height - 120);

  fill("#1d1b29");
  ellipse(cx, cy, r * 2 + 18, r * 2 + 18);
  fill("#f8f9ff");
  ellipse(cx, cy, r * 2, r * 2);

  slideObj.ensureEvaluated();

  slideObj.drawCellsMicroscope(cx, cy, r);

  fill(255);
  textAlign(CENTER, TOP);
  textSize(16);
  text(
    "True type: Gram " + (slideObj.type === "positive" ? "+" : "\u2013") +
      "   |   Your result: Gram " + (slideObj.observedGram === "positive" ? "+" : "\u2013"),
    width / 2,
    90
  );

  drawButton(width / 2 - 70, height - 80, 140, 42, "Show Score");
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
    "True type: Gram " + (slideObj.type === "positive" ? "+" : "\u2013"),
    width / 2,
    120
  );
  text(
    "Your interpretation: Gram " + (slideObj.observedGram === "positive" ? "+" : "\u2013"),
    width / 2,
    150
  );

  textSize(15);
  text(slideObj.message, width / 2, 190, 600, 230);

  let verdict = slideObj.correct ? "\u2705 Correct!" : "\u274c Not quite.";
  textSize(22);
  text(verdict, width / 2, 360);

  drawButton(width / 2 - 150, height - 100, 120, 42, "Replay View");
  drawButton(width / 2 + 30, height - 100, 120, 42, "New Slide");
}

function drawButton(x, y, w, h, label) {
  let hovered = mouseX > x && mouseX < x + w && mouseY > y && mouseY < y + h;

  noStroke();
  fill(hovered ? "#ff9f7b" : "#ff845b");
  rect(x, y, w, h, 12);

  fill(30);
  textAlign(CENTER, CENTER);
  textSize(14);
  text(label, x + w / 2, y + h / 2);
}

// ----------------- Slide & Cells -----------------

class Slide {
  constructor(type) {
    this.type = type;
    this.cells = [];
    this.decolorResult = null;
    this.observedGram = null;
    this.correct = false;
    this.message = "";

    let slideX1 = width / 2 - (width * 0.56) / 2 + 40;
    let slideX2 = width / 2 + (width * 0.56) / 2 - 40;
    let slideY = height / 2 + 50;
    let slideH = height * 0.20 - 40;

    for (let i = 0; i < 14; i++) {
      let x = random(slideX1, slideX2);
      let y = random(slideY - slideH / 2, slideY + slideH / 2);

      let ang = random(360);
      let radius = random(25, 160);
      let sx = cos(ang) * radius;
      let sy = sin(ang) * radius;

      let morph = random() < 0.55 ? "coccus" : "rod";

      this.cells.push(new MicroBuddyCell(x, y, sx, sy, morph));
    }
  }

  drawCellsBench() {
    let baseColor = this.type === "positive" ? COLORS.gramPosBase : COLORS.gramNegBase;
    for (let c of this.cells) {
      c.drawOnSlide(baseColor);
    }
  }

  drawCellsMicroscope(cx, cy, r) {
    let gramColor = this.getObservedColor();
    for (let c of this.cells) {
      let px = cx + c.scopeX;
      let py = cy + c.scopeY;
      if (dist(px, py, cx, cy) < r - 8) {
        c.drawInScope(px, py, gramColor);
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

    if (!this._scored) {
      if (this.correct) score += 100;
      else lives = max(0, lives - 1);
      this._scored = true;
    }
  }

  buildMessage(t, dec) {
    let base =
      t === "positive"
        ? "This slide was Gram POSITIVE (thick peptidoglycan walls that hold crystal violet)."
        : "This slide was Gram NEGATIVE (thin wall with an outer membrane that loses crystal violet).";

    let decMsg = "";
    if (dec === "under") {
      decMsg =
        "You UNDER-decolorized. Extra crystal violet stayed on the slide, so Gram\u2013 buddies can look falsely Gram positive.";
    } else if (dec === "good") {
      decMsg =
        "You hit the sweet spot on decolorizer. Crystal violet stayed in Gram+ cells but washed out of Gram\u2013 cells.";
    } else if (dec === "over") {
      decMsg =
        "You OVER-decolorized. Even Gram+ buddies started losing their purple, making them look falsely Gram negative.";
    }

    let resultMsg = this.correct
      ? "Your timing gave the correct Gram result for this slide."
      : "Your timing made the slide look like the wrong Gram type.";

    return base + "\n\n" + decMsg + "\n\n" + resultMsg;
  }

  getObservedColor() {
    return this.observedGram === "positive" ? COLORS.purple : COLORS.pink;
  }
}

class MicroBuddyCell {
  constructor(slideX, slideY, scopeX, scopeY, morph) {
    this.slideX = slideX;
    this.slideY = slideY;
    this.scopeX = scopeX;
    this.scopeY = scopeY;
    this.morph = morph;
  }

  drawOnSlide(baseColor) {
    push();
    translate(this.slideX, this.slideY);

    noStroke();
    fill(0, 0, 0, 40);
    ellipse(4, 6, 26, 14);

    stroke(lerpColor(color(baseColor), color("#333333"), 0.45));
    strokeWeight(2.5);
    fill(baseColor);

    if (this.morph === "coccus") {
      ellipse(0, 0, 26, 26);
    } else {
      rectMode(CENTER);
      rect(0, 0, 32, 18, 9);
    }

    noStroke();
    fill(255, 255, 255, 60);
    ellipse(-6, -6, 10, 7);

    let ex = this.morph === "coccus" ? 8 : 9;
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

  drawInScope(px, py, gramColor) {
    push();
    translate(px, py);

    stroke(lerpColor(color(gramColor), color("#121212"), 0.5));
    strokeWeight(2.3);
    fill(gramColor);

    if (this.morph === "coccus") {
      ellipse(0, 0, 32, 32);
    } else {
      rectMode(CENTER);
      rect(0, 0, 40, 22, 11);
    }

    noStroke();
    fill(255, 255, 255, 80);
    ellipse(-7, -7, 12, 9);

    let ex = this.morph === "coccus" ? 9 : 10;
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
    for (let r of reagents) {
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
    if (isMouseOverButton(width / 2 - 70, height - 80, 140, 42)) {
      mode = "score";
    }
  } else if (mode === "score") {
    if (isMouseOverButton(width / 2 - 150, height - 100, 120, 42)) {
      mode = "microscope";
    } else if (isMouseOverButton(width / 2 + 30, height - 100, 120, 42)) {
      slideNumber++;
      startNewSlide();
    }
  }
}

function mouseReleased() {
  if (mode === "decolor" && isPouring) {
    isPouring = false;
    slideObj.setDecolorFromGauge(decolorGauge);
    currentStepIndex = 3;
    mode = "stain";
  }
}

function handleReagentClick(id) {
  let expected = steps[currentStepIndex];
  if (id !== expected) return;

  if (id === "crystal") currentStepIndex++;
  else if (id === "iodine") currentStepIndex++;
  else if (id === "decolor") {
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
  let hSlide = height * 0.20;
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
      c = lerpColor(c, color("#cccccc"), 0.4);
    }
    fill(c);
    rectMode(CENTER);
    rect(0, 60, this.w * 0.7, this.h * 0.65, 18);

    rect(0, 25, this.w * 0.35, this.h * 0.22, 10);

    noStroke();
    fill(255, enabled ? 240 : 190);
    rect(0, 65, this.w * 0.48, this.h * 0.24, 8);

    fill(40);
    ellipse(-14, 60, 7, 7);
    ellipse(14, 60, 7, 7);

    noFill();
    stroke(40);
    strokeWeight(1.5);
    arc(0, 69, 12, 6, 0, 180);

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
