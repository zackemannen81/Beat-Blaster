import Phaser from 'phaser'

export type CubeVariant = 'solid' | 'wire' | 'plasma'

export type CubeDesign = 'cube' | 'diamond' | 'triangle' | 'ring' | 'bar' | 'hex'

export interface CubeSkinOptions {
  variant?: CubeVariant
  size?: number
  primaryColor?: number
  secondaryColor?: number
  glowColor?: number
  rotationDuration?: number
  pulseScale?: number
  pulseDuration?: number
  design?: CubeDesign
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
  private ringPulse?: Phaser.Time.TimerEvent
  private ringGlow?: Phaser.GameObjects.Arc
  private ringUpdate?: () => void
  private baselineScale = 1
  private glowBaseScale = 1
  private variant: CubeVariant
  private design: CubeDesign = 'cube'
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
    this.design = options.design ?? 'cube'
    this.size = options.size ?? 28
    this.primaryColor = options.primaryColor ?? 0x00e5ff
    this.secondaryColor = options.secondaryColor ?? 0x001a33
    this.glowColor = options.glowColor
    this.pulseScale = options.pulseScale ?? 0.1
    this.pulseDuration = options.pulseDuration ?? 180

    host.setVisible(false)

    this.gfx = scene.add.graphics({ x: host.x, y: host.y }).setDepth(host.depth + 1)
    this.gfx.setScale(this.baselineScale)
    this.drawShape()

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

    const rotationDuration = options.rotationDuration ?? 4000
    if (rotationDuration > 0) {
      this.rotateTween = this.scene.tweens.add({
        targets: rotateTargets,
        angle: { from: 0, to: 360 },
        duration: rotationDuration,
        repeat: -1,
        ease: 'Linear'
      })
    }

    if (this.variant === 'solid' && this.design !== 'bar') {
      this.addAura()
    } else if (this.variant === 'wire') {
      this.startElectricZaps()
    }

    if (this.design === 'ring') {
      this.startRingPulse()
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

  private drawShape() {
    const s = this.size
    const g = this.gfx
    g.clear()

    switch (this.design) {
      case 'diamond':
        this.drawDiamond(g, s)
        break
      case 'triangle':
        this.drawTriangle(g, s)
        break
      case 'ring':
        this.drawRing(g, s)
        break
      case 'bar':
        this.drawBar(g, s)
        break
      case 'hex':
        this.drawHex(g, s)
        break
      default:
        this.drawCubeShape(g, s)
        break
    }
  }

  private drawCubeShape(g: Phaser.GameObjects.Graphics, s: number) {
    if (this.variant === 'solid' || this.variant === 'plasma') {
      g.fillStyle(this.primaryColor, 0.92)
      g.fillRect(-s / 2, -s / 2, s, s)
      g.lineStyle(2, this.secondaryColor, 0.9)
      g.strokeRect(-s / 2, -s / 2, s, s)
      g.lineStyle(1, 0xffffff, 0.25)
      g.beginPath()
      g.moveTo(-s / 2 + 3, -s / 2 + 6)
      g.lineTo(s / 2 - 6, -s / 2 + 6)
      g.strokePath()
    } else {
      g.lineStyle(2, this.primaryColor, 1)
      g.strokeRect(-s / 2, -s / 2, s, s)
      g.lineStyle(1, this.primaryColor, 0.7)
      g.beginPath()
      g.moveTo(-s / 2, -s / 2)
      g.lineTo(s / 2, s / 2)
      g.strokePath()
      g.beginPath()
      g.moveTo(s / 2, -s / 2)
      g.lineTo(-s / 2, s / 2)
      g.strokePath()
    }
  }

  private drawDiamond(g: Phaser.GameObjects.Graphics, s: number) {
    const half = s / 2
    g.fillStyle(this.primaryColor, 0.9)
    g.lineStyle(2, this.secondaryColor, 0.9)
    g.beginPath()
    g.moveTo(0, -half)
    g.lineTo(half, 0)
    g.lineTo(0, half)
    g.lineTo(-half, 0)
    g.closePath()
    g.fillPath()
    g.strokePath()
  }

  private drawTriangle(g: Phaser.GameObjects.Graphics, s: number) {
    const half = s / 2
    g.fillStyle(this.primaryColor, 0.85)
    g.lineStyle(2, this.secondaryColor, 0.9)
    g.beginPath()
    g.moveTo(0, -half)
    g.lineTo(half, half)
    g.lineTo(-half, half)
    g.closePath()
    g.fillPath()
    g.strokePath()
    g.lineStyle(1, 0xffffff, 0.25)
    g.beginPath()
    g.moveTo(0, -half * 0.4)
    g.lineTo(half * 0.5, half * 0.6)
    g.moveTo(0, -half * 0.4)
    g.lineTo(-half * 0.5, half * 0.6)
    g.strokePath()
  }

  private drawRing(g: Phaser.GameObjects.Graphics, s: number) {
    const outer = s * 0.55
    const inner = s * 0.28
    g.fillStyle(this.secondaryColor, 0.3)
    g.beginPath()
    g.arc(0, 0, outer, 0, Math.PI * 2)
    g.fillPath()
    g.lineStyle(3, this.primaryColor, 0.85)
    g.strokeCircle(0, 0, outer)
    g.fillStyle(0x000000, 1)
    g.beginPath()
    g.arc(0, 0, inner, 0, Math.PI * 2)
    g.fillPath()
  }

  private drawBar(g: Phaser.GameObjects.Graphics, s: number) {
    const width = s * 1.8
    const height = s * 1.1
    g.fillStyle(this.primaryColor, 0.85)
    g.fillRoundedRect(-width / 2, -height / 2, width, height, 12)
    g.lineStyle(2, this.secondaryColor, 0.9)
    g.strokeRoundedRect(-width / 2, -height / 2, width, height, 12)
    g.lineStyle(1, 0xffffff, 0.2)
    g.beginPath()
    g.moveTo(-width / 2 + 6, 0)
    g.lineTo(width / 2 - 6, 0)
    g.strokePath()
  }

  private drawHex(g: Phaser.GameObjects.Graphics, s: number) {
    const r = s / 2
    g.fillStyle(this.primaryColor, 0.9)
    g.lineStyle(2, this.secondaryColor, 0.9)
    g.beginPath()
    for (let i = 0; i < 6; i++) {
      const angle = Phaser.Math.DegToRad(60 * i - 30)
      const x = Math.cos(angle) * r
      const y = Math.sin(angle) * r
      if (i === 0) g.moveTo(x, y)
      else g.lineTo(x, y)
    }
    g.closePath()
    g.fillPath()
    g.strokePath()
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

  private startRingPulse() {
    this.ringGlow = this.scene.add.circle(this.gfx.x, this.gfx.y, this.size * 0.5, this.primaryColor, 0.3)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(this.gfx.depth - 1)
    this.ringUpdate = () => {
      if (!this.ringGlow) return
      this.ringGlow.x = this.gfx.x
      this.ringGlow.y = this.gfx.y
    }
    this.scene.events.on(Phaser.Scenes.Events.UPDATE, this.ringUpdate, this)
    this.ringPulse = this.scene.time.addEvent({
      delay: 240,
      loop: true,
      callback: () => {
        if (!this.ringGlow) return
        this.scene.tweens.add({
          targets: this.ringGlow,
          radius: { from: this.size * 0.4, to: this.size * 0.65 },
          alpha: { from: 0.35, to: 0 },
          duration: 260,
          ease: 'Cubic.easeOut'
        })
      }
    })
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
    if (this.ringUpdate) {
      this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.ringUpdate, this)
      this.ringUpdate = undefined
    }
    this.rotateTween?.stop()
    this.scene.tweens.killTweensOf([this.gfx, this.glowSprite, this.ringGlow])
    this.zapTimer?.remove(false)
    this.aura?.destroy()
    this.pulseTween?.stop()
    this.ringPulse?.remove(false)
    if (this.ringGlow) {
      this.ringGlow.destroy()
      this.ringGlow = undefined
    }
    this.glowSprite?.destroy()
    this.gfx.destroy()
  }
}
