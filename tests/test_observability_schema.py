import pytest
from summit.observability.evidence import evidence_id

def test_evidence_id_deterministic():
    input1 = {"a": 1, "b": "test"}
    input2 = {"b": "test", "a": 1} # Different order

    id1 = evidence_id(input1)
    id2 = evidence_id(input2)

    assert id1 == id2
    assert id1.startswith("SUMMIT-OBS-")
    assert len(id1) == len("SUMMIT-OBS-") + 16

def test_evidence_id_change():
    input1 = {"a": 1}
    input2 = {"a": 2}

    assert evidence_id(input1) != evidence_id(input2)
