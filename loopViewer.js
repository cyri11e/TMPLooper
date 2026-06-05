// loopViewer.js \u2014 Waveform + zoom + playhead + loop handles + double-clic

class LoopViewer {
  constructor(x, y, w, h) {
    this.x = x; this.y = y; this.w = w; this.h = h;
    this.wave      = [];
    this.playhead  = 0;
    this.zoom      = 1;
    this.offset    = 0;
    this.loopStart = 0.0;
    this.loopEnd   = 1.0;
    this.draggingLeft  = false;
    this.draggingRight = false;
    this.lastClickTime = 0;
    this.active = true;
  }

  isHovered() {
    return mouseX > this.x && mouseX < this.x + this.w &&
           mouseY > this.y && mouseY < this.y + this.h;
  }

  onClick(cb) {
    const now = millis();
    if (now - this.lastClickTime < 250) cb();
    this.lastClickTime = now;
  }

  updateWave(wave) { this.wave = wave; }

  onWheel(delta) {
    const localX     = mouseX - this.x;
    const timeBefore = (localX + this.offset) / (this.w * this.zoom);
    this.zoom *= (1 - delta * 0.001);
    this.zoom  = constrain(this.zoom, 0.2, 20);
    const timeAfter  = (localX + this.offset) / (this.w * this.zoom);
    this.offset += (timeAfter - timeBefore) * this.w * this.zoom;
    this.offset  = constrain(this.offset, 0, max(0, this.w * this.zoom - this.w));
  }

  setPlayhead(normPos) { this.playhead = constrain(normPos, 0, 1); }

  mousePressed() {
    if (!this.isHovered()) return;
    const localX = mouseX - this.x;
    const leftX  = this.loopStart * this.w * this.zoom - this.offset;
    const rightX = this.loopEnd   * this.w * this.zoom - this.offset;
    if      (abs(localX - leftX)  < 30) this.draggingLeft  = true;
    else if (abs(localX - rightX) < 30) this.draggingRight = true;
  }

  mouseReleased() { this.draggingLeft = false; this.draggingRight = false; }

  mouseDragged() {
    if (!this.isHovered()) return;
    const norm = constrain((mouseX - this.x + this.offset) / (this.w * this.zoom), 0, 1);
    if (this.draggingLeft)  this.loopStart = min(norm, this.loopEnd   - 0.01);
    if (this.draggingRight) this.loopEnd   = max(norm, this.loopStart + 0.01);
  }

  draw() {
    push();
    translate(this.x, this.y);

    // Fond
    fill(this.active ? 20 : 12);
    noStroke();
    rect(0, 0, this.w, this.h);

    // Bordure
    stroke(this.active ? color(100, 180, 255) : color(45, 45, 55));
    strokeWeight(this.active ? 2 : 1);
    noFill();
    rect(0, 0, this.w, this.h);
    noStroke();

    // Label
    fill(this.active ? color(100, 180, 255) : color(65, 65, 80));
    textSize(11); textAlign(RIGHT, TOP);
    text("AUDIO", this.w - 6, 4);

    if (this.wave.length === 0) {
      fill(this.active ? 150 : 70);
      textAlign(CENTER, CENTER);
      text("Double-clic pour charger un fichier audio", this.w / 2, this.h / 2);
      pop(); return;
    }

    // Waveform
    stroke(this.active ? color(100, 200, 255) : color(45, 75, 95));
    noFill();
    beginShape();
    for (let i = 0; i < this.wave.length; i++) {
      const t = i / (this.wave.length - 1);
      const x = t * this.w * this.zoom - this.offset;
      if (x < -2 || x > this.w + 2) continue;
      vertex(x, map(this.wave[i], -1, 1, this.h - 5, 5));
    }
    endShape();

    // Zone de loop
    const leftX  = this.loopStart * this.w * this.zoom - this.offset;
    const rightX = this.loopEnd   * this.w * this.zoom - this.offset;
    noStroke();
    fill(this.active ? color(255, 200, 0, 28) : color(100, 80, 0, 14));
    rect(leftX, 0, rightX - leftX, this.h);

    // Handles
    stroke(this.active ? color(255, 200, 0) : color(90, 72, 0));
    strokeWeight(3);
    line(leftX, 0, leftX, this.h);
    line(rightX, 0, rightX, this.h);

    // Playhead
    const px = (this.loopStart + this.playhead * (this.loopEnd - this.loopStart)) * this.w * this.zoom - this.offset;
    stroke(this.active ? color(0, 255, 0) : color(0, 90, 0));
    strokeWeight(2);
    line(px, 0, px, this.h);

    // Overlay assombrissant si inactif
    if (!this.active) {
      noStroke(); fill(0, 90);
      rect(0, 0, this.w, this.h);
    }

    pop();
  }
}
