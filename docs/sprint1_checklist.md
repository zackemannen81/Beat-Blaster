# ✅ Sprint 1 – Core Feel Checklist (Beat Blaster)

**Mål:** Ett spelbart *Vertical*-läge med 3 lanes, sticky lane‑rörelse, *release‑to‑shoot* (+ beat window), och minst en lane‑medveten fiendetyp (*LaneHopper*) som hoppar på beat.

---

## 0) Förutsättningar
- [ ] Branch: `dev` (eller din arbetsbranch) är uppdaterad från nya baseline.
- [ ] Node + npm funkar lokalt (`node -v`, `npm -v`).
- [ ] Spelet bootar i dev‑läge (t.ex. `npm run dev`).

---

## 1) LaneManager
- [ ] Skapa `src/systems/LaneManager.ts` med:
  - [ ] `constructor({count,width,left})`
  - [ ] `rebuild(count: 3|5|7)`
  - [ ] `getAll(): Lane[]` / `getCount()`
  - [ ] `nearest(x)` och `middle()`
  - [ ] Enhetstest (om du kör tests) eller enkel debug‑overlay för centers.
- [ ] Integrera i `GameScene` / `VerticalGameScene`.
- [ ] **Kriterium:** 3 lanes visas/logiskt finns och centerX beräknas korrekt.

---

## 2) Sticky lanes (spelarrörelse)
- [ ] Input (PC: W/A/D/S/pilar, Mobil: styr mot Touchpoint
- [ ] Snapping: lerpa mot `nearest().centerX` med easing (Sine.inOut) + deadzone (~6 px). Påbörja lerping när man inte styr höger eller vänster med tangenterna , Mobil: påbörja lerping när man släpper touchpoint.
- [ ] **Kriterium:** Ingen fladder/jitter nära gränser; snappy men mjukt.

---

## 3) Release‑to‑Shoot + BeatWindow
- [ ] Skapa `src/systems/BeatWindow.ts` med:
  - [ ] `classifyShot(): "perfect"|"normal"` baserat på BPM och fönsterprocent (start 15%).
  - [ ] `setBPM(bpm)`, `setWindow(p)`
- [ ] Hooka `pointerup`/`mouseup` → `classifyShot()` → `playerShoot(type)`.
- [ ] HUD‑feedback för **perfect** (kort glow/ikon).
- [ ] **Kriterium:** Tydlig skillnad i feedback; känslan är rytmisk.

---

## 4) Spawner helpers + LaneHopper pattern
- [ ] I `Spawner.ts`: `getLaneCenterX(index)` helper.
- [ ] Utöka `PatternData` med `lane_hopper` (laneA, laneB, hopEveryBeats, speedY).
- [ ] `spawnLaneHopper(...)` metod.
- [ ] **Kriterium:** Kan spawna LaneHoppers i två valda lanes.

---

## 5) EnemyLifecycle – beat‑hook
- [ ] Lyssna på `beat:low` (Conductor).
- [ ] För `lane_hopper`: tweena X → andra lane (120 ms, Sine.inOut).
- [ ] **Kriterium:** Hoppen sker *exakt* på beat utan frame‑drop.

---

## 6) HUD (minimalt)
- [ ] Visa BPM och lane‑count.
- [ ] Visa **perfect/normal** feedback.
- [ ] **Kriterium:** All info läsbar och diskret (ingen UI‑störning).

---

## 7) DoD (Definition of Done) – Sprint 1
- [ ] Vertical‑läge kör 3 lanes med sticky rörelse.
- [ ] Release‑to‑shoot fungerar och markerar perfect vs normal.
- [ ] LaneHopper hoppar lanes på beat:low.
- [ ] Minst 60 FPS på desktop (med sample‑låt ~120 BPM).
- [ ] README/ROADMAP uppdaterad (Sprint 1 status).
- [ ] Inga blockerande buggar i kärnflödet.

> Tips: Ha en liten *DoD‑checklista* per PR så du fångar standardpunkter varje gång.

---

## 8) Test & Kvalitet
### 8.1 Testmatris (manuellt)
- [ ] **BPM**: testa 90 / 120 / 160 BPM (snapping och beat‑window fortfarande intuitivt).
- [ ] **Input**: PC (tangent + musuppsläpp) / Mobil (svep + finger‑release).
- [ ] **Perf**: CPU/GPU stabil; inga spikes vid beat eller hop‑burst.
- [ ] **Audio‑latens**: upplevs inte störa beat‑window (vid behov öka till 18‑20% på mobil).

### 8.2 Mini code‑review (egen)
- [ ] Struktur: LaneManager/BeatWindow isolerade (återanvändbara).
- [ ] Namn & kommentarer klargör avsikt.
- [ ] Ingen onödig allokering i `update()` (GC‑spikes).

---

## 9) “Snabbstubbar” (pseudo/TS)

### 9.1 LaneManager (skiss)
```ts
export type Lane = { index:number; centerX:number }
export default class LaneManager {
  private lanes: Lane[] = []; private width:number; private left:number; private count:3|5|7
  constructor(cfg:{count:3|5|7;width:number;left:number}) { this.width=cfg.width; this.left=cfg.left; this.rebuild(cfg.count) }
  rebuild(count:3|5|7){ this.count=count; this.lanes=[]; const step=this.width/(count+1); for(let i=0;i<count;i++){ this.lanes.push({index:i,centerX:this.left+step*(i+1)}) } }
  getAll(){ return this.lanes } getCount(){ return this.count }
  nearest(x:number){ return this.lanes.reduce((a,b)=>Math.abs(a.centerX-x)<Math.abs(b.centerX-x)?a:b) }
  middle(){ return this.count%2===1? this.lanes[(this.count-1)>>1] : null }
}
```

### 9.2 BeatWindow (skiss)
```ts
export default class BeatWindow {
  constructor(private getTime:()=>number, private bpm=120, private window=0.15) {}
  setBPM(b:number){ this.bpm=b } setWindow(p:number){ this.window=p }
  classifyShot(): "perfect"|"normal" {
    const beat=60/this.bpm; const t=this.getTime(); const pos=t%beat; const w=beat*this.window
    return (pos<=w || pos>=beat-w) ? "perfect" : "normal"
  }
}
```

### 9.3 Player sticky (skiss)
```ts
const dz=6, ease=0.2
const target=this.lanes.nearest(player.x).centerX
player.x = Math.abs(player.x-target)>dz ? Phaser.Math.Linear(player.x, target, ease) : target
```

### 9.4 LaneHopper beat‑hook (skiss)
```ts
if (pattern.kind==='lane_hopper' && isBeatLow) {
  const cur = Math.abs(sprite.x - laneCenter(pattern.laneA)) < Math.abs(sprite.x - laneCenter(pattern.laneB)) ? pattern.laneB : pattern.laneA
  this.tweens.add({targets:sprite, x: laneCenter(cur), duration:120, ease:'Sine.inOut'})
}
```

---

## 10) Nästa sprint (preview)
- Dynamiska lanes på barslut (3→5→7→3) + re‑snap av spelare/fiender.
- Lane‑aware spawns i fler formationer.
- HP i beat‑multiplar + BPM‑faktor.
