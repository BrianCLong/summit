from __future__ import annotations

from copy import deepcopy
from typing import Any


def _sort_value(value: Any) -> Any:
    if isinstance(value, dict):
        return {key: _sort_value(value[key]) for key in sorted(value)}
    if isinstance(value, list):
        if all(isinstance(item, str) for item in value):
            return sorted(value)
        return [_sort_value(item) for item in value]
    return value


def normalize_tool(tool: dict[str, Any]) -> dict[str, Any]:
    data = deepcopy(tool)
    for key in ("categories", "capabilities", "limitations", "inputs", "outputs"):
        if key in data and isinstance(data[key], list):
            data[key] = sorted(data[key])
    return _sort_value(data)


def normalize_registry(tools: list[dict[str, Any]]) -> list[dict[str, Any]]:
    normalized = [normalize_tool(tool) for tool in tools]
    return sorted(normalized, key=lambda item: item["tool_id"])
