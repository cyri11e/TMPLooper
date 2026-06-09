// ------------------------------------------------------------
// LoopViewerInteraction.js — gestion souris / zoom / drag / pan
// Version stable, complète, sans régression
// ------------------------------------------------------------

class LoopViewerInteraction {
    constructor(viewer) {
        this.v = viewer;

        // états de drag
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
    // MOUSE PRESSED
    // ------------------------------------------------------------
    mousePressed() {
        const v = this.v;
        if (!v.active) return;
        if (!v.isHovered()) return;

        const localX = mouseX - v.x;
        this.lastX = mouseX;

        const leftX  = v.loopStart * v.w * v.zoom - v.offset;
        const rightX = v.loopEnd   * v.w * v.zoom - v.offset;

        // poignée gauche
        if (abs(localX - leftX) < 12) {
            this.dragLeft = true;
            this.dragging = true;
            return;
        }

        // poignée droite
        if (abs(localX - rightX) < 12) {
            this.dragRight = true;
            this.dragging = true;
            return;
        }

        // clic dans la sélection → déplacer la sélection
        if (localX > leftX && localX < rightX) {
            this.dragSelection = true;
            this.dragging = true;
            this.selStart = v.loopStart;
            this.selEnd   = v.loopEnd;
            return;
        }

        // sinon → PAN
        this.dragPan = true;
        this.dragging = true;
    }

    // ------------------------------------------------------------
    // MOUSE DRAGGED
    // ------------------------------------------------------------
    mouseDragged() {
        const v = this.v;
        if (!this.dragging) return;

        const dx = mouseX - this.lastX;
        this.lastX = mouseX;

        // PAN
        if (this.dragPan) {
            v.offset -= dx;
            v.offset = constrain(v.offset, 0, v.w * v.zoom - v.w);
            return;
        }

        // poignée gauche
        if (this.dragLeft) {
            const t = (mouseX - v.x + v.offset) / (v.w * v.zoom);
            v.loopStart = constrain(t, 0, v.loopEnd - 0.001);
            this._updateAutoBpm();
            return;
        }

        // poignée droite
        if (this.dragRight) {
            const t = (mouseX - v.x + v.offset) / (v.w * v.zoom);
            v.loopEnd = constrain(t, v.loopStart + 0.001, 1);
            this._updateAutoBpm();
            return;
        }

        // déplacement de la sélection
        if (this.dragSelection) {
            const deltaNorm = dx / (v.w * v.zoom);
            let ns = this.selStart + deltaNorm;
            let ne = this.selEnd   + deltaNorm;

            const span = ne - ns;

            if (ns < 0) { ns = 0; ne = span; }
            if (ne > 1) { ne = 1; ns = 1 - span; }

            v.loopStart = ns;
            v.loopEnd   = ne;

            this._updateAutoBpm();
        }
    }

    // ------------------------------------------------------------
    // MOUSE RELEASED
    // ------------------------------------------------------------
    mouseReleased() {
        this.dragging = false;
        this.dragLeft = false;
        this.dragRight = false;
        this.dragSelection = false;
        this.dragPan = false;
    }

    // ------------------------------------------------------------
    // WHEEL ZOOM (centré sur curseur)
    // ------------------------------------------------------------
    onWheel(delta) {
        const v = this.v;

        const localX = mouseX - v.x;
        const timeBefore = (localX + v.offset) / (v.w * v.zoom);

        v.zoom *= (1 - delta * 0.0012);
        v.zoom = constrain(v.zoom, 0.2, 200);

        v.offset = timeBefore * v.w * v.zoom - localX;
        v.offset = constrain(v.offset, 0, v.w * v.zoom - v.w);
    }

    // ------------------------------------------------------------
    // BPM AUTO
    // ------------------------------------------------------------
    _updateAutoBpm() {
        const v = this.v;
        if (!v.rawBuffer) return;

        const selDur = (v.loopEnd - v.loopStart) * v.rawBuffer.duration;
        if (selDur <= 0) return;

        const beats = v.renderer.bpmControls.beatsPerMeasure;
        const bpmAuto = 60 * beats / selDur;

        v.renderer.bpmControls.bpm = Number(bpmAuto.toFixed(2));
    }
}
