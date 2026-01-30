from typing import Dict, List, Optional
from summit_sim.agents.tools import Tool, ToolRegistryInterface

class ToolRegistry(ToolRegistryInterface):
    def __init__(self):
        self._tools: Dict[str, Tool] = {}
        self._allowlist: List[str] = []

    def register(self, tool: Tool):
        self._tools[tool.name] = tool

    def set_allowlist(self, allowed_tool_names: List[str]):
        self._allowlist = allowed_tool_names

    def get_tool(self, name: str) -> Optional[Tool]:
        if name not in self._allowlist:
            raise PermissionError(f"Tool '{name}' is not in the allowlist.")
        return self._tools.get(name)

    def list_tools(self) -> List[str]:
        return [name for name in self._tools if name in self._allowlist]
