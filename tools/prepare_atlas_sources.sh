#!/usr/bin/env bash
set -euo pipefail

SRC_ROOT="vendor/kenney/extract"
OUT_ROOT="tools/atlas_src"

rm -rf "$OUT_ROOT"
mkdir -p "$OUT_ROOT/gameplay" "$OUT_ROOT/ui" "$OUT_ROOT/particles"

# Gameplay mappings
cp -f "$SRC_ROOT/PNG/playerShip1_blue.png"            "$OUT_ROOT/gameplay/player_idle.png"
cp -f "$SRC_ROOT/PNG (Transparent)/muzzle_01.png"     "$OUT_ROOT/gameplay/player_thruster_0.png" || true
cp -f "$SRC_ROOT/PNG (Transparent)/muzzle_02.png"     "$OUT_ROOT/gameplay/player_thruster_1.png" || true
cp -f "$SRC_ROOT/PNG (Transparent)/muzzle_03.png"     "$OUT_ROOT/gameplay/player_thruster_2.png" || true
cp -f "$SRC_ROOT/PNG (Transparent)/muzzle_04.png"     "$OUT_ROOT/gameplay/player_thruster_3.png" || true
cp -f "$SRC_ROOT/PNG/Lasers/laserBlue06.png"          "$OUT_ROOT/gameplay/bullet_basic.png"
cp -f "$SRC_ROOT/PNG/Lasers/laserGreen06.png"         "$OUT_ROOT/gameplay/bullet_split.png"
cp -f "$SRC_ROOT/PNG/Enemies/enemyBlue1.png"          "$OUT_ROOT/gameplay/enemy_brute_0.png"
cp -f "$SRC_ROOT/PNG/Enemies/enemyBlue2.png"          "$OUT_ROOT/gameplay/enemy_brute_1.png"
cp -f "$SRC_ROOT/PNG/Enemies/enemyBlue3.png"          "$OUT_ROOT/gameplay/enemy_brute_2.png"
cp -f "$SRC_ROOT/PNG/Enemies/enemyBlue4.png"          "$OUT_ROOT/gameplay/enemy_brute_3.png"
cp -f "$SRC_ROOT/PNG/Enemies/enemyRed1.png"           "$OUT_ROOT/gameplay/enemy_dasher_0.png"
cp -f "$SRC_ROOT/PNG/Enemies/enemyRed2.png"           "$OUT_ROOT/gameplay/enemy_dasher_1.png"
cp -f "$SRC_ROOT/PNG/Enemies/enemyRed3.png"           "$OUT_ROOT/gameplay/enemy_dasher_2.png"
cp -f "$SRC_ROOT/PNG/Enemies/enemyRed4.png"           "$OUT_ROOT/gameplay/enemy_dasher_3.png"
cp -f "$SRC_ROOT/PNG/Enemies/enemyGreen1.png"         "$OUT_ROOT/gameplay/enemy_swarm_0.png"
cp -f "$SRC_ROOT/PNG/Enemies/enemyGreen2.png"         "$OUT_ROOT/gameplay/enemy_swarm_1.png"
cp -f "$SRC_ROOT/PNG/ufoBlue.png"                     "$OUT_ROOT/gameplay/elite_body.png"
cp -f "$SRC_ROOT/PNG (Transparent)/flare_01.png"      "$OUT_ROOT/gameplay/elite_telegraph.png" || true
cp -f "$SRC_ROOT/PNG/Power-ups/powerupBlue_shield.png" "$OUT_ROOT/gameplay/pickup_shield.png"
cp -f "$SRC_ROOT/PNG/Power-ups/powerupYellow_bolt.png" "$OUT_ROOT/gameplay/pickup_rapid.png"
cp -f "$SRC_ROOT/PNG/Power-ups/powerupRed_star.png"    "$OUT_ROOT/gameplay/pickup_split.png"
cp -f "$SRC_ROOT/PNG/Power-ups/powerupGreen_star.png"  "$OUT_ROOT/gameplay/pickup_magnet.png"
cp -f "$SRC_ROOT/PNG/Power-ups/powerupBlue.png"        "$OUT_ROOT/gameplay/pickup_slowmo.png"
cp -f "$SRC_ROOT/PNG (Transparent)/spark_01.png"       "$OUT_ROOT/gameplay/hit_spark_0.png" || true
cp -f "$SRC_ROOT/PNG (Transparent)/spark_02.png"       "$OUT_ROOT/gameplay/hit_spark_1.png" || true
cp -f "$SRC_ROOT/PNG (Transparent)/spark_03.png"       "$OUT_ROOT/gameplay/hit_spark_2.png" || true
cp -f "$SRC_ROOT/PNG (Transparent)/spark_04.png"       "$OUT_ROOT/gameplay/hit_spark_3.png" || true
cp -f "$SRC_ROOT/PNG/Effects/fire00.png"               "$OUT_ROOT/gameplay/explosion_0.png"
cp -f "$SRC_ROOT/PNG/Effects/fire01.png"               "$OUT_ROOT/gameplay/explosion_1.png"
cp -f "$SRC_ROOT/PNG/Effects/fire02.png"               "$OUT_ROOT/gameplay/explosion_2.png"
cp -f "$SRC_ROOT/PNG/Effects/fire03.png"               "$OUT_ROOT/gameplay/explosion_3.png"
cp -f "$SRC_ROOT/PNG/Effects/fire04.png"               "$OUT_ROOT/gameplay/explosion_4.png"
cp -f "$SRC_ROOT/PNG/Effects/fire05.png"               "$OUT_ROOT/gameplay/explosion_5.png"
cp -f "$SRC_ROOT/PNG/Effects/fire06.png"               "$OUT_ROOT/gameplay/explosion_6.png"
cp -f "$SRC_ROOT/PNG/Effects/fire07.png"               "$OUT_ROOT/gameplay/explosion_7.png"

# UI mappings (placeholders where needed)
cp -f "$SRC_ROOT/PNG/UI/playerLife2_red.png"           "$OUT_ROOT/ui/heart_full.png"
cp -f "$SRC_ROOT/PNG/UI/playerLife2_blue.png"          "$OUT_ROOT/ui/heart_empty.png"
cp -f "$SRC_ROOT/PNG/UI/buttonBlue.png"                "$OUT_ROOT/ui/bomb_meter_bg.png"
cp -f "$SRC_ROOT/PNG/UI/buttonGreen.png"               "$OUT_ROOT/ui/bomb_meter_fill.png"
cp -f "$SRC_ROOT/PNG/UI/numeralX.png"                  "$OUT_ROOT/ui/multiplier_icon.png"
cp -f "$SRC_ROOT/PNG (Transparent)/circle_01.png"      "$OUT_ROOT/ui/accuracy_ring_0.png" || true
cp -f "$SRC_ROOT/PNG (Transparent)/circle_02.png"      "$OUT_ROOT/ui/accuracy_ring_1.png" || true
cp -f "$SRC_ROOT/PNG (Transparent)/circle_03.png"      "$OUT_ROOT/ui/accuracy_ring_2.png" || true
cp -f "$SRC_ROOT/PNG (Transparent)/circle_04.png"      "$OUT_ROOT/ui/accuracy_ring_3.png" || true
cp -f "$SRC_ROOT/PNG/UI/buttonGreen.png"               "$OUT_ROOT/ui/btn_primary.png"
cp -f "$SRC_ROOT/PNG/UI/buttonBlue.png"                "$OUT_ROOT/ui/btn_secondary.png"
cp -f "$SRC_ROOT/PNG/UI/buttonBlue.png"                "$OUT_ROOT/ui/panel_9slice.png"  # placeholder
cp -f "$SRC_ROOT/PNG/UI/cursor.png"                    "$OUT_ROOT/ui/cursor_crosshair.png"
# icons placeholders
cp -f "$SRC_ROOT/PNG (Transparent)/symbol_01.png"      "$OUT_ROOT/ui/icon_music.png" || true
cp -f "$SRC_ROOT/PNG (Transparent)/symbol_01.png"      "$OUT_ROOT/ui/icon_sfx.png" || true
cp -f "$SRC_ROOT/PNG (Transparent)/symbol_01.png"      "$OUT_ROOT/ui/icon_contrast.png" || true
cp -f "$SRC_ROOT/PNG (Transparent)/symbol_01.png"      "$OUT_ROOT/ui/icon_shader.png" || true
cp -f "$SRC_ROOT/PNG (Transparent)/symbol_01.png"      "$OUT_ROOT/ui/icon_metronome.png" || true
cp -f "$SRC_ROOT/PNG (Transparent)/symbol_01.png"      "$OUT_ROOT/ui/icon_offset.png" || true
cp -f "$SRC_ROOT/PNG (Transparent)/symbol_01.png"      "$OUT_ROOT/ui/icon_gamepad.png" || true

# Particles
cp -f "$SRC_ROOT/PNG (Transparent)/circle_02.png"      "$OUT_ROOT/particles/particle_circle_small.png" || true
cp -f "$SRC_ROOT/PNG (Transparent)/light_02.png"       "$OUT_ROOT/particles/particle_glow_small.png" || true
cp -f "$SRC_ROOT/PNG (Transparent)/trace_01.png"       "$OUT_ROOT/particles/trail_streak.png" || true
cp -f "$SRC_ROOT/PNG (Transparent)/star_03.png"        "$OUT_ROOT/particles/star_small.png" || true

echo "Prepared atlas sources under $OUT_ROOT" 
