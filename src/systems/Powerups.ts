import Phaser from 'phaser'

export type PowerupType = 'shield' | 'rapid' | 'split' | 'slowmo'

export default class Powerups extends Phaser.Events.EventEmitter {
  private scene: Phaser.Scene
  private rapidUntil = 0
  private splitUntil = 0
  private shieldUntil = 0
  private slowmoUntil = 0

  constructor(scene: Phaser.Scene) {
    super()
    this.scene = scene
  }

  get hasRapid() { return this.scene.time.now < this.rapidUntil }
  get hasSplit() { return this.scene.time.now < this.splitUntil }
  get hasShield() { return this.scene.time.now < this.shieldUntil }
  get hasSlowmo() { return this.scene.time.now < this.slowmoUntil }

  apply(type: PowerupType, durationSec: number) {
    const now = this.scene.time.now
    const end = now + durationSec * 1000
    switch (type) {
      case 'rapid': this.rapidUntil = Math.max(this.rapidUntil, end); break
      case 'split': this.splitUntil = Math.max(this.splitUntil, end); break
      case 'shield': this.shieldUntil = Math.max(this.shieldUntil, end); break
      case 'slowmo': {
        this.slowmoUntil = Math.max(this.slowmoUntil, end)
        this.scene.time.timeScale = 0.8
        // physics
        // @ts-expect-error world exists
        if (this.scene.physics?.world) this.scene.physics.world.timeScale = 0.8
        this.scene.time.delayedCall(durationSec * 1000, () => {
          if (!this.hasSlowmo) {
            this.scene.time.timeScale = 1
            // @ts-expect-error world exists
            if (this.scene.physics?.world) this.scene.physics.world.timeScale = 1
          }
        })
        break
      }
    }
    this.emit('powerup', type)
  }
}

