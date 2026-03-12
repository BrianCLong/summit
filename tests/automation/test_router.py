import pytest
import os
import tempfile
import yaml
from src.automation.safe_policies import (
    AutomationActionClass,
    PolicyRegistry,
    RiskLevel,
    GovernanceTier,
)
from src.automation.router import (
    AutomationRouter,
    PlaybookStep,
    RiskContext,
    GovernanceContext,
    RoutingDecision
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
def registry(temp_config_path):
    return PolicyRegistry(temp_config_path)

@pytest.fixture
def router(registry):
    return AutomationRouter(registry)

def test_router_manual_only_low_risk(router):
    step = PlaybookStep(
        step_id="step1",
        action_class=AutomationActionClass.ADD_TO_WATCHLIST,
        step_type="test"
    )

    # Policy needs MEDIUM. Providing LOW makes it MANUAL_ONLY
    risk_ctx = RiskContext(level=RiskLevel.LOW)
    gov_ctx = GovernanceContext(tier=GovernanceTier.NONE)

    result = router.route_step(step, risk_ctx, gov_ctx)
    assert result.decision == RoutingDecision.MANUAL_ONLY
    assert "Risk level LOW is below required MEDIUM" in result.reason

def test_router_auto_execute_ok(router):
    step = PlaybookStep(
        step_id="step2",
        action_class=AutomationActionClass.ADD_TO_WATCHLIST,
        step_type="test"
    )

    # Policy needs MEDIUM risk and NONE governance. Providing MEDIUM and NONE.
    risk_ctx = RiskContext(level=RiskLevel.MEDIUM)
    gov_ctx = GovernanceContext(tier=GovernanceTier.NONE)

    result = router.route_step(step, risk_ctx, gov_ctx)
    assert result.decision == RoutingDecision.AUTO_EXECUTE_OK

def test_router_needs_approval_missing_approvals(router):
    step = PlaybookStep(
        step_id="step3",
        action_class=AutomationActionClass.RAISE_INTERNAL_CASE,
        step_type="test"
    )

    # Policy needs HIGH risk and TIER_1_COUNCIL. Providing those, but no explicit approval IDs.
    risk_ctx = RiskContext(level=RiskLevel.HIGH)
    gov_ctx = GovernanceContext(tier=GovernanceTier.TIER_1_COUNCIL, approvals=[])

    result = router.route_step(step, risk_ctx, gov_ctx)
    assert result.decision == RoutingDecision.NEEDS_APPROVAL
    assert "explicit approval IDs" in result.reason

def test_router_needs_approval_insufficient_tier(router):
    step = PlaybookStep(
        step_id="step4",
        action_class=AutomationActionClass.RAISE_INTERNAL_CASE,
        step_type="test"
    )

    # Policy needs HIGH risk and TIER_1_COUNCIL. Providing HIGH but NONE tier.
    risk_ctx = RiskContext(level=RiskLevel.HIGH)
    gov_ctx = GovernanceContext(tier=GovernanceTier.NONE)

    result = router.route_step(step, risk_ctx, gov_ctx)
    assert result.decision == RoutingDecision.NEEDS_APPROVAL
    assert "requires TIER_1_COUNCIL approval" in result.reason

def test_router_auto_execute_ok_with_approvals(router):
    step = PlaybookStep(
        step_id="step5",
        action_class=AutomationActionClass.RAISE_INTERNAL_CASE,
        step_type="test"
    )

    # Policy needs HIGH risk and TIER_1_COUNCIL. Providing HIGH, TIER_1_COUNCIL, and an approval ID.
    risk_ctx = RiskContext(level=RiskLevel.HIGH)
    gov_ctx = GovernanceContext(tier=GovernanceTier.TIER_1_COUNCIL, approvals=["app_123"])

    result = router.route_step(step, risk_ctx, gov_ctx)
    assert result.decision == RoutingDecision.AUTO_EXECUTE_OK

def test_router_unknown_action(router):
    # This simulates passing a valid string that isn't configured in the local yaml fixture
    step = PlaybookStep(
        step_id="step6",
        action_class=AutomationActionClass.TAG_PERSONA_HIGH_RISK,
        step_type="test"
    )

    risk_ctx = RiskContext(level=RiskLevel.HIGH)
    gov_ctx = GovernanceContext(tier=GovernanceTier.EXECUTIVE_COUNCIL)

    result = router.route_step(step, risk_ctx, gov_ctx)
    assert result.decision == RoutingDecision.MANUAL_ONLY
    assert "No policy found" in result.reason
