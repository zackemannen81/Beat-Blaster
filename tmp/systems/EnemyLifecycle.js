import Phaser from 'phaser';
export default class EnemyLifecycle {
    constructor(options) {
        this.activeEnemies = new Map();
        this.spawnTimes = new Map();
        this.scene = options.scene;
        this.spawner = options.spawner;
        this.waveDirector = options.waveDirector;
        this.boundsProvider = options.boundsProvider;
        this.onExpire = options.onExpire;
        this.timeoutMs = options.timeoutMs ?? 20000;
    }
    registerSpawn(enemies) {
        const now = this.scene.time.now;
        for (const enemy of enemies) {
            if (!enemy)
                continue;
            const id = enemy.getData('eid') ?? Phaser.Utils.String.UUID();
            enemy.setData('eid', id);
            this.activeEnemies.set(id, enemy);
            this.spawnTimes.set(id, now);
        }
    }
    notifyRemoved(enemy) {
        const id = enemy.getData('eid');
        if (!id)
            return;
        this.activeEnemies.delete(id);
        this.spawnTimes.delete(id);
    }
    update(now) {
        if (this.activeEnemies.size === 0)
            return;
        const { width, height, gameplayMode } = this.boundsProvider();
        const margin = 140;
        for (const [id, enemy] of Array.from(this.activeEnemies.entries())) {
            if (!enemy.active) {
                this.activeEnemies.delete(id);
                this.spawnTimes.delete(id);
                continue;
            }
            const body = enemy.body;
            if (!body)
                continue;
            const spawnAt = this.spawnTimes.get(id) ?? now;
            if (now - spawnAt > this.timeoutMs) {
                this.expire(enemy, 'timeout');
                continue;
            }
            const outOfBounds = this.isOutOfBounds(enemy, gameplayMode, width, height, margin);
            if (outOfBounds) {
                this.expire(enemy, outOfBounds);
            }
        }
        const actualActive = this.spawner.getGroup().countActive(true);
        if (actualActive !== this.activeEnemies.size) {
            this.resyncActiveSet();
        }
    }
    expire(enemy, cause) {
        this.notifyRemoved(enemy);
        this.onExpire(enemy, cause);
    }
    isOutOfBounds(enemy, mode, width, height, margin) {
        const x = enemy.x;
        const y = enemy.y;
        if (mode === 'vertical') {
            if (y > height + margin)
                return 'miss';
            if (y < -margin)
                return 'cull';
            if (x < -margin || x > width + margin)
                return 'cull';
            return false;
        }
        if (x < -margin || x > width + margin || y < -margin || y > height + margin) {
            return 'cull';
        }
        return false;
    }
    resyncActiveSet() {
        this.activeEnemies.clear();
        const now = this.scene.time.now;
        this.spawner
            .getGroup()
            .children.each((obj) => {
            const enemy = obj;
            if (!enemy.active)
                return true;
            const id = enemy.getData('eid') ?? Phaser.Utils.String.UUID();
            enemy.setData('eid', id);
            this.activeEnemies.set(id, enemy);
            if (!this.spawnTimes.has(id))
                this.spawnTimes.set(id, now);
            return true;
        });
    }
}
