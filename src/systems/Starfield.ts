import Phaser from 'phaser'

type Star = { img: Phaser.GameObjects.Image; multiplier: number }

export default class Starfield {
  private scene: Phaser.Scene
  private stars: Star[] = []
  private baseScroll = 120
  private stageSpeedModifier = 1

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  create() {
    const { width, height } = this.scene.scale
    // Generate a small white texture for stars
    const key = 'star_px'
    if (!this.scene.textures.exists(key)) {
      const g = this.scene.add.graphics()
      g.fillStyle(0xffffff, 1)
      g.fillRect(0, 0, 2, 2)
      g.generateTexture(key, 2, 2)
      g.destroy()
    }

    const makeLayer = (count: number, multiplier: number, scale: number, alpha: number) => {
      for (let i = 0; i < count; i++) {
        const x = Phaser.Math.Between(0, width)
        const y = Phaser.Math.Between(0, height)
        const img = this.scene.add.image(x, y, key).setScale(scale).setAlpha(alpha)
        img.setBlendMode(Phaser.BlendModes.ADD)
        img.setDepth(-1000)
        this.stars.push({ img, multiplier })
      }
    }

    // Three parallax layers
    makeLayer(80, 0.3, 0.8, 0.9)
    makeLayer(60, 0.55, 0.6, 0.6)
    makeLayer(40, 0.85, 0.4, 0.3)
    const bgimage = this.scene.add.image(width / 2, height / 2, 'background')
    bgimage.setOrigin(0.5)
    // Adjust scale if needed:
    bgimage.setScale(1)

    bgimage.setDepth(-2000)
  }

  update(dt: number) {
    const { width, height } = this.scene.scale
    for (const s of this.stars) {
      const speed = this.baseScroll * this.stageSpeedModifier * s.multiplier
      s.img.y += (speed * dt) / 1000
      if (s.img.y > height + 2) {
        s.img.y = -2
        s.img.x = Phaser.Math.Between(0, width)
      }
    }
  }

  destroy() {
    this.stars.forEach(s => s.img.destroy())
    this.stars = []
  }

  setBaseScroll(speed: number) {
    this.baseScroll = speed
  }

  setStageSpeedModifier(multiplier: number) {
    if (!Number.isFinite(multiplier) || multiplier <= 0) {
      this.stageSpeedModifier = 1
      return
    }
    this.stageSpeedModifier = multiplier
  }
}
