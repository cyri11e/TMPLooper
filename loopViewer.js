// ------------------------------------------------------------
// loopViewer.js — VERSION PRO
// Waveform + zoom + playhead + loop handles + double‑clic
// ------------------------------------------------------------

class LoopViewer {
  constructor(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;

    this.wave = [];
    this.playhead = 0;

    // Zoom & offset
    this.zoom = 1;
    this.offset = 0;

    // Loop handles (0 → 1)
    this.loopStart = 0.0;
    this.loopEnd = 1.0;

    // Drag state
    this.draggingLeft = false;
    this.draggingRight = false;
    this.dragging = false;

    // Double‑clic
    this.lastClickTime = 0;
  }

  // ------------------------------------------------------------
  // Détection souris
  // ------------------------------------------------------------
  isHovered() {
    return (
      mouseX > this.x &&
      mouseX < this.x + this.w &&
      mouseY > this.y &&
      mouseY < this.y + this.h
    );
  }

  // ------------------------------------------------------------
  // Double‑clic → ouvrir file picker
  // ------------------------------------------------------------
  onClick(callbackOpenFile) {
    const now = millis();
    if (now - this.lastClickTime < 250) {
      callbackOpenFile();
    }
    this.lastClickTime = now;
  }

  // ------------------------------------------------------------
  // Injection waveform
  // ------------------------------------------------------------
  updateWave(wave) {
    this.wave = wave;
  }

  // ------------------------------------------------------------
  // Zoom PRO centré sur la souris
  // ------------------------------------------------------------
  onWheel(delta) {
    const zoomSpeed = 0.001;
    const localX = mouseX - this.x;

    const timeBefore = (localX + this.offset) / (this.w * this.zoom);

    this.zoom *= (1 - delta * zoomSpeed);
    this.zoom = constrain(this.zoom, 0.2, 20);

    const timeAfter = (localX + this.offset) / (this.w * this.zoom);

    const deltaTime = timeAfter - timeBefore;
    this.offset += deltaTime * this.w * this.zoom;

    const maxOffset = this.w * this.zoom - this.w;
    this.offset = constrain(this.offset, 0, maxOffset);
  }

  // ------------------------------------------------------------
  // Playhead
  // ------------------------------------------------------------
  setPlayhead(normPos) {
    this.playhead = constrain(normPos, 0, 1);
  }

  // ------------------------------------------------------------
  // Souris pressée → drag des loop handles
  // ------------------------------------------------------------
  mousePressed() {
    if (!this.isHovered()) return;
    const HITBOX = 30;
    const localX = mouseX - this.x;

    const leftX = this.loopStart * this.w * this.zoom - this.offset;
    const rightX = this.loopEnd * this.w * this.zoom - this.offset;

    if (abs(localX - leftX) < HITBOX) {
      this.draggingLeft = true;
    } else if (abs(localX - rightX) < HITBOX) {
      this.draggingRight = true;
    }
  }

  // ------------------------------------------------------------
  // Souris relâchée
  // ------------------------------------------------------------
  mouseReleased() {
    this.draggingLeft = false;
    this.draggingRight = false;
  }

  // ------------------------------------------------------------
  // Drag des loop handles
  // ------------------------------------------------------------
  mouseDragged() {
    if (!this.isHovered()) return;

    const localX = mouseX - this.x;
    const t = (localX + this.offset) / (this.w * this.zoom);
    const norm = constrain(t, 0, 1);

    if (this.draggingLeft) {
      this.loopStart = min(norm, this.loopEnd - 0.01);
    }

    if (this.draggingRight) {
      this.loopEnd = max(norm, this.loopStart + 0.01);
    }
  }

  // ------------------------------------------------------------
  // Rendu
  // ------------------------------------------------------------
  draw() {
    push();
    translate(this.x, this.y);

    // Fond
    fill(20);
    noStroke();
    rect(0, 0, this.w, this.h);

    if (this.wave.length === 0) {
      fill(150);
      textAlign(CENTER, CENTER);
      text("Double‑clic pour charger un fichier audio", this.w/2, this.h/2);
      pop();
      return;
    }

    // Waveform
    stroke(100, 200, 255);
    noFill();
    beginShape();

    for (let i = 0; i < this.wave.length; i++) {
      const t = i / (this.wave.length - 1);
      const x = t * this.w * this.zoom - this.offset;

      if (x < -2 || x > this.w + 2) continue;

      const y = map(this.wave[i], -1, 1, this.h - 5, 5);
      vertex(x, y);
    }

    endShape();

    // Loop handles
    const leftX = this.loopStart * this.w * this.zoom - this.offset;
    const rightX = this.loopEnd * this.w * this.zoom - this.offset;

    stroke(255, 200, 0);
    strokeWeight(3);
    line(leftX, 0, leftX, this.h);
    line(rightX, 0, rightX, this.h);

// Playhead dans l’espace de la loop
const loopSpan = this.loopEnd - this.loopStart;
const pxNorm = this.loopStart + this.playhead * loopSpan;
const px = pxNorm * this.w * this.zoom - this.offset;

stroke(0, 255, 0);
strokeWeight(2);
line(px, 0, px, this.h);


    pop();
  }
}
