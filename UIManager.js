// ------------------------------------------------------------
// UIManager.js — coordination de toute l’interface p5.js
// LoopViewer, MidiViewer, Controls, SettingsPanel, BPM/Mesures
// ------------------------------------------------------------

class UIManager {
  constructor(app) {
    this.app = app;

    // ------------------------------------------------------------
    // 1) BPM / Mesures (doit exister AVANT LoopViewer)
    // ------------------------------------------------------------
    this.bpmControls = new BpmMeasureControls(app, 160, 660);

    // ------------------------------------------------------------
    // 2) Viewers
    // ------------------------------------------------------------
    this.loopViewer = new LoopViewer(20, 20, width - 40, 200, this.bpmControls);
    this.midiViewer = new MidiViewer(20, 240, width - 40, 200);

    // ------------------------------------------------------------
    // 3) Controls TMP
    // ------------------------------------------------------------
    this.controls = new Controls(20, 460, this.app);

    // ------------------------------------------------------------
    // 4) Settings
    // ------------------------------------------------------------
    this.settings = new SettingsPanel(app.midi);

    // ------------------------------------------------------------
    // 5) États initiaux
    // ------------------------------------------------------------
    this.loopViewer.setActive(true);
    this.midiViewer.setActive(true);

    // ------------------------------------------------------------
    // 6) File inputs
    // ------------------------------------------------------------
    this.audioInput = createFileInput((file) => this._handleAudioFile(file));
    this.audioInput.hide();

    this.midiInput = createFileInput((file) => this._handleMidiFile(file));
    this.midiInput.hide();

    // ------------------------------------------------------------
    // 7) Bouton paramétrage
    // ------------------------------------------------------------
    this.controls.settingsBtn.action = () => this.toggleSettings();
  }

  // ------------------------------------------------------------
  // SETTINGS
  // ------------------------------------------------------------
  toggleSettings() {
    this.settings.visible = !this.settings.visible;
  }

  // ------------------------------------------------------------
  // DRAW
  // ------------------------------------------------------------
  draw() {
    background(15);

    // update playheads
    this.app.audio.updatePlayhead();
    this._updateMidiPlayhead();

    // draw UI
    this.loopViewer.draw();
    this.midiViewer.draw();
    this.controls.draw();

    // BPM / Mesures AVANT settings
    this.bpmControls.draw();

    // Settings au-dessus de tout
    this.settings.draw();
  }

  _updateMidiPlayhead() {
    // const mv = this.midiViewer;
    // if (!mv.active) return;
    // if (!mv.duration) return;

    // // avance le playhead dans la boucle
    // const now = millis() / 1000;
    // const span = mv.loopEnd - mv.loopStart;

    // const local = ((now % span) + mv.loopStart);
    // mv.setPlayhead(local);
  }

  // ------------------------------------------------------------
  // FILE LOADERS
  // ------------------------------------------------------------
  async _handleAudioFile(file) {
    if (!file || !file.file) return;
    await this.app.audio.loadFile(file.data);
  }

  _handleMidiFile(file) {
    if (!file || !file.file) return;

    const reader = new FileReader();
    reader.onload = (e) => this._parseMidi(e.target.result);
    reader.readAsArrayBuffer(file.file);
  }

  _parseMidi(arrayBuffer) {
    const midiFile = new MIDIFile(arrayBuffer);
    const events = midiFile.getMidiEvents();

    const channels = {};
    let maxTime = 0;

    for (let e of events) {
      const musical = (e.type === 8 || e.type === 9 || e.type === 11);
      if (!musical) continue;
      if (typeof e.channel !== "number") continue;

      const t = e.playTime / 1000;
      if (!channels[e.channel]) channels[e.channel] = [];

      channels[e.channel].push({ time: t, channel: e.channel });
      if (t > maxTime) maxTime = t;
    }

    let parsed = [];
    for (let ch in channels) parsed.push(...channels[ch]);

    this.midiViewer.setEvents(parsed, maxTime, {});
  }

  // ------------------------------------------------------------
  // INTERACTIONS
  // ------------------------------------------------------------
  mousePressed() {

    // 1) BPM / Mesures d'abord
    this.bpmControls.mousePressed();

    // Si le champ BPM est actif → on ne laisse rien d'autre intercepter le clic
    if (this.bpmControls.activeField) return;

    // 2) Settings
    if (this.settings.visible) {
      if (
        mouseX > this.settings.closeX &&
        mouseX < this.settings.closeX + this.settings.closeW &&
        mouseY > this.settings.closeY &&
        mouseY < this.settings.closeY + this.settings.closeH
      ) {
        this.settings.hide();
        return;
      }
      return;
    }

    // 3) Boutons TMP
    this.controls.mousePressed();

    // 4) LoopViewer
    if (this.loopViewer.isHovered()) {
      this.loopViewer.setActive(true);
      this.midiViewer.setActive(false);

      this.loopViewer.onClick(() => {
        this.audioInput.elt.accept = ".wav,.mp3";
        this.audioInput.elt.click();
      });

      this.loopViewer.mousePressed();
      return;
    }

    // 5) MidiViewer
    if (this.midiViewer.isHovered()) {
      this.midiViewer.setActive(true);
      this.loopViewer.setActive(false);

      this.midiViewer.onClick(() => {
        this.midiInput.elt.accept = ".mid,.midi";
        this.midiInput.elt.click();
      });

      // IMPORTANT : déléguer au MidiViewerInteraction
      this.midiViewer.interaction.mousePressed();
      return;
    }
  }

  mouseReleased() {
    if (!this.settings.visible) {
      this.loopViewer.mouseReleased();
      // IMPORTANT : relâcher aussi le MidiViewerInteraction
      this.midiViewer.interaction.mouseReleased();
    }
  }

  mouseDragged() {
    if (!this.settings.visible) {
      this.loopViewer.mouseDragged();
      if (this.midiViewer.active) {
        this.midiViewer.interaction.mouseDragged();
      }
    }
  }

  mouseWheel(e) {
    if (this.settings.visible) return;

    if (this.loopViewer.isHovered()) {
      this.loopViewer.onWheel(e.deltaY);
      return false;
    }
    if (this.midiViewer.isHovered()) {
      this.midiViewer.onWheel(e.deltaY);
      return false;
    }
  }

  // ------------------------------------------------------------
  // CLAVIER
  // ------------------------------------------------------------
  // Appelée depuis sketch.js : app.keyPressed(key, keyCode)
  keyPressed(k, code) {

    // 1) BPM / Mesures
    this.bpmControls.keyPressed(k);

    // Si on est en saisie BPM → on bloque tout le reste
    if (this.bpmControls.activeField) return;

    // 2) Settings
    if (this.settings.visible) {
      if (this.settings.activeField) {
        if (k >= "0" && k <= "9") {
          this.settings.params[this.settings.activeField] =
            int(String(this.settings.params[this.settings.activeField]) + k);
        }
        if (k === "Backspace") {
          let s = String(this.settings.params[this.settings.activeField]);
          this.settings.params[this.settings.activeField] =
            int(s.slice(0, -1) || "0");
        }
      }
      return;
    }

    // 3) SPACE = pré-écoute audio
    if (k === " ") {
      if (this.app.audio.isPlaying) this.app.audio.pause();
      else this.app.audio.playLoop();
      return;
    }

    // 4) Flèches → délégation au LoopViewerInteraction
    if (this.loopViewer && this.loopViewer.interaction) {
      this.loopViewer.interaction.keyPressed(code);
    }
  }
}
