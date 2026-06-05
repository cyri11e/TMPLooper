// ------------------------------------------------------------
// midi.js — Web MIDI natif + Tone Master Pro helpers
// Compatible p5.js, aucun DOM, aucun export
// ------------------------------------------------------------

class MidiManager {
  constructor() {
    this.midi = null;
    this.inputs = [];
    this.outputs = [];
    this.tmpOutput = null;

    this.log = [];
    this.logMax = 40;

    // callbacks optionnels
    this.onCC = null;
    this.onPC = null;
    this.onAny = null;
    this.logOut = [];

  }

  async init() {
    if (!navigator.requestMIDIAccess) {
      this._log("Web MIDI non supporté");
      return;
    }

    this.midi = await navigator.requestMIDIAccess({ sysex: false });
    this._scanPorts();

    this.midi.onstatechange = () => {
      this._scanPorts();
      this._log("MIDI ports rescannés");
    };
  }

  _scanPorts() {
    this.inputs = [];
    this.outputs = [];
    this.tmpOutput = null;

    for (let input of this.midi.inputs.values()) {
      this.inputs.push(input);
      input.onmidimessage = (msg) => this._handle(msg, input);
    }

    for (let output of this.midi.outputs.values()) {
      this.outputs.push(output);
      if (!this.tmpOutput && /tone master/i.test(output.name)) {
        this.tmpOutput = output;
        this._log("Tone Master Pro détecté");
      }
    }

    if (!this.tmpOutput && this.outputs.length > 0) {
      this.tmpOutput = this.outputs[0];
      this._log("TMP non trouvé → OUT par défaut utilisé");
    }
  }

  _handle(msg, input) {
    const [status, d1, d2] = msg.data;
    const type = status & 0xF0;
    const ch = status & 0x0F;

    let label = "";
    if (type === 0xB0) label = "CC";
    else if (type === 0xC0) label = "PC";
    else if (type === 0x90 && d2 > 0) label = "NoteOn";
    else if (type === 0x80 || (type === 0x90 && d2 === 0)) label = "NoteOff";
    else label = "0x" + type.toString(16);

    this._log(`${input.name} | ch${ch+1} | ${label} ${d1} ${type!==0xC0?"v"+d2:""}`);

    if (this.onAny) this.onAny({ status, d1, d2, type, ch });

    if (type === 0xB0 && this.onCC) this.onCC({ cc: d1, value: d2, ch });
    if (type === 0xC0 && this.onPC) this.onPC({ program: d1, ch });
  }

  _log(txt) {
    this.log.push(txt);
    if (this.log.length > this.logMax) {
      this.log.splice(0, this.log.length - this.logMax);
    }
  }

  // ------------------------------------------------------------
  // DRAW OVERLAY (appelé depuis draw() de p5)
  // ------------------------------------------------------------
  drawOverlay(x, y) {
    push();
    const lines = this.log;
    const lh = 12;
    const pad = 6;
    const w = 360;
    const h = pad*2 + lh * lines.length;

    translate(x, y);
    noStroke();
    fill(0, 180);
    rect(0, 0, w, h, 4);

    textFont("monospace");
    textSize(10);
    fill(0, 255, 0);
    textAlign(LEFT, TOP);

    let yy = pad;
    for (let i = lines.length - 1; i >= 0; i--) {
      text(lines[i], pad, yy);
      yy += lh;
    }

    pop();
  }

  // ------------------------------------------------------------
  // ENVOI MIDI
  // ------------------------------------------------------------
  sendRaw(bytes) {
    if (!this.tmpOutput) return;
    this.tmpOutput.send(bytes);
    this.logOut.push(`[OUT ${this.tmpOutput?.name}] ${bytes}`);
    if (this.logOut.length > 40) this.logOut.splice(0, this.logOut.length - 40);

  }

  sendCC(cc, value, ch = 0) {
    this.sendRaw([0xB0 | ch, cc & 0x7F, value & 0x7F]);
  }

  sendPC(program, ch = 0) {
    this.sendRaw([0xC0 | ch, program & 0x7F]);
  }

  // ------------------------------------------------------------
  // HELPERS TONE MASTER PRO
  // ------------------------------------------------------------
  looperRecord(ch = 0) {
    this.sendCC(103, 127, ch);
    this._log("→ TMP Looper REC/DUB");
  }

  looperPlayStop(ch = 0) {
    this.sendCC(104, 127, ch);
    this._log("→ TMP Looper PLAY/STOP");
  }

  tapTempo(ch = 0) {
    this.sendCC(64, 127, ch);
    this._log("→ TMP Tap Tempo");
  }

  setMasterVolume(v, ch = 0) {
    this.sendCC(7, v, ch);
    this._log("→ TMP Master Volume = " + v);
  }

  selectPreset(p, ch = 0) {
    this.sendPC(p, ch);
    this._log("→ TMP Program Change = " + p);
  }

  toggleFX(cc, on, ch = 0) {
    this.sendCC(cc, on ? 127 : 0, ch);
    this._log(`→ TMP FX CC${cc} = ${on?"ON":"OFF"}`);
  }
}
