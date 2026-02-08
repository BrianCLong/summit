import json
from summit.self_evolve.evidence import EvolutionEvidenceWriter

def test_evidence_determinism(tmp_path):
    writer = EvolutionEvidenceWriter(tmp_path)
    evd_id = "EVD-TEST-123"
    data = {"b": 2, "a": 1, "nested": {"d": 4, "c": 3}}

    writer.write_evidence(evd_id, data)

    with open(tmp_path / "evidence.json", "r") as f:
        content1 = f.read()

    # Re-run
    writer.write_evidence(evd_id, data)
    with open(tmp_path / "evidence.json", "r") as f:
        content2 = f.read()

    assert content1 == content2

    # Check sorting
    parsed = json.loads(content1)
    assert list(parsed["data"].keys()) == ["a", "b", "nested"]
    assert list(parsed["data"]["nested"].keys()) == ["c", "d"]

def test_no_timestamps_in_evidence_or_metrics(tmp_path):
    writer = EvolutionEvidenceWriter(tmp_path)
    evd_id = "EVD-TEST-456"

    writer.write_evidence(evd_id, {"info": "no time here"})
    writer.write_metrics(evd_id, {"count": 10})

    with open(tmp_path / "evidence.json", "r") as f:
        assert "timestamp" not in f.read().lower()
    with open(tmp_path / "metrics.json", "r") as f:
        assert "timestamp" not in f.read().lower()
