import Phaser from 'phaser'
import AudioAnalyzer from '../systems/AudioAnalyzer'
import Conductor from '../systems/Conductor'
import Spawner, { PatternData } from '../systems/Spawner'
import Scoring from '../systems/Scoring'
import HUD from '../ui/HUD'
import Effects from '../systems/Effects'
import Powerups, { PowerupType } from '../systems/Powerups'
import Starfield from '../systems/Starfield'
import BackgroundScroller from '../systems/BackgroundScroller'
import { loadOptions, resolveGameplayMode, GameplayMode } from '../systems/Options'
import PlayerSkin from '../systems/PlayerSkin'
import NeonGrid from '../systems/NeonGrid'
import CubeSkin from '../systems/CubeSkin'
import { getDifficultyProfile, DifficultyProfile } from '../config/difficultyProfiles'

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
  private starfield!: Starfield
  private enemyCap = 25
  private fallbackCycle = 0
  private comboCount = 0
  private comboTimeoutMs = 2000
  private lastHitAt = 0
  private opts = loadOptions()
  private gameplayMode: GameplayMode = resolveGameplayMode(this.opts.gameplayMode)
  private scrollBase = 220
  private backgroundScroller!: BackgroundScroller
  private movementMinY = 0
  private movementMaxY = 0
  private activeGamepad?: Phaser.Input.Gamepad.Gamepad
  private gamepadDeadzone = this.opts.gamepadDeadzone
  private gamepadSensitivity = this.opts.gamepadSensitivity
  private gamepadFireActive = false
  private touchMovePointerId?: number
  private touchMoveBaselineX = 0
  private touchMoveBaselinePlayerX = 0
  private touchFirePointers = new Set<number>()
  private touchTapTimes: number[] = []
  private beatIndicator!: Phaser.GameObjects.Graphics;
  private lastHitEnemyId: string | null = null
  private neon!: NeonGrid
  private powerupDurations: Record<PowerupType, number> = {
    shield: 5,
    rapid: 6,
    split: 6,
    slowmo: 3
  }
  private isPaused = false
  private barsElapsed = 0
  private bossSpawned = false
  private verticalSpawnCycle = 0
  private difficultyProfile: DifficultyProfile = getDifficultyProfile('normal')
  private difficultyLabel = 'Normal'
  private baseSpawnRateMultiplier = 1
  private spawnRateMultiplier = 1
  private enemyHpMultiplier = 1
  private bossHpMultiplier = 1
  private missPenalty = 50
  private bossMissPenalty = 120
  private verticalLaneCount = 6
  private currentStage = 1
  private reducedMotion = false
  private activeBoss: Enemy | null = null
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
    this.neon = new NeonGrid(this)
    this.neon.create()
    const { width, height } = this.scale
    this.cameras.main.setBackgroundColor('#0a0a0f')

    this.reducedMotion = !!this.opts.reducedMotion

    this.backgroundScroller = new BackgroundScroller(this)
    this.backgroundScroller.create()

    // Starfield background (procedural)
    this.starfield = new Starfield(this)
    this.starfield.create()

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

    this.bossSpawned = false
    this.verticalSpawnCycle = 0
    this.barsElapsed = 0
    this.activeBoss = null

    this.gameplayMode = resolveGameplayMode(this.opts.gameplayMode)
    this.registry.set('gameplayMode', this.gameplayMode)
    this.reducedMotion = !!this.opts.reducedMotion
    this.updateMovementBounds()
    this.scale.on(Phaser.Scale.Events.RESIZE, this.updateMovementBounds, this)
    this.input.addPointer(2)

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
    this.bullets = this.physics.add.group({
      classType: Phaser.Physics.Arcade.Sprite,
      defaultKey: 'bullet_plasma_0',
      maxSize: 200
    })
    this.physics.world.on('worldbounds', this.handleBulletWorldBounds, this)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.physics.world) this.physics.world.off('worldbounds', this.handleBulletWorldBounds, this)
      this.music?.stop()
      this.music?.destroy()
      this.music = undefined
      this.analyzer?.removeAllListeners?.()
      this.backgroundScroller?.destroy()
      this.starfield?.destroy()
      this.scale.off(Phaser.Scale.Events.RESIZE, this.updateMovementBounds, this)
      this.input.gamepad?.off('connected', this.onGamepadConnected, this)
      this.input.gamepad?.off('disconnected', this.onGamepadDisconnected, this)
      this.conductor?.off('bar:start', this.handleBarStart)
    })
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const pointerType = (pointer as any)?.pointerType ?? 'mouse'
      if (this.gameplayMode === 'vertical' && pointerType !== 'mouse') {
        const half = this.scale.width * 0.5
        if (pointer.x < half) {
          if (this.touchMovePointerId === undefined) {
            this.touchMovePointerId = pointer.id
            this.touchMoveBaselineX = pointer.x
            this.touchMoveBaselinePlayerX = this.player.x
          }
        } else {
          this.touchFirePointers.add(pointer.id)
          this.handleFireInputDown()
          this.registerTouchTap(this.time.now)
        }
        return
      }
      this.handleFireInputDown()
    })
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      const pointerType = (pointer as any)?.pointerType ?? 'mouse'
      if (this.gameplayMode === 'vertical' && pointerType !== 'mouse') {
        if (pointer.id === this.touchMovePointerId) {
          this.touchMovePointerId = undefined
        }
        if (this.touchFirePointers.delete(pointer.id) && this.touchFirePointers.size === 0) {
          this.handleFireInputUp()
        }
        return
      }
      this.handleFireInputUp()
    })
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      const pointerType = (pointer as any)?.pointerType ?? 'mouse'
      if (this.gameplayMode !== 'vertical' || pointerType === 'mouse') return
      if (pointer.id !== this.touchMovePointerId) return
      const deltaX = pointer.x - this.touchMoveBaselineX
      const targetX = this.touchMoveBaselinePlayerX + deltaX
      const body = this.player.body as Phaser.Physics.Arcade.Body
      const halfWidth = body.width * 0.5
      const minX = halfWidth
      const maxX = this.scale.width - halfWidth
      const clamped = Phaser.Math.Clamp(targetX, minX, maxX)
      this.player.setX(clamped)
      body.setVelocityX(0)
    })

    if (this.input.gamepad) {
      this.input.gamepad.on('connected', this.onGamepadConnected, this)
      this.input.gamepad.on('disconnected', this.onGamepadDisconnected, this)
      const pad = this.input.gamepad.gamepads.find(p => p && p.connected)
      if (pad) this.activeGamepad = pad
    }

    // Load selected track on demand
    const tracks = this.registry.get('tracks') as any[]
    const selId = this.registry.get('selectedTrackId') as string | null
    const track = tracks?.find((t) => t.id === selId)

    this.difficultyProfile = getDifficultyProfile(track?.difficultyProfileId)
    this.difficultyLabel = this.difficultyProfile.label
    this.baseSpawnRateMultiplier = this.difficultyProfile.spawnRateMultiplier
    this.spawnRateMultiplier = this.baseSpawnRateMultiplier
    this.enemyHpMultiplier = this.difficultyProfile.enemyHpMultiplier
    this.bossHpMultiplier = this.difficultyProfile.bossHpMultiplier
    this.missPenalty = this.difficultyProfile.missPenalty
    this.bossMissPenalty = this.difficultyProfile.bossMissPenalty
    this.verticalLaneCount = this.difficultyProfile.laneCount ?? this.verticalLaneCount
    this.enemyCap = this.difficultyProfile.enemyCap
    this.currentStage = this.difficultyProfile.startingStage ?? 1
    
    // Initialize analyzer first
    this.analyzer = new AudioAnalyzer(this)
    this.conductor = new Conductor(this)
    this.conductor.on('bar:start', this.handleBarStart)
    
    // Set up beat listeners
    this.analyzer.on('beat:low', () => { this.conductor.onBeat(); this.lastBeatAt = this.time.now })
    this.analyzer.on('beat:mid', () => { this.conductor.onBeat(); this.lastBeatAt = this.time.now })
    this.analyzer.on('beat:high', () => {  this.conductor.onBeat(); this.lastBeatAt = this.time.now })

    this.analyzer.on('beat:low', () => this.pulseEnemies())

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
    this.updateDifficultyForStage()
    const canSpawn = () => {
      this.pruneEnemies()
      return this.spawner.getGroup().countActive(true) < this.enemyCap
    }
    this.setupSpawnHandlers(canSpawn)

    // Fallback BPM-driven spawns if analyzer events are not firing
    const bpm = (track && track.bpm) ? track.bpm : 120
    const interval = 60000 / bpm
    this.beatPeriodMs = interval
    this.scrollBase = this.computeScrollBase(bpm)
    this.starfield.setBaseScroll(this.scrollBase)
    this.backgroundScroller.setBaseScroll(this.scrollBase)
    this.spawner.setScrollBase(this.scrollBase)
    this.registry.set('scrollBase', this.scrollBase)
    this.time.addEvent({
      delay: interval,
      loop: true,
      callback: () => this.fallbackSpawn(canSpawn, interval)
    })
    // HUD
    this.hud = new HUD(this)
    this.hud.create()
    this.hud.setupHearts(this.playerMaxHp)
    this.hud.setHp(this.playerHp)
    this.hud.setBombCharge(this.bombCharge / 100)
    this.hud.setReducedMotion(this.reducedMotion)
    this.hud.setDifficultyLabel(this.difficultyLabel)
    this.hud.setStage(this.currentStage)
    this.hud.setBossHealth(null)
    this.hud.setCombo(0)

    // Effects
    this.effects = new Effects(this)
    this.effects.setReducedMotion(this.reducedMotion)
    this.powerups = new Powerups(this)
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
      const maxHp = (enemy.getData('maxHp') as number) ?? hp
      const isBoss = enemy.getData('isBoss') === true
      if (isBoss) {
        this.hud.setBossHealth(Math.max(newHp, 0) / Math.max(maxHp, 1), enemy.getData('etype') as string)
      }
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
    this.cleanupEnemy(enemy, true)
    if (isBoss) {
      this.onBossDown()
    }
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
      const isBoss = enemy.getData('isBoss') === true
      if (this.powerups.hasShield) {
        // shield blocks one hit
        this.effects.hitSpark(this.player.x, this.player.y)
        //this.effects.hitSpark(20, 20)
      
      } else {
        if (!isBoss) this.cleanupEnemy(enemy, false)
        this.playerHp = Math.max(0, this.playerHp - 1)
        this.comboCount = 0
        this.hud.setCombo(this.comboCount)
        this.iframesUntil = now + 800
      }
      this.hud.setHp(this.playerHp)
      if (!this.reducedMotion) this.cameras.main.shake(150, 0.01)
      if (isBoss && !this.powerups.hasShield) {
        this.scoring.registerMiss(this.bossMissPenalty)
        this.hud.showMissFeedback('Boss Crash!')
      }
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

    this.events.on(Phaser.Scenes.Events.RESUME, () => {
      this.isPaused = false
      this.music?.resume()
      this.input.setDefaultCursor('none')
      this.opts = loadOptions()
      this.metronome = this.opts.metronome
      this.gameplayMode = resolveGameplayMode(this.opts.gameplayMode)
      this.registry.set('gameplayMode', this.gameplayMode)
      this.gamepadDeadzone = this.opts.gamepadDeadzone
      this.gamepadSensitivity = this.opts.gamepadSensitivity
      this.reducedMotion = !!this.opts.reducedMotion
      this.effects.setReducedMotion(this.reducedMotion)
      this.hud.setReducedMotion(this.reducedMotion)
      this.hud.setDifficultyLabel(this.difficultyLabel)
      this.hud.setStage(this.currentStage)
      if (this.activeBoss && this.activeBoss.active) {
        const maxHp = (this.activeBoss.getData('maxHp') as number) ?? 1
        const hp = (this.activeBoss.getData('hp') as number) ?? maxHp
        this.hud.setBossHealth(Math.max(hp, 0) / Math.max(maxHp, 1), this.activeBoss.getData('etype') as string)
      } else {
        this.hud.setBossHealth(null)
      }
      this.updateMovementBounds()
    })
  }

  update(time: number, delta: number): void {
    // Analyzer update
    if (this.analyzer) {
      this.analyzer.update()
      const estPeriod = this.analyzer.getEstimatedPeriodMs()
      if (estPeriod && isFinite(estPeriod) && estPeriod > 0) {
        const estBpm = 60000 / estPeriod
        const targetScroll = this.computeScrollBase(estBpm)
        this.scrollBase = Phaser.Math.Linear(this.scrollBase, targetScroll, 0.05)
        this.beatPeriodMs = Phaser.Math.Linear(this.beatPeriodMs, estPeriod, 0.1)
      }
    }
    this.registry.set('scrollBase', this.scrollBase)
    if (this.backgroundScroller) {
      this.backgroundScroller.setBaseScroll(this.scrollBase)
      this.backgroundScroller.update(delta)
    }
    if (this.starfield) {
      this.starfield.setBaseScroll(this.scrollBase)
      this.starfield.update(delta)
    }
    this.spawner?.setScrollBase(this.scrollBase)

      if (this.time.now - this.lastBeatAt < 100) { // Visa cirkeln i 100ms efter varje beat
        this.beatIndicator.setAlpha(1);
    } else {
        this.beatIndicator.setAlpha(0.3); // Gör den genomskinlig när inget beat
    }
    this.neon.update(delta)
    
    if (time - this.lastHitAt > this.comboTimeoutMs && this.comboCount > 0) {
      this.comboCount = 0
      this.hud.setCombo(0)
      this.lastHitEnemyId = null
    }
    

    // Shooting
    const cooldown = this.powerups.hasRapid ? this.fireCooldownMs * 0.8 : this.fireCooldownMs
    if (this.isShooting && time - this.lastShotAt >= cooldown) {
      this.fireBullet()
      this.lastShotAt = time
    }

    const movementSpeed = this.gameplayMode === 'vertical' ? 280 : 250
    const body = this.player.body as Phaser.Physics.Arcade.Body
    const wasdKeys = this.registry.get('wasd') as any
    let moveX = 0
    let moveY = 0

    if (this.cursors.left?.isDown || wasdKeys?.A?.isDown) moveX -= 1
    if (this.cursors.right?.isDown || wasdKeys?.D?.isDown) moveX += 1
    if (this.cursors.up?.isDown || wasdKeys?.W?.isDown) moveY -= 1
    if (this.cursors.down?.isDown || wasdKeys?.S?.isDown) moveY += 1

    if (this.activeGamepad && this.activeGamepad.connected) {
      const pad = this.activeGamepad
      const axisX = pad.axes.length > 0 ? pad.axes[0].getValue() : 0
      const axisY = pad.axes.length > 1 ? pad.axes[1].getValue() : 0
      moveX += this.applyGamepadDeadzone(axisX) * this.gamepadSensitivity
      moveY += this.applyGamepadDeadzone(axisY) * this.gamepadSensitivity

      const shootPressed = pad.buttons[0]?.pressed || pad.buttons[1]?.pressed
      if (shootPressed && !this.gamepadFireActive) {
        this.handleFireInputDown()
        this.gamepadFireActive = true
      } else if (!shootPressed && this.gamepadFireActive) {
        this.gamepadFireActive = false
        this.handleFireInputUp()
      }

      const bombPressed = pad.buttons[5]?.pressed || pad.buttons[7]?.pressed
      if (bombPressed && this.bombCharge >= 100) this.triggerBomb()
    } else if (this.gamepadFireActive) {
      this.gamepadFireActive = false
      this.handleFireInputUp()
    }

    if (this.touchMovePointerId !== undefined) moveX = 0

    const magnitude = Math.hypot(moveX, moveY)
    if (magnitude > 1) {
      moveX /= magnitude
      moveY /= magnitude
    }

    body.setVelocity(moveX * movementSpeed, moveY * movementSpeed)

    if (this.gameplayMode === 'vertical') {
      const halfHeight = body.height * 0.5
      const minY = this.movementMinY - halfHeight
      const maxY = this.movementMaxY - halfHeight
      body.y = Phaser.Math.Clamp(body.y, minY, maxY)
      this.player.y = body.y + halfHeight
    }

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

    const group = this.spawner.getGroup()
    const now = this.time.now
    if (this.gameplayMode === 'vertical') {
      this.updateVerticalEnemies(group, now)
    } else {
      const px = this.player.x
      const py = this.player.y
      const dashBoost = 2.2
      const dashPhase = Math.floor(now / 600)
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
    }

    const aimDirection = this.getAimDirection()
    const reticle = this.getReticlePosition()
    const aimAngle = Math.atan2(aimDirection.y, aimDirection.x) + Math.PI / 2
    if (this.gameplayMode === 'vertical') {
      this.player.setRotation(-Math.PI / 2)
    } else {
      this.player.setRotation(aimAngle)
    }

    this.crosshair.clear()
    const crosshairColor = this.gameplayMode === 'vertical' ? 0xff5db1 : 0x00e5ff
    this.crosshair.lineStyle(2, crosshairColor, 0.9)
    this.crosshair.strokeCircle(reticle.x, reticle.y, 10)
    this.crosshair.beginPath()
    this.crosshair.moveTo(reticle.x - 14, reticle.y)
    this.crosshair.lineTo(reticle.x - 4, reticle.y)
    this.crosshair.moveTo(reticle.x + 4, reticle.y)
    this.crosshair.lineTo(reticle.x + 14, reticle.y)
    this.crosshair.moveTo(reticle.x, reticle.y - 14)
    this.crosshair.lineTo(reticle.x, reticle.y - 4)
    this.crosshair.moveTo(reticle.x, reticle.y + 4)
    this.crosshair.lineTo(reticle.x, reticle.y + 14)
    this.crosshair.strokePath()

    const bulletMargin = 64
    this.bullets.children.each((obj: Phaser.GameObjects.GameObject) => {
      const bullet = obj as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
      if (!bullet.active) return true
      if (
        bullet.x < -bulletMargin ||
        bullet.x > this.scale.width + bulletMargin ||
        bullet.y < -bulletMargin ||
        bullet.y > this.scale.height + bulletMargin
      ) {
        this.disableBullet(bullet)
      }
      return true
    })
  }

  private fireBullet() {
    const direction = this.getAimDirection()
    if (direction.lengthSq() === 0) return

    const muzzleX = this.player.x + direction.x * 10
    const muzzleY = this.player.y + direction.y * 10
    this.effects.plasmaCharge(muzzleX, muzzleY, Math.atan2(direction.y, direction.x) + Math.PI / 2)
    this.effects.muzzleFlash(muzzleX, muzzleY)

    const ttl = this.computeBulletLifetime(direction)
    const bullet = this.spawnPlasmaBullet(direction, ttl)
    if (!bullet) return

    this.sound.play('shot', { volume: this.opts.sfxVolume })

    if (this.powerups.hasSplit) {
      const offset = Phaser.Math.DegToRad(12)
      const leftDir = direction.clone().rotate(-offset)
      const rightDir = direction.clone().rotate(offset)
      this.spawnPlasmaBullet(leftDir, ttl)
      this.spawnPlasmaBullet(rightDir, ttl)
    }

    const deltaMs = this.analyzer.nearestBeatDeltaMs()
    this.scoring.registerShot(deltaMs)

    const g = this.add.graphics({ x: this.player.x, y: this.player.y })
    g.lineStyle(2, 0x00e5ff, 0.8)
    g.strokeCircle(0, 0, 18)
    this.tweens.add({ targets: g, alpha: 0, scale: 1.6, duration: 180, onComplete: () => g.destroy() })
  }

  private spawnPlasmaBullet(direction: Phaser.Math.Vector2, lifetimeMs?: number) {
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
    this.scheduleBulletTtl(bullet, lifetimeMs)

    return bullet
  }

  private scheduleBulletTtl(bullet: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody, lifetimeMs?: number) {
    const prev = bullet.getData('ttlEvent') as Phaser.Time.TimerEvent | undefined
    prev?.remove(false)
    const ttlEvent = this.time.addEvent({
      delay: lifetimeMs ?? this.bulletTtlMs,
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

  private registerTouchTap(time: number) {
    this.touchTapTimes = this.touchTapTimes.filter(t => time - t < 600)
    this.touchTapTimes.push(time)
    if (this.touchTapTimes.length >= 3) {
      this.touchTapTimes = []
      if (this.bombCharge >= 100) this.triggerBomb()
    }
  }

  private updateMovementBounds() {
    const { height } = this.scale
    if (this.gameplayMode === 'vertical') {
      this.movementMinY = height * 0.65
      this.movementMaxY = height * 0.94
    } else {
      this.movementMinY = 0
      this.movementMaxY = height
    }
  }

  private applyGamepadDeadzone(value: number): number {
    const abs = Math.abs(value)
    if (abs < this.gamepadDeadzone) return 0
    const sign = value < 0 ? -1 : 1
    const range = 1 - this.gamepadDeadzone
    const scaled = (abs - this.gamepadDeadzone) / (range || 1)
    return sign * Math.min(Math.max(scaled, 0), 1)
  }

  private getAimDirection(): Phaser.Math.Vector2 {
    if (this.gameplayMode === 'vertical') {
      return new Phaser.Math.Vector2(0, -1)
    }
    const pointer = this.input.activePointer
    const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y)
    const dir = new Phaser.Math.Vector2(world.x - this.player.x, world.y - this.player.y)
    if (dir.lengthSq() < 0.0001) return new Phaser.Math.Vector2(0, -1)
    return dir.normalize()
  }

  private getReticlePosition(): Phaser.Math.Vector2 {
    if (this.gameplayMode === 'vertical') {
      const offset = this.scale.height * 0.35
      const targetY = this.player.y - offset
      const minY = 60
      return new Phaser.Math.Vector2(this.player.x, Math.max(minY, targetY))
    }
    const pointer = this.input.activePointer
    return this.cameras.main.getWorldPoint(pointer.x, pointer.y)
  }

  private computeBulletLifetime(direction: Phaser.Math.Vector2): number {
    if (this.gameplayMode !== 'vertical') return this.bulletTtlMs
    const dy = direction.y
    if (Math.abs(dy) < 0.0001) return this.bulletTtlMs
    const margin = 80
    const targetY = -margin
    const distance = Math.abs((targetY - this.player.y) / dy)
    const travelTimeMs = (distance / this.bulletSpeed) * 1000
    const clamped = Phaser.Math.Clamp(travelTimeMs + 120, this.bulletTtlMs * 0.5, this.bulletTtlMs * 1.8)
    return clamped
  }

  private updateDifficultyForStage() {
    const stageFactor = 1 + Math.max(0, this.currentStage - 1) * 0.12
    const cappedFactor = Math.min(stageFactor, 1.6)
    this.spawnRateMultiplier = this.baseSpawnRateMultiplier * cappedFactor
    this.enemyCap = Math.max(10, Math.round(this.difficultyProfile.enemyCap * cappedFactor))

    const hpStageFactor = 1 + Math.max(0, this.currentStage - 1) * 0.08
    this.spawner?.setDifficulty({
      hpMultiplier: this.enemyHpMultiplier * hpStageFactor,
      bossHpMultiplier: this.bossHpMultiplier * hpStageFactor,
      laneCount: this.verticalLaneCount
    })
  }

  private adjustSpawnCount(base: number): number {
    return Math.max(1, Math.round(base * this.spawnRateMultiplier))
  }

  private adjustedChance(base: number): number {
    const scaled = base * this.spawnRateMultiplier
    return Phaser.Math.Clamp(scaled, 0.02, 0.9)
  }

  private fallbackSpawn(canSpawn: () => boolean, interval: number) {
    if (!canSpawn()) return
    if (this.time.now - this.lastBeatAt <= interval * 1.5) return

    if (this.gameplayMode === 'vertical') {
      const cycle = this.fallbackCycle % 3
      if (cycle === 0) {
        const lane = Phaser.Math.Between(0, Math.max(0, this.verticalLaneCount - 1))
        this.spawner.spawnVerticalLane('swarm', lane, this.adjustSpawnCount(2), 0.95)
      } else if (cycle === 1) {
        const spread = Phaser.Math.Between(45, 70)
        this.spawner.spawnVFormation('dasher', Math.max(3, this.adjustSpawnCount(4)), spread, 1.05)
      } else {
        const amplitude = Phaser.Math.Between(60, 120)
        const wavelength = Phaser.Math.Between(220, 360)
        this.spawner.spawnSineWave('swarm', this.adjustSpawnCount(4), amplitude, wavelength, 1)
      }
      this.fallbackCycle++
    } else {
      const type = this.fallbackCycle % 3
      if (type === 0) this.spawner.spawn('brute', this.adjustSpawnCount(1))
      else if (type === 1) this.spawner.spawn('dasher', this.adjustSpawnCount(1))
      else this.spawner.spawn('swarm', this.adjustSpawnCount(2))
      this.fallbackCycle++
    }
    this.lastBeatAt = this.time.now
  }

  private pruneEnemies() {
    const group = this.spawner?.getGroup()
    if (!group) return
    const height = this.scale.height
    const width = this.scale.width
    const bottomMargin = 160
    const sideMargin = 220

    group.children.each((obj: Phaser.GameObjects.GameObject) => {
      const enemy = obj as Enemy
      if (!enemy.active) return true
      const body = enemy.body as Phaser.Physics.Arcade.Body | undefined
      if (!body || !body.enable) {
        this.cleanupEnemy(enemy, false)
        return true
      }

      if (this.gameplayMode === 'vertical') {
        if (enemy.y > height + bottomMargin) {
          this.handleEnemyMiss(enemy)
          return true
        }
        if (enemy.y < -bottomMargin) {
          this.cleanupEnemy(enemy, false)
          return true
        }
      } else {
        if (
          enemy.y > height + bottomMargin ||
          enemy.y < -bottomMargin ||
          enemy.x < -sideMargin ||
          enemy.x > width + sideMargin
        ) {
          this.cleanupEnemy(enemy, false)
          return true
        }
      }

      return true
    })
  }

  private setupSpawnHandlers(canSpawn: () => boolean) {
    if (this.gameplayMode === 'vertical') {
      this.setupVerticalSpawnHandlers(canSpawn)
    } else {
      this.setupOmniSpawnHandlers(canSpawn)
    }
  }

  private setupOmniSpawnHandlers(canSpawn: () => boolean) {
    this.analyzer.on('beat:low', () => {
      if (!canSpawn()) return
      if (Math.random() < this.adjustedChance(0.3)) {
        this.spawner.spawn('brute', this.adjustSpawnCount(1))
      }
    })
    this.analyzer.on('beat:mid', () => {
      if (!canSpawn()) return
      if (Math.random() < this.adjustedChance(0.2)) {
        this.spawner.spawn('dasher', this.adjustSpawnCount(1))
      }
    })
    this.analyzer.on('beat:high', () => {
      if (!canSpawn()) return
      if (Math.random() < this.adjustedChance(0.2)) {
        this.spawner.spawn('swarm', this.adjustSpawnCount(2))
      }
    })
  }

  private setupVerticalSpawnHandlers(canSpawn: () => boolean) {
    this.analyzer.on('beat:low', () => {
      if (!canSpawn()) return
      if (this.activeBoss) return
      const cycle = this.verticalSpawnCycle % 3
      if (cycle === 0) {
        const lane = Phaser.Math.Between(0, Math.max(0, this.verticalLaneCount - 1))
        const count = this.adjustSpawnCount(Phaser.Math.Between(2, 3))
        const speedMul = 0.85 + Math.random() * 0.25
        this.spawner.spawnVerticalLane('brute', lane, count, speedMul)
      } else if (cycle === 1) {
        const half = Math.max(1, Math.floor(this.verticalLaneCount / 2))
        const left = Phaser.Math.Between(0, Math.max(0, half - 1))
        let right = Phaser.Math.Between(half, Math.max(half, this.verticalLaneCount - 1))
        if (this.verticalLaneCount > 1 && right === left) {
          right = (right + 1) % this.verticalLaneCount
        }
        const dashCount = this.adjustSpawnCount(2)
        this.spawner.spawnVerticalLane('dasher', left, dashCount, 1.15)
        if (this.verticalLaneCount > 1) this.spawner.spawnVerticalLane('dasher', right, dashCount, 1.15)
      } else {
        const amplitude = Phaser.Math.Between(60, 110)
        const wavelength = Phaser.Math.Between(240, 360)
        this.spawner.spawnSineWave('swarm', this.adjustSpawnCount(4), amplitude, wavelength, 1)
      }
      this.verticalSpawnCycle++
    })

    this.analyzer.on('beat:mid', () => {
      if (!canSpawn()) return
      if (this.activeBoss) return
      const amplitude = Phaser.Math.Between(70, 130)
      const wavelength = Phaser.Math.Between(260, 420)
      this.spawner.spawnSineWave('swarm', this.adjustSpawnCount(5), amplitude, wavelength, 1.05)
    })

    this.analyzer.on('beat:high', () => {
      if (!canSpawn()) return
      if (this.activeBoss) return
      const spread = Phaser.Math.Between(45, 75)
      const size = Math.max(3, this.adjustSpawnCount(Phaser.Math.Between(4, 5)))
      this.spawner.spawnVFormation('dasher', size, spread, 1.2)
    })
  }

  private updateVerticalEnemies(group: Phaser.Physics.Arcade.Group, now: number) {
    const height = this.scale.height
    const margin = 100
    group.children.each((obj: Phaser.GameObjects.GameObject) => {
      const enemy = obj as Enemy
      const healthBar = enemy.getData('healthBar') as Phaser.GameObjects.Graphics
      if (!enemy.active) {
        healthBar?.destroy()
        return false
      }

      const pattern = enemy.getData('pattern') as PatternData | null
      const body = enemy.body as Phaser.Physics.Arcade.Body
      if (pattern) {
        switch (pattern.kind) {
          case 'lane': {
            enemy.x = pattern.anchorX
            body.setVelocity(0, pattern.speedY)
            break
          }
          case 'sine': {
            const elapsed = (now - pattern.spawnTime) / 1000
            const offset = Math.sin(elapsed * pattern.angularVelocity) * pattern.amplitude
            enemy.x = pattern.anchorX + offset
            body.setVelocity(0, pattern.speedY)
            break
          }
          case 'drift': {
            body.setVelocity(pattern.velocityX, pattern.speedY)
            break
          }
          case 'boss': {
            const settleLine = height * 0.25
            const targetSpeed = enemy.y < settleLine ? pattern.speedY : pattern.speedY * 0.08
            body.setVelocity(0, targetSpeed)
            break
          }
        }
      } else {
        body.setVelocity(body.velocity.x, this.scrollBase)
      }

      this.drawHealthBar(enemy)

      if (enemy.y > height + margin) {
        this.handleEnemyMiss(enemy)
        return false
      }
      return true
    })
  }

  private handleEnemyMiss(enemy: Enemy) {
    const isBoss = enemy.getData('isBoss') === true
    this.cleanupEnemy(enemy, false)
    this.comboCount = 0
    this.hud.setCombo(0)
    this.lastHitEnemyId = null
    this.scoring.registerMiss(isBoss ? this.bossMissPenalty : this.missPenalty)
    this.hud.showMissFeedback(isBoss ? 'Boss Escaped!' : 'Miss!')
    if (isBoss) {
      this.hud.setBossHealth(null)
      this.bossSpawned = false
      this.activeBoss = null
    }
  }

  private onBossDown() {
    this.activeBoss = null
    this.bossSpawned = false
    this.currentStage += 1
    this.verticalSpawnCycle = 0
    this.hud.setBossHealth(null)
    this.hud.setStage(this.currentStage)
    this.updateDifficultyForStage()
  }

  private handleBarStart = (event: { barIndex: number }) => {
    this.barsElapsed = event.barIndex
    if (this.gameplayMode !== 'vertical') return
    if (this.bossSpawned || this.activeBoss) return
    const barsPerBoss = 8
    if (event.barIndex > 0 && event.barIndex % barsPerBoss === 0 && this.spawner.getGroup().countActive(true) < Math.max(4, Math.round(this.enemyCap * 0.45))) {
      const boss = this.spawner.spawnBoss('brute', { hp: 120, speedMultiplier: 0.55 })
      this.bossSpawned = true
      this.activeBoss = boss
      this.hud.setBossHealth(1, boss.getData('etype') as string)
    }
  }

  private handleFireInputDown() {
    if (this.opts.fireMode === 'click') {
      const t = this.time.now
      if (t - this.lastShotAt >= this.fireCooldownMs) {
        this.fireBullet()
        this.lastShotAt = t
      }
      return
    }
    this.isShooting = true
    if (this.opts.fireMode === 'hold_quantized') {
      this.nextQuantizedShotAt = this.lastBeatAt + this.beatPeriodMs
    }
  }

  private handleFireInputUp() {
    this.isShooting = false
    this.nextQuantizedShotAt = 0
  }

  private onGamepadConnected(pad: Phaser.Input.Gamepad.Gamepad) {
    if (!pad) return
    this.activeGamepad = pad
  }

  private onGamepadDisconnected(pad: Phaser.Input.Gamepad.Gamepad) {
    if (this.activeGamepad === pad) {
      this.activeGamepad = undefined
      this.gamepadFireActive = false
      this.handleFireInputUp()
    }
  }

  private computeScrollBase(bpm: number): number {
    const referenceBpm = 120
    const baseAtReference = 260
    const minSpeed = 140
    const maxSpeed = 420
    const ratio = bpm > 0 ? bpm / referenceBpm : 1
    const clampedRatio = Math.min(Math.max(ratio, 0.5), 1.8)
    const base = baseAtReference * clampedRatio
    const scaled = base * this.difficultyProfile.scrollMultiplier
    const min = minSpeed * this.difficultyProfile.scrollMultiplier
    const max = maxSpeed * this.difficultyProfile.scrollMultiplier
    return Phaser.Math.Clamp(scaled, min, max)
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
      if (s.getData('isBoss') === true) this.onBossDown()
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
    const maxHp = (enemy.getData('maxHp') as number) ?? hp
    const healthPercentage = maxHp > 0 && hp > 0 ? hp / maxHp : 0

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
