from dataclasses import dataclass
from typing import Any, Dict, Protocol


class Tool(Protocol):
    name: str
    def __call__(self, inp: dict[str, Any]) -> dict[str, Any]: ...

@dataclass(frozen=True)
class ToolSandboxConfig:
    allow_network: bool = False  # deny-by-default
    allowed_tools: tuple[str, ...] = ("search", "read")  # minimal RAG-like tools
