export type Options = {
  musicVolume: number // 0..1
  sfxVolume: number // 0..1
  announcerEnabled: boolean
  metronome: boolean
  highContrast: boolean
  shaderEnabled: boolean
  inputOffsetMs: Record<string, number> // per track id
  fireMode: 'click' | 'hold_raw' | 'hold_quantized'
  backgroundMode: 'dual' | 'classic' | 'aurora' | 'city' | 'ocean' | 'tunnel'
}

const KEY = 'bb_options_v1'

export function loadOptions(): Options {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Options>
      return {
        musicVolume: parsed.musicVolume ?? 0.8,
        sfxVolume: parsed.sfxVolume ?? 0.8,
        announcerEnabled: parsed.announcerEnabled ?? true,
        metronome: parsed.metronome ?? false,
        highContrast: parsed.highContrast ?? false,
        shaderEnabled: parsed.shaderEnabled ?? true,
        inputOffsetMs: parsed.inputOffsetMs ?? {},
        fireMode: parsed.fireMode ?? 'click',
        backgroundMode: (parsed.backgroundMode as Options['backgroundMode']) ?? 'dual'
      }
    }
  } catch {}
  return {
    musicVolume: 0.8,
    sfxVolume: 0.8,
    announcerEnabled: true,
    metronome: false,
    highContrast: false,
    shaderEnabled: true,
    inputOffsetMs: {},
    fireMode: 'click',
    backgroundMode: 'dual'
  }
}

export function saveOptions(opts: Options) {
  localStorage.setItem(KEY, JSON.stringify(opts))
}
