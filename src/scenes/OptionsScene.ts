import Phaser from 'phaser'
import { loadOptions, saveOptions, Options, detectGameplayModeOverride, resolveGameplayMode } from '../systems/Options'

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

    const baseY = 0.32
    const stepY = 0.055
    const rowCount = 13
    this.entries = Array.from({ length: rowCount }, (_, i) =>
      this.add.text(width / 2, height * (baseY + stepY * i), '', { fontFamily: 'UiFont', fontSize: '18px' }).setOrigin(0.5)
    )
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
    const override = detectGameplayModeOverride()
    const activeMode = override ? override.mode : resolveGameplayMode(this.opts.gameplayMode)
    const modeLabel = activeMode === 'vertical' ? 'Vertical Scroll' : 'Omni Scroll'
    const overrideSuffix = override ? ' (Override)' : ''

    const crosshairLabel =
      this.opts.crosshairMode === 'pointer'
        ? 'Pointer'
        : this.opts.crosshairMode === 'fixed'
          ? 'Fixed'
          : 'Pad-Relative'

    const rows = [
      `Music Volume: ${(this.opts.musicVolume * 100) | 0}%`,
      `SFX Volume: ${(this.opts.sfxVolume * 100) | 0}%`,
      `Metronome: ${this.opts.metronome ? 'On' : 'Off'}`,
      `High Contrast: ${this.opts.highContrast ? 'On' : 'Off'}`,
      `Reduced Motion: ${this.opts.reducedMotion ? 'On' : 'Off'}`,
      `Input Offset: ${io} ms`,
      `Fire Mode: ${fm === 'click' ? 'Click' : fm === 'hold_quantized' ? 'Hold (Quantized)' : 'Hold (Raw)'}`,
      `Gameplay Mode: ${modeLabel}${overrideSuffix}`,
      `Crosshair Mode: ${crosshairLabel}`,
      `Vertical Safety Band: ${this.opts.verticalSafetyBand ? 'On' : 'Off'}`,
      `Fallback Waves: ${this.opts.allowFallbackWaves ? 'On' : 'Off'}`,
      `Gamepad Deadzone: ${(this.opts.gamepadDeadzone * 100).toFixed(0)}%`,
      `Gamepad Sensitivity: ${this.opts.gamepadSensitivity.toFixed(2)}x`
    ]
    this.entries.forEach((t, i) => t.setText(`${i === this.cursor ? '▶ ' : '  '}${rows[i]}`).setColor(i === this.cursor ? '#00e5ff' : '#ffffff'))
  }

  private adjust(dir: number) {
    const step = dir
    const trackId = (this.registry.get('selectedTrackId') as string) || 'default'
    switch (this.cursor) {
      case 0: this.opts.musicVolume = Phaser.Math.Clamp(this.opts.musicVolume + step * 0.05, 0, 1); break
      case 1: this.opts.sfxVolume = Phaser.Math.Clamp(this.opts.sfxVolume + step * 0.05, 0, 1); break
      case 2: this.opts.metronome = !this.opts.metronome; break
      case 3: this.opts.highContrast = !this.opts.highContrast; break
      case 4: {
        this.opts.reducedMotion = !this.opts.reducedMotion
        break
      }
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
        const override = detectGameplayModeOverride()
        if (override) break
        const order: Options['gameplayMode'][] = ['omni', 'vertical']
        const idx = order.indexOf(this.opts.gameplayMode)
        this.opts.gameplayMode = order[(idx + (dir > 0 ? 1 : order.length - 1)) % order.length]
        break
      }
      case 8: {
        const order: Options['crosshairMode'][] = ['pointer', 'fixed', 'pad-relative']
        const idx = order.indexOf(this.opts.crosshairMode)
        this.opts.crosshairMode = order[(idx + (dir > 0 ? 1 : order.length - 1)) % order.length]
        break
      }
      case 9: {
        this.opts.verticalSafetyBand = !this.opts.verticalSafetyBand
        break
      }
      case 10: {
        this.opts.allowFallbackWaves = !this.opts.allowFallbackWaves
        break
      }
      case 11: {
        this.opts.gamepadDeadzone = Phaser.Math.Clamp(this.opts.gamepadDeadzone + step * 0.05, 0, 0.6)
        break
      }
      case 12: {
        this.opts.gamepadSensitivity = Phaser.Math.Clamp(this.opts.gamepadSensitivity + step * 0.1, 0.5, 2)
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
