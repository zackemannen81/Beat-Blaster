import Phaser from 'phaser';
export default class HUD {
    constructor(scene) {
        this.hearts = [];
        this.powerupSlots = new Map();
        this.powerupOrder = ['shield', 'rapid', 'split', 'slowmo'];
        this.powerupPalette = {
            shield: 0x74d0ff,
            rapid: 0xff6b6b,
            split: 0xba68ff,
            slowmo: 0x78ffbc
        };
        this.reducedMotion = false;
        this.stageValue = 1;
        this.difficultyLabel = '';
        this.upcomingWaveInfo = null;
        this.scene = scene;
    }
    create() {
        const { width, height } = this.scene.scale;
        this.scoreText = this.scene.add.text(16, 10, 'Score: 0', { fontFamily: 'UiFont, sans-serif', fontSize: '16px', color: '#fff' });
        this.multText = this.scene.add.text(width / 2, 10, 'x1.0', { fontFamily: 'UiFont, sans-serif', fontSize: '18px', color: '#a0e9ff' }).setOrigin(0.5, 0);
        this.accText = this.scene.add.text(width - 160, 10, 'Acc: 0%', { fontFamily: 'UiFont, sans-serif', fontSize: '14px', color: '#fff' });
        this.bombBarBg = this.scene.add.rectangle(width - 160, 20, 120, 10, 0x333333).setOrigin(0, 0);
        this.bombBarFill = this.scene.add.rectangle(width - 160, 20, 0, 10, 0x00e5ff).setOrigin(0, 0);
        this.comboText = this.scene.add.text(width / 2, 40, '', { fontFamily: 'UiFont, sans-serif', fontSize: '24px', color: '#ffb300' }).setOrigin(0.5, 0);
        this.stageText = this.scene.add.text(16, 60, 'Stage 1', { fontFamily: 'UiFont, sans-serif', fontSize: '18px', color: '#9ad2ff' });
        this.crosshairText = this.scene.add.text(16, 84, 'Crosshair: Pointer', { fontFamily: 'UiFont, sans-serif', fontSize: '16px', color: '#9ad2ff' });
        this.upcomingWaveText = this.scene.add.text(16, 108, '', { fontFamily: 'UiFont, sans-serif', fontSize: '16px', color: '#ffd866' });
        this.telegraphText = this.scene.add.text(16, 130, '', { fontFamily: 'UiFont, sans-serif', fontSize: '15px', color: '#ff5db1' });
        this.upcomingWaveText.setVisible(false);
        this.telegraphText.setVisible(false);
        this.bpmText = this.scene.add.text(width - 160, 34, 'BPM: 0', { fontFamily: 'UiFont, sans-serif', fontSize: '14px', color: '#9ad2ff' });
        this.laneText = this.scene.add.text(width - 160, 52, 'Lanes: 0', { fontFamily: 'UiFont, sans-serif', fontSize: '14px', color: '#9ad2ff' });
        this.bossContainer = this.scene.add.container(width / 2, 80).setVisible(false).setDepth(40);
        const bossBg = this.scene.add.rectangle(0, 0, 240, 18, 0x000000, 0.45).setOrigin(0.5);
        this.bossBarBg = this.scene.add.rectangle(0, 0, 220, 10, 0xffffff, 0.18).setOrigin(0.5);
        this.bossBarFill = this.scene.add.rectangle(-110, 0, 220, 10, 0xff5db1, 0.85).setOrigin(0, 0.5);
        this.bossLabel = this.scene.add.text(0, -18, 'BOSS', { fontFamily: 'UiFont, sans-serif', fontSize: '16px', color: '#ff5db1' }).setOrigin(0.5, 1);
        this.bossContainer.add([bossBg, this.bossBarBg, this.bossBarFill, this.bossLabel]);
        this.missText = this.scene.add.text(width / 2, height * 0.45, '', {
            fontFamily: 'UiFont, sans-serif',
            fontSize: '42px',
            color: '#ff5d5d',
            stroke: '#000',
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(60).setVisible(false);
        this.shotFeedback = this.scene.add.text(width / 2, height * 0.78, '', {
            fontFamily: 'UiFont, sans-serif',
            fontSize: '30px',
            color: '#66ffda',
            stroke: '#000',
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(55).setAlpha(0);
        this.scene.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
        this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.scene.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
        });
    }
    update(score, multiplier, accPct) {
        this.scoreText.setText(`Score: ${score}`);
        this.multText.setText(`x${multiplier.toFixed(1)}`);
        if (typeof accPct === 'number')
            this.accText.setText(`Acc: ${accPct.toFixed(0)}%`);
        this.updatePowerupPanel();
        this.updateUpcoming(this.scene.time.now);
    }
    setupHearts(maxHp) {
        this.hearts.forEach((h) => h.destroy());
        this.hearts = [];
        for (let i = 0; i < maxHp; i++) {
            const img = this.scene.add.image(16 + i * 24, 42, 'ui', 'heart_empty').setOrigin(0, 0);
            this.hearts.push(img);
        }
    }
    setHp(hp) {
        this.hearts.forEach((img, idx) => img.setFrame(idx < hp ? 'heart_full' : 'heart_empty'));
    }
    setBombCharge(pct) {
        if (this.bombBarFill)
            this.bombBarFill.width = 120 * Phaser.Math.Clamp(pct, 0, 1);
    }
    setCombo(_count) {
        const count = Math.max(0, _count);
        if (count <= 1) {
            this.comboText.setVisible(false);
            return;
        }
        this.comboText.setVisible(true);
        this.comboText.setText(`Combo x${count}`);
        if (this.reducedMotion) {
            this.comboText.setAlpha(1);
            return;
        }
        this.comboText.setAlpha(1);
        this.scene.tweens.killTweensOf(this.comboText);
        this.scene.tweens.add({
            targets: this.comboText,
            alpha: 0.2,
            yoyo: true,
            duration: 180,
            repeat: 1
        });
    }
    setBpm(bpm) {
        if (!this.bpmText)
            return;
        const rounded = Math.max(0, Math.round(bpm));
        this.bpmText.setText(`BPM: ${rounded}`);
    }
    setLaneCount(count) {
        if (!this.laneText)
            return;
        const clamped = Math.max(0, Math.floor(count));
        this.laneText.setText(`Lanes: ${clamped}`);
    }
    showShotFeedback(quality, accuracy) {
        if (!this.shotFeedback)
            return;
        let text = 'On Beat';
        let color = '#9ad2ff';
        if (quality === 'perfect') {
            text = 'Perfect!';
            color = '#66ffda';
        }
        else if (accuracy === 'Good') {
            text = 'Good';
            color = '#ffd866';
        }
        this.shotFeedback.setText(text);
        this.shotFeedback.setColor(color);
        this.shotFeedback.setAlpha(1);
        this.shotFeedback.setScale(1);
        this.scene.tweens.killTweensOf(this.shotFeedback);
        const targetScale = quality === 'perfect' ? 1.25 : 1.1;
        const duration = quality === 'perfect' ? 260 : 200;
        this.scene.tweens.add({
            targets: this.shotFeedback,
            alpha: 0,
            scale: targetScale,
            duration,
            ease: 'Sine.easeOut'
        });
    }
    setStage(stage) {
        this.stageValue = stage;
        const suffix = this.difficultyLabel ? ` – ${this.difficultyLabel}` : '';
        this.stageText.setText(`Stage ${stage}${suffix}`);
    }
    setBossHealth(fraction, label = 'BOSS') {
        if (fraction === null) {
            this.bossContainer.setVisible(false);
            return;
        }
        const clamped = Phaser.Math.Clamp(fraction, 0, 1);
        this.bossContainer.setVisible(true);
        this.bossLabel.setText(label.toUpperCase());
        this.bossBarFill.width = this.bossBarBg.width * clamped;
    }
    showMissFeedback(text = 'Miss!') {
        this.missText.setText(text);
        this.missText.setVisible(true);
        this.missText.setAlpha(1);
        this.missText.setScale(1);
        if (this.missResetTimer)
            this.missResetTimer.remove(false);
        if (this.reducedMotion) {
            this.missResetTimer = this.scene.time.delayedCall(400, () => this.missText.setVisible(false));
            return;
        }
        this.scene.tweens.killTweensOf(this.missText);
        this.scene.tweens.add({
            targets: this.missText,
            alpha: 0,
            scale: 0.8,
            duration: 380,
            ease: 'Cubic.easeOut',
            onComplete: () => this.missText.setVisible(false)
        });
    }
    setReducedMotion(flag) {
        this.reducedMotion = flag;
        if (flag) {
            this.comboText.setAlpha(1);
        }
    }
    setDifficultyLabel(label) {
        this.difficultyLabel = label;
        this.setStage(this.stageValue);
    }
    setCrosshairMode(mode) {
        const label = mode === 'pointer' ? 'Pointer' : mode === 'fixed' ? 'Fixed' : 'Pad-Relative';
        if (this.crosshairText)
            this.crosshairText.setText(`Crosshair: ${label}`);
    }
    setUpcomingWave(info) {
        this.upcomingWaveInfo = info;
        const suffix = info.fallback ? ' [fallback]' : '';
        this.upcomingWaveText.setText(`Next Wave: ${info.label}${suffix}`);
        this.upcomingWaveText.setVisible(true);
    }
    clearUpcomingWave() {
        this.upcomingWaveInfo = null;
        this.upcomingWaveText.setVisible(false);
    }
    updateUpcoming(now) {
        if (!this.upcomingWaveInfo)
            return;
        const remaining = Math.max(0, this.upcomingWaveInfo.spawnAt - now);
        const seconds = (remaining / 1000).toFixed(1);
        this.upcomingWaveText.setText(`Next Wave: ${this.upcomingWaveInfo.label} (${seconds}s)`);
        if (remaining <= 0)
            this.clearUpcomingWave();
    }
    setTelegraphMessage(text) {
        this.telegraphText.setText(text);
        this.telegraphText.setVisible(true);
    }
    clearTelegraphMessage() {
        this.telegraphText.setVisible(false);
    }
    bindPowerups(powerups) {
        if (this.powerups === powerups)
            return;
        if (this.powerups) {
            this.powerups.off('powerup', this.handlePowerupEvent, this);
        }
        this.powerups = powerups;
        powerups.on('powerup', this.handlePowerupEvent, this);
        this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            powerups.off('powerup', this.handlePowerupEvent, this);
        });
    }
    handlePowerupEvent(event) {
        const slot = this.powerupSlots.get(event.type) ?? this.createPowerupSlot(event.type);
        slot.durationMs = event.durationMs > 0 ? event.durationMs : Math.max(event.remainingMs, slot.durationMs);
        slot.container.setAlpha(1);
        slot.container.setVisible(true);
        slot.timerText.setText(`${(event.remainingMs / 1000).toFixed(1)}s`);
        this.updatePowerupPanel();
    }
    createPowerupSlot(type) {
        const { width } = this.scene.scale;
        const container = this.scene.add.container(width - 16, 60);
        container.setDepth(40);
        const bg = this.scene.add.rectangle(0, 0, 150, 38, 0x000000, 0.45).setOrigin(1, 0);
        const icon = this.scene.add.image(-128, 19, `powerup_badge_${type}`).setOrigin(0.5);
        icon.setScale(0.85);
        const label = this.scene.add.text(-104, 6, type.toUpperCase(), {
            fontFamily: 'UiFont, sans-serif',
            fontSize: '14px',
            color: '#ffffff'
        }).setOrigin(0, 0);
        const timerText = this.scene.add.text(-30, 6, '0.0s', {
            fontFamily: 'UiFont, sans-serif',
            fontSize: '14px',
            color: '#ffffff'
        }).setOrigin(1, 0);
        const barBg = this.scene.add.rectangle(-128, 28, 110, 6, 0xffffff, 0.2).setOrigin(0, 0.5);
        const barFill = this.scene.add.rectangle(-128, 28, 110, 6, this.powerupPalette[type], 0.9).setOrigin(0, 0.5);
        container.add([bg, barBg, barFill, icon, label, timerText]);
        const slot = {
            container,
            icon,
            label,
            timerText,
            barBg,
            barFill,
            type,
            durationMs: this.powerups?.getDurationMs(type) ?? 0
        };
        this.powerupSlots.set(type, slot);
        this.layoutPowerupSlots();
        return slot;
    }
    updatePowerupPanel() {
        if (!this.powerups)
            return;
        let layoutDirty = false;
        for (const type of this.powerupOrder) {
            const slot = this.powerupSlots.get(type);
            if (!slot)
                continue;
            const remaining = this.powerups.getRemainingMs(type);
            if (remaining <= 0) {
                if (slot.container.visible) {
                    slot.container.setVisible(false);
                    slot.container.setAlpha(0);
                    layoutDirty = true;
                }
                continue;
            }
            const duration = slot.durationMs > 0 ? slot.durationMs : this.powerups.getDurationMs(type);
            const fraction = duration > 0 ? Phaser.Math.Clamp(remaining / duration, 0, 1) : 0;
            slot.barFill.width = slot.barBg.width * fraction;
            slot.timerText.setText(`${(remaining / 1000).toFixed(1)}s`);
        }
        if (layoutDirty)
            this.layoutPowerupSlots();
    }
    layoutPowerupSlots() {
        const { width } = this.scene.scale;
        let index = 0;
        for (const type of this.powerupOrder) {
            const slot = this.powerupSlots.get(type);
            if (!slot || !slot.container.visible)
                continue;
            slot.container.setPosition(width - 16, 60 + index * 44);
            index++;
        }
    }
    handleResize() {
        const { width, height } = this.scene.scale;
        this.multText.setPosition(width / 2, 10);
        this.accText.setPosition(width - 160, 10);
        this.bombBarBg?.setPosition(width - 160, 20);
        this.bombBarFill?.setPosition(width - 160, 20);
        this.comboText.setPosition(width / 2, 40);
        this.stageText.setPosition(16, 60);
        this.crosshairText.setPosition(16, 84);
        this.upcomingWaveText.setPosition(16, 108);
        this.telegraphText.setPosition(16, 130);
        this.bossContainer.setPosition(width / 2, 80);
        this.missText.setPosition(width / 2, height * 0.45);
        this.bpmText?.setPosition(width - 160, 34);
        this.laneText?.setPosition(width - 160, 52);
        this.shotFeedback?.setPosition(width / 2, height * 0.78);
        this.layoutPowerupSlots();
    }
}
