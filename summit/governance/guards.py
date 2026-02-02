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
        # Example: If agent touches 'financial' domain, context must specify 'finance' tenant or scope
        if "financial" in agent.data_domains:
             # Simplified check for demonstration
             # For now, let's say we check if 'financial_access' is granted in context
             if not context.get("financial_access"):
                 raise PermissionError(f"Agent {agent_id} requires financial access.")
