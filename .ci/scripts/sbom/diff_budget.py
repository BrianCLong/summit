#!/usr/bin/env python3
import argparse
import datetime as dt
import json
import sys
from collections import Counter
from typing import Dict, Iterable, Tuple

SEVERITY_ORDER = ["critical", "high", "medium", "low", "unknown"]


def load_vulnerability_counts(path: str) -> Counter:
    try:
        with open(path, "r", encoding="utf-8") as handle:
            data = json.load(handle)
    except FileNotFoundError:
        return Counter()

    vulns: Iterable[Dict] = []
    if isinstance(data, dict):
        if "matches" in data:  # grype format
            vulns = (match.get("vulnerability", {}) for match in data.get("matches", []))
        elif "vulnerabilities" in data:  # osv-scanner format
            vulns = data.get("vulnerabilities", [])
    elif isinstance(data, list):
        vulns = data

    counts: Counter = Counter()
    for vuln in vulns:
        severity = str(vuln.get("severity", vuln.get("cvss", [{}])[0].get("severity", "unknown"))).lower()
        normalized = severity if severity in SEVERITY_ORDER else "unknown"
        counts[normalized] += 1
    return counts


def load_budgets(path: str) -> Dict[str, int]:
    with open(path, "r", encoding="utf-8") as handle:
        cfg = json.load(handle)
    budgets = cfg.get("security", {}).get("sbomSeverityBudget", {})
    return {k.lower(): int(v) for k, v in budgets.items()}


def load_exception(path: str) -> Tuple[bool, str]:
    if not path:
        return False, ""
    try:
        with open(path, "r", encoding="utf-8") as handle:
            payload = json.load(handle)
    except FileNotFoundError:
        return False, ""

    expiry_raw = payload.get("expiry") or payload.get("expires_at")
    if expiry_raw:
        expiry = dt.datetime.fromisoformat(expiry_raw)
        if expiry < dt.datetime.utcnow():
            return False, "exception expired"
    approvers = payload.get("approvers", [])
    if len(approvers) < 2:
        return False, "exception requires dual approval"
    return True, payload.get("id", "approved-exception")


def main() -> None:
    parser = argparse.ArgumentParser(description="Enforce vulnerability diff budgets")
    parser.add_argument("baseline", help="Path to baseline vulnerability report JSON")
    parser.add_argument("current", help="Path to current vulnerability report JSON")
    parser.add_argument("budgets", help="Path to .maestro/ci_budget.json")
    parser.add_argument("--exception", dest="exception", help="Approved exception JSON path", default="")
    parser.add_argument("--summary", dest="summary", help="Path to write summary JSON", default="")
    args = parser.parse_args()

    baseline_counts = load_vulnerability_counts(args.baseline)
    current_counts = load_vulnerability_counts(args.current)
    budgets = load_budgets(args.budgets)

    deltas: Dict[str, int] = {}
    failures: Dict[str, int] = {}
    for sev in SEVERITY_ORDER:
        delta = current_counts.get(sev, 0) - baseline_counts.get(sev, 0)
        deltas[sev] = delta
        allowed = budgets.get(sev, 0)
        if sev == "critical" and delta > 0:
            failures[sev] = delta
        elif delta > allowed:
            failures[sev] = delta

    exception_allowed, exception_id = load_exception(args.exception)
    if failures and exception_allowed:
        failures = {sev: count for sev, count in failures.items() if sev == "critical"}

    summary_payload = {
        "baseline": baseline_counts,
        "current": current_counts,
        "deltas": deltas,
        "budgets": budgets,
        "exception": exception_id if exception_allowed else None,
        "status": "fail" if failures else "pass",
        "failures": failures,
    }

    if args.summary:
        with open(args.summary, "w", encoding="utf-8") as handle:
            json.dump(summary_payload, handle, indent=2)

    if failures:
        lines = ["Vulnerability diff budget exceeded:"]
        for sev, count in failures.items():
            lines.append(f"  {sev}: {count} over budget (budget={budgets.get(sev, 0)})")
        sys.stderr.write("\n".join(lines) + "\n")
        sys.exit(1)

    print("Diff budget within limits")


if __name__ == "__main__":
    main()
