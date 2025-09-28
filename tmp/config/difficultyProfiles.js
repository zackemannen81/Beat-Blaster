const profiles = {
    easy: {
        id: 'easy',
        label: 'Easy',
        description: 'Gentle pacing with generous telegraphs and capped heavy waves for onboarding.',
        baseScrollSpeed: 120,
        baseSpawnRate: 0.1,
        baseEnemyHpMultiplier: 0.5,
        baseBossHpMultiplier: 0.9,
        waveDelayMs: 380,
        waveRepeatCooldownMs: 1600,
        fallbackCooldownMs: 62000,
        wavePlaylistId: 'easy',
        laneCount: 4,
        missPenalty: 0,
        bossMissPenalty: 80,
        categoryCooldowns: {
            light: 0,
            standard: 900,
            heavy: 3600,
            boss: 5200
        },
        heavyControls: {
            cooldownMs: 5200,
            windowMs: 14000,
            maxInWindow: 1,
            maxSimultaneous: 1
        },
        stageTuning: [
            { stage: 1, scrollMultiplier: 0.85, spawnMultiplier: 0.7, enemyHpMultiplier: 0.9, bossHpMultiplier: 0.95, enemyCap: 8, maxQueuedWaves: 2 },
            { stage: 2, scrollMultiplier: 0.92, spawnMultiplier: 0.8, enemyHpMultiplier: 0.98, bossHpMultiplier: 1, enemyCap: 12, maxQueuedWaves: 2 },
            { stage: 3, scrollMultiplier: 0.98, spawnMultiplier: 0.9, enemyHpMultiplier: 1.05, bossHpMultiplier: 1.08, enemyCap: 14, maxQueuedWaves: 3 },
            { stage: 4, scrollMultiplier: 1.02, spawnMultiplier: 0.95, enemyHpMultiplier: 1.12, bossHpMultiplier: 1.15, enemyCap: 16, maxQueuedWaves: 3 }
        ]
    },
    normal: {
        id: 'normal',
        label: 'Normal',
        description: 'Baseline Beat-Blaster pacing with moderate heavy cadence and standard penalties.',
        baseScrollSpeed: 140,
        baseSpawnRate: 0.5,
        baseEnemyHpMultiplier: 1,
        baseBossHpMultiplier: 1,
        waveDelayMs: 340,
        waveRepeatCooldownMs: 1400,
        fallbackCooldownMs: 56000,
        wavePlaylistId: 'normal',
        laneCount: 6,
        missPenalty: 50,
        bossMissPenalty: 120,
        categoryCooldowns: {
            light: 0,
            standard: 750,
            heavy: 3200,
            boss: 4800
        },
        heavyControls: {
            cooldownMs: 4200,
            windowMs: 12000,
            maxInWindow: 2,
            maxSimultaneous: 2
        },
        stageTuning: [
            { stage: 1, scrollMultiplier: 0.95, spawnMultiplier: 0.85, enemyHpMultiplier: 1, bossHpMultiplier: 1, enemyCap: 16, maxQueuedWaves: 3 },
            { stage: 2, scrollMultiplier: 1, spawnMultiplier: 0.95, enemyHpMultiplier: 1.08, bossHpMultiplier: 1.1, enemyCap: 18, maxQueuedWaves: 3 },
            { stage: 3, scrollMultiplier: 1.05, spawnMultiplier: 1.05, enemyHpMultiplier: 1.16, bossHpMultiplier: 1.2, enemyCap: 20, maxQueuedWaves: 4 },
            { stage: 4, scrollMultiplier: 1.1, spawnMultiplier: 1.15, enemyHpMultiplier: 1.25, bossHpMultiplier: 1.32, enemyCap: 22, maxQueuedWaves: 4 }
        ]
    },
    hard: {
        id: 'hard',
        label: 'Hard',
        description: 'Fast scroll, dense formations, and aggressive heavy cadence for veterans.',
        baseScrollSpeed: 155,
        baseSpawnRate: 1.1,
        baseEnemyHpMultiplier: 1.2,
        baseBossHpMultiplier: 1.35,
        waveDelayMs: 300,
        waveRepeatCooldownMs: 1200,
        fallbackCooldownMs: 5200,
        wavePlaylistId: 'hard',
        laneCount: 7,
        missPenalty: 65,
        bossMissPenalty: 160,
        categoryCooldowns: {
            light: 0,
            standard: 650,
            heavy: 2800,
            boss: 4400
        },
        heavyControls: {
            cooldownMs: 3600,
            windowMs: 10000,
            maxInWindow: 2,
            maxSimultaneous: 2
        },
        stageTuning: [
            { stage: 1, scrollMultiplier: 1.05, spawnMultiplier: 1.05, enemyHpMultiplier: 1.2, bossHpMultiplier: 1.38, enemyCap: 20, maxQueuedWaves: 4, maxSimultaneousHeavy: 2 },
            { stage: 2, scrollMultiplier: 1.1, spawnMultiplier: 1.15, enemyHpMultiplier: 1.3, bossHpMultiplier: 1.48, enemyCap: 22, maxQueuedWaves: 4, maxSimultaneousHeavy: 2 },
            { stage: 3, scrollMultiplier: 1.18, spawnMultiplier: 1.25, enemyHpMultiplier: 1.4, bossHpMultiplier: 1.6, enemyCap: 24, maxQueuedWaves: 5, maxSimultaneousHeavy: 3, heavyCooldownMs: 3200 },
            { stage: 4, scrollMultiplier: 1.25, spawnMultiplier: 1.32, enemyHpMultiplier: 1.55, bossHpMultiplier: 1.75, enemyCap: 26, maxQueuedWaves: 5, maxSimultaneousHeavy: 3, heavyCooldownMs: 3000 }
        ]
    },
    wip: {
        id: 'wip',
        label: 'wip',
        description: 'Gentle pacing with generous telegraphs and capped heavy waves for onboarding.',
        baseScrollSpeed: 120,
        baseSpawnRate: 0.1,
        baseEnemyHpMultiplier: 0.2,
        baseBossHpMultiplier: 0.5,
        waveDelayMs: 3800,
        waveRepeatCooldownMs: 16000,
        fallbackCooldownMs: 62000,
        wavePlaylistId: 'easy',
        laneCount: 4,
        missPenalty: 0,
        bossMissPenalty: 80,
        categoryCooldowns: {
            light: 0,
            standard: 900,
            heavy: 3600,
            boss: 5200
        },
        heavyControls: {
            cooldownMs: 5200,
            windowMs: 14000,
            maxInWindow: 1,
            maxSimultaneous: 1
        },
        stageTuning: [
            { stage: 1, scrollMultiplier: 0.85, spawnMultiplier: 0.7, enemyHpMultiplier: 0.9, bossHpMultiplier: 0.95, enemyCap: 8, maxQueuedWaves: 2 },
            { stage: 2, scrollMultiplier: 0.92, spawnMultiplier: 0.8, enemyHpMultiplier: 0.98, bossHpMultiplier: 1, enemyCap: 12, maxQueuedWaves: 2 },
            { stage: 3, scrollMultiplier: 0.98, spawnMultiplier: 0.9, enemyHpMultiplier: 1.05, bossHpMultiplier: 1.08, enemyCap: 14, maxQueuedWaves: 3 },
            { stage: 4, scrollMultiplier: 1.02, spawnMultiplier: 0.95, enemyHpMultiplier: 1.12, bossHpMultiplier: 1.15, enemyCap: 16, maxQueuedWaves: 3 }
        ]
    }
};
export function getDifficultyProfile(id) {
    if (!id)
        return profiles.normal;
    const key = id.toLowerCase();
    return profiles[key] ?? profiles.normal;
}
export function listDifficultyProfiles() {
    return Object.values(profiles);
}
