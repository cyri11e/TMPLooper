// ------------------------------------------------------------
// UIManager.js — version avec _parseMidi() temporel pour MidiViewer
// ------------------------------------------------------------

class UIManager {
  constructor(app) {
    this.app = app;

    // 1) BPM / Mesures
    this.bpmControls = new BpmMeasureControls(app, 160, 660);

    // 2) Viewers
    this.loopViewer = new LoopViewer(20, 20, width - 40, 200, this.bpmControls);
    this.midiViewer = new MidiViewer(20, 240, width - 40, 200);

    // 3) Controls TMP
    this.controls = new Controls(20, 460, this.app);

    // 4) Settings
    this.settings = new SettingsPanel(app.midi);

    // 5) États initiaux
    this.loopViewer.setActive(true);
    this.midiViewer.setActive(true);

    // 6) File inputs
    this.audioInput = createFileInput((file) => this._handleAudioFile(file));
    this.audioInput.hide();

    this.midiInput = createFileInput((file) => this._handleMidiFile(file));
    this.midiInput.hide();

    // 7) Bouton paramétrage
    this.controls.settingsBtn.action = () => this.toggleSettings();
  }

  toggleSettings() {
    this.settings.visible = !this.settings.visible;
  }

  draw() {
    background(15);

    this.app.audio.updatePlayhead();
    this._updateMidiPlayhead();

    this.loopViewer.draw();
    this.midiViewer.draw();
    this.controls.draw();

    this.bpmControls.draw();
    this.settings.draw();
  }

  _updateMidiPlayhead() {
    // à brancher plus tard sur MidiEngine si besoin
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
    const filename = file.file.name || "MIDI File";
    reader.onload = (e) => this._parseMidi(e.target.result, filename);
    console.log(filename)
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
    this.bpmControls.mousePressed();
    if (this.bpmControls.activeField) return;

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

    this.controls.mousePressed();

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

    if (this.midiViewer.isHovered()) {
      this.midiViewer.setActive(true);
      this.loopViewer.setActive(false);

      this.midiViewer.onClick(() => {
        this.midiInput.elt.accept = ".mid,.midi";
        this.midiInput.elt.click();
      });

      this.midiViewer.mousePressed();
      return;
    }
  }

  mouseReleased() {
    if (!this.settings.visible) {
      this.loopViewer.mouseReleased();
      this.midiViewer.mouseReleased();
    }
  }

  mouseDragged() {
    if (!this.settings.visible) {
      this.loopViewer.mouseDragged();
      if (this.midiViewer.active) {
        this.midiViewer.mouseDragged();
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

  keyPressed(k, code) {
    this.bpmControls.keyPressed(k);
    if (this.bpmControls.activeField) return;

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

    if (k === " ") {
      if (this.app.audio.isPlaying) this.app.audio.pause();
      else this.app.audio.playLoop();
      return;
    }

    if (this.loopViewer && this.loopViewer.interaction) {
      this.loopViewer.interaction.keyPressed(code);
    }

    if (this.midiViewer && this.midiViewer.interaction) {
      this.midiViewer.keyPressed();
    }
  }
}
