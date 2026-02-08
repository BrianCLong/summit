import pytest
from summit.observability.conflicts import ConflictLog

def test_conflict_logging():
    log = ConflictLog()
    log.log_conflict(
        conflict_id="C1",
        agents=["agent-a", "agent-b"],
        description="Disagreement on risk",
        resolution_method="consensus",
        winner="agent-a",
        reasoning="Higher authority"
    )

    assert len(log.conflicts) == 1
    assert log.conflicts[0].winner_agent == "agent-a"
    assert "Total Conflicts: 1" in log.get_summary()
