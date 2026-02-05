from abc import ABC, abstractmethod
from typing import Any, Callable, Dict, Optional, Protocol

class PolicyGate(Protocol):
    def check_tool_call(self, tool_name: str, args: Dict[str, Any], context: Any) -> bool:
        """Return True if allowed, False otherwise."""
        ...

class ToolContext:
    def __init__(self, user_id: str, session_id: str):
        self.user_id = user_id
        self.session_id = session_id

class Tool:
    def __init__(self, name: str, func: Callable, description: str):
        self.name = name
        self.func = func
        self.description = description

    def execute(self, args: Dict[str, Any]) -> Any:
        return self.func(**args)

class ToolRouter:
    def __init__(self, policy_gate: Optional[PolicyGate] = None):
        self.tools: Dict[str, Tool] = {}
        self.policy_gate = policy_gate

    def register(self, tool: Tool):
        self.tools[tool.name] = tool

    def call(self, tool_name: str, args: Dict[str, Any], context: ToolContext) -> Any:
        if tool_name not in self.tools:
            raise ValueError(f"Tool {tool_name} not found")

        # Policy Check
        if self.policy_gate:
            if not self.policy_gate.check_tool_call(tool_name, args, context):
                raise PermissionError(f"Policy denied usage of tool: {tool_name}")

        return self.tools[tool_name].execute(args)
