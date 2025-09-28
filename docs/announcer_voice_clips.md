# Announcer Voice Clip Requirements

## System Overview
- Central announcer logic maps gameplay events to audio keys per voice id (`default`, `bee`, `cyborg`) and handles priorities, cooldowns, and fallbacks; see `src/systems/Announcer.ts:11`.
- BootScene preloads every announcer asset; use it as the source of truth for file names and formats (`.wav` primary, optional `.mp3` mirror) in `src/scenes/BootScene.ts:150`.
- GameScene dispatches announcer events for run flow, powerups, combos, bombs, and wave telegraphs; key call sites are `src/scenes/GameScene.ts:589`, `src/scenes/GameScene.ts:642`, `src/scenes/GameScene.ts:1210`, `src/scenes/GameScene.ts:2054`, and `src/scenes/GameScene.ts:2249`.
- Lane-driven wave scripting guarantees varied enemy patterns and lane transitions (3→5→7→3) every 16 beats, making enemy-specific and lane-transition callouts essential; see `docs/Beat-blaster_MechanicsAndFeatures.md:85` and `docs/About.md:9`.

## Tier 0 - Existing Hooks (Must Ship)

| Base Key | Trigger (code ref) | Assets Present (default / bee) | Script Direction | Gaps / Action |
| --- | --- | --- | --- | --- |
| `new_game` | Run start `src/scenes/GameScene.ts:589` | yes / yes | 0.8 s hype greeting ("Systems green, ride the beat.") | Capture 2 takes per voice to reduce repetition. |
| `get_ready` | Stage reset after boss `src/scenes/GameScene.ts:2126` | alias to `new_game` / yes | Quick reset cue ("Get ready for the next barrage.") | Record unique default clip; consider stage callouts. |
| `boss` | Boss spawn `src/scenes/GameScene.ts:2139` | no / yes | High urgency ("Boss inbound, brace!") | Add default-voice asset and optional alt take. |
| `warning` | Heavy telegraph or scripted danger `src/scenes/GameScene.ts:2054` | yes / yes | Sharp danger bark tied to heavy beats | Provide zone/line/circle variants or alternates to avoid fatigue. |
| `enemies_approching` | Non-heavy telegraph `src/scenes/GameScene.ts:2054` | yes / yes | Calm alert ("Inbound patrol, stay sharp.") | Record second variation for pacing variety. |
| `powerup` | Preface on pickup `src/systems/Announcer.ts:86` | yes / yes | <=0.4 s stinger ("Power-up acquired.") | Keep tight timing so follow-up clip is audible. |
| `shield` / `rapid_fire` / `split_shot` / `slowmo` | Specific powerup follow-up `src/scenes/GameScene.ts:1210` | yes / yes | Name the buff, upbeat ("Shield online!", "Rapid fire engaged!") | Verify consistent emphasis per voice; record backup takes. |
| `bomb_ready` | Bomb meter hits 100% `src/scenes/GameScene.ts:2249` | yes / yes | Triumphant escalation ("Mega bomb ready.") | Add alternate with shorter tail for dense fights. |
| `combo` | Combo multiples of 10 `src/scenes/GameScene.ts:642` | yes / uses `announcer_bee_wave` | Celebratory line ("Combo ten! Keep it up!") | Rename bee asset to `announcer_bee_combo` for clarity; script milestone variants (10/20/30+). |

## Tier 1 - High Impact Additions (Implement Next)

| Proposed Key(s) | Trigger (ref) | Script Direction | Rationale |
| --- | --- | --- | --- |
| `stage_clear` | Immediately before `get_ready`, when boss defeated `src/scenes/GameScene.ts:2120` | Short victory tag ("Stage clear. Take a breath.") | Differentiates success from prep; avoids reusing `get_ready`. |
| `lane_expand` / `lane_collapse` / `lane_pulse` | Lane transitions driven by pattern `docs/Beat-blaster_MechanicsAndFeatures.md:167` & `src/systems/LanePatternController.ts:101` | Call out grid shifts ("Lanes expanding-spread out!") | Reinforces dynamic lane gameplay and prepares players for spacing change. |
| `enemy_swarm` / `enemy_weaver` / `enemy_mirrorer` / `enemy_teleporter` / `enemy_flooder` / `enemy_dasher` / `enemy_exploder` / `enemy_brute` / `enemy_formation` | Wave telegraph by `enemyType` `src/config/waves/*.json` | One-second descriptors ("Teleporters blinking in!") | Ties VO to archetype behaviour; supports telegraph readability. |
| `telegraph_zone` / `telegraph_line` / `telegraph_circle` | Telegraph display type `src/types/waves.ts:23` | Brief geometry hints ("Line threat ahead.") | Helps players parse warning visuals, especially with reduced-motion mode. |
| `wave_heavy` / `wave_boss` | Heavy/boss `WaveDescriptor.category` `src/types/waves.ts:28` | Elevated urgency ("Heavy formation inbound!") | Distinguishes heavy cadence vs standard swarms beyond generic warning. |
| `player_low_hp` | HP drops to 1 in `damagePlayer` `src/scenes/GameScene.ts:2070` | Concerned alert ("Critical damage! Evade now!") | Gives audio feedback for accessibility and focus. |
| `bomb_deployed` | When bomb fires `src/scenes/GameScene.ts:2221` | Cathartic line ("Bomb unleashed!") | Confirms activation in hectic visuals. |
| `game_over` | Run ends `src/scenes/GameScene.ts:2281` | Somber wrap ("Run complete. Uploading score.") | Adds closure before ResultScene and supports streaming. |
| `analyzer_fallback` / `analyzer_resync` | Analyzer loses/regains beat `docs/About.md:7` | Informative system status | Alerts players when rhythm assist changes accuracy expectations. |

## Tier 2 - Future-Proofing & Planned Features

| Proposed Key(s) | Planned Context (ref) | Script Direction | Notes |
| --- | --- | --- | --- |
| `boss_phase_<n>` / `boss_shield_down` | Boss timelines & HP gates `docs/About.md:32` | Phase markers ("Phase two-pattern change!") | Align with upcoming `BossPatternTimeline`. |
| `lane_transition_warning` | Planned lane transition controller `docs/About.md:40` | Advance notice before dramatic lane changes | Pair with camera easing for accessibility. |
| `challenge_modifier_on` / `challenge_modifier_off` | Challenge modes & modifiers `docs/About.md:34` | Explain rule tweaks ("Hardcore rules engaged.") | Supports seasonal/challenge playlists. |
| `latency_calibration_intro` | Latency UI workflow `docs/About.md:30` | Guidance prompt | VO for calibration tutorial once implemented. |

## Recording & Delivery Guidelines
- Follow SFX spec: mono 44.1 kHz WAV masters with optional MP3 mirrors for Safari compatibility (`docs/beat_blaster_assets_spec.md:49`).
- Peak loudness around -12 LUFS for VO; leave >=0.5 dB headroom to coexist with music sidechain.
- Provide at least two clean takes per cue plus one expressive variant for dynamic selection.
- Keep runtime per clip <=1.2 s unless marked as tutorial; ensure `powerup` intro <=0.4 s so chained clips remain audible.
- Trim leading/trailing silence (<10 ms) and note pronunciation for unique terms ("Beat Blaster", "Neon Crusader").

## Asset Naming & Integration Notes
- Mirror existing naming: `announcer_<cue>.wav` for default voice, `announcer_<voice>_<cue>.wav` for alternates; BootScene auto-loads anything matching that pattern under `src/assets/audio/sfx/**`.
- For combo milestones, adopt explicit filenames (`announcer_combo_10.wav`, etc.) and extend `playCombo` logic accordingly (`src/systems/Announcer.ts:98`).
- Document script text, emotional intensity, and length per cue in source control alongside audio (`docs/voice_scripts/` recommended) to aid localisation.
- After importing new assets, run `npm run build` to confirm bundle size and audio cache registration; check console for missing-key warnings during `npm run dev`.

## Cyborg Voice Pipeline
- Script & prompts live in `tools/voices/cyborg/lines.json`.
- Render clips with `tools/voices/cyborg/generate_clips.py` (edge-tts via the local venv). Default output lands in `src/assets/audio/sfx/voices/cyborg/` with both WAV and MP3 mirrors.
- BootScene auto-loads any announcer assets that exist under `src/assets/audio/sfx/**`; no manual registration required.
- Placekeeping README in `src/assets/audio/sfx/voices/cyborg/README.md` describes mastering targets and file layout.

## Post-generation QA Checklist
- [ ] Verify every generated key resolves in-game by checking the console for `announcer_*` load errors during `npm run dev`.
- [ ] Spot-check clip loudness (target -12 LUFS) and ensure no tails exceed 1.2 s unless intended.
- [ ] Play a vertical run: confirm `new_game`, `warning`, `powerup`, and `bomb_ready` fire with the Cyberg timbre.
- [ ] Trigger combo 10/20/30 (use debug or sandbox) to validate milestone routing via `playCombo`.
- [ ] Simulate analyzer drop (`window.dispatchEvent(new CustomEvent('conductor:analyzer:fallback'))` or disable analyser) and ensure fallback/resync cues play.
- [ ] Capture final waveform hashes and update docs if alternate takes replace existing masters.
