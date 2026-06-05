// ------------------------------------------------------------
// Controls.js — Boutons TMP + bouton Paramétrage SOUS les boutons
// ------------------------------------------------------------

class Controls {
  constructor(x, y) {
    this.x = x;
    this.y = y;

    const W = 150;
    const H = 60;
    const GAP_X = 10;
    const GAP_Y = 20;

    // Bouton Paramétrage SOUS les 2 rangées TMP
    this.settingsBtn = {
      x: 0,
      y: 2 * H + GAP_Y + 10, // sous la 2e ligne + petit offset
      w: 120,
      h: 35,
      label: "Paramétrage",
      action: null
    };

    this.buttons = [
      // Ligne du haut
      { id:"loopUp",   label1:"LOOP VOL", label2:"UP",
        x:0,              y:0,            w:W, h:H,
        action:()=>triggerAction("loopUp") },
      { id:"undo",     label1:"UNDO",     label2:"",
        x:W+GAP_X,        y:0,            w:W, h:H,
        action:()=>triggerAction("undo") },
      { id:"half",     label1:"1/2 SPEED",label2:"",
        x:2*(W+GAP_X),    y:0,            w:W, h:H,
        action:()=>triggerAction("half") },
      { id:"reverse",  label1:"REVERSE",  label2:"",
        x:3*(W+GAP_X),    y:0,            w:W, h:H,
        action:()=>triggerAction("reverse") },

      // Ligne du bas
      { id:"loopDown", label1:"LOOP VOL", label2:"DOWN",
        x:0,              y:H+GAP_Y,      w:W, h:H,
        action:()=>triggerAction("loopDown") },
      { id:"record",   label1:"RECORD",   label2:"OVERDUB",
        x:W+GAP_X,        y:H+GAP_Y,      w:W, h:H,
        action:()=>triggerAction("record") },
      { id:"play",     label1:"PLAY",     label2:"STOP",
        x:2*(W+GAP_X),    y:H+GAP_Y,      w:W, h:H,
        action:()=>triggerAction("play") },
      { id:"oneshot",  label1:"1-SHOT",   label2:"",
        x:3*(W+GAP_X),    y:H+GAP_Y,      w:W, h:H,
        action:()=>triggerAction("oneshot") }
    ];
  }

  draw() {
    push();
    translate(this.x, this.y);

    // Boutons TMP
    for (let b of this.buttons) {
      const hovered = this._hover(b);

      stroke(200);
      strokeWeight(2);
      fill(hovered ? 80 : 40);
      rect(b.x, b.y, b.w, b.h, 6);

      noStroke();
      fill(255);
      textAlign(CENTER, CENTER);

      if (b.label2) {
        textSize(14);
        text(b.label1, b.x + b.w/2, b.y + b.h/2 - 8);
        text(b.label2, b.x + b.w/2, b.y + b.h/2 + 8);
      } else {
        textSize(16);
        text(b.label1, b.x + b.w/2, b.y + b.h/2);
      }
    }

    // Bouton Paramétrage (plus petit, sous les boutons)
    const s = this.settingsBtn;
    const hoveredSettings = this._hover(s);

    stroke('red');
    strokeWeight(2);
    fill(hoveredSettings ? 80 : 40);
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
    // Paramétrage
    if (this._hover(this.settingsBtn) && this.settingsBtn.action) {
      this.settingsBtn.action();
      return;
    }

    // Boutons TMP
    for (let b of this.buttons) {
      if (this._hover(b)) {
        b.action();
        return;
      }
    }
  }
}
