"""Decay kernels for freshness scoring."""

from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import timedelta
from enum import Enum
from typing import Callable


class DecayKernel(str, Enum):
    """Supported decay kernels."""

    EXPONENTIAL = "exponential"
    HYPERBOLIC = "hyperbolic"


@dataclass(frozen=True)
class DecayFunction:
    """Container describing a decay function."""

    kernel: DecayKernel
    fn: Callable[[timedelta, timedelta], float]

    def __call__(self, age: timedelta, half_life: timedelta) -> float:
        return self.fn(age, half_life)


def _validate_half_life(half_life: timedelta) -> float:
    seconds = half_life.total_seconds()
    if seconds <= 0:
        raise ValueError("half_life must be positive")
    return seconds


def exponential_decay(age: timedelta, half_life: timedelta) -> float:
    """Compute exponential decay using half-life."""

    half_life_seconds = _validate_half_life(half_life)
    age_seconds = max(age.total_seconds(), 0.0)
    if age_seconds == 0:
        return 1.0
    decay_constant = math.log(2) / half_life_seconds
    return math.exp(-decay_constant * age_seconds)


def hyperbolic_decay(age: timedelta, half_life: timedelta) -> float:
    """Compute hyperbolic decay using half-life."""

    half_life_seconds = _validate_half_life(half_life)
    age_seconds = max(age.total_seconds(), 0.0)
    return 1.0 / (1.0 + age_seconds / half_life_seconds)


_DECAY_FUNCTIONS = {
    DecayKernel.EXPONENTIAL: DecayFunction(DecayKernel.EXPONENTIAL, exponential_decay),
    DecayKernel.HYPERBOLIC: DecayFunction(DecayKernel.HYPERBOLIC, hyperbolic_decay),
}


def get_decay_function(kernel: DecayKernel | str) -> DecayFunction:
    """Return the decay function associated with ``kernel``."""

    try:
        kernel_enum = DecayKernel(kernel)
    except ValueError as exc:  # pragma: no cover - guard
        raise ValueError(f"Unsupported decay kernel: {kernel}") from exc
    return _DECAY_FUNCTIONS[kernel_enum]
