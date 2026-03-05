import json
import shutil
import sys
from pathlib import Path

import pytest

# Add root to sys.path
sys.path.append(str(Path(__file__).parent.parent.parent))

from ci.graphci.lib.evidence_writer import EvidenceWriter
from ci.graphci.lib.hash_tree import compute_merkle_root, hash_data


@pytest.fixture
def temp_evidence_dir(tmp_path):
    d = tmp_path / "evidence"
    d.mkdir()
    return d

def test_evidence_structure(temp_evidence_dir):
    ev_id = "EVD-TEST-UNIT-001"
    writer = EvidenceWriter(ev_id, temp_evidence_dir)

    writer.write_report("Test Summary")
    writer.write_metrics({"accuracy": 1.0})
    writer.write_stamp(input_hash={"foo": "bar"}, tool_versions={"test": "1.0"})

    ev_dir = temp_evidence_dir / ev_id
    assert ev_dir.exists()
    assert (ev_dir / "report.json").exists()
    assert (ev_dir / "metrics.json").exists()
    assert (ev_dir / "stamp.json").exists()

    with open(ev_dir / "stamp.json") as f:
        stamp = json.load(f)
        assert stamp["evidence_id"] == ev_id
        assert "timestamp" in stamp
        assert "input_hash_tree" in stamp
        assert "tool_versions" in stamp

def test_hash_tree():
    data1 = {"a": 1, "b": 2}
    data2 = {"b": 2, "a": 1}
    assert hash_data(data1) == hash_data(data2)

    h1 = hash_data("foo")
    h2 = hash_data("bar")
    root = compute_merkle_root([h1, h2])
    assert root == compute_merkle_root([h2, h1]) # Order shouldn't matter if sorted inside
