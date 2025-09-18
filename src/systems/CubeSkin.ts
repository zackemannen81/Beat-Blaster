import Phaser from 'phaser'

export type CubeVariant = 'solid' | 'wire' | 'plasma'

export interface CubeSkinOptions {
  variant?: CubeVariant
  size?: number
  primaryColor?: number
  secondaryColor?: number
  glowColor?: number
  rotationDuration?: number
  pulseScale?: number
  pulseDuration?: number
}

export default class CubeSkin {
  private scene: Phaser.Scene
  private host: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
  private gfx: Phaser.GameObjects.Graphics
  private glowSprite?: Phaser.GameObjects.Image
  private aura?: Phaser.GameObjects.Particles.ParticleEmitter
  private zapTimer?: Phaser.Time.TimerEvent
  private rotateTween?: Phaser.Tweens.Tween
  private pulseTween?: Phaser.Tweens.Tween
  private baselineScale = 1
  private glowBaseScale = 1
  private variant: CubeVariant
  private size: number
  private primaryColor: number
  private secondaryColor: number
  private glowColor?: number
  private pulseScale: number
  private pulseDuration: number

  constructor(
    scene: Phaser.Scene,
    host: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody,
    options: CubeSkinOptions = {}
  ) {
    this.scene = scene
    this.host = host
    this.variant = options.variant ?? 'solid'
    this.size = options.size ?? 28
    this.primaryColor = options.primaryColor ?? 0x00e5ff
    this.secondaryColor = options.secondaryColor ?? 0x001a33
    this.glowColor = options.glowColor
    this.pulseScale = options.pulseScale ?? 0.1
    this.pulseDuration = options.pulseDuration ?? 180

    host.setVisible(false)

    this.gfx = scene.add.graphics({ x: host.x, y: host.y }).setDepth(host.depth + 1)
    this.gfx.setScale(this.baselineScale)
    this.drawCube()

    if (this.glowColor !== undefined && this.scene.textures.exists('plasma_glow_disc')) {
      this.glowSprite = this.scene.add.image(host.x, host.y, 'plasma_glow_disc')
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(host.depth)
      this.glowSprite.setTint(this.glowColor)
      this.glowBaseScale = this.size / 24
      this.glowSprite.setScale(this.glowBaseScale)
      this.glowSprite.setAlpha(0.9)
    }

    this.scene.events.on(Phaser.Scenes.Events.UPDATE, this.follow, this)

    const rotateTargets: Phaser.GameObjects.GameObject[] = [this.gfx]
    if (this.glowSprite) rotateTargets.push(this.glowSprite)

    this.rotateTween = this.scene.tweens.add({
      targets: rotateTargets,
      angle: { from: 0, to: 360 },
      duration: options.rotationDuration ?? 4000,
      repeat: -1,
      ease: 'Linear'
    })

    if (this.variant === 'solid') {
      this.addAura()
    } else if (this.variant === 'wire') {
      this.startElectricZaps()
    }
  }

  private follow() {
    this.gfx.x = this.host.x
    this.gfx.y = this.host.y
    if (this.glowSprite) {
      this.glowSprite.x = this.host.x
      this.glowSprite.y = this.host.y
    }
  }

  private drawCube() {
    const s = this.size
    const g = this.gfx
    g.clear()

    if (this.variant === 'solid' || this.variant === 'plasma') {
      g.fillStyle(this.primaryColor, 0.92)
      g.fillRect(-s/2, -s/2, s, s)
      g.lineStyle(2, this.secondaryColor, 0.9)
      g.strokeRect(-s/2, -s/2, s, s)
      // liten highlight
      g.lineStyle(1, 0xffffff, 0.25)
      g.beginPath(); g.moveTo(-s/2+3, -s/2+6); g.lineTo(s/2-6, -s/2+6); g.strokePath()
    } else {
      // wireframe
      g.lineStyle(2, this.primaryColor, 1)
      g.strokeRect(-s/2, -s/2, s, s)
      g.lineStyle(1, this.primaryColor, 0.7)
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
    const zapColor = this.primaryColor
    this.zapTimer = this.scene.time.addEvent({
      delay: 220,
      loop: true,
      callback: () => {
        const flash = this.scene.add.graphics({ x: this.gfx.x, y: this.gfx.y }).setDepth(this.gfx.depth + 1)
        flash.lineStyle(2, zapColor, 1).setAlpha(0.9)
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

  pulse(scaleMultiplier?: number) {
    const amplitude = scaleMultiplier ?? this.pulseScale
    const targetScale = this.baselineScale * (1 + amplitude)
    const targets: Phaser.GameObjects.GameObject[] = [this.gfx]
    if (this.glowSprite) targets.push(this.glowSprite)
    this.pulseTween?.stop()
    this.pulseTween = this.scene.tweens.add({
      targets,
      scale: targetScale,
      duration: this.pulseDuration,
      yoyo: true,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.gfx.setScale(this.baselineScale)
        if (this.glowSprite) this.glowSprite.setScale(this.glowBaseScale)
      }
    })
    if (this.glowSprite) {
      this.scene.tweens.add({
        targets: this.glowSprite,
        alpha: { from: this.glowSprite.alpha, to: 1.4 },
        duration: this.pulseDuration,
        yoyo: true,
        ease: 'Cubic.easeOut',
        onComplete: () => this.glowSprite && this.glowSprite.setAlpha(0.9)
      })
    }
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
    this.pulseTween?.stop()
    this.glowSprite?.destroy()
    this.gfx.destroy()
  }
}
