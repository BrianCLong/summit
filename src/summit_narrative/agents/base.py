from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Protocol


@dataclass(frozen=True)
class AgentMeta:
    name: str
    version: str
    capabilities: dict[str, Any]


class Agent(Protocol):
    meta: AgentMeta

    def run(self, inputs: dict[str, Any]) -> dict[str, Any]: ...
