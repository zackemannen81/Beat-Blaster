import Phaser from 'phaser';
const VOICE_CLIPS = {
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
    }
};
export default class Announcer {
    constructor(scene, getVolume, options = {}) {
        this.enabled = true;
        this.currentPriority = 0;
        this.cooldownUntil = 0;
        this.powerupTypes = {
            shield: 'shield',
            rapid: 'rapid_fire',
            split: 'split_shot',
            slowmo: 'slowmo'
        };
        this.scene = scene;
        this.getVolume = getVolume;
        this.enabled = options.enabled !== false;
        this.voice = options.voice ?? 'default';
    }
    setEnabled(flag) {
        this.enabled = flag;
        if (!flag)
            this.stop();
    }
    setVoice(voice) {
        this.voice = voice;
    }
    stop() {
        if (this.currentCleanup) {
            this.currentCleanup();
            this.currentCleanup = undefined;
        }
    }
    destroy() {
        this.stop();
    }
    playPowerup(type) {
        const typeKey = this.powerupTypes[type];
        if (!typeKey)
            return;
        this.playClip('powerup', 2, () => {
            this.playClip(typeKey, 1);
        });
    }
    playBombReady() {
        this.playClip('bomb_ready', 3);
    }
    playCombo(combo) {
        if (combo <= 0 || combo % 10 !== 0)
            return;
        this.playClip('combo', 1);
    }
    playEvent(event) {
        switch (event) {
            case 'new_game':
                this.playClip('new_game', 0);
                break;
            case 'warning':
                this.playClip('warning', 0);
                break;
            case 'boss':
                this.playClip('boss', 0);
                break;
            case 'enemy':
                this.playClip('enemy', 0);
                break;
            case 'get_ready':
                this.playClip('get_ready', 0);
                break;
            default:
                this.playClip('enemies_approching', 0);
                break;
        }
    }
    playAudioKey(audioKey, priority = 1) {
        if (!audioKey)
            return;
        const normalised = audioKey.replace(/^announcer(_bee)?_/i, '');
        if (this.playClip(normalised, priority))
            return;
        if (audioKey.startsWith('announcer')) {
            this.playKey(audioKey, priority);
            return;
        }
        this.playClip(audioKey, priority);
    }
    playClip(baseKey, priority, onComplete) {
        const keys = this.resolveClipKeys(baseKey);
        for (const key of keys) {
            if (this.scene.cache.audio.exists(key)) {
                this.playKey(key, priority, onComplete);
                return true;
            }
        }
        return false;
    }
    resolveClipKeys(baseKey) {
        const keys = [];
        const voiceMap = VOICE_CLIPS[this.voice];
        const defaultMap = VOICE_CLIPS.default;
        const trimmed = baseKey.startsWith('announcer_') ? baseKey.replace('announcer_', '') : baseKey;
        const voiceKey = voiceMap?.[trimmed];
        if (voiceKey)
            keys.push(voiceKey);
        const defaultKey = defaultMap?.[trimmed];
        if (defaultKey)
            keys.push(defaultKey);
        const fallback = baseKey.startsWith('announcer_') ? baseKey : `announcer_${trimmed}`;
        if (!keys.includes(fallback))
            keys.push(fallback);
        return [...new Set(keys)];
    }
    playKey(key, priority, onComplete) {
        if (!this.enabled)
            return;
        const volume = this.getVolume();
        if (volume <= 0)
            return;
        const now = this.scene.time.now;
        if (now < this.cooldownUntil && priority < this.currentPriority)
            return;
        if (this.current) {
            if (priority < this.currentPriority)
                return;
            this.currentCleanup?.();
            this.currentCleanup = undefined;
        }
        if (!this.scene.cache.audio.exists(key))
            return;
        const sound = this.scene.sound.add(key);
        if (!sound)
            return;
        let cleaned = false;
        const cleanup = (fromEvent = false) => {
            if (cleaned)
                return;
            cleaned = true;
            sound.off(Phaser.Sound.Events.COMPLETE, handleComplete);
            sound.off(Phaser.Sound.Events.STOP, handleStop);
            if (!fromEvent && sound.isPlaying)
                sound.stop();
            sound.destroy();
            if (this.current === sound) {
                this.current = undefined;
                this.currentPriority = 0;
            }
            this.currentCleanup = undefined;
        };
        const handleComplete = () => {
            cleanup(true);
            if (onComplete)
                onComplete();
        };
        const handleStop = () => {
            cleanup(true);
        };
        sound.once(Phaser.Sound.Events.COMPLETE, handleComplete);
        sound.once(Phaser.Sound.Events.STOP, handleStop);
        this.currentCleanup = () => cleanup();
        sound.play({ volume });
        this.current = sound;
        this.currentPriority = priority;
        this.cooldownUntil = now + 400;
    }
}
