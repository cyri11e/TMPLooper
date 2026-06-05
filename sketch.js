// ------------------------------------------------------------
// sketch.js — version propre, complète, cohérente
// ------------------------------------------------------------

let loopViewer;
let midiViewer;
let controls;

let fileInput;        // WAV/MP3 loader
let midiFile;         // MIDI file loader
let midiInputDevice;  // MIDI IN externe (plus tard)

let audioBuffer = null;
let audioSource = null;

let audioDuration = 0;


let midiEvents = [];
let midiDuration = 0;
let isPlayingMidi = false;
let midiStartTime = 0;

let audioCtx = null;
let startTime = 0;
let pausedAt = 0;
let isPlaying = false;

// triggerAction : sendMidi=true quand déclenchée par l'UI, false quand reçue du hardware (anti-boucle)
function triggerAction(action, sendMidi = true) {
  const cfg = midiConfig[action];
  if (!cfg) return;

  if (sendMidi) {
    const parts = cfg.split(" ");
    if (parts[0] === "CC") {
      sendCC("tmp", 1, parseInt(parts[1]), parseInt(parts[2]));
    }
  }

  // Flash visuel sur le bouton correspondant (UI → hardware ET hardware → UI)
  if (controls) controls.flash(action);

  // Mémorise la dernière action pour l'affichage
  lastAction      = action;
  lastActionTime  = millis();
  lastActionFrom  = sendMidi ? "UI" : "TMP";

  console.log("Action:", action, sendMidi ? "→ TMP" : "← reçu du hardware");
}

let lastAction     = "";
let lastActionTime = -9999;
let lastActionFrom = "";

function drawMidiStatus() {
  const connected = midiReady && devices.tmp.output;
  push();
  noStroke();
  textAlign(LEFT, TOP);

  // ── Bloc debug en haut à gauche ──────────────────────────────
  fill(0, 180);
  rect(0, 0, 420, 58, 0, 0, 6, 0);

  const allOut = getMidiOutputNames();
  const allIn  = getMidiInputNames();

  textSize(11);
  fill(midiReady ? color(80, 230, 100) : color(230, 80, 80));
  text(midiReady ? "MIDI ✅" : "MIDI ❌  (pas d'accès)", 8, 6);

  fill(180);
  text(`OUT dispo: ${allOut.length ? allOut.join(" | ") : "aucun"}`, 8, 20);
  text(`IN  dispo: ${allIn.length  ? allIn.join(" | ")  : "aucun"}`, 8, 33);

  fill(connected ? color(80, 230, 100) : color(230, 180, 50));
  text(`TMP sélectionné: ${devices.tmp.outputName || "NON — ouvre ⚙ SETTINGS"}`, 8, 46);

  // ── Pastille + dernière action (haut droite) ─────────────────
  fill(connected ? color(50, 220, 80) : color(200, 50, 50));
  ellipse(width - 24, 16, 12, 12);
  textAlign(RIGHT, CENTER);
  fill(180);
  textSize(11);
  text(connected ? `TMP: ${devices.tmp.outputName}` : "TMP: non connecté", width - 34, 16);

  if (millis() - lastActionTime < 2000) {
    const alpha = map(millis() - lastActionTime, 0, 2000, 255, 0);
    fill(255, 200, 50, alpha);
    textSize(13);
    const arrow = lastActionFrom === "UI" ? "→ TMP" : "← TMP";
    text(`${lastAction.toUpperCase()}  ${arrow}`, width - 34, 34);
  }

  pop();
}

function playAudioLoop() {
  if (!audioBuffer) return;

  if (!audioCtx) audioCtx = new AudioContext();

  // Stop ancienne source
  if (audioSource) audioSource.stop();

  audioSource = audioCtx.createBufferSource();
  audioSource.buffer = audioBuffer;

  const loopStartSec = loopViewer.loopStart * audioBuffer.duration;
  const loopEndSec   = loopViewer.loopEnd   * audioBuffer.duration;

  audioSource.loop = true;
  audioSource.loopStart = loopStartSec;
  audioSource.loopEnd   = loopEndSec;

  audioSource.connect(audioCtx.destination);

  startTime = audioCtx.currentTime - pausedAt;
  audioSource.start(0, loopStartSec + pausedAt);

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


function setup() {
  createCanvas(1000, 700);

  // Viewers
  loopViewer = new LoopViewer(20, 20, width - 40, 200);
  midiViewer = new MidiViewer(20, 240, width - 40, 200);
  controls = new Controls(20, 460);

  // WAV/MP3 file picker
  fileInput = createFileInput(handleAudioFile);
  fileInput.hide();

  // MIDI file picker
  midiFile = createFileInput(handleMidiFile);
  midiFile.hide();

  // Settings UI (sélecteurs MIDI)
  initSettingsUI();

  // Init MIDI après le setup
  initMIDI();
}

function draw() {
  background(15);

  // AUDIO playhead
if (isPlaying && audioBuffer) {
  const t = getCurrentAudioTime();

  const loopStartSec = loopViewer.loopStart * audioBuffer.duration;
  const loopEndSec   = loopViewer.loopEnd   * audioBuffer.duration;

  let loopPos = t;

  // Clamp AVANT la loop
  if (loopPos < loopStartSec) {
    loopPos = loopStartSec;
    startTime = audioCtx.currentTime - loopPos;
  }

  // Clamp APRÈS la loop
  if (loopPos > loopEndSec) {
    loopPos = loopStartSec;
    startTime = audioCtx.currentTime - loopPos;
  }

  // Normalisation
  const norm = (loopPos - loopStartSec) / (loopEndSec - loopStartSec);
  loopViewer.setPlayhead(norm);
}



  // MIDI playhead
  if (isPlayingMidi && audioCtx && midiDuration > 0) {
    const t = (audioCtx.currentTime - midiStartTime) % midiDuration;
    midiViewer.setPlayhead(t / midiDuration);
  }

  loopViewer.draw();
  midiViewer.draw();
  controls.draw();
  drawMidiStatus();
  drawSettings();
}

// ------------------------------------------------------------
// AUDIO : WAV / MP3
// ------------------------------------------------------------

function handleAudioFile(file) {
  if (!file || !file.file) return;

  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  fetch(file.data)
    .then(r => r.arrayBuffer())
    .then(buf => audioCtx.decodeAudioData(buf))
    .then(decoded => {
      audioBuffer = decoded;
      audioDuration = decoded.duration;

      // waveform downsample
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

  reader.onload = (e) => {
    const arrayBuffer = e.target.result;
    parseMidiFile(arrayBuffer);
  };

  reader.readAsArrayBuffer(file.file);
}


function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function parseMidiFile(arrayBuffer) {
  const midi = new MIDIFile(arrayBuffer);

  const instrumentNames = extractInstrumentNames(midi);
  const events = midi.getMidiEvents();

  // canal → liste d'événements MUSICAUX
  const channels = {};

  let maxTime = 0;

  for (let e of events) {

    // On ne garde QUE les événements musicaux
    const musical =
      e.type === 8 ||   // NoteOff
      e.type === 9 ||   // NoteOn
      e.type === 11;    // CC

    if (!musical) continue;

    // Certains meta-events ont un "channel" fantôme → on ignore
    if (typeof e.channel !== "number") continue;
    if (e.channel < 0 || e.channel > 15) continue;

    const t = e.playTime / 1000;

    if (!channels[e.channel]) channels[e.channel] = [];

    channels[e.channel].push({
      time: t,
      channel: e.channel
    });

    if (t > maxTime) maxTime = t;
  }

  // Aplatir en une seule liste
  let parsed = [];
  for (let ch in channels) {
    parsed.push(...channels[ch]);
  }

  midiViewer.setEvents(parsed, maxTime, instrumentNames);
}



function playMidiFile() {
  if (!audioCtx || !midiDuration) return;

  midiStartTime = audioCtx.currentTime;
  isPlayingMidi = true;
}

function stopMidiFile() {
  isPlayingMidi = false;
}

function extractInstrumentNames(midi) {
  const names = {};
  const decoder = new TextDecoder();

  for (let t = 0; t < midi.tracks.length; t++) {
    const events = midi.getTrackEvents(t);

    for (let e of events) {
      if (e.type === MIDIFile.EVENT_META &&
          e.subtype === MIDIFile.EVENT_META_INSTRUMENT_NAME) {

        const name = decoder.decode(e.data || new Uint8Array());
        if (typeof e.channel === "number") {
          names[e.channel] = name;
        }
      }
    }
  }

  return names;
}

// ------------------------------------------------------------
// INTERACTIONS
// ------------------------------------------------------------

function keyPressed() {
  if (key === ' ') {
    if (isPlaying) {
      pauseAudio();   // ou stopAudio() si tu veux stop net
    } else {
      playAudioLoop();
    }
  }

  if (key === 'M') {
    if (isPlayingMidi) stopMidiFile();
    else playMidiFile();
  }
}

// ------------------------------------------------------------
// INTERACTIONS SOURIS — VERSION PRO
// ------------------------------------------------------------

function mousePressed() {

  // --- LOOP VIEWER ---
  if (loopViewer.isHovered()) {

    // Double‑clic → ouvrir fichier audio
    loopViewer.onClick(() => {
      fileInput.elt.accept = ".wav,.mp3";
      fileInput.elt.click();
    });

    // Drag des loop handles
    loopViewer.mousePressed();
  }

  // --- MIDI VIEWER ---
  if (midiViewer.isHovered()) {

    // Double‑clic → ouvrir fichier MIDI
    midiViewer.onClick(() => {
      midiFile.elt.accept = ".mid,.midi";
      midiFile.elt.click();
    });

    // (Pas de drag dans midiViewer pour l’instant)
  }

  // --- CONTROLS (boutons TMP + settings) ---
  controls.mousePressed();
}

function mouseReleased() {
  loopViewer.mouseReleased();
  // midiViewer n’a pas de drag pour l’instant
}

function mouseDragged() {
  loopViewer.mouseDragged();
  // midiViewer n’a pas de drag pour l’instant
}

function mouseWheel(event) {

  // --- ZOOM LOOP VIEWER ---
  if (loopViewer.isHovered()) {
    loopViewer.onWheel(event.deltaY);
    return false; // empêche le scroll de la page
  }

  // --- ZOOM MIDI VIEWER ---
  if (midiViewer.isHovered()) {
    midiViewer.onWheel(event.deltaY);
    return false;
  }
}
