export type ScoreEntry = { name: string; trackId: string; score: number; date: number }

const KEY = 'beat_blaster_local_leaderboard'

export function loadBoard(): ScoreEntry[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    if (Array.isArray(arr)) return arr
  } catch {}
  return []
}

export function saveBoard(list: ScoreEntry[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {}
}

export function addScore(entry: ScoreEntry) {
  const list = loadBoard()
  list.push(entry)
  list.sort((a, b) => b.score - a.score)
  saveBoard(list.slice(0, 100))
}

