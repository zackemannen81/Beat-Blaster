import easyPlaylist from '../config/waves/easy.json'
import normalPlaylist from '../config/waves/normal.json'
import hardPlaylist from '../config/waves/hard.json'
import { WavePlaylist } from '../types/waves'
import { DifficultyProfileId } from '../config/difficultyProfiles'

function normalizePlaylist(fallbackId: DifficultyProfileId, raw: unknown): WavePlaylist {
  if (typeof raw === 'object' && raw !== null && 'waves' in (raw as any)) {
    const data = raw as { id?: string; waves?: unknown }
    return {
      id: typeof data.id === 'string' && data.id.length > 0 ? data.id : fallbackId,
      waves: Array.isArray(data.waves) ? (data.waves as any) : []
    }
  }
  return {
    id: fallbackId,
    waves: []
  }
}

const library: Record<DifficultyProfileId, WavePlaylist> = {
  easy: normalizePlaylist('easy', easyPlaylist),
  normal: normalizePlaylist('normal', normalPlaylist),
  hard: normalizePlaylist('hard', hardPlaylist)
}

export function getWavePlaylist(profileId: DifficultyProfileId): WavePlaylist {
  return library[profileId]
}
