## 🎮 Spelkontroller

### PC
- **Rörelse:** WASD / piltangenter där spelaren navigerar runt skärmen för att undvika fiender 
    och sticky i X led (lane-baserat (X axeln), magnet till lane-centra och mellan-lane-ankare när spelaren inte styr i X-led). Lane centers är nu pixel-snap: LaneManager rundar centerpunkter och GameScene justerar Arcade-bodyn varje frame för att undvika jitter – samma logik driver även mellan-lane-ankarna.
- **Sikte:** muspekaren. (free aim)
- **Skott:** *push-to-shoot* → skott går iväg när musknappen trycks ner.
- **Powerups/Bomb:** högerklick eller tangent (t.ex. Space).

### Mobil
- **Rörelse:** Spelaren rör sig mot touchpoint och även siktar mot touchpoint → sticky till lane-centra samt mellan-lane-ankare när spelaren inte rör fingret + deadzone längs X axeln.
- **Sikte:** finger på skärmen.
- **Skott:** *hold-to-shoot* → när fingret är mot displayen.
- **Powerups/Bomb:** dubbeltryck.

---

## 🔫 Skjutmekanik

### Basläge
- Skott skjuts vid *click* musklick / finger på skärmen).
- Om click sker **inom beat-fönster** → skottet blir *perfect*:
  - Extra dmg
  - Bonuspoäng
  - Visuell effekt (flash, färgskift)

### Powerups
- **Rapidfire:** tillåter *auto-shoot* även vid nedtryckning (klassisk autofire).
- **Precision:** gör beat-fönstret större → lättare att få perfect.
- **Charge Shot:** håll inne → ladda laser, släpp på beat för max dmg.

---

## 🎵 Beat / Taktstruktur (4/4)

- **LanePatternController** (nytt 2025-03) lyssnar på `beat:low` och kör en deterministisk 16-beats loop: lane count 3→5→7→3, spawn-tabeller för varje slag samt visuell puls event. WaveDirector används som backup; dess playlists triggas när mönstret inte schemalägger något.
- **Beat 1 (Low/Kick):** rörelser (hopp, lane-shifts, spawn triggers). LanePatternController spawnar huvudsakligen lane-fiender och flooders här.
- **Beat 2 (Mid/Snare):** attacker (formation rotation, enemy shots).
- **Beat 3 (High/Hi-hat):** effekter (teleports, småfiender) + teleporter blink.
- **Beat 4 (Takt-slut):** specials (shuffle, lane flood, boss-intro) samt lane-expansion/kollaps.

---

## 👾 Fiendetyper

1. **Lane Hoppers**  
   - Hoppar rytmiskt mellan två lanes (på low beats).  
   - Byter partner-lane på varje fjärde takt (styrt av lane pattern).  

2. **Weavers**  
   - Rör sig i sinuskurvor över flera lanes.  
   - Synkas med hi-hats (beat 3).  
   - Implementerat: vertikal build 2025-09-27 – amplitude-boost och scrollburst på `beat:high`. 2025-03-palettuppdatering ger cyan/grön neonmix.  

3. **Formation Dancers**  
   - 3–5 fiender i en formation.  
   - Roterar eller byter plats på snare (beat 2).  
   - Implementerat: formtåget roterar offsets per `beat:mid`, lane-parametrar styr center och spacing. Ny palette = lila/neon-blå mix.

4. **Exploders**  
   - Långsamma.  
   - Exploderar i kulmönster om inte dödade inom 3 beats.  
   - Implementerat: vertikal build 2025-09-27 – lane-spawnade exploders får varningstelegram och radial explosion som gör skada vid träff. Paletten har uppdaterats till orange/brun för tydligare telegraph.

5. **Mirrorers**  
   - Speglar spelarens X-position.  
   - Rushar fram på high-beat (beat 3).  
   - Implementerat: följer spelarens X med boostfönster på hi-hat.  

6. **Teleporters**  
   - Försvinner från lane och dyker upp i annan lane på beat.  
   - Implementerat: blinkar på `beat:high` med laneswap + teleporterglow. Ring-pulse använder säkra tweens (Arc radius crash fix 2025-03).  

7. **Lane Flooders**  
   - Fyller en hel lane som en vägg.  
   - Tvingar spelaren byta lane.  
   - Implementerat: flood-wall spawn med telegraph och brett hitbox (turkos/grön uppdaterad CubeSkin).  

8. **Bosses**  
   - Stora skepp med beat-baserade attackfaser.  
   - Tål mycket men har skada-fönster i rytm (ex: endast skada på 1 & 3). Spawner justerar boss spawn-y så de alltid kommer in i bild.

---

## 🕹Exempel 1:  16-takters Flow (implementerat i LanePatternController)

### Takter 1–4
- Intro Groove: hoppers, weavers, teleporters.
- Global shuffle på takt 4.

### Takter 5–8
- Lane floods + formation dancers.
- Exploders på hi-hats, detonerar vid nästa low.
- Disco-flash på takt 8.

### Takter 9–12
- Mini-bosses med beat-baserade skottmönster.
- Diagonal formation dancers.
- Paus vid takt 12 (endast starfield pulserar).

### Takter 13–16
- Hi-hat spam av småfiender.
- Lane floods + teleports.
- Mirrorers jagar spelaren.
- Boss spawn på takt 16, bakgrund flashar.

## 🕹 Exempel 2: 16-takters Wave (implemented script)

### Takter 1–4 (Intro Groove)
- Beat 1: Lane Hoppers hoppar.  
- Beat 2: Weavers slingrar.  
- Beat 3: Teleporters blinkar.  
- Beat 4: Global shuffle (alla hoppers byter partner-lane).

### Takter 5–8 (Bygga intensitet)
- Lane Flood varje takt start.  
- Formation Dancers roterar på snare.  
- Exploders spawnar på hi-hats.  
- Beat 8: bakgrund flashar.

### Takter 9–12 (Peak Groove)
- Mini-bosses spawn i mitten-lanes.  
- Beat-baserade attackmönster:  
  - Low = rakt fram.  
  - Mid = sidospread.  
  - High = sicksack bullets.  
- Beat 12: Paus (endast starfield pulserar).

### Takter 13–16 (Drop / Kaos Mode)
- Beat 13: Snabba fiender (hi-hat spam).  
- Beat 14: Lane Flood + Teleports.  
- Beat 15: Mirrorers spawnar.  
- Beat 16: Boss spawn + bakgrund flash.


---

## 🎚 Svårighetsgrad & HP-skalning

- För detaljerad genomgång av profiler, stage ramps och hur du skapar nya svårighetsgrader, läs `docs/difficulty-system.md`.

## ✨ Neon Bakgrund & Banbelysning
- **NeonGrid** renderar bakgrundsrutnät och lane-gränser som futuristiska "runway lights". Garantier: rutnätets vertikala linjer matchar lane-borders och cellbredd = lane-bredd, så rutorna följer banans format oavsett 3/5/7 lanes. Varje lane-kant har ljusnoder som följer beatsekvenser (low/mid/high) och ger illusion av flöde längs banans sidor.
- Rutnätet andas med musiken – låga beats hoppar till nästa nod, mid-beats ger en längre svans, high-beats lägger ett mjukt overlay-glow.
- Systemet resnappar automatiskt när lane-antalet ändras eller skärmen resizas så att rutnätet alltid lirar med lane-geometrin.

- **Fiende-HP:** alltid multipler av beats (1, 2, 4).  
- **Exempel:**  
  - Små fiender = 1 HP → dör på ett skott.  
  - Mellanfiender = 2 HP → dör på 2 beat-fönster.  
  - Exploders = 3 HP → om de överlever → exploderar själva.  
  - Mini-boss = 16 HP → delas in i 4 faser (varje fas = 4 beats).  

- **Scaling:**  
  ```hp = base_hp * (1 + wave_index * 0.1)```  
  - HP ökar 10% för varje ny wave.  
  - BPM påverkar → högre BPM = lägre HP (för att inte sinka flow).  

---

## 🔊 Announcer Voices

- Tre röstbanker är aktiva: `default`, `bee` och `cyborg` (robotisk kvinnlig AI med futuristisk klang).
- Cue-mapparna hålls i `src/systems/Announcer.ts`; respektive röstpaket ligger under `src/assets/audio/sfx/voices/<voice>/` med både `.wav` (mono 44.1 kHz) och `.mp3`-speglar för webbfallbacks.
- Cyborg-rösten genereras via Edge TTS (se `tools/voices/cyborg/` plus dokumentationen i `docs/announcer_voice_clips.md` och `docs/voice_profiles/cyborg.md`). Kör `python3 tools/voices/cyborg/generate_clips.py --force` efter att ha aktiverat venv för att uppdatera klippen.
- BootScene glob-laddar alla `announcer_*`-klipp, så nya röster eller alternate takes kräver bara att filer med rätt namnkonvention läggs in.


💡 Alternativa idéer
Lane-Synkad Fire: skott skjuts automatiskt när fiender är “aligned” med spelaren.

Adaptive Fire: standard = beat-synkad, rapidfire = friform spam.

Combo Chain: träffa 4 perfect i rad → combo bonus (extra skada/poäng).

---
Dynamiska lanes
🎵 16-takters Wave med Dynamiska Lanes
Takter 1–4 (Intro – 3 lanes)
Beat 1: Hoppers i vänster/höger lane.

Beat 2: Weavers slingrar över två lanes.

Beat 3: Små teleporters blinkar.

Beat 4: Kollaps till mitten-lane → allt centras, starfield pulserar.

👉 Spelaren får “enkel start” med tydlig rytm.

Takter 5–8 (Build – 5 lanes)
Beat 1: Lane Flood i yttre lanes.

Beat 2: Formation Dancers byter plats i mid-lanes.

Beat 3: Exploders spawnar på hi-hats.

Beat 4: Expansion till 5 lanes → neon-grid drar isär, pulserande glow.

👉 Intensiteten ökar, mer sidoförflyttning krävs.

Takter 9–12 (Peak – 7 lanes)
Beat 1: Mini-boss spawn i mitten-lane (lane 4).

Beat 2: Boss skjuter spread på snare.

Beat 3: Snabba småfiender i ytterlanes.

Beat 4: Full expansion till 7 lanes → mitt-lane öppnas upp, fiender hoppar fritt mellan lanes.

👉 Allt kaosar men rytmiskt, spelaren måste använda mitt-lane som “ankare”.

Takter 13–16 (Drop/Kaos → Release)
Beat 1: Mirrorers spawnar, speglar spelarens rörelser.

Beat 2: Lane Flood mitt i banan.

Beat 3: Exploders + teleporters blinkar i sync.

Beat 4: Kollaps tillbaka till 3 lanes → neon-griden “andas in”, världen lugnar sig.

👉 Efter droppet får spelaren andas, men sitter kvar med en adrenalinkick.

✨ Visuella Effekter för Lanes
Expansion: lanes “glider isär” med neon trails, grid sträcks ut.

Kollaps: lanes smälter ihop mot mitten, glow dras inåt som ett vakuum.

Mitt-lane (vid 7 lanes): får egen glow (ljusare/starkare) för att kännas som ett centrum.

👉 Det här gör att banan aldrig känns statisk. Den andas med musiken och fienderna dansar i samma koreografi.
---
