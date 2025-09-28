#!/usr/bin/env python3
"""Batch-generate Cyborg announcer clips using edge-tts.

Usage (from repo root):
  source tools/voices/.venv/bin/activate
  python3 tools/voices/cyborg/generate_clips.py

The script reads lines.json in the same directory and renders each entry to
`<key>.wav`, then you can mirror to MP3 or post-process as needed. Existing files
are skipped unless `--force` is provided.
"""
import argparse
import asyncio
import json
import shutil
import subprocess
from pathlib import Path
from typing import Callable, Optional, Tuple

import edge_tts

VOICE_ID = "en-US-AIGenerate2Neural"
RATE = "+5%"
PITCH = "+3Hz"


def pick_converter() -> Tuple[Optional[Callable[[Path, Path], None]], Optional[str]]:
    if shutil.which("afconvert"):
        def _convert(src: Path, dst: Path) -> None:
            subprocess.run(
                ["afconvert", str(src), str(dst), "-f", "WAVE", "-d", "LEI16@44100"],
                check=True,
            )

        return _convert, "afconvert"
    if shutil.which("ffmpeg"):
        def _convert(src: Path, dst: Path) -> None:
            subprocess.run(
                [
                    "ffmpeg",
                    "-y",
                    "-i",
                    str(src),
                    "-ac",
                    "1",
                    "-ar",
                    "44100",
                    "-sample_fmt",
                    "s16",
                    str(dst),
                ],
                check=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )

        return _convert, "ffmpeg"
    if shutil.which("sox"):
        def _convert(src: Path, dst: Path) -> None:
            subprocess.run(
                ["sox", str(src), "-r", "44100", "-c", "1", str(dst)],
                check=True,
            )

        return _convert, "sox"
    return None, None


async def synthesize(
    text: str,
    mp3_path: Path,
    wav_path: Path,
    force: bool,
    converter: Optional[Callable[[Path, Path], None]],
) -> None:
    if not force and mp3_path.exists() and wav_path.exists():
        print(f"skip {mp3_path.stem} (exists)")
        return

    communicator = edge_tts.Communicate(
        text=text,
        voice=VOICE_ID,
        rate=RATE,
        pitch=PITCH,
    )
    mp3_path.parent.mkdir(parents=True, exist_ok=True)
    await communicator.save(mp3_path)
    print(f"wrote {mp3_path}")

    if converter:
        converter(mp3_path, wav_path)
    else:
        shutil.copy2(mp3_path, wav_path)
        print("warning: no audio converter found; copied MP3 data to WAV placeholder")


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--out",
        type=Path,
        default=(Path(__file__).resolve().parents[3] / "src/assets/audio/sfx/voices/cyborg"),
        help="Output directory for rendered wav files",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Regenerate files even if they already exist",
    )
    args = parser.parse_args()

    lines_path = Path(__file__).with_name("lines.json")
    lines = json.loads(lines_path.read_text())

    converter, tool_name = pick_converter()
    if converter:
        print(f"Using {tool_name} for MP3 -> WAV conversion")
    else:
        print(
            "No audio converter (afconvert/ffmpeg/sox) detected. WAV files will be MP3 copies;"
            " install one of the tools and rerun with --force for true PCM output."
        )

    for key, payload in lines.items():
        text = payload["text"].strip()
        if not text:
            continue
        mp3_path = args.out / f"{key}.mp3"
        wav_path = args.out / f"{key}.wav"
        if args.force:
            mp3_path.unlink(missing_ok=True)
            wav_path.unlink(missing_ok=True)
        await synthesize(text, mp3_path, wav_path, args.force, converter)


if __name__ == "__main__":
    asyncio.run(main())
