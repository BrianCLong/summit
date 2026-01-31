from dataclasses import dataclass

from modules.scoring.health_score import HealthScore
from modules.signals.models import ClusterSnapshot


@dataclass(frozen=True)
class RCAResult:
    hypothesis: list[str]     # structured, no prose required
    top_fixes: list[str]      # identifiers only
    confidence_0_1: float

def rca(snapshot: ClusterSnapshot, score: HealthScore) -> RCAResult:
    # Lane-2 placeholder: deterministic stub until an eval-backed model is approved.
    return RCAResult(hypothesis=[], top_fixes=[], confidence_0_1=0.0)
