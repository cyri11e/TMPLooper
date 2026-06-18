// ------------------------------------------------------------
// RecManager.js — version nettoyée (sans MIDI Viewer)
// ------------------------------------------------------------

class RecManager {
  constructor(app) {
    this.app = app;

    this.isCountdown = false;
    this.countdownStart = 0;
    this.beatIntervalMs = 0;
    this.beats = 4;

    this.isRecording = false;
    this.recordStartTime = 0;
    this.recordEndTime = 0;

    this.scheduledClicks = [];

    this.fantomMode = false;
  }

  startRecSequence() {
    const audio = this.app.audio;
    const ui    = this.app.ui;

    let loopDuration = 0;

    // MODE AUDIO NORMAL
    if (ui.loopViewer.active && audio.buffer) {
      loopDuration =
        (ui.loopViewer.loopEnd - ui.loopViewer.loopStart) *
        audio.buffer.duration;
    }

    // MODE FANTOM : pas d'audio chargé
    this.fantomMode = !audio.buffer;

    if (this.fantomMode) {
      const bpm = this.app.midi.clockBpm || ui.bpmControls.bpm;
      const measures = ui.bpmControls.measures;
      loopDuration = (60 / bpm) * measures * 4;
    }

    if (loopDuration <= 0.01) return;

    // Intervalle du countdown
    if (this.fantomMode) {
      const bpm = this.app.midi.clockBpm || ui.bpmControls.bpm;
      this.beatIntervalMs = 60000 / bpm;
    } else {
      this.beatIntervalMs = (loopDuration / this.beats) * 1000;
    }

    this.countdownStart = millis();
    this.isCountdown = true;
    this.isRecording = false;

    this._scheduleClicks();
  }

  _scheduleClicks() {
    const audio = this.app.audio;
    audio._ensureCtx();

    const now = audio.ctx.currentTime;
    const intervalSec = this.beatIntervalMs / 1000;

    this.scheduledClicks = [];

    for (let i = 0; i < this.beats; i++) {
      const when = now + i * intervalSec;
      this._playClickAt(when, i === 0);
    }
  }

  _playClickAt(when, isDownbeat = false) {
    const audio = this.app.audio;
    audio._ensureCtx();

    const osc = audio.ctx.createOscillator();
    const g   = audio.ctx.createGain();

    osc.frequency.value = isDownbeat ? 1200 : 900;
    osc.type = "sine";

    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(0.8, when + 0.001);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.08);

    osc.connect(g);
    g.connect(audio.ctx.destination);

    osc.start(when);
    osc.stop(when + 0.09);

    this.scheduledClicks.push({ when, osc, g });
  }

  _startRecording() {
    const audio = this.app.audio;
    const ui    = this.app.ui;

    audio._ensureCtx();

    // TMP REC
    this.app.midi.looperRecord();
    this.app.tmp.setState("REC");

    // Fantom START
    if (this.fantomMode) {
      this.app.midi.sendStart();
    }

    this.isRecording = true;
    this.recordStartTime = audio.ctx.currentTime;

    let loopDuration = 0;

    if (this.fantomMode) {
      const bpm = this.app.midi.clockBpm || ui.bpmControls.bpm;
      const measures = ui.bpmControls.measures;
      loopDuration = (60 / bpm) * measures * 4;
    }
    else if (ui.loopViewer.active && audio.buffer) {
      const measures = ui.bpmControls.measures;

      const loopBase = 
        (ui.loopViewer.loopEnd - ui.loopViewer.loopStart) *
        audio.buffer.duration;

      loopDuration = loopBase * measures;

      const bpmAuto = 60 * measures * 4 / loopDuration;
      ui.bpmControls.bpm = bpmAuto;
    }

    this.recordEndTime = this.recordStartTime + loopDuration;

    if (!this.fantomMode && audio.buffer) {
      audio.playLoop();
    }

    this.scheduledClicks = [];
  }

  drawCountdown() {
    if (!this.isCountdown && !this.isRecording) return;

    push();
    fill(0, 220);
    rect(0, 0, width, height);

    if (this.isCountdown) {
      const elapsed = millis() - this.countdownStart;
      const beatIndex = floor(elapsed / this.beatIntervalMs);
      const displayBeat = constrain(beatIndex, 0, this.beats - 1);

      fill(255);
      textAlign(CENTER, CENTER);
      textSize(min(width, height) * 0.28);
      text(String(displayBeat + 1), width / 2, height / 2);

      textSize(18);
      textAlign(CENTER, BOTTOM);
      const bpmApprox = 60 / (this.beatIntervalMs / 1000);
      text(`BPM ≈ ${nf(bpmApprox, 0, 1)}`, width / 2, height - 40);

      if (elapsed >= this.beatIntervalMs * this.beats) {
        this.isCountdown = false;
        this._startRecording();
      }
    }

    if (this.isRecording) {
      const audio = this.app.audio;
      if (audio.ctx) {
        const now = audio.ctx.currentTime;
        const total = this.recordEndTime - this.recordStartTime;
        const progress = total > 0 ? constrain((now - this.recordStartTime) / total, 0, 1) : 0;

        const measures = this.app.ui.bpmControls.measures || 1;
        const barWidth = width * 0.8;
        const barHeight = 20;
        const barX = width * 0.1;
        const barY = height * 0.8;

        stroke(255);
        noFill();
        rect(barX, barY, barWidth, barHeight);

        const segmentWidth = barWidth / measures;
        for (let i = 0; i < measures; i++) {
          const segX = barX + i * segmentWidth;
          stroke(150);
          line(segX, barY, segX, barY + barHeight);
        }

        const filledWidth = barWidth * progress;
        noStroke();
        fill(0, 200, 0);
        rect(barX, barY, filledWidth, barHeight);
      }
    }

    pop();

    this._checkAutoStop();
  }

  _checkAutoStop() {
    if (!this.isRecording) return;

    const audio = this.app.audio;
    if (!audio.ctx) return;

    if (audio.ctx.currentTime >= this.recordEndTime) {

      this.app.midi.looperPlayStop();
      this.app.tmp.setState("PLAY");

      this.isRecording = false;

      // Réactive uniquement le LoopViewer audio
      this.app.ui.loopViewer.setActive(true);

      if (!this.fantomMode && audio.buffer) {
        audio.playLoop();
      }

      // LOG durées réelle + théorique
      const realDur = this.recordEndTime - this.recordStartTime;

      let theoDur = realDur;
      const ui = this.app.ui;
      const audioBuf = audio.buffer;

      if (this.fantomMode) {
        const bpm = this.app.midi.clockBpm || ui.bpmControls.bpm;
        const measures = ui.bpmControls.measures;
        theoDur = (60 / bpm) * measures * 4;
      } else if (ui.loopViewer.active && audioBuf) {
        const measures = ui.bpmControls.measures;
        const loopBase =
          (ui.loopViewer.loopEnd - ui.loopViewer.loopStart) *
          audioBuf.duration;
        theoDur = loopBase * measures;
      }

      const fmt = (sec) => {
        const mm = Math.floor(sec / 60);
        const ss = Math.floor(sec % 60);
        const ms = Math.floor((sec % 1) * 1000);
        return `${mm}:${ss.toString().padStart(2,"0")}.${ms.toString().padStart(3,"0")}`;
      };

      console.log("--------------------------------------------------");
      console.log("REC duration (real):", fmt(realDur));
      console.log("REC duration (theoretical):", fmt(theoDur));
      console.log("--------------------------------------------------");
    }
  }
}
