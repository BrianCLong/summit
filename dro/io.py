"""Input/output helpers for DRO specifications."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, Mapping, Tuple

from .models import DatasetSpec, OptimizationSpec, RegionSpec, RequestProfile, ResidencyRule


def load_spec_from_dict(data: Mapping[str, Any]) -> OptimizationSpec:
    datasets = {
        item["id"]: DatasetSpec(
            id=item["id"],
            size_gb=float(item["size_gb"]),
            tenants=item.get("tenants", []),
            replica_count=int(item.get("replica_count", 1)),
        )
        for item in data["datasets"]
    }

    regions = {
        item["id"]: RegionSpec(
            id=item["id"],
            jurisdiction=item["jurisdiction"],
            storage_cost_per_gb=float(item["storage_cost_per_gb"]),
            egress_cost_per_gb=float(item["egress_cost_per_gb"]),
        )
        for item in data["regions"]
    }

    request_profiles = {
        item["id"]: RequestProfile(
            id=item["id"],
            region=item["region"],
            latency_slo_ms=float(item["latency_slo_ms"]),
            demand_gb_per_dataset={
                dataset_id: float(demand)
                for dataset_id, demand in item.get("demand_gb_per_dataset", {}).items()
            },
        )
        for item in data["request_profiles"]
    }

    residency_rules = [
        ResidencyRule(
            dataset_id=item["dataset_id"],
            tenant_id=item["tenant_id"],
            allowed_regions=item.get("allowed_regions", []),
        )
        for item in data.get("residency_rules", [])
    ]

    latency_matrix = _parse_latency_matrix(data.get("latency_matrix_ms", {}))

    return OptimizationSpec(
        datasets=datasets,
        regions=regions,
        request_profiles=request_profiles,
        residency_rules=residency_rules,
        latency_matrix_ms=latency_matrix,
        signing_secret=data["signing_secret"],
    )


def load_spec_from_file(path: Path) -> OptimizationSpec:
    data = json.loads(path.read_text(encoding="utf-8"))
    return load_spec_from_dict(data)


def _parse_latency_matrix(raw: Mapping[str, Any]) -> Dict[Tuple[str, str], float]:
    matrix: Dict[Tuple[str, str], float] = {}
    for region_id, requestors in raw.items():
        for requestor_region, latency in requestors.items():
            matrix[(region_id, requestor_region)] = float(latency)
    return matrix


__all__ = ["load_spec_from_dict", "load_spec_from_file"]
