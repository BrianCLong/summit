"""Fact and provenance schema helpers for OSINT hallucination mitigation."""

from __future__ import annotations

from dataclasses import dataclass, replace
from typing import Dict, List, Literal, Optional

Verdict = Literal["confirmed", "unconfirmed", "unknown", "rejected"]

REQUIRED_PROVENANCE_FIELDS = [
    "source_url",
    "source_type",
    "collected_at",
    "collector_tool",
    "verdict_confidence",
]


@dataclass(frozen=True)
class Provenance:
    source_url: str
    source_type: str
    collected_at: str
    collector_tool: str
    verdict_confidence: float
    snippet: Optional[str] = None
    evidence_id: Optional[str] = None


@dataclass(frozen=True)
class Fact:
    fact_id: str
    predicate: str
    value: str
    verdict: Verdict
    confidence: float
    provenance: List[Provenance]
    notes: Optional[str] = None
    labels: Optional[Dict[str, str]] = None


def missing_provenance_fields(fact: Fact) -> List[str]:
    if not fact.provenance:
        return ["missing_provenance"]
    missing: List[str] = []
    for prov in fact.provenance:
        for field in REQUIRED_PROVENANCE_FIELDS:
            value = getattr(prov, field, None)
            if value in (None, "", []):
                missing.append(f"provenance_missing:{field}")
    return missing


def validate_fact(fact: Fact) -> List[str]:
    errors = missing_provenance_fields(fact)
    if fact.verdict == "confirmed":
        sources = {prov.source_url for prov in fact.provenance if prov.source_url}
        if len(sources) < 2:
            errors.append("confirmed_requires_two_sources")
    return errors


def apply_provenance_policy(fact: Fact) -> Fact:
    missing = missing_provenance_fields(fact)
    if not missing:
        return fact
    notes = "; ".join(missing)
    return replace(fact, verdict="unknown", notes=notes)


def apply_two_source_policy(fact: Fact) -> Fact:
    if fact.verdict != "confirmed":
        return fact
    sources = {prov.source_url for prov in fact.provenance if prov.source_url}
    if len(sources) >= 2:
        return fact
    notes = "confirmed_requires_two_sources"
    return replace(fact, verdict="unconfirmed", notes=notes)
