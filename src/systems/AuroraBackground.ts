import Phaser from 'phaser'
import { SceneBackground } from './SceneBackground'
import AudioAnalyzer from './AudioAnalyzer'

export default class AuroraBackground implements SceneBackground {
  private scene: Phaser.Scene
  private analyzer?: AudioAnalyzer
  private sky!: Phaser.GameObjects.Graphics
  private mountains!: Phaser.GameObjects.Graphics
  private fog!: Phaser.GameObjects.Graphics
  private auroraBands: Phaser.GameObjects.Graphics[] = []
  private beatPulse = 0
  private beatHandler?: (level: number) => void

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  create() {
    const { width, height } = this.scene.scale
    this.sky = this.scene.add.graphics().setDepth(-11)
    this.mountains = this.scene.add.graphics().setDepth(-10)
    this.fog = this.scene.add.graphics().setDepth(-9)

    this.drawMountains(width, height)

    const bandCount = 5
    for (let i = 0; i < bandCount; i++) {
      const g = this.scene.add.graphics().setDepth(-10 + i * 0.1)
      this.auroraBands.push(g)
    }

    this.beatHandler = (level: number) => {
      this.beatPulse = Phaser.Math.Clamp(this.beatPulse + level * 6, 0, 8)
    }
    this.scene.events.on('beat:mid', this.beatHandler)
  }

  setAnalyzer(analyzer?: AudioAnalyzer) {
    this.analyzer = analyzer
  }

  update(time: number, delta: number) {
    const { width, height } = this.scene.scale

    this.sky.clear()
    const topColor = Phaser.Display.Color.HSVToRGB((time * 0.00005) % 1, 0.35, 0.15).color
    this.sky.fillStyle(topColor, 1)
    this.sky.fillRect(0, 0, width, height)

    this.beatPulse = Phaser.Math.Linear(this.beatPulse, 0, Math.min(1, delta / 180))

    const bands = this.analyzer?.getBandLevels()
    const mid = bands?.mid ?? 0
    const high = bands?.high ?? 0
    const low = bands?.low ?? 0

    for (let i = 0; i < this.auroraBands.length; i++) {
      const g = this.auroraBands[i]
      g.clear()
      const t = time * 0.0004 + i * 0.4
      const amplitude = 60 + this.beatPulse * 12 + mid * 150
      const baseY = height * 0.28 + i * 24
      g.lineStyle(18, Phaser.Display.Color.HSVToRGB(((i * 40 + time * 0.02) % 360) / 360, 0.9, 0.8).color, 0.25 + high * 0.5)
      g.beginPath()
      for (let x = -40; x <= width + 40; x += 12) {
        const y = baseY + Math.sin(t + x * 0.012) * amplitude
        if (x === -40) g.moveTo(x, y)
        else g.lineTo(x, y)
      }
      g.strokePath()
    }

    this.fog.clear()
    this.fog.fillStyle(0x2b0c3f, 0.65 + low * 0.4)
    this.fog.fillRect(0, height * 0.55, width, height * 0.45)
  }

  destroy() {
    if (this.beatHandler) {
      this.scene.events.off('beat:mid', this.beatHandler)
      this.beatHandler = undefined
    }
    this.sky?.destroy()
    this.mountains?.destroy()
    this.fog?.destroy()
    this.auroraBands.forEach(g => g.destroy())
    this.auroraBands = []
  }

  private drawMountains(width: number, height: number) {
    this.mountains.clear()
    this.mountains.fillStyle(0x090314, 1)
    const baseY = height * 0.6
    const peaks = 6
    for (let layer = 0; layer < 3; layer++) {
      const offset = layer * 40
      const alpha = 0.18 + layer * 0.12
      this.mountains.fillStyle(0x120125, alpha)
      this.mountains.beginPath()
      this.mountains.moveTo(0, baseY + offset)
      for (let i = 0; i <= peaks; i++) {
        const x = (i / peaks) * width
        const peakHeight = 80 + layer * 30
        const y = baseY + offset - peakHeight * Math.sin(i * 1.1 + layer)
        this.mountains.lineTo(x, y)
      }
      this.mountains.lineTo(width, height)
      this.mountains.lineTo(0, height)
      this.mountains.closePath()
      this.mountains.fillPath()
    }
  }
}
