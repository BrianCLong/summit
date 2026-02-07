"""Objective helpers for RLVR."""

from __future__ import annotations

import os
from typing import Callable

from .base import SequenceObjectiveInputs
from .gspo import gspo_objective, gspo_terms
from .luspo import luspo_objective, luspo_terms


def select_objective(name: str | None = None) -> Callable[..., float]:
    objective = (name or os.getenv("RLVR_OBJECTIVE") or "gspo").lower()
    if objective == "luspo":
        return luspo_objective
    if objective == "gspo":
        return gspo_objective
    raise ValueError(f"unknown RLVR objective: {objective}")


__all__ = [
    "SequenceObjectiveInputs",
    "gspo_objective",
    "gspo_terms",
    "luspo_objective",
    "luspo_terms",
    "select_objective",
]
