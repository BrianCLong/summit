from dataclasses import dataclass, field
from typing import Dict, List, Optional


@dataclass
class AgentSpec:
    id: str
    role: str
    traits: list[str]
    moral_foundations_target: Optional[dict[str, float]] = None
    emotional_climate: Optional[dict[str, float]] = None
    memory_policy: Optional[dict] = None
    tool_policy: Optional[dict] = None
    state_machine: Optional[str] = None
