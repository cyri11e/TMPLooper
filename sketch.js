// ------------------------------------------------------------
// sketch.js — version complète synchronisée TMP <-> Audio
// Boutons UI contrôlent TMP + Audio
// SPACE = pré-écoute audio uniquement
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

// ------------------------------------------------------------
// ÉTAT INTERNE DU TMP (car il n’envoie AUCUN CC en retour)
// ------------------------------------------------------------
let tmpLooperState = "STOP"; 
// STOP | PLAY | REC | OVERDUB

function setTMPState(newState) {
  tmpLooperState = newState;
  // IMPORTANT : ne touche plus à l’audio ici
  // L’audio est contrôlé UNIQUEMENT par les boutons UI et SPACE
}

// -------------------- REC / countdown state --------------------
let isRecCountdown = false;
let recCountdownStart = 0;
let recBeatIntervalMs = 0;
let recLoopDuration = 0;
let recBeats = 4;
let recRecording = false;
let recRecordStartTime = 0;
let recRecordEndTime = 0;

let scheduledClicks = [];

// ------------------------------------------------------------
// SETUP
// ------------------------------------------------------------
function setup() {
  createCanvas(1000, 700);

  loopViewer = new LoopViewer(20, 20, width - 40, 200);
  midiViewer = new MidiViewer(20, 240, width - 40, 200);
  controls = new Controls(20, 460);

  loopViewer.setActive(true);
  midiViewer.setActive(true);

  fileInput = createFileInput(handleAudioFile);
  fileInput.hide();

  midiFile = createFileInput(handleMidiFile);
  midiFile.hide();

  midi = new MidiManager();
  midi.init();

  settings = new SettingsPanel(midi);

  controls.settingsBtn.action = () => settings.show();
}

// ------------------------------------------------------------
// DRAW
// ------------------------------------------------------------
function draw() {
  background(15);

  // AUDIO PLAYHEAD
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

  // MIDI PLAYHEAD
  if (isPlayingMidi && audioCtx && midiDuration > 0) {
    const t = (audioCtx.currentTime - midiStartTime) % midiDuration;
    midiViewer.setPlayhead(t / midiDuration);
  }

  loopViewer.draw();
  midiViewer.draw();
  controls.draw();
  midi.drawOverlay(width - 380, height - 160);
  settings.draw();

  // FIN ENREGISTREMENT AUTO
  if (recRecording && audioCtx) {
    if (audioCtx.currentTime >= recRecordEndTime) {

      // STOP REC TMP → CC104
      midi.looperPlayStop();
      setTMPState("PLAY"); // le TMP continue la boucle

      recRecording = false;

      midiViewer.setActive(true);
      loopViewer.setActive(true);

      // AUDIO CONTINUE → ne pas arrêter
      playAudioLoop();
    }
  }

  // COUNTDOWN
  if (isRecCountdown) drawCountdownOverlay();
}

// ------------------------------------------------------------
// COUNTDOWN
// ------------------------------------------------------------
function drawCountdownOverlay() {
  const elapsed = millis() - recCountdownStart;
  const beatIndex = floor(elapsed / recBeatIntervalMs);
  const displayBeat = constrain(beatIndex, 0, recBeats - 1);

  push();
  fill(0, 220);
  rect(0, 0, width, height);

  fill(255);
  textAlign(CENTER, CENTER);
  textSize(min(width, height) * 0.28);
  text(String(displayBeat + 1), width / 2, height / 2);

  textSize(18);
  textAlign(CENTER, BOTTOM);
  const bpmApprox = 60 / (recBeatIntervalMs / 1000);
  text(`BPM ≈ ${nf(bpmApprox, 0, 1)}`, width / 2, height - 40);
  pop();

  if (elapsed >= recBeatIntervalMs * recBeats) {
    isRecCountdown = false;
    startRecordingAfterCountdown();
  }
}

// ------------------------------------------------------------
// CLICK AUDIO
// ------------------------------------------------------------
function playClickAt(when, isDownbeat = false) {
  if (!audioCtx) audioCtx = new AudioContext();

  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();

  osc.frequency.value = isDownbeat ? 1200 : 900;
  osc.type = 'sine';

  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(0.8, when + 0.001);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.08);

  osc.connect(g);
  g.connect(audioCtx.destination);

  osc.start(when);
  osc.stop(when + 0.09);

  scheduledClicks.push({ when, osc, g });
}

// ------------------------------------------------------------
// START RECORDING AFTER COUNTDOWN
// ------------------------------------------------------------
function startRecordingAfterCountdown() {
  if (!audioCtx) audioCtx = new AudioContext();

  // TMP → REC
  midi.looperRecord();
  setTMPState("REC");

  recRecording = true;
  recRecordStartTime = audioCtx.currentTime;
  recRecordEndTime = recRecordStartTime + recLoopDuration;

  // AUDIO démarre en même temps
  playAudioLoop();

  scheduledClicks = [];
}

// ------------------------------------------------------------
// START REC SEQUENCE
// ------------------------------------------------------------
function startRecSequence() {
  if (settings.visible) return;

  if (loopViewer.active) {
    if (!audioBuffer) return;
    recLoopDuration = (loopViewer.loopEnd - loopViewer.loopStart) * audioBuffer.duration;
  } else if (midiViewer.active) {
    if (!midiDuration) return;
    recLoopDuration = midiDuration;
  }

  if (recLoopDuration <= 0.01) return;

  recBeatIntervalMs = (recLoopDuration / recBeats) * 1000;

  recCountdownStart = millis();
  isRecCountdown = true;
  recRecording = false;

  if (loopViewer.active && isPlayingMidi) stopMidiFile();
  if (midiViewer.active && isPlaying) stopAudio();

  if (!audioCtx) audioCtx = new AudioContext();
  const now = audioCtx.currentTime;
  const intervalSec = recBeatIntervalMs / 1000;

  for (let i = 0; i < recBeats; i++) {
    const when = now + i * intervalSec;
    playClickAt(when, i === 0);
  }
}

// ------------------------------------------------------------
// TRIGGER ACTION (boutons UI)
// ------------------------------------------------------------
function triggerAction(id) {

  switch (id) {

    case "record":

      // MODE AVEC AUDIO → countdown
      if (audioBuffer) {
        startRecSequence();
        return;
      }

      // MODE SANS AUDIO → CC direct
      midi.looperRecord();

      if (tmpLooperState === "STOP") setTMPState("REC");
      else if (tmpLooperState === "REC") setTMPState("OVERDUB");
      else if (tmpLooperState === "OVERDUB") setTMPState("REC");
      return;

    case "play":
      // TMP
      midi.looperPlayStop();

      // TMP state
      if (tmpLooperState === "STOP") setTMPState("PLAY");
      else setTMPState("STOP");

      // AUDIO (toujours en même temps)
      if (tmpLooperState === "PLAY") playAudioLoop();
      else pauseAudio();

      return;

    case "undo":
      midi.sendCC(105, 127);
      return;

    case "clear":
      midi.sendCC(106, 127);
      return;

    case "loopUp":
      midi.sendCC(7, 100);
      return;

    case "loopDown":
      midi.sendCC(7, 40);
      return;

    case "settings":
      settings.show();
      return;
  }
}

// ------------------------------------------------------------
// AUDIO
// ------------------------------------------------------------
function playAudioLoop() {
  if (!audioBuffer) return;
  if (!audioCtx) audioCtx = new AudioContext();

  if (isPlayingMidi) stopMidiFile();

  if (audioSource) {
    try { audioSource.stop(); } catch (e) {}
  }

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

  loopViewer.setActive(true);
  midiViewer.setActive(false);
  isPlayingMidi = false;
}

function stopAudio() {
  if (audioSource) {
    try { audioSource.stop(); } catch (e) {}
    audioSource = null;
  }
  pausedAt = 0;
  isPlaying = false;

  loopViewer.setActive(true);
  midiViewer.setActive(true);
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
      loopViewer.setAudioBuffer(decoded);
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

  if (isPlaying) {
    try { audioSource.stop(); } catch (e) {}
    audioSource = null;
    isPlaying = false;
  }

  midiStartTime = audioCtx.currentTime;
  isPlayingMidi = true;

  midiViewer.setActive(true);
  loopViewer.setActive(false);
}

function stopMidiFile() {
  isPlayingMidi = false;

  midiViewer.setActive(true);
  loopViewer.setActive(true);
}

// ------------------------------------------------------------
// INTERACTIONS
// ------------------------------------------------------------
function keyPressed() {
  if (settings.visible) {
    if (settings.activeField) {
      if (key >= '0' && key <= '9') {
        settings.params[settings.activeField] =
          int(String(settings.params[settings.activeField]) + key);
      }
      if (key === 'Backspace') {
        let s = String(settings.params[settings.activeField]);
        settings.params[settings.activeField] = int(s.slice(0, -1) || "0");
      }
    }
    return;
  }

  // SPACE = pré-écoute audio uniquement
  if (key === ' ') {
    if (isPlaying) pauseAudio();
    else playAudioLoop();
    return;
  }

  if (key === 'M') {
    if (isPlayingMidi) stopMidiFile();
    else playMidiFile();
  }
}

function mousePressed() {

  if (settings.visible &&
      mouseX > settings.closeX &&
      mouseX < settings.closeX + settings.closeW &&
      mouseY > settings.closeY &&
      mouseY < settings.closeY + settings.closeH) {
    settings.hide();
    return;
  }

  if (settings.visible) return;

  controls.mousePressed();

  if (mouseX > loopViewer.x && mouseX < loopViewer.x + loopViewer.w &&
      mouseY > loopViewer.y && mouseY < loopViewer.y + loopViewer.h) {

    loopViewer.setActive(true);
    midiViewer.setActive(false);
    if (isPlayingMidi) stopMidiFile();

    loopViewer.onClick(() => {
      fileInput.elt.accept = ".wav,.mp3";
      fileInput.elt.click();
    });
    loopViewer.mousePressed();
    return;
  }

  if (mouseX > midiViewer.x && mouseX < midiViewer.x + midiViewer.w &&
      mouseY > midiViewer.y && mouseY < midiViewer.y + midiViewer.h) {

    midiViewer.setActive(true);
    loopViewer.setActive(false);
    if (isPlaying) {
      try { audioSource.stop(); } catch (e) {}
      audioSource = null;
      isPlaying = false;
    }

    midiViewer.onClick(() => {
      midiFile.elt.accept = ".mid,.midi";
      midiFile.elt.click();
    });
    return;
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
