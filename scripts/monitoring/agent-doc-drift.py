#!/usr/bin/env python3
"""Detect drift in agent-doc schema and generated artifacts."""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    digest.update(path.read_bytes())
    return digest.hexdigest()


def _stable_json(payload: object) -> str:
    return json.dumps(payload, indent=2, sort_keys=True) + "\n"


def _collect_current(schema_path: Path, input_dir: Path) -> dict:
    docs = sorted(input_dir.glob("*.agent.json"))
    required_field_union: set[str] = set()
    doc_fields: dict[str, list[str]] = {}
    docs_with_policy_constraints = 0

    for doc_path in docs:
        payload = json.loads(doc_path.read_text(encoding="utf-8"))
        keys = sorted(payload.keys())
        required_field_union.update(keys)
        doc_fields[doc_path.name] = keys

        policy_constraints = payload.get("policy_constraints", [])
        if isinstance(policy_constraints, list) and policy_constraints:
            docs_with_policy_constraints += 1

    policy_coverage_pct = 0
    if docs:
        policy_coverage_pct = round((docs_with_policy_constraints / len(docs)) * 100, 2)

    return {
        "doc_count": len(docs),
        "doc_fields": doc_fields,
        "policy_constraint_coverage_pct": policy_coverage_pct,
        "required_field_union": sorted(required_field_union),
        "schema_sha256": _sha256(schema_path),
    }


def _compare_with_baseline(current: dict, baseline: dict | None) -> dict:
    if baseline is None:
        return {
            "missing_fields_regression": [],
            "schema_checksum_changed": False,
            "status": "baseline_missing",
        }

    schema_changed = baseline.get("schema_sha256") != current.get("schema_sha256")
    regressions: list[dict[str, object]] = []

    baseline_doc_fields = baseline.get("doc_fields", {})
    if isinstance(baseline_doc_fields, dict):
        for name, baseline_fields in sorted(baseline_doc_fields.items()):
            if name not in current["doc_fields"]:
                regressions.append({"doc": name, "missing_fields": list(baseline_fields)})
                continue

            current_fields = set(current["doc_fields"][name])
            dropped = sorted(set(baseline_fields) - current_fields)
            if dropped:
                regressions.append({"doc": name, "missing_fields": dropped})

    status = "ok"
    if schema_changed or regressions:
        status = "drift_detected"

    return {
        "missing_fields_regression": regressions,
        "schema_checksum_changed": schema_changed,
        "status": status,
    }


def main() -> int:
    repo_root = Path(__file__).resolve().parents[2]

    parser = argparse.ArgumentParser(description="Agent-doc drift monitor")
    parser.add_argument(
        "--schema",
        default=str(repo_root / "schemas" / "agent-doc.schema.json"),
        help="Path to the agent-doc schema.",
    )
    parser.add_argument(
        "--input-dir",
        default=str(repo_root / "spec" / "agents"),
        help="Directory with generated *.agent.json files.",
    )
    parser.add_argument(
        "--baseline",
        default=str(repo_root / "spec" / "agents" / "drift-baseline.json"),
        help="Optional baseline file for drift comparison.",
    )
    parser.add_argument(
        "--output",
        default=str(repo_root / "drift-report.json"),
        help="Output report path.",
    )
    parser.add_argument(
        "--fail-on-drift",
        action="store_true",
        help="Exit non-zero when drift is detected.",
    )
    args = parser.parse_args()

    schema_path = Path(args.schema)
    input_dir = Path(args.input_dir)
    baseline_path = Path(args.baseline)
    output_path = Path(args.output)

    current = _collect_current(schema_path, input_dir)
    baseline = None
    if baseline_path.exists():
        baseline = json.loads(baseline_path.read_text(encoding="utf-8"))

    comparison = _compare_with_baseline(current, baseline)

    report = {
        "baseline_path": str(baseline_path),
        "current": current,
        "drift": comparison,
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(_stable_json(report), encoding="utf-8")
    print(f"Wrote drift report to {output_path}")

    if args.fail_on_drift and comparison["status"] == "drift_detected":
        return 2

    return 0


if __name__ == "__main__":
    sys.exit(main())
