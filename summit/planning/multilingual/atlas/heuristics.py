from __future__ import annotations

import math
from dataclasses import dataclass

# Heuristics derived from ATLAS public guidance for doubling K.
ATLAS_K_DOUBLE_MODEL_MULT = 1.18
ATLAS_K_DOUBLE_DATA_MULT  = 1.66

@dataclass(frozen=True)
class AtlasScaling:
    model_mult: float
    data_mult: float

def scale_for_language_count(k_from: int, k_to: int) -> AtlasScaling:
    """
    Heuristic derived from ATLAS public guidance for doubling K.
    If k_to is not a power-of-two multiple, we apply log-linear interpolation.
    """
    if k_from <= 0 or k_to <= 0:
        raise ValueError("k_from and k_to must be positive")
    if k_from == k_to:
        return AtlasScaling(1.0, 1.0)

    # steps = log2(k_to / k_from)
    ratio = k_to / k_from
    steps = math.log(ratio, 2.0)

    model_mult = ATLAS_K_DOUBLE_MODEL_MULT ** steps
    data_mult  = ATLAS_K_DOUBLE_DATA_MULT ** steps

    return AtlasScaling(model_mult, data_mult)
