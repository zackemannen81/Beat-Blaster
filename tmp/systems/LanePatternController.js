import Phaser from 'phaser';
const DIFFICULTY_COUNT = {
    easy: 0.75,
    normal: 1,
    hard: 1.35,
    wip: 1
};
const DIFFICULTY_SPEED = {
    easy: 0.9,
    normal: 1,
    hard: 1.18,
    wip: 1
};
export default class LanePatternController {
    constructor(options) {
        this.beatIndex = 0;
        this.cycleIndex = 0;
        this.currentLaneCount = 3;
        this.sequence = 0;
        this.scene = options.scene;
        this.waveDirector = options.waveDirector;
        this.getLaneManager = options.getLaneManager;
        this.requestLaneCount = options.requestLaneCount;
        this.countMultiplier = DIFFICULTY_COUNT[options.difficulty.id];
        this.speedMultiplier = DIFFICULTY_SPEED[options.difficulty.id];
        this.stageCountMultiplier = Math.max(0.6, options.stage.spawnMultiplier ?? 1);
        this.stageSpeedMultiplier = Math.max(0.7, options.stage.scrollMultiplier ?? 1);
        this.pattern = buildPattern(options.difficulty.id);
    }
    handleBeat(band) {
        if (band !== 'low')
            return false;
        const step = this.pattern[this.beatIndex];
        if (step) {
            if (step.laneCount && step.laneCount !== this.currentLaneCount) {
                this.currentLaneCount = step.laneCount;
                this.requestLaneCount(step.laneCount, step.laneEffect);
            }
            const manager = this.getLaneManager();
            if (step.spawns) {
                for (const spawn of step.spawns) {
                    this.scheduleSpawn(spawn, manager);
                }
            }
            if (step.pulse) {
                this.scene.events.emit('lanes:pulse');
            }
        }
        this.beatIndex += 1;
        if (this.beatIndex >= this.pattern.length) {
            this.beatIndex = 0;
            this.cycleIndex += 1;
            this.sequence = 0;
        }
        return true;
    }
    updateStage(stage) {
        this.stageCountMultiplier = Math.max(0.6, stage.spawnMultiplier ?? 1);
        this.stageSpeedMultiplier = Math.max(0.7, stage.scrollMultiplier ?? 1);
    }
    resolveCount(base) {
        const scaled = Math.round(base * this.countMultiplier * this.stageCountMultiplier);
        return Math.max(1, scaled);
    }
    resolveSpeed(base) {
        const scaled = base * this.speedMultiplier * this.stageSpeedMultiplier;
        return Phaser.Math.Clamp(scaled, 0.45, 1.6);
    }
    scheduleSpawn(spawn, manager) {
        switch (spawn.kind) {
            case 'lane':
                this.scheduleLaneSpawn(spawn, manager);
                break;
            case 'lane_hopper':
                this.scheduleLaneHopper(spawn, manager);
                break;
            case 'weaver':
                this.scheduleWeaver(spawn);
                break;
            case 'teleporter':
                this.scheduleTeleporter(spawn, manager);
                break;
            case 'lane_flood':
                this.scheduleFlood(spawn, manager);
                break;
            case 'formation_dancer':
                this.scheduleFormation(spawn, manager);
                break;
            case 'burst':
                this.scheduleBurst(spawn);
                break;
            case 'mirrorer':
                this.scheduleMirror(spawn, manager);
                break;
        }
    }
    scheduleLaneSpawn(spawn, manager) {
        const lanes = Array.isArray(spawn.lanes) ? spawn.lanes : [spawn.lanes];
        lanes.forEach((laneRef) => {
            const laneIndex = this.resolveLaneIndex(laneRef, manager);
            const descriptor = {
                id: this.makeId('lane'),
                formation: 'lane',
                enemyType: spawn.enemyType,
                count: this.resolveCount(spawn.count),
                speedMultiplier: this.resolveSpeed(spawn.speed),
                hpMultiplier: spawn.hpMultiplier,
                formationParams: { laneIndex },
                category: spawn.category ?? 'standard'
            };
            this.waveDirector.scheduleDescriptor(descriptor, { respectAvailability: false, force: true });
        });
    }
    scheduleLaneHopper(spawn, manager) {
        const laneA = this.resolveLaneIndex(spawn.from, manager);
        const laneB = this.resolveLaneIndex(spawn.to, manager);
        const descriptor = {
            id: this.makeId('hopper'),
            formation: 'lane_hopper',
            enemyType: spawn.enemyType,
            speedMultiplier: this.resolveSpeed(spawn.speed),
            hpMultiplier: spawn.hpMultiplier,
            formationParams: { laneA, laneB, hopEveryBeats: spawn.hopEvery ?? 1 },
            category: spawn.category ?? 'standard'
        };
        this.waveDirector.scheduleDescriptor(descriptor, { respectAvailability: false, force: true });
    }
    scheduleWeaver(spawn) {
        const descriptor = {
            id: this.makeId('weaver'),
            formation: 'weaver',
            enemyType: spawn.enemyType,
            count: this.resolveCount(spawn.count),
            speedMultiplier: this.resolveSpeed(spawn.speed),
            hpMultiplier: spawn.hpMultiplier,
            formationParams: {
                amplitude: spawn.amplitude,
                wavelength: spawn.wavelength
            },
            category: spawn.category ?? 'standard'
        };
        this.waveDirector.scheduleDescriptor(descriptor, { respectAvailability: false, force: true });
    }
    scheduleTeleporter(spawn, manager) {
        const baseLaneRef = Array.isArray(spawn.lanes) ? spawn.lanes[0] : spawn.lanes ?? 'center';
        const laneIndex = this.resolveLaneIndex(baseLaneRef, manager);
        const descriptor = {
            id: this.makeId('teleporter'),
            formation: 'teleporter',
            enemyType: spawn.enemyType,
            count: this.resolveCount(spawn.count),
            speedMultiplier: this.resolveSpeed(spawn.speed),
            hpMultiplier: spawn.hpMultiplier,
            formationParams: {
                laneIndex
            },
            category: spawn.category ?? 'standard'
        };
        this.waveDirector.scheduleDescriptor(descriptor, { respectAvailability: false, force: true });
    }
    scheduleFlood(spawn, manager) {
        const laneIndex = this.resolveLaneIndex(spawn.lane, manager);
        const laneWidth = this.estimateLaneWidth(manager);
        const descriptor = {
            id: this.makeId('flood'),
            formation: 'lane_flood',
            enemyType: spawn.enemyType,
            speedMultiplier: this.resolveSpeed(spawn.speed),
            hpMultiplier: spawn.hpMultiplier,
            formationParams: {
                laneIndex,
                width: laneWidth * (spawn.widthRatio ?? 0.85),
                height: spawn.height ?? 160
            },
            category: spawn.category ?? 'heavy'
        };
        this.waveDirector.scheduleDescriptor(descriptor, { respectAvailability: false, force: true });
    }
    scheduleFormation(spawn, manager) {
        const laneIndex = this.resolveLaneIndex(spawn.lane ?? 'center', manager);
        const descriptor = {
            id: this.makeId('formation'),
            formation: 'formation_dancer',
            enemyType: spawn.enemyType,
            count: this.resolveCount(spawn.count),
            speedMultiplier: this.resolveSpeed(spawn.speed),
            hpMultiplier: spawn.hpMultiplier,
            formationParams: {
                laneIndex,
                spacing: spawn.spacing ?? 90
            },
            category: spawn.category ?? 'standard'
        };
        this.waveDirector.scheduleDescriptor(descriptor, { respectAvailability: false, force: true });
    }
    scheduleBurst(spawn) {
        const descriptor = {
            id: this.makeId('burst'),
            formation: 'burst',
            enemyType: spawn.enemyType,
            count: this.resolveCount(spawn.count),
            speedMultiplier: this.resolveSpeed(spawn.speed),
            hpMultiplier: spawn.hpMultiplier,
            formationParams: {
                coneDegrees: spawn.cone,
                ringCount: spawn.rings ?? 1
            },
            category: spawn.category ?? 'heavy'
        };
        this.waveDirector.scheduleDescriptor(descriptor, { respectAvailability: false, force: true });
    }
    scheduleMirror(spawn, manager) {
        const laneIndex = this.resolveLaneIndex('center', manager);
        const descriptor = {
            id: this.makeId('mirror'),
            formation: 'mirrorer',
            enemyType: spawn.enemyType,
            count: this.resolveCount(spawn.count),
            speedMultiplier: this.resolveSpeed(spawn.speed),
            hpMultiplier: spawn.hpMultiplier,
            formationParams: {
                laneIndex,
                spread: spawn.spread ?? 96
            },
            category: spawn.category ?? 'heavy'
        };
        this.waveDirector.scheduleDescriptor(descriptor, { respectAvailability: false });
    }
    resolveLaneIndex(ref, manager) {
        const laneCount = this.currentLaneCount;
        if (ref === 'edges')
            return 0;
        if (ref === 'outerPair')
            return 0;
        if (ref === 'innerPair')
            return laneCount > 3 ? 1 : 0;
        if (ref === 'random')
            return Phaser.Math.Between(0, laneCount - 1);
        const last = laneCount - 1;
        switch (ref) {
            case 'left':
            case 'outerLeft':
                return 0;
            case 'right':
            case 'outerRight':
                return last;
            case 'center':
                return Math.floor(laneCount / 2);
            case 'innerLeft':
                return laneCount >= 5 ? 1 : 0;
            case 'innerRight':
                return laneCount >= 5 ? last - 1 : last;
            case 'midLeft':
                return laneCount === 7 ? 2 : laneCount >= 5 ? 1 : 0;
            case 'midRight':
                return laneCount === 7 ? laneCount - 3 : laneCount >= 5 ? laneCount - 2 : last;
            default:
                return Math.floor(laneCount / 2);
        }
    }
    estimateLaneWidth(manager) {
        if (!manager)
            return this.scene.scale.width / this.currentLaneCount;
        const all = manager.getAll();
        if (all.length <= 1)
            return this.scene.scale.width / this.currentLaneCount;
        let sum = 0;
        for (let i = 1; i < all.length; i++) {
            sum += Math.abs(all[i].centerX - all[i - 1].centerX);
        }
        return sum / (all.length - 1);
    }
    makeId(prefix) {
        return `pattern_${this.cycleIndex}_${this.beatIndex}_${prefix}_${this.sequence++}`;
    }
}
function buildPattern(difficulty) {
    const teleporterCount = difficulty === 'hard' ? 3 : 2;
    const mirrorCount = difficulty === 'hard' ? 4 : 3;
    const dashCount = difficulty === 'hard' ? 4 : difficulty === 'normal' ? 3 : 2;
    return [
        {
            laneCount: 3,
            spawns: [
                { kind: 'lane_hopper', enemyType: 'brute', speed: 0.92, from: 'outerLeft', to: 'outerRight', hopEvery: 1 }
            ]
        },
        {
            spawns: [
                { kind: 'weaver', enemyType: 'weaver', speed: 0.86, count: 3, amplitude: 170, wavelength: 420 }
            ]
        },
        {
            spawns: [
                { kind: 'teleporter', enemyType: 'teleporter', speed: 0.8, count: teleporterCount }
            ]
        },
        {
            laneEffect: 'collapse',
            spawns: [
                { kind: 'lane', enemyType: 'swarm', speed: 0.78, lanes: 'center', count: 4 }
            ],
            pulse: true
        },
        {
            laneCount: 5,
            laneEffect: 'expand',
            spawns: [
                { kind: 'lane_flood', enemyType: 'flooder', speed: 0.6, lane: 'outerLeft', widthRatio: 0.8, height: 160 }
            ]
        },
        {
            spawns: [
                { kind: 'formation_dancer', enemyType: 'formation', speed: 0.88, lane: 'center', spacing: 90, count: 3 }
            ]
        },
        {
            spawns: [
                { kind: 'lane', enemyType: 'exploder', speed: 0.64, lanes: ['innerLeft', 'innerRight'], count: 2 }
            ]
        },
        {
            spawns: [
                { kind: 'lane', enemyType: 'dasher', speed: 1.18, lanes: ['outerLeft', 'outerRight'], count: dashCount }
            ]
        },
        {
            laneCount: 7,
            laneEffect: 'expand',
            spawns: [
                { kind: 'lane', enemyType: 'brute', speed: 0.7, lanes: 'center', count: 1, hpMultiplier: difficulty === 'hard' ? 1.6 : 1.3, category: 'heavy' }
            ]
        },
        {
            spawns: [
                { kind: 'burst', enemyType: 'swarm', speed: 1.05, count: 6, cone: 140, rings: 1 }
            ]
        },
        {
            spawns: [
                { kind: 'lane', enemyType: 'dasher', speed: 1.25, lanes: ['outerLeft', 'outerRight'], count: dashCount }
            ]
        },
        {
            spawns: [
                { kind: 'teleporter', enemyType: 'teleporter', speed: 0.95, count: teleporterCount + 1 }
            ]
        },
        {
            spawns: [
                { kind: 'mirrorer', enemyType: 'mirrorer', speed: 0.92, count: mirrorCount, spread: 100 }
            ]
        },
        {
            laneEffect: 'pulse',
            spawns: [
                { kind: 'lane_flood', enemyType: 'flooder', speed: 0.55, lane: 'center', widthRatio: 0.92, height: 190 }
            ]
        },
        {
            spawns: [
                { kind: 'lane', enemyType: 'exploder', speed: 0.68, lanes: ['innerLeft', 'innerRight'], count: 2 },
                { kind: 'teleporter', enemyType: 'teleporter', speed: 1, count: teleporterCount }
            ]
        },
        {
            laneCount: 3,
            laneEffect: 'collapse',
            spawns: [
                { kind: 'lane', enemyType: 'swarm', speed: 0.82, lanes: 'center', count: 5 }
            ],
            pulse: true
        }
    ];
}
