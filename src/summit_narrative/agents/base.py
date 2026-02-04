from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Protocol


@dataclass(frozen=True)
class AgentMeta:
    name: str
    version: str
    capabilities: Dict[str, Any]


class Agent(Protocol):
    meta: AgentMeta

    def run(self, inputs: Dict[str, Any]) -> Dict[str, Any]: ...
