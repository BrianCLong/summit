import json
import subprocess
import sys
from pathlib import Path

from esa.cli import evaluate_plan


def write_plan(path: Path, config: dict) -> None:
    path.write_text(json.dumps(config))


def test_ci_gate_blocks_bad_plan(tmp_path: Path, dataset_file: Path) -> None:
    plan_path = tmp_path / "plan.json"
    plan_config = {"type": "uniform", "sample_size": 1, "seed": 1}
    write_plan(plan_path, plan_config)
    cmd = [
        sys.executable,
        "-m",
        "esa.cli",
        "ci-check",
        "--plan",
        str(plan_path),
        "--dataset",
        str(dataset_file),
        "--metric",
        "value",
        "--bias-tolerance",
        "0.0001",
    ]
    completed = subprocess.run(cmd, cwd=Path(__file__).resolve().parents[1])
    assert completed.returncode != 0


def test_ci_gate_passes_with_relaxed_threshold(tmp_path: Path, dataset_file: Path) -> None:
    plan_config = {"type": "uniform", "sample_size": 1, "seed": 1}
    evaluation = evaluate_plan(plan_config, dataset_file, "value")
    assert abs(evaluation.observed_bias) > 0.0001
    # Now run with generous tolerance
    plan_path = tmp_path / "plan.json"
    write_plan(plan_path, plan_config)
    cmd = [
        sys.executable,
        "-m",
        "esa.cli",
        "ci-check",
        "--plan",
        str(plan_path),
        "--dataset",
        str(dataset_file),
        "--metric",
        "value",
        "--bias-tolerance",
        "10",
    ]
    completed = subprocess.run(cmd, cwd=Path(__file__).resolve().parents[1])
    assert completed.returncode == 0
