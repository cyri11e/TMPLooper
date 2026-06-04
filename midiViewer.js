class MidiViewer {
  constructor(x, y, w, h) {
    this.x = x; this.y = y;
    this.w = w; this.h = h;

    this.events = [];       // {time, channel}
    this.channels = [];     // liste des canaux utilisés
    this.duration = 1;      // durée totale en secondes
    this.playhead = 0;      // 0 → 1
  }

  setEvents(events, duration) {
    this.events = events;
    this.duration = duration;

    // extraire les canaux non vides
    const set = new Set();
    for (let e of events) set.add(e.channel);
    this.channels = Array.from(set).sort();
  }

  setPlayhead(normPos) {
    this.playhead = constrain(normPos, 0, 1);
  }

  draw() {
    push();
    translate(this.x, this.y);

    // fond
    fill(25);
    noStroke();
    rect(0, 0, this.w, this.h);

    if (this.channels.length === 0) {
      fill(150);
      textAlign(CENTER, CENTER);
      text("Clique pour charger un fichier MIDI", this.w/2, this.h/2);
      pop();
      return;
    }

    const rowH = this.h / this.channels.length;

    // couleurs par canal
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

    // dessiner les lignes
    for (let i = 0; i < this.channels.length; i++) {
      const ch = this.channels[i];
      const y = i * rowH;

      // fond de ligne
      fill(35);
      noStroke();
      rect(0, y, this.w, rowH);

      // événements du canal
      stroke(colors[ch]);
      strokeWeight(3);

      for (let e of this.events) {
        if (e.channel !== ch) continue;

        const t = e.time / this.duration;
        const x = t * this.w;

        line(x, y + 5, x, y + rowH - 5);
      }

      // label canal
      fill(200);
      noStroke();
      textSize(12);
      textAlign(LEFT, TOP);
      text("CH " + ch, 5, y + 5);
    }

    // curseur de lecture
    const cx = this.playhead * this.w;
    stroke(255, 200, 0);
    strokeWeight(2);
    line(cx, 0, cx, this.h);

    pop();
  }
  isHovered() {
  return (
    mouseX > this.x &&
    mouseX < this.x + this.w &&
    mouseY > this.y &&
    mouseY < this.y + this.h
  );
}

}
