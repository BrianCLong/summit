import pytest
import json
import shutil
import os
from pathlib import Path
from summit_ttt.runner import run
from summit_ttt.config import TTTConfig
from summit_ttt.policies import PolicyViolation

@pytest.fixture(autouse=True)
def enable_ttt():
    os.environ["SUMMIT_TTT_DISCOVER_ENABLED"] = "1"
    yield
    del os.environ["SUMMIT_TTT_DISCOVER_ENABLED"]

def test_runner_produces_evidence_artifacts(tmp_path):
    output_dir = tmp_path / "runs" / "test_run"
    config = TTTConfig(
        env_id="test-env",
        run_id="a" * 64,
        max_attempts=2,
        dry_run=True,
        output_dir=str(output_dir)
    )

    run(config)

    assert (output_dir / "report.json").exists()
    assert (output_dir / "metrics.json").exists()
    assert (output_dir / "stamp.json").exists()

    with open(output_dir / "report.json") as f:
        report = json.load(f)
        assert report["run_id"] == config.run_id
        assert len(report["attempts_summary"]) == 2

def test_runner_enforces_output_path():
    bad_path = "forbidden_dir/run"
    config = TTTConfig(
        env_id="test-env",
        run_id="a" * 64,
        output_dir=bad_path
    )

    with pytest.raises(PolicyViolation):
        run(config)
