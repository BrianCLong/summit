from __future__ import annotations

import json
from copy import deepcopy
from datetime import datetime
from pathlib import Path
import sys

import pytest

sys.path.append(str(Path(__file__).resolve().parents[1]))

from intelgraph_py.csrs import (
    ClockShiftScenario,
    RetentionPlanner,
    generate_signed_retention_diff,
)

FIXTURE_DIR = Path(__file__).parent / "fixtures"


def _load_fixture(name: str) -> dict:
    return json.loads((FIXTURE_DIR / name).read_text())


def _planner_from_fixture(payload: dict) -> RetentionPlanner:
    reference_time = datetime.fromisoformat(payload["reference_time"].replace("Z", "+00:00"))
    return RetentionPlanner(
        reference_time=reference_time,
        clock_shift=ClockShiftScenario(**payload["clock_shift"]),
    )


@pytest.mark.parametrize(
    "fixture_name, golden_name",
    [("csrs_input.json", "csrs_golden_plan.json")],
)
def test_simulation_matches_golden_snapshot(fixture_name: str, golden_name: str) -> None:
    fixture = _load_fixture(fixture_name)
    golden = _load_fixture(golden_name)
    planner = _planner_from_fixture(fixture)
    plan = planner.simulate(fixture["datasets"])
    assert plan == golden


def test_dependencies_cover_all_expected_impacts() -> None:
    fixture = _load_fixture("csrs_input.json")
    planner = _planner_from_fixture(fixture)
    plan = planner.simulate(fixture["datasets"])
    flattened = [
        dependency["name"]
        for dataset in plan["datasets"]
        for dependency in dataset["dependencies"]
    ]
    dependency_names = set(flattened)
    expected = {
        "fraud_features_v4",
        "customer_support_index",
        "fraud_scoring_index",
        "reg_report_features",
    }
    assert expected.issubset(dependency_names)
    # Ensure there are no duplicate dependencies accidentally dropped or merged.
    assert len(flattened) == len(dependency_names)


def test_retention_diff_is_deterministic() -> None:
    golden = _load_fixture("csrs_golden_plan.json")
    mutated = deepcopy(golden)
    mutated["datasets"][0]["purposes"][0]["retention_days"] += 1
    signing_key = "demo-secret"
    first = generate_signed_retention_diff(golden, mutated, signing_key)
    second = generate_signed_retention_diff(golden, mutated, signing_key)
    assert first == second
    # Changing the signing key must change the signature to ensure authenticity.
    different_key = generate_signed_retention_diff(golden, mutated, "other-secret")
    assert first["diff"] == different_key["diff"]
    assert first["signature"] != different_key["signature"]
