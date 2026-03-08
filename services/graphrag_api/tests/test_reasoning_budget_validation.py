import pytest
from pydantic import ValidationError

from services.graphrag_api.models.reasoning_budget import (
    ExplorationBudget,
    ReasoningBudget,
    StopCondition,
)


def test_default_values():
    budget = ReasoningBudget()
    assert budget.explore.max_hops == 3
    assert budget.explore.stop_when == StopCondition.BUDGET_EXHAUSTED
    assert budget.grade.mode == "balanced"

def test_validation_constraints():
    with pytest.raises(ValidationError):
        ExplorationBudget(max_hops=0) # Should be >= 1

    with pytest.raises(ValidationError):
        ExplorationBudget(max_nodes=-1)

def test_stop_condition_enums():
    budget = ReasoningBudget(explore=ExplorationBudget(stop_when="first_proof"))
    assert budget.explore.stop_when == StopCondition.FIRST_PROOF
