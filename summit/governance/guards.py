from typing import Optional, Dict, Any

from summit.registry.service import RegistryService
from summit.registry.model import RiskTier

class AgentGuard:
    def __init__(self, registry_service: Optional[RegistryService] = None):
        self.registry = registry_service or RegistryService()

    def check_allowed(self, agent_id: str, context: Dict[str, Any]) -> None:
        """
        Checks if an agent is allowed to run in the current context.
        Raises PermissionError if not allowed.
        """
        agent = self.registry.get_agent(agent_id)

        if not agent:
            raise PermissionError(f"Agent {agent_id} not found in registry.")

        if agent.deprecated:
            raise PermissionError(f"Agent {agent_id} is deprecated.")

        # Risk Tier Check
        # Example: High risk agents require 'approval_token' in context
        if agent.risk_tier in [RiskTier.HIGH, RiskTier.CRITICAL]:
            if not context.get("approval_token"):
                raise PermissionError(f"Agent {agent_id} with risk tier {agent.risk_tier.value} requires 'approval_token' in context.")

        # Data Domain Check
        for domain in agent.data_domains:
             access_key = f"{domain}_access"
             if not context.get(access_key):
                 raise PermissionError(f"Agent {agent_id} requires {domain} access.")
