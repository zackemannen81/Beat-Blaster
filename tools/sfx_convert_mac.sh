#!/usr/bin/env bash
set -uo pipefail

SFX_DIR="src/assets/audio/sfx"

if ! command -v afconvert >/dev/null 2>&1; then
  echo "afconvert not found (macOS only)." >&2
  exit 1
fi

shopt -s nullglob
for inpath in "$SFX_DIR"/*.{wav,aif,aiff,mp3,ogg}; do
  [ -e "$inpath" ] || continue
  base=$(basename "$inpath")
  name="${base%.*}"
  out="$SFX_DIR/${name}.wav"
  ext="${base##*.}"
  case "$ext" in
    wav|aif|aiff|mp3)
      echo "Converting $base -> ${name}.wav (44.1kHz mono)"
      if ! afconvert -f WAVE -d LEI16@44100 -c 1 "$inpath" "$out"; then
        echo "Warning: failed to convert $base; skipping." >&2
      fi
      ;;
    ogg)
      echo "Skipping $base (OGG not supported by afconvert). Use ffmpeg via tools/sfx_convert.sh."
      ;;
  esac
done
echo "Done. Note: trimming/normalizing requires ffmpeg/sox; this script only converts rate/channels."
