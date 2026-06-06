// ------------------------------------------------------------
// BpmMeasureControls.js — BPM + Mesures
// BPM Fantom si audio inactif, BPM manuel sinon
// ------------------------------------------------------------

class BpmMeasureControls {
  constructor(app, x, y) {
    this.app = app;
    this.x = x;
    this.y = y;

    this.bpm = 120.00;
    this.measures = 4;

    this.activeField = null; // "bpm" si saisie clavier active
  }

  draw() {
    push();
    translate(this.x, this.y);

    // BPM LABEL
    fill(255);
    textSize(14);
    textAlign(LEFT, CENTER);
    text("BPM", 0, 0);

    // BPM à afficher : Fantom si audio OFF et clock dispo, sinon manuel
    const bpmToShow =
      (!this.app.audio.isPlaying && this.app.midi.clockBpm)
        ? this.app.midi.clockBpm
        : this.bpm;

    // BPM INPUT BOX
    const bpmBox = { x: 40, y: -10, w: 70, h: 22 };
    stroke(200);
    fill(this.activeField === "bpm" ? 70 : 40);
    rect(bpmBox.x, bpmBox.y, bpmBox.w, bpmBox.h, 4);

    fill(255);
    noStroke();
    textAlign(CENTER, CENTER);
    text(nf(bpmToShow, 0, 2), bpmBox.x + bpmBox.w / 2, bpmBox.y + bpmBox.h / 2);

    // BPM - / +
    this._btn(120, -10, 22, 22, "-", () => this._changeBpm(-0.10));
    this._btn(150, -10, 22, 22, "+", () => this._changeBpm(+0.10));

    // MESURES LABEL
    fill(255);
    textAlign(LEFT, CENTER);
    text("Mesures", 190, 0);

    // MESURES VALUE
    fill(255);
    textAlign(CENTER, CENTER);
    text(this.measures, 260, 0);

    // MESURES - / +
    this._btn(290, -10, 22, 22, "-", () => this._changeMeasures(-1));
    this._btn(320, -10, 22, 22, "+", () => this._changeMeasures(+1));

    pop();
  }

  _btn(x, y, w, h, label, action) {
    const hovered =
      mouseX > this.x + x &&
      mouseX < this.x + x + w &&
      mouseY > this.y + y &&
      mouseY < this.y + y + h;

    fill(hovered ? 100 : 60);
    stroke(200);
    rect(x, y, w, h, 4);

    fill(255);
    noStroke();
    textAlign(CENTER, CENTER);
    text(label, x + w / 2, y + h / 2);

    if (hovered && mouseIsPressed) action();
  }

  _changeBpm(delta) {
    this.bpm = constrain(this.bpm + delta, 20, 300);
    this.bpm = Number(this.bpm.toFixed(2));
  }

  _changeMeasures(delta) {
    this.measures = constrain(this.measures + delta, 1, 32);
  }

  mousePressed() {
    // clic dans la zone BPM → saisie clavier
    if (
      mouseX > this.x + 40 &&
      mouseX < this.x + 110 &&
      mouseY > this.y - 10 &&
      mouseY < this.y + 12
    ) {
      // si BPM Fantom actif et audio OFF → pas de saisie manuelle
      if (!this.app.audio.isPlaying && this.app.midi.clockBpm) {
        this.activeField = null;
      } else {
        this.activeField = "bpm";
      }
    } else {
      this.activeField = null;
    }
  }

  keyPressed(k) {
    if (this.activeField === "bpm") {
      if ((k >= "0" && k <= "9") || k === ".") {
        this.bpm = Number(String(this.bpm) + k);
      }
      if (k === "Backspace") {
        let s = String(this.bpm);
        s = s.slice(0, -1);
        this.bpm = Number(s || "0");
      }
      this.bpm = Number(this.bpm.toFixed(2));
    }
  }
}
