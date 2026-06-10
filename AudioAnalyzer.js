// ------------------------------------------------------------
// AudioAnalyzer.js — Version TURBO corrigée (alignement parfait)
// Détection transitoires rapide + crans magnétiques visibles
// ------------------------------------------------------------

class AudioAnalyzer {
    constructor(rawData, sampleRate) {
        this.raw = rawData;
        this.sr = sampleRate;

        this.downSR = 2000; // fréquence cible
        this.beatMarkers = [];
        this.threshold = 0.002;

        this._analyze();
    }

    // ------------------------------------------------------------
    // Downsampling rapide (1 sample sur ratio)
    // ------------------------------------------------------------
    _downsample() {
        const ratio = Math.floor(this.sr / this.downSR);
        const out = new Float32Array(Math.floor(this.raw.length / ratio));

        let j = 0;
        for (let i = 0; i < this.raw.length; i += ratio) {
            out[j++] = this.raw[i];
        }
        return out;
    }

    // ------------------------------------------------------------
    // Analyse transitoires (approx spectral flux)
    // ------------------------------------------------------------
    _analyze() {
        const ds = this._downsample();
        const sr = this.downSR;

        const frame = 256;
        const hop = 128;

        const energy = [];
        for (let i = 0; i + frame < ds.length; i += hop) {
            let sum = 0;
            for (let j = 0; j < frame; j++) {
                const s = ds[i + j];
                sum += s * s;
            }
            energy.push(sum);
        }

        // dérivée positive = transitoire
        const flux = [];
        for (let i = 1; i < energy.length; i++) {
            const diff = energy[i] - energy[i - 1];
            flux.push(diff > 0 ? diff : 0);
        }

        // seuil adaptatif
        const avg = flux.reduce((a, b) => a + b, 0) / flux.length;
        const th = avg * 2.0;

        const beats = [];
        for (let i = 1; i < flux.length - 1; i++) {
            if (flux[i] > flux[i - 1] &&
                flux[i] > flux[i + 1] &&
                flux[i] > th) {

                // ------------------------------------------------
                // CORRECTION TEMPORELLE
                // ------------------------------------------------
                // Position réelle = centre de la fenêtre
                const sampleIndex = i * hop + frame / 2;

                // Converti en secondes dans le signal downsamplé
                const timeDS = sampleIndex / sr;

                // Converti en secondes dans le signal original
                const time = timeDS;

                beats.push(time);
            }
        }

        // Normalisation 0..1
        const totalDur = this.raw.length / this.sr;
        this.beatMarkers = beats.map(t => t / totalDur);
    }

    // ------------------------------------------------------------
    // Snap intelligent
    // ------------------------------------------------------------
    snapToBeat(normPos) {
        let best = normPos;
        let bestDist = this.threshold;

        for (const b of this.beatMarkers) {
            const d = Math.abs(b - normPos);
            if (d < bestDist) {
                bestDist = d;
                best = b;
            }
        }
        return best;
    }

    // ------------------------------------------------------------
    // Affichage des crans visibles
    // ------------------------------------------------------------
    drawBeatMarkers(renderer) {
        const v = renderer.v;

        stroke(255, 150, 0, 140);
        strokeWeight(1);

        for (const b of this.beatMarkers) {
            const x = b * v.w * v.zoom - v.offset;
            if (x >= 0 && x <= v.w) {
                line(x, 0, x, v.h);
            }
        }
    }
}
