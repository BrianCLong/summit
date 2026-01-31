import pytest
from summit_emu3.backends.dummy import DummyBackend
from summit_emu3.schema import MediaEvidenceV1, ProvenanceV1


def test_media_evidence_validation():
    # Test valid evidence
    prov = ProvenanceV1(
        backend="test",
        model_id="test",
        tokenizer_id="test",
        input_sha256="test",
        timestamp="2023-01-01T00:00:00Z"
    )
    ev = MediaEvidenceV1(
        evidence_id="EVID:emu3-ntp:000000000000:caption:v1",
        mode="caption",
        caption="test",
        provenance=prov
    )
    assert ev.mode == "caption"

    # Test invalid ID
    with pytest.raises(ValueError):
        MediaEvidenceV1(
            evidence_id="INVALID:ID",
            mode="caption",
            provenance=prov
        )

def test_dummy_backend_caption():
    backend = DummyBackend()
    ev = backend.generate_evidence("test.jpg", "caption")

    assert ev.mode == "caption"
    assert ev.caption == "A deterministic dummy caption for testing."
    assert ev.provenance.backend == "dummy"
    assert ev.evidence_id.startswith("EVID:emu3-ntp:")

def test_dummy_backend_vqa():
    backend = DummyBackend()
    ev = backend.generate_evidence("test.jpg", "vqa", question="Is this a cat?")

    assert ev.mode == "vqa"
    assert ev.qa[0]["question"] == "Is this a cat?"
    assert ev.qa[0]["answer"] == "This is a dummy response."
