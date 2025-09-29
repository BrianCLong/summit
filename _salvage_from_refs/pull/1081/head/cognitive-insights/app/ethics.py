from __future__ import annotations

from collections.abc import Mapping

from fastapi import HTTPException

_DISALLOWED_KEYS = {
    "influence",
    "targeting",
    "microtarget",
    "fear_trigger",
    "authority_leverage",
    "contradict_to_persuade",
    "influence_vectors",
}


def ensure_non_persuasive(params: Mapping[str, object]) -> None:
    """Raise ``HTTPException`` if disallowed persuasion keys are present."""

    lower = {str(k).lower() for k in params}
    if _DISALLOWED_KEYS & lower:
        raise HTTPException(status_code=400, detail="disallowed_persuasion_output")
