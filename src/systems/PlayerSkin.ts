import Phaser from 'phaser'

type SpriteBody = Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
type ParticleManager = ReturnType<Phaser.GameObjects.GameObjectFactory['particles']>

export default class PlayerSkin {
  private scene: Phaser.Scene
  private host: SpriteBody
  private gfx: Phaser.GameObjects.Graphics

  // Emitters kommer att skapas från en enda manager
  private particleManager? : ParticleManager
  private emMain!: Phaser.GameObjects.Particles.ParticleEmitter
  private emWingL!: Phaser.GameObjects.Particles.ParticleEmitter
  private emWingR!: Phaser.GameObjects.Particles.ParticleEmitter
  //private emBackground!: Phaser.GameObjects.Particles.ParticleEmitter

  // Behåller alla dina inställningar
  private size = 18
  private tiltMaxDeg = 16
  private tiltSmoothing = 0.18
  private expectMaxVX = 260
  private expectMaxVY = 340

  // Använder Vector2 för enklare matte, men din `localToWorld` fungerar också
  private tailOffset = new Phaser.Math.Vector2(0, this.size * 1.08)
  private wingLOffset = new Phaser.Math.Vector2(-this.size * 0.95, this.size * 0.35)
  private wingROffset = new Phaser.Math.Vector2(this.size * 0.95, this.size * 0.35)

  constructor(scene: Phaser.Scene, host: SpriteBody) {
    this.scene = scene
    this.host = host
    this.host.setVisible(false)

    this.gfx = scene.add.graphics({ x: host.x, y: host.y }).setDepth(900)
    this.drawShip(this.size)

    this.createThrusters()
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.follow, this)
  }

  // Ingen ändring här, din skeppsritning är perfekt
  private drawShip(size: number) {
    const g = this.gfx
    g.clear()

    const tip = size * 1.7
    const bodyW = size * 1.0
    const baseY = size * 0.82
    const wingSpan = size * 1.6
    const wingDepth = size * 0.82

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

  // *** OMARBETAD THRUSTER-SKAPANDE ***
  private createThrusters() {
    const hasPink = this.scene.textures.exists('thruster_pink')
    const texKey = hasPink ? 'thruster_pink' : 'particles'
    const frame: string | undefined = hasPink ? undefined : 'particle_glow_small'
//this.particleManager.createEmitter()
/*
this.emBackground = this.scene.add.particles(0, 0, texKey, {
  frame: frame,
  speed: this.host.body.speed,
  lifespan: Phaser.Math.Percent(this.host.body.speed, 0, 300) * 20000,
  alpha:  Phaser.Math.Percent(this.host.body.speed, 0, 300) * 1000,
  scale: { start: 1.0, end: 0 },
  blendMode: 'ADD'
  })
*/
    this.emMain = this.scene.add.particles(0, 0, texKey, {
      frame: frame,
      lifespan: { min: 220, max: 1024 },
      speed: { min: 40, max: 110 },
      scale: { start: 0.45, end: 0.1 },
      alpha: { start: 1, end: 0.2 },
      quantity: 1,
      frequency: 16,
      blendMode: 'ADD',
      angle: { min: 85, max: 95 }
    })  
    this.emWingL = this.scene.add.particles(0, 0, texKey, {
      frame: frame,
      lifespan: { min: 220, max: 760 },
      speed: { min: 40, max: 110 },
      scale: { start: 0.35, end: 0.1 },
      alpha: { start: 1, end: 0.2 },
      quantity: 1,
      frequency: 16,
      blendMode: 'ADD',
      angle: { min: 85, max: 95 }
    })
    this.emWingR = this.scene.add.particles(0, 0, texKey, {
      frame: frame,
      lifespan: { min: 220, max: 760 },
      speed: { min: 40, max: 110 },
      scale: { start: 0.35, end: 0.1 },
      alpha: { start: 1, end: 0.2 },
      quantity: 1,
      frequency: 16,
      blendMode: 'ADD',
      angle: { min: 85, max: 95 }
    })
    // Gemensam konfiguration för alla emitters
    const baseEmitterConfig: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig = {
      lifespan: { min: 220, max: 1024 },
      speed: { min: 40, max: 110 },
      scale: { start: 0.45, end: 0.1 },
      alpha: { start: 1, end: 0.2 },
      quantity: 1,
      frequency: 16, // Styrs ändå manuellt i follow-loopen
      blendMode: 'ADD',
      angle: { min: 85, max: 95 }
    }
    
    // Skapa EN manager för alla partiklar. Detta är mer effektivt och modernt.
    const particleManager = this.scene.add.particles(0, 0, texKey, {
      frame: frame, ...baseEmitterConfig
      // Andra manager-specifika inställningar kan gå här om det behövs
    });
 //this.particleManager?.createEmitter()
    // Skapa tre emitters från SAMMA manager
   // this.emMain = particleManager.createEmitter()
   // this.emWingL = particleManager.createEmitter()
   // this.emWingR = particleManager.createEmitter()

    // Sätt djupet på hela partikelsystemet så det ritas bakom skeppet
    particleManager.setDepth(this.gfx.depth - 1)
    particleManager.startFollow(this.host.body as Phaser.Physics.Arcade.Body,16,25) 
    //this.emBackground.startFollow(this.host.body as Phaser.Physics.Arcade.Body)

  }

  // Din follow-metod, nu med korrekt positionering
  private follow = () => {
    // Synka position och hämta data från host
    this.gfx.x = this.host.x
    this.gfx.y = this.host.y
    const body = this.host.body as Phaser.Physics.Arcade.Body
    const vx = body?.velocity.x ?? 0
    const vy = body?.velocity.y ?? 0
 //   this.emBackground.x= this.host.x
 //   this.emBackground.y= this.host.y


    // Tilt-logiken är oförändrad
    const maxTiltRad = Phaser.Math.DegToRad(this.tiltMaxDeg)
    const targetTilt = Phaser.Math.Clamp(
      (vx / this.expectMaxVX) * maxTiltRad,
      -maxTiltRad,
      maxTiltRad
    )
    this.gfx.rotation = Phaser.Math.Angle.RotateTo(this.gfx.rotation, targetTilt, this.tiltSmoothing)
    const currentRotation = this.gfx.rotation

    // Beräkna thruster-positioner
    // Skapa temporära vektorer, rotera dem och addera till skeppets position
    const tailPos = this.tailOffset.clone().rotate(currentRotation).add(this.host)
    const wingLPos = this.wingLOffset.clone().rotate(currentRotation).add(this.host)
    const wingRPos = this.wingROffset.clone().rotate(currentRotation).add(this.host)

    // *** KORREKT POSITIONERING AV EMITTERS ***
    //if (this.emBackground) this.emBackground.setPosition(tailPos.x, tailPos.y) 
    if (this.emMain) this.emMain.setPosition(tailPos.x, tailPos.y+5)
    if (this.emWingL) this.emWingL.setPosition(wingLPos.x, wingLPos.y+15)
    if (this.emWingR) this.emWingR.setPosition(wingRPos.x, wingRPos.y+15)
    if (this.particleManager) this.particleManager.setPosition(tailPos.x, tailPos.y)
    //  if (this.particleManager) this.particleManager.y= tailPos.y+50
      // Rotera partiklarnas vinkel med skeppet
    const angle = Phaser.Math.RadToDeg(currentRotation) + 90
    this.emMain!.updateConfig({angle: {  min: angle - 5, max: angle + 5 }})
    this.emWingL!.updateConfig({angle: {  min: angle - 5, max: angle + 5 }})
    this.emWingR!.updateConfig({angle: {  min: angle - 5, max: angle + 5 }})
    //this.particleManager!.updateConfig({angle: {  min: angle - 5, max: angle + 5 }})
    //    this.emWingR.setAngle({  angle: min: angle - 5, max: angle + 5 })
    
    // All din logik för intensitet är oförändrad
    const upNorm = Phaser.Math.Clamp(-vy / this.expectMaxVY, 0, 1)
    const backNorm = Phaser.Math.Clamp(vy / this.expectMaxVY, 0, 1)

    const baseScale = 0.25
    const upBoost = 0.32
    const backCut = 0.20

    const startScale = Phaser.Math.Clamp(baseScale + upBoost * upNorm - backCut * backNorm, 0.18, 0.72)
    const sideNorm = Phaser.Math.Clamp(Math.abs(vx) / this.expectMaxVX, 0, 1)
    const wingScale = Phaser.Math.Clamp(startScale + 0.12 * sideNorm, 0.18, 0.84)

    const freqMain = Phaser.Math.Clamp(Phaser.Math.Linear(40, 8, upNorm) + Phaser.Math.Linear(0, 12, backNorm), 8, 52)
    const freqWing = Phaser.Math.Clamp(freqMain - 6 * sideNorm, 6, 52)

    if(this.emMain) this.emMain.setFrequency(freqMain)
    if(this.emMain) this.emMain.setScale(startScale)

    if(this.emWingL) this.emWingL.setFrequency(freqWing)
    if(this.emWingL) this.emWingL.setScale(wingScale)
    
    if(this.emWingR) this.emWingR.setFrequency(freqWing)
    if(this.emWingR) this.emWingR.setScale(wingScale)

    // Se till att de är aktiva
    if(this.emMain) this.emMain.start()
    if(this.emWingL) this.emWingL.start()
    if(this.emWingR) this.emWingR.start()
  }

  // Oförändrad
  setThrust(level01: number) {
    const f = Phaser.Math.Clamp(level01, 0, 1)
    const extra = Phaser.Math.Linear(0, 0.18, f)
    const freqB = Phaser.Math.Linear(0, -10, f)

    // Minimum values for thrusters to stay active
    const MIN_SCALE = 0.15;  // Minimum scale for visibility
    const MIN_FREQ = 4;      // Minimum frequency for continuous effect

    const bump = (em: Phaser.GameObjects.Particles.ParticleEmitter) => {
      if (!em) return
      // Ensure scale never goes below minimum
      const s = Math.max(MIN_SCALE, Phaser.Math.Clamp(0.25 + extra, 0.18, 0.9))
      em.setScale(s)
      // Ensure frequency never goes below minimum
      const currentFreq = (em.frequency?.valueOf() ?? 16) + freqB
      em.setFrequency(Math.max(MIN_FREQ, currentFreq))
    }
    bump(this.emMain); bump(this.emWingL); bump(this.emWingR)
  }

  // Oförändrad
  onHit() {}
  onDeath() {}

  // *** OMARBETAD FÖR ATT HANTERA EN MANAGER ***
  destroy() {
    this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.follow, this)
    
    // Förstör managern, vilket automatiskt tar hand om alla emitters den äger.
    if (this.emMain) {
      this.emMain.destroy()
    }
    
    if (this.gfx) {
      this.gfx.destroy()
    }
  }
}
