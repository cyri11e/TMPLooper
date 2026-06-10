// ------------------------------------------------------------
// MidiViewer.js — coordination (équivalent LoopViewer.js pour le MIDI)
// ------------------------------------------------------------

class MidiViewer {
  constructor(x, y, w, h) {
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

    // données MIDI
    this.events = [];
    this.channels = [];
    this.instrumentNames = {};
    this.duration = 1;      // en secondes (max time des events)
    this.filename = null;   // nom du fichier (rempli depuis UIManager)

    // sous-modules
    this.math = new MidiViewerMusicMath(this);
    this.renderer = new MidiViewerRenderer(this);
    this.interaction = new MidiViewerInteraction(this);

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
    if (!this.active) return false;
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
  // données MIDI
  // ------------------------------------------------------------
  setEvents(events, duration, instrumentNames = {}) {
    this.events = events || [];
    this.duration = duration || 1;
    this.instrumentNames = instrumentNames || {};

    const map = new Map();
    for (let e of this.events) {
      if (!map.has(e.channel)) map.set(e.channel, 0);
      map.set(e.channel, map.get(e.channel) + 1);
    }
    this.channels = Array.from(map.keys()).sort();
  }

  // ------------------------------------------------------------
  // BPM auto sur la sélection (même formule que LoopViewerMusicMath)
//  (à appeler depuis l’extérieur si tu veux l’exploiter)
// ------------------------------------------------------------
  getAutoBpm(measures, beatsPerMeasure) {
    return this.math.getAutoBpm(
      this.loopStart,
      this.loopEnd,
      measures,
      beatsPerMeasure,
      this.duration
    );
  }

  // ------------------------------------------------------------
  // draw
  // ------------------------------------------------------------
  draw() {
    this.renderer.draw();
  }

  // ------------------------------------------------------------
  // interactions (si jamais tu les appelles via UIManager)
//  UIManager appelle déjà this.midiViewer.interaction.* → OK aussi
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
  // playhead externe (si tu veux le synchroniser à l’audio)
//  time = secondes absolues dans le fichier MIDI
  // ------------------------------------------------------------
  setPlayhead(time) {
    const tNorm = this.duration > 0 ? time / this.duration : 0;
    const span = this.loopEnd - this.loopStart || 1;
    const local = (tNorm - this.loopStart) / span;
    this.playhead = constrain(local, 0, 1);
  }
}
