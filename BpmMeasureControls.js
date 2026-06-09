// ------------------------------------------------------------
// BpmMeasureControls.js — BPM + Mesures + Beats
// Version stable : clic unique, aucun spam
// ------------------------------------------------------------

class BpmMeasureControls {
  constructor(app, x, y) {
    this.app = app;

    // On garde x,y pour BPM et Beats
    this.x = x;
    this.y = y;

    this.bpm = 120.00;
    this.measures = 4;
    this.beatsPerMeasure = 4;

    this.activeField = null;
    this.buttons = {};
    this._lastClick = 0;
  }

  // ------------------------------------------------------------
  // DRAW
  // ------------------------------------------------------------
  draw() {
    push();
    translate(this.x, this.y);

    // ------------------------------------------------------------
    // BPM (inchangé)
    // ------------------------------------------------------------
    fill(255);
    textSize(14);
    textAlign(LEFT, CENTER);
    text("BPM", 0, 0);

    const bpmToShow =
      (!this.app.audio.isPlaying && this.app.midi.clockBpm)
        ? this.app.midi.clockBpm
        : this.bpm;

    const bpmBox = { x: 40, y: -10, w: 70, h: 22 };
    this.buttons["bpmBox"] = {
      x: this.x + bpmBox.x,
      y: this.y + bpmBox.y,
      w: bpmBox.w,
      h: bpmBox.h
    };

    stroke(200);
    fill(this.activeField === "bpm" ? 70 : 40);
    rect(bpmBox.x, bpmBox.y, bpmBox.w, bpmBox.h, 4);

    fill(255);
    noStroke();
    textAlign(CENTER, CENTER);
    text(nf(bpmToShow, 0, 2), bpmBox.x + bpmBox.w / 2, bpmBox.y + bpmBox.h / 2);

    this._drawBtn("bpmMinus", 120, -10, 22, 22, "-");
    this._drawBtn("bpmPlus", 150, -10, 22, 22, "+");

    // ------------------------------------------------------------
    // MESURES — déplacé sous RECORD (y = 150)
    // ------------------------------------------------------------
    const MES_Y = 620 - this.y; // offset relatif

    fill(255);
    textAlign(LEFT, CENTER);
    text("Mesures", 0, MES_Y);

    fill(255);
    textAlign(CENTER, CENTER);
    text(this.measures, 70, MES_Y);

    this._drawBtn("measMinus", 100, MES_Y - 10, 22, 22, "-");
    this._drawBtn("measPlus", 130, MES_Y - 10, 22, 22, "+");

    // ------------------------------------------------------------
    // BEATS (inchangé)
    // ------------------------------------------------------------
    fill(255);
    textAlign(LEFT, CENTER);
    text("Beat", 180, 0);

    fill(255);
    textAlign(CENTER, CENTER);
    text(this.beatsPerMeasure, 240, 0);

    this._drawBtn("beatMinus", 270, -10, 22, 22, "-");
    this._drawBtn("beatPlus", 300, -10, 22, 22, "+");

    pop();
  }

  // ------------------------------------------------------------
  // DRAW BUTTON
  // ------------------------------------------------------------
  _drawBtn(id, x, y, w, h, label) {
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

    this.buttons[id] = {
      x: this.x + x,
      y: this.y + y,
      w,
      h
    };
  }

  // ------------------------------------------------------------
  // INTERACTIONS
  // ------------------------------------------------------------
  mousePressed() {
    const now = millis();
    if (now - this._lastClick < 150) return;
    this._lastClick = now;

    if (this._inside("bpmBox")) {
      if (!this.app.audio.isPlaying && this.app.midi.clockBpm) {
        this.activeField = null;
      } else {
        this.activeField = "bpm";
      }
      return;
    }

    this.activeField = null;

    if (this._inside("bpmMinus")) return this._changeBpm(-0.10);
    if (this._inside("bpmPlus")) return this._changeBpm(+0.10);

    if (this._inside("measMinus")) return this._changeMeasures(-1);
    if (this._inside("measPlus")) return this._changeMeasures(+1);

    if (this._inside("beatMinus")) return this._changeBeats(-1);
    if (this._inside("beatPlus")) return this._changeBeats(+1);
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

  // ------------------------------------------------------------
  // HELPERS
  // ------------------------------------------------------------
  _inside(id) {
    const b = this.buttons[id];
    if (!b) return false;
    return (
      mouseX >= b.x &&
      mouseX <= b.x + b.w &&
      mouseY >= b.y &&
      mouseY <= b.y + b.h
    );
  }

  _changeBpm(delta) {
    this.bpm = constrain(this.bpm + delta, 20, 300);
    this.bpm = Number(this.bpm.toFixed(2));
  }

  _changeMeasures(delta) {
    this.measures = constrain(this.measures + delta, 1, 32);
  }

  _changeBeats(delta) {
    this.beatsPerMeasure = constrain(this.beatsPerMeasure + delta, 1, 16);

    if (this.app.ui && this.app.ui.loopViewer && this.app.ui.loopViewer.updateAutoBpm) {
      this.app.ui.loopViewer.updateAutoBpm();
    }
  }
}
