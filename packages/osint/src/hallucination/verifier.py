"""Verifier agent for unsupported claim detection."""

from __future__ import annotations

import re
from typing import Any, Dict, Iterable, List

from .facts import Fact, missing_provenance_fields

CLAIM_PATTERN = re.compile(r"\b(?:claim|fact)\b", re.IGNORECASE)


def extract_claims(report_text: str) -> List[str]:
    sentences = re.split(r"(?<=[.!?])\s+", report_text.strip())
    claims = [sentence for sentence in sentences if CLAIM_PATTERN.search(sentence)]
    return [claim for claim in claims if claim]


def _collect_evidence_ids(facts: Iterable[Fact]) -> List[str]:
    evidence_ids: List[str] = []
    for fact in facts:
        for prov in fact.provenance:
            if prov.evidence_id:
                evidence_ids.append(prov.evidence_id)
    return evidence_ids


def verify_report(report_text: str, facts: List[Fact]) -> Dict[str, Any]:
    claims = extract_claims(report_text)
    evidence_ids = _collect_evidence_ids(facts)
    unsupported_claims: List[Dict[str, str]] = []
    for claim in claims:
        if not any(evidence_id in claim for evidence_id in evidence_ids):
            unsupported_claims.append(
                {
                    "claim": claim,
                    "reason": "missing_evidence_id",
                }
            )

    missing_provenance = [
        fact.fact_id for fact in facts if missing_provenance_fields(fact)
    ]

    needs_human_review = bool(unsupported_claims or missing_provenance)
    return {
        "needs_human_review": needs_human_review,
        "unsupported_claims": unsupported_claims,
        "missing_provenance_facts": missing_provenance,
        "summary": {
            "facts_total": len(facts),
            "facts_missing_provenance": len(missing_provenance),
            "unsupported_claims_total": len(unsupported_claims),
        },
    }
