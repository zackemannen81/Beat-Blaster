import Phaser from 'phaser'
import { SceneBackground } from './SceneBackground'
import AudioAnalyzer from './AudioAnalyzer'

export default class CityscapeBackground implements SceneBackground {
  private scene: Phaser.Scene
  private analyzer?: AudioAnalyzer
  private sky!: Phaser.GameObjects.Graphics
  private skyline!: Phaser.GameObjects.Graphics
  private windowGlows: Phaser.GameObjects.Rectangle[] = []
  private scanlines!: Phaser.GameObjects.Graphics
  private starEmitter?: Phaser.GameObjects.Particles.ParticleEmitter
  private beatPulse = 0
  private beatHandler?: (level: number) => void

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  create() {
    const { width, height } = this.scene.scale
    this.sky = this.scene.add.graphics().setDepth(-12)
    this.skyline = this.scene.add.graphics().setDepth(-11)
    this.scanlines = this.scene.add.graphics().setDepth(-9)

    this.drawSky(width, height)
    this.drawSkyline(width, height)

    const starKey = 'city_star_px'
    if (!this.scene.textures.exists(starKey)) {
      const g = this.scene.make.graphics({ add: false })
      g.fillStyle(0xffffff, 1)
      g.fillRect(0, 0, 1, 1)
      g.generateTexture(starKey, 1, 1)
      g.destroy()
    }

    this.starEmitter = this.scene.add.particles(0, 0, starKey, {
      x: { min: 0, max: width },
      y: { min: 0, max: height },
      lifespan: 3000,
      speedY: { min: 10, max: 40 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 0.5, end: 0 },
      quantity: 3,
      blendMode: Phaser.BlendModes.ADD
    })
    this.starEmitter.setDepth(-13)

    this.beatHandler = (level: number) => {
      this.beatPulse = Phaser.Math.Clamp(this.beatPulse + level * 4, 0, 6)
    }
    this.scene.events.on('beat:high', this.beatHandler)
  }

  setAnalyzer(analyzer?: AudioAnalyzer) {
    this.analyzer = analyzer
  }

  update(time: number, delta: number) {
    const { width, height } = this.scene.scale
    this.drawSky(width, height)

    this.beatPulse = Phaser.Math.Linear(this.beatPulse, 0, Math.min(1, delta / 220))

    const bands = this.analyzer?.getBandLevels()
    const high = bands?.high ?? 0

    for (const rect of this.windowGlows) {
      const base = rect.getData('baseAlpha') as number
      const offset = rect.getData('offset') as number
      rect.alpha = Phaser.Math.Clamp(base + Math.sin(time * 0.003 + offset) * 0.1 + high * 0.4 + this.beatPulse * 0.05, 0.08, 0.6)
    }

    this.scanlines.clear()
    this.scanlines.fillStyle(0xff2dff, 0.05 + high * 0.1)
    for (let y = 0; y < height; y += 6) {
      this.scanlines.fillRect(0, y, width, 2)
    }
  }

  destroy() {
    if (this.beatHandler) {
      this.scene.events.off('beat:high', this.beatHandler)
      this.beatHandler = undefined
    }
    this.sky?.destroy()
    this.skyline?.destroy()
    this.scanlines?.destroy()
    this.windowGlows.forEach(r => r.destroy())
    this.windowGlows = []
    if (this.starEmitter) {
      this.starEmitter.stop()
      this.starEmitter.destroy()
      this.starEmitter = undefined
    }
  }

  private drawSky(width: number, height: number) {
    this.sky.clear()
    const topHSV = Phaser.Display.Color.HSVToRGB(((this.scene.time.now * 0.00005) % 1), 0.4, 0.15)
    this.sky.fillStyle(topHSV.color, 1)
    this.sky.fillRect(0, 0, width, height)
    this.sky.fillStyle(0x061124, 0.7)
    this.sky.fillRect(0, height * 0.45, width, height * 0.55)
  }

  private drawSkyline(width: number, height: number) {
    const baseY = height * 0.62
    const layers = 3
    const rng = Phaser.Math.RND
    rng.sow([0x12345])

    for (let layer = 0; layer < layers; layer++) {
      const alpha = 0.2 + layer * 0.12
      const color = Phaser.Display.Color.HSVToRGB((290 + layer * 10) / 360, 0.7, 0.6).color
      this.skyline.fillStyle(color, alpha)
      let x = 0
      while (x < width) {
        const buildingWidth = rng.between(30, 70)
        const buildingHeight = rng.between(80, 160) - layer * 20
        this.skyline.fillRect(x, baseY - buildingHeight + layer * 18, buildingWidth, buildingHeight)

        if (layer === layers - 1) {
          // add windows
          const windowCols = Math.floor(buildingWidth / 8)
          const windowRows = Math.max(3, Math.floor(buildingHeight / 20))
          for (let c = 1; c < windowCols - 1; c++) {
            for (let r = 1; r < windowRows; r++) {
              if (rng.frac() < 0.15) continue
              const wx = x + c * 8 + rng.between(-1, 1)
              const wy = baseY - buildingHeight + r * 12 + rng.between(-2, 2)
              const rect = this.scene.add.rectangle(wx, wy, 4, 6, 0xffe066, 0.18)
              rect.setDepth(-10.5)
              rect.setBlendMode(Phaser.BlendModes.ADD)
              rect.setData('baseAlpha', 0.12 + rng.frac() * 0.15)
              rect.setData('offset', rng.frac() * Math.PI * 2)
              this.windowGlows.push(rect)
            }
          }
        }
        x += buildingWidth + rng.between(10, 25)
      }
    }
  }
}
