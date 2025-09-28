# Voice Generation Toolkit

- `cyborg/lines.json` contains the authoritative script for the Cyborg announcer voice.
- `cyborg/generate_clips.py` renders the lines with edge-tts (Microsoft neural voices).
- `requirements.txt` pins the tooling dependencies so you can recreate the venv.

Install dependencies:
```bash
python3 -m venv tools/voices/.venv
source tools/voices/.venv/bin/activate
pip install -r tools/voices/requirements.txt
```

Render clips:
```bash
source tools/voices/.venv/bin/activate
python3 tools/voices/cyborg/generate_clips.py
```

Optional flags:
- `--force` re-synthesises clips even if the destination exists.

After generation each file is produced as both 16-bit 44.1 kHz WAV and 48 kbps mono MP3 in `src/assets/audio/sfx/voices/cyborg/`. Apply any mastering tweaks you need before committing.
