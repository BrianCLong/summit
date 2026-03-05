import json
from pathlib import Path
from typing import Any, Dict, List


class GovernanceGate:
    def __init__(self, policy_path: str = None):
        if policy_path is None:
            policy_path = str(Path(__file__).parent / "policy.default.json")
        with open(policy_path) as f:
            self.policy = json.load(f)

    def is_allowed(self, action: str, connector: str = None) -> bool:
        # Outbound specifically checked
        if action == "outbound":
            return self.policy.get("allow_outbound", False)

        # Connector check
        if connector and connector not in self.policy.get("allowed_connectors", []):
            return False

        # Action check
        if action in self.policy.get("allowed_actions", []):
            return True

        return False # Deny by default
