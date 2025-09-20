import Phaser from 'phaser'
import AudioAnalyzer from '../systems/AudioAnalyzer'
import Conductor from '../systems/Conductor'
import Spawner from '../systems/Spawner'
import Scoring from '../systems/Scoring'
import HUD from '../ui/HUD'
import Effects from '../systems/Effects'
import Powerups, { PowerupType, PowerupEvent } from '../systems/Powerups'
import { loadOptions } from '../systems/Options'
import PlayerSkin from '../systems/PlayerSkin'
import CubeSkin from '../systems/CubeSkin'
import { SceneBackground } from '../systems/SceneBackground'
import ClassicBackground from '../systems/ClassicBackground'
import DualGridBackground from '../systems/DualGridBackground'
import AuroraBackground from '../systems/AuroraBackground'
import CityscapeBackground from '../systems/CityscapeBackground'
import OceanBackground from '../systems/OceanBackground'
import TunnelBackground from '../systems/TunnelBackground'
import Announcer from '../systems/Announcer'

type Enemy = Phaser.Types.Physics.Arcade.SpriteWithDynamicBody

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
  private fireCooldownMs = 50
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
  private beatPeriodMs = 2000 // fallback
  private crosshair!: Phaser.GameObjects.Graphics
  private background?: SceneBackground
  private enemyCap = 25
  private fallbackCycle = 0
  private comboCount = 0
  private comboTimeoutMs = 2000
  private lastHitAt = 0
  private opts = loadOptions()
  private beatIndicator!: Phaser.GameObjects.Graphics;
  private lastHitEnemyId: string | null = null
  private powerupDurations: Record<PowerupType, number> = {
    shield: 5,
    rapid: 6,
    split: 6,
    slowmo: 3
  }
  private isPaused = false
  private announcer?: Announcer
  private bombReadyAnnounced = false
  private warningAnnounced = false
  private enemyPressureAnnounced = false
  // inne i klassen GameScene, efter private-fälten
private cleanupEnemy(enemy: Enemy, doDeathFx = true) {
  // städa skin
  const skin = enemy.getData('skin') as any
  if (doDeathFx) skin?.onDeath?.()
  skin?.destroy?.()

  // städa healthbar
  const hb = enemy.getData('healthBar') as Phaser.GameObjects.Graphics
  hb?.destroy()

  // disable + hide själva fienden
  enemy.disableBody(true, true)
}
  //private keys:Phaser.Types.Input.Keyboard;
  constructor() {
    super('GameScene')
  }

  create() {
    const { width, height } = this.scale
    this.cameras.main.setBackgroundColor('#0a0a0f')

    // Backgrounds
    this.applyBackgroundSetting()

    // Player sprite from atlas
/*
    this.player = this.physics.add.sprite(width / 2, height / 2, 'gameplay', 'player_idle')
    this.player.setScale(0.5);
    this.player.setCollideWorldBounds(true)
    this.player.setRotation(Math.PI/2) // Rotate 90 degrees to face right
*/
// Player sprite (behåll som fysik-host)
    this.player = this.physics.add.sprite(width/2, height/2, 'gameplay', 'player_idle')
    this.player.setCollideWorldBounds(true)

  // vi ritar spelaren via PlayerSkin → göm atlas-grafiken
    this.player.setVisible(false)

// sätt en rimlig hitbox (matcha din PlayerSkin-storlek, t.ex. triangel ~18px)
    const r = 14
    this.player.body.setCircle(r, -r + this.player.width/2, -r + this.player.height/2)

// rotationen behövs fortfarande – PlayerSkin följer host.rotation
    this.player.setRotation(Math.PI/2)

// koppla på skinet
    const pskin = new PlayerSkin(this, this.player)
    this.player.setData('skin', pskin)

    this.beatIndicator = this.add.graphics();
    this.beatIndicator.fillStyle(0xff0000, 1);
    this.beatIndicator.fillCircle(50, 50, 20); // Placera den där det passar i ditt UI

  /*
    // aktivera WASD
    this.keys = this.input.keyboard!.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
      shift: Phaser.Input.Keyboard.KeyCodes.SHIFT
    }) as {
      up: Phaser.Input.Keyboard.Key;
      down: Phaser.Input.Keyboard.Key;
      left: Phaser.Input.Keyboard.Key;
      right: Phaser.Input.Keyboard.Key;
      space: Phaser.Input.Keyboard.Key;
      shift: Phaser.Input.Keyboard.Key;
    };
*/
    this.cursors = this.input.keyboard!.createCursorKeys()
    const wasd = this.input.keyboard!.addKeys({
      W: Phaser.Input.Keyboard.KeyCodes.W,
      A: Phaser.Input.Keyboard.KeyCodes.A,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      D: Phaser.Input.Keyboard.KeyCodes.D,
    }) as any
    this.registry.set('wasd', wasd)

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
    this.warningAnnounced = false
    this.bombReadyAnnounced = false
    this.enemyPressureAnnounced = false

    // Bullets group & fire mode
    this.bullets = this.physics.add.group({
      classType: Phaser.Physics.Arcade.Sprite,
      defaultKey: 'bullet_plasma_0'
    })
    this.physics.world.on('worldbounds', this.handleBulletWorldBounds, this)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.physics.world) this.physics.world.off('worldbounds', this.handleBulletWorldBounds, this)
      this.music?.stop()
      this.music?.destroy()
      this.music = undefined
      this.destroyBackground()
      this.announcer?.destroy()
      this.announcer = undefined
      this.powerups.removeAllListeners()
    })
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
    
    // Initialize analyzer first
    this.analyzer = new AudioAnalyzer(this)
    this.conductor = new Conductor(this)
    this.background?.setAnalyzer(this.analyzer)
    
    // Set up beat listeners
    this.analyzer.on('beat:low', (level: number) => {
      this.conductor.onBeat()
      this.lastBeatAt = this.time.now
      this.events.emit('beat:low', level)
      this.pulseEnemies()
    })
    this.analyzer.on('beat:mid', (level: number) => {
      this.conductor.onBeat()
      this.lastBeatAt = this.time.now
      this.events.emit('beat:mid', level)
    })
    this.analyzer.on('beat:high', (level: number) => {
      this.conductor.onBeat()
      this.lastBeatAt = this.time.now
      this.events.emit('beat:high', level)
    })


    this.sound.removeByKey('music')
    this.cache.audio.remove('music')

    if (track) {
      // First, ensure the audio context is running
      const soundManager = this.sound as Phaser.Sound.WebAudioSoundManager;
      if (soundManager.context.state === 'suspended') {
        soundManager.context.resume().catch(console.error);
      }

      this.load.audio('music', [track.fileOgg || '', track.fileMp3 || ''].filter(Boolean));
      this.load.once(Phaser.Loader.Events.COMPLETE, () => {
        try {
          // Create and configure the music
          this.music = this.sound.add('music', { 
            loop: false, 
            volume: this.opts.musicVolume
          });
          
          // Start playing the music
          this.music.on('play', () => {
            console.log('Music started playing');
            
            // Attach analyzer after a short delay
            setTimeout(() => {
              if (this.music) {
                if (this.analyzer.attachToAudio(this.music)) {
                  console.log('Analyzer attached successfully');
                } else {
                  console.warn('Failed to attach analyzer');
                }
              }
            }, 500);
          });
          
          // Start playback
          this.music.play();
          
        } catch (error) {
          console.error('Error initializing audio:', error);
        }
      });
      
      this.load.start();
    } else {
      console.warn('No track selected or track not found');
    }

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
/*    this.time.addEvent({ delay: interval, loop: true, callback: () => {
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
*/
    // HUD
    this.hud = new HUD(this)
    this.hud.create()
    this.hud.setupHearts(this.playerMaxHp)
    this.hud.setHp(this.playerHp)
    this.hud.setBombCharge(this.bombCharge / 100)

    // Effects
    this.effects = new Effects(this)
    this.announcer = new Announcer(this, () => this.opts.sfxVolume, this.opts.announcerEnabled)
    this.powerups = new Powerups(this)
    this.powerups.on('powerup', (event: PowerupEvent) => {
      this.announcer?.playPowerup(event.type)
    })
    this.hud.bindPowerups(this.powerups)

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
      this.disableBullet(bullet)
      this.effects.enemyHitFx(enemy.x, enemy.y)
      this.effects.hitFlash(enemy)
      const skin = enemy.getData('skin') as any
      skin?.onHit?.()
      // Get a unique ID for the enemy (use the Phaser object's ID)
      const enemyId = enemy.getData('eid') as string
      // enemyId bör vara unikt per fiende
if (this.time.now - this.lastHitAt > this.comboTimeoutMs) {
  // För sent -> reset combo
  this.comboCount = 0
  this.lastHitEnemyId = null
}

// Är det en ny fiende inom tidsfönstret?
if (this.lastHitEnemyId !== enemyId) {
  if (this.comboCount > 0) {
    // Bara från andra fienden och uppåt
    this.comboCount++
    console.log('New combo count:', this.comboCount)

    // Visa text när multiplikatorn ökar
    this.effects.showComboText(enemy.x, enemy.y, this.comboCount)
    this.hud.setCombo(this.comboCount)
    this.announcer?.playCombo(this.comboCount)
  } else {
    // Första träffen bara armerar combon
    this.comboCount = 1
  }
  this.lastHitEnemyId = enemyId
}

// Reset timer
this.lastHitAt = this.time.now
if (newHp <= 0) {
  this.sound.play('hit_enemy', { volume: this.opts.sfxVolume })
  this.scoring.addKill(etype)
  this.bumpBomb(10)
  this.maybeDropPickup(enemy.x, enemy.y)

  this.effects.enemyExplodeFx(enemy.x, enemy.y)
  this.cleanupEnemy(enemy, true) // ← allt städas här
}
/*
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
        const skin = enemy.getData('skin') as any
    skin?.onDeath?.()
    skin?.destroy?.()
      }
      */
    
    })

    // Collisions: player <- enemies
    this.physics.add.overlap(this.player, this.spawner.getGroup(), (_p, _e) => {
      const now = this.time.now
      if (now < this.iframesUntil) return
      const enemy = _e as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
      if (this.powerups.hasShield) {
        // shield blocks one hit
        this.effects.hitSpark(this.player.x, this.player.y)
        //this.effects.hitSpark(20, 20)
      
      } else {
        //enemy.disableBody(true, true)
        this.cleanupEnemy(enemy, false) // inga extra death-FX om du inte vill
        this.playerHp = Math.max(0, this.playerHp - 1)
        this.comboCount = 0
        this.hud.setCombo(this.comboCount)
        this.iframesUntil = now + 800
        if (this.playerHp === 1 && !this.warningAnnounced) {
          this.announcer?.playEvent('warning')
          this.warningAnnounced = true
        }
        if (this.playerHp > 1 && this.warningAnnounced) {
          this.warningAnnounced = false
        }
      }
      this.hud.setHp(this.playerHp)
      this.cameras.main.shake(150, 0.01)
      if (this.playerHp <= 0) {
        this.endRun()
      }
    })

    // Back to menu
    this.input.keyboard!.on('keydown-ESC', () => {
      if (this.isPaused) return
      this.pauseGame()
    })

    // Bomb on SPACE when charged
    this.input.keyboard!.on('keydown-SPACE', () => {
      if (this.bombCharge >= 100) this.triggerBomb()
    })

    // Crosshair (drawn reticle)
    this.crosshair = this.add.graphics().setDepth(1000)
    this.input.setDefaultCursor('none')

    this.time.delayedCall(250, () => this.announcer?.playEvent('new_game'))

    this.events.on(Phaser.Scenes.Events.RESUME, () => {
      this.isPaused = false
      this.music?.resume()
      this.opts = loadOptions()
      this.applyBackgroundSetting()
      this.input.setDefaultCursor('none')
      this.announcer?.setEnabled(this.opts.announcerEnabled)
    })
  }

  update(time: number, delta: number): void {
    // Analyzer update
    if (this.analyzer) this.analyzer.update()
    this.background?.update(time, delta)

    if (this.time.now - this.lastBeatAt < 100) { // Visa cirkeln i 100ms efter varje beat
      this.beatIndicator.setAlpha(1)
    } else {
      this.beatIndicator.setAlpha(0.3) // Gör den genomskinlig när inget beat
    }

    if (time - this.lastHitAt > this.comboTimeoutMs && this.comboCount > 0) {
      this.comboCount = 0
      this.hud.setCombo(0)
      this.lastHitEnemyId = null
    }
    if (this.playerHp > 1 && this.warningAnnounced) {
      this.warningAnnounced = false
    }

    if (this.spawner) {
      const activeEnemies = this.spawner.getGroup().countActive(true)
      if (activeEnemies >= this.enemyCap - 5) {
        if (!this.enemyPressureAnnounced) {
          this.announcer?.playEvent('enemies')
          this.enemyPressureAnnounced = true
        }
      } else if (this.enemyPressureAnnounced && activeEnemies < this.enemyCap / 2) {
        this.enemyPressureAnnounced = false
      }
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
//if (this.keys.)
const pointer = this.input.activePointer
const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y)
const wasdKeys = this.registry.get('wasd') as any
    if (this.cursors.left?.isDown || wasdKeys?.A?.isDown) body.velocity.x = -speed
    else if (this.cursors.right?.isDown || wasdKeys?.D?.isDown) body.velocity.x = speed
    if (this.cursors.up?.isDown || wasdKeys?.W?.isDown) body.velocity.y = -speed
    else if (this.cursors.down?.isDown || wasdKeys?.S?.isDown) body.velocity.y = speed

/*
const speed = 250
const body = this.player.body as Phaser.Physics.Arcade.Body
body.setVelocity(0, 0)

// siktesvektor
const pointer = this.input.activePointer
const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y)
const forward = new Phaser.Math.Vector2(world.x - this.player.x, world.y - this.player.y).normalize()
const left = new Phaser.Math.Vector2(-forward.y, forward.x) // 90° åt vänster

// input (piltangenter + ev WASD)
const wasdKeys = this.registry.get('wasd') as any
let fwd = 0, strafe = 0
if (this.cursors.up?.isDown    || wasdKeys?.W?.isDown) fwd += 1
if (this.cursors.down?.isDown  || wasdKeys?.S?.isDown) fwd -= 1
if (this.cursors.left?.isDown  || wasdKeys?.A?.isDown) strafe -= 1
if (this.cursors.right?.isDown || wasdKeys?.D?.isDown) strafe += 1

// rörelseriktning = fram/bak + strafe
const move = forward.clone().scale(fwd).add(left.clone().scale(strafe))
if (move.lengthSq() > 1) move.normalize() // diagonaler = clamp

body.setVelocity(move.x * speed, move.y * speed)

// meddela skinet hur mycket vi “gasar” (0..1)
const thrustLevel = move.length() // 0..1
const pskin = this.player.getData('skin') as any
pskin?.setThrust?.(thrustLevel)
*/

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
        healthBar?.destroy()
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
    //const pointer = this.input.activePointer
    //const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y)
    const ang = Phaser.Math.Angle.Between(this.player.x, this.player.y, world.x, world.y)
    this.player.setRotation(ang+Math.PI/2) 
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
    const origin = new Phaser.Math.Vector2(this.player.x, this.player.y)
    const direction = new Phaser.Math.Vector2(world.x - origin.x, world.y - origin.y).normalize()

    const muzzleX = this.player.x + direction.x * 10
    const muzzleY = this.player.y + direction.y * 10
    this.effects.plasmaCharge(muzzleX, muzzleY, Math.atan2(direction.y, direction.x) + Math.PI / 2)
    this.effects.muzzleFlash(muzzleX, muzzleY)

    const bullet = this.spawnPlasmaBullet(direction)
    if (!bullet) return

    this.sound.play('shot', { volume: this.opts.sfxVolume })

    if (this.powerups.hasSplit) {
      const offset = Phaser.Math.DegToRad(12)
      const leftDir = direction.clone().rotate(-offset)
      const rightDir = direction.clone().rotate(offset)
      this.spawnPlasmaBullet(leftDir)
      this.spawnPlasmaBullet(rightDir)
    }

    const deltaMs = this.analyzer.nearestBeatDeltaMs()
    this.scoring.registerShot(deltaMs)

    const g = this.add.graphics({ x: this.player.x, y: this.player.y })
    g.lineStyle(2, 0x00e5ff, 0.8)
    g.strokeCircle(0, 0, 18)
    this.tweens.add({ targets: g, alpha: 0, scale: 1.6, duration: 180, onComplete: () => g.destroy() })
  }

  private spawnPlasmaBullet(direction: Phaser.Math.Vector2) {
    const bullet = this.bullets.get(this.player.x, this.player.y) as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody | null
    if (!bullet) return null

    bullet.setActive(true).setVisible(true)
    bullet.setTexture('bullet_plasma_0')
    bullet.setBlendMode(Phaser.BlendModes.SCREEN)
    bullet.setDepth(5)
    bullet.play('bullet_plasma_idle')

    const body = bullet.body as Phaser.Physics.Arcade.Body
    body.enable = true
    body.setAllowGravity(false)
    body.setSize(12, 72, true)
    body.onWorldBounds = true
    body.setVelocity(direction.x * this.bulletSpeed, direction.y * this.bulletSpeed)

    const rotation = Math.atan2(direction.y, direction.x) + Math.PI / 2
    bullet.setRotation(rotation)
    bullet.setScale(0.55)

    bullet.setData('spawnTime', this.time.now)

    this.effects.attachPlasmaTrail(bullet)
    this.scheduleBulletTtl(bullet)

    return bullet
  }

  private scheduleBulletTtl(bullet: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody) {
    const prev = bullet.getData('ttlEvent') as Phaser.Time.TimerEvent | undefined
    prev?.remove(false)
    const ttlEvent = this.time.addEvent({
      delay: this.bulletTtlMs,
      callback: () => this.disableBullet(bullet)
    })
    bullet.setData('ttlEvent', ttlEvent)
  }

  private disableBullet(bullet: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody) {
    if (!bullet.active) return
    const ttlEvent = bullet.getData('ttlEvent') as Phaser.Time.TimerEvent | undefined
    ttlEvent?.remove(false)
    bullet.setData('ttlEvent', undefined)

    this.effects.clearPlasmaTrail(bullet)
    bullet.anims?.stop?.()
    if (this.textures.exists('bullet_plasma_0')) {
      bullet.setTexture('bullet_plasma_0')
    }
    bullet.setBlendMode(Phaser.BlendModes.SCREEN)
    bullet.disableBody(true, true)
  }

  private handleBulletWorldBounds(body: Phaser.Physics.Arcade.Body) {
    const gameObject = body.gameObject as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody | undefined
    if (!gameObject) return
    if (!this.bullets.contains(gameObject)) return
    this.disableBullet(gameObject)
  }

  private maybeDropPickup(x: number, y: number) {
    const chance = 0.2
    if (Math.random() > chance) return
    const types: PowerupType[] = ['shield', 'rapid', 'split', 'slowmo']
    const type = types[Math.floor(Math.random() * types.length)]
    const texture = `powerup_${type}_0`
    const anim = `powerup_pickup_${type}`
    const s = this.physics.add.sprite(x, y, texture)
    if (this.anims.exists(anim)) s.play(anim)
    s.setData('ptype', type)
    s.setDepth(4)

    const glow = this.add.image(x, y, 'plasma_glow_disc')
      .setDepth(3)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.65)
      .setScale(0.65)
    const glowFollow = () => {
      glow.x = s.x
      glow.y = s.y
    }
    this.events.on(Phaser.Scenes.Events.UPDATE, glowFollow)
    s.once(Phaser.GameObjects.Events.DESTROY, () => {
      this.events.off(Phaser.Scenes.Events.UPDATE, glowFollow)
      glow.destroy()
    })
    this.tweens.add({
      targets: glow,
      scale: { from: 0.6, to: 0.8 },
      alpha: { from: 0.65, to: 0.3 },
      yoyo: true,
      repeat: -1,
      duration: 700,
      ease: 'Sine.easeInOut'
    })

    const radius = 24
    const offsetX = s.width * 0.5 - radius
    const offsetY = s.height * 0.5 - radius
    s.body.setCircle(radius, offsetX, offsetY)
    // Fade after 6s
    this.tweens.add({ targets: s, alpha: 0.2, duration: 6000, onComplete: () => s.destroy() })
    // Overlap with player
    const overlap = this.physics.add.overlap(this.player, s, () => {
      overlap.destroy()
      const ptype = s.getData('ptype') as PowerupType
      const pickupX = s.x
      const pickupY = s.y
      s.destroy()
      const dur = this.powerupDurations[ptype] ?? 5
      this.powerups.apply(ptype, dur)
      this.effects.powerupPickupText(pickupX, pickupY - 10, ptype)
      this.playPowerupSound(ptype)
    })
  }

  private playPowerupSound(type: PowerupType) {
    const key = `powerup_${type}`
    const vol = this.opts.sfxVolume
    if (this.sound.get(key)) {
      this.sound.play(key, { volume: vol })
    } else {
      this.sound.play('ui_select', { volume: vol })
    }
  }

  private pulseEnemies(amplitudeMultiplier = 1) {
    const group = this.spawner.getGroup()
    group.children.each((obj: Phaser.GameObjects.GameObject) => {
      const enemy = obj as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
      if (!enemy.active) return false
      const skin = enemy.getData('skin') as CubeSkin | undefined
      if (!skin) return true
      const base = (enemy.getData('pulseScale') as number | undefined) ?? 0.1
      skin.pulse(base * amplitudeMultiplier)
      return true
    })
  }

  private applyBackgroundSetting() {
    this.destroyBackground()
    const mode = this.opts.backgroundMode ?? 'dual'
    switch (mode) {
      case 'classic':
        this.background = new ClassicBackground(this)
        break
      case 'aurora':
        this.background = new AuroraBackground(this)
        break
      case 'city':
        this.background = new CityscapeBackground(this)
        break
      case 'ocean':
        this.background = new OceanBackground(this)
        break
      case 'tunnel':
        this.background = new TunnelBackground(this)
        break
      case 'dual':
      default:
        this.background = new DualGridBackground(this)
        break
    }
    this.background?.setAnalyzer(this.analyzer)
    this.background?.create()
  }

  private destroyBackground() {
    this.background?.destroy()
    this.background = undefined
  }


  private triggerBomb() {
    // Clear enemies in radius by disabling all
    const group = this.spawner.getGroup()
   /* group.children.each((e: Phaser.GameObjects.GameObject) => {
      const s = e as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
      if (!s.active) return false
      this.effects.explosion(s.x, s.y)
      s.disableBody(true, true)
      return true
    })
    */
    group.children.each((e: Phaser.GameObjects.GameObject) => {
      const s = e as Enemy
      if (!s.active) return true
      this.effects.explosion(s.x, s.y)
      this.cleanupEnemy(s, true)   // ← viktigt, städar skin + bar
      return true
    })
    this.sound.play('explode_big', { volume: this.opts.sfxVolume })
    this.bumpBomb(-100)
  }

  private bumpBomb(delta: number) {
    this.bombCharge = Phaser.Math.Clamp(this.bombCharge + delta, 0, 100)
    this.hud.setBombCharge(this.bombCharge / 100)
    if (this.bombCharge >= 100) {
      if (!this.bombReadyAnnounced) {
        this.announcer?.playBombReady()
        this.bombReadyAnnounced = true
      }
    } else if (this.bombReadyAnnounced && this.bombCharge < 100) {
      this.bombReadyAnnounced = false
    }
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
      healthBar.fillStyle(0x0066ff)
      healthBar.fillRect(x, y, barWidth * healthPercentage, barHeight)
    }
  }
  

  private endRun() {
    // Stop music
    this.music?.stop()
    this.sound.removeByKey('music')
    this.cache.audio.remove('music')
    const shots = this.scoring.shots || 0
    const hits = this.scoring.perfect + this.scoring.good
    const accuracy = shots > 0 ? (hits / shots) * 100 : 0
    this.scene.start('ResultScene', { score: this.scoring.score, accuracy })
  }

  private pauseGame() {
    if (this.isPaused) return
    this.isPaused = true
    this.sound.play('ui_back', { volume: this.opts.sfxVolume })
    this.music?.pause()
    this.scene.launch('MenuScene', { resume: true })
    this.scene.bringToTop('MenuScene')
    this.input.setDefaultCursor('default')
    this.scene.pause('GameScene')
  }
  public getMusic(): Phaser.Sound.BaseSound | undefined {
    return this.music;
  }
}
