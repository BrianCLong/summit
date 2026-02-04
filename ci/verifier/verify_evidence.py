import json
import pathlib
import sys

from jsonschema import ValidationError, validate

ROOT = pathlib.Path(__file__).resolve().parents[2]
SCHEMAS = ROOT / "evidence" / "schemas"
EVIDENCE_DIR = ROOT / "evidence" / "trustparadox"

SCHEMA_MAP = {
    "report.json": "trustparadox-report.schema.json",
    "metrics.json": "trustparadox-metrics.schema.json",
    "stamp.json": "trustparadox-stamp.schema.json",
    "index.json": "trustparadox-index.schema.json",
}


def load_json(path: pathlib.Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def validate_file(data_path: pathlib.Path, schema_path: pathlib.Path) -> None:
    validate(instance=load_json(data_path), schema=load_json(schema_path))


def main() -> int:
    for data_file, schema_file in SCHEMA_MAP.items():
        data_path = EVIDENCE_DIR / data_file
        if not data_path.exists():
            print(f"FAIL missing {data_path}")
            return 2
        schema_path = SCHEMAS / schema_file
        if not schema_path.exists():
            print(f"FAIL missing {schema_path}")
            return 2
        try:
            validate_file(data_path, schema_path)
        except ValidationError as exc:
            print(f"FAIL schema validation for {data_file}: {exc.message}")
            return 2

    report = load_json(EVIDENCE_DIR / "report.json")
    index = load_json(EVIDENCE_DIR / "index.json")
    items = index.get("items", {})

    for evidence_id in report.get("evidence_ids", []):
        if evidence_id not in items:
            print(f"FAIL index missing evidence id {evidence_id}")
            return 2
        for rel_path in items[evidence_id]:
            path = ROOT / rel_path
            if not path.exists():
                print(f"FAIL index path missing {rel_path}")
                return 2

    print("OK trust paradox evidence schemas valid")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
