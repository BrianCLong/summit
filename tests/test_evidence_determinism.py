import json
import pytest
from pathlib import Path
from summit.self_evolve.evidence import EvolutionEvidenceWriter

def test_deterministic_evidence(tmp_path):
    writer1 = EvolutionEvidenceWriter(tmp_path / "run1")
    writer2 = EvolutionEvidenceWriter(tmp_path / "run2")

    data = {"result": "success", "steps": 10}
    evidence_id = "EVD-TEST-001"

    writer1.write_evidence(evidence_id, data)
    writer2.write_evidence(evidence_id, data)

    file1 = tmp_path / "run1" / "evidence.json"
    file2 = tmp_path / "run2" / "evidence.json"

    assert file1.read_text() == file2.read_text()

def test_no_timestamps_in_evidence(tmp_path):
    writer = EvolutionEvidenceWriter(tmp_path)
    writer.write_evidence("EVD-001", {"data": "foo"})

    with open(tmp_path / "evidence.json") as f:
        content = f.read()
        # Should not contain strings that look like typical ISO timestamps
        # This is a bit loose but fits the MWS
        assert "2026-" not in content
        assert "T" not in content or ":" not in content # Very rough check
