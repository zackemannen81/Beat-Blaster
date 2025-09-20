# Beat-Blaster - Projektplan för vertikal scroller

## 1. Översikt och mål
- **Vision:** Leverera ett nytt vertikalt scroller-läge som känns tajt mot musiken, bevarar befintlig spelkänsla och kan samexistera med det horisontella läget utan regress.
- **Affärsvärde:** Öka spelets variation, skapa nya banor/bossar och öppna för framtida content-släpp kopplade till BPM-baserade baneditorer.
- **Scope:** Anpassa kärnsystem (kameror, bakgrunder, spawns, projektiler, HUD, powerups, bossar) till vertikal scrollning samt säkerställa robust växling mellan spel-lägen.
- **Out-of-scope:** Ny musik, helt nya fiendetyper bortom definierade formationer, större omdesign av ekonomisystem eller metagame.

## 2. Roller och arbetssätt
- **Projektledare & huvudutvecklare:** Codex (ansvarar för planering, implementering, kommunikation och kvalitetssäkring).
- **Beslutslogg:** Allt arbete loggas i `CHANGELOG.md` under sektion "Vertical Mode" med datum och kort beskrivning.
- **Arbetscykel:** För varje planerat steg -> genomför kodändringar -> kör relevanta tester -> jämför mot plan -> dokumentera resultat innan nästa steg.

## 3. Leverabler
- **Kod:** Full implementation av vertikalt spelläge med feature flag, modul-uppdateringar enligt arbetsströmmar nedan, samt regression-säkerställning av horisontellt läge.
- **Dokumentation:**
  - Uppdaterad `README.md` med informationsruta om spel-lägen.
  - Ny `docs/vertical-mode.md` med teknisk walkthrough, kontrollschema och parametertabeller.
  - Uppdatering av `beat_blaster_development_plan.md` med status och referenser.
- **Testartefakter:** Lista över manuella testfall, automatiska testscript där det är möjligt samt prestandarapporter för desktop och mobil.

## 4. Arbetsströmmar och nyckeluppgifter

### 4.1 Infrastrukturella förberedelser
- Skapa branch `feat/vertical-scroller`.
- Introducera `Options.gameplayMode` (`'omni' | 'vertical'`, default `'omni'`).
- Implementera URL/env override (`?mode=vertical` / `VERTICAL_MODE=1`).
- Migrera sparade options och uppdatera `MenuScene` för lägesväxling.
- Status 2025-09-20: Slutförd (branch skapad, gameplayMode och overrides aktiva, Options/Menu uppdaterade).

### 4.2 Kameralogik och bakgrunder
- Införa global `SCROLL_BASE` med koppling till Conductor/BPM.
- Uppdatera `GameScene` så världsflödet simuleras via bakgrund/parallax-scroll (`tilePositionY`).
- Justera `Starfield` och övriga bakgrundssystem för vertikalt parallax, samt säkerställa sömlöst loopande texturer.
- Status 2025-09-20: Slutförd (SCROLL_BASE kopplat till BPM, Starfield/BackgroundScroller uppdaterar tilePositionY, registry syncar värden).

### 4.3 Spelarstyrning och input
- Kalibrera desktop-kontroller (WASD/pilar) för horisontellt fokus och begränsad vertikal zon.
- Implementera gamepad-profil med justerbara deadzones och känslighet.
- Designa mobil/touch-lösning (slider + autofire + specialkommando) och koppla Reduced Motion-inställning till input-feedback.

### 4.4 Projektiler och pooling
- Vända riktningen på befintliga projektiler och säkerställa korrekta hastigheter.
- Förbättra återvinningslogik med skärm-margin och stress-test av poolstorlekar.
- Säkerställa kompatibilitet med horisontellt läge via betade tester.

### 4.5 Fiender, formationer och bossar
- Bygga spawn-API för lanes, sinus, V-formationer och boss-intros ovanför viewport.
- Anpassa fiende-AI och bullet patterns till vertikal riktning, inklusive telegraphy och varningar.
- Implementera boss-faser med Conductor-triggers och tydlig telegraphy.

### 4.6 HUD, scoring och regler
- Uppdatera HUD med stage-progress, boss-HP, bombindikator och miss-feedback.
- Justera scoring/combo-system för "miss bottom" och loggning av räddade/kapade fiender.
- Säkerställa att Reduced Motion-läge minskar visuella störmoment.

### 4.7 Balans, optimering och QA
- Parametriserade svårighetsgrader (lätt/normal/svår) baserade på scrollhastighet, spawn-täthet, bullet-density och HP.
- Prestandaprofilering på desktop + mobil, inkl. FPS och GC-övervakning.
- Regressionstester för horisontellt läge, beat-synk och optionsflöden.

## 5. Tidslinje och milstolpar
| Dag | Fokus | Milstolpar |
| --- | ----- | ---------- |
| 1 | Infrastrukturella förberedelser | Branch skapad, options/feature flag på plats, menyval synligt |
| 2 | Kameralogik & bakgrund | `SCROLL_BASE` integrerad, bakgrund scrollar vertikalt utan artefakter |
| 3 | Spelarstyrning | Desktop/gamepad kontroller kalibrerade, rörelseklämma testad |
| 4 | Projektiler & pooling | Kulriktningar uppdaterade, pooling verifierad via stresstest |
| 5 | Fiender & formationer | Nya spawn-mönster live, boss-stub skapad |
| 6 | HUD & regler | HUD uppdaterad, scoring/miss-regler implementerade |
| 7 | Balans & QA | Svårighetsinställningar finjusterade, testpasser avklarade, dokumentation uppdaterad |

## 6. Kvalitetssäkring och kontrollpunkter
- **Automatiska tester:** Utöka enhetstester för spawner, scoring, options; lägga till integrationstest för `GameScene` i vertical mode (mockad Conductor).
- **Manuella tester:** Checklista per dag för input, spawn, boss, HUD och prestanda. Alla testfall loggas i `QA/vertical_mode_testlog.md`.
- **Regression:** Varje större merge jämförs mot baslinje genom att spela horisontellt läge och verifiera att inga kontroller bryts.
- **Code review:** Självgranskning mot checklistan "Vertical Mode Readiness" innan merge till main.

## 7. Risker och motåtgärder
- **Prestanda-flaskhalsar på mobil:** Pooling + culling + profileringspass dag 4 och 7.
- **Sync-drift mellan ljud och spawns:** Enhetstest för Conductor-integration samt realtidsloggning av beat-events.
- **UX-förvirring mellan lägen:** Tydlig menytext, tooltip och tutorial-overlay första gången vertikal läge startas.
- **Teknisk skuld:** Dokumentera ändringar och TODOs direkt i `docs/vertical-mode.md`; inga skjuta-fram-beslut utan logg.

## 8. Uppföljning och rapportering
- Efter varje större arbetsblock uppdateras denna plan med statusnoteringar och eventuella revideringar (git commit + tydlig rubrik).
- Dagligen (slut på dagen) skrivs en kort "Daily Vertical Update" i `QA/vertical_mode_testlog.md` med progress, blockerare och nästa steg.
- Om avvikelser upptäcks måste planen justeras omedelbart och kommuniceras i samma logg.

## 9. Startkriterier
- Alla förberedande verktyg (lint, testskript, profiler) fungerar lokalt.
- Branch `feat/vertical-scroller` skapad och synkad med main.
- Planen signerad genom att skapa första commit med dokumentet.

## 10. Avslutskriterier
- Vertikalt läge aktiverbart via meny, URL och env-flagga.
- Alla leverabler levererade och granskade.
- QA-loggar visar grön status för samtliga testfall inkl. regression.
- Dokumentation uppdaterad och godkänd.
- Merge till main och taggning `vX.Y-vertical-alpha` klar.

---
*Denna plan är bindande och ska följas och revideras under projektets gång. Varje utvecklingssteg måste valideras mot planen innan nästa steg initieras.*
