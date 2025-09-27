"""Tests for the Feature Lineage Impact Analyzer."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest

from intelgraph_py.flia import analyze_change, load_lineage
from intelgraph_py.flia.fixtures import export_fixtures
from intelgraph_py.flia.playbook import execute_playbook


@pytest.fixture()
def fixture_dir(tmp_path: Path) -> Path:
    target = tmp_path / "fixtures"
    export_fixtures(target)
    return target


@pytest.fixture()
def lineage_graph(fixture_dir: Path):
    return load_lineage(
        model_registry=fixture_dir / "model_registry.json",
        feature_catalog=fixture_dir / "feature_catalog.json",
        pipeline_dag=fixture_dir / "pipeline_dag.json",
    )


def test_flia_identifies_true_downstream_dependents(lineage_graph) -> None:
    report = analyze_change(lineage_graph, "feature:user_profile.email_domain")

    impacted_model_ids = [model["id"] for model in report.impacted_models]
    assert impacted_model_ids == [
        "model:churn_predictor",
        "model:customer_lifetime_value",
        "model:marketing_segmentation",
    ]
    # Ensure no false positives.
    assert "model:revenue_forecaster" not in {node["id"] for node in report.impacted_nodes}

    assert report.metrics_at_risk == [
        "clv_mae",
        "coverage_rate",
        "f1",
        "roc_auc",
        "segment_purity",
    ]
    assert report.retrain_order == [
        "model:marketing_segmentation",
        "model:churn_predictor",
        "model:customer_lifetime_value",
    ]


def test_playbook_executes_with_fixture_handlers(lineage_graph) -> None:
    report = analyze_change(lineage_graph, "feature:user_profile.email_domain")
    plan_results = execute_playbook(report.playbook)

    assert set(plan_results) == {"tests", "backfills", "cache_invalidations"}

    for category, actions in plan_results.items():
        assert actions, f"Expected actions for category {category}"
        for action in actions:
            outcome = action["result"]
            assert outcome["status"] in {"passed", "completed", "invalidated"}


def test_cli_produces_reproducible_results(fixture_dir: Path, tmp_path: Path) -> None:
    first_output = tmp_path / "report1.json"
    second_output = tmp_path / "report2.json"
    base_cmd = [
        sys.executable,
        "-m",
        "intelgraph_py.flia.cli",
        "analyze",
        "feature:user_profile.email_domain",
        "--model-registry",
        str(fixture_dir / "model_registry.json"),
        "--feature-catalog",
        str(fixture_dir / "feature_catalog.json"),
        "--pipeline-dag",
        str(fixture_dir / "pipeline_dag.json"),
        "--run-playbook",
    ]

    env = os.environ.copy()
    root_dir = Path(__file__).resolve().parents[1]
    env["PYTHONPATH"] = (
        f"{root_dir}{os.pathsep}{env['PYTHONPATH']}"
        if "PYTHONPATH" in env and env["PYTHONPATH"]
        else str(root_dir)
    )

    subprocess.run(base_cmd + ["--output", str(first_output)], check=True, env=env)
    subprocess.run(base_cmd + ["--output", str(second_output)], check=True, env=env)

    first_payload = json.loads(first_output.read_text(encoding="utf-8"))
    second_payload = json.loads(second_output.read_text(encoding="utf-8"))
    assert first_payload == second_payload
