# Migrerings‑ och Utvecklingsplan: Beat‑Blaster – LaneManager, BeatJudge & Conductor Phase API

## Översikt

Denna plan beskriver samtliga ändringar som ska göras för att migrera spelets lane‑/beat/timing‑arkitektur till en stabil, fas‑driven lösning. Efter genomförande ska följande fungera:

- LaneManager kan bygga, rita ut och uppdatera lanes för olika lane‑antal (3, 5, 7) med smidig övergång när lane‑antal ändras.  
- Conductor har fas‑ och takt (bar) API för beat och bar, med möjlighet att använda extern ljudklocka eller fallback till spelmotorns tid.  
- BeatJudge kan användas för att bedöma inputs/skott etc. som PERFECT / NORMAL / MISS baserat på beat‑/bar‑fas + latenskompensation.  
- Touch‑roller, snap, deadzone, transitions, spawn/wave‑mönster etc fungerar sömlöst med ovanstående.

---

## Struktur

Projektet är organiserat så här (relevanta delar):

- `src/systems/LaneManager.ts`  
- `src/systems/Conductor.ts`  
- `src/systems/BeatJudge.ts` (ska läggas till)  
- `src/scenes/GameScene.ts` (eller motsvarande) där spel‑logik (skjut, spawn etc) kopplar mot Conductor, LaneManager och BeatJudge.  
- `src/config/tracks.json` och `docs/vertical-mode.md` med svårighetsprofiler, lane‑antal, speeds etc.  
- `src/systems/Options.ts` med inställningar som `inputOffsetMs`, `fireMode` etc.

---

## Steg‑för‑steg plan

### Steg 1: Setup branch

- Skapa branch från `dev`, namnge `dev-lane-beat-refactor`  
- Säkerställ att `dev` är uppdaterad med senaste commits innan refaktor.

### Steg 2: Lägg till BeatJudge modul

- Skapa fil `src/systems/BeatJudge.ts` med full implementation för:  
  - `constructor(getBeatPhase: () => number, options: { window?: number; offsetMs?: number; beatLengthMs?: number })`  
  - `judge(): 'PERFECT' | 'NORMAL' | 'MISS'`  
  - Fas‑beräkning med wrap, latenskompensation, korrekt hantering när `beatLengthMs` är 0/falls inte angivet.  
- Skriv enhetstester för `BeatJudge` med följande testfall:  
  1. window = 0.12, offsetMs = 0, beatLengthMs = 500 ms → kolla att phase nära 0 och nära 1 ger PERFECT/NORMAL/MISS rätt.  
  2. Samma med offsetMs ≠ 0, även beatLengthMs default/fallback.  
  3. Test av wrap (t.ex. phase 0.98 + offset som skjuter över 1 → modulo måste fungera).  

### Steg 3: Utöka Conductor med fas‑ och bar‑API

- I `src/systems/Conductor.ts`, lägg till:  
  - Fält: `bpm: number`, `barBeats: number`  
  - `startedAtMs`: tidpunkt då spel/ljud‑start sker  
  - `lastBarStartMs`: tidpunkt då senaste takt (bar) påbörjades  
  - Metoder:  
    - `setTimeProvider(fn: () => number)` för extern ljud‑klocka (ex WebAudio)  
    - `nowMs(): number` – använder timeProvider eller fallback `scene.time.now`  
    - `getBeatLengthMs(): number`  
    - `getBeatPhase(): number`  
    - `getBarPhase(): number`  
    - `signalBarStart()`: sätt `lastBarStartMs = nowMs()` + emit event `bar:start`  

### Steg 4: Refaktorera LaneManager

- Ersätt/uppdatera `LaneManager.ts` enligt drop‑in‑filen:  
  - Implementera `build(count: number, left?: number, width?: number)`  
  - Cached layout (left, width, step)  
  - `snap(x, deadzone)` med korrekt deadzone‑logik  
  - `nearest(x)`, `indexAt(x)`  
  - `enableDebug()`, `disableDebug()`, `redrawDebug()`  
  - Emit event `lanes:changed` när lane‑layout byggs eller ändras  
- Säkerställ att alla konsumenter (spelarkontroll, fiender, HUD, spawn/waves) använder LaneManager‑API för centerX etc, inte egna hårdkodade beräkningar.

### Steg 5: Anpassa användning i GameScene / Input / Spawn

- I `GameScene.ts` (eller motsvarande) gör följande justeringar:

  1. Initiera Conductor och LaneManager tidigt med rätt BPM, barBeats från `tracks.json`/låprofil.  
  2. Registrera `signalBarStart()` vid låtstart eller när takt‑byte sker i ljudet.  
  3. Vid input (skjuta): använd `BeatJudge.judge()` med aktuellt beatPhase, latency offset (från `Options.inputOffsetMs`) → generera verdict och visuellt feedback + spela in i spelmekaniken.  
  4. Vid lane‑antal‑ändring:  
     - Anropa `LaneManager.build(newCount, left, width)`  
     - Kör global lane‑transition tween (~150‑250 ms) där alla fiender/spawnade objekt snappar X‑position mot närmaste centre under övergången.  
     - Under transition: pausa/avaktivera fiende‑egna X‑tweens/drivers.  

  5. Touch/input‑hantering:  
     - Definiera “skjuthand” och “rörelsehand” med `pointerId`  
     - Vid `pointerup` ta endast hänsyn till rätt hand  
     - Använd snap + deadzone där det behövs för att undvika jitter  

### Steg 6: Data / Konfigurations‑justeringar

- I `tracks.json`: säkerställ att varje låtprofil har:  
  - `bpm`  
  - `laneCount`  
  - ev. `inputOffsetMs` override om nödvändigt  
  - `barBeats` (slag per takt) om inte standard (4)  

- I `Options.ts`: kontrollera att `inputOffsetMs`, `fireMode` etc är exponerade och används  

- Uppdatera dokumentation (`docs/vertical-mode.md` och README där relevant) med:  
  - hur beat‑fas / bar‑fas fungerar  
  - hur lane transitions och snap / deadzone beskrivs  
  - hur input latency påverkar och hur spelaren kan kalibrera  

### Steg 7: Tester & QA

- Enhetstester:  
  - `BeatJudge` enligt testfallen ovan  
  - `LaneManager`: `build()`, `nearest()`, `indexAt()`, `snap()`, `getBounds()` – kör med 3,5,7 lanes, olika left/width  

  - `Conductor`: med mockad `timeProvider`, test av `getBeatPhase()` och `getBarPhase()`, test av `signalBarStart()`  

- Manuella tester:  
  - Varierande BPM (låg, medel, hög)  
  - Lane‑antal byte mitt i spel  
  - Touch / flera fingrar  
  - Bedömning av verdicts i spel – precision visuellt kontrollerbar  

### Steg 8: Prestanda & stabilitet

- Använd object pools för fiender/bullets/partikar  
- Minimera antalet tweens under transitions  
- Debug overlay endast aktiv när debug är på; inte i release builds  
- Rensa console warnings / errors  

### Steg 9: PR & merge

- När ovan är klar: skapa PR från `dev-lane-beat-refactor` mot `dev`  
- Kodgranskning: diff, tester + manuella tester måste vara OK  
- Merge in i `dev` när allt funkar  

---

## Tidsuppskattning

| Deluppgift | Tid (estimat) |
|------------|---------------|
| Implementera BeatJudge + tester | 1‑2 dagar |
| Utöka Conductor med fas & bar API | 1 dag |
| Refaktor LaneManager + transitions + debug overlay | 1‑2 dagar |
| Anpassa GameScene / input / spawn / touch | 1 dag |
| QA + manuella tester | 0.5‑1 dag |
| Performance & kodrens | 0.5 dag |

---

## Acceptanskriterier

För att leveransen ska anses komplett:

1. BeatJudge, LineManager, Conductor Phase API integrerat och fungerar enligt plan  
2. Verifierad demo/scen: flera BPM, lane‑antal byte, precision i skott och verdict, UI feedback etc  
3. Tester (enhet & manuell) passerar utan fel  
4. Dokumentation uppdaterad: `docs/vertical-mode.md`, README och ev Architecture.md  
5. PR godkänn och merge in i `dev` med tydligt changelog‑meddelande  

---

## QA‑Checklista innan merge

- [ ] LaneManager bygger 3,5,7 lanes korrekt inom bounds  
- [ ] Snap + deadzone fungerar utan jitter  
- [ ] BeatJudge.judge() ger PERFEKT vid kant, NORMAL inom fönster, MISS utanför  
- [ ] getBeatPhase(), getBarPhase() ges rätt värde vid olika scenarier  
- [ ] inputOffsetMs tillämpas korrekt  
- [ ] Touch input: rätt pointerId, release ignoreras från fel finger  
- [ ] Lane transitions mjuka, fiender hoppar inte fel  
- [ ] Performance OK på hög BPM + många objekt  
- [ ] Debug overlay stängs av i release  

---

## Bilagor

- Drop‑in‑filer: LaneManager.ts, BeatJudge.ts, Conductor.ts (ska finnas i repo)  
- Konfigfiler: `tracks.json`, `Options.ts`  
- Dokument: `docs/vertical-mode.md`, README

---
