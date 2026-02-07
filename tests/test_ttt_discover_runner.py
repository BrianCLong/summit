from __future__ import annotations

from pathlib import Path

import pytest

from summit.discover.runner import DiscoverConfig, run_discover
from summit.discover.tasks.toy_continuous import (
    ToyContinuousEvaluator,
    ToyContinuousProposalGenerator,
)


def _config(tmp_path: Path, max_steps: int, max_cost_units: int) -> DiscoverConfig:
    return DiscoverConfig(
        seed=7,
        max_steps=max_steps,
        max_cost_units=max_cost_units,
        output_root=tmp_path / "runs",
        artifact_root=tmp_path,
        feature_flag_ttt_discover=True,
    )


def test_toy_continuous_reward_improves(tmp_path: Path) -> None:
    report = run_discover(
        _config(tmp_path, max_steps=6, max_cost_units=6),
        ToyContinuousEvaluator(),
        ToyContinuousProposalGenerator(),
    )

    best_history = report["best_history"]
    assert all(
        earlier <= later for earlier, later in zip(best_history, best_history[1:])
    )
    assert best_history[-1] > best_history[0]

    run_dir = tmp_path / "runs" / report["run_id"]
    assert (run_dir / "report.json").exists()
    assert (run_dir / "metrics.json").exists()
    assert (run_dir / "stamp.json").exists()


def test_determinism_same_seed_same_outputs(tmp_path: Path) -> None:
    config = _config(tmp_path, max_steps=5, max_cost_units=5)
    evaluator = ToyContinuousEvaluator()
    generator = ToyContinuousProposalGenerator()

    report = run_discover(config, evaluator, generator)
    run_dir = tmp_path / "runs" / report["run_id"]
    report_bytes = (run_dir / "report.json").read_bytes()
    metrics_bytes = (run_dir / "metrics.json").read_bytes()

    run_discover(config, evaluator, generator)
    assert report_bytes == (run_dir / "report.json").read_bytes()
    assert metrics_bytes == (run_dir / "metrics.json").read_bytes()


def test_cost_budget_abort(tmp_path: Path) -> None:
    report = run_discover(
        _config(tmp_path, max_steps=5, max_cost_units=2),
        ToyContinuousEvaluator(),
        ToyContinuousProposalGenerator(),
    )
    assert report["status"] == "budget_exceeded"
    assert report["cost_units"] == 2


def test_output_allowlist_enforced(tmp_path: Path) -> None:
    config = DiscoverConfig(
        seed=1,
        max_steps=1,
        max_cost_units=1,
        output_root=tmp_path / "runs",
        artifact_root=tmp_path / "allowlist",
        feature_flag_ttt_discover=True,
    )
    with pytest.raises(ValueError, match="Output root must be within artifact allowlist"):
        run_discover(config, ToyContinuousEvaluator(), ToyContinuousProposalGenerator())
