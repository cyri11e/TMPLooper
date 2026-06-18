// ------------------------------------------------------------
// UIManager.js — Mode A (45% / 10% / 45% stricts)
// ------------------------------------------------------------

class UIManager {
  constructor(app) {
    this.app = app;

    this.bpmControls = new BpmMeasureControls(app, 0, 0);
    this.loopViewer = new LoopViewer(0, 0, 0, 0, this.bpmControls);
    this.controls = new Controls(0, 0, this.app);
    this.settings = new SettingsPanel(app.midi);

    this.audioInput = createFileInput((file) => this._handleAudioFile(file));
    this.audioInput.hide();

    this.midiInput = createFileInput((file) => this._handleMidiFile(file));
    this.midiInput.hide();

    this.controls.settingsBtn.action = () => this.toggleSettings();
  }

  // ------------------------------------------------------------
  // RESPONSIVE 45 / 10 / 45
  // ------------------------------------------------------------
  onResize() {
    const W = width;
    const H = height;

    const zone1 = H * 0.45; // LoopViewer
    const zone2 = H * 0.10; // BPM
    const zone3 = H * 0.45; // TMP

    // 1) LoopViewer
    this.loopViewer.x = W * 0.05;
    this.loopViewer.y = H * 0.03;
    this.loopViewer.w = W * 0.90;
    this.loopViewer.h = zone1 - H * 0.06;
    this.loopViewer.onResize();

    // 2) BPM
    this.bpmControls.onResize();
    this.bpmControls.x = (W - this.bpmControls.width) / 2;
    this.bpmControls.y = this.loopViewer.y + this.loopViewer.h + (zone2 - this.bpmControls.height) / 2;

    // 3) TMP (pédalier)
    this.controls.onResize();
    this.controls.x = (W - this.controls.totalWidth) / 2;
    this.controls.y = this.bpmControls.y + this.bpmControls.height + (zone3 - this.controls.totalHeight) / 2;
  }

  // ------------------------------------------------------------
  // DRAW
  // ------------------------------------------------------------
  draw() {
    background(15);

    this.app.audio.updatePlayhead();
    this.loopViewer.draw();
    this.bpmControls.draw();
    this.controls.draw();
    this.settings.draw();
  }

  // ------------------------------------------------------------
  // INTERACTIONS
  // ------------------------------------------------------------
  mousePressed() {
    this.bpmControls.mousePressed();

    if (this.settings.visible) {
      if (
        mouseX > this.settings.closeX &&
        mouseX < this.settings.closeX + this.settings.closeW &&
        mouseY > this.settings.closeY &&
        mouseY < this.settings.closeY + this.settings.closeH
      ) {
        this.settings.hide();
      }
      return;
    }

    this.controls.mousePressed();

    if (this.loopViewer.isHovered()) {
      this.loopViewer.setActive(true);
      this.loopViewer.onClick(() => {
        this.audioInput.elt.accept = ".wav,.mp3";
        this.audioInput.elt.click();
      });
      this.loopViewer.mousePressed();
    }
  }

  mouseReleased() {
    if (!this.settings.visible) this.loopViewer.mouseReleased();
  }

  mouseDragged() {
    if (!this.settings.visible) this.loopViewer.mouseDragged();
  }

  mouseWheel(e) {
    if (!this.settings.visible && this.loopViewer.isHovered()) {
      this.loopViewer.onWheel(e.deltaY);
      return false;
    }
  }

  keyPressed(k, code) {
    this.bpmControls.keyPressed(k);
    if (this.bpmControls.activeField) return;

    if (this.settings.visible) return;

    if (k === " ") {
      if (this.app.audio.isPlaying) this.app.audio.pause();
      else this.app.audio.playLoop();
      return;
    }

    if (this.loopViewer.interaction) {
      this.loopViewer.interaction.keyPressed(code);
    }
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

  toggleSettings() {
    this.settings.visible = !this.settings.visible;
  }
}
