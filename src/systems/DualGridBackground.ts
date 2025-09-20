import Phaser from 'phaser'
import { SceneBackground } from './SceneBackground'
import AudioAnalyzer from './AudioAnalyzer'

type Bar = {
  rect: Phaser.GameObjects.Rectangle
  glow: Phaser.GameObjects.Image
  phase: number
}

export default class DualGridBackground implements SceneBackground {
  private analyzer?: AudioAnalyzer
  private scene: Phaser.Scene
  private grid!: Phaser.GameObjects.Graphics
  private starEmitter?: Phaser.GameObjects.Particles.ParticleEmitter
  private bars: Bar[] = []
  private gridHue = 180
  private pulseStrength = 0
  private beatHandler?: () => void

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  create() {
    const { width, height } = this.scene.scale

    this.grid = this.scene.add.graphics().setDepth(-9)

    const starKey = 'pulse_star_px'
    if (!this.scene.textures.exists(starKey)) {
      const g = this.scene.make.graphics({ add: false })
      g.fillStyle(0xffffff, 1)
      g.fillCircle(2, 2, 2)
      g.generateTexture(starKey, 4, 4)
      g.destroy()
    }

    this.starEmitter = this.scene.add.particles(0, 0, starKey, {
      x: { min: 0, max: width },
      y: { min: 0, max: height },
      lifespan: 4000,
      speedY: { min: 20, max: 100 },
      scale: { start: 0.6, end: 0 },
      alpha: { start: 0.8, end: 0 },
      quantity: 2,
      blendMode: Phaser.BlendModes.ADD
    })
    this.starEmitter.setDepth(-11)

    const glowKey = 'plasma_glow_disc'
    for (let i = 0; i < 32; i++) {
      const x = width / 2 + (i - 16) * 12
      const rect = this.scene.add.rectangle(x, height - 40, 8, 10, 0xff00ff)
        .setOrigin(0.5, 1)
        .setDepth(-7)
        .setAlpha(0.25)
      const glow = this.scene.add.image(x, rect.y, glowKey)
        .setAlpha(0.12)
        .setScale(0.25)
        .setDepth(-8)
        .setBlendMode(Phaser.BlendModes.ADD)
      this.bars.push({ rect, glow, phase: Math.random() * Math.PI * 2 })
    }

    this.beatHandler = () => {
      this.pulseStrength = 1
    }
    this.scene.events.on('beat:low', this.beatHandler)
  }

  setAnalyzer(analyzer?: AudioAnalyzer) {
    this.analyzer = analyzer
  }

  update(time: number, delta: number) {
    const { width, height } = this.scene.scale

    this.gridHue = (this.gridHue + 0.05) % 360
    const gridColor = Phaser.Display.Color.HSVToRGB(this.gridHue / 360, 1, 1).color
    const pulse = 0.45 + 0.35 * Math.sin(time * 0.0015)

    this.grid.clear()
    this.grid.lineStyle(1.5, gridColor, 0.25 + pulse * 0.4)
    const spacing = 40
    for (let y = -spacing; y <= height; y += spacing) {
      this.grid.beginPath()
      this.grid.moveTo(0, height - y)
      this.grid.lineTo(width, height - y)
      this.grid.strokePath()
    }
    for (let x = 0; x <= width; x += spacing) {
      this.grid.beginPath()
      this.grid.moveTo(x, height)
      this.grid.lineTo(x, 0)
      this.grid.strokePath()
    }

    this.pulseStrength = Phaser.Math.Linear(this.pulseStrength, 0, Math.min(1, delta / 240))

    const spectrum = this.analyzer ? this.analyzer.getSpectrumBins(this.bars.length) : null
    for (let i = 0; i < this.bars.length; i++) {
      const bar = this.bars[i]
      const base = 24 + 24 * Math.sin(time * 0.002 + bar.phase)
      const spec = spectrum ? spectrum[i] : 0
      const pulseAdd = this.pulseStrength * 90 * Math.exp(-i / 36) + spec * 140
      const heightValue = Phaser.Math.Clamp(base + pulseAdd, 8, 160)
      bar.rect.height = heightValue
      bar.rect.y = height - 40 - heightValue

      const hue = (this.gridHue + i * 10 + heightValue) % 360
      const color = Phaser.Display.Color.HSVToRGB(hue / 360, 1, 1).color
      bar.rect.fillColor = color
      bar.rect.alpha = 0.25 + (heightValue / 210)

      bar.glow.y = bar.rect.y + heightValue / 2
      bar.glow.setTint(color)
      bar.glow.setScale(0.18 + heightValue / 170)
      bar.glow.setAlpha(0.08 + heightValue / 340)
    }
  }

  destroy() {
    if (this.beatHandler) {
      this.scene.events.off('beat:low', this.beatHandler)
      this.beatHandler = undefined
    }
    this.grid?.destroy()
    if (this.starEmitter) {
      this.starEmitter.stop()
      this.starEmitter.destroy()
      this.starEmitter = undefined
    }
    this.bars.forEach(({ rect, glow }) => {
      rect.destroy()
      glow.destroy()
    })
    this.bars = []
  }
}
