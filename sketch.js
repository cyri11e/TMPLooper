// ------------------------------------------------------------
// sketch.js — version complète avec SettingsPanel (corrigé)
// REC : compte à rebours 4 temps plein écran, envoi MIDI start/stop TMP
// + bip métronome sur chaque temps
// SPACE = play/stop pour la source active
// selection source par clic, arrêt lecture de l'autre source à la bascule
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

// -------------------- REC / countdown state --------------------
let isRecCountdown = false;        // true pendant le 1..4 visuel
let recCountdownStart = 0;         // millis() du début du countdown
let recBeatIntervalMs = 0;         // durée d'un temps en ms
let recLoopDuration = 0;           // durée totale de la boucle en secondes
let recBeats = 4;                  // 4 temps
let recRecording = false;          // true pendant l'enregistrement (après countdown)
let recRecordStartTime = 0;        // audioCtx.currentTime au début de l'enregistrement
let recRecordEndTime = 0;          // audioCtx.currentTime prévu de fin

// pour annuler les clicks programmés si besoin
let scheduledClicks = []; // tableau de {time, id} non strictement nécessaire mais pratique
// ---------------------------------------------------------------

function setup() {
  createCanvas(1000, 700);

  // VIEWERS
  loopViewer = new LoopViewer(20, 20, width - 40, 200);
  midiViewer = new MidiViewer(20, 240, width - 40, 200);
  controls = new Controls(20, 460);

  // both active by default
  loopViewer.setActive(true);
  midiViewer.setActive(true);

  // FILE PICKERS
  fileInput = createFileInput(handleAudioFile);
  fileInput.hide();

  midiFile = createFileInput(handleMidiFile);
  midiFile.hide();

  // MIDI
  midi = new MidiManager();
  midi.init();

  // SETTINGS PANEL
  settings = new SettingsPanel(midi);

  controls.settingsBtn.action = () => {
    settings.show();
  };
}

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

  // DRAW UI (viewers, controls, overlay MIDI, settings)
  loopViewer.draw();
  midiViewer.draw();
  controls.draw();
  midi.drawOverlay(width - 380, height - 160);
  settings.draw();

  // Fin d'enregistrement automatique (timing basé sur audioCtx)
if (recRecording && audioCtx) {
  if (audioCtx.currentTime >= recRecordEndTime) {

    // 1) STOP looper TMP
    midi.looperPlayStop(); // CC 104

    // 2) Fin d’enregistrement interne
    recRecording = false;

    // 3) Réactiver les viewers
    midiViewer.setActive(true);
    loopViewer.setActive(true);
  }
}


  // IMPORTANT : draw countdown overlay LAST so it's on top of UI
  if (isRecCountdown) {
    drawCountdownOverlay();
  }
}

// ------------------------------------------------------------
// Dessine le plein écran 1..4 au tempo calculé
// ------------------------------------------------------------
function drawCountdownOverlay() {
  const elapsed = millis() - recCountdownStart;
  const beatIndex = floor(elapsed / recBeatIntervalMs); // 0..3
  const displayBeat = constrain(beatIndex, 0, recBeats - 1);

  // fond semi-opaque
  push();
  fill(0, 220);
  rect(0, 0, width, height);

  // grand chiffre centré
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(min(width, height) * 0.28);
  text(String(displayBeat + 1), width / 2, height / 2);

  // petit texte tempo et info
  textSize(18);
  textAlign(CENTER, BOTTOM);
  const bpmApprox = 60 / (recBeatIntervalMs / 1000);
  text(`BPM ≈ ${nf(bpmApprox, 0, 1)}`, width / 2, height - 40);

  pop();

  // si countdown terminé, lancer l'enregistrement et la boucle
  if (elapsed >= recBeatIntervalMs * recBeats) {
    isRecCountdown = false;
    startRecordingAfterCountdown();
  }
}

// ------------------------------------------------------------
// Joue un click court à un instant précis (audioCtx scheduling)
// ------------------------------------------------------------
function playClickAt(when, isDownbeat = false) {
  if (!audioCtx) audioCtx = new AudioContext();

  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();

  // pitch différent pour le 1er temps
  osc.frequency.value = isDownbeat ? 1200 : 900;
  osc.type = 'sine';

  // enveloppe très courte
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(0.8, when + 0.001);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.08);

  osc.connect(g);
  g.connect(audioCtx.destination);

  osc.start(when);
  osc.stop(when + 0.09);

  // store scheduled click for potential cancellation
  scheduledClicks.push({ when, osc, g });
}

// ------------------------------------------------------------
// Démarre la séquence d'enregistrement (appelée après le countdown)
// ------------------------------------------------------------
function startRecordingAfterCountdown() {
  // ensure audio context exists for timing
  if (!audioCtx) audioCtx = new AudioContext();

  // send MIDI message to TMP to start recording
  midi.looperRecord(); // envoi CC 103 127
  recRecording = true;
  recRecordStartTime = audioCtx.currentTime;
  recRecordEndTime = recRecordStartTime + recLoopDuration;

  // lancer la lecture de la boucle (selon la source active)
  if (loopViewer.active) {
    // start audio loop playback at loop start
    playAudioLoop();
  } else if (midiViewer.active) {
    // start midi playback
    playMidiFile();
  }

  // clear scheduled clicks array (they already fired)
  scheduledClicks = [];
}

// ------------------------------------------------------------
// Déclenche la séquence REC : calcule BPM, lance le countdown plein écran
// ------------------------------------------------------------
function startRecSequence() {
  // ne pas lancer si settings ouvert
  if (settings.visible) return;

  // determine active loop duration
  if (loopViewer.active) {
    if (!audioBuffer) {
      console.warn("Aucun buffer audio chargé pour la boucle.");
      return;
    }
    recLoopDuration = (loopViewer.loopEnd - loopViewer.loopStart) * audioBuffer.duration;
  } else if (midiViewer.active) {
    if (!midiDuration || midiDuration <= 0) {
      console.warn("Aucun fichier MIDI chargé pour la boucle.");
      return;
    }
    recLoopDuration = midiDuration;
  } else {
    console.warn("Aucune source active.");
    return;
  }

  // sécurité : durée minimale
  if (recLoopDuration <= 0.01) {
    console.warn("Durée de boucle trop courte.");
    return;
  }

  // calcul BPM : BPM = 60 / (loopDuration / 4)
  const bpm = 60 / (recLoopDuration / recBeats);
  // intervalle d'un temps en ms
  recBeatIntervalMs = (recLoopDuration / recBeats) * 1000;

  // store for overlay
  recCountdownStart = millis();
  isRecCountdown = true;
  recRecording = false;

  // when starting countdown, ensure the other source is stopped
  if (loopViewer.active && isPlayingMidi) {
    stopMidiFile();
  }
  if (midiViewer.active && isPlaying) {
    stopAudio();
  }

  // visually ensure active viewer is highlighted
  loopViewer.setActive(loopViewer.active);
  midiViewer.setActive(midiViewer.active);

  // schedule metronome clicks precisely using audioCtx
  if (!audioCtx) audioCtx = new AudioContext();
  const now = audioCtx.currentTime;
  const intervalSec = recBeatIntervalMs / 1000;

  // schedule 4 clicks (one per beat). first beat is downbeat (isDownbeat=true)
  for (let i = 0; i < recBeats; i++) {
    const when = now + i * intervalSec;
    playClickAt(when, i === 0);
  }
}

// ------------------------------------------------------------
// triggerAction : relie les boutons Controls à des actions
// ------------------------------------------------------------
function triggerAction(id) {

  // --- MODE TMP DIRECT : aucun fichier audio chargé ---
  const noAudio = !audioBuffer;

  if (noAudio) {
    switch (id) {
      case "record":
        midi.looperRecord();   // CC 103
        return;

      case "play":
        midi.looperPlayStop(); // CC 104
        return;

      case "undo":
        midi.sendCC(105, 127); // ou CC réel si différent
        return;

      case "clear":
        midi.sendCC(106, 127); // ou CC réel si différent
        return;

      case "loopUp":
        midi.sendCC(7, 100);   // Master Volume + (à adapter)
        return;

      case "loopDown":
        midi.sendCC(7, 40);    // Master Volume - (à adapter)
        return;

      case "settings":
        settings.show();
        return;
    }
  }

  // --- MODE NORMAL : audio chargé ---
  switch (id) {
    case "record":
      startRecSequence();
      break;

    case "play":
      if (loopViewer.active) {
        if (isPlaying) pauseAudio();
        else playAudioLoop();
      } else if (midiViewer.active) {
        if (isPlayingMidi) stopMidiFile();
        else playMidiFile();
      }
      break;

    case "undo":
      console.log("undo action");
      break;

    case "clear":
      console.log("clear action");
      break;

    case "loopUp":
      console.log("loopUp");
      break;

    case "loopDown":
      console.log("loopDown");
      break;

    case "settings":
      settings.show();
      break;
  }
}


// ------------------------------------------------------------
// AUDIO
// ------------------------------------------------------------

function playAudioLoop() {
  if (!audioBuffer) return;
  if (!audioCtx) audioCtx = new AudioContext();

  // stop any MIDI playback when starting audio
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

  // make audio viewer active, midi viewer inactive
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

  // restore both viewers active
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
      // passe le buffer complet au viewer (pyramide construite en interne)
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

  // stop any audio playback when starting midi
  if (isPlaying) {
    try { audioSource.stop(); } catch (e) {}
    audioSource = null;
    isPlaying = false;
  }

  midiStartTime = audioCtx.currentTime;
  isPlayingMidi = true;

  // make midi viewer active, loop viewer inactive
  midiViewer.setActive(true);
  loopViewer.setActive(false);
}

function stopMidiFile() {
  isPlayingMidi = false;

  // restore both viewers active
  midiViewer.setActive(true);
  loopViewer.setActive(true);
}

// ------------------------------------------------------------
// INTERACTIONS
// ------------------------------------------------------------

function keyPressed() {
  // If settings panel visible, handle only its editing keys and block global shortcuts
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
    return; // block other shortcuts while settings open
  }

  // SPACE toggles play/stop for the active source
  if (key === ' ') {
    if (loopViewer.active) {
      if (isPlaying) pauseAudio();
      else playAudioLoop();
      return;
    }
    if (midiViewer.active) {
      if (isPlayingMidi) stopMidiFile();
      else playMidiFile();
      return;
    }
    if (isPlaying) pauseAudio();
    else playAudioLoop();
  }

  // legacy MIDI shortcut (M)
  if (key === 'M') {
    if (isPlayingMidi) stopMidiFile();
    else playMidiFile();
  }
}

function mousePressed() {

  // Fermeture SettingsPanel (hitbox correcte)
  if (settings.visible &&
      mouseX > settings.closeX &&
      mouseX < settings.closeX + settings.closeW &&
      mouseY > settings.closeY &&
      mouseY < settings.closeY + settings.closeH) {
    settings.hide();
    return;
  }

  // SettingsPanel interactions
  if (settings.visible) return;

  // Controls
  controls.mousePressed();

  // LoopViewer selection + interactions
  if (mouseX > loopViewer.x && mouseX < loopViewer.x + loopViewer.w &&
      mouseY > loopViewer.y && mouseY < loopViewer.y + loopViewer.h) {
    // select audio as active source and stop MIDI if playing
    loopViewer.setActive(true);
    midiViewer.setActive(false);
    if (isPlayingMidi) stopMidiFile();

    // double click file picker
    loopViewer.onClick(() => {
      fileInput.elt.accept = ".wav,.mp3";
      fileInput.elt.click();
    });
    loopViewer.mousePressed();
    return;
  }

  // MidiViewer selection + interactions
  if (mouseX > midiViewer.x && mouseX < midiViewer.x + midiViewer.w &&
      mouseY > midiViewer.y && mouseY < midiViewer.y + midiViewer.h) {
    // select midi as active source and stop audio if playing
    midiViewer.setActive(true);
    loopViewer.setActive(false);
    if (isPlaying) {
      try { audioSource.stop(); } catch (e) {}
      audioSource = null;
      isPlaying = false;
    }

    // double click file picker
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
