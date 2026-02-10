from dataclasses import dataclass, field
from typing import Any, Dict, Callable

@dataclass
class ToolPolicy:
    allowlist: Dict[str, Callable[[Dict[str, Any]], Any]] = field(default_factory=dict)

    def register(self, name: str, fn: Callable[[Dict[str, Any]], Any]) -> None:
        self.allowlist[name] = fn

    def invoke(self, name: str, args: Dict[str, Any]) -> Any:
        if name not in self.allowlist:
            raise PermissionError(f"tool not allowed: {name}")
        return self.allowlist[name](args)
