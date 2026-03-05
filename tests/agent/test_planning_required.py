import pytest

from agents.preflight.gate import PreflightRequiredError, enforce_preflight
from agents.preflight.plan_types import AgentPlan


def test_planning_required_when_feature_flag_enabled(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv('SUMMIT_AGENT_PREFLIGHT', '1')

    with pytest.raises(PreflightRequiredError, match='requires a valid plan'):
        enforce_preflight(None)


def test_planning_not_required_when_feature_flag_disabled(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv('SUMMIT_AGENT_PREFLIGHT', '0')

    assert enforce_preflight(None) is None


def test_planning_allows_valid_plan(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv('SUMMIT_AGENT_PREFLIGHT', '1')
    plan = AgentPlan(
        goal='Deliver deterministic agent preflight',
        constraints=['keep feature-flagged'],
        acceptance_criteria=['tests pass'],
        risks=[],
    )

    assert enforce_preflight(plan) == plan
