// sketch.js — UI et interactions uniquement

let loopViewer, midiViewer, controls, settings;
let fileInput, midiFile;
let syncController; // importé/instancié
let midi; // ton MidiManager existant

function setup() {
  createCanvas(1000, 700);

  loopViewer = new LoopViewer(20, 20, width - 40, 200);
  midiViewer = new MidiViewer(20, 240, width - 40, 200);
  controls = new Controls(20, 460);

  fileInput = createFileInput(handleAudioFile);
  fileInput.hide();

  midiFile = createFileInput(handleMidiFile);
  midiFile.hide();

  midi = new MidiManager();
  midi.init();

  // Initialise le controller en lui passant les objets nécessaires
  syncController = new SyncController();
  syncController.init({ midi, loopViewer });

  controls.settingsBtn.action = () => settings.show();
}

function draw() {
  background(15);

  // Délégué au controller : resync smooth et état audio
  syncController.update();

  // Playheads et UI (sketch garde l'affichage)
  loopViewer.draw();
  midiViewer.draw();
  controls.draw();
  midi.drawOverlay(width - 380, height - 160);
  settings.draw();

  if (syncController.isRecCountdown()) {
    drawCountdownOverlay(syncController.getRecCountdownState());
  }
}

function drawCountdownOverlay(state) {
  // state contient elapsed, beatIndex, recBeats, recBeatIntervalMs
  const elapsed = state.elapsed;
  const displayBeat = constrain(floor(elapsed / state.recBeatIntervalMs), 0, state.recBeats - 1);

  push();
  fill(0, 220);
  rect(0, 0, width, height);
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(min(width, height) * 0.28);
  text(String(displayBeat + 1), width / 2, height / 2);
  pop();
}

// Interactions utilisateur -> on délègue au controller
function triggerAction(id) {
  switch (id) {
    case "record":
      syncController.requestRecord();
      return;
    case "play":
      syncController.togglePlay();
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

function keyPressed() {
  if (key === ' ') {
    syncController.togglePreview(); // SPACE = pré-écoute audio uniquement
    return;
  }
  if (key === 'M') {
    syncController.toggleMidiPlayback();
  }
}

function handleAudioFile(file) {
  if (!file || !file.file) return;
  syncController.loadAudioFile(file);
}

function handleMidiFile(file) {
  if (!file || !file.file) return;
  syncController.loadMidiFile(file);
}
