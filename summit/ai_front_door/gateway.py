from __future__ import annotations

import hashlib
from typing import Any, Callable

from .evidence import EvidenceBundle, build_evidence_bundle
from .policy_engine import AIFrontDoorPolicyEngine, PolicyDecision


class AIFrontDoorGateway:
    """Policy-enforced front door for model invocation in regulated contexts."""

    def __init__(self, policy_engine: AIFrontDoorPolicyEngine):
        self._policy_engine = policy_engine

    def handle(
        self,
        request: dict[str, Any],
        model_invoke: Callable[[dict[str, Any]], dict[str, Any]] | None = None,
    ) -> tuple[PolicyDecision, dict[str, Any], EvidenceBundle]:
        decision = self._policy_engine.evaluate(request)
        request_hash = hashlib.sha256(str(request.get("text", "")).encode("utf-8")).hexdigest()
        evidence = build_evidence_bundle(decision, request_hash=request_hash)

        if decision.decision == "deny":
            return decision, {"status": "blocked", "evidence_id": decision.evidence_id}, evidence

        invoke = model_invoke or _default_model_invoke
        response = invoke(request)
        response["evidence_id"] = decision.evidence_id
        response["decision"] = decision.decision
        return decision, response, evidence


def _default_model_invoke(request: dict[str, Any]) -> dict[str, Any]:
    return {
        "status": "ok",
        "output": f"processed:{request.get('text', '')}",
    }
