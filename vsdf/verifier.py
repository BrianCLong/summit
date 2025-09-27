"""Constraint verification utilities for VSDF."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Optional, Tuple

import numpy as np
import pandas as pd

from .constraints import (
    ConstraintSet,
    CorrelationConstraint,
    MarginalConstraint,
    DenialConstraint,
)


@dataclass
class VerificationReport:
    """Results returned by :class:`ConstraintVerifier`."""

    success: bool
    marginal_distances: Dict[str, float]
    correlation_deltas: Dict[Tuple[str, str], float]
    denial_violations: Dict[str, float]
    privacy_risk: float

    def to_dict(self) -> Dict[str, object]:
        return {
            "success": self.success,
            "marginals": self.marginal_distances,
            "correlations": self.correlation_deltas,
            "denials": self.denial_violations,
            "privacy_risk": self.privacy_risk,
        }


class ConstraintVerifier:
    """Scores synthetic data against fidelity and privacy criteria."""

    def __init__(
        self,
        constraints: ConstraintSet,
        privacy_threshold: float = 0.1,
    ) -> None:
        self.constraints = constraints
        self.privacy_threshold = privacy_threshold

    def verify(
        self,
        synthetic: pd.DataFrame,
        reference: Optional[pd.DataFrame] = None,
    ) -> VerificationReport:
        marginal_distances = self._check_marginals(synthetic)
        correlation_deltas = self._check_correlations(synthetic)
        denial_violations = self._check_denials(synthetic)
        privacy_risk = self._compute_privacy_risk(synthetic, reference)

        marginal_ok = all(
            distance <= self.constraints.marginals[column].tolerance
            for column, distance in marginal_distances.items()
            if column in self.constraints.marginals
        )
        correlation_ok = all(
            delta <= constraint.tolerance
            for (column_x, column_y), delta in correlation_deltas.items()
            for constraint in self.constraints.correlations
            if constraint.column_x == column_x and constraint.column_y == column_y
        )
        denial_ok = all(
            violation <= constraint.max_violations
            for constraint in self.constraints.denial_constraints
            for predicate, violation in denial_violations.items()
            if predicate == constraint.predicate
        )
        privacy_ok = privacy_risk <= self.privacy_threshold

        success = marginal_ok and correlation_ok and denial_ok and privacy_ok
        return VerificationReport(
            success=success,
            marginal_distances=marginal_distances,
            correlation_deltas=correlation_deltas,
            denial_violations=denial_violations,
            privacy_risk=float(privacy_risk),
        )

    def _check_marginals(self, synthetic: pd.DataFrame) -> Dict[str, float]:
        distances: Dict[str, float] = {}
        for column, constraint in self.constraints.marginals.items():
            if column not in synthetic.columns or synthetic[column].empty:
                continue
            observed = synthetic[column].astype(str).value_counts(dropna=False)
            observed_distribution = observed / observed.sum()
            all_values = constraint.distribution.index.union(observed_distribution.index)
            expected = constraint.distribution.reindex(all_values, fill_value=0.0)
            actual = observed_distribution.reindex(all_values, fill_value=0.0)
            distance = 0.5 * np.abs(expected - actual).sum()
            distances[column] = float(distance)
        return distances

    def _check_correlations(self, synthetic: pd.DataFrame) -> Dict[Tuple[str, str], float]:
        deltas: Dict[Tuple[str, str], float] = {}
        for constraint in self.constraints.correlations:
            if constraint.column_x not in synthetic.columns or constraint.column_y not in synthetic.columns:
                continue
            series_x = synthetic[constraint.column_x].astype(float)
            series_y = synthetic[constraint.column_y].astype(float)
            observed = series_x.corr(series_y)
            if pd.isna(observed):
                observed = 0.0
            deltas[(constraint.column_x, constraint.column_y)] = float(abs(observed - constraint.target))
        return deltas

    def _check_denials(self, synthetic: pd.DataFrame) -> Dict[str, float]:
        violations: Dict[str, float] = {}
        for constraint in self.constraints.denial_constraints:
            try:
                mask = synthetic.eval(constraint.predicate)
            except Exception:
                mask = pd.Series(False, index=synthetic.index)
            violation_rate = mask.mean() if len(mask) else 0.0
            violations[constraint.predicate] = float(violation_rate)
        return violations

    def _compute_privacy_risk(
        self,
        synthetic: pd.DataFrame,
        reference: Optional[pd.DataFrame],
    ) -> float:
        if reference is None or reference.empty:
            # Proxy using duplicate rate in the synthetic data.
            return float(synthetic.duplicated().mean())

        reference_keys = self._hash_rows(reference)
        synthetic_keys = self._hash_rows(synthetic)
        matches = sum(1 for key in synthetic_keys if key in reference_keys)
        return matches / max(len(synthetic_keys), 1)

    def _hash_rows(self, frame: pd.DataFrame) -> set[Tuple[object, ...]]:
        hashes = set()
        for _, row in frame.iterrows():
            normalized: Tuple[object, ...] = tuple(self._normalize_value(value) for value in row)
            hashes.add(normalized)
        return hashes

    def _normalize_value(self, value: object) -> object:
        if isinstance(value, float):
            return round(value, 4)
        if isinstance(value, (np.floating, np.integer)):
            return round(float(value), 4)
        return value


__all__ = [
    "ConstraintVerifier",
    "VerificationReport",
]
