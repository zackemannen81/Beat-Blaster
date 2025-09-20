# Beat-Blaster

Beat-Blaster is a rhythm-driven arcade shooter built with Phaser 3. It now ships with both the legacy omni-directional arena mode and a brand new vertical scroller variant that syncs enemy formations with the soundtrack.

## Getting Started
1. Install dependencies: `npm install`
2. Start the dev server: `npm run dev`
3. Build for production: `npm run build`

## Game Modes
- **Omni (default)** – free-movement arena matching the original prototype. Launch with `?mode=omni` or pick it from Options.
- **Vertical** – forward-scrolling shmup that clamps the player to the lower screen band. Launch with `?mode=vertical` or leave Options on the default setting.

See `docs/vertical-mode.md` for full details on controls, stage/boss flow, difficulty profiles, and QA steps.

## Difficulty Profiles
Difficulty is selected per track (`src/config/tracks.json`) and influences scroll speed, spawn density, enemy HP, and miss penalties. Easy, Normal, and Hard profiles are bundled by default.

## Reduced Motion
Players can toggle Reduced Motion in the Options scene. When enabled, Beat-Blaster swaps heavy camera shakes and particle storms for lightweight feedback suitable for sensitive players.

## License
See `LICENSES.md` for third-party asset information.
