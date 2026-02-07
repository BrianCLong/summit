from __future__ import annotations

from dataclasses import dataclass
from typing import Sequence


@dataclass(frozen=True)
class SequenceObjectiveInputs:
    importance_ratios: Sequence[float]
    advantages: Sequence[float]
    lengths: Sequence[int] | None = None
    clip_range: float = 0.2


def _validate_inputs(inputs: SequenceObjectiveInputs) -> None:
    if len(inputs.importance_ratios) != len(inputs.advantages):
        raise ValueError("importance_ratios and advantages must be same length")
    if inputs.lengths is not None and len(inputs.lengths) != len(inputs.advantages):
        raise ValueError("lengths must match advantages length")
    if inputs.clip_range <= 0:
        raise ValueError("clip_range must be positive")


def _clip_ratio(ratio: float, clip_range: float) -> float:
    lower = 1.0 - clip_range
    upper = 1.0 + clip_range
    return max(lower, min(upper, ratio))


def _mean(values: Sequence[float]) -> float:
    if not values:
        raise ValueError("values must be non-empty")
    return sum(values) / len(values)
