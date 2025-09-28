import Phaser from 'phaser'
import { PowerupType } from './Powerups'

export type AnnouncerVoiceId = 'default' | 'bee' | 'cyborg'

type AnnouncerOptions = {
  enabled?: boolean
  voice?: AnnouncerVoiceId
}

const VOICE_CLIPS: Record<AnnouncerVoiceId, Record<string, string>> = {
  default: {
    powerup: 'announcer_powerup',
    shield: 'announcer_shield',
    rapid_fire: 'announcer_rapid_fire',
    split_shot: 'announcer_split_shot',
    slowmo: 'announcer_slowmo',
    bomb_ready: 'announcer_bomb_ready',
    combo: 'announcer_combo',
    new_game: 'announcer_new_game',
    get_ready: 'announcer_new_game',
    warning: 'announcer_warning',
    enemies_approching: 'announcer_enemies_approching'
  },
  bee: {
    powerup: 'announcer_bee_powerup',
    shield: 'announcer_bee_shield',
    rapid_fire: 'announcer_bee_rapid_fire',
    split_shot: 'announcer_bee_split_shot',
    slowmo: 'announcer_bee_slowmo',
    bomb_ready: 'announcer_bee_bomb_ready',
    combo: 'announcer_bee_wave',
    new_game: 'announcer_bee_new_game',
    get_ready: 'announcer_bee_get_ready',
    warning: 'announcer_bee_warning',
    enemies_approching: 'announcer_bee_enemies_approching',
    boss: 'announcer_bee_boss',
    enemy: 'announcer_bee_enemy'
  },
  cyborg: {
    powerup: 'announcer_cyborg_powerup',
    shield: 'announcer_cyborg_shield',
    rapid_fire: 'announcer_cyborg_rapid_fire',
    split_shot: 'announcer_cyborg_split_shot',
    slowmo: 'announcer_cyborg_slowmo',
    bomb_ready: 'announcer_cyborg_bomb_ready',
    combo: 'announcer_cyborg_combo_10',
    combo_10: 'announcer_cyborg_combo_10',
    combo_20: 'announcer_cyborg_combo_20',
    combo_30: 'announcer_cyborg_combo_30',
    new_game: 'announcer_cyborg_new_game',
    get_ready: 'announcer_cyborg_get_ready',
    warning: 'announcer_cyborg_warning',
    enemies_approching: 'announcer_cyborg_enemies_approching',
    boss: 'announcer_cyborg_boss',
    enemy: 'announcer_cyborg_enemy',
    stage_clear: 'announcer_cyborg_stage_clear',
    lane_expand: 'announcer_cyborg_lane_expand',
    lane_collapse: 'announcer_cyborg_lane_collapse',
    lane_pulse: 'announcer_cyborg_lane_pulse',
    enemy_swarm: 'announcer_cyborg_enemy_swarm',
    enemy_weaver: 'announcer_cyborg_enemy_weaver',
    enemy_mirrorer: 'announcer_cyborg_enemy_mirrorer',
    enemy_teleporter: 'announcer_cyborg_enemy_teleporter',
    enemy_flooder: 'announcer_cyborg_enemy_flooder',
    enemy_dasher: 'announcer_cyborg_enemy_dasher',
    enemy_exploder: 'announcer_cyborg_enemy_exploder',
    enemy_brute: 'announcer_cyborg_enemy_brute',
    enemy_formation: 'announcer_cyborg_enemy_formation',
    telegraph_zone: 'announcer_cyborg_telegraph_zone',
    telegraph_line: 'announcer_cyborg_telegraph_line',
    telegraph_circle: 'announcer_cyborg_telegraph_circle',
    wave_heavy: 'announcer_cyborg_wave_heavy',
    wave_boss: 'announcer_cyborg_wave_boss',
    player_low_hp: 'announcer_cyborg_player_low_hp',
    bomb_deployed: 'announcer_cyborg_bomb_deployed',
    game_over: 'announcer_cyborg_game_over',
    analyzer_fallback: 'announcer_cyborg_analyzer_fallback',
    analyzer_resync: 'announcer_cyborg_analyzer_resync'
  }
}

export default class Announcer {
  private scene: Phaser.Scene
  private getVolume: () => number
  private enabled = true
  private current?: Phaser.Sound.BaseSound
  private currentPriority = 0
  private cooldownUntil = 0
  private currentCleanup?: () => void
  private voice: AnnouncerVoiceId

  private powerupTypes: Record<PowerupType, string> = {
    shield: 'shield',
    rapid: 'rapid_fire',
    split: 'split_shot',
    slowmo: 'slowmo'
  }

  constructor(scene: Phaser.Scene, getVolume: () => number, options: AnnouncerOptions = {}) {
    this.scene = scene
    this.getVolume = getVolume
    this.enabled = options.enabled !== false
    this.voice = options.voice ?? 'default'
  }

  setEnabled(flag: boolean) {
    this.enabled = flag
    if (!flag) this.stop()
  }

  setVoice(voice: AnnouncerVoiceId) {
    this.voice = voice
  }

  stop() {
    if (this.currentCleanup) {
      this.currentCleanup()
      this.currentCleanup = undefined
    }
  }

  destroy() {
    this.stop()
  }

  playPowerup(type: PowerupType) {
    const typeKey = this.powerupTypes[type]
    if (!typeKey) return
    this.playClip('powerup', 2, () => {
      this.playClip(typeKey, 1)
    })
  }

  playBombReady() {
    this.playClip('bomb_ready', 3)
  }

  playCombo(combo: number) {
    if (combo <= 0 || combo % 10 !== 0) return
    const milestoneKey = combo >= 30 ? 'combo_30' : combo >= 20 ? 'combo_20' : 'combo_10'
    if (this.playClip(milestoneKey, 1)) return
    this.playClip('combo', 1)
  }

  playEvent(event: 'new_game' | 'warning' | 'enemies' | 'boss' | 'enemy' | 'get_ready') {
    switch (event) {
      case 'new_game':
        this.playClip('new_game', 0)
        break
      case 'warning':
        this.playClip('warning', 0)
        break
      case 'boss':
        this.playClip('boss', 0)
        break
      case 'enemy':
        this.playClip('enemy', 0)
        break
      case 'get_ready':
        this.playClip('get_ready', 0)
        break
      default:
        this.playClip('enemies_approching', 0)
        break
    }
  }

  playAudioKey(audioKey: string | undefined, priority = 1) {
    if (!audioKey) return
    const normalised = audioKey.replace(/^announcer(_bee)?_/i, '')
    if (this.playClip(normalised, priority)) return
    if (audioKey.startsWith('announcer')) {
      this.playKey(audioKey, priority)
      return
    }
    this.playClip(audioKey, priority)
  }

  private playClip(baseKey: string, priority: number, onComplete?: () => void): boolean {
    const keys = this.resolveClipKeys(baseKey)
    for (const key of keys) {
      if (this.scene.cache.audio.exists(key)) {
        this.playKey(key, priority, onComplete)
        return true
      }
    }
    return false
  }

  private resolveClipKeys(baseKey: string): string[] {
    const keys: string[] = []
    const voiceMap = VOICE_CLIPS[this.voice]
    const defaultMap = VOICE_CLIPS.default
    const trimmed = baseKey.startsWith('announcer_') ? baseKey.replace('announcer_', '') : baseKey
    const voiceKey = voiceMap?.[trimmed]
    if (voiceKey) keys.push(voiceKey)
    const defaultKey = defaultMap?.[trimmed]
    if (defaultKey) keys.push(defaultKey)
    const fallback = baseKey.startsWith('announcer_') ? baseKey : `announcer_${trimmed}`
    if (!keys.includes(fallback)) keys.push(fallback)
    return [...new Set(keys)]
  }

  private playKey(key: string, priority: number, onComplete?: () => void) {
    if (!this.enabled) return
    const volume = this.getVolume()
    if (volume <= 0) return
    const now = this.scene.time.now
    if (now < this.cooldownUntil && priority < this.currentPriority) return

    if (this.current) {
      if (priority < this.currentPriority) return
      this.currentCleanup?.()
      this.currentCleanup = undefined
    }

    if (!this.scene.cache.audio.exists(key)) return
    const sound = this.scene.sound.add(key)
    if (!sound) return

    let cleaned = false
    const cleanup = (fromEvent = false) => {
      if (cleaned) return
      cleaned = true
      sound.off(Phaser.Sound.Events.COMPLETE, handleComplete)
      sound.off(Phaser.Sound.Events.STOP, handleStop)
      if (!fromEvent && sound.isPlaying) sound.stop()
      sound.destroy()
      if (this.current === sound) {
        this.current = undefined
        this.currentPriority = 0
      }
      this.currentCleanup = undefined
    }
    const handleComplete = () => {
      cleanup(true)
      if (onComplete) onComplete()
    }
    const handleStop = () => {
      cleanup(true)
    }

    sound.once(Phaser.Sound.Events.COMPLETE, handleComplete)
    sound.once(Phaser.Sound.Events.STOP, handleStop)
    this.currentCleanup = () => cleanup()
    sound.play({ volume })
    this.current = sound
    this.currentPriority = priority
    this.cooldownUntil = now + 400
  }
}
