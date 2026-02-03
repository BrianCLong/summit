import json
from pathlib import Path

import pytest

from summit.active_measures.evidence.export import EvidenceStamp, init_evidence_dir


def validate_schema(data, schema):
    # Basic validation logic matching strict JSON schema logic
    if schema.get("type") == "object":
        assert isinstance(data, dict), f"Expected object, got {type(data)}"
        for req in schema.get("required", []):
            assert req in data, f"Missing required field: {req}"
        if schema.get("additionalProperties") is False:
            for k in data:
                assert k in schema.get("properties", {}), f"Unexpected field: {k}"
        for k, v in data.items():
            if k in schema.get("properties", {}):
                validate_schema(v, schema["properties"][k])
    elif schema.get("type") == "string":
        assert isinstance(data, str), f"Expected string, got {type(data)}"
    elif schema.get("type") == "array":
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        item_schema = schema.get("items")
        if item_schema:
            for item in data:
                validate_schema(item, item_schema)

def test_evidence_export_schema_compliance(tmp_path):
    stamp = EvidenceStamp(created_at="2025-01-01T00:00:00Z", run_id="test-run-1")
    out_dir = tmp_path / "evidence"
    init_evidence_dir(out_dir, stamp=stamp)

    # Load schemas
    # tests/ is at root. evidence/ is at root.
    # We assume test runs from root.
    schema_dir = Path("evidence/schemas")
    if not schema_dir.exists():
        # Fallback if running from tests/ dir? No, pytest usually runs from root.
        pytest.fail(f"Schema directory not found at {schema_dir.absolute()}")

    files = [
        ("report.json", "active-measures-report.schema.json"),
        ("metrics.json", "active-measures-metrics.schema.json"),
        ("stamp.json", "active-measures-stamp.schema.json"),
        ("index.json", "active-measures-index.schema.json"),
    ]

    for fname, sname in files:
        fpath = out_dir / fname
        assert fpath.exists()
        data = json.loads(fpath.read_text(encoding="utf-8"))

        spath = schema_dir / sname
        assert spath.exists(), f"Schema {sname} not found"
        schema = json.loads(spath.read_text(encoding="utf-8"))

        validate_schema(data, schema)
