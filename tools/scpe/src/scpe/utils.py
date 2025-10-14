"""Shared utility helpers for SCPE."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any, Dict


_HASH_CHUNK_SIZE = 1024 * 1024


def compute_file_digest(path: Path, algorithm: str) -> str:
    normalized = algorithm.lower()
    try:
        hasher = hashlib.new(normalized)
    except ValueError as exc:
        raise ValueError(f"Unsupported digest algorithm '{algorithm}'") from exc

    with path.open("rb") as handle:
        while True:
            chunk = handle.read(_HASH_CHUNK_SIZE)
            if not chunk:
                break
            hasher.update(chunk)
    return hasher.hexdigest()


def canonical_json(data: Dict[str, Any]) -> str:
    """Render JSON with deterministic ordering and no whitespace."""

    return json.dumps(data, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
