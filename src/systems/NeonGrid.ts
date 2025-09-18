// systems/backgrounds/NeonGrid.ts
import Phaser from 'phaser'

export default class NeonGrid {
  private scene: Phaser.Scene
  private rt!: Phaser.GameObjects.RenderTexture
  private t = 0
  private onResizeBound?: (size: Phaser.Structs.Size) => void

  constructor(scene: Phaser.Scene){ this.scene = scene }

  create() {
    const { width, height } = this.scene.scale
    this.makeRT(width, height)
    this.draw(0)

    // Beat-hooks
    this.scene.events.on('beat:low',  () => this.draw(0.6))
    this.scene.events.on('beat:mid',  () => this.draw(0.4))
    this.scene.events.on('beat:high', () => this.draw(0.3))

    // SÄKER resize: destroy + re-create (inte rt.resize)
    this.onResizeBound = (gameSize: Phaser.Structs.Size) => {
      const { width, height } = gameSize
      // vänta en tick för att inte köra mitt i Scale.refresh
      this.scene.time.delayedCall(0, () => {
        if (!this.scene.sys.isActive()) return
        this.rt?.destroy()
        this.makeRT(width, height)
        this.draw(0)
      })
    }
    this.scene.scale.on(Phaser.Scale.Events.RESIZE, this.onResizeBound)
  }

  private makeRT(w: number, h: number) {
    this.rt = this.scene.add
      .renderTexture(0, 0, w, h)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(-10)
      .setBlendMode(Phaser.BlendModes.ADD)
  }

  update(dt:number){
    this.t += dt * 0.001
    if ((this.t % 0.05) < 0.016) this.draw(0)
  }

  destroy() {
    if (this.onResizeBound) {
      this.scene.scale.off(Phaser.Scale.Events.RESIZE, this.onResizeBound)
      this.onResizeBound = undefined
    }
    this.rt?.destroy()
  }

  private draw(pulse:number){
    const { width, height } = this.scene.scale
    const g = this.scene.add.graphics().setVisible(false)
    g.clear()

    // Bas
    g.fillStyle(0x0a0a0f, 1)
    g.fillRect(0, 0, width, height)

    // Parametrar
    const cols = 14, rows = 8
    const amp = 12 + 50 * pulse
    const t = this.t

    // Vertikala linjer (cyan)
    for (let i = 0; i <= cols; i++){
      const x = (i / cols) * width
      g.lineStyle(1, 0x00e5ff, 0.18 + 0.25 * pulse)
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x, height); g.strokePath()
    }

    // Horisontella linjer (pink) med våg
    for (let j = 0; j <= rows; j++){
      const y = (j / rows) * height + Math.sin(t*1.5 + j*0.5) * amp
      g.lineStyle(1, 0xff5db1, 0.12 + 0.22 * pulse)
      g.beginPath(); g.moveTo(0, y); g.lineTo(width, y); g.strokePath()
    }

    this.rt.clear()
    this.rt.draw(g, 0, 0)
    g.destroy()
  }
}
