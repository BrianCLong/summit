from typing import List, Optional
from dataclasses import dataclass, field

@dataclass
class AgentRole:
    name: str
    capabilities: List[str] = field(default_factory=list)
    system_prompt: Optional[str] = None

@dataclass
class OrchestrationSchema:
    roles: List[AgentRole] = field(default_factory=list)

    def get_role(self, name: str) -> Optional[AgentRole]:
        for role in self.roles:
            if role.name == name:
                return role
        return None
