import Phaser from 'phaser';
export default class Conductor extends Phaser.Events.EventEmitter {
    constructor(scene, barBeats = 4) {
        super();
        this.barBeats = 4;
        this.lastBarTime = 0;
        this.beatCount = 0;
        this.scene = scene;
        this.barBeats = barBeats;
    }
    onBeat() {
        //console.log('Beat detected, calculating BPM...')
        this.beatCount++;
        if (this.beatCount % this.barBeats === 1) {
            this.lastBarTime = this.scene.time.now;
            this.emit('bar:start', { barIndex: Math.floor(this.beatCount / this.barBeats) });
        }
    }
}
