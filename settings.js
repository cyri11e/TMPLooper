// settings.js

let midiConfig = {
  record:   "CC 60 127",
  play:     "CC 61 127",
  undo:     "CC 62 127",
  clear:    "CC 63 127",
  loopUp:   "CC 64 127",
  loopDown: "CC 65 127",
  half:     "CC 66 127",
  reverse:  "CC 67 127",
  oneshot:  "CC 68 127"
};

let settingsVisible = false;

// 4 selects : sortie+entrée × TMP+FANTOM
// positions calées sur le panneau rect(50,50,width-100,height-100)
const SEL_DEFS = [
  { role: "tmp",    dir: "output", placeholder: "-- Sortie TMP --",    x: 80,  y: 138 },
  { role: "tmp",    dir: "input",  placeholder: "-- Entrée TMP --",    x: 80,  y: 174 },
  { role: "fantom", dir: "output", placeholder: "-- Sortie Fantom --", x: 510, y: 138 },
  { role: "fantom", dir: "input",  placeholder: "-- Entrée Fantom --", x: 510, y: 174 },
];

const midiSelects = {}; // { "tmp-output": p5.Element, ... }

function initSettingsUI() {
  for (const def of SEL_DEFS) {
    const key = `${def.role}-${def.dir}`;
    const sel = createSelect();
    sel.option(def.placeholder, "");
    sel.position(def.x, def.y);
    sel.style("width",         "370px");
    sel.style("background",    "#0d0d1a");
    sel.style("color",         "#e0e0ff");
    sel.style("border",        "1px solid #445");
    sel.style("border-radius", "4px");
    sel.style("padding",       "4px 8px");
    sel.style("font-size",     "13px");
    sel.style("cursor",        "pointer");
    sel.hide();

    const role = def.role, dir = def.dir, ph = def.placeholder;
    sel.changed(() => {
      if (dir === "output") setDeviceOutput(role, sel.value());
      else                  setDeviceInput(role,  sel.value());
    });

    midiSelects[key] = sel;
  }
}

function refreshMidiSelects() {
  const outputs = getMidiOutputNames();
  const inputs  = getMidiInputNames();

  for (const def of SEL_DEFS) {
    const key  = `${def.role}-${def.dir}`;
    const sel  = midiSelects[key];
    if (!sel) continue;

    const names = def.dir === "output" ? outputs : inputs;
    sel.elt.innerHTML = `<option value="">${def.placeholder}</option>`;
    for (const name of names) {
      const opt = document.createElement("option");
      opt.value = name; opt.textContent = name;
      sel.elt.appendChild(opt);
    }

    // Sélectionne le device courant (auto-détecté ou choisi)
    const dev     = devices[def.role];
    const current = def.dir === "output" ? dev.outputName : dev.inputName;
    if (current) sel.selected(current);
  }
}

function openSettings() {
  settingsVisible = !settingsVisible;
  _syncSelectVisibility();
}

function _syncSelectVisibility() {
  for (const key in midiSelects) {
    settingsVisible ? midiSelects[key].show() : midiSelects[key].hide();
  }
}

// ── Dessin du panneau ─────────────────────────────────────────
function drawSettings() {
  if (!settingsVisible) return;

  push();
  noStroke();

  // Fond semi-transparent
  fill(8, 8, 20, 235);
  rect(50, 50, width - 100, height - 100, 10);

  textAlign(LEFT, TOP);

  // ── Titre
  fill(255);
  textSize(20);
  text("⚙  Paramètres MIDI", 80, 68);

  // ── Séparateur
  stroke(60, 80, 140);
  strokeWeight(1);
  line(80, 100, width - 80, 100);
  noStroke();

  // ── En-têtes colonnes
  fill(120, 170, 255);
  textSize(12);
  text("TONE MASTER PRO", 80, 106);
  text("FANTOM 06", 510, 106);

  // Labels au-dessus des selects HTML
  fill(160, 170, 200);
  textSize(11);
  text("Sortie (MIDI OUT →)", 80,  125);
  text("Entrée (MIDI IN ←)",  80,  161);
  text("Sortie (MIDI OUT →)", 510, 125);
  text("Entrée (MIDI IN ←)",  510, 161);

  // ── Section Moniteur
  noStroke();
  stroke(60, 80, 140);
  strokeWeight(1);
  line(80, 213, width - 80, 213);
  noStroke();

  fill(120, 170, 255);
  textSize(12);
  text("MONITEUR MIDI EN TEMPS RÉEL", 80, 220);

  const monH = height - 100 - 240 - 15;   // hauteur dispo pour les boxes
  _drawMonitorBox(80,  240, (width - 100 - 50) / 2 - 10, monH, "tmp",    "Tone Master Pro");
  _drawMonitorBox(80 + (width - 100 - 50) / 2 + 10, 240, (width - 100 - 50) / 2 - 10, monH, "fantom", "Fantom 06");

  pop();
}

function _drawMonitorBox(x, y, w, h, role, title) {
  const monitor = typeof getMidiMonitor === "function" ? getMidiMonitor() : {};
  const dev = devices[role];

  // Collecte les messages des ports IN et OUT du device
  let msgs = [];
  if (dev) {
    for (const portName of [dev.inputName, dev.outputName]) {
      if (portName && monitor[portName]) msgs.push(...monitor[portName]);
    }
  }
  // Tri par heure décroissante (les plus récents en premier)
  msgs.sort((a, b) => b.time.localeCompare(a.time));

  // Boîte
  stroke(50, 80, 150);
  strokeWeight(1);
  fill(12, 12, 30);
  rect(x, y, w, h, 6);

  // Titre de la box
  noStroke();
  const connected = dev && (dev.inputName || dev.outputName);
  fill(connected ? color(140, 200, 255) : color(120, 120, 140));
  textSize(12);
  textAlign(LEFT, TOP);
  text(title + (connected ? "" : "  (non configuré)"), x + 10, y + 8);

  // Indicateurs IN / OUT
  const inOk  = dev && dev.inputName;
  const outOk = dev && dev.outputName;
  fill(inOk  ? color(80, 220, 100) : color(80, 80, 80));
  rect(x + w - 54, y + 7, 20, 12, 3);
  fill(255);
  textSize(9);
  text("IN",  x + w - 51, y + 9);

  fill(outOk ? color(240, 160, 50) : color(80, 80, 80));
  rect(x + w - 30, y + 7, 22, 12, 3);
  fill(255);
  text("OUT", x + w - 28, y + 9);

  // Séparateur interne
  stroke(40, 60, 110);
  strokeWeight(1);
  line(x + 1, y + 26, x + w - 1, y + 26);
  noStroke();

  // Messages
  const lineH   = 15;
  const maxLines = floor((h - 34) / lineH);

  if (msgs.length === 0) {
    fill(80, 80, 100);
    textSize(11);
    text("En attente…", x + 10, y + 32);
  } else {
    for (let i = 0; i < min(msgs.length, maxLines); i++) {
      const m = msgs[i];
      fill(m.dir === "IN" ? color(80, 230, 110) : color(255, 175, 50));
      textSize(11);
      text(`${m.dir}  ${m.label}`, x + 10, y + 32 + i * lineH);
      fill(100, 110, 140);
      textAlign(RIGHT, TOP);
      text(m.time, x + w - 8, y + 32 + i * lineH);
      textAlign(LEFT, TOP);
    }
  }
}
