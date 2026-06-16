// ------------------------------------------------------------
// MidiViewerRenderer.js — rubans + sélection + poignées + playhead + infos
// ------------------------------------------------------------

class MidiViewerRenderer {
  constructor(viewer) {
    this.v = viewer;
  }

  draw() {
    const v = this.v;

    push();
    translate(v.x, v.y);

    // fond
    fill(20);
    noStroke();
    rect(0, 0, v.w, v.h);

    // bordure active
    if (v.active) {
      stroke(255, 200, 0);
      strokeWeight(2);
      noFill();
      rect(-2, -2, v.w + 4, v.h + 4, 6);
    }

    if (v.channels.length === 0) {
      fill(150);
      textAlign(CENTER, CENTER);
      noStroke();
      text("Double‑clic pour charger un fichier MIDI", v.w / 2, v.h / 2);
      pop();
      this.drawInfo();
      return;
    }

    const rowH = v.h / v.channels.length;

    const colors = [
      color(255, 80, 80), color(80, 255, 80), color(80, 80, 255),
      color(255, 200, 80), color(255, 80, 200), color(80, 255, 200),
      color(200, 80, 255), color(200, 200, 80), color(80, 200, 200),
      color(200, 80, 80), color(80, 80, 200), color(200, 200, 200),
      color(150, 150, 255), color(255, 150, 150), color(150, 255, 150),
      color(255, 255, 150)
    ];

    // ------------------------------------------------------------
    // RUBANS D’ÉVÉNEMENTS PAR PISTE
    // ------------------------------------------------------------
    for (let i = 0; i < v.channels.length; i++) {
      const ch = v.channels[i];
      const y = i * rowH;

      fill(35);
      noStroke();
      rect(0, y, v.w, rowH);

      stroke(colors[ch % colors.length]);
      strokeWeight(3);

      for (let e of v.events) {
        if (e.channel !== ch) continue;

        const tNorm = v.duration > 0 ? e.time / v.duration : 0;
        const x = tNorm * v.w * v.zoom - v.offset;

        if (x < -10 || x > v.w + 10) continue;

        line(x, y + 5, x, y + rowH - 5);
      }

      const label = v.instrumentNames[ch] || ("CH " + ch);
      fill(200);
      noStroke();
      textSize(12);
      textAlign(LEFT, TOP);
      text(label, 5, y + 5);
    }

    // clamp offset
    const maxOffset = v.w * v.zoom - v.w;
    v.offset = constrain(v.offset, 0, maxOffset);

    const leftX  = v.loopStart * v.w * v.zoom - v.offset;
    const rightX = v.loopEnd   * v.w * v.zoom - v.offset;

    // ------------------------------------------------------------
    // SÉLECTION
    // ------------------------------------------------------------
    noStroke();
    fill(255, 200, 0, 40);
    rect(leftX, 0, rightX - leftX, v.h);

    // ------------------------------------------------------------
    // POIGNÉES RÉELLES
    // ------------------------------------------------------------
    stroke(255, 200, 0);
    strokeWeight(3);
    line(leftX, 0, leftX, v.h);
    line(rightX, 0, rightX, v.h);

    noStroke();
    fill(255, 200, 0);
    const snapW = 12;
    const snapH = 24;
    const snapY = v.h / 2 - snapH / 2;
    rect(leftX - snapW / 2,  snapY, snapW, snapH, 3);
    rect(rightX - snapW / 2, snapY, snapW, snapH, 3);

    // ------------------------------------------------------------
    // PLAYHEAD
    // ------------------------------------------------------------
    const span = v.loopEnd - v.loopStart || 1;
    const pxNorm = v.loopStart + v.playhead * span;
    const xPlay = pxNorm * v.w * v.zoom - v.offset;

    stroke(0, 255, 0);
    strokeWeight(2);
    line(xPlay, 0, xPlay, v.h);

    pop();

    // ------------------------------------------------------------
    // INFOS SOUS LE VIEWER
    // ------------------------------------------------------------
    this.drawInfo();
  }

  // ------------------------------------------------------------
  // INFOS : nom du fichier + durée totale + durée sélection
  // ------------------------------------------------------------
drawInfo() {
    const v = this.v;
    if (!v.filename) return;

    const total = v.duration;
    const selDur = (v.loopEnd - v.loopStart) * total;

    const mmT = floor(total / 60);
    const ssT = floor(total % 60);

    const mmS = floor(selDur / 60);
    const ssS = floor(selDur % 60);

    // BPM auto (si mesures connues)
    let bpmTxt = "--";
    const bpm = v.getAutoBpm(1, 4); // 1 mesure, 4 temps
    if (bpm) bpmTxt = bpm.toFixed(2);

    const txt =
      `${v.filename}   |   Total: ${mmT}:${nf(ssT,2)}   |   Sélection: ${mmS}:${nf(ssS,2)}   |   BPM auto: ${bpmTxt}`;
console.log(txt)
    push();
    fill(200);
    textSize(12);
    textAlign(LEFT, TOP);
    text(txt, v.x, v.y + v.h + 6);
    pop();
}

}
