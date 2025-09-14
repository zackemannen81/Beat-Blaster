import Phaser from 'phaser'
import { addScore, loadBoard } from '../net/localLeaderboard'

export default class ResultScene extends Phaser.Scene {
  constructor() {
    super('ResultScene')
  }

  create(data: { score?: number; accuracy?: number } = {}) {
    const { width, height } = this.scale
    this.add.rectangle(0, 0, width, height, 0x000000, 0.5).setOrigin(0)
    this.add.text(width / 2, height * 0.4, 'Results', {
      fontFamily: 'HudFont, UiFont, sans-serif',
      fontSize: '36px',
      color: '#ffffff'
    }).setOrigin(0.5)

    this.add.text(
      width / 2,
      height * 0.55,
      `Score: ${data.score ?? 0}\nAccuracy: ${data.accuracy ?? 0}%`,
      { fontFamily: 'UiFont, sans-serif', fontSize: '18px', color: '#a0e9ff', align: 'center' }
    ).setOrigin(0.5)

    // Save to local leaderboard (prompt name once)
    const score = data.score ?? 0
    const trackId = (this.registry.get('selectedTrackId') as string) || 'unknown'
    const name = window.prompt('Enter your name for the leaderboard:', localStorage.getItem('bb_name') || 'AAA') || 'Anon'
    localStorage.setItem('bb_name', name)
    addScore({ name, trackId, score, date: Date.now() })

    const list = loadBoard().slice(0, 5)
    const text = list.map((e, i) => `${i + 1}. ${e.name.padEnd(8, ' ')}  ${e.score}`).join('\n')
    this.add.text(width / 2, height * 0.75, text, { fontFamily: 'UiFont, sans-serif', fontSize: '16px', color: '#fff', align: 'center' }).setOrigin(0.5)

    this.add.text(width / 2, height * 0.9, 'SPACE: Menu   R: Retry', { fontFamily: 'UiFont, sans-serif', fontSize: '16px', color: '#a0e9ff' }).setOrigin(0.5)
    this.input.keyboard!.once('keydown-SPACE', () => this.scene.start('MenuScene'))
    this.input.keyboard!.once('keydown-R', () => this.scene.start('GameScene'))
  }
}
