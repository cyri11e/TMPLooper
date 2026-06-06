class AppController {
  constructor() {
    this.audio = new AudioEngine(this);
    this.midi  = new MidiEngine(this);
    this.tmp   = new TMPController(this);
    this.rec   = new RecManager(this);   // OK
    this.ui    = new UIManager(this);

    this.midiStartTime = 0;
  }

  async init() {
    await this.midi.init();
  }

  draw() {
    // UI
    this.ui.draw();

    // COUNTDOWN + PROGRESSION
    this.rec.drawCountdown();   // OK

    // MONITOR MIDI
    this.midi.drawOverlay();
  }

  mousePressed()  { this.ui.mousePressed(); }
  mouseReleased() { this.ui.mouseReleased(); }
  mouseDragged()  { this.ui.mouseDragged(); }
  mouseWheel(e)   { return this.ui.mouseWheel(e); }
  keyPressed(k)   { this.ui.keyPressed(k); }

  triggerAction(id) {
    switch (id) {

      case "record":
        // 🔥 C’est ça qui manquait
        this.rec.startRecSequence();
        break;

      case "play":
        this.tmp.handlePlayStop();
        break;

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
