import Phaser from 'phaser'

export default class HUD {
  private scene: Phaser.Scene
  private scoreText!: Phaser.GameObjects.Text
  private multText!: Phaser.GameObjects.Text
  private accText!: Phaser.GameObjects.Text
  private comboText!: Phaser.GameObjects.Text
  private hearts: Phaser.GameObjects.Image[] = []
  private bombBarBg?: Phaser.GameObjects.Rectangle
  private bombBarFill?: Phaser.GameObjects.Rectangle

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  create() {
    const { width } = this.scene.scale
    this.scoreText = this.scene.add.text(16, 10, 'Score: 0', { fontFamily: 'UiFont, sans-serif', fontSize: '16px', color: '#fff' })
    this.multText = this.scene.add.text(width / 2, 10, 'x1.0', { fontFamily: 'UiFont, sans-serif', fontSize: '18px', color: '#a0e9ff' }).setOrigin(0.5, 0)
    this.accText = this.scene.add.text(width - 160, 10, 'Acc: 0%', { fontFamily: 'UiFont, sans-serif', fontSize: '14px', color: '#fff' })
    // Bomb meter
    this.bombBarBg = this.scene.add.rectangle(width - 160, 20, 120, 10, 0x333333).setOrigin(0, 0)
    this.bombBarFill = this.scene.add.rectangle(width - 160, 20, 0, 10, 0x00e5ff).setOrigin(0, 0)
    this.comboText = this.scene.add.text(width / 2, 40, '', { fontFamily: 'UiFont, sans-serif', fontSize: '24px', color: '#ffb300' }).setOrigin(0.5, 0)
    //this.comboText.setScrollFactor(0)
  
  }

  update(score: number, multiplier: number, accPct?: number) {
    this.scoreText.setText(`Score: ${score}`)
    this.multText.setText(`x${multiplier.toFixed(1)}`)
    if (typeof accPct === 'number') this.accText.setText(`Acc: ${accPct.toFixed(0)}%`)
  }

  setupHearts(maxHp: number) {
    // Clear existing
    this.hearts.forEach(h => h.destroy())
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

  setCombo(count: number) {
    // This method is kept for backward compatibility but is no longer used
    // as we now show combo numbers above enemies
    this.comboText.setVisible(false)
  }
}
