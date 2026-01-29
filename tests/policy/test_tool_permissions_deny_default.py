import pytest
from summit.policy.tool_permissions import ToolPermissionPolicy

def test_deny_by_default():
    policy = ToolPermissionPolicy(deny_default=True)
    assert policy.check("any_tool") is False

def test_allowed_tool():
    policy = ToolPermissionPolicy(allowed_tools={"safe_tool"}, deny_default=True)
    assert policy.check("safe_tool") is True
    assert policy.check("unsafe_tool") is False
