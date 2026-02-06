import json
import os
import re
import sys
from pathlib import Path
from typing import Any, Dict, Iterable, List

DENY_PATTERNS = [
    r"-----BEGIN PRIVATE KEY-----",
    r"\bBearer\s+[A-Za-z0-9\-_\.]+\b",
    r"\bapi[_-]?key\b\s*[:=]\s*\S+",
]

FORBIDDEN_TIME_KEYS = {
    "created_at",
    "created_at_utc",
    "timestamp",
    "timestamps",
}

SCHEMA_DIR = Path("evidence/schemas")
RUNS_DIR = Path("evidence/runs")


def fail(message: str) -> None:
    print(f"[evidence_verify] FAIL: {message}")
    sys.exit(1)


def load_schema(name: str) -> dict[str, Any]:
    schema_path = SCHEMA_DIR / name
    if not schema_path.exists():
        fail(f"missing schema: {schema_path}")
    return json.loads(schema_path.read_text(encoding="utf-8"))


def is_type(value: Any, schema_type: str) -> bool:
    if schema_type == "string":
        return isinstance(value, str)
    if schema_type == "integer":
        return isinstance(value, int) and not isinstance(value, bool)
    if schema_type == "number":
        return isinstance(value, (int, float)) and not isinstance(value, bool)
    if schema_type == "boolean":
        return isinstance(value, bool)
    if schema_type == "array":
        return isinstance(value, list)
    if schema_type == "object":
        return isinstance(value, dict)
    return False


def validate_schema(schema: dict[str, Any], data: Any, context: str) -> bool:
    if "anyOf" in schema:
        return any(validate_schema(option, data, context) for option in schema["anyOf"])

    schema_type = schema.get("type")
    if schema_type and not is_type(data, schema_type):
        return False

    if schema_type == "object":
        required = schema.get("required", [])
        for key in required:
            if key not in data:
                return False
        properties = schema.get("properties", {})
        for key, value in data.items():
            if key in properties:
                if not validate_schema(properties[key], value, f"{context}.{key}"):
                    return False
        return True

    if schema_type == "array":
        items_schema = schema.get("items")
        if items_schema:
            return all(validate_schema(items_schema, item, context) for item in data)
        return True

    if schema_type == "string":
        pattern = schema.get("pattern")
        if pattern and not re.search(pattern, str(data)):
            return False
        return True

    return True


def find_forbidden_time_keys(data: Any, path: str = "") -> list[str]:
    found = []
    if isinstance(data, dict):
        for key, value in data.items():
            next_path = f"{path}.{key}" if path else key
            if key in FORBIDDEN_TIME_KEYS:
                found.append(next_path)
            found.extend(find_forbidden_time_keys(value, next_path))
    elif isinstance(data, list):
        for idx, item in enumerate(data):
            found.extend(find_forbidden_time_keys(item, f"{path}[{idx}]") if path else find_forbidden_time_keys(item, f"[{idx}]"))
    return found


def ensure_schema(name: str, data: Any, context: str) -> None:
    schema = load_schema(name)
    if not validate_schema(schema, data, context):
        fail(f"schema validation failed for {context} using {name}")


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def check_deny_patterns(path: Path) -> None:
    if path.name == "stamp.json":
        return
    text = path.read_text(encoding="utf-8", errors="ignore")
    for pattern in DENY_PATTERNS:
        if re.search(pattern, text):
            fail(f"deny-pattern {pattern} found in {path}")


def enforce_default_off(report: dict[str, Any], path: Path) -> None:
    kg_enabled = os.getenv("KG_ENABLED", "").lower() in {"1", "true", "yes"}
    if kg_enabled:
        return
    component = str(report.get("component", ""))
    if component.startswith("kg") or component.startswith("connectors/moltbook_like"):
        fail(f"KG_ENABLED is disabled, but evidence written in {path}")


def verify_run(index_path: Path) -> None:
    run_dir = index_path.parent
    report_path = run_dir / "report.json"
    metrics_path = run_dir / "metrics.json"
    stamp_path = run_dir / "stamp.json"

    if not report_path.exists() or not metrics_path.exists() or not stamp_path.exists():
        fail(f"missing required evidence files in {run_dir}")

    index = read_json(index_path)
    report = read_json(report_path)
    metrics = read_json(metrics_path)
    stamp = read_json(stamp_path)

    ensure_schema("index.schema.json", index, str(index_path))
    ensure_schema("report.schema.json", report, str(report_path))
    ensure_schema("metrics.schema.json", metrics, str(metrics_path))
    ensure_schema("stamp.schema.json", stamp, str(stamp_path))

    for path in run_dir.rglob("*.json"):
        check_deny_patterns(path)
        if path.name != "stamp.json":
            forbidden_keys = find_forbidden_time_keys(read_json(path))
            if forbidden_keys:
                fail(f"timestamps found outside stamp.json in {path}: {', '.join(forbidden_keys)}")

    enforce_default_off(report, report_path)


def main() -> None:
    if not RUNS_DIR.exists():
        print("[evidence_verify] no evidence/runs directory; ok")
        return

    index_files = list(RUNS_DIR.rglob("index.json"))
    if not index_files:
        print("[evidence_verify] no index.json files found; ok")
        return

    for index_path in index_files:
        verify_run(index_path)

    print("[evidence_verify] PASS")


if __name__ == "__main__":
    main()
