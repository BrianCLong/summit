import json
import os
import pytest
from pathlib import Path

SCHEMA_DIR = Path("summit_ttt/evidence/schemas")

def test_schemas_exist():
    assert (SCHEMA_DIR / "report.schema.json").exists()
    assert (SCHEMA_DIR / "metrics.schema.json").exists()
    assert (SCHEMA_DIR / "stamp.schema.json").exists()
    assert (SCHEMA_DIR / "index.schema.json").exists()

def test_schemas_are_valid_json():
    for schema_file in SCHEMA_DIR.glob("*.schema.json"):
        with open(schema_file) as f:
            data = json.load(f)
            assert isinstance(data, dict)
            assert "$schema" in data

def test_index_registry_exists():
    index_path = Path("summit_ttt/evidence/index.json")
    assert index_path.exists()
    with open(index_path) as f:
        data = json.load(f)
        assert data["version"] == 1
        assert isinstance(data["items"], list)
