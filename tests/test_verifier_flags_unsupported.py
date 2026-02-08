"""Tests for verifier unsupported claim detection."""

import pathlib
import sys

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / "packages" / "osint" / "src"))

from hallucination.facts import Fact, Provenance
from hallucination.verifier import verify_report


def test_verifier_flags_unsupported() -> None:
    provenance = Provenance(
        source_url="https://example.com/post",
        source_type="web",
        collected_at="2025-01-01T00:00:00Z",
        collector_tool="collector@1.0",
        verdict_confidence=0.7,
        evidence_id="EVID:web:abc:def",
    )
    fact = Fact(
        fact_id="fact-3",
        predicate="indicator.hash",
        value="deadbeef",
        verdict="confirmed",
        confidence=0.9,
        provenance=[provenance],
    )
    report = "Claim: deadbeef appeared in the malware sample without citation."
    result = verify_report(report, [fact])
    assert result["needs_human_review"] is True
    assert result["unsupported_claims"]
