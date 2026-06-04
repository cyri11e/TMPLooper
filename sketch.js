// sketch.js — UI principale p5.js (100% compatible)
let audioCtx;
let audioBuffer = null;
let audioSource = null;
let audioStartTime = 0;
let audioDuration = 0;
let isPlaying = false;

let loopViewer;
let midiViewer;
let controls;

let bpm = 120;
let settingsVisible = false;
let midiFileData = null;
let midiDuration = 0;
let isPlayingMidi = false;
let midiStartTime = 0;

function playMidi() {
  if (!audioCtx || !midiDuration) return;

  midiStartTime = audioCtx.currentTime;
  isPlayingMidi = true;
}

function stopMidi() {
  isPlayingMidi = false;
}


function handleMidiFile(file) {
  if (!file || !file.file) return;

  const buffer = base64ToArrayBuffer(file.data.split(",")[1]);
  parseMidi(buffer);
}

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function parseMidi(arrayBuffer) {
  const midi = new MIDIFile(arrayBuffer);

  const events = midi.getMidiEvents();
  const tempo = midi.header.getTicksPerBeat();
  const tracks = midi.tracks;

  let parsed = [];
  let maxTime = 0;

  for (let e of events) {
    if (e.type !== 8 && e.type !== 9 && e.type !== 11) continue; // note on/off/CC

    const t = e.playTime / 1000; // ms → s
    parsed.push({
      time: t,
      channel: e.channel
    });

    if (t > maxTime) maxTime = t;
  }

  midiDuration = maxTime;
  midiViewer.setEvents(parsed, midiDuration);
}

// Données temporaires pour affichage (en attendant les vrais devices)
let fakeMidiEvents = [
  { time: 0, type: "NoteOn", value: 60 },
  { time: 120, type: "NoteOff", value: 60 },
  { time: 240, type: "CC", value: "7=100" }
];

let fakeWave = new Array(200).fill(0).map((_, i) =>
  Math.sin(i * 0.15) * 0.6
);

let fileInput;

function setup() {
  createCanvas(900, 600);

  initMIDI();

  loopViewer = new LoopViewer(0, 0, width, 200);
  midiViewer = new MidiViewer(0, 200, width, 200);
  controls = new Controls(0, 400, width, 200);

  // Input fichier audio (invisible)
  fileInput = createFileInput(handleAudioFile);
  fileInput.hide();
}

function draw() {
  background(20);

  // update playhead
  if (isPlaying && audioCtx && audioDuration > 0) {
    const t = (audioCtx.currentTime - audioStartTime) % audioDuration;
    const norm = t / audioDuration;
    loopViewer.setPlayhead(norm);
  }

  loopViewer.draw();
  midiViewer.draw();
  controls.draw();
  drawBPM();
  drawSettingsWindow();
  if (isPlayingMidi) {
    const t = (audioCtx.currentTime - midiStartTime) % midiDuration;
    midiViewer.setPlayhead(t / midiDuration);
  }

}

/* ------------------------------------------
   BPM
------------------------------------------- */
function drawBPM() {
  fill(255);
  textSize(20);
  text("BPM : " + bpm, 20, 380);
}

/* ------------------------------------------
   Fenêtre Paramètres
------------------------------------------- */
function drawSettingsWindow() {
  if (!settingsVisible) return;

  push();
  fill(0, 200);
  noStroke();
  rect(50, 50, width - 100, height - 100, 10);

  fill(255);
  textSize(24);
  text("Paramètres MIDI", 80, 100);

  textSize(16);
  let y = 160;

  for (let key in midiConfig) {
    text(`${key} : ${midiConfig[key]}`, 80, y);
    y += 30;
  }

  pop();
}

/* ------------------------------------------
   INPUTS
------------------------------------------- */
function keyPressed() {
  if (key === 'R') triggerAction("record");
  if (key === 'P') triggerAction("play");
  if (key === 'U') triggerAction("undo");
  if (key === 'C') triggerAction("clear");

  if (key === '-') triggerAction("loopDown");
  if (key === '+') triggerAction("loopUp");

  if (key === 'S') triggerAction("settings");
  if (key === ' ') {
    if (isPlaying) stopLoop();
    else playLoop();
  }
}


function mousePressed() {
  // Boutons TMP
  controls.mousePressed();

  // Viewer WAV = bouton
  if (loopViewer.isHovered()) {
    fileInput.elt.accept = ".wav,.mp3";
    fileInput.elt.click();
  }
  if (midiViewer.isHovered()) {
    midiInput.elt.accept = ".mid,.midi";
    midiInput.elt.click();
  }

}

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

      // waveform downsamplée
      const raw = decoded.getChannelData(0);
      const samples = 400;
      const block = Math.floor(raw.length / samples);
      const wave = [];
      for (let i = 0; i < samples; i++) {
        wave.push(raw[i * block]);
      }
      loopViewer.updateWave(wave);
    })
    .catch(err => console.error("decodeAudioData:", err));
}


function decodeAudioBuffer(arrayBuffer) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();

  ctx.decodeAudioData(arrayBuffer)
    .then(decoded => {
      const raw = decoded.getChannelData(0);
      const samples = 300; // résolution de la waveform
      const block = Math.floor(raw.length / samples);
      const wave = [];

      for (let i = 0; i < samples; i++) {
        wave.push(raw[i * block]);
      }

      loopViewer.updateWave(wave);
    })
    .catch(err => console.error("Erreur decodeAudioData:", err));
}

function playLoop() {
  if (!audioBuffer || !audioCtx) return;

  stopLoop();

  audioSource = audioCtx.createBufferSource();
  audioSource.buffer = audioBuffer;
  audioSource.loop = true;
  audioSource.connect(audioCtx.destination);
  audioSource.start();

  audioStartTime = audioCtx.currentTime;
  isPlaying = true;
}

function stopLoop() {
  if (audioSource) {
    try { audioSource.stop(); } catch(e) {}
    audioSource.disconnect();
    audioSource = null;
  }
  isPlaying = false;
}
