import json
import pytest
from pathlib import Path
from jsonschema import validate

SCHEMA_DIR = Path("evidence/schema")
FIXTURE_DIR = Path("evidence/fixtures/minimal_run")

def load_json(p):
    return json.loads(p.read_text(encoding="utf-8"))

@pytest.mark.parametrize("filename", ["report.json", "metrics.json", "stamp.json", "index.json"])
def test_evidence_matches_schema(filename):
    schema_file = SCHEMA_DIR / filename.replace(".json", ".schema.json")
    fixture_file = FIXTURE_DIR / filename

    schema = load_json(schema_file)
    instance = load_json(fixture_file)

    validate(instance=instance, schema=schema)

def test_evidence_determinism():
    # Heuristic: No timestamps (YYYY-MM-DD) in report or metrics
    for filename in ["report.json", "metrics.json"]:
        content = (FIXTURE_DIR / filename).read_text(encoding="utf-8")
        import re
        assert not re.search(r'202\d-\d{2}-\d{2}', content), f"Timestamp found in {filename}"

def test_stamp_has_timestamp():
    content = (FIXTURE_DIR / "stamp.json").read_text(encoding="utf-8")
    import re
    assert re.search(r'202\d-\d{2}-\d{2}', content), "Timestamp NOT found in stamp.json"
