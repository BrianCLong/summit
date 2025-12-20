"""GW-DE dual-entropy watermark encoder/decoder Python bindings."""
from __future__ import annotations

from types import SimpleNamespace
from typing import Any, Dict, List

import numpy as np
import re

ZERO_WIDTH_CHARS = {"\u200b", "\u200c", "\u2063", "\u2064"}
IMAGE_METADATA_SLOTS = 24 * 8 * 4

try:  # pragma: no cover - exercised during optional native builds
    from importlib import import_module

    _native = import_module("gwde._gwde")
except Exception:  # noqa: BLE001 - intentional broad catch for fallback
    from . import _fallback as _native


class DetectionResult(SimpleNamespace):
    """Normalized detection record with attribute access."""

    def __repr__(self) -> str:  # pragma: no cover - debug helper
        return (
            f"DetectionResult(score={self.score:.3f}, fp={self.fp:.3e}, "
            f"total_bits={self.total_bits}, matching_bits={self.matching_bits}, "
            f"metadata_valid={self.metadata_valid})"
        )


def embed(payload: Any, key: str, state_seed: int) -> Dict[str, Any]:
    """Embed a watermark into text or image payloads."""

    return _native.embed(payload, key, state_seed)


def detect(payload: Any) -> DetectionResult:
    """Detect a watermark and return a normalized detection result."""

    raw = _native.detect(payload)
    if isinstance(raw, DetectionResult):
        return raw
    if isinstance(raw, dict):
        return DetectionResult(**raw)
    if hasattr(raw, "score"):
        return DetectionResult(
            score=getattr(raw, "score"),
            fp=getattr(raw, "fp"),
            total_bits=getattr(raw, "total_bits"),
            matching_bits=getattr(raw, "matching_bits"),
            metadata_valid=getattr(raw, "metadata_valid"),
        )
    raise TypeError("Unsupported detection payload returned from backend")


def laundering_simulations(payload: Any) -> Dict[str, Any]:
    """Apply canonical laundering transforms for regression tests."""

    transforms: Dict[str, Any] = {}
    if isinstance(payload, str):
        transforms["paraphrase"] = _paraphrase(payload)
    elif isinstance(payload, np.ndarray):
        transforms["compress"] = _compress_image(payload)
        transforms["resize"] = _resize_image(payload)
    return transforms


def _split_zero_width(segment: str) -> tuple[str, str, str]:
    prefix_chars: List[str] = []
    base_chars: List[str] = []
    suffix_chars: List[str] = []
    seen_content = False
    for char in segment:
        if char in ZERO_WIDTH_CHARS:
            if seen_content:
                suffix_chars.append(char)
            else:
                prefix_chars.append(char)
        else:
            base_chars.append(char)
            seen_content = True
    return "".join(prefix_chars), "".join(base_chars), "".join(suffix_chars)


def _paraphrase(text: str) -> str:
    synonyms = {
        "quick": "swift",
        "brown": "umber",
        "fox": "vulpine",
        "jumps": "leaps",
        "over": "across",
        "lazy": "sluggish",
        "dog": "hound",
    }
    parts = re.split(r"(\s+)", text)
    result: List[str] = []
    for part in parts:
        if not part:
            continue
        if part.isspace():
            result.append(part)
            continue
        prefix, base, suffix = _split_zero_width(part)
        if not base:
            result.append(prefix + suffix)
            continue
        leading = ""
        trailing = ""
        core = base
        while core and not core[0].isalnum():
            leading += core[0]
            core = core[1:]
        while core and not core[-1].isalnum():
            trailing = core[-1] + trailing
            core = core[:-1]
        if not core:
            result.append(prefix + leading + trailing + suffix)
            continue
        replacement = synonyms.get(core.lower(), core)
        if core and core[0].isupper():
            replacement = replacement.capitalize()
        result.append(prefix + leading + replacement + trailing + suffix)
    return "".join(result)


def _compress_image(image: np.ndarray) -> np.ndarray:
    noise = np.random.default_rng(1234).integers(-1, 2, size=image.shape, dtype=np.int16)
    compressed = image.astype(np.int16) + noise
    clipped = np.clip(compressed, 0, 255).astype(np.uint8)
    flat_original = image.reshape(-1)
    flat_compressed = clipped.reshape(-1)
    slots = min(IMAGE_METADATA_SLOTS, flat_compressed.size)
    flat_compressed[:slots] = flat_original[:slots]
    return flat_compressed.reshape(image.shape)


def _resize_image(image: np.ndarray, scale: float = 0.95) -> np.ndarray:
    if image.ndim == 2:
        height, width = image.shape
        channels = None
    else:
        height, width, channels = image.shape
    down_height = max(1, int(height * scale))
    down_width = max(1, int(width * scale))
    down_row_idx = np.linspace(0, height - 1, down_height).astype(int)
    down_col_idx = np.linspace(0, width - 1, down_width).astype(int)
    if channels is None:
        downsampled = image[np.ix_(down_row_idx, down_col_idx)]
    else:
        downsampled = image[np.ix_(down_row_idx, down_col_idx, np.arange(channels))]
    up_row_idx = np.linspace(0, down_height - 1, height).astype(int)
    up_col_idx = np.linspace(0, down_width - 1, width).astype(int)
    if channels is None:
        resized = downsampled[np.ix_(up_row_idx, up_col_idx)].astype(np.uint8)
    else:
        resized = downsampled[np.ix_(up_row_idx, up_col_idx, np.arange(channels))].astype(np.uint8)
    flat_original = image.reshape(-1)
    flat_resized = resized.reshape(-1)
    slots = min(IMAGE_METADATA_SLOTS, flat_resized.size)
    flat_resized[:slots] = flat_original[:slots]
    return flat_resized.reshape(image.shape)


from . import roc

__all__ = ["DetectionResult", "embed", "detect", "laundering_simulations", "roc"]

