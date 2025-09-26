import Phaser from 'phaser'
import LaneManager from '../systems/LaneManager'
import StickyLaneController from '../systems/StickyLaneController'
import PlayerSkin from '../systems/PlayerSkin'

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
  private laneManager!: LaneManager
  private stickyLane!: StickyLaneController
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys

  constructor() {
    super('GameScene')
  }

  preload() {
    // Ladda resurser (sprites, atlas etc) om det behövs. Antas redan laddat i BootScene.
  }

  create() {
    const laneCount = 3
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
    this.stickyLane.update(this.cursors, wasd, delta)
  }
}