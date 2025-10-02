import json
import pathlib
import subprocess
import sys

import pytest

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / "src"))

from dlr import (  # noqa: E402
    LineageGraph,
    LineageNode,
    compute_recompute_plan,
)


@pytest.fixture()
def lineage_runs():
    run_a = LineageGraph(
        nodes={
            "raw_data": LineageNode(
                id="raw_data",
                deps=(),
                version="1",
                compute_cost=3.0,
                compute_time=3.0,
            ),
            "features": LineageNode(
                id="features",
                deps=("raw_data",),
                version="1",
                compute_cost=5.0,
                compute_time=6.0,
            ),
            "model": LineageNode(
                id="model",
                deps=("features",),
                version="1",
                compute_cost=8.0,
                compute_time=9.0,
            ),
            "report": LineageNode(
                id="report",
                deps=("model",),
                version="1",
                compute_cost=2.0,
                compute_time=3.0,
            ),
        }
    )
    run_b = LineageGraph(
        nodes={
            "raw_data": LineageNode(
                id="raw_data",
                deps=(),
                version="1",
                compute_cost=3.0,
                compute_time=3.0,
            ),
            "features": LineageNode(
                id="features",
                deps=("raw_data",),
                version="2",
                compute_cost=5.0,
                compute_time=6.0,
            ),
            "model": LineageNode(
                id="model",
                deps=("features",),
                version="1",
                compute_cost=8.0,
                compute_time=9.0,
            ),
            "report": LineageNode(
                id="report",
                deps=("model",),
                version="1",
                compute_cost=2.0,
                compute_time=3.0,
            ),
        }
    )
    return run_a, run_b


def test_minimal_recompute_plan(lineage_runs):
    run_a, run_b = lineage_runs
    plan = compute_recompute_plan(run_a, run_b)

    recomputed = [step.node for step in plan.steps if step.action == "recompute"]
    reused = [step.node for step in plan.steps if step.action == "reuse"]

    assert recomputed == ["features", "model", "report"]
    assert reused == ["raw_data"]
    assert plan.cache_reuse["raw_data"] == "reuse"


def test_constraints_respected(lineage_runs):
    run_a, run_b = lineage_runs
    plan = compute_recompute_plan(run_a, run_b, max_cost=20.0, max_time=20.0)
    assert pytest.approx(plan.total_cost, rel=1e-6) == 15.0
    assert pytest.approx(plan.total_time, rel=1e-6) == 18.0


def test_identical_inputs_stable(lineage_runs):
    run_a, run_b = lineage_runs
    plan_one = compute_recompute_plan(run_a, run_b)
    plan_two = compute_recompute_plan(run_a, run_b)
    assert plan_one == plan_two


def test_cli_execution(tmp_path, lineage_runs):
    run_a, run_b = lineage_runs
    run_a_payload = {
        "nodes": [
            {
                "id": node.id,
                "deps": list(node.deps),
                "version": node.version,
                "cost": node.compute_cost,
                "time": node.compute_time,
            }
            for node in run_a.nodes.values()
        ]
    }
    run_b_payload = {
        "nodes": [
            {
                "id": node.id,
                "deps": list(node.deps),
                "version": node.version,
                "cost": node.compute_cost,
                "time": node.compute_time,
            }
            for node in run_b.nodes.values()
        ]
    }
    run_a_path = tmp_path / "run_a.json"
    run_b_path = tmp_path / "run_b.json"
    run_a_path.write_text(json.dumps(run_a_payload))
    run_b_path.write_text(json.dumps(run_b_payload))

    script = pathlib.Path(__file__).resolve().parents[1] / "src" / "dlr.py"

    result = subprocess.run(
        [
            sys.executable,
            str(script),
            "--run-a",
            str(run_a_path),
            "--run-b",
            str(run_b_path),
            "--max-cost",
            "20",
            "--max-time",
            "20",
        ],
        check=True,
        capture_output=True,
        text=True,
    )

    payload = json.loads(result.stdout)
    recompute_steps = [step for step in payload["plan"] if step["action"] == "recompute"]
    assert [step["node"] for step in recompute_steps] == ["features", "model", "report"]
    assert payload["cache_reuse"]["raw_data"] == "reuse"
