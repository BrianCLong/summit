import json
import re

from summit.agents.orchestrator import AgentOrchestrator
from summit.agents.tool_registry import AgentToolRegistry


def _deterministic_tool(payload: dict[str, str]) -> dict[str, str]:
    task = payload.get("task", "")
    return {"echo": task, "status": "ok"}


def test_orchestrator_feature_flag_default_off(monkeypatch):
    monkeypatch.delenv("SUMMIT_AGENT_ENABLED", raising=False)

    registry = AgentToolRegistry(allowlist=["deterministic_echo"])
    registry.register_tool("deterministic_echo", _deterministic_tool)

    orchestrator = AgentOrchestrator(registry, enabled=False)
    result = orchestrator.run("test-task")

    assert result == {"action": "skip", "reason": "feature_flag_disabled"}


def test_orchestrator_smoke_deterministic_artifacts(tmp_path):
    registry = AgentToolRegistry(allowlist=["deterministic_echo"])
    registry.register_tool("deterministic_echo", _deterministic_tool)
    orchestrator = AgentOrchestrator(registry, enabled=True)

    run1_dir = tmp_path / "run1"
    run2_dir = tmp_path / "run2"

    first = orchestrator.run("Investigate pipeline drift", out_dir=run1_dir)
    second = orchestrator.run("Investigate pipeline drift", out_dir=run2_dir)

    assert first == second
    assert first["stamp"]["agent_version"] == "v0"
    assert len(first["stamp"]["evidence_ids"]) == 3
    assert re.match(r"^EVID:[a-z0-9-]+:\d{4}$", first["stamp"]["evidence_ids"][0])

    for filename in ("report.json", "metrics.json", "stamp.json"):
        path1 = run1_dir / filename
        path2 = run2_dir / filename
        assert path1.exists()
        assert path2.exists()
        assert path1.read_text(encoding="utf-8") == path2.read_text(encoding="utf-8")

    report = json.loads((run1_dir / "report.json").read_text(encoding="utf-8"))
    metrics = json.loads((run1_dir / "metrics.json").read_text(encoding="utf-8"))

    report_text = json.dumps(report, sort_keys=True)
    metrics_text = json.dumps(metrics, sort_keys=True)
    assert "generated_at" not in report_text
    assert "created_at" not in report_text
    assert "generated_at" not in metrics_text
    assert "created_at" not in metrics_text
