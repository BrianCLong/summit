from __future__ import annotations

import json
import re
from typing import Any


def parse_value(raw: str) -> Any:
    if raw in {"true", "True"}:
        return True
    if raw in {"false", "False"}:
        return False
    if re.fullmatch(r"-?\d+", raw):
        return int(raw)
    if re.fullmatch(r"-?\d+\.\d+", raw):
        return float(raw)
    if raw.startswith("[") and raw.endswith("]"):
        inner = raw[1:-1].strip()
        if not inner:
            return []
        return [parse_value(part.strip()) for part in inner.split(",")]
    if raw.startswith('"') and raw.endswith('"'):
        return raw[1:-1]
    return raw


def load(text: str) -> dict[str, Any]:
    try:
        parsed = json.loads(text)
        if isinstance(parsed, dict):
            return parsed
    except Exception:
        pass
    root: dict[str, Any] = {}
    stack = [(0, root)]
    for line in text.splitlines():
        if not line.strip() or line.strip().startswith("#"):
            continue
        indent = len(line) - len(line.lstrip())
        while stack and indent < stack[-1][0]:
            stack.pop()
        key, _, remainder = line.strip().partition(":")
        current = stack[-1][1]
        if remainder.strip() == "":
            new_node: dict[str, Any] = {}
            current[key] = new_node
            stack.append((indent + 2, new_node))
        else:
            current[key] = parse_value(remainder.strip())
    return root
