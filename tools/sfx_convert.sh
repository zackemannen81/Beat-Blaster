#!/usr/bin/env bash
set -euo pipefail

SFX_DIR="src/assets/audio/sfx"
OUT_DIR="src/assets/audio/sfx"

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "Error: ffmpeg not found. Install ffmpeg and re-run." >&2
  echo "macOS: brew install ffmpeg | Ubuntu: sudo apt-get install ffmpeg" >&2
  exit 1
fi

shopt -s nullglob
for inpath in "$SFX_DIR"/*.{wav,ogg,mp3,aif,aiff}; do
  [ -e "$inpath" ] || continue
  base=$(basename "$inpath")
  name="${base%.*}"
  out="$OUT_DIR/${name}.wav"
  echo "Converting $inpath -> $out"
  # 44.1kHz mono, trim near-silence, limit peaks to ~-1dBTP
  ffmpeg -y -hide_banner -loglevel error \
    -i "$inpath" \
    -ac 1 -ar 44100 \
    -af "silenceremove=start_periods=1:start_duration=0.02:start_threshold=-35dB:stop_periods=1:stop_duration=0.05:stop_threshold=-35dB,alimiter=limit=0.9" \
    "$out"
done
echo "Done. Review lengths and loudness; adjust in DAW if needed."

