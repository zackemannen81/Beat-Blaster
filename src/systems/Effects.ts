import Phaser from 'phaser'

export default class Effects {
  private scene: Phaser.Scene

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  hitSpark(x: number, y: number) {
    const emitter = this.scene.add.particles(x, y, 'particles', {
      frame: ['particle_circle_small', 'star_small'],
      speed: { min: 60, max: 160 },
      lifespan: 300,
      scale: { start: 0.6, end: 0 },
      alpha: { start: 1, end: 0 },
      blendMode: 'ADD'
    })
    emitter.explode(10, x, y)
    this.scene.time.delayedCall(200, () => emitter.destroy())
  }

  explosion(x: number, y: number) {
    const emitter = this.scene.add.particles(x, y, 'particles', {
      frame: ['particle_glow_small', 'particle_circle_small'],
      speed: { min: 120, max: 300 },
      lifespan: 600,
      scale: { start: 1.0, end: 0 },
      alpha: { start: 1, end: 0 },
      blendMode: 'ADD'
    })
    emitter.explode(40, x, y)
    this.scene.cameras.main.shake(120, 0.01)
    this.scene.time.delayedCall(350, () => emitter.destroy())
  }

  muzzleFlash(x: number, y: number) {
    const emitter = this.scene.add.particles(x, y, 'particles', {
      frame: 'particle_glow_small',
      speed: 0,
      lifespan: 120,
      scale: { start: 0.6, end: 0 },
      alpha: { start: 1, end: 0 },
      blendMode: 'ADD'
    })
    emitter.explode(1, 0, 0)
    this.scene.time.delayedCall(120, () => {
      // The emitter is a manager; destroying it cleans up all child emitters.
      emitter.destroy()
    })
  }

  beatPulse() {
    const cam = this.scene.cameras.main
    this.scene.tweens.add({
      targets: cam,
      zoom: cam.zoom + 0.02,
      duration: 60,
      yoyo: true
    })
  }

  hitFlash(target: Phaser.GameObjects.Sprite) {
    if (!this.scene) return
    target.setTintFill(0xffffff)
    this.scene.time.delayedCall(80, () => {
      target.clearTint()
    })
  }
}
