#!/usr/bin/env python3
"""Passive HF station detector for UVB-76 and related networks."""
from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

import soundfile as sf

if __package__ in (None, ""):
    sys.path.append(str(Path(__file__).resolve().parent))
    import utils  # type: ignore
else:  # pragma: no branch - import for package execution
    from . import utils


def process_file(
    wav_path: Path, cfg: dict, clip_dir: Path, spec_dir: Path, events_file: Path
) -> None:
    audio, fs = utils.load_audio(wav_path)
    filtered = utils.bandpass(audio, fs)

    speech_hit = utils.detect_speech(
        filtered,
        fs,
        cfg["vad"]["frame_ms"],
        cfg["vad"]["energy_floor_db"],
        cfg["vad"]["speech_min_sec"],
    )
    marker_hit, rate = utils.detect_marker(
        filtered,
        fs,
        int(cfg["marker"]["tone_hz_approx"]),
        cfg["marker"]["expected_rate_per_min"],
        cfg["marker"]["rate_tolerance_pct"],
        cfg["marker"]["snr_trigger_db"],
    )

    event_type = "voice" if speech_hit else "marker" if marker_hit else None
    if not event_type:
        return

    clip_path = clip_dir / wav_path.name
    spec_path = spec_dir / f"{wav_path.stem}.png"
    sf.write(str(clip_path), filtered, fs)
    utils.write_spectrogram(filtered, fs, spec_path)

    event = {
        "utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "file": wav_path.name,
        "type": event_type,
        "snr_trigger_db": cfg["marker"]["snr_trigger_db"],
        "marker_rate_est_per_min": round(rate, 2),
        "freq_khz_hint": None,
        "sensor_id_hint": None,
        "sha256": utils.sha256(clip_path),
    }

    events_file.parent.mkdir(parents=True, exist_ok=True)
    with events_file.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(event) + "\n")


def main() -> None:
    parser = argparse.ArgumentParser(description="Detect UVB-76 marker and voice bursts")
    parser.add_argument("--config", required=True, type=Path, help="Path to config.yaml")
    parser.add_argument("--interval", type=float, default=2.0, help="Polling interval in seconds")
    args = parser.parse_args()

    cfg = utils.load_config(args.config)
    cap_dir = Path(cfg["paths"]["captures"])
    clip_dir = Path(cfg["paths"]["clips"])
    spec_dir = Path(cfg["paths"]["specs"])
    events_file = Path(cfg["paths"]["events"])

    for directory in (cap_dir, clip_dir, spec_dir, events_file.parent):
        directory.mkdir(parents=True, exist_ok=True)

    processed: dict[str, float] = {}

    while True:
        for wav_path in sorted(cap_dir.glob("*.wav")):
            mtime = wav_path.stat().st_mtime
            if processed.get(wav_path.name) == mtime:
                continue
            try:
                process_file(wav_path, cfg, clip_dir, spec_dir, events_file)
            except Exception as exc:  # pragma: no cover - runtime guard
                print(f"[warn] failed to process {wav_path.name}: {exc}")
            processed[wav_path.name] = mtime
        time.sleep(max(args.interval, 0.5))


if __name__ == "__main__":  # pragma: no cover - script entry point
    main()
