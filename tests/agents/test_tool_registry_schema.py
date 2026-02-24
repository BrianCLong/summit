import pytest

from summit.agents.tool_registry import AgentToolRegistry, SchemaValidationError


def test_tool_registry_validates_input_schema() -> None:
    registry = AgentToolRegistry(allowlist=["deterministic_echo"])
    registry.register_tool(
        "deterministic_echo",
        lambda payload: {"status": "ok", "echo": payload["task"]},
        input_schema={
            "type": "object",
            "required": ["task"],
            "additionalProperties": False,
            "properties": {
                "task": {"type": "string"},
            },
        },
        output_schema={
            "type": "object",
            "required": ["status", "echo"],
            "additionalProperties": False,
            "properties": {
                "status": {"type": "string", "enum": ["ok"]},
                "echo": {"type": "string"},
            },
        },
    )

    result = registry.execute_tool("deterministic_echo", {"task": "x"})
    assert result == {"status": "ok", "echo": "x"}

    with pytest.raises(SchemaValidationError):
        registry.execute_tool("deterministic_echo", {"task": 7})


def test_tool_registry_validates_output_schema() -> None:
    registry = AgentToolRegistry(allowlist=["broken"])
    registry.register_tool(
        "broken",
        lambda payload: {"status": "bad", "echo": payload["task"]},
        input_schema={
            "type": "object",
            "required": ["task"],
            "additionalProperties": False,
            "properties": {
                "task": {"type": "string"},
            },
        },
        output_schema={
            "type": "object",
            "required": ["status", "echo"],
            "additionalProperties": False,
            "properties": {
                "status": {"type": "string", "enum": ["ok"]},
                "echo": {"type": "string"},
            },
        },
    )

    with pytest.raises(SchemaValidationError):
        registry.execute_tool("broken", {"task": "x"})
