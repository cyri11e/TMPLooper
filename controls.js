// controls.js — layout et labels comme le TMP

class Controls {
  constructor(x, y) {
    this.x = x;
    this.y = y;

    const W = 150;
    const H = 60;
    const GAP_X = 10;
    const GAP_Y = 20;

    // flashAt : timestamp de la dernière pression (pour le flash visuel)
    this.buttons = [
      { id: "loopUp",   label1: "LOOP VOL", label2: "UP",      x: 0,                   y: 0,        w: W, h: H, action: () => triggerAction("loopUp")   },
      { id: "undo",     label1: "UNDO",     label2: "",        x: W + GAP_X,           y: 0,        w: W, h: H, action: () => triggerAction("undo")     },
      { id: "half",     label1: "1/2 SPEED",label2: "",        x: 2*(W+GAP_X),         y: 0,        w: W, h: H, action: () => triggerAction("half")     },
      { id: "reverse",  label1: "REVERSE",  label2: "",        x: 3*(W+GAP_X),         y: 0,        w: W, h: H, action: () => triggerAction("reverse")  },
      { id: "loopDown", label1: "LOOP VOL", label2: "DOWN",    x: 0,                   y: H+GAP_Y,  w: W, h: H, action: () => triggerAction("loopDown") },
      { id: "record",   label1: "RECORD",   label2: "OVERDUB", x: W + GAP_X,           y: H+GAP_Y,  w: W, h: H, action: () => triggerAction("record"),  isRecord: true },
      { id: "play",     label1: "PLAY",     label2: "STOP",    x: 2*(W+GAP_X),         y: H+GAP_Y,  w: W, h: H, action: () => triggerAction("play"),    isPlay: true   },
      { id: "oneshot",  label1: "1-SHOT",   label2: "",        x: 3*(W+GAP_X),         y: H+GAP_Y,  w: W, h: H, action: () => triggerAction("oneshot")  },
      { id: "settings", label1: "⚙",        label2: "SETTINGS",x: 4*(W+GAP_X)+20,      y: H+GAP_Y,  w: W, h: H, action: () => openSettings(), isSettings: true }
    ];

    // timestamp du dernier flash par id
    this._flash = {};
  }

  flash(id) {
    this._flash[id] = millis();
  }

  draw() {
    push();
    translate(this.x, this.y);

    for (let b of this.buttons) {
      const hovered   = this.isHovered(b);
      const flashAge  = millis() - (this._flash[b.id] || -9999);
      const flashing  = flashAge < 120;   // 120 ms de flash

      stroke(200);
      strokeWeight(2);

      let col;
      if (b.isSettings) {
        col = flashing ? color(255, 160, 0) : hovered ? color(180, 100, 0) : color(80, 50, 0);
      } else if (b.isRecord) {
        col = flashing ? color(255, 60, 60) : hovered ? color(160, 40, 40) : color(80, 20, 20);
      } else if (b.isPlay) {
        col = flashing ? color(60, 220, 80) : hovered ? color(30, 130, 50) : color(20, 70, 30);
      } else {
        col = flashing ? color(80, 140, 255) : hovered ? color(50, 80, 160) : color(40);
      }
      fill(col);
      rect(b.x, b.y, b.w, b.h, 6);

      noStroke();
      fill(255);
      textAlign(CENTER, CENTER);
      if (b.label2 && b.label2 !== "") {
        textSize(14);
        text(b.label1, b.x + b.w / 2, b.y + b.h / 2 - 8);
        text(b.label2, b.x + b.w / 2, b.y + b.h / 2 + 8);
      } else {
        textSize(16);
        text(b.label1, b.x + b.w / 2, b.y + b.h / 2);
      }
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
        this._flash[b.id] = millis();
        b.action();
      }
    }
  }
}

