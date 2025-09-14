import Phaser from 'phaser'

export default class Conductor extends Phaser.Events.EventEmitter {
  private scene: Phaser.Scene
  private barBeats = 4
  private lastBarTime = 0
  private beatCount = 0

  constructor(scene: Phaser.Scene, barBeats = 4) {
    super()
    this.scene = scene
    this.barBeats = barBeats
  }

  onBeat() {
    this.beatCount++
    if (this.beatCount % this.barBeats === 1) {
      this.lastBarTime = this.scene.time.now
      this.emit('bar:start', { barIndex: Math.floor(this.beatCount / this.barBeats) })
    }
  }
}

