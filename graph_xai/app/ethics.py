from __future__ import annotations

from fastapi import HTTPException

BANNED = {"influence", "persuade", "target", "microtarget", "fear_trigger"}


def check_request(payload: str) -> None:
    lowered = payload.lower()
    for word in BANNED:
        if word in lowered:
            raise HTTPException(status_code=400, detail={"error": "disallowed_persuasion_output"})
