from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from ai_front_door.evidence import build_report
from ai_front_door.policy_engine import PolicyDecision, PolicyEngine


@dataclass(frozen=True)
class GatewayResult:
    decision: PolicyDecision
    report: dict[str, str]


class AIGateway:
    def __init__(self, policy_engine: PolicyEngine) -> None:
        self.policy_engine = policy_engine

    def handle(self, request: dict[str, Any], evidence_id: str) -> GatewayResult:
        decision = self.policy_engine.evaluate(request, evidence_id)
        report = build_report(
            decision=decision.decision,
            evidence_id=decision.evidence_id,
            request_text=str(request.get('text', '')),
            rule_id=decision.rule_id,
        )
        return GatewayResult(decision=decision, report=report)
