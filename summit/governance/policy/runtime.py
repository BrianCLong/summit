from summit.governance.events.schema import PolicyDecision
from summit.governance.risk.classifier import RiskClassifier

class PolicyRuntime:
    def __init__(self, classifier: RiskClassifier):
        self.classifier = classifier

    def evaluate_action(self, agent_metadata: dict, action_type: str, resource: str) -> PolicyDecision:
        tier = self.classifier.classify(agent_metadata)
        controls = self.classifier.get_controls(tier)

        # Check approval
        if controls.get("requires_approval", False):
            # In a real system, we'd check if approval exists in the context.
            # Here, we just return "needs_approval" if it's required.
            return PolicyDecision(
                decision="needs_approval",
                policy_name="risk_tier_approval",
                reason=f"Tier '{tier}' requires approval for actions."
            )

        # Check allowed side effects (simplified)
        allowed_effects = controls.get("allowed_side_effects", [])
        if action_type not in allowed_effects:
             return PolicyDecision(
                decision="deny",
                policy_name="allowed_side_effects",
                reason=f"Action '{action_type}' not allowed in tier '{tier}'."
            )

        return PolicyDecision(
            decision="allow",
            policy_name="risk_tier_default"
        )
