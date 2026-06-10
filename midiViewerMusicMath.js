// ------------------------------------------------------------
// MidiViewerMusicMath.js — BPM auto sur la sélection (même formule que LoopViewer)
// ------------------------------------------------------------

class MidiViewerMusicMath {
  constructor(viewer) {
    this.v = viewer;
  }

  // loopStart / loopEnd en [0..1]
  // measures = nombre de mesures
  // beatsPerMeasure = nombre de temps par mesure
  // totalDuration = durée totale du fichier MIDI (en secondes)
  getAutoBpm(loopStart, loopEnd, measures, beatsPerMeasure, totalDuration) {
    const selDur = (loopEnd - loopStart) * totalDuration;
    if (selDur <= 0) return null;

    const totalBeats = measures * beatsPerMeasure;
    const bpm = 60 * totalBeats / selDur;

    return bpm;
  }
}
