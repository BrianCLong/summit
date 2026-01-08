from typing import Any

from pydantic import BaseModel

from .schemas import Candidate


class OversightDecision(BaseModel):
    action: str  # "APPROVE", "REJECT", "ESCALATE"
    score: float
    reason: str
    tags: list[str]


class Policy:
    def evaluate(
        self, prompt: str, candidate: Candidate, telemetry: dict[str, Any]
    ) -> OversightDecision:
        raise NotImplementedError


class AutoJudge(Policy):
    def evaluate(
        self, prompt: str, candidate: Candidate, telemetry: dict[str, Any]
    ) -> OversightDecision:
        # Heuristic checks
        text = candidate.text.lower()
        if "danger" in text or "kill" in text:
            return OversightDecision(
                action="REJECT",
                score=0.1,
                reason="Detected unsafe keywords",
                tags=["safety_violation"],
            )

        # Tool usage check (mock)
        if candidate.tool_traces:
            for trace in candidate.tool_traces:
                if trace.get("error"):
                    return OversightDecision(
                        action="REJECT",
                        score=0.4,
                        reason="Tool execution failure",
                        tags=["tool_failure"],
                    )

        # Telemetry aware check
        if telemetry.get("high_risk_flag"):
            return OversightDecision(
                action="ESCALATE",
                score=0.5,
                reason="High risk telemetry flag active",
                tags=["telemetry_escalation"],
            )

        return OversightDecision(
            action="APPROVE", score=0.9, reason="Passed heuristic checks", tags=["safe"]
        )


class OversightOrchestrator:
    def __init__(self, policies: list[Policy] = None):
        self.policies = policies or [AutoJudge()]

    def decide(
        self, prompt: str, candidate: Candidate, telemetry: dict[str, Any] | None = None
    ) -> OversightDecision:
        telemetry = telemetry or {}

        final_decision = OversightDecision(action="APPROVE", score=1.0, reason="Default", tags=[])

        for policy in self.policies:
            decision = policy.evaluate(prompt, candidate, telemetry)

            # Simple logic: Reject takes precedence, then Escalate
            if decision.action == "REJECT":
                return decision
            if decision.action == "ESCALATE":
                final_decision = decision
            if decision.action == "APPROVE" and final_decision.action == "APPROVE":
                # Keep the lowest score approval? Or just last?
                final_decision = decision

        return final_decision
