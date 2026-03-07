"""Verifier agent for unsupported claim detection."""

from __future__ import annotations

import re
from typing import Any, Dict, Iterable, List

from .facts import Fact, missing_provenance_fields

CLAIM_PATTERN = re.compile(r"\b(?:claim|fact)\b", re.IGNORECASE)
EVIDENCE_ID_PATTERN = re.compile(r"\bEVID:[A-Za-z0-9_-]+:[a-f0-9]{64}:[a-f0-9]{64}\b")
GAP_PREFIXES = ("unknown", "unanswered", "open question", "gap")


def _is_gap_statement(sentence: str) -> bool:
    normalized = sentence.strip().lower()
    return any(normalized.startswith(prefix) for prefix in GAP_PREFIXES)


def _is_claim_candidate(sentence: str) -> bool:
    if CLAIM_PATTERN.search(sentence):
        return True
    if re.search(r"\b\d{1,4}\b", sentence):
        return True
    if re.search(r"\b[A-Z][a-z]+\b", sentence):
        return True
    return False


def extract_claims(report_text: str) -> List[str]:
    sentences = re.split(r"(?<=[.!?])\s+", report_text.strip())
    claims = [
        sentence
        for sentence in sentences
        if sentence and not _is_gap_statement(sentence) and _is_claim_candidate(sentence)
    ]
    return claims


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
        has_evidence_id = bool(EVIDENCE_ID_PATTERN.search(claim))
        if not has_evidence_id and not any(evidence_id in claim for evidence_id in evidence_ids):
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
