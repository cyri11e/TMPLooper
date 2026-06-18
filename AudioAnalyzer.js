// ------------------------------------------------------------
// AudioAnalyzer.js — Détection HYBRIDE (visuel + spectral léger)
// - Downsample 2000 Hz
// - Dérivée absolue (visuel)
// - Énergie multi-bandes (spectral léger)
// - Smoothing
// - Seuil adaptatif
// - Période réfractaire (50 ms)
// ------------------------------------------------------------

class AudioAnalyzer {
    constructor(rawData, sampleRate) {
        this.raw = rawData;
        this.sr = sampleRate;

        this.downSR = 2000;
        this.threshold = 0.002;

        this.beatMarkers = [];

        this._analyze();
    }

    // ------------------------------------------------------------
    // Downsampling par moyenne locale
    // ------------------------------------------------------------
    _downsample() {
        const ratio = Math.floor(this.sr / this.downSR);
        const outLen = Math.floor(this.raw.length / ratio);
        const out = new Float32Array(outLen);

        let src = 0;
        for (let i = 0; i < outLen; i++) {
            let sum = 0, c = 0;
            for (let j = 0; j < ratio && src < this.raw.length; j++) {
                sum += this.raw[src++];
                c++;
            }
            out[i] = sum / c;
        }
        return out;
    }

    // ------------------------------------------------------------
    // Analyse HYBRIDE
    // ------------------------------------------------------------
    _analyze() {
        const ds = this._downsample();
        const sr = this.downSR;

        // -----------------------------
        // 1) VISUEL : dérivée absolue
        // -----------------------------
        const diff = new Float32Array(ds.length);
        diff[0] = 0;
        for (let i = 1; i < ds.length; i++) {
            diff[i] = Math.abs(ds[i] - ds[i - 1]);
        }

        // smoothing visuel
        const vis = new Float32Array(diff.length);
        const a1 = 0.6;
        vis[0] = diff[0];
        for (let i = 1; i < diff.length; i++) {
            vis[i] = a1 * vis[i - 1] + (1 - a1) * diff[i];
        }

        // -----------------------------
        // 2) SPECTRAL LÉGER : énergie par bandes
        // -----------------------------
        const low = new Float32Array(ds.length);
        const mid = new Float32Array(ds.length);
        const high = new Float32Array(ds.length);

        let l = 0, m = 0, h = 0;
        for (let i = 1; i < ds.length; i++) {
            const x = ds[i];

            // filtres IIR ultra simples
            l = 0.99 * l + 0.01 * x;          // low
            m = 0.9 * m + 0.1 * (x - l);      // mid
            h = x - m - l;                    // high

            low[i] = Math.abs(l);
            mid[i] = Math.abs(m);
            high[i] = Math.abs(h);
        }

        // énergie multi-bandes
        const spec = new Float32Array(ds.length);
        for (let i = 0; i < ds.length; i++) {
            spec[i] = low[i] * 0.4 + mid[i] * 0.4 + high[i] * 0.2;
        }

        // smoothing spectral
        const a2 = 0.6;
        const specSmooth = new Float32Array(spec.length);
        specSmooth[0] = spec[0];
        for (let i = 1; i < spec.length; i++) {
            specSmooth[i] = a2 * specSmooth[i - 1] + (1 - a2) * spec[i];
        }

        // -----------------------------
        // 3) Fusion VISUEL + SPECTRAL
        // -----------------------------
        const hybrid = new Float32Array(ds.length);
        for (let i = 0; i < ds.length; i++) {
            hybrid[i] = Math.max(vis[i], specSmooth[i]);
        }

        // -----------------------------
        // 4) Seuil adaptatif local
        // -----------------------------
        const window = 20;
        const th = new Float32Array(hybrid.length);
        for (let i = 0; i < hybrid.length; i++) {
            let sum = 0, c = 0;
            for (let j = Math.max(0, i - window); j < i; j++) {
                sum += hybrid[j];
                c++;
            }
            th[i] = c ? (sum / c) * 2.0 : 0;
        }

        // -----------------------------
        // 5) Peak picking + période réfractaire
        // -----------------------------
        const minIOI = Math.round(0.05 * sr);
        const peaks = [];
        let last = -Infinity;
        let lastVal = 0;

        for (let i = 1; i < hybrid.length - 1; i++) {
            const v = hybrid[i];

            if (v > th[i] && v > hybrid[i - 1] && v > hybrid[i + 1]) {
                if (i - last < minIOI) {
                    if (v > lastVal) {
                        peaks[peaks.length - 1] = i;
                        last = i;
                        lastVal = v;
                    }
                } else {
                    peaks.push(i);
                    last = i;
                    lastVal = v;
                }
            }
        }

        // conversion en temps
        const times = peaks.map(i => i / sr);

        // normalisation
        const total = this.raw.length / this.sr;
        this.beatMarkers = times.map(t => t / total);
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
    // Affichage
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
