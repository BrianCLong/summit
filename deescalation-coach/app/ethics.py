"""Ethics gate to prevent persuasion and targeting requests."""

from __future__ import annotations

import re
from fastapi import HTTPException


DISALLOWED_PATTERNS = [
    r"make (this|it) more convincing",
    r"influence",
    r"fear trigger",
    r"target (audience|group|demographic)",
    r"influence vector",
]


def guard_request(text: str) -> None:
    lowered = text.lower()
    for pattern in DISALLOWED_PATTERNS:
        if re.search(pattern, lowered):
            raise HTTPException(status_code=400, detail="disallowed_persuasion_output")
