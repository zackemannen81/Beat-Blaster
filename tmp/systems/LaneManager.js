// LaneManager.ts
// Hanterar lane-geometri (3/5/7), centerX-beräkning, "nearest", index-mapping och lane-byten.
// Emittar "lanes:changed" när antalet lanes ändras, så spelare/fiender kan tweena om.
// Phaser referens: ScaleManager (scene.scale), Scenes & Events (scene.events / EventEmitter).
// Tweens/easing som oftast används: Sine.InOut för mjuk snap. 
// Docs: ScaleManager, Scenes/Events, Tweens/Easing, Sprite/Physics. 
// (Se README/ROADMAP för integrationstips.)
import Phaser from 'phaser';
class LaneManager extends Phaser.Events.EventEmitter {
    constructor(cfg) {
        super();
        this.lanes = [];
        this.step = 0;
        this.scene = cfg.scene;
        this.count = cfg.count;
        this.left = cfg.left ?? 0;
        this.width = cfg.width ?? this.scene.scale.width;
        this.build();
        if (cfg.debug) {
            this.enableDebug(cfg.debugColor ?? 0x00ffff);
        }
        // Om canvasen resizas: uppdatera geometri (om du vill att lanes följer skalan)
        // Annars kan du ta bort detta om du kör fixed resolution.
        this.scene.scale.on(Phaser.Scale.Events.RESIZE, this.onResize, this);
    }
    destroy(fromScene) {
        this.scene.scale.off(Phaser.Scale.Events.RESIZE, this.onResize, this);
        this.disableDebug();
        super.removeAllListeners();
        super.destroy?.();
    }
    /** Återuppbygger lanes när count/width ändras. */
    build() {
        // "Steg" mellan centers = width / (count + 1) (ger luft i kanterna)
        this.step = this.width / (this.count + 1);
        this.lanes = [];
        for (let i = 0; i < this.count; i++) {
            const rawCenter = this.left + this.step * (i + 1);
            const centerX = Math.round(rawCenter);
            this.lanes.push({ index: i, centerX });
        }
        this.emit(LaneManager.EVT_CHANGED, this.getSnapshot());
        this.redrawDebug();
    }
    /** Byt antal lanes (3/5/7) – triggar EVT_CHANGED. */
    rebuild(count, opts) {
        this.count = count;
        if (typeof opts?.left === 'number')
            this.left = opts.left;
        if (typeof opts?.width === 'number')
            this.width = opts.width;
        this.build();
    }
    /** Returnerar en shallow-kopia av lanes + metadata (för HUD). */
    getSnapshot() {
        return {
            count: this.count,
            left: this.left,
            width: this.width,
            lanes: this.lanes.map(l => ({ ...l }))
        };
    }
    getCount() {
        return this.count;
    }
    getAll() {
        return this.lanes;
    }
    /** Center-X för ett lane-index. */
    centerX(index) {
        return this.lanes[Math.max(0, Math.min(this.lanes.length - 1, index))].centerX;
    }
    /** Returnera närmaste lane till en given X-position. */
    nearest(x) {
        return this.lanes.reduce((a, b) => Math.abs(a.centerX - x) < Math.abs(b.centerX - x) ? a : b);
    }
    /** Returnera mitt-lane om udda antal lanes (t.ex. 7 → index 3). Annars null. */
    middle() {
        return this.lanes.length % 2 === 1 ? this.lanes[(this.lanes.length - 1) >> 1] : null;
    }
    /**
     * Mappar en godtycklig X-position till lane-index (närmsta).
     * Bra när du vill “re-snap:a” sprites efter lane-antal ändras.
     */
    indexAt(x) {
        return this.nearest(x).index;
    }
    /**
     * Hjälp för sticky snap: returnerar target-X att gå mot.
     * Om ‘deadzone’ anges och du redan är nära center → returnerar center direkt.
     */
    snap(x, deadzone = 0) {
        const lane = this.nearest(x);
        return Math.abs(lane.centerX - x) <= deadzone ? lane.centerX : lane.centerX;
    }
    /** Debug-overlay (linjer + index). */
    enableDebug(color = 0x00ffff) {
        if (this.debugGfx)
            return;
        this.debugGfx = this.scene.add.graphics().setDepth(1e6);
        this.debugTxt = [];
        this.redrawDebug(color);
    }
    disableDebug() {
        this.debugGfx?.destroy();
        this.debugGfx = undefined;
        this.debugTxt?.forEach(t => t.destroy());
        this.debugTxt = undefined;
    }
    redrawDebug(color = 0x00ffff) {
        if (!this.debugGfx)
            return;
        const g = this.debugGfx;
        g.clear();
        g.lineStyle(1, color, 0.6);
        this.debugTxt?.forEach(t => t.destroy());
        this.debugTxt = [];
        const h = this.scene.scale.height;
        for (const lane of this.lanes) {
            g.beginPath();
            g.moveTo(lane.centerX, 0);
            g.lineTo(lane.centerX, h);
            g.strokePath();
            const label = this.scene.add
                .text(lane.centerX, 8, `L${lane.index}`, {
                fontFamily: 'monospace',
                fontSize: '12px',
                color: '#00ffff'
            })
                .setOrigin(0.5, 0)
                .setDepth(1e6);
            this.debugTxt.push(label);
        }
    }
    onResize() {
        // Om du vill att lanes följer ny bredd automatiskt:
        this.width = this.scene.scale.width;
        this.build();
    }
}
// Event-namn
LaneManager.EVT_CHANGED = 'lanes:changed';
export default LaneManager;
