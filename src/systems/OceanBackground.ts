import Phaser from 'phaser'
import { SceneBackground } from './SceneBackground'
import AudioAnalyzer from './AudioAnalyzer'

export default class OceanBackground implements SceneBackground {
  private scene: Phaser.Scene
  private analyzer?: AudioAnalyzer
  private water!: Phaser.GameObjects.Graphics
  private sunGlow!: Phaser.GameObjects.Image
  private foamEmitter?: Phaser.GameObjects.Particles.ParticleEmitter
  private creatures: Phaser.GameObjects.Image[] = []
  private beatPulse = 0
  private beatHandler?: (level: number) => void

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  create() {
    const { width, height } = this.scene.scale

    this.water = this.scene.add.graphics().setDepth(-9)

    const glowKey = 'ocean_glow'
    if (!this.scene.textures.exists(glowKey)) {
      const g = this.scene.make.graphics({ add: false })
      g.fillStyle(0xffffff, 1)
      g.fillCircle(64, 64, 64)
      g.generateTexture(glowKey, 128, 128)
      g.destroy()
    }

    this.sunGlow = this.scene.add.image(width / 2, height * 0.3, glowKey)
      .setTint(0xff66cc)
      .setDepth(-8)
      .setAlpha(0.35)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(3.2)

    const foamKey = 'ocean_foam'
    if (!this.scene.textures.exists(foamKey)) {
      const g = this.scene.make.graphics({ add: false })
      g.fillStyle(0xffffff, 1)
      g.fillEllipse(6, 4, 12, 8)
      g.generateTexture(foamKey, 12, 8)
      g.destroy()
    }

    this.foamEmitter = this.scene.add.particles(width / 2, height * 0.55, foamKey, {
      lifespan: 2600,
      speedX: { min: -20, max: 20 },
      speedY: { min: -10, max: 10 },
      scale: { start: 0.4, end: 0 },
      alpha: { start: 0.25, end: 0 },
      quantity: 2,
      frequency: 160,
      blendMode: Phaser.BlendModes.ADD
    })
    this.foamEmitter.setDepth(-8)

    const jellyKey = 'ocean_jelly'
    if (!this.scene.textures.exists(jellyKey)) {
      const g = this.scene.make.graphics({ add: false })
      g.fillStyle(0xffffff, 0.8)
      g.fillEllipse(12, 10, 24, 20)
      g.fillRect(6, 10, 12, 18)
      g.generateTexture(jellyKey, 24, 28)
      g.destroy()
    }

    for (let i = 0; i < 4; i++) {
      const img = this.scene.add.image(
        Phaser.Math.Between(40, width - 40),
        Phaser.Math.Between(height * 0.4, height * 0.65),
        jellyKey
      )
        .setDepth(-7)
        .setAlpha(0.18)
        .setScale(Phaser.Math.FloatBetween(0.6, 0.9))
        .setBlendMode(Phaser.BlendModes.ADD)
      img.setData('offset', Math.random() * Math.PI * 2)
      this.creatures.push(img)
    }

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

    this.beatPulse = Phaser.Math.Linear(this.beatPulse, 0, Math.min(1, delta / 250))
    const bands = this.analyzer?.getBandLevels()
    const low = bands?.low ?? 0
    const high = bands?.high ?? 0

    this.sunGlow.setScale(3.0 + this.beatPulse * 0.2 + low * 0.8)
    this.sunGlow.setAlpha(0.25 + high * 0.3)

    this.water.clear()
    const horizon = height * 0.55
    this.water.fillStyle(0x0c0422, 1)
    this.water.fillRect(0, horizon, width, height - horizon)

    const waveCount = 6
    for (let i = 0; i < waveCount; i++) {
      const amp = 14 + i * 6 + this.beatPulse * 12
      const speed = 0.0012 + i * 0.0002
      const y = horizon + i * 28
      this.water.lineStyle(1, Phaser.Display.Color.HSVToRGB((220 + i * 12) / 360, 0.7, 0.9).color, 0.18)
      this.water.beginPath()
      for (let x = 0; x <= width; x += 10) {
        const waveY = y + Math.sin(time * speed + x * 0.02 + i) * amp
        if (x === 0) this.water.moveTo(x, waveY)
        else this.water.lineTo(x, waveY)
      }
      this.water.strokePath()
    }

    this.creatures.forEach(img => {
      const offset = img.getData('offset') as number
      const sway = Math.sin(time * 0.0012 + offset) * 10
      img.y += Math.sin(time * 0.0006 + offset) * 0.1
      img.x += Math.cos(time * 0.0005 + offset) * 0.08
      img.rotation = sway * 0.002
    })
  }

  destroy() {
    if (this.beatHandler) {
      this.scene.events.off('beat:low', this.beatHandler)
      this.beatHandler = undefined
    }
    this.water?.destroy()
    this.sunGlow?.destroy()
    if (this.foamEmitter) {
      this.foamEmitter.stop()
      this.foamEmitter.destroy()
      this.foamEmitter = undefined
    }
    this.creatures.forEach(c => c.destroy())
    this.creatures = []
  }
}
