"""Replica feasibility checks."""

from __future__ import annotations

from ..context import ConstraintContext
from .base import ConstraintPlugin


class ReplicaConstraint(ConstraintPlugin):
    """Validates replica counts versus available compliant regions."""

    def apply(self, context: ConstraintContext) -> None:
        for dataset_id, dataset in context.spec.datasets.items():
            allowed = context.spec.allowed_region_map.get(dataset_id, set())
            if len(allowed) < dataset.replica_count:
                raise ValueError(
                    "Insufficient compliant regions for replicas of dataset"
                    f" {dataset_id}: requested {dataset.replica_count}, available {len(allowed)}"
                )
