import Phaser from 'phaser';
export default class BeatWindow {
    constructor() {
        this.bpm = 120;
        this.windowRatio = 0.15;
    }
    setBpm(bpm) {
        const clamped = Phaser.Math.Clamp(bpm, 30, 300);
        this.bpm = clamped;
    }
    setWindow(ratio) {
        const clamped = Phaser.Math.Clamp(ratio, 0.01, 0.5);
        this.windowRatio = clamped;
    }
    classify(deltaMs) {
        if (typeof deltaMs !== 'number' || !Number.isFinite(deltaMs))
            return 'normal';
        const threshold = this.windowMs();
        return Math.abs(deltaMs) <= threshold ? 'perfect' : 'normal';
    }
    windowMs() {
        const period = 60000 / this.bpm;
        return period * this.windowRatio;
    }
}
