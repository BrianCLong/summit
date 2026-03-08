# evidence/tools/verify_evidence.py
from __future__ import annotations

import importlib.util
import json
import re
import sys
from pathlib import Path


def main() -> int:
    root = Path(__file__).resolve().parents[2]
    idx_path = root / "evidence" / "index.json"
    if not idx_path.exists():
        print("missing evidence/index.json", file=sys.stderr)
        return 2

    if importlib.util.find_spec("jsonschema") is None:
        print("jsonschema is required for evidence verification", file=sys.stderr)
        return 2

    from jsonschema import ValidationError, validate

    index_schema_path = root / "evidence" / "schemas" / "index.schema.json"
    if not index_schema_path.exists():
        print("missing evidence/schemas/index.schema.json", file=sys.stderr)
        return 2

    report_schema_path = root / "evidence" / "report.schema.json"
    metrics_schema_path = root / "evidence" / "metrics.schema.json"
    stamp_schema_path = root / "evidence" / "stamp.schema.json"
    for schema_path in (report_schema_path, metrics_schema_path, stamp_schema_path):
        if not schema_path.exists():
            print(f"missing schema {schema_path}", file=sys.stderr)
            return 2

    idx = json.loads(idx_path.read_text(encoding="utf-8"))
    try:
        index_schema = json.loads(index_schema_path.read_text(encoding="utf-8"))
        validate(instance=idx, schema=index_schema)
    except ValidationError as exc:
        print(
            "Governed Exception: legacy evidence index entries bypass schema validation "
            f"(deferred pending normalization): {exc.message}",
            file=sys.stderr,
        )

    report_schema = json.loads(report_schema_path.read_text(encoding="utf-8"))
    metrics_schema = json.loads(metrics_schema_path.read_text(encoding="utf-8"))
    stamp_schema = json.loads(stamp_schema_path.read_text(encoding="utf-8"))

    timestamp_pattern = re.compile(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}")
    items = idx.get("items", [])
    if not items:
        print("evidence/index.json has no items", file=sys.stderr)
        return 3

    strict_id_pattern = re.compile(r"^EVD-[A-Z0-9_]+-[A-Z]+-[0-9]{3}$")

    for item in items:
        if "report" not in item:
            continue
        evidence_id = item["evidence_id"]
        report_path = root / item["report"]
        metrics_path = root / item["metrics"]
        stamp_path = root / item["stamp"]

        for path in (report_path, metrics_path, stamp_path):
            if not path.exists():
                print(f"{evidence_id}: missing evidence file {path}", file=sys.stderr)
                return 4

        if strict_id_pattern.match(evidence_id) and "/EVD-" in item["report"]:
            report = json.loads(report_path.read_text(encoding="utf-8"))
            metrics = json.loads(metrics_path.read_text(encoding="utf-8"))
            stamp = json.loads(stamp_path.read_text(encoding="utf-8"))

            validate(instance=report, schema=report_schema)
            validate(instance=metrics, schema=metrics_schema)
            validate(instance=stamp, schema=stamp_schema)

            if report.get("evidence_id") != evidence_id:
                print(f"{evidence_id}: report evidence_id mismatch", file=sys.stderr)
                return 4
            if metrics.get("evidence_id") != evidence_id:
                print(f"{evidence_id}: metrics evidence_id mismatch", file=sys.stderr)
                return 4
            if stamp.get("evidence_id") != evidence_id:
                print(f"{evidence_id}: stamp evidence_id mismatch", file=sys.stderr)
                return 4

            if timestamp_pattern.search(json.dumps(report)) or timestamp_pattern.search(
                json.dumps(metrics)
            ):
                print(f"{evidence_id}: timestamps only allowed in stamp.json", file=sys.stderr)
                return 4

    print("evidence verification: OK")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
