class AppController {
  constructor() {
    this.audio = new AudioEngine(this);
    this.midi  = new MidiEngine(this);
    this.tmp   = new TMPController(this);
    this.rec   = new RecManager(this);
    this.ui    = new UIManager(this);

    this.midiStartTime = 0;

    // mesure REC
    this.recordStartTime = null;
  }

  async init() {
    await this.midi.init();
  }

  draw() {
    this.ui.draw();
    this.rec.drawCountdown();
    this.midi.drawOverlay();
  }

  mousePressed()  { this.ui.mousePressed(); }
  mouseReleased() { this.ui.mouseReleased(); }
  mouseDragged()  { this.ui.mouseDragged(); }
  mouseWheel(e)   { return this.ui.mouseWheel(e); }
  keyPressed(k)   { this.ui.keyPressed(k); }

  triggerAction(id) {
    switch (id) {

      // --------------------------------------------------------
      // RECORD → top départ
      // --------------------------------------------------------
      case "record":
        this.recordStartTime = performance.now();
        this.rec.startRecSequence();
        break;

      // --------------------------------------------------------
      // PLAY → fin d’enregistrement TMP
      // --------------------------------------------------------
      case "play":
        this.tmp.handlePlayStop();

        if (this.recordStartTime) {
          const realMs = performance.now() - this.recordStartTime;
          const realSec = realMs / 1000;

          // format mm:ss.mmm
          const fmt = (sec) => {
            const mm = Math.floor(sec / 60);
            const ss = Math.floor(sec % 60);
            const ms = Math.floor((sec % 1) * 1000);
            return `${mm}:${ss.toString().padStart(2,"0")}.${ms.toString().padStart(3,"0")}`;
          };

          // durée théorique = durée sample × nb mesures
          let theoSec = realSec;

          const ui = this.ui;
          const audio = this.audio;

          if (ui.loopViewer.active && audio.buffer) {
            const measures = ui.bpmControls.measures;
            const loopBase =
              (ui.loopViewer.loopEnd - ui.loopViewer.loopStart) *
              audio.buffer.duration;
            theoSec = loopBase * measures;
          } else {
            const bpm = this.midi.clockBpm || ui.bpmControls.bpm;
            const measures = ui.bpmControls.measures;
            theoSec = (60 / bpm) * measures * 4;
          }

          this.recordStartTime = null;
        }

        break;

      // --------------------------------------------------------
      // AUTRES COMMANDES TMP
      // --------------------------------------------------------
      case "undo":     this.midi.sendCC(102, 127);   break;
      case "loopUp":   this.midi.sendCC(109, 127);   break;
      case "loopDown": this.midi.sendCC(110, 127);   break;
      case "half":     this.midi.sendCC(107, 127);   break;
      case "reverse":  this.midi.sendCC(108, 127);   break;
      case "oneshot":  this.midi.sendCC(105, 127);   break;
      case "settings": this.ui.toggleSettings();     break;
    }
  }
}
