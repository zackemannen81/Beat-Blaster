import Phaser from 'phaser'
import Starfield from '../systems/Starfield'

export default class MenuScene extends Phaser.Scene {
  private hint!: Phaser.GameObjects.Text
  private list!: Phaser.GameObjects.Text
  private tracks: any[] = []
  private index = 0
  private starfield!: Starfield

  constructor() {
    super('MenuScene')
  }

  create() {
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
    this.index = Math.max(0, this.tracks.findIndex((t: any) => t.id === initialId))
    this.list = this.add.text(width / 2, height * 0.6, '', {
      fontFamily: 'UiFont, sans-serif',
      fontSize: '14px',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5)
    this.renderList()

    this.input.keyboard!.on('keydown-UP', () => {
      this.index = (this.index - 1 + this.tracks.length) % this.tracks.length
      this.sound.play('ui_move', { volume: 0.5 })
      this.renderList()
    })
    this.input.keyboard!.on('keydown-DOWN', () => {
      this.index = (this.index + 1) % this.tracks.length
      this.sound.play('ui_move', { volume: 0.5 })
      this.renderList()
    })
    this.input.keyboard!.once('keydown-SPACE', () => {
      const sel = this.tracks[this.index]
      this.registry.set('selectedTrackId', sel?.id || null)
      this.sound.play('ui_select', { volume: 0.5 })
      this.scene.start('GameScene')
    })

    // Options overlay
    this.input.keyboard!.on('keydown-O', () => {
      this.scene.launch('OptionsScene')
      this.scene.pause()
    })
  }

  update(_time: number, delta: number) {
    if (this.starfield) this.starfield.update(delta)
  }

  private renderList() {
    if (this.tracks.length === 0) {
      this.list.setText('No tracks configured')
      return
    }
    const lines = this.tracks.map((t, i) => `${i === this.index ? '▶' : '  '} ${t.name} — ${t.artist || ''}`)
    this.list.setText(lines.join('\n'))
  }
}
