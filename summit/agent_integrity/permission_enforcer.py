from typing import Any, Dict


class PermissionEnforcer:
    def __init__(self, policy_path: str = "policies/agent_execution.yaml"):
        self.policy_path = policy_path
        # In a real system, we'd load the YAML and parse the policy.
        # For the minimal slice, we simply assume loading is successful.

    def enforce(self, action: dict[str, Any], context: dict[str, Any]) -> bool:
        """
        Enforce permission policy for a given action and context.
        """
        # Minimal mock: requires a valid 'agent_id' and 'action_type'
        if not action.get("agent_id") or not action.get("action_type"):
            return False

        # Minimal mock policy rule: context must have clearance
        if not context.get("clearance"):
            return False

        return True
