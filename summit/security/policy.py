from typing import List, Dict, Any

class SecurityPolicy:
    def __init__(self, allowed_tools: List[str]):
        self.allowed_tools = set(allowed_tools)

    def check_tool_call(self, tool_name: str) -> bool:
        return tool_name in self.allowed_tools

    def enforce(self, tool_call: Dict[str, Any]):
        tool_name = tool_call.get("name")
        if not self.check_tool_call(tool_name):
            raise SecurityViolation(f"Tool execution denied: {tool_name}")

class SecurityViolation(RuntimeError):
    pass

# Deny by default policy
DEFAULT_POLICY = SecurityPolicy(allowed_tools=[
    "read_file", "list_files", "set_plan", "request_plan_review", "run_in_bash_session"
])
