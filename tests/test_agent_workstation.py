from __future__ import annotations

import json
from pathlib import Path

import pytest

from summit.agent_workstation.runtime import AgentWorkstation
from summit.evidence.memory_store import MemoryStore


def _agent(name: str):
    def run(task: str) -> dict[str, str]:
        return {"agent": name, "task": task, "status": "ok"}

    return run


def test_runtime_requires_feature_flag(tmp_path: Path) -> None:
    runtime = AgentWorkstation(config={"memory_path": str(tmp_path / "memory.json")})
    with pytest.raises(RuntimeError):
        runtime.run(
            task_id="T-1",
            task="check",
            channel="cli",
            agents={"beta": _agent("beta"), "alpha": _agent("alpha")},
            output_dir=tmp_path / "artifacts",
        )


def test_runtime_produces_deterministic_artifacts_and_reuses_memory(tmp_path: Path) -> None:
    memory_path = tmp_path / "memory.json"
    runtime = AgentWorkstation(
        config={
            "memory_path": str(memory_path),
            "deterministic_order": True,
            "concurrency_limit": 2,
        },
        feature_flag=True,
    )

    runtime.run(
        task_id="T-2",
        task="classify",
        channel="cli",
        agents={"zeta": _agent("zeta"), "alpha": _agent("alpha")},
        output_dir=tmp_path / "artifacts-1",
    )
    runtime.run(
        task_id="T-2",
        task="classify",
        channel="cli",
        agents={"zeta": _agent("zeta"), "alpha": _agent("alpha")},
        output_dir=tmp_path / "artifacts-2",
    )

    report_1 = json.loads((tmp_path / "artifacts-1" / "report.json").read_text())
    report_2 = json.loads((tmp_path / "artifacts-2" / "report.json").read_text())
    assert report_1 == report_2
    assert "timestamp" not in report_1

    store = MemoryStore(memory_path)
    recalled = store.get("cli:T-2")
    assert recalled is not None
    assert recalled["task"] == "classify"
