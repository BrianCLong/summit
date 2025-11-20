"""Leakage auditing utilities."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict

import numpy as np
import pandas as pd
from sklearn.metrics import pairwise_distances


@dataclass(frozen=True)
class LeakageAudit:
    """Summarises leakage signals between real and synthetic data."""

    min_distance: float
    closest_distance: float
    duplicate_count: int

    def to_dict(self) -> Dict[str, float]:  # pragma: no cover - convenience helper
        return {
            "min_distance": self.min_distance,
            "closest_distance": self.closest_distance,
            "duplicate_count": float(self.duplicate_count),
        }


def audit_leakage(original: pd.DataFrame, synthetic: pd.DataFrame) -> LeakageAudit:
    """Compute basic duplicate and proximity checks to guard against leakage."""

    if original.empty or synthetic.empty:
        raise ValueError("Both original and synthetic dataframes must be non-empty")

    shared_columns = [c for c in synthetic.columns if c in original.columns]
    orig_encoded = pd.get_dummies(original[shared_columns], drop_first=False).to_numpy(dtype=float)
    synth_encoded = pd.get_dummies(synthetic[shared_columns], drop_first=False).to_numpy(dtype=float)

    duplicates = pd.merge(original, synthetic, on=shared_columns, how="inner").shape[0]

    distances = pairwise_distances(synth_encoded, orig_encoded, metric="euclidean")
    closest = float(np.min(distances)) if distances.size else float("inf")
    min_per_row = float(np.mean(np.min(distances, axis=1))) if distances.size else float("inf")

    return LeakageAudit(
        min_distance=min_per_row,
        closest_distance=closest,
        duplicate_count=int(duplicates),
    )
