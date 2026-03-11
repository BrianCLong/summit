import yaml
import os
from enum import Enum
from typing import List, Dict, Any, Optional, Tuple

class AutomationActionClass(str, Enum):
    ADD_TO_WATCHLIST = "ADD_TO_WATCHLIST"
    RAISE_INTERNAL_CASE = "RAISE_INTERNAL_CASE"
    TUNE_DETECTION_THRESHOLD = "TUNE_DETECTION_THRESHOLD"
    TAG_PERSONA_HIGH_RISK = "TAG_PERSONA_HIGH_RISK"

class SubjectType(str, Enum):
    PERSONA = "PERSONA"
    CAMPAIGN = "CAMPAIGN"
    EVIDENCE = "EVIDENCE"

class RiskLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class GovernanceTier(str, Enum):
    NONE = "NONE"
    TIER_1_COUNCIL = "TIER_1_COUNCIL"
    TIER_2_COUNCIL = "TIER_2_COUNCIL"
    EXECUTIVE_COUNCIL = "EXECUTIVE_COUNCIL"

class SafeAutomationPolicy:
    def __init__(
        self,
        action_class: AutomationActionClass,
        subject_types: List[SubjectType],
        min_risk_level: RiskLevel,
        required_governance_tier: GovernanceTier,
        constraints: Optional[Dict[str, Any]] = None
    ):
        self.action_class = action_class
        self.subject_types = subject_types
        self.min_risk_level = min_risk_level
        self.required_governance_tier = required_governance_tier
        self.constraints = constraints or {}

def risk_level_to_int(risk: RiskLevel) -> int:
    mapping = {
        RiskLevel.LOW: 1,
        RiskLevel.MEDIUM: 2,
        RiskLevel.HIGH: 3,
        RiskLevel.CRITICAL: 4,
    }
    return mapping.get(risk, 0)

def gov_tier_to_int(tier: GovernanceTier) -> int:
    mapping = {
        GovernanceTier.NONE: 0,
        GovernanceTier.TIER_1_COUNCIL: 1,
        GovernanceTier.TIER_2_COUNCIL: 2,
        GovernanceTier.EXECUTIVE_COUNCIL: 3,
    }
    return mapping.get(tier, -1)

class PolicyRegistry:
    def __init__(self, config_path: str = "config/automation_policies.yaml"):
        self.policies: Dict[AutomationActionClass, SafeAutomationPolicy] = {}
        self.load_policies(config_path)

    def load_policies(self, config_path: str):
        if not os.path.exists(config_path):
            return

        with open(config_path, "r") as f:
            data = yaml.safe_load(f)

        if not data or "policies" not in data:
            return

        for policy_data in data["policies"]:
            try:
                action_class = AutomationActionClass(policy_data["action_class"])
                subject_types = [SubjectType(st) for st in policy_data.get("subject_types", [])]
                min_risk_level = RiskLevel(policy_data.get("min_risk_level", RiskLevel.HIGH.value))
                required_governance_tier = GovernanceTier(policy_data.get("required_governance_tier", GovernanceTier.NONE.value))

                policy = SafeAutomationPolicy(
                    action_class=action_class,
                    subject_types=subject_types,
                    min_risk_level=min_risk_level,
                    required_governance_tier=required_governance_tier,
                    constraints=policy_data.get("constraints", {})
                )
                self.policies[action_class] = policy
            except ValueError as e:
                # Skip invalid policy configurations
                pass

    def is_action_eligible(
        self,
        action_class: str,
        risk_level: str,
        governance_tier: str
    ) -> Tuple[bool, str]:
        try:
            ac = AutomationActionClass(action_class)
        except ValueError:
            return False, f"Unknown action class: {action_class}"

        policy = self.policies.get(ac)
        if not policy:
            return False, f"No policy defined for action: {action_class}"

        try:
            req_risk = RiskLevel(risk_level)
        except ValueError:
            return False, f"Unknown risk level: {risk_level}"

        try:
            gov_tier = GovernanceTier(governance_tier)
        except ValueError:
            return False, f"Unknown governance tier: {governance_tier}"

        # Risk Check
        if risk_level_to_int(req_risk) < risk_level_to_int(policy.min_risk_level):
            return False, f"Risk level {risk_level} is below required {policy.min_risk_level.value}"

        # Governance Tier Check
        if gov_tier_to_int(gov_tier) < gov_tier_to_int(policy.required_governance_tier):
            return False, f"Governance tier {governance_tier} is below required {policy.required_governance_tier.value}"

        return True, "Eligible"

_default_registry = None

def get_registry(config_path: str = "config/automation_policies.yaml") -> PolicyRegistry:
    global _default_registry
    if _default_registry is None:
        _default_registry = PolicyRegistry(config_path)
    return _default_registry

def is_action_eligible(action_class: str, risk_level: str, governance_tier: str) -> Tuple[bool, str]:
    return get_registry().is_action_eligible(action_class, risk_level, governance_tier)
