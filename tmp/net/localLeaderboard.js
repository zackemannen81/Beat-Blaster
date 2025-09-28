const KEY = 'beat_blaster_local_leaderboard';
export function loadBoard() {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw)
            return [];
        const arr = JSON.parse(raw);
        if (Array.isArray(arr))
            return arr;
    }
    catch { }
    return [];
}
export function saveBoard(list) {
    try {
        localStorage.setItem(KEY, JSON.stringify(list));
    }
    catch { }
}
export function addScore(entry) {
    const list = loadBoard();
    list.push(entry);
    list.sort((a, b) => b.score - a.score);
    saveBoard(list.slice(0, 100));
}
