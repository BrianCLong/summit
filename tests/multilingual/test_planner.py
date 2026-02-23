import pytest

from summit.planning.multilingual.baseline import BaselinePlanner
from summit.planning.multilingual.planner import (
    MultilingualScalingPlanner,
    PlanRequest,
    PlanResponse,
)


def test_planner_interface_raises():
    planner = MultilingualScalingPlanner()
    req = PlanRequest(
        target_language="en",
        training_languages=["en", "fr"],
        token_budget=1000
    )
    with pytest.raises(NotImplementedError):
        planner.plan(req)

def test_baseline_planner_identity():
    planner = BaselinePlanner()
    req = PlanRequest(
        target_language="es",
        training_languages=["en", "es"],
        token_budget=1000000,
        model_size_params=500000
    )
    resp = planner.plan(req)

    assert isinstance(resp, PlanResponse)
    assert resp.recommended_model_params == 500000
    assert resp.recommended_total_tokens == 1000000
    assert resp.recommended_helpers == []
    assert resp.rationale["status"] == "identity"
    assert "BaselinePlanner" in resp.provenance["planner"]
    assert resp.confidence == 0.5
    assert len(resp.assumptions) > 0

def test_baseline_planner_no_model_size():
    planner = BaselinePlanner()
    req = PlanRequest(
        target_language="es",
        training_languages=["en"],
        token_budget=100
    )
    resp = planner.plan(req)
    assert resp.recommended_model_params == 0
