from dataclasses import dataclass, field
from typing import Dict, List, Set, Any
from .tool_policy import ToolPolicy

@dataclass(frozen=True)
class SubagentSpec:
    """
    Specification for a specialized subagent.
    """
    name: str
    system_prompt: str
    tool_allowlist: Set[str] = field(default_factory=set)
    max_steps: int = 25

@dataclass
class SubagentContext:
    """
    Isolated context for a subagent execution.
    """
    name: str
    state: Dict[str, Any] = field(default_factory=dict)
    transcript: List[str] = field(default_factory=list)

class SubagentRegistry:
    """
    Registry for managing available subagent specifications.
    """
    def __init__(self) -> None:
        self._specs: Dict[str, SubagentSpec] = {}

    def register(self, spec: SubagentSpec) -> None:
        self._specs[spec.name] = spec

    def get(self, name: str) -> SubagentSpec:
        if name not in self._specs:
            raise ValueError(f"Subagent '{name}' not found in registry")
        return self._specs[name]

    def list_agents(self) -> List[str]:
        return list(self._specs.keys())
