#!/usr/bin/env python3
"""Wideband scanner that sweeps HF spectrum and flags burst activity."""
from __future__ import annotations

import argparse
import json
import shlex
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from typing import Iterable

import soundfile as sf

if __package__ in (None, ""):
    sys.path.append(str(Path(__file__).resolve().parents[1] / "detector"))
    import utils  # type: ignore
else:  # pragma: no branch
    from detector import utils


def iter_frequencies(start: float, end: float, step: float, avoid: Iterable[float]) -> Iterable[float]:
    avoid_set = {round(freq, 3) for freq in avoid}
    freq = start
    while freq <= end:
        if round(freq, 3) not in avoid_set:
            yield round(freq, 3)
        freq += step


def run_capture(command_template: str, freq: float, dwell: float, output_dir: Path) -> None:
    cmd = command_template.format(freq=freq, dwell=dwell, out=str(output_dir))
    print(f"[scan] executing: {cmd}")
    subprocess.run(shlex.split(cmd), check=False)


def analyze_directory(temp_dir: Path, cfg: dict, freq: float, sensor_id: str | None, events_file: Path) -> None:
    for wav_path in sorted(temp_dir.glob("*.wav")):
        audio, fs = utils.load_audio(wav_path)
        filtered = utils.bandpass(audio, fs)
        burst_hit, duration = utils.detect_burst(filtered, fs)
        if not burst_hit:
            continue
        spec_path = Path(cfg["paths"]["specs"]) / f"scanner_{wav_path.stem}.png"
        clips_dir = Path(cfg["paths"]["clips"])
        clips_dir.mkdir(parents=True, exist_ok=True)
        clip_path = clips_dir / wav_path.name
        sf.write(str(clip_path), filtered, fs)
        utils.write_spectrogram(filtered, fs, spec_path)
        event = {
            "utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "file": wav_path.name,
            "type": "burst",
            "marker_rate_est_per_min": 0.0,
            "snr_trigger_db": cfg["marker"]["snr_trigger_db"],
            "freq_khz_hint": freq,
            "sensor_id_hint": sensor_id,
            "sha256": utils.sha256(clip_path),
            "burst_duration_sec": round(duration, 2),
        }
        with events_file.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(event) + "\n")


def main() -> None:
    parser = argparse.ArgumentParser(description="Sweep HF spectrum and detect bursts")
    parser.add_argument("--config", required=True, type=Path)
    parser.add_argument("--capture-cmd", required=True, help="Command template with {freq}, {dwell}, {out} placeholders")
    parser.add_argument("--sensor-id", help="Optional sensor identifier", default=None)
    parser.add_argument("--sleep", type=float, default=1.0, help="Delay between steps")
    args = parser.parse_args()

    cfg = utils.load_config(args.config)
    scanner_cfg = cfg.get("scanner", {})
    if not scanner_cfg.get("enabled", False):
        print("scanner disabled in config")
        sys.exit(0)

    events_file = Path(cfg["paths"]["events"])
    events_file.parent.mkdir(parents=True, exist_ok=True)
    specs_dir = Path(cfg["paths"]["specs"])
    specs_dir.mkdir(parents=True, exist_ok=True)

    for freq in iter_frequencies(
        scanner_cfg["start_khz"],
        scanner_cfg["end_khz"],
        scanner_cfg["step_khz"],
        scanner_cfg.get("known_avoid", []),
    ):
        with tempfile.TemporaryDirectory() as tmpdir:
            run_capture(args.capture_cmd, freq, scanner_cfg["dwell_sec"], Path(tmpdir))
            analyze_directory(Path(tmpdir), cfg, freq, args.sensor_id, events_file)
        time.sleep(max(args.sleep, 0.1))


if __name__ == "__main__":
    main()
