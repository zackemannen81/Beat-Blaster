# 🗺 Beat Blaster Roadmap

Denna roadmap gäller grenen `feat/spawn-movement-rework`. Målet är att bygga om spelet successivt så att alla nya koncept (lanes, release-to-shoot, dynamiska lanes, beatWindow etc) blir stabilt integrerat.

---

## 🚦 Faser & Milstolpar

| Sprint # | Målsättning | Tidsram* | Delmål (Issues) |
|---|---|---|---|
| **Sprint 1 – Core Feel** | Få till spelbar vertical-läge med sticky lanes + release-to-shoot + lane-hopper | 1 vecka | - LaneManager redo <br> - Sticky lane­rörelse för spelare <br> - Grundläggande beatWindow + “perfect/normal” <br> - LaneHopper-fiendetype implementerad |
| **Sprint 2 – Dynamiska Lanes & Musikintegration** | Lanes ändrar sig (3→5→7→3) synced vid barslut, spawns och rörelser lane-aware, HP i beat-multiplar | 1 vecka | - Bar end-event → lanes.rebuild <br> - Fiender/Spawner använder lane-centerX <br> - HP-skalning harmoniseras med beats <br> - HUD visar lane-count & BPM |
| **Sprint 3 – Fiendemångfald & Wavedesign** | Flera fiendetyper + hela 16-takts waves med drop/peak etc | 1,5 vecka | - Weavers, Teleporters, Formation Dancers <br> - Skriva WaveLibrary exemplarvåg enligt design <br> - Test med olika BPM (låg / medel / hög) |
| **Sprint 4 – Powerups & Vapenvariation** | Rapidfire, ChargeShot, Precision etc; combo / score-bonus för perfekta träffar | 1 vecka | - Rapidfire <br> - Charge shot (håll/släpp) <br> - Precision powerup <br> - Hud feedback för combos/experten |
| **Sprint 5 – UI / UX / Polish / Profiler** | Finputs – effekter, grafik, profilval, accessibility | 1 vecka | - NeonGrid effekter vid beat <br> - Reduced Motion profil <br> - Highscore / statistik <br> - Spelardata + inställningar (lägen, svårighetsgrad) |
| **Sprint 6 – QA, Pre-Release** | Stabilitet, balans & releaseklargörande | 1 vecka | - Testmatris (BPM, lanes, difficulty) <br> - Prestandatester <br> - Bugfixar <br> - Dokumentation & README uppdaterad |

\*Tider är uppskattningar – justera efter hur mycket tid du kan lägga.

---

## 🔖 Issue-rubriker att skapa

- `feature: LaneManager + getLaneCenterX`
- `feature: Sticky lane movement + deadzone`
- `feature: Release-to-shoot + BeatWindow`
- `feature: LaneHopper pattern + beat hook`
- `feature: Bar-end dynamic lanes (3-5-7-3)`
- `feature: Spawn lane-aware in other patterns (sine, etc)`
- `feature: HP beat-multiples + wave/BPM scaling`
- `feature: New fiendetyper: Weaver / Teleporter / Mirrorer`
- `feature: Wave-script: full 16-takt exemplarvåg`
- `feature: Powerups: Rapidfire / ChargeShot / Precision`
- `feature: HUD feedback: perfect / combo / lane count / BPM`
- `bug: Lane snapping jitter`
- `bug: BeatWindow misfires / latency issues`
- `refactor: EnemyLifecycle pattern classification`
- `refactor: Spawner to use LaneManager helpers`

---

## 🛠 Labels och status

Använd etiketter för issue-hantering:

- `priority: high` / `medium` / `low`
- `type: feature` / `bug` / `refactor` / `doc`
- `scene: vertical` / `scene: omni`
- `difficulty: easy` / `normal` / `hard`

---

## 📆 Förslag på deadlines

- Sprint 1 – bör vara klar **inom 7 dagar** från start.  
- Sprint 2 – +7 till dag 14.  
- Sprint 3 – dag 15 till ~22.  
- … osv, med utrymme för iteration.

---

## ✅ Definition av “Done” per sprint

För att sprinten räknas som klar:

- Alla huvudfunktioner för sprinten finns implementerade och testade.  
- Key mål (se “Delmål”) är färdiga och fungerar i vertical scene.  
- Inga blockerande buggar som gör spelet ospelbart eller förstör rytmkänslan.  
- Prestanda är acceptabel (ingen lagg vid normala testvillkor).

---

## 🎯 Sammanfattning

Med denna roadmap har du en tydlig väg framåt: du vet vilka delar som behöver göras när, i vilken ordning, och vad som räknas som färdigt. Fokus först på känsla (core, release-to-shoot, lanes), sen expansion/features, och till sist polish & stabilitet.  

Lycka till med utvecklingen – det här kan bli något riktigt jäkla snyggt 💥  
