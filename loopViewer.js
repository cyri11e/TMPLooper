// ------------------------------------------------------------
// loopViewer.js — VERSION PRO (zoom centré corrigé, rendu robuste)
// Waveform + zoom + playhead + loop handles + sélection par drag
// ------------------------------------------------------------

class LoopViewer {
  constructor(x, y, w, h) {
    this.x = x; this.y = y; this.w = w; this.h = h;

    // raw audio buffer
    this.rawBuffer = null;
    this.rawChannelData = null;
    this.totalSamples = 0;

    // pyramide de peaks : array de niveaux, chaque niveau = {blocks, peaks, blockSize}
    this.peaksPyramid = [];

    // fallback coarse wave (simple array of floats) for compatibility
    this.wave = [];

    // affichage / interaction
    this.playhead = 0;
    this.zoom = 1;
    this.offset = 0; // pixels
    this.loopStart = 0.0;
    this.loopEnd = 1.0;

    // dragging states
    this.draggingLeft = false;
    this.draggingRight = false;
    this.draggingSelection = false;
    this.dragging = false;
    this.lastMouseX = 0;

    // selection by drag
    this.isSelecting = false;
    this.selStartX = 0;
    this.selEndX = 0;

    // double click
    this.lastClickTime = 0;

    // active flag
    this.active = true;

    // config
    this.minLoopLen = 0.001;
    this.selectionMinPixels = 6;
    this.overviewBaseBlocks = 2048;
    this.overviewLevels = 6;
    this.maxSamplesPerFrame = 6000;
    this.targetPointsPerPixel = 1.0;
  }

  setActive(v) { this.active = !!v; }
  setMinLoopLength(v) { this.minLoopLen = max(0.0001, v); }

  // ------------------------------------------------------------
  // Fournit le AudioBuffer complet et construit la pyramide de peaks
  // ------------------------------------------------------------
  setAudioBuffer(audioBuffer) {
    if (!audioBuffer) return;
    this.rawBuffer = audioBuffer;
    this.rawChannelData = audioBuffer.getChannelData(0);
    this.totalSamples = this.rawChannelData.length;
    this._buildPeaksPyramid();
    // also build a coarse fallback wave for compatibility
    this._buildFallbackWave(400);
  }

  _buildFallbackWave(samples = 400) {
    if (!this.rawChannelData) { this.wave = []; return; }
    const raw = this.rawChannelData;
    const block = Math.max(1, Math.floor(raw.length / samples));
    const w = [];
    for (let i = 0; i < samples; i++) {
      w.push(raw[Math.min(raw.length - 1, i * block)]);
    }
    this.wave = w;
  }

  // ------------------------------------------------------------
  // Construire la pyramide de peaks (min/max) — coût unique
  // ------------------------------------------------------------
  _buildPeaksPyramid() {
    this.peaksPyramid = [];
    const baseBlocks = this.overviewBaseBlocks;
    const raw = this.rawChannelData;
    const total = this.totalSamples;
    let blocks = baseBlocks;

    for (let level = 0; level < this.overviewLevels; level++) {
      const blockSize = Math.max(1, Math.floor(total / blocks));
      const peaks = new Array(blocks);
      for (let b = 0; b < blocks; b++) {
        const start = b * blockSize;
        const end = Math.min(total, start + blockSize);
        let min = 1.0, max = -1.0;
        for (let i = start; i < end; i++) {
          const v = raw[i];
          if (v < min) min = v;
          if (v > max) max = v;
        }
        peaks[b] = { min, max };
      }
      this.peaksPyramid.push({ blocks, peaks, blockSize });
      blocks = Math.max(1, Math.floor(blocks / 2));
    }
  }

  // ------------------------------------------------------------
  // Interaction souris / zoom (zoom centré sur curseur corrigé)
  // ------------------------------------------------------------
  isHovered() {
    if (!this.active) return false;
    return mouseX > this.x && mouseX < this.x + this.w &&
           mouseY > this.y && mouseY < this.y + this.h;
  }

  onClick(callbackOpenFile) {
    const now = millis();
    if (now - this.lastClickTime < 250) callbackOpenFile();
    this.lastClickTime = now;
  }

  onWheel(delta) {
    if (!this.active) return;
    // localX en pixels dans la vue
    const localX = mouseX - this.x;
    // position temporelle (normée 0..1) sous le curseur avant zoom
    const timeBefore = (localX + this.offset) / (this.w * this.zoom);

    // appliquer zoom (facteur)
    const zoomSpeed = 0.0012;
    this.zoom *= (1 - delta * zoomSpeed);
    this.zoom = constrain(this.zoom, 0.2, 200);

    // recalculer offset pour que le même timeBefore reste sous le curseur
    // offset = timeBefore * w * zoom - localX
    this.offset = timeBefore * this.w * this.zoom - localX;

    // clamp offset
    const maxOffset = Math.max(0, this.w * this.zoom - this.w);
    this.offset = constrain(this.offset, 0, maxOffset);
  }

  setPlayhead(normPos) { this.playhead = constrain(normPos, 0, 1); }

  // ------------------------------------------------------------
  // Mouse pressed: selection drag or handle drag
  // ------------------------------------------------------------
  mousePressed() {
    if (!this.active) return;
    if (!this.isHovered()) return;

    const localX = mouseX - this.x;
    this.lastMouseX = localX;

    const leftX = this.loopStart * this.w * this.zoom - this.offset;
    const rightX = this.loopEnd * this.w * this.zoom - this.offset;
    const HITBOX = 12;

    if (abs(localX - leftX) < HITBOX) {
      this.draggingLeft = true; this.dragging = true; return;
    }
    if (abs(localX - rightX) < HITBOX) {
      this.draggingRight = true; this.dragging = true; return;
    }

    const selLeft = min(leftX, rightX);
    const selRight = max(leftX, rightX);
    if (localX > selLeft && localX < selRight) {
      this.draggingSelection = true; this.dragging = true;
      this.dragSelectionOffset = localX;
      this.selStartAtDrag = this.loopStart;
      this.selEndAtDrag = this.loopEnd;
      return;
    }

    // start new selection
    this.isSelecting = true;
    this.selStartX = localX;
    this.selEndX = localX;
    this.dragging = true;
  }

  // ------------------------------------------------------------
  // Mouse dragged: update selection or handles
  // ------------------------------------------------------------
  mouseDragged() {
    if (!this.active) return;
    if (!this.dragging) return;

    const localX = mouseX - this.x;
    const dx = localX - this.lastMouseX;
    this.lastMouseX = localX;

    if (this.draggingLeft) {
      const t = (localX + this.offset) / (this.w * this.zoom);
      const norm = constrain(t, 0, 1);
      this.loopStart = min(norm, this.loopEnd - this.minLoopLen);
      return;
    }

    if (this.draggingRight) {
      const t = (localX + this.offset) / (this.w * this.zoom);
      const norm = constrain(t, 0, 1);
      this.loopEnd = max(norm, this.loopStart + this.minLoopLen);
      return;
    }

    if (this.draggingSelection) {
      const deltaNorm = (dx) / (this.w * this.zoom);
      let newStart = this.selStartAtDrag + deltaNorm;
      let newEnd = this.selEndAtDrag + deltaNorm;
      const span = newEnd - newStart;
      if (newStart < 0) { newStart = 0; newEnd = span; }
      if (newEnd > 1) { newEnd = 1; newStart = 1 - span; }
      this.loopStart = constrain(newStart, 0, 1);
      this.loopEnd = constrain(newEnd, 0, 1);
      return;
    }

    if (this.isSelecting) {
      this.selEndX = localX;
      if (abs(this.selEndX - this.selStartX) >= this.selectionMinPixels) {
        const s = min(this.selStartX, this.selEndX);
        const e = max(this.selStartX, this.selEndX);
        const sNorm = (s + this.offset) / (this.w * this.zoom);
        const eNorm = (e + this.offset) / (this.w * this.zoom);
        let a = constrain(sNorm, 0, 1);
        let b = constrain(eNorm, 0, 1);
        if (b - a < this.minLoopLen) {
          const mid = (a + b) / 2;
          a = max(0, mid - this.minLoopLen / 2);
          b = min(1, mid + this.minLoopLen / 2);
        }
        this.loopStart = a; this.loopEnd = b;
      }
      return;
    }
  }

  // ------------------------------------------------------------
  // Mouse released: finalize selection
  // ------------------------------------------------------------
  mouseReleased() {
    if (!this.active) return;
    if (this.isSelecting) {
      if (abs(this.selEndX - this.selStartX) < this.selectionMinPixels) {
        // tiny drag: ignore (keep previous loop)
      }
    }
    this.isSelecting = false;
    this.draggingLeft = false;
    this.draggingRight = false;
    this.draggingSelection = false;
    this.dragging = false;
  }

  // ------------------------------------------------------------
  // Choisit un niveau de la pyramide adapté au zoom/viewport
  // ------------------------------------------------------------
  _choosePyramidLevel() {
    if (!this.peaksPyramid || this.peaksPyramid.length === 0) return -1;
    const visibleStart = (this.offset) / (this.w * this.zoom);
    const visibleEnd = (this.offset + this.w) / (this.w * this.zoom);
    const visibleSpan = visibleEnd - visibleStart;
    const desiredPoints = this.w * this.targetPointsPerPixel;
    for (let i = 0; i < this.peaksPyramid.length; i++) {
      const lvl = this.peaksPyramid[i];
      const blocksVisible = Math.max(1, Math.floor(lvl.blocks * visibleSpan));
      if (blocksVisible <= desiredPoints * 2) return i;
    }
    return this.peaksPyramid.length - 1;
  }

  // ------------------------------------------------------------
  // Rendu adaptatif : pyramide ou échantillons bruts plafonnés
  // ------------------------------------------------------------
  draw() {
    push();
    translate(this.x, this.y);

    // background
    fill(20); noStroke(); rect(0, 0, this.w, this.h);

    // border + ACTIVE label
    if (this.active) {
      stroke(255,200,0); strokeWeight(2); noFill(); rect(-2,-2,this.w+4,this.h+4,6);
      noStroke(); fill(255,200,0); textSize(12); textAlign(LEFT,TOP); text("ACTIVE",6,6);
    } else {
      stroke(60); strokeWeight(1); noFill(); rect(-2,-2,this.w+4,this.h+4,6);
    }

    // no data fallback
    if ((!this.peaksPyramid || this.peaksPyramid.length === 0) && (!this.wave || this.wave.length === 0)) {
      fill(150); textAlign(CENTER,CENTER); text("Double‑clic pour charger un fichier audio", this.w/2, this.h/2);
      if (!this.active) { fill(0,150); rect(0,0,this.w,this.h); }
      pop(); return;
    }

    // compute visible normalized range
    const visibleStartNorm = (this.offset) / (this.w * this.zoom);
    const visibleEndNorm = (this.offset + this.w) / (this.w * this.zoom);
    const visibleSpanNorm = visibleEndNorm - visibleStartNorm;

    // choose pyramid level
    const level = this._choosePyramidLevel();

    if (level >= 0 && this.peaksPyramid.length > 0 && this.zoom <= 8) {
      // draw using pyramid level (fast)
      const lvl = this.peaksPyramid[level];
      const peaks = lvl.peaks;
      const blocks = lvl.blocks;
      const step = this.w / blocks;
      noStroke(); fill(100,200,255,180);
      beginShape();
      for (let i = 0; i < blocks; i++) {
        const x = i * step * this.zoom - this.offset;
        const y = map(peaks[i].max, -1, 1, this.h - 2, 2);
        vertex(x, y);
      }
      for (let i = blocks - 1; i >= 0; i--) {
        const x = i * step * this.zoom - this.offset;
        const y = map(peaks[i].min, -1, 1, this.h - 2, 2);
        vertex(x, y);
      }
      endShape(CLOSE);
    } else if (this.rawChannelData) {
      // zoomed in: render raw samples but cap total processed samples
      const raw = this.rawChannelData;
      const total = this.totalSamples;
      const startSample = Math.max(0, Math.floor(visibleStartNorm * total));
      const endSample = Math.min(total - 1, Math.ceil(visibleEndNorm * total));
      const visibleSamples = Math.max(1, endSample - startSample + 1);

      const desiredPoints = Math.max(10, Math.floor(this.w * this.targetPointsPerPixel));
      let samplesPerPoint = Math.max(1, Math.floor(visibleSamples / desiredPoints));

      if (visibleSamples > this.maxSamplesPerFrame) {
        samplesPerPoint = Math.ceil(visibleSamples / this.maxSamplesPerFrame);
      }

      stroke(100,200,255); noFill(); beginShape();
      for (let s = startSample; s <= endSample; s += samplesPerPoint) {
        let min = 1.0, max = -1.0;
        const blockEnd = Math.min(endSample, s + samplesPerPoint - 1);
        for (let k = s; k <= blockEnd; k++) {
          const v = raw[k];
          if (v < min) min = v;
          if (v > max) max = v;
        }
        const mid = (min + max) / 2;
        const t = s / total;
        const x = (t * this.w * this.zoom) - this.offset;
        const y = map(mid, -1, 1, this.h - 2, 2);
        vertex(x, y);
      }
      endShape();
    } else {
      // fallback draw from this.wave
      stroke(100,200,255); noFill(); beginShape();
      const step = this.w / this.wave.length;
      for (let i = 0; i < this.wave.length; i++) {
        const x = i * step * this.zoom - this.offset;
        if (x < -2 || x > this.w + 2) continue;
        const y = map(this.wave[i], -1, 1, this.h - 2, 2);
        vertex(x, y);
      }
      endShape();
    }

    // draw selection area (loop)
    const leftX = this.loopStart * this.w * this.zoom - this.offset;
    const rightX = this.loopEnd * this.w * this.zoom - this.offset;
    const selLeft = min(leftX, rightX);
    const selRight = max(leftX, rightX);

    noStroke(); fill(255,200,0,40); rect(selLeft, 0, selRight - selLeft, this.h);

    // handles
    stroke(255,200,0); strokeWeight(3);
    line(leftX, 0, leftX, this.h);
    line(rightX, 0, rightX, this.h);
    noStroke(); fill(255,200,0);
    rect(leftX - 6, this.h/2 - 12, 12, 24, 3);
    rect(rightX - 6, this.h/2 - 12, 12, 24, 3);

    // playhead
    const loopSpan = this.loopEnd - this.loopStart;
    const pxNorm = this.loopStart + this.playhead * loopSpan;
    const px = pxNorm * this.w * this.zoom - this.offset;
    stroke(0,255,0); strokeWeight(2); line(px, 0, px, this.h);

    // dim overlay if inactive
    if (!this.active) { fill(0,150); noStroke(); rect(0,0,this.w,this.h); }

    // rubberband when selecting
    if (this.isSelecting) {
      stroke(255); strokeWeight(1);
      line(this.selStartX, 0, this.selStartX, this.h);
      line(this.selEndX, 0, this.selEndX, this.h);
    }

    pop();
  }
}
