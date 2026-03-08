from __future__ import annotations

from typing import Any, Dict, List

from summit.protocols.envelope import SummitEnvelope


class FinancePolicyRule:
    """
    Finance-specific policy rules.
    1. Require HITL review for sensitive data classes when tool calls are present.
    """
    def __init__(self, hitl_required_classes: list[str] = None):
        self.hitl_required_classes = hitl_required_classes or ["PII", "FINANCIAL_SENSITIVE"]

    def check(self, env: SummitEnvelope) -> list[str]:
        reasons = []

        data_class = env.security.get("classification")
        hitl_approved = env.security.get("hitl_approved", False)

        if data_class in self.hitl_required_classes and not hitl_approved:
            if env.tool_calls:
                reasons.append(f"sensitive_data_requires_hitl:{data_class}")

        return reasons
