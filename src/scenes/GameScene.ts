import Phaser from 'phaser'
import LaneManager from '../systems/LaneManager'
import StickyLaneController from '../systems/StickyLaneController'
import PlayerSkin from '../systems/PlayerSkin'
import Conductor from '../systems/Conductor'
import BeatJudge, { type BeatVerdict } from '../systems/BeatJudge'
import { loadOptions } from '../systems/Options'

/**
 * GameScene – Demo för StickyLaneController with BeatJudge and Conductor integration
 *
 * Denna scen visar hur du integrerar LaneManager, StickyLaneController,
 * Conductor och BeatJudge för ett rytmbaserat spel med lane-baserad rörelse
 * och beat-accuracy input judgment. Spelaren kan röra sig fritt horisontellt
 * och skjuta med timing-baserad bedömning (PERFECT/NORMAL/MISS).
 */
export default class GameScene extends Phaser.Scene {
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
  private laneManager!: LaneManager
  private stickyLane!: StickyLaneController
  private conductor!: Conductor
  private beatJudge!: BeatJudge
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private currentLaneCount = 3
  private laneTransitionSequence = [3, 5, 7, 3]
  private currentSequenceIndex = 0
  private lastShotTime = 0
  private shotCooldown = 100 // ms between shots

  constructor() {
    super('GameScene')
  }

  preload() {
    // Ladda resurser (sprites, atlas etc) om det behövs. Antas redan laddat i BootScene.
  }

  create() {
    const laneCount = 3
    const options = loadOptions()

    // Initialize Conductor with default BPM (will be updated from track data)
    this.conductor = new Conductor(this)
    this.conductor.setBpm(120, 4) // Default values

    // Initialize BeatJudge with Conductor's beat phase
    this.beatJudge = new BeatJudge(
      () => this.conductor.getBeatPhase(),
      {
        window: 0.12, // 12% perfect window
        offsetMs: options.inputOffsetMs['default'] || 0,
        beatLengthMs: this.conductor.getBeatLengthMs()
      }
    )

    // Skapa LaneManager och bygg lanes över hela bredden
    this.laneManager = new LaneManager(this)
    this.laneManager.build(laneCount, 0, this.scale.width)
    // Debug overlay (ta bort i release)
    this.laneManager.enableDebug(0x00ff99)

    // Skapa spelare som Arcade-sprite längst ned i mitten av skärmen
    const startLane = this.laneManager.nearest(this.scale.width / 2)
    this.player = this.physics.add.sprite(
      startLane.centerX,
      this.scale.height - 80,
      'gameplay',
      'player_idle'
    )
    this.player.setCollideWorldBounds(true)
    // Stäng av gravitation på spelaren
    this.physics.world.gravity.y = 0
    this.player.body.setAllowGravity(false)
    // Sätt en mindre rund hitbox som matchar PlayerSkin
    const r = 14
    this.player.body.setCircle(r, -r + this.player.width / 2, -r + this.player.height / 2)
    // Rotera 90° så skinet pekar uppåt
    this.player.setRotation(Math.PI / 2)
    // Koppla skinet som ritar skeppet och thrusters
    const skin = new PlayerSkin(this, this.player)
    this.player.setData('skin', skin)

    // Kamera följer spelaren (anropa en gång)
    this.cameras.main.startFollow(this.player, false, 0.1, 0.1)
    // Ingen deadzone (spelaren alltid i mitten på X-axeln men tillåter Y‑rörelse)
    this.cameras.main.setDeadzone(0, 0)

    // Hantera lane‑ändring: snappa om spelare & fiender
    this.events.on('lanes:changed', this.onLanesChanged, this)
    // Bygg om lanes när fönstret ändras
    this.scale.on(Phaser.Scale.Events.RESIZE, (gameSize: any) => {
      const { width } = gameSize
      this.laneManager.build(laneCount, 0, width)
    })

    // Tangentbord: cursors och WASD
    this.cursors = this.input.keyboard!.createCursorKeys()
    const wasd = this.input.keyboard!.addKeys({
      A: Phaser.Input.Keyboard.KeyCodes.A,
      D: Phaser.Input.Keyboard.KeyCodes.D,
      W: Phaser.Input.Keyboard.KeyCodes.W,
      S: Phaser.Input.Keyboard.KeyCodes.S
    }) as any
    this.registry.set('wasd', wasd)

    // Instansiera StickyLaneController (deadzone beräknas automatiskt)
    this.stickyLane = new StickyLaneController(this, this.laneManager, this.player)

    // Set up input handlers for shooting
    this.setupInputHandlers()

    // Listen for bar start events (for dynamic lane changes)
    this.conductor.on('bar:start', this.onBarStart, this)
  }

  /**
   * Händelse: lane‑layout har ändrats. Snappa om spelaren till närmaste
   * lane‑center och nollställ pågående magnetisering. Gäller även fiender
   * om du använder samma logik.
   */
  private onLanesChanged() {
    const snapped = this.laneManager.snap(this.player.x)
    const body = this.player.body as Phaser.Physics.Arcade.Body
    if (body && typeof body.reset === 'function') {
      body.reset(snapped, body.y)
    } else {
      this.player.x = snapped
    }
    // Återställ pågående magnetisering
    ;(this.stickyLane as any).targetX = null
  }

  /**
   * Set up input handlers for shooting (both touch and keyboard)
   */
  private setupInputHandlers() {
    // Touch input - release to shoot
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      // Only handle primary pointer (left mouse/first touch)
      if (pointer.pointerId === 1) {
        this.handleShoot()
      }
    })

    // Keyboard input - spacebar to shoot
    this.input.keyboard!.on('keydown-SPACE', () => {
      this.handleShoot()
    })
  }

  /**
   * Handle shooting input - judge timing and create projectile
   */
  private handleShoot() {
    const now = this.time.now
    if (now - this.lastShotTime < this.shotCooldown) {
      return // Cooldown not elapsed
    }

    this.lastShotTime = now

    // Judge the shot timing
    const verdict = this.beatJudge.judge()

    // Create projectile based on verdict
    this.createProjectile(verdict)

    // Visual feedback based on verdict
    this.showShotFeedback(verdict)

    // Update HUD/score (placeholder)
    this.updateScore(verdict)
  }

  /**
   * Create projectile with appropriate properties based on verdict
   */
  private createProjectile(verdict: BeatVerdict) {
    const projectile = this.physics.add.sprite(
      this.player.x,
      this.player.y - 20,
      'gameplay',
      'projectile'
    )

    // Set projectile properties based on verdict
    const speed = verdict === 'PERFECT' ? 600 : verdict === 'NORMAL' ? 500 : 400
    const damage = verdict === 'PERFECT' ? 3 : verdict === 'NORMAL' ? 2 : 1

    projectile.setVelocity(0, -speed)
    projectile.setData('damage', damage)
    projectile.setData('verdict', verdict)

    // Add to physics group for collision detection
    if (!this.registry.has('projectiles')) {
      this.registry.set('projectiles', this.physics.add.group())
    }
    const projectiles = this.registry.get('projectiles') as Phaser.Physics.Arcade.Group
    projectiles.add(projectile)

    // Destroy projectile when it goes off screen
    this.time.delayedCall(3000, () => {
      if (projectile && projectile.active) {
        projectile.destroy()
      }
    })
  }

  /**
   * Show visual feedback for shot verdict
   */
  private showShotFeedback(verdict: BeatVerdict) {
    const color = verdict === 'PERFECT' ? 0x00ff00 : verdict === 'NORMAL' ? 0xffff00 : 0xff0000
    const text = verdict === 'PERFECT' ? 'PERFECT!' : verdict === 'NORMAL' ? 'GOOD!' : 'MISS!'

    const feedback = this.add.text(
      this.player.x,
      this.player.y - 40,
      text,
      {
        fontSize: '24px',
        color: `#${color.toString(16).padStart(6, '0')}`,
        stroke: '#000000',
        strokeThickness: 3
      }
    ).setOrigin(0.5)

    // Animate feedback
    this.tweens.add({
      targets: feedback,
      y: feedback.y - 50,
      alpha: 0,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => feedback.destroy()
    })

    // Screen flash effect
    this.cameras.main.flash(200, color >> 16, (color >> 8) & 0xff, color & 0xff)
  }

  /**
   * Update score/HUD based on verdict (placeholder)
   */
  private updateScore(verdict: BeatVerdict) {
    // This would typically update a score manager or HUD
    console.log(`Shot verdict: ${verdict}`)
  }

  /**
   * Handle bar start events for dynamic lane changes
   */
  private onBarStart() {
    // Advance to next lane count in sequence
    this.currentSequenceIndex = (this.currentSequenceIndex + 1) % this.laneTransitionSequence.length
    const newLaneCount = this.laneTransitionSequence[this.currentSequenceIndex]

    if (newLaneCount !== this.currentLaneCount) {
      this.performLaneTransition(newLaneCount)
    }

    console.log(`Bar started! Lane count: ${newLaneCount}`)
  }

  /**
   * Perform smooth lane transition with visual effects
   */
  private performLaneTransition(newLaneCount: number) {
    this.currentLaneCount = newLaneCount

    // Store old lane positions for transition
    const oldLanes = this.laneManager.getAll()

    // Build new lane layout
    this.laneManager.build(newLaneCount, 0, this.scale.width)

    // Create smooth transition effect
    this.createLaneTransitionEffect(oldLanes)

    // Snap player to nearest lane in new layout
    this.snapPlayerToNearestLane()

    // Update beat judge window if needed (larger window for more lanes)
    this.updateBeatJudgeForLaneCount(newLaneCount)
  }

  /**
   * Create visual transition effect between old and new lane layouts
   */
  private createLaneTransitionEffect(oldLanes: ReadonlyArray<{ index: number; centerX: number }>) {
    // Flash effect to indicate transition
    this.cameras.main.flash(300, 255, 255, 255)

    // Create expanding/contracting effect on lane lines
    const newLanes = this.laneManager.getAll()

    // Animate lane lines growing/shrinking
    newLanes.forEach((lane, index) => {
      // Find corresponding old lane or nearest
      const oldLane = oldLanes[index] || oldLanes.reduce((prev, curr) =>
        Math.abs(curr.centerX - lane.centerX) < Math.abs(prev.centerX - lane.centerX) ? curr : prev
      )

      if (oldLane && Math.abs(oldLane.centerX - lane.centerX) > 10) {
        // Significant position change - animate transition
        this.tweens.add({
          targets: this.player,
          x: lane.centerX,
          duration: 200,
          ease: 'Sine.inOut'
        })
      }
    })

    // Add screen shake for dramatic effect
    this.cameras.main.shake(150, 0.005)
  }

  /**
   * Snap player to nearest lane in new layout
   */
  private snapPlayerToNearestLane() {
    const nearestLane = this.laneManager.nearest(this.player.x)
    const body = this.player.body as Phaser.Physics.Arcade.Body

    if (body && typeof body.reset === 'function') {
      body.reset(nearestLane.centerX, body.y)
    } else {
      this.player.x = nearestLane.centerX
    }

    // Reset sticky lane controller
    ;(this.stickyLane as any).targetX = null
  }

  /**
   * Update BeatJudge timing window based on lane count
   */
  private updateBeatJudgeForLaneCount(laneCount: number) {
    // Larger window for more lanes (harder to time perfectly)
    const window = laneCount <= 3 ? 0.12 : laneCount <= 5 ? 0.10 : 0.08

    this.beatJudge = new BeatJudge(
      () => this.conductor.getBeatPhase(),
      {
        window: window,
        offsetMs: this.beatJudge['opts'].offsetMs,
        beatLengthMs: this.conductor.getBeatLengthMs()
      }
    )
  }

  /**
   * Update track BPM from loaded track data
   */
  updateTrackBpm(bpm: number, barBeats: number = 4) {
    this.conductor.setBpm(bpm, barBeats)
    this.beatJudge = new BeatJudge(
      () => this.conductor.getBeatPhase(),
      {
        window: 0.12,
        offsetMs: this.beatJudge['opts'].offsetMs,
        beatLengthMs: this.conductor.getBeatLengthMs()
      }
    )
  }

  /**
   * Update input offset for latency calibration
   */
  updateInputOffset(offsetMs: number) {
    this.beatJudge = new BeatJudge(
      () => this.conductor.getBeatPhase(),
      {
        window: this.beatJudge['opts'].window,
        offsetMs: offsetMs,
        beatLengthMs: this.conductor.getBeatLengthMs()
      }
    )
  }

  update(time: number, delta: number) {
    // Kombinera piltangenter och WASD och uppdatera lane‑rörelse
    const wasd = this.registry.get('wasd')
    this.stickyLane.update(this.cursors, wasd, delta)
  }
}