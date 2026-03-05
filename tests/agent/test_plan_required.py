import pytest

from agents.preflight.questionnaire import build_run_plan


def test_plan_required_fields_are_enforced() -> None:
    with pytest.raises(ValueError):
        build_run_plan({"goal": "ship"})
