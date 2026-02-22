import pytest

from summit.tools.registry import ToolRegistry
from summit.tools.shell import ShellTool


def test_tool_ordering():
    registry = ToolRegistry()

    t1 = {"type": "function", "function": {"name": "z_tool"}}
    t2 = {"type": "function", "function": {"name": "a_tool"}}

    registry.register_tool(t1)
    registry.register_tool(t2)

    sorted_tools = registry.get_tools_sorted()
    assert sorted_tools[0]["function"]["name"] == "a_tool"
    assert sorted_tools[1]["function"]["name"] == "z_tool"

def test_tool_hashing_stability():
    registry1 = ToolRegistry()
    registry1.register_tool({"type": "function", "function": {"name": "tool1", "desc": "a"}})
    registry1.register_tool({"type": "function", "function": {"name": "tool2", "desc": "b"}})

    registry2 = ToolRegistry()
    registry2.register_tool({"type": "function", "function": {"name": "tool2", "desc": "b"}})
    registry2.register_tool({"type": "function", "function": {"name": "tool1", "desc": "a"}})

    assert registry1.get_tools_hash() == registry2.get_tools_hash()

def test_shell_tool_definition():
    tool = ShellTool()
    definition = tool.get_definition()
    assert definition["function"]["name"] == "shell"

def test_shell_approval():
    tool = ShellTool()
    assert tool.requires_approval("rm -rf /") is True
    assert tool.requires_approval("ls -la") is False

    with pytest.raises(PermissionError):
        tool.execute("rm -rf /", approved=False)

    assert "STUB" in tool.execute("rm -rf /", approved=True)
