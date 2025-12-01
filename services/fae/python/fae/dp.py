"""Differential privacy helpers."""

from __future__ import annotations

import math
import random
from typing import MutableSequence, Sequence


def laplace_noise(scale: float, rng: random.Random) -> float:
    if scale <= 0:
        return 0.0
    u = rng.random() - 0.5
    return -scale * math.copysign(math.log(1 - 2 * abs(u)), u)


def apply_dp_noise(
    values: Sequence[float],
    epsilon: float,
    sensitivity: float = 1.0,
    seed: int = 0,
) -> Sequence[float]:
    """Applies Laplace noise to a sequence deterministically for tests."""

    if epsilon <= 0:
        return list(values)
    scale = sensitivity / epsilon
    rng = random.Random(seed)
    noised: MutableSequence[float] = []  # type: ignore[assignment]
    for value in values:
        noised.append(float(value) + laplace_noise(scale, rng))
    return noised

