"""Tests for deterministic evidence ID generation."""

import pathlib
import sys

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / "packages" / "osint" / "src"))

from hallucination.evidence_id import compute_evidence_id


def test_deterministic_evidence_ids() -> None:
    evidence_a = compute_evidence_id(
        source_type="web",
        source_url="https://example.com/article?utm_source=foo&b=2&a=1",
        snippet="Some   text.",
    )
    evidence_b = compute_evidence_id(
        source_type="web",
        source_url="https://example.com/article?a=1&b=2",
        snippet="Some text.",
    )
    assert evidence_a == evidence_b
