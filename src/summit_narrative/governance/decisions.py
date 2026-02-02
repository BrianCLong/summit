from dataclasses import dataclass
from typing import Any, Dict, List, Literal


Decision = Literal["allow", "deny", "modify"]


@dataclass(frozen=True)
class PolicyDecision:
    decision: Decision
    explanations: List[str]
    policy_refs: List[str]
    modified_intervention: Dict[str, Any] | None = None
