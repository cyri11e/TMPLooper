// ------------------------------------------------------------
// sketch.js — version refactorisée
// Ne gère que p5.js + délégation à AppController
// ------------------------------------------------------------

let app;

function setup() {
  createCanvas(windowWidth, windowHeight);

  app = new AppController();
  app.init();

  // indispensable pour placer correctement le LoopViewer
  app.ui.onResize();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  app.ui.onResize();
}


function draw() {
  if (!app) return;
  app.draw();
}

// ------------------------------------------------------------
// INTERACTIONS → déléguées à AppController / UIManager
// ------------------------------------------------------------
function mousePressed()  { app && app.mousePressed(); }
function mouseReleased() { app && app.mouseReleased(); }
function mouseDragged()  { app && app.mouseDragged(); }
function mouseWheel(e)   { if (app) return app.mouseWheel(e); }

function keyPressed() {
  if (!app) return;
  app.keyPressed(key, keyCode);
}


