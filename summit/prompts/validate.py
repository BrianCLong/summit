import importlib.resources
import json
from pathlib import Path
from typing import Any, Dict, List

from jsonschema import Draft202012Validator

SCHEMA_PATH = Path(__file__).parent / "schema" / "prompt_artifact.schema.json"

def get_validator() -> Draft202012Validator:
    """Load the JSON schema and return a validator."""
    if not SCHEMA_PATH.exists():
        raise FileNotFoundError(f"Schema not found at {SCHEMA_PATH}")

    schema_data = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    return Draft202012Validator(schema_data)

def validate_prompt_artifact(obj: dict[str, Any]) -> list[str]:
    """Validate a prompt artifact against the schema. Returns a list of error messages."""
    validator = get_validator()
    errors = sorted(validator.iter_errors(obj), key=lambda e: e.path)
    return [f"{'/'.join(map(str, e.path))}: {e.message}" for e in errors]
