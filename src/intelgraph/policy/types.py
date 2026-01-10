from dataclasses import dataclass, field
from typing import Any, Literal

PolicyDecision = Literal["allow", "deny"]


@dataclass
class PolicyRequest:
    subject: str
    action: str
    resource: str
    context: dict[str, Any] = field(default_factory=dict)
