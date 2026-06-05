// ------------------------------------------------------------
// midiViewer.js — VERSION PRO + assombrissement
// ------------------------------------------------------------

class MidiViewer {
  constructor(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;

    this.events = [];
    this.channels = [];
    this.instrumentNames = {};

    this.duration = 1;
    this.playhead = 0;

    this.zoom = 1;
    this.offset = 0;

    this.lastClickTime = 0;
    this.bpm = 120;
  }

  isHovered() {
    return (
      mouseX > this.x &&
      mouseX < this.x + this.w &&
      mouseY > this.y &&
      mouseY < this.y + this.h
    );
  }

  onClick(callbackOpenFile) {
    const now = millis();
    if (now - this.lastClickTime < 250) {
      callbackOpenFile();
    }
    this.lastClickTime = now;
  }

  setEvents(events, duration, instrumentNames = {}) {
    this.events = events;
    this.duration = duration;
    this.instrumentNames = instrumentNames;

    const map = new Map();

    for (let e of events) {
      if (!map.has(e.channel)) map.set(e.channel, 0);
      map.set(e.channel, map.get(e.channel) + 1);
    }

    this.channels = Array.from(map.keys()).sort();
  }

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

  setPlayhead(normPos) {
    this.playhead = constrain(normPos, 0, 1);
  }

  draw() {
    push();
    translate(this.x, this.y);

    fill(25);
    noStroke();
    rect(0, 0, this.w, this.h);

    if (this.channels.length === 0) {
      fill(150);
      textAlign(CENTER, CENTER);
      text("Double‑clic pour charger un fichier MIDI", this.w/2, this.h/2);
      pop();
      return;
    }

    const rowH = this.h / this.channels.length;

    const colors = [
      color(255, 80, 80),
      color(80, 255, 80),
      color(80, 80, 255),
      color(255, 200, 80),
      color(255, 80, 200),
      color(80, 255, 200),
      color(200, 80, 255),
      color(200, 200, 80),
      color(80, 200, 200),
      color(200, 80, 80),
      color(80, 80, 200),
      color(200, 200, 200),
      color(150, 150, 255),
      color(255, 150, 150),
      color(150, 255, 150),
      color(255, 255, 150)
    ];

    for (let i = 0; i < this.channels.length; i++) {
      const ch = this.channels[i];
      const y = i * rowH;

      fill(35);
      noStroke();
      rect(0, y, this.w, rowH);

      stroke(colors[ch]);
      strokeWeight(3);

      for (let e of this.events) {
        if (e.channel !== ch) continue;

        const t = e.time / this.duration;
        const x = t * this.w * this.zoom - this.offset;

        if (x < -10 || x > this.w + 10) continue;

        line(x, y + 5, x, y + rowH - 5);
      }

      const label = this.instrumentNames[ch] || ("CH " + ch);

      fill(200);
      noStroke();
      textSize(12);
      textAlign(LEFT, TOP);
      text(label, 5, y + 5);
    }

    const cx = this.playhead * this.w * this.zoom - this.offset;
    stroke(255, 200, 0);
    strokeWeight(2);
    line(cx, 0, cx, this.h);

    pop();
  }
}
