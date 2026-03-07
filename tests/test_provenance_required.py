"""Tests for provenance-required fact policies."""

import pathlib
import sys

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / "packages" / "osint" / "src"))

from hallucination.facts import Fact, Provenance, apply_provenance_policy, missing_provenance_fields


def test_provenance_required() -> None:
    provenance = Provenance(
        source_url="",
        source_type="web",
        collected_at="2025-01-01T00:00:00Z",
        collector_tool="collector@1.0",
        verdict_confidence=0.4,
    )
    fact = Fact(
        fact_id="fact-1",
        predicate="indicator.ip",
        value="203.0.113.1",
        verdict="confirmed",
        confidence=0.9,
        provenance=[provenance],
    )
    missing = missing_provenance_fields(fact)
    assert "provenance_missing:source_url" in missing

    degraded = apply_provenance_policy(fact)
    assert degraded.verdict == "unknown"
