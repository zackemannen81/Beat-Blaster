import AudioAnalyzer from './AudioAnalyzer'

export interface SceneBackground {
  create(): void
  update(time: number, delta: number): void
  setAnalyzer(analyzer?: AudioAnalyzer): void
  destroy(): void
}
