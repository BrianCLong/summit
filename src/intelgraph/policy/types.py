from typing import Literal, Dict, Any
from dataclasses import dataclass, field

PolicyDecision = Literal["allow", "deny"]

@dataclass
class PolicyRequest:
    subject: str
    action: str
    resource: str
    context: Dict[str, Any] = field(default_factory=dict)
