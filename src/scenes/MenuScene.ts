import Phaser from 'phaser'
import Starfield from '../systems/Starfield'

type MenuItem =
  | { type: 'resume' }
  | { type: 'track'; track: any }

export default class MenuScene extends Phaser.Scene {
  private hint!: Phaser.GameObjects.Text
  private list!: Phaser.GameObjects.Text
  private tracks: any[] = []
  private index = 0
  private starfield!: Starfield
  private hasStarted = false
  private handleUp!: () => void
  private handleDown!: () => void
  private handlePlay!: () => void
  private handleOptions!: () => void
  private menuItems: MenuItem[] = []
  private pausedBanner?: Phaser.GameObjects.Text
  private resumeAvailable = false

  constructor() {
    super('MenuScene')
  }

  create(data: { resume?: boolean } = {}) {
    this.scene.bringToTop()
    this.hasStarted = false
    this.resumeAvailable = !!data.resume
    const { width, height } = this.scale
    this.cameras.main.setBackgroundColor('#0a0a0f')

    // Background: procedural starfield
    this.starfield = new Starfield(this)
    this.starfield.create()

    
   /* 
      this.add.text(width / 2, height * 0.35, 'Beat Blaster', {
      fontFamily: 'HudFont, UiFont, sans-serif',
      fontSize: '48px',
      color: '#ffffff'
    }).setOrigin(0.5)
    */
    const logo = this.add.image(width / 2, height * 0.35, 'menulogo')
    logo.setOrigin(0.5)
    // Adjust scale if needed:
    logo.setScale(0.5)

    this.hint = this.add.text(width / 2, height * 0.85, 'SPACE: Play   ↑/↓: Select   O: Options', {
      fontFamily: 'UiFont, sans-serif',
      fontSize: '16px',
      color: '#a0e9ff'
    }).setOrigin(0.5)

    this.tweens.add({
      targets: this.hint,
      alpha: 0.25,
      duration: 800,
      yoyo: true,
      repeat: -1
    })

    this.tracks = this.registry.get('tracks') || []
    const initialId = this.registry.get('selectedTrackId')
    const trackIndex = Math.max(0, this.tracks.findIndex((t: any) => t.id === initialId))
    this.menuItems = []
    if (this.resumeAvailable) this.menuItems.push({ type: 'resume' })
    for (const track of this.tracks) {
      this.menuItems.push({ type: 'track', track })
    }
    if (this.resumeAvailable) {
      this.index = Math.min(trackIndex + 1, this.menuItems.length - 1)
    } else {
      this.index = trackIndex
    }
    this.list = this.add.text(width / 2, height * 0.6, '', {
      fontFamily: 'UiFont, sans-serif',
      fontSize: '14px',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5)
    if (this.resumeAvailable) {
      this.pausedBanner = this.add.text(width / 2, height * 0.25, 'PAUSED', {
        fontFamily: 'HudFont, UiFont, sans-serif',
        fontSize: '36px',
        color: '#ff5db1'
      }).setOrigin(0.5)
    }
    this.renderList()

    const k = this.input.keyboard!
    this.handleUp = () => {
      if (this.menuItems.length === 0) return
      this.index = (this.index - 1 + this.menuItems.length) % this.menuItems.length
      this.sound.play('ui_move', { volume: 0.5 })
      this.renderList()
    }
    this.handleDown = () => {
      if (this.menuItems.length === 0) return
      this.index = (this.index + 1) % this.menuItems.length
      this.sound.play('ui_move', { volume: 0.5 })
      this.renderList()
    }
    this.handlePlay = () => {
      if (this.hasStarted) return
      this.hasStarted = true
      const item = this.menuItems[this.index]
      if (!item) {
        this.hasStarted = false
        return
      }
      if (item.type === 'resume') {
        this.sound.play('ui_select', { volume: 0.5 })
        this.scene.resume('GameScene')
        this.scene.stop()
        return
      }
      if (this.resumeAvailable) {
        const proceed = window.confirm('Warning selecting a new game will end your paused game. Continue?')
        if (!proceed) {
          this.hasStarted = false
          return
        }
        this.scene.stop('GameScene')
      }
      this.registry.set('selectedTrackId', item.track?.id || null)
      this.sound.play('ui_select', { volume: 0.5 })
      this.scene.start('GameScene')
    }
    this.handleOptions = () => {
      this.scene.launch('OptionsScene', { from: 'MenuScene' })
      this.scene.bringToTop('OptionsScene')
      this.scene.pause()
    }

    k.on('keydown-UP', this.handleUp, this)
    k.on('keydown-DOWN', this.handleDown, this)
    k.on('keydown-SPACE', this.handlePlay, this)
    k.on('keydown-O', this.handleOptions, this)

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      k.off('keydown-UP', this.handleUp, this)
      k.off('keydown-DOWN', this.handleDown, this)
      k.off('keydown-SPACE', this.handlePlay, this)
      k.off('keydown-O', this.handleOptions, this)
    })
  }

  update(_time: number, delta: number) {
    if (this.starfield) this.starfield.update(delta)
  }

  private renderList() {
    if (this.menuItems.length === 0) {
      this.list.setText('No tracks configured')
      return
    }
    const lines = this.menuItems.map((item, i) => {
      const prefix = i === this.index ? '▶' : '  '
      if (item.type === 'resume') return `${prefix} Resume Game`
      const t = item.track
      return `${prefix} ${t.name} — ${t.artist || ''}`
    })
    this.list.setText(lines.join('\n'))
  }
}
