import json
from pathlib import Path

import pytest

jsonschema = pytest.importorskip("jsonschema")

SCHEMA_PATH = Path("src/summit_narrative/nog/schema.json")
FIXTURE_DIR = Path("tests/fixtures/nog")


def _load(path: Path):
    return json.loads(path.read_text())


def test_nog_schema_accepts_minimal():
    schema = _load(SCHEMA_PATH)
    payload = _load(FIXTURE_DIR / "minimal.json")
    jsonschema.validate(instance=payload, schema=schema)


def test_nog_schema_accepts_multi():
    schema = _load(SCHEMA_PATH)
    payload = _load(FIXTURE_DIR / "multi.json")
    jsonschema.validate(instance=payload, schema=schema)


def test_nog_schema_rejects_invalid():
    schema = _load(SCHEMA_PATH)
    payload = _load(FIXTURE_DIR / "invalid.json")
    with pytest.raises(jsonschema.ValidationError):
        jsonschema.validate(instance=payload, schema=schema)
