import Phaser from 'phaser';
export default class AudioAnalyzer extends Phaser.Events.EventEmitter {
    constructor(scene) {
        super();
        this.started = false;
        // detections
        this.noBeats = 0;
        this.historyLow = [];
        this.historyMid = [];
        this.historyHigh = [];
        this.HIST = 30;
        this.lastBeat = { low: 0, mid: 0, high: 0 };
        this.beatTimes = [];
        this.estPeriodMs = 500; // starta ~120 BPM
        this.scene = scene;
    }
    attachToAudio(music) {
        const sm = this.scene.sound;
        const ctx = sm?.context;
        if (!sm || !ctx)
            return false;
        const wa = music;
        const any = wa;
        // Phaser-versioner varierar: volumeNode/gainNode/source brukar finnas
        const tapNode = any.volumeNode ?? any.gainNode ?? any.source;
        if (!tapNode) {
            console.warn('Kunde inte hitta node att tappa från.');
            return false;
        }
        // Skapa analyser i PARALLELL (ingen disconnect!)
        this.analyser = ctx.createAnalyser();
        this.analyser.fftSize = 2048;
        this.analyser.smoothingTimeConstant = 0.5;
        // Viktigt: koppla INTE analyzern till destination.
        try {
            tapNode.connect(this.analyser); // parallell “tap”
        }
        catch (e) {
            console.warn('Kunde inte connecta parallellt:', e);
            return false;
        }
        this.freqData = new Float32Array(this.analyser.frequencyBinCount);
        this.prevMag = new Float32Array(this.analyser.frequencyBinCount);
        this.started = true;
        this.music = music;
        return true;
    }
    update() {
        if (!this.started)
            return;
        try {
            // Float ger bättre precision för flux
            this.analyser.getFloatFrequencyData(this.freqData);
            // Gör om till magnitud i linjär skala
            for (let i = 0; i < this.freqData.length; i++) {
                // dB -> lin
                this.freqData[i] = Math.pow(10, this.freqData[i] / 20);
            }
            // Spektral flux (endast positiva ökningar)
            let flux = 0;
            for (let i = 0; i < this.freqData.length; i++) {
                const inc = this.freqData[i] - this.prevMag[i];
                if (inc > 0)
                    flux += inc;
                this.prevMag[i] = this.freqData[i];
            }
            const bands = this.computeBands(this.freqData);
            this.detectBeats(bands, flux);
        }
        catch (e) {
            console.error('Analyzer update error:', e);
            this.started = false;
        }
    }
    computeBands(spectrum) {
        const ctx = this.scene.sound.context;
        const bins = spectrum.length;
        const nyquist = ctx.sampleRate / 2;
        const hzPerBin = nyquist / bins;
        const bandAvg = (loHz, hiHz) => {
            const i0 = Math.max(0, Math.floor(loHz / hzPerBin));
            const i1 = Math.min(bins - 1, Math.ceil(hiHz / hzPerBin));
            let sum = 0;
            for (let i = i0; i <= i1; i++)
                sum += spectrum[i];
            return sum / Math.max(1, i1 - i0 + 1);
        };
        // Tightare band minskar “sfx-bleed”
        return {
            low: bandAvg(50, 120), // kick
            mid: bandAvg(180, 320), // snare body
            high: bandAvg(2000, 5000) // snap/hi-hat
        };
    }
    detectBeats(bands, flux) {
        const now = this.scene.time.now;
        const historyMap = {
            low: this.historyLow,
            mid: this.historyMid,
            high: this.historyHigh
        };
        // adaptiv tröskel via EMA + std
        const pushSmooth = (v, arr) => {
            const smoothed = arr.length ? arr[arr.length - 1] * 0.7 + v * 0.3 : v;
            arr.push(smoothed);
            if (arr.length > this.HIST)
                arr.shift();
            return smoothed;
        };
        const low = pushSmooth(bands.low, this.historyLow);
        const mid = pushSmooth(bands.mid, this.historyMid);
        const high = pushSmooth(bands.high, this.historyHigh);
        const isPeak = (band, level, k = 1.6) => {
            const hist = historyMap[band];
            if (hist.length < 5)
                return false;
            const avg = hist.reduce((a, b) => a + b, 0) / hist.length;
            const sd = Math.sqrt(hist.reduce((s, x) => s + (x - avg) ** 2, 0) / hist.length);
            // Kombinera band-peak med spektral flux för robusthet
            const adaptive = avg + k * sd;
            return level > adaptive && flux > 0.02; // justera vid behov
        };
        // Refractory window ~ 45% av estimerad period
        const minGap = Math.max(60, this.estPeriodMs * 0.45);
        const tryBeat = (band, level) => {
            if (now - this.lastBeat[band] < minGap)
                return false;
            if (!isPeak(band, level))
                return false;
            this.lastBeat[band] = now;
            this.beatTimes.push(now);
            this.beatTimes = this.beatTimes.filter(t => now - t < 4000);
            this.updateEstimatedPeriod();
            this.emit(`beat:${band}`, level);
            return true;
        };
        if (++this.noBeats % 3 === 0) {
            tryBeat('low', low);
            tryBeat('mid', mid);
            tryBeat('high', high);
        }
        /*
        tryBeat('low', low)
            tryBeat('mid', mid)
            tryBeat('high', high)
        */
    }
    updateEstimatedPeriod() {
        if (this.beatTimes.length < 3)
            return;
        const n = this.beatTimes.length;
        const deltas = [];
        for (let i = 1; i < n; i++)
            deltas.push(this.beatTimes[i] - this.beatTimes[i - 1]);
        deltas.sort((a, b) => a - b);
        const median = deltas[Math.floor(deltas.length / 2)];
        if (isFinite(median) && median > 100 && median < 1500)
            this.estPeriodMs = median;
    }
    nearestBeatDeltaMs(at = this.scene.time.now) {
        if (this.beatTimes.length === 0)
            return Number.POSITIVE_INFINITY;
        let best = Infinity;
        for (let i = this.beatTimes.length - 1; i >= 0; i--) {
            const d = at - this.beatTimes[i];
            const ad = Math.abs(d);
            if (ad < best)
                best = ad;
            if (d > 800)
                break;
        }
        return best;
    }
    getEstimatedPeriodMs() {
        return this.estPeriodMs;
    }
    getEstimatedBpm() {
        return this.estPeriodMs > 0 ? 60000 / this.estPeriodMs : 0;
    }
}
