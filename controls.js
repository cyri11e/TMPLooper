// ------------------------------------------------------------
// Controls.js — Pédalier matériel, proportions fixes, mode A 45/10/45
// ------------------------------------------------------------

class Controls {
  constructor(x, y, app) {
    this.x = x;
    this.y = y;
    this.app = app;

    // Référence matérielle
    this.refWidth  = 960;
    this.refHeight = 390;

    this.base = {
      panelInnerW: 113,
      panelInnerH: 39,
      panelOuterW: 139,
      panelOuterH: 53,
      panelSpacingX: 60,
      panelToSwitch: 20,
      switchD1: 90,   // diamètre max
      switchD2: 45,   // diamètre min
      switchGapY: 35, // espace entre switch et panneau du dessous
      padding: 20
    };

    this.labels = [
      ["LOOP VOL", "UP"],
      ["UNDO", ""],
      ["1/2 SPEED", ""],
      ["REVERSE", ""],
      ["", ""], // dummy

      ["LOOP VOL", "DOWN"],
      ["RECORD", "OVERDUB"],
      ["PLAY", "STOP"],
      ["1-SHOT", ""],
      ["", ""] // dummy
    ];

    this.buttons = [];

    this.settingsBtn = {
      x: 0,
      y: 0,
      w: 160,
      h: 40,
      label: "Paramétrage",
      action: () => this.app.triggerAction("settings")
    };
  }

  // ------------------------------------------------------------
  // RESPONSIVE AVEC PROPORTIONS FIXES 960x390
  // ------------------------------------------------------------
  onResize() {
    const W = width;
    const H = height;

    const s = Math.min(W / this.refWidth, H / this.refHeight);
    this.s = s;

    const B = this.base;

    this.panelOuterW = B.panelOuterW * s;
    this.panelOuterH = B.panelOuterH * s;
    this.panelInnerW = B.panelInnerW * s;
    this.panelInnerH = B.panelInnerH * s;

    this.panelSpacingX = B.panelSpacingX * s;
    this.panelToSwitch = B.panelToSwitch * s;
    this.switchD1 = B.switchD1 * s;
    this.switchD2 = B.switchD2 * s;
    this.switchGapY = B.switchGapY * s;
    this.padding = B.padding * s;

    const rowWidth = 5 * this.panelOuterW + 4 * this.panelSpacingX;

    const blockHeight =
      this.panelOuterH +
      this.panelToSwitch +
      this.switchD1 +
      this.switchGapY +
      this.panelOuterH +
      this.panelToSwitch +
      this.switchD1;

    this.totalWidth  = this.refWidth * s;
    this.totalHeight = this.refHeight * s;

    const startX = (this.totalWidth  - rowWidth) / 2;
    const startY = (this.totalHeight - blockHeight) / 2;

    this.buttons = [];

    for (let i = 0; i < 10; i++) {
      const col = i % 5;
      const row = Math.floor(i / 5);

      const px =
        startX +
        col * (this.panelOuterW + this.panelSpacingX);

      const py =
        startY +
        row *
          (this.panelOuterH +
            this.panelToSwitch +
            this.switchD1 +
            this.switchGapY);

      this.buttons.push({
        id: "btn" + i,
        label1: this.labels[i][0],
        label2: this.labels[i][1],
        x: px,
        y: py
      });
    }

    this.settingsBtn.w = 160 * s;
    this.settingsBtn.h = 40 * s;
    this.settingsBtn.x = (this.totalWidth - this.settingsBtn.w) / 2;
    this.settingsBtn.y = startY + blockHeight + 10 * s;
  }

  // ------------------------------------------------------------
  // RENDU
  // ------------------------------------------------------------
  draw() {
    push();
    translate(this.x, this.y);

    fill(90);
    stroke(40);
    strokeWeight(4);
    rect(0, 0, this.totalWidth, this.totalHeight, 12);

    const state = this.app.tmp.state;

    for (let b of this.buttons) {
      fill(30);
      stroke(0);
      strokeWeight(3);
      rect(b.x, b.y, this.panelOuterW, this.panelOuterH, 8);

      fill(60);
      noStroke();
      rect(
        b.x + (this.panelOuterW - this.panelInnerW) / 2,
        b.y + (this.panelOuterH - this.panelInnerH) / 2,
        this.panelInnerW,
        this.panelInnerH,
        4
      );

      fill(255);
      textAlign(CENTER, CENTER);
      textStyle(BOLD);
      textSize(16 * this.s);

      const cx = b.x + this.panelOuterW / 2;
      const cy = b.y + this.panelOuterH / 2 - 6 * this.s;

      text(b.label1, cx, cy);
      if (b.label2) text(b.label2, cx, cy + 16 * this.s);

      const sx = cx;
      const sy = b.y + this.panelOuterH + this.panelToSwitch + this.switchD1 / 2;

      fill(200);
      circle(sx, sy, this.switchD1);

      fill(150);
      circle(sx, sy, this.switchD1 * 0.65);

      fill(100);
      circle(sx, sy, this.switchD2);

      if (b.label1 === "RECORD" && (state === "REC" || state === "OVERDUB")) {
        fill(255, 0, 0);
        circle(sx, sy, this.switchD2 * 0.7);
      }
      if (b.label1 === "PLAY" && state === "PLAY") {
        fill(0, 255, 0);
        circle(sx, sy, this.switchD2 * 0.7);
      }

      b.hit = {
        x: b.x,
        y: b.y,
        w: this.panelOuterW,
        h: this.panelOuterH + this.panelToSwitch + this.switchD1
      };
    }

    const s = this.settingsBtn;
    fill(60);
    stroke("red");
    strokeWeight(2);
    rect(s.x, s.y, s.w, s.h, 6);

    fill(255);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(16 * this.s);
    textStyle(BOLD);
    text(s.label, s.x + s.w / 2, s.y + s.h / 2);

    pop();
  }

  // ------------------------------------------------------------
  // INTERACTIONS
  // ------------------------------------------------------------
  mousePressed() {
    const mx = mouseX - this.x;
    const my = mouseY - this.y;

    const s = this.settingsBtn;
    if (
      mx > s.x &&
      mx < s.x + s.w &&
      my > s.y &&
      my < s.y + s.h
    ) {
      this.app.triggerAction("settings");
      return;
    }

    for (let b of this.buttons) {
      if (
        mx > b.hit.x &&
        mx < b.hit.x + b.hit.w &&
        my > b.hit.y &&
        my < b.hit.y + b.hit.h
      ) {
        if (b.label1 === "" && b.label2 === "") return;
        this.app.triggerAction(b.label1.toLowerCase());
        return;
      }
    }
  }
}
