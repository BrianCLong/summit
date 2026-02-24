from __future__ import annotations

import re
from typing import Any


class SchemaValidationError(ValueError):
    """Raised when payload does not satisfy the declared schema."""


def _type_matches(value: Any, expected: str) -> bool:
    if expected == "array":
        return isinstance(value, list)
    if expected == "object":
        return isinstance(value, dict)
    if expected == "string":
        return isinstance(value, str)
    if expected == "integer":
        return isinstance(value, int) and not isinstance(value, bool)
    if expected == "number":
        return (isinstance(value, int) or isinstance(value, float)) and not isinstance(value, bool)
    if expected == "boolean":
        return isinstance(value, bool)
    if expected == "null":
        return value is None
    return False


def validate_schema(value: Any, schema: dict[str, Any], context: str = "$") -> None:
    if not isinstance(schema, dict):
        raise SchemaValidationError(f"{context}: schema must be an object")

    expected_type = schema.get("type")
    if expected_type is not None and not _type_matches(value, expected_type):
        raise SchemaValidationError(f"{context}: expected type '{expected_type}'")

    enum = schema.get("enum")
    if enum is not None and value not in enum:
        raise SchemaValidationError(f"{context}: value is not in enum")

    min_length = schema.get("minLength")
    if min_length is not None and isinstance(value, str) and len(value) < min_length:
        raise SchemaValidationError(f"{context}: minLength={min_length} violated")

    minimum = schema.get("minimum")
    if minimum is not None and isinstance(value, (int, float)) and value < minimum:
        raise SchemaValidationError(f"{context}: minimum={minimum} violated")

    pattern = schema.get("pattern")
    if pattern is not None and isinstance(value, str):
        if re.match(pattern, value) is None:
            raise SchemaValidationError(f"{context}: pattern mismatch")

    if expected_type == "object":
        assert isinstance(value, dict)
        required = schema.get("required", [])
        for key in required:
            if key not in value:
                raise SchemaValidationError(f"{context}.{key}: required key missing")

        properties = schema.get("properties", {})
        additional = schema.get("additionalProperties", True)
        if additional is False:
            for key in value:
                if key not in properties:
                    raise SchemaValidationError(f"{context}.{key}: unexpected key")

        for key, nested_schema in properties.items():
            if key in value:
                validate_schema(value[key], nested_schema, f"{context}.{key}")

    if expected_type == "array":
        assert isinstance(value, list)
        min_items = schema.get("minItems")
        if min_items is not None and len(value) < min_items:
            raise SchemaValidationError(f"{context}: minItems={min_items} violated")
        max_items = schema.get("maxItems")
        if max_items is not None and len(value) > max_items:
            raise SchemaValidationError(f"{context}: maxItems={max_items} violated")

        item_schema = schema.get("items")
        if item_schema is not None:
            for idx, item in enumerate(value):
                validate_schema(item, item_schema, f"{context}[{idx}]")
