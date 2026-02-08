"""Tests for two-source confirmation policy."""

import pathlib
import sys

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / "packages" / "osint" / "src"))

from hallucination.facts import Fact, Provenance, apply_two_source_policy


def test_two_source_promotion() -> None:
    provenance = Provenance(
        source_url="https://example.com/only",
        source_type="web",
        collected_at="2025-01-01T00:00:00Z",
        collector_tool="collector@1.0",
        verdict_confidence=0.6,
    )
    fact = Fact(
        fact_id="fact-4",
        predicate="indicator.ip",
        value="198.51.100.2",
        verdict="confirmed",
        confidence=0.85,
        provenance=[provenance],
    )
    downgraded = apply_two_source_policy(fact)
    assert downgraded.verdict == "unconfirmed"
    assert downgraded.notes == "confirmed_requires_two_sources"
