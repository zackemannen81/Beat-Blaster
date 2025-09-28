export default class Scoring {
    constructor() {
        this.score = 0;
        this.multiplier = 1;
        this.combo = 0;
        this.perfectMs = 60;
        this.goodMs = 120;
        this.comboStep = 0.1;
        this.comboMax = 8;
        this.shots = 0;
        this.perfect = 0;
        this.good = 0;
        this.misses = 0;
    }
    registerShot(deltaToNearestBeatMs) {
        const ad = Math.abs(deltaToNearestBeatMs);
        let acc = 'Offbeat';
        if (ad <= this.perfectMs)
            acc = 'Perfect';
        else if (ad <= this.goodMs)
            acc = 'Good';
        switch (acc) {
            case 'Perfect':
                this.multiplier = Math.min(this.comboMax, this.multiplier + this.comboStep);
                this.combo++;
                this.score += Math.round(100 * this.multiplier);
                this.perfect++;
                break;
            case 'Good':
                this.score += Math.round(50 * this.multiplier);
                this.good++;
                break;
            case 'Offbeat':
                this.combo = 0;
                this.multiplier = 1;
                break;
        }
        this.shots++;
        return acc;
    }
    addKill(type) {
        const base = type === 'brute'
            ? 100
            : type === 'dasher'
                ? 75
                : type === 'exploder'
                    ? 120
                    : type === 'weaver'
                        ? 90
                        : type === 'formation'
                            ? 140
                            : type === 'mirrorer'
                                ? 110
                                : type === 'teleporter'
                                    ? 95
                                    : type === 'flooder'
                                        ? 130
                                        : 25;
        this.score += Math.round(base * this.multiplier);
    }
    registerMiss(penalty = 50) {
        this.misses++;
        this.combo = 0;
        this.multiplier = 1;
        this.score = Math.max(0, this.score - penalty);
    }
}
