from typing import Dict, Any, List, Optional
from .identity import AgentIdentity, UserIdentity

class AllowList:
    def __init__(self, allowed_tools: List[str]):
        self.allowed_tools = set(allowed_tools)

    def is_allowed(self, tool_name: str) -> bool:
        return tool_name in self.allowed_tools

class DenyByDefaultPolicy:
    def __init__(self, agent_identity: AgentIdentity):
        self.identity = agent_identity
        self.allow_list = AllowList(agent_identity.allowed_tools)

    def check_tool_call(self, tool_name: str, args: Dict[str, Any], context: Any) -> bool:
        """
        Deny by default: only allow if tool is explicitly in the agent's allow list.
        Context is passed for potential deeper checks (user permissions),
        but simple version checks tool allowlist.
        """
        if not self.allow_list.is_allowed(tool_name):
            return False

        # Example of deeper check: specific argument constraints could go here
        # e.g., if tool is "delete_file", check if user has admin role
        if tool_name == "delete_file":
            # Just an example logic:
            if hasattr(context, 'user_id') and context.user_id == "guest":
                return False

        return True
