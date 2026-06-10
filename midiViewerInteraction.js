// ------------------------------------------------------------
// MidiViewerInteraction.js — pan + poignées + déplacement sélection
// (équivalent LoopViewerInteraction, sans beats / snap)
// ------------------------------------------------------------

class MidiViewerInteraction {
  constructor(viewer) {
    this.v = viewer;

    this.dragging = false;
    this.dragLeft = false;
    this.dragRight = false;
    this.dragSelection = false;
    this.dragPan = false;

    this.lastX = 0;
    this.selStart = 0;
    this.selEnd = 0;
  }

  // ------------------------------------------------------------
  // SOURIS
  // ------------------------------------------------------------
  mousePressed() {
    const v = this.v;
    if (!v.active) return;
    if (!v.isHovered()) return;

    const localX = mouseX - v.x;
    const localY = mouseY - v.y;
    this.lastX = mouseX;

    const leftX  = v.loopStart * v.w * v.zoom - v.offset;
    const rightX = v.loopEnd   * v.w * v.zoom - v.offset;

    // 1) Poignées réelles
    if (abs(localX - leftX) < 12) {
      this.dragLeft = true;
      this.dragging = true;
      return;
    }

    if (abs(localX - rightX) < 12) {
      this.dragRight = true;
      this.dragging = true;
      return;
    }

    // 2) Clic dans la sélection
    if (localX > leftX && localX < rightX) {
      if (keyIsDown(SHIFT)) {
        this.dragSelection = true;
        this.dragging = true;
        this.selStart = v.loopStart;
        this.selEnd   = v.loopEnd;
        return;
      }

      this.dragPan = true;
      this.dragging = true;
      return;
    }

    // 3) Sinon → pan
    this.dragPan = true;
    this.dragging = true;
  }

  mouseDragged() {
    const v = this.v;
    if (!this.dragging) return;

    const dx = mouseX - this.lastX;
    this.lastX = mouseX;

    // PAN
    if (this.dragPan) {
      v.offset -= dx;
      const maxOffset = v.w * v.zoom - v.w;
      v.offset = constrain(v.offset, 0, maxOffset);
      return;
    }

    // poignée gauche
    if (this.dragLeft) {
      const t = (mouseX - v.x + v.offset) / (v.w * v.zoom || 1);
      v.loopStart = constrain(t, 0, v.loopEnd - 0.001);
      return;
    }

    // poignée droite
    if (this.dragRight) {
      const t = (mouseX - v.x + v.offset) / (v.w * v.zoom || 1);
      v.loopEnd = constrain(t, v.loopStart + 0.001, 1);
      return;
    }

    // déplacement de la sélection (SHIFT)
    if (this.dragSelection) {
      const deltaNorm = dx / (v.w * v.zoom || 1);
      let ns = this.selStart + deltaNorm;
      let ne = this.selEnd   + deltaNorm;

      const span = ne - ns;

      if (ns < 0) { ns = 0; ne = span; }
      if (ne > 1) { ne = 1; ns = 1 - span; }

      v.loopStart = ns;
      v.loopEnd   = ne;
    }
  }

  mouseReleased() {
    this.dragging = false;
    this.dragLeft = false;
    this.dragRight = false;
    this.dragSelection = false;
    this.dragPan = false;
  }

  // ------------------------------------------------------------
  // ZOOM / PAN (molette)
//  (équivalent onWheel du LoopViewerInteraction)
// ------------------------------------------------------------
  onWheel(delta) {
    const v = this.v;

    const localX = mouseX - v.x;
    const timeBefore = (localX + v.offset) / (v.w * v.zoom || 1);

    v.zoom *= (1 - delta * 0.0012);
    v.zoom = constrain(v.zoom, 0.2, 200);

    v.offset = timeBefore * v.w * v.zoom - localX;
    const maxOffset = v.w * v.zoom - v.w;
    v.offset = constrain(v.offset, 0, maxOffset);
  }
}
