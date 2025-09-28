mkdir -p patches
cat > patches/0001-lane-refactor-and-beatjudge-v2.patch << 'PATCH'
diff --git a/src/systems/LaneManager.ts b/src/systems/LaneManager.ts
index 0000000..0000001 100644
--- a/src/systems/LaneManager.ts
+++ b/src/systems/LaneManager.ts
@@ -1,14 +1,27 @@
 import Phaser from 'phaser'
 
 export default class LaneManager {
   private scene: Phaser.Scene
-  private lanes: { index:number; centerX:number }[] = []
+  private lanes: { index:number; centerX:number }[] = []
+  private debugGfx?: Phaser.GameObjects.Graphics
+  private debugTxt: Phaser.GameObjects.Text[] = []
 
   constructor(scene: Phaser.Scene){
     this.scene = scene
   }
 
   getAll(){
     return this.lanes
   }
 
-  enableDebug(color=0x00ffff){
-    if(this.debugGfx) return this.debugGfx = this.scene.add.graphics().setDepth(1e6)
-    this.debugTxt = []
-    this.redrawDebug(color)
-  }
+  /**
+   * Enable on-screen lane debug overlay.
+   * Fix: skapa graphics om den inte finns (ingen early-return med ny instans).
+   */
+  enableDebug(color=0x00ffff){
+    if (this.debugGfx) return
+    this.debugGfx = this.scene.add.graphics().setDepth(1e6)
+    this.debugTxt = []
+    this.redrawDebug(color)
+  }
 
   disableDebug(){
     this.debugGfx?.destroy()
@@ -29,12 +42,45 @@
     return best
   }
 
-  snap(x:number, deadzone=0){
-    const ln = this.nearest(x)
-    return ln.centerX
-  }
+  /**
+   * Snap x mot närmaste lane center.
+   * Lämna x orörd om vi redan ligger inom "deadzone" pixlar.
+   * deadzone=0 => legacy-beteende (alltid exakt center).
+   */
+  snap(x:number, deadzone=0){
+    const ln = this.nearest(x)
+    if (deadzone > 0) {
+      const dx = Math.abs(x - ln.centerX)
+      if (dx <= deadzone) return x
+    }
+    return ln.centerX
+  }
+
+  /** Valfritt: bounds för HUD/FX */
+  getBounds(){
+    if(this.lanes.length === 0) return { left:0, width:0, step:0 }
+    const centers = this.lanes.map(l=>l.centerX).sort((a,b)=>a-b)
+    const step = centers.length > 1 ? centers[1]-centers[0] : 0
+    const left = centers[0] - step/2
+    const width = step * (this.lanes.length-1)
+    return { left, width, step }
+  }
 
   private redrawDebug(color=0x00ffff){
     if(!this.debugGfx) return
     this.debugGfx.clear()
     for(const ln of this.lanes){
       this.debugGfx.lineStyle(2, color, 0.8)
       this.debugGfx.lineBetween(ln.centerX, 0, ln.centerX, this.scene.scale.height)
       const txt = this.scene.add.text(ln.centerX+6, 6, `L${ln.index}`, { fontSize:'10px' })
       this.debugTxt.push(txt)
     }
   }
 }
diff --git a/src/systems/BeatJudge.ts b/src/systems/BeatJudge.ts
new file mode 100644
index 0000000..0000001
--- /dev/null
+++ b/src/systems/BeatJudge.ts
@@ -0,0 +1,84 @@
+/**
+ * BeatJudge – phase-based input timing window.
+ * Example:
+ *   const bj = new BeatJudge(() => conductor.getBeatPhase(), { window:0.12, offsetMs: options.inputOffsetMs, beatLengthMs: conductor.getBeatLengthMs() })
+ *   const verdict = bj.judge() // 'PERFECT' | 'NORMAL' | 'MISS'
+ */
+export type BeatVerdict = 'PERFECT'|'NORMAL'|'MISS'
+
+export interface BeatJudgeOptions {
+  window?: number       // half-window in phase units [0..0.5], default 0.12
+  offsetMs?: number     // latency calibration in ms, applied to phase
+  beatLengthMs?: number // optional explicit beat length
+}
+
+export default class BeatJudge {
+  private getBeatPhase: () => number
+  private opts: Required<BeatJudgeOptions>
+
+  constructor(getBeatPhase: () => number, opts: BeatJudgeOptions = {}){
+    this.getBeatPhase = getBeatPhase
+    this.opts = {
+      window: opts.window ?? 0.12,
+      offsetMs: opts.offsetMs ?? 0,
+      beatLengthMs: opts.beatLengthMs ?? 0
+    }
+  }
+
+  /** Convert an ms offset to phase units, if beatLengthMs known. */
+  private offsetPhase(): number {
+    const { offsetMs, beatLengthMs } = this.opts
+    if (!beatLengthMs || beatLengthMs <= 0) return 0
+    const p = (offsetMs % beatLengthMs) / beatLengthMs
+    return (p + 1) % 1
+    }
+
+  /** Phase in [0..1) with latency offset applied (wrap-safe). */
+  private effectivePhase(): number {
+    const raw = this.getBeatPhase()
+    const off = this.offsetPhase()
+    let p = raw + off
+    p -= Math.floor(p) // wrap
+    return p
+  }
+
+  /** Verdict based on distance to nearest beat edge (0 or 1). */
+  judge(): BeatVerdict {
+    const w = Math.max(0, Math.min(0.5, this.opts.window))
+    const p = this.effectivePhase()
+    const d = Math.min(p, 1 - p) // distance to nearest edge
+    if (d <= w * 0.5) return 'PERFECT'
+    if (d <= w)       return 'NORMAL'
+    return 'MISS'
+  }
+}
diff --git a/src/systems/Conductor.ts b/src/systems/Conductor.ts
index 0000000..0000001 100644
--- a/src/systems/Conductor.ts
+++ b/src/systems/Conductor.ts
@@ -1,6 +1,43 @@
 import Phaser from 'phaser'
 
 export default class Conductor extends Phaser.Events.EventEmitter {
   private scene: Phaser.Scene
+  private bpm: number = 120
+  private barBeats: number = 4
+  private lastBarStartMs: number = 0
+  private startedAtMs: number = 0
 
   constructor(scene: Phaser.Scene){
     super()
     this.scene = scene
+    this.startedAtMs = this.scene.time.now
   }
+
+  /** Call when track/BPM changes */
+  setBpm(bpm:number, barBeats:number=4){
+    this.bpm = bpm
+    this.barBeats = barBeats
+  }
+
+  /** ms per beat */
+  getBeatLengthMs(){
+    return (60_000 / Math.max(1, this.bpm))
+  }
+
+  /** 0..1 phase within current beat (time-based stub; replace with audio-clock if available) */
+  getBeatPhase(){
+    const len = this.getBeatLengthMs()
+    const now = this.scene.time.now
+    const t = (now - this.startedAtMs) % len
+    return (t / len)
+  }
+
+  /** 0..1 phase within current bar */
+  getBarPhase(){
+    const barLen = this.getBeatLengthMs() * this.barBeats
+    const now = this.scene.time.now
+    const t = (now - (this.lastBarStartMs || this.startedAtMs)) % barLen
+    return (t / barLen)
+  }
+
+  signalBarStart(){
+    this.lastBarStartMs = this.scene.time.now
+    this.emit('bar:start')
+  }
 }
PATCH

