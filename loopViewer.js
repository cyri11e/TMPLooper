class LoopViewer {
  constructor(x, y, w, h) {
    this.x = x; this.y = y;
    this.w = w; this.h = h;

    this.wave = null;        // échantillons normalisés [-1,1]
    this.playhead = 0;       // 0 → 1
    this.hover = false;
  }

  updateWave(data) {
    this.wave = data;
  }

  setPlayhead(normPos) {
    this.playhead = constrain(normPos, 0, 1);
  }

  isHovered() {
    return (
      mouseX > this.x &&
      mouseX < this.x + this.w &&
      mouseY > this.y &&
      mouseY < this.y + this.h
    );
  }

  draw() {
    this.hover = this.isHovered();

    push();
    translate(this.x, this.y);

    // fond
    noStroke();
    fill(this.hover ? 40 : 25);
    rect(0, 0, this.w, this.h);

    if (!this.wave) {
      fill(150);
      textAlign(CENTER, CENTER);
      text("Clique pour charger un fichier audio", this.w/2, this.h/2);
      pop();
      return;
    }

    // waveform lissée
    stroke(0, 200, 255);
    strokeWeight(2);
    noFill();
    beginShape();
    const n = this.wave.length;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const v = this.wave[i];
      const x = t * this.w;
      const y = map(v, -1, 1, this.h, 0);
      curveVertex(x, y);
    }
    endShape();

    // épaisseur variable (accent centre)
    stroke(0, 200, 255, 80);
    for (let i = 0; i < n; i += 3) {
      const t = i / (n - 1);
      const v = this.wave[i];
      const x = t * this.w;
      const y = map(v, -1, 1, this.h, 0);
      const w = 1 + 2 * abs(v);
      strokeWeight(w);
      point(x, y);
    }

    // curseur de lecture
    const cx = this.playhead * this.w;
    stroke(255, 200, 0);
    strokeWeight(2);
    line(cx, 0, cx, this.h);

    pop();
  }
}
