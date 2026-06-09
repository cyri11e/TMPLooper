// ------------------------------------------------------------
// LoopViewerRenderer.js — rendu waveform + sélection + beats
// + affichage dynamique durée sélection + BPM auto
// ------------------------------------------------------------

class LoopViewerRenderer {
    constructor(viewer, bpmControls) {
        this.v = viewer;
        this.bpmControls = bpmControls;
    }

    draw() {
        const v = this.v;

        push();
        translate(v.x, v.y);

        // fond
        fill(20); noStroke(); rect(0, 0, v.w, v.h);

        // BEATS (avant waveform)
        this.drawBeats();

        // waveform
        this.drawWaveform();

        // sélection
        this.drawSelection();

        // poignées
        this.drawHandles();

        // playhead
        this.drawPlayhead();

        pop();

        // infos dynamiques sous la LoopView
        this.drawSelectionInfo();
    }

    // ------------------------------------------------------------
    // Waveform
    // ------------------------------------------------------------
    drawWaveform() {
        const v = this.v;
        if (!v.rawBuffer) return;

        const lvl = v.math.choosePyramidLevel();
        if (lvl < 0) return;

        const peaks = v.peaksPyramid[lvl].peaks;
        const blocks = v.peaksPyramid[lvl].blocks;
        const step = v.w / blocks;

        noStroke();
        fill(100, 200, 255, 180);
        beginShape();
        for (let i = 0; i < blocks; i++) {
            const x = i * step * v.zoom - v.offset;
            const y = map(peaks[i].max, -1, 1, v.h - 2, 2);
            vertex(x, y);
        }
        for (let i = blocks - 1; i >= 0; i--) {
            const x = i * step * v.zoom - v.offset;
            const y = map(peaks[i].min, -1, 1, v.h - 2, 2);
            vertex(x, y);
        }
        endShape(CLOSE);
    }

    // ------------------------------------------------------------
    // Sélection
    // ------------------------------------------------------------
    drawSelection() {
        const v = this.v;
        const leftX = v.loopStart * v.w * v.zoom - v.offset;
        const rightX = v.loopEnd * v.w * v.zoom - v.offset;

        noStroke();
        fill(255, 200, 0, 40);
        rect(leftX, 0, rightX - leftX, v.h);
    }

    // ------------------------------------------------------------
    // Poignées
    // ------------------------------------------------------------
    drawHandles() {
        const v = this.v;
        const leftX = v.loopStart * v.w * v.zoom - v.offset;
        const rightX = v.loopEnd * v.w * v.zoom - v.offset;

        stroke(255, 200, 0); strokeWeight(3);
        line(leftX, 0, leftX, v.h);
        line(rightX, 0, rightX, v.h);

        noStroke(); fill(255, 200, 0);
        rect(leftX - 6, v.h/2 - 12, 12, 24, 3);
        rect(rightX - 6, v.h/2 - 12, 12, 24, 3);
    }

    // ------------------------------------------------------------
    // Playhead
    // ------------------------------------------------------------
    drawPlayhead() {
        const v = this.v;
        const span = v.loopEnd - v.loopStart;
        const pxNorm = v.loopStart + v.playhead * span;
        const x = pxNorm * v.w * v.zoom - v.offset;

        stroke(0, 255, 0); strokeWeight(2);
        line(x, 0, x, v.h);
    }

    // ------------------------------------------------------------
    // BEATS (dans la zone sélectionnée)
    // ------------------------------------------------------------
    drawBeats() {
        const v = this.v;
        if (!v.rawBuffer) return;

        const beats = this.bpmControls.beatsPerMeasure;
        if (beats <= 0) return;

        const totalDur = v.rawBuffer.duration;
        const selStart = v.loopStart * totalDur;
        const selEnd   = v.loopEnd   * totalDur;
        const selDur   = selEnd - selStart;

        const beatDur = selDur / beats;

        stroke(255, 180, 0, 120);
        strokeWeight(1);

        for (let i = 1; i < beats; i++) {
            const t = selStart + i * beatDur;
            const norm = t / totalDur;
            const x = norm * v.w * v.zoom - v.offset;

            if (x >= 0 && x <= v.w) {
                line(x, 0, x, v.h);
            }
        }
    }


    // ------------------------------------------------------------
    // Infos dynamiques : durée sélection + BPM auto + infos sample
    // ------------------------------------------------------------
    drawSelectionInfo() {
        const v = this.v;
        if (!v.rawBuffer) return;

        const totalDur = v.rawBuffer.duration;
        const selDur = (v.loopEnd - v.loopStart) * totalDur;

        // format DAW sélection
        const mm = floor(selDur / 60);
        const ss = floor(selDur % 60);
        const ms = floor((selDur % 1) * 1000);

        // BPM auto dynamique
        const bpm = 60 * this.bpmControls.beatsPerMeasure / selDur;

        // infos sample
        const sr = v.rawBuffer.sampleRate;
        const samples = v.totalSamples;

        const txt =
            `Sélection: ${mm}:${nf(ss,2)}.${nf(ms,3)}   ` +
            `BPM auto: ${bpm.toFixed(2)}   ` +
            `Sample: ${totalDur.toFixed(3)}s / ${samples} samples / ${sr} Hz`;

        push();
        fill(200);
        textSize(12);
        textAlign(LEFT, TOP);
        text(txt, v.x, v.y + v.h + 6);
        pop();
    }

}
