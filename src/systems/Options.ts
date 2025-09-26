export type GameplayMode = 'omni' | 'vertical'

export type Options = {
  musicVolume: number // 0..1
  sfxVolume: number // 0..1
  metronome: boolean
  highContrast: boolean
  reducedMotion: boolean
  shaderEnabled: boolean
  inputOffsetMs: Record<string, number> // per track id
  fireMode: 'click' | 'hold_raw' | 'hold_quantized'
  gameplayMode: GameplayMode
  gamepadDeadzone: number
  gamepadSensitivity: number
  crosshairMode: 'pointer' | 'fixed' | 'pad-relative'
  verticalSafetyBand: boolean
  allowFallbackWaves: boolean
  unlockMouseAim: boolean
}

const KEY = 'bb_options_v1'

export const DEFAULT_OPTIONS: Options = {
  musicVolume: 0.8,
  sfxVolume: 0.8,
  metronome: false,
  highContrast: false,
  reducedMotion: false,
  shaderEnabled: true,
  inputOffsetMs: {},
  fireMode: 'click',
  gameplayMode: 'omni',
  gamepadDeadzone: 0.25,
  gamepadSensitivity: 1,
  crosshairMode: 'pointer',
  verticalSafetyBand: false,
  allowFallbackWaves: true,
  unlockMouseAim: false
}

const VALID_FIRE_MODES: Options['fireMode'][] = ['click', 'hold_raw', 'hold_quantized']
const VALID_CROSSHAIR_MODES: Options['crosshairMode'][] = ['pointer', 'fixed', 'pad-relative']

function normalizeGameplayMode(value: unknown): GameplayMode | null {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (['vertical', 'v', '1', 'true', 'yes'].includes(normalized)) return 'vertical'
    if (['omni', 'o', '0', 'false', 'no', 'horizontal'].includes(normalized)) return 'omni'
  } else if (typeof value === 'boolean') {
    return value ? 'vertical' : 'omni'
  } else if (typeof value === 'number') {
    return value > 0 ? 'vertical' : 'omni'
  }
  return null
}

function withDefaults(raw: Partial<Options> | null | undefined): Options {
  const merged = {
    ...DEFAULT_OPTIONS,
    ...(raw ?? {})
  }

  // Deep-merge input offsets to avoid dropping per-track overrides
  merged.inputOffsetMs = {
    ...DEFAULT_OPTIONS.inputOffsetMs,
    ...(raw?.inputOffsetMs ?? {})
  }

  merged.musicVolume = Number.isFinite(merged.musicVolume)
    ? Math.min(Math.max(merged.musicVolume, 0), 1)
    : DEFAULT_OPTIONS.musicVolume
  merged.sfxVolume = Number.isFinite(merged.sfxVolume)
    ? Math.min(Math.max(merged.sfxVolume, 0), 1)
    : DEFAULT_OPTIONS.sfxVolume
  merged.metronome = Boolean(merged.metronome)
  merged.highContrast = Boolean(merged.highContrast)
  merged.reducedMotion = Boolean(raw?.reducedMotion)
  merged.shaderEnabled = merged.shaderEnabled !== false

  if (!VALID_FIRE_MODES.includes(merged.fireMode)) merged.fireMode = DEFAULT_OPTIONS.fireMode

  const mode = normalizeGameplayMode((raw as any)?.gameplayMode)
  merged.gameplayMode = mode ?? DEFAULT_OPTIONS.gameplayMode

  const deadzone = typeof raw?.gamepadDeadzone === 'number' ? raw.gamepadDeadzone : DEFAULT_OPTIONS.gamepadDeadzone
  merged.gamepadDeadzone = Math.min(Math.max(deadzone, 0), 0.6)

  const sensitivity = typeof raw?.gamepadSensitivity === 'number' ? raw.gamepadSensitivity : DEFAULT_OPTIONS.gamepadSensitivity
  merged.gamepadSensitivity = Math.min(Math.max(sensitivity, 0.5), 2)

  const crosshair = typeof raw?.crosshairMode === 'string' ? raw.crosshairMode : DEFAULT_OPTIONS.crosshairMode
  merged.crosshairMode = VALID_CROSSHAIR_MODES.includes(crosshair as Options['crosshairMode'])
    ? (crosshair as Options['crosshairMode'])
    : DEFAULT_OPTIONS.crosshairMode

  merged.verticalSafetyBand = Boolean(raw?.verticalSafetyBand)
  merged.allowFallbackWaves = raw?.allowFallbackWaves !== false
  merged.unlockMouseAim = Boolean(raw?.unlockMouseAim)

  return merged
}

export function loadOptions(): Options {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return withDefaults(JSON.parse(raw))
  } catch {}
  return { ...DEFAULT_OPTIONS }
}

export function saveOptions(opts: Options) {
  localStorage.setItem(KEY, JSON.stringify(opts))
}

export type GameplayModeOverrideSource = 'query' | 'env' | 'global'

export type GameplayModeOverride = {
  mode: GameplayMode
  source: GameplayModeOverrideSource
}

export function detectGameplayModeOverride(): GameplayModeOverride | null {
  if (typeof window !== 'undefined') {
    try {
      const params = new URLSearchParams(window.location.search)
      const qpMode = params.get('mode')
      const normalized = normalizeGameplayMode(qpMode)
      if (normalized) {
        return { mode: normalized, source: 'query' }
      }
    } catch {}
  }

  try {
    const env = ((import.meta as any)?.env ?? {}) as Record<string, unknown>
    const envValue = env.VITE_VERTICAL_MODE ?? env.VERTICAL_MODE ?? env.verticalMode
    const normalized = normalizeGameplayMode(envValue)
    if (normalized) {
      return { mode: normalized, source: 'env' }
    }
  } catch {}

  if (typeof window !== 'undefined') {
    const globalValue = (window as any).VERTICAL_MODE ?? (window as any).verticalMode
    const normalized = normalizeGameplayMode(globalValue)
    if (normalized) {
      return { mode: normalized, source: 'global' }
    }
  }

  return null
}

export function resolveGameplayMode(baseMode: GameplayMode): GameplayMode {
  const override = detectGameplayModeOverride()
  return override ? override.mode : (normalizeGameplayMode(baseMode) ?? DEFAULT_OPTIONS.gameplayMode)
}
