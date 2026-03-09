import os
import json
import pytest
from summit.textualizer.core import to_context_pack

def test_to_context_pack_ordering_and_redaction(tmp_path):
    # Setup test data
    data_dir = tmp_path / "data"
    data_dir.mkdir()

    # Create manifest
    manifest_path = data_dir / "manifest.json"
    manifest_path.write_text(json.dumps({"never_log_fields": ["ssn"]}), encoding="utf-8")

    # Create dummy files
    data1 = {"id": "1", "timestamp": "2023-01-01", "content": "hello", "ssn": "123", "secret": "abc"}
    data2 = {"id": "2", "created_at": "2023-01-02", "content": "world", "ssn": "456", "secret": "def"}

    file1 = data_dir / "file1.json"
    file2 = data_dir / "file2.json"

    file1.write_text(json.dumps(data1), encoding="utf-8")
    file2.write_text(json.dumps(data2), encoding="utf-8")

    paths = [str(file2), str(file1)] # unsorted

    # Execute
    result = to_context_pack(paths)
    parsed = json.loads(result)

    trajectories = parsed["trajectories"]

    # Check ordering (file1 should be first because '1' < '2' in path)
    assert trajectories[0]["id"] == "1"
    assert trajectories[1]["id"] == "2"

    # Check redaction
    assert trajectories[0]["ssn"] == "[REDACTED]"
    assert trajectories[0]["secret"] == "[REDACTED]"

    # Check timestamp removal
    assert "timestamp" not in trajectories[0]
    assert "created_at" not in trajectories[1]

def test_to_context_pack_empty():
    result = to_context_pack([])
    parsed = json.loads(result)
    assert parsed["trajectories"] == []
