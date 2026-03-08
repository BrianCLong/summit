from pathlib import Path

from agents.executor.test_runner import run_validation_loop


def test_autonomous_loop_disabled_by_default(tmp_path: Path) -> None:
    metrics = run_validation_loop(tmp_path)
    assert metrics["status"] == "disabled"
