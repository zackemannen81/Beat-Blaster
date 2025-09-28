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

  private rng = new Phaser.Math.RandomDataGenerator([Date.now().toString()])

  private needsRedraw = true
  private redrawTimer = 0
  private redrawIntervalMs = 40 // ~25 fps fallback for idle redraws

  private gridPulse = 0
  private highPulse = 0

  private readonly nodeSpacingPx = 68
  private readonly baseNodeAlpha = 0.16
  private readonly highlightNodeAlpha = 0.6

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
      return
    }

    const { lanes, count, left, width } = this.laneSnapshot
    if (!lanes || lanes.length === 0 || count <= 0) {
      this.laneBorders = []
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
    const cols = 14
    const rows = 8
    const amp = 12 + 50 * pulse

    for (let i = 0; i <= cols; i++) {
      const x = (i / cols) * width
      graphics.lineStyle(1, 0x00e5ff, 0.18 + 0.25 * pulse)
      graphics.beginPath()
      graphics.moveTo(x, 0)
      graphics.lineTo(x, height)
      graphics.strokePath()
    }

    for (let j = 0; j <= rows; j++) {
      const y = (j / rows) * height + Math.sin(this.t * 1.5 + j * 0.5) * amp
      graphics.lineStyle(1, 0xff5db1, 0.12 + 0.22 * pulse)
      graphics.beginPath()
      graphics.moveTo(0, y)
      graphics.lineTo(width, y)
      graphics.strokePath()
    }

    if (this.laneBorders.length) {
      const baseLineAlpha = 0.12 + 0.22 * pulse
      graphics.lineStyle(2, 0x1ad8ff, baseLineAlpha)
      for (const border of this.laneBorders) {
        graphics.beginPath()
        graphics.moveTo(border.x, 0)
        graphics.lineTo(border.x, height)
        graphics.strokePath()
      }

      const overlayAlpha = this.highPulse * 0.45
      if (overlayAlpha > 0.01) {
        graphics.lineStyle(6, 0x92fffb, overlayAlpha)
        for (const border of this.laneBorders) {
          graphics.beginPath()
          graphics.moveTo(border.x, 0)
          graphics.lineTo(border.x, height)
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
    }

    this.rt.clear()
    this.rt.draw(graphics, 0, 0)
    graphics.destroy()
  }
}
