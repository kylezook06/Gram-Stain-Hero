// MicroBuddyz Gram Stain – p5.js starter
// Cute Gram stain flow with reagent bottle buddies and MicroBuddy cells

let buddies = [];
let reagents = [];
let currentStep = "none"; // "crystal", "iodine", "decolor", "safranin"

const COLORS = {
  bench: '#f2efe9',
  slide: '#e0f0ff',
  slideBorder: '#a6bed5',
  gramPosBase: '#f6d8a8',
  gramNegBase: '#c7f0eb',
  purple: '#7b4fff',
  pink: '#ff5e9c',
  outlineDark: '#333333',
  amber: '#c28e1b',
  decColor: '#b7d7ff'
};

function setup() {
  const canvas = createCanvas(900, 600);
  canvas.parent('canvas-container');
  angleMode(DEGREES);
  noStroke();

  // Create Gram+ cocci and Gram– rods on the slide
  for (let i = 0; i < 8; i++) {
    const type = random() < 0.5 ? "positive" : "negative";
    const x = random(width * 0.3, width * 0.7);
    const y = random(height * 0.35, height * 0.65);
    buddies.push(new MicroBuddyCell(x, y, type));
  }

  const labels = [
    { id: "crystal", name: "Crystal Violet", color: COLORS.purple },
    { id: "iodine", name: "Iodine", color: COLORS.amber },
    { id: "decolor", name: "Decolorizer", color: COLORS.decColor },
    { id: "safranin", name: "Safranin", color: COLORS.pink }
  ];

  let startX = 100;
  for (let i = 0; i < labels.length; i++) {
    reagents.push(new ReagentBuddy(
      startX + i * 200,
      90,
      labels[i].id,
      labels[i].name,
      labels[i].color,
      i + 1
    ));
  }
}

function draw() {
  background(COLORS.bench);

  drawLabBench();
  drawSlide();

  for (let b of buddies) {
    b.draw();
  }

  for (let r of reagents) {
    r.draw(r.id === currentStep);
  }

  drawStatusBar();
}

function drawLabBench() {
  noStroke();
  fill(255, 255, 255, 35);
  rect(0, 0, width, height / 2);
  fill(0, 0, 0, 10);
  rect(0, height / 2, width, height / 2);
  // slide shadow
  fill(0, 0, 0, 20);
  rect(width / 2 - width * 0.28, height / 2 + 50, width * 0.56, height * 0.02, 16);
}

function drawSlide() {
  push();
  rectMode(CENTER);
  translate(width / 2, height / 2 + 40);
  stroke(COLORS.slideBorder);
  strokeWeight(6);
  fill(COLORS.slide);
  rect(0, 0, width * 0.55, height * 0.45, 20);
  // corners glow
  noStroke();
  fill(255, 255, 255, 45);
  ellipse(-width * 0.27, -height * 0.22, 60, 40);
  ellipse(width * 0.27, height * 0.22, 60, 40);
  pop();
}

function drawStatusBar() {
  push();
  noStroke();
  fill(0, 0, 0, 120);
  rect(0, height - 90, width, 90);

  fill(255);
  textAlign(CENTER, CENTER);
  textSize(18);

  let stepText = "Smear prepped & heat-fixed. Choose a reagent buddy to start staining!";
  if (currentStep === "crystal") stepText = "Step 1: Crystal Violet — primary stain for 60s.";
  if (currentStep === "iodine") stepText = "Step 2: Iodine — mordant locks in the stain.";
  if (currentStep === "decolor") stepText = "Step 3: Decolorizer — rinse quickly so Gram+ stay purple.";
  if (currentStep === "safranin") stepText = "Step 4: Safranin — counterstain Gram– buddies pink.";

  text(stepText, width / 2, height - 45);
  pop();
}

class MicroBuddyCell {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type; // "positive" or "negative"
    this.state = "base"; // "base", "crystal", "decolorized", "safranin"
    this.rotation = random(-10, 10);
    this.wobbleSeed = random(1000);
  }

  applyReagent(step) {
    if (step === "crystal") {
      this.state = "crystal";
    } else if (step === "iodine") {
      // Mordant visually subtle; keep color but could animate later
    } else if (step === "decolor") {
      if (this.type === "negative") {
        this.state = "decolorized";
      }
    } else if (step === "safranin") {
      if (this.type === "negative") {
        this.state = "safranin";
      }
    }
  }

  getFillColor() {
    if (this.state === "base") {
      return this.type === "positive" ? COLORS.gramPosBase : COLORS.gramNegBase;
    }
    if (this.state === "crystal") {
      return COLORS.purple;
    }
    if (this.state === "decolorized") {
      return this.type === "positive" ? COLORS.purple : '#f7f7f7';
    }
    if (this.state === "safranin") {
      return COLORS.pink;
    }
    return COLORS.gramPosBase;
  }

  draw() {
    push();
    translate(this.x, this.y);
    rotate(this.rotation + sin(frameCount * 0.8 + this.wobbleSeed) * 1.2);

    noStroke();
    fill(0, 0, 0, 35);
    ellipse(6, 12, 46, 20);

    const bodyColor = this.getFillColor();
    const outlineColor = lerpColor(color(bodyColor), color(COLORS.outlineDark), 0.45);
    stroke(outlineColor);
    strokeWeight(4);
    fill(bodyColor);

    if (this.type === "positive") {
      ellipse(0, 0, 46, 46);
    } else {
      rectMode(CENTER);
      const w = 60;
      const h = 30;
      rect(0, 0, w, h, h / 2);
    }

    noStroke();
    fill(255, 255, 255, 50);
    ellipse(-10, -10, 18, 14);

    const eyeOffsetX = this.type === "positive" ? 10 : 13;
    stroke(0, 60);
    strokeWeight(2);
    fill(255);
    ellipse(-eyeOffsetX, -5, 10, 10);
    ellipse(eyeOffsetX, -5, 10, 10);

    fill(40);
    noStroke();
    ellipse(-eyeOffsetX, -5, 5, 5);
    ellipse(eyeOffsetX, -5, 5, 5);

    fill(255, 255, 255, 200);
    ellipse(-eyeOffsetX - 1, -6, 3, 3);
    ellipse(eyeOffsetX - 1, -6, 3, 3);

    stroke(40);
    strokeWeight(2);
    noFill();
    arc(0, 6, 12, 8, 0, 180);

    pop();
  }
}

class ReagentBuddy {
  constructor(x, y, id, label, colorHex, stepNumber) {
    this.x = x;
    this.y = y;
    this.id = id;
    this.label = label;
    this.colorHex = colorHex;
    this.stepNumber = stepNumber;
    this.w = 120;
    this.h = 140;
  }

  draw(isActive) {
    push();
    translate(this.x, this.y);

    if (isActive) {
      noStroke();
      fill(this.colorHex + '44');
      ellipse(0, 55, this.w, this.h + 50);
    }

    stroke(60);
    strokeWeight(3);
    fill(this.colorHex);
    rectMode(CENTER);
    rect(0, 50, this.w * 0.75, this.h * 0.7, 20);

    rect(0, 10, this.w * 0.4, this.h * 0.25, 10);

    fill(255, 240);
    noStroke();
    rect(0, 55, this.w * 0.5, this.h * 0.25, 8);

    fill(0);
    ellipse(-15, 50, 8, 8);
    ellipse(15, 50, 8, 8);

    fill(40);
    textAlign(CENTER, CENTER);
    textSize(11);
    text(this.label.split(" ")[0], 0, 75);

    fill(255);
    textSize(12);
    text(`Step ${this.stepNumber}`, 0, -28);

    fill(0, 140);
    textSize(10);
    text(this.id.toUpperCase(), 0, -12);

    pop();
  }

  isMouseOver() {
    return (
      mouseX > this.x - this.w * 0.4 &&
      mouseX < this.x + this.w * 0.4 &&
      mouseY > this.y - 20 &&
      mouseY < this.y + this.h
    );
  }
}

function mousePressed() {
  for (let r of reagents) {
    if (r.isMouseOver()) {
      currentStep = r.id;
      for (let b of buddies) {
        b.applyReagent(currentStep);
      }
      break;
    }
  }
}
