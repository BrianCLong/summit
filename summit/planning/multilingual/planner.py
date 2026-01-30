from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional


@dataclass(frozen=True)
class PlanRequest:
    target_language: str
    training_languages: list[str]          # K languages
    token_budget: int                      # total tokens available
    model_size_params: Optional[int] = None  # current N if known
    transfer_matrix_ref: Optional[str] = None # path/URI to matrix artifact

@dataclass(frozen=True)
class PlanResponse:
    recommended_model_params: int
    recommended_total_tokens: int
    recommended_helpers: list[str]
    rationale: dict[str, str]
    assumptions: list[str]
    provenance: dict[str, str]             # item sources, versions
    confidence: float = 1.0

class MultilingualScalingPlanner:
    def plan(self, req: PlanRequest) -> PlanResponse:
        raise NotImplementedError
