import Phaser from 'phaser'

type Lane = { index: number; centerX: number }

export default class LaneManager {
  private scene: Phaser.Scene
  private lanes: Lane[] = []
  private debugGfx?: Phaser.GameObjects.Graphics
  private debugTxt: Phaser.GameObjects.Text[] = []

  // Layout cache (frivilligt – bra för HUD/FX)
  private lastLeft = 0
  private lastWidth = 0
  private lastStep = 0

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  /**
   * Bygg lanes utifrån count och valfria bounds.
   * Om left/width inte anges används kamerans worldView/viewport.
   */
  build(count: number, left?: number, width?: number) {
    const cam = this.scene.cameras.main
    const L = left ?? 0
    const W = width ?? cam.width

    this.lanes = []
    if (count <= 0 || W <= 0) {
      this.lastLeft = L
      this.lastWidth = W
      this.lastStep = 0
      return
    }

    // spacing med “luft” i kanterna: width/(count+1)
    const step = W / (count + 1)
    for (let i = 0; i < count; i++) {
      const centerX = L + step * (i + 1)
      this.lanes.push({ index: i, centerX })
    }

    this.lastLeft = L + step / 2
    this.lastWidth = step * (count - 1)
    this.lastStep = step

    // uppdatera ev. debug overlay
    this.redrawDebug()
    this.scene.events.emit('lanes:changed', { count, left: L, width: W, step })
  }

  /** Returnera alla lanes (immutable snapshot) */
  getAll(): ReadonlyArray<Lane> {
    return this.lanes
  }

  /** Hämta “bounds” för HUD/FX (vänster, effektiv bredd, och steg). */
  getBounds() {
    return { left: this.lastLeft, width: this.lastWidth, step: this.lastStep }
  }

  /** Hitta index på närmaste lane-center till en x-koordinat. */
  indexAt(x: number): number {
    return this.nearest(x).index
  }

  /** Hitta närmaste lane-center till en x-koordinat. */
  nearest(x: number): Lane {
    if (this.lanes.length === 0) return { index: 0, centerX: x }
    let best = this.lanes[0]
    let bd = Math.abs(best.centerX - x)
    for (let i = 1; i < this.lanes.length; i++) {
      const d = Math.abs(this.lanes[i].centerX - x)
      if (d < bd) {
        best = this.lanes[i]
        bd = d
      }
    }
    return best
  }

  /**
   * Snappa x mot närmaste lane-center.
   * deadzone>0: behåll x om vi redan ligger inom deadzone pixlar från center.
   * deadzone=0 → legacy-beteende (alltid exakt center).
   */
  snap(x: number, deadzone = 0): number {
    const ln = this.nearest(x)
    if (deadzone > 0) {
      const dx = Math.abs(x - ln.centerX)
      if (dx <= deadzone) return x
    }
    return ln.centerX
  }

  /** Visa enkel lane-debug overlay (linjer + labels). */
  enableDebug(color = 0x00ffff) {
    // 🔧 FIX: Skapa graphics om den inte finns (tidigare logik kunde kortslutas).
    if (this.debugGfx) return
    this.debugGfx = this.scene.add.graphics().setDepth(1e6)
    this.debugTxt = []
    this.redrawDebug(color)
  }

  /** Dölj debug overlay. */
  disableDebug() {
    this.debugGfx?.destroy()
    this.debugGfx = undefined
    this.debugTxt.forEach(t => t.destroy())
    this.debugTxt = []
  }

  /** Rita om overlay (anropas automatisk efter build()). */
  private redrawDebug(color = 0x00ffff) {
    if (!this.debugGfx) return
    // Clear + ta bort gamla texter
    this.debugGfx.clear()
    for (const t of this.debugTxt) t.destroy()
    this.debugTxt = []

    const H = this.scene.scale.height
    this.debugGfx.lineStyle(2, color, 0.8)

    for (const ln of this.lanes) {
      this.debugGfx.lineBetween(ln.centerX, 0, ln.centerX, H)
      const txt = this.scene.add
        .text(ln.centerX + 6, 6, `L${ln.index}`, { fontSize: '10px' })
        .setDepth(1e6)
      this.debugTxt.push(txt)
    }
  }
}
