import pytest
from summit.agentkit.tools.policy import ToolPolicy

def test_tool_policy_deny_by_default():
    policy = ToolPolicy()
    with pytest.raises(PermissionError, match="tool not allowed: unknown_tool"):
        policy.invoke("unknown_tool", {})

def test_tool_policy_registration():
    policy = ToolPolicy()
    def echo(args):
        return args
    policy.register("echo", echo)
    assert policy.invoke("echo", {"a": 1}) == {"a": 1}

def test_tool_policy_execution_error():
    policy = ToolPolicy()
    def failing_tool(args):
        raise ValueError("failed")
    policy.register("fail", failing_tool)
    with pytest.raises(ValueError, match="failed"):
        policy.invoke("fail", {})
