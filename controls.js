// ------------------------------------------------------------
// Controls.js — Boutons TMP + Paramétrage
// Retour visuel sur les 4 états TMP via 2 boutons
// ------------------------------------------------------------

class Controls {
  constructor(x, y, app) {
    this.x = x;
    this.y = y;
    this.app = app;

    const W = 150;
    const H = 60;
    const GAP_X = 10;
    const GAP_Y = 20;

    this.settingsBtn = {
      x: 0,
      y: 2 * H + GAP_Y + 10,
      w: 120,
      h: 35,
      label: "Paramétrage",
      action: () => this.app.triggerAction("settings")
    };

    this.buttons = [
      {
        id: "loopUp",
        label1: "LOOP VOL",
        label2: "UP",
        x: 0,
        y: 0,
        w: W,
        h: H,
        action: () => this.app.triggerAction("loopUp")
      },
      {
        id: "undo",
        label1: "UNDO",
        label2: "",
        x: W + GAP_X,
        y: 0,
        w: W,
        h: H,
        action: () => this.app.triggerAction("undo")
      },
      {
        id: "half",
        label1: "1/2 SPEED",
        label2: "",
        x: 2 * (W + GAP_X),
        y: 0,
        w: W,
        h: H,
        action: () => this.app.triggerAction("half")
      },
      {
        id: "reverse",
        label1: "REVERSE",
        label2: "",
        x: 3 * (W + GAP_X),
        y: 0,
        w: W,
        h: H,
        action: () => this.app.triggerAction("reverse")
      },

      {
        id: "loopDown",
        label1: "LOOP VOL",
        label2: "DOWN",
        x: 0,
        y: H + GAP_Y,
        w: W,
        h: H,
        action: () => this.app.triggerAction("loopDown")
      },
      {
        id: "record",
        label1: "RECORD",
        label2: "OVERDUB",
        x: W + GAP_X,
        y: H + GAP_Y,
        w: W,
        h: H,
        action: () => this.app.triggerAction("record")
      },
      {
        id: "play",
        label1: "PLAY",
        label2: "STOP",
        x: 2 * (W + GAP_X),
        y: H + GAP_Y,
        w: W,
        h: H,
        action: () => this.app.triggerAction("play")
      },
      {
        id: "oneshot",
        label1: "1-SHOT",
        label2: "",
        x: 3 * (W + GAP_X),
        y: H + GAP_Y,
        w: W,
        h: H,
        action: () => this.app.triggerAction("oneshot")
      }
    ];
  }

  // état TMP courant
  get tmpState() {
    return this.app.tmp.state; // "STOP" | "PLAY" | "REC" | "OVERDUB"
  }

  draw() {
    push();
    translate(this.x, this.y);

    const state = this.tmpState;

    for (let b of this.buttons) {
      const hovered = this._hover(b);

      // -----------------------------
      // COLORATION / RETOUR VISUEL
      // -----------------------------
      if (b.id === "record") {
        // RECORD actif pendant REC ou OVERDUB
        if (state === "REC" || state === "OVERDUB") {
          fill(220, 40, 40); // rouge
        } else {
          fill(hovered ? 80 : 40); // blank
        }
      }
      else if (b.id === "play") {
        // PLAY actif pendant PLAY
        if (state === "PLAY") {
          fill(40, 180, 40); // vert
        } else {
          fill(hovered ? 80 : 40); // blank
        }
      }
      else {
        // autres boutons : simple hover
        fill(hovered ? 80 : 40);
      }

      stroke(200);
      strokeWeight(2);
      rect(b.x, b.y, b.w, b.h, 6);

      // labels
      noStroke();
      fill(255);
      textAlign(CENTER, CENTER);

      if (b.label2) {
        textSize(14);
        text(b.label1, b.x + b.w / 2, b.y + b.h / 2 - 8);
        text(b.label2, b.x + b.w / 2, b.y + b.h / 2 + 8);
      } else {
        textSize(16);
        text(b.label1, b.x + b.w / 2, b.y + b.h / 2);
      }
    }

    // Bouton Paramétrage
    const s = this.settingsBtn;
    const hoveredSettings = this._hover(s);

    fill(hoveredSettings ? 80 : 40);
    stroke("red");
    strokeWeight(2);
    rect(s.x, s.y, s.w, s.h, 6);

    noStroke();
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(14);
    text(s.label, s.x + s.w / 2, s.y + s.h / 2);

    pop();
  }

  _hover(b) {
    return (
      mouseX > this.x + b.x &&
      mouseX < this.x + b.x + b.w &&
      mouseY > this.y + b.y &&
      mouseY < this.y + b.y + b.h
    );
  }

  mousePressed() {
    if (this._hover(this.settingsBtn)) {
      this.settingsBtn.action();
      return;
    }

    for (let b of this.buttons) {
      if (this._hover(b)) {
        b.action();
        return;
      }
    }
  }
}
