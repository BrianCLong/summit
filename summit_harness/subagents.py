from dataclasses import dataclass, field
from typing import Any, Dict, List, Set

from .tool_policy import ToolPolicy


@dataclass(frozen=True)
class SubagentSpec:
    name: str
    system_prompt: str
    tool_allowlist: set[str] = field(default_factory=set)
    max_steps: int = 25

@dataclass
class SubagentContext:
    name: str
    state: dict[str, Any] = field(default_factory=dict)
    transcript: list[str] = field(default_factory=list)

class SubagentRegistry:
    def __init__(self) -> None:
        self._specs: dict[str, SubagentSpec] = {}

    def register(self, spec: SubagentSpec) -> None:
        self._specs[spec.name] = spec

    def get(self, name: str) -> SubagentSpec:
        if name not in self._specs:
            raise ValueError(f"Subagent '{name}' not found in registry.")
        return self._specs[name]
