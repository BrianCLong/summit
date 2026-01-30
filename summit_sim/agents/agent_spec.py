from dataclasses import dataclass, field
from typing import List, Optional, Dict

@dataclass
class AgentSpec:
    id: str
    role: str
    traits: List[str]
    moral_foundations_target: Optional[Dict[str, float]] = None
    emotional_climate: Optional[Dict[str, float]] = None
    memory_policy: Optional[Dict] = None
    tool_policy: Optional[Dict] = None
    state_machine: Optional[str] = None
