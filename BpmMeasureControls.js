// ------------------------------------------------------------
// BpmMeasureControls.js — Aligné + Responsive (Mode A 45/10/45)
// ------------------------------------------------------------

class BpmMeasureControls {
  constructor(app, x, y) {
    this.app = app;
    this.x = x;
    this.y = y;

    this.width = 330;
    this.height = 60;

    this.activeField = null;

    this.bpm = 120.00;
    this.beat = 4;
    this.measures = 4;

    // hitzones
    this.bpmMinus = null;
    this.bpmPlus = null;
    this.beatMinus = null;
    this.beatPlus = null;
    this.measuresMinus = null;
    this.measuresPlus = null;
  }

  // ------------------------------------------------------------
  // RESPONSIVE
  // ------------------------------------------------------------
  onResize() {
    const W = width;
    const H = height;

    // scale uniforme basé sur 960x390 (comme ton pédalier)
    const s = Math.min(W / 960, H / 390);
    this.s = s;

    this.width = 700 * s;   // largeur totale du bloc
    this.height = 55 * s;

    this.x = (W - this.width) / 2;
  }

  // ------------------------------------------------------------
  // DRAW
  // ------------------------------------------------------------
  draw() {
    push();
    translate(this.x, this.y);

    const s = this.s;

    textAlign(CENTER, CENTER);
    textStyle(BOLD);
    textSize(22 * s);
    fill(255);

    // espacement horizontal
    const gap = this.width / 3;

    // positions des 3 blocs
    const x1 = gap * 0.5;
    const x2 = gap * 1.5;
    const x3 = gap * 2.5;

    // --- BPM ---
    text(`BPM ${this.bpm.toFixed(2)}`, x1, 0);
    this._drawButtons(x1, 25 * s, "bpm");

    // --- Beat ---
    text(`Beat ${this.beat}`, x2, 0);
    this._drawButtons(x2, 25 * s, "beat");

    // --- Mesures ---
    text(`Mesures ${this.measures}`, x3, 0);
    this._drawButtons(x3, 25 * s, "measures");

    pop();

    // Mise à jour des hitzones après translation
    this._updateHitboxes();
  }

  // ------------------------------------------------------------
  // DRAW BUTTONS
  // ------------------------------------------------------------
  _drawButtons(cx, cy, type) {
    const s = this.s;
    const bw = 28 * s;
    const bh = 22 * s;
    const pad = 6 * s;

    // bouton -
    fill(60);
    stroke(200);
    rect(cx - bw - pad, cy, bw, bh, 4);
    fill(255);
    text("-", cx - bw - pad + bw / 2, cy + bh / 2);

    // bouton +
    fill(60);
    stroke(200);
    rect(cx + pad, cy, bw, bh, 4);
    fill(255);
    text("+", cx + pad + bw / 2, cy + bh / 2);
  }

  // ------------------------------------------------------------
  // HITBOXES
  // ------------------------------------------------------------
  _updateHitboxes() {
    const s = this.s;

    const gap = this.width / 3;
    const x1 = this.x + gap * 0.5;
    const x2 = this.x + gap * 1.5;
    const x3 = this.x + gap * 2.5;

    const cy = this.y + 25 * s;
    const bw = 28 * s;
    const bh = 22 * s;
    const pad = 6 * s;

    this.bpmMinus = { x: x1 - bw - pad, y: cy, w: bw, h: bh };
    this.bpmPlus  = { x: x1 + pad,      y: cy, w: bw, h: bh };

    this.beatMinus = { x: x2 - bw - pad, y: cy, w: bw, h: bh };
    this.beatPlus  = { x: x2 + pad,      y: cy, w: bw, h: bh };

    this.measuresMinus = { x: x3 - bw - pad, y: cy, w: bw, h: bh };
    this.measuresPlus  = { x: x3 + pad,      y: cy, w: bw, h: bh };
  }

  // ------------------------------------------------------------
  // INTERACTIONS
  // ------------------------------------------------------------
  mousePressed() {
    const mx = mouseX;
    const my = mouseY;

    const check = (box) =>
      mx > box.x && mx < box.x + box.w && my > box.y && my < box.h;

    if (check(this.bpmMinus)) this.bpm = Math.max(20, this.bpm - 1);
    if (check(this.bpmPlus))  this.bpm = Math.min(300, this.bpm + 1);

    if (check(this.beatMinus)) this.beat = Math.max(1, this.beat - 1);
    if (check(this.beatPlus))  this.beat = Math.min(16, this.beat + 1);

    if (check(this.measuresMinus)) this.measures = Math.max(1, this.measures - 1);
    if (check(this.measuresPlus))  this.measures = Math.min(64, this.measures + 1);
  }

  keyPressed(k) {
    if (this.activeField === "bpm") {
      if (!isNaN(k)) this.bpm = parseFloat((this.bpm + k).toFixed(2));
    }
  }
}
