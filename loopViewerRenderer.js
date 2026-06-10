// ------------------------------------------------------------
// LoopViewerRenderer.js — rendu waveform adaptatif + poignées fixes
// ------------------------------------------------------------

class LoopViewerRenderer {
  constructor(viewer, bpmControls) {
    this.v = viewer;
    this.bpmControls = bpmControls;
  }

  draw() {
    const v = this.v;

    push();
    translate(v.x, v.y);

    // fond
    fill(20);
    noStroke();
    rect(0, 0, v.w, v.h);

    // beats
    this.drawBeats();

    // beats détectés (crans magnétiques visibles)
    if (this.v.analyzer) {
        this.v.analyzer.drawBeatMarkers(this);
    }

    // waveform adaptatif
    this.drawWaveformAdaptive();

    // sélection
    this.drawSelection();

    // poignées réelles
    this.drawHandles();

    // poignées fixes évidées
    this.drawFixedWindowHandles();

    // playhead
    this.drawPlayhead();

    pop();

    // infos
    this.drawSelectionInfo();
  }

  // ------------------------------------------------------------
  // Waveform adaptatif (un seul mode)
  // ------------------------------------------------------------
  drawWaveformAdaptive() {
    const v = this.v;
    const data = v.rawChannelData;
    const total = v.totalSamples;

    if (!data || total <= 0) return;

    const visibleStartNorm = v.offset / (v.w * v.zoom);
    const visibleEndNorm   = (v.offset + v.w) / (v.w * v.zoom);
    const spanNorm = visibleEndNorm - visibleStartNorm;
    if (spanNorm <= 0) return;

    const visibleSamples = spanNorm * total;
    const samplesPerPixel = visibleSamples / v.w;

    noStroke();
    fill(100, 200, 255, 180);
    beginShape();

    // MAX
    for (let px = 0; px < v.w; px++) {
      const norm = (px + v.offset) / (v.w * v.zoom);
      if (norm < 0 || norm > 1) continue;

      const centerIdx = Math.floor(norm * total);
      const halfWindow = Math.max(1, Math.floor(samplesPerPixel * 0.5));
      const startIdx = Math.max(0, centerIdx - halfWindow);
      const endIdx   = Math.min(total, centerIdx + halfWindow);

      let min = 1, max = -1;
      for (let i = startIdx; i < endIdx; i++) {
        const s = data[i];
        if (s < min) min = s;
        if (s > max) max = s;
      }

      const x = px;
      const yMax = map(max, -1, 1, v.h - 2, 2);
      vertex(x, yMax);
    }

    // MIN
    for (let px = v.w - 1; px >= 0; px--) {
      const norm = (px + v.offset) / (v.w * v.zoom);
      if (norm < 0 || norm > 1) continue;

      const centerIdx = Math.floor(norm * total);
      const halfWindow = Math.max(1, Math.floor(samplesPerPixel * 0.5));
      const startIdx = Math.max(0, centerIdx - halfWindow);
      const endIdx   = Math.min(total, centerIdx + halfWindow);

      let min = 1, max = -1;
      for (let i = startIdx; i < endIdx; i++) {
        const s = data[i];
        if (s < min) min = s;
        if (s > max) max = s;
      }

      const x = px;
      const yMin = map(min, -1, 1, v.h - 2, 2);
      vertex(x, yMin);
    }

    endShape(CLOSE);
  }

  // ------------------------------------------------------------
  // Sélection
  // ------------------------------------------------------------
  drawSelection() {
    const v = this.v;
    const leftX = v.loopStart * v.w * v.zoom - v.offset;
    const rightX = v.loopEnd * v.w * v.zoom - v.offset;

    noStroke();
    fill(255, 200, 0, 40);
    rect(leftX, 0, rightX - leftX, v.h);
  }

  // ------------------------------------------------------------
  // Poignées réelles (loopStart / loopEnd)
  // ------------------------------------------------------------
  drawHandles() {
    const v = this.v;
    const leftX = v.loopStart * v.w * v.zoom - v.offset;
    const rightX = v.loopEnd * v.w * v.zoom - v.offset;

    stroke(255, 200, 0);
    strokeWeight(3);
    line(leftX, 0, leftX, v.h);
    line(rightX, 0, rightX, v.h);

    noStroke();
    fill(255, 200, 0);
    rect(leftX - 6, v.h/2 - 12, 12, 24, 3);
    rect(rightX - 6, v.h/2 - 12, 12, 24, 3);
  }

  // ------------------------------------------------------------
  // Poignées fixes évidées (snap)
  // ------------------------------------------------------------
  drawFixedWindowHandles() {
    const v = this.v;

    const snapW = 12;
    const snapH = 24;
    const snapY = v.h/2 - snapH/2;

    stroke(255, 200, 0);
    strokeWeight(2);
    noFill();

    // gauche
    rect(2, snapY, snapW, snapH, 3);

    // droite
    rect(v.w - snapW - 2, snapY, snapW, snapH, 3);
  }

  // ------------------------------------------------------------
  // Playhead
  // ------------------------------------------------------------
  drawPlayhead() {
    const v = this.v;
    const span = v.loopEnd - v.loopStart;
    const pxNorm = v.loopStart + v.playhead * span;
    const x = pxNorm * v.w * v.zoom - v.offset;

    stroke(0, 255, 0);
    strokeWeight(2);
    line(x, 0, x, v.h);
  }

  // ------------------------------------------------------------
  // Beats
  // ------------------------------------------------------------
  drawBeats() {
    const v = this.v;
    if (!v.rawBuffer) return;

    const beats = this.bpmControls.beatsPerMeasure;
    if (beats <= 0) return;

    const totalDur = v.rawBuffer.duration;
    const selStart = v.loopStart * totalDur;
    const selEnd   = v.loopEnd   * totalDur;
    const selDur   = selEnd - selStart;
    if (selDur <= 0) return;

    const beatDur = selDur / beats;

    stroke(255, 180, 0, 120);
    strokeWeight(1);

    for (let i = 1; i < beats; i++) {
      const t = selStart + i * beatDur;
      const norm = t / totalDur;
      const x = norm * v.w * v.zoom - v.offset;

      if (x >= 0 && x <= v.w) {
        line(x, 0, x, v.h);
      }
    }
  }

  // ------------------------------------------------------------
  // Infos dynamiques
  // ------------------------------------------------------------
  drawSelectionInfo() {
    const v = this.v;
    if (!v.rawBuffer) return;

    const totalDur = v.rawBuffer.duration;
    const selDur = (v.loopEnd - v.loopStart) * totalDur;
    if (selDur <= 0) return;

    const mm = floor(selDur / 60);
    const ss = floor(selDur % 60);
    const ms = floor((selDur % 1) * 1000);

    const bpm = 60 * this.bpmControls.beatsPerMeasure / selDur;

    const sr = v.rawBuffer.sampleRate;
    const samples = v.totalSamples;

    const txt =
      `Sélection: ${mm}:${nf(ss, 2)}.${nf(ms, 3)}   ` +
      `BPM auto: ${bpm.toFixed(2)}   ` +
      `Sample: ${totalDur.toFixed(3)}s / ${samples} samples / ${sr} Hz`;

    push();
    fill(200);
    textSize(12);
    textAlign(LEFT, TOP);
    text(txt, v.x, v.y + v.h + 6);
    pop();
  }
}
