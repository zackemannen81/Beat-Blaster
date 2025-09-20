import Phaser from 'phaser'
import { PowerupType } from './Powerups'

export default class Effects {
  private scene: Phaser.Scene
  private reducedMotion = false

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  setReducedMotion(flag: boolean) {
    this.reducedMotion = flag
  }

  hitSpark(x: number, y: number) {
    if (this.reducedMotion) {
      const sprite = this.scene.add.rectangle(x, y, 6, 6, 0xffffff, 0.6)
      this.scene.tweens.add({ targets: sprite, alpha: 0, duration: 120, onComplete: () => sprite.destroy() })
      return
    }
    const emitter = this.scene.add.particles(x, y, 'particles', {
      frame: ['particle_glow_small', 'particle_circle_small', 'star_small'],
      speed: { min: 80, max: 200 },
      lifespan: 400,
      scale: { start: 0.8, end: 0 },
      alpha: { start: 1, end: 0 },
      blendMode: 'ADD',
      quantity: 2,
      frequency: 100
    })
    // Emit particles at the emitter's position
    emitter.explode(12, 0, 0)
    this.scene.time.delayedCall(400, () => emitter.destroy())
  }

  explosion(x: number, y: number) {
    if (this.reducedMotion) {
      this.hitSpark(x, y)
      return
    }
    const emitter = this.scene.add.particles(x, y, 'particles', {
      frame: ['particle_glow_small', 'particle_circle_small','star_small'],
      speed: { min: 120, max: 300 },
      lifespan: 600,
      scale: { start: 1.0, end: 0 },
      alpha: { start: 1, end: 0 },
      blendMode: 'ADD'
    })
    emitter.explode(40, x, y)
    this.scene.cameras.main.shake(120, 0.01)
    this.scene.time.delayedCall(350, () => emitter.destroy())
  }

  muzzleFlash(x: number, y: number) {
    if (this.reducedMotion) return
    if (this.scene.textures.exists('plasma_glow_disc')) {
      const sprite = this.scene.add.sprite(x, y, 'plasma_glow_disc')
      sprite.setBlendMode(Phaser.BlendModes.ADD)
      sprite.setScale(0.55)
      sprite.setAlpha(0.9)
      this.scene.tweens.add({
        targets: sprite,
        alpha: 0,
        scale: 1.6,
        duration: 140,
        ease: 'Cubic.easeOut',
        onComplete: () => sprite.destroy()
      })
    }

    const emitter = this.scene.add.particles(x, y, 'particles', {
      frame: 'particle_glow_small',
      speed: { min: -20, max: 20 },
      lifespan: 150,
      scale: { start: 0.9, end: 0 },
      alpha: { start: 1, end: 0 },
      blendMode: 'ADD',
      quantity: 4,
      frequency: -1
    })
    emitter.explode(4)
    this.scene.time.delayedCall(140, () => emitter.destroy())
  }

  showComboText(x: number, y: number, count: number) {
    if (this.reducedMotion) return
    console.log('Creating combo text:', count, 'at', x, y)
    const text = this.scene.add.text(x, y - 30, `COMBO x${count}`, {
      fontFamily: 'AnnouncerFont, UiFont, sans-serif',
      fontSize: '26px',
      color: '#ffb300',
      stroke: '#000',
      strokeThickness: 2
    }).setOrigin(0.5, 0.5)
    console.log('Text created:', text.text, 'at', text.x, text.y)

    // Animate the text floating up and fading out
    this.scene.tweens.add({
      targets: text,
      y: y - 80,
      alpha: 0,
      duration: 1000,
      ease: 'Power1',
      onComplete: () => text.destroy()
    })
  }

  beatPulse() {
    if (this.reducedMotion) return
    const cam = this.scene.cameras.main
    const originalZoom = cam.zoom
    this.scene.tweens.add({
      targets: cam,
      zoom: originalZoom * 1.12,  // Scale by percentage to maintain relative zoom
      duration: 60,
      yoyo: true,
      onComplete: () => {
        cam.zoom = originalZoom  // Ensure we return to the exact original zoom
        cam.setZoom(1)
      }
    })
  }

  hitFlash(target: Phaser.GameObjects.Sprite) {
    if (!this.scene) return
    target.setTintFill(0xffffff)
    this.scene.time.delayedCall(80, () => {
      target.clearTint()
    })
  }

  plasmaCharge(x: number, y: number, rotation: number) {
    if (this.reducedMotion) return
    if (!this.scene.textures.exists('bullet_plasma_charge_0')) return
    const sprite = this.scene.add.sprite(x, y, 'bullet_plasma_charge_0')
    sprite.setRotation(rotation)
    sprite.setBlendMode(Phaser.BlendModes.ADD)
    sprite.play('bullet_plasma_charge')
    sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => sprite.destroy())
  }

  plasmaImpact(x: number, y: number) {
    if (!this.scene.textures.exists('bullet_plasma_impact_0')) {
      this.hitSpark(x, y)
      return
    }
    const sprite = this.scene.add.sprite(x, y, 'bullet_plasma_impact_0')
    sprite.setBlendMode(Phaser.BlendModes.ADD)
    sprite.play('bullet_plasma_impact')
    sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => sprite.destroy())
  }

  attachPlasmaTrail(bullet: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody) {
    if (!this.scene) return
    if (this.reducedMotion) return
    this.clearPlasmaTrail(bullet)

    const trailEmitters: Phaser.GameObjects.Particles.ParticleEmitter[] = []

    if (this.scene.textures.exists('pink_beam_arc')) {
      const emitter = this.scene.add.particles(0, 0, 'pink_beam_arc', {
        lifespan: 200,
        quantity: 1,
        frequency: 45,
        speed: 0,
        scale: { start: 0.65, end: 0 },
        alpha: { start: 0.8, end: 0 },
        blendMode: 'ADD'
      })
      emitter.follow = bullet as Phaser.Types.Math.Vector2Like
      emitter.emitCallback = (particle: Phaser.GameObjects.Particles.Particle) => {
        particle.rotation = bullet.rotation
      }
      trailEmitters.push(emitter)
    }

    if (this.scene.textures.exists('particle_plasma_spark')) {
      const emitter = this.scene.add.particles(0, 0, 'particle_plasma_spark', {
        lifespan: 220,
        speed: { min: -30, max: 30 },
        scale: { start: 0.6, end: 0 },
        alpha: { start: 1, end: 0 },
        quantity: 1,
        frequency: 55,
        blendMode: 'ADD'
      })
      emitter.follow = bullet as Phaser.Types.Math.Vector2Like
      trailEmitters.push(emitter)
    }

    if (this.scene.textures.exists('particle_plasma_dot')) {
      const emitter = this.scene.add.particles(0, 0, 'particle_plasma_dot', {
        lifespan: 180,
        speed: { min: -20, max: 20 },
        scale: { start: 0.45, end: 0 },
        alpha: { start: 0.9, end: 0 },
        quantity: 1,
        frequency: 70,
        blendMode: 'ADD'
      })
      emitter.follow = bullet as Phaser.Types.Math.Vector2Like
      trailEmitters.push(emitter)
    }

    let trailTimer: Phaser.Time.TimerEvent | undefined
    if (this.scene.textures.exists('plasma_trail_0')) {
      trailTimer = this.scene.time.addEvent({
        delay: 70,
        loop: true,
        callback: () => {
          if (!bullet.active) return
          const sprite = this.scene.add.sprite(bullet.x, bullet.y, 'plasma_trail_0')
          sprite.setRotation(bullet.rotation)
          sprite.setBlendMode(Phaser.BlendModes.ADD)
          sprite.play('plasma_trail_cycle')
          const currentAnim = sprite.anims.currentAnim
          if (currentAnim) {
            const total = currentAnim.getTotalFrames()
            if (total > 0) {
              const frame = currentAnim.getFrameAt(Phaser.Math.Between(0, total - 1))
              if (frame) sprite.setFrame(frame.textureFrame)
            }
          }
          this.scene.tweens.add({
            targets: sprite,
            alpha: 0,
            scale: { from: 0.9, to: 0.4 },
            duration: 200,
            onComplete: () => sprite.destroy()
          })
        }
      })
    }

    bullet.setData('plasmaTrailEmitters', trailEmitters)
    bullet.setData('plasmaTrailTimer', trailTimer)
  }

  clearPlasmaTrail(bullet: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody) {
    const emitters = bullet.getData('plasmaTrailEmitters') as Phaser.GameObjects.Particles.ParticleEmitter[] | undefined
    emitters?.forEach((emitter) => emitter.destroy())
    bullet.setData('plasmaTrailEmitters', undefined)

    const timer = bullet.getData('plasmaTrailTimer') as Phaser.Time.TimerEvent | undefined
    timer?.remove(false)
    bullet.setData('plasmaTrailTimer', undefined)
  }

  enemyHitFx(x: number, y: number) {
    if (this.reducedMotion) {
      this.hitSpark(x, y)
      return
    }
    if (this.scene.textures.exists('enemy_hit_plasma_0')) {
      const sprite = this.scene.add.sprite(x, y, 'enemy_hit_plasma_0')
      sprite.setBlendMode(Phaser.BlendModes.ADD)
      sprite.play('enemy_hit_plasma')
      sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => sprite.destroy())
    } else {
      this.plasmaImpact(x, y)
    }

    if (this.scene.textures.exists('particle_plasma_spark')) {
      const emitter = this.scene.add.particles(0, 0, 'particle_plasma_spark', {
        lifespan: 260,
        speed: { min: 80, max: 220 },
        angle: { min: 0, max: 360 },
        scale: { start: 0.8, end: 0 },
        alpha: { start: 1, end: 0 },
        quantity: 12,
        blendMode: 'ADD'
      })
      emitter.explode(12, x, y)
      this.scene.time.delayedCall(260, () => emitter.destroy())
    }
  }

  enemyExplodeFx(x: number, y: number) {
    if (this.reducedMotion) {
      this.hitSpark(x, y)
      return
    }
    if (this.scene.textures.exists('enemy_explode_plasma_0')) {
      const sprite = this.scene.add.sprite(x, y, 'enemy_explode_plasma_0')
      sprite.setBlendMode(Phaser.BlendModes.ADD)
      sprite.play('enemy_explode_plasma')
      sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => sprite.destroy())
    } else {
      this.explosion(x, y)
    }

    const shardFrames: string[] = []
    for (let i = 0; i < 4; i++) {
      const key = `enemy_shard_${i}`
      if (this.scene.textures.exists(key)) shardFrames.push(key)
    }

    if (shardFrames.length > 0) {
      for (let i = 0; i < 10; i++) {
        const frame = shardFrames[Phaser.Math.Between(0, shardFrames.length - 1)]
        const shard = this.scene.add.sprite(x, y, frame)
        shard.setBlendMode(Phaser.BlendModes.ADD)
        shard.play({ key: 'enemy_shard_twinkle', startFrame: Phaser.Math.Between(0, 3) })
        const angle = Phaser.Math.FloatBetween(0, Math.PI * 2)
        const speed = Phaser.Math.FloatBetween(120, 260)
        const vx = Math.cos(angle) * speed
        const vy = Math.sin(angle) * speed
        this.scene.tweens.add({
          targets: shard,
          x: x + vx * 0.3,
          y: y + vy * 0.3,
          alpha: 0,
          rotation: Phaser.Math.FloatBetween(-Math.PI, Math.PI),
          duration: Phaser.Math.Between(360, 520),
          ease: 'Cubic.easeOut',
          onComplete: () => shard.destroy()
        })
      }
    }

    if (this.scene.textures.exists('particle_plasma_dot')) {
      const emitter = this.scene.add.particles(0, 0, 'particle_plasma_dot', {
        lifespan: 400,
        speed: { min: 60, max: 160 },
        scale: { start: 0.7, end: 0 },
        alpha: { start: 1, end: 0 },
        quantity: 20,
        blendMode: 'ADD'
      })
      emitter.explode(20, x, y)
      this.scene.time.delayedCall(400, () => emitter.destroy())
    }

    this.scene.cameras.main.shake(150, 0.01)
  }

  powerupPickupText(x: number, y: number, type: PowerupType) {
    const palette: Record<PowerupType, number> = {
      shield: 0x74d0ff,
      rapid: 0xff6b6b,
      split: 0xba68ff,
      slowmo: 0x78ffbc
    }
    const color = palette[type]
    const label = type.toUpperCase()
    const text = this.scene.add.text(x, y, `+${label}!`, {
      fontFamily: 'AnnouncerFont, UiFont, sans-serif',
      fontSize: '24px',
      color: '#ffffff',
      stroke: '#000',
      strokeThickness: 4
    }).setOrigin(0.5)
    text.setTint(color)
    text.setDepth(20)

    this.scene.tweens.add({
      targets: text,
      y: y - 30,
      alpha: 0,
      duration: 600,
      ease: 'Cubic.easeOut',
      onComplete: () => text.destroy()
    })
  }
}
