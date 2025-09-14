import Phaser from 'phaser'
import AudioAnalyzer from '../systems/AudioAnalyzer'
import Conductor from '../systems/Conductor'
import Spawner from '../systems/Spawner'
import Scoring from '../systems/Scoring'
import HUD from '../ui/HUD'
import Effects from '../systems/Effects'
import Powerups, { PowerupType } from '../systems/Powerups'
import Starfield from '../systems/Starfield'
import { loadOptions } from '../systems/Options'

export default class GameScene extends Phaser.Scene {
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
  private analyzer!: AudioAnalyzer
  private conductor!: Conductor
  private spawner!: Spawner
  private hud!: HUD
  private scoring = new Scoring()
  private music?: Phaser.Sound.BaseSound
  private bullets!: Phaser.Physics.Arcade.Group
  private isShooting = false
  private lastShotAt = 0
  private bulletSpeed = 900
  private bulletTtlMs = 1000
  private fireCooldownMs = 120
  private effects!: Effects
  private powerups!: Powerups
  private playerHp = 3
  private playerMaxHp = 3
  private iframesUntil = 0
  private bombCharge = 0 // 0..100
  private metronome = false
  private lastDashToggle = 0
  private lastBeatAt = 0
  private nextQuantizedShotAt = 0
  private beatPeriodMs = 500 // fallback
  private crosshair!: Phaser.GameObjects.Graphics
  private starfield!: Starfield
  private enemyCap = 15
  private fallbackCycle = 0
  private comboCount = 0
  private comboTimeoutMs = 2000
  private lastHitAt = 0
  private opts = loadOptions()

  constructor() {
    super('GameScene')
  }

  create() {
    const { width, height } = this.scale
    this.cameras.main.setBackgroundColor('#0a0a0f')

    // Starfield background (procedural)
    this.starfield = new Starfield(this)
    this.starfield.create()

    // Player sprite from atlas
    this.player = this.physics.add.sprite(width / 2, height / 2, 'gameplay', 'player_idle')
    this.player.setCollideWorldBounds(true)

    this.cursors = this.input.keyboard!.createCursorKeys()

    // Read balance
    const balance = this.registry.get('balance') as any
    if (balance?.bullets) {
      this.bulletSpeed = balance.bullets.speed ?? this.bulletSpeed
      this.fireCooldownMs = balance.bullets.cooldownMs ?? this.fireCooldownMs
      this.bulletTtlMs = balance.bullets.ttlMs ?? this.bulletTtlMs
    }
    if (balance?.player) {
      this.playerMaxHp = balance.player.hp ?? this.playerMaxHp
      this.playerHp = this.playerMaxHp
    }

    // Bullets group & fire mode
    this.bullets = this.physics.add.group({ classType: Phaser.Physics.Arcade.Sprite })
    this.input.on('pointerdown', () => {
      if (this.opts.fireMode === 'click') {
        const t = this.time.now
        if (t - this.lastShotAt >= this.fireCooldownMs) {
          this.fireBullet()
          this.lastShotAt = t
        }
      } else {
        this.isShooting = true
        if (this.opts.fireMode === 'hold_quantized') {
          this.nextQuantizedShotAt = this.lastBeatAt + this.beatPeriodMs
        }
      }
    })
    this.input.on('pointerup', () => {
      this.isShooting = false
      this.nextQuantizedShotAt = 0
    })

    // Load selected track on demand
    const tracks = this.registry.get('tracks') as any[]
    const selId = this.registry.get('selectedTrackId') as string | null
    const track = tracks?.find((t) => t.id === selId)
    if (track) {
      this.load.audio('music', [track.fileOgg || '', track.fileMp3 || ''].filter(Boolean))
      this.load.once(Phaser.Loader.Events.COMPLETE, () => {
        this.music = this.sound.add('music', { loop: false, volume: this.opts.musicVolume })
        this.music.play()
      })
      this.load.start()
    }

    // Analyzer + Conductor
    this.analyzer = new AudioAnalyzer(this)
    this.analyzer.attachToAudio()
    this.conductor = new Conductor(this)
    this.analyzer.on('beat:low', () => { this.conductor.onBeat(); this.lastBeatAt = this.time.now })
    this.analyzer.on('beat:mid', () => { this.conductor.onBeat(); this.lastBeatAt = this.time.now })
    this.analyzer.on('beat:high', () => { this.conductor.onBeat(); this.lastBeatAt = this.time.now })
    // Read metronome from options
    this.metronome = this.opts.metronome
    this.analyzer.on('beat:low', () => {
      if (this.metronome) this.sound.play('metronome', { volume: 0.2 })
      this.effects.beatPulse()
    })

    // Spawner
    this.spawner = new Spawner(this)
    const canSpawn = () => this.spawner.getGroup().countActive(true) < this.enemyCap
    this.analyzer.on('beat:low', () => {
      if (!canSpawn()) return
      if (Math.random() < 0.3) this.spawner.spawn('brute', 1)
    })
    this.analyzer.on('beat:mid', () => {
      if (!canSpawn()) return
      if (Math.random() < 0.2) this.spawner.spawn('dasher', 1)
    })
    this.analyzer.on('beat:high', () => {
      if (!canSpawn()) return
      if (Math.random() < 0.2) this.spawner.spawn('swarm', 2)
    })

    // Fallback BPM-driven spawns if analyzer events are not firing
    const bpm = (track && track.bpm) ? track.bpm : 120
    const interval = 60000 / bpm
    this.time.addEvent({ delay: interval, loop: true, callback: () => {
      if (!canSpawn()) return
      // If no analyzer beat in the last 1.5 intervals, synthesize spawns (one type at a time)
      if (this.time.now - this.lastBeatAt > interval * 1.5) {
        const type = this.fallbackCycle % 3
        if (type === 0) this.spawner.spawn('brute', 1)
        else if (type === 1) this.spawner.spawn('dasher', 1)
        else this.spawner.spawn('swarm', 2)
        this.fallbackCycle++
      }
    }})

    // HUD
    this.hud = new HUD(this)
    this.hud.create()
    this.hud.setupHearts(this.playerMaxHp)
    this.hud.setHp(this.playerHp)
    this.hud.setBombCharge(this.bombCharge / 100)

    // Effects
    this.effects = new Effects(this)
    this.powerups = new Powerups(this)

    // Collisions: bullets -> enemies
    this.physics.add.overlap(this.bullets, this.spawner.getGroup(), (_b, _e) => {
      const bullet = _b as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
      const enemy = _e as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
      const etype = (enemy.getData('etype') as 'brute' | 'dasher' | 'swarm') || 'swarm'
      const hp = (enemy.getData('hp') as number) ?? 1
      const dmg = 1
      const newHp = hp - dmg
      enemy.setData('hp', newHp)
      this.scoring.registerShot(0) // Perfect hit
      bullet.disableBody(true, true)
      this.effects.hitSpark(enemy.x, enemy.y)
      this.effects.hitFlash(enemy)
      this.comboCount++
      this.lastHitAt = this.time.now
      this.hud.setCombo(this.comboCount)
      if (newHp <= 0) {
        const healthBar = enemy.getData('healthBar') as Phaser.GameObjects.Graphics
        if (healthBar) {
          healthBar.destroy()
        }
        enemy.disableBody(true, true)
        this.sound.play('hit_enemy', { volume: this.opts.sfxVolume })
        this.scoring.addKill(etype)
        this.bumpBomb(10)
        this.maybeDropPickup(enemy.x, enemy.y)
      }
    })

    // Collisions: player <- enemies
    this.physics.add.overlap(this.player, this.spawner.getGroup(), (_p, _e) => {
      const now = this.time.now
      if (now < this.iframesUntil) return
      const enemy = _e as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
      if (this.powerups.hasShield) {
        // shield blocks one hit
        this.effects.hitSpark(this.player.x, this.player.y)
      } else {
        enemy.disableBody(true, true)
        this.playerHp = Math.max(0, this.playerHp - 1)
        this.comboCount = 0
        this.hud.setCombo(this.comboCount)
        this.iframesUntil = now + 800
      }
      this.hud.setHp(this.playerHp)
      this.cameras.main.shake(150, 0.01)
      if (this.playerHp <= 0) {
        this.endRun()
      }
    })

    // Back to menu
    this.input.keyboard!.on('keydown-ESC', () => {
      this.sound.play('ui_back', { volume: this.opts.sfxVolume })
      this.scene.start('MenuScene')
    })

    // Bomb on SPACE when charged
    this.input.keyboard!.on('keydown-SPACE', () => {
      if (this.bombCharge >= 100) this.triggerBomb()
    })

    // Crosshair (drawn reticle)
    this.crosshair = this.add.graphics().setDepth(1000)
    this.input.setDefaultCursor('none')
  }

  update(time: number, delta: number): void {
    // Analyzer update
    if (this.analyzer) this.analyzer.update()
    // Starfield update
    if (this.starfield) this.starfield.update(delta)

    // Combo timeout
    if (this.comboCount > 0 && time - this.lastHitAt > this.comboTimeoutMs) {
      this.comboCount = 0
      this.hud.setCombo(this.comboCount)
    }

    // Shooting
    const cooldown = this.powerups.hasRapid ? this.fireCooldownMs * 0.8 : this.fireCooldownMs
    if (this.isShooting && time - this.lastShotAt >= cooldown) {
      this.fireBullet()
      this.lastShotAt = time
    }

    const speed = 250
    const body = this.player.body
    body.setVelocity(0, 0)

    if (this.cursors.left?.isDown) body.velocity.x = -speed
    else if (this.cursors.right?.isDown) body.velocity.x = speed
    if (this.cursors.up?.isDown) body.velocity.y = -speed
    else if (this.cursors.down?.isDown) body.velocity.y = speed

    // HUD update (score placeholder)
    const shots = this.scoring.shots || 1
    const accPct = ((this.scoring.perfect + this.scoring.good) / shots) * 100
    this.hud.update(this.scoring.score, this.scoring.multiplier, accPct)

    // Enemy steering
    const group = this.spawner.getGroup()
    const px = this.player.x, py = this.player.y
    const now = this.time.now
    const dashBoost = 2.2
    const dashPhase = Math.floor(now / 600) // toggle every 600ms
    group.children.each((obj: Phaser.GameObjects.GameObject) => {
      const s = obj as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
      const healthBar = s.getData('healthBar') as Phaser.GameObjects.Graphics
      if (!s.active) {
        if (healthBar) healthBar.clear()
        return false
      }
      const etype = (s.getData('etype') as 'brute' | 'dasher' | 'swarm') || 'swarm'
      const ang = Phaser.Math.Angle.Between(s.x, s.y, px, py)
      let speed = (etype === 'swarm' ? 110 : etype === 'dasher' ? 160 : 80) * 0.5
      if (etype === 'dasher' && dashPhase % 2 === 0) speed *= dashBoost
      s.body.setVelocity(Math.cos(ang) * speed, Math.sin(ang) * speed)

      this.drawHealthBar(s)
      return true
    })

    // Aim rotation and crosshair follow
    const pointer = this.input.activePointer
    const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y)
    const ang = Phaser.Math.Angle.Between(this.player.x, this.player.y, world.x, world.y)
    this.player.setRotation(ang)
    // Draw reticle
    this.crosshair.clear()
    this.crosshair.lineStyle(2, 0x00e5ff, 0.9)
    this.crosshair.strokeCircle(world.x, world.y, 10)
    this.crosshair.beginPath()
    this.crosshair.moveTo(world.x - 14, world.y)
    this.crosshair.lineTo(world.x - 4, world.y)
    this.crosshair.moveTo(world.x + 4, world.y)
    this.crosshair.lineTo(world.x + 14, world.y)
    this.crosshair.moveTo(world.x, world.y - 14)
    this.crosshair.lineTo(world.x, world.y - 4)
    this.crosshair.moveTo(world.x, world.y + 4)
    this.crosshair.lineTo(world.x, world.y + 14)
    this.crosshair.strokePath()
  }

  private fireBullet() {
    const pointer = this.input.activePointer
    const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y)
    const from = new Phaser.Math.Vector2(this.player.x, this.player.y)
    const to = new Phaser.Math.Vector2(world.x, world.y)
    const dir = to.subtract(from).normalize()
    const b = this.bullets.get(this.player.x, this.player.y, 'gameplay', 'bullet_basic') as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
    if (!b) return
    b.setActive(true).setVisible(true)
    b.body.enable = true
    b.body.setVelocity(dir.x * this.bulletSpeed, dir.y * this.bulletSpeed)
    b.setRotation(Math.atan2(dir.y, dir.x) + Math.PI / 2)
    // TTL
    const dieAt = this.time.now + this.bulletTtlMs
    b.setData('dieAt', dieAt)
    this.time.addEvent({ delay: this.bulletTtlMs, callback: () => b.disableBody(true, true) })
    this.sound.play('shot', { volume: this.opts.sfxVolume })
    this.effects.muzzleFlash(this.player.x + dir.x * 12, this.player.y + dir.y * 12)
    // Split-shot
    if (this.powerups.hasSplit) {
      const ang = 12 * (Math.PI / 180)
      const dirL = dir.clone().rotate(-ang)
      const dirR = dir.clone().rotate(ang)
      const bl = this.bullets.get(this.player.x, this.player.y, 'gameplay', 'bullet_basic') as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
      const br = this.bullets.get(this.player.x, this.player.y, 'gameplay', 'bullet_basic') as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
      if (bl) {
        bl.setActive(true).setVisible(true)
        bl.body.enable = true
        bl.body.setVelocity(dirL.x * this.bulletSpeed, dirL.y * this.bulletSpeed)
        bl.setRotation(Math.atan2(dirL.y, dirL.x) + Math.PI / 2)
        this.time.addEvent({ delay: this.bulletTtlMs, callback: () => bl.disableBody(true, true) })
      }
      if (br) {
        br.setActive(true).setVisible(true)
        br.body.enable = true
        br.body.setVelocity(dirR.x * this.bulletSpeed, dirR.y * this.bulletSpeed)
        br.setRotation(Math.atan2(dirR.y, dirR.x) + Math.PI / 2)
        this.time.addEvent({ delay: this.bulletTtlMs, callback: () => br.disableBody(true, true) })
      }
    }
    // Scoring based on nearest beat
    const deltaMs = this.analyzer.nearestBeatDeltaMs()
    this.scoring.registerShot(deltaMs)

    // Beat indicator (optional): draw a short-lived ring around player
    const g = this.add.graphics({ x: this.player.x, y: this.player.y })
    g.lineStyle(2, 0x00e5ff, 0.8)
    g.strokeCircle(0, 0, 18)
    this.tweens.add({ targets: g, alpha: 0, scale: 1.6, duration: 180, onComplete: () => g.destroy() })
  }

  private maybeDropPickup(x: number, y: number) {
    const chance = 0.15
    if (Math.random() > chance) return
    const types: PowerupType[] = ['shield', 'rapid', 'split', 'slowmo']
    const type = types[Math.floor(Math.random() * types.length)]
    const frame =
      type === 'shield' ? 'pickup_shield' : type === 'rapid' ? 'pickup_rapid' : type === 'split' ? 'pickup_split' : 'pickup_slowmo'
    const s = this.physics.add.sprite(x, y, 'gameplay', frame)
    s.setData('ptype', type)
    s.setDepth(1)
    // Fade after 6s
    this.tweens.add({ targets: s, alpha: 0.2, duration: 6000, onComplete: () => s.destroy() })
    // Overlap with player
    const overlap = this.physics.add.overlap(this.player, s, () => {
      overlap.destroy()
      const ptype = s.getData('ptype') as PowerupType
      s.destroy()
      const dur = ptype === 'shield' ? 5 : ptype === 'rapid' ? 6 : ptype === 'split' ? 6 : 3
      this.powerups.apply(ptype, dur)
      this.sound.play('ui_select', { volume: 0.5 })
    })
  }

  private triggerBomb() {
    // Clear enemies in radius by disabling all
    const group = this.spawner.getGroup()
    group.children.each((e: Phaser.GameObjects.GameObject) => {
      const s = e as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
      if (!s.active) return false
      this.effects.explosion(s.x, s.y)
      s.disableBody(true, true)
      return true
    })
    this.sound.play('explode_big', { volume: this.opts.sfxVolume })
    this.bumpBomb(-100)
  }

  private bumpBomb(delta: number) {
    this.bombCharge = Phaser.Math.Clamp(this.bombCharge + delta, 0, 100)
    this.hud.setBombCharge(this.bombCharge / 100)
  }

  private drawHealthBar(enemy: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody) {
    const healthBar = enemy.getData('healthBar') as Phaser.GameObjects.Graphics
    if (!healthBar) return

    healthBar.clear()

    const hp = enemy.getData('hp') as number
    const etype = enemy.getData('etype') as 'brute' | 'dasher' | 'swarm'
    const balance = this.registry.get('balance') as any
    const maxHp =
      balance?.enemies?.[etype]?.hp ?? (etype === 'brute' ? 6 : etype === 'dasher' ? 3 : 1)
    const healthPercentage = hp > 0 ? hp / maxHp : 0

    const barWidth = 20
    const barHeight = 3
    const x = enemy.x - barWidth / 2
    const y = enemy.y - (enemy.height * enemy.scaleY) / 2 - 8

    healthBar.fillStyle(0x808080)
    healthBar.fillRect(x, y, barWidth, barHeight)

    if (healthPercentage > 0) {
      healthBar.fillStyle(0x00ff00)
      healthBar.fillRect(x, y, barWidth * healthPercentage, barHeight)
    }
  }

  private endRun() {
    // Stop music
    this.music?.stop()
    this.scene.start('ResultScene', { score: this.scoring.score })
  }
}
