import Phaser from 'phaser'
import LaneManager from '../systems/LaneManager'
import StickyLaneController from '../systems/StickyLaneController'
import PlayerSkin from '../systems/PlayerSkin'
import { loadOptions, resolveGameplayMode, GameplayMode } from '../systems/Options'
/**
 * GameScene – Demo för StickyLaneController
 *
 * Denna scen visar hur du integrerar LaneManager, StickyLaneController och
 * PlayerSkin. Spelaren kan röra sig fritt horisontellt med piltangenter
 * (eller A/D) och dras automatiskt mot mitten av närmaste lane när
 * horisontell rörelse stannar upp. Vertikal rörelse är fri och oberoende.
 */
export default class GameScene extends Phaser.Scene {
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
  private opts = loadOptions()
  private laneManager!: LaneManager
  private stickyLane!: StickyLaneController
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private gameplayMode: GameplayMode = resolveGameplayMode(this.opts.gameplayMode)
  
  constructor() {
    super('GameScene')
  }

  preload() {
    // Ladda resurser (sprites, atlas etc) om det behövs. Antas redan laddat i BootScene.
  }

  create() {
    const laneCount = 7
    const { width, height } = this.scale
    this.cameras.main.setBackgroundColor('#0a0a0f')
    
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

    // Kamera hålls statisk i detta testläge.  Vi följer inte spelaren,
    // vilket gör att spelaren behåller sin Y‑position längst ned i skärmen.

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
      W: Phaser.Input.Keyboard.KeyCodes.W,
      A: Phaser.Input.Keyboard.KeyCodes.A,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      D: Phaser.Input.Keyboard.KeyCodes.D,
    }) as any
    this.registry.set('wasd', wasd)

    // Instansiera StickyLaneController (deadzone beräknas automatiskt)
    this.stickyLane = new StickyLaneController(this, this.laneManager, this.player)
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

  update(time: number, delta: number) {
    // Kombinera piltangenter och WASD och uppdatera lane‑rörelse
    const wasd = this.registry.get('wasd')
    const body = this.player.body as Phaser.Physics.Arcade.Body
    const wasdKeys = this.registry.get('wasd') as any
    let moveX = 0
    let moveY = 0

    if (this.cursors.left?.isDown || wasdKeys?.A?.isDown) moveX -= 1
    if (this.cursors.right?.isDown || wasdKeys?.D?.isDown) moveX += 1
    if (this.cursors.up?.isDown || wasdKeys?.W?.isDown) moveY -= 1
    if (this.cursors.down?.isDown || wasdKeys?.S?.isDown) moveY += 1
    const magnitude = Math.hypot(moveX, moveY)
    if (magnitude > 1) {
      moveX /= magnitude
      moveY /= magnitude
    }

    const stageHeight = this.scale.height
    const maxSpeed = this.gameplayMode === 'vertical'
      ? stageHeight / 1.4
      : this.scale.width / 1.1

    const targetVelocity = new Phaser.Math.Vector2(moveX, moveY)
    if (targetVelocity.lengthSq() > 1) targetVelocity.normalize()
    targetVelocity.scale(maxSpeed)

    const lerp = 0.22
    let newVelX = Phaser.Math.Linear(body.velocity.x, targetVelocity.x, lerp)
    let newVelY = Phaser.Math.Linear(body.velocity.y, targetVelocity.y, lerp)
    if (targetVelocity.lengthSq() < 0.01) {
      newVelX *= 0.8
      newVelY *= 0.8
    }
    body.setVelocity(newVelX, newVelY)
    this.stickyLane.update(this.cursors, wasd, delta)
  }
}