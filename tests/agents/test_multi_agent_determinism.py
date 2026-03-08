from __future__ import annotations

import json
from pathlib import Path

from agents.runner.multi_agent.coordinator import run_task


def test_multi_agent_artifacts_and_hash_are_deterministic(tmp_path: Path) -> None:
    first = tmp_path / "first"
    second = tmp_path / "second"

    run_task("sample task", first)
    run_task("sample task", second)

    for name in ("report.json", "metrics.json", "stamp.json"):
        assert (first / name).exists()
        assert (second / name).exists()

    first_hash = json.loads((first / "stamp.json").read_text())["deterministic_hash"]
    second_hash = json.loads((second / "stamp.json").read_text())["deterministic_hash"]
    assert first_hash == second_hash
