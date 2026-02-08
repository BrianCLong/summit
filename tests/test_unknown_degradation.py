"""Tests for unknown degradation when evidence is missing."""

import pathlib
import sys

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / "packages" / "osint" / "src"))

from hallucination.facts import Fact, apply_provenance_policy


def test_unknown_degradation() -> None:
    fact = Fact(
        fact_id="fact-2",
        predicate="indicator.domain",
        value="example.com",
        verdict="confirmed",
        confidence=0.8,
        provenance=[],
    )
    degraded = apply_provenance_policy(fact)
    assert degraded.verdict == "unknown"
    assert degraded.notes and "missing_provenance" in degraded.notes
