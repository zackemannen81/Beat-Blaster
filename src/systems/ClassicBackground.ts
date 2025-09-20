import { SceneBackground } from './SceneBackground'
import Starfield from './Starfield'
import NeonGrid from './NeonGrid'
import AudioAnalyzer from './AudioAnalyzer'

export default class ClassicBackground implements SceneBackground {
  private scene: Phaser.Scene
  private starfield?: Starfield
  private grid?: NeonGrid

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  create() {
    this.starfield = new Starfield(this.scene)
    this.starfield.create()
    this.grid = new NeonGrid(this.scene)
    this.grid.create()
  }

  setAnalyzer(_analyzer?: AudioAnalyzer) {
    // Classic background renders without direct analyzer data
  }

  update(_time: number, delta: number) {
    this.starfield?.update(delta)
    this.grid?.update(delta)
  }

  destroy() {
    this.grid?.destroy()
    this.grid = undefined
    this.starfield?.destroy()
    this.starfield = undefined
  }
}
