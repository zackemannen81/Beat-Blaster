# Beat Blaster – Sprint 1 Handoff Brief

## Summary
Beat Blaster now ships with the vertical rhythm shooter slice targeted for Sprint 1. Core systems implemented on branch `dev`:
- Lane-managed vertical traversal with full XY thrust; lane snapping only engages when horizontal input is idle.
- Click-to-fire restored as the default with beat grading preserved, plus an option to unlock free mouse aiming in vertical mode.
- Lane-aware enemy pipeline including the prototype LaneHopper pattern that hops on `beat:low` events.
- HUD telemetry for BPM, lane count, and shot quality to close the feedback loop for playtests.

The omni-directional arena mode remains intact. Vertical mode is now the default gameplay mode in Options. Build tooling still uses Vite + TypeScript with Phaser 3.80.

## Environment & Tooling
- Node.js 18.x+ recommended (tested locally with Node 20 LTS).
- Install deps: `npm install`
- Run dev server: `npm run dev`
- Production bundle: `npm run build` (current build passes; expect Rollup warning about >500 kB chunk size)
- Tests: `npm run test` (Vitest; no Sprint 1 unit tests yet)
- Engine: Phaser 3.80.x

Useful docs
- `docs/ROADMAP.md` – project phases & milestones
- `docs/sprint1_checklist.md` – acceptance checklist for this sprint
- `docs/vertical-mode.md` – legacy control reference (needs refresh post-handoff)

## Feature Status
### LaneManager & Sticky Movement
- Implemented in `src/systems/LaneManager.ts` with resize-aware rebuilds, event emitter, and optional debug overlay.
- `GameScene` now allows continuous movement on both axes while snapping the player back to the nearest lane whenever horizontal input is neutral (`src/scenes/GameScene.ts`).
- Lane count currently static per difficulty profile (Normal → 6). TODO: hook dynamic lane count swaps planned for Sprint 2.

### Fire & Aim
- `BeatWindow` helper (`src/systems/BeatWindow.ts`) still grades timing, but firing defaults to classic click/hold behaviour again (`src/scenes/GameScene.ts`).
- OptionsScene gained a `Mouse Aim Unlock` toggle so testers can enable free pointer aiming in vertical mode; when locked, vertical mode reverts to forward-facing aim (`src/scenes/OptionsScene.ts`, `src/scenes/GameScene.ts`).
- HUD exposes real-time shot feedback plus BPM/lane count widgets (`src/ui/HUD.ts:55`).
- Tuning: `BeatWindow` window ratio defaults to 0.15; adjust once latency calibration UI from Options scene is revived.

### LaneHopper Pattern
- `Spawner` now supports `lane_hopper` pattern descriptors with beat counters and tween storage (`src/systems/Spawner.ts`).
- `GameScene` listens to `beat:low`, increments per-enemy beat state, and drives a 140 ms Sine tween back into the lane manager (`src/scenes/GameScene.ts`).
- Wave library includes the first lane hopper encounter for Normal difficulty (`src/config/waves/normal.json`). Extend playlists for Easy/Hard.

### HUD & Telemetry
- New HUD fields: BPM, lane count, shot feedback. Layout auto-adjusts on resize (`src/ui/HUD.ts:147`).
- Combo indicator unchanged but still resets on miss or lane hopper escape.

## QA Snapshot (Sprint 1)
- Build: `npm run build` (success, chunk size warning only).
- Manual passes outstanding per checklist (BPM variants, mobile touch vs desktop, performance soak, latency tuning).
- No automated unit tests cover BeatWindow or LaneManager yet; consider adding Vitest cases for lane geometry and beat window thresholds.

## Known Gaps & Next Steps
1. **Dynamic lane phases** – Planned feature to cycle 3→5→7 lanes by bar; requires LaneManager.rebuild + re-snap of player/enemies.
2. **Analyzer fallback** – Lane hopper currently assumes analyzer fires `beat:low`. Implement BPM fallback path before QA.
3. **HUD polish** – Shot feedback should fade faster on mobile (verify with actual touch devices).
4. **Wave coverage** – Add lane hopper patterns to `easy.json` and `hard.json`; ensure enemy counts respect lane availability.
5. **Options UI** – Surface BeatWindow window ratio & lane debug toggle for testers (new mouse aim toggle is in place).
6. **Docs** – Update `docs/vertical-mode.md` to detail free-aim toggle and lane snap behaviour.

## Hand-off Checklist
- [ ] Review `docs/sprint1_checklist.md` and tick completed items; add notes for outstanding QA rows.
- [ ] Run `npm run dev` and validate vertical mode with latest assets.
- [ ] Confirm tracks in `src/config/tracks.json` reference desired difficulty profiles and BPM metadata (critical for BeatWindow accuracy).
- [ ] Coordinate with art/audio for lane hopper telegraphing (currently reuses generic telegraph visuals).
- [ ] Prep Sprint 2 backlog: dynamic lanes, additional enemy patterns, latency calibration UI.

## Contact & Ownership
- Gameplay engineering lead: _TBD_ (assign on team stand-up)
- Audio/Analyzer: ensure someone owns fallback tuning and metronome assets
- QA lead: define manual pass template using the Test & Kvalitet section from `docs/sprint1_checklist.md`

Keep this brief updated after each sprint review so future hand-offs stay accurate.
