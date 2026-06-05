// midi.js — API MIDI native bidirectionnelle (navigator.requestMIDIAccess)

let midiAccess = null;
let midiReady  = false;

// Devices : { input, output, inputName, outputName }
const devices = {
  tmp:    { input: null, output: null, inputName: "", outputName: "" },
  fantom: { input: null, output: null, inputName: "", outputName: "" }
};

// Moniteur : { portName → [{ dir, label, time }, ...] }
const midiMonitor = {};
const MONITOR_MAX = 10;

function _monitorAdd(portName, dir, label) {
  if (!portName) return;
  if (!midiMonitor[portName]) midiMonitor[portName] = [];
  midiMonitor[portName].unshift({
    dir,
    label,
    time: new Date().toLocaleTimeString("fr", { hour12: false })
  });
  if (midiMonitor[portName].length > MONITOR_MAX)
    midiMonitor[portName].pop();
}

async function initMIDI() {
  if (!navigator.requestMIDIAccess) {
    console.warn("Web MIDI API non supportée.");
    return;
  }
  try {
    midiAccess = await navigator.requestMIDIAccess();
    midiReady  = true;
    console.log("MIDI prêt ✅");

    // Auto-détection
    for (let out of midiAccess.outputs.values()) {
      if (!devices.tmp.outputName && out.name.toLowerCase().includes("tone master pro")) {
        devices.tmp.output     = out;
        devices.tmp.outputName = out.name;
      }
      if (!devices.fantom.outputName && (out.name.toUpperCase().includes("FANTOM"))) {
        devices.fantom.output     = out;
        devices.fantom.outputName = out.name;
      }
    }
    for (let inp of midiAccess.inputs.values()) {
      if (!devices.tmp.inputName && inp.name.toLowerCase().includes("tone master pro")) {
        devices.tmp.inputName = inp.name;
      }
      if (!devices.fantom.inputName && inp.name.toUpperCase().includes("FANTOM")) {
        devices.fantom.inputName = inp.name;
      }
    }

    midiAccess.onstatechange = () => {
      _rebindInputListeners();
      if (typeof refreshMidiSelects === "function") refreshMidiSelects();
    };

    _rebindInputListeners();
    if (typeof refreshMidiSelects === "function") refreshMidiSelects();

  } catch (err) {
    console.error("Erreur MIDI :", err);
  }
}

// ── Listes de noms ────────────────────────────────────────────
function getMidiOutputNames() {
  if (!midiAccess) return [];
  return Array.from(midiAccess.outputs.values()).map(o => o.name);
}
function getMidiInputNames() {
  if (!midiAccess) return [];
  return Array.from(midiAccess.inputs.values()).map(i => i.name);
}

// ── Sélection des devices ─────────────────────────────────────
function setDeviceOutput(role, name) {
  if (!devices[role]) return;
  devices[role].outputName = name;
  devices[role].output     = null;
  if (!midiAccess || !name) return;
  for (let out of midiAccess.outputs.values()) {
    if (out.name === name) { devices[role].output = out; break; }
  }
  console.log(`[${role}] sortie →`, name, devices[role].output ? "✅" : "❌");
}

function setDeviceInput(role, name) {
  if (!devices[role]) return;
  devices[role].inputName = name;
  _rebindInputListeners();
  console.log(`[${role}] entrée →`, name || "(aucune)");
}

// ── Binding des entrées ───────────────────────────────────────
function _rebindInputListeners() {
  if (!midiAccess) return;
  for (let input of midiAccess.inputs.values()) {
    const role = _roleForInputName(input.name);
    if (role) {
      const r = role; const n = input.name;
      input.onmidimessage = (msg) => _handleMIDIMessage(r, n, msg);
    } else {
      input.onmidimessage = null;
    }
  }
}

function _roleForInputName(name) {
  for (let role of ["tmp", "fantom"]) {
    if (devices[role].inputName === name) return role;
  }
  return null;
}

// ── Handler entrant ───────────────────────────────────────────
function _handleMIDIMessage(role, portName, msg) {
  if (!msg || !msg.data) return;
  const [status, data1, data2] = msg.data;
  const command = status & 0xF0;

  if (command === 0xB0) {                         // Control Change
    _monitorAdd(portName, "IN", `CC ${data1}  val:${data2}`);
    console.log(`[${role}] CC IN`, data1, data2);
    // Routing vers les actions UI (sans re-envoyer le CC → anti-boucle)
    if (role === "tmp" || role === "fantom") {
      if (data1 === 60) triggerAction("record", false);
      if (data1 === 61) triggerAction("play",   false);
      if (data1 === 62) triggerAction("undo",   false);
      if (data1 === 63) triggerAction("clear",  false);
    }
  } else if (command === 0x90 && data2 > 0) {     // Note On
    _monitorAdd(portName, "IN", `NoteOn ${data1}  vel:${data2}`);
    if (role === "tmp") {
      if (data1 === 36) triggerAction("record", false);
      if (data1 === 37) triggerAction("play",   false);
    }
  } else if (command === 0x80 || (command === 0x90 && data2 === 0)) {
    _monitorAdd(portName, "IN", `NoteOff ${data1}`);
  }
}

// ── Envoi CC ──────────────────────────────────────────────────
function sendCC(role, channel, cc, value) {
  const dev = devices[role];
  if (!dev || !dev.output) return;
  dev.output.send([0xB0 + (channel - 1), cc, value]);
  _monitorAdd(dev.outputName, "OUT", `CC ${cc}  val:${value}`);
}

// ── Accesseur moniteur ────────────────────────────────────────
function getMidiMonitor() { return midiMonitor; }
