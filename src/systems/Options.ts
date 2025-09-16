export type Options = {
  musicVolume: number // 0..1
  sfxVolume: number // 0..1
  metronome: boolean
  highContrast: boolean
  shaderEnabled: boolean
  inputOffsetMs: Record<string, number> // per track id
  fireMode: 'click' | 'hold_raw' | 'hold_quantized'
}

const KEY = 'bb_options_v1'

export function loadOptions(): Options {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return {
    musicVolume: 0.8,
    sfxVolume: 0.8,
    metronome: false,
    highContrast: false,
    shaderEnabled: true,
    inputOffsetMs: {},
    fireMode: 'click'
  }
}

export function saveOptions(opts: Options) {
  localStorage.setItem(KEY, JSON.stringify(opts))
}
