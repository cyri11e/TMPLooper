// ------------------------------------------------------------
// LoopViewerMusicMath.js — pyramide de peaks + niveaux
// ------------------------------------------------------------

class LoopViewerMusicMath {
    constructor(viewer) {
        this.v = viewer;
    }

    buildPeaksPyramid() {
        const v = this.v;
        v.peaksPyramid = [];

        const raw = v.rawChannelData;
        const total = v.totalSamples;
        let blocks = 2048;

        for (let level = 0; level < 6; level++) {
            const blockSize = Math.max(1, Math.floor(total / blocks));
            const peaks = new Array(blocks);

            for (let b = 0; b < blocks; b++) {
                const start = b * blockSize;
                const end = Math.min(total, start + blockSize);
                let min = 1, max = -1;

                for (let i = start; i < end; i++) {
                    const v = raw[i];
                    if (v < min) min = v;
                    if (v > max) max = v;
                }
                peaks[b] = { min, max };
            }

            v.peaksPyramid.push({ blocks, peaks, blockSize });
            blocks = Math.max(1, Math.floor(blocks / 2));
        }
    }

    choosePyramidLevel() {
        const v = this.v;
        const visibleStart = v.offset / (v.w * v.zoom);
        const visibleEnd = (v.offset + v.w) / (v.w * v.zoom);
        const span = visibleEnd - visibleStart;

        const desired = v.w * 1.0;

        for (let i = 0; i < v.peaksPyramid.length; i++) {
            const lvl = v.peaksPyramid[i];
            const blocksVisible = Math.floor(lvl.blocks * span);
            if (blocksVisible <= desired * 2) return i;
        }
        return v.peaksPyramid.length - 1;
    }

    getAutoBpm(loopStart, loopEnd, measures, beatsPerMeasure, totalDuration) {
        const selDur = (loopEnd - loopStart) * totalDuration;
        if (selDur <= 0) return null;

        const totalBeats = measures * beatsPerMeasure;
        const bpm = 60 * totalBeats / selDur;

        return bpm;
    }

}
