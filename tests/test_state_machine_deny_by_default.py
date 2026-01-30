import pytest

from summit_sim.tools.interfaces import EchoTool
from summit_sim.tools.registry import ToolRegistry


def test_deny_by_default():
    registry = ToolRegistry()
    tool = EchoTool()
    registry.register(tool)

    # Not allowed yet
    with pytest.raises(PermissionError):
        registry.get_tool("echo")

    # Allow it
    registry.set_allowlist(["echo"])
    retrieved = registry.get_tool("echo")
    assert retrieved.name == "echo"
    assert retrieved.execute({"message": "hello"}) == "hello"

def test_allowlist_filtering():
    registry = ToolRegistry()
    registry.register(EchoTool())

    assert registry.list_tools() == []

    registry.set_allowlist(["echo"])
    assert registry.list_tools() == ["echo"]
