# Cyberg Voice Profile

Style goals: robotic yet warm female AI with sci-fi cadence, short clipped phrasing, and a subtle vocoder shimmer. Target delivery that feels like a mission-control augment rather than a cartoon robot.

## Generation Workflow
1. Create the tooling virtualenv and install dependencies:
   ```bash
   python3 -m venv tools/voices/.venv
   source tools/voices/.venv/bin/activate
   pip install -r tools/voices/requirements.txt
   ```
2. Render the full cue list (this uses the `en-US-AIGenerate2Neural` voice with subtle rate/pitch boosts baked into the script):
   ```bash
   source tools/voices/.venv/bin/activate
   python3 tools/voices/cyborg/generate_clips.py
   # add --force to overwrite existing renders
   ```
   The script writes both mono 44.1 kHz WAV and matching MP3 mirrors into `src/assets/audio/sfx/voices/cyborg/`.
3. Optional post-processing: add gentle bitcrush or widening in your DAW, then re-export over the generated WAV/MP3 pairs.
4. Target loudness is roughly -12 LUFS integrated with peaks under -1 dBTP. Re-run the generator with `--force` if you want to regenerate the synthetic source before mastering.

## Script Notes
- Keep runtime under 1.2 seconds unless explicitly marked as tutorial.
- Favour declarative statements ("Boss inbound. Brace." versus "Here comes the boss!").
- For combo milestones, prepare variants for 10, 20, and 30 streaks.
- Preserve terminology: "Beat Blaster", "Neon Crusader", "lane", "bomb".

Refer to `tools/voices/cyborg/lines.json` for the exact prompts and filenames.
