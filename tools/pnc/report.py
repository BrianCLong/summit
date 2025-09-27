"""Monthly compliance report generator for PNC attestations."""
from __future__ import annotations

import argparse
import json
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from statistics import mean
from typing import Dict, Iterable, List, Optional


def _load_bundle(path: Path) -> dict:
    return json.loads(path.read_text())


def _month_key(timestamp: str) -> str:
    try:
        dt = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
    except ValueError:
        dt = datetime.now(timezone.utc)
    return dt.strftime("%Y-%m")


def aggregate_reports(paths: Iterable[Path]) -> dict:
    monthly: Dict[str, List[dict]] = defaultdict(list)
    for path in paths:
        bundle = _load_bundle(path)
        payload = bundle.get("payload", {})
        monthly[_month_key(payload.get("job", {}).get("timestamp", ""))].append(payload)

    months: List[dict] = []
    for month in sorted(monthly.keys()):
        payloads = monthly[month]
        coverage_values = [p.get("metrics", {}).get("allowlist_coverage", 0.0) for p in payloads]
        leakage_eps = [p.get("dp_leakage", {}).get("epsilon", 0.0) for p in payloads]
        leakage_delta = [p.get("dp_leakage", {}).get("delta", 0.0) for p in payloads]
        successes = [p for p in payloads if p.get("status") == "pass"]
        failures = [p for p in payloads if p.get("status") != "pass"]
        sample = payloads[: min(5, len(payloads))]
        months.append(
            {
                "month": month,
                "jobs": len(payloads),
                "attestations": {"pass": len(successes), "fail": len(failures)},
                "coverage": {
                    "allowlist_average": mean(coverage_values) if coverage_values else 0.0,
                    "allowlist_min": min(coverage_values) if coverage_values else 0.0,
                    "denylist_proofs": sum(len(p.get("exclusions", [])) for p in payloads),
                },
                "dp_leakage": {
                    "epsilon_max": max(leakage_eps) if leakage_eps else 0.0,
                    "delta_max": max(leakage_delta) if leakage_delta else 0.0,
                },
                "sample_audits": [
                    {
                        "job_id": p.get("job", {}).get("job_id"),
                        "query_id": p.get("job", {}).get("query_id"),
                        "timestamp": p.get("job", {}).get("timestamp"),
                        "status": p.get("status"),
                    }
                    for p in sample
                ],
            }
        )

    return {
        "schema": "pnc.report/1.0",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "months": months,
    }


def configure_parser(parser: argparse.ArgumentParser) -> argparse.ArgumentParser:
    parser.add_argument(
        "--bundles",
        nargs="+",
        required=True,
        help="Bundle files or directories containing PNC attestation bundles",
    )
    parser.add_argument("--output", required=True, help="Destination path for the report JSON")
    return parser


def build_cli() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Generate monthly regulator-grade PNC reports")
    return configure_parser(parser)


def main(argv: Optional[Iterable[str]] = None) -> dict:
    parser = build_cli()
    args = parser.parse_args(argv)

    bundle_paths: List[Path] = []
    for item in args.bundles:
        path = Path(item)
        if path.is_dir():
            bundle_paths.extend(sorted(path.glob("*.json")))
        else:
            bundle_paths.append(path)

    report = aggregate_reports(bundle_paths)
    Path(args.output).write_text(json.dumps(report, indent=2, sort_keys=True))
    return report


if __name__ == "__main__":
    main()


__all__ = [
    "aggregate_reports",
    "configure_parser",
    "build_cli",
    "main",
]
