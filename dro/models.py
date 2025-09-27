"""Core data models for the Data Residency Optimizer."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, Iterable, List, Mapping, Sequence, Set


@dataclass(frozen=True)
class DatasetSpec:
    """Describes a dataset that needs placement."""

    id: str
    size_gb: float
    tenants: Sequence[str]
    replica_count: int = 1


@dataclass(frozen=True)
class RegionSpec:
    """Describes a cloud region available for placement."""

    id: str
    jurisdiction: str
    storage_cost_per_gb: float
    egress_cost_per_gb: float


@dataclass(frozen=True)
class RequestProfile:
    """Represents a consumer of datasets with a latency SLO."""

    id: str
    region: str
    latency_slo_ms: float
    demand_gb_per_dataset: Mapping[str, float]


@dataclass(frozen=True)
class ResidencyRule:
    """Residency constraint for a dataset/tenant pair."""

    dataset_id: str
    tenant_id: str
    allowed_regions: Sequence[str]


@dataclass
class OptimizationSpec:
    """Container for optimization input data."""

    datasets: Mapping[str, DatasetSpec]
    regions: Mapping[str, RegionSpec]
    request_profiles: Mapping[str, RequestProfile]
    residency_rules: Sequence[ResidencyRule]
    latency_matrix_ms: Mapping[tuple[str, str], float]
    signing_secret: str

    allowed_region_map: Dict[str, Set[str]] = field(init=False)

    def __post_init__(self) -> None:
        self.allowed_region_map = self._build_allowed_region_map(self.residency_rules)

    def _build_allowed_region_map(
        self, residency_rules: Iterable[ResidencyRule]
    ) -> Dict[str, Set[str]]:
        allowed: Dict[str, Set[str]] = {
            dataset_id: set(self.regions.keys()) for dataset_id in self.datasets
        }
        for rule in residency_rules:
            allowed.setdefault(rule.dataset_id, set(self.regions.keys()))
            allowed[rule.dataset_id] &= set(rule.allowed_regions)
        return allowed


@dataclass
class OptimizationResult:
    """Represents the optimizer output prior to signing."""

    placements: Dict[str, List[str]]
    objective_cost: float
    solver_status: str
    inputs_digest: str

    def sorted_placements(self) -> Dict[str, List[str]]:
        return {
            dataset_id: sorted(regions)
            for dataset_id, regions in sorted(self.placements.items())
        }
