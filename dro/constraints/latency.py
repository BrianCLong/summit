"""Latency constraints."""

from __future__ import annotations

from typing import Set

from pulp import lpSum

from ..context import ConstraintContext
from .base import ConstraintPlugin


class LatencyConstraint(ConstraintPlugin):
    """Ensure every requestor meets latency SLOs for accessed datasets."""

    def apply(self, context: ConstraintContext) -> None:
        for requestor in context.spec.request_profiles.values():
            for dataset_id, demand in requestor.demand_gb_per_dataset.items():
                if demand <= 0:
                    continue
                allowed_regions = self._regions_meeting_latency(context, dataset_id, requestor)
                if not allowed_regions:
                    raise ValueError(
                        "No regions satisfy latency SLO for dataset"
                        f" {dataset_id} and requestor {requestor.id}"
                    )
                vars_meeting_latency = [
                    context.dataset_region_var(dataset_id, region_id)
                    for region_id in sorted(allowed_regions)
                ]
                constraint_name = f"latency_{dataset_id}_{requestor.id}"
                context.problem += lpSum(vars_meeting_latency) >= 1, constraint_name

    def _regions_meeting_latency(
        self, context: ConstraintContext, dataset_id: str, requestor
    ) -> Set[str]:
        allowed: Set[str] = set()
        for region_id in context.spec.regions:
            latency = context.spec.latency_matrix_ms.get((region_id, requestor.region))
            if latency is not None and latency <= requestor.latency_slo_ms:
                allowed.add(region_id)
        allowed &= context.spec.allowed_region_map.get(dataset_id, set())
        return allowed
