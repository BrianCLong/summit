from __future__ import annotations

import time
import tracemalloc
from pathlib import Path

from summit.agent_eval import AgentEvalHarness


def test_agent_eval_perf_budget(tmp_path: Path) -> None:
    artifact = tmp_path / "artifact.py"
    artifact.write_text("print('budget-check')\n", encoding="utf-8")
    out_dir = tmp_path / "out"

    harness = AgentEvalHarness(gates_enabled=True)

    tracemalloc.start()
    start = time.perf_counter()
    harness.evaluate(str(artifact), str(out_dir), agent_model="perf-model", prompt_hash="sha256:perf")
    elapsed = time.perf_counter() - start
    _, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()

    assert elapsed <= 2.0
    assert peak <= 200 * 1024 * 1024

