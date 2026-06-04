// controls.js — layout TMP + hover + MIDI IN

class Controls {
  constructor(x, y, w, h) {
    this.x = x; 
    this.y = y;
    this.w = w; 
    this.h = h;

    // Layout TMP : Record / Play / Undo / Clear + Loop Vol - / +
    this.buttons = [
      { id:"record", label:"REC",   x:20,  y:20, w:80, h:40, action: () => triggerAction("record") },
      { id:"play",   label:"PLAY",  x:120, y:20, w:80, h:40, action: () => triggerAction("play") },
      { id:"undo",   label:"UNDO",  x:220, y:20, w:80, h:40, action: () => triggerAction("undo") },
      { id:"clear",  label:"CLEAR", x:320, y:20, w:80, h:40, action: () => triggerAction("clear") },

      // Volume Loop - / +
      { id:"loopDown", label:"VOL -", x:450, y:20, w:80, h:40, action: () => triggerAction("loopDown") },
      { id:"loopUp",   label:"VOL +", x:550, y:20, w:80, h:40, action: () => triggerAction("loopUp") },

      // Paramètres
      { id:"settings", label:"SET", x:700, y:20, w:80, h:40, action: () => toggleSettings() }
    ];
  }

  draw() {
    push();
    translate(this.x, this.y);

    for (let b of this.buttons) {
      let hovered = this.isHovered(b);

      // Fond
      stroke(255);
      strokeWeight(2);
      fill( hovered ? color(80,120,255) : color(40) );
      rect(b.x, b.y, b.w, b.h, 6);

      // Label
      fill(255);
      noStroke();
      textAlign(CENTER, CENTER);
      textSize(16);
      text(b.label, b.x + b.w/2, b.y + b.h/2);
    }

    pop();
  }

  isHovered(b) {
    return (
      mouseX > this.x + b.x &&
      mouseX < this.x + b.x + b.w &&
      mouseY > this.y + b.y &&
      mouseY < this.y + b.y + b.h
    );
  }

  mousePressed() {
    for (let b of this.buttons) {
      if (this.isHovered(b)) {
        b.action();
      }
    }
  }
}
