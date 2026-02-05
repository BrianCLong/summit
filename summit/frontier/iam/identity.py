from dataclasses import dataclass
from typing import List

@dataclass
class UserIdentity:
    id: str
    roles: List[str]

@dataclass
class AgentIdentity:
    id: str
    allowed_tools: List[str]
