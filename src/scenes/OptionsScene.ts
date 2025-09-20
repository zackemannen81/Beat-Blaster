import Phaser from 'phaser'
import { loadOptions, saveOptions, Options } from '../systems/Options'

type OptionsSceneData = {
  from?: string
}

export default class OptionsScene extends Phaser.Scene {
  private opts!: Options
  private cursor = 0
  private entries!: Phaser.GameObjects.Text[]
  private title!: Phaser.GameObjects.Text
  private originScene: string = 'MenuScene'

  constructor() {
    super('OptionsScene')
  }

  create(data: OptionsSceneData = {}) {
    this.originScene = data.from ?? 'MenuScene'
    const { width, height } = this.scale
    this.cameras.main.setBackgroundColor('rgba(0,0,0,0.6)')
    this.opts = loadOptions()
    this.title = this.add.text(width / 2, height * 0.2, 'Options', { fontFamily: 'HudFont, UiFont', fontSize: '32px', color: '#fff' }).setOrigin(0.5)

    this.entries = [
      this.add.text(width / 2, height * 0.34, '', { fontFamily: 'UiFont', fontSize: '18px' }).setOrigin(0.5),
      this.add.text(width / 2, height * 0.41, '', { fontFamily: 'UiFont', fontSize: '18px' }).setOrigin(0.5),
      this.add.text(width / 2, height * 0.48, '', { fontFamily: 'UiFont', fontSize: '18px' }).setOrigin(0.5),
      this.add.text(width / 2, height * 0.55, '', { fontFamily: 'UiFont', fontSize: '18px' }).setOrigin(0.5),
      this.add.text(width / 2, height * 0.62, '', { fontFamily: 'UiFont', fontSize: '18px' }).setOrigin(0.5),
      this.add.text(width / 2, height * 0.69, '', { fontFamily: 'UiFont', fontSize: '18px' }).setOrigin(0.5),
      this.add.text(width / 2, height * 0.76, '', { fontFamily: 'UiFont', fontSize: '18px' }).setOrigin(0.5),
      this.add.text(width / 2, height * 0.83, '', { fontFamily: 'UiFont', fontSize: '18px' }).setOrigin(0.5)
    ]
    this.render()

    const k = this.input.keyboard!
    k.on('keydown-UP', () => { this.cursor = (this.cursor - 1 + this.entries.length) % this.entries.length; this.sound.play('ui_move', { volume: this.opts.sfxVolume }); this.render() })
    k.on('keydown-DOWN', () => { this.cursor = (this.cursor + 1) % this.entries.length; this.sound.play('ui_move', { volume: this.opts.sfxVolume }); this.render() })
    k.on('keydown-LEFT', () => { this.adjust(-1) })
    k.on('keydown-RIGHT', () => { this.adjust(1) })
    k.once('keydown-ESC', () => this.close())
    k.once('keydown-ENTER', () => this.close())
  }

  private render() {
    const trackId = (this.registry.get('selectedTrackId') as string) || 'default'
    const io = this.opts.inputOffsetMs[trackId] ?? 0
    const fm = this.opts.fireMode
    const bgLabels: Record<Options['backgroundMode'], string> = {
      dual: 'Neon Horizon',
      classic: 'Classic Grid',
      aurora: 'Aurora Overdrive',
      city: 'Synthwave Cityscape',
      ocean: 'Chromatic Ocean',
      tunnel: 'Vector Tunnel'
    }
    const bg = bgLabels[this.opts.backgroundMode]
    const rows = [
      `Music Volume: ${(this.opts.musicVolume * 100) | 0}%`,
      `SFX Volume: ${(this.opts.sfxVolume * 100) | 0}%`,
      `Announcer: ${this.opts.announcerEnabled ? 'On' : 'Off'}`,
      `Metronome: ${this.opts.metronome ? 'On' : 'Off'}`,
      `High Contrast: ${this.opts.highContrast ? 'On' : 'Off'}`,
      `Input Offset: ${io} ms`,
      `Fire Mode: ${fm === 'click' ? 'Click' : fm === 'hold_quantized' ? 'Hold (Quantized)' : 'Hold (Raw)'}`,
      `Background: ${bg}`
    ]
    this.entries.forEach((t, i) => t.setText(`${i === this.cursor ? '▶ ' : '  '}${rows[i]}`).setColor(i === this.cursor ? '#00e5ff' : '#ffffff'))
  }

  private adjust(dir: number) {
    const step = dir
    const trackId = (this.registry.get('selectedTrackId') as string) || 'default'
    switch (this.cursor) {
      case 0: this.opts.musicVolume = Phaser.Math.Clamp(this.opts.musicVolume + step * 0.05, 0, 1); break
      case 1: this.opts.sfxVolume = Phaser.Math.Clamp(this.opts.sfxVolume + step * 0.05, 0, 1); break
      case 2: this.opts.announcerEnabled = !this.opts.announcerEnabled; break
      case 3: this.opts.metronome = !this.opts.metronome; break
      case 4: this.opts.highContrast = !this.opts.highContrast; break
      case 5: {
        const prev = this.opts.inputOffsetMs[trackId] ?? 0
        this.opts.inputOffsetMs[trackId] = Phaser.Math.Clamp(prev + step * 5, -200, 200)
        break
      }
      case 6: {
        const order: Options['fireMode'][] = ['click', 'hold_quantized', 'hold_raw']
        const idx = order.indexOf(this.opts.fireMode)
        this.opts.fireMode = order[(idx + (dir > 0 ? 1 : order.length - 1)) % order.length]
        break
      }
      case 7: {
        const modes: Options['backgroundMode'][] = ['dual', 'classic', 'aurora', 'city', 'ocean', 'tunnel']
        const idx = modes.indexOf(this.opts.backgroundMode)
        const next = idx === -1 ? 0 : (idx + (dir > 0 ? 1 : modes.length - 1)) % modes.length
        this.opts.backgroundMode = modes[next]
        break
      }
    }
    this.sound.play('ui_move', { volume: this.opts.sfxVolume })
    this.render()
  }

  private close() {
    saveOptions(this.opts)
    this.sound.play('ui_select', { volume: this.opts.sfxVolume })
    // Apply high-contrast background immediately
    const color = this.opts.highContrast ? '#000000' : '#0a0a0f'
    this.scene.get('MenuScene')?.cameras.main.setBackgroundColor(color)
    this.scene.get('GameScene')?.cameras.main.setBackgroundColor(color)
    this.scene.stop()
    this.scene.resume(this.originScene)
  }
}
