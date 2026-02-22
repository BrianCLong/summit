import pytest
from intelgraph.provenance.multimodal import MultimodalEvidenceBundle

def test_multimodal_ingest():
    bundle = MultimodalEvidenceBundle(run_id="run-123")
    evid_id = bundle.add_item(
        content_type="application/pdf",
        source="annual_report_2025.pdf",
        metadata={"page_count": 45}
    )
    assert evid_id.startswith("EVID-AGENT-")
    assert len(bundle.evidence_items) == 1

def test_deterministic_evidence_id():
    bundle1 = MultimodalEvidenceBundle(run_id="run-123")
    bundle2 = MultimodalEvidenceBundle(run_id="run-123")
    meta = {"key": "value"}
    id1 = bundle1.add_item("image/png", "screenshot.png", meta)
    id2 = bundle2.add_item("image/png", "screenshot.png", meta)
    assert id1 == id2
