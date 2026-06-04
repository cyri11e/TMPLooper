
let midiConfig = {
  record: "CC 60 127",
  play:   "CC 61 127",
  undo:   "CC 62 127",
  clear:  "CC 63 127"
};

function openSettings() {
  settingsVisible = !settingsVisible;
}

function drawSettings() {
  if (!settingsVisible) return;

  push();
  fill(0, 200);
  rect(50, 50, width - 100, height - 100, 10);

  fill(255);
  textSize(20);
  text("Paramètres MIDI", 80, 90);

  let y = 140;
  for (let key in midiConfig) {
    text(`${key} : ${midiConfig[key]}`, 80, y);
    y += 40;
  }

  pop();
}
