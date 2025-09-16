import Phaser from 'phaser'

export type CubeVariant = 'solid' | 'wire' | 'plasma'

export default class CubeSkin {
  private scene: Phaser.Scene
  private host: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
  private gfx: Phaser.GameObjects.Graphics
  private aura?: Phaser.GameObjects.Particles.ParticleEmitter
  private zapTimer?: Phaser.Time.TimerEvent
  private rotateTween?: Phaser.Tweens.Tween
  private variant: CubeVariant
  private size: number

  constructor(
    scene: Phaser.Scene,
    host: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody,
    variant: CubeVariant,
    size = 28
  ) {
    this.scene = scene
    this.host = host
    this.variant = variant
    this.size = size

    // Dölj originalspriten om du vill (vi ritar själva)
    host.setVisible(false)

    // Grafiken ligger som separat Graphics som följer värdena från host
    this.gfx = scene.add.graphics({ x: host.x, y: host.y }).setDepth(host.depth + 1)
    this.drawCube()

    // Låt grafiken “följa” spriten varje frame
    this.scene.events.on(Phaser.Scenes.Events.UPDATE, this.follow, this)

    // Idle-rotation
    this.rotateTween = this.scene.tweens.add({
      targets: this.gfx,
      angle: { from: 0, to: 360 },
      duration: 4000,
      repeat: -1,
      ease: 'Linear'
    })

    // Variant-effekter
    if (variant === 'solid') {
      this.addAura()
    } else if (variant === 'wire') {
      this.startElectricZaps()
    } else if (variant === 'plasma') {
      this.startPlasmaPulse()
    }
  }

  private follow() {
    this.gfx.x = this.host.x
    this.gfx.y = this.host.y
  }

  private drawCube() {
    const s = this.size
    const g = this.gfx
    g.clear()

    if (this.variant === 'solid' || this.variant === 'plasma') {
      const color = this.variant === 'plasma' ? 0x69d2ff : 0x00e5ff
      g.fillStyle(color, 0.9)
      g.fillRect(-s/2, -s/2, s, s)
      g.lineStyle(2, 0x001a33, 0.9)
      g.strokeRect(-s/2, -s/2, s, s)
      // liten highlight
      g.lineStyle(1, 0xffffff, 0.25)
      g.beginPath(); g.moveTo(-s/2+3, -s/2+6); g.lineTo(s/2-6, -s/2+6); g.strokePath()
    } else {
      // wireframe
      g.lineStyle(2, 0x00e5ff, 1)
      g.strokeRect(-s/2, -s/2, s, s)
      g.lineStyle(1, 0x00e5ff, 0.7)
      g.beginPath(); g.moveTo(-s/2, -s/2); g.lineTo(s/2, s/2); g.strokePath()
      g.beginPath(); g.moveTo(s/2, -s/2); g.lineTo(-s/2, s/2); g.strokePath()
    }
  }

  private addAura() {
    this.aura = this.scene.add.particles(0, 0, 'particles', {
      frame: ['particle_glow_small', 'particle_circle_small'],
      speed: { min: 8, max: 20 },
      lifespan: 900,
      scale: { start: 0.3, end: 0 },
      alpha: { start: 0.35, end: 0 },
      frequency: 60,
      blendMode: 'ADD',
      emitting: true
    })
    this.aura.setDepth(this.gfx.depth - 1)
    this.aura.startFollow(this.gfx)
  }

  private startElectricZaps() {
    this.zapTimer = this.scene.time.addEvent({
      delay: 220,
      loop: true,
      callback: () => {
        const flash = this.scene.add.graphics({ x: this.gfx.x, y: this.gfx.y }).setDepth(this.gfx.depth + 1)
        flash.lineStyle(2, 0x66ccff, 1).setAlpha(0.9)
        // enkel sicksack-ram
        const l = 12
        flash.beginPath()
        flash.moveTo(-l, -l); flash.lineTo(0, -l+4); flash.lineTo(l, -l)
        flash.lineTo(l-4, 0); flash.lineTo(l, l); flash.lineTo(0, l-4)
        flash.lineTo(-l, l); flash.lineTo(-l+4, 0); flash.closePath(); flash.strokePath()
        this.scene.tweens.add({ targets: flash, alpha: 0, duration: 120, onComplete: () => flash.destroy() })
      }
    })
  }

  private startPlasmaPulse() {
    this.scene.tweens.add({
      targets: this.gfx,
      scale: { from: 0.92, to: 1.08 },
      alpha: { from: 0.85, to: 1 },
      yoyo: true,
      duration: 600,
      repeat: -1,
      ease: 'Sine.easeInOut'
    })
  }

  onHit() {
    // liten jitter/juice vid träff
    this.scene.tweens.add({
      targets: this.gfx,
      x: { from: this.gfx.x - 2, to: this.gfx.x + 2 },
      y: { from: this.gfx.y - 2, to: this.gfx.y + 2 },
      duration: 60,
      yoyo: true,
      repeat: 1,
      ease: 'Quad.easeOut'
    })
    // kort flash
    this.gfx.setBlendMode(Phaser.BlendModes.ADD)
    this.scene.time.delayedCall(80, () => this.gfx.setBlendMode(Phaser.BlendModes.NORMAL))
  }

  onDeath() {
    // shatter/gnistor
    const p = this.scene.add.particles(this.gfx.x, this.gfx.y, 'particles', {
      frame: ['particle_glow_small', 'star_small'],
      speed: { min: 60, max: 220 },
      lifespan: { min: 300, max: 800 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 1, end: 0 },
      quantity: 12,
      angle: { min: 0, max: 360 },
      blendMode: 'ADD'
    })
    this.scene.time.delayedCall(250, () => p.destroy())
  }

  destroy() {
    this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.follow, this)
    this.rotateTween?.stop()
    this.zapTimer?.remove(false)
    this.aura?.destroy()
    this.gfx.destroy()
  }
}
