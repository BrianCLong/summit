from pathlib import Path

import pytest

from agents.preflight.plan_types import AgentPlan
from agents.preflight.schema import write_run_plan_artifact
from agents.preflight.validator import PlanValidationError, validate_plan


def test_plan_schema_validation_rejects_empty_goal() -> None:
    with pytest.raises(PlanValidationError, match='goal must exist'):
        validate_plan(
            AgentPlan(
                goal='   ',
                constraints=[],
                acceptance_criteria=['must pass tests'],
                risks=[],
            )
        )


def test_plan_schema_validation_writes_run_plan_artifact(tmp_path: Path) -> None:
    plan = validate_plan(
        AgentPlan(
            goal='Implement deterministic preflight',
            constraints=['feature flag default off'],
            acceptance_criteria=['run plan generated'],
            risks=['schema drift'],
        )
    )

    artifact = write_run_plan_artifact(plan, tmp_path / 'artifacts' / 'run_plan.json')

    assert artifact.exists()
    payload = artifact.read_text()
    assert 'Implement deterministic preflight' in payload
