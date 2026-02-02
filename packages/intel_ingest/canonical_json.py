"""Canonical JSON rendering for deterministic artifacts."""

from __future__ import annotations

import json
from typing import Any


def canonical_dumps(payload: Any) -> str:
    """Serialize payload to canonical JSON (sorted keys, no whitespace)."""
    return json.dumps(
        payload,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
    )
