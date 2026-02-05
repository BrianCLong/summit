import pytest
from summit.frontier.exec.tools import Tool, ToolRouter, ToolContext, PolicyGate

# Stub Policy Gate
class MockPolicyGate:
    def __init__(self, allow: bool = True):
        self.allow = allow
        self.last_check = None

    def check_tool_call(self, tool_name, args, context) -> bool:
        self.last_check = (tool_name, args, context)
        return self.allow

def echo_tool(msg: str) -> str:
    return f"ECHO: {msg}"

def test_tool_execution_allowed():
    router = ToolRouter(policy_gate=MockPolicyGate(allow=True))
    router.register(Tool("echo", echo_tool, "Echoes input"))

    ctx = ToolContext("user1", "sess1")
    result = router.call("echo", {"msg": "hello"}, ctx)

    assert result == "ECHO: hello"

def test_tool_execution_denied():
    router = ToolRouter(policy_gate=MockPolicyGate(allow=False))
    router.register(Tool("echo", echo_tool, "Echoes input"))

    ctx = ToolContext("user1", "sess1")

    with pytest.raises(PermissionError) as exc:
        router.call("echo", {"msg": "hello"}, ctx)

    assert "Policy denied" in str(exc.value)

def test_unknown_tool():
    router = ToolRouter()
    ctx = ToolContext("user1", "sess1")
    with pytest.raises(ValueError) as exc:
        router.call("unknown", {}, ctx)
    assert "not found" in str(exc.value)

def test_policy_context_passing():
    gate = MockPolicyGate(allow=True)
    router = ToolRouter(policy_gate=gate)
    router.register(Tool("echo", echo_tool, "Echoes input"))

    ctx = ToolContext("user_x", "sess_y")
    router.call("echo", {"msg": "hi"}, ctx)

    assert gate.last_check[2].user_id == "user_x"
