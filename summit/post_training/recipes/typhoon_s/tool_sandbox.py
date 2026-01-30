from dataclasses import dataclass
from typing import Protocol, Dict, Any

class Tool(Protocol):
    name: str
    def __call__(self, inp: Dict[str, Any]) -> Dict[str, Any]: ...

@dataclass(frozen=True)
class ToolSandboxConfig:
    allow_network: bool = False  # deny-by-default
    allowed_tools: tuple[str, ...] = ("search", "read")  # minimal RAG-like tools
