"""Utilities for simple multimodal deepfake detection.

This module provides a thin wrapper around placeholder deepfake
classifiers for image, video and audio inputs. The real project will
connect to production models such as EfficientNet, Xception and RawNet2.
"""

from __future__ import annotations

import hashlib
import mimetypes
from dataclasses import dataclass
from pathlib import Path


@dataclass
class DeepfakeResult:
    """Result container for deepfake detection."""

    media_type: str
    deepfake_score: float
    synthetic_probability: float
    model: str
    reason: str


class DeepfakeDetector:
    """Detect deepfakes across image, video and audio inputs.

    The implementation here is intentionally lightweight. It calculates a
    deterministic pseudo score based on the SHA256 hash of the media file.
    Production deployments should load the fine tuned models listed in the
    user story and replace the `_analyze_*` methods with real
    inference code.
    """

    def __init__(self) -> None:
        self.models = {
            "image": "EfficientNet-FaceForensics++",
            "video": "Xception-DFD",
            "audio": "RawNet2",
        }

    # Public API ---------------------------------------------------------
    def detect(self, path: str, media_type: str | None = None) -> DeepfakeResult:
        """Run deepfake analysis on the supplied media path.

        Parameters
        ----------
        path:
            File path to the media item.
        media_type:
            Optional explicit media type. If omitted the type is inferred
            from the file extension using :mod:`mimetypes`.
        """

        file_path = Path(path)
        if not media_type:
            mime, _ = mimetypes.guess_type(file_path)
            media_type = (mime or "").split("/")[0]

        if media_type == "image":
            score = self._analyze_image(file_path)
            model = self.models["image"]
            reason = "frame analysis"
        elif media_type == "video":
            score = self._analyze_video(file_path)
            model = self.models["video"]
            reason = "temporal inconsistencies"
        elif media_type == "audio":
            score = self._analyze_audio(file_path)
            model = self.models["audio"]
            reason = "spectral artifacts"
        else:
            raise ValueError(f"Unsupported media type: {media_type}")

        return DeepfakeResult(
            media_type=media_type,
            deepfake_score=score,
            synthetic_probability=score,
            model=model,
            reason=reason,
        )

    # Internal helpers ---------------------------------------------------
    def _hash_file(self, file_path: Path) -> int:
        data = file_path.read_bytes()
        digest = hashlib.sha256(data).hexdigest()
        # Use the last 8 hex digits to produce a stable pseudo-random value.
        return int(digest[-8:], 16)

    def _normalize(self, value: int) -> float:
        return (value % 10_000) / 10_000.0

    def _analyze_image(self, file_path: Path) -> float:
        return self._normalize(self._hash_file(file_path))

    def _analyze_video(self, file_path: Path) -> float:
        return self._normalize(self._hash_file(file_path) // 2)

    def _analyze_audio(self, file_path: Path) -> float:
        return self._normalize(self._hash_file(file_path) // 3)


__all__ = ["DeepfakeDetector", "DeepfakeResult"]
