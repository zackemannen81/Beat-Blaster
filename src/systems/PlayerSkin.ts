// systems/PlayerSkin.ts
import Phaser from 'phaser'

type SpriteBody = Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
type ParticleManager = ReturnType<Phaser.GameObjects.GameObjectFactory['particles']>

export default class PlayerSkin {
  private scene: Phaser.Scene
  private host: SpriteBody
  private gfx: Phaser.GameObjects.Graphics

  private pm?: ParticleManager
  private emitter?: Phaser.GameObjects.Particles.ParticleEmitter

  private size = 18
  private tailOffset = this.size * 1.86   // Distance to the middle of the base from center
  private speedOn = 0                     // 0 = always on (change to 5 to enable only when moving)

  constructor(scene: Phaser.Scene, host: SpriteBody) {
    this.scene = scene
    this.host = host
    this.host.setVisible(false)

    this.gfx = scene.add.graphics({ x: host.x, y: host.y }).setDepth(900)
    this.drawTriangle(this.size)

    this.createThruster()

    scene.events.on(Phaser.Scenes.Events.UPDATE, this.follow, this)
  }

  private drawTriangle(size: number) {
    const g = this.gfx
    g.clear()

    const tip = size * 1.92
    const halfBase = size * 0.52
    const baseY = size * 0.86

    g.fillStyle(0x00e5ff, 0.20)
    g.beginPath()
    g.moveTo(0, -tip)
    g.lineTo(-halfBase, baseY)
    g.lineTo( halfBase, baseY)
    g.closePath()
    g.fillPath()

    g.lineStyle(2, 0xffffff, 0.9)
    g.strokePath()
  }

  private createThruster() {
    const hasPink = this.scene.textures.exists('thruster_pink')
    const texKey = hasPink ? 'thruster_pink' : 'particles'
    const frame = hasPink ? undefined : 'particle_glow_small'

    // Skapa MANAGER + EMITTER via config (Phaser 3.90-way)
    this.pm = this.scene.add.particles(0, 0, texKey, {
      frame,
      lifespan: { min: 220, max: 768  },
      speed: { min: 40, max: 100 },
      scale: { start: 0.35, end: 0 },
      alpha: { start: 1, end: 0 },
      quantity: 1,
      frequency: 14,
      angle: { min: -15, max: 30},     // riktas bakåt per frame i follow()
      blendMode: Phaser.BlendModes.ADD,
      follow: this.gfx,                // emitter följer grafiken (viktigt!)
      followOffset: { x: 0, y: 0 }     // vi flyttar den till baken i follow()
    })

    this.pm.setDepth(this.gfx.depth - 1)
    this.pm.setRadial(true)

  }

  private follow = () => {
    // keep graphics in sync with host
    this.gfx.x = this.host.x
    this.gfx.y = this.host.y
    this.gfx.rotation = this.host.rotation
const rot = this.gfx.rotation
// Calculate direction to the base (180 degrees from the triangle's forward)
const backX = Math.cos(rot + Math.PI)  // 180 degrees from forward
const backY = Math.sin(rot + Math.PI)  // 180 degrees from forward

// Updating the emitter with new settings (emitting angle) 
const backDeg = Phaser.Math.RadToDeg(rot) + 90 
const emitter = this.pm as any
if (emitter && emitter.manager) {
  emitter.updateConfig({ angle: { min: backDeg - 15, max: backDeg + 15 } })
}
const body = this.host.body as Phaser.Physics.Arcade.Body
const speed = body?.velocity?.length() ?? 0
const t = Phaser.Math.Clamp(speed / 300, 0.1, 1)
//this.pm?.updateConfig({ frequency: Phaser.Math.Linear(26, 8, t) +8})
if (emitter && emitter.manager) {
  emitter.updateConfig({ scale: { start: 0.35 , end: 0 } })
}

  }

  // Hooks (no-op)
  setThrust(_level01: number) {}
  onHit() {}
  onDeath() {}

  destroy() {
    this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.follow, this)
    this.pm?.destroy()
    this.gfx.destroy()
  }
}
