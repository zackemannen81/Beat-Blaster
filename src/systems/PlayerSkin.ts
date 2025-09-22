// src/systems/PlayerSkin.ts

import Phaser from 'phaser'

type SpriteBody = Phaser.Types.Physics.Arcade.SpriteWithDynamicBody

export default class PlayerSkin {
  private scene: Phaser.Scene
  private host: SpriteBody
  private gfx: Phaser.GameObjects.Graphics

  private emMain!: Phaser.GameObjects.Particles.ParticleEmitter
  private emWingL!: Phaser.GameObjects.Particles.ParticleEmitter
  private emWingR!: Phaser.GameObjects.Particles.ParticleEmitter

  private size = 18
  private tiltMaxDeg = 16
  private tiltSmoothing = 0.18
  private expectMaxVX = 260
  private expectMaxVY = 340

  private tailOffset = { x: 0, y: this.size * 1.08 }
  private wingLOffset = { x: -this.size * 0.95, y: this.size * 0.35 }
  private wingROffset = { x:  this.size * 0.95, y: this.size * 0.35 }

  constructor(scene: Phaser.Scene, host: SpriteBody) {
    this.scene = scene
    this.host = host
    this.host.setVisible(false)

    this.gfx = scene.add.graphics({ x: host.x, y: host.y }).setDepth(900)
    this.drawShip(this.size)

    this.createThrusters()
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.follow, this)
  }

  private drawShip(size: number) {
    const g = this.gfx
    g.clear()

    const tip = size * 1.9
    const bodyW = size * 1.0
    const baseY = size * 0.82
    const wingSpan = size * 1.6
    const wingDepth = size * 0.55

    // Glow bak
    g.fillStyle(0x00e5ff, 0.12)
    g.beginPath()
    g.moveTo(0, -tip)
    g.lineTo(-bodyW, baseY)
    g.lineTo(bodyW, baseY)
    g.closePath()
    g.fillPath()

    // Kropp
    g.lineStyle(2, 0xffffff, 0.9)
    g.fillStyle(0x00e5ff, 0.18)
    g.beginPath()
    g.moveTo(0, -tip)
    g.lineTo(-bodyW * 0.78, baseY * 0.28)
    g.lineTo(-bodyW, baseY)
    g.lineTo(bodyW, baseY)
    g.lineTo(bodyW * 0.78, baseY * 0.28)
    g.closePath()
    g.fillPath()
    g.strokePath()

    // Cockpit-feature
    g.lineStyle(2, 0x9efcff, 0.8)
    g.beginPath()
    g.moveTo(0, -tip * 0.55)
    g.lineTo(0, -tip * 0.25)
    g.strokePath()

    // Vingar
    g.lineStyle(2, 0xffffff, 0.8)
    g.fillStyle(0x00e5ff, 0.14)
    // Vänster vinge
    g.beginPath()
    g.moveTo(-wingSpan, baseY - wingDepth * 0.2)
    g.lineTo(-bodyW * 0.88, baseY - wingDepth)
    g.lineTo(-bodyW * 0.66, baseY)
    g.closePath()
    g.fillPath()
    g.strokePath()
    // Höger vinge
    g.beginPath()
    g.moveTo(wingSpan, baseY - wingDepth * 0.2)
    g.lineTo(bodyW * 0.88, baseY - wingDepth)
    g.lineTo(bodyW * 0.66, baseY)
    g.closePath()
    g.fillPath()
    g.strokePath()
  }

  private createThrusters() {
    const hasPink = this.scene.textures.exists('thruster_pink')
    const texKey = hasPink ? 'thruster_pink' : 'particles'
    const frame: string | undefined = hasPink ? undefined : 'particle_glow_small'

    // Base configuration for all emitters
    const baseCfg: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig = {
      frame: frame,
      lifespan: { min: 220, max: 760 },
      speed: { min: 40, max: 110 },
      scale: { start: 0.35, end: 0 },
      alpha: { start: 1, end: 0 },
      quantity: 1,
      frequency: 16,
      blendMode: Phaser.BlendModes.ADD,
      follow: this.gfx,
      followOffset: { x: 0, y: 0 },
      emitZone: { 
        type: 'edge',
        source: new Phaser.Geom.Circle(0, 0, 2),
        quantity: 1
      },
      radial: true,
      angle: { min: 85, max: 95 }
    }

    // Create particle emitters directly
    this.emMain = this.scene.add.particles(0, 0, texKey, baseCfg)
    this.emWingL = this.scene.add.particles(0, 0, texKey, baseCfg)
    this.emWingR = this.scene.add.particles(0, 0, texKey, baseCfg)
    
    // Set depth for all particle emitters
    const depth = this.gfx.depth - 1
    this.emMain.setDepth(depth)
    this.emWingL.setDepth(depth)
    this.emWingR.setDepth(depth)
  }

  private localToWorld(offset: {x: number, y: number}, rot: number) {
    const c = Math.cos(rot), s = Math.sin(rot)
    return { x: offset.x * c - offset.y * s, y: offset.x * s + offset.y * c }
  }

  private follow = () => {
    // Synka position
    this.gfx.x = this.host.x
    this.gfx.y = this.host.y

    const body = this.host.body as Phaser.Physics.Arcade.Body
    const vx = body?.velocity?.x ?? 0
    const vy = body?.velocity?.y ?? 0

    // Tilt baserat på vx
    const maxTiltRad = Phaser.Math.DegToRad(this.tiltMaxDeg)   // <- ger ett number
    const targetTilt = Phaser.Math.Clamp(
      (vx / this.expectMaxVX) * maxTiltRad,
      -maxTiltRad,
      +maxTiltRad
    )
    this.gfx.rotation = Phaser.Math.Angle.RotateTo(this.gfx.rotation, targetTilt, this.tiltSmoothing)

    // Beräkna offsets för thrusters
    const rot = this.gfx.rotation
    const tailW = this.localToWorld(this.tailOffset, rot)
    const wingLW = this.localToWorld(this.wingLOffset, rot)
    const wingRW = this.localToWorld(this.wingROffset, rot)

    // Update emitter positions
    this.emMain.setPosition(tailW.x, tailW.y)
    this.emWingL.setPosition(wingLW.x, wingLW.y)
    this.emWingR.setPosition(wingRW.x, wingRW.y)

    // Intensitet baserat på Y-hastighet
    const upNorm   = Phaser.Math.Clamp((-vy) / this.expectMaxVY, 0, 1)
    const backNorm = Phaser.Math.Clamp(( vy) / this.expectMaxVY, 0, 1)

    const baseScale = 0.30
    const upBoost   = 0.32
    const backCut   = 0.20

    const startScale = Phaser.Math.Clamp(baseScale + upBoost * upNorm - backCut * backNorm, 0.18, 0.72)
    const sideNorm = Phaser.Math.Clamp(Math.abs(vx) / this.expectMaxVX, 0, 1)
    const wingScale = Phaser.Math.Clamp(startScale + 0.12 * sideNorm, 0.18, 0.84)

    const freqMain = Phaser.Math.Clamp(Phaser.Math.Linear(40, 8, upNorm) + Phaser.Math.Linear(0, 12, backNorm), 8, 52)
    const freqWing = Phaser.Math.Clamp(freqMain - 6 * sideNorm, 6, 52)

    this.emMain.setScale(startScale)
    this.emMain.setFrequency(freqMain)
    this.emMain.setAngle(90)

    this.emWingL.setScale(wingScale)
    this.emWingL.setFrequency(freqWing)
    this.emWingL.setAngle(90)

    this.emWingR.setScale(wingScale)
    this.emWingR.setFrequency(freqWing)
    this.emWingR.setAngle(90)
  }

  setThrust(level01: number) {
    const f = Phaser.Math.Clamp(level01, 0, 1)
    const extra = Phaser.Math.Linear(0, 0.18, f)
    const freqB = Phaser.Math.Linear(0, -10, f)

    const bump = (em: Phaser.GameObjects.Particles.ParticleEmitter) => {
      const s = Phaser.Math.Clamp(0.30 + extra, 0.18, 0.9)
      em.setScale(s)
      // @ts-ignore - frequency property exists but isn't in the type definitions
      em.setFrequency(Math.max(6, (em.frequency ?? 16) + freqB))
    }
    bump(this.emMain); bump(this.emWingL); bump(this.emWingR)
  }

  onHit() {}
  onDeath() {}

  destroy() {
    this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.follow, this)
    
    // Stop and destroy emitters
    if (this.emMain) {
      this.emMain.stop()
      this.emMain.destroy()
    }
    if (this.emWingL) {
      this.emWingL.stop()
      this.emWingL.destroy()
    }
    if (this.emWingR) {
      this.emWingR.stop()
      this.emWingR.destroy()
    }
    
    // Clean up graphics
    if (this.gfx) this.gfx.destroy()
  }
}
