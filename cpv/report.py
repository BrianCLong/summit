"""Data structures that capture privacy evaluation results."""

from __future__ import annotations

from dataclasses import dataclass, field, asdict
import json
from typing import Any, Dict, Iterable, List, Sequence, Tuple


QuasiIdentifier = Tuple[Any, ...]


@dataclass(frozen=True)
class KMappViolation:
    """Represents a violation of the k-map anonymity requirement."""

    quasi_identifier: QuasiIdentifier
    sample_count: int
    population_count: int
    risk: float

    def severity(self, k_threshold: int) -> float:
        """Return a normalised severity score in ``[0, 1]``."""

        if k_threshold <= 0:
            return 0.0
        gap = max(0, k_threshold - self.population_count)
        return min(1.0, gap / float(k_threshold))


@dataclass(frozen=True)
class LDiversityViolation:
    """Represents a violation of the ``l``-diversity requirement."""

    quasi_identifier: QuasiIdentifier
    sensitive_attribute: str
    distinct_sensitive_values: int

    def severity(self, l_threshold: int) -> float:
        if l_threshold <= 0:
            return 0.0
        gap = max(0, l_threshold - self.distinct_sensitive_values)
        return min(1.0, gap / float(l_threshold))


@dataclass(frozen=True)
class TClosenessViolation:
    """Represents a violation of the ``t``-closeness requirement."""

    quasi_identifier: QuasiIdentifier
    sensitive_attribute: str
    metric: str
    distance: float

    def severity(self, t_threshold: float) -> float:
        if t_threshold <= 0:
            return 0.0
        excess = max(0.0, self.distance - t_threshold)
        return min(1.0, excess / t_threshold)


@dataclass
class PrivacyEvaluationReport:
    """Container for privacy guarantees and detected violations."""

    quasi_identifier_columns: Sequence[str]
    sensitive_columns: Sequence[str]
    k_map_threshold: int | None
    l_diversity_threshold: int | None
    t_closeness_threshold: float | None
    t_closeness_metrics: Sequence[str] = field(default_factory=tuple)
    k_map_violations: List[KMappViolation] = field(default_factory=list)
    l_diversity_violations: List[LDiversityViolation] = field(default_factory=list)
    t_closeness_violations: List[TClosenessViolation] = field(default_factory=list)

    def any_violations(self) -> bool:
        return bool(
            self.k_map_violations
            or self.l_diversity_violations
            or self.t_closeness_violations
        )

    def to_dict(self) -> Dict[str, Any]:
        def _dataclass_list(items: Iterable[Any]) -> List[Dict[str, Any]]:
            return [asdict(item) for item in items]

        return {
            "quasi_identifier_columns": list(self.quasi_identifier_columns),
            "sensitive_columns": list(self.sensitive_columns),
            "k_map_threshold": self.k_map_threshold,
            "l_diversity_threshold": self.l_diversity_threshold,
            "t_closeness_threshold": self.t_closeness_threshold,
            "t_closeness_metrics": list(self.t_closeness_metrics),
            "k_map_violations": _dataclass_list(self.k_map_violations),
            "l_diversity_violations": _dataclass_list(self.l_diversity_violations),
            "t_closeness_violations": _dataclass_list(self.t_closeness_violations),
        }

    def to_bytes(self, seed: int | None = None) -> bytes:
        """Serialise the report to bytes deterministically."""

        # ``seed`` is accepted for API compatibility; we do not rely on
        # randomness, yet the explicit parameter makes determinism contractual.
        _ = seed
        canonical = json.dumps(self.to_dict(), sort_keys=True, separators=(",", ":"))
        return canonical.encode("utf-8")

    # --- Heatmap helpers -------------------------------------------------
    def _violation_rows(self, metric: str) -> List[Tuple[str, float]]:
        rows: List[Tuple[str, float]] = []
        if self.k_map_threshold and self.k_map_threshold > 0:
            for violation in self.k_map_violations:
                label = " | ".join(map(str, violation.quasi_identifier))
                rows.append((label, violation.severity(self.k_map_threshold)))
        if self.l_diversity_threshold and self.l_diversity_threshold > 0:
            for violation in self.l_diversity_violations:
                label = (
                    " | ".join(map(str, violation.quasi_identifier))
                    + f" → {violation.sensitive_attribute}"
                )
                rows.append((label, violation.severity(self.l_diversity_threshold)))
        if self.t_closeness_threshold and self.t_closeness_threshold > 0:
            for violation in self.t_closeness_violations:
                if violation.metric != metric:
                    continue
                label = (
                    " | ".join(map(str, violation.quasi_identifier))
                    + f" → {violation.sensitive_attribute}"
                    + f" ({violation.metric})"
                )
                rows.append((label, violation.severity(self.t_closeness_threshold)))
        return rows

    def heatmap_matrix(self, metric: str) -> Tuple[List[str], List[str], List[List[float]]]:
        """Return (row_labels, column_labels, matrix) for heatmap rendering."""

        rows = self._violation_rows(metric)
        if not rows:
            return ([], list(self.quasi_identifier_columns), [])

        rows.sort(key=lambda item: item[0])
        matrix = [[score for _ in self.quasi_identifier_columns] for _, score in rows]
        row_labels = [label for label, _ in rows]
        return (row_labels, list(self.quasi_identifier_columns), matrix)


__all__ = [
    "KMappViolation",
    "LDiversityViolation",
    "PrivacyEvaluationReport",
    "TClosenessViolation",
]
