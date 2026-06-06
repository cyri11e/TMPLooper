// ------------------------------------------------------------
// TMPController.js — logique interne du looper Tone Master Pro
// STOP / PLAY / REC / OVERDUB + transitions + actions UI
// ------------------------------------------------------------

class TMPController {
  constructor(app) {
    this.app = app;

    // état interne TMP (car le TMP n’envoie rien en retour)
    this.state = "STOP"; 
    // STOP | PLAY | REC | OVERDUB
  }

  // ------------------------------------------------------------
  // SETTER ÉTAT
  // ------------------------------------------------------------
  setState(s) {
    this.state = s;
  }

  // ------------------------------------------------------------
  // BOUTON RECORD
  // ------------------------------------------------------------
  handleRecord() {
    const audio = this.app.audio;
    const rec   = this.app.rec;

    // MODE AVEC AUDIO → countdown
    if (audio.buffer) {
      rec.startRecSequence();
      return;
    }

    // MODE SANS AUDIO → CC direct
    this.app.midi.looperRecord();

    if (this.state === "STOP") {
      this.setState("REC");
    }
    else if (this.state === "REC") {
      this.setState("OVERDUB");
    }
    else if (this.state === "OVERDUB") {
      this.setState("REC");
    }
  }

  // ------------------------------------------------------------
  // BOUTON PLAY / STOP
  // ------------------------------------------------------------
  handlePlayStop() {
    const audio = this.app.audio;

    // TMP → PLAY/STOP
    this.app.midi.looperPlayStop();

    if (this.state === "STOP") {
      this.setState("PLAY");
      audio.playLoop();
    } else {
      this.setState("STOP");
      audio.pause();
    }
  }

  // ------------------------------------------------------------
  // ACTIONS SUPPLÉMENTAIRES (half, reverse, oneshot)
  // ------------------------------------------------------------
  toggleHalfSpeed() {
    // TMP n’a pas de CC half-speed officiel → placeholder
    this.app.midi._log("Half-speed non implémenté (placeholder)");
  }

  toggleReverse() {
    // TMP n’a pas de reverse MIDI → placeholder
    this.app.midi._log("Reverse non implémenté (placeholder)");
  }

  triggerOneShot() {
    // TMP n’a pas de one-shot MIDI → placeholder
    this.app.midi._log("One-shot non implémenté (placeholder)");
  }
}
