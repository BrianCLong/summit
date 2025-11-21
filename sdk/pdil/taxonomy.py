"""Failure taxonomy heuristics."""

from __future__ import annotations

import json
from typing import Optional, Tuple

from .models import GoldenCase


def classify_failure(case: GoldenCase, response: str) -> Tuple[bool, Optional[str]]:
    """Return whether the response passes and the taxonomy label if it fails."""

    expected = case.expected_response.strip()
    normalized = response.strip()
    if normalized == expected:
        return True, None
    if not normalized:
        return False, "omission"
    if expected.lower() in normalized.lower():
        return False, "partial"
    if looks_like_json(expected) and looks_like_json(normalized):
        return False, "schema"
    return False, "incorrect"


def looks_like_json(payload: str) -> bool:
    try:
        json.loads(payload)
    except Exception:
        return False
    return True
