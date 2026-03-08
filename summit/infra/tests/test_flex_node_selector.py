from __future__ import annotations

import json
from pathlib import Path

from summit.infra.flex_node_selector import SelectionInput, select_flexible_node
from summit.infra.instance_catalog import InstanceCandidate


def _catalog() -> list[InstanceCandidate]:
    return [
        InstanceCandidate("aws", "m7i.2xlarge", "m7i", 8, 32.0, 0.80, 0.91, 0.87),
        InstanceCandidate("aws", "c7i.2xlarge", "c7i", 8, 16.0, 0.68, 0.79, 0.90),
        InstanceCandidate("aws", "r7i.2xlarge", "r7i", 8, 64.0, 0.95, 0.95, 0.84),
        InstanceCandidate("azure", "D8s_v5", "Dsv5", 8, 32.0, 0.88, 0.83, 0.85),
    ]


def test_selector_is_deterministic_and_emits_artifacts(tmp_path: Path):
    selection_input = SelectionInput(
        allowed_families=("m7i", "c7i", "r7i"),
        worker_count=4,
        provider="aws",
        workload="batch-etl",
    )

    run_one = tmp_path / "run_one"
    run_two = tmp_path / "run_two"

    report_one = select_flexible_node(selection_input, _catalog(), run_one, git_sha="abc1234")
    report_two = select_flexible_node(selection_input, _catalog(), run_two, git_sha="abc1234")

    assert report_one == report_two
    assert report_one["selected"]["instance_type"] == "c7i.2xlarge"
    assert report_one["evidence_id"].startswith("SUMMIT-FLEXNODE-")

    assert (run_one / "selection_report.json").read_text() == (run_two / "selection_report.json").read_text()
    assert (run_one / "metrics.json").read_text() == (run_two / "metrics.json").read_text()
    assert (run_one / "stamp.json").read_text() == (run_two / "stamp.json").read_text()


def test_selector_falls_back_when_highest_score_unavailable(tmp_path: Path):
    reduced_catalog = [i for i in _catalog() if i.instance_type != "c7i.2xlarge"]

    selection_input = SelectionInput(
        allowed_families=("m7i", "c7i", "r7i"),
        worker_count=4,
        provider="aws",
        workload="batch-etl",
    )

    report = select_flexible_node(
        selection_input,
        reduced_catalog,
        tmp_path,
        git_sha="deadbeef",
    )

    assert report["selected"]["instance_type"] == "m7i.2xlarge"
    serialized = json.loads((tmp_path / "selection_report.json").read_text())
    assert serialized["selected"]["instance_type"] == "m7i.2xlarge"
