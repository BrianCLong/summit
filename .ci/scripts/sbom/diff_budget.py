#!/usr/bin/env python3
import argparse
import json
import sys
from collections import Counter
from pathlib import Path

SEVERITY_ORDER = ["Critical", "High", "Medium", "Low", "Negligible", "Unknown"]


def load_counts(report_path: Path) -> Counter:
    if not report_path.exists():
        return Counter()
    data = json.loads(report_path.read_text())
    matches = data.get("matches", []) or data.get("results", [])
    counts: Counter = Counter()
    for match in matches:
        vuln = match.get("vulnerability") or match.get("vulnerability_id")
        if isinstance(vuln, dict):
            sev = vuln.get("severity", "Unknown")
        else:
            sev = match.get("severity", "Unknown")
        counts[sev] += 1
    return counts


def normalize_counts(counts: Counter) -> dict:
    return {severity: counts.get(severity, 0) for severity in SEVERITY_ORDER}


def evaluate_budget(new_counts: Counter, baseline_counts: Counter, budget: dict) -> dict:
    warning_threshold = float(budget.get("alerts", {}).get("warning_threshold", 0.8))
    critical_threshold = float(budget.get("alerts", {}).get("critical_threshold", 0.95))

    evaluation = {
        "status": "pass",
        "exceeded": [],
        "warning": [],
        "summary": [],
    }

    for severity in SEVERITY_ORDER:
        new_value = new_counts.get(severity, 0)
        base_value = baseline_counts.get(severity, 0)
        allowed_growth = max(1, int(base_value * (1 - critical_threshold)))
        warn_growth = max(1, int(base_value * (1 - warning_threshold)))
        delta = new_value - base_value

        if delta > allowed_growth:
            evaluation["status"] = "fail"
            evaluation["exceeded"].append({
                "severity": severity,
                "baseline": base_value,
                "current": new_value,
                "delta": delta,
                "allowed_increase": allowed_growth,
            })
        elif delta > warn_growth:
            evaluation["warning"].append({
                "severity": severity,
                "baseline": base_value,
                "current": new_value,
                "delta": delta,
                "allowed_increase": allowed_growth,
            })
        evaluation["summary"].append({
            "severity": severity,
            "baseline": base_value,
            "current": new_value,
            "delta": delta,
        })
    return evaluation


def main() -> int:
    parser = argparse.ArgumentParser(description="Compare vulnerability reports against budget thresholds")
    parser.add_argument("--new-report", required=True, type=Path, help="Path to the new grype JSON report")
    parser.add_argument("--baseline-report", type=Path, help="Path to the baseline grype JSON report")
    parser.add_argument("--budget", default=Path(".maestro/ci_budget.json"), type=Path, help="Budget file path")
    parser.add_argument("--output", type=Path, help="Where to write the diff summary JSON")
    args = parser.parse_args()

    budget_data = json.loads(args.budget.read_text()) if args.budget.exists() else {}
    new_counts = load_counts(args.new_report)
    baseline_counts = load_counts(args.baseline_report) if args.baseline_report else Counter()

    evaluation = evaluate_budget(new_counts, baseline_counts, budget_data)
    summary = {
        "status": evaluation["status"],
        "new": normalize_counts(new_counts),
        "baseline": normalize_counts(baseline_counts),
        "warnings": evaluation["warning"],
        "failures": evaluation["exceeded"],
        "summary": evaluation["summary"],
    }

    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(summary, indent=2))

    print(json.dumps(summary, indent=2))
    return 0 if evaluation["status"] == "pass" else 1


if __name__ == "__main__":
    sys.exit(main())
