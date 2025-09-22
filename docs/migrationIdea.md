
# Beat Blaster – Migreringsplan (från nuvarande kodbas)

Den här planen utgår från din befintliga struktur (bl.a. `GameScene.ts`, `AudioAnalyzer`, `Conductor`, `Spawner`, `WaveDirector`, `WaveLibrary`, `EnemyLifecycle`, `HUD`, `Starfield`, `NeonGrid`, `PlayerSkin`, `BackgroundScroller`). Målet är att införa:

1) **Release-to-shoot** med beat-fönster.  
2) **Lane-baserad sticky-rörelse** för spelaren.  
3) **Dynamiska lanes (3 → 5 → 7 → 3)** synkade till takt 4.  
4) **Lane-medvetna spawns och rörelsemönster** (hoppers, weavers, m.m.).  
5) **HP-skalning på beat-multiplar** och wave/BPM-scaling.

---

## Översikt – arbetsordning (rekommenderad)

1. **Lanes & LaneManager (NYTT)**  
2. **Player controls (sticky lanes + release-to-shoot)**  
3. **BeatWindow util (NYTT)**  
4. **Spawner + WaveDirector: lane-aware**  
5. **Enemy-rörelser: hoppers/weavers + hooks i Conductor**  
6. **Dynamic lanes på takt 4**  
7. **HP-skalning + “exploders” timeout**  
8. **HUD-feedback (perfect/normal, bpm, lanes)**  
9. **Polish: VFX i NeonGrid/Starfield**

---

## 1) LaneManager (NYTT)

Skapa `src/systems/LaneManager.ts`:

```ts
// src/systems/LaneManager.ts
export type Lane = { index: number; centerX: number }
export type LaneConfig = { count: 3 | 5 | 7; width: number; left: number }

export default class LaneManager {
  private lanes: Lane[] = []
  private cfg: LaneConfig

  constructor(cfg: LaneConfig) {
    this.cfg = cfg
    this.rebuild(cfg.count)
  }

  rebuild(count: 3 | 5 | 7) {
    this.lanes = []
    const step = this.cfg.width / (count + 1)
    for (let i = 0; i < count; i++) {
      this.lanes.push({
        index: i,
        centerX: this.cfg.left + step * (i + 1)
      })
    }
    this.cfg.count = count
  }

  getAll(): Lane[] { return this.lanes }
  getCount(): number { return this.cfg.count }

  // returnerar närmaste lane utifrån en X-position
  nearest(x: number): Lane {
    return this.lanes.reduce((a, b) =>
      Math.abs(a.centerX - x) < Math.abs(b.centerX - x) ? a : b
    )
  }

  // "mitt"-lane (används när count är 7)
  middle(): Lane | null {
    if (this.lanes.length % 2 === 1) {
      return this.lanes[(this.lanes.length - 1) >> 1]
    }
    return null
  }
}
```

Integrera i `GameScene.ts`:

```ts
// i GameScene
private lanes!: LaneManager

create() {
  // ...
  const worldLeft = 0
  const worldWidth = this.scale.width
  this.lanes = new LaneManager({ count: 3, width: worldWidth, left: worldLeft })
}
```

---

## 2) Player: sticky-lanes + release-to-shoot

I `GameScene.ts`, ersätt “fri” X-rörelse med lane-snap:

```ts
// i update (eller input handler)
const targetLane = this.lanes.nearest(this.player.x)   // eller utifrån inputX
this.player.x = Phaser.Math.Linear(this.player.x, targetLane.centerX, 0.2) // easing
```

Lägg in en liten deadzone så att snap inte fladdrar:

```ts
const dz = 6 // px
if (Math.abs(this.player.x - targetLane.centerX) > dz) {
  this.player.x = Phaser.Math.Linear(this.player.x, targetLane.centerX, 0.2)
} else {
  this.player.x = targetLane.centerX
}
```

**Release-to-shoot:**

Skapa ett callback i `GameScene` som anropas vid `pointerup` / `mouseup`:

```ts
private onShootRelease = () => {
  const result = this.beatWindow.classifyShot() // "perfect" | "normal"
  this.playerShoot(result)
}

create() {
  this.input.on('pointerup', this.onShootRelease)
  // PC-mus:
  this.input.mouse?.disableContextMenu()
}
```

`playerShoot(result)` triggar projektil + effekter. `perfect` ger extra skada/poäng.

---

## 3) BeatWindow util (NYTT)

Skapa `src/systems/BeatWindow.ts`:

```ts
// src/systems/BeatWindow.ts
export default class BeatWindow {
  private bpm = 120
  private window = 0.15 // 15% av beatet
  private getTime: () => number

  constructor(opts: { getTime: () => number; bpm?: number; window?: number }) {
    this.getTime = opts.getTime
    if (opts.bpm) this.bpm = opts.bpm
    if (opts.window) this.window = opts.window
  }

  setBPM(bpm: number) { this.bpm = bpm }
  setWindow(p: number) { this.window = p }

  classifyShot(): "perfect" | "normal" {
    const beatLen = 60 / this.bpm
    const now = this.getTime()
    const beatPos = now % beatLen
    const w = beatLen * this.window
    return (beatPos <= w || beatPos >= beatLen - w) ? "perfect" : "normal"
  }
}
```

I `GameScene`:

```ts
import BeatWindow from '../systems/BeatWindow'

private beatWindow!: BeatWindow

create() {
  this.beatWindow = new BeatWindow({ getTime: () => this.time.now / 1000, bpm: 120 })
  this.conductor.on('bpm:detected', (bpm: number) => this.beatWindow.setBPM(bpm))
  // Powerup Precision kan göra setWindow(0.25) t.ex.
}
```

---

## 4) Spawner + WaveDirector: lane-aware

Utöka `Spawner` så att patterns kan ange lane-index (eller “random lane from group”). Exempel på data i `WaveLibrary`:

```ts
// WaveLibrary.ts (exempel)
export const LaneGroups = {
  low:   [0, 1],     // för 5 lanes: [0,1], mitt = 2, high = [3,4]
  mid:   [2],
  high:  [3, 4]
}

// PatternData exempel
{
  type: 'hopper',
  lane: 'low',      // eller laneIndex: 0 | 1 | 2...
  count: 3,
  spacing: 300 // px i Y-led mellan spawns
}
```

I `Spawner.ts`, när du skapar fiender:

```ts
const laneIndex = resolveLaneIndex(pattern.lane, this.lanes.getAll())
const x = this.lanes.getAll()[laneIndex].centerX
spawnEnemyAt(x, startY)
```

`WaveDirector` kan fortfarande styra timing, men nu skickar den även lane-info.

---

## 5) Enemy-rörelser: hooks i Conductor

Använd dina befintliga beat-events (`on('beat:low')`, etc.) och lägg per-klass-beteenden.

**Hoppers:**

```ts
// EnemyLifecycle.ts eller i respektive Enemy-klass
onBeatLow() {
  const [a, b] = this.assignedLanes // två lanes
  this.currentTargetLane = (this.currentTargetLane === a) ? b : a
  this.tweenXTo(this.currentTargetLane.centerX, 120) // ms tween
}
```

**Weavers:** sinus över 2–3 lanes, uppdateras varje frame men amplitud/phase moduleras per beat (ex. öka phase-speed på high-beat).

---

## 6) Dynamiska lanes (takt 4)

I `Conductor`/`WaveDirector`: på varje takt-slut (beat 4) – trigga lane-count ändring:

```ts
// GameScene.ts
this.conductor.on('bar:end', (barIndex: number) => {
  if (barIndex === 1) this.lanes.rebuild(5) // 3 -> 5
  if (barIndex === 2) this.lanes.rebuild(7) // 5 -> 7
  if (barIndex === 3) this.lanes.rebuild(3) // 7 -> 3
  this.effects.laneTransitionFX(this.lanes.getCount())
})
```

**OBS:** när lane-count ändras måste:
- Player snap: `player.x = lanes.nearest(player.x).centerX`
- Fiender mappa till närmaste lane (alt. “glida” till ny närmaste).

---

## 7) HP-skalning & Exploders timeout

I `EnemyLifecycle`:

```ts
// skalning
const base = this.baseHP
const waveIndex = this.waveDirector.getIndex()
const bpm = this.conductor.getBPM()
const bpmFactor = bpm < 120 ? 1.2 : bpm > 160 ? 0.8 : 1.0
this.hp = Math.round(base * (1 + waveIndex * 0.1) * bpmFactor)

// exploder timeout
if (this.type === 'exploder') {
  this.addBeatTimer(3, () => this.selfExplode()) // 3 beats
}
```

Säkerställ att fiender “dör” på 1/2/4-beats genom att anpassa baseHP per typ.

---

## 8) HUD & feedback

- Visa **BPM** och lane-count.  
- Flash/ikon när **perfect shot** triggas.  
- Subtil pulserande indikator i UI som hjälper timing.

---

## 9) VFX (NeonGrid/Starfield)

- Beat 1: bump (Z-skala eller puls).  
- Beat 2: ringvåg längs lanes.  
- Beat 3: glitter/partiklar.  
- Bar end: större färgskifte + lane expansion/kollaps animation.

---

# Kodstubbar/snippets att klistra in

## GameScene – init & inputs

```ts
// GameScene.ts (utdrag)
create() {
  // lanes
  this.lanes = new LaneManager({ count: 3, width: this.scale.width, left: 0 })

  // beat window
  this.beatWindow = new BeatWindow({ getTime: () => this.time.now / 1000, bpm: 120 })
  this.conductor.on('bpm:detected', (bpm: number) => this.beatWindow.setBPM(bpm))

  // inputs
  this.input.on('pointerup', this.onShootRelease)

  // dynamic lanes on bar end
  this.conductor.on('bar:end', (barIndex: number) => this.handleBarEnd(barIndex))
}

update() {
  // sticky lane movement
  const target = this.lanes.nearest(this.player.x)
  const dz = 6
  if (Math.abs(this.player.x - target.centerX) > dz) {
    this.player.x = Phaser.Math.Linear(this.player.x, target.centerX, 0.2)
  } else {
    this.player.x = target.centerX
  }
}

private onShootRelease = () => {
  const cls = this.beatWindow.classifyShot()
  this.playerShoot(cls) // spawn bullet + sfx + HUD feedback
}

private handleBarEnd(barIndex: number) {
  if (barIndex === 1) this.lanes.rebuild(5)
  if (barIndex === 2) this.lanes.rebuild(7)
  if (barIndex === 3) this.lanes.rebuild(3)
  this.effects?.laneTransitionFX?.(this.lanes.getCount())
  // re-snap player & enemies
}
```

## Spawner – lane-aware spawn

```ts
// Spawner.ts (utdrag)
spawnPattern(p: PatternData) {
  const lanes = this.lanes.getAll()
  const idx = resolveLaneIndex(p, lanes) // ex. slump inom "low", "mid", "high"
  const x = lanes[idx].centerX
  // y bestäms av scroll/offset
  this.spawnEnemy({ type: p.type, x, y: -50, meta: p.meta })
}
```

## Enemy – lane hop

```ts
// Enemy subclass
assignLanes(a: Lane, b: Lane) {
  this.laneA = a; this.laneB = b; this.current = a
}

onBeatLow() {
  this.current = (this.current == this.laneA) ? this.laneB : this.laneA
  this.scene.tweens.add({
    targets: this.sprite,
    x: this.current.centerX,
    duration: 120,
    ease: 'Sine.inOut'
  })
}
```

---

# Kvar att verifiera i din kodbas

- `Conductor`: exposes `bpm`, `on('beat:*')`, `on('bar:end')`.  
- `WaveDirector`: lätt att injicera lane-info till `Spawner`.  
- `EnemyLifecycle`: central plats för HP-skalning, timers per beat.  
- `NeonGrid`: API för lane-count ändringar (för snygg expansion/kollaps).

---

## Milstolpar (suggested sprints)

**Sprint 1 (Core feel):**  
- LaneManager (3 lanes), sticky player, release-to-shoot + perfect window.  
- Hoppers + lane-aware spawns.  
- Beat 1/2/3 VFX på grid.

**Sprint 2 (Musik → värld):**  
- Dynamic lanes på bar-end (3→5→7→3) + smoothing.  
- HP-skalning + exploder timeout.  
- HUD feedback.

**Sprint 3 (Content):**  
- Weavers, Formation Dancers, Teleporters, Mirrorers.  
- 16-takters wave-script inkl. drop.

**Sprint 4 (Polish):**  
- Boss prototyp (fas-skiften på beats).  
- Highscore, stat-tracking, options.  
- Profilera och optimera GC/tweens.

---

Lycka till – du har redan mycket av ramverket klart, det här är “bara” koreografi + lane-magi. 💜
