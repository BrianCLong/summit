from typing import Any, Dict, List
from .tools import ToolRouter, ToolContext

class AgentRuntime:
    def __init__(self, router: ToolRouter):
        self.router = router

    def run_step(self, tool_name: str, args: Dict[str, Any], context: ToolContext) -> Any:
        """Execute a single step (tool call)."""
        return self.router.call(tool_name, args, context)
