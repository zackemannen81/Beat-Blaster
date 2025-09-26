# Beat Blaster Roadmap

## Product Vision & Goals
- Deliver a rhythm-driven twin-stick shooter that feels responsive across browsers and input devices.
- Convert the audio analysis tech into a reusable engine that supports both analyzer-based and BPM-scripted tracks.
- Launch with two polished tracks, a balanced difficulty curve, and platform-ready deployment assets.
- Reach performance targets: 60 FPS on mid-tier laptops, <2 s initial load, and <50 ms average input-to-action latency.

## Guiding Principles
- Build a resilient, data-driven architecture first; layer visual polish after the core loop is fun.
- Keep accessibility, calibration, and fallback behaviours first-class at every milestone.
- Gate complexity behind measurable outcomes: only graduate features once they survive QA and playtest feedback.
- Automate validation (lint, type checks, build, unit timing tests) so feature teams spend cycles on design and tuning.

## Delivery Model
- Cadence: 1-week sprints inside 4 major phases; mid-phase design reviews and end-of-phase greenlight checks.
- Roles: Tech lead (engine + infrastructure), gameplay engineer, audio/UX engineer, artist, QA lead, producer.
- Ceremonies: Daily stand-up, weekly backlog refinement, fortnightly playtest, phase post-mortem.
- Toolchain: Vite + Phaser + TypeScript, GitHub Actions CI, Playwright smoke suite, automated bundle analysis.

## Phase Overview

| Phase | Length | Primary Objective | Exit Criteria |
| ----- | ------ | ----------------- | ------------- |
| 0. Discovery & Setup | 1 sprint | Confirm scope, pipelines, and baseline architecture | Repos seeded, CI green, core configs validated |
| 1. Core Foundation | 2 sprints | Build boot/menu flow, config loaders, audio analyzer shell | BootScene/MenuScene functional, analyzer emitting events, options persisted |
| 2. Core Loop | 3 sprints | Implement combat loop, enemy behaviours, conductor | GameScene playable end-to-end, scoring & combo live, beat-aligned spawns stable |
| 3. Content & Systems | 3 sprints | Add powerups, VFX, additional track, accessibility | Powerups balanced, particle/shader toggles, options complete, second track tuned |
| 4. Polish & Launch | 2 sprints | QA, performance tuning, deployment & docs | QA sign-off, build pipeline optimised, storefront assets ready |
| 5. Post-Launch | ongoing | Live telemetry, bug triage, content roadmap | Crash-free sessions >99%, backlog groomed, first content patch scoped |

## Phase Breakdown

### Phase 0 – Discovery & Setup
- Finalise design requirements from `beat_blaster_full_game_specification.md` and freeze MVP scope.
- Stand up mono-repo structure: `/client`, optional `/server`, shared `/docs` for specs.
- Configure ESLint, Prettier, Vitest/Playwright harness, and GitHub Actions (lint → test → build).
- Produce initial UX wireframes and concept art; lock on visual tone and accessibility palette.
- Draft risk register and dependency map (audio assets, shader R&D, backend availability).

### Phase 1 – Core Foundation
- Implement BootScene preloaders with error handling and audio unlock workflow.
- Build MenuScene with track selection stub, options persistence scaffold (localStorage wrapper, schema validation).
- Create audio analyzer service with fallback to BPM schedules; expose events bus.
- Establish data contracts for `tracks.json`, `balance.json`, and environment configs; add JSON schema tests.
- Deliver first vertical slice review (menu → start track → fail placeholder enemy) with automation running.

### Phase 2 – Core Loop
- Implement GameScene layering, camera, physics bounds, and pooled entity factories.
- Ship player controller with WASD+mouse / gamepad parity, damage handling, invulnerability frames.
- Add bullet pool, muzzle flash VFX hooks, and collision resolution.
- Build conductor system listening to beat events and RNG seeds; encode spawn patterns per difficulty tier.
- Implement scoring, combo, hit grading logic with unit tests covering timing windows and multiplier decay.
- Conduct weekly playtests and adjust movement tuning, readability, and beat detection thresholds.

### Phase 3 – Content & Systems
- Introduce enemy variants (Brute, Dasher, Swarm, Elite) with telegraphs and balance curves from `balance.json`.
- Integrate powerups (Shield, Rapid, Split-shot, Magnet, Slow-mo) and HUD timers with refresh rules.
- Add particle systems, screen shake, post-processing toggles, and performance caps.
- Build pause menu, results scene, local leaderboard, and optional online leaderboard stub.
- Onboard second music track; calibrate analyzer offsets, revise spawn charts, and add QA regression suite.
- Complete accessibility options (high contrast, color presets, metronome, input offset per track).

### Phase 4 – Polish & Launch
- Optimise asset pipeline: texture atlases, audio normalisation, lazy loading strategies.
- Add analytics hooks, crash logging, and deterministic seed logging for bug reproduction.
- Harden error flows (asset retry screens, network fallbacks) and UI polish (gamepad navigation, focus states).
- Run cross-browser certification, performance benchmarking, and network/APM smoke tests.
- Finalise marketing materials (screenshots, trailer snippets), write README and tuning guides, prepare PWA metadata.
- Conduct launch readiness review: QA sign-off, producer go/no-go, release checklist executed.

### Phase 5 – Post-Launch Operations
- Monitor telemetry for crash rate, average session length, retention; collect player feedback.
- Maintain live ops playbook: hotfix protocol, weekly triage, monthly content drop planning.
- Plan track packs and enemy variants using data-driven insights; keep difficulty profiles fresh.
- Schedule technical debt sprints (shader improvements, profiler-driven refactors, backend hardening).

## Parallel Workstreams
- **Audio & Music**: Commission or license tracks, ensure loudness normalisation, create beat maps for fallback, implement calibration UI.
- **Art & VFX**: Produce sprite atlases, HUD elements, and shader library; iterate on readability during QA feedback loops.
- **Backend & Online**: Design optional leaderboard microservice, implement validation, rate limiting, CORS policy, and deploy.
- **QA & Tooling**: Expand automated tests (timing windows, save/load, options), maintain manual regression checklist, manage bug tracking board.
- **Community & Support**: Draft support FAQs, community moderation guidelines, and roadmap reveal cadence.

## Risk & Mitigation
- Analyzer instability → Maintain BPM-scripted fallback and seed logging for repro.
- Performance regressions → Enforce profiler runs each sprint, guard max particle/bullet counts via config.
- Accessibility gaps → Schedule dedicated pass with assistive tech testing before launch lock.
- Scope creep → Phase gates require measurable exit criteria; backlog triaged weekly by producer.
- Asset delivery slippage → Parallelize placeholder art/audio with tight feedback loops; maintain asset tracker.

## Metrics & Quality Gates
- Functional: All CI jobs must pass; blocker bugs = 0 before phase close.
- Performance: FPS ≥ 60 (mid-tier), frame pacing variance <8 ms, memory <250 MB after 10 min session.
- UX: Tutorial completion >85% of new players; menu navigation success (no keyboard trap) validated.
- Audio: Latency calibration within ±10 ms of target on supported browsers; fallback accuracy >95% beat alignment.
- Accessibility: AA contrast ratios; screen reader-friendly menus; single-switch navigation passes heuristics.

## Release Management
- Branching: `main` (release), `develop` (integration), feature branches; protected branch rules with code review.
- Versioning: Semantic version tags; changelog updated each sprint.
- Deployment: Automated preview builds per PR, staging environment mirroring production CDN settings.
- Launch: Staged rollout if backend enabled; dark-launch telemetry, then public announcement once stability confirmed.
- Post-launch patches: Hotfix SLA <24 h for crashers, <72 h for major gameplay defects.

## Documentation & Knowledge Sharing
- Maintain `/docs` with design specs, tuning notes, and onboarding guides.
- Record critical architectural decisions in ADR format.
- Host fortnightly knowledge-share sessions focusing on tooling, balancing insights, or postmortems.
- Keep ROADMAP updated after each phase review; archive retired initiatives for traceability.
