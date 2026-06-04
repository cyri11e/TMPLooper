// midi.js — version propre

let midiReady = false;
let fantom = null;
let tmp = null;

function initMIDI() {
  if (typeof WebMidi === "undefined") {
    console.error("WebMidi non chargé !");
    return;
  }

  WebMidi.enable()
    .then(() => {
      midiReady = true;
      console.log("WebMIDI OK");

      fantom = WebMidi.getOutputByName("FANTOM");
      tmp = WebMidi.getOutputByName("Tone Master Pro");

      console.log("Fantom:", fantom);
      console.log("TMP:", tmp);
    })
    .catch(err => console.error("Erreur MIDI:", err));
}

function sendCC(device, channel, cc, value) {
  if (!device) return;
  device.sendControlChange(cc, value, { channels: channel });
}
WebMidi.addListener("connected", e => {
  console.log("MIDI connecté:", e.port.name);
});

WebMidi.addListener("disconnected", e => {
  console.log("MIDI déconnecté:", e.port.name);
});

// Capture des messages MIDI IN
WebMidi.inputs.forEach(input => {
  input.addListener("controlchange", e => {
    console.log("CC IN", e.controller.number, e.value);

    // Exemple TMP :
    if (e.controller.number === 60) triggerAction("record");
    if (e.controller.number === 61) triggerAction("play");
    if (e.controller.number === 62) triggerAction("undo");
    if (e.controller.number === 63) triggerAction("clear");
  });

  input.addListener("noteon", e => {
    console.log("NOTE IN", e.note.number);

    // Si le TMP envoie des notes pour les footswitchs :
    if (e.note.number === 36) triggerAction("record");
    if (e.note.number === 37) triggerAction("play");
  });
});
