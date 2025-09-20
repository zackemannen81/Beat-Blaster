import Phaser from 'phaser'
import { SceneBackground } from './SceneBackground'
import AudioAnalyzer from './AudioAnalyzer'

export default class TunnelBackground implements SceneBackground {
  private scene: Phaser.Scene
  private analyzer?: AudioAnalyzer
  private rings: Phaser.GameObjects.Graphics[] = []
  private sparks?: Phaser.GameObjects.Particles.ParticleEmitter
  private beatPulse = 0
  private beatHandler?: (level: number) => void

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  create() {
    const { width, height } = this.scene.scale
    const ringCount = 8
    for (let i = 0; i < ringCount; i++) {
      const g = this.scene.add.graphics().setDepth(-10 + i * 0.2)
      this.rings.push(g)
    }

    const sparkKey = 'tunnel_spark'
    if (!this.scene.textures.exists(sparkKey)) {
      const g = this.scene.make.graphics({ add: false })
      g.fillStyle(0xffffff, 1)
      g.fillRect(0, 0, 2, 6)
      g.generateTexture(sparkKey, 2, 6)
      g.destroy()
    }

    this.sparks = this.scene.add.particles(width / 2, height / 2, sparkKey, {
      lifespan: 1200,
      speed: { min: 80, max: 160 },
      quantity: 2,
      frequency: 120,
      scale: { start: 0.6, end: 0 },
      alpha: { start: 0.4, end: 0 },
      angle: { min: -15, max: 15 },
      rotate: { min: -120, max: 120 },
      blendMode: Phaser.BlendModes.ADD
    })
    this.sparks.setDepth(-9)

    this.beatHandler = (level: number) => {
      this.beatPulse = Phaser.Math.Clamp(this.beatPulse + level * 5, 0, 6)
    }
    this.scene.events.on('beat:low', this.beatHandler)
  }

  setAnalyzer(analyzer?: AudioAnalyzer) {
    this.analyzer = analyzer
  }

  update(time: number, delta: number) {
    const { width, height } = this.scene.scale
    const centerX = width / 2
    const centerY = height / 2

    this.beatPulse = Phaser.Math.Linear(this.beatPulse, 0, Math.min(1, delta / 200))
    const bands = this.analyzer?.getBandLevels()
    const high = bands?.high ?? 0

    for (let i = 0; i < this.rings.length; i++) {
      const g = this.rings[i]
      g.clear()
      const progress = (time * 0.0004 + i * 0.12) % 1
      const scale = Phaser.Math.Interpolation.SmoothStep(progress, 0.2, 1.2)
      const radius = Math.max(width, height) * scale
      const alpha = 0.16 - progress * 0.14 + this.beatPulse * 0.02
      if (alpha <= 0) continue
      const hue = (200 + i * 30 + time * 0.02) % 360
      g.lineStyle(2, Phaser.Display.Color.HSVToRGB(hue / 360, 0.9, 0.9).color, alpha)
      g.strokeCircle(centerX, centerY, radius)
    }

    if (this.sparks) {
      const freq = Phaser.Math.Clamp(100 - high * 40, 20, 140)
      ;(this.sparks as any).setFrequency(freq)
      const scale = 0.4 + high * 0.6 + this.beatPulse * 0.2
      this.sparks.setScale(scale)    }
  }

  destroy() {
    if (this.beatHandler) {
      this.scene.events.off('beat:low', this.beatHandler)
      this.beatHandler = undefined
    }
    this.rings.forEach(g => g.destroy())
    this.rings = []
    if (this.sparks) {
      this.sparks.stop()
      this.sparks.destroy()
      this.sparks = undefined
    }
  }
}
