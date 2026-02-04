from dataclasses import dataclass
from typing import Sequence

@dataclass(frozen=True)
class GeometryComplexityEvent:
    episode_id: str
    step: int
    complexity_score: float
    vgt_curve: Sequence[float]
    local_dim_mode: float
