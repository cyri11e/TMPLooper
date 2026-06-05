// ------------------------------------------------------------
// SettingsPanel.js — version finale propre, alignée, CC éditables
// (corrigé : isolation graphique dans _monitor pour éviter fuite de styles)
// ------------------------------------------------------------

class SettingsPanel {
  constructor(midiManager) {
    this.midi = midiManager;

    this.visible = false;

    // Fenêtre FIXE
    this.x = 100;
    this.y = 70;
    this.w = 800;
    this.h = 500;

    // Hitbox Fermer (mise à jour dans draw)
    this.closeX = 0;
    this.closeY = 0;
    this.closeW = 0;
    this.closeH = 0;

    // Sélection devices
    this.tmpInIndex = 0;
    this.tmpOutIndex = 0;
    this.synthInIndex = 0;
    this.synthOutIndex = 0;

    // Paramètres MIDI
    this.params = {
      recordCC: 103,
      playCC: 104,
      tapCC: 64,
      presetPC: 0
    };

    this.activeField = null;
  }

  show() { this.visible = true; }
  hide() { this.visible = false; }

  draw() {
    if (!this.visible) return;

    push();

    // ------------------------------------------------------------
    // BANDEAU TITRE
    // ------------------------------------------------------------
    fill(20);
    stroke(180);
    strokeWeight(2);
    rect(this.x, this.y, this.w, 40, 10, 10, 0, 0);

    fill(255);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(20);
    text("PARAMÉTRAGE MIDI", this.x + this.w / 2, this.y + 20);

    // ------------------------------------------------------------
    // BOUTON FERMER — hitbox correcte
    // ------------------------------------------------------------
    this.closeX = this.x + this.w - 100;
    this.closeY = this.y + 5;
    this.closeW = 90;
    this.closeH = 30;

    fill(160, 40, 40);
    stroke(220);
    rect(this.closeX, this.closeY, this.closeW, this.closeH, 6);

    fill(255);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(14);
    text("Fermer", this.closeX + this.closeW/2, this.closeY + this.closeH/2);

    // ------------------------------------------------------------
    // FOND
    // ------------------------------------------------------------
    fill(0, 230);
    stroke(120);
    strokeWeight(2);
    rect(this.x, this.y + 40, this.w, this.h - 40, 10);

    let cx = this.x + 24;
    let cy = this.y + 60;

    // ------------------------------------------------------------
    // DEVICES
    // ------------------------------------------------------------
    fill(255);
    textAlign(LEFT, TOP);
    textSize(16);

    text("TMP — MIDI IN", cx, cy);
    this.tmpInIndex = this._selector(cx + 200, cy, this.tmpInIndex, this.midi.inputs);
    cy += 30;

    text("TMP — MIDI OUT", cx, cy);
    this.tmpOutIndex = this._selector(cx + 200, cy, this.tmpOutIndex, this.midi.outputs);
    cy += 40;

    text("Synth — MIDI IN", cx, cy);
    this.synthInIndex = this._selector(cx + 200, cy, this.synthInIndex, this.midi.inputs);
    cy += 30;

    text("Synth — MIDI OUT", cx, cy);
    this.synthOutIndex = this._selector(cx + 200, cy, this.synthOutIndex, this.midi.outputs);
    cy += 45;

    // ------------------------------------------------------------
    // PARAMÈTRES MIDI
    // ------------------------------------------------------------
    textSize(17);
    text("Paramètres MIDI TMP", cx, cy);
    cy += 30;

    this._field("Record CC", "recordCC", cx, cy);
    cy += 28;

    this._field("Play CC", "playCC", cx, cy);
    cy += 28;

    this._field("Tap Tempo CC", "tapCC", cx, cy);
    cy += 28;

    this._field("Preset PC", "presetPC", cx, cy);
    cy += 40;

    // ------------------------------------------------------------
    // ZONE JAUNE POUR MONITORING
    // ------------------------------------------------------------
    const zoneX = cx;
    const zoneY = cy;
    const zoneW = this.w - 60;
    const zoneH = 120;

    stroke(255, 255, 0);
    strokeWeight(2);
    noFill();
    rect(zoneX, zoneY, zoneW, zoneH, 6);

    // ------------------------------------------------------------
    // MONITORING DANS LA ZONE JAUNE
    // ------------------------------------------------------------
    const monW = (zoneW - 40) / 2;
    const monH = zoneH - 40;

    fill(255);
    noStroke();
    textSize(16);
    textAlign(LEFT, TOP);

    // Monitoring IN
    fill(255); // ensure label color is white
    text("Monitoring IN", zoneX + 10, zoneY + 10);
    this._monitor(this.midi.log, zoneX + 10, zoneY + 30, monW, monH);

    // Monitoring OUT
    fill(255); // reset to white before drawing the second label
    text("Monitoring OUT", zoneX + 20 + monW, zoneY + 10);
    this._monitor(this.midi.logOut, zoneX + 20 + monW, zoneY + 30, monW, monH);

    pop();
  }

  // ------------------------------------------------------------
  // SELECTOR
  // ------------------------------------------------------------
  _selector(x, y, index, list) {
    fill(50);
    stroke(100);
    rect(x, y, 230, 24, 4);

    fill(255);
    noStroke();
    textSize(13);
    textAlign(LEFT, CENTER);

    if (!list || list.length === 0) {
      text("Aucun device", x + 8, y + 12);
      return 0;
    }

    text(list[index]?.name || "—", x + 8, y + 12);

    // flèche gauche
    if (mouseIsPressed &&
        mouseX > x - 18 && mouseX < x - 4 &&
        mouseY > y && mouseY < y + 24) {
      index = max(0, index - 1);
    }

    // flèche droite
    if (mouseIsPressed &&
        mouseX > x + 234 && mouseX < x + 250 &&
        mouseY > y && mouseY < y + 24) {
      index = min(list.length - 1, index + 1);
    }

    fill(200);
    triangle(x - 10, y + 12, x - 4, y + 4, x - 4, y + 20);
    triangle(x + 244, y + 12, x + 238, y + 4, x + 238, y + 20);

    return index;
  }

  // ------------------------------------------------------------
  // FIELD (CC modifiables)
  // ------------------------------------------------------------
  _field(label, key, x, y) {
    fill(255);
    textSize(15);
    textAlign(LEFT, TOP);
    text(label, x, y);

    const bx = x + 200;
    const by = y - 2;

    fill(60);
    stroke(100);
    rect(bx, by, 70, 24, 4);

    fill(255);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(14);
    text(this.params[key], bx + 35, by + 12);

    if (mouseIsPressed &&
        mouseX > bx && mouseX < bx + 70 &&
        mouseY > by && mouseY < by + 24) {
      this.activeField = key;
    }
  }

  // ------------------------------------------------------------
  // MONITOR
  // ------------------------------------------------------------
  _monitor(log, x, y, w, h) {
    // isolate styles so _monitor doesn't change global fill/stroke/text settings
    push();

    fill(15);
    stroke(90);
    rect(x, y, w, h, 6);

    fill(0, 255, 0);
    noStroke();
    textSize(11);
    textAlign(LEFT, TOP);

    let yy = y + 4;
    if (!log) {
      pop();
      return;
    }
    for (let i = log.length - 1; i >= 0 && yy < y + h - 10; i--) {
      text(log[i], x + 4, yy);
      yy += 11;
    }

    pop();
  }
}
