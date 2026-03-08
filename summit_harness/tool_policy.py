from dataclasses import dataclass
from typing import Set


@dataclass(frozen=True)
class ToolPolicy:
    allowed: set[str]

    def can_use(self, tool_name: str) -> bool:
        return tool_name in self.allowed

DEFAULT_DENY = ToolPolicy(allowed=set())
