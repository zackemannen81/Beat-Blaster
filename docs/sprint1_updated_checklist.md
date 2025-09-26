# ✅ Sprint 1 – Uppdaterad Checklista (Beat Blaster)

**Mål:** Ett spelbart Vertical-läge med 3 lanes, sticky lane-rörelse, release-to-shoot (BeatJudge) och lane-hopping fiende.

---

## 0) Förutsättningar
- [ ] Branch `dev-lane-beat-refactor` är uppdaterad och bygger med `npm run dev`.
  - Note: Se till att hämta senaste `dev` och byta till din nya arbetsbranch innan du börjar.

## 1) LaneManager (uppdaterad)
- [x] Skapa `src/systems/LaneManager.ts` med `build(count,left,width)`, `getAll()`, `getBounds()`, `nearest()`, `indexAt()`, `snap(x, deadzone)`, samt `enableDebug()`/`disableDebug()` och event `lanes:changed`.
  - Note: Implementerat i den medföljande drop-in-filen `LaneManager.ts`; `build()` ersätter constructor/rebuild från ursprungliga checklistan.
- [x] Integrera LaneManager i GameScene så att lanes byggs vid init och på resize, och använd `lanes:changed` för att resnappa spelare/fiender.
  - Note: Integrationen är implementerad via hjälpfunktionen `LaneIntegration.ts`.  I GameScene kallas `integrateLaneManager(this, this.verticalLaneCount)` i `create()`, vilket bygger lanes initialt och kopplar `RESIZE`‑händelser till rebuild.  Eventet `lanes:changed` fångas och resnappar spelare och aktiva fiender.

## 2) Sticky lanes (spelarrörelse)
- [x] Implementera inputkontroller (A/D-tangenter eller svep) för vänster/höger rörelse.
- [x] Använd `LaneManager.nearest()` och `LaneManager.snap(x, deadzone)` för att lerpa spelaren mot närmaste lane med easing och deadzone.
- [x] **Kriterium:** Ingen fladder/jitter nära lane-gränser; rörelsen känns snappy men mjuk.
  - Note: Funktionaliteten är implementerad i den nya klassen `StickyLaneController.ts`.  Den läser vänster/höger‑tangenter (eller gamepad) och beräknar en önskad X‑position, använder `nearest()` och `snap()` med dynamiskt deadzone och lerpar spelaren mot mål.  Den kan initialiseras i GameScene och anropas i `update()` med `this.stickyLane.update(this.cursors, delta)`.

## 3) Release-to-Shoot + BeatJudge
- [x] Skapa `src/systems/BeatJudge.ts` som tar in en `getBeatPhase()`-funktion, `window`, `offsetMs` samt (valfritt) `beatLengthMs`, och som har metoden `judge(): 'PERFECT'|'NORMAL'|'MISS'`.
  - Note: Implementerat som drop-in-filen `BeatJudge.ts`; ersätter `BeatWindow` i ursprunglig checklista.
- [x] Utöka `src/systems/Conductor.ts` med `getBeatPhase()`, `getBarPhase()`, `getBeatLengthMs()`, `setTimeProvider()`, `signalBarStart()`, samt konfigurerbara BPM/barBeats.
  - Note: Conductor har uppdaterats i medföljande `Conductor.ts` för att ge beat- och bar-fas.
- [ ] Koppla `pointerup`/`mouseup` till `BeatJudge.judge()` och skicka verdict till `playerShoot(verdict)`. Lägg till HUD-feedback för PERFECT/NORMAL.
  - Note: Hook-up och HUD måste göras i GameScene; ej inkluderat i drop-in.

## 4) Spawner helpers + LaneHopper pattern
- [ ] Lägg till `getLaneCenterX(index)` helper i `Spawner.ts` eller använd `LaneManager.getBounds().step` för att räkna ut lane-centers.
- [ ] Utöka `PatternData` med `lane_hopper` parametrar (`laneA`, `laneB`, `hopEveryBeats`, `speedY`) och implementera `spawnLaneHopper(...)`.
- [ ] **Kriterium:** LaneHopper kan spawnas i två valda lanes med korrekt X-position och hoppar på beat.
  - Note: Spawner och pattern måste uppdateras; drop-in-filerna täcker inte detta.

## 5) EnemyLifecycle – beat-hook
- [ ] Lyssna på beat-/bar-händelser från Conductor. För LaneHopper: tweena X mot nästa lane med en global tween (~120 ms, Sine.inOut).
- [ ] **Kriterium:** LaneHopper hoppar exakt på beat utan frame-drop.
  - Note: Conductor ger beatPhase via `getBeatPhase()`; du måste definiera när beat-hop ska triggas.

## 6) HUD (minimalt)
- [ ] Visa BPM och lane-count i UI.
- [ ] Visa visuellt feedback för `PERFECT`/`NORMAL` när spelaren skjuter.
  - Note: HUD implementeras i GameScene och ska läsa data från Conductor och BeatJudge.

## 7) DoD – Sprint 1
- [ ] Vertical-läge kör 3 lanes med sticky rörelse och deadzone.
- [ ] Release-to-shoot implementerad med BeatJudge och HUD-feedback.
- [ ] LaneHopper hoppar lanes på beat via Conductor-API.
- [ ] Minst 60 FPS på desktop.
- [ ] README/ROADMAP uppdaterad med aktuell status.
- [ ] Inga blockerande buggar i kärnflödet.
  - Note: Du bör skapa PR med DoD-checklista för varje leverans.

## 8) Test & Kvalitet
- [ ] Testa spelet på olika BPM: t.ex. 90, 120 och 160 bpm; kontrollera sticky lanes och BeatJudge-fönstret.
- [ ] Testa input på PC (tangent + musrelease) och mobil (svep + finger-release).
- [ ] Testa prestanda: CPU/GPU ska vara stabila utan spikes.
- [ ] Testa latensinställningar: justera `window` i BeatJudge om mobil upplever för högt latens.
- [ ] Genomför en mini-code-review: säkerställ att LaneManager, Conductor och BeatJudge är isolerade, modulgränser tydliga och att ingen onödig allokering sker i `update()`.
  - Note: Alla enhetstester (LaneManager, BeatJudge, Conductor) måste passera.

## 9) Snabbstubbar (pseudo/TS)
- Uppdatera pseudokoden i checklistan för att matcha `LaneManager.build()`, `BeatJudge.judge()` och dina nya moduler.

## 10) Nästa sprint (preview)
- Dynamiska lanes via bar-phase (3→5→7→3) med global tween och resnap av spelare/fiender.
- Lane-aware spawns i olika formationer (använd semantics och lane-resolver).
- HP-skalning baserad på beat- och bar-faser.

---
