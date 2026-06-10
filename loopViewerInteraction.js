// ------------------------------------------------------------
// LoopViewerInteraction.js — version finale
// - Poignée réelle prioritaire
// - Poignée de snap = hitbox stricte (12x24)
// - Pan toujours fonctionnel
// ------------------------------------------------------------

class LoopViewerInteraction {
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

    mousePressed() {
        const v = this.v;
        if (!v.active) return;
        if (!v.isHovered()) return;

        const localX = mouseX - v.x;
        const localY = mouseY - v.y;
        this.lastX = mouseX;

        const leftX  = v.loopStart * v.w * v.zoom - v.offset;
        const rightX = v.loopEnd   * v.w * v.zoom - v.offset;

        // --------------------------------------------------------
        // 1) POIGNÉES RÉELLES (PRIORITAIRES)
        // --------------------------------------------------------
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

        // --------------------------------------------------------
        // 2) POIGNÉES DE SNAP (hitbox stricte 12x24)
        // --------------------------------------------------------
        const snapW = 12;
        const snapH = 24;
        const snapY = v.h/2 - snapH/2;

        // poignée snap gauche
        if (localX >= 0 && localX <= snapW &&
            localY >= snapY && localY <= snapY + snapH) {

            const visibleStart = v.offset / (v.w * v.zoom);
            const visibleEnd   = (v.offset + v.w) / (v.w * v.zoom);

            v.loopStart = constrain(visibleStart, 0, 1);
            v.loopEnd   = constrain(visibleEnd,   0, 1);
            return;
        }

        // poignée snap droite
        if (localX >= v.w - snapW && localX <= v.w &&
            localY >= snapY && localY <= snapY + snapH) {

            const visibleStart = v.offset / (v.w * v.zoom);
            const visibleEnd   = (v.offset + v.w) / (v.w * v.zoom);

            v.loopStart = constrain(visibleStart, 0, 1);
            v.loopEnd   = constrain(visibleEnd,   0, 1);
            return;
        }

        // --------------------------------------------------------
        // 3) CLIC DANS LA SÉLECTION
        // --------------------------------------------------------
        if (localX > leftX && localX < rightX) {

            // SHIFT = déplacer la sélection
            if (keyIsDown(SHIFT)) {
                this.dragSelection = true;
                this.dragging = true;
                this.selStart = v.loopStart;
                this.selEnd   = v.loopEnd;
                return;
            }

            // Sinon = PAN
            this.dragPan = true;
            this.dragging = true;
            return;
        }

        // --------------------------------------------------------
        // 4) Sinon → PAN
        // --------------------------------------------------------
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
            v.offset = constrain(v.offset, 0, v.w * v.zoom - v.w);
            return;
        }

        // poignée gauche
        if (this.dragLeft) {
            const t = (mouseX - v.x + v.offset) / (v.w * v.zoom);
            v.loopStart = constrain(t, 0, v.loopEnd - 0.001);
            v.updateAutoBpm?.();
            return;
        }

        // poignée droite
        if (this.dragRight) {
            const t = (mouseX - v.x + v.offset) / (v.w * v.zoom);
            v.loopEnd = constrain(t, v.loopStart + 0.001, 1);
            v.updateAutoBpm?.();
            return;
        }

        // déplacement de la sélection (SHIFT)
        if (this.dragSelection) {
            const deltaNorm = dx / (v.w * v.zoom);
            let ns = this.selStart + deltaNorm;
            let ne = this.selEnd   + deltaNorm;

            const span = ne - ns;

            if (ns < 0) { ns = 0; ne = span; }
            if (ne > 1) { ne = 1; ns = 1 - span; }

            v.loopStart = ns;
            v.loopEnd   = ne;

            v.updateAutoBpm?.();
        }
    }

    mouseReleased() {
        this.dragging = false;
        this.dragLeft = false;
        this.dragRight = false;
        this.dragSelection = false;
        this.dragPan = false;
    }

    onWheel(delta) {
        const v = this.v;

        const localX = mouseX - v.x;
        const timeBefore = (localX + v.offset) / (v.w * v.zoom);

        v.zoom *= (1 - delta * 0.0012);
        v.zoom = constrain(v.zoom, 0.2, 200);

        v.offset = timeBefore * v.w * v.zoom - localX;
        v.offset = constrain(v.offset, 0, v.w * v.zoom - v.w);
    }
}
