import Phaser from 'phaser'
import Powerups, { PowerupEvent, PowerupType } from '../systems/Powerups'

type PowerupSlot = {
  container: Phaser.GameObjects.Container
  icon: Phaser.GameObjects.Image
  label: Phaser.GameObjects.Text
  timerText: Phaser.GameObjects.Text
  barBg: Phaser.GameObjects.Rectangle
  barFill: Phaser.GameObjects.Rectangle
  type: PowerupType
  durationMs: number
}

export default class HUD {
  private scene: Phaser.Scene
  private scoreText!: Phaser.GameObjects.Text
  private multText!: Phaser.GameObjects.Text
  private accText!: Phaser.GameObjects.Text
  private comboText!: Phaser.GameObjects.Text
  private hearts: Phaser.GameObjects.Image[] = []
  private bombBarBg?: Phaser.GameObjects.Rectangle
  private bombBarFill?: Phaser.GameObjects.Rectangle
  private stageText!: Phaser.GameObjects.Text
  private missText!: Phaser.GameObjects.Text
  private bossContainer!: Phaser.GameObjects.Container
  private bossLabel!: Phaser.GameObjects.Text
  private bossBarBg!: Phaser.GameObjects.Rectangle
  private bossBarFill!: Phaser.GameObjects.Rectangle
  private powerups?: Powerups
  private powerupSlots = new Map<PowerupType, PowerupSlot>()
  private powerupOrder: PowerupType[] = ['shield', 'rapid', 'split', 'slowmo']
  private powerupPalette: Record<PowerupType, number> = {
    shield: 0x74d0ff,
    rapid: 0xff6b6b,
    split: 0xba68ff,
    slowmo: 0x78ffbc
  }
  private reducedMotion = false
  private missResetTimer?: Phaser.Time.TimerEvent

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  create() {
    const { width, height } = this.scene.scale
    this.scoreText = this.scene.add.text(16, 10, 'Score: 0', { fontFamily: 'UiFont, sans-serif', fontSize: '16px', color: '#fff' })
    this.multText = this.scene.add.text(width / 2, 10, 'x1.0', { fontFamily: 'UiFont, sans-serif', fontSize: '18px', color: '#a0e9ff' }).setOrigin(0.5, 0)
    this.accText = this.scene.add.text(width - 160, 10, 'Acc: 0%', { fontFamily: 'UiFont, sans-serif', fontSize: '14px', color: '#fff' })
    this.bombBarBg = this.scene.add.rectangle(width - 160, 20, 120, 10, 0x333333).setOrigin(0, 0)
    this.bombBarFill = this.scene.add.rectangle(width - 160, 20, 0, 10, 0x00e5ff).setOrigin(0, 0)
    this.comboText = this.scene.add.text(width / 2, 40, '', { fontFamily: 'UiFont, sans-serif', fontSize: '24px', color: '#ffb300' }).setOrigin(0.5, 0)
    this.stageText = this.scene.add.text(16, 60, 'Stage 1', { fontFamily: 'UiFont, sans-serif', fontSize: '18px', color: '#9ad2ff' })

    this.bossContainer = this.scene.add.container(width / 2, 80).setVisible(false).setDepth(40)
    const bossBg = this.scene.add.rectangle(0, 0, 240, 18, 0x000000, 0.45).setOrigin(0.5)
    this.bossBarBg = this.scene.add.rectangle(0, 0, 220, 10, 0xffffff, 0.18).setOrigin(0.5)
    this.bossBarFill = this.scene.add.rectangle(-110, 0, 220, 10, 0xff5db1, 0.85).setOrigin(0, 0.5)
    this.bossLabel = this.scene.add.text(0, -18, 'BOSS', { fontFamily: 'UiFont, sans-serif', fontSize: '16px', color: '#ff5db1' }).setOrigin(0.5, 1)
    this.bossContainer.add([bossBg, this.bossBarBg, this.bossBarFill, this.bossLabel])

    this.missText = this.scene.add.text(width / 2, height * 0.45, '', {
      fontFamily: 'UiFont, sans-serif',
      fontSize: '42px',
      color: '#ff5d5d',
      stroke: '#000',
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(60).setVisible(false)

    this.scene.events.on(Phaser.Scenes.Events.RESIZE, this.handleResize, this)
  }

  update(score: number, multiplier: number, accPct?: number) {
    this.scoreText.setText(`Score: ${score}`)
    this.multText.setText(`x${multiplier.toFixed(1)}`)
    if (typeof accPct === 'number') this.accText.setText(`Acc: ${accPct.toFixed(0)}%`)
    this.updatePowerupPanel()
  }

  setupHearts(maxHp: number) {
    this.hearts.forEach((h) => h.destroy())
    this.hearts = []
    for (let i = 0; i < maxHp; i++) {
      const img = this.scene.add.image(16 + i * 24, 42, 'ui', 'heart_empty').setOrigin(0, 0)
      this.hearts.push(img)
    }
  }

  setHp(hp: number) {
    this.hearts.forEach((img, idx) => img.setFrame(idx < hp ? 'heart_full' : 'heart_empty'))
  }

  setBombCharge(pct: number) {
    if (this.bombBarFill) this.bombBarFill.width = 120 * Phaser.Math.Clamp(pct, 0, 1)
  }

  setCombo(_count: number) {
    const count = Math.max(0, _count)
    if (count <= 1) {
      this.comboText.setVisible(false)
      return
    }
    this.comboText.setVisible(true)
    this.comboText.setText(`Combo x${count}`)
    if (this.reducedMotion) {
      this.comboText.setAlpha(1)
      return
    }
    this.comboText.setAlpha(1)
    this.scene.tweens.killTweensOf(this.comboText)
    this.scene.tweens.add({
      targets: this.comboText,
      alpha: 0.2,
      yoyo: true,
      duration: 180,
      repeat: 1
    })
  }

  setStage(stage: number) {
    this.stageText.setText(`Stage ${stage}`)
  }

  setBossHealth(fraction: number | null, label = 'BOSS') {
    if (fraction === null) {
      this.bossContainer.setVisible(false)
      return
    }
    const clamped = Phaser.Math.Clamp(fraction, 0, 1)
    this.bossContainer.setVisible(true)
    this.bossLabel.setText(label.toUpperCase())
    this.bossBarFill.width = this.bossBarBg.width * clamped
  }

  showMissFeedback(text = 'Miss!') {
    this.missText.setText(text)
    this.missText.setVisible(true)
    this.missText.setAlpha(1)
    this.missText.setScale(1)
    if (this.missResetTimer) this.missResetTimer.remove(false)

    if (this.reducedMotion) {
      this.missResetTimer = this.scene.time.delayedCall(400, () => this.missText.setVisible(false))
      return
    }

    this.scene.tweens.killTweensOf(this.missText)
    this.scene.tweens.add({
      targets: this.missText,
      alpha: 0,
      scale: 0.8,
      duration: 380,
      ease: 'Cubic.easeOut',
      onComplete: () => this.missText.setVisible(false)
    })
  }

  setReducedMotion(flag: boolean) {
    this.reducedMotion = flag
    if (flag) {
      this.comboText.setAlpha(1)
    }
  }

  bindPowerups(powerups: Powerups) {
    if (this.powerups === powerups) return
    if (this.powerups) {
      this.powerups.off('powerup', this.handlePowerupEvent, this)
    }
    this.powerups = powerups
    powerups.on('powerup', this.handlePowerupEvent, this)
    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      powerups.off('powerup', this.handlePowerupEvent, this)
    })
  }

  private handlePowerupEvent(event: PowerupEvent) {
    const slot = this.powerupSlots.get(event.type) ?? this.createPowerupSlot(event.type)
    slot.durationMs = event.durationMs > 0 ? event.durationMs : Math.max(event.remainingMs, slot.durationMs)
    slot.container.setAlpha(1)
    slot.container.setVisible(true)
    slot.timerText.setText(`${(event.remainingMs / 1000).toFixed(1)}s`)
    this.updatePowerupPanel()
  }

  private createPowerupSlot(type: PowerupType): PowerupSlot {
    const { width } = this.scene.scale
    const container = this.scene.add.container(width - 16, 60)
    container.setDepth(40)

    const bg = this.scene.add.rectangle(0, 0, 150, 38, 0x000000, 0.45).setOrigin(1, 0)
    const icon = this.scene.add.image(-128, 19, `powerup_badge_${type}`).setOrigin(0.5)
    icon.setScale(0.85)
    const label = this.scene.add.text(-104, 6, type.toUpperCase(), {
      fontFamily: 'UiFont, sans-serif',
      fontSize: '14px',
      color: '#ffffff'
    }).setOrigin(0, 0)
    const timerText = this.scene.add.text(-30, 6, '0.0s', {
      fontFamily: 'UiFont, sans-serif',
      fontSize: '14px',
      color: '#ffffff'
    }).setOrigin(1, 0)

    const barBg = this.scene.add.rectangle(-128, 28, 110, 6, 0xffffff, 0.2).setOrigin(0, 0.5)
    const barFill = this.scene.add.rectangle(-128, 28, 110, 6, this.powerupPalette[type], 0.9).setOrigin(0, 0.5)

    container.add([bg, barBg, barFill, icon, label, timerText])

    const slot: PowerupSlot = {
      container,
      icon,
      label,
      timerText,
      barBg,
      barFill,
      type,
      durationMs: this.powerups?.getDurationMs(type) ?? 0
    }

    this.powerupSlots.set(type, slot)
    this.layoutPowerupSlots()
    return slot
  }

  private updatePowerupPanel() {
    if (!this.powerups) return
    let layoutDirty = false
    for (const type of this.powerupOrder) {
      const slot = this.powerupSlots.get(type)
      if (!slot) continue
      const remaining = this.powerups.getRemainingMs(type)
      if (remaining <= 0) {
        if (slot.container.visible) {
          slot.container.setVisible(false)
          slot.container.setAlpha(0)
          layoutDirty = true
        }
        continue
      }
      const duration = slot.durationMs > 0 ? slot.durationMs : this.powerups.getDurationMs(type)
      const fraction = duration > 0 ? Phaser.Math.Clamp(remaining / duration, 0, 1) : 0
      slot.barFill.width = slot.barBg.width * fraction
      slot.timerText.setText(`${(remaining / 1000).toFixed(1)}s`)
    }
    if (layoutDirty) this.layoutPowerupSlots()
  }

  private layoutPowerupSlots() {
    const { width } = this.scene.scale
    let index = 0
    for (const type of this.powerupOrder) {
      const slot = this.powerupSlots.get(type)
      if (!slot || !slot.container.visible) continue
      slot.container.setPosition(width - 16, 60 + index * 44)
      index++
    }
  }

  private handleResize() {
    const { width, height } = this.scene.scale
    this.multText.setPosition(width / 2, 10)
    this.accText.setPosition(width - 160, 10)
    this.bombBarBg?.setPosition(width - 160, 20)
    this.bombBarFill?.setPosition(width - 160, 20)
    this.comboText.setPosition(width / 2, 40)
    this.stageText.setPosition(16, 60)
    this.bossContainer.setPosition(width / 2, 80)
    this.missText.setPosition(width / 2, height * 0.45)
    this.layoutPowerupSlots()
  }
}
