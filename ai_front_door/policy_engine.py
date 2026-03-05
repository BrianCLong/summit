from __future__ import annotations

from dataclasses import dataclass
from hashlib import sha256
from typing import Any


@dataclass(frozen=True)
class PolicyDecision:
    decision: str
    evidence_id: str
    rule_id: str


class PolicyEngine:
    """Deterministic, deny-by-default policy evaluator for AI gateway requests."""

    def __init__(self, allow_rules: list[dict[str, Any]] | None = None) -> None:
        self.allow_rules = allow_rules or []

    def evaluate(self, request: dict[str, Any], evidence_id: str) -> PolicyDecision:
        normalized = self._normalize_request(request)

        for rule in self.allow_rules:
            if self._matches(rule, normalized):
                return PolicyDecision(
                    decision='ALLOW',
                    evidence_id=evidence_id,
                    rule_id=rule.get('id', 'RULE-ALLOW-UNKNOWN'),
                )

        return PolicyDecision(
            decision='DENY',
            evidence_id=evidence_id,
            rule_id='RULE-DENY-DEFAULT',
        )

    @staticmethod
    def _normalize_request(request: dict[str, Any]) -> dict[str, str]:
        actor = str(request.get('actor', '')).strip().lower()
        intent = str(request.get('intent', '')).strip().lower()
        text = str(request.get('text', '')).strip().lower()
        request_hash = sha256(text.encode('utf-8')).hexdigest()
        return {
            'actor': actor,
            'intent': intent,
            'text_hash': request_hash,
        }

    @staticmethod
    def _matches(rule: dict[str, Any], request: dict[str, str]) -> bool:
        actor = str(rule.get('actor', '')).strip().lower()
        intent = str(rule.get('intent', '')).strip().lower()
        return actor == request['actor'] and intent == request['intent']
