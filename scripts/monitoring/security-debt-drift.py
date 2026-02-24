#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from summit.security_debt import analyze_security_debt


def _load_json(path: Path, fallback: dict[str, Any]) -> dict[str, Any]:
    if not path.exists():
        return fallback
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return fallback


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def _added_dependency_count(ledger: dict[str, Any]) -> int:
    dependency_surface = ledger.get("dependency_surface", {})
    rows = dependency_surface.get("added_dependencies", [])
    if not isinstance(rows, list):
        return 0
    return len(rows)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Detect drift in security debt signals.")
    parser.add_argument(
        "--repo-root",
        default=".",
        help="Repository root to analyze.",
    )
    parser.add_argument(
        "--output-dir",
        default="artifacts/security-debt",
        help="Where the analyzer writes current artifacts.",
    )
    parser.add_argument(
        "--baseline",
        default="monitoring/security_debt_baseline/security_debt_ledger.json",
        help="Baseline ledger path used for drift comparison.",
    )
    parser.add_argument(
        "--trend",
        default="monitoring/security_debt_trends.json",
        help="Trend output path.",
    )
    parser.add_argument(
        "--gate-config",
        default="summit/ci/gates/security_debt.yml",
        help="Gate configuration used for analysis.",
    )
    parser.add_argument(
        "--risk-delta-threshold",
        type=int,
        default=5,
        help="Alert when risk_score delta exceeds this threshold.",
    )
    parser.add_argument(
        "--dependency-growth-threshold",
        type=float,
        default=10.0,
        help="Alert when added dependency growth exceeds this percentage.",
    )
    parser.add_argument(
        "--base-ref",
        default=None,
        help="Optional git base ref override for changed-file analysis.",
    )
    parser.add_argument(
        "--update-baseline",
        action="store_true",
        help="Write current ledger to baseline after computing drift.",
    )
    parser.add_argument(
        "--fail-on-alert",
        action="store_true",
        help="Exit non-zero when drift alerts are detected.",
    )
    raw_argv = list(argv) if argv is not None else sys.argv[1:]
    if "--" in raw_argv:
        marker_index = raw_argv.index("--")
        raw_argv = raw_argv[:marker_index] + raw_argv[marker_index + 1 :]
    args = parser.parse_args(raw_argv)

    repo_root = Path(args.repo_root).resolve()
    output_dir = Path(args.output_dir).resolve()
    baseline_path = Path(args.baseline).resolve()
    trend_path = Path(args.trend).resolve()
    gate_config_path = Path(args.gate_config).resolve()

    analyze_security_debt(
        repo_root=repo_root,
        output_dir=output_dir,
        gate_config_path=gate_config_path,
        base_ref=args.base_ref,
    )

    current_ledger = _load_json(output_dir / "security_debt_ledger.json", {})
    baseline_ledger = _load_json(baseline_path, {})

    current_risk_score = int(current_ledger.get("risk_score", 0))
    baseline_risk_score = int(baseline_ledger.get("risk_score", 0))
    risk_delta = current_risk_score - baseline_risk_score

    current_added_dependencies = _added_dependency_count(current_ledger)
    baseline_added_dependencies = _added_dependency_count(baseline_ledger)
    if baseline_added_dependencies == 0:
        dependency_growth_pct = 0.0 if current_added_dependencies == 0 else 100.0
    else:
        dependency_growth_pct = (
            (current_added_dependencies - baseline_added_dependencies) / baseline_added_dependencies
        ) * 100.0

    repeated_signatures = len(current_ledger.get("replication", {}).get("repeated_signatures", []))

    alerts: list[str] = []
    if abs(risk_delta) > args.risk_delta_threshold:
        alerts.append(
            f"Risk score delta {risk_delta} exceeds threshold {args.risk_delta_threshold}."
        )
    if dependency_growth_pct > args.dependency_growth_threshold:
        alerts.append(
            "Dependency growth "
            f"{dependency_growth_pct:.2f}% exceeds threshold {args.dependency_growth_threshold:.2f}%."
        )
    if repeated_signatures > 0:
        alerts.append("Repeated vulnerability signatures detected in current ledger.")

    trend_payload = {
        "alerts": alerts,
        "current": {
            "added_dependency_count": current_added_dependencies,
            "repeated_signature_count": repeated_signatures,
            "risk_score": current_risk_score,
        },
        "deltas": {
            "dependency_growth_pct": round(dependency_growth_pct, 4),
            "risk_score_delta": risk_delta,
        },
        "thresholds": {
            "dependency_growth_pct": args.dependency_growth_threshold,
            "risk_delta": args.risk_delta_threshold,
        },
    }

    _write_json(trend_path, trend_payload)

    if args.update_baseline or not baseline_path.exists():
        _write_json(baseline_path, current_ledger)

    if alerts:
        for alert in alerts:
            print(f"[ALERT] {alert}")
        return 1 if args.fail_on_alert else 0

    print("[PASS] No security debt drift alerts.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
