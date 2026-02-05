import json
import os
from summit.frontier.evidence import evidence_id, write_json, EVIDENCE_ID_PREFIX

def test_evidence_id_format():
    """Test that evidence IDs are formatted correctly."""
    eid = evidence_id("TEST", 1)
    assert eid == "SUMMIT-FRONTIER:TEST:0001"
    assert eid.startswith(EVIDENCE_ID_PREFIX)

def test_write_json_determinism(tmp_path):
    """Test that write_json produces sorted keys for determinism."""
    data = {"b": 2, "a": 1, "c": {"y": 9, "x": 8}}
    path = tmp_path / "test.json"

    write_json(str(path), data)

    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # Check simple string containment for key ordering
    # "a": 1 comes before "b": 2 in sorted JSON
    assert '"a": 1' in content
    assert content.index('"a": 1') < content.index('"b": 2')

    # Check nested sorting
    assert '"x": 8' in content
    assert content.index('"x": 8') < content.index('"y": 9')

def test_write_json_creates_dirs(tmp_path):
    """Test that write_json creates parent directories."""
    path = tmp_path / "subdir" / "test.json"
    data = {"foo": "bar"}
    write_json(str(path), data)
    assert path.exists()
