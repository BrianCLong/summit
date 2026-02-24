#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
from pathlib import Path
from typing import Any


def _load_json(path: Path) -> dict[str, Any]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise RuntimeError(f"Required file is missing: {path}") from exc
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"Invalid JSON in {path}: {exc}") from exc


def _canonical_hash(payload: dict[str, Any]) -> str:
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(canonical).hexdigest()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Verify security debt artifacts for CI enforcement.")
    parser.add_argument(
        "--artifacts-dir",
        default=".",
        help="Directory that contains security debt analyzer outputs.",
    )
    parser.add_argument(
        "--gate-config",
        default="summit/ci/gates/security_debt.yml",
        help="Path to gate configuration.",
    )
    args = parser.parse_args(argv)

    artifacts_dir = Path(args.artifacts_dir).resolve()
    gate_config_path = Path(args.gate_config).resolve()

    gate_config: dict[str, Any] = {}
    if gate_config_path.exists():
        gate_config = _load_json(gate_config_path)

    report = _load_json(artifacts_dir / "report.json")
    metrics = _load_json(artifacts_dir / "metrics.json")
    stamp = _load_json(artifacts_dir / "stamp.json")
    ledger = _load_json(artifacts_dir / "security_debt_ledger.json")

    errors: list[str] = []
    warnings: list[str] = []

    expected_hash = _canonical_hash(ledger)
    if stamp.get("ledger_hash") != expected_hash:
        errors.append("stamp.json ledger_hash does not match security_debt_ledger.json.")
    if stamp.get("deterministic") is not True:
        errors.append("stamp.json must include deterministic=true.")
    if report.get("finding_count") != len(report.get("findings", [])):
        errors.append("report.json finding_count does not match findings length.")

    unclassified_count = int(metrics.get("dependency_unclassified_count", 0))
    missing_provenance_count = int(metrics.get("provenance_missing_header_count", 0))
    coverage = float(metrics.get("threat_model_coverage", 1.0))
    threshold = float(
        metrics.get(
            "threat_model_threshold",
            gate_config.get("threat_model_minimum_coverage", 0.8),
        )
    )
    repeated_signatures = int(metrics.get("replication_repeated_count", 0))

    if unclassified_count > 0:
        warnings.append("New dependencies are missing risk classification.")
    if missing_provenance_count > 0:
        warnings.append("Agent-authored files are missing provenance headers.")
    if coverage < threshold:
        warnings.append("Threat model coverage is below threshold.")
    if gate_config.get("deny_on_repeated_signatures", True) and repeated_signatures > 0:
        warnings.append("Repeated vulnerable signatures were detected.")

    for error in errors:
        print(f"[FAIL] {error}")

    enforcement_mode = os.getenv(
        "SECURITY_DEBT_ENFORCEMENT",
        str(gate_config.get("enforcement_default", "off")),
    ).strip().lower()

    if errors:
        return 1

    if warnings:
        label = "FAIL" if enforcement_mode == "on" else "WARN"
        for warning in warnings:
            print(f"[{label}] {warning}")
        if enforcement_mode == "on":
            return 1
        print("[WARN] SECURITY_DEBT_ENFORCEMENT=off. Violations reported but not blocking.")
    else:
        print("[PASS] Security debt gate checks passed.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
