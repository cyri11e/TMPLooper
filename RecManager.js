// ------------------------------------------------------------
// RecManager.js — gestion du countdown + enregistrement auto
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

    if (ui.loopViewer.active && audio.buffer) {
      loopDuration =
        (ui.loopViewer.loopEnd - ui.loopViewer.loopStart) *
        audio.buffer.duration;
    }
    else if (ui.midiViewer.active && ui.midiViewer.duration > 0) {
      loopDuration = ui.midiViewer.duration;
    }

    // MODE FANTOM : pas d'audio chargé → durée = BPM × mesures
    this.fantomMode = !audio.buffer;

    if (this.fantomMode) {
      const bpm = this.app.midi.clockBpm || this.app.ui.bpmControls.bpm;
      const measures = this.app.ui.bpmControls.measures;
      loopDuration = (60 / bpm) * measures;
    }

    if (loopDuration <= 0.01) return;

    if (this.fantomMode) {
      const bpm = this.app.midi.clockBpm || this.app.ui.bpmControls.bpm;
      this.beatIntervalMs = 60000 / bpm;
    } else {
      this.beatIntervalMs = (loopDuration / this.beats) * 1000;
    }

    this.countdownStart = millis();
    this.isCountdown = true;
    this.isRecording = false;

    if (ui.loopViewer.active && this.app.midi.isPlayingMidi) {
      this.app.midi.stopMidiPlayback?.();
    }
    if (ui.midiViewer.active && audio.isPlaying) {
      audio.stop();
    }

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

    this.app.midi.looperRecord();
    this.app.tmp.setState("REC");

    // Fantom START en mode Fantom
    if (this.fantomMode) {
      this.app.midi.sendStart();
    }

    this.isRecording = true;
    this.recordStartTime = audio.ctx.currentTime;

    let loopDuration = 0;

    if (this.fantomMode) {
      const bpm = this.app.midi.clockBpm || this.app.ui.bpmControls.bpm;
      const measures = this.app.ui.bpmControls.measures;
      loopDuration = (60 / bpm) * measures;
    }
    else if (ui.loopViewer.active && audio.buffer) {
      loopDuration =
        (ui.loopViewer.loopEnd - ui.loopViewer.loopStart) *
        audio.buffer.duration;
    }
    else if (ui.midiViewer.active) {
      loopDuration = ui.midiViewer.duration;
    }

    this.recordEndTime = this.recordStartTime + loopDuration;

    // En mode Fantom : pas d'audio à jouer
    if (!this.fantomMode && audio.buffer) {
      audio.playLoop();
    }

    this.scheduledClicks = [];
  }

  drawCountdown() {
    if (!this.isCountdown && !this.isRecording) return;

    // Overlay pour countdown ou progression
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

    // Barre de progression pendant l'enregistrement (divisée en mesures)
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

      this.app.ui.midiViewer.setActive(true);
      this.app.ui.loopViewer.setActive(true);

      if (!this.fantomMode && audio.buffer) {
        audio.playLoop();
      }
    }
  }
}
