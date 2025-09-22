import Phaser from 'phaser'
import LaneManager from '../systems/LaneManager'
import StickyLaneController from '../systems/StickyLaneController'
import PlayerSkin from '../systems/PlayerSkin'
/**
 * GameScene (drop‑in version)
 *
 * Denna minimala GameScene visar hur du integrerar LaneManager och
 * StickyLaneController i ett vertikalt läge.  Den skapar tre lanes,
 * placerar en enkel spelarkaraktär på närmaste lane, och låter dig flytta
 * spelaren mellan lanes med vänster/höger‑tangenterna.  När fönstret
 * ändras byggs lanes om och spelaren snappas om till närmaste lane.
 *
 * För användning i ditt projekt: Lägg denna fil i `src/scenes/GameScene.ts`
 * och justera importvägarna (`./LaneManager` och `./StickyLaneController`)
 * om du placerar filerna i en annan mappstruktur (t.ex. `../systems/`).
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
    // Ladda in resurser här om du behöver sprites etc.
  }

  create() {
    const { width, height } = this.scale
    const laneCount = 3 // antal lanes i detta läge

    // Skapa LaneManager och bygg lanes över hela bredden
    this.laneManager = new LaneManager(this)
    this.laneManager.build(laneCount, 0, this.scale.width)
    // Visa debug overlay så att lanes syns (kan tas bort i release)
    this.laneManager.enableDebug(0x00ff99)

    // Skapa en enkel spelare som en rektangel längst ned på skärmen
    const startLane = this.laneManager.nearest(this.scale.width / 2)
    // Player sprite (behåll som fysik-host)
    this.player = this.physics.add.sprite( startLane.centerX, this.scale.height - 80, 'gameplay', 'player_idle')
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

    // Resnappa spelaren om lane-layout ändras (t.ex. vid resize)
    this.events.on('lanes:changed', () => {
      this.player.x = this.laneManager.snap(this.player.x)
    })

    // Bygg om lanes när fönstret ändras
    this.scale.on(Phaser.Scale.Events.RESIZE, (gameSize: any) => {
      const { width } = gameSize
      this.laneManager.build(laneCount, 0, width)
    })
        // Tangentbord (vänster/höger) för lane movement
    this.cursors = this.input.keyboard!.createCursorKeys()
    const wasd = this.input.keyboard!.addKeys({
      W: Phaser.Input.Keyboard.KeyCodes.W,
      A: Phaser.Input.Keyboard.KeyCodes.A,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      D: Phaser.Input.Keyboard.KeyCodes.D,
    }) as any
    this.registry.set('wasd', wasd)


  // Instansiera StickyLaneController med 10 % deadzone av lane spacing
    this.stickyLane = new StickyLaneController(this, this.laneManager, this.player)
  }

  update(time: number, delta: number) {
    
    // Uppdatera lane‑rörelse varje frame
    const wasd = this.registry.get('wasd')
    this.stickyLane.update(this.cursors, wasd, delta)
  }
}