import json
import sys
import os
from pathlib import Path
import pytest

# Ensure CWD is in path (it should be for pytest, but just in case)
sys.path.insert(0, os.getcwd())

def test_evidence_index_exists():
    path = Path("evidence/index.json")
    assert path.exists()
    data = json.loads(path.read_text())
    assert "items" in data

    required_ids = [
        "EVD-DAGGR-GRAPH-001",
        "EVD-DAGGR-RUNTIME-001",
        "EVD-DAGGR-CONN-001",
        "EVD-DAGGR-UI-001"
    ]
    for eid in required_ids:
        assert eid in data["items"], f"Missing Evidence ID: {eid}"

def test_schemas_exist():
    schema_dir = Path("evidence/schemas")
    assert schema_dir.exists()
    assert (schema_dir / "report.schema.json").exists()
    assert (schema_dir / "metrics.schema.json").exists()
    assert (schema_dir / "stamp.schema.json").exists()

def test_summit_evidence_exports():
    try:
        import summit
        print(f"DEBUG: summit location: {summit.__file__}")
        print(f"DEBUG: summit path: {summit.__path__}")

        from summit.evidence import EvidencePaths, write_json
        assert EvidencePaths
        assert write_json
    except ImportError as e:
        print(f"DEBUG: ImportError: {e}")
        import traceback
        traceback.print_exc()
        pytest.fail(f"Could not import summit.evidence: {e}")
