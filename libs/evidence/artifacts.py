import json
import os
from typing import Any, Mapping, Optional

try:
    import jsonschema
except ImportError:
    jsonschema = None

def _get_schema_path(schema_name: str) -> str:
    # resolving relative to the repository root assuming this file is in libs/evidence/
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    return os.path.join(base_dir, "schemas", "evidence", f"{schema_name}.schema.json")

def _load_schema(schema_name: str) -> dict:
    path = _get_schema_path(schema_name)
    with open(path, "r") as f:
        return json.load(f)

def validate_artifact(data: Any, schema_name: str) -> None:
    if jsonschema is None:
        # If jsonschema is not installed, skip validation or warn.
        # But for CI/Evals it should be installed.
        # We can raise an error if validation is expected.
        raise ImportError("jsonschema is required for artifact validation")

    schema = _load_schema(schema_name)
    jsonschema.validate(instance=data, schema=schema)

def _save_json(data: Any, path: str) -> None:
    with open(path, "w") as f:
        json.dump(data, f, sort_keys=True, separators=(",", ":"), ensure_ascii=True)

def save_report(data: Mapping[str, Any], output_dir: str, validate: bool = True) -> None:
    if validate:
        validate_artifact(data, "report")
    _save_json(data, os.path.join(output_dir, "report.json"))

def save_metrics(data: Mapping[str, Any], output_dir: str, validate: bool = True) -> None:
    if validate:
        validate_artifact(data, "metrics")
    _save_json(data, os.path.join(output_dir, "metrics.json"))

def save_stamp(data: Mapping[str, Any], output_dir: str, validate: bool = True) -> None:
    if validate:
        validate_artifact(data, "stamp")
    _save_json(data, os.path.join(output_dir, "stamp.json"))
