import Phaser from 'phaser'

export default class Effects {
  private scene: Phaser.Scene

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  hitSpark(x: number, y: number) {
    // Create and position the emitter at the target coordinates
    const emitter = this.scene.add.particles(x, y, 'particles', {
      frame: ['particle_glow_small', 'particle_circle_small', 'star_small'],
      speed: { min: 80, max: 200 },
      lifespan: 400,
      scale: { start: 0.8, end: 0 },
      alpha: { start: 1, end: 0 },
      blendMode: 'ADD',
      quantity: 2,
      frequency: 100
    })
    // Emit particles at the emitter's position
    emitter.explode(12, 0, 0)
    this.scene.time.delayedCall(400, () => emitter.destroy())
  }

  explosion(x: number, y: number) {
    const emitter = this.scene.add.particles(x, y, 'particles', {
      frame: ['particle_glow_small', 'particle_circle_small','star_small'],
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
      scale: { start: 0.8, end: 0 },
      alpha: { start: 1, end: 0 },
      blendMode: 'ADD',
      emitZone: {
        type: 'random',
        source: new Phaser.Geom.Circle(0, 0, 5),
        quantity: 1
      }
    })
    emitter.explode(1)
    this.scene.time.delayedCall(120, () => {
      // The emitter is a manager; destroying it cleans up all child emitters.
      emitter.destroy()
    })
  }

  showComboText(x: number, y: number, count: number) {
    console.log('Creating combo text:', count, 'at', x, y)
    const text = this.scene.add.text(x, y - 30, `COMBO x${count}`, {
      fontFamily: 'UiFont, sans-serif',
      fontSize: '24px',
      color: '#ffb300',
      stroke: '#000',
      strokeThickness: 2
    }).setOrigin(0.5, 0.5)
    console.log('Text created:', text.text, 'at', text.x, text.y)

    // Animate the text floating up and fading out
    this.scene.tweens.add({
      targets: text,
      y: y - 80,
      alpha: 0,
      duration: 1000,
      ease: 'Power1',
      onComplete: () => text.destroy()
    })
  }

  beatPulse() {
    const cam = this.scene.cameras.main
    const originalZoom = cam.zoom
    this.scene.tweens.add({
      targets: cam,
      zoom: originalZoom * 1.12,  // Scale by percentage to maintain relative zoom
      duration: 60,
      yoyo: true,
      onComplete: () => {
        cam.zoom = originalZoom  // Ensure we return to the exact original zoom
        cam.setZoom(1)
      }
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
