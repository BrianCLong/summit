import json
from unittest.mock import patch

from intelgraph.provenance import build_provenance_record, generate_minimal_sbom


def test_minimal_sbom():
    sbom = generate_minimal_sbom("test-project", "0.1.0")
    assert sbom["name"] == "test-project"
    assert sbom["version"] == "0.1.0"
    assert "generated_at" in sbom
    assert "python_version" in sbom
    assert isinstance(sbom["dependencies"], list)


def test_provenance_record():
    with patch("time.time", return_value=1234567890.0):
        record = build_provenance_record(run_id="run-1", params={"k": "v"}, git_commit="sha123")
        assert record["timestamp"] == 1234567890.0
        assert record["run_id"] == "run-1"
        assert record["git_commit"] == "sha123"

        # Verify JSON serializability
        json_str = json.dumps(record)
        assert "run-1" in json_str


def test_sbom_deps():
    # We can't strictly assert deps unless we mock importlib.metadata
    # But checking it doesn't crash is key.
    sbom = generate_minimal_sbom("proj", "1.0")
    assert isinstance(sbom["dependencies"], list)
