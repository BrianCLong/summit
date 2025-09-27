from __future__ import annotations

from pathlib import Path

from dro.diff import PlanDiffer
from dro.io import load_spec_from_dict, load_spec_from_file
from dro.models import DatasetSpec, OptimizationSpec, RegionSpec, RequestProfile, ResidencyRule
from dro.optimizer import DataResidencyOptimizer
from dro.signing import PlanSigner


def build_simple_spec() -> OptimizationSpec:
    data = {
        "signing_secret": "unit-secret",
        "datasets": [
            {"id": "ds-a", "size_gb": 50, "tenants": ["tenant-a"], "replica_count": 1},
            {"id": "ds-b", "size_gb": 30, "tenants": ["tenant-b"], "replica_count": 1},
        ],
        "regions": [
            {
                "id": "us-east-1",
                "jurisdiction": "US",
                "storage_cost_per_gb": 0.02,
                "egress_cost_per_gb": 0.09,
            },
            {
                "id": "eu-west-1",
                "jurisdiction": "EU",
                "storage_cost_per_gb": 0.025,
                "egress_cost_per_gb": 0.085,
            },
        ],
        "request_profiles": [
            {
                "id": "app-us",
                "region": "us-east-1",
                "latency_slo_ms": 90,
                "demand_gb_per_dataset": {"ds-a": 25, "ds-b": 10},
            },
            {
                "id": "app-eu",
                "region": "eu-west-1",
                "latency_slo_ms": 85,
                "demand_gb_per_dataset": {"ds-a": 20, "ds-b": 15},
            },
        ],
        "residency_rules": [
            {
                "dataset_id": "ds-a",
                "tenant_id": "tenant-a",
                "allowed_regions": ["us-east-1", "eu-west-1"],
            },
            {
                "dataset_id": "ds-b",
                "tenant_id": "tenant-b",
                "allowed_regions": ["eu-west-1"],
            },
        ],
        "latency_matrix_ms": {
            "us-east-1": {"us-east-1": 25, "eu-west-1": 95},
            "eu-west-1": {"us-east-1": 90, "eu-west-1": 35},
        },
    }
    return load_spec_from_dict(data)


def test_optimizer_produces_feasible_plan() -> None:
    spec = build_simple_spec()
    optimizer = DataResidencyOptimizer()
    result = optimizer.solve(spec)

    assert result.solver_status in {"Optimal", "Feasible"}
    assert set(result.placements["ds-a"]) == {"eu-west-1"}
    assert set(result.placements["ds-b"]) == {"eu-west-1"}

    signer = PlanSigner(secret=spec.signing_secret)
    plan = signer.sign(result)
    assert signer.verify(plan)
    assert plan["plan_id"]
    assert plan["signature"]["value"]


def test_plan_diffs_are_deterministic() -> None:
    spec = build_simple_spec()
    optimizer = DataResidencyOptimizer()
    signer = PlanSigner(secret=spec.signing_secret)
    result = optimizer.solve(spec)
    base_plan = signer.sign(result)

    tweaked_data = {
        "signing_secret": "unit-secret",
        "datasets": [
            {"id": "ds-a", "size_gb": 50, "tenants": ["tenant-a"], "replica_count": 1},
            {"id": "ds-b", "size_gb": 30, "tenants": ["tenant-b"], "replica_count": 1},
        ],
        "regions": [
            {
                "id": "us-east-1",
                "jurisdiction": "US",
                "storage_cost_per_gb": 0.02,
                "egress_cost_per_gb": 0.09,
            },
            {
                "id": "eu-west-1",
                "jurisdiction": "EU",
                "storage_cost_per_gb": 0.028,
                "egress_cost_per_gb": 0.1,
            },
        ],
        "request_profiles": [
            {
                "id": "app-us",
                "region": "us-east-1",
                "latency_slo_ms": 90,
                "demand_gb_per_dataset": {"ds-a": 25, "ds-b": 10},
            },
            {
                "id": "app-eu",
                "region": "eu-west-1",
                "latency_slo_ms": 110,
                "demand_gb_per_dataset": {"ds-a": 20, "ds-b": 15},
            },
        ],
        "residency_rules": [
            {
                "dataset_id": "ds-a",
                "tenant_id": "tenant-a",
                "allowed_regions": ["us-east-1", "eu-west-1"],
            },
            {
                "dataset_id": "ds-b",
                "tenant_id": "tenant-b",
                "allowed_regions": ["eu-west-1"],
            },
        ],
        "latency_matrix_ms": {
            "us-east-1": {"us-east-1": 25, "eu-west-1": 95},
            "eu-west-1": {"us-east-1": 90, "eu-west-1": 35},
        },
    }
    tweaked_spec = load_spec_from_dict(tweaked_data)
    tweaked_plan = signer.sign(optimizer.solve(tweaked_spec))

    diff_a = PlanDiffer().diff(base_plan, tweaked_plan)
    diff_b = PlanDiffer().diff(base_plan, tweaked_plan)
    assert diff_a == diff_b
    assert diff_a["changes"]["modified"]


def test_benchmark_fixture_regression() -> None:
    spec = load_spec_from_file(Path("benchmarks/dro/sample_spec.json"))
    optimizer = DataResidencyOptimizer()
    result = optimizer.solve(spec)
    assert abs(result.objective_cost - 21.635) <= 0.21635
