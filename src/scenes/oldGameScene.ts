import Phaser from 'phaser'
import LaneManager from '../systems/LaneManager'
import StickyLaneController from '../systems/StickyLaneController'
import PlayerSkin from '../systems/PlayerSkin'

/**
 * GameScene – integrerad lane demo
 *
 * Denna scen visar hur du integrerar LaneManager och
 * StickyLaneController i ett vertikalt läge.  Den bygger tre lanes,
 * placerar en spelare på närmaste lane och låter dig flytta den med
 * vänster/höger‑tangenter och WASD.  När fönstret ändras byggs lanes
 * om och spelaren/fiender resnappas automatiskt via `onLanesChanged()`.
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
    const laneCount = 3
    // Skapa LaneManager och bygg lanes över hela bredden
    this.laneManager = new LaneManager(this)
    this.laneManager.build(laneCount, 0, this.scale.width)
    // Debug overlay (ta bort eller kommentera i release)
    this.laneManager.enableDebug(0x00ff99)

    // Skapa spelare som Arcade-sprite längst ned i mitten
    const startLane = this.laneManager.nearest(this.scale.width / 2)
    this.player = this.physics.add.sprite(startLane.centerX, this.scale.height - 80, 'gameplay', 'player_idle')
    this.player.setCollideWorldBounds(true)
    this.player.setVisible(false)
    
    this.physics.world.gravity.y = 0;  // Se till att gravitationen är avstängd
    this.player.body.setAllowGravity(false);
    // Sätt mindre rund hitbox som matchar PlayerSkin
    const r = 14
    this.player.body.setCircle(r, -r + this.player.width / 2, -r + this.player.height / 2)
    // Rotation (skins ligger på sidan)
    this.player.setRotation(Math.PI / 2)
    // Koppla skinet (ritar skeppet och thrusters)
    const skin = new PlayerSkin(this, this.player)
    this.player.setData('skin', skin)

    // Lyssna på lane-layout-ändringar och resnappa spelaren/fiender
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

    // Skapa StickyLaneController (dynamiskt deadzone)
    this.stickyLane = new StickyLaneController(this, this.laneManager, this.player)
  }

  /**
   * Händelsehanterare för lane-layout.  Snäppa om spelare och fiender när
   * antalet lanes eller positionerna ändras.  Använder body.reset() för
   * Arcade-sprites så att fysikkroppen uppdateras korrekt.
   */
  private onLanesChanged() {
    const snapped = this.laneManager.snap(this.player.x)
    const body = this.player.body as Phaser.Physics.Arcade.Body
    if (body && typeof body.reset === 'function') {
      body.reset(snapped, body.y)
    } else {
      this.player.x = snapped
    }
    // Återställ eventuell pågående lerp i StickyLaneController
    ;(this.stickyLane as any).targetX = null
  }

  update(time: number, delta: number) {
    this.cameras.main.startFollow(this.player, false, 0.1, 0.1);
    this.cameras.main.setDeadzone(0, 0);
    
    console.log('Player position:', this.player.x.toFixed(1), this.player.y.toFixed(1));
    console.log('Velocity:', this.player.body.velocity.x.toFixed(1), this.player.body.velocity.y.toFixed(1));
    this.player.body.setVelocity(0, 0);
    // Kombinera piltangenter och WASD
    const wasd = this.registry.get('wasd')
    this.stickyLane.update(this.cursors, wasd, delta)
  
  }
}
