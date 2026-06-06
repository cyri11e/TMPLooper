// ------------------------------------------------------------
// AudioEngine.js — moteur audio autonome
// Lecture, pause, loop, playhead, chargement fichier
// ------------------------------------------------------------

class AudioEngine {
  constructor(app) {
    this.app = app;

    this.ctx = null;
    this.buffer = null;
    this.source = null;

    this.isPlaying = false;
    this.startTime = 0;
    this.pausedAt = 0;
  }

  // ------------------------------------------------------------
  // AUDIO CONTEXT
  // ------------------------------------------------------------
  _ensureCtx() {
    if (!this.ctx) this.ctx = new AudioContext();
  }

  // ------------------------------------------------------------
  // CHARGEMENT FICHIER AUDIO
  // ------------------------------------------------------------
  async loadFile(fileData) {
    this._ensureCtx();

    const arrayBuf = await fetch(fileData).then(r => r.arrayBuffer());
    this.buffer = await this.ctx.decodeAudioData(arrayBuf);

    this.app.ui.loopViewer.setAudioBuffer(this.buffer);
  }

  // ------------------------------------------------------------
  // PLAY LOOP
  // ------------------------------------------------------------
  playLoop() {
    if (!this.buffer) return;
    this._ensureCtx();

    // stop MIDI if needed
    this.app.midi.stopMidiPlayback?.();

    // stop previous source
    if (this.source) {
      try { this.source.stop(); } catch(e){}
    }

    const lv = this.app.ui.loopViewer;
    const ls = lv.loopStart * this.buffer.duration;
    const le = lv.loopEnd   * this.buffer.duration;

    this.source = this.ctx.createBufferSource();
    this.source.buffer = this.buffer;

    this.source.loop = true;
    this.source.loopStart = ls;
    this.source.loopEnd   = le;

    this.source.connect(this.ctx.destination);

    this.startTime = this.ctx.currentTime - this.pausedAt;
    this.source.start(0, ls + this.pausedAt);

    this.isPlaying = true;
    lv.setActive(true);
    this.app.ui.midiViewer.setActive(false);
  }

  // ------------------------------------------------------------
  // STOP
  // ------------------------------------------------------------
  stop() {
    if (this.source) {
      try { this.source.stop(); } catch(e){}
      this.source = null;
    }
    this.pausedAt = 0;
    this.isPlaying = false;

    this.app.ui.loopViewer.setActive(true);
    this.app.ui.midiViewer.setActive(true);
  }

  // ------------------------------------------------------------
  // PAUSE
  // ------------------------------------------------------------
  pause() {
    if (!this.isPlaying) return;

    const lv = this.app.ui.loopViewer;
    const ls = lv.loopStart * this.buffer.duration;

    this.pausedAt = this.getCurrentTime() - ls;
    this.stop();
  }

  // ------------------------------------------------------------
  // TEMPS COURANT
  // ------------------------------------------------------------
  getCurrentTime() {
    if (!this.isPlaying) {
      const lv = this.app.ui.loopViewer;
      return lv.loopStart * (this.buffer?.duration || 0);
    }
    return this.ctx.currentTime - this.startTime;
  }

  // ------------------------------------------------------------
  // UPDATE PLAYHEAD (appelé depuis UIManager)
  // ------------------------------------------------------------
  updatePlayhead() {
    if (!this.isPlaying || !this.buffer) return;

    const lv = this.app.ui.loopViewer;
    const t  = this.getCurrentTime();
    const ls = lv.loopStart * this.buffer.duration;
    const le = lv.loopEnd   * this.buffer.duration;

    let lp = t;

    if (lp < ls) {
      lp = ls;
      this.startTime = this.ctx.currentTime - lp;
    }

    if (lp > le) {
      lp = ls;
      this.startTime = this.ctx.currentTime - lp;
    }

    const norm = (lp - ls) / (le - ls);
    lv.setPlayhead(norm);
  }
}
