"""Lightweight schema-driven validation aligned to the JSON Schemas."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, Iterable, Mapping

TYPE_MAP = {
    "string": str,
    "number": (int, float),
    "integer": int,
    "boolean": bool,
    "object": Mapping,
    "array": Iterable,
}


class ValidationError(ValueError):
    """Raised when a record violates the expected schema."""


class SchemaLoader:
    """Utility to load and cache JSON Schemas."""

    def __init__(self) -> None:
        self._cache: Dict[Path, Dict[str, Any]] = {}

    def load(self, path: Path) -> Dict[str, Any]:
        if path not in self._cache:
            with path.open("r", encoding="utf-8") as handle:
                self._cache[path] = json.load(handle)
        return self._cache[path]


_loader = SchemaLoader()


def _validate_type(value: Any, expected_type: str, path: str) -> None:
    python_type = TYPE_MAP.get(expected_type)
    if python_type is None:
        return  # ignore unsupported types to stay permissive
    if value is None:
        return
    if expected_type == "array" and not isinstance(value, list):
        raise ValidationError(f"{path} expected array, received {type(value).__name__}")
    if expected_type != "array" and not isinstance(value, python_type):
        raise ValidationError(f"{path} expected {expected_type}, received {type(value).__name__}")


def _validate_object(record: Mapping[str, Any], schema: Dict[str, Any], path: str = "root") -> None:
    required = schema.get("required", [])
    properties = schema.get("properties", {})

    for field in required:
        if field not in record:
            raise ValidationError(f"{path}.{field} is required")

    for field, value in record.items():
        prop_schema = properties.get(field)
        if not prop_schema:
            continue
        expected_type = prop_schema.get("type")
        _validate_type(value, expected_type, f"{path}.{field}")
        if expected_type == "object" and isinstance(value, Mapping):
            _validate_object(value, prop_schema, f"{path}.{field}")
        if expected_type == "array" and isinstance(value, list):
            items_schema = prop_schema.get("items", {})
            item_type = items_schema.get("type")
            for idx, item in enumerate(value):
                _validate_type(item, item_type, f"{path}.{field}[{idx}]")


def validate_record(record: Mapping[str, Any], schema_path: Path) -> None:
    """Validate a record against a JSON Schema subset.

    This validator enforces only the fields that are required and type hints for
    the subset of JSON Schema used in our documents. It remains permissive to
    reduce churn as schema fields evolve.
    """

    schema = _loader.load(schema_path)
    if schema.get("type") != "object":
        raise ValidationError("Top-level schema must describe an object")
    _validate_object(record, schema, path="root")
