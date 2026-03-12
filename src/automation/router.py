from enum import Enum
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

from src.automation.safe_policies import (
    AutomationActionClass,
    SubjectType,
    RiskLevel,
    GovernanceTier,
    get_registry,
    gov_tier_to_int
)

class RoutingDecision(str, Enum):
    MANUAL_ONLY = "MANUAL_ONLY"
    NEEDS_APPROVAL = "NEEDS_APPROVAL"
    AUTO_EXECUTE_OK = "AUTO_EXECUTE_OK"

class PlaybookStep(BaseModel):
    step_id: str
    action_class: AutomationActionClass
    step_type: str

class RiskContext(BaseModel):
    level: RiskLevel
    factors: List[str] = Field(default_factory=list)

class GovernanceContext(BaseModel):
    tier: GovernanceTier
    approvals: List[str] = Field(default_factory=list)

class RouterResult(BaseModel):
    decision: RoutingDecision
    reason: str

class AutomationRouter:
    def __init__(self, registry=None):
        self.registry = registry or get_registry()

    def route_step(
        self,
        step: PlaybookStep,
        risk_ctx: RiskContext,
        governance_ctx: GovernanceContext
    ) -> RouterResult:
        """
        Takes a playbook step, risk context, and governance context and decides
        if the action can be auto-executed, needs approval, or must remain manual.
        """
        action = step.action_class
        policy = self.registry.policies.get(action)

        # If there's no explicit policy, it must be manual only
        if not policy:
            return RouterResult(
                decision=RoutingDecision.MANUAL_ONLY,
                reason=f"No policy found for action {action.value}"
            )

        # Check basic eligibility (risk and governance tiers)
        is_eligible, reason = self.registry.is_action_eligible(
            action_class=action.value,
            risk_level=risk_ctx.level.value,
            governance_tier=governance_ctx.tier.value
        )

        if not is_eligible:
            # If the reason it's not eligible is solely due to lacking a governance tier,
            # but the risk level is sufficient, we mark it as NEEDS_APPROVAL.
            # Let's re-run is_eligible but assuming max governance, to see if it's purely a gov block.
            is_risk_eligible, _ = self.registry.is_action_eligible(
                action_class=action.value,
                risk_level=risk_ctx.level.value,
                governance_tier=GovernanceTier.EXECUTIVE_COUNCIL.value
            )

            if is_risk_eligible:
                return RouterResult(
                    decision=RoutingDecision.NEEDS_APPROVAL,
                    reason=f"Action eligible by risk, but requires {policy.required_governance_tier.value} approval. Current tier: {governance_ctx.tier.value}"
                )

            return RouterResult(
                decision=RoutingDecision.MANUAL_ONLY,
                reason=reason
            )

        # If it requires a council approval, verify we have explicit approval IDs
        # (simulating real-world checks against an ApprovalRequest/CouncilDecision store)
        if policy.required_governance_tier != GovernanceTier.NONE:
            if not governance_ctx.approvals:
                 return RouterResult(
                    decision=RoutingDecision.NEEDS_APPROVAL,
                    reason=f"Policy requires explicit approval IDs from {policy.required_governance_tier.value}"
                )

        return RouterResult(
            decision=RoutingDecision.AUTO_EXECUTE_OK,
            reason="Action meets all risk and governance requirements for automation"
        )

_default_router = None

def route_step(step: PlaybookStep, risk_ctx: RiskContext, governance_ctx: GovernanceContext) -> RouterResult:
    global _default_router
    if _default_router is None:
        _default_router = AutomationRouter()
    return _default_router.route_step(step, risk_ctx, governance_ctx)
