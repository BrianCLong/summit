#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PACK_DIR = ROOT / "governance" / "one-engineer-production-saas-governance"
REPORT_PATH = PACK_DIR / "report.json"
METRICS_PATH = PACK_DIR / "metrics.json"
STAMP_PATH = PACK_DIR / "stamp.json"


def digest(path: Path) -> str:
    payload = path.read_bytes()
    return hashlib.sha256(payload).hexdigest()


def bundle_hash(report_hash: str, metrics_hash: str, stamp_hash: str) -> str:
    return hashlib.sha256(f"{report_hash}{metrics_hash}{stamp_hash}".encode("utf-8")).hexdigest()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Drift detector for one-engineer-production-saas-governance governance pack.")
    parser.add_argument("--previous-hash", default=os.getenv("PREVIOUS_GOV_HASH", ""))
    parser.add_argument("--fail-on-drift", action="store_true")
    parser.add_argument("--out", type=Path, default=None, help="Optional output JSON file path")
    return parser.parse_args()


def validate_policy_shape(report: dict) -> list[str]:
    issues: list[str] = []
    data_classification = report.get("data_classification")
    threat_model = report.get("threat_model")
    abuse_fixtures = report.get("abuse_case_fixtures")

    if not isinstance(data_classification, dict) or not data_classification:
        issues.append("missing-data-classification")
    if not isinstance(threat_model, list) or len(threat_model) == 0:
        issues.append("missing-threat-model")
    if not isinstance(abuse_fixtures, list) or len(abuse_fixtures) == 0:
        issues.append("missing-abuse-case-fixtures")
    return issues


def main() -> int:
    args = parse_args()
    if not REPORT_PATH.exists() or not METRICS_PATH.exists() or not STAMP_PATH.exists():
        print("FAIL: governance pack missing required files")
        return 1

    report_payload = json.loads(REPORT_PATH.read_text(encoding="utf-8"))
    issues = validate_policy_shape(report_payload)

    report_hash = digest(REPORT_PATH)
    metrics_hash = digest(METRICS_PATH)
    stamp_hash = digest(STAMP_PATH)
    current_hash = bundle_hash(report_hash, metrics_hash, stamp_hash)

    drift_reasons = list(issues)
    if args.previous_hash and args.previous_hash != current_hash:
        drift_reasons.append("bundle-hash-changed")
    drift_detected = len(drift_reasons) > 0

    result = {
        "item_slug": "one-engineer-production-saas-governance",
        "current_hash": current_hash,
        "previous_hash": args.previous_hash or None,
        "report_sha256": report_hash,
        "metrics_sha256": metrics_hash,
        "stamp_sha256": stamp_hash,
        "drift_detected": drift_detected,
        "drift_reasons": sorted(drift_reasons),
    }

    serialized = json.dumps(result, indent=2, sort_keys=True)
    print(serialized)
    if args.out is not None:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(serialized + "\n", encoding="utf-8")

    if args.fail_on_drift and drift_detected:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
