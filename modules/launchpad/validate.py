import json
from pathlib import Path
from typing import Any, Dict

import jsonschema

SCHEMA_DIR = Path(__file__).resolve().parent / "schemas"


def _load_schema(name: str) -> Dict[str, Any]:
    schema_path = SCHEMA_DIR / name
    return json.loads(schema_path.read_text(encoding="utf-8"))


def _validate(instance: Dict[str, Any], schema_name: str) -> None:
    schema = _load_schema(schema_name)
    try:
        jsonschema.validate(instance=instance, schema=schema)
    except jsonschema.exceptions.ValidationError as exc:
        raise ValueError(f"Launchpad payload failed validation: {exc.message}") from exc


def validate_agent(payload: Dict[str, Any]) -> None:
    _validate(payload, "agent.schema.json")


def validate_project(payload: Dict[str, Any]) -> None:
    _validate(payload, "project.schema.json")


def validate_vote(payload: Dict[str, Any]) -> None:
    _validate(payload, "vote.schema.json")
