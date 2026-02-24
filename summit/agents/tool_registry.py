from __future__ import annotations

from collections.abc import Callable
from typing import Any

from .schema import SchemaValidationError, validate_schema

ToolHandler = Callable[[dict[str, Any]], dict[str, Any]]


class AgentToolRegistry:
    """Deterministic, deny-by-default registry for agent tools."""

    def __init__(self, allowlist: list[str] | None = None):
        self._allowlist = set(allowlist or [])
        self._handlers: dict[str, ToolHandler] = {}
        self._schemas: dict[str, dict[str, dict[str, Any] | None]] = {}

    def register_tool(
        self,
        name: str,
        handler: ToolHandler,
        *,
        input_schema: dict[str, Any] | None = None,
        output_schema: dict[str, Any] | None = None,
    ) -> None:
        if not name:
            raise ValueError("Tool name is required.")
        self._handlers[name] = handler
        self._schemas[name] = {
            "input": input_schema,
            "output": output_schema,
        }

    def list_allowed(self) -> list[str]:
        return sorted(name for name in self._handlers if name in self._allowlist)

    def select_tool(self, task: str) -> str:
        # PR1 behavior: deterministic single-tool selection.
        del task
        allowed = self.list_allowed()
        if not allowed:
            raise PermissionError("No allowlisted tools are registered.")
        return allowed[0]

    def execute_tool(self, name: str, payload: dict[str, Any]) -> dict[str, Any]:
        if name not in self._allowlist:
            raise PermissionError(f"Tool '{name}' is not in the allowlist.")
        handler = self._handlers.get(name)
        if handler is None:
            raise KeyError(f"Tool '{name}' is not registered.")

        schemas = self._schemas.get(name, {})
        input_schema = schemas.get("input")
        if input_schema is not None:
            validate_schema(payload, input_schema, context=f"tools.{name}.input")

        result = handler(payload)
        if not isinstance(result, dict):
            raise TypeError("Tool handler must return a dictionary result.")

        output_schema = schemas.get("output")
        if output_schema is not None:
            validate_schema(result, output_schema, context=f"tools.{name}.output")

        return result


__all__ = ["AgentToolRegistry", "SchemaValidationError"]
