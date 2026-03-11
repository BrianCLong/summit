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

@pytest.fixture
def temp_config_path():
    config = {
        "policies": [
            {
                "action_class": "ADD_TO_WATCHLIST",
                "subject_types": ["PERSONA", "CAMPAIGN"],
                "min_risk_level": "MEDIUM",
                "required_governance_tier": "NONE",
                "constraints": {"internal_only": True}
            },
            {
                "action_class": "RAISE_INTERNAL_CASE",
                "subject_types": ["EVIDENCE"],
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

def test_load_policies(temp_config_path):
    registry = PolicyRegistry(temp_config_path)

    assert AutomationActionClass.ADD_TO_WATCHLIST in registry.policies
    policy = registry.policies[AutomationActionClass.ADD_TO_WATCHLIST]

    assert policy.min_risk_level == RiskLevel.MEDIUM
    assert policy.required_governance_tier == GovernanceTier.NONE
    assert SubjectType.PERSONA in policy.subject_types
    assert policy.constraints.get("internal_only") is True

def test_is_action_eligible(temp_config_path):
    registry = PolicyRegistry(temp_config_path)

    # ADD_TO_WATCHLIST needs MEDIUM risk, NONE governance

    # Should be eligible (meets exact requirements)
    eligible, reason = registry.is_action_eligible("ADD_TO_WATCHLIST", "MEDIUM", "NONE")
    assert eligible is True

    # Should be eligible (exceeds requirements)
    eligible, reason = registry.is_action_eligible("ADD_TO_WATCHLIST", "HIGH", "TIER_1_COUNCIL")
    assert eligible is True

    # Should not be eligible (risk too low)
    eligible, reason = registry.is_action_eligible("ADD_TO_WATCHLIST", "LOW", "NONE")
    assert eligible is False
    assert "Risk level" in reason

    # RAISE_INTERNAL_CASE needs HIGH risk, TIER_1_COUNCIL

    # Should be eligible (meets exact requirements)
    eligible, reason = registry.is_action_eligible("RAISE_INTERNAL_CASE", "HIGH", "TIER_1_COUNCIL")
    assert eligible is True

    # Should not be eligible (governance too low)
    eligible, reason = registry.is_action_eligible("RAISE_INTERNAL_CASE", "HIGH", "NONE")
    assert eligible is False
    assert "Governance tier" in reason

def test_is_action_eligible_invalid_inputs(temp_config_path):
    registry = PolicyRegistry(temp_config_path)

    eligible, reason = registry.is_action_eligible("UNKNOWN_ACTION", "MEDIUM", "NONE")
    assert eligible is False
    assert "Unknown action class" in reason

    eligible, reason = registry.is_action_eligible("ADD_TO_WATCHLIST", "SUPER_HIGH", "NONE")
    assert eligible is False
    assert "Unknown risk level" in reason

    eligible, reason = registry.is_action_eligible("ADD_TO_WATCHLIST", "MEDIUM", "UNKNOWN_TIER")
    assert eligible is False
    assert "Unknown governance tier" in reason
