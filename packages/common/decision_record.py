import hashlib
import json
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class DecisionRecord:
    decision_id: str
    context: str
    outcome: str
    top_factors: list[str]
    policy_checks: list[str]
    model_version: Optional[str] = None
    human_readable_summary: str = ""
    timestamp: Optional[str] = None # Optional, only populated if needed for non-deterministic debugging

    @staticmethod
    def create(context: str, outcome: str, factors: list[str], policies: list[str], model: str = "baseline") -> 'DecisionRecord':
        # Deterministic ID based on content
        content = f"{context}:{outcome}:{model}:{sorted(factors)}"
        did = hashlib.sha256(content.encode("utf-8")).hexdigest()[:16]
        return DecisionRecord(
            decision_id=did,
            context=context,
            outcome=outcome,
            top_factors=factors,
            policy_checks=policies,
            model_version=model,
            human_readable_summary=f"Decided {outcome} based on {', '.join(factors)}"
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "decision_id": self.decision_id,
            "context": self.context,
            "outcome": self.outcome,
            "top_factors": self.top_factors,
            "policy_checks": self.policy_checks,
            "model_version": self.model_version,
            "summary": self.human_readable_summary
        }
