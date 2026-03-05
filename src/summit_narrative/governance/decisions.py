from dataclasses import dataclass
from typing import Any, Dict, List, Literal

Decision = Literal["allow", "deny", "modify"]


@dataclass(frozen=True)
class PolicyDecision:
    decision: Decision
    explanations: list[str]
    policy_refs: list[str]
    modified_intervention: dict[str, Any] | None = None
