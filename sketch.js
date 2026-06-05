// ------------------------------------------------------------
// sketch.js — version complète avec SettingsPanel
// ------------------------------------------------------------

let loopViewer;
let midiViewer;
let controls;
let settings;

let fileInput;
let midiFile;

let audioBuffer = null;
let audioSource = null;
let audioCtx = null;

let startTime = 0;
let pausedAt = 0;
let isPlaying = false;

let midi;
let midiDuration = 0;
let isPlayingMidi = false;
let midiStartTime = 0;

function setup() {
  createCanvas(1000, 700);

  // ------------------------------------------------------------
  // VIEWERS
  // ------------------------------------------------------------
  loopViewer = new LoopViewer(20, 20, width - 40, 200);
  midiViewer = new MidiViewer(20, 240, width - 40, 200);
  controls = new Controls(20, 460);

  // ------------------------------------------------------------
  // FILE PICKERS
  // ------------------------------------------------------------
  fileInput = createFileInput(handleAudioFile);
  fileInput.hide();

  midiFile = createFileInput(handleMidiFile);
  midiFile.hide();

  // ------------------------------------------------------------
  // MIDI
  // ------------------------------------------------------------
  midi = new MidiManager();
  midi.init();

  // ------------------------------------------------------------
  // SETTINGS PANEL
  // ------------------------------------------------------------
  settings = new SettingsPanel(midi);

  controls.settingsBtn.action = () => {
    settings.show();
  };
}

function draw() {
  background(15);

  // ------------------------------------------------------------
  // AUDIO PLAYHEAD
  // ------------------------------------------------------------
  if (isPlaying && audioBuffer) {
    const t = getCurrentAudioTime();
    const ls = loopViewer.loopStart * audioBuffer.duration;
    const le = loopViewer.loopEnd   * audioBuffer.duration;

    let lp = t;

    if (lp < ls) {
      lp = ls;
      startTime = audioCtx.currentTime - lp;
    }

    if (lp > le) {
      lp = ls;
      startTime = audioCtx.currentTime - lp;
    }

    const norm = (lp - ls) / (le - ls);
    loopViewer.setPlayhead(norm);
  }

  // ------------------------------------------------------------
  // MIDI PLAYHEAD
  // ------------------------------------------------------------
  if (isPlayingMidi && audioCtx && midiDuration > 0) {
    const t = (audioCtx.currentTime - midiStartTime) % midiDuration;
    midiViewer.setPlayhead(t / midiDuration);
  }

  // ------------------------------------------------------------
  // DRAW UI
  // ------------------------------------------------------------
  loopViewer.draw();
  midiViewer.draw();
  controls.draw();

  // ------------------------------------------------------------
  // MIDI OVERLAY
  // ------------------------------------------------------------
  midi.drawOverlay(width - 380, height - 160);

  // ------------------------------------------------------------
  // SETTINGS PANEL
  // ------------------------------------------------------------
  settings.draw();
}

// ------------------------------------------------------------
// AUDIO
// ------------------------------------------------------------

function playAudioLoop() {
  if (!audioBuffer) return;
  if (!audioCtx) audioCtx = new AudioContext();

  if (audioSource) audioSource.stop();

  audioSource = audioCtx.createBufferSource();
  audioSource.buffer = audioBuffer;

  const ls = loopViewer.loopStart * audioBuffer.duration;
  const le = loopViewer.loopEnd   * audioBuffer.duration;

  audioSource.loop = true;
  audioSource.loopStart = ls;
  audioSource.loopEnd   = le;

  audioSource.connect(audioCtx.destination);

  startTime = audioCtx.currentTime - pausedAt;
  audioSource.start(0, ls + pausedAt);

  isPlaying = true;
}

function stopAudio() {
  if (audioSource) audioSource.stop();
  pausedAt = 0;
  isPlaying = false;
}

function pauseAudio() {
  if (!isPlaying) return;
  pausedAt = getCurrentAudioTime() - loopViewer.loopStart * audioBuffer.duration;
  stopAudio();
}

function getCurrentAudioTime() {
  if (!isPlaying) return loopViewer.loopStart * audioBuffer.duration;
  return audioCtx.currentTime - startTime;
}

function handleAudioFile(file) {
  if (!file || !file.file) return;

  if (!audioCtx) audioCtx = new AudioContext();

  fetch(file.data)
    .then(r => r.arrayBuffer())
    .then(buf => audioCtx.decodeAudioData(buf))
    .then(decoded => {
      audioBuffer = decoded;

      const raw = decoded.getChannelData(0);
      const samples = 400;
      const block = Math.floor(raw.length / samples);
      const wave = [];
      for (let i = 0; i < samples; i++) wave.push(raw[i * block]);

      loopViewer.updateWave(wave);
    });
}

// ------------------------------------------------------------
// MIDI FILE
// ------------------------------------------------------------

function handleMidiFile(file) {
  if (!file || !file.file) return;

  const reader = new FileReader();
  reader.onload = (e) => parseMidiFile(e.target.result);
  reader.readAsArrayBuffer(file.file);
}

function parseMidiFile(arrayBuffer) {
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

  midiDuration = maxTime;
  midiViewer.setEvents(parsed, maxTime, {});
}

function playMidiFile() {
  if (!audioCtx || !midiDuration) return;
  midiStartTime = audioCtx.currentTime;
  isPlayingMidi = true;
}

function stopMidiFile() {
  isPlayingMidi = false;
}

// ------------------------------------------------------------
// INTERACTIONS
// ------------------------------------------------------------

function keyPressed() {
  // Edition des champs dans SettingsPanel
  if (settings.visible && settings.activeField) {
    if (key >= '0' && key <= '9') {
      settings.params[settings.activeField] =
        int(String(settings.params[settings.activeField]) + key);
    }

    if (key === 'Backspace') {
      let s = String(settings.params[settings.activeField]);
      settings.params[settings.activeField] = int(s.slice(0, -1) || "0");
    }
  }

  // Raccourcis audio
  if (key === ' ') {
    if (isPlaying) pauseAudio();
    else playAudioLoop();
  }

  if (key === 'M') {
    if (isPlayingMidi) stopMidiFile();
    else playMidiFile();
  }
}

function mousePressed() {

  // Fermeture SettingsPanel
  if (settings.visible &&
      mouseX > width - 160 && mouseX < width - 60 &&
      mouseY > 60 && mouseY < 100) {
    settings.hide();
    return;
  }

  // SettingsPanel interactions
  if (settings.visible) return;

  // Controls
  controls.mousePressed();

  // LoopViewer
  if (loopViewer.isHovered()) {
    loopViewer.onClick(() => {
      fileInput.elt.accept = ".wav,.mp3";
      fileInput.elt.click();
    });
    loopViewer.mousePressed();
  }

  // MidiViewer
  if (midiViewer.isHovered()) {
    midiViewer.onClick(() => {
      midiFile.elt.accept = ".mid,.midi";
      midiFile.elt.click();
    });
  }
}

function mouseReleased() {
  if (!settings.visible) loopViewer.mouseReleased();
}

function mouseDragged() {
  if (!settings.visible) loopViewer.mouseDragged();
}

function mouseWheel(e) {
  if (settings.visible) return;

  if (loopViewer.isHovered()) {
    loopViewer.onWheel(e.deltaY);
    return false;
  }
  if (midiViewer.isHovered()) {
    midiViewer.onWheel(e.deltaY);
    return false;
  }
}
