import easyPlaylist from '../config/waves/easy.json'
import normalPlaylist from '../config/waves/normal.json'
import hardPlaylist from '../config/waves/hard.json'
import { WavePlaylist } from '../types/waves'
import { DifficultyProfileId } from '../config/difficultyProfiles'

const library: Record<DifficultyProfileId, WavePlaylist> = {
  easy: easyPlaylist as WavePlaylist,
  normal: normalPlaylist as WavePlaylist,
  hard: hardPlaylist as WavePlaylist
}

export function getWavePlaylist(profileId: DifficultyProfileId): WavePlaylist {
  return library[profileId]
}
