// systems/NeonGrid.ts
import Phaser from 'phaser'

export default class NeonGrid {
  private scene: Phaser.Scene
  private rt!: Phaser.GameObjects.RenderTexture
  private t = 0

  constructor(scene: Phaser.Scene){ this.scene = scene }

  create() {
    const cam = this.scene.cameras.main
    // Viktigt: origin(0), scrollFactor(0) så den fyller hela vyn korrekt
    this.rt = this.scene.add
      .renderTexture(0, 0, cam.width, cam.height)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(-10)
      .setBlendMode(Phaser.BlendModes.ADD)

    this.draw(0)

    // Beat-hooks
    this.scene.events.on('beat:low',  () => this.draw(0.6))
    this.scene.events.on('beat:mid',  () => this.draw(0.4))
    this.scene.events.on('beat:high', () => this.draw(0.3))

    // Reagera på resize (t.ex. DPR/retina eller ändrat fönster)
    this.scene.scale.on(Phaser.Scale.Events.RESIZE, (gameSize: Phaser.Structs.Size) => {
      const { width, height } = gameSize
      // RenderTexture har egen resize
      this.rt.resize(width, height)
      this.rt.setSize(width, height)
      this.draw(0)
    })
  }

  update(dt:number){
    this.t += dt * 0.001
    // Rita om ibland även utan beat för en levande känsla
    if ((this.t % 0.05) < 0.016) this.draw(0)
  }

  private draw(pulse:number){
    const cam = this.scene.cameras.main
    const width = cam.width
    const height = cam.height

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
      g.beginPath()
      g.moveTo(x, 0)
      g.lineTo(x, height)
      g.strokePath()
    }

    // Horisontella linjer (pink) med våg
    for (let j = 0; j <= rows; j++){
      const y = (j / rows) * height + Math.sin(t*1.5 + j*0.5) * amp
      g.lineStyle(1, 0xff5db1, 0.12 + 0.22 * pulse)
      g.beginPath()
      g.moveTo(0, y)
      g.lineTo(width, y)
      g.strokePath()
    }

    this.rt.clear()
    this.rt.draw(g, 0, 0)
    g.destroy()
  }
}
