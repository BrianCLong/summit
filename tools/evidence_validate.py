import argparse
import json
import sys
from pathlib import Path

FORBIDDEN_TIMESTAMP_KEYS = {
    "created_at",
    "generated_at",
    "updated_at",
    "timestamp",
    "time",
    "ts",
}


def fail(message: str) -> None:
    print(f"FAIL: {message}", file=sys.stderr)
    raise SystemExit(1)


def load_json(path: Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        fail(f"Unable to read {path}: {exc}")
    return {}


def validate_schema(instance: dict, schema: dict, context: str) -> None:
    required = schema.get("required", [])
    properties = schema.get("properties", {})
    additional_props = schema.get("additionalProperties", True)

    for field in required:
        if field not in instance:
            fail(f"Missing required field '{field}' in {context}")

    if additional_props is False:
        for key in instance:
            if key not in properties:
                fail(f"Unexpected field '{key}' in {context}")

    for key, value in instance.items():
        if key not in properties:
            continue
        expected_type = properties[key].get("type")
        if expected_type == "string" and not isinstance(value, str):
            fail(f"Field '{key}' in {context} must be a string")
        if expected_type == "object" and not isinstance(value, dict):
            fail(f"Field '{key}' in {context} must be an object")
        if expected_type == "array" and not isinstance(value, list):
            fail(f"Field '{key}' in {context} must be an array")


def find_timestamp_keys(payload: object, path: str = "") -> list[str]:
    hits: list[str] = []
    if isinstance(payload, dict):
        for key, value in payload.items():
            next_path = f"{path}.{key}" if path else key
            if key in FORBIDDEN_TIMESTAMP_KEYS:
                hits.append(next_path)
            hits.extend(find_timestamp_keys(value, next_path))
    elif isinstance(payload, list):
        for index, value in enumerate(payload):
            next_path = f"{path}[{index}]"
            hits.extend(find_timestamp_keys(value, next_path))
    return hits


def validate_index(index: dict, root: Path, schemas_dir: Path) -> None:
    if not isinstance(index.get("version"), int):
        fail("index.json version must be an integer")
    items = index.get("items", [])
    if not isinstance(items, list):
        fail("index.json items must be an array")

    report_schema = load_json(schemas_dir / "report.schema.json")
    metrics_schema = load_json(schemas_dir / "metrics.schema.json")
    stamp_schema = load_json(schemas_dir / "stamp.schema.json")

    for item in items:
        if not isinstance(item, dict):
            fail(f"index.json item must be object: {item}")

        if {"evidence_id", "report", "metrics", "stamp"}.issubset(item.keys()):
            evidence_id = item["evidence_id"]
            report_path = root / item["report"]
            metrics_path = root / item["metrics"]
            stamp_path = root / item["stamp"]

            report = load_json(report_path)
            metrics = load_json(metrics_path)
            stamp = load_json(stamp_path)

            validate_schema(report, report_schema, f"report {evidence_id}")
            if "metrics" in metrics:
                validate_schema(metrics, metrics_schema, f"metrics {evidence_id}")
            elif "evidence_id" not in metrics:
                fail(f"Legacy metrics missing evidence_id for {evidence_id}")
            if "created_at" in stamp and "generated_at" not in stamp:
                validate_schema(stamp, stamp_schema, f"stamp {evidence_id}")
            elif "created_at" in stamp and "generated_at" in stamp:
                if "evidence_id" not in stamp:
                    fail(f"Legacy stamp missing evidence_id for {evidence_id}")
            elif "generated_at" in stamp:
                if "evidence_id" not in stamp:
                    fail(f"Legacy stamp missing evidence_id for {evidence_id}")
            else:
                fail(f"Stamp missing created_at/generated_at for {evidence_id}")

            report_hits = find_timestamp_keys(report)
            metrics_hits = find_timestamp_keys(metrics)
            if report_hits:
                fail(
                    "Timestamp-like fields found outside stamp.json: "
                    + ", ".join(report_hits)
                )
            if metrics_hits:
                fail(
                    "Timestamp-like fields found outside stamp.json: "
                    + ", ".join(metrics_hits)
                )
        elif {"id", "path"}.issubset(item.keys()):
            evidence_id = item["id"]
            report_path = root / item["path"]
            report = load_json(report_path)
            validate_schema(report, report_schema, f"report {evidence_id}")
            report_hits = find_timestamp_keys(report)
            if report_hits:
                fail(
                    "Timestamp-like fields found outside stamp.json: "
                    + ", ".join(report_hits)
                )
        else:
            fail(f"index.json item missing required fields: {item}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate Summit evidence bundles.")
    parser.add_argument(
        "--schemas",
        default="evidence/schemas",
        help="Path to schema directory",
    )
    parser.add_argument(
        "--index", default="evidence/index.json", help="Path to evidence index"
    )
    args = parser.parse_args()

    root = Path.cwd()
    schemas_dir = root / args.schemas
    index_path = root / args.index

    if not schemas_dir.exists():
        fail(f"Schema directory not found: {schemas_dir}")
    if not index_path.exists():
        fail(f"Index file not found: {index_path}")

    index = load_json(index_path)
    validate_index(index, root, schemas_dir)

    print("Evidence validation passed.")


if __name__ == "__main__":
    main()
