#!/usr/bin/env python3
"""Shared signal-processing helpers for HF monitoring."""
from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Iterable, Tuple

import numpy as np
import soundfile as sf
import yaml
from scipy.signal import butter, lfilter, stft

try:
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
except ImportError as exc:  # pragma: no cover - optional dependency guard
    raise SystemExit("matplotlib is required for spectrogram generation") from exc


def bandpass(sig: np.ndarray, fs: int, low: int = 300, high: int = 3000, order: int = 4) -> np.ndarray:
    nyq = fs / 2.0
    if low <= 0 or high >= nyq:
        return sig
    b, a = butter(order, [low / nyq, high / nyq], btype="band")
    return lfilter(b, a, sig)


def rms_db(frame: np.ndarray) -> float:
    energy = np.sqrt(np.mean(frame**2) + 1e-12)
    return 20 * np.log10(energy + 1e-12)


def detect_speech(sig: np.ndarray, fs: int, frame_ms: int, floor_db: float, min_sec: float) -> bool:
    frame = max(int(fs * frame_ms / 1000), 1)
    frames: Iterable[np.ndarray] = (sig[idx : idx + frame] for idx in range(0, len(sig) - frame + 1, frame))
    db_levels = np.array([rms_db(chunk) for chunk in frames])
    if db_levels.size == 0:
        return False
    threshold = max(np.median(db_levels), floor_db) + 6.0
    speech_mask = db_levels > threshold
    longest = longest_true_run(speech_mask)
    duration = longest * frame_ms / 1000.0
    return duration >= min_sec


def detect_marker(
    sig: np.ndarray,
    fs: int,
    tone_hz: int,
    expected_rate: int,
    tolerance_pct: int,
    snr_trigger_db: float,
) -> Tuple[bool, float]:
    freq, time_idx, zxx = stft(sig, fs=fs, nperseg=1024, noverlap=768)
    if time_idx.size < 2:
        return False, 0.0
    magnitudes = np.abs(zxx)
    tone_idx = int(np.argmin(np.abs(freq - tone_hz)))
    tone_mag = magnitudes[tone_idx, :]
    background = np.median(magnitudes, axis=0)
    snr = 20 * np.log10((tone_mag + 1e-9) / (background + 1e-9))
    peaks = snr > snr_trigger_db
    total_minutes = (time_idx[-1] - time_idx[0]) / 60.0
    total_minutes = max(total_minutes, 1e-3)
    rate = float(peaks.sum() / total_minutes)
    within_bounds = abs(rate - expected_rate) <= expected_rate * (tolerance_pct / 100.0)
    return within_bounds, rate


def detect_burst(sig: np.ndarray, fs: int, floor_db: float = -55.0) -> Tuple[bool, float]:
    frame = max(int(fs * 0.01), 1)
    hop = frame
    frames = [sig[idx : idx + frame] for idx in range(0, len(sig) - frame + 1, hop)]
    if not frames:
        return False, 0.0
    energies = np.array([rms_db(chunk) for chunk in frames])
    baseline = np.median(energies)
    over = energies > max(baseline, floor_db) + 8.0
    longest = longest_true_run(over)
    duration = longest * (frame / fs)
    return 0.2 <= duration <= 5.0, duration


def longest_true_run(values: np.ndarray) -> int:
    longest = current = 0
    for val in values:
        if val:
            current += 1
            longest = max(longest, current)
        else:
            current = 0
    return longest


def write_spectrogram(sig: np.ndarray, fs: int, output: Path) -> None:
    fig, ax = plt.subplots(figsize=(8, 4))
    ax.specgram(sig, Fs=fs, NFFT=1024, noverlap=768)
    ax.set_title("Spectrogram")
    ax.set_xlabel("Time [s]")
    ax.set_ylabel("Frequency [Hz]")
    fig.tight_layout()
    fig.savefig(output, dpi=150)
    plt.close(fig)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_config(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as handle:
        return yaml.safe_load(handle)


def load_audio(path: Path) -> Tuple[np.ndarray, int]:
    audio, fs = sf.read(str(path))
    if audio.ndim > 1:
        audio = audio.mean(axis=1)
    return audio.astype(np.float32), fs
