"""Simple media ingestion utilities with deepfake tagging."""

from __future__ import annotations

import mimetypes
from dataclasses import asdict
from pathlib import Path
from typing import Any

from intelgraph_ai_ml.deepfake_detector import DeepfakeDetector


def ingest_media(path: str) -> dict[str, Any]:
    """Ingest a media item and return detection metadata.

    Parameters
    ----------
    path:
        Location of the media file.
    """

    file_path = Path(path)
    mime, _ = mimetypes.guess_type(file_path)
    media_type = (mime or "").split("/")[0]

    detector = DeepfakeDetector()
    result = detector.detect(str(file_path), media_type)

    meta: dict[str, Any] = asdict(result)
    meta.update({"media_type": result.media_type, "path": str(file_path)})
    return meta


__all__ = ["ingest_media"]
