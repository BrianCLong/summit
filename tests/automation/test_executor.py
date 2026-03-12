import pytest
import os
import tempfile
import yaml
from src.automation.safe_policies import (
    AutomationActionClass,
    PolicyRegistry,
    RiskLevel,
    GovernanceTier,
    SubjectType
)
from src.automation.router import (
    AutomationRouter,
    PlaybookStep,
    RiskContext,
    GovernanceContext,
)
from src.automation.executor import (
    SAFEExecutor,
    AutomationExecutionLog,
    ExecutionLogEntry,
)

@pytest.fixture
def temp_config_path():
    config = {
        "policies": [
            {
                "action_class": "ADD_TO_WATCHLIST",
                "subject_types": ["PERSONA"],
                "min_risk_level": "MEDIUM",
                "required_governance_tier": "NONE",
            },
            {
                "action_class": "RAISE_INTERNAL_CASE",
                "subject_types": ["CAMPAIGN"],
                "min_risk_level": "HIGH",
                "required_governance_tier": "TIER_1_COUNCIL"
            }
        ]
    }

    fd, path = tempfile.mkstemp(suffix=".yaml")
    with os.fdopen(fd, 'w') as f:
        yaml.dump(config, f)

    yield path
    os.remove(path)

@pytest.fixture
def log_file():
    fd, path = tempfile.mkstemp(suffix=".jsonl")
    os.close(fd)
    yield path
    if os.path.exists(path):
        os.remove(path)

@pytest.fixture
def registry(temp_config_path):
    return PolicyRegistry(temp_config_path)

@pytest.fixture
def router(registry):
    return AutomationRouter(registry)

@pytest.fixture
def exec_log(log_file):
    return AutomationExecutionLog(log_file)

@pytest.fixture
def executor(router, exec_log):
    return SAFEExecutor(router, exec_log)

def test_executor_manual_only(executor, exec_log):
    step = PlaybookStep(
        step_id="step1",
        action_class=AutomationActionClass.ADD_TO_WATCHLIST,
        step_type="test"
    )

    risk_ctx = RiskContext(level=RiskLevel.LOW)
    gov_ctx = GovernanceContext(tier=GovernanceTier.NONE)

    res = executor.execute_if_allowed(
        step=step,
        subject_type=SubjectType.PERSONA,
        subject_id="p123",
        risk_ctx=risk_ctx,
        governance_ctx=gov_ctx
    )

    assert res.executed is False
    assert res.status == "MANUAL_ONLY"

    entries = exec_log.query()
    assert len(entries) == 1
    assert entries[0].result == "MANUAL_REQUIRED"
    assert "Risk level LOW is below required MEDIUM" in entries[0].error_message

def test_executor_needs_approval(executor, exec_log):
    step = PlaybookStep(
        step_id="step2",
        action_class=AutomationActionClass.RAISE_INTERNAL_CASE,
        step_type="test"
    )

    risk_ctx = RiskContext(level=RiskLevel.HIGH)
    gov_ctx = GovernanceContext(tier=GovernanceTier.NONE)

    res = executor.execute_if_allowed(
        step=step,
        subject_type=SubjectType.CAMPAIGN,
        subject_id="c123",
        risk_ctx=risk_ctx,
        governance_ctx=gov_ctx
    )

    assert res.executed is False
    assert res.status == "NEEDS_APPROVAL"

    entries = exec_log.query()
    assert len(entries) == 1
    assert entries[0].result == "APPROVAL_REQUIRED"

def test_executor_success(executor, exec_log):
    step = PlaybookStep(
        step_id="step3",
        action_class=AutomationActionClass.RAISE_INTERNAL_CASE,
        step_type="test"
    )

    risk_ctx = RiskContext(level=RiskLevel.HIGH)
    gov_ctx = GovernanceContext(tier=GovernanceTier.TIER_1_COUNCIL, approvals=["app_99"])

    res = executor.execute_if_allowed(
        step=step,
        subject_type=SubjectType.CAMPAIGN,
        subject_id="c123",
        risk_ctx=risk_ctx,
        governance_ctx=gov_ctx
    )

    assert res.executed is True
    assert res.status == "SUCCESS"

    entries = exec_log.query()
    assert len(entries) == 1
    assert entries[0].result == "SUCCESS"
    assert entries[0].action_class == "RAISE_INTERNAL_CASE"
