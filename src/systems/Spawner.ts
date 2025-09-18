import Phaser from 'phaser'
import CubeSkin from '../systems/CubeSkin'
import { enemyStyles, EnemyType } from '../config/enemyStyles'

export type Enemy = Phaser.Types.Physics.Arcade.SpriteWithDynamicBody

export default class Spawner {
  private scene: Phaser.Scene
  private group: Phaser.Physics.Arcade.Group

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.group = this.scene.physics.add.group({ classType: Phaser.Physics.Arcade.Sprite })
  }

  spawn(type: EnemyType, count = 1) {
    for (let i = 0; i < count; i++) {
      const { x, y } = this.randomOffscreen()
      const placeholderFrame = type === 'brute' ? 'enemy_brute_0' : type === 'dasher' ? 'enemy_dasher_0' : 'enemy_swarm_0'
      const s = this.group.get(x, y, 'gameplay', placeholderFrame) as Enemy
      s.setActive(true).setVisible(true)
      s.body.enable = true
      s.setData('etype', type)

      const healthBar = this.scene.add.graphics()
      s.setData('healthBar', healthBar)
      // Initialize HP from balance registry if present
      try {
        const balance = this.scene.registry.get('balance') as any
        const hp = balance?.enemies?.[type]?.hp ?? (type === 'brute' ? 6 : type === 'dasher' ? 3 : 1)
 
        s.setData('hp', hp)
      } catch {}
      const style = enemyStyles[type]
      s.body.setCircle(style.bodyRadius)
      // Move towards center
      const { width, height } = this.scene.scale
      const ang = Phaser.Math.Angle.Between(x, y, width / 2, height / 2)
      const speed = (type === 'swarm' ? 110 : type === 'dasher' ? 160 : 80) * 0.5
      s.body.setVelocity(Math.cos(ang) * speed, Math.sin(ang) * speed)
      const uid = Phaser.Utils.String.UUID()
s.setData('eid', uid)
    const skin = new CubeSkin(this.scene, s, style)
    s.setData('skin', skin)
    s.setData('pulseScale', style.pulseScale)
    }
  }

  private randomOffscreen() {
    const { width, height } = this.scene.scale
    const edge = Phaser.Math.Between(0, 3)
    const margin = 40
    if (edge === 0) return { x: Phaser.Math.Between(0, width), y: -margin }
    if (edge === 1) return { x: width + margin, y: Phaser.Math.Between(0, height) }
    if (edge === 2) return { x: Phaser.Math.Between(0, width), y: height + margin }
    return { x: -margin, y: Phaser.Math.Between(0, height) }
  }

  getGroup() {
    return this.group
  }
}
