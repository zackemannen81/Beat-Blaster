import Phaser from 'phaser'
import CubeSkin, { CubeVariant } from '../systems/CubeSkin' // <- importera

export type Enemy = Phaser.Types.Physics.Arcade.SpriteWithDynamicBody

export default class Spawner {
  private scene: Phaser.Scene
  private group: Phaser.Physics.Arcade.Group

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.group = this.scene.physics.add.group({ classType: Phaser.Physics.Arcade.Sprite })
  }

  spawn(type: 'brute' | 'dasher' | 'swarm', count = 1) {
    for (let i = 0; i < count; i++) {
      const frame = this.pickFrame(type)
      const { x, y } = this.randomOffscreen()
      const s = this.group.get(x, y, 'gameplay', frame) as Enemy
      s.setActive(true).setVisible(true).setScale(0.5)
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
      s.body.setCircle(Math.max(s.width, s.height) / 2)
      // Move towards center
      const { width, height } = this.scene.scale
      const ang = Phaser.Math.Angle.Between(x, y, width / 2, height / 2)
      const speed = (type === 'swarm' ? 110 : type === 'dasher' ? 160 : 80) * 0.5
      s.body.setVelocity(Math.cos(ang) * speed, Math.sin(ang) * speed)
      const uid = Phaser.Utils.String.UUID()
s.setData('eid', uid)
    // === NYTT: koppla på kub-skin ===
    const variant: CubeVariant =
      Math.random() < 0.34 ? 'solid' : (Math.random() < 0.5 ? 'wire' : 'plasma')
    const size = type === 'brute' ? 36 : (type === 'dasher' ? 28 : 22)
    const skin = new CubeSkin(this.scene, s, variant, size)
    s.setData('skin', skin)
    }
  }

  private pickFrame(type: 'brute' | 'dasher' | 'swarm') {
    switch (type) {
      case 'brute':
        return 'enemy_brute_0'
      case 'dasher':
        return 'enemy_dasher_0'
      case 'swarm':
        return 'enemy_swarm_0'
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
