#!/usr/bin/env bash
set -euo pipefail

if ! command -v TexturePacker >/dev/null 2>&1; then
  echo "TexturePacker CLI not found. Install from https://www.codeandweb.com/texturepacker and ensure 'TexturePacker' is in PATH." >&2
  exit 1
fi

SRC_ROOT="tools/atlas_src"
OUT_ROOT="src/assets/sprites"

mkdir -p "$OUT_ROOT"

pack() {
  local src_dir=$1
  local sheet=$2
  local data=$3
  echo "Packing $src_dir -> $sheet / $data"
  TexturePacker \
    --format json \
    --data "$data" \
    --sheet "$sheet" \
    --trim-mode Trim \
    --extrude 2 \
    --padding 4 \
    --scale 1 \
    --disable-rotation \
    --force-squared \
    --max-width 2048 --max-height 2048 \
    --premultiply-alpha \
    "$src_dir"
}

pack "$SRC_ROOT/gameplay" "$OUT_ROOT/gameplay.atlas.png" "$OUT_ROOT/gameplay.atlas.json"
pack "$SRC_ROOT/ui"       "$OUT_ROOT/ui.atlas.png"       "$OUT_ROOT/ui.atlas.json"
pack "$SRC_ROOT/particles" "$OUT_ROOT/particles.atlas.png" "$OUT_ROOT/particles.atlas.json"

echo "Atlases packed."

