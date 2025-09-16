// systems/PlayerSkin.ts
import Phaser from 'phaser'

export default class PlayerSkin {
  private scene: Phaser.Scene
  private host: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
  private gfx: Phaser.GameObjects.Graphics
  private trailCyan?: Phaser.GameObjects.Particles.ParticleEmitter
  private trailPink?: Phaser.GameObjects.Particles.ParticleEmitter
  private pulseTween?: Phaser.Tweens.Tween

  constructor(scene: Phaser.Scene, host: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody) {
    this.scene = scene
    this.host = host

    // vi ritar själva; host = fysik/kollision
    this.host.setVisible(false)

    // spelargrafik
    this.gfx = scene.add.graphics({ x: host.x, y: host.y }).setDepth(900)
    this.drawTriangle(18)

    // följ host varje frame
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.follow, this)

    // --- säkerställ att glow-texturer finns (om BootScene inte hann) ---
    const ensureGlow = (key: string, color: number, size = 24) => {
      if (this.scene.textures.exists(key)) return
      const g = this.scene.add.graphics({ x: 0, y: 0 }).setVisible(false)
      const cx = size / 2, cy = size / 2, layers = 6, r = size * 0.48
      for (let i = 0; i < layers; i++) {
        const t = 1 - i / layers
        g.fillStyle(color, 0.10 + 0.12 * t)
        g.fillCircle(cx, cy, r * t)
      }
      g.lineStyle(1, 0xffffff, 0.12)
      g.strokeCircle(cx, cy, r * 0.85)
      g.generateTexture(key, size, size)
      g.destroy()
    }
    ensureGlow('p_glow_cyan', 0x00e5ff, 24)
    ensureGlow('p_glow_pink', 0xff5db1, 24)

    const hasCyan = scene.textures.exists('p_glow_cyan')
    const hasPink = scene.textures.exists('p_glow_pink')

    // === CYAN TRAIL === (Phaser 3.90: 4-args utan config; sätt props via metoder)
    this.trailCyan = scene.add.particles(0, 0, hasCyan ? 'p_glow_cyan' : 'particles')
    if (!hasCyan) { (this.trailCyan as any).setFrame?.('particle_glow_small') }
    ;(this.trailCyan as any).setLifespan?.(220, 320)
    ;(this.trailCyan as any).setSpeed?.(10, 26)
    ;(this.trailCyan as any).setScale?.({ start: 0.5, end: 0 })
    ;(this.trailCyan as any).setAlpha?.({ start: 1, end: 0 })
    ;(this.trailCyan as any).setAngle?.(170, 190)
    ;(this.trailCyan as any).setQuantity?.(1)
    ;(this.trailCyan as any).setFrequency?.(16)
    ;(this.trailCyan as any).setBlendMode?.(Phaser.BlendModes.ADD)
    this.trailCyan.startFollow(this.gfx, 0, 8)
    ;(this.trailCyan as any).setDepth?.(this.gfx.depth + 1)
    ;(this.trailCyan as any).emitting = true

    // === PINK TRAIL (blink på high-beat) ===
    if (hasPink) {
      this.trailPink = scene.add.particles(0, 0, 'p_glow_pink')
      ;(this.trailPink as any).setLifespan?.(220, 320)
      ;(this.trailPink as any).setSpeed?.(10, 26)
      ;(this.trailPink as any).setScale?.({ start: 0.5, end: 0 })
      ;(this.trailPink as any).setAlpha?.({ start: 1, end: 0 })
      ;(this.trailPink as any).setAngle?.(170, 190)
      ;(this.trailPink as any).setQuantity?.(1)
      ;(this.trailPink as any).setFrequency?.(16)
      ;(this.trailPink as any).setBlendMode?.(Phaser.BlendModes.ADD)
      this.trailPink.startFollow(this.gfx, 0, 8)
      ;(this.trailPink as any).setDepth?.(this.gfx.depth + 1)
      ;(this.trailPink as any).emitting = false
    }

    // beat-pulse
    scene.events.on('beat:low', this.onBeatLow, this)
    scene.events.on('beat:mid', this.onBeatMid, this)
    scene.events.on('beat:high', this.onBeatHigh, this)
  }

  private follow = () => {
    this.gfx.x = this.host.x
    this.gfx.y = this.host.y
    this.gfx.rotation = this.host.rotation
  }

  private drawTriangle(size: number) {
    const g = this.gfx
    g.clear()
    g.fillStyle(0x00e5ff, 0.12)
    g.fillCircle(0, 0, size + 6)
    const s = size
    g.fillStyle(0x00e5ff, 0.95)
    g.beginPath()
    g.moveTo(0, -s)
    g.lineTo(s * 0.7, s * 0.8)
    g.lineTo(-s * 0.7, s * 0.8)
    g.closePath()
    g.fillPath()
    g.lineStyle(2, 0xffffff, 0.35)
    g.strokePath()
  }

  private pulse(scaleTo = 1.12, dur = 120) {
    this.pulseTween?.stop()
    this.pulseTween = this.scene.tweens.add({
      targets: this.gfx,
      scale: { from: 1, to: scaleTo },
      yoyo: true,
      duration: dur,
      ease: 'Sine.easeOut'
    })
  }

  // beat-hooks
  private onBeatLow = () => this.pulse(1.14, 140)
  private onBeatMid = () => this.pulse(1.10, 120)
  private onBeatHigh = () => {
    this.pulse(1.12, 140)
    if (this.trailPink && this.trailCyan) {
      ;(this.trailCyan as any).emitting = false
      ;(this.trailPink as any).emitting = true
      this.scene.time.delayedCall(160, () => {
        if (!this.trailPink || !this.trailCyan) return
        ;(this.trailPink as any).emitting = false
        ;(this.trailCyan as any).emitting = true
      })
    }
  }

  onHit() {
    const old = this.gfx.blendMode
    this.gfx.setBlendMode(Phaser.BlendModes.ADD)
    this.scene.time.delayedCall(80, () => this.gfx.setBlendMode(old))
    this.pulse(1.16, 90)
  }

  onDeath() {
    // Death-burst: skapa utan frame, sätt props via metoder
    const usesCustom = this.scene.textures.exists('p_glow_cyan')
    const textureKey = usesCustom ? 'p_glow_cyan' : 'particles'
    const burst = this.scene.add.particles(this.gfx.x, this.gfx.y, textureKey)
    if (!usesCustom) { (burst as any).setFrame?.('star_small') }
    ;(burst as any).setSpeed?.(60, 220)
    ;(burst as any).setLifespan?.(300, 700)
    ;(burst as any).setScale?.({ start: 0.9, end: 0 })
    ;(burst as any).setAlpha?.({ start: 1, end: 0 })
    ;(burst as any).setQuantity?.(12)
    ;(burst as any).setAngle?.(0, 360)
    ;(burst as any).setBlendMode?.(Phaser.BlendModes.ADD)
    ;(burst as any).explode?.(12, this.gfx.x, this.gfx.y)
    this.scene.time.delayedCall(220, () => { (burst as any).stop?.(); burst.destroy() })
  }

  destroy() {
    this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.follow, this)
    this.scene.events.off('beat:low', this.onBeatLow, this)
    this.scene.events.off('beat:mid', this.onBeatMid, this)
    this.scene.events.off('beat:high', this.onBeatHigh, this)
    this.trailCyan?.stop(); this.trailCyan?.destroy()
    this.trailPink?.stop(); this.trailPink?.destroy()
    this.gfx.destroy()
  }
}
