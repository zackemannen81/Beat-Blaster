import easyPlaylist from '../config/waves/easy.json';
import normalPlaylist from '../config/waves/normal.json';
import hardPlaylist from '../config/waves/hard.json';
import wipPlaylist from '../config/waves/wip.json';
function normalizePlaylist(fallbackId, raw) {
    if (typeof raw === 'object' && raw !== null && 'waves' in raw) {
        const data = raw;
        return {
            id: typeof data.id === 'string' && data.id.length > 0 ? data.id : fallbackId,
            waves: Array.isArray(data.waves) ? data.waves : []
        };
    }
    return {
        id: fallbackId,
        waves: []
    };
}
const library = {
    easy: normalizePlaylist('easy', easyPlaylist),
    normal: normalizePlaylist('normal', normalPlaylist),
    hard: normalizePlaylist('hard', hardPlaylist),
    wip: normalizePlaylist('wip', wipPlaylist)
};
export function getWavePlaylist(profileId) {
    return library[profileId];
}
