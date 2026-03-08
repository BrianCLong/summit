import pytest

from summit.agent.skills.invocation_log import (
    get_metrics,
    record_skill_availability,
    record_skill_invocation,
    reset_metrics,
)


@pytest.fixture(autouse=True)
def reset():
    reset_metrics()
    yield

def test_metrics_tracking():
    # Scenario: Agent offered 3 skills, used 1
    offered = ["search", "calculator", "weather"]
    record_skill_availability(offered)

    record_skill_invocation("search")

    metrics = get_metrics()

    assert metrics["skill_available_count"] == 3
    assert metrics["skill_invoked_count"] == 1
    assert metrics["skill_invocation_rate"] == 1/3
    assert metrics["skills_offered"]["search"] == 1
    assert metrics["skills_used"]["search"] == 1
    assert "calculator" in metrics["skills_offered"]
    assert "calculator" not in metrics["skills_used"]

def test_zero_division():
    metrics = get_metrics()
    assert metrics["skill_invocation_rate"] == 0.0

def test_multiple_rounds():
    record_skill_availability(["a", "b"])
    record_skill_invocation("a")

    record_skill_availability(["a", "b"])
    record_skill_invocation("b")

    metrics = get_metrics()
    assert metrics["skill_available_count"] == 4
    assert metrics["skill_invoked_count"] == 2
    assert metrics["skill_invocation_rate"] == 0.5
