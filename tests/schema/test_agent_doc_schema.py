import json
from pathlib import Path

import pytest

jsonschema = pytest.importorskip("jsonschema")

REPO_ROOT = Path(__file__).resolve().parents[2]
SCHEMA_PATH = REPO_ROOT / "schemas" / "agent-doc.schema.json"
DOC_PATH = REPO_ROOT / "spec" / "agents" / "summit.agent.json"


def _load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def test_agent_doc_schema_accepts_generated_doc() -> None:
    schema = _load(SCHEMA_PATH)
    doc = _load(DOC_PATH)

    validator = jsonschema.Draft202012Validator(schema)
    validator.validate(doc)


def test_agent_doc_schema_rejects_missing_policy_constraints() -> None:
    schema = _load(SCHEMA_PATH)
    invalid = _load(DOC_PATH)
    invalid.pop("policy_constraints", None)

    validator = jsonschema.Draft202012Validator(schema)
    with pytest.raises(jsonschema.ValidationError):
        validator.validate(invalid)
