// ------------------------------------------------------------
// LoopViewer.js — classe principale (coordination)
// ------------------------------------------------------------

class LoopViewer {
  constructor(x, y, w, h, bpmControls) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;

    // état de vue
    this.zoom = 1;
    this.offset = 0;

    // loop en fraction [0..1]
    this.loopStart = 0;
    this.loopEnd = 1;

    // playhead normalisé [0..1] dans la sélection
    this.playhead = 0;

    this.active = true;

    // audio
    this.rawBuffer = null;
    this.rawChannelData = null;
    this.totalSamples = 0;

    // pyramide de peaks
    this.peaksPyramid = [];

    // sous-modules
    this.math = new LoopViewerMusicMath(this);
    this.renderer = new LoopViewerRenderer(this, bpmControls);
    this.interaction = new LoopViewerInteraction(this);

    // double‑clic pour ouvrir fichier
    this._lastClickTime = 0;
  }

  // ------------------------------------------------------------
  // état
  // ------------------------------------------------------------
  setActive(v) {
    this.active = !!v;
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
    if (now - this._lastClickTime < 250) {
      callbackOpenFile();
    }
    this._lastClickTime = now;
  }

  // ------------------------------------------------------------
  // audio
  // ------------------------------------------------------------
  setAudioBuffer(buffer) {
    if (!buffer) return;

    this.rawBuffer = buffer;
    this.rawChannelData = buffer.getChannelData(0);
    this.totalSamples = this.rawChannelData.length;

    this.math.buildPeaksPyramid();

    // recalcul BPM auto sur la sélection courante
    this.updateAutoBpm();
  }

  // ------------------------------------------------------------
  // BPM auto (public, utilisé par BpmMeasureControls + interaction)
  // ------------------------------------------------------------
  updateAutoBpm() {
    if (!this.rawBuffer) return;

    const selDur = (this.loopEnd - this.loopStart) * this.rawBuffer.duration;
    if (selDur <= 0) return;

    const beats = this.renderer.bpmControls.beatsPerMeasure;
    if (!beats || beats <= 0) return;

    const bpmAuto = 60 * beats / selDur;
    this.renderer.bpmControls.bpm = Number(bpmAuto.toFixed(2));
  }

  // ------------------------------------------------------------
  // draw
  // ------------------------------------------------------------
  draw() {
    this.renderer.draw();
  }

  // ------------------------------------------------------------
  // interactions
  // ------------------------------------------------------------
  mousePressed() {
    if (!this.active) return;
    this.interaction.mousePressed();
  }

  mouseDragged() {
    if (!this.active) return;
    this.interaction.mouseDragged();
  }

  mouseReleased() {
    if (!this.active) return;
    this.interaction.mouseReleased();
  }

  onWheel(delta) {
    if (!this.active) return;
    this.interaction.onWheel(delta);
  }

  // ------------------------------------------------------------
  // playhead externe (AudioEngine)
  // ------------------------------------------------------------
  setPlayhead(normPos) {
    this.playhead = constrain(normPos, 0, 1);
  }
}
