"""Mixed integer optimization core for DRO."""

from __future__ import annotations

import json
import hashlib
from dataclasses import dataclass
from typing import Dict, List, Tuple

from pulp import LpBinary, LpMinimize, LpProblem, LpStatus, LpVariable, PULP_CBC_CMD, lpSum, value

from .context import ConstraintContext
from .loader import ConstraintLoader
from .models import OptimizationResult, OptimizationSpec


@dataclass(slots=True)
class DecisionModel:
    problem: LpProblem
    decision_vars: Dict[Tuple[str, str], LpVariable]


class DataResidencyOptimizer:
    """Builds and solves the DRO mixed integer problem."""

    def __init__(self, constraint_loader: ConstraintLoader | None = None) -> None:
        self.loader = constraint_loader or ConstraintLoader()

    def build_model(self, spec: OptimizationSpec) -> DecisionModel:
        problem = LpProblem("data_residency_optimizer", LpMinimize)
        decision_vars: Dict[Tuple[str, str], LpVariable] = {}

        for dataset_id in spec.datasets:
            for region_id in spec.regions:
                var_name = f"x__{dataset_id}__{region_id}"
                decision_vars[(dataset_id, region_id)] = LpVariable(var_name, cat=LpBinary)

        objective_terms = []
        total_demands = self._dataset_total_demand(spec)
        for dataset_id, dataset in spec.datasets.items():
            for region_id, region in spec.regions.items():
                var = decision_vars[(dataset_id, region_id)]
                storage_cost = dataset.size_gb * region.storage_cost_per_gb
                egress_cost = 0.0
                if total_demands.get(dataset_id):
                    egress_cost = (
                        total_demands[dataset_id]
                        * region.egress_cost_per_gb
                        / max(1, dataset.replica_count)
                    )
                objective_terms.append((storage_cost + egress_cost) * var)

        problem += lpSum(objective_terms)

        context = ConstraintContext(problem=problem, decision_vars=decision_vars, spec=spec)
        self.loader.apply(context)
        return DecisionModel(problem=problem, decision_vars=decision_vars)

    def solve(self, spec: OptimizationSpec) -> OptimizationResult:
        model = self.build_model(spec)
        solver = PULP_CBC_CMD(msg=False)
        model.problem.solve(solver)
        status = LpStatus.get(model.problem.status, "Unknown")
        if status not in {"Optimal", "Feasible"}:
            raise RuntimeError(f"Solver failed to find feasible plan (status={status})")

        placements: Dict[str, List[str]] = {}
        for (dataset_id, region_id), var in model.decision_vars.items():
            if var.value() and var.value() > 0.5:
                placements.setdefault(dataset_id, []).append(region_id)

        # Ensure we always report every dataset, even if infeasible placement occurs.
        for dataset_id in spec.datasets:
            placements.setdefault(dataset_id, [])
            expected_replicas = spec.datasets[dataset_id].replica_count
            if len(placements[dataset_id]) != expected_replicas:
                raise RuntimeError(
                    f"Dataset {dataset_id} expected {expected_replicas} replicas but"
                    f" received {len(placements[dataset_id])}"
                )

        objective_cost = float(value(model.problem.objective))
        digest = self._spec_digest(spec)
        return OptimizationResult(
            placements=placements,
            objective_cost=objective_cost,
            solver_status=status,
            inputs_digest=digest,
        )

    def _dataset_total_demand(self, spec: OptimizationSpec) -> Dict[str, float]:
        totals: Dict[str, float] = {dataset_id: 0.0 for dataset_id in spec.datasets}
        for requestor in spec.request_profiles.values():
            for dataset_id, demand in requestor.demand_gb_per_dataset.items():
                totals[dataset_id] = totals.get(dataset_id, 0.0) + float(demand)
        return totals

    def _spec_digest(self, spec: OptimizationSpec) -> str:
        payload = {
            "datasets": {
                dataset_id: {
                    "size_gb": dataset.size_gb,
                    "replica_count": dataset.replica_count,
                    "tenants": list(dataset.tenants),
                }
                for dataset_id, dataset in sorted(spec.datasets.items())
            },
            "regions": {
                region_id: {
                    "jurisdiction": region.jurisdiction,
                    "storage_cost_per_gb": region.storage_cost_per_gb,
                    "egress_cost_per_gb": region.egress_cost_per_gb,
                }
                for region_id, region in sorted(spec.regions.items())
            },
            "latency": {
                f"{region_id}__{requestor_region}": latency
                for (region_id, requestor_region), latency in sorted(spec.latency_matrix_ms.items())
            },
            "residency": [
                {
                    "dataset_id": rule.dataset_id,
                    "tenant_id": rule.tenant_id,
                    "allowed_regions": sorted(rule.allowed_regions),
                }
                for rule in sorted(
                    spec.residency_rules,
                    key=lambda r: (r.dataset_id, r.tenant_id),
                )
            ],
            "request_profiles": {
                requestor_id: {
                    "region": profile.region,
                    "latency_slo_ms": profile.latency_slo_ms,
                    "demand": dict(sorted(profile.demand_gb_per_dataset.items())),
                }
                for requestor_id, profile in sorted(spec.request_profiles.items())
            },
        }
        canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"))
        return hashlib.sha256(canonical.encode("utf-8")).hexdigest()
