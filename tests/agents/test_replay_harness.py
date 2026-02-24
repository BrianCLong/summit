from summit.agents.orchestrator import AgentOrchestrator
from summit.agents.replay import compute_replay_diff
from summit.agents.tool_registry import AgentToolRegistry


def _new_orchestrator() -> AgentOrchestrator:
    registry = AgentToolRegistry(allowlist=["deterministic_echo"])
    registry.register_tool("deterministic_echo", lambda payload: {"echo": payload["task"], "status": "ok"})
    return AgentOrchestrator(registry, enabled=True)


def test_compute_replay_diff_matches_identical_runs() -> None:
    orchestrator = _new_orchestrator()
    run1 = orchestrator.run("Investigate pipeline drift")
    run2 = orchestrator.run("Investigate pipeline drift")

    diff = compute_replay_diff(run1, run2)
    assert diff["match"] is True
    assert diff["changed"] == []


def test_compute_replay_diff_detects_changes() -> None:
    orchestrator = _new_orchestrator()
    baseline = orchestrator.run("Investigate pipeline drift")
    changed = orchestrator.run("Investigate pipeline drift")
    changed["metrics"]["tool_calls"] = 2

    diff = compute_replay_diff(baseline, changed)
    assert diff["match"] is False
    assert any(entry["path"] == "$.metrics.tool_calls" for entry in diff["changed"])
