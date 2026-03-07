from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass, field
from typing import Any

EVIDENCE_ID_PATTERN = re.compile(r"^EVID-AFD-[0-9]{8}-[0-9]{4}$")


@dataclass(frozen=True)
class PolicyDecision:
    decision: str
    evidence_id: str
    rule_id: str
    reasons: list[str] = field(default_factory=list)


class AIFrontDoorPolicyEngine:
    """Deterministic policy evaluation for regulated AI request handling."""

    def __init__(self, policy: dict[str, Any]):
        self._policy = policy
        self._allow_domains = tuple(sorted(policy.get("allow_domains", [])))
        self._deny_patterns = tuple(sorted(policy.get("deny_patterns", [])))
        self._redact_patterns = tuple(sorted(policy.get("redact_patterns", [])))
        self._default_decision = str(policy.get("default_decision", "deny")).lower()

    def evaluate(self, request: dict[str, Any]) -> PolicyDecision:
        text = str(request.get("text", ""))
        domain = str(request.get("domain", "unknown"))
        request_hash = _request_hash(text)

        if any(p.lower() in text.lower() for p in self._deny_patterns):
            return PolicyDecision(
                decision="deny",
                evidence_id=_evidence_id_from_hash(request_hash),
                rule_id="AFD-DENY-PATTERN",
                reasons=["matched_deny_pattern"],
            )

        if any(p.lower() in text.lower() for p in self._redact_patterns):
            return PolicyDecision(
                decision="redact",
                evidence_id=_evidence_id_from_hash(request_hash),
                rule_id="AFD-REDACT-PATTERN",
                reasons=["matched_redact_pattern"],
            )

        if domain not in self._allow_domains:
            return PolicyDecision(
                decision=self._default_decision,
                evidence_id=_evidence_id_from_hash(request_hash),
                rule_id="AFD-DOMAIN-GATE",
                reasons=[f"domain_not_allowed:{domain}"],
            )

        return PolicyDecision(
            decision="allow",
            evidence_id=_evidence_id_from_hash(request_hash),
            rule_id="AFD-ALLOW",
            reasons=["domain_allowed"],
        )


def validate_evidence_id(evidence_id: str) -> bool:
    return bool(EVIDENCE_ID_PATTERN.match(evidence_id))


def _request_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _evidence_id_from_hash(request_hash: str) -> str:
    digits = "".join(str(int(c, 16) % 10) for c in request_hash[:12])
    date_part = f"{digits[:8]}"
    seq_part = f"{digits[8:12]}"
    return f"EVID-AFD-{date_part}-{seq_part}"
