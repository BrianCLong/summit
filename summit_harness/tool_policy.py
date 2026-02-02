from dataclasses import dataclass
from typing import Set

@dataclass(frozen=True)
class ToolPolicy:
    """
    Governance policy for tool usage. Deny-by-default.
    """
    allowed: Set[str]

    def can_use(self, tool_name: str) -> bool:
        """
        Checks if a tool is allowed by the policy.
        """
        return tool_name in self.allowed

DEFAULT_DENY = ToolPolicy(allowed=set())
