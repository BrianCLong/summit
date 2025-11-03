from __future__ import annotations

from dataclasses import dataclass
from statistics import mean
from typing import Iterable, Sequence


@dataclass(frozen=True)
class GraphFoundationModelProfile:
    name: str
    embedding_dim: int
    latency_ms: int
    max_nodes: int
    specialties: tuple[str, ...]


@dataclass(frozen=True)
class EvaluationWindow:
    precision: float
    recall: float
    f1: float
    roc_auc: float


@dataclass(frozen=True)
class EvaluationComparison:
    baseline: EvaluationWindow
    candidate: EvaluationWindow
    lift_precision: float
    lift_recall: float
    lift_f1: float
    lift_roc_auc: float


class GraphFoundationModelBenchmarker:
    """Compare candidate GFMs against a baseline detector."""

    def __init__(self, profile: GraphFoundationModelProfile):
        self.profile = profile

    def compare(
        self,
        baseline: Sequence[EvaluationWindow],
        candidate: Sequence[EvaluationWindow],
    ) -> EvaluationComparison:
        if len(baseline) != len(candidate):
            raise ValueError("baseline and candidate windows must align")
        if not baseline:
            raise ValueError("at least one evaluation window is required")

        base_window = self._average(baseline)
        cand_window = self._average(candidate)

        def lift(cand: float, base: float) -> float:
            if base == 0:
                return cand
            return round((cand - base) / base, 4)

        return EvaluationComparison(
            baseline=base_window,
            candidate=cand_window,
            lift_precision=lift(cand_window.precision, base_window.precision),
            lift_recall=lift(cand_window.recall, base_window.recall),
            lift_f1=lift(cand_window.f1, base_window.f1),
            lift_roc_auc=lift(cand_window.roc_auc, base_window.roc_auc),
        )

    @staticmethod
    def _average(windows: Iterable[EvaluationWindow]) -> EvaluationWindow:
        windows = list(windows)
        return EvaluationWindow(
            precision=round(mean(window.precision for window in windows), 4),
            recall=round(mean(window.recall for window in windows), 4),
            f1=round(mean(window.f1 for window in windows), 4),
            roc_auc=round(mean(window.roc_auc for window in windows), 4),
        )
