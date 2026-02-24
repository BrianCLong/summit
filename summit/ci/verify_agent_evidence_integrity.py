#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path
from typing import Any

if __package__ in {None, ""}:
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from summit.agents.schema import SchemaValidationError, validate_schema

TIMESTAMP_KEYS = {
    "timestamp",
    "generated_at",
    "created_at",
    "updated_at",
    "started_at",
    "finished_at",
}
EVIDENCE_ID_RE = re.compile(r"^EVID:[a-z0-9-]+:[0-9]{4}$")
ISO_RE = re.compile(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}")


def _load_json(path: Path) -> dict[str, Any]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise RuntimeError(f"Missing required artifact: {path}") from exc
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"Invalid JSON in {path}: {exc}") from exc
    if not isinstance(data, dict):
        raise RuntimeError(f"{path} must contain a JSON object")
    return data


def _load_schema(path: Path) -> dict[str, Any]:
    return _load_json(path)


def _canonical_hash(report: dict[str, Any], metrics: dict[str, Any], stamp: dict[str, Any]) -> str:
    material = {
        "report": report,
        "metrics": metrics,
        "evidence_ids": stamp.get("evidence_ids", []),
        "agent_version": stamp.get("agent_version"),
    }
    payload = json.dumps(material, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def _scan_timestamp_violations(value: Any, context: str = "$") -> list[str]:
    violations: list[str] = []
    if isinstance(value, dict):
        for key, nested in value.items():
            if key.lower() in TIMESTAMP_KEYS or "time" in key.lower() or "date" in key.lower():
                violations.append(f"{context}.{key}")
            violations.extend(_scan_timestamp_violations(nested, f"{context}.{key}"))
        return violations
    if isinstance(value, list):
        for idx, nested in enumerate(value):
            violations.extend(_scan_timestamp_violations(nested, f"{context}[{idx}]"))
        return violations
    if isinstance(value, str) and ISO_RE.search(value):
        violations.append(context)
    return violations


def verify_agent_evidence_integrity(
    artifacts_dir: Path,
    *,
    max_tokens: int | None = None,
    max_cost_usd: float | None = None,
) -> list[str]:
    errors: list[str] = []
    base_dir = Path(__file__).resolve().parents[1]
    schema_dir = base_dir / "agents" / "schemas"

    report = _load_json(artifacts_dir / "report.json")
    metrics = _load_json(artifacts_dir / "metrics.json")
    stamp = _load_json(artifacts_dir / "stamp.json")

    try:
        validate_schema(report, _load_schema(schema_dir / "report.schema.json"), context="report")
        validate_schema(metrics, _load_schema(schema_dir / "metrics.schema.json"), context="metrics")
        validate_schema(stamp, _load_schema(schema_dir / "stamp.schema.json"), context="stamp")
    except (SchemaValidationError, RuntimeError) as exc:
        errors.append(str(exc))
        return errors

    report_ts = _scan_timestamp_violations(report)
    metrics_ts = _scan_timestamp_violations(metrics)
    if report_ts:
        errors.append(f"report.json contains timestamp-like fields/values: {sorted(report_ts)}")
    if metrics_ts:
        errors.append(f"metrics.json contains timestamp-like fields/values: {sorted(metrics_ts)}")

    transcript = report.get("transcript", [])
    transcript_evidence_ids = [event.get("evidence_id") for event in transcript if isinstance(event, dict)]
    stamp_evidence_ids = stamp.get("evidence_ids", [])
    if transcript_evidence_ids != stamp_evidence_ids:
        errors.append("stamp.json evidence_ids must exactly match report transcript evidence IDs.")

    for evidence_id in stamp_evidence_ids:
        if not isinstance(evidence_id, str) or not EVIDENCE_ID_RE.match(evidence_id):
            errors.append(f"Invalid evidence ID format: {evidence_id}")

    expected_hash = _canonical_hash(report, metrics, stamp)
    if stamp.get("deterministic_hash") != expected_hash:
        errors.append("stamp.json deterministic_hash does not match canonical artifact hash.")

    usage = metrics.get("usage", {})
    budget = metrics.get("budget", {})
    usage_tokens = int(usage.get("tokens", 0))
    usage_cost = float(usage.get("cost_usd", 0.0))
    budget_tokens = int(budget.get("max_tokens", 0))
    budget_cost = float(budget.get("max_cost_usd", 0.0))

    if usage_tokens > budget_tokens:
        errors.append("Token budget exceeded in metrics.json.")
    if usage_cost > budget_cost:
        errors.append("Cost budget exceeded in metrics.json.")

    if max_tokens is not None and usage_tokens > max_tokens:
        errors.append(f"Token usage {usage_tokens} exceeds gate limit {max_tokens}.")
    if max_cost_usd is not None and usage_cost > max_cost_usd:
        errors.append(f"Cost usage {usage_cost} exceeds gate limit {max_cost_usd}.")

    return errors


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Verify Summit agent evidence integrity artifacts.")
    parser.add_argument(
        "--artifacts-dir",
        default="artifacts/agent",
        help="Directory containing report.json, metrics.json, and stamp.json.",
    )
    parser.add_argument("--max-tokens", type=int, default=None, help="Optional hard cap for tokens.")
    parser.add_argument("--max-cost-usd", type=float, default=None, help="Optional hard cap for cost.")
    args = parser.parse_args(argv)

    errors = verify_agent_evidence_integrity(
        Path(args.artifacts_dir).resolve(),
        max_tokens=args.max_tokens,
        max_cost_usd=args.max_cost_usd,
    )
    if errors:
        for error in errors:
            print(f"[FAIL] {error}")
        return 1
    print("[PASS] Agent evidence integrity verified.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
