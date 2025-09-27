"""Residency constraint implementation."""

from __future__ import annotations

from ..context import ConstraintContext
from .base import ConstraintPlugin


class ResidencyConstraint(ConstraintPlugin):
    """Disallow placements that violate residency rules."""

    def apply(self, context: ConstraintContext) -> None:
        for dataset_id in context.spec.datasets:
            allowed_regions = context.spec.allowed_region_map.get(dataset_id)
            if not allowed_regions:
                raise ValueError(f"No residency-compliant regions for dataset {dataset_id}")
            for region_id in context.spec.regions:
                if region_id not in allowed_regions:
                    var = context.dataset_region_var(dataset_id, region_id)
                    context.problem += var == 0, f"residency_{dataset_id}_{region_id}"
