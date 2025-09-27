"""Assignment constraint implementation."""

from __future__ import annotations

from pulp import lpSum

from ..context import ConstraintContext
from .base import ConstraintPlugin


class AssignmentConstraint(ConstraintPlugin):
    """Ensure each dataset chooses exactly one region per replica."""

    def apply(self, context: ConstraintContext) -> None:
        for dataset_id, dataset in context.spec.datasets.items():
            variables = [
                context.dataset_region_var(dataset_id, region_id)
                for region_id in context.spec.regions
            ]
            context.problem += lpSum(variables) >= dataset.replica_count, f"assign_min_{dataset_id}"
            context.problem += lpSum(variables) <= dataset.replica_count, f"assign_max_{dataset_id}"
