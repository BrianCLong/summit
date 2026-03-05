"""Schema and contract validation for route optimization output."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator


SCHEMA_PATH = Path(__file__).resolve().parent / "schemas" / "route_plan.schema.json"


def validate_output(report: dict[str, Any]) -> None:
    with SCHEMA_PATH.open("r", encoding="utf-8") as handle:
        schema = json.load(handle)

    validator = Draft202012Validator(schema)
    errors = sorted(validator.iter_errors(report), key=lambda error: error.path)
    if errors:
        details = "; ".join(error.message for error in errors)
        raise ValueError(f"Route plan schema validation failed: {details}")
