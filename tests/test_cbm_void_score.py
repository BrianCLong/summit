import pytest

from summit.cbm.schema import DocumentEvent
from summit.cbm.void_score import score_data_voids


def test_void_score_determinism():
    events = [
        DocumentEvent(id="doc1", content="Claim A", source="src1", metadata={"is_authoritative": False}),
        DocumentEvent(id="doc2", content="Claim B", source="src2", metadata={"is_authoritative": True}),
    ]

    res1 = score_data_voids(events, "vaccine_safety", "en_US", "20240101")
    res2 = score_data_voids(events, "vaccine_safety", "en_US", "20240101")

    assert res1 == res2
    assert res1["scores"]["authority_density"] == 0.5
    assert res1["scores"]["void_risk_score"] == 0.5
    assert "EVID-CBM-20240101" in res1["metadata"]["evidence_id"]
