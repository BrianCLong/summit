from typing import Set, Optional

class ToolPermissionPolicy:
    """
    Enforces tool execution permissions.
    Default behavior is deny-by-default.
    """
    def __init__(self, allowed_tools: Optional[Set[str]] = None, deny_default: bool = True):
        self.allowed_tools = allowed_tools or set()
        self.deny_default = deny_default

    def check(self, tool_name: str) -> bool:
        """
        Check if a tool is allowed to run.
        """
        if tool_name in self.allowed_tools:
            return True
        if self.deny_default:
            return False
        return True
