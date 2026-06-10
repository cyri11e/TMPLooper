// ------------------------------------------------------------
// LoopViewerInteraction.js — Version complète
// - Poignées réelles prioritaires
// - Poignées fixes (snap) hitbox strictes
// - Pan toujours fonctionnel
// - Snap intelligent sur beats détectés
// - Flèches ← → = beat précédent / suivant
// - Flèches ↑ ↓ = déplacement d’une mesure complète
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

    // ------------------------------------------------------------
    // UTILITAIRES BEATS
    // ------------------------------------------------------------
    _findNextBeat(pos, beats) {
        for (const b of beats) {
            if (b > pos) return b;
        }
        return beats[beats.length - 1];
    }

    _findPrevBeat(pos, beats) {
        for (let i = beats.length - 1; i >= 0; i--) {
            if (beats[i] < pos) return beats[i];
        }
        return beats[0];
    }

    _moveSelectionToBeat(targetBeat) {
        const v = this.v;
        const span = v.loopEnd - v.loopStart;

        // snap si proche
        if (Math.abs(v.loopStart - targetBeat) < 0.002) {
            // deuxième appui → déplacement d’un beat complet
            v.loopStart = targetBeat;
            v.loopEnd   = targetBeat + span;
        } else {
            // premier appui → snap
            v.loopStart = targetBeat;
            v.loopEnd   = targetBeat + span;
        }

        // clamp
        if (v.loopEnd > 1) {
            const diff = v.loopEnd - 1;
            v.loopEnd = 1;
            v.loopStart -= diff;
        }
    }

    // ------------------------------------------------------------
    // CLAVIER
    // ------------------------------------------------------------
    keyPressed() {
        const v = this.v;
        if (!v.analyzer) return;

        const beats = v.analyzer.beatMarkers;
        if (!beats || beats.length === 0) return;

        const pos = v.loopStart;

        // → Flèche droite : beat suivant
        if (keyCode === RIGHT_ARROW) {
            const next = this._findNextBeat(pos, beats);
            this._moveSelectionToBeat(next);
            return;
        }

        // ← Flèche gauche : beat précédent
        if (keyCode === LEFT_ARROW) {
            const prev = this._findPrevBeat(pos, beats);
            this._moveSelectionToBeat(prev);
            return;
        }

        // ↑ Flèche haut : +1 mesure (N beats)
        if (keyCode === UP_ARROW) {
            const N = v.renderer.bpmControls.beatsPerMeasure;
            let target = pos;

            for (let i = 0; i < N; i++) {
                target = this._findNextBeat(target, beats);
            }

            this._moveSelectionToBeat(target);
            return;
        }

        // ↓ Flèche bas : -1 mesure (N beats)
        if (keyCode === DOWN_ARROW) {
            const N = v.renderer.bpmControls.beatsPerMeasure;
            let target = pos;

            for (let i = 0; i < N; i++) {
                target = this._findPrevBeat(target, beats);
            }

            this._moveSelectionToBeat(target);
            return;
        }
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

        // gauche
        if (localX >= 0 && localX <= snapW &&
            localY >= snapY && localY <= snapY + snapH) {

            const visibleStart = v.offset / (v.w * v.zoom);
            const visibleEnd   = (v.offset + v.w) / (v.w * v.zoom);

            v.loopStart = visibleStart;
            v.loopEnd   = visibleEnd;
            return;
        }

        // droite
        if (localX >= v.w - snapW && localX <= v.w &&
            localY >= snapY && localY <= snapY + snapH) {

            const visibleStart = v.offset / (v.w * v.zoom);
            const visibleEnd   = (v.offset + v.w) / (v.w * v.zoom);

            v.loopStart = visibleStart;
            v.loopEnd   = visibleEnd;
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
            let t = (mouseX - v.x + v.offset) / (v.w * v.zoom);

            // snap intelligent
            //if (v.analyzer) t = v.analyzer.snapToBeat(t);

            v.loopStart = constrain(t, 0, v.loopEnd - 0.001);
            return;
        }

        // poignée droite
        if (this.dragRight) {
            let t = (mouseX - v.x + v.offset) / (v.w * v.zoom);

            // snap intelligent
            // if (v.analyzer) t = v.analyzer.snapToBeat(t);

            v.loopEnd = constrain(t, v.loopStart + 0.001, 1);
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
        }
    }

    // ------------------------------------------------------------
    mouseReleased() {
        this.dragging = false;
        this.dragLeft = false;
        this.dragRight = false;
        this.dragSelection = false;
        this.dragPan = false;
    }

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
}
