import Phaser from 'phaser'

type Layer = {
  sprite: Phaser.GameObjects.TileSprite
  multiplier: number
}

export default class BackgroundScroller {
  private scene: Phaser.Scene
  private layers: Layer[] = []
  private baseScroll = 180

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  create() {
    this.ensureTextures()
    const { width, height } = this.scene.scale

    const far = this.scene.add
      .tileSprite(width / 2, height / 2, width, height, 'bg_far_lines')
      .setScrollFactor(0)
      .setAlpha(0.28)
      .setDepth(-1200)

    const mid = this.scene.add
      .tileSprite(width / 2, height / 2, width, height, 'bg_mid_grid')
      .setScrollFactor(0)
      .setAlpha(0.35)
      .setDepth(-1150)

    const near = this.scene.add
      .tileSprite(width / 2, height / 2, width, height, 'bg_near_stripes')
      .setScrollFactor(0)
      .setAlpha(0.45)
      .setDepth(-1100)

    this.layers = [
      { sprite: far, multiplier: 0.2 },
      { sprite: mid, multiplier: 0.35 },
      { sprite: near, multiplier: 0.55 }
    ]
  }

  update(dt: number) {
    const deltaRatio = dt / 1000
    for (const layer of this.layers) {
      layer.sprite.tilePositionY += this.baseScroll * layer.multiplier * deltaRatio
    }
  }

  setBaseScroll(speed: number) {
    this.baseScroll = speed
  }

  destroy() {
    for (const layer of this.layers) layer.sprite.destroy()
    this.layers = []
  }

  private ensureTextures() {
    this.makeTexture('bg_far_lines', 128, g => {
      g.fillStyle(0x06060f, 1)
      g.fillRect(0, 0, 128, 128)
      g.lineStyle(1, 0x0e1f3d, 0.25)
      for (let x = 0; x <= 128; x += 16) {
        g.beginPath()
        g.moveTo(x, 0)
        g.lineTo(x, 128)
        g.strokePath()
      }
    })

    this.makeTexture('bg_mid_grid', 128, g => {
      g.fillStyle(0x080814, 1)
      g.fillRect(0, 0, 128, 128)
      g.lineStyle(1, 0x112c5f, 0.3)
      for (let y = 0; y <= 128; y += 16) {
        g.beginPath()
        g.moveTo(0, y)
        g.lineTo(128, y)
        g.strokePath()
      }
      g.lineStyle(1, 0x1a3d7f, 0.15)
      for (let x = 0; x <= 128; x += 16) {
        g.beginPath()
        g.moveTo(x, 0)
        g.lineTo(x, 128)
        g.strokePath()
      }
    })

    this.makeTexture('bg_near_stripes', 128, g => {
      g.fillStyle(0x0a0a18, 1)
      g.fillRect(0, 0, 128, 128)
      g.lineStyle(2, 0x1f57ff, 0.22)
      for (let y = -32; y <= 128; y += 24) {
        g.beginPath()
        g.moveTo(0, y)
        g.lineTo(128, y + 48)
        g.strokePath()
      }
    })
  }

  private makeTexture(key: string, size: number, draw: (g: Phaser.GameObjects.Graphics) => void) {
    if (this.scene.textures.exists(key)) return
    const g = this.scene.add.graphics()
    g.clear()
    draw(g)
    g.generateTexture(key, size, size)
    g.destroy()
  }
}
