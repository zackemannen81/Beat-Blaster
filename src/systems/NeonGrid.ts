// systems/backgrounds/NeonGrid.ts
// Renders neon grid backdrop and lane border lights that react to beat events.

import Phaser from 'phaser'
import type LaneManager from './LaneManager'

type LaneSnapshot = ReturnType<LaneManager['getSnapshot']>

type BeatBand = 'low' | 'mid' | 'high'

interface LightNode {
  /** Normalised vertical position (0..1 from top to bottom). */
  y: number
  /** Intensity above the base glow (0..1). */
  intensity: number
}

interface LaneBorderLights {
  x: number
  nodes: LightNode[]
  activeIndex: number
}

export default class NeonGrid {
  private scene: Phaser.Scene
  private rt?: Phaser.GameObjects.RenderTexture
  private t = 0
  private onResizeBound?: (size: Phaser.Structs.Size) => void

  private laneSnapshot?: LaneSnapshot
  private laneBorders: LaneBorderLights[] = []
  private borderPositions: number[] = []

  private rng = new Phaser.Math.RandomDataGenerator([Date.now().toString()])

  private needsRedraw = true
  private redrawTimer = 0
  private redrawIntervalMs = 40 // ~25 fps fallback for idle redraws

  private gridPulse = 0
  private highPulse = 0

  private cellHeight = 48

  private readonly nodeSpacingPx = 48
  private readonly baseNodeAlpha = 0.08
  private readonly highlightNodeAlpha = 0.64

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  create() {
    const { width, height } = this.scene.scale
    this.makeRenderTexture(width, height)
    this.drawFrame()

    this.onResizeBound = (gameSize: Phaser.Structs.Size) => {
      const { width: w, height: h } = gameSize
      this.scene.time.delayedCall(0, () => {
        if (!this.scene.sys.isActive()) return
        this.handleResize(w, h)
      })
    }
    this.scene.scale.on(Phaser.Scale.Events.RESIZE, this.onResizeBound)
  }

  destroy() {
    if (this.onResizeBound) {
      this.scene.scale.off(Phaser.Scale.Events.RESIZE, this.onResizeBound)
      this.onResizeBound = undefined
    }
    this.rt?.destroy()
    this.rt = undefined
    this.laneBorders = []
  }

  update(dt: number) {
    this.t += dt * 0.001

    const interpolation = Math.min(dt / 220, 1)
    let changed = false
    for (const border of this.laneBorders) {
      for (const node of border.nodes) {
        const before = node.intensity
        if (before > 0) {
          node.intensity = Phaser.Math.Linear(node.intensity, 0, interpolation)
          if (Math.abs(before - node.intensity) > 0.001) changed = true
        }
      }
    }

    if (changed) this.needsRedraw = true

    this.gridPulse = Phaser.Math.Linear(this.gridPulse, 0, Math.min(dt / 240, 1))
    this.highPulse = Phaser.Math.Linear(this.highPulse, 0, Math.min(dt / 260, 1))

    // Idle redraw cadence keeps the background alive even without beats.
    this.redrawTimer += dt
    if (this.needsRedraw || this.redrawTimer >= this.redrawIntervalMs || (this.t % 0.05) < 0.016) {
      this.drawFrame()
      this.redrawTimer = 0
      this.needsRedraw = false
    }
  }

  setLaneSnapshot(snapshot?: LaneSnapshot | null) {
    this.laneSnapshot = snapshot ?? undefined
    this.rebuildLaneBorderLights()
    this.recomputeGridMetrics()
    this.needsRedraw = true
  }

  onBeat(band: BeatBand) {
    if (band === 'low') {
      this.advanceBorders(1, 1)
      this.gridPulse = Math.max(this.gridPulse, 0.65)
    } else if (band === 'mid') {
      this.advanceBorders(2, 0.8)
      this.gridPulse = Math.max(this.gridPulse, 0.45)
    } else {
      this.highPulse = Math.max(this.highPulse, 0.8)
      this.gridPulse = Math.max(this.gridPulse, 0.28)
      this.needsRedraw = true
    }
  }

  private advanceBorders(step: number, intensity: number) {
    let any = false
    for (const border of this.laneBorders) {
      if (border.nodes.length === 0) continue
      if (border.activeIndex < 0) {
        border.activeIndex = Phaser.Math.Wrap(step, 0, border.nodes.length)
      } else {
        border.activeIndex = Phaser.Math.Wrap(border.activeIndex + step, 0, border.nodes.length)
      }

      const active = border.nodes[border.activeIndex]
      active.intensity = Math.min(1, intensity)

      if (border.nodes.length > 1) {
        // Give a trailing glow for the node just above the active one.
        const tailIndex = Phaser.Math.Wrap(border.activeIndex - 1, 0, border.nodes.length)
        const tail = border.nodes[tailIndex]
        tail.intensity = Math.max(tail.intensity, 0.35)

        if (step > 1) {
          const tail2Index = Phaser.Math.Wrap(border.activeIndex - 2, 0, border.nodes.length)
          const tail2 = border.nodes[tail2Index]
          tail2.intensity = Math.max(tail2.intensity, 0.2)
        }
      }
      any = true
    }
    if (any) this.needsRedraw = true
  }

  private rebuildLaneBorderLights() {
    if (!this.laneSnapshot) {
      this.laneBorders = []
      this.borderPositions = []
      return
    }

    const { lanes, count, left, width } = this.laneSnapshot
    if (!lanes || lanes.length === 0 || count <= 0) {
      this.laneBorders = []
      this.borderPositions = []
      return
    }

    const height = Math.max(1, this.scene.scale.height)
    const nodeCount = Math.max(5, Math.round(height / this.nodeSpacingPx))

    const centers = lanes.map(l => l.centerX)
    const step = centers.length > 1
      ? centers[1] - centers[0]
      : width / (count + 1)

    const estimateStep = step || (width / (count + 1)) || (this.scene.scale.width / Math.max(count + 1, 1))

    const borderPositions: number[] = []
    const firstCenter = centers[0]
    const lastCenter = centers[centers.length - 1]
    const leftEdge = firstCenter - estimateStep * 0.5
    const rightEdge = lastCenter + estimateStep * 0.5

    borderPositions.push(leftEdge)
    for (let i = 0; i < centers.length - 1; i++) {
      borderPositions.push((centers[i] + centers[i + 1]) * 0.5)
    }
    borderPositions.push(rightEdge)

    const clampedBorders = borderPositions.map(pos =>
      Phaser.Math.Clamp(pos, left, left + width)
    )

    this.borderPositions = clampedBorders

    this.laneBorders = clampedBorders.map(x => {
      const nodes: LightNode[] = []
      const denom = Math.max(nodeCount - 1, 1)
      for (let i = 0; i < nodeCount; i++) {
        nodes.push({
          y: nodeCount === 1 ? 0.5 : i / denom,
          intensity: this.rng.realInRange(0, 0.12)
        })
      }
      return {
        x,
        nodes,
        activeIndex: Math.floor(this.rng.frac() * nodeCount) % nodeCount
      }
    })

    this.needsRedraw = true
  }

  private recomputeGridMetrics() {
    const width = Math.max(1, this.scene.scale.width)
    if (this.borderPositions.length >= 2) {
      let total = 0
      let segments = 0
      for (let i = 1; i < this.borderPositions.length; i++) {
        const diff = this.borderPositions[i] - this.borderPositions[i - 1]
        if (diff > 0) {
          total += diff
          segments++
        }
      }
      const avg = segments > 0 ? total / segments : width / Math.max(this.laneSnapshot?.count ?? 6, 1)
      this.cellHeight = Math.max(24, avg)
    } else if (this.laneSnapshot?.count && this.laneSnapshot.count > 0) {
      const laneWidth = width / this.laneSnapshot.count
      this.cellHeight = Math.max(24, laneWidth)
    } else {
      this.cellHeight = Math.max(24, width / 8)
    }
  }

  private makeRenderTexture(width: number, height: number) {
    this.rt?.destroy()
    this.rt = this.scene.add.renderTexture(0, 0, width, height)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(-10)
      .setBlendMode(Phaser.BlendModes.ADD)
  }

  private handleResize(width: number, height: number) {
    this.makeRenderTexture(width, height)
    this.rebuildLaneBorderLights()
    this.recomputeGridMetrics()
    this.needsRedraw = true
    this.drawFrame()
  }

  private drawFrame() {
    if (!this.rt) return

    const { width, height } = this.scene.scale
    const graphics = this.scene.add.graphics().setVisible(false)
    graphics.clear()

    graphics.fillStyle(0x060610, 1)
    graphics.fillRect(0, 0, width, height)

    const pulse = Phaser.Math.Clamp(this.gridPulse, 0, 1)
    const highPulse = Phaser.Math.Clamp(this.highPulse, 0, 1)

    const verticals = this.borderPositions.length >= 2
      ? this.borderPositions
      : this.generateFallbackVerticals(width)

    const baseVerticalAlpha = 0.18 + 0.28 * pulse
    graphics.lineStyle(1, 0x1ad8ff, baseVerticalAlpha)
    for (const x of verticals) {
      graphics.beginPath()
      graphics.moveTo(x, 0)
      graphics.lineTo(x, height)
      graphics.strokePath()
    }

    if (highPulse > 0.01) {
      graphics.lineStyle(6, 0x92fffb, highPulse * 0.45)
      for (const x of verticals) {
        graphics.beginPath()
        graphics.moveTo(x, 0)
        graphics.lineTo(x, height)
        graphics.strokePath()
      }
    }

    const cellHeight = this.resolveCellHeight(width)
    const horizontalAlpha = 0.1 + 0.18 * pulse
    graphics.lineStyle(1.5, 0xff5db1, horizontalAlpha)
    const rowCount = Math.ceil(height / cellHeight)
    for (let i = 0; i <= rowCount; i++) {
      const y = Math.round(i * cellHeight)
      if (y > height + 1) break
      graphics.beginPath()
      graphics.moveTo(0, y)
      graphics.lineTo(width, y)
      graphics.strokePath()
    }

    const secondaryAlpha = horizontalAlpha * 0.45
    if (secondaryAlpha > 0.01) {
      graphics.lineStyle(1, 0x1a8aff, secondaryAlpha)
      for (let i = 0; i <= rowCount; i++) {
        const y = Math.round(i * cellHeight + cellHeight * 0.5)
        if (y > height + 1) break
        graphics.beginPath()
        graphics.moveTo(0, y)
        graphics.lineTo(width, y)
        graphics.strokePath()
      }
    }

    if (highPulse > 0.01) {
      graphics.lineStyle(3, 0xfff3fb, highPulse * 0.22)
      for (let i = 0; i <= rowCount; i++) {
        const y = Math.round(i * cellHeight)
        if (y > height + 1) break
        graphics.beginPath()
        graphics.moveTo(0, y)
        graphics.lineTo(width, y)
        graphics.strokePath()
      }
      graphics.lineStyle(2, 0xcdfdff, highPulse * 0.16)
      for (let i = 0; i <= rowCount; i++) {
        const y = Math.round(i * cellHeight + cellHeight * 0.5)
        if (y > height + 1) break
        graphics.beginPath()
        graphics.moveTo(0, y)
        graphics.lineTo(width, y)
        graphics.strokePath()
      }
    }

    const baseColor = Phaser.Display.Color.ValueToColor(0x1be9ff)
    const highlightColor = Phaser.Display.Color.ValueToColor(0xcdfdff)
    const baseRadius = Phaser.Math.Clamp(width * 0.008, 4, 9)

    for (const border of this.laneBorders) {
      for (const node of border.nodes) {
        const intensity = Phaser.Math.Clamp(node.intensity, 0, 1)
        const y = node.y * height
        const colorInterp = Phaser.Display.Color.Interpolate.ColorWithColor(
          baseColor,
          highlightColor,
          100,
          Math.round(intensity * 100)
        )
        const fillColor = Phaser.Display.Color.GetColor(colorInterp.r, colorInterp.g, colorInterp.b)
        const alpha = Phaser.Math.Clamp(this.baseNodeAlpha + intensity * this.highlightNodeAlpha, 0, 1)
        const radius = baseRadius * (0.7 + intensity * 0.9)

        graphics.fillStyle(fillColor, alpha)
        graphics.fillCircle(border.x, y, radius)

        if (intensity > 0.15) {
          graphics.fillStyle(fillColor, alpha * 0.35)
          graphics.fillCircle(border.x, y, radius * 1.8)
        }
      }
    }

    this.rt.clear()
    this.rt.draw(graphics, 0, 0)
    graphics.destroy()
  }

  private resolveCellHeight(width: number): number {
    if (this.cellHeight > 0) return this.cellHeight
    const fallback = this.laneSnapshot?.count && this.laneSnapshot.count > 0
      ? width / this.laneSnapshot.count
      : width / 8
    return Math.max(24, fallback)
  }

  private generateFallbackVerticals(width: number): number[] {
    const cols = 14
    const positions: number[] = []
    for (let i = 0; i <= cols; i++) {
      positions.push((i / cols) * width)
    }
    return positions
  }
}
