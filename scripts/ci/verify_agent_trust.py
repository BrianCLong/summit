#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from summit.agent_eval.schema import sha256_file, stable_payload_hash

try:
    from jsonschema import validate
except ImportError:  # pragma: no cover
    validate = None

RFC3339_PATTERN = re.compile(
    r"\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})\b"
)


def _load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _contains_rfc3339(value: Any) -> bool:
    if isinstance(value, dict):
        return any(_contains_rfc3339(v) for v in value.values())
    if isinstance(value, list):
        return any(_contains_rfc3339(v) for v in value)
    if isinstance(value, str):
        return bool(RFC3339_PATTERN.search(value))
    return False


def _validate_schema(report: dict[str, Any], schema_path: Path) -> list[str]:
    if validate is None:
        return ["jsonschema not installed; skipped schema validation."]
    schema = _load_json(schema_path)
    validate(instance=report, schema=schema)
    return []


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify agent trust boundary artifacts.")
    parser.add_argument("--artifact", required=True)
    parser.add_argument("--report", required=True)
    parser.add_argument("--metrics", required=True)
    parser.add_argument("--stamp", required=True)
    parser.add_argument("--schema", required=True)
    args = parser.parse_args()

    errors: list[str] = []
    warnings: list[str] = []

    artifact = Path(args.artifact)
    report_path = Path(args.report)
    metrics_path = Path(args.metrics)
    stamp_path = Path(args.stamp)
    schema_path = Path(args.schema)

    for required in (artifact, report_path, metrics_path, stamp_path, schema_path):
        if not required.exists():
            errors.append(f"Missing required file: {required}")

    if errors:
        for err in errors:
            print(f"ERROR: {err}")
        return 1

    report = _load_json(report_path)
    metrics = _load_json(metrics_path)
    stamp = _load_json(stamp_path)

    if not report.get("evidence_id"):
        errors.append("Missing evidence_id in report.json.")

    evidence_id = report.get("evidence_id")
    if evidence_id != metrics.get("evidence_id") or evidence_id != stamp.get("evidence_id"):
        errors.append("Evidence ID mismatch across report/metrics/stamp.")

    try:
        warnings.extend(_validate_schema(report, schema_path))
    except Exception as exc:  # noqa: BLE001
        errors.append(f"Schema validation failed: {exc}")

    expected_input_hash = sha256_file(artifact)
    if report.get("input_hash") != expected_input_hash:
        errors.append("report.json input_hash does not match artifact SHA-256.")
    if metrics.get("input_hash") != expected_input_hash:
        errors.append("metrics.json input_hash does not match artifact SHA-256.")
    if stamp.get("input_hash") != expected_input_hash:
        errors.append("stamp.json input_hash does not match artifact SHA-256.")

    expected_output_hash = stable_payload_hash(
        {
            "artifact_path": report.get("artifact_path"),
            "evaluation_score": report.get("evaluation_score"),
            "markers": report.get("nondeterministic_markers", []),
        }
    )
    if report.get("output_hash") != expected_output_hash:
        errors.append("report.json output_hash is non-deterministic or malformed.")
    if metrics.get("output_hash") != expected_output_hash:
        errors.append("metrics.json output_hash does not match report hash.")
    if stamp.get("output_hash") != expected_output_hash:
        errors.append("stamp.json output_hash does not match report hash.")

    if report.get("status") != "pass":
        errors.append("Evaluation report status is not pass.")
    if metrics.get("deterministic") is not True:
        errors.append("metrics.json deterministic must be true.")
    if _contains_rfc3339(report):
        errors.append("report.json contains timestamp-like content.")
    if _contains_rfc3339(metrics):
        errors.append("metrics.json contains timestamp-like content.")
    if _contains_rfc3339(stamp):
        errors.append("stamp.json contains timestamp-like content.")

    for warning in warnings:
        print(f"WARN: {warning}")

    if errors:
        for err in errors:
            print(f"ERROR: {err}")
        return 1

    print("Agent trust boundary verification passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
